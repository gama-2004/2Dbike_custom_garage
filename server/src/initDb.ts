/** データベースを作り、初期データ(組み込みの2車種と最初の管理者)を入れる */
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinCatalog } from '../../web/src/catalog/fromCatalog';
import { saveCatalog } from './catalogRepo';
import { config } from './config';
import { connectionHint, createPool, exec, tx } from './db';

const here = path.dirname(fileURLToPath(import.meta.url));
// 配布用のフォルダでは SCHEMA_PATH で SQL の場所を指定する
const schemaPath = () => (process.env.SCHEMA_PATH ? path.resolve(process.env.SCHEMA_PATH) : path.resolve(here, '../../docs/sql/schema.sql'));

export async function initDatabase(opts: { database: string; reset: boolean; admin?: { login_id: string; name: string; password: string } }) {
  if (!/^[A-Za-z0-9_]+$/.test(opts.database)) throw new Error(`データベース名「${opts.database}」には英数字と _ だけを使ってください`);
  const root = await mysql.createConnection({ ...config.db, database: undefined, multipleStatements: true });
  try {
    const [found] = await root.query<mysql.RowDataPacket[]>('SHOW DATABASES LIKE ?', [opts.database]);
    if (found.length && !opts.reset) {
      throw new Error(`データベース「${opts.database}」はもうあります。作り直すときは npm run db:reset を使ってください(保存したカスタムも消えます)。`);
    }
    if (opts.reset) await root.query(`DROP DATABASE IF EXISTS \`${opts.database}\``);
    const sql = readFileSync(schemaPath(), 'utf8').replace(/\bcustom_garage\b/g, opts.database);
    await root.query(sql);
  } finally {
    await root.end();
  }
  const db = createPool(opts.database);
  try {
    await tx(db, async (c) => {
      await saveCatalog(c, builtinCatalog('supersport'));
      await saveCatalog(c, builtinCatalog('american'));
      if (opts.admin) {
        await exec(c, 'INSERT INTO T_admins (login_id, password_hash, name) VALUES (?, ?, ?)', [opts.admin.login_id, await bcrypt.hash(opts.admin.password, 10), opts.admin.name]);
      }
    });
  } finally {
    await db.end();
  }
}

/** 初期化して結果を表示する(npm run db:init と、配布用の setup から使う) */
export async function initDatabaseCli(reset: boolean): Promise<boolean> {
  const login_id = process.env.ADMIN_LOGIN_ID || 'admin';
  const name = process.env.ADMIN_NAME || '管理者';
  const given = process.env.ADMIN_PASSWORD ?? '';
  const password = given || randomBytes(9).toString('base64url');
  try {
    await initDatabase({ database: config.db.database, reset, admin: { login_id, name, password } });
    console.log(`データベース「${config.db.database}」を作り、スーパースポーツ(V001)とアメリカン(V002)を登録しました。`);
    console.log(`管理者のログインID: ${login_id}`);
    if (!given) console.log(`管理者のパスワード: ${password}  (この画面にしか出ないので控えてください)`);
    return true;
  } catch (e) {
    if (!(e instanceof Error)) throw e;
    console.error(`作れませんでした: ${e.message}`);
    const hint = connectionHint(e);
    if (hint) console.error(hint);
    return false;
  }
}


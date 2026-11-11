/*
 * 配布用のフォルダで使うコマンド(1つのファイル garage.mjs にまとめて配る)。
 *   node garage.mjs env              … .env がなければ作る
 *   node garage.mjs wait-db [秒]     … MySQL につながるまで待つ
 *   node garage.mjs init-db          … データベースがなければ作る(あれば何もしない)
 *   node garage.mjs reset-db         … データベースを作り直す(保存したカスタムも消える)
 *   node garage.mjs admin <ID> <パスワード> [氏名]  … 管理者を追加する、パスワードを変える
 *   node garage.mjs serve            … サーバーを起動する
 * .env は node --env-file-if-exists=.env で読む。
 */
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { config } from './config';
import { connectionHint, createPool, exec } from './db';
import { initDatabaseCli } from './initDb';
import { startServer } from './server';

/** 配布用の .env(MySQL はこのフォルダの data を 3317 番で動かす) */
function envFile() {
  return [
    '# 2Dカスタムガレージの設定(setup.cmd が作った)',
    'PORT=3000',
    '# 127.0.0.1 にすると、この PC からしか開けなくなる',
    'HOST=',
    'DB_HOST=127.0.0.1',
    'DB_PORT=3317',
    'DB_USER=root',
    'DB_PASSWORD=',
    'DB_NAME=custom_garage',
    `SESSION_SECRET=${randomBytes(32).toString('hex')}`,
    'COOKIE_SECURE=false',
    'ADMIN_LOGIN_ID=admin',
    'ADMIN_NAME=管理者',
    '# 空にすると、setup のときにランダムなパスワードを作って表示する',
    'ADMIN_PASSWORD=',
    'STATIC_DIR=web',
    'SCHEMA_PATH=app/schema.sql',
    'OPEN_BROWSER=true',
    '',
  ].join('\r\n');
}

async function canConnect(): Promise<Error | null> {
  try {
    const c = await mysql.createConnection({ ...config.db, database: undefined, connectTimeout: 2000 });
    await c.end();
    return null;
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e));
  }
}

async function databaseExists(): Promise<boolean> {
  const c = await mysql.createConnection({ ...config.db, database: undefined });
  try {
    const [r] = await c.query<mysql.RowDataPacket[]>('SHOW DATABASES LIKE ?', [config.db.database]);
    return r.length > 0;
  } finally {
    await c.end();
  }
}

const [cmd, ...args] = process.argv.slice(2);
try {
  switch (cmd) {
    case 'env':
      if (existsSync('.env')) console.log('設定ファイル(.env)はもうあります。');
      else {
        writeFileSync('.env', envFile());
        console.log('設定ファイル(.env)を作りました。');
      }
      break;
    case 'wait-db': {
      const limit = Date.now() + Number(args[0] ?? 60) * 1000;
      let err = await canConnect();
      if (err) console.log('MySQL の起動を待っています…');
      while (err && Date.now() < limit) {
        await new Promise((r) => setTimeout(r, 1000));
        err = await canConnect();
      }
      if (err) {
        console.error(`MySQL につながりませんでした: ${err.message}`);
        const hint = connectionHint(err);
        if (hint) console.error(hint);
        process.exitCode = 1;
      }
      break;
    }
    case 'ping':
      if (await canConnect()) process.exitCode = 1;
      break;
    case 'init-db':
      if (await databaseExists()) console.log(`データベース「${config.db.database}」はもうあるので、そのまま使います。`);
      else if (!(await initDatabaseCli(false))) process.exitCode = 1;
      break;
    case 'reset-db':
      if (!(await initDatabaseCli(true))) process.exitCode = 1;
      break;
    case 'admin': {
      const [loginId, password, name = loginId] = args;
      if (!loginId || !password || password.length < 8 || password.length > 64) {
        console.error('使い方: admin.cmd <ログインID> <パスワード(8〜64文字)> [氏名]');
        process.exitCode = 1;
        break;
      }
      const db = createPool();
      await exec(db,
        'INSERT INTO T_admins (login_id, password_hash, name) VALUES (?, ?, ?) AS n ON DUPLICATE KEY UPDATE password_hash = n.password_hash, name = n.name, fail_count = 0, locked_until = NULL',
        [loginId, await bcrypt.hash(password, 10), name]);
      await db.end();
      console.log(`管理者「${loginId}」を登録しました。`);
      break;
    }
    case 'serve':
      startServer();
      break;
    default:
      console.error('使い方: node garage.mjs env | wait-db | ping | init-db | reset-db | admin | serve');
      process.exitCode = 1;
  }
} catch (e) {
  if (!(e instanceof Error)) throw e;
  console.error(`エラー: ${e.message}`);
  const hint = connectionHint(e);
  if (hint) console.error(hint);
  process.exitCode = 1;
}

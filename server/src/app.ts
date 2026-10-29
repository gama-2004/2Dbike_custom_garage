import bcrypt from 'bcryptjs';
import express, { type NextFunction, type Request, type Response } from 'express';
import session from 'express-session';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import type { CatalogJson, PartDefinition } from '../../web/src/catalog/definition';
import { validateVehicleDefinition } from '../../web/src/catalog/definition';
import type { Spec } from '../../web/src/catalog/types';
import { addPart, idsOf, listVehicles, loadCatalog, readSpec, saveCatalog, vehicleRow, writeSpec } from './catalogRepo';
import { exec, one, rows, tx, type Db } from './db';
import { HttpError, badRequest, notFound } from './errors';

declare module 'express-session' {
  interface SessionData {
    admin?: { id: number; login_id: string; name: string };
  }
}

const MAX_BUILDS = 50;
const LOCK_FAILS = 5;
const LOCK_MINUTES = 15;
const SESSION_MINUTES = 30;
/** ログインIDが無いときも、パスワードの照合にかかる時間をそろえるためのハッシュ */
const DUMMY_HASH = bcrypt.hashSync(randomBytes(8).toString('hex'), 10);

export interface AppOptions {
  db: Db;
  sessionSecret?: string;
  cookieSecure?: boolean;
  /** ビルド済みの画面(web/dist)。あれば同じサーバーから配る */
  staticDir?: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const idParam = (req: Request) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw notFound('保存したカスタムが見つかりません');
  return id;
};

/** 利用者キー(ブラウザで発行した UUID)。保存仕様の持ち主を区別する */
function ownerOf(req: Request): string {
  const key = String(req.get('X-Owner-Key') ?? '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) throw badRequest('利用者キー(X-Owner-Key)がありません');
  return key.toLowerCase();
}

function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.admin) throw new HttpError(401, 'UNAUTHORIZED', 'ログインしてください');
  next();
}

interface BuildRow {
  build_id: number;
  name: string;
  style_name: string;
  saved_at: Date;
  spec_id: number;
  vehicle_code: string;
}

const BUILD_SELECT = `SELECT b.build_id, b.name, b.style_name, b.saved_at, b.spec_id, v.vehicle_code
  FROM T_saved_builds b JOIN T_build_specs s ON s.spec_id = b.spec_id JOIN T_vehicles v ON v.vehicle_id = s.vehicle_id`;

export function createApp({ db, sessionSecret, cookieSecure = false, staticDir }: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));
  if (!sessionSecret) console.warn('SESSION_SECRET が設定されていないので、仮の値を使います(サーバーを再起動するとログインが切れます)');
  app.use(
    '/api',
    session({
      name: 'garage.sid',
      secret: sessionSecret || randomBytes(32).toString('hex'),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: { httpOnly: true, sameSite: 'strict', secure: cookieSecure, maxAge: SESSION_MINUTES * 60 * 1000 },
    }),
  );

  const toBuild = async (b: BuildRow) => ({
    id: b.build_id, vehicle_code: b.vehicle_code, name: b.name, style_name: b.style_name, saved_at: new Date(b.saved_at).toISOString(), spec: await readSpec(db, b.spec_id),
  });
  const findBuild = async (owner: string, id: number) => {
    const b = await one<BuildRow>(db, `${BUILD_SELECT} WHERE b.build_id = ? AND b.owner_key = ?`, [id, owner]);
    if (!b) throw notFound('保存したカスタムが見つかりません');
    return b;
  };

  /* ---------- 稼働確認 ---------- */
  app.get('/api/health', async (_req, res) => {
    await one(db, 'SELECT 1 AS ok');
    res.json({ ok: true, db: true });
  });

  /* ---------- カタログ(2-01) ---------- */
  app.get('/api/vehicles', async (_req, res) => {
    res.json(await listVehicles(db));
  });
  app.get('/api/vehicles/:code/catalog', async (req, res) => {
    const c = await loadCatalog(db, req.params.code);
    if (!c) throw notFound('車両が登録されていません');
    res.json(c);
  });

  /* ---------- 保存仕様(2-08) ---------- */
  app.get('/api/builds', async (req, res) => {
    const owner = ownerOf(req);
    const list = await rows<BuildRow>(db, `${BUILD_SELECT} WHERE b.owner_key = ? ORDER BY b.saved_at DESC, b.build_id DESC LIMIT ${MAX_BUILDS}`, [owner]);
    res.json(await Promise.all(list.map(toBuild)));
  });
  app.get('/api/builds/:id', async (req, res) => {
    res.json(await toBuild(await findBuild(ownerOf(req), idParam(req))));
  });
  app.post('/api/builds', async (req, res) => {
    const owner = ownerOf(req);
    const body = isObj(req.body) ? req.body : {};
    const { vehicle_code, spec } = body;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const style = typeof body.style_name === 'string' ? body.style_name.trim().slice(0, 50) : '';
    if (typeof vehicle_code !== 'string' || !isObj(spec)) throw badRequest('vehicle_code と spec を送ってください');
    if (name.length > 50) throw badRequest('保存名は50文字以内にしてください');
    const v = await vehicleRow(db, vehicle_code);
    if (!v) throw badRequest('その車両は登録されていません');
    const id = await tx(db, async (c) => {
      const count = (await one<{ n: number }>(c, 'SELECT COUNT(*) AS n FROM T_saved_builds WHERE owner_key = ? FOR UPDATE', [owner]))!.n;
      if (count >= MAX_BUILDS) throw badRequest(`保存できませんでした(上限は${MAX_BUILDS}件です)。いらないものを削除してください。`);
      const defaults = v.default_spec_id ? await readSpec(c, v.default_spec_id) : {};
      const specId = await writeSpec(c, await idsOf(c, v.vehicle_id), spec as Spec, defaults);
      const r = await exec(c, 'INSERT INTO T_saved_builds (owner_key, name, style_name, spec_id) VALUES (?, ?, ?, ?)', [owner, name || `ビルド #${count + 1}`, style, specId]);
      return r.insertId;
    });
    res.status(201).json(await toBuild(await findBuild(owner, id)));
  });
  app.patch('/api/builds/:id', async (req, res) => {
    const owner = ownerOf(req);
    const id = idParam(req);
    const name = isObj(req.body) && typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 50) throw badRequest('保存名を1〜50文字で入れてください');
    await findBuild(owner, id);
    await exec(db, 'UPDATE T_saved_builds SET name = ? WHERE build_id = ? AND owner_key = ?', [name, id, owner]);
    res.json(await toBuild(await findBuild(owner, id)));
  });
  app.delete('/api/builds/:id', async (req, res) => {
    const owner = ownerOf(req);
    const b = await findBuild(owner, idParam(req));
    await tx(db, async (c) => {
      await exec(c, 'DELETE FROM T_saved_builds WHERE build_id = ?', [b.build_id]);
      await exec(c, 'DELETE FROM T_build_specs WHERE spec_id = ?', [b.spec_id]);
    });
    res.status(204).end();
  });

  /* ---------- 管理者ログイン(2-10) ---------- */
  app.get('/api/admin/me', (req, res) => {
    res.json(req.session.admin ? { login_id: req.session.admin.login_id, name: req.session.admin.name } : null);
  });
  app.post('/api/admin/login', async (req, res) => {
    const login_id = isObj(req.body) && typeof req.body.login_id === 'string' ? req.body.login_id.trim() : '';
    const password = isObj(req.body) && typeof req.body.password === 'string' ? req.body.password : '';
    if (!login_id || !password) throw badRequest('ログインIDとパスワードを入れてください');
    const a = await one<{ admin_id: number; login_id: string; name: string; password_hash: string; fail_count: number; locked_until: Date | null }>(db,
      'SELECT admin_id, login_id, name, password_hash, fail_count, locked_until FROM T_admins WHERE login_id = ?', [login_id]);
    if (a?.locked_until && new Date(a.locked_until) > new Date()) {
      const t = new Date(a.locked_until);
      throw new HttpError(423, 'LOCKED', `ログインできません。${t.getHours()}時${String(t.getMinutes()).padStart(2, '0')}分以降にもう一度お試しください。`);
    }
    const ok = await bcrypt.compare(password, a?.password_hash ?? DUMMY_HASH);
    if (!a || !ok) {
      if (a) {
        const fails = a.fail_count + 1;
        if (fails >= LOCK_FAILS) await exec(db, `UPDATE T_admins SET fail_count = 0, locked_until = DATE_ADD(NOW(), INTERVAL ${LOCK_MINUTES} MINUTE) WHERE admin_id = ?`, [a.admin_id]);
        else await exec(db, 'UPDATE T_admins SET fail_count = ? WHERE admin_id = ?', [fails, a.admin_id]);
      }
      throw new HttpError(401, 'UNAUTHORIZED', 'ログインIDまたはパスワードが違います。');
    }
    await exec(db, 'UPDATE T_admins SET fail_count = 0, locked_until = NULL, last_login_at = NOW() WHERE admin_id = ?', [a.admin_id]);
    // ログインの前後でセッションIDを変える(セッション固定攻撃の対策)
    await new Promise<void>((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
    req.session.admin = { id: a.admin_id, login_id: a.login_id, name: a.name };
    res.json({ login_id: a.login_id, name: a.name });
  });
  app.post('/api/admin/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('garage.sid');
      res.json({ ok: true });
    });
  });

  /* ---------- ベース車両追加(2-02)・パーツ追加(2-03) ---------- */
  app.post('/api/admin/vehicles', requireAdmin, async (req, res) => {
    const errors = validateVehicleDefinition(req.body);
    if (errors.length) throw badRequest('定義ファイルに誤りがあります。検証結果を確認してください。', errors);
    const def = req.body as CatalogJson;
    await tx(db, (c) => saveCatalog(c, def, req.query.overwrite === 'true'));
    res.status(201).json((await loadCatalog(db, def.vehicle.code))!.vehicle);
  });
  app.post('/api/admin/vehicles/:code/parts', requireAdmin, async (req, res) => {
    const code = String(req.params.code);
    const catalog = await tx(db, (c) => addPart(c, code, req.body as PartDefinition, req.query.overwrite === 'true'));
    res.status(201).json(catalog);
  });

  app.use('/api', () => {
    throw notFound('その API はありません');
  });

  /* ---------- 画面(ビルド済みのとき) ---------- */
  if (staticDir && existsSync(path.join(staticDir, 'index.html'))) {
    app.use(express.static(staticDir, { index: false, maxAge: '1h' }));
    // /admin など画面の URL は、すべて画面アプリに渡す
    app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(staticDir, 'index.html')) : next()));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return void res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    if (err instanceof SyntaxError && 'body' in err) return void res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'JSON の形が正しくありません', details: [] } });
    if (isObj(err) && err.type === 'entity.too.large') return void res.status(413).json({ error: { code: 'VALIDATION_ERROR', message: 'ファイルが大きすぎます(2MBまで)', details: [] } });
    console.error(err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'サーバーでエラーが起きました。時間をおいてもう一度お試しください。', details: [] } });
  });
  return app;
}

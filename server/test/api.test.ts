/*
 * API の結合テスト。本物の MySQL にテスト用のデータベース(<DB_NAME>_test)を作り直して使う。
 * MySQL につながらないときは飛ばす。
 */
import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { CatalogJson, PartDefinition } from '../../web/src/catalog/definition';
import { BUILTIN, buildVehicle } from '../../web/src/catalog/fromCatalog';
import { totalPrice } from '../../web/src/logic/price';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { createPool, exec, type Db } from '../src/db';
import { initDatabase } from '../src/scripts/init-db';

const DB = `${config.db.database}_test`;
const sample = <T,>(name: string) => JSON.parse(readFileSync(new URL(`../../web/public/samples/${name}`, import.meta.url), 'utf8')) as T;
const OWNER = '11111111-2222-4333-8444-555555555555';
const OTHER = '99999999-2222-4333-8444-555555555555';

let reachable = true;
try {
  const p = createPool('mysql');
  await p.query('SELECT 1');
  await p.end();
} catch {
  reachable = false;
  console.warn('MySQL につながらないので、API のテストを飛ばします');
}

describe.skipIf(!reachable)('API', () => {
  let db: Db;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    await initDatabase({ database: DB, reset: true, admin: { login_id: 'admin', name: '管理者', password: 'admin-pass-1234' } });
    db = createPool(DB);
    await exec(db, 'INSERT INTO T_admins (login_id, password_hash, name) VALUES (?, ?, ?)', ['locktest', await bcrypt.hash('right-password', 4), 'ロック確認']);
    app = createApp({ db, sessionSecret: 'test-secret' });
  });
  afterAll(async () => {
    await db?.end();
  });

  const login = async () => {
    const agent = request.agent(app);
    await agent.post('/api/admin/login').send({ login_id: 'admin', password: 'admin-pass-1234' }).expect(200);
    return agent;
  };

  test('稼働確認', async () => {
    await request(app).get('/api/health').expect(200, { ok: true, db: true });
    await request(app).get('/api/nothing').expect(404);
  });

  test.each([['V001', 'supersport'], ['V002', 'american']] as const)('%s のカタログを DB から読んで描くと、組み込みの車両と同じになる', async (code, r) => {
    const { body } = await request(app).get(`/api/vehicles/${code}/catalog`).expect(200);
    const v = buildVehicle(body as CatalogJson);
    const b = BUILTIN[r];
    expect(v.defaults).toEqual(b.defaults);
    expect(v.presets.map((p) => p.name)).toEqual(b.presets.map((p) => p.name));
    for (const p of b.presets) {
      const s = { ...b.defaults, ...p.spec };
      expect(v.draw(s)).toBe(b.draw(s));
      expect(v.sheet(s)).toEqual(b.sheet(s));
      expect(totalPrice(v, s)).toBe(totalPrice(b, s));
      // プリセットは DB では全部入りの仕様になるが、適用した結果は同じ
      expect({ ...v.defaults, ...v.presets[b.presets.indexOf(p)].spec }).toEqual(s);
    }
  });

  describe('保存仕様', () => {
    test('利用者キーがないと使えない', async () => {
      await request(app).get('/api/builds').expect(400);
    });

    test('保存・一覧・呼出・名前の変更・削除。他の人の分は見えない', async () => {
      const spec = { ...BUILTIN.supersport.defaults, cowl: 'naked', exhaust: 'slipon', main: '#123abc', lower: 7, zekken: true, number: 5 };
      const created = await request(app).post('/api/builds').set('X-Owner-Key', OWNER)
        .send({ vehicle_code: 'V001', name: '', style_name: 'ストリートファイター', spec }).expect(201);
      expect(created.body).toMatchObject({ vehicle_code: 'V001', name: 'ビルド #1', style_name: 'ストリートファイター' });
      expect(created.body.spec).toEqual({ ...spec, main: '#123abc' });
      const id = created.body.id;
      expect((await request(app).get('/api/builds').set('X-Owner-Key', OWNER).expect(200)).body).toHaveLength(1);
      expect((await request(app).get('/api/builds').set('X-Owner-Key', OTHER).expect(200)).body).toHaveLength(0);
      await request(app).get(`/api/builds/${id}`).set('X-Owner-Key', OTHER).expect(404);
      await request(app).patch(`/api/builds/${id}`).set('X-Owner-Key', OWNER).send({ name: '通勤カスタム' }).expect(200);
      expect((await request(app).get(`/api/builds/${id}`).set('X-Owner-Key', OWNER)).body.name).toBe('通勤カスタム');
      await request(app).delete(`/api/builds/${id}`).set('X-Owner-Key', OTHER).expect(404);
      await request(app).delete(`/api/builds/${id}`).set('X-Owner-Key', OWNER).expect(204);
      expect((await request(app).get('/api/builds').set('X-Owner-Key', OWNER)).body).toHaveLength(0);
    });

    test('無いパーツや壊れた色は、標準に直して保存する', async () => {
      const { body } = await request(app).post('/api/builds').set('X-Owner-Key', OTHER)
        .send({ vehicle_code: 'V002', name: 'x', spec: { tank: 'nothing', main: 'red', lower: 999 } }).expect(201);
      expect(body.spec.tank).toBe('teardrop');
      expect(body.spec.main).toBe('#141416');
      expect(body.spec.lower).toBe(20);
    });

    test('1人50件まで', async () => {
      const owner = '22222222-2222-4333-8444-555555555555';
      for (let i = 0; i < 50; i++) {
        await request(app).post('/api/builds').set('X-Owner-Key', owner).send({ vehicle_code: 'V001', name: `#${i}`, spec: {} }).expect(201);
      }
      const r = await request(app).post('/api/builds').set('X-Owner-Key', owner).send({ vehicle_code: 'V001', name: 'over', spec: {} }).expect(400);
      expect(r.body.error.message).toContain('上限は50件');
    });
  });

  describe('管理者', () => {
    test('ログインしていないと、管理用の API は使えない', async () => {
      await request(app).get('/api/admin/me').expect(200, 'null');
      await request(app).post('/api/admin/vehicles').send({}).expect(401);
    });

    test('パスワードが違うと入れず、5回続けて間違えると15分ロックする', async () => {
      for (let i = 0; i < 4; i++) {
        const r = await request(app).post('/api/admin/login').send({ login_id: 'locktest', password: 'wrong' }).expect(401);
        expect(r.body.error.message).toBe('ログインIDまたはパスワードが違います。');
      }
      await request(app).post('/api/admin/login').send({ login_id: 'locktest', password: 'wrong' }).expect(401);
      const locked = await request(app).post('/api/admin/login').send({ login_id: 'locktest', password: 'right-password' }).expect(423);
      expect(locked.body.error.code).toBe('LOCKED');
      await request(app).post('/api/admin/login').send({ login_id: 'nobody', password: 'x' }).expect(401);
    });

    test('ログイン・ログアウト', async () => {
      const agent = await login();
      expect((await agent.get('/api/admin/me')).body).toEqual({ login_id: 'admin', name: '管理者' });
      await agent.post('/api/admin/logout').send({}).expect(200);
      expect((await agent.get('/api/admin/me')).body).toBeNull();
    });

    test('ベース車両追加: 検証・登録・重複・上書き', async () => {
      const agent = await login();
      const def = sample<CatalogJson>('vehicle-naked.json');
      const bad = await agent.post('/api/admin/vehicles').send({ ...def, slots: [] }).expect(400);
      expect(bad.body.error.details).toContain('slots: 部位が1つもありません');
      await agent.post('/api/admin/vehicles').send(def).expect(201);
      expect((await request(app).get('/api/vehicles')).body.map((v: { code: string }) => v.code)).toEqual(['V001', 'V002', 'V003']);
      const dup = await agent.post('/api/admin/vehicles').send(def).expect(409);
      expect(dup.body.error.code).toBe('DUPLICATE');

      const { body } = await request(app).get('/api/vehicles/V003/catalog').expect(200);
      expect(body.slots.map((s: { code: string }) => s.code)).toEqual(def.slots.map((s) => s.code));
      expect(body.constraints).toEqual(def.constraints);
      const v = buildVehicle(body);
      expect(v.draw(v.defaults)).toBe(buildVehicle(def).draw(buildVehicle(def).defaults));

      // ラウンドタンクを使って保存してから、そのタンクを消して上書きする
      const saved = await request(app).post('/api/builds').set('X-Owner-Key', OWNER).send({ vehicle_code: 'V003', name: 'naked', spec: { ...def.defaultSpec, tank: 'angular' } }).expect(201);
      const def2 = structuredClone(def);
      def2.vehicle.name = 'ネイキッド改';
      def2.slots[0].parts = def2.slots[0].parts.filter((p) => p.code !== 'angular');
      def2.presets = def2.presets.filter((p) => p.spec.tank !== 'angular');
      await agent.post('/api/admin/vehicles?overwrite=true').send(def2).expect(201);
      const after = (await request(app).get('/api/vehicles/V003/catalog')).body as CatalogJson;
      expect(after.vehicle.name).toBe('ネイキッド改');
      expect(after.slots[0].parts.map((p) => p.code)).toEqual(['round']);
      // 保存した仕様は消えず、もう無いパーツのコードのまま読める(画面で標準に置き換える)
      expect((await request(app).get(`/api/builds/${saved.body.id}`).set('X-Owner-Key', OWNER)).body.spec.tank).toBe('angular');
      // 組み込みの車両は上書きできない
      const builtin = await agent.post('/api/admin/vehicles?overwrite=true').send({ ...def, vehicle: { ...def.vehicle, code: 'V001' } }).expect(409);
      expect(builtin.body.error.message).toContain('組み込み');
    });

    test('パーツ追加: 組み込みの車両に、描画データ付きのパーツと制約を足す', async () => {
      const agent = await login();
      const part = sample<PartDefinition>('part-supersport-exhaust.json');
      const { body } = await agent.post('/api/admin/vehicles/V001/parts').send(part).expect(201);
      const v = buildVehicle(body);
      expect(v.parts.exhaust.options.map((o) => o[0])).toContain('dualblack');
      expect(v.draw({ ...v.defaults, exhaust: 'dualblack' })).toContain('#1d1e21');
      expect(v.constraints.some((c) => c.when.value === 'dualblack')).toBe(true);
      expect((await agent.post('/api/admin/vehicles/V001/parts').send(part).expect(409)).body.error.code).toBe('DUPLICATE');
      await agent.post('/api/admin/vehicles/V001/parts?overwrite=true').send({ ...part, part: { ...part.part, price_yen: 150000 }, constraints: [] }).expect(201);
      const again = buildVehicle((await request(app).get('/api/vehicles/V001/catalog')).body);
      expect(again.prices.exhaust.dualblack).toBe(150000);

      // 新しい部位を作ると、標準仕様にそのパーツが付く
      const side: PartDefinition = { slot: { code: 'sidebag', name: 'サイドバッグ' }, part: { code: 'leather', name: 'レザー', weight_diff_kg: 3, price_yen: 38000, svg: '<rect x="250" y="220" width="60" height="40" fill="{{seatColor}}"/>' } };
      const withSide = buildVehicle((await agent.post('/api/admin/vehicles/V001/parts').send(side).expect(201)).body);
      expect(withSide.defaults.sidebag).toBe('leather');
      const bad = await agent.post('/api/admin/vehicles/V001/parts').send({ ...side, part: { ...side.part, code: 'x2', svg: '<script>alert(1)</script>' } }).expect(400);
      expect(bad.body.error.details[0]).toContain('script');
      await agent.post('/api/admin/vehicles/V999/parts').send(side).expect(404);
    });
  });
});

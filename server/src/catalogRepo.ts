/* カタログ(車両・部位・パーツ・塗装・制約・プリセット)と仕様の読み書き */
import type { CatalogConstraint, CatalogJson, CatalogVehicle, PartDefinition } from '../../web/src/catalog/definition';
import { RE, validatePartDefinition } from '../../web/src/catalog/definition';
import type { Spec } from '../../web/src/catalog/types';
import { exec, one, rows, type Conn } from './db';
import { HttpError, badRequest, notFound } from './errors';

/** 車両の中の、コード → ID の対応 */
interface Ids {
  vehicleId: number;
  lowerMaxMm: number;
  slots: Map<string, { id: number; parts: Map<string, number> }>;
  paints: Map<string, { id: number; colors: string[] }>;
}

export async function idsOf(c: Conn, vehicleId: number): Promise<Ids> {
  const v = await one<{ lower_max_mm: number }>(c, 'SELECT lower_max_mm FROM T_vehicles WHERE vehicle_id = ?', [vehicleId]);
  const slots = new Map<string, { id: number; parts: Map<string, number> }>();
  for (const s of await rows<{ slot_id: number; slot_code: string }>(c, 'SELECT slot_id, slot_code FROM T_part_slots WHERE vehicle_id = ? ORDER BY sort_order, slot_id', [vehicleId])) {
    slots.set(s.slot_code, { id: s.slot_id, parts: new Map() });
  }
  for (const p of await rows<{ part_id: number; part_code: string; slot_code: string }>(c,
    'SELECT p.part_id, p.part_code, s.slot_code FROM T_parts p JOIN T_part_slots s ON s.slot_id = p.slot_id WHERE s.vehicle_id = ? AND p.is_active = 1 ORDER BY p.part_id', [vehicleId])) {
    slots.get(p.slot_code)!.parts.set(p.part_code, p.part_id);
  }
  const paints = new Map<string, { id: number; colors: string[] }>();
  for (const p of await rows<{ paint_slot_id: number; paint_code: string }>(c, 'SELECT paint_slot_id, paint_code FROM T_paint_slots WHERE vehicle_id = ? ORDER BY sort_order, paint_slot_id', [vehicleId])) {
    paints.set(p.paint_code, { id: p.paint_slot_id, colors: [] });
  }
  for (const col of await rows<{ paint_code: string; hex: string }>(c,
    'SELECT ps.paint_code, pc.hex FROM T_palette_colors pc JOIN T_paint_slots ps ON ps.paint_slot_id = pc.paint_slot_id WHERE ps.vehicle_id = ? ORDER BY pc.sort_order', [vehicleId])) {
    paints.get(col.paint_code)!.colors.push(col.hex);
  }
  return { vehicleId, lowerMaxMm: v?.lower_max_mm ?? 0, slots, paints };
}

const clampInt = (v: unknown, min: number, max: number) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
};

/**
 * 仕様を書き込み、仕様IDを返す。無いパーツ・壊れた色は defaults(なければ候補の先頭)に置き換える。
 * 画面の lower は 2mm 単位なので、DB には mm(×2)で持つ。
 */
export async function writeSpec(c: Conn, ids: Ids, spec: Spec, defaults: Spec): Promise<number> {
  const options = Object.fromEntries(
    Object.entries(spec)
      .filter(([k, v]) => typeof v === 'boolean' && !ids.slots.has(k) && !ids.paints.has(k) && RE.code.test(k))
      .slice(0, 20),
  );
  const steps = clampInt(spec.lower ?? 0, 0, Math.floor(ids.lowerMaxMm / 2));
  const number = typeof spec.number === 'number' ? clampInt(spec.number, 0, 99) : null;
  const r = await exec(c, 'INSERT INTO T_build_specs (vehicle_id, lower_mm, number_no, options_json) VALUES (?, ?, ?, ?)', [
    ids.vehicleId, steps * 2, number, Object.keys(options).length ? JSON.stringify(options) : null,
  ]);
  const specId = r.insertId;
  const partRows: number[][] = [];
  for (const [code, slot] of ids.slots) {
    if (slot.parts.size === 0) continue;
    const pick = [spec[code], defaults[code]].find((v) => slot.parts.has(String(v)));
    partRows.push([specId, slot.id, pick !== undefined ? slot.parts.get(String(pick))! : [...slot.parts.values()][0]]);
  }
  if (partRows.length) await exec(c, 'INSERT INTO T_build_spec_parts (spec_id, slot_id, part_id) VALUES ?', [partRows]);
  const colorRows: (number | string)[][] = [];
  for (const [code, paint] of ids.paints) {
    if (paint.colors.length === 0) continue;
    const hex = [spec[code], defaults[code]].find((v) => typeof v === 'string' && RE.hex.test(v)) as string | undefined;
    colorRows.push([specId, paint.id, (hex ?? paint.colors[0]).toLowerCase()]);
  }
  if (colorRows.length) await exec(c, 'INSERT INTO T_build_spec_colors (spec_id, paint_slot_id, hex) VALUES ?', [colorRows]);
  return specId;
}

/** 仕様を読む(公開を止めたパーツも、そのままコードで返す) */
export async function readSpec(c: Conn, specId: number): Promise<Spec> {
  const s = await one<{ lower_mm: number; number_no: number | null; options_json: unknown }>(c,
    'SELECT lower_mm, number_no, options_json FROM T_build_specs WHERE spec_id = ?', [specId]);
  if (!s) return {};
  const spec: Spec = {};
  for (const p of await rows<{ slot_code: string; part_code: string }>(c,
    'SELECT sl.slot_code, p.part_code FROM T_build_spec_parts bp JOIN T_part_slots sl ON sl.slot_id = bp.slot_id JOIN T_parts p ON p.part_id = bp.part_id WHERE bp.spec_id = ?', [specId])) {
    spec[p.slot_code] = p.part_code;
  }
  for (const col of await rows<{ paint_code: string; hex: string }>(c,
    'SELECT ps.paint_code, bc.hex FROM T_build_spec_colors bc JOIN T_paint_slots ps ON ps.paint_slot_id = bc.paint_slot_id WHERE bc.spec_id = ?', [specId])) {
    spec[col.paint_code] = col.hex;
  }
  spec.lower = Math.floor(s.lower_mm / 2);
  if (s.number_no !== null) spec.number = s.number_no;
  const opts = typeof s.options_json === 'string' ? JSON.parse(s.options_json) : s.options_json;
  if (opts && typeof opts === 'object') for (const [k, v] of Object.entries(opts)) if (typeof v === 'boolean') spec[k] = v;
  return spec;
}

interface VehicleRow {
  vehicle_id: number;
  vehicle_code: string;
  name: string;
  genre_code: string;
  renderer: CatalogVehicle['renderer'];
  wheelbase_mm: number;
  seat_height_mm: number;
  ground_clearance_mm: number;
  base_weight_kg: string;
  lower_max_mm: number;
  base_svg: string | null;
  default_spec_id: number | null;
}

const toVehicle = (v: VehicleRow): CatalogVehicle => ({
  code: v.vehicle_code,
  name: v.name,
  genre: v.genre_code,
  renderer: v.renderer,
  wheelbase_mm: v.wheelbase_mm,
  seat_height_mm: v.seat_height_mm,
  ground_clearance_mm: v.ground_clearance_mm,
  base_weight_kg: Number(v.base_weight_kg),
  lower_max_mm: v.lower_max_mm,
  base_svg: v.base_svg,
});

export async function vehicleRow(c: Conn, code: string): Promise<VehicleRow | undefined> {
  return one<VehicleRow>(c, 'SELECT * FROM T_vehicles WHERE vehicle_code = ? AND is_active = 1', [code]);
}

/** 公開中の車両の一覧(GET /api/vehicles) */
export async function listVehicles(c: Conn): Promise<CatalogVehicle[]> {
  const list = await rows<VehicleRow>(c, 'SELECT * FROM T_vehicles WHERE is_active = 1 ORDER BY vehicle_code');
  return list.map((v) => ({ ...toVehicle(v), base_svg: null }));
}

/** 車両のカタログ(GET /api/vehicles/:code/catalog)。パーツのない部位、色のない塗装部位は出さない */
export async function loadCatalog(c: Conn, code: string): Promise<CatalogJson | undefined> {
  const v = await vehicleRow(c, code);
  if (!v) return undefined;
  const id = v.vehicle_id;
  const slotRows = await rows<{ slot_id: number; slot_code: string; name: string }>(c, 'SELECT slot_id, slot_code, name FROM T_part_slots WHERE vehicle_id = ? ORDER BY sort_order, slot_id', [id]);
  const partRows = await rows<{ slot_id: number; part_code: string; name: string; weight_diff_kg: string; price_yen: number | null; svg_template: string }>(c,
    'SELECT p.slot_id, p.part_code, p.name, p.weight_diff_kg, p.price_yen, p.svg_template FROM T_parts p JOIN T_part_slots s ON s.slot_id = p.slot_id WHERE s.vehicle_id = ? AND p.is_active = 1 ORDER BY p.part_id', [id]);
  const paintRows = await rows<{ paint_slot_id: number; paint_code: string; name: string }>(c, 'SELECT paint_slot_id, paint_code, name FROM T_paint_slots WHERE vehicle_id = ? ORDER BY sort_order, paint_slot_id', [id]);
  const colorRows = await rows<{ paint_slot_id: number; name: string; hex: string }>(c,
    'SELECT pc.paint_slot_id, pc.name, pc.hex FROM T_palette_colors pc JOIN T_paint_slots ps ON ps.paint_slot_id = pc.paint_slot_id WHERE ps.vehicle_id = ? ORDER BY pc.sort_order, pc.color_id', [id]);
  const consRows = await rows<{ type_code: 'EXCLUDE' | 'REQUIRE'; ss: string; sp: string; ts: string; tp: string; auto_resolve: number; message: string }>(c,
    `SELECT c.type_code, s1.slot_code AS ss, p1.part_code AS sp, s2.slot_code AS ts, p2.part_code AS tp, c.auto_resolve, c.message
       FROM T_constraints c
       JOIN T_parts p1 ON p1.part_id = c.source_part_id JOIN T_part_slots s1 ON s1.slot_id = p1.slot_id
       JOIN T_parts p2 ON p2.part_id = c.target_part_id JOIN T_part_slots s2 ON s2.slot_id = p2.slot_id
      WHERE c.vehicle_id = ? AND p1.is_active = 1 AND p2.is_active = 1 ORDER BY c.constraint_id`, [id]);
  const presetRows = await rows<{ name: string; spec_id: number }>(c, 'SELECT name, spec_id FROM T_presets WHERE vehicle_id = ? ORDER BY sort_order, preset_id', [id]);
  const presets = [];
  for (const p of presetRows) presets.push({ name: p.name, spec: await readSpec(c, p.spec_id) });
  return {
    vehicle: toVehicle(v),
    slots: slotRows
      .map((s) => ({
        code: s.slot_code,
        name: s.name,
        parts: partRows.filter((p) => p.slot_id === s.slot_id).map((p) => ({
          code: p.part_code, name: p.name, weight_diff_kg: Number(p.weight_diff_kg), price_yen: p.price_yen, svg: p.svg_template,
        })),
      }))
      .filter((s) => s.parts.length > 0),
    paints: paintRows
      .map((p) => ({ code: p.paint_code, name: p.name, colors: colorRows.filter((x) => x.paint_slot_id === p.paint_slot_id).map((x) => ({ name: x.name, hex: x.hex })) }))
      .filter((p) => p.colors.length > 0),
    defaultSpec: v.default_spec_id ? await readSpec(c, v.default_spec_id) : {},
    presets,
    constraints: consRows.map((x): CatalogConstraint => ({
      type: x.type_code, source: { slot: x.ss, part: x.sp }, target: { slot: x.ts, part: x.tp }, auto_resolve: !!x.auto_resolve, message: x.message,
    })),
  };
}

async function upsertSlot(c: Conn, vehicleId: number, code: string, name: string, sort: number): Promise<number> {
  const r = await exec(c,
    'INSERT INTO T_part_slots (vehicle_id, slot_code, name, sort_order) VALUES (?, ?, ?, ?) AS n ON DUPLICATE KEY UPDATE name = n.name, sort_order = n.sort_order, slot_id = LAST_INSERT_ID(T_part_slots.slot_id)',
    [vehicleId, code, name, sort]);
  return r.insertId;
}

async function upsertPart(c: Conn, slotId: number, p: CatalogJson['slots'][number]['parts'][number]): Promise<void> {
  await exec(c,
    `INSERT INTO T_parts (slot_id, part_code, name, weight_diff_kg, price_yen, svg_template, is_active) VALUES (?, ?, ?, ?, ?, ?, 1) AS n
     ON DUPLICATE KEY UPDATE name = n.name, weight_diff_kg = n.weight_diff_kg, price_yen = n.price_yen, svg_template = n.svg_template, is_active = 1`,
    [slotId, p.code, p.name, p.weight_diff_kg, p.price_yen, p.svg]);
}

async function insertConstraints(c: Conn, ids: Ids, list: CatalogConstraint[]) {
  for (const x of list) {
    const s = ids.slots.get(x.source.slot)?.parts.get(x.source.part);
    const t = ids.slots.get(x.target.slot)?.parts.get(x.target.part);
    if (s === undefined || t === undefined) throw badRequest(`制約のパーツ ${x.source.slot}.${x.source.part} / ${x.target.slot}.${x.target.part} が見つかりません`);
    await exec(c, 'INSERT INTO T_constraints (vehicle_id, type_code, source_part_id, target_part_id, auto_resolve, message) VALUES (?, ?, ?, ?, ?, ?)',
      [ids.vehicleId, x.type, s, t, x.auto_resolve ? 1 : 0, x.message]);
  }
}

/**
 * 車両を登録する(初期データと、ベース車両追加 2-02)。overwrite なら同じ車両コードを上書きする。
 * 上書きで消えたパーツは公開を止めて残す(保存済みの仕様が参照しているため)。
 */
export async function saveCatalog(c: Conn, def: CatalogJson, overwrite = false): Promise<void> {
  const v = def.vehicle;
  const old = await one<{ vehicle_id: number; renderer: string; default_spec_id: number | null; is_active: number }>(c,
    'SELECT vehicle_id, renderer, default_spec_id, is_active FROM T_vehicles WHERE vehicle_code = ?', [v.code]);
  if (old && !overwrite) throw new HttpError(409, 'DUPLICATE', `${v.code}は登録済みです。上書きしますか?`);
  if (old && old.renderer !== 'template' && v.renderer === 'template') throw new HttpError(409, 'DUPLICATE', `${v.code}は組み込みの車両なので上書きできません。別の車両コードにしてください。`);
  const fields = [v.name, v.genre, v.wheelbase_mm, v.seat_height_mm, v.ground_clearance_mm, v.base_weight_kg, v.lower_max_mm, v.renderer, v.base_svg];
  let vehicleId: number;
  if (old) {
    vehicleId = old.vehicle_id;
    await exec(c, `UPDATE T_vehicles SET name = ?, genre_code = ?, wheelbase_mm = ?, seat_height_mm = ?, ground_clearance_mm = ?, base_weight_kg = ?,
                   lower_max_mm = ?, renderer = ?, base_svg = ?, is_active = 1 WHERE vehicle_id = ?`, [...fields, vehicleId]);
    await exec(c, 'UPDATE T_parts p JOIN T_part_slots s ON s.slot_id = p.slot_id SET p.is_active = 0 WHERE s.vehicle_id = ?', [vehicleId]);
    await exec(c, 'DELETE pc FROM T_palette_colors pc JOIN T_paint_slots ps ON ps.paint_slot_id = pc.paint_slot_id WHERE ps.vehicle_id = ?', [vehicleId]);
    await exec(c, 'DELETE FROM T_constraints WHERE vehicle_id = ?', [vehicleId]);
    const oldPresets = await rows<{ spec_id: number }>(c, 'SELECT spec_id FROM T_presets WHERE vehicle_id = ?', [vehicleId]);
    await exec(c, 'DELETE FROM T_presets WHERE vehicle_id = ?', [vehicleId]);
    if (oldPresets.length) await exec(c, 'DELETE FROM T_build_specs WHERE spec_id IN (?)', [oldPresets.map((p) => p.spec_id)]);
  } else {
    const r = await exec(c, `INSERT INTO T_vehicles (vehicle_code, name, genre_code, wheelbase_mm, seat_height_mm, ground_clearance_mm, base_weight_kg,
                             lower_max_mm, renderer, base_svg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [v.code, ...fields]);
    vehicleId = r.insertId;
  }
  for (const [i, slot] of def.slots.entries()) {
    const slotId = await upsertSlot(c, vehicleId, slot.code, slot.name, i);
    for (const p of slot.parts) await upsertPart(c, slotId, p);
  }
  for (const [i, paint] of def.paints.entries()) {
    const r = await exec(c,
      'INSERT INTO T_paint_slots (vehicle_id, paint_code, name, sort_order) VALUES (?, ?, ?, ?) AS n ON DUPLICATE KEY UPDATE name = n.name, sort_order = n.sort_order, paint_slot_id = LAST_INSERT_ID(T_paint_slots.paint_slot_id)',
      [vehicleId, paint.code, paint.name, i]);
    await exec(c, 'INSERT INTO T_palette_colors (paint_slot_id, name, hex, sort_order) VALUES ?', [paint.colors.map((x, j) => [r.insertId, x.name, x.hex.toLowerCase(), j])]);
  }
  const ids = await idsOf(c, vehicleId);
  await insertConstraints(c, ids, def.constraints);
  const defaultSpecId = await writeSpec(c, ids, def.defaultSpec, def.defaultSpec);
  await exec(c, 'UPDATE T_vehicles SET default_spec_id = ? WHERE vehicle_id = ?', [defaultSpecId, vehicleId]);
  if (old?.default_spec_id) await exec(c, 'DELETE FROM T_build_specs WHERE spec_id = ?', [old.default_spec_id]);
  for (const [i, p] of def.presets.entries()) {
    const specId = await writeSpec(c, ids, { ...def.defaultSpec, ...p.spec }, def.defaultSpec);
    await exec(c, 'INSERT INTO T_presets (vehicle_id, name, spec_id, sort_order) VALUES (?, ?, ?, ?)', [vehicleId, p.name, specId, i]);
  }
}

/** パーツを追加する(パーツ追加 2-03)。追加後のカタログを返す */
export async function addPart(c: Conn, code: string, def: PartDefinition, overwrite = false): Promise<CatalogJson> {
  const catalog = await loadCatalog(c, code);
  if (!catalog) throw notFound(`車両「${code}」はありません`);
  const errors = validatePartDefinition(def, catalog, overwrite);
  if (errors.length) {
    const dup = errors.some((e) => e.startsWith('part.code') && e.includes('もう'));
    if (dup && errors.length === 1) throw new HttpError(409, 'DUPLICATE', errors[0]);
    throw badRequest('パーツ定義ファイルに誤りがあります。検証結果を確認してください。', errors);
  }
  const v = (await vehicleRow(c, code))!;
  const existing = catalog.slots.find((s) => s.code === def.slot.code);
  const sort = await one<{ n: number }>(c, 'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM T_part_slots WHERE vehicle_id = ?', [v.vehicle_id]);
  const slotId = existing
    ? (await one<{ slot_id: number }>(c, 'SELECT slot_id FROM T_part_slots WHERE vehicle_id = ? AND slot_code = ?', [v.vehicle_id, def.slot.code]))!.slot_id
    : await upsertSlot(c, v.vehicle_id, def.slot.code, def.slot.name ?? def.slot.code, sort?.n ?? 0);
  await upsertPart(c, slotId, def.part);
  const ids = await idsOf(c, v.vehicle_id);
  await insertConstraints(c, ids, def.constraints ?? []);
  // 新しい部位なら、標準仕様ではこのパーツを付けておく
  if (!existing && v.default_spec_id) {
    await exec(c, 'INSERT INTO T_build_spec_parts (spec_id, slot_id, part_id) VALUES (?, ?, ?) AS n ON DUPLICATE KEY UPDATE part_id = n.part_id',
      [v.default_spec_id, slotId, ids.slots.get(def.slot.code)!.parts.get(def.part.code)!]);
  }
  return (await loadCatalog(c, code))!;
}


/*
 * カタログの JSON 形式。サーバーの API が返す形で、管理画面で読み込む「車両定義ファイル」も同じ形。
 * 画面とサーバーの両方がこのファイルを使う(検証の内容をそろえるため)。
 */
import type { Spec } from './types';

export interface CatalogPart {
  code: string;
  name: string;
  /** 標準パーツとの重量差(kg) */
  weight_diff_kg: number;
  /** 参考価格(円)。なしは null */
  price_yen: number | null;
  /** 描画データ(SVG の断片)。{{main}} のように書くと、その塗装部位の色に置き換わる。組み込みの車両の標準パーツは空 */
  svg: string;
}

export interface CatalogSlot {
  code: string;
  name: string;
  parts: CatalogPart[];
}

export interface CatalogPaint {
  code: string;
  name: string;
  colors: { name: string; hex: string }[];
}

export interface PartRef {
  slot: string;
  part: string;
}

export interface CatalogConstraint {
  /** EXCLUDE: 同時に付けられない / REQUIRE: 一緒に必要 */
  type: 'EXCLUDE' | 'REQUIRE';
  source: PartRef;
  target: PartRef;
  /** EXCLUDE で、相手を自動で外してよいか */
  auto_resolve: boolean;
  message: string;
}

/** 描画方法。supersport / american は組み込みの描画プログラム、template は定義ファイルの SVG で描く */
export type Renderer = 'supersport' | 'american' | 'template';

export interface CatalogVehicle {
  code: string;
  name: string;
  genre: string;
  renderer: Renderer;
  wheelbase_mm: number;
  seat_height_mm: number;
  ground_clearance_mm: number;
  base_weight_kg: number;
  lower_max_mm: number;
  /** 車体(フレーム、エンジンなど部位にしない部分)の描画データ。template のとき使う */
  base_svg: string | null;
}

export interface CatalogJson {
  vehicle: CatalogVehicle;
  slots: CatalogSlot[];
  paints: CatalogPaint[];
  defaultSpec: Spec;
  presets: { name: string; spec: Spec }[];
  constraints: CatalogConstraint[];
}

/** パーツ定義ファイル(パーツ追加 2-03) */
export interface PartDefinition {
  /** 追加先の部位。新しい部位を作るときは name も書く */
  slot: { code: string; name?: string };
  part: CatalogPart;
  /** このパーツに関わる組み合わせ制約。このパーツ自身は { slot, part } でそのまま書く */
  constraints?: CatalogConstraint[];
}

export const RE = {
  vehicleCode: /^V\d{3}$/,
  genre: /^[A-Z]{2}$/,
  code: /^[a-z][a-zA-Z0-9]{0,19}$/,
  hex: /^#[0-9a-fA-F]{6}$/,
};

/** 画面に直接入れる SVG なので、スクリプトや外部の読み込みにつながる書き方は受け付けない */
export function unsafeSvg(svg: string): string | null {
  const rules: [RegExp, string][] = [
    [/<\s*script/i, 'script 要素'],
    [/<\s*(foreignObject|iframe|object|embed|image|use|a|style|link|meta)\b/i, '使えない要素(foreignObject、image、use、a、style など)'],
    [/\son[a-z]+\s*=/i, 'イベント属性(onclick など)'],
    [/(href|xlink:href)\s*=/i, 'href 属性'],
    [/javascript:|data:|url\(\s*['"]?\s*(https?:|\/\/)/i, '外部の参照'],
  ];
  for (const [re, label] of rules) if (re.test(svg)) return `${label}は使えません`;
  return null;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isNum = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const isText = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

/** 部品の検証(重複のないコード、名前、重量、価格、描画データ) */
function checkPart(p: unknown, path: string, errors: string[], requireSvg: boolean) {
  if (!isObj(p)) return void errors.push(`${path}: パーツの形になっていません`);
  if (typeof p.code !== 'string' || !RE.code.test(p.code)) errors.push(`${path}.code: 英小文字で始まる英数字20文字以内にしてください`);
  if (!isText(p.name, 50)) errors.push(`${path}.name: パーツ名を50文字以内で入れてください`);
  if (!isNum(p.weight_diff_kg, -99.9, 99.9)) errors.push(`${path}.weight_diff_kg: -99.9〜99.9 の数にしてください`);
  if (!(p.price_yen === null || isInt(p.price_yen, 0, 9_999_999))) errors.push(`${path}.price_yen: 0〜9,999,999 の整数か null にしてください`);
  if (typeof p.svg !== 'string') errors.push(`${path}.svg: 描画データ(文字列)がありません`);
  else {
    if (requireSvg && !p.svg.trim()) errors.push(`${path}.svg: 描画データが空です`);
    const bad = unsafeSvg(p.svg);
    if (bad) errors.push(`${path}.svg: ${bad}`);
    if (p.svg.length > 200_000) errors.push(`${path}.svg: 描画データが大きすぎます(20万文字まで)`);
  }
}

function checkConstraint(c: unknown, path: string, errors: string[], has: (r: PartRef) => boolean) {
  if (!isObj(c)) return void errors.push(`${path}: 制約の形になっていません`);
  if (c.type !== 'EXCLUDE' && c.type !== 'REQUIRE') errors.push(`${path}.type: EXCLUDE か REQUIRE にしてください`);
  for (const k of ['source', 'target'] as const) {
    const r = c[k];
    if (!isObj(r) || typeof r.slot !== 'string' || typeof r.part !== 'string') errors.push(`${path}.${k}: { "slot": 部位コード, "part": パーツコード } の形にしてください`);
    else if (!has(r as unknown as PartRef)) errors.push(`${path}.${k}: ${r.slot}.${r.part} というパーツはありません`);
  }
  if (typeof c.auto_resolve !== 'boolean') errors.push(`${path}.auto_resolve: true か false にしてください`);
  if (!isText(c.message, 200)) errors.push(`${path}.message: 利用者に見せる説明を200文字以内で入れてください`);
}

function checkSpec(s: unknown, path: string, errors: string[], slots: CatalogSlot[], paints: CatalogPaint[], lowerSteps: number, full: boolean) {
  if (!isObj(s)) return void errors.push(`${path}: 仕様の形になっていません`);
  for (const slot of slots) {
    const v = s[slot.code];
    if (v === undefined) {
      if (full) errors.push(`${path}.${slot.code}: 標準仕様に部位「${slot.name}」のパーツがありません`);
    } else if (!slot.parts.some((p) => p.code === v)) errors.push(`${path}.${slot.code}: 「${String(v)}」は部位「${slot.name}」のパーツにありません`);
  }
  for (const paint of paints) {
    const v = s[paint.code];
    if (v === undefined) {
      if (full) errors.push(`${path}.${paint.code}: 標準仕様に塗装部位「${paint.name}」の色がありません`);
    } else if (typeof v !== 'string' || !RE.hex.test(v)) errors.push(`${path}.${paint.code}: 色は #RRGGBB の形にしてください`);
  }
  if (s.lower !== undefined && !isInt(s.lower, 0, lowerSteps)) errors.push(`${path}.lower: 0〜${lowerSteps} の整数にしてください`);
  const known = new Set(['lower', 'number', ...slots.map((x) => x.code), ...paints.map((x) => x.code)]);
  for (const [k, v] of Object.entries(s)) if (!known.has(k) && typeof v !== 'boolean') errors.push(`${path}.${k}: 知らない項目です`);
}

const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);

/** 車両定義ファイル(ベース車両追加 2-02)の検証。エラーがなければ空の配列 */
export function validateVehicleDefinition(d: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(d)) return ['ファイルの中身が JSON のオブジェクトになっていません'];
  const v = d.vehicle;
  if (!isObj(v)) errors.push('vehicle: 車両の情報がありません');
  else {
    if (typeof v.code !== 'string' || !RE.vehicleCode.test(v.code)) errors.push('vehicle.code: 車両コードは V と3桁の数字(例: V003)にしてください');
    if (!isText(v.name, 50)) errors.push('vehicle.name: 車両名を50文字以内で入れてください');
    if (typeof v.genre !== 'string' || !RE.genre.test(v.genre)) errors.push('vehicle.genre: ジャンルコードは英大文字2文字(例: NK)にしてください');
    if (v.renderer !== 'template') errors.push('vehicle.renderer: 追加する車両は "template" にしてください');
    if (!isInt(v.wheelbase_mm, 500, 3000)) errors.push('vehicle.wheelbase_mm: 500〜3000 の整数にしてください');
    if (!isInt(v.seat_height_mm, 300, 1200)) errors.push('vehicle.seat_height_mm: 300〜1200 の整数にしてください');
    if (!isInt(v.ground_clearance_mm, 50, 500)) errors.push('vehicle.ground_clearance_mm: 50〜500 の整数にしてください');
    if (!isNum(v.base_weight_kg, 50, 999.9)) errors.push('vehicle.base_weight_kg: 50〜999.9 の数にしてください');
    if (!isInt(v.lower_max_mm, 0, 100)) errors.push('vehicle.lower_max_mm: 0〜100 の整数にしてください');
    if (typeof v.base_svg !== 'string' || !v.base_svg.trim()) errors.push('vehicle.base_svg: 車体の描画データがありません');
    else {
      const bad = unsafeSvg(v.base_svg);
      if (bad) errors.push(`vehicle.base_svg: ${bad}`);
    }
  }
  const slots = Array.isArray(d.slots) ? (d.slots as CatalogSlot[]) : [];
  if (!Array.isArray(d.slots) || slots.length === 0) errors.push('slots: 部位が1つもありません');
  slots.forEach((s, i) => {
    const path = `slots[${i}]`;
    if (!isObj(s)) return void errors.push(`${path}: 部位の形になっていません`);
    if (typeof s.code !== 'string' || !RE.code.test(s.code)) errors.push(`${path}.code: 英小文字で始まる英数字20文字以内にしてください`);
    if (!isText(s.name, 30)) errors.push(`${path}.name: 部位名を30文字以内で入れてください`);
    if (!Array.isArray(s.parts) || s.parts.length === 0) errors.push(`${path}.parts: パーツが1つもありません`);
    else {
      s.parts.forEach((p, j) => checkPart(p, `${path}.parts[${j}]`, errors, false));
      for (const c of dupes(s.parts.map((p) => p.code))) errors.push(`${path}.parts: パーツコード「${c}」が重複しています`);
    }
  });
  for (const c of dupes(slots.map((s) => s?.code))) errors.push(`slots: 部位コード「${c}」が重複しています`);
  const paints = Array.isArray(d.paints) ? (d.paints as CatalogPaint[]) : [];
  if (!Array.isArray(d.paints) || paints.length === 0) errors.push('paints: 塗装部位が1つもありません');
  paints.forEach((p, i) => {
    const path = `paints[${i}]`;
    if (!isObj(p)) return void errors.push(`${path}: 塗装部位の形になっていません`);
    if (typeof p.code !== 'string' || !RE.code.test(p.code)) errors.push(`${path}.code: 英小文字で始まる英数字20文字以内にしてください`);
    if (!isText(p.name, 30)) errors.push(`${path}.name: 塗装部位名を30文字以内で入れてください`);
    if (!Array.isArray(p.colors) || p.colors.length === 0) errors.push(`${path}.colors: 色が1つもありません`);
    else {
      p.colors.forEach((c, j) => {
        if (!isObj(c) || !isText(c.name, 30) || typeof c.hex !== 'string' || !RE.hex.test(c.hex)) errors.push(`${path}.colors[${j}]: { "name": 色名, "hex": "#RRGGBB" } の形にしてください`);
      });
      for (const c of dupes(p.colors.map((c) => String(c?.hex).toLowerCase()))) errors.push(`${path}.colors: 色「${c}」が重複しています`);
    }
  });
  for (const c of dupes([...slots.map((s) => s?.code), ...paints.map((p) => p?.code)])) errors.push(`部位と塗装部位で、コード「${c}」が重複しています`);
  if (errors.length) return errors;

  const steps = Math.floor((v as unknown as CatalogVehicle).lower_max_mm / 2);
  checkSpec(d.defaultSpec, 'defaultSpec', errors, slots, paints, steps, true);
  if (d.presets !== undefined && !Array.isArray(d.presets)) errors.push('presets: 配列にしてください');
  (Array.isArray(d.presets) ? d.presets : []).forEach((p, i) => {
    if (!isObj(p) || !isText(p.name, 50)) return void errors.push(`presets[${i}].name: プリセット名を50文字以内で入れてください`);
    checkSpec(p.spec, `presets[${i}].spec`, errors, slots, paints, steps, false);
  });
  const has = (r: PartRef) => slots.some((s) => s.code === r.slot && s.parts.some((p) => p.code === r.part));
  if (d.constraints !== undefined && !Array.isArray(d.constraints)) errors.push('constraints: 配列にしてください');
  (Array.isArray(d.constraints) ? d.constraints : []).forEach((c, i) => checkConstraint(c, `constraints[${i}]`, errors, has));
  return errors;
}

/** パーツ定義ファイル(パーツ追加 2-03)の検証。追加先の車両のカタログと照らし合わせる */
export function validatePartDefinition(d: unknown, catalog: CatalogJson, overwrite = false): string[] {
  const errors: string[] = [];
  if (!isObj(d)) return ['ファイルの中身が JSON のオブジェクトになっていません'];
  const slotRef = d.slot;
  let slot: CatalogSlot | undefined;
  if (!isObj(slotRef) || typeof slotRef.code !== 'string' || !RE.code.test(slotRef.code)) errors.push('slot.code: 部位コードを英小文字で始まる英数字20文字以内で入れてください');
  else {
    slot = catalog.slots.find((s) => s.code === slotRef.code);
    if (!slot) {
      if (catalog.paints.some((p) => p.code === slotRef.code)) errors.push(`slot.code: 「${slotRef.code}」は塗装部位のコードです`);
      if (!isText(slotRef.name, 30)) errors.push(`slot.name: 新しい部位「${slotRef.code}」を作るので、部位名を30文字以内で入れてください`);
    }
  }
  checkPart(d.part, 'part', errors, true);
  const part = d.part as CatalogPart | undefined;
  if (slot && part && slot.parts.some((p) => p.code === part.code) && !overwrite) errors.push(`part.code: 部位「${slot.name}」にはもう「${part.code}」があります`);
  if (errors.length) return errors;
  const has = (r: PartRef) =>
    (r.slot === (slotRef as { code: string }).code && r.part === part!.code) ||
    catalog.slots.some((s) => s.code === r.slot && s.parts.some((p) => p.code === r.part));
  if (d.constraints !== undefined && !Array.isArray(d.constraints)) errors.push('constraints: 配列にしてください');
  (Array.isArray(d.constraints) ? d.constraints : []).forEach((c, i) => checkConstraint(c, `constraints[${i}]`, errors, has));
  return errors;
}

/** カタログにパーツ定義を足した形(プレビューと、サーバーでの登録に使う) */
export function withPart(catalog: CatalogJson, d: PartDefinition): CatalogJson {
  const slots = catalog.slots.map((s) => ({ ...s, parts: [...s.parts] }));
  let slot = slots.find((s) => s.code === d.slot.code);
  if (!slot) {
    slot = { code: d.slot.code, name: d.slot.name ?? d.slot.code, parts: [] };
    slots.push(slot);
  }
  const i = slot.parts.findIndex((p) => p.code === d.part.code);
  if (i >= 0) slot.parts[i] = d.part;
  else slot.parts.push(d.part);
  const defaultSpec = { ...catalog.defaultSpec };
  // 新しい部位の標準は、追加したパーツ
  if (defaultSpec[slot.code] === undefined) defaultSpec[slot.code] = d.part.code;
  return { ...catalog, slots, defaultSpec, constraints: [...catalog.constraints, ...(d.constraints ?? [])] };
}

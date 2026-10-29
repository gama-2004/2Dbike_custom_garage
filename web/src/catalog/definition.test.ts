import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { applyRules, disabledOptions, disabledSlots, sanitizeSpec } from '../logic/constraints';
import { totalPrice } from '../logic/price';
import { unsafeSvg, validatePartDefinition, validateVehicleDefinition, withPart, type CatalogJson, type PartDefinition } from './definition';
import { BUILTIN, buildVehicle, builtinCatalog } from './fromCatalog';
import type { Spec, Vehicle } from './types';

const sample = <T,>(name: string) => JSON.parse(readFileSync(new URL(`../../public/samples/${name}`, import.meta.url), 'utf8')) as T;

let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function randomSpec(v: Vehicle): Spec {
  const s: Spec = { ...v.defaults };
  for (const [k, slot] of Object.entries(v.parts)) s[k] = slot.options[Math.floor(rand() * slot.options.length)][0];
  for (const [k, sw] of Object.entries(v.swatches)) s[k] = sw[Math.floor(rand() * sw.length)][0];
  v.randomExtra?.(s, rand);
  s.lower = Math.floor(rand() * (v.lowerMax + 1));
  return s;
}

describe.each(['supersport', 'american'] as const)('組み込み車両 %s をカタログにして戻す', (r) => {
  const b = BUILTIN[r];
  const v = buildVehicle(builtinCatalog(r));

  test('図・ビルドシート・重量・価格・スタイル名が元と同じ', () => {
    const specs = [...b.presets.map((p) => ({ ...b.defaults, ...p.spec })), ...Array.from({ length: 80 }, () => randomSpec(b))];
    for (const s of specs) {
      expect(v.draw(s)).toBe(b.draw(s));
      expect(v.sheet(s)).toEqual(b.sheet(s));
      expect(v.weight(s)).toBeCloseTo(b.weight(s), 5);
      expect(totalPrice(v, s)).toBe(totalPrice(b, s));
      expect(v.styleName(s)).toBe(b.styleName(s));
    }
  });

  test('制約も同じに効く', () => {
    for (const s of [b.defaults, ...b.presets.map((p) => ({ ...b.defaults, ...p.spec }))]) {
      expect(disabledSlots(v, s)).toEqual(disabledSlots(b, s));
    }
  });
});

describe('車両定義ファイル(2-02)', () => {
  const def = sample<CatalogJson>('vehicle-naked.json');

  test('サンプルは検証を通り、描ける', () => {
    expect(validateVehicleDefinition(def)).toEqual([]);
    const v = buildVehicle(def);
    for (const p of v.presets) {
      const svg = v.draw({ ...v.defaults, ...p.spec });
      expect(svg).not.toContain('{{');
      expect(svg).toContain('data-part="tank"');
    }
    expect(v.styleName({ ...v.defaults, ...v.presets[1].spec })).toBe('カフェレーサー');
  });

  test('アップマフラーにすると、タンデムシートは自動でシングルシートになる', () => {
    const v = buildVehicle(def);
    const r = applyRules(v, { ...v.defaults, exhaust: 'up' });
    expect(r.spec.seat).toBe('single');
    expect(r.notes[0]).toContain('タンデムシート');
    // 自動で外せる制約なので、選べなくはしない
    expect(disabledOptions(v, v.defaults).has('exhaust:up')).toBe(false);
    expect(disabledOptions(v, { ...v.defaults, exhaust: 'up', seat: 'single' }).has('seat:tandem')).toBe(true);
  });

  test('まちがいは、どこがだめかを返す', () => {
    const bad = structuredClone(def);
    bad.vehicle.code = 'X1';
    bad.slots[1].parts[1].code = bad.slots[1].parts[0].code;
    delete bad.defaultSpec.light;
    bad.slots[0].parts[0].svg = '<g onclick="alert(1)"/>';
    const errors = validateVehicleDefinition(bad);
    expect(errors.some((e) => e.startsWith('vehicle.code'))).toBe(true);
    expect(errors.some((e) => e.includes('重複'))).toBe(true);
    expect(errors.some((e) => e.includes('イベント属性'))).toBe(true);
    expect(validateVehicleDefinition({ ...def, slots: [] })).toContain('slots: 部位が1つもありません');
    const noDefault = structuredClone(def);
    delete noDefault.defaultSpec.light;
    expect(validateVehicleDefinition(noDefault)).toEqual(['defaultSpec.light: 標準仕様に部位「ヘッドライト」のパーツがありません']);
  });
});

describe('パーツ定義ファイル(2-03)', () => {
  const part = sample<PartDefinition>('part-supersport-exhaust.json');
  const cat = builtinCatalog('supersport');

  test('サンプルは検証を通り、組み込み車両の図に重ねて描ける', () => {
    expect(validatePartDefinition(part, cat)).toEqual([]);
    const v = buildVehicle(withPart(cat, part));
    const s: Spec = { ...v.defaults, exhaust: 'dualblack', seat: 'single' };
    expect(v.draw(s)).toContain('#1d1e21');
    expect(v.draw(s)).toContain(String(s.accent));
    expect(totalPrice(v, s)).toBe(142000 + 24800);
    expect(v.weight(s)).toBeCloseTo(BUILTIN.supersport.weight(s) - 2.8, 5);
    expect(applyRules(v, { ...v.defaults, exhaust: 'dualblack' }).spec.seat).toBe('single');
  });

  test('同じコードのパーツや、無い部位への制約は登録できない', () => {
    expect(validatePartDefinition({ ...part, part: { ...part.part, code: 'slipon' } }, cat)[0]).toContain('もう「slipon」があります');
    expect(validatePartDefinition({ ...part, part: { ...part.part, code: 'slipon' }, constraints: [] }, cat, true)).toEqual([]);
    expect(validatePartDefinition({ ...part, slot: { code: 'sidebag' } }, cat)[0]).toContain('部位名');
    const badRef = { ...part, constraints: [{ ...part.constraints![0], target: { slot: 'seat', part: 'xxx' } }] };
    expect(validatePartDefinition(badRef, cat)[0]).toContain('seat.xxx');
  });

  test('新しい部位を作ると、パーツ棚に区画が増える', () => {
    const def: PartDefinition = { slot: { code: 'sidebag', name: 'サイドバッグ' }, part: { ...part.part, code: 'leather', name: 'レザー' } };
    expect(validatePartDefinition(def, cat)).toEqual([]);
    const v = buildVehicle(withPart(cat, def));
    expect(v.shelf.some((s) => s.id === 'sec-sidebag')).toBe(true);
    expect(v.sheet(v.defaults).rows.at(-1)).toEqual(['サイドバッグ', 'レザー']);
  });
});

test('危ない SVG は受け付けない', () => {
  expect(unsafeSvg('<path d="M0 0"/>')).toBeNull();
  expect(unsafeSvg('<animate attributeName="x"/>')).toBeNull();
  for (const bad of ['<script>x</script>', '<g onload="x">', '<image href="http://x"/>', '<use xlink:href="#a"/>', '<a href="javascript:x">', '<rect fill="url(https://x)"/>']) {
    expect(unsafeSvg(bad), bad).not.toBeNull();
  }
});

test('もう無いパーツは標準に戻し、戻した部位を知らせる', () => {
  const v = BUILTIN.supersport;
  const r = sanitizeSpec(v, { exhaust: 'deleted', main: 'red', lower: 99 });
  expect(r.spec.exhaust).toBe('stock');
  expect(r.spec.main).toBe(v.defaults.main);
  expect(r.spec.lower).toBe(v.lowerMax);
  expect(r.replaced).toEqual(['マフラー']);
});

import { expect, test } from 'vitest';
import { VEHICLES, VEHICLE_IDS } from '../catalog';
import { diffSpecs } from './diff';
import { partLines, totalPrice, yen } from './price';

const ss = VEHICLES.ss;

test('標準のままなら合計は0円', () => {
  expect(totalPrice(ss, ss.defaults)).toBe(0);
});

test('選んだパーツの参考価格を合計する', () => {
  const s = { ...ss.defaults, exhaust: 'slipon', bar: 'bar' };
  expect(totalPrice(ss, s)).toBe(89800 + 32000);
  expect(yen(totalPrice(ss, s))).toBe('¥121,800');
});

test('制約で外れた部位は「取り外し」で0円', () => {
  const s = { ...ss.defaults, cowl: 'naked', screen: 'tall' };
  const screen = partLines(ss, s).find((l) => l.slot === 'screen')!;
  expect(screen).toMatchObject({ name: '取り外し', price: 0, removed: true });
});

test('比較では、変えた部位・色・ローダウンだけが並ぶ', () => {
  const after = { ...ss.defaults, exhaust: 'short', main: '#25262a', lower: 5 };
  const rows = diffSpecs(ss, ss.defaults, after);
  expect(rows.map((r) => r.key)).toEqual(['exhaust', 'main', 'lower']);
  expect(rows[0]).toMatchObject({ before: 'ノーマル', after: 'ショートサイレンサー', price: 64800 });
  expect(rows[1]).toMatchObject({ before: 'キャンディレッド', after: 'マットブラック', colors: ['#c4161c', '#25262a'] });
  expect(diffSpecs(ss, ss.defaults, ss.defaults)).toEqual([]);
});

test.each(VEHICLE_IDS)('%s: すべての部位にサムネイル範囲があり、価格は実在する選択肢に付いている', (id) => {
  const v = VEHICLES[id];
  for (const slot of Object.keys(v.parts)) expect(v.thumbs[slot], slot).toMatch(/^\d+ \d+ \d+ \d+$/);
  for (const [slot, table] of Object.entries(v.prices)) {
    const values = v.parts[slot].options.map((o) => o[0]);
    for (const value of Object.keys(table)) expect(values, `${slot}.${value}`).toContain(value);
    expect(table[String(v.defaults[slot])] ?? 0, `${slot} の標準パーツは0円`).toBe(0);
  }
});

import { colorName } from '../catalog/helpers';
import type { Spec, Vehicle } from '../catalog/types';
import { partLines } from './price';

export interface DiffRow {
  key: string;
  label: string;
  before: string;
  after: string;
  /** 価格の差(円)。色は 0 */
  price: number;
  /** 色の変更なら、変更前・変更後の色 */
  colors?: [string, string];
}

/** 2つの仕様の違い(ビフォーアフター比較 2-07) */
export function diffSpecs(v: Vehicle, before: Spec, after: Spec): DiffRow[] {
  const a = partLines(v, before), b = partLines(v, after);
  const rows: DiffRow[] = [];
  a.forEach((x, i) => {
    const y = b[i];
    if (x.name !== y.name) rows.push({ key: x.slot, label: x.label, before: x.name, after: y.name, price: y.price - x.price });
  });
  for (const key of Object.keys(v.swatches)) {
    if (before[key] !== after[key]) {
      rows.push({
        key, label: v.colorLabels[key], before: colorName(v, key, before[key]), after: colorName(v, key, after[key]), price: 0,
        colors: [String(before[key]), String(after[key])],
      });
    }
  }
  if (before.lower !== after.lower) {
    rows.push({ key: 'lower', label: 'ローダウン', before: `${Number(before.lower) * 2} mm`, after: `${Number(after.lower) * 2} mm`, price: 0 });
  }
  return rows;
}

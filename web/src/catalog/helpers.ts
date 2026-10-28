import type { Spec, Vehicle } from './types';

/** パーツの表示名(見つからなければ値そのもの) */
export const optLabel = (v: Vehicle, key: string, value: Spec[string]) =>
  v.parts[key]?.options.find((o) => o[0] === value)?.[1] ?? String(value);

/** 色の表示名(パレットにない色は「カスタム」) */
export const colorName = (v: Vehicle, key: string, value: Spec[string]) =>
  (v.swatches[key] ?? []).find((c) => c[0] === value)?.[1] ?? 'カスタム';

/** 表から値を引く(該当なしは 0) */
export const pick = (table: Record<string, number>, value: Spec[string]) => table[String(value)] ?? 0;

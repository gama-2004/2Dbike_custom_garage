import { optLabel } from '../catalog/helpers';
import type { Spec, Vehicle } from '../catalog/types';
import { disabledSlots } from './constraints';

export interface PartLine {
  slot: string;
  label: string;
  value: string;
  name: string;
  price: number;
  /** 制約で外れている(例: ネイキッド化したときのスクリーン) */
  removed: boolean;
}

/** 選択中のパーツと参考価格。外れている部位は 0 円 */
export function partLines(v: Vehicle, s: Spec): PartLine[] {
  const off = disabledSlots(v, s);
  return Object.entries(v.parts).map(([slot, p]) => {
    const value = String(s[slot]);
    const removed = off.has(slot);
    return { slot, label: p.label, value, name: removed ? '取り外し' : optLabel(v, slot, value), price: removed ? 0 : (v.prices[slot]?.[value] ?? 0), removed };
  });
}

export const totalPrice = (v: Vehicle, s: Spec) => partLines(v, s).reduce((a, l) => a + l.price, 0);

export const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;

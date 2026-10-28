import type { Spec, Vehicle } from '../catalog/types';

/** 制約判定(ConstraintChecker): いまの仕様で選べなくなっている部位と、その理由を返す */
export function disabledSlots(v: Vehicle, s: Spec): Map<string, string> {
  const out = new Map<string, string>();
  for (const c of v.constraints) {
    if (s[c.when.key] === c.when.value) out.set(c.disables, c.message);
  }
  return out;
}

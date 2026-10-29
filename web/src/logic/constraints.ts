import type { Spec, Vehicle } from '../catalog/types';

/** 制約判定(ConstraintChecker): いまの仕様で、部位まるごと選べなくなっているものと、その理由 */
export function disabledSlots(v: Vehicle, s: Spec): Map<string, string> {
  const out = new Map<string, string>();
  for (const c of v.constraints) {
    if (c.disables && !c.values && s[c.when.key] === c.when.value) out.set(c.disables, c.message);
  }
  return out;
}

/** いまの仕様で選べないパーツ(部位:パーツ → 理由)。部位まるごとのものは含めない */
export function disabledOptions(v: Vehicle, s: Spec): Map<string, string> {
  const out = new Map<string, string>();
  for (const c of v.constraints) {
    if (c.disables && c.values && s[c.when.key] === c.when.value) {
      for (const value of c.values) out.set(`${c.disables}:${value}`, c.message);
    }
  }
  // 逆向き: いま付いているパーツと同時に付けられないもの(自動で外せるものは選べる)
  for (const c of v.constraints) {
    if (c.disables && c.values && !c.autoResolve && c.values.includes(String(s[c.disables]))) out.set(`${c.when.key}:${c.when.value}`, c.message);
  }
  return out;
}

/**
 * 変更後の仕様に制約を当てはめる。
 * - 同時に付けられないパーツが付いていたら、その部位を標準(だめなら選べる最初のもの)に戻す
 * - 一緒に必要なパーツがあれば付ける
 * 自動で直したときは、利用者に見せる説明を notes に入れる
 */
export function applyRules(v: Vehicle, input: Spec): { spec: Spec; notes: string[] } {
  const spec = { ...input };
  const notes: string[] = [];
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (const c of v.constraints) {
      if (spec[c.when.key] !== c.when.value) continue;
      if (c.requires && spec[c.requires.key] !== c.requires.value) {
        spec[c.requires.key] = c.requires.value;
        notes.push(c.message);
        changed = true;
      }
      if (c.disables && c.values && c.values.includes(String(spec[c.disables]))) {
        const slot = v.parts[c.disables];
        const ok = slot?.options.map((o) => o[0]).filter((o) => !c.values!.includes(o)) ?? [];
        const fallback = ok.includes(String(v.defaults[c.disables])) ? String(v.defaults[c.disables]) : ok[0];
        if (fallback !== undefined) {
          spec[c.disables] = fallback;
          notes.push(c.message);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return { spec, notes };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** 呼び出した仕様のうち、もう無いパーツや壊れた値を標準に戻す。戻した部位の名前を返す */
export function sanitizeSpec(v: Vehicle, input: Spec): { spec: Spec; replaced: string[] } {
  const spec: Spec = { ...v.defaults, ...input };
  const replaced: string[] = [];
  for (const [key, slot] of Object.entries(v.parts)) {
    if (!slot.options.some((o) => o[0] === spec[key])) {
      spec[key] = v.defaults[key];
      replaced.push(slot.label);
    }
  }
  for (const key of Object.keys(v.swatches)) {
    if (!HEX.test(String(spec[key]))) spec[key] = v.defaults[key];
  }
  const lower = Math.trunc(Number(spec.lower));
  spec.lower = Number.isFinite(lower) ? Math.max(0, Math.min(v.lowerMax, lower)) : 0;
  return { spec, replaced };
}

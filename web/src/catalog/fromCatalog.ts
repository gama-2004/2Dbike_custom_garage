import { american } from './american';
import type { CatalogConstraint, CatalogJson, CatalogVehicle, Renderer } from './definition';
import { colorName, optLabel } from './helpers';
import { supersport } from './supersport';
import type { Constraint, ShelfSection, Spec, Vehicle } from './types';
import { ground } from '../render/svg';

/** 組み込みの描画プログラムを持つ車両(車両コード V001、V002) */
export const BUILTIN: Record<Exclude<Renderer, 'template'>, Vehicle> = { supersport, american };

/** 組み込み車両の諸元(DB の初期データに使う) */
const BUILTIN_META: Record<Exclude<Renderer, 'template'>, Omit<CatalogVehicle, 'renderer' | 'base_svg' | 'lower_max_mm'>> = {
  supersport: { code: 'V001', name: 'スーパースポーツ', genre: 'SS', wheelbase_mm: 1370, seat_height_mm: 795, ground_clearance_mm: 148, base_weight_kg: 166 },
  american: { code: 'V002', name: 'アメリカン', genre: 'AM', wheelbase_mm: 1610, seat_height_mm: 695, ground_clearance_mm: 140, base_weight_kg: 245 },
};

const HEX = /^#[0-9a-f]{6}$/i;
const fill = (svg: string, s: Spec) => svg.replace(/\{\{(\w+)\}\}/g, (_, k: string) => (HEX.test(String(s[k])) ? String(s[k]) : '#888888'));
const comma = (n: number) => n.toLocaleString('en-US');
/** 画面の仕様の lower は 2mm 単位(プロトタイプからの決まり)。DB には mm で持つ */
export const lowerSteps = (mm: number) => Math.floor(mm / 2);

/** DB の制約(パーツ → パーツ)を、画面で使う形にまとめる */
export function toConstraints(c: CatalogJson): Constraint[] {
  const out: Constraint[] = [];
  const groups = new Map<string, CatalogConstraint[]>();
  for (const x of c.constraints) {
    if (x.type === 'REQUIRE') {
      out.push({ when: { key: x.source.slot, value: x.source.part }, requires: { key: x.target.slot, value: x.target.part }, message: x.message });
      continue;
    }
    const k = [x.source.slot, x.source.part, x.target.slot, x.message, x.auto_resolve].join('\u0000');
    groups.set(k, [...(groups.get(k) ?? []), x]);
  }
  for (const g of groups.values()) {
    const { source, target, message, auto_resolve } = g[0];
    const slot = c.slots.find((s) => s.code === target.slot);
    const values = g.map((x) => x.target.part);
    const whole = slot && slot.parts.every((p) => values.includes(p.code));
    out.push(whole
      ? { when: { key: source.slot, value: source.part }, disables: target.slot, message }
      : { when: { key: source.slot, value: source.part }, disables: target.slot, values, autoResolve: auto_resolve, message });
  }
  return out;
}

const presetIndexOf = (v: Pick<Vehicle, 'presets' | 'defaults'>, s: Spec) =>
  v.presets.findIndex((p) => {
    const f = { ...v.defaults, ...p.spec };
    return Object.keys(f).every((k) => f[k] === s[k]);
  });

/** 組み込み車両に、DB の名前・価格・追加パーツを重ねる */
function mergeBuiltin(b: Vehicle, c: CatalogJson): Vehicle {
  const parts = { ...b.parts };
  const prices: Vehicle['prices'] = {};
  const weights: Record<string, Record<string, number>> = {};
  const overlays: Record<string, Record<string, string>> = {};
  const shelf: ShelfSection[] = [...b.shelf];
  const thumbs = { ...b.thumbs };
  for (const slot of c.slots) {
    if (!b.parts[slot.code]) {
      shelf.push({ id: `sec-${slot.code}`, title: slot.name, items: [{ kind: 'part', key: slot.code }] });
      thumbs[slot.code] = '0 0 800 440';
    }
    parts[slot.code] = { label: slot.name, options: slot.parts.map((p) => [p.code, p.name] as const) };
    prices[slot.code] = Object.fromEntries(slot.parts.filter((p) => p.price_yen).map((p) => [p.code, p.price_yen!]));
    for (const p of slot.parts) {
      if (!p.svg) continue;
      (overlays[slot.code] ??= {})[p.code] = p.svg;
      (weights[slot.code] ??= {})[p.code] = p.weight_diff_kg;
    }
  }
  const swatches = { ...b.swatches };
  const colorLabels = { ...b.colorLabels };
  for (const p of c.paints) {
    swatches[p.code] = p.colors.map((x) => [x.hex, x.name] as const);
    colorLabels[p.code] = p.name;
  }
  const extraSlots = c.slots.filter((s) => !b.parts[s.code]);
  const v: Vehicle = {
    ...b,
    id: c.vehicle.code,
    label: c.vehicle.name,
    wheelbase: comma(c.vehicle.wheelbase_mm),
    lowerMax: lowerSteps(c.vehicle.lower_max_mm),
    parts,
    prices,
    swatches,
    colorLabels,
    shelf,
    thumbs,
    defaults: { ...b.defaults, ...c.defaultSpec },
    presets: c.presets.length ? c.presets : b.presets,
    constraints: toConstraints(c),
    // 追加パーツ(描画データを持つもの)の重量差は、組み込みの計算に足す
    weight(s) {
      let w = b.weight.call(this, s);
      for (const [slot, table] of Object.entries(weights)) w += table[String(s[slot])] ?? 0;
      return w;
    },
    sheet(s) {
      const d = b.sheet.call(this, s);
      for (const slot of extraSlots) d.rows.push([slot.name, optLabel(this, slot.code, s[slot.code])]);
      return d;
    },
    draw(s) {
      let o = b.draw.call(this, s);
      const extra = Object.entries(overlays)
        .map(([slot, table]) => table[String(s[slot])] && `<g data-part="${slot}">${fill(table[String(s[slot])], s)}</g>`)
        .filter(Boolean)
        .join('');
      if (extra) o += `<g transform="translate(0 ${Number(s.lower) || 0})">${extra}</g>`;
      return o;
    },
  };
  return v;
}

/** 定義ファイルの SVG で描く車両。後輪の中心は (215, 322)、前輪の中心は (590, 322) に描く決まり */
function templateVehicle(c: CatalogJson): Vehicle {
  const cv = c.vehicle;
  const parts = Object.fromEntries(c.slots.map((s) => [s.code, { label: s.name, options: s.parts.map((p) => [p.code, p.name] as const) }]));
  const prices = Object.fromEntries(c.slots.map((s) => [s.code, Object.fromEntries(s.parts.filter((p) => p.price_yen).map((p) => [p.code, p.price_yen!]))]));
  const svgOf = Object.fromEntries(c.slots.map((s) => [s.code, Object.fromEntries(s.parts.map((p) => [p.code, p.svg]))]));
  const weightOf = Object.fromEntries(c.slots.map((s) => [s.code, Object.fromEntries(s.parts.map((p) => [p.code, p.weight_diff_kg]))]));
  const swatches = Object.fromEntries(c.paints.map((p) => [p.code, p.colors.map((x) => [x.hex, x.name] as const)]));
  const colorLabels = Object.fromEntries(c.paints.map((p) => [p.code, p.name]));
  const presets = c.presets.length ? c.presets : [{ name: 'ノーマル', spec: {} }];
  const v: Vehicle = {
    id: cv.code,
    label: cv.name,
    wheelbase: comma(cv.wheelbase_mm),
    lowerMax: lowerSteps(cv.lower_max_mm),
    aria: `カスタムした${cv.name}のサイドビュー`,
    parts,
    swatches,
    colorLabels,
    bools: [],
    defaults: { lower: 0, ...c.defaultSpec },
    presets,
    constraints: toConstraints(c),
    shelf: [
      ...c.slots.map((s): ShelfSection => ({ id: `sec-${s.code}`, title: s.name, items: [{ kind: 'part', key: s.code }] })),
      { id: 'sec-paint', title: '塗装', em: 'PAINT', items: c.paints.map((p) => ({ kind: 'swatch' as const, key: p.code, label: p.name })) },
    ],
    partMap: { ...Object.fromEntries(c.slots.map((s) => [s.code, `sec-${s.code}`])), body: 'sec-paint', paint: 'sec-paint' },
    prices,
    thumbs: Object.fromEntries(c.slots.map((s) => [s.code, '0 0 800 440'])),
    styleName(s) {
      const i = presetIndexOf(this, s);
      return i > 0 ? this.presets[i].name : cv.name;
    },
    weight(s) {
      return c.slots.reduce((w, slot) => w + (weightOf[slot.code][String(s[slot.code])] ?? 0), cv.base_weight_kg);
    },
    sheet(s) {
      const lower = Number(s.lower) || 0;
      return {
        rows: c.slots.map((slot): [string, string] => [slot.name, optLabel(this, slot.code, s[slot.code])]),
        colors: c.paints.map((p): [string, string, string | null] => [p.name, colorName(this, p.code, s[p.code]), String(s[p.code])]),
        specs: [
          ['シート高', `${cv.seat_height_mm - lower * 2} mm`],
          ['最低地上高', `${cv.ground_clearance_mm - lower * 2} mm`],
          ['車両重量', `${this.weight(s).toFixed(1)} kg`],
        ],
      };
    },
    draw(s) {
      const dy = Number(s.lower) || 0;
      let o = ground({ x: 215, y: 322 }, { x: 590, y: 322 }, this.wheelbase);
      o += `<g transform="translate(0 ${dy})"><g data-part="body">${fill(cv.base_svg ?? '', s)}</g>`;
      for (const slot of c.slots) {
        const svg = svgOf[slot.code][String(s[slot.code])];
        if (svg) o += `<g data-part="${slot.code}">${fill(svg, s)}</g>`;
      }
      return o + '</g>';
    },
  };
  return v;
}

/** API が返したカタログから、画面で使う車両を作る */
export function buildVehicle(c: CatalogJson): Vehicle {
  const r = c.vehicle.renderer;
  return r === 'template' ? templateVehicle(c) : mergeBuiltin(BUILTIN[r], c);
}

/** 組み込み車両を、カタログの形にする(DB の初期データ) */
export function builtinCatalog(r: Exclude<Renderer, 'template'>): CatalogJson {
  const b = BUILTIN[r];
  const meta = BUILTIN_META[r];
  const base = b.weight(b.defaults);
  const constraints = b.constraints.flatMap((c): CatalogConstraint[] => {
    const source = { slot: c.when.key, part: c.when.value };
    if (c.requires) return [{ type: 'REQUIRE', source, target: { slot: c.requires.key, part: c.requires.value }, auto_resolve: false, message: c.message }];
    const slot = c.disables;
    return (c.values ?? b.parts[slot].options.map((o) => o[0])).map((part) => ({
      type: 'EXCLUDE', source, target: { slot, part }, auto_resolve: c.values ? !!c.autoResolve : true, message: c.message,
    }));
  });
  return {
    vehicle: { ...meta, renderer: r, lower_max_mm: b.lowerMax * 2, base_svg: null },
    slots: Object.entries(b.parts).map(([code, slot]) => ({
      code,
      name: slot.label,
      parts: slot.options.map(([pc, name]) => ({
        code: pc,
        name,
        weight_diff_kg: Math.round((b.weight({ ...b.defaults, [code]: pc }) - base) * 10) / 10,
        price_yen: b.prices[code]?.[pc] ?? null,
        svg: '',
      })),
    })),
    paints: Object.entries(b.swatches).map(([code, colors]) => ({ code, name: b.colorLabels[code], colors: colors.map(([hex, name]) => ({ hex, name })) })),
    defaultSpec: { ...b.defaults },
    presets: b.presets.map((p) => ({ name: p.name, spec: { ...p.spec } })),
    constraints,
  };
}

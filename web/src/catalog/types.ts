/** 仕様(BuildSpec): 1台のバイクの組み方。部位キー → パーツID、塗装キー → 色、ほかにローダウン量など。 */
export type SpecValue = string | number | boolean;
export type Spec = Record<string, SpecValue>;

/** [値, 表示名] */
export type Option = readonly [value: string, label: string];

export interface PartSlot {
  label: string;
  options: readonly Option[];
}

/** パーツ棚の1区画の中身 */
export type ShelfItem =
  | { kind: 'part'; key: string; label?: string; note?: string }
  | { kind: 'swatch'; key: string; label: string }
  | { kind: 'toggle'; key: string; label: string }
  | { kind: 'number'; key: string; label: string; toggleKey: string; min: number; max: number };

export interface ShelfSection {
  id: string;
  title: string;
  em?: string;
  items: ShelfItem[];
}

/** 組み合わせ制約: when の条件を満たすと、slot のパーツは選べなくなる(仕様の値は残すが図には出ない) */
export interface Constraint {
  when: { key: string; value: string };
  disables: string;
  message: string;
}

export interface SheetData {
  rows: [label: string, value: string][];
  colors: [label: string, name: string, hex: string | null][];
  specs: [label: string, value: string][];
}

export interface Preset {
  name: string;
  spec: Spec;
}

export type VehicleId = 'ss' | 'us';

/** ベース車両(BaseVehicle)。描画処理(draw)もここに持つ。 */
export interface Vehicle {
  id: VehicleId;
  label: string;
  wheelbase: string;
  lowerMax: number;
  aria: string;
  parts: Record<string, PartSlot>;
  swatches: Record<string, readonly Option[]>;
  colorLabels: Record<string, string>;
  /** on/off で持つキー(リムストライプ、ゼッケンなど) */
  bools: readonly string[];
  defaults: Spec;
  presets: readonly Preset[];
  constraints: readonly Constraint[];
  shelf: readonly ShelfSection[];
  /** 図の data-part → パーツ棚の区画 id */
  partMap: Record<string, string>;
  /** パーツの参考価格(円)。標準パーツと表にないものは 0 */
  prices: Record<string, Record<string, number>>;
  /** サムネイルで切り抜く範囲(部位ごとの SVG viewBox) */
  thumbs: Record<string, string>;
  styleName(s: Spec): string;
  weight(s: Spec): number;
  sheet(s: Spec): SheetData;
  /** おまかせ組みで、部位と色以外に決めるもの */
  randomExtra?(s: Spec, rand: () => number): void;
  draw(s: Spec): string;
}

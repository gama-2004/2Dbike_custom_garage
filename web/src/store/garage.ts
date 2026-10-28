import { create } from 'zustand';
import { VEHICLES, VEHICLE_IDS, isVehicleId } from '../catalog';
import type { Spec, SpecValue, VehicleId } from '../catalog/types';
import { loadJSON, storeJSON } from '../logic/storage';

/** 作業状態(Workspace)。プロトタイプと同じキー・形式で保存するので、続きから使える。 */
export const KEY_CURRENT = 'ss-garage-current';

type Specs = Record<VehicleId, Spec>;

/** 比較画面のビフォー。null ならノーマル(標準仕様) */
export interface CompareRef {
  /** 保存仕様の番号 */
  n: number;
  label: string;
  base: VehicleId;
  spec: Spec;
}

interface GarageState {
  base: VehicleId;
  compareRef: CompareRef | null;
  setCompareRef(ref: CompareRef | null): void;
  /** 車両ごとの現在の仕様(車両を切り替えても、それぞれの組み方を覚えておく) */
  specs: Specs;
  switchBase(id: VehicleId): void;
  setValue(key: string, value: SpecValue): void;
  setNumber(value: number): void;
  applyPreset(index: number): void;
  reset(): void;
  randomize(rand?: () => number): void;
  loadBuild(base: VehicleId, spec: Spec): void;
}

const withDefaults = (id: VehicleId, spec?: Spec | null): Spec => ({ ...VEHICLES[id].defaults, ...(spec ?? {}) });

function initial(): Pick<GarageState, 'base' | 'specs'> {
  const v = loadJSON<{ base?: string } & Partial<Record<VehicleId, Spec>>>(KEY_CURRENT);
  const specs = Object.fromEntries(VEHICLE_IDS.map((id) => [id, withDefaults(id)])) as Specs;
  if (v && v.base) {
    for (const id of VEHICLE_IDS) specs[id] = withDefaults(id, v[id]);
    return { base: isVehicleId(v.base) ? v.base : 'ss', specs };
  }
  // 最初期のプロトタイプは、スーパースポーツの仕様だけをそのまま保存していた
  if (v) specs.ss = withDefaults('ss', v as unknown as Spec);
  return { base: 'ss', specs };
}

export const useGarage = create<GarageState>()((set, get) => {
  const update = (spec: Spec) => set((st) => ({ specs: { ...st.specs, [st.base]: spec } }));
  return {
    ...initial(),
    compareRef: null,
    setCompareRef: (ref) => set({ compareRef: ref }),
    switchBase: (id) => set({ base: id }),
    setValue: (key, value) => {
      const { base, specs } = get();
      update({ ...specs[base], [key]: value });
    },
    setNumber: (value) => {
      const { base, specs } = get();
      update({ ...specs[base], number: Math.max(0, Math.min(99, Math.trunc(value) || 0)), zekken: true });
    },
    applyPreset: (index) => {
      const { base } = get();
      update(withDefaults(base, VEHICLES[base].presets[index]?.spec));
    },
    reset: () => update(withDefaults(get().base)),
    randomize: (rand = Math.random) => {
      const { base, specs } = get();
      const v = VEHICLES[base];
      const choose = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
      const s: Spec = { ...specs[base] };
      for (const [k, slot] of Object.entries(v.parts)) s[k] = choose(slot.options)[0];
      for (const [k, sw] of Object.entries(v.swatches)) s[k] = choose(sw)[0];
      v.randomExtra?.(s, rand);
      s.lower = Math.floor(rand() * 16);
      update(s);
    },
    loadBuild: (base, spec) => set((st) => ({ base, specs: { ...st.specs, [base]: withDefaults(base, spec) } })),
  };
});

useGarage.subscribe((st) => storeJSON(KEY_CURRENT, { base: st.base, ...st.specs }));

/** いま選んでいる車両と仕様 */
export const useCurrent = () => {
  const base = useGarage((st) => st.base);
  const spec = useGarage((st) => st.specs[st.base]);
  return { vehicle: VEHICLES[base], spec };
};

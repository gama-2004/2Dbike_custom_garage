import { useMemo } from 'react';
import { create } from 'zustand';
import { getVehicle, normalizeId, useCatalog } from '../catalog';
import type { Spec, SpecValue, VehicleId } from '../catalog/types';
import { applyRules, sanitizeSpec } from '../logic/constraints';
import { loadJSON, storeJSON } from '../logic/storage';

/** 作業状態(Workspace)。プロトタイプと同じキーで保存するので、続きから使える。 */
export const KEY_CURRENT = 'ss-garage-current';

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
  /** 車両ごとの現在の仕様(車両を切り替えても、それぞれの組み方を覚えておく)。まだ触っていない車両は入っていない */
  specs: Record<VehicleId, Spec>;
  compareRef: CompareRef | null;
  /** 制約で自動的に直したときなどの知らせ */
  notice: string;
  setCompareRef(ref: CompareRef | null): void;
  switchBase(id: VehicleId): void;
  setValue(key: string, value: SpecValue): void;
  setNumber(value: number): void;
  applyPreset(index: number): void;
  reset(): void;
  randomize(rand?: () => number): void;
  loadBuild(base: VehicleId, spec: Spec): void;
  clearNotice(): void;
}

const withDefaults = (id: VehicleId, spec?: Spec | null): Spec => ({ ...getVehicle(id).defaults, ...(spec ?? {}) });

function initial(): Pick<GarageState, 'base' | 'specs'> {
  const v = loadJSON<Record<string, unknown>>(KEY_CURRENT);
  if (!v) return { base: 'V001', specs: {} };
  if (typeof v.base !== 'string') {
    // 最初期のプロトタイプは、スーパースポーツの仕様だけをそのまま保存していた
    return { base: 'V001', specs: { V001: v as Spec } };
  }
  const specs: Record<string, Spec> = {};
  for (const [k, s] of Object.entries(v)) if (k !== 'base' && s && typeof s === 'object') specs[normalizeId(k)] = s as Spec;
  return { base: normalizeId(v.base), specs };
}

export const useGarage = create<GarageState>()((set, get) => {
  const current = () => withDefaults(get().base, get().specs[get().base]);
  const update = (spec: Spec, notes: string[] = []) => {
    const v = getVehicle(get().base);
    const r = applyRules(v, spec);
    const all = [...notes, ...r.notes];
    set((st) => ({ specs: { ...st.specs, [v.id]: r.spec }, notice: all.length ? all.join(' ') : '' }));
  };
  return {
    ...initial(),
    compareRef: null,
    notice: '',
    setCompareRef: (ref) => set({ compareRef: ref }),
    switchBase: (id) => set({ base: getVehicle(id).id, notice: '' }),
    setValue: (key, value) => update({ ...current(), [key]: value }),
    setNumber: (value) => update({ ...current(), number: Math.max(0, Math.min(99, Math.trunc(value) || 0)), zekken: true }),
    applyPreset: (index) => update(withDefaults(get().base, getVehicle(get().base).presets[index]?.spec)),
    reset: () => update(withDefaults(get().base)),
    randomize: (rand = Math.random) => {
      const v = getVehicle(get().base);
      const choose = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
      const s: Spec = { ...current() };
      for (const [k, slot] of Object.entries(v.parts)) s[k] = choose(slot.options)[0];
      for (const [k, sw] of Object.entries(v.swatches)) s[k] = choose(sw)[0];
      v.randomExtra?.(s, rand);
      s.lower = Math.floor(rand() * Math.min(16, v.lowerMax + 1));
      update(s);
    },
    loadBuild: (base, spec) => {
      const v = getVehicle(base);
      const { spec: clean, replaced } = sanitizeSpec(v, spec);
      set({ base: v.id });
      update(clean, replaced.length ? [`登録がなくなったパーツを標準パーツに置き換えました: ${replaced.join('、')}`] : []);
    },
    clearNotice: () => set({ notice: '' }),
  };
});

useGarage.subscribe((st) => storeJSON(KEY_CURRENT, { base: st.base, ...st.specs }));

// カタログが読み込まれたら、無い車両を選んでいれば最初の車両にし、仕様を新しいカタログに合わせる
useCatalog.subscribe((cat) => {
  if (cat.source === 'loading') return;
  const st = useGarage.getState();
  const specs = Object.fromEntries(
    Object.entries(st.specs).filter(([id]) => id in cat.vehicles).map(([id, s]) => [id, sanitizeSpec(cat.vehicles[id], s).spec]),
  );
  useGarage.setState({ base: st.base in cat.vehicles ? st.base : cat.ids[0], specs });
});

/** いま選んでいる車両と仕様 */
export const useCurrent = () => {
  const base = useGarage((st) => st.base);
  const saved = useGarage((st) => st.specs[st.base]);
  const vehicles = useCatalog((c) => c.vehicles);
  const vehicle = vehicles[base] ?? getVehicle(base);
  const spec = useMemo(() => (saved ? { ...vehicle.defaults, ...saved } : vehicle.defaults), [vehicle, saved]);
  return { vehicle, spec };
};

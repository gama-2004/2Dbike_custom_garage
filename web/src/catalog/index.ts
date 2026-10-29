import { create } from 'zustand';
import { api, OfflineError } from '../api/client';
import type { CatalogJson } from './definition';
import { buildVehicle } from './fromCatalog';
import { american } from './american';
import { supersport } from './supersport';
import type { Vehicle } from './types';

/** プロトタイプのころの車両 ID を、いまの車両コードに読み替える */
export const LEGACY_IDS: Record<string, string> = { ss: 'V001', us: 'V002' };
export const normalizeId = (id: string) => LEGACY_IDS[id] ?? id;

/** 組み込みの車両(サーバーにつながらないときは、これだけで動く) */
export const BUILTIN_VEHICLES: Record<string, Vehicle> = { V001: supersport, V002: american };

interface CatalogState {
  /** loading: 読込中 / api: サーバーのカタログ / builtin: サーバーなし(組み込みの2車種) */
  source: 'loading' | 'api' | 'builtin';
  vehicles: Record<string, Vehicle>;
  ids: string[];
  /** サーバーから読んだカタログそのもの(管理画面のプレビューに使う) */
  catalogs: Record<string, CatalogJson>;
  load(): Promise<void>;
}

/** カタログ(Catalog): 登録済みのベース車両 */
export const useCatalog = create<CatalogState>()((set) => ({
  source: 'loading',
  vehicles: BUILTIN_VEHICLES,
  ids: Object.keys(BUILTIN_VEHICLES),
  catalogs: {},
  load: async () => {
    try {
      const list = await api.vehicles();
      const catalogs = await Promise.all(list.map((v) => api.catalog(v.code)));
      if (catalogs.length === 0) throw new Error('車両が登録されていません(初期データを入れてください)');
      const vehicles = Object.fromEntries(catalogs.map((c) => [c.vehicle.code, buildVehicle(c)]));
      set({ source: 'api', vehicles, ids: catalogs.map((c) => c.vehicle.code), catalogs: Object.fromEntries(catalogs.map((c) => [c.vehicle.code, c])) });
    } catch (e) {
      if (!(e instanceof Error)) throw e;
      if (!(e instanceof OfflineError)) console.warn('サーバーのカタログを読めなかったので、組み込みの車両で動かします:', e.message);
      set({ source: 'builtin', vehicles: BUILTIN_VEHICLES, ids: Object.keys(BUILTIN_VEHICLES), catalogs: {} });
    }
  },
}));

/** 車両を引く(無い車両コードなら、最初の車両) */
export function getVehicle(id: string): Vehicle {
  const { vehicles, ids } = useCatalog.getState();
  return vehicles[normalizeId(id)] ?? vehicles[ids[0]];
}

export const hasVehicle = (id: string) => normalizeId(id) in useCatalog.getState().vehicles;

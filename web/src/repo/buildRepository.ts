import { api } from '../api/client';
import type { Spec, VehicleId } from '../catalog/types';
import { loadJSON, storeJSON } from '../logic/storage';

/** 保存仕様(SavedBuild)。ブラウザ保存はプロトタイプと同じ形式なので、前に保存したものも呼び出せる。 */
export interface SavedBuild {
  n: number;
  base: VehicleId;
  name: string;
  date: string;
  state: Spec;
}

/** 保存管理(BuildRepository)。サーバーにつながるときはサーバー、つながらないときはブラウザに保存する */
export interface BuildRepository {
  list(): Promise<SavedBuild[]>;
  /** name を省略すると「ビルド #番号」 */
  save(base: VehicleId, spec: Spec, name?: string): Promise<SavedBuild[]>;
  rename(n: number, name: string): Promise<SavedBuild[]>;
  remove(n: number): Promise<SavedBuild[]>;
}

export const KEY_SAVES = 'ss-garage-builds';
const MAX_SAVES = 20;

export function localBuildRepository(now: () => Date = () => new Date()): BuildRepository {
  const read = () => loadJSON<SavedBuild[]>(KEY_SAVES) ?? [];
  return {
    async list() {
      return read();
    },
    async save(base, spec, name) {
      const list = read();
      const n = list.length ? Math.max(...list.map((x) => x.n)) + 1 : 1;
      const d = now();
      const next = [{ n, base, name: name?.trim() || `ビルド #${n}`, date: `${d.getMonth() + 1}/${d.getDate()}`, state: { ...spec } }, ...list].slice(0, MAX_SAVES);
      storeJSON(KEY_SAVES, next);
      return next;
    },
    async rename(n, name) {
      const next = read().map((x) => (x.n === n && name.trim() ? { ...x, name: name.trim() } : x));
      storeJSON(KEY_SAVES, next);
      return next;
    },
    async remove(n) {
      const next = read().filter((x) => x.n !== n);
      storeJSON(KEY_SAVES, next);
      return next;
    },
  };
}

const md = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()}`;
};

/** サーバー(MySQL)に保存する。持ち主は利用者キーで区別する */
export function apiBuildRepository(styleOf: (base: VehicleId, spec: Spec) => string): BuildRepository {
  const list = async () => (await api.builds.list()).map((b): SavedBuild => ({ n: b.id, base: b.vehicle_code, name: b.name, date: md(b.saved_at), state: b.spec }));
  return {
    list,
    async save(base, spec, name) {
      await api.builds.create({ vehicle_code: base, name: name?.trim() ?? '', style_name: styleOf(base, spec), spec });
      return list();
    },
    async rename(n, name) {
      if (name.trim()) await api.builds.rename(n, name.trim());
      return list();
    },
    async remove(n) {
      await api.builds.remove(n);
      return list();
    },
  };
}

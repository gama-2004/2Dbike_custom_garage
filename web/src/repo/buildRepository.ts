import type { Spec, VehicleId } from '../catalog/types';
import { loadJSON, storeJSON } from '../logic/storage';

/** 保存仕様(SavedBuild)。プロトタイプと同じ形式なので、前に保存したものも呼び出せる。 */
export interface SavedBuild {
  n: number;
  base: VehicleId;
  name: string;
  date: string;
  state: Spec;
}

/** 保存管理(BuildRepository)。いまはブラウザ内に保存する。サーバー版は同じ形で API を呼ぶ実装に差し替える。 */
export interface BuildRepository {
  list(): Promise<SavedBuild[]>;
  save(base: VehicleId, spec: Spec): Promise<SavedBuild[]>;
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
    async save(base, spec) {
      const list = read();
      const n = list.length ? Math.max(...list.map((x) => x.n)) + 1 : 1;
      const d = now();
      const next = [{ n, base, name: `ビルド #${n}`, date: `${d.getMonth() + 1}/${d.getDate()}`, state: { ...spec } }, ...list].slice(0, MAX_SAVES);
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

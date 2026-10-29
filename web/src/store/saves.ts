import { create } from 'zustand';
import { getVehicle, useCatalog } from '../catalog';
import type { Spec, VehicleId } from '../catalog/types';
import { apiBuildRepository, localBuildRepository, type BuildRepository, type SavedBuild } from '../repo/buildRepository';

interface SavesState {
  list: SavedBuild[];
  /** いまの保存先 */
  target: 'local' | 'api';
  refresh(): Promise<void>;
  save(base: VehicleId, spec: Spec, name?: string): Promise<void>;
  rename(n: number, name: string): Promise<void>;
  remove(n: number): Promise<void>;
  useRepository(repo: BuildRepository, target: SavesState['target']): Promise<void>;
}

/** 保存仕様の一覧。どの画面から保存・削除しても、同じ一覧が更新される。失敗したときは例外を投げる */
export function createSavesStore(initial: BuildRepository) {
  let repo = initial;
  return create<SavesState>()((set) => ({
    list: [],
    target: 'local',
    refresh: async () => set({ list: await repo.list() }),
    save: async (base, spec, name) => set({ list: await repo.save(base, spec, name) }),
    rename: async (n, name) => set({ list: await repo.rename(n, name) }),
    remove: async (n) => set({ list: await repo.remove(n) }),
    useRepository: async (r, target) => {
      repo = r;
      set({ target, list: await r.list().catch(() => []) });
    },
  }));
}

export const useSaves = createSavesStore(localBuildRepository());

const styleOf = (base: VehicleId, spec: Spec) => {
  const v = getVehicle(base);
  return v.styleName({ ...v.defaults, ...spec });
};

// サーバーのカタログを読めたら、保存先もサーバーにする
useCatalog.subscribe((c, prev) => {
  if (c.source === prev.source) return;
  if (c.source === 'api') void useSaves.getState().useRepository(apiBuildRepository(styleOf), 'api');
  if (c.source === 'builtin') void useSaves.getState().useRepository(localBuildRepository(), 'local');
});

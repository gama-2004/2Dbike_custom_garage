import { create } from 'zustand';
import type { Spec, VehicleId } from '../catalog/types';
import { localBuildRepository, type BuildRepository, type SavedBuild } from '../repo/buildRepository';

/** 保存仕様の一覧。どの画面から保存・削除しても、同じ一覧が更新される */
export function createSavesStore(repo: BuildRepository) {
  return create<{
    list: SavedBuild[];
    refresh(): Promise<void>;
    save(base: VehicleId, spec: Spec, name?: string): Promise<void>;
    rename(n: number, name: string): Promise<void>;
    remove(n: number): Promise<void>;
  }>()((set) => ({
    list: [],
    refresh: async () => set({ list: await repo.list() }),
    save: async (base, spec, name) => set({ list: await repo.save(base, spec, name) }),
    rename: async (n, name) => set({ list: await repo.rename(n, name) }),
    remove: async (n) => set({ list: await repo.remove(n) }),
  }));
}

export const useSaves = createSavesStore(localBuildRepository());

import { beforeEach, expect, test, vi } from 'vitest';
import { KEY_SAVES, localBuildRepository } from './buildRepository';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) });
});

test('保存すると新しい順に並び、番号が増える。削除もできる', async () => {
  const repo = localBuildRepository(() => new Date(2026, 10, 2));
  await repo.save('ss', { cowl: 'naked' });
  const list = await repo.save('us', { bar: 'ape' });
  expect(list.map((b) => b.name)).toEqual(['ビルド #2', 'ビルド #1']);
  expect(list[0]).toMatchObject({ base: 'us', date: '11/2', state: { bar: 'ape' } });
  expect((await repo.remove(1)).map((b) => b.n)).toEqual([2]);
  expect(JSON.parse(mem.get(KEY_SAVES)!)).toHaveLength(1);
});

test('最大20件まで保存する', async () => {
  const repo = localBuildRepository();
  for (let i = 0; i < 22; i++) await repo.save('ss', {});
  const list = await repo.list();
  expect(list).toHaveLength(20);
  expect(list[0].n).toBe(22);
});

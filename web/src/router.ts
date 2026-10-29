import { useSyncExternalStore } from 'react';

/**
 * 画面の切り替え。URL の #custom のように # 以降で画面を持つので、GitHub Pages でもそのまま動く(#/custom の形も読める)。
 * 管理画面は、基本設計書どおり /admin でも開ける
 */
export type Route = 'top' | 'select' | 'custom' | 'compare' | 'mypage' | 'admin';
const ROUTES: Route[] = ['top', 'select', 'custom', 'compare', 'mypage', 'admin'];

const current = (): Route => {
  const r = location.hash.replace(/^#\/?/, '') as Route;
  if (ROUTES.includes(r)) return r;
  return /\/admin\/?$/.test(location.pathname) ? 'admin' : 'top';
};

const subscribe = (cb: () => void) => {
  addEventListener('hashchange', cb);
  return () => removeEventListener('hashchange', cb);
};

export const useRoute = () => useSyncExternalStore(subscribe, current, () => 'top' as Route);

export function navigate(r: Route) {
  location.hash = r;
  scrollTo({ top: 0 });
}

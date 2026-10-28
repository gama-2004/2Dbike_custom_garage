import { useSyncExternalStore } from 'react';

/** 画面の切り替え。URL の #custom のように # 以降で画面を持つので、GitHub Pages でもそのまま動く(#/custom の形も読める) */
export type Route = 'top' | 'select' | 'custom' | 'compare' | 'mypage';
const ROUTES: Route[] = ['top', 'select', 'custom', 'compare', 'mypage'];

const current = (): Route => {
  const r = location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'top';
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

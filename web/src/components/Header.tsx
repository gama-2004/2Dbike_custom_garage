import { navigate, useRoute, type Route } from '../router';
import { useCurrent } from '../store/garage';

const NAV: [Route, string][] = [
  ['top', 'トップ'],
  ['select', '車種選択'],
  ['custom', 'カスタム'],
  ['compare', '比較'],
  ['mypage', 'マイページ'],
];

export function Header() {
  const route = useRoute();
  const { vehicle } = useCurrent();
  return (
    <header className="app-header">
      <a className="logo" href="#top" onClick={(e) => { e.preventDefault(); navigate('top'); }}>
        Bike Customizer<small>2Dカスタムガレージ</small>
      </a>
      <nav aria-label="メイン">
        {NAV.map(([r, label]) => (
          <a key={r} href={`#${r}`} aria-current={route === r ? 'page' : undefined} onClick={(e) => { e.preventDefault(); navigate(r); }}>
            {label}
          </a>
        ))}
      </nav>
      <span className="hdr-vehicle">{vehicle.label}</span>
    </header>
  );
}

import { useCallback } from 'react';
import { BikeView } from './components/BikeView';
import { BuildSheet } from './components/BuildSheet';
import { Shelf } from './components/Shelf';
import { useGarage } from './store/garage';

/** カスタム画面(CustomizeScreen / SCR-01) */
export function App() {
  const randomize = useGarage((st) => st.randomize);
  const reset = useGarage((st) => st.reset);

  // 車体の部位をクリックしたら、その棚までスクロールして一瞬光らせる
  const focusSection = useCallback((id: string) => {
    const sec = document.getElementById(id);
    if (!sec) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const off = innerWidth <= 900 ? (document.querySelector<HTMLElement>('.stage')?.offsetHeight ?? 0) : 0;
    window.scrollTo({ top: sec.getBoundingClientRect().top + scrollY - off - 16, behavior: reduce ? 'auto' : 'smooth' });
    sec.classList.add('flash');
    setTimeout(() => sec.classList.remove('flash'), 900);
  }, []);

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>2Dカスタムガレージ</h1>
          <p className="sub">ベース車両を選んで、外装・足まわり・塗装を組み替えられます。車体のパーツをクリックすると、その棚に移動します。</p>
        </div>
        <div className="hdr-actions">
          <button className="btn" type="button" onClick={() => randomize()}>おまかせ組み</button>
          <button className="btn" type="button" onClick={reset}>ノーマルに戻す</button>
        </div>
      </header>
      <div className="main">
        <div className="left">
          <BikeView onPartClick={focusSection} />
          <BuildSheet />
        </div>
        <Shelf />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { BikeSvg } from '../components/BikeSvg';
import { diffSpecs } from '../logic/diff';
import { totalPrice, yen } from '../logic/price';
import { navigate } from '../router';
import { useCurrent, useGarage } from '../store/garage';
import { useSaves } from '../store/saves';

/** 比較画面(2-07): ノーマル(または保存した仕様)と、いまのカスタムを並べる */
export function ComparePage() {
  const { vehicle, spec } = useCurrent();
  const ref = useGarage((st) => st.compareRef);
  const setCompareRef = useGarage((st) => st.setCompareRef);
  const saves = useSaves((st) => st.list).filter((b) => b.base === vehicle.id);
  const [mode, setMode] = useState<'side' | 'overlay'>('side');
  const [split, setSplit] = useState(50);
  // 比較相手は同じ車両のときだけ使う(別の車両の保存仕様なら、ノーマルと比べる)
  const target = ref && ref.base === vehicle.id ? ref : null;
  const before = target ? { ...vehicle.defaults, ...target.spec } : vehicle.defaults;
  const beforeLabel = target ? target.label : 'ノーマル';
  const figures = [
    { label: beforeLabel, spec: before },
    { label: 'カスタム', spec },
  ];
  const rows = diffSpecs(vehicle, before, spec);
  const wBefore = vehicle.weight(before), wAfter = vehicle.weight(spec);
  const pBefore = totalPrice(vehicle, before), pAfter = totalPrice(vehicle, spec);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">比較({vehicle.label})</h1>
        <div className="head-actions">
          <label className="select">
            比較相手
            <select
              value={target?.n ?? ''}
              onChange={(e) => {
                const b = saves.find((x) => String(x.n) === e.target.value);
                setCompareRef(b ? { n: b.n, label: b.name, base: b.base, spec: b.state } : null);
              }}
            >
              <option value="">ノーマル(標準仕様)</option>
              {saves.map((b) => <option key={b.n} value={b.n}>{b.name}</option>)}
            </select>
          </label>
          <div className="seg" role="group" aria-label="表示方法">
            <button type="button" aria-pressed={mode === 'side'} onClick={() => setMode('side')}>並べる</button>
            <button type="button" aria-pressed={mode === 'overlay'} onClick={() => setMode('overlay')}>重ねる</button>
          </div>
          <button type="button" className="btn" onClick={() => navigate('custom')}>カスタムに戻る</button>
        </div>
      </div>

      {mode === 'side' ? (
        <div className="compare-grid">
          {figures.map((f) => (
            <figure className="panel compare-fig" key={f.label}>
              <figcaption>{f.label}<b>{vehicle.styleName(f.spec)}</b></figcaption>
              <div className="stage"><BikeSvg vehicle={vehicle} spec={f.spec} label={`${f.label}の車両図`} /></div>
            </figure>
          ))}
        </div>
      ) : (
        <figure className="panel compare-fig">
          <figcaption>左: {beforeLabel} ／ 右: カスタム</figcaption>
          <div className="stage overlay">
            <BikeSvg vehicle={vehicle} spec={spec} label="カスタムの車両図" />
            <div className="overlay-before" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
              <BikeSvg vehicle={vehicle} spec={before} />
            </div>
            <div className="overlay-line" style={{ left: `${split}%` }} />
          </div>
          <input type="range" className="split" min={0} max={100} value={split} aria-label="境目の位置" onChange={(e) => setSplit(Number(e.target.value))} />
        </figure>
      )}

      <section className="panel">
        <h2 className="panel-title">変更点</h2>
        {rows.length === 0 ? (
          <p className="empty">{beforeLabel}から変更はありません。</p>
        ) : (
          <table className="diff">
            <thead><tr><th>部位</th><th>{beforeLabel}</th><th>カスタム</th><th className="num-col">価格の差</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td>{r.colors && <i className="dot" style={{ background: r.colors[0] }} />}{r.before}</td>
                  <td>{r.colors && <i className="dot" style={{ background: r.colors[1] }} />}{r.after}</td>
                  <td className="num-col">{r.price ? `${r.price > 0 ? '+' : '−'}${yen(Math.abs(r.price))}` : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><th>車両重量</th><td>{wBefore.toFixed(1)} kg</td><td>{wAfter.toFixed(1)} kg</td><td className="num-col">{(wAfter - wBefore).toFixed(1)} kg</td></tr>
              <tr><th>合計金額</th><td>{yen(pBefore)}</td><td>{yen(pAfter)}</td><td className="num-col">{pAfter - pBefore >= 0 ? '+' : '−'}{yen(Math.abs(pAfter - pBefore))}</td></tr>
            </tfoot>
          </table>
        )}
        <p className="fine">価格は仮の参考値です。重量は図面上の目安です。</p>
      </section>
    </div>
  );
}


import { useState } from 'react';
import { partLines, totalPrice, yen } from '../logic/price';
import { navigate } from '../router';
import { useCurrent, useGarage } from '../store/garage';
import { useSaves } from '../store/saves';
import { BikeSvg } from './BikeSvg';

/** 右: 選択中のパーツ、諸元、合計金額 */
export function SummaryPanel() {
  const { vehicle, spec } = useCurrent();
  const base = useGarage((st) => st.base);
  const reset = useGarage((st) => st.reset);
  const setCompareRef = useGarage((st) => st.setCompareRef);
  const save = useSaves((st) => st.save);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const lines = partLines(vehicle, spec);
  const changed = lines.filter((l) => l.price > 0 || l.removed);
  const { specs } = vehicle.sheet(spec);
  const paint = ['main', 'sub', 'accent'].filter((k) => k in vehicle.swatches);

  const notice = useGarage((st) => st.notice);
  const onSave = async () => {
    try {
      await save(base, spec, name);
      setName('');
      setMsg('マイページに保存しました。');
    } catch (e) {
      setMsg(`保存できませんでした。${e instanceof Error ? e.message : ''}`);
    }
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <aside className="panel summary-panel" aria-label="選択中のパーツ">
      <h2 className="panel-title">選択中のパーツ</h2>
      <ul className="sel-list">
        {lines.map((l) => (
          <li key={l.slot} className="sel-item" data-changed={l.price > 0 || l.removed}>
            <BikeSvg vehicle={vehicle} spec={spec} viewBox={vehicle.thumbs[l.slot]} className="sel-thumb" />
            <span className="sel-text">
              <small>{l.label}</small>
              <b>{l.name}</b>
            </span>
            <span className="sel-price">{l.price ? yen(l.price) : l.removed ? '—' : '標準'}</span>
          </li>
        ))}
      </ul>
      <div className="paint-row">
        {paint.map((k) => (
          <span key={k} className="paint-chip">
            <i className="dot" style={{ background: String(spec[k]) }} />
            {vehicle.colorLabels[k]}
          </span>
        ))}
      </div>
      <dl className="spec-list">
        {specs.map(([a, v]) => (
          <div key={a}>
            <dt>{a}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="total">
        <span>合計金額<small>(変更 {changed.length} 点)</small></span>
        <b>{yen(totalPrice(vehicle, spec))}</b>
      </div>
      <p className="fine">価格は仮の参考値です。工賃・塗装代は含みません。数値は図面上の目安です。</p>
      <button type="button" className="btn primary block" onClick={() => { setCompareRef(null); navigate('compare'); }}>
        比較する
      </button>
      <div className="save-row">
        <input className="text" type="text" maxLength={50} placeholder="保存名(省略可)" aria-label="保存名" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="button" className="btn" onClick={onSave}>保存する</button>
      </div>
      <p className="msg" role="status">{msg || notice}</p>
      <button type="button" className="btn ghost block" onClick={reset}>リセット(ノーマルに戻す)</button>
    </aside>
  );
}

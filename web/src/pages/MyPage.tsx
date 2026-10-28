import { useState } from 'react';
import { VEHICLES, isVehicleId } from '../catalog';
import { BikeSvg } from '../components/BikeSvg';
import { totalPrice, yen } from '../logic/price';
import { navigate } from '../router';
import { useGarage } from '../store/garage';
import { useSaves } from '../store/saves';

/** マイページ(2-08): 保存したカスタムの呼出・比較・名前の変更・削除 */
export function MyPage() {
  const list = useSaves((st) => st.list);
  const rename = useSaves((st) => st.rename);
  const remove = useSaves((st) => st.remove);
  const loadBuild = useGarage((st) => st.loadBuild);
  const switchBase = useGarage((st) => st.switchBase);
  const setCompareRef = useGarage((st) => st.setCompareRef);
  const [editing, setEditing] = useState<{ n: number; name: string } | null>(null);

  return (
    <div className="page">
      <h1 className="page-title">マイカスタム</h1>
      <p className="lead">保存したカスタムは、このブラウザに最大20件まで残ります。ブラウザのデータを消すと消えます。</p>
      {list.length === 0 ? (
        <div className="panel empty-box">
          <p>保存したカスタムはまだありません。カスタム画面の「保存する」で、ここに追加されます。</p>
          <button type="button" className="btn primary" onClick={() => navigate('custom')}>カスタムを始める</button>
        </div>
      ) : (
        <div className="card-grid">
          {list.map((b) => {
            const id = isVehicleId(b.base) ? b.base : 'ss';
            const v = VEHICLES[id];
            const spec = { ...v.defaults, ...b.state };
            const style = v.styleName(spec);
            return (
              <article key={b.n} className="card save-card">
                <BikeSvg vehicle={v} spec={spec} className="card-thumb" />
                {editing?.n === b.n ? (
                  <form className="rename" onSubmit={(e) => { e.preventDefault(); rename(b.n, editing.name); setEditing(null); }}>
                    <input className="text" autoFocus maxLength={50} aria-label="新しい名前" value={editing.name} onChange={(e) => setEditing({ n: b.n, name: e.target.value })} />
                    <button type="submit" className="btn">決定</button>
                  </form>
                ) : (
                  <span className="card-title">{b.name}</span>
                )}
                <span className="card-meta">{[v.label, style !== v.label && style, b.date, yen(totalPrice(v, spec))].filter(Boolean).join('・')}</span>
                <div className="card-actions">
                  <button type="button" className="btn primary" onClick={() => { loadBuild(id, b.state); navigate('custom'); }}>読み込む</button>
                  <button type="button" className="btn" onClick={() => { switchBase(id); setCompareRef({ n: b.n, label: b.name, base: id, spec: b.state }); navigate('compare'); }}>比較</button>
                  <button type="button" className="btn ghost" onClick={() => setEditing({ n: b.n, name: b.name })}>名前を変更</button>
                  <button type="button" className="btn ghost danger" aria-label={`${b.name}を削除`} onClick={() => { if (confirm(`「${b.name}」を削除します。よろしいですか?`)) remove(b.n); }}>削除</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

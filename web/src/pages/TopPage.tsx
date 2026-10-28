import { VEHICLES, VEHICLE_IDS } from '../catalog';
import { BikeSvg } from '../components/BikeSvg';
import { totalPrice, yen } from '../logic/price';
import { navigate } from '../router';
import { useGarage } from '../store/garage';

/** トップページ: サイトの概要、車種選択への入口、おすすめのカスタム例 */
export function TopPage() {
  const loadBuild = useGarage((st) => st.loadBuild);
  const ss = VEHICLES.ss;
  const hero = { ...ss.defaults, ...ss.presets[2].spec };
  return (
    <div className="page">
      <section className="hero panel">
        <div className="hero-text">
          <p className="eyebrow">2D BIKE CUSTOMIZER</p>
          <h1>あなただけのカスタムを、<br />シミュレーション。</h1>
          <p>ベース車両を選んで、マフラーやハンドル、ホイール、塗装を組み替えると、仕上がりの見た目と変更点、参考価格がすぐにわかります。実車を改造する前のイメージづくりに。</p>
          <div className="hero-actions">
            <button type="button" className="btn primary lg" onClick={() => navigate('select')}>車種を選んで始める</button>
            <button type="button" className="btn lg" onClick={() => navigate('custom')}>続きからカスタム</button>
          </div>
        </div>
        <BikeSvg vehicle={ss} spec={hero} className="hero-bike" label="カスタム例: ストリートファイター" />
      </section>

      <h2 className="section-title">おすすめのカスタム例</h2>
      <div className="card-grid">
        {VEHICLE_IDS.flatMap((id) =>
          VEHICLES[id].presets.slice(1).map((p) => {
            const v = VEHICLES[id];
            const spec = { ...v.defaults, ...p.spec };
            return (
              <button key={`${id}-${p.name}`} type="button" className="card" onClick={() => { loadBuild(id, p.spec); navigate('custom'); }}>
                <BikeSvg vehicle={v} spec={spec} className="card-thumb" />
                <span className="card-title">{p.name}</span>
                <span className="card-meta">{v.label}・{yen(totalPrice(v, spec))}</span>
              </button>
            );
          }),
        )}
      </div>

      <h2 className="section-title">使い方</h2>
      <ol className="steps">
        <li><b>車種を選ぶ</b><span>スーパースポーツとアメリカンから、カスタムの土台を選びます。</span></li>
        <li><b>パーツと色を組み替える</b><span>部位ごとにパーツを選ぶと、図と合計金額がすぐに変わります。車体をクリックしても選べます。</span></li>
        <li><b>比べて、保存する</b><span>ノーマルと並べて変更点を確かめ、気に入った組み方はマイページに保存できます。</span></li>
      </ol>
    </div>
  );
}

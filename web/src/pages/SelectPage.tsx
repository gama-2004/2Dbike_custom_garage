import { VEHICLES, VEHICLE_IDS } from '../catalog';
import { BikeSvg } from '../components/BikeSvg';
import { navigate } from '../router';
import { useGarage } from '../store/garage';

/** 車種選択(2-01) */
export function SelectPage() {
  const base = useGarage((st) => st.base);
  const switchBase = useGarage((st) => st.switchBase);
  return (
    <div className="page">
      <h1 className="page-title">車種を選択</h1>
      <p className="lead">カスタムの土台にするベース車両を選んでください。どちらもジャンルを参考にしたオリジナルデザインです。</p>
      <div className="vehicle-grid">
        {VEHICLE_IDS.map((id) => {
          const v = VEHICLES[id];
          const { specs } = v.sheet(v.defaults);
          return (
            <button key={id} type="button" className="card vehicle-big" aria-pressed={id === base} onClick={() => { switchBase(id); navigate('custom'); }}>
              <BikeSvg vehicle={v} spec={v.defaults} className="card-thumb" />
              <span className="card-title">{v.label}</span>
              <span className="card-meta">
                ホイールベース {v.wheelbase} mm・{specs.map(([a, b]) => `${a} ${b}`).join('・')}
              </span>
              <span className="card-meta">部位 {Object.keys(v.parts).length} か所・プリセット {v.presets.length - 1} 種類</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useCurrent, useGarage } from '../store/garage';
import { BikeSvg } from './BikeSvg';

const ZOOMS = [1, 1.25, 1.5, 2];

/** 中央: 2D表示。ノーマル/カスタムの切り替え、拡大、下におすすめのカスタム */
export function Stage({ onPart }: { onPart: (sectionId: string) => void }) {
  const { vehicle, spec } = useCurrent();
  const applyPreset = useGarage((st) => st.applyPreset);
  const randomize = useGarage((st) => st.randomize);
  const [view, setView] = useState<'normal' | 'custom'>('custom');
  const [zoom, setZoom] = useState(0);
  const shown = view === 'normal' ? vehicle.defaults : spec;
  const z = ZOOMS[zoom];
  // 拡大したときは車体の中央(エンジンのあたり)を中心にする
  const w = 800 / z, h = 440 / z;
  const viewBox = `${(800 - w) / 2 + 20 * (z - 1)} ${(440 - h) / 2 + 10 * (z - 1)} ${w} ${h}`;
  const active = vehicle.presets.findIndex((p) => {
    const f = { ...vehicle.defaults, ...p.spec };
    return Object.keys(f).every((k) => f[k] === spec[k]);
  });

  return (
    <section className="panel stage-panel" aria-label="2D表示">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="表示">
          <button type="button" aria-pressed={view === 'normal'} onClick={() => setView('normal')}>ノーマル</button>
          <button type="button" aria-pressed={view === 'custom'} onClick={() => setView('custom')}>カスタム</button>
        </div>
        <div className="tool-right">
          <button type="button" className="icon-btn" aria-label="縮小" disabled={zoom === 0} onClick={() => setZoom(zoom - 1)}>−</button>
          <span className="zoom-val">{Math.round(z * 100)}%</span>
          <button type="button" className="icon-btn" aria-label="拡大" disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom(zoom + 1)}>＋</button>
          <button type="button" className="btn" onClick={() => randomize()}>おまかせ組み</button>
        </div>
      </div>
      <div className="stage">
        <div className="style-tag">
          <small>{view === 'normal' ? 'Normal' : 'Style'}</small>
          <b>{vehicle.styleName(shown)}</b>
        </div>
        {view === 'custom' && <div className="hint">パーツをクリックで編集</div>}
        <BikeSvg
          vehicle={vehicle}
          spec={shown}
          viewBox={viewBox}
          label={view === 'normal' ? `${vehicle.label}(ノーマル)` : vehicle.aria}
          onPart={view === 'custom' ? (part) => vehicle.partMap[part] && onPart(vehicle.partMap[part]) : undefined}
        />
      </div>
      <div className="strip-head">おすすめのカスタム</div>
      <div className="strip" role="group" aria-label="おすすめのカスタム">
        {vehicle.presets.map((p, i) => (
          <button key={p.name} type="button" className="strip-item" aria-pressed={i === active} onClick={() => { applyPreset(i); setView('custom'); }}>
            <BikeSvg vehicle={vehicle} spec={{ ...vehicle.defaults, ...p.spec }} className="strip-thumb" />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

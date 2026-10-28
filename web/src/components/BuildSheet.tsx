import { useCurrent } from '../store/garage';

/** ビルドシート: 部品と色の一覧、諸元の目安 */
export function BuildSheet() {
  const { vehicle, spec } = useCurrent();
  const { rows, colors, specs } = vehicle.sheet(spec);
  return (
    <section className="sheet" aria-label="ビルドシート">
      <h2>Build sheet</h2>
      <div className="sheet-grid">
        {[['ベース車両', vehicle.label] as const, ...rows].map(([a, b]) => (
          <div className="row" key={a}>
            <span>{a}</span>
            <span>{b}</span>
          </div>
        ))}
        {colors.map(([a, b, c]) => (
          <div className="row" key={a}>
            <span>{a}</span>
            <span>
              {c && <i className="dot" style={{ background: c }} />}
              {b}
            </span>
          </div>
        ))}
      </div>
      <div className="specs">
        {specs.map(([a, v]) => (
          <div className="spec" key={a}>
            <small>{a}</small>
            <b>{v}</b>
          </div>
        ))}
        <span className="spec-note">数値は図面上の目安です</span>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { useCatalog } from '../catalog';
import type { ShelfItem, ShelfSection, Spec, Vehicle } from '../catalog/types';
import { disabledOptions, disabledSlots } from '../logic/constraints';
import { yen } from '../logic/price';
import { useCurrent, useGarage } from '../store/garage';
import { BikeSvg } from './BikeSvg';
import { ChipRow, SwatchRow } from './controls';

const ON_OFF = [['on', 'あり'], ['off', 'なし']] as const;

/** 部位の選択肢を、そのパーツを付けた図の切り抜きで並べる */
function PartGrid({ vehicle, spec, slot, reason }: { vehicle: Vehicle; spec: Spec; slot: string; reason?: string }) {
  const setValue = useGarage((st) => st.setValue);
  const off = disabledOptions(vehicle, spec);
  const why = vehicle.parts[slot].options.map(([v]) => off.get(`${slot}:${v}`)).find(Boolean);
  return (
    <>
      <div className="part-grid" role="group" aria-label={vehicle.parts[slot].label}>
        {vehicle.parts[slot].options.map(([value, label]) => {
          const price = vehicle.prices[slot]?.[value] ?? 0;
          const blocked = off.get(`${slot}:${value}`);
          return (
            <button
              key={value}
              type="button"
              className="part-card"
              aria-pressed={spec[slot] === value}
              disabled={!!reason || !!blocked}
              title={blocked}
              onClick={() => setValue(slot, value)}
            >
              <BikeSvg vehicle={vehicle} spec={{ ...spec, [slot]: value }} viewBox={vehicle.thumbs[slot]} className="part-thumb" />
              <span className="part-name">{label}</span>
              <span className="part-price">{price ? yen(price) : '標準'}</span>
            </button>
          );
        })}
      </div>
      {(reason || why) && <p className="note">{reason ?? why}</p>}
    </>
  );
}

function Item({ item, vehicle, spec, disabled }: { item: ShelfItem; vehicle: Vehicle; spec: Spec; disabled: Map<string, string> }) {
  const setValue = useGarage((st) => st.setValue);
  const setNumber = useGarage((st) => st.setNumber);
  switch (item.kind) {
    case 'part':
      return (
        <>
          {item.label && <div className="label-sm">{item.label}</div>}
          <PartGrid vehicle={vehicle} spec={spec} slot={item.key} reason={disabled.get(item.key)} />
        </>
      );
    case 'swatch':
      return (
        <>
          {item.label && <div className="label-sm">{item.label}</div>}
          <SwatchRow options={vehicle.swatches[item.key]} value={String(spec[item.key])} label={vehicle.colorLabels[item.key]} onPick={(c) => setValue(item.key, c)} />
        </>
      );
    case 'toggle':
      return (
        <>
          <div className="label-sm">{item.label}</div>
          <ChipRow options={ON_OFF} isOn={(v) => (v === 'on') === spec[item.key]} onPick={(v) => setValue(item.key, v === 'on')} />
        </>
      );
    case 'number':
      return (
        <>
          <div className="label-sm">{item.label}</div>
          <div className="inline">
            <ChipRow options={ON_OFF} isOn={(v) => (v === 'on') === spec[item.toggleKey]} onPick={(v) => setValue(item.toggleKey, v === 'on')} />
            <input className="num" type="number" min={item.min} max={item.max} aria-label={`${item.label}番号`} value={Number(spec[item.key])}
              onChange={(e) => setNumber(parseInt(e.target.value, 10))} />
          </div>
        </>
      );
  }
}

/** 区画のいま選んでいるもの(見出しの右に出す) */
function summary(v: Vehicle, s: Spec, sec: ShelfSection) {
  const first = sec.items[0];
  if (first.kind === 'part') return v.parts[first.key].options.find((o) => o[0] === s[first.key])?.[1] ?? '';
  return `${sec.items.length > 1 ? `${sec.items.length}か所` : ''}`;
}

function Category({ sec, vehicle, spec, disabled, open, onToggle }: {
  sec: ShelfSection; vehicle: Vehicle; spec: Spec; disabled: Map<string, string>; open: boolean; onToggle: () => void;
}) {
  return (
    <section className="cat" id={sec.id} data-open={open}>
      <h3>
        <button type="button" className="cat-head" aria-expanded={open} onClick={onToggle}>
          <span className="cat-title">{sec.title}</span>
          <span className="cat-sum">{summary(vehicle, spec, sec)}</span>
          <span className="chev" aria-hidden>›</span>
        </button>
      </h3>
      {open && (
        <div className="cat-body">
          {sec.items.map((item) => (
            <Item key={item.key} item={item} vehicle={vehicle} spec={spec} disabled={disabled} />
          ))}
        </div>
      )}
    </section>
  );
}

function VehicleTab() {
  const base = useGarage((st) => st.base);
  const specs = useGarage((st) => st.specs);
  const switchBase = useGarage((st) => st.switchBase);
  const applyPreset = useGarage((st) => st.applyPreset);
  const vehicles = useCatalog((c) => c.vehicles);
  const ids = useCatalog((c) => c.ids);
  const v = vehicles[base] ?? vehicles[ids[0]];
  return (
    <div className="vehicle-list">
      {ids.map((id) => {
        const x = vehicles[id];
        return (
          <button key={id} type="button" className="vehicle-card" aria-pressed={id === base} onClick={() => switchBase(id)}>
            <BikeSvg vehicle={x} spec={{ ...x.defaults, ...specs[id] }} className="vehicle-thumb" />
            <span className="vehicle-name">{x.label}</span>
            <span className="vehicle-meta">ホイールベース {x.wheelbase} mm</span>
          </button>
        );
      })}
      <p className="note">車両ごとに、いまの組み方を覚えています。</p>
      <div className="label-sm">{v.label}のおすすめカスタム</div>
      <div className="chips">
        {v.presets.map((p, i) => (
          <button key={p.name} type="button" className="chip" onClick={() => applyPreset(i)}>{p.name}</button>
        ))}
      </div>
    </div>
  );
}

/** 左: パーツのカテゴリ一覧(パーツ選択)と、車種選択 */
export function PartPanel({ focus }: { focus: { id: string; at: number } | null }) {
  const { vehicle, spec } = useCurrent();
  const setValue = useGarage((st) => st.setValue);
  const [tab, setTab] = useState<'parts' | 'vehicle'>('parts');
  const [open, setOpen] = useState<Set<string>>(() => new Set([vehicle.shelf[0].id]));
  const disabled = disabledSlots(vehicle, spec);
  const lower = Number(spec.lower);

  // 車体の部位をクリックしたら、そのカテゴリを開いて見える位置まで動かす
  useEffect(() => {
    if (!focus) return;
    setTab('parts');
    setOpen((o) => new Set(o).add(focus.id));
    requestAnimationFrame(() => {
      const el = document.getElementById(focus.id);
      if (!el) return;
      el.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 900);
    });
  }, [focus]);

  const toggle = (id: string) => setOpen((o) => {
    const n = new Set(o);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  return (
    <aside className="panel part-panel" aria-label="パーツ選択">
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'parts'} onClick={() => setTab('parts')}>パーツ選択</button>
        <button type="button" role="tab" aria-selected={tab === 'vehicle'} onClick={() => setTab('vehicle')}>車種選択</button>
      </div>
      {tab === 'vehicle' ? (
        <VehicleTab />
      ) : (
        <div className="cat-list">
          {vehicle.shelf.map((sec) => (
            <Category key={`${vehicle.id}-${sec.id}`} sec={sec} vehicle={vehicle} spec={spec} disabled={disabled} open={open.has(sec.id)} onToggle={() => toggle(sec.id)} />
          ))}
          <section className="cat" id="sec-lower" data-open={open.has('sec-lower')}>
            <h3>
              <button type="button" className="cat-head" aria-expanded={open.has('sec-lower')} onClick={() => toggle('sec-lower')}>
                <span className="cat-title">ローダウン(車高)</span>
                <span className="cat-sum">−{lower * 2} mm</span>
                <span className="chev" aria-hidden>›</span>
              </button>
            </h3>
            {open.has('sec-lower') && (
              <div className="cat-body">
                <div className="range">
                  <input type="range" min={0} max={vehicle.lowerMax} step={1} aria-label="ローダウン量" value={lower} onChange={(e) => setValue('lower', Number(e.target.value))} />
                  <output>−{lower * 2} mm</output>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}

import { VEHICLES, VEHICLE_IDS } from '../catalog';
import type { ShelfItem, Spec, Vehicle } from '../catalog/types';
import { disabledSlots } from '../logic/constraints';
import { useCurrent, useGarage } from '../store/garage';
import { ChipRow, SwatchRow } from './controls';
import { SaveList } from './SaveList';

const ON_OFF = [['on', 'あり'], ['off', 'なし']] as const;

/** いまの仕様が、どのプリセットと一致しているか(なければ -1) */
function presetIndex(v: Vehicle, s: Spec) {
  return v.presets.findIndex((p) => {
    const f = { ...v.defaults, ...p.spec };
    return Object.keys(f).every((k) => f[k] === s[k]);
  });
}

function Item({ item, vehicle, spec, disabled }: { item: ShelfItem; vehicle: Vehicle; spec: Spec; disabled: Map<string, string> }) {
  const setValue = useGarage((st) => st.setValue);
  const setNumber = useGarage((st) => st.setNumber);
  switch (item.kind) {
    case 'part': {
      const reason = disabled.get(item.key);
      return (
        <>
          {item.label && <div className="label-sm">{item.label}</div>}
          <ChipRow
            options={vehicle.parts[item.key].options}
            isOn={(v) => spec[item.key] === v}
            onPick={(v) => setValue(item.key, v)}
            disabled={!!reason}
            idPrefix={`opt-${item.key}`}
          />
          {reason && <p className="note">{reason}</p>}
        </>
      );
    }
    case 'swatch':
      return (
        <>
          {item.label && <div className="label-sm">{item.label}</div>}
          <SwatchRow
            options={vehicle.swatches[item.key]}
            value={String(spec[item.key])}
            label={vehicle.colorLabels[item.key]}
            onPick={(c) => setValue(item.key, c)}
          />
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
            <input
              className="num"
              type="number"
              min={item.min}
              max={item.max}
              aria-label={`${item.label}番号`}
              value={Number(spec[item.key])}
              onChange={(e) => setNumber(parseInt(e.target.value, 10))}
            />
          </div>
        </>
      );
  }
}

/** パーツ棚 */
export function Shelf() {
  const { vehicle, spec } = useCurrent();
  const base = useGarage((st) => st.base);
  const switchBase = useGarage((st) => st.switchBase);
  const applyPreset = useGarage((st) => st.applyPreset);
  const setValue = useGarage((st) => st.setValue);
  const disabled = disabledSlots(vehicle, spec);
  const pi = presetIndex(vehicle, spec);
  const lower = Number(spec.lower);

  return (
    <div className="shelf">
      <section className="sec">
        <h3>ベース車両</h3>
        <div className="chips">
          {VEHICLE_IDS.map((id) => (
            <button key={id} type="button" className="chip" aria-pressed={id === base} onClick={() => id !== base && switchBase(id)}>
              {VEHICLES[id].label}
            </button>
          ))}
        </div>
        <div className="label-sm">ベース仕様</div>
        <div className="chips">
          {vehicle.presets.map((p, i) => (
            <button key={p.name} type="button" className="chip" aria-pressed={i === pi} onClick={() => applyPreset(i)}>
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {vehicle.shelf.map((sec) => (
        <section className="sec" id={sec.id} key={sec.id}>
          <h3>
            {sec.title} {sec.em && <em>{sec.em}</em>}
          </h3>
          {sec.items.map((item) => (
            <Item key={item.key} item={item} vehicle={vehicle} spec={spec} disabled={disabled} />
          ))}
        </section>
      ))}

      <section className="sec" id="sec-lower">
        <h3>
          ローダウン <em>車高</em>
        </h3>
        <div className="range">
          <input type="range" min={0} max={vehicle.lowerMax} step={1} aria-label="ローダウン量" value={lower} onChange={(e) => setValue('lower', Number(e.target.value))} />
          <output>−{lower * 2} mm</output>
        </div>
      </section>

      <SaveList />
    </div>
  );
}

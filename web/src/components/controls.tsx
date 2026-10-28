import type { Option } from '../catalog/types';

/** 選択ボタン群(チップ) */
export function ChipRow({ options, isOn, onPick, disabled = false, idPrefix }: {
  options: readonly Option[];
  isOn: (value: string) => boolean;
  onPick: (value: string) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  return (
    <div className="chips" role="group">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          className="chip"
          id={idPrefix ? `${idPrefix}-${v}` : undefined}
          aria-pressed={isOn(v)}
          disabled={disabled}
          onClick={() => onPick(v)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

const HEX = /^#[0-9a-f]{6}$/i;

/** 色見本とカスタム色 */
export function SwatchRow({ options, value, label, onPick }: {
  options: readonly Option[];
  value: string;
  label: string;
  onPick: (hex: string) => void;
}) {
  return (
    <div className="swatches">
      {options.map(([c, n]) => (
        <button
          key={c}
          type="button"
          className="sw"
          title={n}
          aria-label={n}
          aria-pressed={value === c}
          style={{ background: c }}
          onClick={() => onPick(c)}
        />
      ))}
      <label className="custom" title="好きな色を選ぶ">
        <input type="color" aria-label={`${label}のカスタム色`} value={HEX.test(value) ? value : '#000000'} onChange={(e) => onPick(e.target.value)} />
        <span>＋</span>
      </label>
    </div>
  );
}

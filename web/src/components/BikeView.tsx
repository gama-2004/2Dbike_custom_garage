import { useMemo, type MouseEvent } from 'react';
import { useCurrent } from '../store/garage';

/** 車両ビュー(BikeView): 描画済みの SVG を表示し、部位のクリックを受け取る */
export function BikeView({ onPartClick }: { onPartClick: (sectionId: string) => void }) {
  const { vehicle, spec } = useCurrent();
  const svg = useMemo(() => vehicle.draw(spec), [vehicle, spec]);

  const onClick = (e: MouseEvent<SVGSVGElement>) => {
    const part = (e.target as Element).closest('[data-part]')?.getAttribute('data-part');
    const id = part ? vehicle.partMap[part] : undefined;
    if (id) onPartClick(id);
  };

  return (
    <div className="stage">
      <div className="style-tag">
        <small>Style</small>
        <b>{vehicle.styleName(spec)}</b>
      </div>
      <div className="hint">パーツをクリックで編集</div>
      <svg viewBox="0 0 800 440" role="img" aria-label={vehicle.aria} onClick={onClick} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

import { useId, useMemo, type MouseEvent } from 'react';
import type { Spec, Vehicle } from '../catalog/types';

/** 1枚の画面に図が何枚あっても、切り抜き(clipPath)の id がぶつからないようにする */
export const scopeIds = (svg: string, prefix: string) => svg.replace(/(id="|url\(#)(\w+Clip)/g, `$1${prefix}$2`);

/** 車両図。viewBox を変えると一部分(サムネイル)だけを表示できる */
export function BikeSvg({ vehicle, spec, viewBox = '0 0 800 440', label, className, onPart }: {
  vehicle: Vehicle;
  spec: Spec;
  viewBox?: string;
  label?: string;
  className?: string;
  /** 図の部位がクリックされたとき(data-part の値) */
  onPart?: (part: string) => void;
}) {
  const prefix = useId().replace(/[^\w]/g, '');
  const html = useMemo(() => scopeIds(vehicle.draw(spec), prefix), [vehicle, spec, prefix]);
  const onClick = onPart
    ? (e: MouseEvent<SVGSVGElement>) => {
        const part = (e.target as Element).closest('[data-part]')?.getAttribute('data-part');
        if (part) onPart(part);
      }
    : undefined;
  return (
    <svg
      className={className}
      viewBox={viewBox}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

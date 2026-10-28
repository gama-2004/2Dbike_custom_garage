/* 描画の共通部品。SVG の文字列を組み立てる。 */

export interface Pt {
  x: number;
  y: number;
}

export const CHROME = '#b4bbc3';
export const CHROME_HI = '#eef1f4';
export const TIRE = '#151515';
export const DARK = '#2b2d31';

export const r1 = (n: number) => Math.round(n * 10) / 10;
const rad = (d: number) => (d * Math.PI) / 180;
export const pol = (c: Pt, r: number, a: number): Pt => ({ x: c.x + r * Math.cos(rad(a)), y: c.y + r * Math.sin(rad(a)) });
export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const pt = (p: Pt) => `${r1(p.x)} ${r1(p.y)}`;

export function arc(c: Pt, r: number, a1: number, a2: number) {
  return `M${pt(pol(c, r, a1))} A${r} ${r} 0 ${Math.abs(a2 - a1) > 180 ? 1 : 0} ${a2 > a1 ? 1 : 0} ${pt(pol(c, r, a2))}`;
}

export function band(c: Pt, ro: number, ri: number, a1: number, a2: number) {
  const L = Math.abs(a2 - a1) > 180 ? 1 : 0,
    sw = a2 > a1 ? 1 : 0;
  return `M${pt(pol(c, ro, a1))} A${ro} ${ro} 0 ${L} ${sw} ${pt(pol(c, ro, a2))} L${pt(pol(c, ri, a2))} A${ri} ${ri} 0 ${L} ${1 - sw} ${pt(pol(c, ri, a1))} Z`;
}

export const line = (x1: number, y1: number, x2: number, y2: number, c: string, w: number, extra = '') =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;

export const pipe = (d: string, w: number) =>
  `<path d="${d}" fill="none" stroke="${CHROME}" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${CHROME_HI}" stroke-width="${Math.max(1.5, w * 0.25)}" stroke-linecap="round" transform="translate(0 -${r1(w * 0.2)})"/>`;

export const poly = (pts: Pt[], fill: string) =>
  `<polygon points="${pts.map((p) => `${r1(p.x)},${r1(p.y)}`).join(' ')}" fill="${fill}"/>`;

export function ground(RA: Pt, FA: Pt, wb: string) {
  return (
    `<ellipse cx="${(RA.x + FA.x) / 2}" cy="400" rx="${(FA.x - RA.x) / 2 + 110}" ry="7" style="fill:var(--shadow)"/>` +
    `<g style="stroke:var(--muted)" stroke-width="1"><line x1="${RA.x}" y1="424" x2="${FA.x}" y2="424"/><line x1="${RA.x}" y1="416" x2="${RA.x}" y2="432"/><line x1="${FA.x}" y1="416" x2="${FA.x}" y2="432"/></g>` +
    `<text x="${(RA.x + FA.x) / 2}" y="418" text-anchor="middle" style="fill:var(--muted);font:500 11px var(--f-mono)">WHEELBASE ${wb} mm</text>`
  );
}

export function swingarm(piv: Pt, RA: Pt, color: string, wA: number, wB: number) {
  const ang = (Math.atan2(RA.y - piv.y, RA.x - piv.x) * 180) / Math.PI;
  return `<g data-part="frame">${poly([pol(piv, wA, ang - 90), pol(RA, wB, ang - 90), pol(RA, wB, ang + 90), pol(piv, wA, ang + 90)], color)}<circle cx="${piv.x}" cy="${piv.y}" r="7" fill="#7d838b"/><circle cx="${RA.x}" cy="${RA.y}" r="9" fill="#5b6067"/></g>`;
}

/* アメリカンの描画(viewBox 0 0 800 440) */
import type { Spec } from '../catalog/types';
import { CHROME, CHROME_HI, TIRE, arc, band, ground, lerp, line, pipe, pol, poly, pt, r1, swingarm, type Pt } from './svg';

interface US {
  tank: string; seat: string; sissy: string; bar: string; shield: string; light: string; livery: string;
  exhaust: string; frontFender: string; rearFender: string; bags: string; wheel: string; engine: string;
  main: string; sub: string; accent: string; frameColor: string; seatColor: string; rimColor: string;
  lower: number;
}

const TANK: Record<string, { d: string; cap: number; panel: [number, number, number, number]; hl: string }> = {
  teardrop: { d: 'M404 210 C398 178 436 160 488 158 C524 157 546 166 548 186 L544 208 Z', cap: 157, panel: [476, 188, 54, 12], hl: 'M420 182 C436 168 470 163 506 164' },
  fat: { d: 'M394 214 C386 172 430 150 490 150 C532 150 554 164 554 190 L548 212 Z', cap: 149, panel: [474, 186, 64, 15], hl: 'M412 178 C430 160 470 155 512 157' },
  peanut: { d: 'M432 206 C428 182 456 168 494 168 C526 168 544 176 546 192 L540 206 Z', cap: 167, panel: [490, 190, 40, 9], hl: 'M444 186 C458 175 482 172 510 173' },
};
const FLAME = 'M566 156 L566 218 L506 214 C520 208 510 202 476 208 C498 198 486 192 452 196 C474 186 466 180 432 184 C458 172 474 168 484 170 C476 164 506 156 566 156 Z';
const SEAT: Record<string, string> = {
  step: 'M402 204 C380 214 350 224 322 222 C306 220 300 206 290 198 C270 192 244 192 232 198 C224 204 226 214 236 218 L310 236 L404 224 Z',
  kq: 'M402 204 C380 214 350 224 322 222 C306 220 302 200 298 180 C294 168 276 166 270 176 L264 198 C250 194 236 197 232 206 L238 220 L310 236 L404 224 Z',
  solo: 'M404 206 C392 194 360 192 334 198 C320 202 320 214 334 218 L400 222 Z',
};
const SHIELD: Record<string, string> = {
  short: 'M566 178 C560 152 556 126 556 106 C566 100 582 98 596 100 C600 126 604 154 606 178 Z',
  tall: 'M566 178 C558 140 552 96 552 64 C564 58 584 56 600 58 C602 98 604 140 606 178 Z',
};

function wheel(S: US, c: Pt, front: boolean) {
  const tr = front ? 68 : 60, tw = front ? 15 : 24, rr = front ? 57 : 46;
  let g = `<g data-part="wheel">`;
  g += `<circle cx="${c.x}" cy="${c.y}" r="${tr}" fill="none" stroke="${TIRE}" stroke-width="${tw}"/>`;
  g += `<circle cx="${c.x}" cy="${c.y}" r="${tr + tw / 2 - 3}" fill="none" stroke="#3a3a3a" stroke-width="1.4" stroke-dasharray="5 4"/>`;
  g += `<circle cx="${c.x}" cy="${c.y}" r="${rr}" fill="none" stroke="${S.rimColor}" stroke-width="5"/>`;
  const rc = S.rimColor, hub = front ? 14 : 20;
  if (S.wheel === 'spoke') {
    for (let i = 0; i < 40; i++) {
      const a = i * 9, b = a + (i % 2 ? 24 : -24);
      const p = pol(c, hub, a), q = pol(c, rr - 2, b);
      g += line(p.x, p.y, q.x, q.y, rc, 0.9);
    }
  } else if (S.wheel === 'cast') {
    for (let i = 0; i < 9; i++) {
      const a = i * 40 - 90;
      g += poly([pol(c, hub, a - 9), pol(c, rr - 2, a - 2.6), pol(c, rr - 2, a + 2.6), pol(c, hub, a + 9)], rc);
    }
  } else {
    g += `<circle cx="${c.x}" cy="${c.y}" r="${rr - 1}" fill="${rc}"/><circle cx="${c.x}" cy="${c.y}" r="${r1(rr * 0.66)}" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="2"/>`;
    g += `<circle cx="${r1(c.x - rr * 0.28)}" cy="${r1(c.y - rr * 0.34)}" r="${r1(rr * 0.45)}" fill="rgba(255,255,255,.14)"/>`;
  }
  if (front) {
    g += `<circle cx="${c.x}" cy="${c.y}" r="36" fill="none" stroke="#a7adb5" stroke-width="10"/>`;
    for (let i = 0; i < 14; i++) {
      const p = pol(c, 36, i * (360 / 14));
      g += `<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="1.7" fill="#5b6067"/>`;
    }
    const k = pol(c, 34, -150);
    g += `<rect x="${r1(k.x - 8)}" y="${r1(k.y - 13)}" width="16" height="26" rx="5" fill="#9aa0a8" transform="rotate(-30 ${r1(k.x)} ${r1(k.y)})"/>`;
  } else {
    g += `<circle cx="${c.x}" cy="${c.y}" r="26" fill="#9aa0a8"/><circle cx="${c.x}" cy="${c.y}" r="20" fill="none" stroke="#7d838b" stroke-width="2"/>`;
  }
  g += `<circle cx="${c.x}" cy="${c.y}" r="${hub - 2}" fill="#c3c8ce"/><circle cx="${c.x}" cy="${c.y}" r="4.5" fill="#2d2f33"/></g>`;
  return g;
}

function muffler(x1: number, y: number, x2: number, h: number) {
  return `<path d="M${x1} ${y - h} L${x2 + 7} ${y - h + 1.5} L${x2} ${y + h - 1} L${x1} ${y + h} Z" fill="${CHROME}"/>` +
    line(x1, y - h * 0.45, x2 + 6, y - h * 0.4, CHROME_HI, 3) + line(x1 - 2, y - h, x1 - 2, y + h, '#8e949c', 2.5) +
    `<ellipse cx="${x2 + 3.5}" cy="${y}" rx="2.6" ry="${h - 1.5}" fill="#4a4d52"/>`;
}

function fishtail(x: number, y: number) {
  return `<path d="M${x} ${y - 6} L${x - 38} ${y - 14} C${x - 46} ${y - 4} ${x - 46} ${y + 6} ${x - 38} ${y + 12} L${x} ${y + 6} Z" fill="${CHROME}"/>` + line(x, y - 3, x - 38, y - 9, CHROME_HI, 2.5);
}

function exhaust(S: US) {
  switch (S.exhaust) {
    case 'stagger':
      return pipe('M484 262 C508 288 502 348 462 356 L262 356', 12) + muffler(262, 356, 120, 10) +
        pipe('M366 262 C342 270 338 300 306 306 L262 306', 12) + muffler(262, 306, 126, 10);
    case 'fishtail':
      return pipe('M484 262 C508 288 502 348 462 356 L176 352', 12) + fishtail(176, 352) +
        pipe('M366 262 C342 270 338 300 306 306 L182 300', 12) + fishtail(182, 300);
    case 'drag':
      return pipe('M484 262 C506 286 498 326 462 330 L236 318', 11) + `<ellipse cx="236" cy="318" rx="2.5" ry="5" fill="#3a3c40"/>` +
        pipe('M366 262 C344 268 334 290 304 292 L242 288', 11) + `<ellipse cx="242" cy="288" rx="2.5" ry="5" fill="#3a3c40"/>`;
  }
  return '';
}

function engine(S: US) {
  const ch = S.engine === 'chrome';
  const fin = ch ? '#3a3d42' : '#1f2023', edge = ch ? '#a9afb7' : '#6f747b', cover = ch ? CHROME : '#2c2e32', coverHi = ch ? CHROME_HI : '#4a4d53', cs = ch ? '#9ea4ac' : '#2a2c30';
  const cyl = (a: number) => {
    let f = '';
    for (let y = 242; y < 302; y += 6) f += line(395, y, 455, y, edge, 2.2);
    return `<g transform="rotate(${a} 425 318)"><rect x="401" y="236" width="48" height="70" rx="3" fill="${fin}"/>${f}<rect x="395" y="220" width="60" height="21" rx="7" fill="${cover}"/><rect x="401" y="224" width="48" height="4" rx="2" fill="${coverHi}"/></g>`;
  };
  return `<g data-part="engine">${cyl(-32)}${cyl(32)}
  <path d="M356 300 L494 298 C510 314 504 352 482 358 L376 360 C352 354 346 318 356 300 Z" fill="${cs}"/>
  <ellipse cx="450" cy="332" rx="28" ry="19" fill="${cover}"/><ellipse cx="444" cy="326" rx="16" ry="7" fill="${coverHi}" opacity=".7"/>
  <ellipse cx="378" cy="334" rx="18" ry="14" fill="${cover}"/><ellipse cx="374" cy="330" rx="9" ry="4" fill="${coverHi}" opacity=".7"/>
  <circle cx="425" cy="264" r="26" fill="${cover}"/><circle cx="425" cy="264" r="19" fill="none" stroke="${coverHi}" stroke-width="3"/><circle cx="425" cy="264" r="9" fill="${ch ? '#7d838b' : '#1d1e21'}"/>
  <path d="M410 250 A20 20 0 0 1 436 246" fill="none" stroke="${CHROME_HI}" stroke-width="2.5" opacity="${ch ? 1 : 0.35}"/></g>`;
}

function fenderLivery(S: US, c: Pt, a1: number, a2: number, rm: number, front: boolean) {
  let o = '';
  if (S.livery === 'panel') o += `<path d="${arc(c, rm, a1 + (a2 > a1 ? 6 : -6), a2 + (a2 > a1 ? -6 : 6))}" fill="none" stroke="${S.sub}" stroke-width="4"/>`;
  if (S.livery === 'pinstripe') o += `<path d="${arc(c, rm, a1 + (a2 > a1 ? 5 : -5), a2 + (a2 > a1 ? -5 : 5))}" fill="none" stroke="${S.accent}" stroke-width="1.5"/>`;
  if (S.livery === 'flame' && front) o += `<path d="M${pt(pol(c, 96, -8))} L${pt(pol(c, 96, -58))} L${pt(pol(c, 79, -76))} L${pt(pol(c, 74, -60))} L${pt(pol(c, 84, -62))} L${pt(pol(c, 72, -44))} L${pt(pol(c, 80, -38))} L${pt(pol(c, 70, -26))} Z" fill="${S.sub}" stroke="${S.accent}" stroke-width="1.5"/>`;
  return o;
}

export function drawAmerican(spec: Spec, wheelbase: string): string {
  const S = spec as unknown as US;
  const dy = S.lower, RA = { x: 190, y: 328 }, FA = { x: 628, y: 324 };
  const T = TANK[S.tank];
  const RFa = S.rearFender === 'deep' ? [-38, -200] : [-40, -158], RFo = S.rearFender === 'deep' ? 94 : 86;
  const RF = band(RA, RFo, 73, RFa[0], RFa[1]);
  const FFa = S.frontFender === 'deep' ? [-22, -152] : [-55, -125];
  const FF = S.frontFender === 'none' ? null : band(FA, 84, 75, FFa[0], FFa[1]);
  let o = `<defs><clipPath id="tankClip"><path d="${T.d}"/></clipPath><clipPath id="rfClip"><path d="${RF}"/></clipPath>${FF ? `<clipPath id="ffClip"><path d="${FF}"/></clipPath>` : ''}</defs>`;
  o += ground(RA, FA, wheelbase);
  o += wheel(S, RA, false) + wheel(S, FA, true);
  // リアフェンダー
  const st = pol(RA, 75, -128);
  o += `<g data-part="rearFender">${line(RA.x, RA.y, st.x, st.y, CHROME, 7)}<path d="${RF}" fill="${S.main}"/><g clip-path="url(#rfClip)">${fenderLivery(S, RA, RFa[0], RFa[1], 79.5, false)}</g>
   <path d="${arc(RA, RFo - 2, RFa[0] - 4, -120)}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2"/>`;
  const tl = pol(RA, RFo + 2, S.rearFender === 'deep' ? -172 : -150);
  o += `<rect x="${r1(tl.x - 6)}" y="${r1(tl.y - 5)}" width="12" height="9" rx="3" fill="#c81e2b"/>`;
  const ts = pol(RA, RFo + 4, S.rearFender === 'deep' ? -150 : -132);
  o += `<ellipse cx="${r1(ts.x - 6)}" cy="${r1(ts.y)}" rx="5" ry="3.5" fill="#f0a020"/></g>`;
  o += swingarm({ x: 340, y: 314 + dy }, RA, S.frameColor, 10, 7);
  // 車体(後ろ側)
  o += `<g transform="translate(0 ${dy})">`;
  o += `<g data-part="frame" fill="none" stroke="${S.frameColor}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round">
   <path d="M548 168 L338 214"/><path d="M552 208 L520 300 L500 350 L356 352 L340 314 L338 214"/><path d="M338 232 L236 240" stroke-width="6"/>
   <line x1="546" y1="152" x2="552" y2="214" stroke-width="16"/></g>`;
  o += engine(S);
  o += `<g data-part="exhaust">${exhaust(S)}</g>`;
  o += `<rect x="462" y="342" width="52" height="7" rx="3" fill="#232427"/>` + line(464, 342, 512, 342, CHROME, 2);
  o += `</g>`;
  // フロントフェンダーとフォーク
  if (FF) o += `<g data-part="frontFender"><path d="${FF}" fill="${S.main}"/><g clip-path="url(#ffClip)">${fenderLivery(S, FA, FFa[0], FFa[1], 79.5, true)}</g>
   <path d="${arc(FA, 82, FFa[0] - 4, FFa[1] + 30)}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2"/></g>`;
  const FT = { x: 548, y: 150 + dy }, LC = lerp(FT, FA, 0.2), SL = lerp(FT, FA, 0.62);
  o += `<g data-part="fork">${line(FT.x, FT.y, FA.x, FA.y, CHROME, 12)}${line(FT.x + 3, FT.y, FA.x + 3, FA.y, CHROME_HI, 2.5)}${line(SL.x, SL.y, FA.x, FA.y, '#c3c8ce', 16)}
   ${line(FT.x - 16, FT.y + 4, FT.x + 14, FT.y - 2, CHROME, 9)}${line(LC.x - 16, LC.y + 4, LC.x + 14, LC.y - 2, CHROME, 9)}</g>`;
  // 車体(前側)
  o += `<g transform="translate(0 ${dy})">`;
  // シーシーバー(シートの後ろ)
  if (S.sissy !== 'none') {
    const tall = S.sissy === 'tall';
    o += `<g data-part="sissy">${line(254, 238, tall ? 238 : 246, tall ? 116 : 176, CHROME, 5)}${line(254, 238, tall ? 238 : 246, tall ? 116 : 176, CHROME_HI, 1.5)}
   <rect x="${tall ? 224 : 232}" y="${tall ? 120 : 170}" width="24" height="${tall ? 40 : 32}" rx="9" fill="${S.seatColor}" transform="rotate(-7 ${tall ? 236 : 244} ${tall ? 140 : 186})"/></g>`;
  }
  // タンク
  o += `<g data-part="paint"><path d="${T.d}" fill="${S.main}"/><g clip-path="url(#tankClip)">`;
  const [px, py, prx, pry] = T.panel;
  if (S.livery === 'panel') o += `<ellipse cx="${px}" cy="${py}" rx="${prx}" ry="${pry}" fill="${S.sub}" stroke="${S.accent}" stroke-width="1.8" transform="rotate(-3 ${px} ${py})"/>`;
  if (S.livery === 'pinstripe') o += `<ellipse cx="${px}" cy="${py}" rx="${prx}" ry="${pry}" fill="none" stroke="${S.accent}" stroke-width="1.6" transform="rotate(-3 ${px} ${py})"/><ellipse cx="${px}" cy="${py}" rx="${prx - 7}" ry="${Math.max(3, pry - 4)}" fill="none" stroke="${S.accent}" stroke-width=".9" transform="rotate(-3 ${px} ${py})"/>`;
  if (S.livery === 'flame') o += `<path d="${FLAME}" fill="${S.sub}" stroke="${S.accent}" stroke-width="1.8"/>`;
  o += `</g><path d="${T.hl}" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="3" stroke-linecap="round"/>
   <rect x="500" y="${T.cap - 4}" width="16" height="6" rx="3" fill="${CHROME}"/></g>`;
  // シート
  o += `<g data-part="seat"><path d="${SEAT[S.seat]}" fill="${S.seatColor}"/>`;
  if (S.seat === 'solo') o += `<path d="M342 218 l-6 4 l12 4 l-12 4 l12 4 l-6 4" fill="none" stroke="${CHROME}" stroke-width="2.5"/><path d="M386 220 l-6 4 l12 4 l-6 4" fill="none" stroke="${CHROME}" stroke-width="2.5"/>`;
  else o += `<path d="M398 208 C378 216 350 224 324 222" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="2"/>` + line(238, 220, 308, 234, CHROME, 2.5);
  o += `</g>`;
  // サドルバッグ
  if (S.bags === 'leather') {
    o += `<g data-part="bags"><path d="M160 238 L262 238 C268 238 270 244 270 250 L266 284 C264 292 258 294 250 294 L176 294 C166 294 162 288 160 280 Z" fill="${S.seatColor}"/>
   <path d="M160 238 L262 238 C268 238 270 244 270 250 L268 262 L162 262 Z" fill="rgba(0,0,0,.22)"/>
   <rect x="188" y="244" width="8" height="34" rx="2" fill="rgba(0,0,0,.35)"/><rect x="232" y="244" width="8" height="34" rx="2" fill="rgba(0,0,0,.35)"/>
   <rect x="186" y="266" width="12" height="8" rx="1.5" fill="none" stroke="${CHROME}" stroke-width="2"/><rect x="230" y="266" width="12" height="8" rx="1.5" fill="none" stroke="${CHROME}" stroke-width="2"/>`;
    for (let x = 170; x < 264; x += 12) o += `<circle cx="${x}" cy="258" r="1.6" fill="${CHROME}"/>`;
    o += `</g>`;
  }
  // ハンドルとミラー
  o += `<g data-part="bar">` + line(546, 156, 544, 138, CHROME, 6);
  if (S.bar === 'pullback') o += `<path d="M544 138 C530 126 508 126 496 136" fill="none" stroke="${CHROME}" stroke-width="6" stroke-linecap="round"/>` + line(496, 136, 476, 140, '#141414', 11) + line(500, 138, 486, 150, CHROME, 2) + line(512, 130, 522, 94, CHROME, 2.5) + `<ellipse cx="525" cy="90" rx="10" ry="8" fill="${CHROME}"/>`;
  if (S.bar === 'ape') o += `<path d="M544 140 L536 76 C534 68 520 68 510 72 L500 78" fill="none" stroke="${CHROME}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` + line(500, 78, 482, 84, '#141414', 11) + line(504, 80, 492, 94, CHROME, 2) + line(518, 72, 526, 42, CHROME, 2.5) + `<ellipse cx="528" cy="38" rx="10" ry="8" fill="${CHROME}"/>`;
  if (S.bar === 'drag') o += `<path d="M544 140 L541 133 L500 134" fill="none" stroke="${CHROME}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` + line(500, 134, 480, 135, '#141414', 11) + line(504, 136, 490, 146, CHROME, 2) + line(514, 134, 520, 102, CHROME, 2.5) + `<ellipse cx="522" cy="98" rx="9" ry="7" fill="${CHROME}"/>`;
  o += `</g>`;
  // ヘッドライト
  const L0 = { x: 564, y: 185 }, lens = '#f4efc6';
  o += `<g data-part="light">`;
  if (S.light === 'bullet') o += line(L0.x, L0.y, 574, 180, CHROME, 4) + `<circle cx="584" cy="178" r="14" fill="${CHROME}"/><path d="M574 170 A12 12 0 0 1 590 167" fill="none" stroke="${CHROME_HI}" stroke-width="2.5"/><ellipse cx="597" cy="178" rx="4" ry="13" fill="${lens}"/>`;
  else o += line(L0.x, L0.y, 574, 182, CHROME, 4) + `<circle cx="590" cy="180" r="22" fill="${CHROME}"/><path d="M574 168 A20 20 0 0 1 598 162" fill="none" stroke="${CHROME_HI}" stroke-width="3"/><ellipse cx="609" cy="180" rx="6" ry="21" fill="${lens}"/>`;
  if (S.light === 'twin') o += line(570, 214, 592, 226, CHROME, 4) + `<circle cx="598" cy="228" r="10" fill="${CHROME}"/><ellipse cx="607" cy="228" rx="3" ry="9.5" fill="${lens}"/>`;
  o += line(566, 198, 578, 203, CHROME, 2.5) + `<ellipse cx="582" cy="204" rx="6" ry="4" fill="#f0a020"/></g>`;
  // ウインドシールド
  if (S.shield !== 'none') o += `<g data-part="shield"><path d="${SHIELD[S.shield]}" fill="rgba(170,200,225,.32)" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/>` +
    line(566, 176, 560, 160, CHROME, 3) + line(605, 176, 603, 160, CHROME, 3) + `<path d="M562 ${S.shield === 'tall' ? 120 : 140} C566 ${S.shield === 'tall' ? 100 : 122} 572 ${S.shield === 'tall' ? 80 : 110} 580 ${S.shield === 'tall' ? 72 : 106}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2"/></g>`;
  o += `</g>`;
  return o;
}

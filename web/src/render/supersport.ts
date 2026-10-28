/* スーパースポーツの描画(viewBox 0 0 800 440) */
import type { Spec } from '../catalog/types';
import { CHROME, CHROME_HI, DARK, TIRE, arc, ground, lerp, line, pipe, pol, poly, pt, r1, swingarm, type Pt } from './svg';

interface SS {
  cowl: string; screen: string; light: string; livery: string; bar: string; mirror: string;
  exhaust: string; tail: string; seat: string; wheel: string;
  main: string; sub: string; accent: string; frameColor: string; seatColor: string;
  rimColor: string; forkColor: string; caliperColor: string;
  rimStripe: boolean; zekken: boolean; number: number; lower: number;
}

const P: Record<string, string> = {
  tank: 'M384 196 C386 168 420 150 462 144 C488 140 506 144 510 152 L474 196 Z',
  tail: 'M392 210 L302 196 L258 179 C240 172 222 161 204 148 L207 161 C222 183 258 207 304 223 L364 236 Z',
  single: 'M306 198 L258 181 L255 172 C272 160 300 166 306 184 Z',
  upper: 'M498 130 C545 124 592 158 614 192 L602 206 C580 214 560 224 548 240 L528 262 L440 262 L412 232 L388 208 L468 192 L494 152 Z',
  lower: 'M528 262 L502 300 C490 330 465 344 420 342 L368 336 C352 326 354 305 370 295 L398 262 Z',
  shroud: 'M466 196 L516 186 L530 246 L488 258 L458 232 Z',
  nakedFace: 'M534 150 L572 156 L580 192 L546 196 Z',
};
const SCREEN: Record<string, string> = {
  low: 'M520 132 C538 118 556 112 576 114 L592 156 C572 146 545 136 520 132 Z',
  std: 'M512 130 C528 110 552 98 572 100 L592 156 C572 146 540 134 512 130 Z',
  tall: 'M506 130 C516 92 544 68 566 68 L592 156 C570 146 538 134 506 130 Z',
};

function wheel(S: SS, c: Pt, front: boolean) {
  let g = `<g data-part="wheel">`;
  g += `<circle cx="${c.x}" cy="${c.y}" r="70" fill="none" stroke="${TIRE}" stroke-width="17"/>`;
  g += `<circle cx="${c.x}" cy="${c.y}" r="76" fill="none" stroke="#3a3a3a" stroke-width="1.2" stroke-dasharray="4 5"/>`;
  g += `<circle cx="${c.x}" cy="${c.y}" r="57.5" fill="none" stroke="${S.rimColor}" stroke-width="5"/>`;
  if (S.rimStripe) g += `<circle cx="${c.x}" cy="${c.y}" r="60.6" fill="none" stroke="${S.accent}" stroke-width="1.8"/>`;
  const rc = S.rimColor;
  if (S.wheel === 'y5') {
    for (let i = 0; i < 5; i++) {
      const a = i * 72 - 90 + (front ? 0 : 20);
      g += poly([pol(c, 12, a - 26), pol(c, 32, a - 7), pol(c, 32, a + 7), pol(c, 12, a + 26)], rc);
      for (const s of [-1, 1]) g += poly([pol(c, 30, a + s * 2), pol(c, 30, a + s * 9), pol(c, 56, a + s * 15), pol(c, 56, a + s * 8)], rc);
    }
  } else if (S.wheel === 'ten') {
    for (let i = 0; i < 10; i++) {
      const a = i * 36 - 90;
      g += poly([pol(c, 12, a - 10), pol(c, 56, a - 3.5), pol(c, 56, a + 3.5), pol(c, 12, a + 10)], rc);
    }
  } else {
    for (let i = 0; i < 7; i++) {
      const a = i * (360 / 7) - 90, p = pol(c, 12, a), m = pol(c, 36, a + 14), q = pol(c, 56, a + 6);
      g += `<path d="M${pt(p)} Q${pt(m)} ${pt(q)}" fill="none" stroke="${rc}" stroke-width="5.5" stroke-linecap="round"/>`;
    }
  }
  if (front) {
    g += `<circle cx="${c.x}" cy="${c.y}" r="43" fill="none" stroke="#9aa0a8" stroke-width="9"/>`;
    for (let i = 0; i < 16; i++) {
      const p = pol(c, 43, i * 22.5);
      g += `<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="1.8" fill="#55585d"/>`;
    }
    const k = pol(c, 40, -148);
    g += `<rect x="${r1(k.x - 9)}" y="${r1(k.y - 14)}" width="18" height="28" rx="5" fill="${S.caliperColor}" transform="rotate(-30 ${r1(k.x)} ${r1(k.y)})" data-part="caliper"/>`;
  } else {
    g += `<circle cx="${c.x}" cy="${c.y}" r="27" fill="none" stroke="#9aa0a8" stroke-width="5"/>`;
    const k = pol(c, 26, -70);
    g += `<rect x="${r1(k.x - 7)}" y="${r1(k.y - 10)}" width="14" height="20" rx="4" fill="${S.caliperColor}" transform="rotate(20 ${r1(k.x)} ${r1(k.y)})" data-part="caliper"/>`;
  }
  g += `<circle cx="${c.x}" cy="${c.y}" r="12" fill="#7d838b"/><circle cx="${c.x}" cy="${c.y}" r="4.5" fill="#2d2f33"/></g>`;
  return g;
}

function exhaust(S: SS) {
  const head = pipe('M478 300 C474 330 446 342 404 340 L360 334', 9);
  switch (S.exhaust) {
    case 'stock':
      return head + `<path d="M370 318 L290 292 L281 313 L362 342 Z" fill="#2c2e33"/><path d="M290 292 L278 290 L269 311 L281 313 Z" fill="${CHROME}"/><path d="M362 321 L295 299" stroke="#46494f" stroke-width="3"/>`;
    case 'slipon':
      return head + `<path d="M356 316 L264 288 C254 286 249 302 257 306 L348 342 Z" fill="#8e93a8"/><path d="M350 320 L266 293" stroke="#c8ccdc" stroke-width="3" stroke-linecap="round"/><path d="M268 289 L262 288 C252 286 247 302 256 306 L262 308 Z" fill="#2a2a2a"/>${line(338, 315, 330, 339, '#6d7186', 3)}`;
    case 'short':
      return head + `<path d="M392 326 L334 313 L329 338 L387 348 Z" fill="#222326"/><ellipse cx="331" cy="325.5" rx="4" ry="12.5" fill="${CHROME}"/>`;
    case 'centerup':
      return pipe('M478 300 C470 332 420 334 392 318 C372 302 352 262 324 242', 10) + `<path d="M336 228 L252 200 L246 218 L328 248 Z" fill="#a7adb5"/><path d="M332 233 L254 206" stroke="${CHROME_HI}" stroke-width="2.5"/><ellipse cx="249" cy="209" rx="3.5" ry="9.5" fill="#3a3c40"/>`;
  }
  return '';
}

export function drawSupersport(spec: Spec, wheelbase: string): string {
  const S = spec as unknown as SS;
  const RA = { x: 215, y: 322 }, FA = { x: 590, y: 322 }, dy = S.lower;
  const cowled = S.cowl !== 'naked';
  const paintParts = ['tank', 'tail'];
  if (S.seat === 'single') paintParts.push('single');
  if (cowled) paintParts.push('upper');
  if (S.cowl === 'full') paintParts.push('lower');
  if (!cowled) paintParts.push('shroud');
  let o = `<defs><clipPath id="paintClip">${paintParts.map((k) => `<path d="${P[k]}"/>`).join('')}</clipPath></defs>`;
  o += ground(RA, FA, wheelbase);
  o += wheel(S, RA, false) + wheel(S, FA, true);
  o += swingarm({ x: 352, y: 294 + dy }, RA, S.frameColor, 11, 7);
  o += `<g transform="translate(0 ${dy})">`;
  o += `<g data-part="frame" fill="none" stroke="${S.frameColor}" stroke-linejoin="round" stroke-linecap="round">
   <path d="M396 214 L236 176" stroke-width="7"/><path d="M372 262 L284 200" stroke-width="5"/>
   <path d="M522 160 L478 210 L400 228 L354 292" stroke-width="20"/>
   <path d="M519 166 L478 214 L402 232" stroke="rgba(255,255,255,.14)" stroke-width="3"/></g>`;
  let radi = '';
  for (let y = 198; y < 256; y += 5) radi += line(474, y, 514, y, '#34373c', 1.4);
  o += `<g data-part="engine"><rect x="470" y="192" width="48" height="66" rx="3" fill="#1d1f22"/>${radi}
   <g transform="rotate(24 450 232)"><rect x="416" y="196" width="66" height="54" rx="5" fill="#34373c"/><rect x="420" y="186" width="58" height="14" rx="4" fill="#45494f"/></g>
   <path d="M370 242 L470 232 C492 248 494 302 470 324 L382 328 C360 316 358 272 370 242 Z" fill="#2a2c30"/>
   <ellipse cx="412" cy="294" rx="24" ry="16" fill="#3c3f45"/><ellipse cx="412" cy="294" rx="9" ry="6" fill="#55595f"/>
   <path d="M380 256 C400 250 440 248 462 250" stroke="rgba(255,255,255,.1)" stroke-width="3" fill="none"/></g>`;
  o += `<g data-part="exhaust">${exhaust(S)}</g>`;
  o += `<g><path d="M336 266 L366 270 L356 304 L332 298 Z" fill="${CHROME}"/><circle cx="346" cy="290" r="5" fill="#222"/>${line(346, 290, 334, 292, '#222', 5)}</g>`;
  o += `</g>`;
  o += `<path data-part="paint" d="${arc(FA, 81, -42, -128)}" fill="none" stroke="${S.main}" stroke-width="8"/>`;
  const T = { x: 526, y: 146 + dy }, m = lerp(T, FA, 0.56), b = lerp(T, FA, 0.86);
  o += `<g data-part="fork">${line(T.x, T.y, FA.x, FA.y, CHROME, 10)}${line(T.x + 2, T.y, FA.x + 2, FA.y, CHROME_HI, 2)}${line(T.x, T.y, m.x, m.y, S.forkColor, 16)}${line(T.x + 3, T.y + 2, m.x + 3, m.y, 'rgba(255,255,255,.3)', 3)}
  ${line(b.x, b.y, FA.x, FA.y, DARK, 14)}${line(T.x - 14, T.y + 2, T.x + 12, T.y - 3, DARK, 8)}</g>`;
  o += `<g transform="translate(0 ${dy})">`;
  o += `<g data-part="bar">` + (S.bar === 'clip'
    ? line(522, 162, 494, 167, DARK, 6) + line(494, 167, 478, 170, '#121212', 11) + line(502, 168, 486, 179, CHROME, 2)
    : line(526, 150, 521, 124, DARK, 6) + line(521, 124, 489, 120, '#3a3d42', 6) + line(489, 120, 474, 118, '#121212', 11) + line(496, 122, 480, 132, CHROME, 2)) + `</g>`;
  o += `<g data-part="paint">`;
  for (const k of paintParts) o += `<path d="${P[k]}" fill="${S.main}"/>`;
  o += `<g clip-path="url(#paintClip)">`;
  if (S.livery === 'twotone') o += `<polygon points="180,246 640,214 640,400 180,400" fill="${S.sub}"/>` + line(180, 246, 640, 214, S.accent, 3);
  if (S.livery === 'stripe') o += line(180, 166, 640, 206, S.sub, 13) + line(180, 182, 640, 222, S.accent, 4);
  if (S.livery === 'racing') o += `<polygon points="418,130 486,130 432,280 364,280" fill="${S.sub}"/><polygon points="496,130 514,130 460,280 442,280" fill="${S.accent}"/>
   <polygon points="560,150 640,150 640,280 520,280" fill="${S.sub}"/><polygon points="262,150 292,150 278,240 246,240" fill="${S.sub}"/>`;
  o += `</g>`;
  if (cowled) o += `<path d="M452 244 L520 236 L507 256 L446 258 Z" fill="#18191b"/><path d="M430 222 L470 216 L462 228 L436 230 Z" fill="#18191b"/>`;
  else o += `<path d="M474 206 L510 199 L520 240 L490 248 Z" fill="none" stroke="#18191b" stroke-width="3"/>`;
  if (S.zekken) {
    const z = cowled ? { x: 476, y: 220, rx: 25, ry: 18, f: 20 } : { x: 262, y: 198, rx: 17, ry: 12, f: 14 };
    o += `<ellipse cx="${z.x}" cy="${z.y}" rx="${z.rx}" ry="${z.ry}" fill="#f5f5f2" stroke="#111" stroke-width="1"/><text x="${z.x}" y="${z.y + z.f * 0.36}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-weight="600" font-size="${z.f}" fill="#111">${S.number}</text>`;
  }
  o += `<path d="M402 176 C420 158 452 150 492 147" stroke="rgba(255,255,255,.32)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (cowled) o += `<path d="M512 138 C552 140 584 164 600 184" stroke="rgba(255,255,255,.3)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  o += `</g>`;
  o += `<g data-part="seat"><path d="M392 199 C368 190 332 189 302 194 L300 205 L390 210 Z" fill="${S.seatColor}"/>
   <path d="M386 196 C362 189 334 189 306 193" stroke="rgba(255,255,255,.16)" stroke-width="2" fill="none"/>`;
  if (S.seat === 'tandem') o += `<path d="M304 196 L258 180 L256 172 L305 187 Z" fill="${S.seatColor}"/>`;
  o += `</g>`;
  o += `<path d="M204 148 L217 156 L214 163 L207 161 Z" fill="#d1202b"/>`;
  o += `<g data-part="tail">` + (S.tail === 'stock'
    ? line(236, 182, 206, 232, DARK, 8) + `<rect x="196" y="226" width="6" height="30" rx="1" fill="#e6e6e6" stroke="#888"/>` + line(214, 206, 198, 203, '#f0a020', 4)
    : line(226, 172, 220, 190, DARK, 5) + `<rect x="214" y="187" width="5" height="25" rx="1" fill="#e6e6e6" stroke="#888"/>` + line(223, 178, 210, 176, '#f0a020', 3.5)) + `</g>`;
  if (cowled) o += `<g data-part="screen"><path d="${SCREEN[S.screen]}" fill="rgba(38,46,58,.62)"/><path d="${SCREEN[S.screen]}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/></g>`;
  const lens = '#eaf4ff';
  o += `<g data-part="light">`;
  if (cowled) {
    o += `<path d="M576 180 L612 189 L606 200 L572 191 Z" fill="#111"/>`;
    if (S.light === 'slit') o += `<path d="M582 183 L606 189 L602 194 L579 188 Z" fill="${lens}"/>`;
    if (S.light === 'round') o += `<ellipse cx="600" cy="192" rx="3.5" ry="6.5" fill="${lens}"/><ellipse cx="588" cy="188" rx="3" ry="5" fill="${lens}" opacity=".7"/>`;
    if (S.light === 'square') o += `<rect x="590" y="186" width="10" height="9" rx="1" fill="${lens}"/>`;
  } else {
    if (S.light === 'slit') o += `<path d="${P.nakedFace}" fill="${S.main}"/><path d="M552 182 L578 180 L579 188 L553 190 Z" fill="${lens}"/>`;
    if (S.light === 'round') o += line(528, 172, 546, 172, DARK, 5) + `<circle cx="560" cy="172" r="18" fill="#222"/><ellipse cx="575" cy="172" rx="4.5" ry="15" fill="${lens}"/>`;
    if (S.light === 'square') o += line(528, 172, 546, 172, DARK, 5) + `<rect x="544" y="157" width="28" height="30" rx="5" fill="#222"/><rect x="570" y="160" width="6" height="24" rx="2" fill="${lens}"/>`;
  }
  o += `</g>`;
  o += `<g data-part="mirror">`;
  if (S.mirror === 'stock') {
    if (cowled) o += line(546, 132, 551, 110, '#222', 3) + `<ellipse cx="560" cy="106" rx="13" ry="6" fill="#1b1b1d"/>`;
    else {
      const gx = S.bar === 'bar' ? 506 : 500, gy = S.bar === 'bar' ? 122 : 166;
      o += line(gx, gy, 512, 96, '#222', 3) + `<ellipse cx="518" cy="92" rx="12" ry="6" fill="#1b1b1d"/>`;
    }
  }
  if (S.mirror === 'barend') {
    const g = S.bar === 'bar' ? { x: 470, y: 118 } : { x: 474, y: 171 };
    o += `<ellipse cx="${g.x - 4}" cy="${g.y}" rx="5" ry="10" fill="#1b1b1d"/>`;
  }
  o += `</g></g>`;
  return o;
}

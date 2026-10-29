import { drawAmerican } from '../render/american';
import { colorName, optLabel, pick } from './helpers';
import type { Option, ShelfSection, Vehicle } from './types';

const PAINT: Option[] = [
  ['#141416', 'ブラック'], ['#6e1420', 'ワインレッド'], ['#1d3a7a', 'キャンディブルー'], ['#e8dfc9', 'クリーム'],
  ['#b8bec6', 'シルバー'], ['#4f5a3a', 'オリーブドラブ'], ['#c8571b', 'バーントオレンジ'], ['#4d5560', 'ガンメタ'],
];

const partSec = (key: string, title: string): ShelfSection => ({ id: `sec-${key}`, title, items: [{ kind: 'part', key }] });

export const american: Vehicle = {
  id: 'V002',
  label: 'アメリカン',
  wheelbase: '1,610',
  lowerMax: 20,
  aria: 'カスタムしたアメリカンのサイドビュー',
  parts: {
    tank: { label: 'タンク', options: [['teardrop', 'ティアドロップ'], ['fat', 'ファットタンク'], ['peanut', 'ピーナッツ']] },
    seat: { label: 'シート', options: [['step', '段付きタンデム'], ['solo', 'ソロサドル'], ['kq', 'キング＆クイーン']] },
    sissy: { label: 'シーシーバー', options: [['none', 'なし'], ['short', 'ショート'], ['tall', 'ロング']] },
    bar: { label: 'ハンドル', options: [['pullback', 'プルバック'], ['ape', 'エイプハンガー'], ['drag', 'ドラッグバー']] },
    shield: { label: 'ウインドシールド', options: [['none', 'なし'], ['short', 'ショート'], ['tall', 'ロング']] },
    light: { label: 'ヘッドライト', options: [['round', '7インチ丸目'], ['bullet', '小ぶり丸目'], ['twin', 'フォグランプ付き']] },
    livery: { label: 'グラフィック', options: [['solid', 'ソリッド'], ['panel', 'タンクパネル'], ['flame', 'ファイヤーパターン'], ['pinstripe', 'ピンストライプ']] },
    exhaust: { label: 'マフラー', options: [['stagger', '2本出しロング'], ['fishtail', 'フィッシュテール'], ['drag', 'ドラッグパイプ']] },
    frontFender: { label: 'フロントフェンダー', options: [['deep', 'ディープ'], ['short', 'ショート'], ['none', 'なし']] },
    rearFender: { label: 'リアフェンダー', options: [['deep', 'ディープ'], ['bobbed', 'ボブ']] },
    bags: { label: 'サドルバッグ', options: [['none', 'なし'], ['leather', 'レザー']] },
    wheel: { label: 'ホイール', options: [['spoke', 'ワイヤースポーク'], ['cast', 'キャスト'], ['disc', 'ディッシュ']] },
    engine: { label: 'エンジン仕上げ', options: [['chrome', 'クローム'], ['black', 'ブラックアウト']] },
  },
  swatches: {
    main: PAINT,
    sub: PAINT,
    accent: [['#c9ced4', 'シルバー'], ['#f2f2f2', 'ホワイト'], ['#c79a2b', 'ゴールド'], ['#c4161c', 'レッド'], ['#e8dfc9', 'クリーム'], ['#111111', 'ブラック']],
    frameColor: [['#141416', 'ブラック'], ['#6e1420', 'ワインレッド'], ['#b8bec6', 'シルバー']],
    seatColor: [['#1b1b1d', 'ブラック'], ['#5a3420', 'ブラウン'], ['#9a6b3f', 'タン'], ['#6e1919', 'オックスブラッド']],
    rimColor: [['#d2d6db', 'クローム'], ['#1c1c1e', 'ブラック'], ['#c79a2b', 'ゴールド']],
  },
  colorLabels: {
    main: 'メインカラー', sub: 'サブカラー', accent: 'ピンストライプ・縁取り', frameColor: 'フレーム', seatColor: 'シート・バッグ', rimColor: 'リム・スポーク',
  },
  bools: [],
  defaults: {
    tank: 'teardrop', seat: 'step', sissy: 'none', bar: 'pullback', shield: 'none', light: 'round', livery: 'panel', exhaust: 'stagger',
    frontFender: 'deep', rearFender: 'deep', bags: 'none', wheel: 'spoke', engine: 'chrome',
    main: '#141416', sub: '#4d5560', accent: '#c9ced4', frameColor: '#141416', seatColor: '#1b1b1d', rimColor: '#d2d6db', lower: 0,
  },
  presets: [
    { name: 'ノーマル', spec: {} },
    { name: 'ボバー', spec: { tank: 'peanut', seat: 'solo', bar: 'drag', light: 'bullet', livery: 'solid', exhaust: 'drag', frontFender: 'none', rearFender: 'bobbed', engine: 'black',
      main: '#4f5a3a', sub: '#4f5a3a', accent: '#e8dfc9', seatColor: '#5a3420', rimColor: '#1c1c1e', lower: 12 } },
    { name: 'チョッパー', spec: { tank: 'peanut', seat: 'kq', sissy: 'tall', bar: 'ape', light: 'bullet', livery: 'flame', exhaust: 'fishtail', frontFender: 'none', rearFender: 'bobbed',
      main: '#6e1420', sub: '#c8571b', accent: '#c79a2b', rimColor: '#d2d6db', lower: 6 } },
    { name: 'ツーリング', spec: { tank: 'fat', sissy: 'short', shield: 'tall', light: 'twin', livery: 'pinstripe', bags: 'leather', wheel: 'cast',
      main: '#1d3a7a', sub: '#1d3a7a', accent: '#c9ced4', seatColor: '#5a3420' } },
    { name: 'ブラックアウト', spec: { tank: 'fat', livery: 'solid', wheel: 'disc', engine: 'black', frontFender: 'short', main: '#141416', sub: '#141416', accent: '#4d5560', rimColor: '#1c1c1e', lower: 16 } },
  ],
  constraints: [],
  shelf: [
    partSec('tank', 'タンク'),
    { id: 'sec-paint', title: '塗装', em: 'PAINT', items: [
      { kind: 'part', key: 'livery', label: 'グラフィック' },
      { kind: 'swatch', key: 'main', label: 'メインカラー' },
      { kind: 'swatch', key: 'sub', label: 'サブカラー（パネル・炎）' },
      { kind: 'swatch', key: 'accent', label: 'ピンストライプ・縁取り' },
    ] },
    partSec('seat', 'シート'),
    partSec('sissy', 'シーシーバー'),
    partSec('bar', 'ハンドル'),
    partSec('shield', 'ウインドシールド'),
    partSec('light', 'ヘッドライト'),
    partSec('exhaust', 'マフラー'),
    partSec('frontFender', 'フロントフェンダー'),
    partSec('rearFender', 'リアフェンダー'),
    partSec('bags', 'サドルバッグ'),
    { id: 'sec-wheel', title: 'ホイール', items: [{ kind: 'part', key: 'wheel' }, { kind: 'swatch', key: 'rimColor', label: 'リム・スポーク色' }] },
    partSec('engine', 'エンジン仕上げ'),
    { id: 'sec-frameColor', title: 'フレーム', items: [{ kind: 'swatch', key: 'frameColor', label: '' }] },
    { id: 'sec-seatColor', title: 'シート・バッグの革', items: [{ kind: 'swatch', key: 'seatColor', label: '' }] },
  ],
  partMap: {
    wheel: 'sec-wheel', frame: 'sec-frameColor', engine: 'sec-engine', exhaust: 'sec-exhaust', seat: 'sec-seat', paint: 'sec-paint', light: 'sec-light',
    bar: 'sec-bar', sissy: 'sec-sissy', bags: 'sec-bags', shield: 'sec-shield', frontFender: 'sec-frontFender', rearFender: 'sec-rearFender', fork: 'sec-light',
  },
  // 仮の参考価格(実在の製品価格ではない)
  prices: {
    tank: { fat: 68000, peanut: 54000 },
    seat: { solo: 32800, kq: 45800 },
    sissy: { short: 18800, tall: 26800 },
    bar: { ape: 42000, drag: 22000 },
    shield: { short: 24800, tall: 34800 },
    light: { bullet: 21800, twin: 38000 },
    livery: { solid: 30000, flame: 98000, pinstripe: 58000 },
    exhaust: { fishtail: 108000, drag: 86000 },
    frontFender: { short: 16800, none: 5000 },
    rearFender: { bobbed: 29800 },
    bags: { leather: 64800 },
    wheel: { cast: 128000, disc: 158000 },
    engine: { black: 78000 },
  },
  thumbs: {
    tank: '380 130 200 110', seat: '220 150 200 110', sissy: '190 90 130 180', bar: '450 20 130 150',
    shield: '520 40 110 170', light: '540 140 100 110', livery: '370 130 220 120', exhaust: '110 230 320 240',
    frontFender: '530 220 190 120', rearFender: '80 220 210 130', bags: '140 220 150 100', wheel: '540 240 180 180',
    engine: '340 200 190 180',
  },
  styleName(s) {
    if (s.bar === 'ape') return 'チョッパー';
    if (s.rearFender === 'bobbed' && s.seat === 'solo') return 'ボバー';
    if (s.bags === 'leather' && s.shield !== 'none') return 'ツーリングクルーザー';
    if (s.engine === 'black' && s.main === '#141416') return 'ダークカスタム';
    return 'アメリカン';
  },
  weight(s) {
    let w = 245;
    w += pick({ none: 0, short: 1, tall: 2 }, s.sissy);
    w += pick({ none: 0, short: 3, tall: 4.5 }, s.shield);
    w += s.bags === 'leather' ? 6 : 0;
    w += pick({ stagger: 0, fishtail: -1, drag: -4 }, s.exhaust);
    w += s.rearFender === 'bobbed' ? -3 : 0;
    w += pick({ deep: 0, short: -1, none: -2 }, s.frontFender);
    w += s.wheel === 'disc' ? 2 : 0;
    w += s.light === 'twin' ? 2 : 0;
    w += pick({ teardrop: 0, fat: 2, peanut: -1.5 }, s.tank);
    return w;
  },
  sheet(s) {
    const lower = Number(s.lower);
    const rows = ['tank', 'seat', 'sissy', 'bar', 'shield', 'light', 'exhaust', 'frontFender', 'rearFender', 'bags', 'wheel', 'engine', 'livery'].map(
      (k): [string, string] => [this.parts[k].label, optLabel(this, k, s[k])],
    );
    const colors = ['main', 'sub', 'accent', 'frameColor', 'seatColor', 'rimColor'].map(
      (k): [string, string, string | null] => [this.colorLabels[k], colorName(this, k, s[k]), String(s[k])],
    );
    const seatH = pick({ step: 695, solo: 680, kq: 705 }, s.seat);
    const specs: [string, string][] = [
      ['シート高', `${seatH - lower * 2} mm`],
      ['最低地上高', `${140 - lower * 2} mm`],
      ['車両重量', `${this.weight(s).toFixed(1)} kg`],
    ];
    return { rows, colors, specs };
  },
  draw(s) {
    return drawAmerican(s, this.wheelbase);
  },
};

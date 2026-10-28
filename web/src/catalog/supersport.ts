import { drawSupersport } from '../render/supersport';
import { colorName, optLabel, pick } from './helpers';
import type { Option, Vehicle } from './types';

const PAINT: Option[] = [
  ['#c4161c', 'キャンディレッド'], ['#e9ecef', 'パールホワイト'], ['#25262a', 'マットブラック'], ['#4d5560', 'ガンメタ'],
  ['#1d2f6b', 'ミッドナイトブルー'], ['#0f6e6c', 'ディープティール'], ['#e2611b', 'ブレイズオレンジ'], ['#b8bec6', 'シルバー'],
];

export const supersport: Vehicle = {
  id: 'ss',
  label: 'スーパースポーツ',
  wheelbase: '1,370',
  lowerMax: 20,
  aria: 'カスタムしたスーパースポーツのサイドビュー',
  parts: {
    cowl: { label: 'カウル', options: [['full', 'フルカウル'], ['half', 'ハーフカウル'], ['naked', 'ネイキッド化']] },
    screen: { label: 'スクリーン', options: [['low', 'ロー'], ['std', 'スタンダード'], ['tall', 'ロング']] },
    light: { label: 'ヘッドライト', options: [['slit', 'シャープ2眼'], ['round', '丸目LED'], ['square', '角目LED']] },
    livery: { label: 'グラフィック', options: [['solid', 'ソリッド'], ['twotone', '2トーン'], ['stripe', 'ストライプ'], ['racing', 'レーシング']] },
    bar: { label: 'ハンドル', options: [['clip', 'セパハン'], ['bar', 'バーハンドル']] },
    mirror: { label: 'ミラー', options: [['stock', 'ノーマル'], ['barend', 'バーエンド'], ['none', 'なし（サーキット）']] },
    exhaust: { label: 'マフラー', options: [['stock', 'ノーマル'], ['slipon', 'スリップオン（チタン）'], ['short', 'ショートサイレンサー'], ['centerup', 'センターアップ']] },
    tail: { label: 'テール', options: [['stock', 'ノーマル'], ['fenderless', 'フェンダーレス']] },
    seat: { label: 'シート', options: [['tandem', 'タンデム'], ['single', 'シングルシートカウル']] },
    wheel: { label: 'ホイール', options: [['y5', '5本Yスポーク'], ['ten', '10本スポーク'], ['forged', '鍛造7本']] },
  },
  swatches: {
    main: PAINT,
    sub: PAINT,
    accent: [['#f2f2f2', 'ホワイト'], ['#111111', 'ブラック'], ['#c79a2b', 'ゴールド'], ['#e2611b', 'オレンジ'], ['#c4161c', 'レッド'], ['#33c3d6', 'シアン']],
    frameColor: [['#1c1c1e', 'ブラック'], ['#b8bec6', 'アルミシルバー'], ['#4d5560', 'ガンメタ'], ['#a3121c', 'レッド']],
    seatColor: [['#1b1b1d', 'ブラック'], ['#55585e', 'グレー'], ['#5a3420', 'ブラウン']],
    rimColor: [['#1c1c1e', 'ブラック'], ['#c9ced4', 'シルバー'], ['#c79a2b', 'ゴールド'], ['#8a5a2b', 'ブロンズ'], ['#c4161c', 'レッド']],
    forkColor: [['#c9a227', 'ゴールド'], ['#8c8fa6', 'チタン'], ['#2b2d31', 'ブラック'], ['#c9ced4', 'シルバー']],
    caliperColor: [['#c9a227', 'ゴールド'], ['#c4161c', 'レッド'], ['#2b2d31', 'ブラック'], ['#2a62c9', 'ブルー']],
  },
  colorLabels: {
    main: 'メインカラー', sub: 'サブカラー', accent: 'ライン', frameColor: 'フレーム', seatColor: 'シート表皮',
    rimColor: 'リム', forkColor: 'フロントフォーク', caliperColor: 'キャリパー',
  },
  bools: ['rimStripe', 'zekken'],
  defaults: {
    cowl: 'full', screen: 'std', light: 'slit', livery: 'twotone', bar: 'clip', mirror: 'stock', exhaust: 'stock', tail: 'stock', seat: 'tandem', wheel: 'y5',
    main: '#c4161c', sub: '#25262a', accent: '#f2f2f2', frameColor: '#1c1c1e', seatColor: '#1b1b1d', rimColor: '#1c1c1e', forkColor: '#c9a227', caliperColor: '#c9a227',
    rimStripe: false, zekken: false, number: 27, lower: 0,
  },
  presets: [
    { name: 'ノーマル', spec: {} },
    { name: 'サーキット仕様', spec: { cowl: 'full', screen: 'low', light: 'slit', livery: 'racing', bar: 'clip', mirror: 'none', exhaust: 'short', tail: 'fenderless', seat: 'single', wheel: 'forged',
      main: '#e9ecef', sub: '#e2611b', accent: '#111111', rimColor: '#1c1c1e', forkColor: '#c9a227', caliperColor: '#c9a227', rimStripe: true, zekken: true, number: 27 } },
    { name: 'ストリートファイター', spec: { cowl: 'naked', light: 'round', livery: 'stripe', bar: 'bar', mirror: 'barend', exhaust: 'slipon', tail: 'fenderless', wheel: 'ten',
      main: '#25262a', sub: '#4d5560', accent: '#e2611b', rimColor: '#8a5a2b', forkColor: '#2b2d31', caliperColor: '#c4161c', lower: 8 } },
    { name: 'スポーツツアラー', spec: { screen: 'tall', livery: 'twotone', bar: 'bar', main: '#1d2f6b', sub: '#b8bec6', accent: '#f2f2f2', rimColor: '#c9ced4', forkColor: '#c9ced4', caliperColor: '#2b2d31' } },
    { name: 'ナイトシャドウ', spec: { livery: 'solid', exhaust: 'centerup', tail: 'fenderless', seat: 'single', main: '#25262a', sub: '#25262a', accent: '#4d5560', forkColor: '#2b2d31', caliperColor: '#2b2d31', rimColor: '#1c1c1e', lower: 10 } },
  ],
  constraints: [
    { when: { key: 'cowl', value: 'naked' }, disables: 'screen', message: 'ネイキッド化するとスクリーンは外れます。' },
  ],
  shelf: [
    { id: 'sec-cowl', title: 'カウル', items: [{ kind: 'part', key: 'cowl' }] },
    { id: 'sec-screen', title: 'スクリーン', items: [{ kind: 'part', key: 'screen' }] },
    { id: 'sec-light', title: 'ヘッドライト', items: [{ kind: 'part', key: 'light' }] },
    { id: 'sec-paint', title: '塗装', em: 'PAINT', items: [
      { kind: 'part', key: 'livery', label: 'グラフィック' },
      { kind: 'swatch', key: 'main', label: 'メインカラー' },
      { kind: 'swatch', key: 'sub', label: 'サブカラー' },
      { kind: 'swatch', key: 'accent', label: 'ライン' },
      { kind: 'number', key: 'number', label: 'ゼッケン', toggleKey: 'zekken', min: 0, max: 99 },
    ] },
    { id: 'sec-bar', title: 'ハンドル', items: [{ kind: 'part', key: 'bar' }] },
    { id: 'sec-mirror', title: 'ミラー', items: [{ kind: 'part', key: 'mirror' }] },
    { id: 'sec-exhaust', title: 'マフラー', items: [{ kind: 'part', key: 'exhaust' }] },
    { id: 'sec-tail', title: 'テール', items: [{ kind: 'part', key: 'tail' }] },
    { id: 'sec-seat', title: 'シート', items: [{ kind: 'part', key: 'seat' }] },
    { id: 'sec-wheel', title: 'ホイール', items: [
      { kind: 'part', key: 'wheel' },
      { kind: 'swatch', key: 'rimColor', label: 'リム色' },
      { kind: 'toggle', key: 'rimStripe', label: 'リムストライプ（ライン色）' },
    ] },
    { id: 'sec-fork', title: '足まわり', items: [
      { kind: 'swatch', key: 'forkColor', label: 'フロントフォーク' },
      { kind: 'swatch', key: 'caliperColor', label: 'ブレーキキャリパー' },
    ] },
    { id: 'sec-frameColor', title: 'フレーム・スイングアーム', items: [{ kind: 'swatch', key: 'frameColor', label: '' }] },
    { id: 'sec-seatColor', title: 'シート表皮', items: [{ kind: 'swatch', key: 'seatColor', label: '' }] },
  ],
  partMap: {
    wheel: 'sec-wheel', caliper: 'sec-fork', fork: 'sec-fork', frame: 'sec-frameColor', engine: 'sec-cowl', exhaust: 'sec-exhaust',
    seat: 'sec-seat', paint: 'sec-paint', light: 'sec-light', bar: 'sec-bar', mirror: 'sec-mirror', tail: 'sec-tail', screen: 'sec-screen',
  },
  styleName(s) {
    if (s.cowl === 'naked') return 'ストリートファイター';
    if (s.zekken && s.mirror === 'none') return 'サーキット仕様';
    if (s.screen === 'tall' && s.bar === 'bar') return 'スポーツツアラー';
    if (s.cowl === 'half') return 'ハーフカウル スポーツ';
    return 'スーパースポーツ';
  },
  weight(s) {
    let w = 166;
    w += pick({ full: 0, half: -2, naked: -5 }, s.cowl);
    w += pick({ stock: 0, slipon: -3.2, short: -4, centerup: -1 }, s.exhaust);
    w += s.tail === 'fenderless' ? -1.2 : 0;
    w += s.wheel === 'forged' ? -2.5 : 0;
    w += s.mirror === 'none' ? -0.8 : 0;
    w += s.seat === 'single' ? 0.3 : 0;
    return w;
  },
  sheet(s) {
    const lower = Number(s.lower);
    const rows = ['cowl', 'screen', 'light', 'bar', 'mirror', 'exhaust', 'tail', 'seat', 'wheel', 'livery'].map(
      (k): [string, string] => [this.parts[k].label, k === 'screen' && s.cowl === 'naked' ? '—' : optLabel(this, k, s[k])],
    );
    const colors = ['main', 'sub', 'accent', 'frameColor', 'rimColor', 'forkColor', 'caliperColor', 'seatColor'].map(
      (k): [string, string, string | null] => [this.colorLabels[k], colorName(this, k, s[k]), String(s[k])],
    );
    colors.push(['ゼッケン', s.zekken ? `#${s.number}` : 'なし', null]);
    const specs: [string, string][] = [
      ['シート高', `${795 - lower * 2} mm`],
      ['最低地上高', `${148 - lower * 2} mm`],
      ['車両重量', `${this.weight(s).toFixed(1)} kg`],
    ];
    return { rows, colors, specs };
  },
  randomExtra(s, rand) {
    s.rimStripe = rand() < 0.5;
    s.zekken = rand() < 0.3;
    s.number = Math.floor(rand() * 99) + 1;
  },
  draw(s) {
    return drawSupersport(s, this.wheelbase);
  },
};

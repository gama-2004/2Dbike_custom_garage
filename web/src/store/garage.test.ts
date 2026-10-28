import { beforeEach, describe, expect, test } from 'vitest';
import { VEHICLES } from '../catalog';
import { disabledSlots } from '../logic/constraints';
import { useGarage } from './garage';

const st = () => useGarage.getState();

beforeEach(() => {
  useGarage.setState({ base: 'ss', specs: { ss: { ...VEHICLES.ss.defaults }, us: { ...VEHICLES.us.defaults } } });
});

describe('作業状態', () => {
  test('車両を切り替えても、それぞれの仕様を覚えている', () => {
    st().setValue('exhaust', 'slipon');
    st().switchBase('us');
    st().setValue('bar', 'ape');
    st().switchBase('ss');
    expect(st().specs.ss.exhaust).toBe('slipon');
    expect(st().specs.us.bar).toBe('ape');
  });

  test('プリセットは標準仕様に重ねて適用し、ノーマルに戻すで標準仕様になる', () => {
    st().setValue('wheel', 'forged');
    st().applyPreset(3); // スポーツツアラー
    expect(st().specs.ss.wheel).toBe('y5');
    expect(st().specs.ss.screen).toBe('tall');
    st().reset();
    expect(st().specs.ss).toEqual(VEHICLES.ss.defaults);
  });

  test('ゼッケン番号は0〜99に収め、入力するとゼッケンありになる', () => {
    st().setNumber(250);
    expect(st().specs.ss.number).toBe(99);
    expect(st().specs.ss.zekken).toBe(true);
    st().setNumber(Number.NaN);
    expect(st().specs.ss.number).toBe(0);
  });

  test('おまかせ組みは、すべての部位と色を候補の中から選ぶ', () => {
    st().switchBase('us');
    st().randomize(() => 0.999);
    const s = st().specs.us;
    for (const [k, slot] of Object.entries(VEHICLES.us.parts)) expect(s[k]).toBe(slot.options.at(-1)![0]);
    expect(s.lower).toBe(15);
  });

  test('保存仕様を呼び出すと、その車両に切り替わる', () => {
    st().loadBuild('us', { tank: 'peanut' });
    expect(st().base).toBe('us');
    expect(st().specs.us).toEqual({ ...VEHICLES.us.defaults, tank: 'peanut' });
  });
});

describe('組み合わせ制約', () => {
  test('ネイキッド化するとスクリーンは選べない', () => {
    expect(disabledSlots(VEHICLES.ss, { ...VEHICLES.ss.defaults }).size).toBe(0);
    const d = disabledSlots(VEHICLES.ss, { ...VEHICLES.ss.defaults, cowl: 'naked' });
    expect(d.get('screen')).toContain('スクリーン');
  });
});

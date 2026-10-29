import { beforeEach, describe, expect, test } from 'vitest';
import { BUILTIN_VEHICLES as VEHICLES } from '../catalog';
import { disabledSlots } from '../logic/constraints';
import { useGarage } from './garage';

const st = () => useGarage.getState();

beforeEach(() => {
  useGarage.setState({ base: 'V001', specs: { V001: { ...VEHICLES.V001.defaults }, V002: { ...VEHICLES.V002.defaults } } });
});

describe('作業状態', () => {
  test('車両を切り替えても、それぞれの仕様を覚えている', () => {
    st().setValue('exhaust', 'slipon');
    st().switchBase('V002');
    st().setValue('bar', 'ape');
    st().switchBase('V001');
    expect(st().specs.V001.exhaust).toBe('slipon');
    expect(st().specs.V002.bar).toBe('ape');
  });

  test('プリセットは標準仕様に重ねて適用し、ノーマルに戻すで標準仕様になる', () => {
    st().setValue('wheel', 'forged');
    st().applyPreset(3); // スポーツツアラー
    expect(st().specs.V001.wheel).toBe('y5');
    expect(st().specs.V001.screen).toBe('tall');
    st().reset();
    expect(st().specs.V001).toEqual(VEHICLES.V001.defaults);
  });

  test('ゼッケン番号は0〜99に収め、入力するとゼッケンありになる', () => {
    st().setNumber(250);
    expect(st().specs.V001.number).toBe(99);
    expect(st().specs.V001.zekken).toBe(true);
    st().setNumber(Number.NaN);
    expect(st().specs.V001.number).toBe(0);
  });

  test('おまかせ組みは、すべての部位と色を候補の中から選ぶ', () => {
    st().switchBase('V002');
    st().randomize(() => 0.999);
    const s = st().specs.V002;
    for (const [k, slot] of Object.entries(VEHICLES.V002.parts)) expect(s[k]).toBe(slot.options.at(-1)![0]);
    expect(s.lower).toBe(15);
  });

  test('保存仕様を呼び出すと、その車両に切り替わる', () => {
    st().loadBuild('V002', { tank: 'peanut' });
    expect(st().base).toBe('V002');
    expect(st().specs.V002).toEqual({ ...VEHICLES.V002.defaults, tank: 'peanut' });
  });
});

describe('組み合わせ制約', () => {
  test('ネイキッド化するとスクリーンは選べない', () => {
    expect(disabledSlots(VEHICLES.V001, { ...VEHICLES.V001.defaults }).size).toBe(0);
    const d = disabledSlots(VEHICLES.V001, { ...VEHICLES.V001.defaults, cowl: 'naked' });
    expect(d.get('screen')).toContain('スクリーン');
  });
});

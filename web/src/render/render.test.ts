import { expect, test } from 'vitest';
import { VEHICLES, VEHICLE_IDS } from '../catalog';

test.each(VEHICLE_IDS)('%s: すべてのプリセットが描画でき、クリックできる部位が棚に対応している', (id) => {
  const v = VEHICLES[id];
  const sections = new Set(v.shelf.map((s) => s.id));
  for (const p of v.presets) {
    const svg = v.draw({ ...v.defaults, ...p.spec });
    expect(svg).not.toContain('undefined');
    for (const part of svg.matchAll(/data-part="(\w+)"/g)) {
      expect(sections.has(v.partMap[part[1]]), `${part[1]} の移動先`).toBe(true);
    }
  }
});

import { describe, it, expect } from 'vitest';
import { bearing } from './bearing';

describe('bearing', () => {
  it('строго на север → 0°', () => {
    expect(bearing({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(0, 6);
  });

  it('строго на восток (по экватору) → 90°', () => {
    expect(bearing({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(90, 6);
  });

  it('строго на юг → 180°', () => {
    expect(bearing({ lat: 0, lon: 0 }, { lat: -1, lon: 0 })).toBeCloseTo(180, 6);
  });

  it('строго на запад (по экватору) → 270°', () => {
    expect(bearing({ lat: 0, lon: 0 }, { lat: 0, lon: -1 })).toBeCloseTo(270, 6);
  });

  it('всегда возвращает значение в [0, 360)', () => {
    const samples: Array<[number, number, number, number]> = [
      [0, 0, 1, 1],
      [10, 20, -10, -20],
      [55.75, 37.62, 59.93, 30.33],
      [0, 0, -1, -0.001],
    ];
    for (const [lat1, lon1, lat2, lon2] of samples) {
      const b = bearing({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 });
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(360);
    }
  });

  it('Москва → Санкт-Петербург ≈ 318° (СЗ направление)', () => {
    const moscow = { lat: 55.7558, lon: 37.6173 };
    const spb = { lat: 59.9343, lon: 30.3351 };
    const b = bearing(moscow, spb);
    expect(b).toBeGreaterThan(315);
    expect(b).toBeLessThan(322);
  });
});

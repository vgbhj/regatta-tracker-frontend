import { describe, it, expect } from 'vitest';
import { haversineDistance } from './haversine';

describe('haversineDistance', () => {
  it('возвращает 0 для совпадающих точек', () => {
    const p = { lat: 55.75, lon: 37.62 };
    expect(haversineDistance(p, p)).toBe(0);
  });

  it('симметрична: d(a,b) === d(b,a)', () => {
    const a = { lat: 55.7558, lon: 37.6173 };
    const b = { lat: 59.9343, lon: 30.3351 };
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 6);
  });

  it('Москва — Санкт-Петербург ≈ 634 км (±5 км)', () => {
    const moscow = { lat: 55.7558, lon: 37.6173 };
    const spb = { lat: 59.9343, lon: 30.3351 };
    const d = haversineDistance(moscow, spb);
    expect(d).toBeGreaterThan(629_000);
    expect(d).toBeLessThan(639_000);
  });

  it('1° по экватору ≈ 111.195 км', () => {
    const a = { lat: 0, lon: 0 };
    const b = { lat: 0, lon: 1 };
    const d = haversineDistance(a, b);
    expect(d).toBeCloseTo(111_194.927, 0);
  });

  it('1° по меридиану ≈ 111.195 км', () => {
    const a = { lat: 0, lon: 0 };
    const b = { lat: 1, lon: 0 };
    const d = haversineDistance(a, b);
    expect(d).toBeCloseTo(111_194.927, 0);
  });

  it('антиподы: ≈ π·R = половина окружности Земли', () => {
    const a = { lat: 0, lon: 0 };
    const b = { lat: 0, lon: 180 };
    const d = haversineDistance(a, b);
    expect(d).toBeCloseTo(Math.PI * 6_371_000, 0);
  });
});

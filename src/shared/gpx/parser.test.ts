// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import sampleGpx from './__fixtures__/sample.gpx?raw';
import duplicatesGpx from './__fixtures__/sample-duplicates.gpx?raw';
import brokenTimeGpx from './__fixtures__/sample-broken-time.gpx?raw';
import { parseGpx } from './parser';

const iso = (s: string): number => Date.parse(s);

describe('parseGpx — happy path (sample.gpx)', () => {
  // Якорь — время первой точки Yacht Alex в фикстуре.
  const raceStart = iso('2024-06-15T14:34:10.000Z');
  const tracks = parseGpx(sampleGpx, raceStart);

  it('возвращает по треку на каждый <trk>', () => {
    expect(tracks).toHaveLength(3);
  });

  it('сохраняет yachtName из <trk><name>', () => {
    expect(tracks.map((t) => t.yachtName)).toEqual([
      'Yacht Alex',
      'Yacht Richard',
      'Yacht Yury',
    ]);
  });

  it('yachtId не выставляется парсером (маппинг — задача feature-слоя)', () => {
    for (const t of tracks) expect(t.yachtId).toBeUndefined();
  });

  it('tMs первой точки Alex === 0 (raceStart совпал с её временем)', () => {
    expect(tracks[0].points[0].tMs).toBe(0);
  });

  it('точки внутри трека строго монотонны по tMs', () => {
    for (const t of tracks) {
      for (let i = 1; i < t.points.length; i++) {
        expect(t.points[i].tMs).toBeGreaterThan(t.points[i - 1].tMs);
      }
    }
  });

  it('speed и heading заполнены и в реалистичном диапазоне', () => {
    for (const t of tracks) {
      expect(t.points.length).toBeGreaterThan(0);
      for (const p of t.points) {
        expect(typeof p.speed).toBe('number');
        expect(typeof p.heading).toBe('number');
        expect(p.speed!).toBeGreaterThanOrEqual(0);
        expect(p.speed!).toBeLessThanOrEqual(30);
        expect(p.heading!).toBeGreaterThanOrEqual(0);
        expect(p.heading!).toBeLessThan(360);
      }
    }
  });
});

describe('parseGpx — дубли по времени (sample-duplicates.gpx)', () => {
  // Фикстура: 3 точки, у второй <time> совпадает с первой.
  const raceStart = iso('2024-06-15T14:46:21Z');
  const tracks = parseGpx(duplicatesGpx, raceStart);

  it('1 трек', () => {
    expect(tracks).toHaveLength(1);
  });

  it('точка-дубль (lat=40.1) отфильтрована', () => {
    const lats = tracks[0].points.map((p) => p.lat);
    expect(lats).not.toContain(40.1);
  });

  it('первая точка прошла, её tMs === 0', () => {
    expect(tracks[0].points[0].lat).toBe(40.0);
    expect(tracks[0].points[0].tMs).toBe(0);
  });
});

describe('parseGpx — нарушение монотонности времени (sample-broken-time.gpx)', () => {
  // Фикстура: 3 точки, у второй <time> раньше первой.
  const raceStart = iso('2024-06-15T14:46:21Z');
  const tracks = parseGpx(brokenTimeGpx, raceStart);

  it('1 трек', () => {
    expect(tracks).toHaveLength(1);
  });

  it('точка-в-прошлом (lat=40.1) отфильтрована', () => {
    const lats = tracks[0].points.map((p) => p.lat);
    expect(lats).not.toContain(40.1);
  });

  it('первая точка сохранена', () => {
    expect(tracks[0].points[0].lat).toBe(40.0);
    expect(tracks[0].points[0].tMs).toBe(0);
  });
});

describe('parseGpx — точечные edge-кейсы (inline XML)', () => {
  const raceStart = Date.parse('2024-06-15T14:00:00.000Z');

  // Координаты подобраны так, чтобы скорость между принятыми точками
  // оставалась ниже порога 30 м/с — иначе фильтр выбросов «съел» бы
  // точки и тест проверял бы не ту ветку.
  const buildXml = (middle: string) => `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>X</name><trkseg>
    <trkpt lat="40.0" lon="-105.0"><time>2024-06-15T14:00:00Z</time></trkpt>
    ${middle}
    <trkpt lat="40.00005" lon="-105.00005"><time>2024-06-15T14:00:02Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

  it('пропускает trkpt без <time>', () => {
    const xml = buildXml('<trkpt lat="40.00002" lon="-105.00002"></trkpt>');
    const [track] = parseGpx(xml, raceStart);
    expect(track.points).toHaveLength(2);
    expect(track.points.map((p) => p.lat)).toEqual([40.0, 40.00005]);
  });

  it('пропускает trkpt с нечитаемым <time>', () => {
    const xml = buildXml(
      '<trkpt lat="40.00002" lon="-105.00002"><time>not-a-date</time></trkpt>',
    );
    const [track] = parseGpx(xml, raceStart);
    expect(track.points).toHaveLength(2);
    expect(track.points.map((p) => p.lat)).toEqual([40.0, 40.00005]);
  });

  it('бросает Error на полностью невалидном XML', () => {
    const xml = '<gpx><trk><name>X</name></trkkk></gpx>';
    expect(() => parseGpx(xml, raceStart)).toThrow(/malformed/i);
  });
});

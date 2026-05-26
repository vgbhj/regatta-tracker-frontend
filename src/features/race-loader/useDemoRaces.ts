import { useEffect, useRef } from 'react';

import type { Race, Yacht, Track } from '@/shared/types';
import { raceId, yachtId } from '@/shared/types';
import { parseGpx } from '@/shared/gpx-parser';
import type { GpxParseResult } from '@/shared/gpx-parser';
import { useAppDispatch } from '@/shared/lib/redux-hooks';
import { raceUpsertOne } from '@/entities/race';
import { yachtUpsertOne } from '@/entities/yacht';
import { trackUpsertOne } from '@/entities/track';

const YACHT_COLORS = [
  '#F59E0B', '#0EA5E9', '#10B981', '#EC4899',
  '#A855F7', '#EF4444', '#2563EB', '#e63946',
];

interface DemoRace {
  urls: string[];
  name: string;
  id: string;
}

const DEMO_RACES: DemoRace[] = [
  {
    urls: [
      '/data/hamburg-elbe-alex.gpx',
      '/data/hamburg-elbe-richard.gpx',
      '/data/gin-sul-rund-hanskalbsand-2024-yury.gpx',
    ],
    name: 'Hamburg Elbe 2024',
    id: 'demo-hamburg-2024',
  },
  {
    urls: ['/data/hamburg-elbe-track2.gpx', '/data/hamburg-elbe-track3.gpx'],
    name: 'Hamburg Elbe 2023',
    id: 'demo-hamburg-2023',
  },
  { urls: ['/data/ottawa-2016-05-25.gpx'], name: 'Ottawa Sailing 2016-05-25', id: 'demo-ottawa-05-25' },
  { urls: ['/data/ottawa-2016-06-05.gpx'], name: 'Ottawa Sailing 2016-06-05', id: 'demo-ottawa-06-05' },
  { urls: ['/data/ottawa-2016-08-24.gpx'], name: 'Ottawa Sailing 2016-08-24', id: 'demo-ottawa-08-24' },
  { urls: ['/data/2025-09-28_10-31.gpx'], name: 'Гонка 2025-09-28', id: 'demo-2025-09-28' },
  { urls: ['/data/2025-10-04_10-17.gpx'], name: 'Гонка 2025-10-04', id: 'demo-2025-10-04' },
  { urls: ['/data/2025-10-05_10-20.gpx'], name: 'Гонка 2025-10-05', id: 'demo-2025-10-05' },
  { urls: ['/data/2025-10-12_10-46.gpx'], name: 'Гонка 2025-10-12', id: 'demo-2025-10-12' },
];

async function fetchAndParse(url: string): Promise<GpxParseResult | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return parseGpx(await resp.text());
  } catch {
    return null;
  }
}

export function useDemoRaces() {
  const dispatch = useAppDispatch();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    async function loadAll() {
      for (const demo of DEMO_RACES) {
        try {
          const results = await Promise.all(demo.urls.map(fetchAndParse));
          const parsed = results.filter((r): r is GpxParseResult => r !== null);
          if (parsed.length === 0) continue;

          const rId = raceId(demo.id);

          let globalMinTime = Infinity;
          let globalMaxTime = -Infinity;
          for (const p of parsed) {
            if (p.raceStartMs < globalMinTime) globalMinTime = p.raceStartMs;
            const end = p.raceStartMs + p.raceDurationMs;
            if (end > globalMaxTime) globalMaxTime = end;
          }

          const allYachts: Yacht[] = [];
          const allTracks: Track[] = [];
          let yachtIdx = 0;

          for (const p of parsed) {
            const timeOffset = p.raceStartMs - globalMinTime;

            for (const gpxTrack of p.tracks) {
              const yId = yachtId(`${demo.id}-yacht-${yachtIdx}`);
              allYachts.push({
                id: yId,
                name: gpxTrack.name,
                sailNumber: '',
                className: '',
                color: YACHT_COLORS[yachtIdx % YACHT_COLORS.length],
              });
              allTracks.push({
                raceId: rId,
                yachtId: yId,
                points: gpxTrack.points.map((pt) => ({
                  ...pt,
                  tMs: pt.tMs + timeOffset,
                })),
              });
              yachtIdx++;
            }
          }

          const race: Race = {
            id: rId,
            name: demo.name,
            startedAt: globalMinTime,
            durationMs: globalMaxTime - globalMinTime,
            yachts: allYachts.map((y) => y.id),
            marks: [],
          };

          dispatch(raceUpsertOne(race));
          for (const y of allYachts) dispatch(yachtUpsertOne(y));
          for (const t of allTracks) dispatch(trackUpsertOne(t));
        } catch {
          // skip failed demo race silently
        }
      }
    }

    loadAll();
  }, [dispatch]);
}

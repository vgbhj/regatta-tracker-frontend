import { useEffect, useRef } from 'react';

import type { Race, Yacht, Track } from '@/shared/types';
import { raceId, yachtId } from '@/shared/types';
import { parseGpx } from '@/shared/gpx-parser';
import { useAppDispatch } from '@/shared/lib/redux-hooks';
import { raceUpsertOne } from '@/entities/race';
import { yachtUpsertOne } from '@/entities/yacht';
import { trackUpsertOne } from '@/entities/track';

const YACHT_COLORS = [
  '#F59E0B', '#0EA5E9', '#10B981', '#EC4899',
  '#A855F7', '#EF4444', '#2563EB', '#e63946',
];

interface DemoRace {
  url: string;
  name: string;
  id: string;
}

const DEMO_RACES: DemoRace[] = [
  { url: '/data/hamburg-elbe-2024.gpx', name: 'Hamburg Elbe 2024', id: 'demo-hamburg-2024' },
  { url: '/data/hamburg-elbe-2023.gpx', name: 'Hamburg Elbe 2023', id: 'demo-hamburg-2023' },
  { url: '/data/gin-sul-2024.gpx', name: 'Gin Sul Rund Hanskalbsand 2024', id: 'demo-gin-sul' },
  { url: '/data/ottawa-2016-08-24.gpx', name: 'Ottawa Sailing 2016', id: 'demo-ottawa' },
];

export function useDemoRaces() {
  const dispatch = useAppDispatch();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    async function loadAll() {
      for (const demo of DEMO_RACES) {
        try {
          const resp = await fetch(demo.url);
          if (!resp.ok) continue;
          const text = await resp.text();
          const result = parseGpx(text);

          const rId = raceId(demo.id);

          const yachts: Yacht[] = result.tracks.map((t, i) => ({
            id: yachtId(`${demo.id}-yacht-${i}`),
            name: t.name,
            sailNumber: '',
            className: '',
            color: YACHT_COLORS[i % YACHT_COLORS.length],
          }));

          const race: Race = {
            id: rId,
            name: demo.name,
            startedAt: result.raceStartMs,
            durationMs: result.raceDurationMs,
            yachts: yachts.map((y) => y.id),
            marks: [],
          };

          dispatch(raceUpsertOne(race));
          for (const y of yachts) dispatch(yachtUpsertOne(y));

          for (let i = 0; i < result.tracks.length; i++) {
            const track: Track = {
              raceId: rId,
              yachtId: yachts[i].id,
              points: result.tracks[i].points,
            };
            dispatch(trackUpsertOne(track));
          }
        } catch {
          // skip failed demo files silently
        }
      }
    }

    loadAll();
  }, [dispatch]);
}

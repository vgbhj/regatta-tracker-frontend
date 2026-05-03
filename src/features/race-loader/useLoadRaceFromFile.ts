import { useCallback, useState } from 'react';

import type { Race, Yacht, Track } from '@/shared/types';
import { raceId, yachtId } from '@/shared/types';
import { parseGpx } from '@/shared/gpx-parser';
import { useAppDispatch } from '@/shared/lib/redux-hooks';
import { raceUpsertOne } from '@/entities/race';
import { yachtUpsertOne } from '@/entities/yacht';
import { trackUpsertOne } from '@/entities/track';

const YACHT_COLORS = [
  '#e63946', '#457b9d', '#2a9d8f', '#e9c46a',
  '#f4a261', '#264653', '#6a4c93', '#1982c4',
];

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

export function useLoadRaceFromFile() {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(
    async (file: File) => {
      setStatus('loading');
      setError(null);
      try {
        const text = await file.text();
        const result = parseGpx(text);

        const rId = raceId(crypto.randomUUID());

        const yachts: Yacht[] = result.tracks.map((t, i) => ({
          id: yachtId(crypto.randomUUID()),
          name: t.name,
          sailNumber: '',
          className: '',
          color: YACHT_COLORS[i % YACHT_COLORS.length],
        }));

        const race: Race = {
          id: rId,
          name: result.raceName,
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

        setStatus('success');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    },
    [dispatch],
  );

  return { loadFile, status, error } as const;
}

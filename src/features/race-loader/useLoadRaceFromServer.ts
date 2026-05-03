import { useCallback, useState } from 'react';

import type { Yacht, Track } from '@/shared/types';
import { yachtId } from '@/shared/types';
import { parseGpx } from '@/shared/gpx-parser';
import { apiSlice } from '@/shared/api/api-slice';
import { useAppDispatch } from '@/shared/lib/redux-hooks';
import { raceUpsertOne } from '@/entities/race';
import { yachtUpsertOne } from '@/entities/yacht';
import { trackUpsertOne } from '@/entities/track';

import type { LoadStatus } from './useLoadRaceFromFile';

const YACHT_COLORS = [
  '#e63946', '#457b9d', '#2a9d8f', '#e9c46a',
  '#f4a261', '#264653', '#6a4c93', '#1982c4',
];

export function useLoadRaceFromServer() {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadRace = useCallback(
    async (id: string) => {
      setStatus('loading');
      setError(null);
      try {
        const [race, gpxText] = await Promise.all([
          dispatch(apiSlice.endpoints.getRace.initiate(id)).unwrap(),
          dispatch(apiSlice.endpoints.getRaceTrackGpx.initiate(id)).unwrap(),
        ]);

        dispatch(raceUpsertOne(race));

        const parsed = parseGpx(gpxText);

        for (let i = 0; i < parsed.tracks.length; i++) {
          const gpxTrack = parsed.tracks[i];
          const yId =
            i < race.yachts.length
              ? race.yachts[i]
              : yachtId(crypto.randomUUID());

          const yacht: Yacht = {
            id: yId,
            name: gpxTrack.name,
            sailNumber: '',
            className: '',
            color: YACHT_COLORS[i % YACHT_COLORS.length],
          };
          dispatch(yachtUpsertOne(yacht));

          const track: Track = {
            raceId: race.id,
            yachtId: yId,
            points: gpxTrack.points,
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

  return { loadRace, status, error } as const;
}

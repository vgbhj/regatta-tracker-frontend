import { useCallback, useEffect, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '@/shared/lib/redux-hooks';

import { incrementTime, selectIsPlaying, selectPlaybackSpeed } from './playback.slice';

const MAX_DT_MS = 100;

export function usePlaybackClock(): void {
  const dispatch = useAppDispatch();
  const isPlaying = useAppSelector(selectIsPlaying);
  const speed = useAppSelector(selectPlaybackSpeed);

  const prevRef = useRef<number | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const tick = useCallback(
    (now: number) => {
      if (prevRef.current !== null) {
        const rawDt = now - prevRef.current;
        const clampedDt = Math.min(rawDt, MAX_DT_MS);
        dispatch(incrementTime(clampedDt * speedRef.current));
      }
      prevRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    },
    [dispatch],
  );

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      prevRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, tick]);
}

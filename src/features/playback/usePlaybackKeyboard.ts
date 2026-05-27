import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/shared/lib/redux-hooks';

import {
  play,
  pause,
  seek,
  setSpeed,
  selectPlaybackStatus,
  selectCurrentTime,
  selectPlaybackSpeed,
  selectRaceDuration,
} from './playback.slice';

const SEEK_STEP_MS = 5000;
const SPEED_STEP = 1;
const SPEED_MIN = 0;
const SPEED_MAX = 100;

function isInteractiveTarget(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement).tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function usePlaybackKeyboard(): void {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectPlaybackStatus);
  const currentTime = useAppSelector(selectCurrentTime);
  const speed = useAppSelector(selectPlaybackSpeed);
  const duration = useAppSelector(selectRaceDuration);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isInteractiveTarget(e)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (status === 'playing') {
            dispatch(pause());
          } else {
            dispatch(play());
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          dispatch(seek(currentTime - SEEK_STEP_MS));
          break;

        case 'ArrowRight':
          e.preventDefault();
          dispatch(seek(currentTime + SEEK_STEP_MS));
          break;

        case 'ArrowUp':
          e.preventDefault();
          dispatch(setSpeed(Math.min(speed + SPEED_STEP, SPEED_MAX)));
          break;

        case 'ArrowDown':
          e.preventDefault();
          dispatch(setSpeed(Math.max(speed - SPEED_STEP, SPEED_MIN)));
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, status, currentTime, speed, duration]);
}

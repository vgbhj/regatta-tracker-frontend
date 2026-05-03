import { useCallback, useRef } from 'react';
import type { ChangeEvent, PointerEvent } from 'react';

import {
  play,
  pause,
  stop,
  seek,
  setSpeed,
  selectCurrentTime,
  selectPlaybackStatus,
  selectPlaybackSpeed,
  selectRaceDuration,
} from '@/features/playback';
import type { PlaybackSpeed } from '@/features/playback';
import { ru } from '@/shared/i18n/ru';
import { useAppDispatch, useAppSelector } from '@/shared/lib/redux-hooks';

import styles from './Timeline.module.css';

const SPEEDS: PlaybackSpeed[] = [1, 2, 5, 10, 30];

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Timeline() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectPlaybackStatus);
  const currentTime = useAppSelector(selectCurrentTime);
  const speed = useAppSelector(selectPlaybackSpeed);
  const duration = useAppSelector(selectRaceDuration);

  const scrubberRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const progress = duration > 0 ? currentTime / duration : 0;

  const seekToPointer = useCallback(
    (clientX: number) => {
      const el = scrubberRef.current;
      if (!el || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      dispatch(seek(ratio * duration));
    },
    [dispatch, duration],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      draggingRef.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      seekToPointer(e.clientX);
    },
    [seekToPointer],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!draggingRef.current) return;
      seekToPointer(e.clientX);
    },
    [seekToPointer],
  );

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const onSpeedChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      dispatch(setSpeed(Number(e.target.value) as PlaybackSpeed));
    },
    [dispatch],
  );

  const t = ru.timeline;

  return (
    <div className={styles.timeline}>
      {status === 'playing' ? (
        <button
          className={`${styles.btn} ${styles.btnPlay}`}
          onClick={() => dispatch(pause())}
          title={t.pause}
          aria-label={t.pause}
        >
          ⏸
        </button>
      ) : (
        <button
          className={`${styles.btn} ${styles.btnPlay}`}
          onClick={() => dispatch(play())}
          title={t.play}
          aria-label={t.play}
        >
          ▶
        </button>
      )}

      <button
        className={styles.btn}
        onClick={() => dispatch(stop())}
        title={t.restart}
        aria-label={t.restart}
      >
        ⏹
      </button>

      <div
        ref={scrubberRef}
        className={styles.scrubber}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.round(currentTime)}
        aria-label="Timeline"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className={styles.trackBar}>
          <div
            className={styles.filled}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div
          className={styles.thumb}
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      <span className={styles.time}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <select
        className={styles.speed}
        value={speed}
        onChange={onSpeedChange}
        title={t.speed}
        aria-label={t.speed}
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            ×{s}
          </option>
        ))}
      </select>
    </div>
  );
}

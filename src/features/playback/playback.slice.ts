import { createSelector, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '@/app/store';

export type PlaybackStatus = 'idle' | 'playing' | 'paused';
export type PlaybackSpeed = 1 | 2 | 5 | 10 | 30;

interface PlaybackState {
  status: PlaybackStatus;
  currentTimeMs: number;
  speed: PlaybackSpeed;
  raceDurationMs: number;
}

const initialState: PlaybackState = {
  status: 'idle',
  currentTimeMs: 0,
  speed: 1,
  raceDurationMs: 0,
};

const playbackSlice = createSlice({
  name: 'playback',
  initialState,
  reducers: {
    play(state) {
      if (state.raceDurationMs > 0) {
        state.status = 'playing';
      }
    },
    pause(state) {
      state.status = 'paused';
    },
    stop(state) {
      state.status = 'idle';
      state.currentTimeMs = 0;
    },
    setSpeed(state, action: PayloadAction<PlaybackSpeed>) {
      state.speed = action.payload;
    },
    seek(state, action: PayloadAction<number>) {
      state.currentTimeMs = Math.max(
        0,
        Math.min(action.payload, state.raceDurationMs),
      );
    },
    incrementTime(state, action: PayloadAction<number>) {
      state.currentTimeMs += action.payload;
      if (state.currentTimeMs >= state.raceDurationMs) {
        state.currentTimeMs = state.raceDurationMs;
        state.status = 'paused';
      }
    },
    initPlayback(state, action: PayloadAction<number>) {
      state.raceDurationMs = action.payload;
      state.currentTimeMs = 0;
      state.status = 'idle';
    },
  },
});

export const { play, pause, stop, setSpeed, seek, incrementTime, initPlayback } =
  playbackSlice.actions;
export const playbackReducer = playbackSlice.reducer;

const selectPlayback = (state: RootState) => state.playback;

export const selectCurrentTime = createSelector(
  selectPlayback,
  (pb) => pb.currentTimeMs,
);

export const selectIsPlaying = createSelector(
  selectPlayback,
  (pb) => pb.status === 'playing',
);

export const selectProgress01 = createSelector(
  selectPlayback,
  (pb) => (pb.raceDurationMs > 0 ? pb.currentTimeMs / pb.raceDurationMs : 0),
);

export const selectPlaybackStatus = createSelector(
  selectPlayback,
  (pb) => pb.status,
);

export const selectPlaybackSpeed = createSelector(
  selectPlayback,
  (pb) => pb.speed,
);

export const selectRaceDuration = createSelector(
  selectPlayback,
  (pb) => pb.raceDurationMs,
);

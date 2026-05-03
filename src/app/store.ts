import { configureStore } from '@reduxjs/toolkit';

import { raceReducer } from '@/entities/race';
import { yachtReducer } from '@/entities/yacht';
import { trackReducer } from '@/entities/track';
import { markReducer } from '@/entities/mark';
import { playbackReducer, precomputedTracksReducer } from '@/features/playback';
import { apiSlice } from '@/shared/api/api-slice';

export const store = configureStore({
  reducer: {
    race: raceReducer,
    yacht: yachtReducer,
    track: trackReducer,
    mark: markReducer,
    playback: playbackReducer,
    precomputedTracks: precomputedTracksReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

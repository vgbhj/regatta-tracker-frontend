import { configureStore } from '@reduxjs/toolkit';

import { raceReducer } from '@/entities/race';
import { yachtReducer } from '@/entities/yacht';
import { trackReducer } from '@/entities/track';
import { markReducer } from '@/entities/mark';
import { apiSlice } from '@/shared/api/api-slice';

export const store = configureStore({
  reducer: {
    race: raceReducer,
    yacht: yachtReducer,
    track: trackReducer,
    mark: markReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

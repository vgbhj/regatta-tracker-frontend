import { configureStore } from '@reduxjs/toolkit';

import { raceReducer } from '@/entities/race';
import { yachtReducer } from '@/entities/yacht';
import { trackReducer } from '@/entities/track';
import { markReducer } from '@/entities/mark';

export const store = configureStore({
  reducer: {
    race: raceReducer,
    yacht: yachtReducer,
    track: trackReducer,
    mark: markReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import type { Race, RaceId } from '@/shared/types';

const raceAdapter = createEntityAdapter<Race, RaceId>({
  selectId: (race) => race.id,
});

const raceSlice = createSlice({
  name: 'race',
  initialState: raceAdapter.getInitialState(),
  reducers: {
    raceUpsertOne: raceAdapter.upsertOne,
    raceSetAll: raceAdapter.setAll,
    raceRemoveAll: raceAdapter.removeAll,
  },
});

export const { raceUpsertOne, raceSetAll, raceRemoveAll } = raceSlice.actions;
export const raceReducer = raceSlice.reducer;
export const raceSelectors = raceAdapter.getSelectors();

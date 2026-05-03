import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import type { Yacht, YachtId } from '@/shared/types';

const yachtAdapter = createEntityAdapter<Yacht, YachtId>({
  selectId: (yacht) => yacht.id,
});

const yachtSlice = createSlice({
  name: 'yacht',
  initialState: yachtAdapter.getInitialState(),
  reducers: {
    yachtUpsertOne: yachtAdapter.upsertOne,
    yachtSetAll: yachtAdapter.setAll,
    yachtRemoveAll: yachtAdapter.removeAll,
  },
});

export const { yachtUpsertOne, yachtSetAll, yachtRemoveAll } = yachtSlice.actions;
export const yachtReducer = yachtSlice.reducer;
export const yachtSelectors = yachtAdapter.getSelectors();

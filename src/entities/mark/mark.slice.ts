import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import type { Mark } from '@/shared/types';

const markAdapter = createEntityAdapter<Mark, string>({
  selectId: (mark) => mark.id,
});

const markSlice = createSlice({
  name: 'mark',
  initialState: markAdapter.getInitialState(),
  reducers: {
    markUpsertOne: markAdapter.upsertOne,
    markSetAll: markAdapter.setAll,
    markRemoveAll: markAdapter.removeAll,
  },
});

export const { markUpsertOne, markSetAll, markRemoveAll } = markSlice.actions;
export const markReducer = markSlice.reducer;
export const markSelectors = markAdapter.getSelectors();

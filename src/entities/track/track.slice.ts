import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import type { Track } from '@/shared/types';

export const trackEntityId = (track: Pick<Track, 'raceId' | 'yachtId'>): string =>
  `${track.raceId}:${track.yachtId}`;

const trackAdapter = createEntityAdapter<Track, string>({
  selectId: trackEntityId,
});

const trackSlice = createSlice({
  name: 'track',
  initialState: trackAdapter.getInitialState(),
  reducers: {
    trackUpsertOne: trackAdapter.upsertOne,
    trackSetAll: trackAdapter.setAll,
    trackRemoveAll: trackAdapter.removeAll,
  },
});

export const { trackUpsertOne, trackSetAll, trackRemoveAll } = trackSlice.actions;
export const trackReducer = trackSlice.reducer;
export const trackSelectors = trackAdapter.getSelectors();

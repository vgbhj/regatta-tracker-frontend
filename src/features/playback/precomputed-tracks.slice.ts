import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '@/app/store';
import type { TrackPoint } from '@/shared/types';

interface PrecomputedTracksState {
  byYachtId: Record<string, TrackPoint[]>;
}

const initialState: PrecomputedTracksState = {
  byYachtId: {},
};

const precomputedTracksSlice = createSlice({
  name: 'precomputedTracks',
  initialState,
  reducers: {
    setPrecomputedTrack(
      state,
      action: PayloadAction<{ yachtId: string; points: TrackPoint[] }>,
    ) {
      state.byYachtId[action.payload.yachtId] = action.payload.points;
    },
    clearPrecomputedTracks(state) {
      state.byYachtId = {};
    },
  },
});

export const { setPrecomputedTrack, clearPrecomputedTracks } =
  precomputedTracksSlice.actions;
export const precomputedTracksReducer = precomputedTracksSlice.reducer;

export const selectAllPrecomputedTracks = (state: RootState) =>
  state.precomputedTracks.byYachtId;

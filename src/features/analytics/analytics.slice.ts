import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { parseAnalyticsResponse } from './parse-analytics';
import type { AnalyticsData } from './types';

const ANALYTICS_URL =
  import.meta.env.VITE_ANALYTICS_URL ?? 'http://localhost:8080';

interface FetchAnalyticsArg {
  yachtId: string;
  gpxText: string;
}

export const fetchYachtAnalytics = createAsyncThunk(
  'analytics/fetchYacht',
  async ({ yachtId, gpxText }: FetchAnalyticsArg) => {
    const response = await fetch(`${ANALYTICS_URL}/analyze`, {
      method: 'POST',
      body: gpxText,
      headers: { 'Content-Type': 'application/octet-stream' },
    });

    if (!response.ok) {
      throw new Error(`Analytics service error: ${response.status}`);
    }

    const json = await response.json();
    return { yachtId, gpxText, data: parseAnalyticsResponse(json) };
  },
);

interface AnalyticsState {
  byYachtId: Record<string, AnalyticsData>;
  gpxByYachtId: Record<string, string>;
  selectedYachtId: string | null;
  selectedManeuverId: number | null;
  pending: number;
  error: string | null;
}

const initialState: AnalyticsState = {
  byYachtId: {},
  gpxByYachtId: {},
  selectedYachtId: null,
  selectedManeuverId: null,
  pending: 0,
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearAnalytics: () => initialState,
    selectYacht(state, action: PayloadAction<string>) {
      state.selectedYachtId = action.payload;
      state.selectedManeuverId = null;
    },
    selectManeuver(state, action: PayloadAction<number | null>) {
      state.selectedManeuverId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchYachtAnalytics.pending, (state) => {
        state.pending += 1;
        state.error = null;
      })
      .addCase(fetchYachtAnalytics.fulfilled, (state, action) => {
        state.pending -= 1;
        const { yachtId, gpxText, data } = action.payload;
        state.byYachtId[yachtId] = data;
        state.gpxByYachtId[yachtId] = gpxText;
        if (!state.selectedYachtId) {
          state.selectedYachtId = yachtId;
        }
      })
      .addCase(fetchYachtAnalytics.rejected, (state, action) => {
        state.pending -= 1;
        state.error = action.error.message ?? 'Unknown error';
      });
  },
});

export const { clearAnalytics, selectYacht, selectManeuver } = analyticsSlice.actions;
export const analyticsReducer = analyticsSlice.reducer;

export const selectAnalyticsByYacht = (state: { analytics: AnalyticsState }) =>
  state.analytics.byYachtId;
export const selectSelectedYachtId = (state: { analytics: AnalyticsState }) =>
  state.analytics.selectedYachtId;
export const selectAnalyticsPending = (state: { analytics: AnalyticsState }) =>
  state.analytics.pending > 0;
export const selectAnalyticsError = (state: { analytics: AnalyticsState }) =>
  state.analytics.error;
export const selectSelectedManeuverId = (state: { analytics: AnalyticsState }) =>
  state.analytics.selectedManeuverId;
export const selectGpxByYachtId = (state: { analytics: AnalyticsState }) =>
  state.analytics.gpxByYachtId;

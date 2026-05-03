import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '@/app/store';

export type ViewMode = '2d' | '3d' | 'split';

interface ViewSwitcherState {
  view: ViewMode;
}

const initialState: ViewSwitcherState = {
  view: 'split',
};

const viewSwitcherSlice = createSlice({
  name: 'viewSwitcher',
  initialState,
  reducers: {
    setView(state, action: PayloadAction<ViewMode>) {
      state.view = action.payload;
    },
  },
});

export const { setView } = viewSwitcherSlice.actions;
export const viewSwitcherReducer = viewSwitcherSlice.reducer;
export const selectView = (state: RootState) => state.viewSwitcher.view;

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '@/app/store';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'regatta-theme';

function loadTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
}

interface ThemeSwitcherState {
  theme: Theme;
}

const initialState: ThemeSwitcherState = {
  theme: loadTheme(),
};

const themeSwitcherSlice = createSlice({
  name: 'themeSwitcher',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
      localStorage.setItem(STORAGE_KEY, action.payload);
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, state.theme);
    },
  },
});

export const { setTheme, toggleTheme } = themeSwitcherSlice.actions;
export const themeSwitcherReducer = themeSwitcherSlice.reducer;
export const selectTheme = (state: RootState) => state.themeSwitcher.theme;

import { create } from 'zustand';

interface UiState {
  splitRatio: number;
  setSplitRatio: (ratio: number) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  cheatsheetOpen: boolean;
  setCheatsheetOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  splitRatio: 0.5,
  setSplitRatio: (ratio: number) => set({ splitRatio: Math.max(0.2, Math.min(0.8, ratio)) }),
  searchOpen: false,
  setSearchOpen: (open: boolean) => set({ searchOpen: open }),
  cheatsheetOpen: false,
  setCheatsheetOpen: (open: boolean) => set({ cheatsheetOpen: open }),
}));

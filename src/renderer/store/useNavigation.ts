import { create } from 'zustand';

export type Page = 'home' | 'test' | 'settings' | 'about';

interface NavigationState {
  currentPage: Page;
  isSidebarCollapsed: boolean;
  isTestActive: boolean;
  setPage: (page: Page) => void;
  toggleSidebar: () => void;
  startTest: () => void;
  endTest: () => void;
}

export const useNavigation = create<NavigationState>((set) => ({
  currentPage: 'home',
  isSidebarCollapsed: false,
  isTestActive: false,
  setPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({
    isSidebarCollapsed: !state.isSidebarCollapsed
  })),
  startTest: () => set({ isTestActive: true, isSidebarCollapsed: true }),
  endTest: () => set({ isTestActive: false, isSidebarCollapsed: false }),
}));

import { create } from 'zustand';

export type Page = 'home' | 'test' | 'settings' | 'about' | 'data-management';
export type PublicPage = 'home' | 'about' | 'test' | null;

interface NavigationState {
  currentPage: Page;
  isSidebarCollapsed: boolean;
  isTestActive: boolean;
  lastVisitedPublicPage: PublicPage;
  setPage: (page: Page) => void;
  setLastVisitedPublicPage: (page: PublicPage) => void;
  toggleSidebar: () => void;
  startTest: () => void;
  endTest: () => void;
}

export const useNavigation = create<NavigationState>((set) => ({
  currentPage: 'home',
  isSidebarCollapsed: false,
  isTestActive: false,
  lastVisitedPublicPage: null,
  setPage: (page) => {
    set({ currentPage: page });
    const publicPages: PublicPage[] = ['home', 'about', 'test'];
    if (publicPages.includes(page as PublicPage)) {
      set({ lastVisitedPublicPage: page as PublicPage });
    }
  },
  setLastVisitedPublicPage: (page) => {
    set({ lastVisitedPublicPage: page });
  },
  toggleSidebar: () =>
    set((state) => ({
      isSidebarCollapsed: !state.isSidebarCollapsed,
    })),
  startTest: () => {
    set({ isTestActive: true, isSidebarCollapsed: true });
  },
  endTest: () => {
    set({ isTestActive: false, isSidebarCollapsed: false });
  },
}));

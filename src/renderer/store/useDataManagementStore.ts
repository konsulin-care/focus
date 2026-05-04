import { create } from 'zustand';
import type { Session } from '@/renderer/pages/DataManagement';
import type { TrialData } from '@/renderer/types/electronAPI';

interface DataManagementState {
  sessions: Session[];
  loading: boolean;
  globalFilter: string;
  statusFilter: Set<string>;
  expandedRows: Record<number, boolean>;
  selectedIds: Set<number>;
  sortCol: keyof Session;
  sortDir: 'asc' | 'desc';
  page: number;
  pageSize: number;
  sessionTrials: Record<number, TrialData[]>;
  isFilterOpen: boolean;
  isExtractOpen: boolean;

  setSessions: (sessions: Session[] | ((prev: Session[]) => Session[])) => void;
  setLoading: (loading: boolean) => void;
  setGlobalFilter: (filter: string) => void;
  toggleStatusFilter: (status: string) => void;
  setExpandedRow: (id: number, expanded: boolean) => void;
  setSelectedIds: (ids: Set<number>) => void;
  setSortCol: (col: keyof Session) => void;
  setSortDir: (dir: 'asc' | 'desc') => void;
  setPage: (page: number | ((prev: number) => number)) => void;
  setPageSize: (size: number) => void;
  setSessionTrials: (
    sessionTrials:
      | Record<number, TrialData[]>
      | ((prev: Record<number, TrialData[]>) => Record<number, TrialData[]>)
  ) => void;
  setIsFilterOpen: (open: boolean) => void;
  setIsExtractOpen: (open: boolean) => void;
}

export const useDataManagementStore = create<DataManagementState>((set) => ({
  sessions: [],
  loading: true,
  globalFilter: '',
  statusFilter: new Set(['pending', 'uploaded', 'failed']),
  expandedRows: {},
  selectedIds: new Set(),
  sortCol: 'test_date',
  sortDir: 'desc',
  page: 0,
  pageSize: 25,
  sessionTrials: {},
  isFilterOpen: false,
  isExtractOpen: false,

  setSessions: (sessions) =>
    set((state) => ({
      sessions:
        typeof sessions === 'function'
          ? (sessions as (prev: Session[]) => Session[])(state.sessions)
          : sessions,
    })),
  setLoading: (loading) => set({ loading }),
  setGlobalFilter: (globalFilter) => set({ globalFilter }),
  toggleStatusFilter: (status) =>
    set((state) => {
      const next = new Set(state.statusFilter);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return { statusFilter: next, page: 0 };
    }),
  setExpandedRow: (id, expanded) =>
    set((state) => ({
      expandedRows: { ...state.expandedRows, [id]: expanded },
    })),
  setSelectedIds: (selectedIds) => set({ selectedIds: new Set(selectedIds) }),
  setSortCol: (sortCol) => set({ sortCol }),
  setSortDir: (sortDir) => set({ sortDir }),
  setPage: (page) =>
    set((state) => ({
      page: typeof page === 'function' ? (page as (prev: number) => number)(state.page) : page,
    })),
  setPageSize: (pageSize) => set({ pageSize, page: 0 }),
  setSessionTrials: (sessionTrials) =>
    set((state) => ({
      sessionTrials:
        typeof sessionTrials === 'function'
          ? (sessionTrials as (prev: Record<number, TrialData[]>) => Record<number, TrialData[]>)(
              state.sessionTrials
            )
          : sessionTrials,
    })),
  setIsFilterOpen: (isFilterOpen) => set({ isFilterOpen }),
  setIsExtractOpen: (isExtractOpen) => set({ isExtractOpen }),
}));

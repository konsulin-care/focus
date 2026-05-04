import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from '@/i18n';
import { useDataManagementStore } from '@/renderer/store';
import {
  Download,
  Trash2,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
} from 'lucide-react';
import type { TrialData } from '@/renderer/types/electronAPI';

export interface Session {
  id: number;
  email: string;
  age: number;
  gender: 'Male' | 'Female';
  is_generic: number;
  acs_score: number;
  acs_interpretation: string;
  mean_response_time_ms: number;
  response_time_variability: number;
  commission_errors: number;
  omission_errors: number;
  hits: number;
  d_prime: number;
  test_date: string;
  upload_status: 'pending' | 'uploaded' | 'failed';
}

/** Empty state shown when no session records exist. */
const EmptyState: React.FC<{ t: (key: string) => string }> = ({ t }) => (
  <div className="text-center py-12 text-gray-500">{t('dataManagement.empty.noRecords')}</div>
);

/**
 * SessionMetricsGrid displays the high-level metrics for a session in a responsive grid.
 */
const SessionMetricsGrid: React.FC<{ session: Session; t: (key: string) => string }> = ({
  session,
  t,
}) => (
  <div className="grid grid-cols-4 gap-4 mb-4">
    <div className="p-3 bg-white border rounded-lg shadow-sm">
      <div className="text-xs text-gray-500">{t('dataManagement.metrics.hits')}</div>
      <div className="text-lg font-bold">{session.hits || 0}</div>
    </div>
    <div className="p-3 bg-white border rounded-lg shadow-sm">
      <div className="text-xs text-gray-500">{t('dataManagement.metrics.commissions')}</div>
      <div className="text-lg font-bold">{session.commission_errors || 0}</div>
    </div>
    <div className="p-3 bg-white border rounded-lg shadow-sm">
      <div className="text-xs text-gray-500">{t('dataManagement.metrics.omissions')}</div>
      <div className="text-lg font-bold">{session.omission_errors || 0}</div>
    </div>
    <div className="p-3 bg-white border rounded-lg shadow-sm">
      <div className="text-xs text-gray-500">{t('dataManagement.metrics.dPrime')}</div>
      <div className="text-lg font-bold">{(session.d_prime || 0).toFixed(2)}</div>
    </div>
  </div>
);

/**
 * SessionTrialsTable displays a preview of the first 10 trials for a session.
 */
const SessionTrialsTable: React.FC<{ trials: TrialData[]; t: (key: string) => string }> = ({
  trials,
  t,
}) => (
  <div className="bg-white border rounded-lg overflow-hidden">
    <table className="w-full text-left text-xs">
      <thead className="bg-gray-100 border-b">
        <tr>
          <th className="px-3 py-2">{t('dataManagement.trials.trial')}</th>
          <th className="px-3 py-2">{t('dataManagement.trials.type')}</th>
          <th className="px-3 py-2">{t('dataManagement.trials.outcome')}</th>
          <th className="px-3 py-2">{t('dataManagement.trials.correct')}</th>
          <th className="px-3 py-2">{t('dataManagement.trials.rt')}</th>
          <th className="px-3 py-2" title={t('dataManagement.trials.anticipatory')}>
            {t('dataManagement.trials.anticipatory')}
          </th>
          <th className="px-3 py-2" title={t('dataManagement.trials.multiple')}>
            {t('dataManagement.trials.multiple')}
          </th>
          <th className="px-3 py-2" title={t('dataManagement.trials.followsCommission')}>
            {t('dataManagement.trials.followsCommission')}
          </th>
        </tr>
      </thead>
      <tbody>
        {trials.slice(0, 10).map((trial) => (
          <tr key={trial.trial_index} className="border-b hover:bg-gray-50">
            <td className="px-3 py-2">{trial.trial_index}</td>
            <td className="px-3 py-2">{trial.stimulus_type}</td>
            <td className="px-3 py-2">{trial.outcome ?? '-'}</td>
            <td className="px-3 py-2">
              {trial.response_correct === null ? '-' : trial.response_correct ? '✓' : '✗'}
            </td>
            <td className="px-3 py-2">{trial.response_time_ms ?? '-'}</td>
            <td className="px-3 py-2 text-center">{trial.is_anticipatory ? '✓' : ''}</td>
            <td className="px-3 py-2 text-center">{trial.is_multiple_response ? '✓' : ''}</td>
            <td className="px-3 py-2 text-center">{trial.follows_commission ? '✓' : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

interface SessionDetailsProps {
  session: Session;
  trials: TrialData[] | undefined;
  onExtract: (sessionId: number) => void;
  t: (key: string) => string;
}

/**
 * Collapsible expanded row showing session metrics and trial preview.
 */
const SessionDetails: React.FC<SessionDetailsProps> = ({ session, trials, onExtract, t }) => {
  if (trials === undefined) {
    return (
      <tr>
        <td colSpan={6} className="p-4 bg-gray-50">
          <div className="text-center text-gray-400">{t('dataManagement.trials.loading')}</div>
        </td>
      </tr>
    );
  }

  if (trials.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="p-4 bg-gray-50">
          <div className="text-center text-gray-400">{t('dataManagement.trials.empty')}</div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={6} className="p-4 bg-gray-50">
        <SessionMetricsGrid session={session} t={t} />
        <SessionTrialsTable trials={trials} t={t} />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              onExtract(session.id);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 text-sm font-medium"
          >
            <Download size={14} />
            {t('dataManagement.trials.extractAll')}
          </button>
        </div>
      </td>
    </tr>
  );
};

interface ToolbarProps {
  t: (key: string) => string;
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  setPage: (val: number) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (val: boolean) => void;
  statusFilter: Set<string>;
  toggleStatusFilter: (status: string) => void;
  filterRef: React.RefObject<HTMLDivElement | null>;
  isExtractOpen: boolean;
  setIsExtractOpen: (val: boolean) => void;
  extractRef: React.RefObject<HTMLDivElement | null>;
  selectedIds: Set<number>;
  handleExport: (mode: 'summary-csv' | 'summary-json' | 'full-csv' | 'full-json') => Promise<void>;
  handleBulkDelete: () => Promise<void>;
}

const DataManagementToolbar: React.FC<ToolbarProps> = ({
  t,
  globalFilter,
  setGlobalFilter,
  setPage,
  isFilterOpen,
  setIsFilterOpen,
  statusFilter,
  toggleStatusFilter,
  filterRef,
  isExtractOpen,
  setIsExtractOpen,
  extractRef,
  selectedIds,
  handleExport,
  handleBulkDelete,
}) => (
  <div className="flex gap-2 items-center">
    {/* Search */}
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="text"
        placeholder={t('dataManagement.searchPlaceholder')}
        className="pl-10 pr-4 py-2 border border-[#ECEFF4] rounded-md"
        value={globalFilter}
        onChange={(e) => {
          setGlobalFilter(e.target.value);
          setPage(0);
        }}
      />
    </div>

    {/* Filter dropdown */}
    <div className="relative" ref={filterRef}>
      <button
        type="button"
        onClick={() => {
          setIsFilterOpen(!isFilterOpen);
        }}
        className="p-2 bg-white border border-[#ECEFF4] rounded-md hover:bg-gray-50"
        title="Filter"
      >
        <Filter size={18} />
      </button>

      {isFilterOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10 p-3">
          <div className="space-y-2">
            {['pending', 'uploaded', 'failed'].map((status) => (
              <label
                key={status}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={statusFilter.has(status)}
                  onChange={() => {
                    toggleStatusFilter(status);
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">
                  {t(`dataManagement.filter${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Extract dropdown */}
    <div className="relative" ref={extractRef}>
      <button
        type="button"
        onClick={() => {
          setIsExtractOpen(!isExtractOpen);
        }}
        disabled={selectedIds.size === 0}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-[#ECEFF4] rounded-md hover:bg-gray-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download size={16} />
        Extract
        <ChevronDown
          size={16}
          className={`transition-transform ${isExtractOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isExtractOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
          <div className="py-1">
            {(
              [
                { id: 'summary-csv', label: 'Summary (CSV)' },
                { id: 'summary-json', label: 'Summary (JSON)' },
                { id: 'full-csv', label: 'Full Data (CSV)' },
                { id: 'full-json', label: 'Full Data (JSON)' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  handleExport(mode.id);
                  setIsExtractOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Bulk delete */}
    <button
      type="button"
      onClick={() => handleBulkDelete()}
      disabled={selectedIds.size === 0}
      className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
      title={t('dataManagement.bulkDelete')}
    >
      <Trash2 size={18} />
    </button>
  </div>
);

interface SessionRowProps {
  session: Session;
  isSelected: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
  onChangeSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  getGenderColor: (gender: string, isGeneric: number) => string;
  getAcsColor: (score: number, interpretation: string) => string;
  t: (key: string) => string;
  handleStatusChange: (sessionId: number, e: React.ChangeEvent<HTMLSelectElement>) => Promise<void>;
}

const SessionRow: React.FC<SessionRowProps> = ({
  session,
  isSelected,
  onToggleSelect,
  onChangeSelect,
  onClick,
  onKeyDown,
  getGenderColor,
  getAcsColor,
  t,
  handleStatusChange,
}) => (
  <tr
    className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
    onClick={onClick}
    onKeyDown={onKeyDown}
    tabIndex={0}
  >
    <td className="px-4 py-3">
      <input
        type="checkbox"
        checked={isSelected}
        onClick={onToggleSelect}
        onChange={onChangeSelect}
      />
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${getGenderColor(session.gender, session.is_generic)}`}
          title={
            session.is_generic
              ? `${session.gender} (${t('dataManagement.genericDemo')})`
              : session.gender
          }
        />
        <span className="truncate max-w-xs" title={session.email}>
          {session.email}
        </span>
      </div>
    </td>
    <td className="px-4 py-3">{session.age}</td>
    <td
      className={`px-4 py-3 font-semibold ${getAcsColor(session.acs_score, session.acs_interpretation)}`}
    >
      {session.acs_score.toFixed(2)}
    </td>
    <td className="px-4 py-3">{new Date(session.test_date).toLocaleDateString()}</td>
    <td
      className="px-4 py-3"
      onClick={(e) => {
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
        }
      }}
      tabIndex={-1}
    >
      <select
        value={session.upload_status}
        onChange={(e) => handleStatusChange(session.id, e)}
        className={`px-2 py-1 rounded text-xs border ${
          session.upload_status === 'uploaded'
            ? 'bg-green-100 text-green-800 border-green-200'
            : session.upload_status === 'failed'
              ? 'bg-red-100 text-red-800 border-red-200'
              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
        }`}
      >
        <option value="pending">{t('dataManagement.status.pending')}</option>
        <option value="uploaded">{t('dataManagement.status.uploaded')}</option>
        <option value="failed">{t('dataManagement.status.failed')}</option>
      </select>
    </td>
  </tr>
);

interface SessionTableProps {
  paginated: Session[];
  selectedIds: Set<number>;
  setSelectedIds: (ids: Set<number>) => void;
  t: (key: string) => string;
  handleSort: (col: keyof Session) => void;
  sortCol: keyof Session;
  sortDir: 'asc' | 'desc';
  toggleRow: (id: number) => void;
  expandedRows: Record<number, boolean>;
  sessionTrials: Record<number, TrialData[]>;
  handleExtractTrials: (sessionId: number) => void;
  getGenderColor: (gender: string, isGeneric: number) => string;
  getAcsColor: (score: number, interpretation: string) => string;
  handleStatusChange: (sessionId: number, e: React.ChangeEvent<HTMLSelectElement>) => Promise<void>;
}

const SessionTable: React.FC<SessionTableProps> = ({
  paginated,
  selectedIds,
  setSelectedIds,
  t,
  handleSort,
  sortCol,
  sortDir,
  toggleRow,
  expandedRows,
  sessionTrials,
  handleExtractTrials,
  getGenderColor,
  getAcsColor,
  handleStatusChange,
}) => (
  <div className="bg-white border border-[#ECEFF4] rounded-lg overflow-hidden shadow-sm">
    <table className="w-full text-left border-collapse">
      <thead className="bg-gray-50 border-b">
        <tr>
          <th className="px-4 py-3 w-12">
            <input
              type="checkbox"
              onChange={(e) => {
                if (e.target.checked) setSelectedIds(new Set(paginated.map((s) => s.id)));
                else setSelectedIds(new Set());
              }}
              checked={paginated.length > 0 && paginated.every((s) => selectedIds.has(s.id))}
            />
          </th>
          {(
            [
              { key: 'email', label: t('dataManagement.table.email') },
              { key: 'age', label: t('dataManagement.table.age') },
              { key: 'acs_score', label: t('dataManagement.table.acs') },
              { key: 'test_date', label: t('dataManagement.table.date') },
              { key: 'upload_status', label: t('dataManagement.table.status') },
            ] as const
          ).map((col) => (
            <th
              key={col.key}
              className="px-4 py-3 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort(col.key as keyof Session)}
            >
              <div className="flex items-center gap-2">
                {col.label}
                {sortCol === col.key &&
                  (sortDir === 'asc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />)}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {paginated.map((session) => (
          <React.Fragment key={session.id}>
            <SessionRow
              session={session}
              isSelected={selectedIds.has(session.id)}
              onToggleSelect={(e) => e.stopPropagation()}
              onChangeSelect={(e) => {
                const next = new Set(selectedIds);
                if (e.target.checked) next.add(session.id);
                else next.delete(session.id);
                setSelectedIds(next);
              }}
              onClick={() => toggleRow(session.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleRow(session.id);
                }
              }}
              getGenderColor={getGenderColor}
              getAcsColor={getAcsColor}
              t={t}
              handleStatusChange={handleStatusChange}
            />
            {expandedRows[session.id] && (
              <SessionDetails
                session={session}
                trials={sessionTrials[session.id]}
                onExtract={handleExtractTrials}
                t={t}
              />
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * Data management page: view, filter, export, and delete test sessions.
 */
export default function DataManagement() {
  const { t } = useTranslation();
  const {
    sessions,
    setSessions,
    loading,
    setLoading,
    globalFilter,
    setGlobalFilter,
    statusFilter,
    toggleStatusFilter,
    expandedRows,
    setExpandedRow,
    selectedIds,
    setSelectedIds,
    sortCol,
    setSortCol,
    sortDir,
    setSortDir,
    page,
    setPage,
    pageSize,
    setPageSize,
    sessionTrials,
    setSessionTrials,
    isFilterOpen,
    setIsFilterOpen,
    isExtractOpen,
    setIsExtractOpen,
  } = useDataManagementStore();
  const filterRef = useRef<HTMLDivElement>(null);
  const extractRef = useRef<HTMLDivElement>(null);

  /** Fetch all sessions from main process. */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = (await window.electronAPI.getAllSessions()) as Session[];
      setSessions(results);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setSessions]);

  /** Fetch trials for a specific session. */
  const fetchTrials = async (sessionId: number) => {
    try {
      const trials = await window.electronAPI.getSessionTrials(sessionId);
      setSessionTrials((prev) => ({ ...prev, [sessionId]: trials }));
    } catch (error) {
      console.error('Failed to fetch trials:', error);
      setSessionTrials((prev) => ({ ...prev, [sessionId]: [] }));
    }
  };

  /** Trigger file download with blob URL. */
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  /** Escape a value for CSV output (handles commas, quotes, newlines). */
  const escapeCsv = (value: unknown): string => {
    const str = String(value);
    if (
      str.includes(',') ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r') ||
      /^[=+\-@]/.test(str)
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  /** Handle export button click with mode selector. */
  const handleExport = async (mode: 'summary-csv' | 'summary-json' | 'full-csv' | 'full-json') => {
    const selected = sessions.filter((s) =>
      selectedIds.size === 0 ? true : selectedIds.has(s.id)
    );
    if (selected.length === 0) return;

    const filename = `export_${new Date().toISOString().slice(0, 10)}`;

    if (mode === 'summary-csv') {
      const csv = [
        'Email,Age,Gender,ACS Score,Interpretation,Date,Status',
        ...selected.map(
          (s) =>
            `${escapeCsv(s.email)},${escapeCsv(s.age)},${escapeCsv(s.gender)},${escapeCsv(s.acs_score.toFixed(2))},${escapeCsv(s.acs_interpretation)},${escapeCsv(s.test_date)},${escapeCsv(s.upload_status)}`
        ),
      ].join('\n');
      downloadFile(csv, `${filename}.csv`, 'text/csv');
    } else if (mode === 'summary-json') {
      const data = selected.map((s) => ({
        id: s.id,
        email: s.email,
        age: s.age,
        gender: s.gender,
        is_generic: s.is_generic,
        acs_score: s.acs_score,
        acs_interpretation: s.acs_interpretation,
        mean_response_time_ms: s.mean_response_time_ms,
        response_time_variability: s.response_time_variability,
        commission_errors: s.commission_errors,
        omission_errors: s.omission_errors,
        hits: s.hits,
        d_prime: s.d_prime,
        test_date: s.test_date,
        upload_status: s.upload_status,
      }));
      downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json');
    } else if (mode === 'full-json') {
      const data = await Promise.all(
        selected.map(async (s) => ({
          ...s,
          trials: await window.electronAPI.getSessionTrials(s.id),
        }))
      );
      downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json');
    } else {
      const rows: string[] = [];
      const headers = [
        'Email',
        'Age',
        'Gender',
        'ACS Score',
        'Interpretation',
        'Date',
        'Status',
        'Trial',
        'Type',
        'Outcome',
        'Correct',
        'RT',
        'Anticipatory',
        'Multiple',
        'FollowsCommission',
      ];
      for (const s of selected) {
        const trials = await window.electronAPI.getSessionTrials(s.id);
        if (trials.length === 0) {
          rows.push(
            [
              escapeCsv(s.email),
              escapeCsv(s.age),
              escapeCsv(s.gender),
              escapeCsv(s.acs_score.toFixed(2)),
              escapeCsv(s.acs_interpretation),
              escapeCsv(s.test_date),
              escapeCsv(s.upload_status),
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
            ].join(',')
          );
        } else {
          for (const t of trials) {
            rows.push(
              [
                escapeCsv(s.email),
                escapeCsv(s.age),
                escapeCsv(s.gender),
                escapeCsv(s.acs_score.toFixed(2)),
                escapeCsv(s.acs_interpretation),
                escapeCsv(s.test_date),
                escapeCsv(s.upload_status),
                escapeCsv(t.trial_index),
                escapeCsv(t.stimulus_type),
                escapeCsv(t.outcome ?? ''),
                escapeCsv(
                  t.response_correct === null ? 'null' : t.response_correct ? 'true' : 'false'
                ),
                escapeCsv((t.response_time_ms ?? '').toString()),
                escapeCsv(t.is_anticipatory ? 'true' : 'false'),
                escapeCsv(t.is_multiple_response ? 'true' : 'false'),
                escapeCsv(t.follows_commission ? 'true' : 'false'),
              ].join(',')
            );
          }
        }
      }
      downloadFile([headers, ...rows].join('\n'), `${filename}.csv`, 'text/csv');
    }
  };

  /** Extract trials for single session as CSV. */
  const handleExtractTrials = (sessionId: number) => {
    const trials = sessionTrials[sessionId];
    if (!trials || trials.length === 0) {
      console.warn('No trials available for export');
      return;
    }
    const headers = [
      t('dataManagement.trials.trial'),
      t('dataManagement.trials.type'),
      t('dataManagement.trials.outcome'),
      t('dataManagement.trials.correct'),
      t('dataManagement.trials.rt'),
      t('dataManagement.trials.anticipatory'),
      t('dataManagement.trials.multiple'),
      t('dataManagement.trials.followsCommission'),
    ];
    const rows = trials.map((t) => [
      escapeCsv(t.trial_index),
      escapeCsv(t.stimulus_type),
      escapeCsv(t.outcome ?? ''),
      escapeCsv(t.response_correct ?? ''),
      escapeCsv(t.response_time_ms ?? ''),
      escapeCsv(t.is_anticipatory ? 'true' : 'false'),
      escapeCsv(t.is_multiple_response ? 'true' : 'false'),
      escapeCsv(t.follows_commission ? 'true' : 'false'),
    ]);
    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
    downloadFile(csvContent, `trials_session_${sessionId}.csv`, 'text/csv');
  };

  /** Toggle expanded row state for session details. */
  const toggleRow = (id: number) => {
    const expanding = !expandedRows[id];
    setExpandedRow(id, expanding);
    if (expanding && sessionTrials[id] === undefined) {
      void fetchTrials(id);
    }
  };

  /** Handle session status change from table select. */
  const handleStatusChange = useCallback(
    async (sessionId: number, e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      const status = e.target.value as 'pending' | 'uploaded' | 'failed';
      try {
        await window.electronAPI.updateSessionStatus(sessionId, status);
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, upload_status: status } : s))
        );
      } catch (error) {
        console.error('Failed to update session status:', error);
      }
    },
    [setSessions]
  );

  /** Return color class based on gender and generic flag. */
  const getGenderColor = (gender: string, isGeneric: number) => {
    const color = gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500';
    return isGeneric ? `${color} border-2 border-dashed border-gray-400` : color;
  };

  /** Return color class based on ACS score and interpretation. */
  const getAcsColor = (score: number, interpretation: string) => {
    if (interpretation === 'normal' || score >= 90) return 'text-green-600';
    if (interpretation === 'borderline' || score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  /** Handle table header click to change sort column/direction. */
  const handleSort = (col: keyof Session) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  /** Handle bulk delete of selected sessions with confirmation. */
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await window.electronAPI.showMessageBox({
      type: 'question',
      title: t('confirm.title'),
      message: t('dataManagement.confirm.deleteMultiple', { count: selectedIds.size }),
      buttons: [t('button.cancel'), t('button.ok')],
      defaultId: 1,
      cancelId: 0,
    });
    if (!ok) return;
    try {
      await window.electronAPI.bulkDeleteSessions(Array.from(selectedIds));
      setSessions((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  /** Clear expired/uploaded records from the database. */
  const handleClearCache = useCallback(async () => {
    const ok = await window.electronAPI.showMessageBox({
      type: 'question',
      title: t('confirm.title'),
      message: t('dataManagement.confirm.clearCache'),
      buttons: [t('button.cancel'), t('button.ok')],
      defaultId: 1,
      cancelId: 0,
    });
    if (ok) {
      try {
        await window.electronAPI.queryDatabase('cleanup-expired-records');
      } catch (error) {
        console.error('Failed to clear cache:', error);
      }
      await fetchData();
    }
  }, [t, fetchData]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    /** Closes filter and extract dropdowns when clicking outside of them. */
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
      if (extractRef.current && !extractRef.current.contains(e.target as Node)) {
        setIsExtractOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsFilterOpen, setIsExtractOpen]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch = s.email.toLowerCase().includes(globalFilter.toLowerCase());
      const matchesStatus = statusFilter.has(s.upload_status);
      return matchesSearch && matchesStatus;
    });
  }, [sessions, globalFilter, statusFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (!Object.hasOwn(a, sortCol) || !Object.hasOwn(b, sortCol)) return 0;
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  const paginated = useMemo(() => {
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const totalPages = Math.ceil(sorted.length / pageSize);

  if (loading) return <div className="p-8 text-center">{t('loading')}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{t('dataManagement.title')}</h1>
        <DataManagementToolbar
          t={t}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          setPage={setPage}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          statusFilter={statusFilter}
          toggleStatusFilter={toggleStatusFilter}
          filterRef={filterRef}
          isExtractOpen={isExtractOpen}
          setIsExtractOpen={setIsExtractOpen}
          extractRef={extractRef}
          selectedIds={selectedIds}
          handleExport={handleExport}
          handleBulkDelete={handleBulkDelete}
        />
      </div>

      {sessions.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <>
          <SessionTable
            paginated={paginated}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            t={t}
            handleSort={handleSort}
            sortCol={sortCol}
            sortDir={sortDir}
            toggleRow={toggleRow}
            expandedRows={expandedRows}
            sessionTrials={sessionTrials}
            handleExtractTrials={handleExtractTrials}
            getGenderColor={getGenderColor}
            getAcsColor={getAcsColor}
            handleStatusChange={handleStatusChange}
          />

          <div className="flex justify-between items-center py-4">
            <div className="text-sm text-gray-500">
              {t('dataManagement.showing', {
                from: page * pageSize + 1,
                to: Math.min((page + 1) * pageSize, sorted.length),
                total: sorted.length,
              })}
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  void handleClearCache();
                }}
                className="px-3 py-2 border border-[#ECEFF4] rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Clear Cache
              </button>
              <div className="flex gap-2 items-center">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="border border-[#ECEFF4] rounded px-2 py-1 text-sm"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setPage((p) => Math.max(0, p - 1));
                  }}
                  disabled={page === 0}
                  className="px-3 py-1 border border-[#ECEFF4] rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPage((p) => Math.min(totalPages - 1, p + 1));
                  }}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 border border-[#ECEFF4] rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

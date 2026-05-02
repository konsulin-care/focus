import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/i18n';
import { Download, Trash2, Search, ChevronDown, ChevronRight, ChevronLeft, ChevronUp } from 'lucide-react';

interface Session {
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

export default function DataManagement() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortCol, setSortCol] = useState<keyof Session>('test_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await window.electronAPI.getAllSessions() as Session[];
      setSessions(results);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (col: keyof Session) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('dataManagement.confirm.deleteSingle'))) return;
    try {
      await window.electronAPI.bulkDeleteSessions([id]);
      setSessions(prev => prev.filter(s => s.id !== id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('dataManagement.confirm.deleteMultiple', { count: selectedIds.size }))) return;
    try {
      await window.electronAPI.bulkDeleteSessions(Array.from(selectedIds));
      setSessions(prev => prev.filter(s => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    const selected = sessions.filter(s => selectedIds.size === 0 ? true : selectedIds.has(s.id));
    if (selected.length === 0) return;

    if (format === 'csv') {
      const csv = [
        'Email,Age,Gender,ACS Score,Interpretation,Date,Status',
        ...selected.map(s => `${s.email},${s.age},${s.gender},${s.acs_score.toFixed(2)},${s.acs_interpretation},${s.test_date},${s.upload_status}`)
      ].join('\n');
      downloadFile(csv, `export_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
    } else {
      const data = await Promise.all(selected.map(async s => ({
        ...s,
        trials: await window.electronAPI.getSessionTrials(s.id)
      })));
      downloadFile(JSON.stringify(data, null, 2), `export_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtering
  const filtered = useMemo(() => {
    return sessions.filter(s => {
      const matchesSearch = s.email.toLowerCase().includes(globalFilter.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.upload_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sessions, globalFilter, statusFilter]);

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
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

  // Pagination
  const paginated = useMemo(() => {
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const totalPages = Math.ceil(sorted.length / pageSize);

  const getGenderColor = (gender: string, isGeneric: number) => {
    const color = gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500';
    return isGeneric ? `${color} border-2 border-dashed border-gray-400` : color;
  };

  const getAcsColor = (score: number, interpretation: string) => {
    if (interpretation === 'normal' || score >= 90) return 'text-green-600';
    if (interpretation === 'borderline' || score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) return <div className="p-8 text-center">{t('loading')}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{t('dataManagement.title')}</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('dataManagement.searchPlaceholder')}
              className="pl-10 pr-4 py-2 border rounded-md"
              value={globalFilter}
              onChange={e => { setGlobalFilter(e.target.value); setPage(0); }}
            />
          </div>
          <select
            className="px-4 py-2 border rounded-md"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          >
            <option value="all">{t('dataManagement.filterAll')}</option>
            <option value="pending">{t('dataManagement.filterPending')}</option>
            <option value="uploaded">{t('dataManagement.filterUploaded')}</option>
            <option value="failed">{t('dataManagement.filterFailed')}</option>
          </select>
          <button onClick={handleBulkDelete} disabled={selectedIds.size === 0} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 text-sm font-medium">
            <Trash2 size={16} /> {t('dataManagement.bulkDelete')} ({selectedIds.size})
          </button>
          <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md hover:bg-gray-50 text-sm font-medium">
            <Download size={16} /> CSV
          </button>
          <button onClick={() => handleExport('json')} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md hover:bg-gray-50 text-sm font-medium">
            <Download size={16} /> JSON
          </button>
          <button onClick={() => { if (confirm(t('dataManagement.confirm.clearCache'))) { window.electronAPI.queryDatabase('cleanup-expired-records'); fetchData(); } }} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border rounded-md text-sm font-medium">
            {t('dataManagement.clearCache')}
          </button>
        </div>
      </div>

      {sessions.length === 0 && !loading ? (
        <div className="text-center py-12 text-gray-500">
          {t('dataManagement.empty.noRecords')}
        </div>
      ) : (
        <>
          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 w-12"><input type="checkbox" onChange={e => {
                    if (e.target.checked) setSelectedIds(new Set(paginated.map(s => s.id)));
                    else setSelectedIds(new Set());
                  }} checked={paginated.length > 0 && paginated.every(s => selectedIds.has(s.id))} /></th>
                  {[
                    { key: 'email', label: t('dataManagement.table.email') },
                    { key: 'age', label: t('dataManagement.table.age') },
                    { key: 'acs_score', label: t('dataManagement.table.acs') },
                    { key: 'test_date', label: t('dataManagement.table.date') },
                    { key: 'upload_status', label: t('dataManagement.table.status') },
                    { key: 'actions', label: t('dataManagement.table.actions') },
                  ].map(col => (
                    <th key={col.key} className="px-4 py-3 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => col.key !== 'actions' && handleSort(col.key as keyof Session)}>
                      <div className="flex items-center gap-2">
                        {col.label}
                        {sortCol === col.key && (sortDir === 'asc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(session => (
                  <React.Fragment key={session.id}>
                    <tr className="border-b hover:bg-gray-50 transition-colors">
                       <td className="px-4 py-3">
                         <input type="checkbox" checked={selectedIds.has(session.id)} onChange={e => {
                           const next = new Set(selectedIds);
                           if (e.target.checked) {
                             next.add(session.id);
                           } else {
                             next.delete(session.id);
                           }
                           setSelectedIds(next);
                         }} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${getGenderColor(session.gender, session.is_generic)}`}
                            title={session.is_generic ? `${session.gender} (${t('dataManagement.genericDemo')})` : session.gender}
                          />
                          <span className="truncate max-w-xs" title={session.email}>{session.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{session.age}</td>
                      <td className={`px-4 py-3 font-semibold ${getAcsColor(session.acs_score, session.acs_interpretation)}`}>
                        {session.acs_score.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">{new Date(session.test_date).toLocaleDateString()}</td>
                       <td className="px-4 py-3">
                         <select
                           value={session.upload_status}
                           onChange={async e => {
                             const status = e.target.value as 'pending' | 'uploaded' | 'failed';
                             await window.electronAPI.updateSessionStatus(session.id, status);
                             setSessions(prev => prev.map(s => s.id === session.id ? { ...s, upload_status: status } : s));
                           }}
                          className={`px-2 py-1 rounded text-xs border ${
                            session.upload_status === 'uploaded' ? 'bg-green-100 text-green-800 border-green-200' :
                            session.upload_status === 'failed' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }`}
                        >
                          <option value="pending">{t('dataManagement.status.pending')}</option>
                          <option value="uploaded">{t('dataManagement.status.uploaded')}</option>
                          <option value="failed">{t('dataManagement.status.failed')}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => toggleRow(session.id)} className="p-1 hover:bg-gray-100 rounded" title={t('dataManagement.actions.viewDetails')}>
                            {expandedRows[session.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <button onClick={() => handleDelete(session.id)} className="p-1 hover:bg-red-50 text-red-600 rounded" title={t('dataManagement.actions.delete')}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows[session.id] && (
                      <tr>
                        <td colSpan={7} className="p-4 bg-gray-50">
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
                          <div className="bg-white border rounded-lg overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-gray-100 border-b">
                                <tr>
                                  <th className="px-3 py-2">{t('dataManagement.trials.trial')}</th>
                                  <th className="px-3 py-2">{t('dataManagement.trials.type')}</th>
                                  <th className="px-3 py-2">{t('dataManagement.trials.correct')}</th>
                                  <th className="px-3 py-2">{t('dataManagement.trials.rt')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">{t('dataManagement.trials.loading')}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center py-4">
            <div className="text-sm text-gray-500">
              {t('dataManagement.showing', { from: page * pageSize + 1, to: Math.min((page + 1) * pageSize, sorted.length), total: sorted.length })}
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

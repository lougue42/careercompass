'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AddApplicationForm from './AddApplicationForm';
import { useToast } from '../components/ToastProvider';

export default function Dashboard() {
  const toast = useToast();

  // --- Theme palette ---
  const theme = {
    bg: '#f7f8fb',
    card: '#ffffff',
    text: '#0f172a',
    mutedText: '#64748b',
    border: '#e5e7eb',
    header: '#f3f4f6',
    primary: '#2563eb',
    primaryText: '#ffffff',
    danger: '#dc2626',
    success: '#16a34a',
    warning: '#d97706',
    info: '#0891b2',
    inputBg: '#ffffff',
    inputBorder: '#d1d5db',
    overlay: 'rgba(15, 23, 42, 0.55)',
    errorBg: '#fef2f2',
    errorBorder: '#fecaca',
    errorText: '#b91c1c',
    shadow: '0 6px 24px rgba(15, 23, 42, 0.06)',
  };

  // --- Data & UI state ---
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Edit modal
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company: '',
    role: '',
    status: '',
    next_action: '',
    due_date: '',
  });

  // Pagination
  const [page, setPage] = useState(1); // 1-based
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Sorting
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // Search (debounced)
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Status filter (clickable badges)
  const [statusFilter, setStatusFilter] = useState(''); // '', 'Applied', 'Interview', 'Offer', 'Rejected', 'Wishlist'

  // helpful ref to scroll to the Add form from empty state
  const addFormRef = useRef(null);

  const toDateInput = (value) => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };

  // --- Load with pagination + sorting + filter ---
  async function loadApps() {
    setLoading(true);
    setErrorMsg('');

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase.from('applications').select('*', { count: 'exact' });

      if (debouncedSearch) {
        const q = debouncedSearch.replace(/[%]/g, '');
        query = query.or(
          [
            `company.ilike.%${q}%`,
            `role.ilike.%${q}%`,
            `status.ilike.%${q}%`,
            `industry.ilike.%${q}%`,
            `function.ilike.%${q}%`,
            `next_action.ilike.%${q}%`,
          ].join(',')
        );
      }

      // apply status filter
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const ascending = sortDir === 'asc';
      query = query.order(sortBy, { ascending, nullsFirst: false });
      if (sortBy !== 'created_at') {
        query = query.order('created_at', { ascending: false, nullsFirst: false });
      }
      // Stable secondary to prevent jumpiness
      query = query.order('app_uuid', { ascending: true });

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      setRows(data || []);
      setTotal(count || 0);

      const maxPage = Math.max(1, Math.ceil((count || 0) / pageSize));
      if (page > maxPage) setPage(maxPage);
    } catch (err) {
      console.error('Supabase fetch error:', err);
      setErrorMsg('Could not load applications.');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortBy, sortDir, debouncedSearch, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, sortDir, pageSize, statusFilter]);

  async function reloadCurrentPage() {
    await loadApps();
  }

  // --- Delete (RPC) ---
  async function handleDelete(row) {
    if (!row) return alert('Missing row.');
    if (!row.app_uuid) return alert('This row has no app_uuid; refresh and try again.');
    if (!confirm('Delete this application?')) return;

    setDeletingId(row.app_uuid);
    try {
      const { error } = await supabase.rpc('app_delete_by_uuid', { p_uuid: row.app_uuid });
      if (error) throw error;
      await reloadCurrentPage();
      toast('Application deleted');
    } catch (err) {
      console.error('Delete error (rpc):', err);
      alert('Error deleting: ' + (err.message || String(err)));
    } finally {
      setDeletingId(null);
    }
  }

  // --- Edit flow ---
  function handleEdit(row) {
    setEditing(row);
    setForm({
      company: row.company ?? '',
      role: row.role ?? '',
      status: row.status ?? 'Applied',
      next_action: row.next_action ?? '',
      due_date: row.due_date ? toDateInput(row.due_date) : '',
    });
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.app_uuid) {
      alert('Missing app_uuid; cannot update safely.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        p_uuid: editing.app_uuid,
        p_company: form.company || null,
        p_role: form.role || null,
        p_status: form.status || null,
        p_next_action: form.next_action || null,
        p_due_date: form.due_date ? form.due_date : null,
      };
      const { error } = await supabase.rpc('app_update_by_uuid', payload);
      if (error) throw error;

      setEditing(null);
      setForm({ company: '', role: '', status: '', next_action: '', due_date: '' });
      await reloadCurrentPage();
      toast('Application updated');
    } catch (err) {
      console.error('Update error (rpc):', err);
      setErrorMsg('Could not update application.');
      alert('Error updating: ' + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  }

  // --- helpers / UI components ---
  const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    const date = new Date(dateStr);
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((date.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / msPerDay);
  };

  const DuePill = ({ due }) => {
    if (!due) return <span style={pill('neutral')}>No due date</span>;
    const delta = daysUntil(due);
    if (delta === null) return <span style={pill('neutral')}>No due date</span>;
    if (delta < 0) return <span style={pill('danger')}>Overdue ({fmtDate(due)})</span>;
    if (delta === 0) return <span style={pill('warning')}>Due today</span>;
    if (delta <= 7) return <span style={pill('warning')}>Due in {delta}d</span>;
    return <span style={pill('info')}>Scheduled ({fmtDate(due)})</span>;
  };

  const StatusBadge = ({ status }) => {
    const s = String(status || '').toLowerCase();
    const map = { applied: 'info', interview: 'primary', offer: 'success', rejected: 'danger', wishlist: 'neutral' };
    const tone = map[s] || 'neutral';
    return <span style={badge(tone)}>{fmt(status)}</span>;
  };

  // memoize counts for the header
  const counts = useMemo(() => {
    const tally = { total: total, applied: 0, interview: 0, offer: 0, rejected: 0 };
    rows.forEach((r) => {
      const s = String(r.status || '').toLowerCase();
      if (tally[s] !== undefined) tally[s]++;
    });
    return tally;
  }, [rows, total]);

  // styles
  const btn = {
    base: {
      padding: '8px 12px',
      border: `1px solid ${theme.border}`,
      borderRadius: 10,
      background: theme.card,
      color: theme.text,
      cursor: 'pointer',
      boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
    },
    primary: { background: theme.primary, border: `1px solid ${theme.primary}`, color: theme.primaryText },
    danger: { background: theme.danger, border: `1px solid ${theme.danger}`, color: theme.primaryText },
    disabled: { opacity: 0.6, cursor: 'not-allowed' },
  };

  const inputStyle = {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    background: theme.inputBg,
    border: `1px solid ${theme.inputBorder}`,
    color: theme.text,
    outline: 'none',
    boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
  };

  const card = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    boxShadow: theme.shadow,
  };

  function badge(tone) {
    const tones = {
      primary: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
      success: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
      danger: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
      warning: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
      info: { bg: '#e0f2fe', text: '#075985', border: '#bae6fd' },
      neutral: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
    };
    const c = tones[tone] || tones.neutral;
    return {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: 999,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      fontSize: 12,
      fontWeight: 600,
    };
  }
  function pill(tone) { return { ...badge(tone), fontWeight: 500 }; }

  // pagination helpers
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);
  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(maxPage, p + 1));
  const onPageSizeChange = (e) => setPageSize(Number(e.target.value));
  const onSortByChange = (e) => setSortBy(e.target.value);
  const toggleSortDir = () => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));

  // ---------- Small-screen card renderer ----------
  function AppCard({ r }) {
    const key = r.app_uuid ?? r.id ?? r.created_at;
    const isDeleting = deletingId === (r.app_uuid ?? r.id ?? r.created_at);
    return (
      <div
        key={key}
        className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
        style={{ boxShadow: theme.shadow }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{fmt(r.company)}</h3>
            <p className="text-sm text-slate-600">{fmt(r.role)}</p>
          </div>
          <StatusBadge status={r.status} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-400">Function</div>
            <div className="text-slate-700">{fmt(r.function)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Industry</div>
            <div className="text-slate-700">{fmt(r.industry)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Next action</div>
            <div className="text-slate-700 truncate">{fmt(r.next_action)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Due</div>
            <div className="text-slate-700"><DuePill due={r.due_date} /></div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-500">
          <div>Interest: <span className="text-slate-800">{fmt(r.interest_rating)}</span></div>
          <div>Energy: <span className="text-slate-800">{fmt(r.energy_rating)}</span></div>
          <div>Resp. days: <span className="text-slate-800">{fmt(r.response_days)}</span></div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => handleEdit(r)}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 active:scale-[.98]"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(r)}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 text-white px-3 py-2 text-sm font-medium disabled:opacity-50 active:scale-[.98]"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main
      style={{
        background: theme.bg,
        minHeight: '100vh',
        padding: 16,
        fontFamily: 'system-ui, -apple-system',
        color: theme.text,
      }}
    >
      <div className="max-w-6xl mx-auto w-full px-2 sm:px-4 md:px-6">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
          <div>
            <h1 className="m-0 tracking-tight text-xl sm:text-2xl">Career Compass</h1>
            <div className="text-slate-500 mt-1 text-sm">Track, sort, and refine your job hunt.</div>
          </div>

          {/* Clickable status badges */}
          <div className="ml-auto flex flex-wrap gap-2">
            {/* Total = clear filter */}
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              style={{
                ...badge('neutral'),
                ...(statusFilter === '' ? { boxShadow: 'inset 0 0 0 2px rgba(15,23,42,0.15)' } : {}),
                cursor: 'pointer'
              }}
              aria-pressed={statusFilter === ''}
              title="Show all"
            >
              Total: {counts.total}
            </button>

            {[
              { label: 'Applied', tone: 'info', count: counts.applied },
              { label: 'Interview', tone: 'primary', count: counts.interview },
              { label: 'Offer', tone: 'success', count: counts.offer },
              { label: 'Rejected', tone: 'danger', count: counts.rejected },
            ].map(({ label, tone, count }) => (
              <button
                key={label}
                type="button"
                onClick={() => setStatusFilter((curr) => (curr === label ? '' : label))}
                style={{
                  ...badge(tone),
                  ...(statusFilter === label ? { boxShadow: 'inset 0 0 0 2px rgba(15,23,42,0.15)' } : {}),
                  cursor: 'pointer'
                }}
                aria-pressed={statusFilter === label}
                title={`Filter by ${label}`}
              >
                {label}: {count}
              </button>
            ))}
          </div>
        </div>

        {/* Active filter chip */}
        {statusFilter && (
          <div className="mb-2 text-sm text-slate-600 flex items-center gap-2">
            <span>Filtered by:</span>
            <button
              onClick={() => setStatusFilter('')}
              className="rounded-full border border-slate-300 px-2 py-1"
              title="Clear filter"
            >
              {statusFilter} ✕
            </button>
          </div>
        )}

        {/* Controls */}
        <div
          style={{ ...card, padding: 14, marginBottom: 16 }}
          className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center"
        >
          {/* Search */}
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, role, status, industry…"
              style={{ ...inputStyle }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ ...btn.base }} title="Clear search">
                Clear
              </button>
            )}
          </div>

          {/* Sorting / Pagination (top) */}
          <div className="flex flex-wrap items-center gap-2 justify-self-end">
            <label className="text-slate-500 text-sm">Sort</label>
            <select value={sortBy} onChange={onSortByChange} style={{ ...inputStyle, width: 160, padding: 8 }}>
              <option value="created_at">Added</option>
              <option value="due_date">Due date</option>
              <option value="company">Company</option>
              <option value="role">Role</option>
              <option value="status">Status</option>
            </select>
            <button onClick={toggleSortDir} style={{ ...btn.base }} aria-label="Toggle sort direction">
              {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
            <span className="text-slate-500 text-sm ml-2">
              {startIdx}-{endIdx} of {total}
            </span>
            <button
              onClick={prevPage}
              disabled={loading || page <= 1}
              style={{ ...btn.base, ...(loading || page <= 1 ? btn.disabled : {}) }}
              aria-label="Previous page"
            >
              ‹ Prev
            </button>
            <button
              onClick={nextPage}
              disabled={loading || page >= maxPage}
              style={{ ...btn.base, ...(loading || page >= maxPage ? btn.disabled : {}) }}
              aria-label="Next page"
            >
              Next ›
            </button>
            <select value={pageSize} onChange={onPageSizeChange} style={{ ...inputStyle, width: 110, padding: 8 }}>
              {[10, 20, 50].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}/page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Add form card */}
        <div ref={addFormRef} style={{ ...card, padding: 16, marginBottom: 16 }}>
          <AddApplicationForm
            onCreated={async () => {
              await reloadCurrentPage();
              toast('Application added');
            }}
          />
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div
            style={{
              background: theme.errorBg,
              color: theme.errorText,
              border: `1px solid ${theme.errorBorder}`,
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* ----------- DATA RENDER ----------- */}
        {!loading && rows.length === 0 && (
          <div
            className="text-slate-600 flex items-center gap-3 justify-between bg-white rounded-xl border border-slate-200 p-4"
            style={{ boxShadow: theme.shadow }}
          >
            <span>No applications yet.</span>
            <button
              style={{ ...btn.base, ...btn.primary }}
              onClick={() => addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Add your first application
            </button>
          </div>
        )}

        {/* Cards on small screens */}
        {!loading && rows.length > 0 && (
          <div className="md:hidden space-y-3">
            {rows.map((r, idx) => (
              <AppCard key={(r.app_uuid ?? r.id ?? r.created_at) + ':' + idx} r={r} />
            ))}
          </div>
        )}

        {/* Table on md+ */}
        {!loading && rows.length > 0 && (
          <div style={{ ...card, overflow: 'hidden' }} className="hidden md:block">
            <div style={{ overflowX: 'auto' }}>
              <table cellPadding="12" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, lineHeight: 1.3 }}>
                <thead>
                  <tr
                    style={{
                      position: 'sticky',
                      top: 0,
                      background: theme.header,
                      zIndex: 1,
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    <th style={{ textAlign: 'left' }}>Company</th>
                    <th style={{ textAlign: 'left' }}>Role</th>
                    <th style={{ textAlign: 'left' }}>Function</th>
                    <th style={{ textAlign: 'left' }}>Industry</th>
                    <th style={{ textAlign: 'left' }}>Status</th>
                    <th style={{ textAlign: 'left' }}>Next action</th>
                    <th style={{ textAlign: 'left' }}>Due</th>
                    <th style={{ textAlign: 'left' }}>Interest</th>
                    <th style={{ textAlign: 'left' }}>Energy</th>
                    <th style={{ textAlign: 'left' }}>Response days</th>
                    <th style={{ textAlign: 'left' }}>Outcome</th>
                    <th style={{ textAlign: 'left' }}>Added</th>
                    <th style={{ textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const key = r.app_uuid ?? r.id ?? r.created_at ?? idx;
                    const isDeleting = deletingId === (r.app_uuid ?? r.id ?? r.created_at);
                    const zebra = idx % 2 === 1 ? '#fbfbfd' : theme.card;
                    return (
                      <tr
                        key={key}
                        style={{
                          borderBottom: `1px solid ${theme.border}`,
                          background: zebra,
                          transition: 'background 120ms ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = zebra)}
                      >
                        <td>{fmt(r.company)}</td>
                        <td>{fmt(r.role)}</td>
                        <td>{fmt(r.function)}</td>
                        <td>{fmt(r.industry)}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td style={{ maxWidth: 280, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {fmt(r.next_action)}
                        </td>
                        <td><DuePill due={r.due_date} /></td>
                        <td>{fmt(r.interest_rating)}</td>
                        <td>{fmt(r.energy_rating)}</td>
                        <td>{fmt(r.response_days)}</td>
                        <td>{fmt(r.outcome)}</td>
                        <td>{fmtDate(r.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button
                              style={{ ...btn.base, ...btn.primary, ...(isDeleting ? btn.disabled : {}) }}
                              onClick={() => handleEdit(r)}
                              disabled={isDeleting}
                              aria-label="Edit application"
                            >
                              Edit
                            </button>
                            <button
                              style={{ ...btn.base, ...btn.danger, ...(isDeleting ? btn.disabled : {}) }}
                              onClick={() => handleDelete(r)}
                              disabled={isDeleting}
                              aria-label="Delete application"
                            >
                              {isDeleting ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom controls */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: 12,
                borderTop: `1px solid ${theme.border}`,
              }}
            >
              <span className="text-slate-500 text-sm">
                Page {page} of {maxPage} • {startIdx}-{endIdx} of {total}
              </span>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || page <= 1}
                style={{ ...btn.base, ...(loading || page <= 1 ? btn.disabled : {}) }}
              >
                ‹ Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                disabled={loading || page >= maxPage}
                style={{ ...btn.base, ...(loading || page >= maxPage ? btn.disabled : {}) }}
              >
                Next ›
              </button>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={{ ...inputStyle, width: 110, padding: 8 }}>
                {[10, 20, 50].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}/page
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: theme.overlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
        >
          <form
            onSubmit={handleUpdate}
            style={{
              background: theme.card,
              padding: 22,
              borderRadius: 14,
              color: theme.text,
              width: 460,
              maxWidth: '100%',
              display: 'grid',
              gap: 12,
              border: `1px solid ${theme.border}`,
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                {saving ? 'Saving…' : 'Edit Application'}
              </h3>
              <div style={{ marginLeft: 'auto', color: theme.mutedText, fontSize: 12 }}>
                {editing?.company ? editing.company : ''}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label>
                <div className="mb-1 text-slate-500 text-sm">Company</div>
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  style={inputStyle}
                  disabled={saving}
                  placeholder="Company name"
                />
              </label>

              <label>
                <div className="mb-1 text-slate-500 text-sm">Role</div>
                <input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={inputStyle}
                  disabled={saving}
                  placeholder="Job title"
                />
              </label>

              <label>
                <div className="mb-1 text-slate-500 text-sm">Status</div>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  style={inputStyle}
                  disabled={saving}
                >
                  <option>Applied</option>
                  <option>Interview</option>
                  <option>Offer</option>
                  <option>Rejected</option>
                  <option>Wishlist</option>
                </select>
              </label>

              <label>
                <div className="mb-1 text-slate-500 text-sm">Due date</div>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  style={inputStyle}
                  disabled={saving}
                />
              </label>

              <label className="sm:col-span-2">
                <div className="mb-1 text-slate-500 text-sm">Next action</div>
                <input
                  value={form.next_action}
                  onChange={(e) => setForm({ ...form, next_action: e.target.value })}
                  style={inputStyle}
                  disabled={saving}
                  placeholder="Email recruiter on Friday"
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <button type="button" onClick={() => setEditing(null)} style={{ ...btn.base }} disabled={saving}>
                Cancel
              </button>
              <button
                type="submit"
                style={{ ...btn.base, background: theme.success, border: `1px solid ${theme.success}`, color: theme.primaryText }}
                disabled={saving}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

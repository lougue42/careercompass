'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AddApplicationForm from './AddApplicationForm';
import { useToast } from '../components/ToastProvider';
import ConfirmDialog from '../components/ConfirmDialog';

// Local replacement for the old server action
async function updateApplication(payload) {
  if (!payload?.app_uuid) throw new Error('Missing app_uuid in update payload');

  const { data, error } = await supabase
    .from('applications')
    .update({
      company: payload.company,
      role: payload.role,
      status: payload.status,
      next_action: payload.next_action || null,
      due_date: payload.due_date || null,
      priority: payload.priority,
      source: payload.source || null,
      location: payload.location || null,
      notes: payload.notes || null,
    })
    .eq('app_uuid', payload.app_uuid)
    .select();

  if (error) throw error;
  return data?.[0] || null;
}

export default function Dashboard() {
  const toast = useToast();
  const [adding, setAdding] = useState(false);

  // Theme
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

  // Data & UI state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null); // null when no error
  const [deletingId, setDeletingId] = useState(null); // string | null
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    row: null,
    loading: false,
  });

  // Stable identifier used consistently (keys, compares, filters)
 // Stable identifier used consistently (keys, compares, filters)
const rowIdentifier = (r) => String(r?.app_uuid ?? r?.id);


  // Confirm dialog helpers (single source of truth)
  const openDelete = (row) => setConfirmDelete({ open: true, row, loading: false });
  const closeDelete = () => setConfirmDelete({ open: false, row: null, loading: false });

  // Form state for Add Application
  const [form, setForm] = useState({
    company: '',
    role: '',
    status: 'Applied',
    industry: '',
    next_action: '',
    due_date: '',
    // Advanced
    interest_level: '',
    energy_level: '',
    days_to_respond: '',
    notes: '',
    notes_private: '',
    source: '',
    location: '',
    function: '',
    outcome: '',
    priority: '2',
  });

  // Handle input changes
  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Create new application
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('applications').insert([form]);
      if (error) throw error;

      toast('Application added');

      // reset the form for a quick follow-up entry
      setForm({
        company: '',
        role: '',
        status: 'Applied',
        industry: '',
        next_action: '',
        due_date: '',
        interest_level: '',
        energy_level: '',
        days_to_respond: '',
        notes: '',
        notes_private: '',
        source: '',
        location: '',
        function: '',
        outcome: '',
        priority: '2',
      });

      setAdding(false);
      await reloadCurrentPage?.();
    } catch (err) {
      console.error('Error adding application:', err);
      toast('Error adding application');
    }
  };

  // Edit modal state
  const [editing, setEditing] = useState(null); // null | row being edited
  const [saving, setSaving] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
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

  // Filter
  const [statusFilter, setStatusFilter] = useState('');
  // Update Tracker
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Refs
  const addFormRef = useRef(null);
  const firstInputRef = useRef(null);

  const toDateInput = (value) => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };

  // Load rows
  async function loadApps() {
    setLoading(true);
    setErrorMsg(null); // keep null/boolean logic consistent
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

      if (statusFilter) query = query.eq('status', statusFilter);

      const ascending = sortDir === 'asc';
      query = query.order(sortBy, { ascending, nullsFirst: false });
      if (sortBy !== 'created_at')
        query = query.order('created_at', { ascending: false, nullsFirst: false });
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


// Direct table delete, aware of app_uuid or id
async function deleteApplication(row) {
  const app_uuid = row?.app_uuid ?? null;
  const id = row?.id ?? null;

  if (app_uuid) {
    const { error } = await supabase.from('applications').delete().eq('app_uuid', app_uuid);
    if (error) throw error;
    return;
  }
  if (id) {
    const { error } = await supabase.from('applications').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  throw new Error('Row has no identifier (missing app_uuid and id).');
}

// Bridge so existing buttons that call handleDelete(r) still work
function handleDelete(row) {
  if (!row) return;
  openDelete(row);
}

// Confirm dialog action
const confirmDeleteAction = async () => {
  const row = confirmDelete.row;
  if (!row) return closeDelete();

  const id = rowIdentifier(row);
  setConfirmDelete((c) => ({ ...c, loading: true }));
  setDeletingId(id);

  // optimistic remove
  const prevRows = rows;
  setRows((r) => r.filter((x) => rowIdentifier(x) !== id));

  try {
    await deleteApplication(row); // <-- identifier-aware delete
    await reloadCurrentPage();
    setLastUpdated?.(new Date());
    toast('Application deleted');
  } catch (err) {
    setRows(prevRows); // rollback on failure
    console.error('Delete error:', err);
    toast('Error deleting: ' + (err.message || String(err)));
  } finally {
    setDeletingId(null);
    closeDelete();
  }
};

// ...render (table uses key={rowIdentifier(r)}, Delete button calls openDelete(r), and ConfirmDialog below) ...
// <ConfirmDialog open={confirmDelete.open} loading={confirmDelete.loading} onClose={closeDelete} onConfirm={confirmDeleteAction} title="Delete application?" description="This action cannot be undone." confirmText="Delete" />
  // Edit flow
  function handleEdit(row) {
    setEditing(row);
    setForm({
      company: row.company ?? '',
      role: row.role ?? '',
      status: row.status ?? 'Applied',
      next_action: row.next_action ?? '',
      due_date: row.due_date ? toDateInput(row.due_date) : '',
      // Advanced prefill
      interest_level: row.interest_level ?? '',
      energy_level: row.energy_level ?? '',
      days_to_respond: row.days_to_respond ?? '',
      notes: row.notes ?? '',
      notes_private: row.notes_private ?? '',
      source: row.source ?? '',
      location: row.location ?? '',
      priority: String(row.priority ?? 2),
      function: row.function ?? '',
      outcome: row.outcome ?? '',
    });
  }

  // Focus and ESC in modal
  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(() => firstInputRef.current?.focus(), 0);
    const onKey = (e) => {
      if (e.key === 'Escape') setEditing(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [editing]);
// Save via server action (fixed: show real server message, don't throw into render)
async function handleUpdate(e) {
  e.preventDefault();
  if (!editing?.app_uuid) {
    toast('Missing app_uuid; cannot update safely.');
    return;
  }

  setSaving(true);
  setErrorMsg('');

  // helper to coerce numeric inputs safely
  const numOrNull = (v, fallbackNull = true) => {
    if (v === '' || v == null) return fallbackNull ? null : undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  try {
  const payload = {
    app_uuid: editing.app_uuid,
    company: form.company,
    role: form.role,
    status: form.status,
    next_action: form.next_action || null,
    due_date: form.due_date || null, // server action should ISO-normalize
    priority: numOrNull(form.priority, false) ?? 2, // default 2 if empty/NaN
    source: form.source || null,
    location: form.location || null,
    notes: form.notes || null, // ✅ keep this
  };

    const res = await updateApplication(payload);
    console.debug('updateApplication result:', res);

    // Handle both shapes: { ok, message } OR { error: {...} }
    if (res?.ok === false) {
      const msg = res?.message || res?.hint || 'Update failed';
      console.error('Update failed (server action):', res);
      setErrorMsg(msg);
      toast(msg);
      return;
    }
    if (res?.error) {
      const msg = res.error?.message || res.error?.hint || 'Update failed';
      console.error('Supabase update error:', res.error);
      setErrorMsg(msg);
      toast(msg);
      return;
    }

    // Success
setEditing(null);
await reloadCurrentPage();
setLastUpdated(new Date()); // ✅ refresh timestamp dynamically on edit
toast('Application updated');
} catch (err) {
  const msg = err?.message || err?.cause?.message || 'Could not update application.';
  console.error('Update error (catch):', err);
  setErrorMsg(msg);
  toast(msg);
} finally {
  setSaving(false);
}
}
// helpers / UI parts

// Display "—" for empty values
const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

/**
 * Formats stored due_date strings ("YYYY-MM-DD" or ISO) as "Oct 20, 2025"
 * Uses local midnight to avoid timezone drift.
 */
const fmtDate = (s) => {
  if (!s) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? new Date(`${s}T00:00:00`)
    : new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  d.setHours(0, 0, 0, 0);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Returns days between today (local midnight) and the given date string.
 * Negative = past, 0 = today, positive = days ahead.
 */
const daysUntil = (s) => {
  if (!s) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? new Date(`${s}T00:00:00`)
    : new Date(s);
  if (Number.isNaN(d.getTime())) return null;

  d.setHours(0, 0, 0, 0);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((d - today) / msPerDay);
};

/**
 * Renders a colored pill showing date proximity.
 * "No due date", "Overdue", "Due today", "Due in Xd", or "Scheduled".
 */
const DuePill = ({ due }) => {
  if (!due) return <span style={pill('neutral')}>No due date</span>;

  const delta = daysUntil(due);
  if (delta === null) return <span style={pill('neutral')}>No due date</span>;
  if (delta < 0)
    return (
      <span style={pill('danger')}>Overdue ({fmtDate(due)})</span>
    );
  if (delta === 0)
    return <span style={pill('warning')}>Due today</span>;
  if (delta <= 7)
    return <span style={pill('warning')}>Due in {delta}d</span>;

  return (
    <span style={pill('info')}>Scheduled ({fmtDate(due)})</span>
  );
};

/**
 * Maps application status to a colored badge.
 */
const StatusBadge = ({ status }) => {
  const s = String(status || '').toLowerCase();
  const map = {
    applied: 'info',
    interview: 'primary',
    offer: 'success',
    rejected: 'danger',
    wishlist: 'neutral',
  };
  const tone = map[s] || 'neutral';
  return <span style={badge(tone)}>{fmt(status)}</span>;
};

const counts = useMemo(() => {
  const tally = {
    total,
    applied: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
    wishlist: 0,
  };

  for (const r of rows) {
    const s = (r.status || '').toLowerCase();
    if (s in tally) tally[s]++;
  }

  return tally;
}, [rows, total]);

/**
 * --- Date utility helpers for chips & validation ---
 */
const toISODateLocal = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const todayLocal = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return toISODateLocal(t);
};

const quickPick = (label) => {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  if (label === 'Today') return toISODateLocal(base);
  if (label === '+3d') {
    const d = new Date(base);
    d.setDate(d.getDate() + 3);
    return toISODateLocal(d);
  }
  if (label === 'Next Mon') {
    const d = new Date(base);
    const day = d.getDay(); // 0 Sun, 1 Mon
    const delta = ((1 - day + 7) % 7) || 7;
    d.setDate(d.getDate() + delta);
    return toISODateLocal(d);
  }
  return '';
};

const isValidDateOnly = (s) => {
  if (!s) return true;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime());
};

const isPastDate = (s) => {
  if (!s) return false;
  const selected = new Date(`${s}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return selected < now;
};
// styles
const btn = {
  base: {
    fontSize: 13,
    padding: '4px 8px',              // slightly shorter height than original
    borderRadius: 7,                 // proportional rounding
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    cursor: 'pointer',
    boxShadow: '0 1px 0 rgba(0,0,0,0.03)',
    transition: 'background 150ms ease, border-color 150ms ease, transform 100ms ease',
  },
  // Richer blue "Edit"
  primary: {
    background: '#bfdbfe',           // medium blue
    border: '1px solid #93c5fd',
    color: '#1e3a8a',
  },
  // Richer red "Delete"
  danger: {
    background: '#fecaca',           // medium red
    border: '1px solid #fca5a5',
    color: '#7f1d1d',
  },
  disabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

const inputStyle = {
  width: '100%',
  padding: 11,                       // 90% of original input padding
  borderRadius: 9,
  background: theme.inputBg,
  border: `1px solid ${theme.inputBorder}`,
  color: theme.text,
  outline: 'none',
  boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
};

const card = {
  background: theme.card,
  border: `1px solid ${theme.border}`,
  borderRadius: 13,
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
    padding: '4px 7px',              // 90% of previous
    borderRadius: 7,
    background: c.bg,
    color: c.text,
    border: `1px solid ${c.border}`,
    fontSize: 12,
    fontWeight: 600,
  };
}

function pill(tone) {
  return { ...badge(tone), fontWeight: 500 };
}

  // paging helpers
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);
  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(maxPage, p + 1));
  const onPageSizeChange = (e) => setPageSize(Number(e.target.value));
  const onSortByChange = (e) => setSortBy(e.target.value);
  const toggleSortDir = () => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));

  // Small-screen card
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
            <h3 className="text-lg font-semibold leading-tight text-slate-900">{fmt(r.company)}</h3>
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

 {/* Advanced fields are not shown on the card */}
<div className="mt-4 flex items-center gap-2">
  <button
    onClick={() => handleEdit(r)}
    disabled={isDeleting}
    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 active:scale-[.98]"
  >
    Edit
  </button>
  <button
    onClick={() => handleDelete(r)}   // ✅ renamed to match your defined function
    disabled={isDeleting}
    className="inline-flex items-center justify-center rounded-lg bg-red-600 text-white px-3 py-2 text-sm font-medium hover:bg-red-700 active:scale-[.98] transition disabled:opacity-50"
  >
    Delete
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
   <div className="w-full px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div>
          <h1 className="m-0 tracking-tight text-2xl sm:text-3xl font-semibold">
            Career Compass
          </h1>
          <div className="text-slate-500 mt-1 text-sm">
            Track, sort, and refine your job hunt.
          </div>
        </div>
        {/* right-side controls (optional) */}
        {/* <div className="flex items-center gap-3">...</div> */}
      </div>

      {/* Clickable status badges */}
      <div className="ml-auto flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          style={{
            ...badge('neutral'),
            ...(statusFilter === ''
              ? { boxShadow: 'inset 0 0 0 2px rgba(15,23,42,0.15)' }
              : {}),
            cursor: 'pointer',
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
            onClick={() =>
              setStatusFilter((curr) => (curr === label ? '' : label))
            }
            style={{
              ...badge(tone),
              ...(statusFilter === label
                ? { boxShadow: 'inset 0 0 0 2px rgba(15,23,42,0.15)' }
                : {}),
              cursor: 'pointer',
            }}
            aria-pressed={statusFilter === label}
            title={`Filter by ${label}`}
          >
            {label}: {count}
          </button>
        ))}
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

{/* Controls (Search + Add Application + Timestamp) */}
<div
  style={{ ...card, padding: 14, marginBottom: 16 }}
  className="grid grid-cols-1 gap-2"
>
  {/* Search + Add side-by-side */}
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 flex-1">
      <input
        ref={firstInputRef}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search company, role, status, industry…"
        style={{ ...inputStyle, width: '100%' }}
      />
      {search && (
        <button
          onClick={() => setSearch('')}
          style={{ ...btn.base }}
          title="Clear search"
        >
          Clear
        </button>
      )}
    </div>

    {/* Add Application button now anchored on the right */}
    <div className="shrink-0">
      <AddApplicationForm
        onCreated={async () => {
          try {
            await reloadCurrentPage();
            setLastUpdated(new Date()); // ✅ dynamically refresh timestamp
            toast.success?.('Application created') ?? toast('Application created');
          } catch (err) {
            console.error(err);
            toast.error?.('Failed to reload applications') ??
              toast('Failed to reload applications');
          }
        }}
      />
    </div>
  </div>

  {/* Last updated timestamp */}
  <p className="text-xs text-slate-500 mt-1">
    Last updated {lastUpdated.toLocaleDateString()} at{' '}
    {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </p>
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

{/* Small-screen cards */}
{!loading && rows.length > 0 && (
  <div className="md:hidden space-y-3">
    {rows.map((r) => (
      <AppCard key={rowIdentifier(r)} r={r} />
    ))}
  </div>
)}
{/* Table */}
{!loading && rows.length > 0 && (
  <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div style={{ overflowX: 'auto' }}>
      <table
        cellPadding="20"
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, lineHeight: 1.85 }}
      >
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
    <th
      style={{ textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
      onClick={() => handleSort('company')}
    >
      Company {sortBy === 'company' && (sortDir === 'asc' ? '↑' : '↓')}
    </th>
    <th
      style={{ textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
      onClick={() => handleSort('role')}
    >
      Role {sortBy === 'role' && (sortDir === 'asc' ? '↑' : '↓')}
    </th>
    <th style={{ textAlign: 'left' }}>Industry</th>
    <th
      style={{ textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
      onClick={() => handleSort('status')}
    >
      Status {sortBy === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
    </th>
    <th style={{ textAlign: 'left' }}>Next action</th>
    <th
      style={{ textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
      onClick={() => handleSort('due_date')}
    >
      Due {sortBy === 'due_date' && (sortDir === 'asc' ? '↑' : '↓')}
    </th>
    <th
      style={{ textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
      onClick={() => handleSort('created_at')}
    >
      Added {sortBy === 'created_at' && (sortDir === 'asc' ? '↑' : '↓')}
    </th>
    <th style={{ textAlign: 'left' }}>Actions</th>
  </tr>
</thead>
<tbody>
  {rows.map((r, idx) => {
  const key = rowIdentifier(r);
  const isDeleting = deletingId === key;
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
        <td>
          <div className="text-base font-semibold leading-tight">
            {fmt(r.company)}
          </div>
        </td>
        <td>{fmt(r.role)}</td>
        <td>{fmt(r.industry)}</td>
        <td><StatusBadge status={r.status} /></td>
        <td
          style={{
            maxWidth: 280,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        >
          {fmt(r.next_action)}
        </td>
        <td><DuePill due={r.due_date} /></td>
        <td>{fmtDate(r.created_at)}</td>
        <td>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4, marginBottom: 4 }}>
            <button
              type="button"
              style={{ ...btn.base, ...btn.primary, ...(isDeleting ? btn.disabled : {}) }}
              onClick={(e) => { e.stopPropagation(); handleEdit(r); }}
              disabled={isDeleting}
              aria-label="Edit application"
            >
              Edit
            </button>
            <button
              type="button"
              style={{ ...btn.base, ...btn.danger, ...(isDeleting ? btn.disabled : {}) }}
              onClick={(e) => { e.stopPropagation(); handleDelete(r); }}  // opens confirm
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
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ ...inputStyle, width: 110, padding: 8 }}
            >
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
    role="dialog"
    aria-modal="true"
    aria-label="Edit application"
    style={{
      position: 'fixed',
      inset: 0,
      background: theme.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '32px 16px'
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) setEditing(null);
    }}
  >
    <form
      onSubmit={handleUpdate}
      style={{
        background: theme.card,
        padding: 22,
        borderRadius: 14,
        color: theme.text,
        width: 520,
        maxWidth: '100%',
        display: 'grid',
        gap: 12,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 12px 32px rgba(70, 98, 164, 0.18)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>
          {saving ? 'Saving…' : 'Edit Application'}
        </h3>
        <div
          style={{
            marginLeft: 'auto',
            color: theme.mutedText,
            fontSize: 12
          }}
        >
          {editing?.company || ''}
        </div>
      </div>

      {/* Basic fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label>
          <div className="mb-1 text-slate-500 text-sm">Company</div>
          <input
            ref={firstInputRef}
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
            onChange={(e) =>
              setForm({ ...form, next_action: e.target.value })
            }
            style={inputStyle}
            disabled={saving}
            placeholder="Email recruiter on Friday"
          />
        </label>
      </div>

      {/* Advanced Settings */}
      <details className="mt-2 border-t border-slate-200 pt-3">
        <summary className="cursor-pointer font-medium text-slate-700">
          Advanced Settings
        </summary>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <div className="mb-1 text-slate-500 text-sm">
              Priority (1 high, 3 low)
            </div>
            <input
              type="number"
              min={1}
              max={3}
              value={form.priority ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  priority: e.target.valueAsNumber || 1
                })
              }
              style={inputStyle}
              disabled={saving}
            />
          </label>

          <label>
            <div className="mb-1 text-slate-500 text-sm">Function</div>
            <input
              type="text"
              value={form.function || ''}
              onChange={(e) => setForm({ ...form, function: e.target.value })}
              style={inputStyle}
              disabled={saving}
              placeholder="e.g., Business Development"
            />
          </label>

          <label>
            <div className="mb-1 text-slate-500 text-sm">Outcome</div>
            <select
              value={form.outcome || ''}
              onChange={(e) => setForm({ ...form, outcome: e.target.value })}
              style={inputStyle}
              disabled={saving}
            >
              <option value="">—</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
              <option value="Wishlist">Wishlist</option>
            </select>
          </label>

          <label className="sm:col-span-2">
            <div className="mb-1 text-slate-500 text-sm">Location</div>
            <input
              value={form.location ?? ''}
              onChange={(e) =>
                setForm({ ...form, location: e.target.value || '' })
              }
              style={inputStyle}
              disabled={saving}
            />
          </label>

          <label className="sm:col-span-2">
            <div className="mb-1 text-slate-500 text-sm">Notes</div>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value || '' }))
              }
              style={inputStyle}
              rows={3}
              disabled={saving}
            />
          </label>
        </div>
      </details>

{/* Action buttons */}
<div
  style={{
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  }}
>
  <button
    type="button"
    onClick={() => setEditing(null)}
    style={{ ...btn.base }}
  >
    Cancel
  </button>
  <button
    type="submit"
    disabled={saving}
    style={{ ...btn.base, ...btn.primary }}
  >
    {saving ? 'Saving…' : 'Save'}
  </button>
</div>
</form>
</div>
)}

{/* Confirm delete dialog (mounted at root level) */}
<ConfirmDialog
  open={confirmDelete.open}
  title="Delete application?"
  description="This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  onCancel={closeDelete}
  onClose={closeDelete}
  onConfirm={confirmDeleteAction}
  loading={confirmDelete.loading}
/>

</main>
);
}

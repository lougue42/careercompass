'use client';

import { useState, FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Props = {
  onCreated?: () => void; // callback to refresh the table
};

export default function AddApplicationForm({ onCreated }: Props) {
  const [open, setOpen] = useState(false);

  // form state
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Wishlist'>('Applied');
  const [dueDate, setDueDate] = useState('');
  const [nextAction, setNextAction] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // shared light styles to match dashboard
  const fieldStyle: React.CSSProperties = {
    padding: 8,
    borderRadius: 8,
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #d1d5db',
    outline: 'none',
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');

    if (!company.trim() || !role.trim()) {
      setErrorMsg('Company and Role are required.');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('applications').insert([
      {
        company,
        role,
        status,
        next_action: nextAction || null,
        due_date: dueDate || null, // ✅ works for DATE column
      },
    ]);

    setSaving(false);

    if (error) {
      console.error('Insert error:', error);
      setErrorMsg(error.message || 'Could not create application.');
      return;
    }

    // reset form + close
    setCompany('');
    setRole('');
    setStatus('Applied');
    setDueDate('');
    setNextAction('');
    setOpen(false);

    onCreated?.(); // trigger refresh in parent
  }

  return (
    <div style={{ marginBottom: 0 }}>
      {/* compact toggle so it sits nicely in the controls bar */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          background: '#0f172a',
          color: '#ffffff',
          border: '1px solid #0f172a',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(15,23,42,0.12)',
        }}
      >
        {open ? 'Close' : 'Add application'}
      </button>

      {/* inline form (light theme) */}
      {open && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: 12,
            display: 'grid',
            gap: 12,
            maxWidth: 520,
            background: '#ffffff',
            color: '#0f172a',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            boxShadow: '0 6px 16px rgba(15,23,42,0.06)',
          }}
        >
          {errorMsg && (
            <div style={{ color: '#b91c1c', fontSize: 14 }}>{errorMsg}</div>
          )}

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Company *</span>
            <input
              style={fieldStyle}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Google"
              autoComplete="off"
            />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Role *</span>
            <input
              style={fieldStyle}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Business Analyst Intern"
              autoComplete="off"
            />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Status</span>
            <select
              style={fieldStyle}
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option>Applied</option>
              <option>Interview</option>
              <option>Offer</option>
              <option>Rejected</option>
              <option>Wishlist</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Next action</span>
            <input
              style={fieldStyle}
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g., Follow up with recruiter"
            />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Due date</span>
            <input
              type="date"
              style={fieldStyle}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 4,
              padding: '8px 12px',
              borderRadius: 8,
              background: saving ? '#94a3b8' : '#16a34a',
              color: '#ffffff',
              border: 'none',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.8 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  );
}

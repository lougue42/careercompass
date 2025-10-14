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

    onCreated?.(); // trigger refresh
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: '8px 12px',
          borderRadius: 6,
          background: '#1f1f1f',
          color: 'white',
          border: '1px solid #333',
          cursor: 'pointer',
        }}
      >
        {open ? 'Close' : 'Add application'}
      </button>

      {/* form */}
      {open && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: 16,
            display: 'grid',
            gap: 12,
            maxWidth: 480,
            background: '#111',
            padding: 16,
            borderRadius: 8,
          }}
        >
          {errorMsg && (
            <div style={{ color: '#f87171', fontSize: 14 }}>{errorMsg}</div>
          )}

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>Company *</span>
            <input
              style={{
                padding: '8px',
                borderRadius: 6,
                background: '#1f1f1f',
                color: 'white',
                border: '1px solid #333',
              }}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Google"
            />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>Role *</span>
            <input
              style={{
                padding: '8px',
                borderRadius: 6,
                background: '#1f1f1f',
                color: 'white',
                border: '1px solid #333',
              }}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Business Analyst Intern"
            />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>Status</span>
            <select
              style={{
                padding: '8px',
                borderRadius: 6,
                background: '#1f1f1f',
                color: 'white',
                border: '1px solid #333',
              }}
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
            <span style={{ fontSize: 13, opacity: 0.8 }}>Next action</span>
            <input
              style={{
                padding: '8px',
                borderRadius: 6,
                background: '#1f1f1f',
                color: 'white',
                border: '1px solid #333',
              }}
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g., Follow up with recruiter"
            />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>Due date</span>
            <input
              type="date"
              style={{
                padding: '8px',
                borderRadius: 6,
                background: '#1f1f1f',
                color: 'white',
                border: '1px solid #333',
              }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 8,
              padding: '8px 12px',
              borderRadius: 6,
              background: saving ? '#555' : '#16a34a',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  );
}

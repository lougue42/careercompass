'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ✅ use alias import

export default function Dashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadApps() {
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRows(data || []);
    } catch (err) {
      console.error('Supabase fetch error:', err);
      setErrorMsg('Could not load applications.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApps();
  }, []);

  const fmt = (v) => (v === null || v === undefined || v === '' ? '-' : String(v));
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '-');

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 1200,
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system',
      }}
    >
      <h1 style={{ marginBottom: 8 }}>Career Compass</h1>
      <p style={{ marginBottom: 16 }}>Your application history at a glance.</p>

      <button onClick={loadApps} disabled={loading} style={{ marginBottom: 16 }}>
        {loading ? 'Loading…' : 'Reload'}
      </button>

      {errorMsg && (
        <div style={{ color: '#b00020', marginBottom: 12 }}>{errorMsg}</div>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
        <table
          cellPadding="8"
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}
        >
          <thead style={{ background: '#fafafa' }}>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eaeaea' }}>
              <th>Company</th>
              <th>Role</th>
              <th>Function</th>
              <th>Industry</th>
              <th>Status</th>
              <th>Next action</th>
              <th>Due date</th>
              <th>Interest</th>
              <th>Energy</th>
              <th>Response days</th>
              <th>Outcome</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={12} style={{ color: '#666' }}>
                  No applications yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td>{fmt(r.company)}</td>
                <td>{fmt(r.role)}</td>
                <td>{fmt(r.function)}</td>
                <td>{fmt(r.industry)}</td>
                <td>{fmt(r.status)}</td>
                <td>{fmt(r.next_action)}</td>
                <td>{fmt(r.due_date)}</td>
                <td>{fmt(r.interest_rating)}</td>
                <td>{fmt(r.energy_rating)}</td>
                <td>{fmt(r.response_days)}</td>
                <td>{fmt(r.outcome)}</td>
                <td>{fmtDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../components/ToastProvider';

type AddApplicationFormProps = {
  onCreated?: () => void | Promise<void>;
};

export default function AddApplicationForm({ onCreated }: AddApplicationFormProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    company: '',
    role: '',
    status: 'Applied',
    industry: '',
    next_action: '',
    due_date: '',
    notes: '',
  });

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Send nulls instead of empty strings for optional fields
      const payload = {
        ...form,
        industry: form.industry || null,
        next_action: form.next_action || null,
        notes: form.notes || null,
        due_date: form.due_date || null, // works if column is date or timestamptz
      };

      const { error } = await supabase.from('applications').insert([payload]);
      if (error) throw error;

      toast('Application added');
      setOpen(false);
      setForm({
        company: '',
        role: '',
        status: 'Applied',
        industry: '',
        next_action: '',
        due_date: '',
        notes: '',
      });
      await onCreated?.(); // parent refresh
    } catch (err) {
      console.error(err);
      toast('Error adding application');
    } finally {
      setSaving(false);
    }
  };

  const FORM_ID = 'add-app-form';

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl px-4 py-2 text-sm font-medium text-white"
        style={{ background: '#2563eb' }}
      >
        Add application
      </button>

      {!open ? null : (
        <div className="fixed inset-0 z-[70] flex" role="dialog" aria-modal="true">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => (!saving ? setOpen(false) : null)}
          />

          {/* Slide-over panel */}
          <aside
            className="relative ml-auto h-full w-full sm:w-[520px] md:w-[640px] bg-white shadow-xl flex flex-col"
            style={{ borderLeft: '1px solid #e5e7eb' }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
              style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}
            >
              <div>
                <h2 className="m-0 text-xl font-semibold tracking-tight">Add application</h2>
                <p className="m-0 mt-1 text-sm text-slate-500">
                  Keep it simple. You can edit details later.
                </p>
              </div>
              <button
                onClick={() => (!saving ? setOpen(false) : null)}
                className="rounded-xl px-3 py-2 text-sm"
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}
              >
                Close
              </button>
            </div>

            {/* Form */}
            <form id={FORM_ID} onSubmit={handleCreate} className="flex-1 overflow-y-auto px-5 pb-24">
              {/* Basics */}
              <h3 className="mt-4 text-sm font-medium uppercase tracking-wide text-slate-500">
                Basics
              </h3>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Company<span className="text-rose-600">*</span>
                  </label>
                  <input
                    required
                    name="company"
                    value={form.company}
                    onChange={onChange}
                    placeholder="e.g., Google"
                    className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                    style={{ background: '#fff', border: '1px solid #d1d5db' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Role<span className="text-rose-600">*</span>
                  </label>
                  <input
                    required
                    name="role"
                    value={form.role}
                    onChange={onChange}
                    placeholder="e.g., Business Analyst Intern"
                    className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                    style={{ background: '#fff', border: '1px solid #d1d5db' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={onChange}
                    className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                    style={{ background: '#fff', border: '1px solid #d1d5db' }}
                  >
                    {['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Industry</label>
                  <input
                    name="industry"
                    value={form.industry}
                    onChange={onChange}
                    placeholder="e.g., Aerospace"
                    className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                    style={{ background: '#fff', border: '1px solid #d1d5db' }}
                  />
                </div>
              </div>

              {/* Next step */}
              <h3 className="mt-7 text-sm font-medium uppercase tracking-wide text-slate-500">
                Next step
              </h3>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Next action</label>
                  <input
                    name="next_action"
                    value={form.next_action}
                    onChange={onChange}
                    placeholder="e.g., Follow up with recruiter"
                    className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                    style={{ background: '#fff', border: '1px solid #d1d5db' }}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['Send resume', 'Thank you email', 'Schedule interview', 'Apply on site'].map(
                      (chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, next_action: chip }))}
                          className="rounded-full px-3 py-1 text-xs"
                          style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}
                        >
                          {chip}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due date</label>
                  <input
                    type="date"
                    name="due_date"
                    value={form.due_date}
                    onChange={onChange}
                    className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                    style={{ background: '#fff', border: '1px solid #d1d5db' }}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { label: 'Today', days: 0 },
                      { label: '+3d', days: 3 },
                      { label: 'Next Mon', days: ((7 - new Date().getDay() + 1) % 7) || 7 },
                    ].map(({ label, days }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            due_date: new Date(Date.now() + days * 86400000)
                              .toISOString()
                              .slice(0, 10),
                          }))
                        }
                        className="rounded-full px-3 py-1 text-xs"
                        style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <h3 className="mt-7 text-sm font-medium uppercase tracking-wide text-slate-500">
                Notes
              </h3>
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                rows={4}
                placeholder="Optional context, links, or reminders"
                className="mt-3 w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                style={{ background: '#fff', border: '1px solid #d1d5db' }}
              />
            </form>

            {/* Sticky footer */}
            <div
              className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-5 py-3"
              style={{ background: '#ffffff', borderTop: '1px solid #e5e7eb' }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2 text-sm"
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}
              >
                Cancel
              </button>

              {/* Point this at the form above so it submits even outside the form */}
              <button
                form={FORM_ID}
                type="submit"
                disabled={saving}
                className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: '#2563eb' }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

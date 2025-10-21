'use server';
import { createClient } from '@supabase/supabase-js';

/**
 * Normalize a date-like input to a UTC date-only string "YYYY-MM-DD".
 * Accepts: "2025-10-20", ISO strings, Date objects. Returns null for falsy/invalid.
 */
function normalizeDateOnly(input) {
  if (!input) return null;

  let d;
  if (input instanceof Date) d = input;
  else if (typeof input === 'string') d = new Date(input);
  else return null;

  if (Number.isNaN(d.getTime())) return null;

  // Convert to UTC date-only to avoid timezone drift
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Validate due date. Returns { ok: true, value } or { ok: false, message }.
 * Blocks invalid dates and past dates (midnight UTC). Null is allowed.
 */
function validateDueDate(input) {
  if (input == null || input === '') {
    return { ok: true, value: null };
  }
  const normalized = normalizeDateOnly(input);
  if (!normalized) {
    return { ok: false, message: 'Please provide a valid date.', value: null };
  }

  const todayUtc = new Date();
  // Compare using UTC midnight for both
  const todayY = todayUtc.getUTCFullYear();
  const todayM = todayUtc.getUTCMonth();
  const todayD = todayUtc.getUTCDate();
  const todayMidnightUTC = new Date(Date.UTC(todayY, todayM, todayD));

  const [y, m, d] = normalized.split('-').map((n) => Number(n));
  const selectedMidnightUTC = new Date(Date.UTC(y, m - 1, d));

  if (selectedMidnightUTC < todayMidnightUTC) {
    return { ok: false, message: 'Due date cannot be in the past.', value: null };
  }

  return { ok: true, value: normalized };
}

export async function updateApplication(input) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      console.error('Missing Supabase envs', { hasUrl: !!url, hasServiceKey: !!serviceKey });
      return { ok: false, message: 'Server misconfigured: Supabase env vars missing.' };
    }

    const supabase = createClient(url, serviceKey);

    // Helpers
    const numOrNull = (v) => (v === '' || v == null ? null : Number(v));
    const strOrNull = (v) => {
      if (v == null) return null;
      const s = String(v).trim();
      return s === '' ? null : s;
    };

    // Validate + normalize due_date
    const dueCheck = validateDueDate(input.due_date);
    if (!dueCheck.ok) {
      return { ok: false, message: dueCheck.message };
    }

    // Build patch – only columns that exist in your table
    const patch = {
      company: strOrNull(input.company),
      role: strOrNull(input.role),
      status: input.status ?? null,
      next_action: strOrNull(input.next_action),

      // Store as UTC date-only string "YYYY-MM-DD" (or null)
      due_date: dueCheck.value,

      // Advanced
      priority: numOrNull(input.priority),
      location: strOrNull(input.location),

      // Notes
      notes: strOrNull(input.notes),

      last_touch: new Date().toISOString(),
    };

    // Filter out undefined values
    const filtered = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));

    const { data, error } = await supabase
      .from('applications')
      .update(filtered)
      .eq('app_uuid', input.app_uuid)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase update error:', error, { filtered, app_uuid: input.app_uuid });
      return {
        ok: false,
        message: error.message || 'Update failed',
        code: error.code || null,
        hint: error.hint || null,
        details: error.details || null,
      };
    }

    return { ok: true, data };
  } catch (err) {
    console.error('Server action crashed:', err);
    return { ok: false, message: err?.message || 'Server action error' };
  }
}

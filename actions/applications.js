'use server';
import { createClient } from '@supabase/supabase-js';

// Server-only client (service role). Do NOT import this file in client components.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function updateApplication(input) {
  try {
    // Helpers
    const numOrNull = (v) => (v === '' || v == null ? null : Number(v));
    const isoOrNull = (d) => (d ? new Date(d).toISOString() : null);

    // Build safe patch
    const patch = {
      company: input.company?.trim(),
      role: input.role?.trim(),
      status: input.status ?? null,
      next_action: input.next_action ?? null,
      due_date: isoOrNull(input.due_date),
      interest_level: numOrNull(input.interest_level),
      energy_level: numOrNull(input.energy_level),
      days_to_respond: numOrNull(input.days_to_respond),
      notes_private: input.notes_private ?? null,
      source: input.source ?? null,
      location: input.location ?? null,
      priority: numOrNull(input.priority),
      last_touch: new Date().toISOString(),
    };

    // Drop undefined so we never send unknown columns
    const filtered = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );

    const { data, error } = await supabase
      .from('applications')
      .update(filtered)
      .eq('app_uuid', input.app_uuid)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase update error:', error, { filtered, app_uuid: input.app_uuid });
      // Do NOT throw — return a serializable error object
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

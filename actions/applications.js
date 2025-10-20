'use server';
import { createClient } from '@supabase/supabase-js';

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
    const isoOrNull = (d) => (d ? new Date(d).toISOString() : null);
    const strOrNull = (v) => {
      if (v == null) return null;
      const s = String(v).trim();
      return s === '' ? null : s;
    };

    const patch = {
      company: strOrNull(input.company),
      role: strOrNull(input.role),
      status: input.status ?? null,
      next_action: strOrNull(input.next_action),
      due_date: isoOrNull(input.due_date),

      // Advanced
      interest_level: numOrNull(input.interest_level),
      energy_level: numOrNull(input.energy_level),
      days_to_respond: numOrNull(input.days_to_respond),
      priority: numOrNull(input.priority),

      source: strOrNull(input.source),
      location: strOrNull(input.location),

      // Notes
      notes: strOrNull(input.notes),                 // ✅ now persisted
      notes_private: strOrNull(input.notes_private), // ✅ already present, normalized

      last_touch: new Date().toISOString(),
    };

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

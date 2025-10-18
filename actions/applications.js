'use server';
import { createClient } from '@supabase/supabase-js';

export async function updateApplication(input) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Guard against missing envs in production
    if (!url || !serviceKey) {
      console.error('Missing Supabase envs', { hasUrl: !!url, hasServiceKey: !!serviceKey });
      return { ok: false, message: 'Server misconfigured: Supabase env vars missing.' };
    }

    // Create server-only client inside the function, so missing envs don’t crash module load
    const supabase = createClient(url, serviceKey);

    // Helpers
    const numOrNull = (v) => (v === '' || v == null ? null : Number(v));
    const isoOrNull = (d) => (d ? new Date(d).toISOString() : null);

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

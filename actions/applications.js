'use server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function updateApplication(data) {
  try {
    const { error } = await supabase
      .from('applications')
      .update({
        company: data.company,
        role: data.role,
        status: data.status,
        next_action: data.next_action,
        due_date: data.due_date,
        interest_level: data.interest_level,
        energy_level: data.energy_level,
        days_to_respond: data.days_to_respond,
        notes_private: data.notes_private,
        source: data.source,
        location: data.location,
        priority: data.priority,
        last_touch: new Date().toISOString(),
      })
      .eq('app_uuid', data.app_uuid);

    return { error };
  } catch (err) {
    console.error('Server action failed:', err);
    return { error: err };
  }
}

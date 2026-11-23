import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { CYCLE_PHASE_LABELS, type CoupleEvent, type CyclePhase } from '@/types/database';

export interface HomeRadarSummary {
  upcomingEvent: CoupleEvent | null;
  pantryLowCount: number;
  shoppingPendingCount: number;
  cycleStatusLabel: string | null;
}

export async function fetchHomeRadarSummary(coupleId: string): Promise<HomeRadarSummary> {
  if (!isSupabaseConfigured) {
    return {
      upcomingEvent: null,
      pantryLowCount: 0,
      shoppingPendingCount: 0,
      cycleStatusLabel: null,
    };
  }

  const nowIso = new Date().toISOString();

  const [eventRes, pantryRes, shoppingRes, cycleRes] = await Promise.all([
    supabase
      .from('couple_events')
      .select('*')
      .eq('couple_id', coupleId)
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('pantry_items')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .or('in_stock.eq.false,low_stock.eq.true'),
    supabase
      .from('shopping_items')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .eq('is_checked', false),
    supabase
      .from('cycle_entries')
      .select('phase, care_notes')
      .eq('couple_id', coupleId)
      .order('entry_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const phase = cycleRes.data?.phase as CyclePhase | undefined;
  const cycleStatusLabel = phase ? CYCLE_PHASE_LABELS[phase] : null;

  return {
    upcomingEvent: (eventRes.data as CoupleEvent | null) ?? null,
    pantryLowCount: pantryRes.count ?? 0,
    shoppingPendingCount: shoppingRes.count ?? 0,
    cycleStatusLabel,
  };
}

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  CareResponseStatus,
  DailyMood,
  DengoCareButton,
  DengoInteraction,
  DengoShortcut,
  DrawingPayload,
} from '@/types/database';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function fetchDengoShortcuts(coupleId: string): Promise<DengoShortcut[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('dengo_shortcuts')
    .select('*')
    .eq('couple_id', coupleId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as DengoShortcut[] | null) ?? [];
}

export async function createDengoShortcut(params: {
  coupleId: string;
  createdBy: string;
  emoji: string;
  label: string;
  sortOrder: number;
}): Promise<DengoShortcut> {
  const { data, error } = await supabase
    .from('dengo_shortcuts')
    .insert({
      couple_id: params.coupleId,
      created_by: params.createdBy,
      emoji: params.emoji.trim(),
      label: params.label.trim(),
      is_default: false,
      sort_order: params.sortOrder,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as DengoShortcut;
}

export async function deleteDengoShortcut(shortcutId: string): Promise<void> {
  const { error } = await supabase.from('dengo_shortcuts').delete().eq('id', shortcutId);
  if (error) throw new Error(error.message);
}

export async function fetchCareButtons(coupleId: string): Promise<DengoCareButton[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('dengo_care_buttons')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as DengoCareButton[] | null) ?? [];
}

export async function createCareButton(params: {
  coupleId: string;
  emoji: string;
  label: string;
  sortOrder: number;
}): Promise<DengoCareButton> {
  const { data, error } = await supabase
    .from('dengo_care_buttons')
    .insert({
      couple_id: params.coupleId,
      emoji: params.emoji.trim() || '🤍',
      label: params.label.trim(),
      sort_order: params.sortOrder,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as DengoCareButton;
}

export async function updateCareButton(
  buttonId: string,
  updates: { emoji?: string; label?: string }
): Promise<DengoCareButton> {
  const { data, error } = await supabase
    .from('dengo_care_buttons')
    .update(updates)
    .eq('id', buttonId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as DengoCareButton;
}

export async function deleteCareButton(buttonId: string): Promise<void> {
  const { error } = await supabase.from('dengo_care_buttons').delete().eq('id', buttonId);
  if (error) throw new Error(error.message);
}

export async function fetchDengoInteractions(coupleId: string): Promise<DengoInteraction[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('dengo_interactions')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data as DengoInteraction[] | null) ?? [];
}

export async function sendEmojiDengo(params: {
  coupleId: string;
  senderId: string;
  receiverId: string;
  emoji: string;
  label: string;
  message?: string;
}): Promise<DengoInteraction> {
  const { data, error } = await supabase
    .from('dengo_interactions')
    .insert({
      couple_id: params.coupleId,
      sender_id: params.senderId,
      receiver_id: params.receiverId,
      kind: 'emoji_reaction',
      emoji: params.emoji,
      label: params.label,
      message: params.message?.trim() || null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as DengoInteraction;
}

export async function sendDrawingDengo(params: {
  coupleId: string;
  senderId: string;
  receiverId: string;
  drawing: DrawingPayload;
  caption?: string;
}): Promise<DengoInteraction> {
  const { data, error } = await supabase
    .from('dengo_interactions')
    .insert({
      couple_id: params.coupleId,
      sender_id: params.senderId,
      receiver_id: params.receiverId,
      kind: 'drawing',
      emoji: '🎨',
      label: 'Bilhete visual',
      message: params.caption?.trim() || null,
      drawing_url: JSON.stringify(params.drawing),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as DengoInteraction;
}

export async function sendCareRequestDengo(params: {
  coupleId: string;
  senderId: string;
  receiverId: string;
  emoji: string;
  label: string;
  message?: string;
}): Promise<DengoInteraction> {
  const { data, error } = await supabase
    .from('dengo_interactions')
    .insert({
      couple_id: params.coupleId,
      sender_id: params.senderId,
      receiver_id: params.receiverId,
      kind: 'care_request',
      emoji: params.emoji,
      label: params.label,
      message: params.message?.trim() || null,
      care_status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as DengoInteraction;
}

export async function respondToCareRequest(
  interactionId: string,
  status: Exclude<CareResponseStatus, 'pending'>
): Promise<DengoInteraction> {
  const { data, error } = await supabase
    .from('dengo_interactions')
    .update({
      care_status: status,
      responded_at: new Date().toISOString(),
    })
    .eq('id', interactionId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as DengoInteraction;
}

export async function fetchTodayMoods(coupleId: string): Promise<DailyMood[]> {
  if (!isSupabaseConfigured) return [];
  const today = getTodayDateString();
  const { data, error } = await supabase
    .from('daily_moods')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('mood_date', today);

  if (error) throw new Error(error.message);
  return (data as DailyMood[] | null) ?? [];
}

export async function upsertDailyMood(params: {
  coupleId: string;
  userId: string;
  moodKey: string;
  moodEmoji: string;
  note?: string;
  careSuggestions: string[];
}): Promise<DailyMood> {
  const today = getTodayDateString();
  const { data, error } = await supabase
    .from('daily_moods')
    .upsert(
      {
        couple_id: params.coupleId,
        user_id: params.userId,
        mood_date: today,
        mood_key: params.moodKey,
        mood_emoji: params.moodEmoji,
        note: params.note?.trim() || null,
        care_suggestions: params.careSuggestions,
      },
      { onConflict: 'couple_id,user_id,mood_date' }
    )
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as DailyMood;
}

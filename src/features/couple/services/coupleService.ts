import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { CoupleInvite, PartnerSummary } from '@/types/database';

export interface SearchedUser extends PartnerSummary {
  has_couple: boolean;
}

export interface GeneratedInviteCode {
  invite_id: string;
  code: string;
  expires_at: string;
}

export interface PendingInvitesBundle {
  received: CoupleInvite[];
  sent: CoupleInvite[];
  activeCodeInvite: CoupleInvite | null;
}

export async function searchUserByUsername(rawUsername: string): Promise<SearchedUser | null> {
  if (!isSupabaseConfigured) {
    throw new Error('Configure o Supabase (.env) para buscar usuários reais.');
  }

  const clean = rawUsername.trim().toLowerCase().replace(/^@+/, '');
  if (!clean) return null;

  const { data, error } = await supabase.rpc('search_user_by_username', {
    p_username: clean,
  });

  if (error) throw new Error(error.message);
  const rows = (data as SearchedUser[] | null) ?? [];
  return rows[0] ?? null;
}

export async function sendCoupleInviteByUsername(rawUsername: string): Promise<string> {
  const clean = rawUsername.trim().toLowerCase().replace(/^@+/, '');
  const { data, error } = await supabase.rpc('send_couple_invite_by_username', {
    p_username: clean,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function respondCoupleInvite(
  inviteId: string,
  accept: boolean
): Promise<string | null> {
  const { data, error } = await supabase.rpc('respond_couple_invite', {
    p_invite_id: inviteId,
    p_accept: accept,
  });

  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

export async function cancelCoupleInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('couple_invites')
    .update({ status: 'cancelled' })
    .eq('id', inviteId);

  if (error) throw new Error(error.message);
}

export async function generateCoupleInviteCode(): Promise<GeneratedInviteCode> {
  const { data, error } = await supabase.rpc('generate_couple_invite_code');
  if (error) throw new Error(error.message);

  const rows = (data as GeneratedInviteCode[] | null) ?? [];
  if (!rows[0]) {
    throw new Error('Não foi possível gerar o código de vínculo.');
  }
  return rows[0];
}

export async function redeemCoupleInviteCode(rawCode: string): Promise<string> {
  const cleanCode = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const { data, error } = await supabase.rpc('redeem_couple_invite_code', {
    p_code: cleanCode,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function unlinkCouple(): Promise<void> {
  const { error } = await supabase.rpc('unlink_couple');
  if (error) throw new Error(error.message);
}

export async function fetchPendingInvites(userId: string): Promise<PendingInvitesBundle> {
  if (!isSupabaseConfigured) {
    return { received: [], sent: [], activeCodeInvite: null };
  }

  const { data, error } = await supabase
    .from('couple_invites')
    .select(
      `
      *,
      sender:profiles!couple_invites_sender_id_fkey(id, full_name, username, avatar_url),
      receiver:profiles!couple_invites_receiver_id_fkey(id, full_name, username, avatar_url)
    `
    )
    .eq('status', 'pending')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const invites = (data as CoupleInvite[] | null) ?? [];
  const now = Date.now();

  const received = invites.filter((item) => item.receiver_id === userId);
  const sent = invites.filter((item) => item.sender_id === userId && item.receiver_id !== null);
  const activeCodeInvite =
    invites.find(
      (item) =>
        item.sender_id === userId &&
        item.receiver_id === null &&
        Boolean(item.invite_code) &&
        (!item.expires_at || new Date(item.expires_at).getTime() > now)
    ) ?? null;

  return { received, sent, activeCodeInvite };
}

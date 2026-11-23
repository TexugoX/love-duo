import * as Crypto from 'expo-crypto';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  ArtistHighlight,
  ArtistRankingEntry,
  Couple,
  Profile,
  RelationshipStatus,
} from '@/types/database';

export async function hashVaultPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `nosdois-vault:${pin}`);
}

export async function updateMyProfile(
  userId: string,
  updates: {
    full_name?: string;
    avatar_url?: string | null;
    vault_pin_hash?: string | null;
    biometrics_enabled?: boolean;
  }
): Promise<Partial<Profile>> {
  if (!isSupabaseConfigured) {
    return updates;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function updateCoupleProfile(
  coupleId: string,
  updates: {
    relationship_status?: RelationshipStatus;
    started_at?: string;
    about_answers?: Record<string, string>;
  }
): Promise<Partial<Couple>> {
  if (!isSupabaseConfigured) {
    return updates;
  }

  const { data, error } = await supabase
    .from('couples')
    .update(updates)
    .eq('id', coupleId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as Couple;
}

export async function fetchMyArtistHighlights(userId: string): Promise<ArtistHighlight> {
  if (!isSupabaseConfigured) {
    return { topArtist: null, topArtistShows: 0, totalShows: 0 };
  }

  const { data, error } = await supabase.rpc('get_artist_show_ranking', {
    p_user_id: userId,
  });

  if (error) {
    console.warn('[profileService] Erro ao buscar ranking de artistas:', error.message);
    return { topArtist: null, topArtistShows: 0, totalShows: 0 };
  }

  const rows = (data as ArtistRankingEntry[] | null) ?? [];
  const totalShows = rows.reduce((sum, item) => sum + Number(item.shows_count ?? 0), 0);
  const top = rows[0];

  return {
    topArtist: top?.artist_name ?? null,
    topArtistShows: top ? Number(top.shows_count) : 0,
    totalShows,
  };
}

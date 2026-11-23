import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Couple, PartnerSummary, Profile } from '@/types/database';

WebBrowser.maybeCompleteAuthSession();

const USERNAME_REGEX = /^[a-z0-9._]{3,24}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, '');
}

export function validateUsernameFormat(raw: string): string | null {
  const clean = normalizeUsername(raw);
  if (!clean) return 'Escolha um @usuario.';
  if (clean.length < 3) return 'O @usuario precisa ter pelo menos 3 caracteres.';
  if (clean.length > 24) return 'O @usuario pode ter no máximo 24 caracteres.';
  if (!USERNAME_REGEX.test(clean)) {
    return 'Use apenas letras minúsculas, números, ponto (.) ou underline (_).';
  }
  return null;
}

export async function checkUsernameAvailability(rawUsername: string): Promise<boolean> {
  const clean = normalizeUsername(rawUsername);
  if (validateUsernameFormat(clean)) return false;
  if (!isSupabaseConfigured) return true;

  const { data, error } = await supabase.rpc('is_username_available', {
    p_username: clean,
  });

  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data);
}

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Configure o arquivo .env com as credenciais do Supabase para fazer login.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      throw new Error('E-mail ou senha incorretos.');
    }
    throw new Error(error.message);
  }
  return data;
}

export async function signUpWithEmail(params: {
  fullName: string;
  username: string;
  email: string;
  password: string;
}) {
  if (!isSupabaseConfigured) {
    throw new Error('Configure o arquivo .env com as credenciais do Supabase para cadastrar.');
  }

  const cleanUsername = normalizeUsername(params.username);
  const formatError = validateUsernameFormat(cleanUsername);
  if (formatError) throw new Error(formatError);

  const available = await checkUsernameAvailability(cleanUsername);
  if (!available) {
    throw new Error(`O usuário @${cleanUsername} já está em uso. Tente outro.`);
  }

  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim().toLowerCase(),
    password: params.password,
    options: {
      data: {
        full_name: params.fullName.trim(),
        username: cleanUsername,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      throw new Error('Este e-mail já está cadastrado. Tente entrar na sua conta.');
    }
    throw new Error(error.message);
  }

  return data;
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Configure o arquivo .env e habilite o provedor Google no Supabase Auth para continuar com o Google.'
    );
  }

  const redirectTo =
    Platform.OS === 'web'
      ? typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:8081'
      : AuthSession.makeRedirectUri({
          scheme: 'appcasal',
          path: 'auth/callback',
        });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });

  if (error) throw new Error(error.message);
  if (Platform.OS === 'web') return;

  if (!data?.url) {
    throw new Error('Não foi possível iniciar o login com Google.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    return;
  }

  // Suporta tanto fluxo PKCE (?code=) quanto tokens no fragmento (#access_token=)
  const parsedUrl = new URL(result.url);
  const code = parsedUrl.searchParams.get('code');

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw new Error(exchangeError.message);
    return;
  }

  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw new Error(sessionError.message);
  }
}

export async function completeUserProfile(params: {
  userId: string;
  fullName: string;
  username: string;
}) {
  const cleanUsername = normalizeUsername(params.username);
  const formatError = validateUsernameFormat(cleanUsername);
  if (formatError) throw new Error(formatError);

  const available = await checkUsernameAvailability(cleanUsername);
  if (!available) {
    throw new Error(`O usuário @${cleanUsername} já está em uso.`);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: params.fullName.trim(),
      username: cleanUsername,
    })
    .eq('id', params.userId)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`O usuário @${cleanUsername} já está em uso.`);
    }
    throw new Error(error.message);
  }

  return data as Profile;
}

export interface UserBundle {
  profile: Profile | null;
  couple: Couple | null;
  partner: PartnerSummary | null;
}

export async function fetchUserBundle(userId: string): Promise<UserBundle> {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profile = (profileData as Profile | null) ?? null;
  if (!profile?.couple_id) {
    return { profile, couple: null, partner: null };
  }

  const { data: coupleData, error: coupleError } = await supabase
    .from('couples')
    .select('*')
    .eq('id', profile.couple_id)
    .maybeSingle();

  if (coupleError) {
    throw new Error(coupleError.message);
  }

  const couple = (coupleData as Couple | null) ?? null;
  let partner: PartnerSummary | null = null;

  if (couple) {
    const partnerId =
      couple.member_one_id === userId ? couple.member_two_id : couple.member_one_id;

    const { data: partnerData } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .eq('id', partnerId)
      .maybeSingle();

    partner = (partnerData as PartnerSummary | null) ?? null;
  }

  return { profile, couple, partner };
}

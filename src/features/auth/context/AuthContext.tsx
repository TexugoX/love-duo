import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchUserBundle } from '@/features/auth/services/authService';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Couple, PartnerSummary, Profile } from '@/types/database';

type PreviewStage = 'none' | 'connect' | 'tabs';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  couple: Couple | null;
  partner: PartnerSummary | null;
  isLoading: boolean;
  isPreviewMode: boolean;
  previewStage: PreviewStage;
  isAuthenticated: boolean;
  needsUsername: boolean;
  hasActiveCouple: boolean;
  refreshUserData: () => Promise<void>;
  updateLocalProfile: (patch: Partial<Profile>) => void;
  updateLocalCouple: (patch: Partial<Couple>) => void;
  signOut: () => Promise<void>;
  enterPreviewMode: (stage: Exclude<PreviewStage, 'none'>) => void;
  exitPreviewMode: () => void;
}

const INITIAL_PREVIEW_PROFILE: Profile = {
  id: 'preview-user-1',
  full_name: 'Camila Rocha',
  username: 'camila.r',
  email: 'camila@exemplo.com',
  avatar_url: null,
  couple_id: 'preview-couple-1',
  vault_pin_hash: null,
  biometrics_enabled: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const INITIAL_PREVIEW_PARTNER: PartnerSummary = {
  id: 'preview-user-2',
  full_name: 'Lucas Mendes',
  username: 'lucas.m',
  avatar_url: null,
};

const INITIAL_PREVIEW_COUPLE: Couple = {
  id: 'preview-couple-1',
  member_one_id: 'preview-user-1',
  member_two_id: 'preview-user-2',
  relationship_status: 'living_together',
  started_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 620 - 1000 * 60 * 60 * 5).toISOString(),
  about_answers: {
    onde_nos_conhecemos: 'Em um café perto do parque',
    primeiro_encontro: 'Jantar italiano e caminhada na praça',
    musica_do_casal: 'Ainda Bem — Marisa Monte',
    comida_favorita_juntos: 'Pizza artesanal de sexta à noite',
    proximo_sonho: 'Viagem para o litoral no feriado',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partner, setPartner] = useState<PartnerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewStage, setPreviewStage] = useState<PreviewStage>('none');

  // Estado editável para Modo Preview (permite testar edições de Perfil e Casal em tempo real)
  const [previewProfile, setPreviewProfile] = useState<Profile>(INITIAL_PREVIEW_PROFILE);
  const [previewCouple, setPreviewCouple] = useState<Couple>(INITIAL_PREVIEW_COUPLE);

  const loadBundle = useCallback(async (userId: string) => {
    try {
      const bundle = await fetchUserBundle(userId);
      setProfile(bundle.profile);
      setCouple(bundle.couple);
      setPartner(bundle.partner);
    } catch (err) {
      console.warn('[AuthProvider] Erro ao carregar perfil:', err);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (previewStage !== 'none') return;
    if (!session?.user?.id || !isSupabaseConfigured) return;
    await loadBundle(session.user.id);
  }, [loadBundle, previewStage, session?.user?.id]);

  const updateLocalProfile = useCallback(
    (patch: Partial<Profile>) => {
      if (previewStage !== 'none') {
        setPreviewProfile((prev) => ({
          ...prev,
          ...patch,
          updated_at: new Date().toISOString(),
        }));
      } else {
        setProfile((prev) =>
          prev ? { ...prev, ...patch, updated_at: new Date().toISOString() } : prev
        );
      }
    },
    [previewStage]
  );

  const updateLocalCouple = useCallback(
    (patch: Partial<Couple>) => {
      if (previewStage !== 'none') {
        setPreviewCouple((prev) => ({
          ...prev,
          ...patch,
          updated_at: new Date().toISOString(),
        }));
      } else {
        setCouple((prev) =>
          prev ? { ...prev, ...patch, updated_at: new Date().toISOString() } : prev
        );
      }
    },
    [previewStage]
  );

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
        if (data.session?.user?.id) {
          await loadBundle(data.session.user.id);
        }
        if (isMounted) setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      if (nextSession?.user?.id) {
        setPreviewStage('none');
        void loadBundle(nextSession.user.id);
      } else {
        setProfile(null);
        setCouple(null);
        setPartner(null);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadBundle]);

  // Escuta em tempo real mudanças no perfil e no casal (ex.: vínculo aceito, status ou data alterada)
  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user?.id || previewStage !== 'none') {
      return;
    }

    const channel = supabase
      .channel(`profile-couple-sync-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        () => {
          void loadBundle(session.user.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'couples',
        },
        () => {
          void loadBundle(session.user.id);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadBundle, previewStage, session?.user?.id]);

  const signOut = useCallback(async () => {
    if (previewStage !== 'none') {
      setPreviewStage('none');
      return;
    }
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setProfile(null);
    setCouple(null);
    setPartner(null);
  }, [previewStage]);

  const enterPreviewMode = useCallback((stage: Exclude<PreviewStage, 'none'>) => {
    setPreviewStage(stage);
  }, []);

  const exitPreviewMode = useCallback(() => {
    setPreviewStage('none');
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isPreviewMode = previewStage !== 'none';
    const effectiveProfile = isPreviewMode
      ? {
          ...previewProfile,
          couple_id: previewStage === 'tabs' ? previewCouple.id : null,
        }
      : profile;
    const effectiveCouple = previewStage === 'tabs' ? previewCouple : couple;
    const effectivePartner = previewStage === 'tabs' ? INITIAL_PREVIEW_PARTNER : partner;

    const isAuthenticated = isPreviewMode || Boolean(session?.user);
    const needsUsername = isAuthenticated && !isPreviewMode && !effectiveProfile?.username;
    const hasActiveCouple = isAuthenticated && Boolean(effectiveProfile?.couple_id);

    return {
      session,
      profile: effectiveProfile,
      couple: effectiveCouple,
      partner: effectivePartner,
      isLoading,
      isPreviewMode,
      previewStage,
      isAuthenticated,
      needsUsername,
      hasActiveCouple,
      refreshUserData,
      updateLocalProfile,
      updateLocalCouple,
      signOut,
      enterPreviewMode,
      exitPreviewMode,
    };
  }, [
    couple,
    enterPreviewMode,
    exitPreviewMode,
    isLoading,
    partner,
    previewCouple,
    previewProfile,
    previewStage,
    profile,
    refreshUserData,
    session,
    signOut,
    updateLocalCouple,
    updateLocalProfile,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  }
  return ctx;
}

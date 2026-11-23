import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  Input,
  ScreenContainer,
  SegmentedTabs,
} from '@/components/ui';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  cancelCoupleInvite,
  fetchPendingInvites,
  generateCoupleInviteCode,
  redeemCoupleInviteCode,
  respondCoupleInvite,
  searchUserByUsername,
  sendCoupleInviteByUsername,
  type SearchedUser,
} from '@/features/couple/services/coupleService';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { CoupleInvite } from '@/types/database';

type LinkMethod = 'username' | 'code';

const PREVIEW_RECEIVED_INVITES: CoupleInvite[] = [
  {
    id: 'preview-invite-1',
    sender_id: 'preview-user-2',
    receiver_id: 'preview-user-1',
    invite_code: null,
    status: 'pending',
    expires_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sender: {
      id: 'preview-user-2',
      full_name: 'Lucas Mendes',
      username: 'lucas.m',
      avatar_url: null,
    },
  },
];

export function ConnectCoupleScreen() {
  const { profile, session, isPreviewMode, refreshUserData, signOut, enterPreviewMode } =
    useAuth();

  const [method, setMethod] = useState<LinkMethod>('username');

  // Opção 1: Buscar pelo @usuario
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchedUser | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  // Opção 2: Código de 6 caracteres
  const [myCode, setMyCode] = useState<string | null>(isPreviewMode ? 'K7M9P2' : null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [redeemingCode, setRedeemingCode] = useState(false);

  // Convites pendentes
  const [receivedInvites, setReceivedInvites] = useState<CoupleInvite[]>(
    isPreviewMode ? PREVIEW_RECEIVED_INVITES : []
  );
  const [sentInvites, setSentInvites] = useState<CoupleInvite[]>([]);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  const loadInvites = useCallback(async () => {
    if (isPreviewMode || !isSupabaseConfigured || !session?.user?.id) return;
    try {
      const bundle = await fetchPendingInvites(session.user.id);
      setReceivedInvites(bundle.received);
      setSentInvites(bundle.sent);
      if (bundle.activeCodeInvite?.invite_code) {
        setMyCode(bundle.activeCodeInvite.invite_code);
      }
    } catch (err) {
      console.warn('[ConnectCoupleScreen] Erro ao carregar convites:', err);
    }
  }, [isPreviewMode, session?.user?.id]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  // Realtime para novos convites recebidos/atualizados
  useEffect(() => {
    if (isPreviewMode || !isSupabaseConfigured || !session?.user?.id) return;

    const channel = supabase
      .channel(`invites-sync-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_invites' },
        () => {
          void loadInvites();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isPreviewMode, loadInvites, session?.user?.id]);

  const handleSearch = async () => {
    setFeedback(null);
    const clean = searchQuery.trim().toLowerCase().replace(/^@+/, '');
    if (!clean) {
      setFeedback({ type: 'error', text: 'Digite o @usuario do seu par para buscar.' });
      return;
    }

    if (isPreviewMode) {
      setSearchAttempted(true);
      setSearchResult({
        id: 'preview-user-2',
        full_name: 'Lucas Mendes',
        username: clean,
        avatar_url: null,
        has_couple: false,
      });
      return;
    }

    try {
      setSearching(true);
      setSearchAttempted(true);
      const found = await searchUserByUsername(clean);
      setSearchResult(found);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao buscar usuário.',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSendInvite = async () => {
    if (!searchResult?.username) return;
    setFeedback(null);

    if (isPreviewMode) {
      setFeedback({
        type: 'success',
        text: `Convite enviado para @${searchResult.username} (modo preview).`,
      });
      return;
    }

    try {
      setSendingInvite(true);
      await sendCoupleInviteByUsername(searchResult.username);
      setFeedback({
        type: 'success',
        text: `Convite enviado para @${searchResult.username}! Aguarde a confirmação.`,
      });
      setSearchResult(null);
      setSearchQuery('');
      setSearchAttempted(false);
      await loadInvites();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Não foi possível enviar o convite.',
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRespondInvite = async (inviteId: string, accept: boolean) => {
    setFeedback(null);

    if (isPreviewMode) {
      if (accept) {
        enterPreviewMode('tabs');
      } else {
        setReceivedInvites((prev) => prev.filter((item) => item.id !== inviteId));
      }
      return;
    }

    try {
      setRespondingInviteId(inviteId);
      await respondCoupleInvite(inviteId, accept);
      if (accept) {
        await refreshUserData();
      } else {
        setFeedback({ type: 'success', text: 'Convite recusado.' });
        await loadInvites();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao responder convite.',
      });
    } finally {
      setRespondingInviteId(null);
    }
  };

  const handleCancelSentInvite = async (inviteId: string) => {
    try {
      await cancelCoupleInvite(inviteId);
      await loadInvites();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao cancelar convite.',
      });
    }
  };

  const handleGenerateCode = async () => {
    setFeedback(null);
    if (isPreviewMode) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let randomCode = '';
      for (let i = 0; i < 6; i += 1) {
        randomCode += chars[Math.floor(Math.random() * chars.length)];
      }
      setMyCode(randomCode);
      return;
    }

    try {
      setGeneratingCode(true);
      const generated = await generateCoupleInviteCode();
      setMyCode(generated.code);
      setCopiedCode(false);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao gerar código.',
      });
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!myCode) return;
    await Clipboard.setStringAsync(myCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleShareCode = async () => {
    if (!myCode) return;
    await Share.share({
      message: `Vamos conectar nosso espaço no app Nós Dois! Use o código: ${myCode}`,
    });
  };

  const handleRedeemCode = async () => {
    setFeedback(null);
    const clean = partnerCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length !== 6) {
      setFeedback({ type: 'error', text: 'Digite o código completo de 6 caracteres.' });
      return;
    }

    if (isPreviewMode) {
      enterPreviewMode('tabs');
      return;
    }

    try {
      setRedeemingCode(true);
      await redeemCoupleInviteCode(clean);
      await refreshUserData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Não foi possível validar o código.',
      });
    } finally {
      setRedeemingCode(false);
    }
  };

  return (
    <ScreenContainer keyboardAvoiding edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.topBar}>
        <Badge label={`@${profile?.username ?? 'usuario'}`} tone="primary" />
        <Pressable onPress={signOut} hitSlop={8}>
          <Text style={styles.signOutText}>Sair</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="heart-half" size={30} color={Palette.primary} />
        </View>
        <Text style={styles.title}>Conectar meu par</Text>
        <Text style={styles.subtitle}>
          Vincule-se ao seu par para desbloquear o espaço compartilhado de vocês. Apenas 1 vínculo
          ativo por vez.
        </Text>
      </View>

      {feedback ? (
        <View
          style={[
            styles.feedbackBox,
            feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess,
          ]}>
          <Ionicons
            name={
              feedback.type === 'error'
                ? 'alert-circle-outline'
                : 'checkmark-circle-outline'
            }
            size={18}
            color={feedback.type === 'error' ? Palette.danger : Palette.success}
          />
          <Text
            style={[
              styles.feedbackText,
              { color: feedback.type === 'error' ? Palette.danger : Palette.success },
            ]}>
            {feedback.text}
          </Text>
        </View>
      ) : null}

      {/* Convites recebidos */}
      {receivedInvites.length > 0 ? (
        <Card variant="accent" style={styles.invitesCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="mail-unread-outline" size={18} color={Palette.primaryPressed} />
            <Text style={styles.sectionTitle}>Convites recebidos</Text>
          </View>
          {receivedInvites.map((invite) => (
            <View key={invite.id} style={styles.inviteItem}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {(invite.sender?.full_name ?? 'P').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteName}>
                  {invite.sender?.full_name ?? 'Seu par'}
                </Text>
                <Text style={styles.inviteHandle}>
                  @{invite.sender?.username ?? 'usuario'} quer se conectar com você
                </Text>
                <View style={styles.inviteActions}>
                  <Button
                    title="Aceitar"
                    size="sm"
                    fullWidth={false}
                    loading={respondingInviteId === invite.id}
                    style={styles.inviteActionBtn}
                    onPress={() => handleRespondInvite(invite.id, true)}
                  />
                  <Button
                    title="Recusar"
                    variant="outline"
                    size="sm"
                    fullWidth={false}
                    disabled={respondingInviteId === invite.id}
                    style={styles.inviteActionBtn}
                    onPress={() => handleRespondInvite(invite.id, false)}
                  />
                </View>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Seletor entre Opção 1 (@usuario) e Opção 2 (Código de 6 caracteres) */}
      <View style={styles.switcherWrap}>
        <SegmentedTabs
          value={method}
          onChange={setMethod}
          options={[
            { key: 'username', label: 'Buscar @usuario' },
            { key: 'code', label: 'Código de 6 dígitos' },
          ]}
        />
      </View>

      {method === 'username' ? (
        <View style={styles.sectionGap}>
          <Card style={styles.cardGap}>
            <Text style={styles.cardHeading}>Encontrar pelo @usuario</Text>
            <Text style={styles.cardSubtext}>
              Digite o @usuario do seu par e envie um convite de vínculo.
            </Text>

            <View style={styles.searchRow}>
              <View style={styles.searchInputWrap}>
                <Input
                  prefix="@"
                  placeholder="usuario.do.par"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={searchQuery}
                  onChangeText={(val) => {
                    setSearchQuery(val.replace(/\s+/g, '').toLowerCase());
                    setSearchAttempted(false);
                  }}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
              </View>
              <Button
                title="Buscar"
                fullWidth={false}
                loading={searching}
                onPress={handleSearch}
                style={styles.searchBtn}
              />
            </View>

            {searchResult ? (
              <View style={styles.foundUserBox}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {searchResult.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.foundUserInfo}>
                  <Text style={styles.inviteName}>{searchResult.full_name}</Text>
                  <Text style={styles.inviteHandle}>@{searchResult.username}</Text>
                </View>
                {searchResult.has_couple ? (
                  <Badge label="Já vinculado" tone="neutral" />
                ) : (
                  <Button
                    title="Convidar"
                    size="sm"
                    fullWidth={false}
                    loading={sendingInvite}
                    onPress={handleSendInvite}
                  />
                )}
              </View>
            ) : searchAttempted && !searching ? (
              <Text style={styles.emptySearchText}>
                Nenhum usuário encontrado com @{searchQuery.replace(/^@+/, '')}.
              </Text>
            ) : null}
          </Card>

          {sentInvites.length > 0 ? (
            <Card variant="subtle" style={styles.cardGap}>
              <Text style={styles.cardHeading}>Convites enviados</Text>
              {sentInvites.map((invite) => (
                <View key={invite.id} style={styles.sentRow}>
                  <View style={styles.foundUserInfo}>
                    <Text style={styles.inviteName}>
                      {invite.receiver?.full_name ?? 'Parceiro'}
                    </Text>
                    <Text style={styles.inviteHandle}>
                      @{invite.receiver?.username ?? 'usuario'} • Aguardando resposta
                    </Text>
                  </View>
                  <Pressable onPress={() => handleCancelSentInvite(invite.id)} hitSlop={8}>
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          ) : null}
        </View>
      ) : (
        <View style={styles.sectionGap}>
          {/* Gerar código */}
          <Card style={styles.cardGap}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="key-outline" size={18} color={Palette.primary} />
              <Text style={styles.cardHeading}>Seu código de convite</Text>
            </View>
            <Text style={styles.cardSubtext}>
              Gere um código curto de 6 caracteres e envie para o seu par digitar no app.
            </Text>

            {myCode ? (
              <>
                <View style={styles.codeBox}>
                  <Text style={styles.codeDigits}>{myCode.split('').join('  ')}</Text>
                  <Text style={styles.codeExpiry}>Válido por 24 horas</Text>
                </View>
                <View style={styles.codeActions}>
                  <Button
                    title={copiedCode ? 'Copiado!' : 'Copiar'}
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    style={styles.codeActionBtn}
                    onPress={handleCopyCode}
                    icon={
                      <Ionicons
                        name={copiedCode ? 'checkmark' : 'copy-outline'}
                        size={16}
                        color={Palette.primaryPressed}
                      />
                    }
                  />
                  <Button
                    title="Compartilhar"
                    variant="outline"
                    size="sm"
                    fullWidth={false}
                    style={styles.codeActionBtn}
                    onPress={handleShareCode}
                    icon={<Ionicons name="share-outline" size={16} color={Palette.text} />}
                  />
                </View>
                <Button
                  title="Gerar novo código"
                  variant="ghost"
                  size="sm"
                  loading={generatingCode}
                  onPress={handleGenerateCode}
                />
              </>
            ) : (
              <Button
                title="Gerar código de 6 caracteres"
                variant="secondary"
                loading={generatingCode}
                onPress={handleGenerateCode}
                icon={<Ionicons name="sparkles-outline" size={18} color={Palette.primaryPressed} />}
              />
            )}
          </Card>

          {/* Digitar código recebido */}
          <Card style={styles.cardGap}>
            <Text style={styles.cardHeading}>Já tenho o código do meu par</Text>
            <Text style={styles.cardSubtext}>
              Digite os 6 caracteres enviados pelo seu par para conectar instantaneamente.
            </Text>
            <Input
              placeholder="Ex.: K7M9P2"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              value={partnerCode}
              onChangeText={(val) =>
                setPartnerCode(val.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              }
              style={styles.codeInput}
            />
            <Button
              title="Conectar agora"
              loading={redeemingCode}
              disabled={partnerCode.length !== 6}
              onPress={handleRedeemCode}
            />
          </Card>
        </View>
      )}

      {isPreviewMode ? (
        <View style={styles.previewFooter}>
          <Button
            title="Pular para as 5 abas (Modo Preview)"
            variant="ghost"
            onPress={() => enterPreviewMode('tabs')}
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  signOutText: {
    ...Typography.captionBold,
    color: Palette.textSecondary,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: Radius.xl,
    backgroundColor: Palette.surfaceAccent,
    borderWidth: 1,
    borderColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    color: Palette.text,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xxs,
    maxWidth: 330,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  feedbackError: {
    backgroundColor: Palette.dangerSoft,
  },
  feedbackSuccess: {
    backgroundColor: Palette.successSoft,
  },
  feedbackText: {
    ...Typography.caption,
    fontWeight: '500',
    flex: 1,
  },
  invitesCard: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Palette.primaryPressed,
  },
  inviteItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Palette.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...Typography.h3,
    color: Palette.primaryPressed,
  },
  inviteInfo: {
    flex: 1,
    gap: 2,
  },
  inviteName: {
    ...Typography.bodyMedium,
    color: Palette.text,
    fontWeight: '700',
  },
  inviteHandle: {
    ...Typography.caption,
    color: Palette.textSecondary,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  inviteActionBtn: {
    flex: 1,
  },
  switcherWrap: {
    marginBottom: Spacing.md,
  },
  sectionGap: {
    gap: Spacing.md,
  },
  cardGap: {
    gap: Spacing.sm,
  },
  cardHeading: {
    ...Typography.h3,
    color: Palette.text,
  },
  cardSubtext: {
    ...Typography.caption,
    color: Palette.textSecondary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  searchInputWrap: {
    flex: 1,
  },
  searchBtn: {
    minHeight: 50,
    paddingHorizontal: Spacing.md,
  },
  foundUserBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.surfaceSubtle,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    marginTop: Spacing.xs,
  },
  foundUserInfo: {
    flex: 1,
  },
  emptySearchText: {
    ...Typography.caption,
    color: Palette.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  cancelText: {
    ...Typography.captionBold,
    color: Palette.danger,
  },
  codeBox: {
    backgroundColor: Palette.surfaceSubtle,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.primarySoft,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  codeDigits: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 3,
    color: Palette.primaryPressed,
  },
  codeExpiry: {
    ...Typography.caption,
    color: Palette.textMuted,
  },
  codeActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  codeActionBtn: {
    flex: 1,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
  },
  previewFooter: {
    marginTop: Spacing.md,
  },
});

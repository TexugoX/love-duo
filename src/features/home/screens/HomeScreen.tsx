import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Input, ScreenContainer } from '@/components/ui';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCoupleData } from '@/features/couple/context/CoupleDataContext';
import { DrawingPreview } from '@/features/tasks/components/DrawingPreview';
import { MOOD_PRESETS, RELATIONSHIP_STATUS_LABELS } from '@/types/database';

interface ElapsedTime {
  years: number;
  months: number;
  days: number;
  hours: number;
}

function calculateElapsedTime(startedAtIso: string): ElapsedTime {
  const start = new Date(startedAtIso);
  const now = new Date();
  if (Number.isNaN(start.getTime()) || start > now) {
    return { years: 0, months: 0, days: 0, hours: 0 };
  }

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  let hours = now.getHours() - start.getHours();

  if (hours < 0) {
    hours += 24;
    days -= 1;
  }
  if (days < 0) {
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    hours: Math.max(0, hours),
  };
}

function formatCountdown(targetIso: string): string {
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return 'É hoje!';
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) return `Em ${hours}h`;
  return `Faltam ${days}d ${hours}h`;
}

function formatTimeAgo(iso: string): string {
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function HomeScreen() {
  const { profile, partner, couple, isPreviewMode } = useAuth();
  const {
    householdTasks,
    dengoHistory,
    partnerMood,
    radar,
    sendEmoji,
    respondCareRequest,
  } = useCoupleData();

  const startedAt = couple?.started_at ?? new Date().toISOString();
  const [elapsed, setElapsed] = useState<ElapsedTime>(() => calculateElapsedTime(startedAt));

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyToast, setReplyToast] = useState<string | null>(null);

  useEffect(() => {
    setElapsed(calculateElapsedTime(startedAt));
    const timer = setInterval(() => {
      setElapsed(calculateElapsedTime(startedAt));
    }, 60_000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const statusLabel = couple
    ? RELATIONSHIP_STATUS_LABELS[couple.relationship_status]
    : 'Conectados';

  const myFirstName = (profile?.full_name || 'Você').split(' ')[0];
  const partnerFirstName = (partner?.full_name || 'Seu par').split(' ')[0];

  const latestReceivedDengo = useMemo(
    () => dengoHistory.find((item) => item.receiver_id === profile?.id) ?? null,
    [dengoHistory, profile?.id]
  );

  const pendingCareRequest = useMemo(
    () =>
      dengoHistory.find(
        (item) =>
          item.kind === 'care_request' &&
          item.receiver_id === profile?.id &&
          item.care_status === 'pending'
      ) ?? null,
    [dengoHistory, profile?.id]
  );

  const pendingTasks = useMemo(
    () => householdTasks.filter((t) => !t.is_completed),
    [householdTasks]
  );

  const partnerMoodPreset = partnerMood
    ? MOOD_PRESETS.find((m) => m.key === partnerMood.mood_key)
    : null;

  const handleQuickReply = async (emoji: string, label: string) => {
    await sendEmoji(emoji, label, replyText);
    setReplyText('');
    setReplyOpen(false);
    setReplyToast(`${emoji} Resposta enviada para ${partnerFirstName}!`);
    setTimeout(() => setReplyToast(null), 2600);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {myFirstName}</Text>
          <Text style={styles.subGreeting}>
            {myFirstName} & {partnerFirstName}
          </Text>
        </View>
        <Badge
          label={isPreviewMode ? 'Preview' : statusLabel}
          tone={isPreviewMode ? 'warning' : 'primary'}
        />
      </View>

      {/* 1. Contador do Casal */}
      <Card variant="accent" style={styles.counterCard}>
        <View style={styles.counterHeader}>
          <View style={styles.rowCenter}>
            <Ionicons name="heart" size={18} color={Palette.primary} />
            <Text style={styles.counterTitle}>Tempo juntos</Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={8}>
            <Badge label={statusLabel} tone="primary" />
          </Pressable>
        </View>

        <View style={styles.counterGrid}>
          {[
            { value: elapsed.years, label: elapsed.years === 1 ? 'ano' : 'anos' },
            { value: elapsed.months, label: elapsed.months === 1 ? 'mês' : 'meses' },
            { value: elapsed.days, label: elapsed.days === 1 ? 'dia' : 'dias' },
            { value: elapsed.hours, label: elapsed.hours === 1 ? 'hora' : 'horas' },
          ].map((item) => (
            <View key={item.label} style={styles.counterBox}>
              <Text style={styles.counterNumber}>{item.value}</Text>
              <Text style={styles.counterUnit}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Alerta imediato se houver Pedir Dengo pendente */}
      {pendingCareRequest ? (
        <Card variant="subtle" style={styles.careAlertCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.rowCenter}>
              <Text style={styles.careEmoji}>{pendingCareRequest.emoji ?? '🤍'}</Text>
              <View>
                <Text style={styles.careKicker}>PEDIDO DE CUIDADO</Text>
                <Text style={styles.sectionTitle}>
                  {partnerFirstName}: {pendingCareRequest.label}
                </Text>
              </View>
            </View>
            <Badge label={formatTimeAgo(pendingCareRequest.created_at)} tone="warning" />
          </View>
          {pendingCareRequest.message ? (
            <Text style={styles.dengoMessage}>“{pendingCareRequest.message}”</Text>
          ) : null}
          <View style={styles.careActionsRow}>
            <Button
              title="ESTOU INDO"
              size="sm"
              fullWidth={false}
              style={styles.flexOne}
              onPress={() => void respondCareRequest(pendingCareRequest.id, 'on_my_way')}
            />
            <Button
              title="NÃO CONSIGO AGORA"
              variant="outline"
              size="sm"
              fullWidth={false}
              style={styles.flexOne}
              onPress={() => void respondCareRequest(pendingCareRequest.id, 'cant_now')}
            />
          </View>
        </Card>
      ) : null}

      {/* 2. Pulso Rápido (Último Dengo recebido + resposta rápida) */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.rowCenter}>
            <Ionicons name="sparkles-outline" size={18} color={Palette.primary} />
            <Text style={styles.sectionTitle}>Pulso Rápido</Text>
          </View>
          {latestReceivedDengo ? (
            <Badge label={formatTimeAgo(latestReceivedDengo.created_at)} tone="neutral" />
          ) : (
            <Badge label="Dengo" tone="neutral" />
          )}
        </View>

        {replyToast ? (
          <View style={styles.replyToast}>
            <Text style={styles.replyToastText}>{replyToast}</Text>
          </View>
        ) : null}

        {latestReceivedDengo ? (
          <View style={styles.dengoBubble}>
            <View style={styles.dengoHeaderRow}>
              <Text style={styles.dengoEmoji}>{latestReceivedDengo.emoji ?? '🤍'}</Text>
              <View style={styles.flexOne}>
                <Text style={styles.dengoSender}>
                  {partnerFirstName} enviou: {latestReceivedDengo.label ?? 'Dengo'}
                </Text>
                {latestReceivedDengo.message ? (
                  <Text style={styles.dengoMessage}>“{latestReceivedDengo.message}”</Text>
                ) : null}
              </View>
            </View>
            {latestReceivedDengo.kind === 'drawing' ? (
              <DrawingPreview rawDrawing={latestReceivedDengo.drawing_url} height={120} />
            ) : null}
          </View>
        ) : (
          <View style={styles.dengoBubble}>
            <Text style={styles.dengoMessage}>
              Nenhum Dengo recebido ainda. Envie o primeiro carinho na aba Tarefas → Dengo!
            </Text>
          </View>
        )}

        {replyOpen ? (
          <View style={styles.quickReplyBox}>
            <Input
              placeholder="Escreva um recadinho rápido (opcional)..."
              value={replyText}
              onChangeText={setReplyText}
            />
            <View style={styles.quickEmojiRow}>
              {[
                { emoji: '😘', label: 'Beijo' },
                { emoji: '🫂', label: 'Abraço' },
                { emoji: '❤️', label: 'Te amo' },
              ].map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => void handleQuickReply(opt.emoji, opt.label)}
                  style={styles.quickEmojiPill}>
                  <Text style={styles.quickEmojiText}>
                    {opt.emoji} {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.pulseFooterRow}>
            <Button
              title="Resposta rápida"
              variant="secondary"
              size="sm"
              fullWidth={false}
              style={styles.flexOne}
              onPress={() => setReplyOpen(true)}
              icon={<Ionicons name="heart-outline" size={16} color={Palette.primaryPressed} />}
            />
            <Button
              title="Abrir Dengo"
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={() => router.push('/(tabs)/tasks')}
            />
          </View>
        )}
      </Card>

      {/* 3. Radar do Dia */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.rowCenter}>
            <Ionicons name="sunny-outline" size={18} color={Palette.primary} />
            <Text style={styles.sectionTitle}>Radar do Dia</Text>
          </View>
        </View>

        <View style={styles.radarList}>
          {/* Ciclo / Cuidado / Mood do Par */}
          <Pressable
            onPress={() => router.push('/(tabs)/calendar')}
            style={styles.radarItem}>
            <View style={[styles.radarIcon, { backgroundColor: Palette.secondarySoft }]}>
              <Ionicons name="flower-outline" size={18} color={Palette.primary} />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.radarTitle}>Sintonia & Cuidado</Text>
              <Text style={styles.radarSubtitle}>
                {radar.cycleStatusLabel ?? 'Nenhum registro recente do ciclo'}
                {partnerMood
                  ? ` • ${partnerFirstName} está ${partnerMood.mood_emoji} ${
                      partnerMoodPreset?.label ?? partnerMood.mood_key
                    }`
                  : ''}
              </Text>
              {partnerMood?.care_suggestions?.[0] ? (
                <Text style={styles.radarTip}>
                  Dica: {partnerMood.care_suggestions[0]}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
          </Pressable>

          {/* Próximo evento com contagem regressiva */}
          <Pressable
            onPress={() => router.push('/(tabs)/calendar')}
            style={styles.radarItem}>
            <View style={[styles.radarIcon, { backgroundColor: Palette.infoSoft }]}>
              <Ionicons name="calendar-outline" size={18} color={Palette.info} />
            </View>
            <View style={styles.flexOne}>
              <View style={styles.rowBetween}>
                <Text style={styles.radarTitle}>Próximo evento</Text>
                {radar.upcomingEvent ? (
                  <Badge
                    label={formatCountdown(radar.upcomingEvent.starts_at)}
                    tone="primary"
                  />
                ) : null}
              </View>
              <Text style={styles.radarSubtitle}>
                {radar.upcomingEvent
                  ? `${radar.upcomingEvent.title}${
                      radar.upcomingEvent.venue ? ` • ${radar.upcomingEvent.venue}` : ''
                    }`
                  : 'Nenhum evento futuro agendado na agenda compartilhada.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
          </Pressable>

          {/* Pendências rápidas de Tarefas */}
          <Pressable
            onPress={() => router.push('/(tabs)/tasks')}
            style={styles.radarItem}>
            <View style={[styles.radarIcon, { backgroundColor: Palette.successSoft }]}>
              <Ionicons name="checkbox-outline" size={18} color={Palette.success} />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.radarTitle}>
                Rotinas de Casa ({pendingTasks.length}{' '}
                {pendingTasks.length === 1 ? 'pendente' : 'pendentes'})
              </Text>
              <Text style={styles.radarSubtitle} numberOfLines={2}>
                {pendingTasks.length > 0
                  ? pendingTasks
                      .slice(0, 2)
                      .map((t) => t.title)
                      .join(' • ')
                  : 'Todas as tarefas domésticas estão concluídas!'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
          </Pressable>

          {/* Despensa & Compras */}
          <Pressable
            onPress={() => router.push('/(tabs)/lists')}
            style={styles.radarItem}>
            <View style={[styles.radarIcon, { backgroundColor: Palette.warningSoft }]}>
              <Ionicons name="basket-outline" size={18} color={Palette.warning} />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.radarTitle}>Despensa & Lista de Compra</Text>
              <Text style={styles.radarSubtitle}>
                {radar.pantryLowCount} em baixa na despensa • {radar.shoppingPendingCount} itens
                na lista de mercado
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
          </Pressable>
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  greeting: {
    ...Typography.caption,
    color: Palette.textSecondary,
  },
  subGreeting: {
    ...Typography.h1,
    color: Palette.text,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  flexOne: {
    flex: 1,
  },
  counterCard: {
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  counterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterTitle: {
    ...Typography.h3,
    color: Palette.text,
  },
  counterGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  counterBox: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  counterNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.primaryPressed,
  },
  counterUnit: {
    ...Typography.caption,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  careAlertCard: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderColor: Palette.primarySoft,
  },
  careEmoji: {
    fontSize: 26,
  },
  careKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: Palette.primaryPressed,
  },
  careActionsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  sectionCard: {
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...Typography.h3,
    color: Palette.text,
  },
  replyToast: {
    backgroundColor: Palette.successSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  replyToastText: {
    ...Typography.captionBold,
    color: Palette.success,
  },
  dengoBubble: {
    gap: Spacing.sm,
    backgroundColor: Palette.surfaceSubtle,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  dengoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dengoEmoji: {
    fontSize: 32,
  },
  dengoSender: {
    ...Typography.captionBold,
    color: Palette.text,
  },
  dengoMessage: {
    ...Typography.caption,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  pulseFooterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  quickReplyBox: {
    gap: Spacing.xs,
  },
  quickEmojiRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  quickEmojiPill: {
    flex: 1,
    minWidth: 92,
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceAccent,
    borderWidth: 1,
    borderColor: Palette.primarySoft,
  },
  quickEmojiText: {
    ...Typography.captionBold,
    color: Palette.primaryPressed,
  },
  radarList: {
    gap: Spacing.md,
  },
  radarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  radarIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarTitle: {
    ...Typography.bodyMedium,
    color: Palette.text,
  },
  radarSubtitle: {
    ...Typography.caption,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  radarTip: {
    ...Typography.captionBold,
    color: Palette.primary,
    marginTop: 3,
  },
});

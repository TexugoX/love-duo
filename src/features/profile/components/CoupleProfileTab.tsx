import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Input } from '@/components/ui';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { unlinkCouple } from '@/features/couple/services/coupleService';
import { updateCoupleProfile } from '@/features/profile/services/profileService';
import {
  ABOUT_US_QUESTIONS,
  RELATIONSHIP_STATUS_LABELS,
  type RelationshipStatus,
} from '@/types/database';

const STATUS_OPTIONS: RelationshipStatus[] = [
  'dating',
  'engaged',
  'married',
  'living_together',
];

function formatDateBr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTimeBr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '00:00';
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function maskTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function parseBrDateTime(dateStr: string, timeStr: string): Date | null {
  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeStr.trim());
  if (!dateMatch || !timeMatch) return null;

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function CoupleProfileTab() {
  const {
    profile,
    partner,
    couple,
    isPreviewMode,
    updateLocalCouple,
    refreshUserData,
    enterPreviewMode,
  } = useAuth();

  const [status, setStatus] = useState<RelationshipStatus>(
    couple?.relationship_status ?? 'dating'
  );
  const [dateInput, setDateInput] = useState(() =>
    couple?.started_at ? formatDateBr(couple.started_at) : formatDateBr(new Date().toISOString())
  );
  const [timeInput, setTimeInput] = useState(() =>
    couple?.started_at ? formatTimeBr(couple.started_at) : '20:00'
  );
  const [answers, setAnswers] = useState<Record<string, string>>(couple?.about_answers ?? {});

  const [savingMain, setSavingMain] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (!couple) return;
    setStatus(couple.relationship_status);
    setDateInput(formatDateBr(couple.started_at));
    setTimeInput(formatTimeBr(couple.started_at));
    setAnswers(couple.about_answers ?? {});
  }, [couple]);

  const handleSaveStatusAndDate = async () => {
    if (!couple?.id) return;
    setFeedback(null);

    const parsedDate = parseBrDateTime(dateInput, timeInput);
    if (!parsedDate) {
      setFeedback({
        type: 'error',
        text: 'Informe uma data válida (DD/MM/AAAA) e hora válida (HH:MM).',
      });
      return;
    }

    if (parsedDate.getTime() > Date.now()) {
      setFeedback({
        type: 'error',
        text: 'A data de início da relação não pode estar no futuro.',
      });
      return;
    }

    const startedAtIso = parsedDate.toISOString();

    try {
      setSavingMain(true);
      if (!isPreviewMode) {
        await updateCoupleProfile(couple.id, {
          relationship_status: status,
          started_at: startedAtIso,
        });
      }
      updateLocalCouple({
        relationship_status: status,
        started_at: startedAtIso,
      });
      setFeedback({
        type: 'success',
        text: 'Status e data de início atualizados! O contador da aba Início já foi sincronizado.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao atualizar dados do casal.',
      });
    } finally {
      setSavingMain(false);
    }
  };

  const handleSaveAbout = async () => {
    if (!couple?.id) return;
    setFeedback(null);

    try {
      setSavingAbout(true);
      if (!isPreviewMode) {
        await updateCoupleProfile(couple.id, { about_answers: answers });
      }
      updateLocalCouple({ about_answers: answers });
      setFeedback({ type: 'success', text: 'Respostas “Sobre nós” salvas com carinho!' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar respostas.',
      });
    } finally {
      setSavingAbout(false);
    }
  };

  const handleUnlink = () => {
    if (isPreviewMode) {
      enterPreviewMode('connect');
      return;
    }

    Alert.alert(
      'Desvincular casal',
      'Tem certeza que deseja encerrar o vínculo atual? Vocês poderão se reconectar depois.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              setUnlinking(true);
              await unlinkCouple();
              await refreshUserData();
            } catch (err) {
              Alert.alert(
                'Erro',
                err instanceof Error ? err.message : 'Não foi possível desvincular.'
              );
            } finally {
              setUnlinking(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.stack}>
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

      {/* Cabeçalho do casal */}
      <Card variant="accent" style={styles.card}>
        <View style={styles.coupleRow}>
          <View style={styles.miniAvatar}>
            <Text style={styles.miniAvatarText}>
              {(profile?.full_name ?? 'V').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Ionicons name="heart" size={22} color={Palette.primary} />
          <View style={styles.miniAvatar}>
            <Text style={styles.miniAvatarText}>
              {(partner?.full_name ?? 'P').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.coupleNames}>
          {profile?.full_name} & {partner?.full_name ?? 'Seu par'}
        </Text>
        <View style={styles.centerBadge}>
          <Badge label={RELATIONSHIP_STATUS_LABELS[status]} tone="primary" />
        </View>
      </Card>

      {/* Status + Data e Hora de Início */}
      <Card style={styles.card}>
        <View style={styles.rowCenter}>
          <Ionicons name="heart-circle-outline" size={20} color={Palette.primary} />
          <Text style={styles.cardTitle}>Status & Início da Relação</Text>
        </View>
        <Text style={styles.cardBody}>
          O contador exato da aba Início (anos, meses, dias e horas) usa esta data e hora.
        </Text>

        <View style={styles.statusGrid}>
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setStatus(opt)}
                style={[styles.statusChip, active && styles.statusChipActive]}>
                <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                  {RELATIONSHIP_STATUS_LABELS[opt]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dateTimeRow}>
          <View style={styles.dateWrap}>
            <Input
              label="Data de início"
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              maxLength={10}
              value={dateInput}
              onChangeText={(text) => setDateInput(maskDateInput(text))}
            />
          </View>
          <View style={styles.timeWrap}>
            <Input
              label="Hora"
              placeholder="HH:MM"
              keyboardType="number-pad"
              maxLength={5}
              value={timeInput}
              onChangeText={(text) => setTimeInput(maskTimeInput(text))}
            />
          </View>
        </View>

        <Button
          title="Salvar status e data"
          loading={savingMain}
          onPress={handleSaveStatusAndDate}
        />
      </Card>

      {/* Sobre nós / Perguntas básicas */}
      <Card style={styles.card}>
        <View style={styles.rowCenter}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={Palette.primary} />
          <Text style={styles.cardTitle}>Sobre nós</Text>
        </View>
        <Text style={styles.cardBody}>
          Pequenos marcos da história de vocês dois para guardar com carinho.
        </Text>

        <View style={styles.questionsList}>
          {ABOUT_US_QUESTIONS.map((q) => (
            <Input
              key={q.key}
              label={q.label}
              placeholder={q.placeholder}
              value={answers[q.key] ?? ''}
              onChangeText={(text) =>
                setAnswers((prev) => ({
                  ...prev,
                  [q.key]: text,
                }))
              }
            />
          ))}
        </View>

        <Button
          title="Salvar Sobre nós"
          variant="secondary"
          loading={savingAbout}
          onPress={handleSaveAbout}
        />
      </Card>

      {/* Gestão / Desvinculação */}
      <Card variant="subtle" style={styles.card}>
        <Text style={styles.cardTitle}>Gestão do vínculo</Text>
        <Text style={styles.cardBody}>
          Cada conta mantém apenas 1 vínculo ativo por vez. Ao desvincular, você voltará para a
          tela “Conectar meu par”.
        </Text>
        <Button
          title={isPreviewMode ? 'Ir para tela Conectar meu par' : 'Desvincular casal'}
          variant="danger"
          size="sm"
          loading={unlinking}
          onPress={handleUnlink}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.md,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  feedbackError: {
    backgroundColor: Palette.dangerSoft,
  },
  feedbackSuccess: {
    backgroundColor: Palette.successSoft,
  },
  feedbackText: {
    ...Typography.caption,
    fontWeight: '600',
    flex: 1,
  },
  card: {
    gap: Spacing.sm,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardTitle: {
    ...Typography.h3,
    color: Palette.text,
  },
  cardBody: {
    ...Typography.caption,
    color: Palette.textSecondary,
  },
  coupleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  miniAvatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Palette.surface,
    borderWidth: 1.5,
    borderColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    ...Typography.h3,
    color: Palette.primaryPressed,
  },
  coupleNames: {
    ...Typography.h3,
    color: Palette.text,
    textAlign: 'center',
  },
  centerBadge: {
    alignItems: 'center',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceSubtle,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  statusChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  statusChipText: {
    ...Typography.captionBold,
    color: Palette.textSecondary,
  },
  statusChipTextActive: {
    color: Palette.textOnPrimary,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 2,
  },
  dateWrap: {
    flex: 1.4,
  },
  timeWrap: {
    flex: 1,
  },
  questionsList: {
    gap: Spacing.sm,
    marginTop: 2,
  },
});

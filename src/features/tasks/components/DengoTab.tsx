import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Input } from '@/components/ui';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCoupleData } from '@/features/couple/context/CoupleDataContext';
import { DrawingPreview } from '@/features/tasks/components/DrawingPreview';
import { VisualMuralCanvas } from '@/features/tasks/components/VisualMuralCanvas';
import { MOOD_PRESETS, type DengoInteraction } from '@/types/database';

function formatRelativeTime(iso: string): string {
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

interface DengoTabProps {
  onDrawingStateChange?: (isDrawing: boolean) => void;
}

export function DengoTab({ onDrawingStateChange }: DengoTabProps) {
  const { profile, partner } = useAuth();
  const {
    dengoShortcuts,
    careButtons,
    dengoHistory,
    myMood,
    partnerMood,
    addShortcut,
    removeShortcut,
    addCareButton,
    removeCareButton,
    sendEmoji,
    sendDrawing,
    sendCareRequest,
    respondCareRequest,
    saveMood,
  } = useCoupleData();

  // Reações em emojis + atalhos personalizados
  const [quickMessage, setQuickMessage] = useState('');
  const [addingShortcut, setAddingShortcut] = useState(false);
  const [newShortcutEmoji, setNewShortcutEmoji] = useState('');
  const [newShortcutLabel, setNewShortcutLabel] = useState('');

  // Pedir Dengo (botões editáveis)
  const [editingCareButtons, setEditingCareButtons] = useState(false);
  const [newCareEmoji, setNewCareEmoji] = useState('');
  const [newCareLabel, setNewCareLabel] = useState('');
  const [careNote, setCareNote] = useState('');

  // Mood do dia
  const [moodNote, setMoodNote] = useState(myMood?.note ?? '');

  // Toast simples
  const [sentBanner, setSentBanner] = useState<string | null>(null);

  const partnerFirstName = (partner?.full_name ?? 'Seu par').split(' ')[0];

  const pendingIncomingCare = useMemo(
    () =>
      dengoHistory.filter(
        (item) =>
          item.kind === 'care_request' &&
          item.receiver_id === profile?.id &&
          item.care_status === 'pending'
      ),
    [dengoHistory, profile?.id]
  );

  const showToast = (text: string) => {
    setSentBanner(text);
    setTimeout(() => setSentBanner(null), 2800);
  };

  const handleSendEmoji = async (emoji: string, label: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await sendEmoji(emoji, label, quickMessage);
    setQuickMessage('');
    showToast(`${emoji} ${label} enviado para ${partnerFirstName}!`);
  };

  const handleAddShortcut = async () => {
    if (!newShortcutEmoji.trim() || !newShortcutLabel.trim()) return;
    await addShortcut(newShortcutEmoji, newShortcutLabel);
    setNewShortcutEmoji('');
    setNewShortcutLabel('');
    setAddingShortcut(false);
  };

  const handleSendCare = async (emoji: string, label: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await sendCareRequest(emoji, label, careNote);
    setCareNote('');
    showToast(`Pedido “${label}” enviado para ${partnerFirstName}!`);
  };

  const handleAddCareButton = async () => {
    if (!newCareLabel.trim()) return;
    await addCareButton(newCareEmoji || '🤍', newCareLabel);
    setNewCareEmoji('');
    setNewCareLabel('');
  };

  const handleSelectMood = async (moodKey: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    await saveMood(moodKey, moodNote);
    showToast('Mood do dia atualizado!');
  };

  const partnerMoodPreset = partnerMood
    ? MOOD_PRESETS.find((m) => m.key === partnerMood.mood_key)
    : null;

  return (
    <View style={styles.stack}>
      {sentBanner ? (
        <View style={styles.toastBox}>
          <Ionicons name="heart" size={16} color={Palette.primaryPressed} />
          <Text style={styles.toastText}>{sentBanner}</Text>
        </View>
      ) : null}

      {/* Alerta de Pedir Dengo recebido pendente */}
      {pendingIncomingCare.map((alertItem) => (
        <Card key={alertItem.id} variant="accent" style={styles.alertCard}>
          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}>
              <Text style={styles.alertEmoji}>{alertItem.emoji ?? '🤍'}</Text>
              <View>
                <Text style={styles.alertKicker}>PEDIDO DE DENGO RECEBIDO</Text>
                <Text style={styles.alertTitle}>
                  {partnerFirstName}: {alertItem.label}
                </Text>
              </View>
            </View>
            <Badge label={formatRelativeTime(alertItem.created_at)} tone="warning" />
          </View>

          {alertItem.message ? (
            <Text style={styles.alertMessage}>“{alertItem.message}”</Text>
          ) : null}

          <View style={styles.alertActions}>
            <Button
              title="ESTOU INDO"
              size="sm"
              fullWidth={false}
              style={styles.flexOne}
              onPress={() => void respondCareRequest(alertItem.id, 'on_my_way')}
            />
            <Button
              title="NÃO CONSIGO AGORA"
              variant="outline"
              size="sm"
              fullWidth={false}
              style={styles.flexOne}
              onPress={() => void respondCareRequest(alertItem.id, 'cant_now')}
            />
          </View>
        </Card>
      ))}

      {/* 1. Reações em Emojis + Recadinho rápido */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Ionicons name="happy-outline" size={20} color={Palette.primary} />
            <Text style={styles.cardTitle}>Reações Rápidas</Text>
          </View>
          <Pressable onPress={() => setAddingShortcut((prev) => !prev)} hitSlop={8}>
            <Text style={styles.linkAction}>
              {addingShortcut ? 'Fechar' : '+ Personalizar'}
            </Text>
          </Pressable>
        </View>

        <Input
          placeholder="Recadinho rápido opcional antes de tocar no emoji..."
          value={quickMessage}
          onChangeText={setQuickMessage}
        />

        <View style={styles.shortcutGrid}>
          {dengoShortcuts.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => void handleSendEmoji(item.emoji, item.label)}
              style={({ pressed }) => [
                styles.shortcutBtn,
                pressed && styles.shortcutBtnPressed,
              ]}>
              <Text style={styles.shortcutEmoji}>{item.emoji}</Text>
              <Text style={styles.shortcutLabel} numberOfLines={1}>
                {item.label}
              </Text>
              {!item.is_default && addingShortcut ? (
                <Pressable
                  onPress={() => void removeShortcut(item.id)}
                  hitSlop={6}
                  style={styles.removeBadge}>
                  <Ionicons name="close-circle" size={16} color={Palette.danger} />
                </Pressable>
              ) : null}
            </Pressable>
          ))}
        </View>

        {addingShortcut ? (
          <View style={styles.inlineEditor}>
            <Text style={styles.editorTitle}>Novo atalho do casal</Text>
            <View style={styles.inlineInputs}>
              <View style={styles.emojiInputWrap}>
                <Input
                  placeholder="🍕"
                  maxLength={4}
                  value={newShortcutEmoji}
                  onChangeText={setNewShortcutEmoji}
                />
              </View>
              <View style={styles.flexOne}>
                <Input
                  placeholder="Ex.: Noite de pizza"
                  value={newShortcutLabel}
                  onChangeText={setNewShortcutLabel}
                />
              </View>
            </View>
            <Button
              title="Adicionar atalho"
              variant="secondary"
              size="sm"
              disabled={!newShortcutEmoji.trim() || !newShortcutLabel.trim()}
              onPress={handleAddShortcut}
            />
          </View>
        ) : null}
      </Card>

      {/* 2. Pedir Dengo (Botões editáveis de cuidado) */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Ionicons name="medkit-outline" size={20} color={Palette.primary} />
            <Text style={styles.cardTitle}>Pedir Dengo (Cuidado)</Text>
          </View>
          <Pressable onPress={() => setEditingCareButtons((prev) => !prev)} hitSlop={8}>
            <Text style={styles.linkAction}>
              {editingCareButtons ? 'Concluir' : 'Editar botões'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.cardSubtext}>
          Toque para enviar um pedido de cuidado. {partnerFirstName} receberá alerta com
          “ESTOU INDO” ou “NÃO CONSIGO AGORA”.
        </Text>

        <Input
          placeholder="Detalhe opcional (ex.: dor de cabeça, tô no quarto)..."
          value={careNote}
          onChangeText={setCareNote}
        />

        <View style={styles.careGrid}>
          {careButtons.map((btn) => (
            <Pressable
              key={btn.id}
              onPress={() => {
                if (!editingCareButtons) {
                  void handleSendCare(btn.emoji, btn.label);
                }
              }}
              style={({ pressed }) => [
                styles.careBtn,
                pressed && !editingCareButtons && styles.shortcutBtnPressed,
              ]}>
              <Text style={styles.careEmoji}>{btn.emoji}</Text>
              <Text style={styles.careLabel}>{btn.label}</Text>
              {editingCareButtons ? (
                <Pressable
                  onPress={() => void removeCareButton(btn.id)}
                  hitSlop={8}
                  style={styles.careDeleteIcon}>
                  <Ionicons name="trash-outline" size={16} color={Palette.danger} />
                </Pressable>
              ) : null}
            </Pressable>
          ))}
        </View>

        {editingCareButtons ? (
          <View style={styles.inlineEditor}>
            <Text style={styles.editorTitle}>Adicionar botão de cuidado</Text>
            <View style={styles.inlineInputs}>
              <View style={styles.emojiInputWrap}>
                <Input
                  placeholder="🍵"
                  maxLength={4}
                  value={newCareEmoji}
                  onChangeText={setNewCareEmoji}
                />
              </View>
              <View style={styles.flexOne}>
                <Input
                  placeholder="Ex.: Chá quentinho"
                  value={newCareLabel}
                  onChangeText={setNewCareLabel}
                />
              </View>
            </View>
            <Button
              title="Adicionar botão"
              variant="secondary"
              size="sm"
              disabled={!newCareLabel.trim()}
              onPress={handleAddCareButton}
            />
          </View>
        ) : null}
      </Card>

      {/* 3. Mural Visual */}
      <Card style={styles.card}>
        <View style={styles.rowCenter}>
          <Ionicons name="brush-outline" size={20} color={Palette.primary} />
          <Text style={styles.cardTitle}>Mural Visual</Text>
        </View>
        <Text style={styles.cardSubtext}>
          Desenhe um bilhete rápido estilo papel ou lousa para aparecer no histórico e no Início.
        </Text>
        <VisualMuralCanvas
          onDrawingStateChange={onDrawingStateChange}
          onSend={async (drawing, cap) => {
            await sendDrawing(drawing, cap);
            showToast(`Bilhete visual enviado para ${partnerFirstName}!`);
          }}
        />
      </Card>

      {/* 4. Mood do Dia + Sugestões de cuidado */}
      <Card style={styles.card}>
        <View style={styles.rowCenter}>
          <Ionicons name="sunny-outline" size={20} color={Palette.primary} />
          <Text style={styles.cardTitle}>Mood do Dia</Text>
        </View>
        <Text style={styles.cardSubtext}>
          Como você está se sentindo hoje? Seu par verá sugestões práticas de carinho.
        </Text>

        <View style={styles.moodGrid}>
          {MOOD_PRESETS.map((preset) => {
            const active = myMood?.mood_key === preset.key;
            return (
              <Pressable
                key={preset.key}
                onPress={() => void handleSelectMood(preset.key)}
                style={[styles.moodChip, active && styles.moodChipActive]}>
                <Text style={styles.moodEmoji}>{preset.emoji}</Text>
                <Text style={[styles.moodLabel, active && styles.moodLabelActive]}>
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Input
          placeholder="Nota opcional sobre seu dia..."
          value={moodNote}
          onChangeText={setMoodNote}
          onSubmitEditing={() => {
            if (myMood) void saveMood(myMood.mood_key, moodNote);
          }}
        />

        {partnerMood ? (
          <View style={styles.partnerMoodBox}>
            <View style={styles.rowBetween}>
              <Text style={styles.partnerMoodTitle}>
                {partnerMood.mood_emoji} {partnerFirstName} hoje:{' '}
                {partnerMoodPreset?.label ?? partnerMood.mood_key}
              </Text>
              <Badge label="Sugestões" tone="primary" />
            </View>
            {partnerMood.note ? (
              <Text style={styles.partnerMoodNote}>“{partnerMood.note}”</Text>
            ) : null}
            <View style={styles.suggestionsList}>
              {(partnerMood.care_suggestions ?? []).map((tip, index) => (
                <View key={`tip-${index}`} style={styles.suggestionRow}>
                  <Ionicons name="sparkles" size={14} color={Palette.primary} />
                  <Text style={styles.suggestionText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </Card>

      {/* 5. Histórico cronológico */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Ionicons name="time-outline" size={20} color={Palette.primary} />
            <Text style={styles.cardTitle}>Histórico de Dengos</Text>
          </View>
          <Badge label={`${dengoHistory.length}`} tone="neutral" />
        </View>

        {dengoHistory.length === 0 ? (
          <Text style={styles.emptyHistory}>
            Ainda não há interações registradas. Envie o primeiro emoji ou bilhete visual!
          </Text>
        ) : (
          <View style={styles.historyList}>
            {dengoHistory.map((item: DengoInteraction) => {
              const isMine = item.sender_id === profile?.id;
              return (
                <View
                  key={item.id}
                  style={[styles.historyItem, isMine ? styles.historyMine : styles.historyPartner]}>
                  <View style={styles.rowBetween}>
                    <View style={styles.rowCenter}>
                      <Text style={styles.historyEmoji}>{item.emoji ?? '🤍'}</Text>
                      <Text style={styles.historyTitle}>
                        {isMine ? 'Você' : partnerFirstName} • {item.label ?? 'Dengo'}
                      </Text>
                    </View>
                    <Text style={styles.historyTime}>{formatRelativeTime(item.created_at)}</Text>
                  </View>

                  {item.message ? (
                    <Text style={styles.historyMessage}>“{item.message}”</Text>
                  ) : null}

                  {item.kind === 'drawing' ? (
                    <View style={styles.historyDrawingWrap}>
                      <DrawingPreview rawDrawing={item.drawing_url} height={135} />
                    </View>
                  ) : null}

                  {item.kind === 'care_request' ? (
                    <View style={styles.careStatusRow}>
                      {item.care_status === 'on_my_way' ? (
                        <Badge label="✓ ESTOU INDO" tone="success" />
                      ) : item.care_status === 'cant_now' ? (
                        <Badge label="NÃO CONSIGO AGORA" tone="warning" />
                      ) : (
                        <Badge label="Aguardando resposta" tone="neutral" />
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.md,
  },
  flexOne: {
    flex: 1,
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
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Palette.surfaceAccent,
    borderColor: Palette.primarySoft,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  toastText: {
    ...Typography.captionBold,
    color: Palette.primaryPressed,
    flex: 1,
  },
  alertCard: {
    gap: Spacing.sm,
  },
  alertEmoji: {
    fontSize: 28,
  },
  alertKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: Palette.primaryPressed,
  },
  alertTitle: {
    ...Typography.h3,
    color: Palette.text,
  },
  alertMessage: {
    ...Typography.body,
    color: Palette.textSecondary,
  },
  alertActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  card: {
    gap: Spacing.sm,
  },
  cardTitle: {
    ...Typography.h3,
    color: Palette.text,
  },
  cardSubtext: {
    ...Typography.caption,
    color: Palette.textSecondary,
  },
  linkAction: {
    ...Typography.captionBold,
    color: Palette.primary,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.surfaceSubtle,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  shortcutBtnPressed: {
    backgroundColor: Palette.surfaceAccent,
    borderColor: Palette.primarySoft,
    transform: [{ scale: 0.97 }],
  },
  shortcutEmoji: {
    fontSize: 18,
  },
  shortcutLabel: {
    ...Typography.captionBold,
    color: Palette.text,
    maxWidth: 130,
  },
  removeBadge: {
    marginLeft: 2,
  },
  inlineEditor: {
    backgroundColor: Palette.surfaceSubtle,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  editorTitle: {
    ...Typography.captionBold,
    color: Palette.text,
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  emojiInputWrap: {
    width: 68,
  },
  careGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  careBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Palette.surfaceSubtle,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  careEmoji: {
    fontSize: 20,
  },
  careLabel: {
    ...Typography.captionBold,
    color: Palette.text,
    flex: 1,
  },
  careDeleteIcon: {
    padding: 2,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceSubtle,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  moodChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodLabel: {
    ...Typography.captionBold,
    color: Palette.textSecondary,
  },
  moodLabelActive: {
    color: Palette.textOnPrimary,
  },
  partnerMoodBox: {
    backgroundColor: Palette.surfaceSubtle,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.primarySoft,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  partnerMoodTitle: {
    ...Typography.captionBold,
    color: Palette.text,
    flex: 1,
  },
  partnerMoodNote: {
    ...Typography.caption,
    color: Palette.textSecondary,
    fontStyle: 'italic',
  },
  suggestionsList: {
    gap: 6,
    marginTop: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  suggestionText: {
    ...Typography.caption,
    color: Palette.text,
    flex: 1,
  },
  emptyHistory: {
    ...Typography.caption,
    color: Palette.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  historyList: {
    gap: Spacing.sm,
  },
  historyItem: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 6,
    borderWidth: 1,
  },
  historyMine: {
    backgroundColor: Palette.surfaceSubtle,
    borderColor: Palette.border,
  },
  historyPartner: {
    backgroundColor: '#FFFDFB',
    borderColor: Palette.primarySoft,
  },
  historyEmoji: {
    fontSize: 18,
  },
  historyTitle: {
    ...Typography.captionBold,
    color: Palette.text,
  },
  historyTime: {
    ...Typography.caption,
    color: Palette.textMuted,
  },
  historyMessage: {
    ...Typography.body,
    color: Palette.textSecondary,
  },
  historyDrawingWrap: {
    marginTop: 4,
  },
  careStatusRow: {
    marginTop: 2,
  },
});

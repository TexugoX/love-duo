import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Input } from '@/components/ui';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCoupleData } from '@/features/couple/context/CoupleDataContext';
import {
  TASK_RECURRENCE_LABELS,
  type HouseholdTask,
  type TaskRecurrence,
} from '@/types/database';

type FilterMode = 'pending' | 'completed' | 'all';

const RECURRENCE_OPTIONS: TaskRecurrence[] = ['once', 'daily', 'weekly', 'biweekly', 'monthly'];

export function HouseholdTasksTab() {
  const { profile, partner } = useAuth();
  const { householdTasks, addTask, toggleTask, removeTask } = useCoupleData();

  const [filter, setFilter] = useState<FilterMode>('pending');
  const [composerOpen, setComposerOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('weekly');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myFirstName = (profile?.full_name ?? 'Eu').split(' ')[0];
  const partnerFirstName = (partner?.full_name ?? 'Par').split(' ')[0];

  const pendingCount = useMemo(
    () => householdTasks.filter((t) => !t.is_completed).length,
    [householdTasks]
  );
  const completedCount = householdTasks.length - pendingCount;

  const filteredTasks = useMemo(() => {
    if (filter === 'pending') return householdTasks.filter((t) => !t.is_completed);
    if (filter === 'completed') return householdTasks.filter((t) => t.is_completed);
    return householdTasks;
  }, [filter, householdTasks]);

  const getAssigneeLabel = (assigneeId: string | null) => {
    if (!assigneeId) return 'Casal';
    if (assigneeId === profile?.id) return myFirstName;
    if (assigneeId === partner?.id) return partnerFirstName;
    return 'Casal';
  };

  const handleCreate = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Digite o nome da tarefa doméstica.');
      return;
    }

    try {
      setSaving(true);
      await addTask({
        title,
        notes,
        recurrence,
        assignedTo,
      });
      setTitle('');
      setNotes('');
      setRecurrence('weekly');
      setAssignedTo(null);
      setComposerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar tarefa.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (task: HouseholdTask) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    void toggleTask(task);
  };

  return (
    <View style={styles.stack}>
      {/* Resumo + botão de nova rotina */}
      <Card variant="subtle" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryTitle}>Rotina da casa</Text>
            <Text style={styles.summarySubtitle}>
              {pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'} • {completedCount}{' '}
              {completedCount === 1 ? 'concluída' : 'concluídas'}
            </Text>
          </View>
          <Button
            title={composerOpen ? 'Fechar' : 'Nova tarefa'}
            size="sm"
            fullWidth={false}
            variant={composerOpen ? 'outline' : 'primary'}
            onPress={() => setComposerOpen((prev) => !prev)}
            icon={
              <Ionicons
                name={composerOpen ? 'close' : 'add'}
                size={16}
                color={composerOpen ? Palette.text : Palette.textOnPrimary}
              />
            }
          />
        </View>

        <View style={styles.filterRow}>
          {(
            [
              { key: 'pending', label: `Pendentes (${pendingCount})` },
              { key: 'completed', label: `Concluídas (${completedCount})` },
              { key: 'all', label: 'Todas' },
            ] as { key: FilterMode; label: string }[]
          ).map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[styles.filterPill, active && styles.filterPillActive]}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Formulário inline de nova tarefa */}
      {composerOpen ? (
        <Card style={styles.composerCard}>
          <Text style={styles.composerTitle}>Adicionar afazer compartilhado</Text>

          <Input
            label="O que precisa ser feito?"
            placeholder="Ex.: Lavar roupa branca, tirar o lixo..."
            value={title}
            onChangeText={setTitle}
          />

          <Input
            label="Observação (opcional)"
            placeholder="Detalhes rápidos..."
            value={notes}
            onChangeText={setNotes}
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Recorrência</Text>
            <View style={styles.chipRow}>
              {RECURRENCE_OPTIONS.map((rec) => {
                const active = recurrence === rec;
                return (
                  <Pressable
                    key={rec}
                    onPress={() => setRecurrence(rec)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {TASK_RECURRENCE_LABELS[rec]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Responsável</Text>
            <View style={styles.chipRow}>
              {[
                { id: null, label: 'Qualquer um' },
                { id: profile?.id ?? null, label: myFirstName },
                ...(partner?.id ? [{ id: partner.id, label: partnerFirstName }] : []),
              ].map((person) => {
                const active = assignedTo === person.id;
                return (
                  <Pressable
                    key={person.label}
                    onPress={() => setAssignedTo(person.id)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {person.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button title="Salvar tarefa" loading={saving} onPress={handleCreate} />
        </Card>
      ) : null}

      {/* Lista de tarefas */}
      {filteredTasks.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="checkmark-done-circle-outline" size={34} color={Palette.primarySoft} />
          <Text style={styles.emptyTitle}>
            {filter === 'pending'
              ? 'Tudo em ordem por aqui!'
              : 'Nenhuma tarefa encontrada neste filtro.'}
          </Text>
          <Text style={styles.emptySubtitle}>
            Toque em “Nova tarefa” para adicionar um afazer compartilhado em tempo real.
          </Text>
        </Card>
      ) : (
        <View style={styles.listStack}>
          {filteredTasks.map((task) => (
            <Card key={task.id} style={styles.taskCard} padded={false}>
              <Pressable
                onPress={() => handleToggle(task)}
                style={styles.taskRow}>
                <View
                  style={[
                    styles.checkbox,
                    task.is_completed && styles.checkboxChecked,
                  ]}>
                  {task.is_completed ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : null}
                </View>

                <View style={styles.taskBody}>
                  <Text
                    style={[
                      styles.taskTitle,
                      task.is_completed && styles.taskTitleDone,
                    ]}>
                    {task.title}
                  </Text>
                  {task.notes ? (
                    <Text style={styles.taskNotes}>{task.notes}</Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <Badge
                      label={TASK_RECURRENCE_LABELS[task.recurrence]}
                      tone="neutral"
                    />
                    <Badge
                      label={getAssigneeLabel(task.assigned_to)}
                      tone={task.is_completed ? 'success' : 'primary'}
                    />
                  </View>
                </View>

                <Pressable
                  onPress={() => void removeTask(task.id)}
                  hitSlop={10}
                  style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={Palette.textMuted} />
                </Pressable>
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.md,
  },
  summaryCard: {
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  summaryTitle: {
    ...Typography.h3,
    color: Palette.text,
  },
  summarySubtitle: {
    ...Typography.caption,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterPillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterText: {
    ...Typography.captionBold,
    color: Palette.textSecondary,
  },
  filterTextActive: {
    color: Palette.textOnPrimary,
  },
  composerCard: {
    gap: Spacing.sm,
  },
  composerTitle: {
    ...Typography.h3,
    color: Palette.text,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    ...Typography.captionBold,
    color: Palette.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Palette.surfaceSubtle,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  chipText: {
    ...Typography.captionBold,
    color: Palette.textSecondary,
  },
  chipTextActive: {
    color: Palette.textOnPrimary,
  },
  errorText: {
    ...Typography.caption,
    color: Palette.danger,
  },
  listStack: {
    gap: Spacing.sm,
  },
  taskCard: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Palette.success,
    borderColor: Palette.success,
  },
  taskBody: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    ...Typography.bodyMedium,
    color: Palette.text,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: Palette.textMuted,
  },
  taskNotes: {
    ...Typography.caption,
    color: Palette.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  deleteBtn: {
    padding: 4,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Palette.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.caption,
    color: Palette.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
});

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import { fetchHomeRadarSummary, type HomeRadarSummary } from '@/features/home/services/homeService';
import { fetchMyArtistHighlights } from '@/features/profile/services/profileService';
import {
  createCareButton,
  createDengoShortcut,
  deleteCareButton,
  deleteDengoShortcut,
  fetchCareButtons,
  fetchDengoInteractions,
  fetchDengoShortcuts,
  fetchTodayMoods,
  respondToCareRequest as respondToCareRequestApi,
  sendCareRequestDengo,
  sendDrawingDengo,
  sendEmojiDengo,
  updateCareButton,
  upsertDailyMood,
} from '@/features/tasks/services/dengoService';
import {
  createHouseholdTask,
  deleteHouseholdTask,
  fetchHouseholdTasks,
  toggleHouseholdTask,
} from '@/features/tasks/services/tasksService';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  MOOD_PRESETS,
  type ArtistHighlight,
  type CareResponseStatus,
  type DailyMood,
  type DengoCareButton,
  type DengoInteraction,
  type DengoShortcut,
  type DrawingPayload,
  type HouseholdTask,
  type TaskRecurrence,
} from '@/types/database';

function makeLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const PREVIEW_COUPLE_ID = 'preview-couple-1';
const PREVIEW_ME_ID = 'preview-user-1';
const PREVIEW_PARTNER_ID = 'preview-user-2';

const INITIAL_PREVIEW_TASKS: HouseholdTask[] = [
  {
    id: 'preview-task-1',
    couple_id: PREVIEW_COUPLE_ID,
    title: 'Lavar a louça do jantar',
    notes: 'Deixar a pia seca para o café da manhã',
    recurrence: 'daily',
    assigned_to: PREVIEW_ME_ID,
    is_completed: false,
    completed_by: null,
    completed_at: null,
    due_date: null,
    created_by: PREVIEW_ME_ID,
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'preview-task-2',
    couple_id: PREVIEW_COUPLE_ID,
    title: 'Passar aspirador na sala',
    notes: null,
    recurrence: 'weekly',
    assigned_to: PREVIEW_PARTNER_ID,
    is_completed: false,
    completed_by: null,
    completed_at: null,
    due_date: null,
    created_by: PREVIEW_PARTNER_ID,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'preview-task-3',
    couple_id: PREVIEW_COUPLE_ID,
    title: 'Regar as plantas da varanda',
    notes: null,
    recurrence: 'biweekly',
    assigned_to: null,
    is_completed: true,
    completed_by: PREVIEW_PARTNER_ID,
    completed_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    due_date: null,
    created_by: PREVIEW_ME_ID,
    created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

const INITIAL_PREVIEW_SHORTCUTS: DengoShortcut[] = [
  {
    id: 'sc-1',
    couple_id: PREVIEW_COUPLE_ID,
    emoji: '😘',
    label: 'Beijo',
    is_default: true,
    sort_order: 1,
    created_by: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'sc-2',
    couple_id: PREVIEW_COUPLE_ID,
    emoji: '🫂',
    label: 'Abraço',
    is_default: true,
    sort_order: 2,
    created_by: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'sc-3',
    couple_id: PREVIEW_COUPLE_ID,
    emoji: '😤',
    label: 'Raivinha',
    is_default: true,
    sort_order: 3,
    created_by: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'sc-4',
    couple_id: PREVIEW_COUPLE_ID,
    emoji: '🧹',
    label: 'Vai varrer',
    is_default: true,
    sort_order: 4,
    created_by: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'sc-5',
    couple_id: PREVIEW_COUPLE_ID,
    emoji: '☕',
    label: 'Cafuné + Café',
    is_default: false,
    sort_order: 5,
    created_by: PREVIEW_ME_ID,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_PREVIEW_CARE_BUTTONS: DengoCareButton[] = [
  {
    id: 'cb-1',
    couple_id: PREVIEW_COUPLE_ID,
    emoji: '🔥',
    label: 'Bolsa quente',
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cb-2',
    couple_id: PREVIEW_COUPLE_ID,
    emoji: '💊',
    label: 'Remédio',
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cb-3',
    couple_id: PREVIEW_COUPLE_ID,
    emoji: '🤍',
    label: 'Fique comigo',
    is_active: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cb-4',
    couple_id: PREVIEW_COUPLE_ID,
    emoji: '🌙',
    label: 'Preciso ficar sozinha',
    is_active: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_PREVIEW_INTERACTIONS: DengoInteraction[] = [
  {
    id: 'int-1',
    couple_id: PREVIEW_COUPLE_ID,
    sender_id: PREVIEW_PARTNER_ID,
    receiver_id: PREVIEW_ME_ID,
    kind: 'emoji_reaction',
    emoji: '🫂',
    label: 'Abraço',
    message: 'Saudade de você hoje, chega logo pra gente fazer um café!',
    drawing_url: null,
    care_status: null,
    responded_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'int-2',
    couple_id: PREVIEW_COUPLE_ID,
    sender_id: PREVIEW_PARTNER_ID,
    receiver_id: PREVIEW_ME_ID,
    kind: 'care_request',
    emoji: '🤍',
    label: 'Fique comigo',
    message: 'Dia corrido por aqui, quero colo mais tarde.',
    drawing_url: null,
    care_status: 'pending',
    responded_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
  },
  {
    id: 'int-3',
    couple_id: PREVIEW_COUPLE_ID,
    sender_id: PREVIEW_ME_ID,
    receiver_id: PREVIEW_PARTNER_ID,
    kind: 'emoji_reaction',
    emoji: '😘',
    label: 'Beijo',
    message: 'Bom trabalho, amor!',
    drawing_url: null,
    care_status: null,
    responded_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
  },
];

const INITIAL_PREVIEW_MOODS: DailyMood[] = [
  {
    id: 'mood-partner-1',
    couple_id: PREVIEW_COUPLE_ID,
    user_id: PREVIEW_PARTNER_ID,
    mood_date: getTodayDateString(),
    mood_key: 'tired',
    mood_emoji: '😴',
    note: 'Reuniões sem parar hoje',
    care_suggestions: MOOD_PRESETS.find((m) => m.key === 'tired')?.suggestions ?? [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_PREVIEW_RADAR: HomeRadarSummary = {
  upcomingEvent: {
    id: 'preview-event-1',
    couple_id: PREVIEW_COUPLE_ID,
    title: 'Show da Marisa Monte',
    category: 'show_festival',
    custom_category_label: null,
    artist_name: 'Marisa Monte',
    venue: 'Allianz Parque',
    starts_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6 + 1000 * 60 * 60 * 4).toISOString(),
    ends_at: null,
    notes: 'Ingressos salvos na carteira digital',
    cover_photo_url: null,
    created_by: PREVIEW_ME_ID,
    created_at: new Date().toISOString(),
  },
  pantryLowCount: 2,
  shoppingPendingCount: 5,
  cycleStatusLabel: 'Fase Lútea (Acolhimento e calma)',
};

const INITIAL_PREVIEW_ARTIST_HIGHLIGHT: ArtistHighlight = {
  topArtist: 'Marisa Monte',
  topArtistShows: 3,
  totalShows: 7,
};

interface CoupleDataContextValue {
  isLoadingData: boolean;
  householdTasks: HouseholdTask[];
  dengoShortcuts: DengoShortcut[];
  careButtons: DengoCareButton[];
  dengoHistory: DengoInteraction[];
  myMood: DailyMood | null;
  partnerMood: DailyMood | null;
  radar: HomeRadarSummary;
  artistHighlight: ArtistHighlight;
  refreshAll: () => Promise<void>;
  // Rotinas de casa
  addTask: (params: {
    title: string;
    notes?: string;
    recurrence: TaskRecurrence;
    assignedTo: string | null;
  }) => Promise<void>;
  toggleTask: (task: HouseholdTask) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  // Dengo
  addShortcut: (emoji: string, label: string) => Promise<void>;
  removeShortcut: (shortcutId: string) => Promise<void>;
  addCareButton: (emoji: string, label: string) => Promise<void>;
  editCareButton: (buttonId: string, emoji: string, label: string) => Promise<void>;
  removeCareButton: (buttonId: string) => Promise<void>;
  sendEmoji: (emoji: string, label: string, message?: string) => Promise<void>;
  sendDrawing: (drawing: DrawingPayload, caption?: string) => Promise<void>;
  sendCareRequest: (emoji: string, label: string, message?: string) => Promise<void>;
  respondCareRequest: (
    interactionId: string,
    status: Exclude<CareResponseStatus, 'pending'>
  ) => Promise<void>;
  saveMood: (moodKey: string, note?: string) => Promise<void>;
}

const CoupleDataContext = createContext<CoupleDataContextValue | null>(null);

export function CoupleDataProvider({ children }: { children: React.ReactNode }) {
  const { profile, partner, couple, isPreviewMode } = useAuth();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [householdTasks, setHouseholdTasks] = useState<HouseholdTask[]>([]);
  const [dengoShortcuts, setDengoShortcuts] = useState<DengoShortcut[]>([]);
  const [careButtons, setCareButtons] = useState<DengoCareButton[]>([]);
  const [dengoHistory, setDengoHistory] = useState<DengoInteraction[]>([]);
  const [todayMoods, setTodayMoods] = useState<DailyMood[]>([]);
  const [radar, setRadar] = useState<HomeRadarSummary>({
    upcomingEvent: null,
    pantryLowCount: 0,
    shoppingPendingCount: 0,
    cycleStatusLabel: null,
  });
  const [artistHighlight, setArtistHighlight] = useState<ArtistHighlight>({
    topArtist: null,
    topArtistShows: 0,
    totalShows: 0,
  });

  const coupleId = couple?.id ?? profile?.couple_id ?? null;
  const userId = profile?.id ?? null;
  const partnerId = partner?.id ?? null;

  const refreshAll = useCallback(async () => {
    if (isPreviewMode) {
      setIsLoadingData(false);
      return;
    }

    if (!isSupabaseConfigured || !coupleId || !userId) {
      setIsLoadingData(false);
      return;
    }

    try {
      const [tasks, shortcuts, buttons, history, moods, radarData, artistData] = await Promise.all([
        fetchHouseholdTasks(coupleId),
        fetchDengoShortcuts(coupleId),
        fetchCareButtons(coupleId),
        fetchDengoInteractions(coupleId),
        fetchTodayMoods(coupleId),
        fetchHomeRadarSummary(coupleId),
        fetchMyArtistHighlights(userId),
      ]);

      setHouseholdTasks(tasks);
      setDengoShortcuts(shortcuts);
      setCareButtons(buttons);
      setDengoHistory(history);
      setTodayMoods(moods);
      setRadar(radarData);
      setArtistHighlight(artistData);
    } catch (err) {
      console.warn('[CoupleDataProvider] Erro ao carregar dados do casal:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [coupleId, isPreviewMode, userId]);

  // Inicialização (Preview ou Supabase)
  useEffect(() => {
    if (isPreviewMode) {
      setHouseholdTasks((prev) => (prev.length > 0 ? prev : INITIAL_PREVIEW_TASKS));
      setDengoShortcuts((prev) => (prev.length > 0 ? prev : INITIAL_PREVIEW_SHORTCUTS));
      setCareButtons((prev) => (prev.length > 0 ? prev : INITIAL_PREVIEW_CARE_BUTTONS));
      setDengoHistory((prev) => (prev.length > 0 ? prev : INITIAL_PREVIEW_INTERACTIONS));
      setTodayMoods((prev) => (prev.length > 0 ? prev : INITIAL_PREVIEW_MOODS));
      setRadar(INITIAL_PREVIEW_RADAR);
      setArtistHighlight(INITIAL_PREVIEW_ARTIST_HIGHLIGHT);
      setIsLoadingData(false);
      return;
    }

    void refreshAll();
  }, [isPreviewMode, refreshAll]);

  // Realtime do Supabase para sincronizar tudo entre o casal
  useEffect(() => {
    if (isPreviewMode || !isSupabaseConfigured || !coupleId) return;

    const channel = supabase
      .channel(`couple-live-${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'household_tasks', filter: `couple_id=eq.${coupleId}` },
        () => void refreshAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dengo_interactions', filter: `couple_id=eq.${coupleId}` },
        () => void refreshAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dengo_shortcuts', filter: `couple_id=eq.${coupleId}` },
        () => void refreshAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dengo_care_buttons', filter: `couple_id=eq.${coupleId}` },
        () => void refreshAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_moods', filter: `couple_id=eq.${coupleId}` },
        () => void refreshAll()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, isPreviewMode, refreshAll]);

  // --- Rotinas de Casa ---
  const addTask = useCallback(
    async (params: {
      title: string;
      notes?: string;
      recurrence: TaskRecurrence;
      assignedTo: string | null;
    }) => {
      if (!coupleId || !userId) return;
      if (isPreviewMode || !isSupabaseConfigured) {
        const now = new Date().toISOString();
        const created: HouseholdTask = {
          id: makeLocalId('task'),
          couple_id: coupleId,
          title: params.title.trim(),
          notes: params.notes?.trim() || null,
          recurrence: params.recurrence,
          assigned_to: params.assignedTo,
          is_completed: false,
          completed_by: null,
          completed_at: null,
          due_date: null,
          created_by: userId,
          created_at: now,
          updated_at: now,
        };
        setHouseholdTasks((prev) => [created, ...prev]);
        return;
      }

      const created = await createHouseholdTask({
        coupleId,
        createdBy: userId,
        title: params.title,
        notes: params.notes,
        recurrence: params.recurrence,
        assignedTo: params.assignedTo,
      });
      setHouseholdTasks((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
    },
    [coupleId, isPreviewMode, userId]
  );

  const toggleTask = useCallback(
    async (task: HouseholdTask) => {
      if (!userId) return;
      const nextCompleted = !task.is_completed;
      const now = new Date().toISOString();

      // Atualização otimista
      setHouseholdTasks((prev) =>
        prev
          .map((item) =>
            item.id === task.id
              ? {
                  ...item,
                  is_completed: nextCompleted,
                  completed_by: nextCompleted ? userId : null,
                  completed_at: nextCompleted ? now : null,
                }
              : item
          )
          .sort((a, b) => Number(a.is_completed) - Number(b.is_completed))
      );

      if (isPreviewMode || !isSupabaseConfigured) return;

      await toggleHouseholdTask({
        taskId: task.id,
        isCompleted: nextCompleted,
        userId,
      });
    },
    [isPreviewMode, userId]
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      setHouseholdTasks((prev) => prev.filter((item) => item.id !== taskId));
      if (isPreviewMode || !isSupabaseConfigured) return;
      await deleteHouseholdTask(taskId);
    },
    [isPreviewMode]
  );

  // --- Dengo: Atalhos & Botões ---
  const addShortcut = useCallback(
    async (emoji: string, label: string) => {
      if (!coupleId || !userId) return;
      if (isPreviewMode || !isSupabaseConfigured) {
        const created: DengoShortcut = {
          id: makeLocalId('sc'),
          couple_id: coupleId,
          emoji: emoji.trim(),
          label: label.trim(),
          is_default: false,
          sort_order: dengoShortcuts.length + 1,
          created_by: userId,
          created_at: new Date().toISOString(),
        };
        setDengoShortcuts((prev) => [...prev, created]);
        return;
      }

      const created = await createDengoShortcut({
        coupleId,
        createdBy: userId,
        emoji,
        label,
        sortOrder: dengoShortcuts.length + 1,
      });
      setDengoShortcuts((prev) => [...prev, created]);
    },
    [coupleId, dengoShortcuts.length, isPreviewMode, userId]
  );

  const removeShortcut = useCallback(
    async (shortcutId: string) => {
      setDengoShortcuts((prev) => prev.filter((item) => item.id !== shortcutId));
      if (isPreviewMode || !isSupabaseConfigured) return;
      await deleteDengoShortcut(shortcutId);
    },
    [isPreviewMode]
  );

  const addCareButton = useCallback(
    async (emoji: string, label: string) => {
      if (!coupleId) return;
      if (isPreviewMode || !isSupabaseConfigured) {
        const now = new Date().toISOString();
        const created: DengoCareButton = {
          id: makeLocalId('cb'),
          couple_id: coupleId,
          emoji: emoji.trim() || '🤍',
          label: label.trim(),
          is_active: true,
          sort_order: careButtons.length + 1,
          created_at: now,
          updated_at: now,
        };
        setCareButtons((prev) => [...prev, created]);
        return;
      }

      const created = await createCareButton({
        coupleId,
        emoji,
        label,
        sortOrder: careButtons.length + 1,
      });
      setCareButtons((prev) => [...prev, created]);
    },
    [careButtons.length, coupleId, isPreviewMode]
  );

  const editCareButton = useCallback(
    async (buttonId: string, emoji: string, label: string) => {
      setCareButtons((prev) =>
        prev.map((btn) => (btn.id === buttonId ? { ...btn, emoji, label } : btn))
      );
      if (isPreviewMode || !isSupabaseConfigured) return;
      await updateCareButton(buttonId, { emoji, label });
    },
    [isPreviewMode]
  );

  const removeCareButton = useCallback(
    async (buttonId: string) => {
      setCareButtons((prev) => prev.filter((btn) => btn.id !== buttonId));
      if (isPreviewMode || !isSupabaseConfigured) return;
      await deleteCareButton(buttonId);
    },
    [isPreviewMode]
  );

  // --- Dengo: Interações ---
  const sendEmoji = useCallback(
    async (emoji: string, label: string, message?: string) => {
      if (!coupleId || !userId || !partnerId) return;
      if (isPreviewMode || !isSupabaseConfigured) {
        const created: DengoInteraction = {
          id: makeLocalId('dengo'),
          couple_id: coupleId,
          sender_id: userId,
          receiver_id: partnerId,
          kind: 'emoji_reaction',
          emoji,
          label,
          message: message?.trim() || null,
          drawing_url: null,
          care_status: null,
          responded_at: null,
          created_at: new Date().toISOString(),
        };
        setDengoHistory((prev) => [created, ...prev]);
        return;
      }

      const created = await sendEmojiDengo({
        coupleId,
        senderId: userId,
        receiverId: partnerId,
        emoji,
        label,
        message,
      });
      setDengoHistory((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
    },
    [coupleId, isPreviewMode, partnerId, userId]
  );

  const sendDrawing = useCallback(
    async (drawing: DrawingPayload, caption?: string) => {
      if (!coupleId || !userId || !partnerId) return;
      if (isPreviewMode || !isSupabaseConfigured) {
        const created: DengoInteraction = {
          id: makeLocalId('draw'),
          couple_id: coupleId,
          sender_id: userId,
          receiver_id: partnerId,
          kind: 'drawing',
          emoji: '🎨',
          label: 'Bilhete visual',
          message: caption?.trim() || null,
          drawing_url: JSON.stringify(drawing),
          care_status: null,
          responded_at: null,
          created_at: new Date().toISOString(),
        };
        setDengoHistory((prev) => [created, ...prev]);
        return;
      }

      const created = await sendDrawingDengo({
        coupleId,
        senderId: userId,
        receiverId: partnerId,
        drawing,
        caption,
      });
      setDengoHistory((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
    },
    [coupleId, isPreviewMode, partnerId, userId]
  );

  const sendCareRequest = useCallback(
    async (emoji: string, label: string, message?: string) => {
      if (!coupleId || !userId || !partnerId) return;
      if (isPreviewMode || !isSupabaseConfigured) {
        const created: DengoInteraction = {
          id: makeLocalId('care'),
          couple_id: coupleId,
          sender_id: userId,
          receiver_id: partnerId,
          kind: 'care_request',
          emoji,
          label,
          message: message?.trim() || null,
          drawing_url: null,
          care_status: 'pending',
          responded_at: null,
          created_at: new Date().toISOString(),
        };
        setDengoHistory((prev) => [created, ...prev]);
        return;
      }

      const created = await sendCareRequestDengo({
        coupleId,
        senderId: userId,
        receiverId: partnerId,
        emoji,
        label,
        message,
      });
      setDengoHistory((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
    },
    [coupleId, isPreviewMode, partnerId, userId]
  );

  const respondCareRequest = useCallback(
    async (interactionId: string, status: Exclude<CareResponseStatus, 'pending'>) => {
      const now = new Date().toISOString();
      setDengoHistory((prev) =>
        prev.map((item) =>
          item.id === interactionId
            ? { ...item, care_status: status, responded_at: now }
            : item
        )
      );

      if (isPreviewMode || !isSupabaseConfigured) return;
      await respondToCareRequestApi(interactionId, status);
    },
    [isPreviewMode]
  );

  // --- Dengo: Mood do Dia ---
  const saveMood = useCallback(
    async (moodKey: string, note?: string) => {
      if (!coupleId || !userId) return;
      const preset = MOOD_PRESETS.find((item) => item.key === moodKey);
      if (!preset) return;

      if (isPreviewMode || !isSupabaseConfigured) {
        const now = new Date().toISOString();
        const saved: DailyMood = {
          id: makeLocalId('mood'),
          couple_id: coupleId,
          user_id: userId,
          mood_date: getTodayDateString(),
          mood_key: preset.key,
          mood_emoji: preset.emoji,
          note: note?.trim() || null,
          care_suggestions: preset.suggestions,
          created_at: now,
          updated_at: now,
        };
        setTodayMoods((prev) => [...prev.filter((m) => m.user_id !== userId), saved]);
        return;
      }

      const saved = await upsertDailyMood({
        coupleId,
        userId,
        moodKey: preset.key,
        moodEmoji: preset.emoji,
        note,
        careSuggestions: preset.suggestions,
      });
      setTodayMoods((prev) => [...prev.filter((m) => m.user_id !== userId), saved]);
    },
    [coupleId, isPreviewMode, userId]
  );

  const myMood = useMemo(
    () => todayMoods.find((m) => m.user_id === userId) ?? null,
    [todayMoods, userId]
  );

  const partnerMood = useMemo(
    () => todayMoods.find((m) => m.user_id !== userId) ?? null,
    [todayMoods, userId]
  );

  const value = useMemo<CoupleDataContextValue>(
    () => ({
      isLoadingData,
      householdTasks,
      dengoShortcuts,
      careButtons,
      dengoHistory,
      myMood,
      partnerMood,
      radar,
      artistHighlight,
      refreshAll,
      addTask,
      toggleTask,
      removeTask,
      addShortcut,
      removeShortcut,
      addCareButton,
      editCareButton,
      removeCareButton,
      sendEmoji,
      sendDrawing,
      sendCareRequest,
      respondCareRequest,
      saveMood,
    }),
    [
      addCareButton,
      addShortcut,
      addTask,
      artistHighlight,
      careButtons,
      dengoHistory,
      dengoShortcuts,
      editCareButton,
      householdTasks,
      isLoadingData,
      myMood,
      partnerMood,
      radar,
      refreshAll,
      removeCareButton,
      removeShortcut,
      removeTask,
      respondCareRequest,
      saveMood,
      sendCareRequest,
      sendDrawing,
      sendEmoji,
      toggleTask,
    ]
  );

  return <CoupleDataContext.Provider value={value}>{children}</CoupleDataContext.Provider>;
}

export function useCoupleData(): CoupleDataContextValue {
  const ctx = useContext(CoupleDataContext);
  if (!ctx) {
    throw new Error('useCoupleData deve ser utilizado dentro de CoupleDataProvider.');
  }
  return ctx;
}

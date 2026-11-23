export type RelationshipStatus =
  | 'dating'          // Namorados
  | 'engaged'         // Noivos
  | 'married'         // Casados
  | 'living_together'; // Morando juntos

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export type TaskRecurrence = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type DengoKind = 'emoji_reaction' | 'drawing' | 'care_request';

export type CareResponseStatus = 'pending' | 'on_my_way' | 'cant_now';

export type RenovationItemStatus = 'to_quote' | 'to_buy' | 'priority' | 'purchased';

export type EventCategory =
  | 'show_festival'
  | 'party_birthday'
  | 'kids_school'
  | 'date_night'
  | 'travel'
  | 'health_appointment'
  | 'custom';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
  couple_id: string | null;
  vault_pin_hash: string | null;
  biometrics_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerSummary {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
}

export interface Couple {
  id: string;
  member_one_id: string;
  member_two_id: string;
  relationship_status: RelationshipStatus;
  started_at: string;
  about_answers: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface CoupleInvite {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  invite_code: string | null;
  status: InviteStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  sender?: PartnerSummary | null;
  receiver?: PartnerSummary | null;
}

export interface HouseholdTask {
  id: string;
  couple_id: string;
  title: string;
  notes: string | null;
  recurrence: TaskRecurrence;
  assigned_to: string | null;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DengoShortcut {
  id: string;
  couple_id: string;
  emoji: string;
  label: string;
  is_default: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
}

export interface DengoCareButton {
  id: string;
  couple_id: string;
  emoji: string;
  label: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DrawingStroke {
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export interface DrawingPayload {
  version: 1;
  width: number;
  height: number;
  background: string;
  strokes: DrawingStroke[];
}

export interface DengoInteraction {
  id: string;
  couple_id: string;
  sender_id: string;
  receiver_id: string;
  kind: DengoKind;
  emoji: string | null;
  label: string | null;
  message: string | null;
  drawing_url: string | null;
  care_status: CareResponseStatus | null;
  responded_at: string | null;
  created_at: string;
}

export interface DailyMood {
  id: string;
  couple_id: string;
  user_id: string;
  mood_date: string;
  mood_key: string;
  mood_emoji: string;
  note: string | null;
  care_suggestions: string[];
  created_at: string;
  updated_at: string;
}

export interface CoupleEvent {
  id: string;
  couple_id: string;
  title: string;
  category: EventCategory;
  custom_category_label: string | null;
  artist_name: string | null;
  venue: string | null;
  starts_at: string;
  ends_at: string | null;
  notes: string | null;
  cover_photo_url: string | null;
  created_by: string;
  created_at: string;
}

export interface ArtistRankingEntry {
  artist_name: string;
  shows_count: number;
  last_show_at: string;
}

export interface ArtistHighlight {
  topArtist: string | null;
  topArtistShows: number;
  totalShows: number;
}

export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  dating: 'Namorados',
  engaged: 'Noivos',
  married: 'Casados',
  living_together: 'Morando juntos',
};

export const TASK_RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  once: 'Única',
  daily: 'Diária',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
};

export const CYCLE_PHASE_LABELS: Record<CyclePhase, string> = {
  menstrual: 'Fase Menstrual (Cuidado extra)',
  follicular: 'Fase Folicular (Energia subindo)',
  ovulation: 'Ovulação (Sintonia alta)',
  luteal: 'Fase Lútea (Acolhimento e calma)',
};

export interface MoodPreset {
  key: string;
  emoji: string;
  label: string;
  suggestions: string[];
}

export const MOOD_PRESETS: MoodPreset[] = [
  {
    key: 'radiant',
    emoji: '☀️',
    label: 'Radiante',
    suggestions: [
      'Aproveite o clima leve para propor um café ou passeio juntos',
      'Elogie algo que você admira no seu par hoje',
    ],
  },
  {
    key: 'affectionate',
    emoji: '🥰',
    label: 'Carinhoso(a)',
    suggestions: [
      'Dê um abraço demorado de pelo menos 20 segundos',
      'Mande um bilhetinho visual ou recado fofo no Dengo',
    ],
  },
  {
    key: 'tired',
    emoji: '😴',
    label: 'Cansado(a)',
    suggestions: [
      'Assuma uma tarefa da casa hoje para aliviar a rotina',
      'Prepare algo quentinho ou sugira descansar cedo juntos',
    ],
  },
  {
    key: 'sensitive',
    emoji: '🥺',
    label: 'Sensível',
    suggestions: [
      'Escute com calma sem pressa de resolver tudo na hora',
      'Ofereça colo, chá quentinho ou um carinho silencioso',
    ],
  },
  {
    key: 'stressed',
    emoji: '😮‍💨',
    label: 'Estressado(a)',
    suggestions: [
      'Pergunte: “Você prefere desabafar ou distrair a cabeça?”',
      'Faça uma massagem rápida nos ombros ao se encontrarem',
    ],
  },
  {
    key: 'need_space',
    emoji: '🌙',
    label: 'Quieto(a)',
    suggestions: [
      'Respeite o tempinho individual com leveza e sem cobranças',
      'Deixe uma mensagem carinhosa dizendo que está por perto',
    ],
  },
];

export const ABOUT_US_QUESTIONS: { key: string; label: string; placeholder: string }[] = [
  {
    key: 'onde_nos_conhecemos',
    label: 'Onde nos conhecemos',
    placeholder: 'Ex.: Em um café perto do parque...',
  },
  {
    key: 'primeiro_encontro',
    label: 'Nosso primeiro encontro',
    placeholder: 'Ex.: Cinema seguido de jantar...',
  },
  {
    key: 'musica_do_casal',
    label: 'Música do casal',
    placeholder: 'Ex.: Ainda Bem — Marisa Monte',
  },
  {
    key: 'comida_favorita_juntos',
    label: 'Comida favorita a dois',
    placeholder: 'Ex.: Pizza artesanal de sexta à noite',
  },
  {
    key: 'proximo_sonho',
    label: 'Nosso próximo sonho juntos',
    placeholder: 'Ex.: Viagem para o litoral ou reformar a sala',
  },
];

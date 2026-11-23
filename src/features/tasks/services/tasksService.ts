import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { HouseholdTask, TaskRecurrence } from '@/types/database';

export async function fetchHouseholdTasks(coupleId: string): Promise<HouseholdTask[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('household_tasks')
    .select('*')
    .eq('couple_id', coupleId)
    .order('is_completed', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as HouseholdTask[] | null) ?? [];
}

export async function createHouseholdTask(params: {
  coupleId: string;
  createdBy: string;
  title: string;
  notes?: string | null;
  recurrence: TaskRecurrence;
  assignedTo?: string | null;
  dueDate?: string | null;
}): Promise<HouseholdTask> {
  const { data, error } = await supabase
    .from('household_tasks')
    .insert({
      couple_id: params.coupleId,
      created_by: params.createdBy,
      title: params.title.trim(),
      notes: params.notes?.trim() || null,
      recurrence: params.recurrence,
      assigned_to: params.assignedTo ?? null,
      due_date: params.dueDate ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as HouseholdTask;
}

export async function toggleHouseholdTask(params: {
  taskId: string;
  isCompleted: boolean;
  userId: string;
}): Promise<HouseholdTask> {
  const { data, error } = await supabase
    .from('household_tasks')
    .update({
      is_completed: params.isCompleted,
      completed_by: params.isCompleted ? params.userId : null,
      completed_at: params.isCompleted ? new Date().toISOString() : null,
    })
    .eq('id', params.taskId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as HouseholdTask;
}

export async function deleteHouseholdTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('household_tasks').delete().eq('id', taskId);
  if (error) throw new Error(error.message);
}

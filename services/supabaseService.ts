import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Question, NewQuestion } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchQuestions(params?: { category?: string; key_category?: string }): Promise<Question[]> {
  let q = supabase.from('questions').select('*').order('created_at', { ascending: false });
  if (params?.category) q = q.eq('category', params.category);
  if (params?.key_category) q = q.eq('key_category', params.key_category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Question[];
}

export async function insertOneQuestion(row: NewQuestion): Promise<void> {
  const { error } = await supabase.from('questions').insert({
    category: row.category,
    key_category: row.key_category ?? null,
    prompt: row.prompt,
    options: row.options ?? null,
    answer: row.answer,
    explanation: row.explanation ?? null,
  });
  if (error) throw error;
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { type Question, type NewQuestion } from '../types.ts';

// =================================================================================
// TODO: 아래 2줄에 본인의 Supabase URL과 Anon Key를 붙여넣어 주세요!
// (Your Supabase Project > Project Settings > API 에서 찾을 수 있습니다)
// =================================================================================
const supabaseUrl = 'https://zqyjewimfnjyzsabynyj.supabase.co'; // 예: https://xxxxxx.supabase.co
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxeWpld2ltZm5qeXpzYWJ5bnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MTQ1NzEsImV4cCI6MjA3MzQ5MDU3MX0.J8emOePrv76EAGLq42QKBPdgROMq8PGG1822mEGEWxQ'; // 예: eyJhbGci...


// A helper function to get the Supabase client, throwing an error if not configured.
function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_URL') || !supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
    throw new Error("Supabase URL과 Key를 services/supabaseService.ts 파일에 입력해주세요.");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

const supabase = getSupabaseClient();

export async function getQuestions(): Promise<Question[]> {
  const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addQuestion(question: NewQuestion): Promise<Question | null> {
  const { data, error } = await supabase
    .from('questions')
    .insert([{ ...question, is_incorrect: false }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addQuestions(questions: NewQuestion[]): Promise<Question[] | null> {
  const questionsToInsert = questions.map(q => ({ ...q, is_incorrect: false }));
  const { data, error } = await supabase.from('questions').insert(questionsToInsert).select();
  if (error) throw error;
  return data;
}

export async function updateQuestionStatus(id: number, is_incorrect: boolean): Promise<Question | null> {
  const { data, error } = await supabase.from('questions').update({ is_incorrect }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteQuestions(ids: number[]): Promise<void> {
  const { error } = await supabase.from('questions').delete().in('id', ids);
  if (error) throw error;
}

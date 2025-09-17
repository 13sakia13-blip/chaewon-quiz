import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Question, NewQuestion } from '../types';

// 환경변수에서 읽기 (Netlify → VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 설정)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('환경변수 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 설정되어야 합니다.');
  throw new Error('Supabase 환경변수가 누락되었습니다. Netlify Environment variables를 확인하세요.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// 공통: 질문 조회
export async function fetchQuestions(params?: {
  category?: string;
  key_category?: string;
}): Promise<Question[]> {
  let q = supabase.from('questions').select('*').order('created_at', { ascending: false });
  if (params?.category) q = q.eq('category', params.category);
  if (params?.key_category) q = q.eq('key_category', params.key_category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Question[];
}

// 다건 삽입
export async function insertQuestions(rows: NewQuestion[]): Promise<void> {
  const payload = rows.map((r) => ({
    category: r.category,
    key_category: r.key_category ?? null,
    prompt: r.prompt,
    options: r.options ?? null,
    answer: r.answer,
    explanation: r.explanation ?? null,
  }));
  const { error } = await supabase.from('questions').insert(payload);
  if (error) throw error;
}

// 단건 삽입
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

// 일괄 삭제
export async function deleteQuestions(ids: string[]): Promise<void> {
  const { error } = await supabase.from('questions').delete().in('id', ids);
  if (error) throw error;
}

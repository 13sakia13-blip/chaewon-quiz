export type Question = {
  id: string;
  created_at: string;
  category: string;
  key_category?: string | null; // 보조 분류
  prompt: string;
  options?: string[] | null;
  answer: string;
  explanation?: string | null;
};

export type NewQuestion = {
  category: string;
  key_category?: string | null;
  prompt: string;
  options?: string[] | null;
  answer: string;
  explanation?: string | null;
};

export type Question = {
  id: string;
  created_at: string;
  category: string;
  key_category?: string | null;
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

export interface Question {
  id: number;
  created_at: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  category: string;
  is_incorrect: boolean;
}

export type NewQuestion = Omit<Question, 'id' | 'created_at' | 'is_incorrect'>;

export enum View {
  Dashboard = 'DASHBOARD',
  Quiz = 'QUIZ',
  Review = 'REVIEW',
  Manage = 'MANAGE',
}

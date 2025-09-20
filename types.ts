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
  ExamSetup = 'EXAM_SETUP',
  Exam = 'EXAM',
  Results = 'RESULTS',
}

export interface ExamAnswer {
  questionId: number;
  selected: string | null;
  correct: boolean;
}

export interface ExamResult {
  id: string;           // uuid
  at: string;           // ISO timestamp
  category: string;     // chosen category
  total: number;        // total questions
  correct: number;      // number correct
  wrongIds: number[];   // ids of wrong questions
}


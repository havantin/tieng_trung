export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface Vocabulary {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  category: string;
  lesson?: string; // e.g. "Bài 1", "Bài 2"
  exampleSentence?: string;
  examplePinyin?: string;
  exampleMeaning?: string;
  createdBy: string;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  vocabId: string;
  hanzi: string;
  pinyin: string;
  correctMeaning: string;
  category: string;
  lesson?: string;
  options: string[];
}

export interface QuizResult {
  id: string;
  userId: string;
  type: 'quiz' | 'writing';
  score: number;
  total: number;
  percentage: number;
  completedAt: string;
}

export interface UserStats {
  totalQuizzes: number;
  averageScore: number;
  history: QuizResult[];
}

export interface AIWordExplanation {
  hanzi: string;
  pinyin: string;
  meaning: string;
  explanation: string;
  grammarNotes?: string;
  examples: {
    chinese: string;
    pinyin: string;
    vietnamese: string;
  }[];
  tips?: string;
}

export interface AIMistakeAnalysis {
  analysis: string;
  userCharMeaning?: string;
  memoryTip?: string;
  encouragement?: string;
}

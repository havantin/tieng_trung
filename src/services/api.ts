import {
  User,
  Vocabulary,
  QuizQuestion,
  QuizResult,
  UserStats,
  AIWordExplanation,
  AIMistakeAnalysis,
} from '../types';

const TOKEN_KEY = 'tieng_trung_token';
const USER_KEY = 'tieng_trung_user';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Yêu cầu thất bại (${response.status})`);
  }
  return data;
}

export const api = {
  // Auth
  async login(username: string, password: string):Promise<{ user: User; token: string; message: string }> {
    const data = await fetchWithAuth('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    authStorage.setToken(data.token);
    authStorage.setUser(data.user);
    return data;
  },

  async register(username: string, password: string, name: string, role: 'user' | 'admin' = 'user') {
    const data = await fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, name, role }),
    });
    authStorage.setToken(data.token);
    authStorage.setUser(data.user);
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    const data = await fetchWithAuth('/api/auth/me');
    authStorage.setUser(data.user);
    return data;
  },

  logout() {
    authStorage.clear();
  },

  // Admin User Management
  async getAdminUsers(): Promise<{ users: (User & { totalQuizzes: number; averageScore: number })[] }> {
    return fetchWithAuth('/api/admin/users');
  },

  async createAdminUser(userData: {
    username: string;
    password: string;
    name: string;
    role: 'user' | 'admin';
  }): Promise<{ user: User; message: string }> {
    return fetchWithAuth('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async updateAdminUser(
    id: string,
    userData: { name?: string; role?: 'user' | 'admin'; password?: string }
  ): Promise<{ user: User; message: string }> {
    return fetchWithAuth(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  async deleteAdminUser(id: string): Promise<{ message: string }> {
    return fetchWithAuth(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  async getAdminUserResults(id: string): Promise<{ user: User; results: QuizResult[] }> {
    return fetchWithAuth(`/api/admin/users/${id}/results`);
  },

  // Vocabulary
  async getVocabularies(): Promise<{ vocabularies: Vocabulary[] }> {
    return fetchWithAuth('/api/vocabularies');
  },

  async addVocabulary(vocab: Partial<Vocabulary>): Promise<{ vocabulary: Vocabulary; message: string }> {
    return fetchWithAuth('/api/vocabularies', {
      method: 'POST',
      body: JSON.stringify(vocab),
    });
  },

  async updateVocabulary(id: string, vocab: Partial<Vocabulary>): Promise<{ vocabulary: Vocabulary; message: string }> {
    return fetchWithAuth(`/api/vocabularies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vocab),
    });
  },

  async deleteVocabulary(id: string): Promise<{ message: string }> {
    return fetchWithAuth(`/api/vocabularies/${id}`, {
      method: 'DELETE',
    });
  },

  // Quiz & Practice
  async getQuizQuestions(count: number = 10, lesson?: string): Promise<{ questions: QuizQuestion[] }> {
    const params = new URLSearchParams();
    if (count) params.set('count', count.toString());
    if (lesson && lesson !== 'all') params.set('lesson', lesson);
    return fetchWithAuth(`/api/quiz/questions?${params.toString()}`);
  },

  async saveQuizResult(type: 'quiz' | 'writing', score: number, total: number): Promise<{ result: QuizResult; message: string }> {
    return fetchWithAuth('/api/quiz/results', {
      method: 'POST',
      body: JSON.stringify({ type, score, total }),
    });
  },

  async getUserStats(): Promise<UserStats> {
    return fetchWithAuth('/api/quiz/stats');
  },

  // AI Assistant
  async explainWord(hanzi: string, pinyin: string, meaning: string): Promise<AIWordExplanation> {
    return fetchWithAuth('/api/ai/explain-word', {
      method: 'POST',
      body: JSON.stringify({ hanzi, pinyin, meaning }),
    });
  },

  async explainMistake(
    expectedHanzi: string,
    userAnswer: string,
    meaning: string,
    pinyin: string
  ): Promise<AIMistakeAnalysis> {
    return fetchWithAuth('/api/ai/explain-mistake', {
      method: 'POST',
      body: JSON.stringify({ expectedHanzi, userAnswer, meaning, pinyin }),
    });
  },

  async askAI(word: { hanzi: string; pinyin: string; meaning: string } | null, question: string): Promise<{ answer: string }> {
    return fetchWithAuth('/api/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ word, question }),
    });
  },
};

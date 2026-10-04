import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { VocabPage } from './pages/VocabPage';
import { QuizPage } from './pages/QuizPage';
import { WritingPage } from './pages/WritingPage';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { AiExplainModal } from './components/AiExplainModal';
import { User, Vocabulary } from './types';
import { authStorage, api } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'vocab' | 'quiz' | 'writing' | 'admin' | 'auth'>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // AI Modal state
  const [aiModalVocab, setAiModalVocab] = useState<Vocabulary | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  useEffect(() => {
    // Check initial cached user
    const cached = authStorage.getUser();
    if (cached) {
      setCurrentUser(cached);
      // Validate with server
      api.getMe()
        .then((res) => setCurrentUser(res.user))
        .catch(() => {
          // Token invalid or expired
          authStorage.clear();
          setCurrentUser(null);
        });
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentTab('admin');
    } else {
      setCurrentTab('home');
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setCurrentTab('home');
  };

  const handleOpenAiModal = (vocab: Vocabulary) => {
    setAiModalVocab(vocab);
    setIsAiModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-800">
      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <HomePage
            currentUser={currentUser}
            setCurrentTab={setCurrentTab}
            onOpenAiModal={handleOpenAiModal}
          />
        )}

        {currentTab === 'vocab' && (
          <VocabPage onOpenAiModal={handleOpenAiModal} />
        )}

        {currentTab === 'quiz' && (
          <QuizPage
            currentUser={currentUser}
            setCurrentTab={setCurrentTab}
            onOpenAiModal={handleOpenAiModal}
          />
        )}

        {currentTab === 'writing' && (
          <WritingPage
            currentUser={currentUser}
            setCurrentTab={setCurrentTab}
            onOpenAiModal={handleOpenAiModal}
          />
        )}

        {currentTab === 'admin' && (
          <AdminPage
            currentUser={currentUser}
            onLoginAsAdmin={() => setCurrentTab('auth')}
            onOpenAiModal={handleOpenAiModal}
          />
        )}

        {currentTab === 'auth' && (
          <AuthPage
            onLoginSuccess={handleLoginSuccess}
            onCancel={() => setCurrentTab('home')}
          />
        )}
      </main>

      {/* AI Explanation Modal */}
      <AiExplainModal
        vocab={aiModalVocab}
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-8 mt-12 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-2 font-semibold text-stone-700">
            <span>学中文 • Website Học Tiếng Trung Đơn Giản</span>
          </div>
          <p>
            Tích hợp Flashcard, Kiểm tra trắc nghiệm, Luyện viết chữ Hán & Trợ lý thông minh Google Gemini AI
          </p>
          <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-stone-400">
            <span>Vai trò: User & Admin</span>
            <span>•</span>
            <span>Chữ Hán • Pinyin • Nghĩa tiếng Việt</span>
            <span>•</span>
            <span>Hỏi AI & Giải thích lỗi sai</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { BookOpen, HelpCircle, PenTool, ShieldCheck, Sparkles, Volume2, ArrowRight, Award, Flame, BrainCircuit } from 'lucide-react';
import { User, Vocabulary, UserStats } from '../types';
import { api } from '../services/api';
import { speakChinese } from '../services/speech';

interface HomePageProps {
  currentUser: User | null;
  setCurrentTab: (tab: 'home' | 'vocab' | 'quiz' | 'writing' | 'admin' | 'auth') => void;
  onOpenAiModal: (vocab: Vocabulary) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  currentUser,
  setCurrentTab,
  onOpenAiModal,
}) => {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [todayWord, setTodayWord] = useState<Vocabulary | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    try {
      const res = await api.getVocabularies();
      setVocabularies(res.vocabularies);
      if (res.vocabularies.length > 0) {
        // Pick random word of day
        const rand = res.vocabularies[Math.floor(Math.random() * res.vocabularies.length)];
        setTodayWord(rand);
      }

      if (currentUser) {
        const s = await api.getUserStats();
        setStats(s);
      }
    } catch (err) {
      console.error('Home load error:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-700 via-rose-700 to-amber-700 text-white p-6 sm:p-10 shadow-lg">
        {/* Subtle decorative background Hanzi */}
        <div className="absolute right-4 -bottom-6 text-9xl font-serif opacity-10 select-none pointer-events-none">
          学
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold tracking-wide text-amber-200 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Học thông minh cùng Trợ lý AI
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            {currentUser ? `你好, ${currentUser.name}!` : 'Chào mừng bạn đến với Web Học Tiếng Trung!'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-red-100 font-normal leading-relaxed">
            Học từ vựng qua Flashcards, thử sức với bài kiểm tra trắc nghiệm, luyện viết chữ Hán và có trợ lý AI giải thích mọi lúc.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setCurrentTab('vocab')}
              className="px-5 py-2.5 bg-white text-red-700 font-bold rounded-xl text-sm shadow-md hover:bg-stone-100 transition-all flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Bắt đầu học ngay
            </button>
            <button
              onClick={() => setCurrentTab('quiz')}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl text-sm backdrop-blur-xs transition-all flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              Làm bài trắc nghiệm
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-900">{vocabularies.length}</div>
            <div className="text-xs text-stone-600 font-medium">Từ vựng hệ thống</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-900">
              {stats ? `${stats.averageScore}%` : 'Chưa thi'}
            </div>
            <div className="text-xs text-stone-600 font-medium">Điểm trung bình</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-900">
              {stats ? stats.totalQuizzes : 0}
            </div>
            <div className="text-xs text-stone-600 font-medium">Bài thi đã làm</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-900">Gemini AI</div>
            <div className="text-xs text-stone-600 font-medium">Sửa lỗi & Đặt câu</div>
          </div>
        </div>
      </div>

      {/* Featured Word of the Day & Quick Practice Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Word of the Day */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-stone-800/80 px-2.5 py-1 rounded-full border border-amber-400/20">
                <Flame className="w-3.5 h-3.5" />
                Từ vựng của ngày
              </span>
              {todayWord && (
                <button
                  onClick={() => speakChinese(todayWord.hanzi)}
                  className="p-1.5 text-stone-300 hover:text-white bg-stone-700/60 rounded-lg transition-colors"
                  title="Phát âm"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {todayWord ? (
              <div className="text-center py-4">
                <div className="text-6xl font-bold font-serif text-white tracking-widest mb-2">
                  {todayWord.hanzi}
                </div>
                <div className="text-lg font-medium text-amber-300">{todayWord.pinyin}</div>
                <div className="text-base font-semibold text-stone-200 mt-2">
                  {todayWord.meaning}
                </div>
                {todayWord.exampleSentence && (
                  <div className="mt-4 p-3 rounded-xl bg-stone-800/70 border border-stone-700/60 text-left text-xs space-y-1">
                    <div className="font-serif text-stone-200 font-medium">
                      {todayWord.exampleSentence}
                    </div>
                    <div className="text-stone-400">{todayWord.exampleMeaning}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-stone-400 text-sm">Đang tải từ vựng...</div>
            )}
          </div>

          {todayWord && (
            <button
              onClick={() => onOpenAiModal(todayWord)}
              className="w-full mt-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              Hỏi AI về từ vựng này
            </button>
          )}
        </div>

        {/* 4 Main Action Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Học từ vựng */}
          <div
            onClick={() => setCurrentTab('vocab')}
            className="p-6 bg-white border border-stone-200 rounded-3xl hover:border-red-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-stone-900 group-hover:text-red-700 transition-colors">
                1. Học từ vựng & Flashcards
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Xem toàn bộ từ vựng theo chủ đề, lật thẻ ghi nhớ 3D, nghe giọng đọc chuẩn và nhờ AI tạo ví dụ.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-red-600 gap-1 group-hover:translate-x-1 transition-transform">
              Bắt đầu học <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: Trắc nghiệm */}
          <div
            onClick={() => setCurrentTab('quiz')}
            className="p-6 bg-white border border-stone-200 rounded-3xl hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-transform">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-stone-900 group-hover:text-amber-700 transition-colors">
                2. Kiểm tra trắc nghiệm
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Làm bài trắc nghiệm theo từng bài học dựa trên các từ bạn đã thêm, chấm điểm và xem giải thích tức thì.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-amber-600 gap-1 group-hover:translate-x-1 transition-transform">
              Trắc nghiệm theo bài <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3: Luyện viết */}
          <div
            onClick={() => setCurrentTab('writing')}
            className="p-6 bg-white border border-stone-200 rounded-3xl hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-transform">
                <PenTool className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-stone-900 group-hover:text-emerald-700 transition-colors">
                3. Luyện viết chữ Hán
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Luyện gõ chữ Hán theo từng bài học (kèm chức năng thêm từ mới). AI sẽ phân tích lỗi nếu viết sai.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 gap-1 group-hover:translate-x-1 transition-transform">
              Luyện viết theo bài <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 4: Quản lý Admin */}
          <div
            onClick={() => setCurrentTab('admin')}
            className="p-6 bg-white border border-stone-200 rounded-3xl hover:border-purple-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-stone-900 group-hover:text-purple-700 transition-colors">
                4. Quản lý từ vựng (Admin)
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Dành cho Admin: Thêm, sửa, xóa từ vựng tiếng Trung mỗi ngày kèm trợ lý AI tạo ví dụ tự động.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-purple-600 gap-1 group-hover:translate-x-1 transition-transform">
              Vào trang Admin <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Vocabularies Snippet */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            <h3 className="font-bold text-base text-stone-900">Từ vựng mới nhất</h3>
          </div>
          <button
            onClick={() => setCurrentTab('vocab')}
            className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1"
          >
            Xem tất cả {vocabularies.length} từ <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {vocabularies.slice(0, 10).map((item) => (
            <div
              key={item.id}
              className="p-3 bg-stone-50 border border-stone-200 rounded-2xl hover:border-red-300 hover:bg-white transition-all text-center group cursor-pointer"
              onClick={() => onOpenAiModal(item)}
            >
              <div className="text-2xl font-serif font-bold text-stone-900 group-hover:text-red-700">
                {item.hanzi}
              </div>
              <div className="text-xs text-red-600 font-medium mt-0.5">{item.pinyin}</div>
              <div className="text-xs text-stone-500 mt-1 truncate" title={item.meaning}>
                {item.meaning}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

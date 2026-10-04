import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Volume2,
  RotateCcw,
  Trophy,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  BookOpen,
  Plus,
  Layers,
  FolderPlus,
  X,
  AlertCircle,
  PenTool
} from 'lucide-react';
import { QuizQuestion, User, Vocabulary } from '../types';
import { api } from '../services/api';
import { speakChinese } from '../services/speech';

interface QuizPageProps {
  currentUser: User | null;
  setCurrentTab: (tab: 'home' | 'vocab' | 'quiz' | 'writing' | 'admin' | 'auth') => void;
  onOpenAiModal: (vocab: Vocabulary) => void;
}

export const QuizPage: React.FC<QuizPageProps> = ({
  currentUser,
  setCurrentTab,
  onOpenAiModal,
}) => {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loadingVocabs, setLoadingVocabs] = useState(true);

  const [gameState, setGameState] = useState<'setup' | 'playing' | 'result'>('setup');
  const [selectedLesson, setSelectedLesson] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showPinyinHint, setShowPinyinHint] = useState(true);
  const [userAnswers, setUserAnswers] = useState<
    {
      question: QuizQuestion;
      userChoice: string;
      isCorrect: boolean;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Add word modal state
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
  const [newWordData, setNewWordData] = useState({
    hanzi: '',
    pinyin: '',
    meaning: '',
    lesson: 'Bài 1: Chào hỏi & Làm quen',
    customLesson: '',
    category: 'Cơ bản',
    exampleSentence: '',
  });
  const [isCustomLesson, setIsCustomLesson] = useState(false);
  const [addWordLoading, setAddWordLoading] = useState(false);
  const [addWordSuccess, setAddWordSuccess] = useState<string | null>(null);
  const [addWordError, setAddWordError] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    loadVocabs();
  }, []);

  const loadVocabs = async () => {
    setLoadingVocabs(true);
    try {
      const res = await api.getVocabularies();
      setVocabularies(res.vocabularies);
    } catch (err) {
      console.error('Failed to load vocabularies for quiz:', err);
    } finally {
      setLoadingVocabs(false);
    }
  };

  // Group vocabularies by lesson
  const lessonMap = vocabularies.reduce((acc, v) => {
    const lessonName = v.lesson || 'Bài 1: Chào hỏi & Làm quen';
    if (!acc[lessonName]) {
      acc[lessonName] = [];
    }
    acc[lessonName].push(v);
    return acc;
  }, {} as Record<string, Vocabulary[]>);

  const availableLessons = Object.keys(lessonMap).sort();

  const startQuizForLesson = async (lesson: string, count: number = 10) => {
    setSelectedLesson(lesson);
    setLoading(true);
    try {
      const res = await api.getQuizQuestions(count, lesson);
      if (res.questions.length === 0) {
        alert('Chưa có câu hỏi nào cho bài học này. Vui lòng thêm từ mới vào bài!');
        return;
      }
      setQuestions(res.questions);
      setQuestionCount(count);
      setCurrentIndex(0);
      setScore(0);
      setUserAnswers([]);
      setSelectedOption(null);
      setIsAnswered(false);
      setGameState('playing');
    } catch (err: any) {
      alert('Không thể tạo bài trắc nghiệm: ' + (err.message || 'Lỗi server'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const currentQ = questions[currentIndex];
    const isCorrect = option === currentQ.correctMeaning;

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setUserAnswers((prev) => [
      ...prev,
      {
        question: currentQ,
        userChoice: option,
        isCorrect,
      },
    ]);
  };

  const handleNextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Finished quiz
      setGameState('result');
      if (currentUser) {
        try {
          await api.saveQuizResult(
            'quiz',
            score + (selectedOption === questions[currentIndex]?.correctMeaning && !isAnswered ? 1 : 0),
            questions.length
          );
        } catch (e) {
          console.error('Failed to save score:', e);
        }
      }
    }
  };

  // Open modal to add a new word to a lesson
  const handleOpenAddWord = (prefillLesson?: string) => {
    const targetLesson =
      prefillLesson ||
      (availableLessons.length > 0 ? availableLessons[0] : 'Bài 1: Chào hỏi & Làm quen');
    setNewWordData({
      hanzi: '',
      pinyin: '',
      meaning: '',
      lesson: targetLesson,
      customLesson: '',
      category: 'Cơ bản',
      exampleSentence: '',
    });
    setIsCustomLesson(false);
    setAddWordError(null);
    setAddWordSuccess(null);
    setIsAddWordModalOpen(true);
  };

  // AI autofill for new word
  const handleAiAutoFill = async () => {
    if (!newWordData.hanzi.trim()) {
      setAddWordError('Vui lòng nhập Chữ Hán trước để AI tạo Pinyin & Nghĩa');
      return;
    }

    setAiGenerating(true);
    setAddWordError(null);
    try {
      const aiData = await api.explainWord(newWordData.hanzi, newWordData.pinyin, newWordData.meaning);
      setNewWordData((prev) => ({
        ...prev,
        pinyin: prev.pinyin || aiData.pinyin,
        meaning: prev.meaning || aiData.meaning,
        exampleSentence: aiData.examples?.[0]?.chinese || prev.exampleSentence,
      }));
    } catch (err: any) {
      setAddWordError('Không thể tạo tự động: ' + (err.message || ''));
    } finally {
      setAiGenerating(false);
    }
  };

  // Submit adding new word
  const handleSaveNewWord = async (e: React.FormEvent, testImmediately: boolean = false) => {
    e.preventDefault();
    if (!newWordData.hanzi.trim() || !newWordData.pinyin.trim() || !newWordData.meaning.trim()) {
      setAddWordError('Vui lòng nhập đầy đủ Chữ Hán, Pinyin và Nghĩa tiếng Việt');
      return;
    }

    const finalLesson =
      isCustomLesson && newWordData.customLesson.trim()
        ? newWordData.customLesson.trim()
        : newWordData.lesson;

    setAddWordLoading(true);
    setAddWordError(null);
    try {
      const res = await api.addVocabulary({
        hanzi: newWordData.hanzi.trim(),
        pinyin: newWordData.pinyin.trim(),
        meaning: newWordData.meaning.trim(),
        category: newWordData.category || 'Cơ bản',
        lesson: finalLesson,
        exampleSentence: newWordData.exampleSentence || '',
      });

      setAddWordSuccess(`Đã thêm từ "${res.vocabulary.hanzi}" vào "${finalLesson}" thành công!`);

      // Refresh list
      const updatedList = await api.getVocabularies();
      setVocabularies(updatedList.vocabularies);

      if (testImmediately) {
        setTimeout(() => {
          setIsAddWordModalOpen(false);
          startQuizForLesson(finalLesson, 10);
        }, 500);
      } else {
        // Clear inputs for adding another word
        setNewWordData((prev) => ({
          ...prev,
          hanzi: '',
          pinyin: '',
          meaning: '',
          exampleSentence: '',
        }));
      }
    } catch (err: any) {
      setAddWordError(err.message || 'Lỗi khi thêm từ mới');
    } finally {
      setAddWordLoading(false);
    }
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* ================= SETUP / LESSON SELECTION STATE ================= */}
      {gameState === 'setup' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2">
                <HelpCircle className="w-3.5 h-3.5" />
                Trắc Nghiệm Theo Từng Bài Học
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
                Chọn Bài Học Để Kiểm Tra Trắc Nghiệm
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl">
                Làm trắc nghiệm chọn nghĩa đúng của các từ trong từng bài học. Bạn cũng có thể <strong>thêm từ mới vào từng bài</strong> để kiểm tra ngay!
              </p>
            </div>

            {/* Quick Add Word Button */}
            <button
              onClick={() => handleOpenAddWord()}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              Thêm từ mới vào bài
            </button>
          </div>

          {/* Lesson Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                Danh sách bài trắc nghiệm ({availableLessons.length} bài)
              </h2>

              <button
                onClick={() => startQuizForLesson('all', 10)}
                className="text-xs text-stone-600 hover:text-amber-700 font-semibold"
              >
                Làm ngẫu nhiên tất cả các bài (10 câu) →
              </button>
            </div>

            {loadingVocabs ? (
              <div className="py-16 text-center text-stone-500 text-sm">
                <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Đang tải danh sách bài học...
              </div>
            ) : availableLessons.length === 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center space-y-3">
                <p className="text-sm text-stone-600">Chưa có bài học nào trong hệ thống.</p>
                <button
                  onClick={() => handleOpenAddWord()}
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl"
                >
                  Tạo bài học & Thêm từ đầu tiên
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableLessons.map((lessonName, idx) => {
                  const wordsInLesson = lessonMap[lessonName] || [];
                  const previewChars = wordsInLesson.slice(0, 5).map((w) => w.hanzi).join('  ');

                  return (
                    <div
                      key={lessonName}
                      className="bg-white border-2 border-stone-200 hover:border-amber-500 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Top tag */}
                        <div className="flex items-start justify-between">
                          <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            Bài #{idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-stone-500">
                            {wordsInLesson.length} từ vựng
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-base text-stone-900 mt-2 group-hover:text-amber-800 transition-colors">
                          {lessonName}
                        </h3>

                        {/* Preview chips */}
                        <div className="mt-3 p-3 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between">
                          <div className="font-serif text-lg font-bold text-stone-800 tracking-wider truncate">
                            {previewChars}
                            {wordsInLesson.length > 5 && ' ...'}
                          </div>
                          <span className="text-[11px] text-stone-400 shrink-0 ml-2">
                            {wordsInLesson.length} câu hỏi
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenAddWord(lessonName)}
                          className="flex items-center gap-1 text-xs text-stone-600 hover:text-amber-700 font-semibold p-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                          title="Thêm từ mới vào bài này"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Thêm từ vào bài
                        </button>

                        <button
                          onClick={() => startQuizForLesson(lessonName, wordsInLesson.length)}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          Làm bài này
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= PLAYING STATE ================= */}
      {gameState === 'playing' && currentQ && (
        <div className="space-y-6">
          {/* Progress Header */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                {selectedLesson === 'all' ? 'Tất cả các bài' : selectedLesson}
              </span>
              <span className="text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-lg">
                Câu {currentIndex + 1} / {questions.length}
              </span>
              <span className="text-xs text-stone-600 font-medium ml-2">
                Điểm đúng: <strong className="text-stone-900">{score}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPinyinHint(!showPinyinHint)}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium px-2 py-1 rounded-lg bg-stone-100"
                title={showPinyinHint ? 'Ẩn Pinyin để thử thách hơn' : 'Hiện gợi ý Pinyin'}
              >
                {showPinyinHint ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPinyinHint ? 'Ẩn Pinyin' : 'Hiện Pinyin'}
              </button>

              <button
                onClick={() => speakChinese(currentQ.hanzi)}
                className="p-1.5 text-stone-600 hover:text-red-600 bg-stone-100 hover:bg-red-50 rounded-lg transition-colors"
                title="Nghe phát âm"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setGameState('setup')}
                className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1 rounded-lg hover:bg-stone-100 ml-1"
              >
                Đổi bài khác
              </button>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-md p-6 sm:p-8 text-center space-y-4">
            <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
              Chủ đề: {currentQ.category}
            </span>

            <div className="py-4">
              <div className="text-6xl sm:text-7xl font-serif font-bold text-stone-900 tracking-wider">
                {currentQ.hanzi}
              </div>
              {showPinyinHint && (
                <div className="text-xl font-semibold text-red-600 mt-2 font-mono">
                  {currentQ.pinyin}
                </div>
              )}
            </div>

            <p className="text-sm font-medium text-stone-600">
              Chọn nghĩa tiếng Việt đúng nhất cho từ này:
            </p>

            {/* 4 Multiple Choice Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
              {currentQ.options.map((opt, i) => {
                let btnStyle = 'border-stone-200 hover:border-stone-400 bg-white text-stone-800';

                if (isAnswered) {
                  if (opt === currentQ.correctMeaning) {
                    btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold';
                  } else if (opt === selectedOption) {
                    btnStyle = 'border-rose-500 bg-rose-50 text-rose-800 font-semibold';
                  } else {
                    btnStyle = 'border-stone-200 bg-stone-50 text-stone-400 opacity-60';
                  }
                }

                return (
                  <button
                    key={i}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(opt)}
                    className={`p-4 rounded-2xl border-2 text-sm transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <span>
                      <strong className="mr-2 text-xs opacity-60">
                        {String.fromCharCode(65 + i)}.
                      </strong>
                      {opt}
                    </span>
                    {isAnswered && opt === currentQ.correctMeaning && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    {isAnswered && opt === selectedOption && opt !== currentQ.correctMeaning && (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Feedback & Next Button */}
            {isAnswered && (
              <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="text-left text-xs">
                  {selectedOption === currentQ.correctMeaning ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Chính xác! Bạn nhớ từ rất tốt.
                    </span>
                  ) : (
                    <span className="text-rose-700 font-semibold flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Chưa đúng! Đáp án đúng là:{' '}
                      <strong>{currentQ.correctMeaning}</strong>
                    </span>
                  )}
                </div>

                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors self-end"
                >
                  {currentIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả bài thi'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= RESULT STATE ================= */}
      {gameState === 'result' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-md p-6 sm:p-10 space-y-8 animate-in fade-in zoom-in-95 duration-200">
          {/* Trophy Header */}
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-10 h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
              Hoàn Thành Bài Trắc Nghiệm!
            </h2>
            <div className="text-sm font-semibold text-amber-800">
              {selectedLesson === 'all' ? 'Tất cả các bài' : selectedLesson}
            </div>

            <div className="text-4xl font-extrabold text-red-600">
              {score} / {questions.length}
              <span className="text-lg text-stone-500 font-normal ml-2">
                ({Math.round((score / questions.length) * 100)}%)
              </span>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto">
              {score === questions.length
                ? '🌟 Xuất sắc tuyệt đối! Bạn nắm rất vững từ vựng bài học này.'
                : score >= questions.length * 0.7
                ? '👍 Làm tốt lắm! Tiếp tục duy trì phong độ nhé.'
                : '💪 Đừng nản lòng! Hãy ôn lại từ vựng qua Flashcards và thử lại nhé.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => startQuizForLesson(selectedLesson, questions.length)}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Làm lại bài thi này
            </button>

            <button
              onClick={() => handleOpenAddWord(selectedLesson !== 'all' ? selectedLesson : undefined)}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm từ mới vào bài này
            </button>

            <button
              onClick={() => setCurrentTab('writing')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <PenTool className="w-4 h-4" />
              Luyện viết chữ Hán bài này
            </button>

            <button
              onClick={() => setGameState('setup')}
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Chọn bài học khác
            </button>
          </div>

          {/* Detailed Question Review */}
          <div className="border-t border-stone-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-red-600" />
                Chi tiết kết quả trắc nghiệm bài học này
              </h3>
              <span className="text-xs text-stone-500">
                Nhấn "Hỏi AI" để được giải thích thêm
              </span>
            </div>

            <div className="space-y-3">
              {userAnswers.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.isCorrect
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {item.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-serif font-bold text-stone-900">
                          {item.question.hanzi}
                        </span>
                        <span className="text-xs font-medium text-red-600">
                          {item.question.pinyin}
                        </span>
                        <button
                          onClick={() => speakChinese(item.question.hanzi)}
                          className="text-stone-400 hover:text-stone-700"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-xs text-stone-600 mt-1">
                        Đáp án đúng: <strong className="text-emerald-700">{item.question.correctMeaning}</strong>
                        {!item.isCorrect && (
                          <span className="ml-2 text-rose-700">
                            (Bạn đã chọn: <em>{item.userChoice}</em>)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      onOpenAiModal({
                        id: item.question.vocabId,
                        hanzi: item.question.hanzi,
                        pinyin: item.question.pinyin,
                        meaning: item.question.correctMeaning,
                        category: item.question.category,
                        lesson: item.question.lesson,
                        createdBy: 'admin',
                        createdAt: '',
                      })
                    }
                    className="self-end sm:self-auto flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-red-700 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Hỏi AI từ này
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD NEW WORD TO LESSON ================= */}
      {isAddWordModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-stone-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-200" />
                <div>
                  <h3 className="font-bold text-base">Thêm Từ Mới Vào Bài Học</h3>
                  <p className="text-xs text-amber-100">
                    Thêm từ vào từng bài để làm bài kiểm tra trắc nghiệm
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddWordModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => handleSaveNewWord(e, false)}
              className="p-6 space-y-4 text-xs"
            >
              {addWordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addWordError}</span>
                </div>
              )}

              {addWordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{addWordSuccess}</span>
                </div>
              )}

              {/* Target Lesson Selection */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Chọn bài học cho từ này *
                </label>

                {!isCustomLesson ? (
                  <div className="space-y-1.5">
                    <select
                      value={newWordData.lesson}
                      onChange={(e) => setNewWordData({ ...newWordData, lesson: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      {availableLessons.map((les) => (
                        <option key={les} value={les}>
                          {les} ({lessonMap[les]?.length || 0} từ)
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsCustomLesson(true)}
                      className="text-[11px] text-amber-700 hover:underline font-semibold"
                    >
                      + Hoặc tạo một Bài học mới (ví dụ: Bài 5, Bài 6...)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      value={newWordData.customLesson}
                      onChange={(e) => setNewWordData({ ...newWordData, customLesson: e.target.value })}
                      placeholder="Nhập tên bài học mới, ví dụ: Bài 5: Gia đình & Bạn bè"
                      className="w-full px-3 py-2 text-xs border border-amber-500 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomLesson(false)}
                      className="text-[11px] text-stone-500 hover:underline"
                    >
                      ← Quay lại chọn bài học có sẵn
                    </button>
                  </div>
                )}
              </div>

              {/* AI Auto Fill */}
              <div className="flex items-center justify-between bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900">
                <span className="font-medium text-[11px]">Trợ lý AI hỗ trợ:</span>
                <button
                  type="button"
                  onClick={handleAiAutoFill}
                  disabled={aiGenerating}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  {aiGenerating ? 'AI đang tạo...' : 'Tự động điền Pinyin & Ví dụ'}
                </button>
              </div>

              {/* Word Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Chữ Hán *
                  </label>
                  <input
                    type="text"
                    required
                    value={newWordData.hanzi}
                    onChange={(e) => setNewWordData({ ...newWordData, hanzi: e.target.value })}
                    placeholder="Ví dụ: 喜欢"
                    className="w-full text-base font-serif px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Pinyin *
                  </label>
                  <input
                    type="text"
                    required
                    value={newWordData.pinyin}
                    onChange={(e) => setNewWordData({ ...newWordData, pinyin: e.target.value })}
                    placeholder="Ví dụ: xǐ huan"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Nghĩa tiếng Việt *
                </label>
                <input
                  type="text"
                  required
                  value={newWordData.meaning}
                  onChange={(e) => setNewWordData({ ...newWordData, meaning: e.target.value })}
                  placeholder="Ví dụ: Thích, yêu thích"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Câu ví dụ tiếng Trung (tùy chọn)
                </label>
                <input
                  type="text"
                  value={newWordData.exampleSentence}
                  onChange={(e) => setNewWordData({ ...newWordData, exampleSentence: e.target.value })}
                  placeholder="Ví dụ: 我喜欢学习汉语。"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl font-serif"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddWordModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl transition-colors"
                >
                  Đóng
                </button>

                <button
                  type="submit"
                  disabled={addWordLoading}
                  className="w-full sm:w-auto px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  {addWordLoading ? 'Đang lưu...' : '+ Lưu từ này'}
                </button>

                <button
                  type="button"
                  disabled={addWordLoading}
                  onClick={(e) => handleSaveNewWord(e, true)}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
                >
                  Lưu & Làm trắc nghiệm bài này ngay →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

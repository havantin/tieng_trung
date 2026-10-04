import React, { useState, useEffect } from 'react';
import {
  PenTool,
  CheckCircle2,
  XCircle,
  Volume2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Trophy,
  Lightbulb,
  Eye,
  EyeOff,
  Plus,
  BookOpen,
  Layers,
  FolderPlus,
  X,
  AlertCircle
} from 'lucide-react';
import { Vocabulary, User, AIMistakeAnalysis } from '../types';
import { api } from '../services/api';
import { speakChinese } from '../services/speech';

interface WritingPageProps {
  currentUser: User | null;
  setCurrentTab: (tab: 'home' | 'vocab' | 'quiz' | 'writing' | 'admin' | 'auth') => void;
  onOpenAiModal: (vocab: Vocabulary) => void;
}

export const WritingPage: React.FC<WritingPageProps> = ({
  currentUser,
  setCurrentTab,
  onOpenAiModal,
}) => {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loadingVocabs, setLoadingVocabs] = useState(true);

  // Lesson selection state
  const [selectedLesson, setSelectedLesson] = useState<string>('all');
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'result'>('setup');

  // Test state
  const [testItems, setTestItems] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Input & validation
  const [userInput, setUserInput] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showPinyinHint, setShowPinyinHint] = useState(false);
  const [score, setScore] = useState(0);

  // AI Mistake analysis state
  const [loadingAiMistake, setLoadingAiMistake] = useState(false);
  const [aiMistakeAnalysis, setAiMistakeAnalysis] = useState<AIMistakeAnalysis | null>(null);

  // History review
  const [testHistory, setTestHistory] = useState<
    {
      vocab: Vocabulary;
      userInput: string;
      isCorrect: boolean;
      aiFeedback?: AIMistakeAnalysis;
    }[]
  >([]);

  // Add new word modal state
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
      console.error('Failed to load vocabs for writing:', err);
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

  // Start test for a specific lesson or all
  const startTestForLesson = (lesson: string) => {
    setSelectedLesson(lesson);
    let itemsToPractice: Vocabulary[] = [];

    if (lesson === 'all') {
      itemsToPractice = [...vocabularies].sort(() => 0.5 - Math.random());
    } else {
      itemsToPractice = lessonMap[lesson] || [];
    }

    if (itemsToPractice.length === 0) {
      alert('Bài này chưa có từ vựng nào. Hãy thêm từ mới vào bài này để bắt đầu luyện viết!');
      return;
    }

    setTestItems(itemsToPractice);
    setCurrentIndex(0);
    setScore(0);
    setUserInput('');
    setIsSubmitted(false);
    setIsCorrect(null);
    setAiMistakeAnalysis(null);
    setShowPinyinHint(false);
    setTestHistory([]);
    setGameState('playing');
  };

  const currentItem = testItems[currentIndex];

  // Helper: Get character suggestions (virtual keypad)
  const getSuggestedChars = () => {
    if (!currentItem) return [];
    const correctChars = currentItem.hanzi.split('');
    const randomOtherChars = vocabularies
      .filter((v) => v.id !== currentItem.id)
      .flatMap((v) => v.hanzi.split(''))
      .sort(() => 0.5 - Math.random())
      .slice(0, 6);

    return Array.from(new Set([...correctChars, ...randomOtherChars])).sort(
      () => 0.5 - Math.random()
    );
  };

  const [suggestedChars, setSuggestedChars] = useState<string[]>([]);

  useEffect(() => {
    if (currentItem) {
      setSuggestedChars(getSuggestedChars());
    }
  }, [currentIndex, currentItem]);

  const handleCheckAnswer = async () => {
    if (!userInput.trim() || isSubmitted || !currentItem) return;

    const trimmedInput = userInput.trim();
    const cleanUser = trimmedInput.replace(/\s+/g, '');
    const cleanTarget = currentItem.hanzi.replace(/\s+/g, '');

    const correct = cleanUser === cleanTarget;
    setIsCorrect(correct);
    setIsSubmitted(true);

    if (correct) {
      setScore((prev) => prev + 1);
      speakChinese(currentItem.hanzi);
      setTestHistory((prev) => [
        ...prev,
        {
          vocab: currentItem,
          userInput: trimmedInput,
          isCorrect: true,
        },
      ]);
    } else {
      // Trigger AI mistake analysis automatically when incorrect!
      fetchAiMistake(trimmedInput, currentItem);
    }
  };

  const fetchAiMistake = async (input: string, vocab: Vocabulary) => {
    setLoadingAiMistake(true);
    setAiMistakeAnalysis(null);
    try {
      const data = await api.explainMistake(vocab.hanzi, input, vocab.meaning, vocab.pinyin);
      setAiMistakeAnalysis(data);

      setTestHistory((prev) => [
        ...prev,
        {
          vocab,
          userInput: input,
          isCorrect: false,
          aiFeedback: data,
        },
      ]);
    } catch (err) {
      console.error('AI mistake error:', err);
    } finally {
      setLoadingAiMistake(false);
    }
  };

  const handleNext = async () => {
    if (currentIndex < testItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserInput('');
      setIsSubmitted(false);
      setIsCorrect(null);
      setAiMistakeAnalysis(null);
      setShowPinyinHint(false);
    } else {
      // Finished writing practice for this lesson
      setGameState('result');
      if (currentUser) {
        try {
          await api.saveQuizResult('writing', score, testItems.length);
        } catch (e) {
          console.error('Failed to save writing score:', e);
        }
      }
    }
  };

  // Open modal to add a new word directly to a lesson
  const handleOpenAddWord = (prefillLesson?: string) => {
    const targetLesson = prefillLesson || (availableLessons.length > 0 ? availableLessons[0] : 'Bài 1: Chào hỏi & Làm quen');
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
  const handleSaveNewWord = async (e: React.FormEvent, practiceImmediately: boolean = false) => {
    e.preventDefault();
    if (!newWordData.hanzi.trim() || !newWordData.pinyin.trim() || !newWordData.meaning.trim()) {
      setAddWordError('Vui lòng nhập đầy đủ Chữ Hán, Pinyin và Nghĩa tiếng Việt');
      return;
    }

    const finalLesson = isCustomLesson && newWordData.customLesson.trim()
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

      if (practiceImmediately) {
        setTimeout(() => {
          setIsAddWordModalOpen(false);
          startTestForLesson(finalLesson);
        }, 500);
      } else {
        // Clear inputs for adding another word to the same lesson
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* ================= SETUP / LESSON SELECTION STATE ================= */}
      {gameState === 'setup' && (
        <div className="space-y-6">
          {/* Hero Title & Add Word Callout */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2">
                <PenTool className="w-3.5 h-3.5" />
                Luyện Viết Chữ Hán Theo Từng Bài
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
                Chọn Bài Học Để Luyện Viết
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl">
                Chọn bài học có sẵn hoặc <strong>thêm từ mới vào từng bài</strong> để luyện gõ chữ Hán. AI sẽ phân tích lỗi sai và chỉ bạn cách nhớ từng nét!
              </p>
            </div>

            {/* Quick Button to Add New Word */}
            <button
              onClick={() => handleOpenAddWord()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              Thêm từ mới vào bài
            </button>
          </div>

          {/* Lesson Grid Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Danh sách các bài học ({availableLessons.length} bài)
              </h2>

              <button
                onClick={() => startTestForLesson('all')}
                className="text-xs text-stone-600 hover:text-emerald-700 font-semibold"
              >
                Luyện ngẫu nhiên tất cả các bài ({vocabularies.length} từ) →
              </button>
            </div>

            {loadingVocabs ? (
              <div className="py-16 text-center text-stone-500 text-sm">
                <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Đang tải danh sách bài học...
              </div>
            ) : availableLessons.length === 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center space-y-3">
                <p className="text-sm text-stone-600">Chưa có bài học nào trong hệ thống.</p>
                <button
                  onClick={() => handleOpenAddWord()}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
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
                      className="bg-white border-2 border-stone-200 hover:border-emerald-500 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Lesson Header */}
                        <div className="flex items-start justify-between">
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            Bài #{idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-stone-500">
                            {wordsInLesson.length} từ vựng
                          </span>
                        </div>

                        {/* Lesson Name */}
                        <h3 className="font-bold text-base text-stone-900 mt-2 group-hover:text-emerald-800 transition-colors">
                          {lessonName}
                        </h3>

                        {/* Words Preview */}
                        <div className="mt-3 p-3 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between">
                          <div className="font-serif text-lg font-bold text-stone-800 tracking-wider truncate">
                            {previewChars}
                            {wordsInLesson.length > 5 && ' ...'}
                          </div>
                          <span className="text-[11px] text-stone-500 shrink-0 ml-2">
                            Mẫu từ
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenAddWord(lessonName)}
                          className="flex items-center gap-1 text-xs text-stone-600 hover:text-emerald-700 font-semibold p-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                          title="Thêm từ mới vào bài này"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Thêm từ vào bài
                        </button>

                        <button
                          onClick={() => startTestForLesson(lessonName)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          Luyện bài này
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
      {gameState === 'playing' && currentItem && (
        <div className="space-y-6">
          {/* Top Status Bar */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                {selectedLesson === 'all' ? 'Tất cả các bài' : selectedLesson}
              </span>
              <span className="text-xs font-medium text-stone-500">
                Từ <strong>{currentIndex + 1}</strong> / {testItems.length}
              </span>
              <span className="text-xs text-stone-600 font-medium ml-2">
                Đúng: <strong className="text-emerald-700">{score}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPinyinHint(!showPinyinHint)}
                className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium px-2.5 py-1 rounded-lg bg-stone-100"
              >
                {showPinyinHint ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPinyinHint ? 'Ẩn Pinyin' : 'Gợi ý Pinyin'}
              </button>

              <button
                onClick={() => setGameState('setup')}
                className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1 rounded-lg hover:bg-stone-100"
              >
                Đổi bài học khác
              </button>
            </div>
          </div>

          {/* Main Practice Box */}
          <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-md p-6 sm:p-8 space-y-6">
            {/* Prompt: Vietnamese Meaning */}
            <div className="text-center py-5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Nghĩa tiếng Việt cần viết
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
                {currentItem.meaning}
              </h2>
              {showPinyinHint && (
                <div className="mt-2 text-sm font-semibold text-emerald-700 flex items-center justify-center gap-1">
                  <span>Pinyin gợi ý:</span>
                  <span className="bg-emerald-100/70 px-2 py-0.5 rounded-md font-mono">
                    {currentItem.pinyin}
                  </span>
                </div>
              )}
            </div>

            {/* Input Form for Hanzi */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2 text-center">
                Gõ chữ Hán tương ứng vào ô bên dưới:
              </label>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCheckAnswer();
                }}
                className="space-y-3"
              >
                <div className="relative">
                  <input
                    type="text"
                    disabled={isSubmitted}
                    autoFocus
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Gõ chữ Hán vào đây (hoặc chọn gợi ý bên dưới)..."
                    className={`w-full text-center text-3xl sm:text-4xl font-serif font-bold py-4 px-4 rounded-2xl border-2 tracking-widest focus:outline-hidden transition-all ${
                      isSubmitted
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-rose-500 bg-rose-50 text-rose-900'
                        : 'border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                    }`}
                  />
                  {userInput && !isSubmitted && (
                    <button
                      type="button"
                      onClick={() => setUserInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs px-2 py-1 rounded-md"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                {/* Virtual Keypad / Character Picker */}
                {!isSubmitted && (
                  <div className="pt-1">
                    <div className="text-[11px] text-stone-600 text-center mb-1.5">
                      Bấm nhanh ký tự nếu chưa có bộ gõ tiếng Trung:
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {suggestedChars.map((char, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setUserInput((prev) => prev + char)}
                          className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-stone-200 text-lg font-serif font-bold transition-all"
                        >
                          {char}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setUserInput((prev) => prev.slice(0, -1))}
                        className="px-3 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs font-semibold text-stone-600 transition-all"
                      >
                        ⌫ Xóa
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                {!isSubmitted && (
                  <button
                    type="submit"
                    disabled={!userInput.trim()}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Kiểm tra đáp án
                  </button>
                )}
              </form>
            </div>

            {/* Answer Result Feedback */}
            {isSubmitted && (
              <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                {isCorrect ? (
                  /* CORRECT FEEDBACK */
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                        ✓
                      </div>
                      <div>
                        <div className="font-bold text-emerald-900 text-sm">
                          Chính xác tuyệt đối!
                        </div>
                        <div className="text-xs text-emerald-700 mt-0.5">
                          {currentItem.hanzi} ({currentItem.pinyin}) = {currentItem.meaning}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => speakChinese(currentItem.hanzi)}
                      className="p-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-xl transition-colors"
                      title="Phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* INCORRECT FEEDBACK WITH AI INTEGRATION */
                  <div className="space-y-3">
                    <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold">
                          ✗
                        </div>
                        <div>
                          <div className="font-bold text-rose-900 text-sm">
                            Chưa chính xác!
                          </div>
                          <div className="text-xs text-rose-800 mt-0.5">
                            Bạn đã gõ:{' '}
                            <span className="line-through font-serif font-bold text-stone-700">
                              {userInput || '(trống)'}
                            </span>{' '}
                            👉 Đáp án đúng là:{' '}
                            <strong className="font-serif text-lg text-emerald-800 underline ml-1">
                              {currentItem.hanzi}
                            </strong>{' '}
                            ({currentItem.pinyin})
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => speakChinese(currentItem.hanzi)}
                        className="p-2 bg-rose-100 text-rose-800 hover:bg-rose-200 rounded-xl transition-colors"
                        title="Nghe phát âm đáp án đúng"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* AI Mistake Explanation Card */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 shadow-xs">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-2">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        Trợ lý AI phân tích lỗi sai & Hướng dẫn nhớ chữ Hán:
                      </div>

                      {loadingAiMistake ? (
                        <div className="py-4 flex items-center justify-center gap-2 text-amber-800 text-xs">
                          <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>AI đang phân tích ký tự bạn vừa gõ...</span>
                        </div>
                      ) : aiMistakeAnalysis ? (
                        <div className="space-y-3 text-xs text-stone-800">
                          <p className="leading-relaxed">
                            <strong>Phân tích:</strong> {aiMistakeAnalysis.analysis}
                          </p>

                          {aiMistakeAnalysis.userCharMeaning && (
                            <div className="p-2.5 bg-white/70 rounded-xl border border-amber-200 text-amber-950 font-medium">
                              🔍 {aiMistakeAnalysis.userCharMeaning}
                            </div>
                          )}

                          {aiMistakeAnalysis.memoryTip && (
                            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div>
                                <strong>Mẹo nhớ chữ "{currentItem.hanzi}":</strong>{' '}
                                {aiMistakeAnalysis.memoryTip}
                              </div>
                            </div>
                          )}

                          {aiMistakeAnalysis.encouragement && (
                            <p className="text-amber-800 italic">
                              💌 {aiMistakeAnalysis.encouragement}
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => fetchAiMistake(userInput, currentItem)}
                          className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Hỏi AI phân tích lỗi sai
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Continue button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-xs"
                  >
                    {currentIndex < testItems.length - 1
                      ? 'Chuyển sang từ tiếp theo'
                      : 'Xem tổng kết bài học'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= RESULT STATE ================= */}
      {gameState === 'result' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-md p-6 sm:p-10 space-y-8 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-10 h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">
              Hoàn Thành Luyện Viết!
            </h2>
            <div className="text-sm font-semibold text-emerald-700">
              {selectedLesson === 'all' ? 'Tất cả các bài' : selectedLesson}
            </div>

            <div className="text-4xl font-extrabold text-emerald-600">
              {score} / {testItems.length}
              <span className="text-lg text-stone-500 font-normal ml-2">
                ({Math.round((score / testItems.length) * 100)}%)
              </span>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto">
              {score === testItems.length
                ? '🎉 Tuyệt vời! Bạn nhớ mặt chữ Hán của bài học này cực kỳ chuẩn xác.'
                : score >= testItems.length * 0.6
                ? '👍 Làm tốt lắm! Hãy tiếp tục luyện viết chữ Hán mỗi ngày để nét viết thêm thuần thục.'
                : '💪 Chữ Hán cần sự kiên nhẫn. Hãy ôn lại và thử luyện lại bài này nhé!'}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => startTestForLesson(selectedLesson)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Luyện lại bài này
            </button>

            <button
              onClick={() => handleOpenAddWord(selectedLesson !== 'all' ? selectedLesson : undefined)}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm từ mới vào bài này
            </button>

            <button
              onClick={() => setGameState('setup')}
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Chọn bài học khác
            </button>

            <button
              onClick={() => setCurrentTab('home')}
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              Về trang chủ
            </button>
          </div>

          {/* Test History Review */}
          <div className="border-t border-stone-200 pt-6">
            <h3 className="font-bold text-base text-stone-900 mb-4">
              Bảng đối chiếu kết quả luyện viết bài này
            </h3>

            <div className="space-y-3">
              {testHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.isCorrect
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {item.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs text-stone-500">
                          Nghĩa: <strong>{item.vocab.meaning}</strong>
                        </div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-xl font-serif font-bold text-stone-900">
                            {item.vocab.hanzi}
                          </span>
                          <span className="text-xs font-medium text-emerald-700">
                            ({item.vocab.pinyin})
                          </span>
                          {!item.isCorrect && (
                            <span className="text-xs text-rose-700 ml-2">
                              Bạn đã gõ: <em className="font-serif">{item.userInput || '(trống)'}</em>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenAiModal(item.vocab)}
                      className="flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-emerald-700 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Chi tiết từ
                    </button>
                  </div>
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
            <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-200" />
                <div>
                  <h3 className="font-bold text-base">Thêm Từ Mới Vào Bài Học</h3>
                  <p className="text-xs text-emerald-100">
                    Thêm từ vào từng bài để luyện viết chữ Hán có hệ thống
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
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
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
                      className="text-[11px] text-emerald-700 hover:underline font-semibold"
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
                      className="w-full px-3 py-2 text-xs border border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full text-base font-serif px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
                >
                  Lưu & Luyện bài này ngay →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

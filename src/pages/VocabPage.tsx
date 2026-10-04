import React, { useState, useEffect } from 'react';
import { Search, Volume2, Sparkles, RotateCw, ChevronLeft, ChevronRight, Shuffle, LayoutGrid, Layers, Bookmark } from 'lucide-react';
import { Vocabulary } from '../types';
import { api } from '../services/api';
import { speakChinese } from '../services/speech';

interface VocabPageProps {
  onOpenAiModal: (vocab: Vocabulary) => void;
}

export const VocabPage: React.FC<VocabPageProps> = ({ onOpenAiModal }) => {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedLesson, setSelectedLesson] = useState<string>('Tất cả');
  const [viewMode, setViewMode] = useState<'flashcard' | 'grid'>('flashcard');

  // Flashcard state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    loadVocabularies();
  }, []);

  const loadVocabularies = async () => {
    setLoading(true);
    try {
      const res = await api.getVocabularies();
      setVocabularies(res.vocabularies);
    } catch (err) {
      console.error('Failed to load vocabularies:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique categories & lessons
  const categories = ['Tất cả', ...Array.from(new Set(vocabularies.map((v) => v.category).filter(Boolean)))];
  const lessons = ['Tất cả', ...Array.from(new Set(vocabularies.map((v) => v.lesson || 'Bài 1: Chào hỏi & Làm quen').filter(Boolean)))];

  // Filtered list
  const filteredVocabularies = vocabularies.filter((v) => {
    const matchesSearch =
      v.hanzi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.pinyin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.meaning.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'Tất cả' || v.category === selectedCategory;
    const matchesLesson = selectedLesson === 'Tất cả' || (v.lesson || 'Bài 1: Chào hỏi & Làm quen') === selectedLesson;

    return matchesSearch && matchesCategory && matchesLesson;
  });

  // Flashcard navigation
  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < filteredVocabularies.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(filteredVocabularies.length - 1);
    }
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const rand = Math.floor(Math.random() * filteredVocabularies.length);
    setCurrentIndex(rand);
  };

  const currentFlashcard = filteredVocabularies[currentIndex];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <span>📚</span> Học Từ Vựng Tiếng Trung
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Trau dồi chữ Hán, Pinyin, nghĩa tiếng Việt cùng thẻ Flashcards và trợ lý AI
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-stone-200/80 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setViewMode('flashcard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'flashcard'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Thẻ ghi nhớ (Flashcard)
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Danh sách ({filteredVocabularies.length})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentIndex(0);
            }}
            placeholder="Tìm kiếm theo chữ Hán, pinyin hoặc nghĩa tiếng Việt..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {/* Lesson Filter Dropdown */}
        <div className="flex items-center gap-1.5 self-center">
          <span className="text-xs font-semibold text-stone-600 whitespace-nowrap">Bài học:</span>
          <select
            value={selectedLesson}
            onChange={(e) => {
              setSelectedLesson(e.target.value);
              setCurrentIndex(0);
            }}
            className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500 font-medium"
          >
            {lessons.map((les) => (
              <option key={les} value={les}>
                {les}
              </option>
            ))}
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-red-600 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-stone-600">Đang tải danh sách từ vựng...</p>
        </div>
      ) : filteredVocabularies.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8">
          <p className="text-stone-500 text-sm">Không tìm thấy từ vựng nào phù hợp.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('Tất cả');
            }}
            className="mt-3 text-xs text-red-600 font-semibold hover:underline"
          >
            Đặt lại bộ lọc tìm kiếm
          </button>
        </div>
      ) : viewMode === 'flashcard' && currentFlashcard ? (
        /* ================= FLASHCARD MODE ================= */
        <div className="max-w-xl mx-auto space-y-4">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between text-xs text-stone-600 font-medium px-2">
            <span>
              Thẻ <strong>{currentIndex + 1}</strong> / {filteredVocabularies.length}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold text-[11px]">
                {currentFlashcard.lesson || 'Bài 1'}
              </span>
              <span className="bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200 text-[11px]">
                {currentFlashcard.category}
              </span>
            </div>
          </div>

          {/* Interactive Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative min-h-[340px] sm:min-h-[380px] w-full bg-white rounded-3xl border-2 border-stone-200 shadow-md hover:border-red-400 transition-all cursor-pointer p-8 flex flex-col justify-between select-none group"
          >
            {/* Top Bar on Card */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 text-red-600" />
                {isFlipped ? 'Mặt sau (Giải nghĩa)' : 'Mặt trước (Chữ Hán)'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakChinese(currentFlashcard.hanzi);
                }}
                className="p-2 bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-700 rounded-full transition-colors"
                title="Phát âm"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content Area */}
            {!isFlipped ? (
              /* Front of Flashcard */
              <div className="text-center my-auto py-6">
                <div className="text-7xl sm:text-8xl font-serif font-bold text-stone-900 tracking-wider group-hover:scale-105 transition-transform duration-200">
                  {currentFlashcard.hanzi}
                </div>
                <div className="text-xs text-stone-600 mt-6 flex items-center justify-center gap-1 font-medium">
                  <RotateCw className="w-3.5 h-3.5" />
                  Chạm vào thẻ để lật xem Pinyin & Nghĩa tiếng Việt
                </div>
              </div>
            ) : (
              /* Back of Flashcard */
              <div className="text-center my-auto py-4 space-y-4 animate-in fade-in duration-200">
                <div className="text-4xl font-serif font-bold text-stone-900">
                  {currentFlashcard.hanzi}
                </div>
                <div className="text-2xl font-bold text-red-600 tracking-wide">
                  {currentFlashcard.pinyin}
                </div>
                <div className="text-xl font-semibold text-stone-800">
                  {currentFlashcard.meaning}
                </div>

                {currentFlashcard.exampleSentence && (
                  <div className="mt-4 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-left text-xs space-y-1">
                    <div className="text-stone-900 font-serif font-semibold">
                      {currentFlashcard.exampleSentence}
                    </div>
                    {currentFlashcard.examplePinyin && (
                      <div className="text-red-600 font-medium">
                        {currentFlashcard.examplePinyin}
                      </div>
                    )}
                    <div className="text-stone-600 italic">
                      👉 {currentFlashcard.exampleMeaning}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Bar: Action */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-100">
              <span className="text-xs text-stone-600">
                Ngày thêm: {currentFlashcard.createdAt}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAiModal(currentFlashcard);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                Hỏi AI
              </button>
            </div>
          </div>

          {/* Flashcard Controller Buttons */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handlePrev}
              className="p-3 bg-white border border-stone-200 hover:border-stone-400 rounded-2xl text-stone-700 shadow-2xs transition-colors"
              title="Từ trước đó"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-semibold shadow-2xs flex items-center gap-2 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              {isFlipped ? 'Xem chữ Hán' : 'Lật xem nghĩa'}
            </button>

            <button
              onClick={handleShuffle}
              className="p-3 bg-white border border-stone-200 hover:border-stone-400 rounded-2xl text-stone-700 shadow-2xs transition-colors"
              title="Ngẫu nhiên"
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              onClick={handleNext}
              className="p-3 bg-white border border-stone-200 hover:border-stone-400 rounded-2xl text-stone-700 shadow-2xs transition-colors"
              title="Từ tiếp theo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* ================= GRID LIST MODE ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVocabularies.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-red-300 hover:shadow-sm transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {item.lesson || 'Bài 1'}
                    </span>
                    <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                  </div>
                  <button
                    onClick={() => speakChinese(item.hanzi)}
                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-stone-50 rounded-lg transition-colors"
                    title="Nghe phát âm"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3">
                  <div className="text-3xl font-serif font-bold text-stone-900 group-hover:text-red-700 transition-colors">
                    {item.hanzi}
                  </div>
                  <div className="text-sm font-semibold text-red-600 mt-1">
                    {item.pinyin}
                  </div>
                  <div className="text-sm font-medium text-stone-700 mt-1">
                    {item.meaning}
                  </div>
                </div>

                {item.exampleSentence && (
                  <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-500">
                    <p className="font-serif text-stone-700 font-medium">{item.exampleSentence}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{item.exampleMeaning}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[10px] text-stone-400">
                  {item.createdAt}
                </span>
                <button
                  onClick={() => onOpenAiModal(item)}
                  className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Hỏi AI
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

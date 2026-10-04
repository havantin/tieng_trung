import React, { useState, useEffect } from 'react';
import { X, Sparkles, Volume2, Send, Lightbulb, BookMarked, MessageSquare } from 'lucide-react';
import { Vocabulary, AIWordExplanation } from '../types';
import { api } from '../services/api';
import { speakChinese } from '../services/speech';

interface AiExplainModalProps {
  vocab: Vocabulary | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AiExplainModal: React.FC<AiExplainModalProps> = ({ vocab, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<AIWordExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Custom question state
  const [customQuestion, setCustomQuestion] = useState('');
  const [customAnswer, setCustomAnswer] = useState<string | null>(null);
  const [askingCustom, setAskingCustom] = useState(false);

  useEffect(() => {
    if (isOpen && vocab) {
      loadExplanation();
      setCustomQuestion('');
      setCustomAnswer(null);
    } else {
      setExplanation(null);
      setError(null);
    }
  }, [isOpen, vocab]);

  const loadExplanation = async () => {
    if (!vocab) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.explainWord(vocab.hanzi, vocab.pinyin, vocab.meaning);
      setExplanation(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải giải thích từ AI');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || !vocab || askingCustom) return;

    setAskingCustom(true);
    try {
      const res = await api.askAI(
        { hanzi: vocab.hanzi, pinyin: vocab.pinyin, meaning: vocab.meaning },
        customQuestion
      );
      setCustomAnswer(res.answer);
    } catch (err: any) {
      setCustomAnswer('Lỗi khi gửi câu hỏi: ' + (err.message || 'Vui lòng thử lại'));
    } finally {
      setAskingCustom(false);
    }
  };

  if (!isOpen || !vocab) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-stone-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Trợ lý AI Tiếng Trung</h3>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-red-100">
                Giải thích nghĩa, cấu tạo chữ Hán & tạo câu ví dụ thực tế
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-stone-800">
          {/* Target Word Hero */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold font-serif text-stone-900 tracking-wide">
                {vocab.hanzi}
              </span>
              <span className="text-lg font-medium text-red-600">{vocab.pinyin}</span>
              <span className="text-stone-600 text-sm italic">({vocab.meaning})</span>
            </div>
            <button
              onClick={() => speakChinese(vocab.hanzi)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-semibold transition-colors"
              title="Nghe phát âm"
            >
              <Volume2 className="w-4 h-4" />
              Phát âm
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-stone-600 text-sm font-medium">
                AI đang suy nghĩ và phân tích từ vựng "{vocab.hanzi}"...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start justify-between">
              <div>
                <p className="font-semibold">Có lỗi xảy ra</p>
                <p className="text-xs mt-1 text-red-600">{error}</p>
              </div>
              <button
                onClick={loadExplanation}
                className="text-xs bg-red-600 text-white px-3 py-1 rounded-md font-medium hover:bg-red-700 ml-3"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* AI Explanation Result */}
          {explanation && !loading && (
            <div className="space-y-5">
              {/* Meaning & Usage Details */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm mb-2">
                  <BookMarked className="w-4 h-4 text-amber-700" />
                  Ý nghĩa & Ngữ cảnh sử dụng
                </div>
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">
                  {explanation.explanation}
                </p>
                {explanation.grammarNotes && (
                  <div className="mt-3 pt-3 border-t border-amber-200/60 text-xs text-amber-950 font-medium">
                    📌 <strong>Lưu ý ngữ pháp:</strong> {explanation.grammarNotes}
                  </div>
                )}
              </div>

              {/* Examples */}
              {explanation.examples && explanation.examples.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm mb-3">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    Câu ví dụ bằng tiếng Trung do AI tạo
                  </div>
                  <div className="space-y-2.5">
                    {explanation.examples.map((ex, i) => (
                      <div
                        key={i}
                        className="p-3.5 bg-white border border-stone-200 rounded-xl hover:border-red-300 transition-colors shadow-2xs group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-base font-semibold text-stone-900 font-serif">
                              {ex.chinese}
                            </div>
                            <div className="text-xs text-red-600 font-medium mt-0.5">
                              {ex.pinyin}
                            </div>
                            <div className="text-xs text-stone-600 mt-1">
                              👉 {ex.vietnamese}
                            </div>
                          </div>
                          <button
                            onClick={() => speakChinese(ex.chinese)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-stone-50 rounded-lg transition-colors"
                            title="Nghe câu ví dụ"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Memory Tip */}
              {explanation.tips && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Mẹo ghi nhớ từ AI
                    </span>
                    <p className="text-xs text-stone-700 mt-0.5 leading-relaxed">
                      {explanation.tips}
                    </p>
                  </div>
                </div>
              )}

              {/* Ask follow-up question */}
              <div className="border-t border-stone-200 pt-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-red-600" />
                  Bạn có thắc mắc gì thêm về từ này?
                </div>
                <form onSubmit={handleSendCustomQuestion} className="flex gap-2">
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Ví dụ: Từ này có đồng nghĩa với từ nào không?"
                    className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    disabled={askingCustom}
                  />
                  <button
                    type="submit"
                    disabled={askingCustom || !customQuestion.trim()}
                    className="px-3 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    {askingCustom ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Hỏi
                  </button>
                </form>

                {customAnswer && (
                  <div className="mt-3 p-3 bg-stone-100 rounded-xl text-xs text-stone-800 border border-stone-200 whitespace-pre-line leading-relaxed">
                    <strong className="text-stone-900">Trả lời từ AI:</strong>
                    <div className="mt-1">{customAnswer}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

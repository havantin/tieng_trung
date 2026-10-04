/**
 * Helper to speak Chinese text using browser's SpeechSynthesis API
 */
export function speakChinese(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85; // Slightly slower for language learners

  // Try to find a Chinese voice
  const voices = window.speechSynthesis.getVoices();
  const chineseVoice = voices.find(
    (v) => v.lang === 'zh-CN' || v.lang === 'zh' || v.lang.startsWith('zh')
  );
  if (chineseVoice) {
    utterance.voice = chineseVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

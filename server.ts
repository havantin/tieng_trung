import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { db, type User } from './server/db.ts';
dotenv.config();

const app = express();
app.use(express.json());

// Initialize Google Gemini AI SDK on the server
let aiClient: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: User;
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  if (token) {
    const user = db.findUserById(token);
    if (user) {
      req.user = user;
    }
  }
  next();
};

const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục' });
  }
  next();
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này' });
  }
  next();
};

app.use(authMiddleware);

// ==========================================
// AUTH ROUTES
// ==========================================

// Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu và họ tên' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 4 ký tự' });
    }

    const existing = db.findUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại, vui lòng chọn tên khác' });
    }

    // Public registration strictly creates 'user' (student) accounts only.
    // Admin accounts can only be created via CLI command script.
    const newUser = db.createUser({
      username: username.trim(),
      password: password,
      name: name.trim(),
      role: 'user',
    });

    const { password: _, ...userWithoutPassword } = newUser;
    return res.json({
      message: 'Đăng ký thành công',
      user: userWithoutPassword,
      token: newUser.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi server khi đăng ký: ' + err.message });
  }
});

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const user = db.findUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    const { password: _, ...userWithoutPassword } = user;
    return res.json({
      message: 'Đăng nhập thành công',
      user: userWithoutPassword,
      token: user.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi server khi đăng nhập: ' + err.message });
  }
});

// Get current user info
app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  const { password: _, ...userWithoutPassword } = req.user;
  return res.json({ user: userWithoutPassword });
});

// ==========================================
// ADMIN USER MANAGEMENT ROUTES
// ==========================================

// Get all users (Admin only)
app.get('/api/admin/users', requireAuth, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = db.getUsers().map((u) => {
      const results = db.getUserQuizResults(u.id);
      const { password: _, ...userSafe } = u;
      return {
        ...userSafe,
        totalQuizzes: results.length,
        averageScore:
          results.length > 0
            ? Math.round(results.reduce((acc, curr) => acc + curr.percentage, 0) / results.length)
            : 0,
      };
    });
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi tải danh sách người dùng: ' + err.message });
  }
});

// Admin creates new user
app.post('/api/admin/users', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu và họ tên' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 4 ký tự' });
    }

    const existing = db.findUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    }

    const newUser = db.createUser({
      username: username.trim(),
      password: password,
      name: name.trim(),
      role: role === 'admin' ? 'admin' : 'user',
    });

    const { password: _, ...userSafe } = newUser;
    return res.status(201).json({
      message: 'Tạo tài khoản thành công',
      user: userSafe,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi tạo tài khoản: ' + err.message });
  }
});

// Admin updates user info or resets password
app.put('/api/admin/users/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, password } = req.body;

    const user = db.findUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    const updates: Partial<Pick<User, 'name' | 'password' | 'role'>> = {};
    if (name && name.trim()) updates.name = name.trim();
    if (role === 'admin' || role === 'user') updates.role = role;
    if (password && password.trim().length >= 4) {
      updates.password = password.trim();
    }

    const updated = db.updateUser(id, updates);
    if (!updated) {
      return res.status(500).json({ error: 'Lỗi khi cập nhật tài khoản' });
    }

    const { password: _, ...userSafe } = updated;
    return res.json({
      message: 'Cập nhật tài khoản thành công',
      user: userSafe,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi cập nhật tài khoản: ' + err.message });
  }
});

// Admin deletes user
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Không thể xóa tài khoản Admin đang đăng nhập hiện tại' });
    }

    const success = db.deleteUser(id);
    if (!success) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng để xóa' });
    }

    return res.json({ message: 'Xóa tài khoản thành công' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi xóa người dùng: ' + err.message });
  }
});

// Admin views student's quiz & writing history
app.get('/api/admin/users/:id/results', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const targetUser = db.findUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    const results = db.getUserQuizResults(id);
    const { password: _, ...userSafe } = targetUser;
    return res.json({
      user: userSafe,
      results,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi tải kết quả học viên: ' + err.message });
  }
});

// ==========================================
// VOCABULARY ROUTES
// ==========================================

// Get all vocabularies
app.get('/api/vocabularies', (_req: Request, res: Response) => {
  try {
    const list = db.getVocabularies();
    return res.json({ vocabularies: list });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi tải từ vựng: ' + err.message });
  }
});

// Add vocabulary (Support adding new words with lesson)
app.post('/api/vocabularies', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hanzi, pinyin, meaning, category, lesson, exampleSentence, examplePinyin, exampleMeaning, createdAt } = req.body;
    if (!hanzi || !pinyin || !meaning) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Chữ Hán, Pinyin và Nghĩa tiếng Việt' });
    }

    const newVocab = db.addVocabulary(
      {
        hanzi: hanzi.trim(),
        pinyin: pinyin.trim(),
        meaning: meaning.trim(),
        category: category?.trim() || 'Cơ bản',
        lesson: lesson?.trim() || 'Bài 1: Chào hỏi & Làm quen',
        exampleSentence: exampleSentence?.trim() || '',
        examplePinyin: examplePinyin?.trim() || '',
        exampleMeaning: exampleMeaning?.trim() || '',
        createdBy: req.user ? req.user.username : 'hocvien',
      },
      createdAt
    );

    return res.status(201).json({
      message: 'Thêm từ vựng thành công',
      vocabulary: newVocab,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi thêm từ vựng: ' + err.message });
  }
});

// Update vocabulary (Admin or word owner)
app.put('/api/vocabularies/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { hanzi, pinyin, meaning, category, lesson, exampleSentence, examplePinyin, exampleMeaning, createdAt } = req.body;

    if (!hanzi || !pinyin || !meaning) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Chữ Hán, Pinyin và Nghĩa tiếng Việt' });
    }

    const updated = db.updateVocabulary(id, {
      hanzi: hanzi.trim(),
      pinyin: pinyin.trim(),
      meaning: meaning.trim(),
      category: category?.trim() || 'Cơ bản',
      lesson: lesson?.trim() || undefined,
      exampleSentence: exampleSentence?.trim() || '',
      examplePinyin: examplePinyin?.trim() || '',
      exampleMeaning: exampleMeaning?.trim() || '',
      createdAt: createdAt || undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy từ vựng để sửa' });
    }

    return res.json({
      message: 'Cập nhật từ vựng thành công',
      vocabulary: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi cập nhật từ vựng: ' + err.message });
  }
});

// Delete vocabulary (Admin only)
app.delete('/api/vocabularies/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = db.deleteVocabulary(id);
    if (!success) {
      return res.status(404).json({ error: 'Không tìm thấy từ vựng để xóa' });
    }
    return res.json({ message: 'Đã xóa từ vựng thành công' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi xóa từ vựng: ' + err.message });
  }
});

// ==========================================
// QUIZ & PRACTICE ROUTES
// ==========================================

// Generate multiple-choice quiz (supports filtering by lesson)
app.get('/api/quiz/questions', (req: Request, res: Response) => {
  try {
    const count = parseInt((req.query.count as string) || '10', 10);
    const lesson = req.query.lesson as string;
    const allVocabs = db.getVocabularies();

    if (allVocabs.length < 2) {
      return res.status(400).json({ error: 'Cần có ít nhất 2 từ vựng trong cơ sở dữ liệu để tạo bài trắc nghiệm' });
    }

    let targetVocabs = allVocabs;
    if (lesson && lesson !== 'all') {
      targetVocabs = allVocabs.filter((v) => (v.lesson || 'Bài 1: Chào hỏi & Làm quen') === lesson);
      if (targetVocabs.length === 0) {
        return res.status(400).json({ error: `Chưa có từ vựng nào trong bài "${lesson}"` });
      }
    }

    // If a specific lesson is chosen, test all words in that lesson; otherwise pick by count
    const selected = (lesson && lesson !== 'all')
      ? targetVocabs
      : [...targetVocabs].sort(() => 0.5 - Math.random()).slice(0, Math.min(count, targetVocabs.length));

    const questions = selected.map((item, idx) => {
      // Pick 3 distractors from allVocabs with different meaning
      const distractors = allVocabs
        .filter((v) => v.id !== item.id && v.meaning !== item.meaning)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((d) => d.meaning);

      // Fallbacks if total vocabs < 4
      const fallbackOptions = ['Không có nghĩa này', 'Chào mừng', 'Cảm ơn', 'Tạm biệt'];
      while (distractors.length < 3) {
        const fb = fallbackOptions.find((f) => f !== item.meaning && !distractors.includes(f));
        if (fb) distractors.push(fb);
        else distractors.push(`Lựa chọn ${distractors.length + 1}`);
      }

      const options = [...distractors, item.meaning].sort(() => 0.5 - Math.random());

      return {
        id: `q-${idx + 1}`,
        vocabId: item.id,
        hanzi: item.hanzi,
        pinyin: item.pinyin,
        correctMeaning: item.meaning,
        category: item.category,
        lesson: item.lesson || 'Bài 1',
        options,
      };
    });

    return res.json({ questions });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi tạo câu hỏi trắc nghiệm: ' + err.message });
  }
});

// Save quiz/writing results
app.post('/api/quiz/results', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, score, total } = req.body;
    if (typeof score !== 'number' || typeof total !== 'number' || total <= 0) {
      return res.status(400).json({ error: 'Thông tin điểm không hợp lệ' });
    }

    const percentage = Math.round((score / total) * 100);
    const record = db.addQuizResult({
      userId: req.user!.id,
      type: type === 'writing' ? 'writing' : 'quiz',
      score,
      total,
      percentage,
    });

    return res.json({
      message: 'Lưu kết quả thành công',
      result: record,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi lưu kết quả: ' + err.message });
  }
});

// Get user quiz stats
app.get('/api/quiz/stats', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const results = db.getUserQuizResults(req.user!.id);
    const totalQuizzes = results.length;
    const averageScore =
      totalQuizzes > 0
        ? Math.round(results.reduce((acc, curr) => acc + curr.percentage, 0) / totalQuizzes)
        : 0;

    return res.json({
      totalQuizzes,
      averageScore,
      history: results.slice(0, 10), // latest 10
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi tải kết quả: ' + err.message });
  }
});

// ==========================================
// GEMINI AI ASSISTANT ROUTES
// ==========================================

// AI Explain Word & Generate Example
app.post('/api/ai/explain-word', async (req: Request, res: Response) => {
  try {
    const { hanzi, pinyin, meaning } = req.body;
    if (!hanzi) {
      return res.status(400).json({ error: 'Thiếu chữ Hán cần giải thích' });
    }

    if (!aiClient) {
      // Fallback response if GEMINI_API_KEY is not set
      return res.json({
        hanzi,
        pinyin: pinyin || '',
        meaning: meaning || '',
        explanation: `Từ "${hanzi}" (${pinyin}) có nghĩa là "${meaning}". Đây là một từ thông dụng trong giao tiếp hàng ngày tiếng Trung.`,
        grammarNotes: 'Thường đứng trong câu với vai trò định ngữ, vị ngữ hoặc danh từ/động từ tùy ngữ cảnh.',
        examples: [
          {
            chinese: `我很喜欢${hanzi}。`,
            pinyin: `Wǒ hěn xǐhuan ${pinyin}.`,
            vietnamese: `Tôi rất thích ${meaning}.`,
          },
        ],
        tips: 'Hãy luyện viết từng nét theo thứ tự từ trên xuống dưới, từ trái qua phải để ghi nhớ lâu hơn.',
      });
    }

    const prompt = `Bạn là một giáo viên dạy tiếng Trung nhiệt tình, dễ hiểu và gần gũi cho học viên Việt Nam.
Hãy giải thích từ vựng tiếng Trung sau:
- Chữ Hán: ${hanzi}
- Pinyin: ${pinyin || ''}
- Nghĩa tiếng Việt: ${meaning || ''}

Yêu cầu trả về định dạng JSON thuần túy (không bọc trong thẻ markdown, không viết gì ngoài chuỗi JSON hợp lệ):
{
  "explanation": "Giải thích chi tiết nghĩa, ngữ cảnh sử dụng, cấu tạo chữ Hán hoặc bộ thủ nổi bật một cách sinh động, dễ hiểu.",
  "grammarNotes": "Cách dùng trong câu hoặc lưu ý kết hợp từ ngắn gọn.",
  "examples": [
    {
      "chinese": "Câu ví dụ tiếng Trung ngắn gọn, thông dụng",
      "pinyin": "Pinyin đầy đủ có dấu cho câu ví dụ",
      "vietnamese": "Dịch nghĩa tiếng Việt tự nhiên"
    },
    {
      "chinese": "Câu ví dụ thứ hai thực tế",
      "pinyin": "Pinyin có dấu",
      "vietnamese": "Dịch nghĩa tiếng Việt"
    }
  ],
  "tips": "Mẹo ghi nhớ từ vựng hoặc chữ Hán này nhanh thuộc"
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const rawText = response.text || '';
    // Clean potential markdown wrap
    const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return res.json({
        hanzi,
        pinyin,
        meaning,
        ...parsed,
      });
    } catch {
      return res.json({
        hanzi,
        pinyin,
        meaning,
        explanation: rawText,
        grammarNotes: '',
        examples: [
          {
            chinese: `学习${hanzi}`,
            pinyin: `xuéxí ${pinyin}`,
            vietnamese: `Học từ ${meaning}`,
          },
        ],
        tips: 'Luyện tập mỗi ngày cùng flashcard và bài kiểm tra trắc nghiệm!',
      });
    }
  } catch (err: any) {
    console.error('Gemini explain-word error:', err);
    return res.status(500).json({
      error: 'Không thể kết nối trợ lý AI lúc này: ' + (err.message || 'Lỗi không xác định'),
    });
  }
});

// AI Explain Mistake in Writing Test
app.post('/api/ai/explain-mistake', async (req: Request, res: Response) => {
  try {
    const { expectedHanzi, userAnswer, meaning, pinyin } = req.body;

    if (!expectedHanzi) {
      return res.status(400).json({ error: 'Thiếu thông tin chữ Hán đúng' });
    }

    if (!aiClient) {
      return res.json({
        analysis: `Bạn đã nhập "${userAnswer || '(trống)'}", trong khi đáp án đúng là "${expectedHanzi}" (${pinyin}: ${meaning}).`,
        userCharMeaning: userAnswer ? `Bạn đã nhập ký tự "${userAnswer}". Hãy quan sát kỹ lại các nét của chữ "${expectedHanzi}".` : 'Bạn chưa nhập chữ Hán.',
        memoryTip: `Chữ "${expectedHanzi}" có nghĩa là "${meaning}". Hãy nhớ viết đúng thứ tự các nét.`,
        encouragement: 'Đừng lo lắng, sai lầm là cơ hội tốt nhất để nhớ lâu hơn!',
      });
    }

    const prompt = `Bạn là gia sư tiếng Trung hướng dẫn học viên Việt Nam vừa làm sai trong bài kiểm tra viết chữ Hán.
- Nghĩa tiếng Việt yêu cầu: "${meaning}"
- Pinyin chuẩn: "${pinyin}"
- Chữ Hán đúng phải viết: "${expectedHanzi}"
- Học viên đã nhập: "${userAnswer || ''}"

Nhiệm vụ:
Phân tích lỗi sai thật cụ thể, ngắn gọn, thân thiện và hữu ích.
- Nếu học viên nhập sai một chữ Hán khác (ví dụ nhầm 是 với 日, hoặc nhầm chữ đồng âm khác nghĩa): Hãy chỉ rõ chữ học viên vừa nhập là chữ gì, mang nghĩa gì, vì sao hay bị nhầm.
- Nếu học viên nhập Pinyin / tiếng Việt hoặc bỏ trống: Hướng dẫn học viên cách gõ hoặc nhận diện chữ Hán "${expectedHanzi}".
- Cung cấp mẹo ghi nhớ chữ Hán đúng "${expectedHanzi}" (thông qua bộ thủ, hình tượng hoặc câu chuyện liên tưởng).
- Một lời khích lệ ngắn giúp học viên có động lực.

Yêu cầu trả về JSON thuần túy (không bọc trong thẻ markdown, không văn bản thừa):
{
  "analysis": "Phân tích cụ thể bạn đã gõ gì và vì sao lại sai so với đáp án",
  "userCharMeaning": "Nếu học viên nhập một chữ Hán khác thì giải thích ngắn chữ đó, nếu không thì phân tích lỗi nhập",
  "memoryTip": "Mẹo ghi nhớ nét/bộ thủ chữ Hán đúng ${expectedHanzi}",
  "encouragement": "Lời động viên ấm áp"
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const rawText = response.text || '';
    const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return res.json(parsed);
    } catch {
      return res.json({
        analysis: `Đáp án đúng là "${expectedHanzi}" (${pinyin} - ${meaning}). Bạn đã nhập "${userAnswer}".`,
        userCharMeaning: '',
        memoryTip: `Hãy tập viết chữ "${expectedHanzi}" nhiều lần để quen tay.`,
        encouragement: 'Cố lên bạn nhé, luyện tập kiên trì sẽ thành công!',
      });
    }
  } catch (err: any) {
    console.error('Gemini explain-mistake error:', err);
    return res.status(500).json({
      error: 'Không thể kết nối trợ lý AI: ' + (err.message || 'Lỗi không xác định'),
    });
  }
});

// Custom Q&A with AI for a vocabulary word
app.post('/api/ai/ask', async (req: Request, res: Response) => {
  try {
    const { word, question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Vui lòng nhập câu hỏi' });
    }

    if (!aiClient) {
      return res.json({
        answer: `Cảm ơn bạn đã hỏi về "${word?.hanzi || 'từ vựng này'}". Từ này có nghĩa là "${word?.meaning || ''}". Trong ngữ pháp tiếng Trung, hãy chú ý đến vị trí của từ trong câu nhé!`,
      });
    }

    const context = word
      ? `Ngữ cảnh từ vựng: Chữ Hán "${word.hanzi}", Pinyin "${word.pinyin}", Nghĩa "${word.meaning}".`
      : '';

    const prompt = `Bạn là giáo viên tiếng Trung thông thái và nhiệt tình.
${context}
Câu hỏi của học viên: "${question}"

Hãy trả lời bằng tiếng Việt một cách dễ hiểu, có ví dụ tiếng Trung kèm Pinyin nếu cần thiết. Trả lời súc tích, đi thẳng vào trọng tâm.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({ answer: response.text || '' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi khi hỏi AI: ' + (err.message || '') });
  }
});

// ==========================================
// STATIC & VITE MIDDLEWARE SETUP
// ==========================================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const PORT = 3000;

  if (isProd) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started and listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}
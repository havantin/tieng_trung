import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  username: string;
  password: string;
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
  lesson?: string; // e.g. "Bài 1: Chào hỏi & Làm quen"
  exampleSentence?: string;
  examplePinyin?: string;
  exampleMeaning?: string;
  createdBy: string;
  createdAt: string; // YYYY-MM-DD
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

interface DatabaseSchema {
  users: User[];
  vocabularies: Vocabulary[];
  quizResults: QuizResult[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

const INITIAL_VOCABULARIES: Vocabulary[] = [
  {
    id: 'vocab-1',
    hanzi: '你好',
    pinyin: 'nǐ hǎo',
    meaning: 'Xin chào',
    category: 'Giao tiếp hàng ngày',
    exampleSentence: '你好，很高兴认识你！',
    examplePinyin: 'Nǐ hǎo, hěn gāoxìng rènshi nǐ!',
    exampleMeaning: 'Xin chào, rất vui được làm quen với bạn!',
    createdBy: 'admin',
    createdAt: '2026-10-01'
  },
  {
    id: 'vocab-2',
    hanzi: '谢谢',
    pinyin: 'xiè xie',
    meaning: 'Cảm ơn',
    category: 'Giao tiếp hàng ngày',
    exampleSentence: '谢谢你的帮助。',
    examplePinyin: 'Xièxie nǐ de bāngzhù.',
    exampleMeaning: 'Cảm ơn sự giúp đỡ của bạn.',
    createdBy: 'admin',
    createdAt: '2026-10-01'
  },
  {
    id: 'vocab-3',
    hanzi: '再见',
    pinyin: 'zài jiàn',
    meaning: 'Tạm biệt, hẹn gặp lại',
    category: 'Giao tiếp hàng ngày',
    exampleSentence: '明天见，再见！',
    examplePinyin: 'Míngtiān jiàn, zàijiàn!',
    exampleMeaning: 'Ngày mai gặp, tạm biệt nhé!',
    createdBy: 'admin',
    createdAt: '2026-10-01'
  },
  {
    id: 'vocab-4',
    hanzi: '学习',
    pinyin: 'xué xí',
    meaning: 'Học tập, học',
    category: 'Trường học & Giáo dục',
    exampleSentence: '我每天学习两个小时汉语。',
    examplePinyin: 'Wǒ měitiān xuéxí liǎng gè xiǎoshí hànyǔ.',
    exampleMeaning: 'Mỗi ngày tôi học tiếng Trung hai tiếng.',
    createdBy: 'admin',
    createdAt: '2026-10-02'
  },
  {
    id: 'vocab-5',
    hanzi: '汉语',
    pinyin: 'hàn yǔ',
    meaning: 'Tiếng Hán, tiếng Trung',
    category: 'Trường học & Giáo dục',
    exampleSentence: '汉语不太难，但是很有意思。',
    examplePinyin: 'Hànyǔ bú tài nán, dànshì hěn yǒu yìsi.',
    exampleMeaning: 'Tiếng Trung không quá khó, nhưng rất thú vị.',
    createdBy: 'admin',
    createdAt: '2026-10-02'
  },
  {
    id: 'vocab-6',
    hanzi: '朋友',
    pinyin: 'péng you',
    meaning: 'Bạn bè',
    category: 'Quan hệ xã hội',
    exampleSentence: '他是我的好朋友。',
    examplePinyin: 'Tā shì wǒ de hǎo péngyou.',
    exampleMeaning: 'Anh ấy là người bạn tốt của tôi.',
    createdBy: 'admin',
    createdAt: '2026-10-02'
  },
  {
    id: 'vocab-7',
    hanzi: '老师',
    pinyin: 'lǎo shī',
    meaning: 'Thầy giáo, cô giáo',
    category: 'Trường học & Giáo dục',
    exampleSentence: '李老师教我们汉语。',
    examplePinyin: 'Lǐ lǎoshī jiāo wǒmen hànyǔ.',
    exampleMeaning: 'Cô Lý dạy chúng tôi tiếng Trung.',
    createdBy: 'admin',
    createdAt: '2026-10-02'
  },
  {
    id: 'vocab-8',
    hanzi: '学生',
    pinyin: 'xué sheng',
    meaning: 'Học sinh, sinh viên',
    category: 'Trường học & Giáo dục',
    exampleSentence: '他们都是大学学生。',
    examplePinyin: 'Tāmen dōu shì dàxué xuésheng.',
    exampleMeaning: 'Bọn họ đều là sinh viên đại học.',
    createdBy: 'admin',
    createdAt: '2026-10-02'
  },
  {
    id: 'vocab-9',
    hanzi: '喜欢',
    pinyin: 'xǐ huan',
    meaning: 'Thích, yêu thích',
    category: 'Cảm xúc & Sở thích',
    exampleSentence: '你喜欢喝中国茶吗？',
    examplePinyin: 'Nǐ xǐhuan hē zhōngguó chá ma?',
    exampleMeaning: 'Bạn có thích uống trà Trung Quốc không?',
    createdBy: 'admin',
    createdAt: '2026-10-03'
  },
  {
    id: 'vocab-10',
    hanzi: '吃',
    pinyin: 'chī',
    meaning: 'Ăn',
    category: 'Ẩm thực',
    exampleSentence: '你想吃什么中国菜？',
    examplePinyin: 'Nǐ xiǎng chī shénme zhōngguócài?',
    exampleMeaning: 'Bạn muốn ăn món Trung Quốc nào?',
    createdBy: 'admin',
    createdAt: '2026-10-03'
  },
  {
    id: 'vocab-11',
    hanzi: '喝',
    pinyin: 'hē',
    meaning: 'Uống',
    category: 'Ẩm thực',
    exampleSentence: '天气很热，多喝水吧。',
    examplePinyin: 'Tiānqì hěn rè, duō hē shuǐ ba.',
    exampleMeaning: 'Thời tiết rất nóng, hãy uống nhiều nước nhé.',
    createdBy: 'admin',
    createdAt: '2026-10-03'
  },
  {
    id: 'vocab-12',
    hanzi: '茶',
    pinyin: 'chá',
    meaning: 'Trà, chè',
    category: 'Ẩm thực',
    exampleSentence: '中国人很喜欢喝茶。',
    examplePinyin: 'Zhōngguórén hěn xǐhuan hē chá.',
    exampleMeaning: 'Người Trung Quốc rất thích uống trà.',
    createdBy: 'admin',
    createdAt: '2026-10-03'
  },
  {
    id: 'vocab-13',
    hanzi: '苹果',
    pinyin: 'píng guǒ',
    meaning: 'Quả táo',
    category: 'Ẩm thực',
    exampleSentence: '这个苹果很甜。',
    examplePinyin: 'Zhè ge píngguǒ hěn tián.',
    exampleMeaning: 'Quả táo này rất ngọt.',
    createdBy: 'admin',
    createdAt: '2026-10-03'
  },
  {
    id: 'vocab-14',
    hanzi: '家',
    pinyin: 'jiā',
    meaning: 'Nhà, gia đình',
    category: 'Gia đình & Cuộc sống',
    exampleSentence: '我的家有四口人。',
    examplePinyin: 'Wǒ de jiā yǒu sì kǒu rén.',
    exampleMeaning: 'Gia đình tôi có bốn người.',
    createdBy: 'admin',
    createdAt: '2026-10-03'
  },
  {
    id: 'vocab-15',
    hanzi: '看',
    pinyin: 'kàn',
    meaning: 'Xem, nhìn, đọc',
    category: 'Hành động',
    exampleSentence: '晚上我喜欢看电影。',
    examplePinyin: 'Wǎnshang wǒ xǐhuan kàn diànyǐng.',
    exampleMeaning: 'Buổi tối tôi thích xem phim.',
    createdBy: 'admin',
    createdAt: '2026-10-04'
  },
  {
    id: 'vocab-16',
    hanzi: '书',
    pinyin: 'shū',
    meaning: 'Sách',
    category: 'Trường học & Giáo dục',
    exampleSentence: '桌子上有一本汉语书。',
    examplePinyin: 'Zhuōzi shang yǒu yì běn hànyǔ shū.',
    exampleMeaning: 'Trên bàn có một cuốn sách tiếng Trung.',
    createdBy: 'admin',
    createdAt: '2026-10-04'
  },
  {
    id: 'vocab-17',
    hanzi: '听',
    pinyin: 'tīng',
    meaning: 'Nghe',
    category: 'Hành động',
    exampleSentence: '请大家认真听。',
    examplePinyin: 'Qǐng dàjiā rènzhēn tīng.',
    exampleMeaning: 'Xin mọi người hãy chăm chú lắng nghe.',
    createdBy: 'admin',
    createdAt: '2026-10-04'
  },
  {
    id: 'vocab-18',
    hanzi: '说',
    pinyin: 'shuō',
    meaning: 'Nói',
    category: 'Hành động',
    exampleSentence: '他说汉语说得很好。',
    examplePinyin: 'Tā shuō hànyǔ shuō de hěn hǎo.',
    exampleMeaning: 'Anh ấy nói tiếng Trung rất giỏi.',
    createdBy: 'admin',
    createdAt: '2026-10-04'
  },
  {
    id: 'vocab-19',
    hanzi: '写',
    pinyin: 'xiě',
    meaning: 'Viết',
    category: 'Hành động',
    exampleSentence: '这个汉字怎么写？',
    examplePinyin: 'Zhè ge hànzì zěnme xiě?',
    exampleMeaning: 'Chữ Hán này viết như thế nào?',
    createdBy: 'admin',
    createdAt: '2026-10-04'
  },
  {
    id: 'vocab-20',
    hanzi: '高兴',
    pinyin: 'gāo xìng',
    meaning: 'Vui vẻ, vui mừng',
    category: 'Cảm xúc & Sở thích',
    exampleSentence: '今天大家都很高兴。',
    examplePinyin: 'Jīntiān dàjiā dōu hěn gāoxìng.',
    exampleMeaning: 'Hôm nay mọi người đều rất vui mừng.',
    createdBy: 'admin',
    createdAt: '2026-10-04'
  }
];

const INITIAL_USERS: User[] = [
  {
    id: 'admin-1',
    username: 'admin',
    password: 'admin123',
    name: 'Quản trị viên (Admin)',
    role: 'admin',
    createdAt: '2026-10-01'
  },
  {
    id: 'user-1',
    username: 'hocvien',
    password: '123456',
    name: 'Học viên Nguyễn Văn A',
    role: 'user',
    createdAt: '2026-10-01'
  }
];

class Database {
  private data: DatabaseSchema;
  private lastMtime: number = 0;

  constructor() {
    this.data = this.load();
  }

  private refreshIfNeeded() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const stats = fs.statSync(DB_FILE);
        if (stats.mtimeMs > this.lastMtime) {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && parsed.users) {
            this.data = {
              users: parsed.users,
              vocabularies: parsed.vocabularies || [],
              quizResults: parsed.quizResults || []
            };
            this.lastMtime = stats.mtimeMs;
          }
        }
      }
    } catch {
      // ignore transient read lock
    }
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const stats = fs.statSync(DB_FILE);
        this.lastMtime = stats.mtimeMs;
        const vocabs = (parsed.vocabularies || INITIAL_VOCABULARIES).map((v: any, idx: number) => {
          if (!v.lesson) {
            if (idx < 5) v.lesson = 'Bài 1: Chào hỏi & Làm quen';
            else if (idx < 10) v.lesson = 'Bài 2: Trường học & Học tập';
            else if (idx < 15) v.lesson = 'Bài 3: Ẩm thực & Đời sống';
            else v.lesson = 'Bài 4: Hoạt động & Cảm xúc';
          }
          return v;
        });
        return {
          users: parsed.users || INITIAL_USERS,
          vocabularies: vocabs,
          quizResults: parsed.quizResults || []
        };
      }
    } catch (e) {
      console.error('Failed to load database, using defaults:', e);
    }
    const initialVocabs = INITIAL_VOCABULARIES.map((v, idx) => ({
      ...v,
      lesson: idx < 5 ? 'Bài 1: Chào hỏi & Làm quen' : idx < 10 ? 'Bài 2: Trường học & Học tập' : idx < 15 ? 'Bài 3: Ẩm thực & Đời sống' : 'Bài 4: Hoạt động & Cảm xúc'
    }));
    const initial: DatabaseSchema = {
      users: INITIAL_USERS,
      vocabularies: initialVocabs,
      quizResults: []
    };
    this.saveDirect(initial);
    return initial;
  }

  private saveDirect(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      if (fs.existsSync(DB_FILE)) {
        const stats = fs.statSync(DB_FILE);
        this.lastMtime = stats.mtimeMs;
      }
    } catch (e) {
      console.error('Failed to save database:', e);
    }
  }

  public save() {
    this.saveDirect(this.data);
  }

  // Users
  public getUsers(): User[] {
    this.refreshIfNeeded();
    return this.data.users;
  }

  public findUserByUsername(username: string): User | undefined {
    this.refreshIfNeeded();
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
  }

  public findUserById(id: string): User | undefined {
    this.refreshIfNeeded();
    return this.data.users.find(u => u.id === id);
  }

  public createUser(user: Omit<User, 'id' | 'createdAt'>): User {
    this.refreshIfNeeded();
    const newUser: User = {
      ...user,
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<Pick<User, 'name' | 'password' | 'role'>>): User | null {
    this.refreshIfNeeded();
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    this.data.users[index] = {
      ...this.data.users[index],
      ...updates
    };
    this.save();
    return this.data.users[index];
  }

  public deleteUser(id: string): boolean {
    this.refreshIfNeeded();
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    if (this.data.users.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Vocabularies
  public getVocabularies(): Vocabulary[] {
    this.refreshIfNeeded();
    return this.data.vocabularies;
  }

  public getVocabularyById(id: string): Vocabulary | undefined {
    this.refreshIfNeeded();
    return this.data.vocabularies.find(v => v.id === id);
  }

  public addVocabulary(vocab: Omit<Vocabulary, 'id' | 'createdAt'>, dateStr?: string): Vocabulary {
    const newVocab: Vocabulary = {
      ...vocab,
      id: 'vocab-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: dateStr || new Date().toISOString().split('T')[0]
    };
    this.data.vocabularies.unshift(newVocab);
    this.save();
    return newVocab;
  }

  public updateVocabulary(id: string, updates: Partial<Omit<Vocabulary, 'id' | 'createdBy'>>): Vocabulary | null {
    const index = this.data.vocabularies.findIndex(v => v.id === id);
    if (index === -1) return null;
    this.data.vocabularies[index] = {
      ...this.data.vocabularies[index],
      ...updates
    };
    this.save();
    return this.data.vocabularies[index];
  }

  public deleteVocabulary(id: string): boolean {
    const initialLen = this.data.vocabularies.length;
    this.data.vocabularies = this.data.vocabularies.filter(v => v.id !== id);
    if (this.data.vocabularies.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Quiz Results
  public addQuizResult(res: Omit<QuizResult, 'id' | 'completedAt'>): QuizResult {
    const record: QuizResult = {
      ...res,
      id: 'res-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      completedAt: new Date().toISOString()
    };
    this.data.quizResults.unshift(record);
    this.save();
    return record;
  }

  public getUserQuizResults(userId: string): QuizResult[] {
    return this.data.quizResults.filter(r => r.userId === userId);
  }
}

export const db = new Database();

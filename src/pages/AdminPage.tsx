import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  ShieldCheck,
  Sparkles,
  Volume2,
  Calendar,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Lock,
  Users,
  KeyRound,
  GraduationCap,
  History,
  X,
  Award
} from 'lucide-react';
import { Vocabulary, User, QuizResult } from '../types';
import { api } from '../services/api';
import { speakChinese } from '../services/speech';

interface AdminUserWithStats extends User {
  totalQuizzes: number;
  averageScore: number;
}

interface AdminPageProps {
  currentUser: User | null;
  onLoginAsAdmin: () => void;
  onOpenAiModal: (vocab: Vocabulary) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  currentUser,
  onLoginAsAdmin,
  onOpenAiModal,
}) => {
  // Navigation tab inside Admin page: 'vocab' | 'students'
  const [adminSection, setAdminSection] = useState<'vocab' | 'students'>('vocab');

  // ================= VOCABULARY MANAGEMENT STATES =================
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loadingVocab, setLoadingVocab] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | string>('all');
  const [lessonFilter, setLessonFilter] = useState<'all' | string>('all');

  // Modals for vocabulary
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVocab, setEditingVocab] = useState<Vocabulary | null>(null);
  const [deletingVocab, setDeletingVocab] = useState<Vocabulary | null>(null);

  // Vocabulary Form
  const [formData, setFormData] = useState({
    hanzi: '',
    pinyin: '',
    meaning: '',
    category: 'Giao tiếp hàng ngày',
    lesson: 'Bài 1: Chào hỏi & Làm quen',
    exampleSentence: '',
    examplePinyin: '',
    exampleMeaning: '',
    createdAt: new Date().toISOString().split('T')[0],
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // ================= STUDENT ACCOUNT MANAGEMENT STATES =================
  const [users, setUsers] = useState<AdminUserWithStats[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Modals for users
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [viewingUserResults, setViewingUserResults] = useState<{ user: User; results: QuizResult[] } | null>(null);

  // User form states
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'user' as 'user' | 'admin',
  });
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userFormSuccess, setUserFormSuccess] = useState<string | null>(null);
  const [userSubmitting, setUserSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadVocabularies();
      loadUsers();
    }
  }, [currentUser]);

  const loadVocabularies = async () => {
    setLoadingVocab(true);
    try {
      const res = await api.getVocabularies();
      setVocabularies(res.vocabularies);
    } catch (err) {
      console.error('Failed to load vocabularies in admin:', err);
    } finally {
      setLoadingVocab(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.getAdminUsers();
      setUsers(res.users);
    } catch (err) {
      console.error('Failed to load users in admin:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const availableLessons = Array.from(
    new Set(vocabularies.map((v) => v.lesson || 'Bài 1: Chào hỏi & Làm quen'))
  ).sort();

  // Vocabulary Filtering
  const filteredList = vocabularies.filter((v) => {
    const matchesSearch =
      v.hanzi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.pinyin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.meaning.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate =
      dateFilter === 'all'
        ? true
        : dateFilter === 'today'
        ? v.createdAt === todayStr
        : v.createdAt === dateFilter;

    const matchesLesson =
      lessonFilter === 'all' || (v.lesson || 'Bài 1: Chào hỏi & Làm quen') === lessonFilter;

    return matchesSearch && matchesDate && matchesLesson;
  });

  const todayCount = vocabularies.filter((v) => v.createdAt === todayStr).length;

  // Student Filtering
  const filteredUsers = users.filter((u) => {
    const term = userSearchTerm.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.username.toLowerCase().includes(term);
  });

  // ================= VOCABULARY HANDLERS =================
  const handleOpenAdd = () => {
    setFormData({
      hanzi: '',
      pinyin: '',
      meaning: '',
      category: 'Giao tiếp hàng ngày',
      lesson: availableLessons[0] || 'Bài 1: Chào hỏi & Làm quen',
      exampleSentence: '',
      examplePinyin: '',
      exampleMeaning: '',
      createdAt: todayStr,
    });
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (v: Vocabulary) => {
    setEditingVocab(v);
    setFormData({
      hanzi: v.hanzi,
      pinyin: v.pinyin,
      meaning: v.meaning,
      category: v.category || 'Cơ bản',
      lesson: v.lesson || 'Bài 1: Chào hỏi & Làm quen',
      exampleSentence: v.exampleSentence || '',
      examplePinyin: v.examplePinyin || '',
      exampleMeaning: v.exampleMeaning || '',
      createdAt: v.createdAt || todayStr,
    });
    setFormError(null);
    setFormSuccess(null);
  };

  const handleAiAutoFill = async () => {
    if (!formData.hanzi.trim()) {
      setFormError('Vui lòng nhập Chữ Hán trước để AI có thể tự động tạo Pinyin và câu ví dụ');
      return;
    }

    setAiGenerating(true);
    setFormError(null);
    try {
      const aiData = await api.explainWord(formData.hanzi, formData.pinyin, formData.meaning);
      setFormData((prev) => ({
        ...prev,
        pinyin: prev.pinyin || aiData.pinyin,
        meaning: prev.meaning || aiData.meaning,
        exampleSentence: aiData.examples?.[0]?.chinese || prev.exampleSentence,
        examplePinyin: aiData.examples?.[0]?.pinyin || prev.examplePinyin,
        exampleMeaning: aiData.examples?.[0]?.vietnamese || prev.exampleMeaning,
      }));
    } catch (err: any) {
      setFormError('AI không thể tạo ví dụ lúc này: ' + (err.message || ''));
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hanzi || !formData.pinyin || !formData.meaning) {
      setFormError('Vui lòng nhập đầy đủ Chữ Hán, Pinyin và Nghĩa tiếng Việt');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await api.addVocabulary(formData);
      setFormSuccess('Đã thêm từ vựng thành công!');
      await loadVocabularies();
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess(null);
      }, 500);
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi thêm từ vựng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVocab) return;

    if (!formData.hanzi || !formData.pinyin || !formData.meaning) {
      setFormError('Vui lòng nhập đầy đủ Chữ Hán, Pinyin và Nghĩa tiếng Việt');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await api.updateVocabulary(editingVocab.id, formData);
      setFormSuccess('Đã cập nhật từ vựng thành công!');
      await loadVocabularies();
      setTimeout(() => {
        setEditingVocab(null);
        setFormSuccess(null);
      }, 500);
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi cập nhật từ vựng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVocab = async () => {
    if (!deletingVocab) return;
    try {
      await api.deleteVocabulary(deletingVocab.id);
      setDeletingVocab(null);
      await loadVocabularies();
    } catch (err: any) {
      alert('Không thể xóa từ vựng: ' + (err.message || 'Lỗi server'));
    }
  };

  // ================= STUDENT ACCOUNT HANDLERS =================
  const handleOpenAddUser = () => {
    setUserFormData({
      username: '',
      password: '',
      name: '',
      role: 'user',
    });
    setUserFormError(null);
    setUserFormSuccess(null);
    setIsAddUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      password: '', // blank unless resetting
      name: user.name,
      role: user.role,
    });
    setUserFormError(null);
    setUserFormSuccess(null);
  };

  const handleSaveAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.username || !userFormData.password || !userFormData.name) {
      setUserFormError('Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu và họ tên');
      return;
    }

    setUserSubmitting(true);
    setUserFormError(null);
    try {
      await api.createAdminUser(userFormData);
      setUserFormSuccess('Đã tạo tài khoản học viên mới thành công!');
      await loadUsers();
      setTimeout(() => {
        setIsAddUserModalOpen(false);
        setUserFormSuccess(null);
      }, 500);
    } catch (err: any) {
      setUserFormError(err.message || 'Lỗi khi tạo tài khoản học viên');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUserSubmitting(true);
    setUserFormError(null);
    try {
      const payload: { name: string; role: 'user' | 'admin'; password?: string } = {
        name: userFormData.name.trim(),
        role: userFormData.role,
      };
      if (userFormData.password && userFormData.password.trim()) {
        payload.password = userFormData.password.trim();
      }

      await api.updateAdminUser(editingUser.id, payload);
      setUserFormSuccess('Đã cập nhật thông tin học viên thành công!');
      await loadUsers();
      setTimeout(() => {
        setEditingUser(null);
        setUserFormSuccess(null);
      }, 500);
    } catch (err: any) {
      setUserFormError(err.message || 'Lỗi khi cập nhật tài khoản');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await api.deleteAdminUser(deletingUser.id);
      setDeletingUser(null);
      await loadUsers();
    } catch (err: any) {
      alert('Không thể xóa tài khoản: ' + (err.message || 'Lỗi server'));
    }
  };

  const handleOpenUserResults = async (user: User) => {
    try {
      const res = await api.getAdminUserResults(user.id);
      setViewingUserResults(res);
    } catch (err: any) {
      alert('Không thể tải lịch sử làm bài: ' + (err.message || 'Lỗi server'));
    }
  };

  // If not logged in as Admin, show access gate
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-stone-200 rounded-3xl shadow-md text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">
          Khu Vực Quản Trị Viên (Admin)
        </h2>
        <p className="text-xs text-stone-600 leading-relaxed">
          Trang này dành riêng cho Quản trị viên để quản lý từ vựng và quản lý tài khoản học viên.
        </p>

        <div className="pt-2">
          <button
            onClick={onLoginAsAdmin}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Đăng nhập với tài khoản Admin
          </button>
        </div>
      </div>
    );
  }

  const studentCount = users.filter((u) => u.role === 'user').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Admin Top Header & Section Switcher */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-100 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN
              </span>
              <span className="text-xs text-stone-600">
                Xin chào, <strong>{currentUser.name}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
              Trung Tâm Quản Lý Hệ Thống
            </h1>
            <p className="text-xs sm:text-sm text-stone-600">
              Quản lý toàn diện từ vựng theo bài học và quản lý tài khoản học viên
            </p>
          </div>

          {/* Action button based on active section */}
          {adminSection === 'vocab' ? (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-all self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              Thêm từ vựng mới
            </button>
          ) : (
            <button
              onClick={handleOpenAddUser}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-all self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              Thêm tài khoản học viên
            </button>
          )}
        </div>

        {/* Section Tabs */}
        <div className="flex border-t border-stone-100 pt-4 gap-2">
          <button
            onClick={() => setAdminSection('vocab')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              adminSection === 'vocab'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            1. Quản lý Từ vựng ({vocabularies.length})
          </button>

          <button
            onClick={() => setAdminSection('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              adminSection === 'students'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            2. Quản lý Tài khoản Học viên ({users.length})
          </button>
        </div>
      </div>

      {/* ================= SECTION 1: VOCABULARY MANAGEMENT ================= */}
      {adminSection === 'vocab' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Stats Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-stone-900">{vocabularies.length}</div>
                <div className="text-xs text-stone-600">Tổng số từ vựng</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-stone-900">{todayCount}</div>
                <div className="text-xs text-stone-600">Từ vựng thêm hôm nay ({todayStr})</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-stone-900">{availableLessons.length} bài học</div>
                <div className="text-xs text-stone-600">Đã phân nhóm bài học</div>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo chữ Hán, Pinyin hoặc nghĩa tiếng Việt..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Date & Lesson Filter Tabs */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-stone-600">Bài học:</span>
                <select
                  value={lessonFilter}
                  onChange={(e) => setLessonFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">Tất cả bài ({vocabularies.length} từ)</option>
                  {availableLessons.map((les) => (
                    <option key={les} value={les}>
                      {les}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-stone-600">Ngày:</span>
                <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    onClick={() => setDateFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      dateFilter === 'all' ? 'bg-white text-stone-900 font-semibold shadow-2xs' : 'text-stone-600'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setDateFilter('today')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      dateFilter === 'today' ? 'bg-white text-stone-900 font-semibold shadow-2xs' : 'text-stone-600'
                    }`}
                  >
                    Hôm nay
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Vocabulary Data Table */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
            {loadingVocab ? (
              <div className="py-16 text-center text-stone-500 text-sm">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Đang tải dữ liệu từ vựng...
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center text-stone-500 text-sm">
                Không tìm thấy từ vựng nào phù hợp với bộ lọc.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Chữ Hán</th>
                      <th className="py-3.5 px-4">Pinyin</th>
                      <th className="py-3.5 px-4">Nghĩa tiếng Việt</th>
                      <th className="py-3.5 px-4">Bài học</th>
                      <th className="py-3.5 px-4">Chủ đề</th>
                      <th className="py-3.5 px-4">Ngày thêm</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredList.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                        {/* Hanzi */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-serif font-bold text-stone-900">
                              {item.hanzi}
                            </span>
                            <button
                              onClick={() => speakChinese(item.hanzi)}
                              className="p-1 text-stone-400 hover:text-red-600"
                              title="Phát âm"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Pinyin */}
                        <td className="py-3.5 px-4 font-semibold text-red-600">
                          {item.pinyin}
                        </td>

                        {/* Meaning */}
                        <td className="py-3.5 px-4 font-medium text-stone-800">
                          {item.meaning}
                        </td>

                        {/* Lesson */}
                        <td className="py-3.5 px-4">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                            {item.lesson || 'Bài 1'}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-[10px] font-medium">
                            {item.category}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-stone-600">
                          {item.createdAt}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenAiModal(item)}
                              className="p-1.5 text-stone-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hỏi AI"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-stone-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Sửa từ vựng"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingVocab(item)}
                              className="p-1.5 text-stone-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa từ vựng"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SECTION 2: STUDENT ACCOUNTS MANAGEMENT ================= */}
      {adminSection === 'students' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* User Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-stone-900">{users.length}</div>
                <div className="text-xs text-stone-600">Tổng tài khoản hệ thống</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-stone-900">{studentCount}</div>
                <div className="text-xs text-stone-600">Học viên đang học</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-stone-900">{adminCount}</div>
                <div className="text-xs text-stone-600">Tài khoản Quản trị viên</div>
              </div>
            </div>
          </div>

          {/* User Search & Header */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo tên đăng nhập hoặc họ và tên học viên..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Student Accounts Table */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
            {loadingUsers ? (
              <div className="py-16 text-center text-stone-500 text-sm">
                <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Đang tải danh sách học viên...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-stone-500 text-sm">
                Không tìm thấy tài khoản học viên nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Họ và tên</th>
                      <th className="py-3.5 px-4">Tên đăng nhập</th>
                      <th className="py-3.5 px-4">Vai trò</th>
                      <th className="py-3.5 px-4">Bài thi hoàn thành</th>
                      <th className="py-3.5 px-4">Điểm TB</th>
                      <th className="py-3.5 px-4">Ngày tạo</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-stone-50/70 transition-colors">
                        {/* Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs border border-stone-200">
                              {user.role === 'admin' ? '👑' : user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-stone-900">{user.name}</div>
                              {user.id === currentUser.id && (
                                <span className="text-[10px] text-amber-700 font-semibold">(Tài khoản của bạn)</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="py-3.5 px-4 font-mono text-stone-700">
                          {user.username}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {user.role === 'admin' ? (
                            <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              👑 Admin
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                              🎓 Học viên
                            </span>
                          )}
                        </td>

                        {/* Completed Quizzes */}
                        <td className="py-3.5 px-4 text-stone-700 font-medium">
                          {user.totalQuizzes} bài thi
                        </td>

                        {/* Average Score */}
                        <td className="py-3.5 px-4">
                          <span className={`font-bold ${user.averageScore >= 80 ? 'text-emerald-700' : user.averageScore >= 50 ? 'text-amber-700' : 'text-stone-500'}`}>
                            {user.totalQuizzes > 0 ? `${user.averageScore}%` : 'Chưa thi'}
                          </span>
                        </td>

                        {/* Created At */}
                        <td className="py-3.5 px-4 text-stone-500">
                          {user.createdAt}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenUserResults(user)}
                              className="p-1.5 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Xem kết quả thi"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenEditUser(user)}
                              className="p-1.5 text-stone-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Sửa / Đổi mật khẩu"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {user.id !== currentUser.id && (
                              <button
                                onClick={() => setDeletingUser(user)}
                                className="p-1.5 text-stone-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT VOCABULARY ================= */}
      {(isAddModalOpen || editingVocab) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-stone-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                {editingVocab ? <Edit2 className="w-4 h-4 text-amber-400" /> : <Plus className="w-4 h-4 text-red-400" />}
                {editingVocab ? 'Chỉnh Sửa Từ Vựng' : 'Thêm Từ Vựng Mới Mỗi Ngày'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingVocab(null);
                }}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingVocab ? handleSaveEdit : handleSaveAdd} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-between bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900">
                <span className="font-medium">Tiết kiệm thời gian với AI:</span>
                <button
                  type="button"
                  onClick={handleAiAutoFill}
                  disabled={aiGenerating}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  {aiGenerating ? 'AI đang tạo...' : 'Tự động tạo Pinyin & Ví dụ'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Chữ Hán *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hanzi}
                    onChange={(e) => setFormData({ ...formData, hanzi: e.target.value })}
                    placeholder="Ví dụ: 朋友"
                    className="w-full text-base font-serif px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Pinyin *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pinyin}
                    onChange={(e) => setFormData({ ...formData, pinyin: e.target.value })}
                    placeholder="Ví dụ: péng you"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500"
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
                  value={formData.meaning}
                  onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                  placeholder="Ví dụ: Bạn bè"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Bài học (Lesson) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lesson}
                  onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                  placeholder="Ví dụ: Bài 1: Chào hỏi & Làm quen"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  list="lesson-options"
                />
                <datalist id="lesson-options">
                  {availableLessons.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Chủ đề
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ví dụ: Giao tiếp hàng ngày"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Ngày thêm từ (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={formData.createdAt}
                    onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="border-t border-stone-200 pt-3 space-y-2">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Câu ví dụ minh họa (tùy chọn)
                </span>
                <input
                  type="text"
                  value={formData.exampleSentence}
                  onChange={(e) => setFormData({ ...formData, exampleSentence: e.target.value })}
                  placeholder="Câu ví dụ tiếng Trung: 他是我的好朋友。"
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-xl font-serif"
                />
                <input
                  type="text"
                  value={formData.examplePinyin}
                  onChange={(e) => setFormData({ ...formData, examplePinyin: e.target.value })}
                  placeholder="Pinyin câu ví dụ: Tā shì wǒ de hǎo péngyou."
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-xl"
                />
                <input
                  type="text"
                  value={formData.exampleMeaning}
                  onChange={(e) => setFormData({ ...formData, exampleMeaning: e.target.value })}
                  placeholder="Nghĩa câu ví dụ: Anh ấy là bạn tốt của tôi."
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingVocab(null);
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {submitting ? 'Đang lưu...' : editingVocab ? 'Lưu thay đổi' : 'Thêm từ vựng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD STUDENT ACCOUNT ================= */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-stone-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Thêm Tài Khoản Học Viên Mới
              </h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddUser} className="p-6 space-y-4 text-xs">
              {userFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}

              {userFormSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{userFormSuccess}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Họ và tên học viên *
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="Ví dụ: Trần Văn B"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Tên đăng nhập *
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  placeholder="Ví dụ: hocvien2"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Mật khẩu ban đầu *
                </label>
                <input
                  type="password"
                  required
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="Nhập ít nhất 4 ký tự"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Vai trò tài khoản
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="user">🎓 Học viên</option>
                  <option value="admin">👑 Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={userSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {userSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT USER & RESET PASSWORD ================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-stone-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                Sửa Thông Tin & Đặt Lại Mật Khẩu
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4 text-xs">
              {userFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}

              {userFormSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{userFormSuccess}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Tên đăng nhập (không thể thay đổi)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingUser.username}
                  className="w-full px-3 py-2 border border-stone-200 bg-stone-100 text-stone-500 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Vai trò tài khoản
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="user">🎓 Học viên</option>
                  <option value="admin">👑 Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="border-t border-stone-200 pt-3">
                <label className="block font-semibold text-amber-900 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  Đặt lại mật khẩu mới (bỏ trống nếu không muốn đổi)
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="Nhập mật khẩu mới nếu muốn reset..."
                  className="w-full px-3 py-2 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={userSubmitting}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl shadow-xs"
                >
                  {userSubmitting ? 'Đang lưu...' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW STUDENT TEST HISTORY ================= */}
      {viewingUserResults && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-stone-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="bg-emerald-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-200" />
                <div>
                  <h3 className="font-bold text-base">Lịch Sử Làm Bài Của Học Viên</h3>
                  <p className="text-xs text-emerald-100">{viewingUserResults.user.name} (@{viewingUserResults.user.username})</p>
                </div>
              </div>
              <button onClick={() => setViewingUserResults(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
              {viewingUserResults.results.length === 0 ? (
                <div className="py-12 text-center text-stone-500">
                  Học viên này chưa hoàn thành bài thi trắc nghiệm hoặc luyện viết nào.
                </div>
              ) : (
                viewingUserResults.results.map((res, i) => (
                  <div
                    key={res.id || i}
                    className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${res.type === 'writing' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {res.type === 'writing' ? 'Luyện viết' : 'Trắc nghiệm'}
                        </span>
                        <span className="text-stone-500">{new Date(res.completedAt).toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="text-stone-900 font-semibold mt-1">
                        Đúng {res.score} / {res.total} câu
                      </div>
                    </div>

                    <div className="flex items-center gap-1 font-bold text-base">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span className={res.percentage >= 80 ? 'text-emerald-700' : res.percentage >= 50 ? 'text-amber-700' : 'text-rose-700'}>
                        {res.percentage}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setViewingUserResults(null)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold rounded-xl text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATIONS ================= */}
      {/* Delete Vocab */}
      {deletingVocab && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-stone-900">
              Xác Nhận Xóa Từ Vựng?
            </h3>
            <p className="text-xs text-stone-600">
              Bạn có chắc chắn muốn xóa từ{' '}
              <strong className="font-serif text-stone-900 text-sm">
                "{deletingVocab.hanzi}" ({deletingVocab.meaning})
              </strong>{' '}
              khỏi cơ sở dữ liệu?
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingVocab(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteVocab}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-stone-900">
              Xác Nhận Xóa Học Viên?
            </h3>
            <p className="text-xs text-stone-600">
              Bạn có chắc chắn muốn xóa tài khoản{' '}
              <strong className="text-stone-900 text-sm">
                "{deletingUser.name}" (@{deletingUser.username})
              </strong>{' '}
              khỏi hệ thống? Dữ liệu lịch sử của học viên này cũng sẽ bị xóa.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

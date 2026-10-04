import React, { useState } from 'react';
import { LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
  onCancel?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(username, password);
        onLoginSuccess(res.user);
      } else {
        // Public registration always registers as student ('user')
        const res = await api.register(username, password, name, 'user');
        setSuccess('Đăng ký tài khoản học viên thành công!');
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 600);
      }
    } catch (err: any) {
      setError(err.message || 'Thao tác không thành công');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 px-4">
      {/* Main Form Box */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-md p-6 sm:p-8">
        {/* Tab switch */}
        <div className="flex rounded-xl bg-stone-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'login'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'register'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Đăng ký tài khoản
          </button>
        </div>

        <div className="text-center mb-5">
          <h2 className="text-xl font-bold text-stone-900">
            {mode === 'login' ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản mới'}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {mode === 'login'
              ? 'Đăng nhập để lưu tiến độ và điểm số luyện thi'
              : 'Đăng ký nhanh chóng để bắt đầu học tiếng Trung'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Họ và tên của bạn
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                Đăng nhập
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Đăng ký ngay
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

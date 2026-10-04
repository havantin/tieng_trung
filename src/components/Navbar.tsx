import React from 'react';
import { BookOpen, HelpCircle, PenTool, ShieldCheck, Home, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentTab: 'home' | 'vocab' | 'quiz' | 'writing' | 'admin' | 'auth';
  setCurrentTab: (tab: 'home' | 'vocab' | 'quiz' | 'writing' | 'admin' | 'auth') => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            onClick={() => setCurrentTab('home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-105 transition-transform">
              中
            </div>
            <div>
              <div className="font-bold text-lg leading-tight text-stone-900 group-hover:text-red-700 transition-colors">
                Học Tiếng Trung
              </div>
              <div className="text-xs text-stone-600 font-medium">
                Tự học • Luyện thi • Trợ lý AI
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setCurrentTab('home')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'home'
                  ? 'bg-red-50 text-red-700'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Home className="w-4 h-4" />
              Trang chủ
            </button>

            <button
              onClick={() => setCurrentTab('vocab')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'vocab'
                  ? 'bg-red-50 text-red-700'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Học từ vựng
            </button>

            <button
              onClick={() => setCurrentTab('quiz')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'quiz'
                  ? 'bg-red-50 text-red-700'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Trắc nghiệm
            </button>

            <button
              onClick={() => setCurrentTab('writing')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'writing'
                  ? 'bg-red-50 text-red-700'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <PenTool className="w-4 h-4" />
              Luyện viết
            </button>

            {/* Admin page link */}
            {currentUser?.role === 'admin' ? (
              <button
                onClick={() => setCurrentTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'admin'
                    ? 'bg-amber-100 text-amber-900 font-semibold'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Quản lý Admin
              </button>
            ) : (
              <button
                onClick={() => setCurrentTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors ${
                  currentTab === 'admin' ? 'bg-stone-100 text-stone-900' : ''
                }`}
                title="Khu vực dành cho Quản trị viên"
              >
                <ShieldCheck className="w-4 h-4 text-stone-400" />
                Khu Admin
              </button>
            )}
          </nav>

          {/* User Auth Info / Actions */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-stone-800 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[11px] font-medium text-stone-600">
                    {currentUser.role === 'admin' ? (
                      <span className="inline-flex items-center text-amber-700 font-bold">
                        👑 Quản trị viên
                      </span>
                    ) : (
                      'Học viên'
                    )}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-700 font-bold text-sm">
                  {currentUser.role === 'admin' ? '👑' : <UserIcon className="w-4 h-4 text-stone-600" />}
                </div>
                <button
                  onClick={onLogout}
                  title="Đăng xuất"
                  className="p-2 text-stone-600 hover:text-red-700 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCurrentTab('auth')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                Đăng nhập
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden border-t border-stone-200 py-2 justify-around text-xs font-medium text-stone-600">
          <button
            onClick={() => setCurrentTab('home')}
            className={`flex flex-col items-center gap-0.5 ${currentTab === 'home' ? 'text-red-600 font-semibold' : ''}`}
          >
            <Home className="w-4 h-4" />
            Trang chủ
          </button>
          <button
            onClick={() => setCurrentTab('vocab')}
            className={`flex flex-col items-center gap-0.5 ${currentTab === 'vocab' ? 'text-red-600 font-semibold' : ''}`}
          >
            <BookOpen className="w-4 h-4" />
            Từ vựng
          </button>
          <button
            onClick={() => setCurrentTab('quiz')}
            className={`flex flex-col items-center gap-0.5 ${currentTab === 'quiz' ? 'text-red-600 font-semibold' : ''}`}
          >
            <HelpCircle className="w-4 h-4" />
            Trắc nghiệm
          </button>
          <button
            onClick={() => setCurrentTab('writing')}
            className={`flex flex-col items-center gap-0.5 ${currentTab === 'writing' ? 'text-red-600 font-semibold' : ''}`}
          >
            <PenTool className="w-4 h-4" />
            Luyện viết
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`flex flex-col items-center gap-0.5 ${currentTab === 'admin' ? 'text-amber-700 font-semibold' : ''}`}
          >
            <ShieldCheck className="w-4 h-4" />
            Admin
          </button>
        </div>
      </div>
    </header>
  );
};

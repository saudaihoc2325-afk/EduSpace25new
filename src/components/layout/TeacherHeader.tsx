import React from 'react';
import { LogIn, LogOut, Menu, Plus, Sparkles, User } from 'lucide-react';
import { TeacherNavTab, TeacherProfile } from '../../types';
import { ORG_NAME } from '../../constants/gameTypes';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface TeacherHeaderProps {
  activeTab: TeacherNavTab;
  onOpenMobileNav: () => void;
  onQuickCreateActivity: () => void;
  onSwitchToStudent: () => void;
  teacherProfile: TeacherProfile | null;
}

const TAB_TITLES: Record<TeacherNavTab, { title: string; subtitle: string }> = {
  home: {
    title: 'Teacher Dashboard',
    subtitle: 'Overview of your interactive activities, assignments, and student engagement.',
  },
  'question-bank': {
    title: 'Question Bank & Import Engine',
    subtitle: 'Manage and import questions from Word (.docx), Excel (.xlsx), PDF, and CSV files into Firebase.',
  },
  'import-questions': {
    title: 'Import Questions',
    subtitle: 'Upload academic test files with automatic boundary detection and preview validation.',
  },
  'create-activity': {
    title: 'Create Activity',
    subtitle: 'Design high-impact English quizzes and interactive exercises for Grades 10-12.',
  },
  'my-activities': {
    title: 'My Activities',
    subtitle: 'Manage your library of interactive games, question sets, and assignments.',
  },
  folders: {
    title: 'Folder System',
    subtitle: 'Organize your curriculum by Grade (10, 11, 12), Unit, Vocabulary, and Grammar.',
  },
  assignments: {
    title: 'Assignments & Class Codes',
    subtitle: 'Distribute activities to students with dynamic 6-digit access codes and direct links.',
  },
  results: {
    title: 'Results & Analytics',
    subtitle: 'Track student submissions, average scores, class rankings, and question accuracy.',
  },
  students: {
    title: 'Student Roster',
    subtitle: 'View active high-school students, completed assignments, and average performance.',
  },
  settings: {
    title: 'Teacher Settings',
    subtitle: 'Manage organization preferences, school year, and platform defaults.',
  },
};

export const TeacherHeader: React.FC<TeacherHeaderProps> = ({
  activeTab,
  onOpenMobileNav,
  onQuickCreateActivity,
  onSwitchToStudent,
  teacherProfile,
}) => {
  const { currentUser, loginWithGoogle, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const info = TAB_TITLES[activeTab] || { title: 'Teacher Portal', subtitle: '' };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      showSuccess('Successfully signed in with Google.');
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        showError('Google sign in cancelled or not available.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showSuccess('Signed out of teacher session.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Left: Mobile menu toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          id="btn-open-mobile-sidebar"
          onClick={onOpenMobileNav}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md hidden sm:inline-block">
              {ORG_NAME}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display truncate">
              {info.title}
            </h2>
          </div>
          <p className="text-xs text-slate-500 truncate hidden lg:block">{info.subtitle}</p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {activeTab !== 'create-activity' && (
          <Button
            id="btn-header-create-activity"
            size="sm"
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={onQuickCreateActivity}
            className="hidden sm:inline-flex"
          >
            Create Activity
          </Button>
        )}

        <Button
          id="btn-header-student-mode"
          size="sm"
          variant="outline"
          icon={<Sparkles className="w-4 h-4 text-emerald-600" />}
          onClick={onSwitchToStudent}
        >
          <span className="hidden sm:inline">Student Portal</span>
          <span className="sm:hidden">Student</span>
        </Button>

        {/* Google Sign In / Account Button */}
        {!currentUser ? (
          <Button
            id="btn-header-google-signin"
            size="sm"
            variant="outline"
            icon={<LogIn className="w-4 h-4 text-indigo-600" />}
            onClick={handleGoogleSignIn}
            className="border-indigo-200 hover:bg-indigo-50 text-indigo-700"
          >
            <span className="hidden xl:inline">Sign In with Google</span>
            <span className="xl:hidden">Sign In</span>
          </Button>
        ) : (
          <Button
            id="btn-header-logout"
            size="sm"
            variant="outline"
            icon={<LogOut className="w-4 h-4 text-slate-500" />}
            onClick={handleLogout}
            className="text-slate-600 hover:text-red-600"
            title="Sign out"
          >
            <span className="hidden xl:inline">Sign Out</span>
          </Button>
        )}

        {/* Teacher profile pill */}
        <div className="hidden xl:flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold text-xs flex items-center justify-center overflow-hidden">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              teacherProfile?.displayName?.charAt(0) || <User className="w-4 h-4" />
            )}
          </div>
          <div className="text-left text-xs max-w-[140px]">
            <p className="font-semibold text-slate-900 leading-tight truncate">
              {currentUser?.displayName || teacherProfile?.displayName || 'English Teacher'}
            </p>
            <p className="text-[10px] text-slate-500 font-medium truncate">
              {currentUser ? 'Google Account' : (teacherProfile?.organization || ORG_NAME)}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

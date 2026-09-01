import React from 'react';
import {
  Home,
  PlusCircle,
  LayoutGrid,
  FolderTree,
  Send,
  BarChart3,
  Users,
  Settings,
  Sparkles,
  ExternalLink,
  X,
  GraduationCap,
  Wifi,
  WifiOff,
  UserCheck,
} from 'lucide-react';
import { TeacherNavTab } from '../../types';
import { APP_NAME, ORG_NAME } from '../../constants/gameTypes';
import { useAuth } from '../../context/AuthContext';

interface TeacherSidebarProps {
  activeTab: TeacherNavTab;
  onSelectTab: (tab: TeacherNavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onSwitchToStudent: () => void;
  activityCount: number;
  assignmentCount: number;
}

export const TeacherSidebar: React.FC<TeacherSidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onSwitchToStudent,
  activityCount,
  assignmentCount,
}) => {
  const { user, profile, isOnline } = useAuth();

  const navItems: Array<{
    id: TeacherNavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
  }> = [
    { id: 'home', label: 'HOME', icon: <Home className="w-4 h-4" /> },
    {
      id: 'question-bank',
      label: 'QUESTION BANK',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      badge: 'NEW',
    },
    {
      id: 'create-activity',
      label: 'CREATE ACTIVITY',
      icon: <PlusCircle className="w-4 h-4 text-indigo-400" />,
    },
    {
      id: 'my-activities',
      label: 'MY ACTIVITIES',
      icon: <LayoutGrid className="w-4 h-4" />,
      badge: activityCount > 0 ? activityCount : undefined,
    },
    { id: 'folders', label: 'FOLDERS', icon: <FolderTree className="w-4 h-4" /> },
    {
      id: 'assignments',
      label: 'ASSIGNMENTS',
      icon: <Send className="w-4 h-4" />,
      badge: assignmentCount > 0 ? assignmentCount : undefined,
    },
    { id: 'results', label: 'RESULTS', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'students', label: 'STUDENTS', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'SETTINGS', icon: <Settings className="w-4 h-4" /> },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-900/50 font-bold font-display text-lg">
              E25
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight font-display text-white leading-none">
                {APP_NAME}
              </h1>
              <span className="text-[11px] font-bold tracking-widest text-indigo-400 uppercase mt-1 inline-block">
                {ORG_NAME}
              </span>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Pill */}
        <div className="mt-3.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Teacher Portal</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-bold uppercase">
              Firestore
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Management</span>
          {isOnline ? (
            <span className="text-[9px] text-emerald-400 font-medium flex items-center gap-1">
              <Wifi className="w-3 h-3" /> Live
            </span>
          ) : (
            <span className="text-[9px] text-amber-400 font-medium flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isCreate = item.id === 'create-activity';

          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : isCreate
                  ? 'text-indigo-300 hover:bg-indigo-950/50 hover:text-white border border-indigo-800/50 bg-indigo-950/20'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : ''}>{item.icon}</span>
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white text-indigo-700'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Teacher Account Info & Student Portal Switcher */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
        {user && (
          <div className="px-2 py-1.5 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                {profile?.displayName?.charAt(0) || 'T'}
              </div>
              <div className="truncate">
                <p className="text-white font-semibold text-xs truncate">
                  {profile?.displayName || 'Teacher Account'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {profile?.email || 'Logged in'}
                </p>
              </div>
            </div>
            <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
        )}

        <button
          id="btn-switch-to-student"
          onClick={() => {
            onSwitchToStudent();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 transition-all group cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                Student Portal
              </p>
              <p className="text-[10px] text-slate-400">Join with 6-digit code</p>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0 border-r border-slate-800 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer backdrop */}
      {isOpenMobile && (
        <div
          id="mobile-drawer-backdrop"
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden animate-in fade-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile drawer */}
      <aside
        id="mobile-drawer"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:hidden transform transition-transform duration-200 ease-in-out shadow-2xl ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

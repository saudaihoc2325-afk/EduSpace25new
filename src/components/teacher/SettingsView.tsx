import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  User,
  GraduationCap,
  Database,
  CheckCircle2,
  RefreshCw,
  Save,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Cloud,
  Check,
  Users,
  Plus,
  Trash2,
  FolderPlus,
  Sparkles,
} from 'lucide-react';
import { ClassItem, GradeLevel, TeacherProfile } from '../../types';
import { ORG_NAME, APP_NAME } from '../../constants/gameTypes';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { classService } from '../../services/firestoreService';

interface SettingsViewProps {
  profile: TeacherProfile | null;
  onSaveProfile: (profile: Partial<TeacherProfile>) => Promise<void>;
  onResetDatabase?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onSaveProfile,
}) => {
  const { showSuccess, showError } = useToast();
  const { user, currentUser, loginWithGoogle, logout } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || 'English Teacher');
  const [organization, setOrganization] = useState(profile?.organization || ORG_NAME);
  const [email, setEmail] = useState(profile?.email || 'teacher@englishgroup.edu.vn');
  const [schoolYear, setSchoolYear] = useState(profile?.schoolYear || '2025 - 2026');
  const [defaultGrade, setDefaultGrade] = useState(profile?.defaultGrade || '10');
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Dynamic Class Management State
  const [savedClasses, setSavedClasses] = useState<ClassItem[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState<GradeLevel>('10');
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const teacherOwnerId = user?.uid || profile?.ownerId || 'teacher_default';

  useEffect(() => {
    const unsub = classService.subscribeClasses(teacherOwnerId, (list) => {
      setSavedClasses(list);
    });
    return () => unsub();
  }, [teacherOwnerId]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newClassName.trim().toUpperCase();
    if (!clean) {
      showError('Vui lòng nhập tên lớp học');
      return;
    }

    if (savedClasses.some((c) => c.name.toUpperCase() === clean)) {
      showError(`Lớp "${clean}" đã tồn tại trong danh sách`);
      return;
    }

    setIsSavingClass(true);
    try {
      await classService.addClass(teacherOwnerId, clean, newClassGrade);
      setNewClassName('');
      showSuccess(`Đã tạo lớp ${clean} thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo lớp';
      showError(msg);
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleDeleteClass = async (cls: ClassItem) => {
    if (!window.confirm(`Bạn có chắc muốn xóa lớp "${cls.name}" khỏi hệ thống?`)) return;

    setDeletingClassId(cls.id);
    try {
      await classService.deleteClass(cls.id);
      showSuccess(`Đã xóa lớp ${cls.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa lớp';
      showError(msg);
    } finally {
      setDeletingClassId(null);
    }
  };

  const handleDeleteAllClasses = async () => {
    if (savedClasses.length === 0) return;
    if (!window.confirm(`Bạn có chắc muốn xóa TẤT CẢ (${savedClasses.length}) lớp học?`)) return;

    setIsDeletingAll(true);
    try {
      await classService.deleteAllClasses(teacherOwnerId);
      showSuccess('Đã làm sạch toàn bộ danh sách lớp học!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa tất cả lớp';
      showError(msg);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      await loginWithGoogle();
      showSuccess('Google Account connected successfully!');
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        showError('Google authentication failed. Please try again.');
      }
    } finally {
      setIsAuthenticating(false);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfile({
        displayName: displayName.trim(),
        organization: organization.trim(),
        email: email.trim(),
        schoolYear: schoolYear.trim(),
        defaultGrade: defaultGrade as TeacherProfile['defaultGrade'],
      });
      showSuccess('Teacher profile and organization preferences updated in Firestore.');
    } catch (err) {
      console.error('Failed to update teacher settings:', err);
      showError('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
          Teacher & Organization Settings
        </h1>
        <p className="text-xs text-slate-500">
          Configure teacher credentials, institutional organization ({ORG_NAME}), and live Firestore preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card variant="default" padding="md" className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              Teacher Profile
            </h2>
            <Badge variant="primary" size="sm">
              English Department
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                id="settings-teacher-name"
                label="Full Name *"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                id="settings-teacher-email"
                label="Email Address *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                id="settings-organization"
                label="Organization / School Name *"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                id="settings-school-year"
                label="Academic School Year"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
              />
            </div>

            <div>
              <Select
                id="settings-default-grade"
                label="Default Target Grade"
                value={defaultGrade}
                onChange={(e) => setDefaultGrade(e.target.value as TeacherProfile['defaultGrade'])}
                options={[
                  { value: '10', label: 'Grade 10' },
                  { value: '11', label: 'Grade 11' },
                  { value: '12', label: 'Grade 12' },
                  { value: 'All Grades', label: 'All High School Grades (10-12)' },
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              id="btn-save-settings"
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
              icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {isSaving ? 'Saving to Firestore...' : 'Save Profile Settings'}
            </Button>
          </div>
        </Card>
      </form>

      {/* Target Class Management Card (Dynamic Class Management) */}
      <Card variant="default" padding="md" className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Quản lý Lớp học (Target Classes)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Danh sách lớp học tùy chỉnh của giáo viên được lưu đồng bộ trên Firestore.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="indigo" size="sm">
              {savedClasses.length} Lớp đang quản lý
            </Badge>
            {savedClasses.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllClasses}
                disabled={isDeletingAll}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer"
              >
                {isDeletingAll ? 'Đang xóa...' : 'Xóa tất cả lớp'}
              </button>
            )}
          </div>
        </div>

        {/* Add Class Inline Form */}
        <form onSubmit={handleAddClass} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <FolderPlus className="w-4 h-4 text-indigo-600" />
            <span>Thêm lớp học mới vào hệ thống</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Tên lớp (ví dụ: 10A1, 11A2, 12D1, CLB Tiếng Anh)..."
                className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold uppercase"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={newClassGrade}
                onChange={(e) => setNewClassGrade(e.target.value as GradeLevel)}
                className="flex-1 text-xs h-9 px-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none"
              >
                <option value="10">Khối 10</option>
                <option value="11">Khối 11</option>
                <option value="12">Khối 12</option>
                <option value="All Grades">Khối Chung</option>
              </select>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSavingClass || !newClassName.trim()}
                icon={isSavingClass ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                className="h-9 px-3 rounded-lg shrink-0"
              >
                {isSavingClass ? 'Lưu...' : 'Thêm lớp'}
              </Button>
            </div>
          </div>
        </form>

        {/* List of saved classes */}
        {savedClasses.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">Chưa có lớp học tùy chỉnh nào</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hệ thống không còn dùng danh sách lớp mặc định. Hãy thêm tên lớp học của bạn ở trên để gán bài tập cho từng lớp.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {savedClasses.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {cls.name.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{cls.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {cls.gradeLevel && cls.gradeLevel !== 'All Grades' ? `Khối ${cls.gradeLevel}` : 'Chung'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteClass(cls)}
                  disabled={deletingClassId === cls.id}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                  title="Xóa lớp học"
                >
                  {deletingClassId === cls.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Google Authentication & Identity Card */}
      <Card variant="default" padding="md" className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            Teacher Account Authentication
          </h2>
          <Badge variant={currentUser ? 'success' : 'default'} size="sm">
            {currentUser ? 'Google Account Connected' : 'Guest Teacher Session'}
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                profile?.displayName?.charAt(0) || <User className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {currentUser?.displayName || profile?.displayName || 'English Teacher'}
              </p>
              <p className="text-xs text-slate-500">
                {currentUser?.email || 'Operating in persistent local teacher session'}
              </p>
            </div>
          </div>

          <div>
            {!currentUser ? (
              <Button
                id="btn-settings-google-signin"
                type="button"
                variant="primary"
                size="sm"
                disabled={isAuthenticating}
                icon={isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                onClick={handleGoogleSignIn}
              >
                {isAuthenticating ? 'Connecting...' : 'Sign In with Google'}
              </Button>
            ) : (
              <Button
                id="btn-settings-logout"
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600 hover:text-red-600"
              >
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Database & Cloud Integration Status Card */}
      <Card variant="default" padding="md" className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            Cloud Database & Persistence Status
          </h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Badge variant="success" size="sm">
              Firebase Firestore Active
            </Badge>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <Cloud className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Real-Time Cloud Persistence</p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                All activities, question sets, folders, assignments, and student responses are securely persisted in Google Firebase Firestore.
                Data remains permanently stored across browser refreshes, tabs, and multi-device sessions.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-indigo-950">Strict Firestore Security Rules Enforced</p>
              <p className="text-indigo-800/80 mt-0.5 leading-relaxed">
                Teacher resources are protected and isolated by user UID (`ownerId`). Students have read access to active assignments and write access to submit score results.
              </p>
              {user && (
                <p className="text-[11px] font-mono text-indigo-600 mt-1">
                  Active Teacher UID: {user.uid}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

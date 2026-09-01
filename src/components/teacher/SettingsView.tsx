import React, { useState } from 'react';
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
} from 'lucide-react';
import { TeacherProfile } from '../../types';
import { ORG_NAME, APP_NAME } from '../../constants/gameTypes';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

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

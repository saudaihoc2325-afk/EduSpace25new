import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { TeacherProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  user: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  teacherProfile: TeacherProfile | null;
  profile: TeacherProfile | null;
  isLoading: boolean;
  isOnline: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<void>;
  loginTeacher: (email: string, pass: string) => Promise<void>;
  registerTeacher: (email: string, pass: string, name: string, organization?: string) => Promise<void>;
  loginAsGuestTeacher: (name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateTeacherSettings: (profile: Partial<TeacherProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ORG = 'ENGLISH GROUP';

const getGuestTeacherUid = (): string => {
  if (typeof window === 'undefined') return 'guest_teacher_edu25';
  let uid = localStorage.getItem('eduspace25_guest_uid');
  if (!uid) {
    uid = `teacher_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('eduspace25_guest_uid', uid);
  }
  return uid;
};

const getStoredGuestProfile = (uid: string): TeacherProfile => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('eduspace25_guest_profile');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
  }
  return {
    uid,
    displayName: 'English Teacher',
    email: 'teacher@englishgroup.edu.vn',
    organization: DEFAULT_ORG,
    schoolYear: '2025 - 2026',
    defaultGrade: '10',
    role: 'teacher',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync user profile document with Firestore
  const fetchOrCreateUserProfile = async (firebaseUser: User): Promise<TeacherProfile> => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        const profile: TeacherProfile = {
          uid: firebaseUser.uid,
          displayName: data.displayName || firebaseUser.displayName || 'English Teacher',
          email: data.email || firebaseUser.email || 'teacher@englishgroup.edu.vn',
          organization: data.organizationName || DEFAULT_ORG,
          schoolYear: data.schoolYear || '2025 - 2026',
          defaultGrade: data.defaultGrade || '10',
          role: 'teacher',
          createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
        };
        setTeacherProfile(profile);
        return profile;
      } else {
        const newProfile: TeacherProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'English Teacher',
          email: firebaseUser.email || 'teacher@englishgroup.edu.vn',
          organization: DEFAULT_ORG,
          schoolYear: '2025 - 2026',
          defaultGrade: '10',
          role: 'teacher',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(userRef, {
          uid: firebaseUser.uid,
          displayName: newProfile.displayName,
          email: newProfile.email,
          role: 'teacher',
          organizationName: newProfile.organization,
          schoolYear: newProfile.schoolYear,
          defaultGrade: newProfile.defaultGrade,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setTeacherProfile(newProfile);
        return newProfile;
      }
    } catch (error) {
      console.warn('Failed to load profile from Firestore, using auth user fallback:', error);
      const fallback: TeacherProfile = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || 'English Teacher',
        email: firebaseUser.email || 'teacher@englishgroup.edu.vn',
        organization: DEFAULT_ORG,
        schoolYear: '2025 - 2026',
        defaultGrade: '10',
        role: 'teacher',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTeacherProfile(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        try {
          await fetchOrCreateUserProfile(firebaseUser);
        } catch (err) {
          console.error('Error fetching teacher profile:', err);
        }
      } else {
        setCurrentUser(null);
        const guestUid = getGuestTeacherUid();
        const guestProfile = getStoredGuestProfile(guestUid);
        setTeacherProfile(guestProfile);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, provider);
      if (res.user) {
        setCurrentUser(res.user);
        await fetchOrCreateUserProfile(res.user);
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginTeacher = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      await fetchOrCreateUserProfile(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const registerTeacher = async (email: string, pass: string, name: string, organization: string = DEFAULT_ORG) => {
    setIsLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await updateProfile(res.user, { displayName: name });
        const userRef = doc(db, 'users', res.user.uid);
        await setDoc(userRef, {
          uid: res.user.uid,
          displayName: name,
          email,
          role: 'teacher',
          organizationName: organization,
          schoolYear: '2025 - 2026',
          defaultGrade: '10',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await fetchOrCreateUserProfile(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsGuestTeacher = async (name: string = 'English Teacher') => {
    const guestUid = getGuestTeacherUid();
    const profile = getStoredGuestProfile(guestUid);
    profile.displayName = name;
    setTeacherProfile(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('eduspace25_guest_profile', JSON.stringify(profile));
    }
  };

  const logout = async () => {
    if (currentUser) {
      await signOut(auth);
    }
    setCurrentUser(null);
    const guestUid = getGuestTeacherUid();
    const guestProfile = getStoredGuestProfile(guestUid);
    setTeacherProfile(guestProfile);
  };

  const updateTeacherSettings = async (profileUpdates: Partial<TeacherProfile>) => {
    const uid = currentUser?.uid || teacherProfile?.uid || getGuestTeacherUid();
    const userRef = doc(db, 'users', uid);
    const updatedData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (profileUpdates.displayName !== undefined) updatedData.displayName = profileUpdates.displayName;
    if (profileUpdates.organization !== undefined) updatedData.organizationName = profileUpdates.organization;
    if (profileUpdates.email !== undefined) updatedData.email = profileUpdates.email;
    if (profileUpdates.schoolYear !== undefined) updatedData.schoolYear = profileUpdates.schoolYear;
    if (profileUpdates.defaultGrade !== undefined) updatedData.defaultGrade = profileUpdates.defaultGrade;

    try {
      await setDoc(userRef, updatedData, { merge: true });
    } catch (e) {
      console.warn('Could not save user profile to Firestore, continuing with local state:', e);
    }

    if (profileUpdates.displayName && currentUser) {
      try {
        await updateProfile(currentUser, { displayName: profileUpdates.displayName });
      } catch {
        // non-blocking
      }
    }

    setTeacherProfile((prev) => {
      const updated = prev ? { ...prev, ...profileUpdates } : null;
      if (updated && typeof window !== 'undefined') {
        localStorage.setItem('eduspace25_guest_profile', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const effectiveUser = currentUser || (teacherProfile ? {
    uid: teacherProfile.uid,
    displayName: teacherProfile.displayName,
    email: teacherProfile.email,
    photoURL: null,
  } : null);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: effectiveUser,
        teacherProfile,
        profile: teacherProfile,
        isLoading,
        isOnline,
        isAuthenticated: !!currentUser,
        loginWithGoogle,
        loginTeacher,
        registerTeacher,
        loginAsGuestTeacher,
        logout,
        updateTeacherSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

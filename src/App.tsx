/**
 * EduSpace25 - Interactive Educational Game Platform
 * Organization: ENGLISH GROUP
 * Target: English Teachers & High School Students (Grades 10, 11, 12)
 *
 * Real Firebase Firestore Persistence Architecture:
 * - Real-time onSnapshot synchronization for Folders, Activities, Assignments, Results, and Students
 * - Authenticated Teacher isolation with dynamic anonymous / credential authentication
 * - Student Portal 6-digit access code real-time submission to Firestore
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Assignment,
  Folder,
  GameType,
  QuestionItem,
  StudentProfile,
  StudentResult,
  TeacherNavTab,
  UserRole,
  QuestionSet,
} from './types';
import {
  activityService,
  assignmentService,
  folderService,
  resultService,
  questionSetService,
} from './services/firestoreService';
import { dbService } from './services/db';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TeacherSidebar } from './components/layout/TeacherSidebar';
import { TeacherHeader } from './components/layout/TeacherHeader';
import { TeacherHome } from './components/teacher/TeacherHome';
import { CreateActivity } from './components/teacher/CreateActivity';
import { MyActivities } from './components/teacher/MyActivities';
import { FoldersView } from './components/teacher/FoldersView';
import { AssignmentsView } from './components/teacher/AssignmentsView';
import { ResultsView } from './components/teacher/ResultsView';
import { StudentsView } from './components/teacher/StudentsView';
import { SettingsView } from './components/teacher/SettingsView';
import { QuestionBankView } from './components/teacher/QuestionBankView';
import { StudentPortal } from './components/student/StudentPortal';
import { ActivityPlayModal } from './components/teacher/ActivityPlayModal';
import { AssignModal } from './components/teacher/AssignModal';
import { LoadingState } from './components/ui/LoadingState';
import { FireworksCanvas } from './components/effects/FireworksCanvas';

function MainApp() {
  const { showSuccess, showError } = useToast();
  const { user, profile, isLoading: isAuthLoading, updateTeacherSettings } = useAuth();

  // Primary Role View Switcher ('teacher' | 'student')
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        params.has('code') ||
        params.has('assignment') ||
        params.has('asgn') ||
        params.has('assignmentId') ||
        params.has('activity') ||
        params.has('activityId') ||
        params.get('portal') === 'student'
      ) {
        return 'student';
      }
    }
    return 'teacher';
  });

  const [studentInitialCode, setStudentInitialCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get('code') ||
        params.get('assignment') ||
        params.get('asgn') ||
        params.get('assignmentId') ||
        params.get('activity') ||
        params.get('activityId') ||
        null
      );
    }
    return null;
  });

  // Teacher Navigation State
  const [activeTab, setActiveTab] = useState<TeacherNavTab>('home');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // App Data from Firestore
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);

  // Load question sets from local storage / cache
  useEffect(() => {
    try {
      const sets = dbService.getQuestionSets();
      setQuestionSets(sets);
    } catch (e) {
      console.error('Error loading question sets:', e);
    }
  }, []);

  // Editor / Modal States
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [preloadedQuestions, setPreloadedQuestions] = useState<QuestionItem[] | undefined>(undefined);
  const [preloadedTitle, setPreloadedTitle] = useState<string | undefined>(undefined);
  const [preloadedGameType, setPreloadedGameType] = useState<GameType | undefined>(undefined);
  const [previewingActivity, setPreviewingActivity] = useState<Activity | null>(null);
  const [assigningActivity, setAssigningActivity] = useState<Activity | null>(null);
  const [targetResultAssignmentId, setTargetResultAssignmentId] = useState<string | null>(null);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    if (!user) {
      if (!isAuthLoading) setIsDataLoading(false);
      return;
    }

    const ownerId = user.uid;
    let initialCount = 0;
    const checkLoaded = () => {
      initialCount++;
      if (initialCount >= 5) {
        setIsDataLoading(false);
      }
    };

    // 1. Subscribe Folders
    const unsubFolders = folderService.subscribeFolders(
      ownerId,
      (data) => {
        setFolders(data);
        checkLoaded();
      },
      (err) => {
        console.error('Folders sync error:', err);
        checkLoaded();
      }
    );

    // 2. Subscribe Activities
    const unsubActivities = activityService.subscribeActivities(
      ownerId,
      (data) => {
        setActivities(data);
        checkLoaded();
      },
      (err) => {
        console.error('Activities sync error:', err);
        checkLoaded();
      }
    );

    // 3. Subscribe Assignments
    const unsubAssignments = assignmentService.subscribeAssignments(
      ownerId,
      (data) => {
        setAssignments(data);
        checkLoaded();
      },
      (err) => {
        console.error('Assignments sync error:', err);
        checkLoaded();
      }
    );

    // 4. Subscribe Results
    const unsubResults = resultService.subscribeResults(
      ownerId,
      (data) => {
        setResults(data);
        checkLoaded();
      },
      (err) => {
        console.error('Results sync error:', err);
        checkLoaded();
      }
    );

    // 5. Subscribe Students
    const unsubStudents = resultService.subscribeStudents(
      ownerId,
      (data) => {
        setStudents(data);
        checkLoaded();
      },
      (err) => {
        console.error('Students sync error:', err);
        checkLoaded();
      }
    );

    // 6. Subscribe Question Sets
    const unsubQuestionSets = questionSetService.subscribeQuestionSets(
      ownerId,
      (data) => {
        setQuestionSets(data);
      },
      (err) => {
        console.error('Question sets sync error:', err);
      }
    );

    return () => {
      unsubFolders();
      unsubActivities();
      unsubAssignments();
      unsubResults();
      unsubStudents();
      unsubQuestionSets();
    };
  }, [user, isAuthLoading]);

  // Handler for creating/updating activity in Firestore
  const handleSaveActivity = async (data: {
    id?: string;
    title: string;
    description?: string;
    gameType: GameType;
    folderId?: string | null;
    status?: Activity['status'];
    questions: QuestionItem[];
  }) => {
    if (!user) {
      showError('You must be signed in to save activities.');
      return;
    }

    if (data.id) {
      await activityService.updateActivity(data.id, user.uid, {
        title: data.title,
        description: data.description,
        gameType: data.gameType,
        folderId: data.folderId,
        status: data.status,
        questions: data.questions,
      });
    } else {
      await activityService.createActivity(user.uid, {
        title: data.title,
        description: data.description,
        gameType: data.gameType,
        folderId: data.folderId,
        status: data.status,
        questions: data.questions,
      });
    }
    setEditingActivity(null);
    setActiveTab('my-activities');
  };

  // Handler for duplicating activity in Firestore
  const handleDuplicateActivity = async (act: Activity) => {
    if (!user) return;
    await activityService.duplicateActivity(act.id, user.uid);
  };

  // Handler for deleting activity in Firestore
  const handleDeleteActivity = async (actId: string) => {
    await activityService.deleteActivity(actId);
  };

  // Handler for converting activity game format in Firestore
  const handleConvertGameType = async (actId: string, newType: GameType) => {
    if (!user) return;
    const act = activities.find((a) => a.id === actId);
    if (!act) return;
    await activityService.updateActivity(act.id, user.uid, {
      title: act.title,
      description: act.description,
      gameType: newType,
      folderId: act.folderId,
      status: act.status,
      questions: act.questionSet?.questions || [],
      questionSetId: act.questionSetId,
    });
  };

  // Handler for folder operations in Firestore
  const handleCreateFolder = async (data: { name: string; color?: string; description?: string }) => {
    if (!user) return;
    await folderService.createFolder(user.uid, data);
  };

  const handleRenameFolder = async (data: { id: string; name: string; color?: string; description?: string }) => {
    if (!user) return;
    await folderService.updateFolder(data.id, user.uid, {
      name: data.name,
      color: data.color,
      description: data.description,
    });
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!user) return;
    await folderService.deleteFolder(folderId, user.uid);
  };

  const handleMoveActivity = async (activityId: string, folderId: string | null) => {
    await activityService.moveActivityToFolder(activityId, folderId);
  };

  // Handler for creating assignment in Firestore
  const handleCreateAssignment = async (data: {
    activityId: string;
    title?: string;
    instructions?: string;
    targetClass?: string;
    targetType?: 'all' | 'class' | 'custom';
    classIds?: string[];
    startDate?: string;
    endDate?: string;
    maxAttempts?: number;
    allowRetry?: boolean;
    showAnswersAfter?: boolean;
    timeLimitMinutes?: number;
    settings?: Partial<Assignment['settings']>;
  }): Promise<Assignment | void> => {
    if (!user) {
      showError('Authentication required to create assignments.');
      return;
    }
    const act = activities.find((a) => a.id === data.activityId);
    if (!act) {
      showError('Selected activity could not be found.');
      return;
    }

    const asgn = await assignmentService.createAssignment(user.uid, {
      activityId: act.id,
      activityTitle: act.title,
      gameType: act.gameType,
      title: data.title || act.title,
      instructions: data.instructions,
      targetClass: data.targetClass || 'All Classes',
      targetType: data.targetType || 'all',
      classIds: data.classIds,
      startDate: data.startDate,
      endDate: data.endDate,
      maxAttempts: data.maxAttempts,
      allowRetry: data.allowRetry,
      showAnswersAfter: data.showAnswersAfter,
      timeLimitMinutes: data.timeLimitMinutes,
      settings: data.settings,
    });
    return asgn;
  };

  const handleUpdateAssignment = async (id: string, data: Partial<Assignment>) => {
    await assignmentService.updateAssignment(id, data);
  };

  const handleRegenerateCode = async (id: string): Promise<string | void> => {
    const res = await assignmentService.regenerateAssignmentCode(id);
    return res?.assignmentCode;
  };

  const handleCloseAssignment = async (id: string) => {
    await assignmentService.closeAssignment(id);
  };

  const handleDeleteAssignment = async (id: string) => {
    await assignmentService.deleteAssignment(id);
  };

  const handleDeleteResult = async (id: string) => {
    try {
      await resultService.deleteResult(id);
      dbService.deleteResult(id);
      setResults((prev) => prev.filter((r) => r.id !== id && r.attemptId !== id));
      showSuccess('Đã xóa kết quả bài làm thành công! Dữ liệu phân tích lỗi đã được cập nhật.');
    } catch (err) {
      console.error('Failed to delete student result:', err);
      showError('Không thể xóa kết quả bài làm. Vui lòng thử lại.');
    }
  };

  // Teacher navigation helpers
  const handleEditActivityClick = (act: Activity) => {
    setEditingActivity(act);
    setActiveTab('create-activity');
  };

  const handleQuickCreateActivity = () => {
    setEditingActivity(null);
    setActiveTab('create-activity');
  };

  const handleCreateActivityInFolder = (fId: string) => {
    setEditingActivity({
      id: '',
      ownerId: user?.uid || '',
      title: '',
      description: '',
      gameType: 'quiz',
      folderId: fId,
      questionSetId: '',
      status: 'published',
      itemCount: 0,
      createdAt: '',
      updatedAt: '',
    });
    setActiveTab('create-activity');
  };

  const handleViewAssignmentResults = (asgnId: string) => {
    setTargetResultAssignmentId(asgnId);
    setActiveTab('results');
  };

  const handleLaunchStudentForCode = (code: string) => {
    setStudentInitialCode(code);
    setCurrentRole('student');
  };

  // If viewing Student Portal
  if (currentRole === 'student') {
    return (
      <StudentPortal
        initialCode={studentInitialCode}
        onBackToTeacher={() => {
          setStudentInitialCode(null);
          setCurrentRole('teacher');
        }}
      />
    );
  }

  // Teacher Portal Layout
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900">
      {/* Desktop Sidebar & Mobile Drawer */}
      <TeacherSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'create-activity' && activeTab !== 'create-activity') {
            setEditingActivity(null);
          }
          setActiveTab(tab);
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSwitchToStudent={() => setCurrentRole('student')}
        activityCount={activities.length}
        assignmentCount={assignments.filter((a) => a.status === 'active').length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <TeacherHeader
          activeTab={activeTab}
          onOpenMobileNav={() => setIsMobileSidebarOpen(true)}
          onQuickCreateActivity={handleQuickCreateActivity}
          onSwitchToStudent={() => setCurrentRole('student')}
          teacherProfile={profile}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-16">
          {isAuthLoading || isDataLoading ? (
            <LoadingState message="Connecting to EduSpace25 Firestore Database..." />
          ) : (
            <>
              {activeTab === 'home' && (
                <TeacherHome
                  activities={activities}
                  folders={folders}
                  assignments={assignments}
                  results={results}
                  onNavigate={(tab) => {
                    if (tab === 'create-activity') {
                      setEditingActivity(null);
                      setPreloadedQuestions(undefined);
                      setPreloadedTitle(undefined);
                      setPreloadedGameType(undefined);
                    }
                    setActiveTab(tab);
                  }}
                  onPlayActivity={(act) => setPreviewingActivity(act)}
                  onAssignActivity={(act) => setAssigningActivity(act)}
                />
              )}

              {(activeTab === 'question-bank' || activeTab === 'import-questions') && user && (
                <QuestionBankView
                  teacherId={user.uid}
                  onNavigateToActivityEditor={(questions, title, gameType) => {
                    setEditingActivity(null);
                    setPreloadedQuestions(questions);
                    setPreloadedTitle(title);
                    setPreloadedGameType(gameType as GameType);
                    setActiveTab('create-activity');
                  }}
                />
              )}

              {activeTab === 'create-activity' && (
                <CreateActivity
                  folders={folders}
                  initialActivity={editingActivity}
                  initialQuestions={preloadedQuestions}
                  initialTitle={preloadedTitle}
                  initialGameType={preloadedGameType}
                  onSave={handleSaveActivity}
                  onCancel={() => {
                    setEditingActivity(null);
                    setPreloadedQuestions(undefined);
                    setPreloadedTitle(undefined);
                    setPreloadedGameType(undefined);
                    setActiveTab('my-activities');
                  }}
                />
              )}

              {activeTab === 'my-activities' && (
                <MyActivities
                  activities={activities}
                  folders={folders}
                  onCreateNew={handleQuickCreateActivity}
                  onEdit={handleEditActivityClick}
                  onDuplicate={handleDuplicateActivity}
                  onDelete={handleDeleteActivity}
                  onPlay={(act) => setPreviewingActivity(act)}
                  onAssign={(act) => setAssigningActivity(act)}
                  onConvertGameType={handleConvertGameType}
                />
              )}

              {activeTab === 'folders' && (
                <FoldersView
                  folders={folders}
                  activities={activities}
                  onCreateFolder={handleCreateFolder}
                  onRenameFolder={handleRenameFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onMoveActivity={handleMoveActivity}
                  onPlayActivity={(act) => setPreviewingActivity(act)}
                  onAssignActivity={(act) => setAssigningActivity(act)}
                  onCreateActivityInFolder={handleCreateActivityInFolder}
                />
              )}

              {activeTab === 'assignments' && (
                <AssignmentsView
                  assignments={assignments}
                  activities={activities}
                  onCreateAssignment={handleCreateAssignment}
                  onUpdateAssignment={handleUpdateAssignment}
                  onRegenerateCode={handleRegenerateCode}
                  onCloseAssignment={handleCloseAssignment}
                  onDeleteAssignment={handleDeleteAssignment}
                  onViewResults={handleViewAssignmentResults}
                  onLaunchStudentView={handleLaunchStudentForCode}
                />
              )}

              {activeTab === 'results' && (
                <ResultsView
                  results={results}
                  assignments={assignments}
                  activities={activities}
                  questionSets={questionSets}
                  initialSelectedAssignmentId={targetResultAssignmentId}
                  onDeleteResult={handleDeleteResult}
                />
              )}

              {activeTab === 'students' && (
                <StudentsView
                  students={students}
                  onNavigateToAssignments={() => setActiveTab('assignments')}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  profile={profile}
                  onSaveProfile={updateTeacherSettings}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Activity Preview Play Modal */}
      {previewingActivity && (
        <ActivityPlayModal
          activity={previewingActivity}
          onClose={() => setPreviewingActivity(null)}
          onAssign={(act) => {
            setPreviewingActivity(null);
            setAssigningActivity(act);
          }}
        />
      )}

      {/* Quick Assign Modal */}
      {assigningActivity && (
        <AssignModal
          activity={assigningActivity}
          onClose={() => setAssigningActivity(null)}
          onCreateAssignment={handleCreateAssignment}
          onViewAssignments={() => setActiveTab('assignments')}
          onLaunchStudentView={handleLaunchStudentForCode}
        />
      )}

      {/* Global Fireworks Particle Engine */}
      <FireworksCanvas />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}

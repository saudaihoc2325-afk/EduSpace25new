import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  HelpCircle,
  Shuffle,
  Disc,
  Package,
  KeyRound,
  Trophy,
  FileText,
  Save,
  ArrowLeft,
  Upload,
  Database,
  X,
  Check,
  Play,
  Settings,
  AlertTriangle,
  Volume2,
  Clock,
  CheckSquare,
  Sliders,
  Eye,
  Loader2,
} from 'lucide-react';
import { Activity, Folder, GameType, QuestionItem, QuestionSet, GameSettings } from '../../types';
import { GAME_TYPES } from '../../constants/gameTypes';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { questionSetService } from '../../services/firestoreService';
import { QuestionImporter } from './importer/QuestionImporter';
import { GameTypeSelector } from '../games/GameTypeSelector';
import { GameSessionRunner } from '../games/GameSessionRunner';
import { gameValidation, GameSuitabilityReport } from '../../utils/gameValidation';

interface CreateActivityProps {
  folders: Folder[];
  initialActivity?: Activity | null;
  initialQuestions?: QuestionItem[];
  initialTitle?: string;
  initialGameType?: GameType;
  onSave: (data: {
    id?: string;
    title: string;
    description?: string;
    gameType: GameType;
    folderId?: string | null;
    status?: Activity['status'];
    questions: QuestionItem[];
    selectedQuestionIds?: string[];
    settings?: GameSettings;
  }) => Promise<void>;
  onCancel: () => void;
}

export const CreateActivity: React.FC<CreateActivityProps> = ({
  folders,
  initialActivity,
  initialQuestions,
  initialTitle,
  initialGameType,
  onSave,
  onCancel,
}) => {
  const { showSuccess, showError, showInfo } = useToast();
  const { user } = useAuth();

  const [title, setTitle] = useState(
    initialActivity?.title || initialTitle || ''
  );
  const [description, setDescription] = useState(initialActivity?.description || '');
  const [selectedGameType, setSelectedGameType] = useState<GameType>(
    initialActivity?.gameType || initialGameType || 'quiz'
  );
  const [folderId, setFolderId] = useState<string>(initialActivity?.folderId || '');
  const [status, setStatus] = useState<Activity['status']>(initialActivity?.status || 'published');
  const [isSaving, setIsSaving] = useState(false);

  // Question count selection: 'ALL' or number
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number | 'ALL'>(
    initialActivity?.settings?.questionCount || 'ALL'
  );

  // Game Settings
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    shuffleQuestions: initialActivity?.settings?.shuffleQuestions ?? true,
    shuffleAnswers: initialActivity?.settings?.shuffleAnswers ?? true,
    showExplanation: initialActivity?.settings?.showExplanation ?? true,
    soundEffects: initialActivity?.settings?.soundEffects ?? true,
    showScore: initialActivity?.settings?.showScore ?? true,
    timeLimitSeconds: initialActivity?.settings?.timeLimitSeconds ?? 0,
    removeAfterSelection: initialActivity?.settings?.removeAfterSelection ?? true,
  });

  // Preview runner state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Import Modal & Question Bank Selector Modal
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isBankPickerOpen, setIsBankPickerOpen] = useState(false);
  const [availableQuestionSets, setAvailableQuestionSets] = useState<QuestionSet[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(false);

  // Question Set state
  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      return initialQuestions;
    }
    if (initialActivity?.questionSet?.questions && initialActivity.questionSet.questions.length > 0) {
      return initialActivity.questionSet.questions;
    }
    // Default initial question set for high-school English
    return [
      {
        id: 'q_' + Date.now() + '_1',
        question: 'Choose the word whose underlined part is pronounced differently from the others:',
        options: [
          { id: 'A', text: 'protect' },
          { id: 'B', text: 'provide' },
          { id: 'C', text: 'pollution' },
          { id: 'D', text: 'program' },
        ],
        correctAnswer: 'D',
        correctAnswerId: 'D',
        correctAnswerText: 'program',
        explanation: "'program' has the /oʊ/ sound while the others have /ə/.",
        order: 1,
        points: 10,
        unit: 'Unit 3: Music',
        level: 'B1',
      },
      {
        id: 'q_' + Date.now() + '_2',
        question: 'If students _____ more attention in class, they would achieve higher test scores.',
        options: [
          { id: 'A', text: 'pay' },
          { id: 'B', text: 'paid' },
          { id: 'C', text: 'had paid' },
          { id: 'D', text: 'would pay' },
        ],
        correctAnswer: 'B',
        correctAnswerId: 'B',
        correctAnswerText: 'paid',
        explanation: 'Second Conditional (unreal present): If + S + V-ed / past simple, S + would + V-inf.',
        order: 2,
        points: 10,
        unit: 'Unit 4: For a Better Community',
        level: 'B1',
      },
      {
        id: 'q_' + Date.now() + '_3',
        question: 'Many volunteers dedicated their weekends to _____ trees in the local community park.',
        options: [
          { id: 'A', text: 'plant' },
          { id: 'B', text: 'planting' },
          { id: 'C', text: 'planted' },
          { id: 'D', text: 'plants' },
        ],
        correctAnswer: 'B',
        correctAnswerId: 'B',
        correctAnswerText: 'planting',
        explanation: 'Structure: dedicate something to + V-ing.',
        order: 3,
        points: 10,
        unit: 'Unit 4: Environment',
        level: 'B1',
      },
    ];
  });

  // Suitability validation report
  const suitabilityReport: GameSuitabilityReport = useMemo(() => {
    return gameValidation.validateQuestionSetForGame(questions, selectedGameType);
  }, [questions, selectedGameType]);

  // Load question sets when Question Bank Picker opens
  useEffect(() => {
    if (isBankPickerOpen && user) {
      setIsLoadingSets(true);
      const unsub = questionSetService.subscribeQuestionSets(
        user.uid,
        (sets) => {
          setAvailableQuestionSets(sets);
          setIsLoadingSets(false);
        },
        (err) => {
          console.error(err);
          setIsLoadingSets(false);
        }
      );
      return () => unsub();
    }
  }, [isBankPickerOpen, user]);

  const handleAddQuestion = () => {
    const newId = 'q_' + Date.now() + '_' + (questions.length + 1);
    const newQ: QuestionItem = {
      id: newId,
      question: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ],
      correctAnswer: 'A',
      correctAnswerId: 'A',
      correctAnswerText: '',
      explanation: '',
      order: questions.length + 1,
      points: 10,
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      showError('An activity must contain at least 1 question.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx: number, field: keyof QuestionItem, val: any) => {
    const next = [...questions];
    next[idx] = { ...next[idx], [field]: val };
    setQuestions(next);
  };

  const handleOptionTextChange = (qIdx: number, optId: string, text: string) => {
    const next = [...questions];
    const q = next[qIdx];
    const updatedOpts = q.options.map((opt) => (opt.id === optId ? { ...opt, text } : opt));

    // Also update correctAnswerText if this option is the correct answer
    let updatedCorrectText = q.correctAnswerText;
    if (q.correctAnswer === optId || q.correctAnswerId === optId) {
      updatedCorrectText = text;
    }

    next[qIdx] = { ...q, options: updatedOpts, correctAnswerText: updatedCorrectText };
    setQuestions(next);
  };

  const handleSetCorrectAnswer = (qIdx: number, optId: string) => {
    const next = [...questions];
    const q = next[qIdx];
    const chosenOpt = q.options.find((o) => o.id === optId);
    next[qIdx] = {
      ...q,
      correctAnswer: optId,
      correctAnswerId: optId,
      correctAnswerText: chosenOpt ? chosenOpt.text : '',
    };
    setQuestions(next);
  };

  // Exclude unsuitable questions (e.g. for Anagram)
  const handleExcludeUnsuitable = () => {
    if (suitabilityReport.issues.length === 0) return;
    const unsuitableIds = suitabilityReport.issues.map((i) => i.questionId);
    const filtered = questions.filter((q) => !unsuitableIds.includes(q.id));
    setQuestions(filtered);
    showSuccess(`Excluded ${unsuitableIds.length} unsuitable questions for ${selectedGameType}.`);
  };

  // Append or Replace questions from Importer or Question Bank
  const handleLoadQuestionsFromSet = (loadedQuestions: QuestionItem[], customTitle?: string) => {
    if (loadedQuestions.length === 0) return;
    setQuestions(loadedQuestions);
    if (!title && customTitle) {
      setTitle(customTitle);
    }
    showSuccess(`Loaded ${loadedQuestions.length} questions into the activity.`);
    setIsBankPickerOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showError('Please enter an Activity Title.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        showError(`Question #${i + 1} is missing its question text.`);
        return;
      }
      const emptyOpt = q.options.some((opt) => !opt.text.trim());
      if (emptyOpt) {
        showError(`Please fill in all options for Question #${i + 1}.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave({
        id: initialActivity?.id || undefined,
        title: title.trim(),
        description: description.trim(),
        gameType: selectedGameType,
        folderId: folderId ? folderId : null,
        status,
        questions,
        settings: {
          ...gameSettings,
          questionCount: selectedQuestionCount,
        },
      });
      showSuccess(
        initialActivity?.id
          ? `Activity "${title.trim()}" updated in Firestore.`
          : `New Activity "${title.trim()}" saved to Firestore.`
      );
    } catch (err) {
      console.error('Error saving activity to Firestore:', err);
      showError('Failed to save activity to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  const countOptions = [10, 20, 25, 30, 40];
  const totalAvailable = questions.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-200">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Cancel"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
              {initialActivity?.id ? 'Edit Activity' : 'Create Interactive Activity'}
            </h1>
            <p className="text-xs text-slate-500">
              One Question Set → 7 Interactive Game Types • High-School English Curriculum
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Preview Button */}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>Preview Game Engine</span>
          </button>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>

          <Button
            id="btn-save-activity"
            type="submit"
            variant="primary"
            size="md"
            disabled={isSaving}
            icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            className="shadow-lg shadow-indigo-600/30"
          >
            {isSaving ? 'Saving to Firestore...' : initialActivity?.id ? 'Update Activity' : 'Save to Firestore'}
          </Button>
        </div>
      </div>

      {/* 1. General Information Card */}
      <Card variant="default" padding="md" className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          General Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              id="activity-title-input"
              label="Activity Title *"
              placeholder="e.g. Unit 3 - Music: Vocabulary & Pronunciation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Curriculum Folder
            </label>
            <select
              id="activity-folder-select"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="">📂 Root Library (No Folder)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Input
            id="activity-description-input"
            label="Description / Teacher Note (Optional)"
            placeholder="e.g. High school 10th grade review for midterm test."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Card>

      {/* 2. Choose Game Type Template */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Choose 1 of 8 Interactive Game Types
            </h2>
            <p className="text-xs text-slate-500">
              Select any game type. The original Question Set remains intact as the master source of truth.
            </p>
          </div>
          <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            8 Interactive Engines Ready
          </span>
        </div>

        {/* 8 Game Type Selector Cards */}
        <GameTypeSelector
          selectedType={selectedGameType}
          onSelectType={(type) => setSelectedGameType(type)}
        />
      </div>

      {/* 3. Game Settings & Question Count Selector */}
      <Card variant="default" padding="md" className="space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Game Configuration & Question Selection
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {totalAvailable} Questions Available in Set
          </span>
        </div>

        {/* Number of Questions Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Number of Questions for this Game:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedQuestionCount('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                selectedQuestionCount === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              Use All Available ({totalAvailable})
            </button>

            {countOptions.map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setSelectedQuestionCount(cnt)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedQuestionCount === cnt
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {cnt} Questions
              </button>
            ))}
          </div>

          {/* Warning if selected count > total available */}
          {typeof selectedQuestionCount === 'number' && selectedQuestionCount > totalAvailable && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  This Question Set contains only <strong>{totalAvailable}</strong> questions (fewer than {selectedQuestionCount}).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuestionCount('ALL')}
                className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-200 rounded-lg shrink-0 transition-colors"
              >
                Use All {totalAvailable} Questions
              </button>
            </div>
          )}
        </div>

        {/* Toggles for Game Behavior */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {/* Shuffle Questions */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={gameSettings.shuffleQuestions}
              onChange={(e) =>
                setGameSettings((prev) => ({ ...prev, shuffleQuestions: e.target.checked }))
              }
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Shuffle Questions</span>
              <span className="text-[10px] text-slate-500">Randomize question order each play</span>
            </div>
          </label>

          {/* Shuffle Answers */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={gameSettings.shuffleAnswers}
              onChange={(e) =>
                setGameSettings((prev) => ({ ...prev, shuffleAnswers: e.target.checked }))
              }
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Shuffle Answers</span>
              <span className="text-[10px] text-slate-500">Re-index A/B/C/D labels dynamically</span>
            </div>
          </label>

          {/* Show Explanation */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={gameSettings.showExplanation}
              onChange={(e) =>
                setGameSettings((prev) => ({ ...prev, showExplanation: e.target.checked }))
              }
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Show "Why?" Explanations</span>
              <span className="text-[10px] text-slate-500">Display grammar notes after answering</span>
            </div>
          </label>

          {/* Sound Effects */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={gameSettings.soundEffects}
              onChange={(e) =>
                setGameSettings((prev) => ({ ...prev, soundEffects: e.target.checked }))
              }
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Synthesizer Sound FX</span>
              <span className="text-[10px] text-slate-500">Audio chimes for correct / wrong</span>
            </div>
          </label>

          {/* Show Score & Progress */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={gameSettings.showScore}
              onChange={(e) =>
                setGameSettings((prev) => ({ ...prev, showScore: e.target.checked }))
              }
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Live Score & Progress</span>
              <span className="text-[10px] text-slate-500">Display points and progress bar</span>
            </div>
          </label>

          {/* Game-specific: Remove after selection (Random Wheel) */}
          {selectedGameType === 'random_wheel' && (
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/40 cursor-pointer hover:bg-amber-50">
              <input
                type="checkbox"
                checked={gameSettings.removeAfterSelection}
                onChange={(e) =>
                  setGameSettings((prev) => ({ ...prev, removeAfterSelection: e.target.checked }))
                }
                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-amber-900 block">Remove Item After Spin</span>
                <span className="text-[10px] text-amber-700">Applies to session wheel only</span>
              </div>
            </label>
          )}
        </div>
      </Card>

      {/* Question Suitability Report Banner if Issues Exist */}
      {!suitabilityReport.isFullySuitable && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-amber-900">
                  Question Set Suitability Notice ({suitabilityReport.unsuitableCount} of {suitabilityReport.totalQuestions} items)
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Some questions may not be optimal for <strong>{GAME_TYPES.find((g) => g.type === selectedGameType)?.label}</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExcludeUnsuitable}
              className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-xl transition-colors shrink-0"
            >
              Exclude Unsuitable ({suitabilityReport.unsuitableCount})
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2">
            {suitabilityReport.issues.map((issue) => (
              <div
                key={issue.questionId}
                className="p-2 bg-white/80 border border-amber-100 rounded-xl text-xs text-slate-700 flex items-center justify-between gap-2"
              >
                <span className="font-semibold text-slate-800">
                  Q#{issue.questionNumber}: {issue.questionText.substring(0, 45)}...
                </span>
                <span className="text-[10px] text-amber-700 font-medium bg-amber-100 px-2 py-0.5 rounded-md">
                  {issue.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Question Builder Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Question Bank Items ({questions.length})
            </h2>
            <p className="text-xs text-slate-500">
              Input question prompts, 4 options, and select the correct answer key.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsImporterOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              Import Word/PDF/Excel
            </button>

            <button
              type="button"
              onClick={() => setIsBankPickerOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Database className="w-3.5 h-3.5 text-amber-600" />
              Load From Bank
            </button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleAddQuestion}
            >
              Add Question
            </Button>
          </div>
        </div>

        {/* List of Questions */}
        <div className="space-y-4">
          {questions.map((q, qIdx) => (
            <Card
              key={q.id}
              variant="default"
              padding="md"
              className="border-slate-200 space-y-4 relative"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center font-display">
                    {qIdx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-700">Question Item</span>
                  {q.unit && (
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {q.unit}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Reading Passage if applicable */}
              {q.passage && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 italic">
                  <span className="font-bold text-indigo-700 not-italic">Passage: </span>
                  {q.passage}
                </div>
              )}

              {/* Question Stem */}
              <div>
                <Input
                  id={`q-${qIdx}-stem`}
                  label={`Question Stem #${qIdx + 1} *`}
                  placeholder="Enter the question sentence or prompt..."
                  value={q.question}
                  onChange={(e) => handleQuestionChange(qIdx, 'question', e.target.value)}
                  required
                />
              </div>

              {/* 4 Options Grid with Correct Answer selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Options & Correct Answer Selection *</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Click radio dot to mark as correct answer
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options.map((opt) => {
                    const isCorrect =
                      q.correctAnswerId === opt.id ||
                      (q.correctAnswer && q.correctAnswer.toUpperCase() === opt.id.toUpperCase());

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                          isCorrect
                            ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/20'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSetCorrectAnswer(qIdx, opt.id)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            isCorrect
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {opt.id}
                        </button>
                        <input
                          type="text"
                          placeholder={`Option ${opt.id} text...`}
                          value={opt.text}
                          onChange={(e) => handleOptionTextChange(qIdx, opt.id, e.target.value)}
                          className="flex-1 bg-transparent text-xs font-medium text-slate-900 outline-none"
                          required
                        />
                        {isCorrect && (
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/70 px-2 py-0.5 rounded-md shrink-0">
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation note */}
              <div>
                <Input
                  id={`q-${qIdx}-explanation`}
                  label="Explanation & Grammar Rule (Shown in review)"
                  placeholder="e.g. Pronunciation rule: words ending with -ed or past conditional..."
                  value={q.explanation || ''}
                  onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                />
              </div>
            </Card>
          ))}
        </div>

        {/* Add another question button */}
        <Button
          type="button"
          variant="outline"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleAddQuestion}
          fullWidth
          className="border-dashed"
        >
          Add Another Question
        </Button>
      </div>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
        >
          <Eye className="w-4 h-4 text-indigo-600" />
          <span>Preview Game ({GAME_TYPES.find((g) => g.type === selectedGameType)?.label})</span>
        </button>

        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isSaving}
          icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          className="shadow-lg shadow-indigo-600/30"
        >
          {isSaving ? 'Saving to Firestore...' : initialActivity?.id ? 'Save Changes' : 'Publish Activity to Firestore'}
        </Button>
      </div>

      {/* ---------------- QUESTION IMPORTER MODAL ---------------- */}
      {isImporterOpen && user && (
        <QuestionImporter
          teacherId={user.uid}
          onClose={() => setIsImporterOpen(false)}
          onImportComplete={(set) => {
            setIsImporterOpen(false);
            handleLoadQuestionsFromSet(set.questions, set.title);
          }}
          onCreateGameFromSet={(set, count, gameType) => {
            setIsImporterOpen(false);
            if (gameType) setSelectedGameType(gameType as GameType);
            const targetQuestions =
              count === 'ALL' || !count ? set.questions : set.questions.slice(0, Number(count));
            handleLoadQuestionsFromSet(targetQuestions, set.title);
          }}
        />
      )}

      {/* ---------------- LOAD FROM QUESTION BANK MODAL ---------------- */}
      {isBankPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Select From Question Bank</h3>
                  <p className="text-xs text-slate-500">Pick a persistent Question Set to load into this activity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBankPickerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {isLoadingSets ? (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                  <p className="text-xs">Loading Question Bank sets...</p>
                </div>
              ) : availableQuestionSets.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-semibold text-slate-600">No question sets found in your Question Bank.</p>
                  <p className="text-xs text-slate-400 mt-1">Use the "Import Word/PDF/Excel" tool to add your test documents.</p>
                </div>
              ) : (
                availableQuestionSets.map((set) => (
                  <div
                    key={set.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          Grade {set.gradeLevel || '10'}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{set.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {set.description || `Contains ${set.questions.length} questions.`}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {set.questions.length} questions • {new Date(set.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLoadQuestionsFromSet(set.questions, set.title)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs shrink-0 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Load ({set.questions.length})
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBankPickerOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- LIVE PREVIEW RUNNER MODAL ---------------- */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-3.5 border-b border-slate-800/90 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-xl border border-indigo-500/30">
                  Live Preview
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  Testing Format: {GAME_TYPES.find((g) => g.type === selectedGameType)?.label}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950">
              <GameSessionRunner
                gameType={selectedGameType}
                title={title || 'Untitled Activity Preview'}
                questions={questions}
                settings={{
                  ...gameSettings,
                  questionCount: selectedQuestionCount,
                }}
                onExit={() => setIsPreviewOpen(false)}
                isPreview={true}
              />
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

import React from 'react';
import {
  LayoutGrid,
  FolderTree,
  Send,
  Users,
  BarChart3,
  Plus,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  Award,
} from 'lucide-react';
import { Activity, Assignment, Folder, StudentResult, TeacherNavTab } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { GAME_TYPES, ORG_NAME } from '../../constants/gameTypes';

interface TeacherHomeProps {
  activities: Activity[];
  folders: Folder[];
  assignments: Assignment[];
  results: StudentResult[];
  onNavigate: (tab: TeacherNavTab) => void;
  onPlayActivity: (activity: Activity) => void;
  onAssignActivity: (activity: Activity) => void;
}

export const TeacherHome: React.FC<TeacherHomeProps> = ({
  activities,
  folders,
  assignments,
  results,
  onNavigate,
  onPlayActivity,
  onAssignActivity,
}) => {
  const activeAssignments = assignments.filter((a) => a.status === 'active');
  const uniqueStudentsCount = new Set(results.map((r) => `${r.studentName}_${r.studentClass}`)).size;

  const recentActivities = activities.slice(0, 4);
  const recentAssignments = assignments.slice(0, 4);
  const recentResults = results.slice(0, 5);

  const getGameLabel = (type: string) => {
    return GAME_TYPES.find((g) => g.type === type)?.label || type;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 relative overflow-hidden shadow-md">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{ORG_NAME} • HIGH SCHOOL ENGLISH HUB</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white mb-5">
            Welcome to EduSpace25
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              id="btn-home-create-activity"
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => onNavigate('create-activity')}
              className="shadow-lg shadow-indigo-600/40"
            >
              Create New Activity
            </Button>
            <Button
              id="btn-home-question-bank"
              variant="outline"
              size="md"
              icon={<Sparkles className="w-4 h-4 text-amber-400" />}
              onClick={() => onNavigate('question-bank')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Question Bank & Import
            </Button>
            <Button
              id="btn-home-view-activities"
              variant="outline"
              size="md"
              onClick={() => onNavigate('my-activities')}
              className="bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
            >
              Browse Library
            </Button>
          </div>
        </div>

        {/* Decorative subtle background accents */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden md:flex items-center justify-center">
          <Layers className="w-64 h-64 text-indigo-400" />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Overview Metrics
          </h2>
          <span className="text-xs text-slate-400">Live Database Connected</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Activities */}
          <Card
            id="stat-activities"
            variant="default"
            padding="sm"
            className="hover:border-indigo-300 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Total Activities</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <LayoutGrid className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              {activities.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Interactive question sets</p>
          </Card>

          {/* Total Folders */}
          <Card
            id="stat-folders"
            variant="default"
            padding="sm"
            className="hover:border-amber-300 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Total Folders</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <FolderTree className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              {folders.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Organized categories</p>
          </Card>

          {/* Active Assignments */}
          <Card
            id="stat-assignments"
            variant="default"
            padding="sm"
            className="hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Active Assignments</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              {activeAssignments.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Live 6-digit codes</p>
          </Card>

          {/* Total Students */}
          <Card
            id="stat-students"
            variant="default"
            padding="sm"
            className="hover:border-purple-300 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Total Students</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              {uniqueStudentsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">From real submissions</p>
          </Card>

          {/* Recent Results */}
          <Card
            id="stat-results"
            variant="default"
            padding="sm"
            className="col-span-2 lg:col-span-1 hover:border-rose-300 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Recent Results</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              {results.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Submissions recorded</p>
          </Card>
        </div>
      </div>

      {/* Main Two-Column Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Recent Activities */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
              Recent Activities
            </h2>
            {activities.length > 0 && (
              <button
                id="link-see-all-activities"
                onClick={() => onNavigate('my-activities')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View All ({activities.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activities.length === 0 ? (
            <EmptyState
              icon={<LayoutGrid className="w-6 h-6" />}
              title="No activities yet"
              description="Create your first interactive English game activity with custom multiple-choice questions."
              actionLabel="Create Activity"
              onAction={() => onNavigate('create-activity')}
            />
          ) : (
            <div className="space-y-3">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  id={`home-act-${act.id}`}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="primary" size="sm">
                        {getGameLabel(act.gameType)}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {act.itemCount} {act.itemCount === 1 ? 'question' : 'questions'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">{act.title}</h3>
                    {act.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{act.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPlayActivity(act)}
                      className="text-xs px-2.5 py-1.5"
                    >
                      Play
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onAssignActivity(act)}
                      className="text-xs px-2.5 py-1.5"
                    >
                      Assign
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Assignments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              Recent Assignments
            </h2>
            {assignments.length > 0 && (
              <button
                id="link-see-all-assignments"
                onClick={() => onNavigate('assignments')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View All ({assignments.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {assignments.length === 0 ? (
            <EmptyState
              icon={<Send className="w-6 h-6" />}
              title="No assignments yet"
              description="Assign an activity to your students to generate unique 6-digit class codes."
              actionLabel="Go to Activities"
              onAction={() => onNavigate('my-activities')}
            />
          ) : (
            <div className="space-y-3">
              {recentAssignments.map((asgn) => (
                <div
                  key={asgn.id}
                  id={`home-asgn-${asgn.id}`}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Code: {asgn.assignmentCode}
                      </span>
                      <span className="text-xs text-slate-400">{asgn.targetClass || 'All Classes'}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {asgn.activityTitle}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {asgn.totalSubmissions} submissions
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(asgn.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigate('results')}
                    className="text-xs px-2.5 py-1.5 shrink-0"
                  >
                    Results
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Recent Results */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            Recent Student Results
          </h2>
          {results.length > 0 && (
            <button
              id="link-see-all-results"
              onClick={() => onNavigate('results')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <EmptyState
            icon={<Award className="w-6 h-6" />}
            title="No results yet"
            description="Student results will appear here in real-time as high school students enter 6-digit codes and complete activities."
            actionLabel="View Active Assignments"
            onAction={() => onNavigate('assignments')}
          />
        ) : (
          <Card variant="default" padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Class</th>
                    <th className="p-3.5">Activity</th>
                    <th className="p-3.5 text-center">Score</th>
                    <th className="p-3.5 text-center">Percentage</th>
                    <th className="p-3.5 text-right">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {recentResults.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{res.studentName}</td>
                      <td className="p-3.5">
                        <Badge variant="neutral" size="sm">
                          {res.studentClass}
                        </Badge>
                      </td>
                      <td className="p-3.5 max-w-xs truncate">{res.activityTitle}</td>
                      <td className="p-3.5 text-center font-bold text-slate-900">
                        {res.score}/{res.totalQuestions}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full ${
                            res.percentage >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : res.percentage >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {res.percentage}%
                        </span>
                      </td>
                      <td className="p-3.5 text-right text-slate-400">
                        {new Date(res.completedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

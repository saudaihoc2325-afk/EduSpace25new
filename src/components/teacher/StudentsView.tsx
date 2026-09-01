import React, { useState } from 'react';
import {
  Users,
  Search,
  Award,
  GraduationCap,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { StudentProfile } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';

interface StudentsViewProps {
  students: StudentProfile[];
  onNavigateToAssignments: () => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onNavigateToAssignments,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  const getClassName = (s: StudentProfile) => s.className || (s as unknown as { class?: string }).class || '';

  const uniqueClasses = Array.from(new Set(students.map(getClassName))).filter(Boolean);

  const filteredStudents = students.filter((std) => {
    const className = getClassName(std);
    const matchesSearch =
      std.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      className.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass =
      selectedClassFilter === 'all' ? true : className === selectedClassFilter;

    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
            Student Roster ({students.length})
          </h1>
          <p className="text-xs text-slate-500">
            Automatically compiled roster of high school students who participated in your English assignments.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card variant="default" padding="sm" className="bg-slate-50/50">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="sm:col-span-2">
            <Input
              id="input-search-students"
              placeholder="Search students by name or class..."
              leftIcon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <select
              id="select-filter-student-class"
              aria-label="Filter students by class"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">All Classes ({students.length})</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Students Table or Empty State */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="No students yet"
          description="Students will be recorded here automatically when they enter a 6-digit assignment code, submit their name & class, and complete an English activity."
          actionLabel="View Active Assignments"
          onAction={onNavigateToAssignments}
        />
      ) : (
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Class</th>
                  <th className="p-4 text-center">Assignments Completed</th>
                  <th className="p-4 text-center">Overall Average</th>
                  <th className="p-4 text-right">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStudents.map((std) => {
                  const className = getClassName(std);
                  return (
                    <tr key={std.id} id={`student-row-${std.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {std.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{std.name}</span>
                      </td>
                      <td className="p-4">
                        <Badge variant="neutral" size="sm">
                          {className}
                        </Badge>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-900">
                        {std.assignmentsCompleted}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`font-bold px-2.5 py-1 rounded-full text-xs ${
                            std.averageScore >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : std.averageScore >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {std.averageScore}%
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-400">
                        {std.lastActivityAt
                          ? new Date(std.lastActivityAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

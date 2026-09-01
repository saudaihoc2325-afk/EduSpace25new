import React, { useState } from 'react';
import {
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Flame,
  Sparkles,
  TrendingDown,
  TrendingUp,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StudentResult } from '../../../types';
import { analyzeQuestions, QuestionAnalysisItem } from '../../../utils/analyticsUtils';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';

interface QuestionAnalysisTabProps {
  results: StudentResult[];
}

export const QuestionAnalysisTab: React.FC<QuestionAnalysisTabProps> = ({ results }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const questionItems: QuestionAnalysisItem[] = analyzeQuestions(results);

  const filteredQuestions = questionItems.filter((q) => {
    const matchesSearch =
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.correctAnswer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDifficulty =
      difficultyFilter === 'all' ? true : q.difficulty === difficultyFilter;

    return matchesSearch && matchesDifficulty;
  });

  // Top Hardest & Mastered Questions
  const hardestQuestions = [...questionItems].slice(0, 3);
  const masteredQuestions = [...questionItems].sort((a, b) => b.accuracyPercentage - a.accuracyPercentage).slice(0, 3);

  const totalQuestionsAnalyzed = questionItems.length;
  const easyCount = questionItems.filter((q) => q.difficulty === 'Easy').length;
  const mediumCount = questionItems.filter((q) => q.difficulty === 'Medium').length;
  const hardCount = questionItems.filter((q) => q.difficulty === 'Hard').length;

  return (
    <div className="space-y-6">
      {/* 1. Item Difficulty Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="default" padding="sm" className="bg-white">
          <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
            Tổng Số Câu Hỏi
          </span>
          <div className="text-2xl font-black text-slate-900 font-display mt-1 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            {totalQuestionsAnalyzed}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Từ các bài nộp
          </span>
        </Card>

        <Card variant="default" padding="sm" className="bg-white">
          <span className="text-[10px] text-emerald-600 font-bold uppercase block tracking-wider">
            Mức Độ Dễ (≥ 75%)
          </span>
          <div className="text-2xl font-black text-emerald-600 font-display mt-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            {easyCount} câu
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {totalQuestionsAnalyzed > 0 ? Math.round((easyCount / totalQuestionsAnalyzed) * 100) : 0}% tổng số
          </span>
        </Card>

        <Card variant="default" padding="sm" className="bg-white">
          <span className="text-[10px] text-amber-600 font-bold uppercase block tracking-wider">
            Mức Độ Vừa (50% - 74%)
          </span>
          <div className="text-2xl font-black text-amber-600 font-display mt-1 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-amber-600" />
            {mediumCount} câu
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {totalQuestionsAnalyzed > 0 ? Math.round((mediumCount / totalQuestionsAnalyzed) * 100) : 0}% tổng số
          </span>
        </Card>

        <Card variant="default" padding="sm" className="bg-white">
          <span className="text-[10px] text-rose-600 font-bold uppercase block tracking-wider">
            Mức Độ Khó (&lt; 50%)
          </span>
          <div className="text-2xl font-black text-rose-600 font-display mt-1 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            {hardCount} câu
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {totalQuestionsAnalyzed > 0 ? Math.round((hardCount / totalQuestionsAnalyzed) * 100) : 0}% cần ôn tập kỹ
          </span>
        </Card>
      </div>

      {/* 2. Top Hardest vs Mastered Callouts */}
      {hardestQuestions.length > 0 && hardestQuestions[0].accuracyPercentage < 60 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hardest Callout */}
          <div className="bg-rose-50/80 border border-rose-200 rounded-3xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Câu hỏi học sinh gặp nhiều khó khăn nhất (Cần chữa bài)</span>
            </div>
            <div className="bg-white/90 rounded-2xl p-3.5 border border-rose-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-rose-700">
                  Tỉ lệ đúng: {hardestQuestions[0].accuracyPercentage}% ({hardestQuestions[0].correctCount}/{hardestQuestions[0].totalAttempts})
                </span>
                <Badge variant="danger" size="sm">Độ khó cao</Badge>
              </div>
              <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                {hardestQuestions[0].questionText}
              </p>
              <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Đáp án đúng: <strong>{hardestQuestions[0].correctAnswer}</strong>
              </div>
            </div>
          </div>

          {/* Mastered Callout */}
          {masteredQuestions.length > 0 && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Câu hỏi học sinh nắm vững nhất (Mastered)</span>
              </div>
              <div className="bg-white/90 rounded-2xl p-3.5 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-emerald-700">
                    Tỉ lệ đúng: {masteredQuestions[0].accuracyPercentage}% ({masteredQuestions[0].correctCount}/{masteredQuestions[0].totalAttempts})
                  </span>
                  <Badge variant="success" size="sm">Độ chính xác cao</Badge>
                </div>
                <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                  {masteredQuestions[0].questionText}
                </p>
                <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Đáp án đúng: <strong>{masteredQuestions[0].correctAnswer}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Search & Filter Bar */}
      <Card variant="default" padding="sm" className="bg-slate-50/50">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="sm:col-span-2">
            <Input
              id="input-search-question-analysis"
              placeholder="Tìm kiếm nội dung câu hỏi hoặc đáp án..."
              leftIcon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <select
              id="select-filter-question-difficulty"
              aria-label="Filter by difficulty"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">Tất cả mức độ ({questionItems.length})</option>
              <option value="Hard">Khó (&lt; 50% đúng) - {hardCount} câu</option>
              <option value="Medium">Trung bình (50-74% đúng) - {mediumCount} câu</option>
              <option value="Easy">Dễ (≥ 75% đúng) - {easyCount} câu</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 4. Question Item Breakdown List */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            Không tìm thấy câu hỏi phù hợp với bộ lọc.
          </div>
        ) : (
          filteredQuestions.map((item, idx) => {
            const isExpanded = expandedQuestionId === item.questionId;

            return (
              <Card
                key={item.questionId || idx}
                variant="default"
                padding="md"
                className="bg-white space-y-3 hover:border-slate-300 transition-all"
              >
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  onClick={() => setExpandedQuestionId(isExpanded ? null : item.questionId)}
                >
                  <div className="space-y-1 flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        Câu #{idx + 1}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          item.difficulty === 'Easy'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.difficulty === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.difficulty === 'Easy' ? 'Dễ' : item.difficulty === 'Medium' ? 'Trung bình' : 'Khó'}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900 pt-0.5">
                      {item.questionText}
                    </h4>
                  </div>

                  {/* Metrics & Action */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Độ chính xác</span>
                      <span
                        className={`font-mono text-base font-black ${
                          item.accuracyPercentage >= 75
                            ? 'text-emerald-600'
                            : item.accuracyPercentage >= 50
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {item.accuracyPercentage}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ({item.correctCount}/{item.totalAttempts} đúng)
                      </span>
                    </div>

                    <button
                      type="button"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      aria-label="Toggle distractor details"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.accuracyPercentage >= 75
                        ? 'bg-emerald-500'
                        : item.accuracyPercentage >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.max(4, item.accuracyPercentage)}%` }}
                  />
                </div>

                {/* Expanded Distractor Option Analysis */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Phân phối lựa chọn của học sinh ({item.distractors.length} đáp án được chọn)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {item.distractors.map((dist, dIdx) => {
                          const isCorrectKey =
                            dist.answerText.trim().toLowerCase() ===
                            item.correctAnswer.trim().toLowerCase();

                          return (
                            <div
                              key={dIdx}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                                isCorrectKey
                                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                {isCorrectKey ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate">{dist.answerText}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                                <strong className={isCorrectKey ? 'text-emerald-700' : 'text-slate-800'}>
                                  {dist.count} lượt
                                </strong>
                                <span className="text-slate-400">({dist.percentage}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {item.explanation && (
                      <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900">
                        <strong className="text-indigo-950">Giải thích chi tiết: </strong>
                        <span>{item.explanation}</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

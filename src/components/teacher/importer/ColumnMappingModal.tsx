import React, { useState } from 'react';
import { Columns, Check, AlertCircle, ArrowRight, Table } from 'lucide-react';
import { ExcelColumnMapping } from '../../../types';

interface ColumnMappingModalProps {
  headers: string[];
  initialMapping: ExcelColumnMapping;
  isOpen: boolean;
  onClose: () => void;
  onApplyMapping: (mapping: ExcelColumnMapping) => void;
  sampleRows?: Record<string, any>[];
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  headers,
  initialMapping,
  isOpen,
  onClose,
  onApplyMapping,
  sampleRows = [],
}) => {
  if (!isOpen) return null;

  const [mapping, setMapping] = useState<ExcelColumnMapping>(initialMapping);

  const handleFieldChange = (key: keyof ExcelColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const fields: Array<{
    key: keyof ExcelColumnMapping;
    label: string;
    description: string;
    required: boolean;
  }> = [
    { key: 'questionCol', label: 'Question Text', description: 'Column containing question prompts', required: true },
    { key: 'optionACol', label: 'Option A', description: 'First answer choice', required: true },
    { key: 'optionBCol', label: 'Option B', description: 'Second answer choice', required: true },
    { key: 'optionCCol', label: 'Option C', description: 'Third answer choice', required: false },
    { key: 'optionDCol', label: 'Option D', description: 'Fourth answer choice', required: false },
    { key: 'answerCol', label: 'Correct Answer / Key', description: 'Letter (A/B/C/D) or exact answer text', required: true },
    { key: 'explanationCol', label: 'Explanation', description: 'Explanation or rationale notes', required: false },
    { key: 'passageCol', label: 'Reading Passage', description: 'Shared reading text context', required: false },
    { key: 'unitCol', label: 'Unit / Topic', description: 'Curriculum unit name', required: false },
    { key: 'lessonCol', label: 'Lesson', description: 'Specific lesson name', required: false },
    { key: 'levelCol', label: 'Difficulty Level', description: 'Easy / Medium / Hard', required: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Excel / CSV Column Mapping</h3>
              <p className="text-xs text-slate-400">
                Match columns in your uploaded file with EduSpace25 question fields
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-200/90 leading-relaxed">
              EduSpace25 automatically maps standard column headers. If your file uses different column names (e.g. "Question Text" instead of "Question"), you can adjust the mappings below before import.
            </p>
          </div>

          {/* Mapping Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 bg-slate-950/50">
            {fields.map((field) => {
              const currentValue = mapping[field.key] || '';
              return (
                <div
                  key={field.key}
                  className="p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/50 transition-colors"
                >
                  <div className="sm:max-w-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white">{field.label}</span>
                      {field.required ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/60 text-red-400 font-medium border border-red-800/40">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Optional</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{field.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:block" />
                    <select
                      value={currentValue}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className={`text-xs rounded-xl px-3 py-2 border bg-slate-900 min-w-[200px] focus:outline-none transition-colors ${
                        currentValue
                          ? 'border-indigo-500/50 text-indigo-200 font-medium'
                          : field.required
                          ? 'border-red-500/40 text-red-300'
                          : 'border-slate-700 text-slate-400'
                      }`}
                    >
                      <option value="">-- Do not import / none --</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          File column: "{header}"
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sample Rows Preview */}
          {sampleRows.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Table className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Raw File Header Preview
                </h4>
              </div>
              <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950">
                <table className="w-full text-left text-xs text-slate-400">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-200">
                    <tr>
                      {headers.slice(0, 7).map((h) => (
                        <th key={h} className="p-2.5 font-medium whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sampleRows.slice(0, 2).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-900/30">
                        {headers.slice(0, 7).map((h) => (
                          <td key={h} className="p-2.5 truncate max-w-[160px] text-slate-300">
                            {String(row[h] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApplyMapping(mapping)}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <Check className="w-4 h-4" />
            Apply Mapping & Re-Analyze
          </button>
        </div>
      </div>
    </div>
  );
};

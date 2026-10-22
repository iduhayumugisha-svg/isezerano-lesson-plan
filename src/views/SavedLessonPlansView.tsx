import React, { useState, useMemo } from 'react';
import { LessonPlan } from '../types/lessonPlan';
import { 
  Search, 
  Trash2, 
  Edit3, 
  Printer, 
  Copy, 
  PlusCircle, 
  BookOpen, 
  AlertTriangle,
  FolderOpen,
  ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface SavedLessonPlansViewProps {
  lessonPlans: LessonPlan[];
  onEditPlan: (plan: LessonPlan) => void;
  onDeletePlan: (id: string) => void;
  onDuplicatePlan: (id: string) => void;
  onPrintPlan: (plan: LessonPlan) => void;
  onCreateNew: () => void;
}

export const SavedLessonPlansView: React.FC<SavedLessonPlansViewProps> = ({
  lessonPlans,
  onEditPlan,
  onDeletePlan,
  onDuplicatePlan,
  onPrintPlan,
  onCreateNew
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'Primary' | 'Secondary'>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [planToDelete, setPlanToDelete] = useState<LessonPlan | null>(null);

  // Extract distinct subjects
  const subjectsList = useMemo(() => {
    const subs = new Set<string>();
    lessonPlans.forEach((p) => {
      if (p.subject && p.subject.trim()) subs.add(p.subject.trim());
    });
    return Array.from(subs).sort();
  }, [lessonPlans]);

  const { user, isAdmin } = useAuth();

  // Filtered plans
  const filteredPlans = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return lessonPlans.filter((plan) => {
      // Role-based privacy: teachers only see their own plans, admins can inspect all
      if (user && !isAdmin && plan.ownerUid && plan.ownerUid !== user.uid) {
        return false;
      }

      // Level filter
      if (levelFilter !== 'ALL' && plan.educationLevel !== levelFilter) {
        return false;
      }

      // Subject filter
      if (selectedSubject !== 'ALL' && plan.subject !== selectedSubject) {
        return false;
      }

      // Search query across title, subject, class, term, learners
      if (q) {
        const matchesTitle = (plan.lessonTitle || '').toLowerCase().includes(q);
        const matchesSchool = (plan.schoolName || '').toLowerCase().includes(q);
        const matchesSubject = (plan.subject || '').toLowerCase().includes(q);
        const matchesClass = (plan.classGrade || '').toLowerCase().includes(q);
        const matchesTerm = (plan.term || '').toLowerCase().includes(q);
        const matchesLearners = (plan.numberOfLearners || '').toLowerCase().includes(q);
        const matchesUnit = (plan.unitTitle || plan.unitTopic || '').toLowerCase().includes(q);

        if (
          !matchesTitle &&
          !matchesSchool &&
          !matchesSubject &&
          !matchesClass &&
          !matchesTerm &&
          !matchesLearners &&
          !matchesUnit
        ) {
          return false;
        }
      }

      return true;
    });
  }, [lessonPlans, searchTerm, levelFilter, selectedSubject, user, isAdmin]);

  const confirmDelete = () => {
    if (planToDelete) {
      onDeletePlan(planToDelete.id);
      setPlanToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Return to Generator Breadcrumb */}
      <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <button
          onClick={onCreateNew}
          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.backToGenerator || '← Back to Lesson Plan Generator'}</span>
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-xs font-semibold text-slate-500">
          {t.savedPlansTitle}
        </span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900">{t.savedPlansTitle}</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.savedPlansSubtext}
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.createFirstPlan}</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
            >
              <option value="ALL">{t.allLevels}</option>
              <option value="Primary">{t.primaryLevel}</option>
              <option value="Secondary">{t.secondaryLevel}</option>
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
            >
              <option value="ALL">{t.allSubjects}</option>
              {subjectsList.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick status bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            {t.showingPlansCount
              .replace('{filtered}', String(filteredPlans.length))
              .replace('{total}', String(lessonPlans.length))}
          </span>
          {(searchTerm || levelFilter !== 'ALL' || selectedSubject !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setLevelFilter('ALL');
                setSelectedSubject('ALL');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              {t.clearFilters}
            </button>
          )}
        </div>
      </div>

      {/* Lesson Plans List */}
      {filteredPlans.length === 0 ? (
        <div className="bg-white rounded-xl p-10 border border-dashed border-slate-300 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">{t.noPlansMatchTitle}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {lessonPlans.length === 0
              ? t.noPlansMatchSubtextEmpty
              : t.noPlansMatchSubtextQuery}
          </p>
          <div className="pt-2">
            <button
              onClick={onCreateNew}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.createFirstPlan}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-emerald-300 p-5 shadow-sm transition-all flex flex-col justify-between space-y-4"
            >
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        plan.educationLevel === 'Primary'
                          ? 'bg-blue-100 text-blue-800'
                          : plan.educationLevel === 'Secondary'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {plan.educationLevel || 'CBC'} {plan.classGrade && `• ${plan.classGrade}`}
                    </span>
                    {plan.schoolName && (
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {plan.schoolName}
                      </span>
                    )}
                    {plan.subject && (
                      <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                        {plan.subject}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(plan.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <h3
                  onClick={() => onEditPlan(plan)}
                  className="text-base font-bold text-slate-900 hover:text-emerald-600 cursor-pointer transition-colors leading-snug"
                >
                  {plan.lessonTitle || 'Untitled Lesson'}
                </h3>

                {(plan.unitTitle || plan.unitTopic) && (
                  <p className="text-xs text-slate-600 line-clamp-1">
                    <span className="font-semibold text-slate-700">Unit:</span> {plan.unitTitle || plan.unitTopic}
                  </p>
                )}
              </div>

              {/* Card Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">{t.classAndLearners}</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {plan.classGrade || '—'} {plan.numberOfLearners ? `(${plan.numberOfLearners})` : ''}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">{t.durationAndDate}</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {plan.duration || '—'} {plan.date ? `• ${plan.date}` : ''}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">{t.termCol}</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {plan.term || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">{t.tableStagesCount}</span>
                  <span className="font-medium text-emerald-700">
                    {plan.stages.length} stage{plan.stages.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onPrintPlan(plan)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition-colors border border-slate-200"
                    title={t.printPreviewPdf}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{t.printPreviewPdf.split('/')[0].trim()}</span>
                  </button>

                  <button
                    onClick={() => onDuplicatePlan(plan.id)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    title={t.duplicate}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.duplicate}</span>
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setPlanToDelete(plan)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title={t.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onEditPlan(plan)}
                    className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t.edit}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-fade-in">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.confirmDeleteTitle}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  {t.confirmDeleteMessage}{' '}
                  <strong className="text-slate-900">"{planToDelete.lessonTitle}"</strong>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors"
              >
                {t.confirmDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

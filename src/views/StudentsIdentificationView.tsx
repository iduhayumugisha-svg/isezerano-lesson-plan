import React, { useState, useEffect } from 'react';
import { 
  Users, 
  PlusCircle, 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Calculator,
  Globe,
  Sparkles,
  School,
  HeartHandshake,
  ArrowLeft
} from 'lucide-react';
import { LessonPlan, StudentsIdentification, EducationLevel } from '../types/lessonPlan';
import { 
  getSavedStudentsIdentification, 
  saveStudentsIdentification, 
  defaultStudentsIdentification 
} from '../services/storageService';
import { RWANDA_TERMS, PRIMARY_GRADES, SECONDARY_GRADES } from '../data/rwandaCbcData';
import { useLanguage } from '../i18n/LanguageContext';
import { SaasNavPage } from '../components/Sidebar';

interface StudentsIdentificationViewProps {
  lessonPlans: LessonPlan[];
  onNavigate: (page: SaasNavPage) => void;
  onSelectPlanToEdit: (plan: LessonPlan) => void;
  onCreateNewWithStudents: (prefill?: Partial<LessonPlan>) => void;
}

export const StudentsIdentificationView: React.FC<StudentsIdentificationViewProps> = ({
  lessonPlans,
  onNavigate,
  onSelectPlanToEdit,
  onCreateNewWithStudents
}) => {
  const { t } = useLanguage();

  const [formData, setFormData] = useState<StudentsIdentification>(() => {
    return getSavedStudentsIdentification();
  });

  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  // Field change handler
  const handleInputChange = (field: keyof StudentsIdentification, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSavedNotification(null);
  };

  // Validation logic: boys + girls equals total students
  const boysNum = parseInt(formData.numberOfBoys.trim(), 10);
  const girlsNum = parseInt(formData.numberOfGirls.trim(), 10);
  const totalNum = parseInt(formData.totalStudents.trim(), 10);

  const hasBoys = !isNaN(boysNum);
  const hasGirls = !isNaN(girlsNum);
  const hasTotal = !isNaN(totalNum);

  const sumBoysGirls = (hasBoys ? boysNum : 0) + (hasGirls ? girlsNum : 0);

  let validationState: 'idle' | 'valid' | 'mismatch' = 'idle';
  if ((hasBoys || hasGirls) && hasTotal) {
    if (sumBoysGirls === totalNum) {
      validationState = 'valid';
    } else {
      validationState = 'mismatch';
    }
  }

  // Auto-calculate total button
  const handleAutoCalculateTotal = () => {
    if (hasBoys || hasGirls) {
      setFormData((prev) => ({
        ...prev,
        totalStudents: String(sumBoysGirls)
      }));
    }
  };

  // Save Identification
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveStudentsIdentification(formData);
    setSavedNotification(t.identificationSavedSuccess);
    setTimeout(() => setSavedNotification(null), 4000);
  };

  // Create new lesson plan with these identification details
  const handleCreatePlanWithDetails = () => {
    handleSave();
    onCreateNewWithStudents({
      country: formData.country || 'Rwanda',
      educationLevel: formData.educationLevel,
      classGrade: formData.classGrade,
      subject: formData.subject,
      term: formData.term,
      date: formData.date,
      numberOfLearners: formData.totalStudents,
      numberOfBoys: formData.numberOfBoys,
      numberOfGirls: formData.numberOfGirls
    });
  };

  // Aggregate stats across all plans
  const totalLearnersCount = lessonPlans.reduce((sum, p) => {
    const val = parseInt((p.numberOfLearners || '').replace(/\D/g, ''), 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const primaryPlansCount = lessonPlans.filter((p) => p.educationLevel === 'Primary').length;
  const secondaryPlansCount = lessonPlans.filter((p) => p.educationLevel === 'Secondary').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Return to Generator Breadcrumb */}
      <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => onNavigate('create')}
          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.backToGenerator || '← Back to Lesson Plan Generator'}</span>
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-xs font-semibold text-slate-500">
          {t.studentsIdTitle}
        </span>
      </div>

      {/* Page Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t.studentsIdTitle}</h1>
            <p className="text-xs text-slate-500">
              {t.identificationProfileSubtext}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreatePlanWithDetails}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.createPlanWithIdBtn}</span>
        </button>
      </div>

      {/* Save status notification */}
      {savedNotification && (
        <div className="p-4 rounded-xl text-sm font-semibold flex items-center space-x-2 bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{savedNotification}</span>
        </div>
      )}

      {/* Main Identification Form Card */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <School className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              {t.identificationProfileTitle}
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Rwanda CBC Standard</span>
        </div>

        <div className="p-6 space-y-6">
          {/* Row 1: Country & School Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Country */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.countryLabel}</span>
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder={t.countryPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium text-slate-900"
              />
            </div>

            {/* School Level (Primary / Secondary) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {t.educationLevelLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleInputChange('educationLevel', 'Primary')}
                  className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                    formData.educationLevel === 'Primary'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t.primaryRadio}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange('educationLevel', 'Secondary')}
                  className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                    formData.educationLevel === 'Secondary'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>{t.secondaryRadio}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Class/Grade & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Class / Grade */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {t.classOrGradeLabel}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.classGrade}
                  onChange={(e) => handleInputChange('classGrade', e.target.value)}
                  placeholder={t.classPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium text-slate-900"
                />
              </div>
              {/* Grade chips suggestion */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(formData.educationLevel === 'Secondary' ? SECONDARY_GRADES : PRIMARY_GRADES).slice(0, 6).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleInputChange('classGrade', g)}
                    className="px-2 py-0.5 text-[11px] rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border border-slate-200 transition-colors"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {t.subjectLabel}
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder={t.subjectPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Row 3: Term & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Term */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {t.termLabel}
              </label>
              <select
                value={formData.term}
                onChange={(e) => handleInputChange('term', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium bg-white text-slate-900"
              >
                <option value="">{t.termPlaceholder}</option>
                {RWANDA_TERMS.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.dateLabel}</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Row 4: Student Count & Demographics (Boys, Girls, Total Students) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>{t.totalLearnersActive}</span>
              </span>
              {(hasBoys || hasGirls) && (
                <button
                  type="button"
                  onClick={handleAutoCalculateTotal}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{t.autoCalculateTotal}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Number of Boys */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.numberOfBoysLabel}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.numberOfBoys}
                  onChange={(e) => handleInputChange('numberOfBoys', e.target.value)}
                  placeholder={t.numberOfBoysPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold text-slate-900 bg-white"
                />
              </div>

              {/* Number of Girls */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.numberOfGirlsLabel}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.numberOfGirls}
                  onChange={(e) => handleInputChange('numberOfGirls', e.target.value)}
                  placeholder={t.numberOfGirlsPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold text-slate-900 bg-white"
                />
              </div>

              {/* Total Students */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.totalStudentsLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.totalStudents}
                  onChange={(e) => handleInputChange('totalStudents', e.target.value)}
                  placeholder={t.totalStudentsPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-bold text-slate-900 bg-white"
                  required
                />
              </div>
            </div>

            {/* Validation Feedback Banner */}
            {validationState === 'valid' && (
              <div className="p-3 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {t.validationPassed
                    .replace('{boys}', String(boysNum))
                    .replace('{girls}', String(girlsNum))
                    .replace('{total}', String(totalNum))}
                </span>
              </div>
            )}

            {validationState === 'mismatch' && (
              <div className="p-3 rounded-lg text-xs font-semibold bg-red-50 border border-red-300 text-red-800 flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    {t.validationMismatch
                      .replace('{boys}', String(hasBoys ? boysNum : 0))
                      .replace('{girls}', String(hasGirls ? girlsNum : 0))
                      .replace('{sum}', String(sumBoysGirls))
                      .replace('{total}', String(totalNum))}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoCalculateTotal}
                  className="text-xs px-2.5 py-1 rounded bg-red-600 text-white hover:bg-red-700 whitespace-nowrap font-bold"
                >
                  Set Total = {sumBoysGirls}
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>{t.saveIdentificationBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleCreatePlanWithDetails}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95 ml-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.createPlanWithIdBtn}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Aggregate Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.totalLearnersActive}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">{totalLearnersCount}</span>
            <span className="text-xs text-slate-500">{t.learnersCol.toLowerCase()}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.primaryLevel}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">{primaryPlansCount}</span>
            <span className="text-xs text-slate-500">plans</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.secondaryLevel}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">{secondaryPlansCount}</span>
            <span className="text-xs text-slate-500">plans</span>
          </div>
        </div>
      </div>

      {/* Existing Lesson Plans Students Identification Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{t.studentsIdTitle} — {t.savedPlansTitle}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and manage student identification details across your saved lesson plans.
            </p>
          </div>

          <button
            onClick={() => onNavigate('create')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
          >
            <span>+ {t.newPlanButton}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {lessonPlans.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">{t.noPlansYet}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              {t.noPlansSubtext}
            </p>
            <button
              onClick={handleCreatePlanWithDetails}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.createPlanWithIdBtn}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {lessonPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-slate-50 hover:bg-slate-100/80 rounded-xl p-4 border border-slate-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        plan.educationLevel === 'Primary'
                          ? 'bg-blue-100 text-blue-800'
                          : plan.educationLevel === 'Secondary'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {plan.educationLevel || 'CBC'} {plan.classGrade && `• ${plan.classGrade}`}
                    </span>
                    {plan.numberOfLearners && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {plan.numberOfLearners} {t.learnersCol.toLowerCase()}
                        {plan.numberOfBoys && plan.numberOfGirls && (
                          <span className="font-normal text-[11px] ml-1">
                            (♂ {plan.numberOfBoys} | ♀ {plan.numberOfGirls})
                          </span>
                        )}
                      </span>
                    )}
                    {plan.subject && (
                      <span className="text-xs font-medium text-slate-600">
                        {plan.subject}
                      </span>
                    )}
                    {plan.term && (
                      <span className="text-[11px] text-slate-500">
                        • {plan.term}
                      </span>
                    )}
                    {plan.date && (
                      <span className="text-[11px] text-slate-500">
                        • {plan.date}
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => onSelectPlanToEdit(plan)}
                    className="text-sm font-bold text-slate-900 hover:text-emerald-600 cursor-pointer"
                  >
                    {plan.lessonTitle || 'Untitled Lesson'}
                  </h3>

                  {plan.specialNeedsLearners && (
                    <div className="flex items-center space-x-1 text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 max-w-xl">
                      <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{plan.specialNeedsLearners}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    onClick={() => onSelectPlanToEdit(plan)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-300 transition-colors"
                  >
                    {t.edit}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

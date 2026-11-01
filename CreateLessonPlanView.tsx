import React, { useState, useEffect } from 'react';
import { 
  LessonPlan, 
  LessonStage,
  AppSettings
} from '../types/lessonPlan';
import { RWANDA_TERMS } from '../data/rwandaCbcData';
import { getAppSettings } from '../services/appSettingsService';
import { 
  Save, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  BookOpen,
  Users,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { generateCbcLessonPlanOutline } from '../services/cbcGeneratorService';

interface CreateLessonPlanViewProps {
  initialPlan?: LessonPlan | null;
  onSavePlan: (plan: LessonPlan) => Promise<{ success: boolean; error?: string }>;
  onPrintPreview: (plan: LessonPlan) => void;
  onCancelOrNew: () => void;
}

export const CreateLessonPlanView: React.FC<CreateLessonPlanViewProps> = ({
  initialPlan,
  onSavePlan,
  onPrintPreview,
  onCancelOrNew
}) => {
  const { t, language } = useLanguage();

  const [plan, setPlan] = useState<LessonPlan>(() => {
    if (initialPlan) return { ...initialPlan };
    return {
      id: `rw-lp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schoolName: '',
      schoolLogoUrl: '',
      province: '',
      district: '',
      academicYear: '',
      term: '',
      date: '',
      subject: '',
      classGrade: '',
      unitNo: '',
      lessonNo: '',
      duration: '',
      numberOfLearners: '',
      country: 'Rwanda',
      numberOfBoys: '',
      numberOfGirls: '',
      teacherName: '',
      teacherQualification: '',
      educationLevel: '',
      specialNeedsLearners: '',
      unitTopic: '',
      keyUnitCompetence: '',
      lessonTitle: '',
      unitTitle: '',
      learningObjectives: '',
      lessonLocation: '',
      teachingMaterials: '',
      references: '',
      stages: [], // strictly starts with 0 stages
      teacherSelfEvaluation: '',
      status: 'draft'
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [lastRemovedStage, setLastRemovedStage] = useState<{ stage: LessonStage; index: number } | null>(null);
  const [confirmDeleteStageId, setConfirmDeleteStageId] = useState<string | null>(null);

  useEffect(() => {
    getAppSettings().then((s) => {
      setAppSettings(s);
      if (!initialPlan && s.schoolDefaultName) {
        setPlan((prev) => ({
          ...prev,
          schoolName: prev.schoolName || s.schoolDefaultName,
          academicYear: prev.academicYear || s.academicYear
        }));
      }
    });
  }, [initialPlan]);

  const handleFieldChange = (field: keyof LessonPlan, value: any) => {
    setPlan((prev) => ({ ...prev, [field]: value }));
    setSaveMessage(null);
  };

  const handleAutoGenerateCbcPlan = () => {
    const topic = plan.lessonTitle || plan.unitTopic || plan.subject;
    if (!topic.trim()) {
      setSaveMessage({
        type: 'error',
        text: 'Please enter a Subject, Unit Topic, or Lesson Title first to generate a customized CBC outline.'
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const outline = generateCbcLessonPlanOutline({
      subject: plan.subject,
      classGrade: plan.classGrade,
      lessonTitle: plan.lessonTitle,
      unitTopic: plan.unitTopic,
      duration: plan.duration || '40 min',
      term: plan.term || 'Term 1',
      educationLevel: plan.educationLevel,
      language
    });

    setPlan((prev) => ({
      ...prev,
      keyUnitCompetence: prev.keyUnitCompetence || outline.keyUnitCompetence || '',
      learningObjectives: prev.learningObjectives || outline.learningObjectives || '',
      teachingMaterials: prev.teachingMaterials || outline.teachingMaterials || '',
      references: prev.references || outline.references || '',
      specialNeedsLearners: prev.specialNeedsLearners || outline.specialNeedsLearners || '',
      teacherSelfEvaluation: prev.teacherSelfEvaluation || outline.teacherSelfEvaluation || '',
      stages: prev.stages.length > 0 ? prev.stages : (outline.stages || [])
    }));

    setSaveMessage({
      type: 'success',
      text: 'CBC Lesson Plan structure and stages successfully generated! You can review and adjust any field.'
    });
  };

  // STAGES MANAGEMENT
  const handleAddStage = (stageName = '', duration = '') => {
    const newStage: LessonStage = {
      id: `stage-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      stageName: stageName,
      duration: duration,
      teacherActivities: '',
      learnerActivities: '',
      competencesAndCrossCutting: '',
      materials: '',
      assessment: ''
    };
    setPlan((prev) => ({
      ...prev,
      stages: [...prev.stages, newStage]
    }));
  };

  const handleUpdateStage = (id: string, field: keyof LessonStage, value: string) => {
    setPlan((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    }));
  };

  const handleRequestRemoveStage = (id: string) => {
    const stage = plan.stages.find((s) => s.id === id);
    if (!stage) return;

    // Check if stage has any entered content
    const hasContent = Boolean(
      (stage.stageName && stage.stageName.trim()) ||
      (stage.duration && stage.duration.trim()) ||
      (stage.teacherActivities && stage.teacherActivities.trim()) ||
      (stage.learnerActivities && stage.learnerActivities.trim()) ||
      (stage.competencesAndCrossCutting && stage.competencesAndCrossCutting.trim()) ||
      (stage.materials && stage.materials.trim()) ||
      (stage.assessment && stage.assessment.trim())
    );

    if (hasContent) {
      setConfirmDeleteStageId(id);
    } else {
      executeRemoveStage(id);
    }
  };

  const executeRemoveStage = (id: string) => {
    const stageIndex = plan.stages.findIndex((s) => s.id === id);
    const stageToRemove = plan.stages[stageIndex];
    if (!stageToRemove) return;

    setLastRemovedStage({ stage: stageToRemove, index: stageIndex });
    setConfirmDeleteStageId(null);

    setPlan((prev) => ({
      ...prev,
      stages: prev.stages.filter((s) => s.id !== id)
    }));

    setSaveMessage({
      type: 'success',
      text: `Stage ${stageIndex + 1} ("${stageToRemove.stageName || 'Stage'}") removed.`
    });
  };

  const handleUndoRemoveStage = () => {
    if (!lastRemovedStage) return;
    const { stage, index } = lastRemovedStage;

    setPlan((prev) => {
      const nextStages = [...prev.stages];
      const insertAt = Math.min(index, nextStages.length);
      nextStages.splice(insertAt, 0, stage);
      return { ...prev, stages: nextStages };
    });

    setLastRemovedStage(null);
    setSaveMessage({
      type: 'success',
      text: `Stage "${stage.stageName || 'Stage'}" restored.`
    });
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= plan.stages.length) return;

    setPlan((prev) => {
      const newStages = [...prev.stages];
      const temp = newStages[index];
      newStages[index] = newStages[targetIndex];
      newStages[targetIndex] = temp;
      return { ...prev, stages: newStages };
    });
  };

  // Saving the plan
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!plan.lessonTitle.trim() && !plan.subject.trim()) {
      setSaveMessage({ type: 'error', text: `${t.lessonTitleLabel} is required.` });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const result = await onSavePlan(plan);
    setIsSaving(false);

    if (result.success) {
      setSaveMessage({ type: 'success', text: t.saveSuccess });
      setTimeout(() => setSaveMessage(null), 4000);
    } else {
      setSaveMessage({
        type: 'error',
        text: result.error || t.saveError
      });
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Action Bar */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {plan.lessonTitle.trim() ? plan.lessonTitle : t.editorTitleDefault}
            </h1>
            <p className="text-xs text-slate-500">
              {t.editorSubtext.replace('{stages}', String(plan.stages.length))}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleAutoGenerateCbcPlan}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors border border-emerald-300 shadow-2xs"
            title="Auto-generate official REB objectives, competencies, and 3-stage lesson activities"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Generate CBC Outline</span>
            <span className="sm:hidden">Generate</span>
          </button>

          <button
            type="button"
            onClick={() => onPrintPreview(plan)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-300"
            title={t.printPreviewPdf}
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">{t.printPreviewPdf}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? t.saving : t.save}</span>
          </button>
        </div>
      </div>

      {/* Notifications banner */}
      {saveMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-sm ${
            saveMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-red-50 border border-red-300 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {saveMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{saveMessage.text}</span>
          </div>

          {lastRemovedStage && (
            <button
              type="button"
              onClick={handleUndoRemoveStage}
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0 ml-3"
            >
              {t.undoRemove || 'Undo'}
            </button>
          )}
        </div>
      )}

      {/* ================= OFFICIAL FORMAT: IMBATA Y'ISOMO ================= */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-md p-4 sm:p-7 space-y-6">
        
        {/* Title Header */}
        <div className="text-center pb-2 border-b border-slate-200">
          <h2 className="text-xl font-extrabold uppercase tracking-widest text-slate-900">
            {t.appTitle.toUpperCase()} / IMBATA Y'ISOMO
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {t.curriculumSubtitle}
          </p>
        </div>

        {/* ================= 1. STUDENTS IDENTIFICATION (Table 1: 8-Column Metadata Bar) ================= */}
        <div className="rounded-lg border border-slate-300 overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold text-xs uppercase text-slate-800 flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>1. {t.studentsIdTitle}</span>
          </div>

          {/* School Name Field */}
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-300 flex flex-wrap items-center gap-2.5 text-xs">
            <label htmlFor="schoolNameInput" className="font-bold text-slate-800 whitespace-nowrap">
              {t.schoolNameLabel}:
            </label>
            <input
              id="schoolNameInput"
              type="text"
              value={plan.schoolName || ''}
              onChange={(e) => handleFieldChange('schoolName', e.target.value)}
              placeholder={t.schoolNamePlaceholder || 'Enter school name (e.g., GS GITUMBA)'}
              className="flex-1 min-w-[240px] max-w-lg px-3 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold text-slate-900 bg-white"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-300 text-center">
                  <th className="border-r border-slate-300 p-2.5">{t.termCol}</th>
                  <th className="border-r border-slate-300 p-2.5">{t.dateCol}</th>
                  <th className="border-r border-slate-300 p-2.5">{t.subjectCol}</th>
                  <th className="border-r border-slate-300 p-2.5">{t.classCol}</th>
                  <th className="border-r border-slate-300 p-2.5">{t.unitNoCol}</th>
                  <th className="border-r border-slate-300 p-2.5">{t.lessonNoCol}</th>
                  <th className="border-r border-slate-300 p-2.5">{t.durationCol}</th>
                  <th className="p-2.5">{t.learnersCol}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {/* 1. Term */}
                  <td className="border-r border-slate-300 p-2 bg-slate-50/50">
                    <select
                      value={plan.term}
                      onChange={(e) => handleFieldChange('term', e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold bg-white"
                    >
                      <option value="">{t.termPlaceholder}</option>
                      {RWANDA_TERMS.map((termItem) => (
                        <option key={termItem} value={termItem}>
                          {termItem}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* 2. Date */}
                  <td className="border-r border-slate-300 p-2">
                    <input
                      type="date"
                      value={plan.date}
                      onChange={(e) => handleFieldChange('date', e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs bg-white"
                    />
                  </td>

                  {/* 3. Subject */}
                  <td className="border-r border-slate-300 p-2">
                    <input
                      type="text"
                      list="admin-subjects-list"
                      value={plan.subject}
                      onChange={(e) => handleFieldChange('subject', e.target.value)}
                      placeholder={t.subjectPlaceholder}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium"
                    />
                    <datalist id="admin-subjects-list">
                      {appSettings?.availableSubjects?.map((sub) => (
                        <option key={sub} value={sub} />
                      ))}
                    </datalist>
                  </td>

                  {/* 4. Class */}
                  <td className="border-r border-slate-300 p-2">
                    <input
                      type="text"
                      list="admin-classes-list"
                      value={plan.classGrade}
                      onChange={(e) => handleFieldChange('classGrade', e.target.value)}
                      placeholder={t.classPlaceholder}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium"
                    />
                    <datalist id="admin-classes-list">
                      {appSettings?.availableClasses?.map((cls) => (
                        <option key={cls} value={cls} />
                      ))}
                    </datalist>
                  </td>

                  {/* 5. Unit No */}
                  <td className="border-r border-slate-300 p-2">
                    <input
                      type="text"
                      value={plan.unitNo}
                      onChange={(e) => handleFieldChange('unitNo', e.target.value)}
                      placeholder={t.unitNoPlaceholder}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-center font-medium"
                    />
                  </td>

                  {/* 6. Lesson No */}
                  <td className="border-r border-slate-300 p-2">
                    <input
                      type="text"
                      value={plan.lessonNo}
                      onChange={(e) => handleFieldChange('lessonNo', e.target.value)}
                      placeholder={t.lessonNoPlaceholder}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-center font-medium"
                    />
                  </td>

                  {/* 7. Duration */}
                  <td className="border-r border-slate-300 p-2">
                    <input
                      type="text"
                      value={plan.duration}
                      onChange={(e) => handleFieldChange('duration', e.target.value)}
                      placeholder={t.durationPlaceholder}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-center font-medium"
                    />
                  </td>

                  {/* 8. Learners */}
                  <td className="p-2">
                    <input
                      type="text"
                      value={plan.numberOfLearners}
                      onChange={(e) => handleFieldChange('numberOfLearners', e.target.value)}
                      placeholder={t.learnersPlaceholder}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-center font-medium"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= TABLE 2: 8 Rows Objectives & Context ================= */}
        <div className="rounded-lg border border-slate-300 overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold text-xs uppercase text-slate-800">
            2. {t.section2Title}
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody className="divide-y divide-slate-200">
              {/* Row 1: Ubwoko bw'abanyeshuri bafite ibyifuzo byihariye */}
              <tr className="hover:bg-slate-50/50">
                <td className="w-full sm:w-[38%] p-3 font-bold text-slate-900 bg-slate-50/80 border-r border-slate-200 align-top">
                  {t.specialNeedsLabel}
                </td>
                <td className="p-3">
                  <textarea
                    rows={2}
                    value={plan.specialNeedsLearners}
                    onChange={(e) => handleFieldChange('specialNeedsLearners', e.target.value)}
                    placeholder={t.specialNeedsPlaceholder}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 resize-y"
                  />
                </td>
              </tr>

              {/* Row 2: Umutwe w'isomo / Inyigisho */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-900 bg-slate-50/80 border-r border-slate-200 align-top">
                  {t.unitTopicLabel}
                </td>
                <td className="p-3">
                  <textarea
                    rows={2}
                    value={plan.unitTopic || plan.unitTitle}
                    onChange={(e) => {
                      handleFieldChange('unitTopic', e.target.value);
                      handleFieldChange('unitTitle', e.target.value);
                    }}
                    placeholder={t.unitTopicPlaceholder}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 resize-y"
                  />
                </td>
              </tr>

              {/* Row 3: Ubushobozi bw'ingenzi bugamijwe ku mutwe */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-900 bg-slate-50/80 border-r border-slate-200 align-top">
                  {t.keyCompetenceLabel}
                </td>
                <td className="p-3">
                  <textarea
                    rows={2}
                    value={plan.keyUnitCompetence}
                    onChange={(e) => handleFieldChange('keyUnitCompetence', e.target.value)}
                    placeholder={t.keyCompetencePlaceholder}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 resize-y"
                  />
                </td>
              </tr>

              {/* Row 4: Umutwe w'isomo */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-900 bg-slate-50/80 border-r border-slate-200 align-top">
                  {t.lessonTitleLabel} <span className="text-red-500">*</span>
                </td>
                <td className="p-3">
                  <textarea
                    rows={2}
                    value={plan.lessonTitle}
                    onChange={(e) => handleFieldChange('lessonTitle', e.target.value)}
                    placeholder={t.lessonTitlePlaceholder}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold text-slate-900 resize-y"
                    required
                  />
                </td>
              </tr>

              {/* Row 5: Intego z'isomo */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-900 bg-slate-50/80 border-r border-slate-200 align-top">
                  {t.learningObjectivesLabel}
                </td>
                <td className="p-3">
                  <textarea
                    rows={2}
                    value={plan.learningObjectives}
                    onChange={(e) => handleFieldChange('learningObjectives', e.target.value)}
                    placeholder={t.learningObjectivesPlaceholder}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 resize-y"
                  />
                </td>
              </tr>

              {/* Row 6: Iteganyamwanya ry'aho isomo ribera */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-900 bg-slate-50/80 border-r border-slate-200 align-top">
                  {t.locationLabel}
                </td>
                <td className="p-3">
                  <input
                    type="text"
                    value={plan.lessonLocation}
                    onChange={(e) => handleFieldChange('lessonLocation', e.target.value)}
                    placeholder={t.locationPlaceholder}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900"
                  />
                </td>
              </tr>

              {/* Row 7: Ibikoresho by'isomo */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-900 bg-slate-50/80 border-r border-slate-200 align-top">
                  {t.materialsLabel}
                </td>
                <td className="p-3">
                  <textarea
                    rows={2}
                    value={plan.teachingMaterials}
                    onChange={(e) => handleFieldChange('teachingMaterials', e.target.value)}
                    placeholder={t.materialsPlaceholder}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 resize-y"
                  />
                </td>
              </tr>

              {/* Row 8: Ibitabo byifashishijwe */}
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-900 bg-slate-50/80 border-r border-slate-200 align-top">
                  {t.referencesLabel}
                </td>
                <td className="p-3">
                  <textarea
                    rows={2}
                    value={plan.references}
                    onChange={(e) => handleFieldChange('references', e.target.value)}
                    placeholder={t.referencesPlaceholder}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 resize-y"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ================= TABLE 3: MAIN LESSON PLAN TABLE ================= */}
        <div className="rounded-xl border-2 border-slate-400 overflow-hidden shadow-sm">
          {/* Main Table Toolbar */}
          <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide">
                3. {t.mainTableTitle}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {t.mainTableSubtext}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleAddStage('', '')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>{t.addStageBtn}</span>
              </button>
            </div>
          </div>

          {/* Quick Add Buttons for Official Rwandan Stages */}
          <div className="bg-emerald-50/80 border-b border-emerald-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-emerald-950">
              {t.quickAddLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleAddStage('Intangiriro', '5 min')}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-white hover:bg-emerald-600 hover:text-white text-emerald-900 transition-colors border border-emerald-300"
              >
                {t.addIntroStage}
              </button>
              <button
                type="button"
                onClick={() => handleAddStage('Isomo nyirizina', '30 min')}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-white hover:bg-emerald-600 hover:text-white text-emerald-900 transition-colors border border-emerald-300"
              >
                {t.addDevStage}
              </button>
              <button
                type="button"
                onClick={() => handleAddStage('Umusuzo w\'isomo', '5 min')}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-white hover:bg-emerald-600 hover:text-white text-emerald-900 transition-colors border border-emerald-300"
              >
                {t.addConclusionStage}
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="p-3 sm:p-5">
            {plan.stages.length === 0 ? (
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50">
                <Clock className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">
                  {t.zeroStagesTitle}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  {t.zeroStagesSubtext}
                </p>
                <button
                  type="button"
                  onClick={() => handleAddStage('', '')}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addFirstStageBtn}</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-300">
                <table className="w-full text-xs text-left border-collapse min-w-[850px]">
                  <thead>
                    {/* Header Row 1 */}
                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-center">
                      <th rowSpan={2} className="border-r border-slate-300 p-2.5 w-[18%] align-middle">
                        {t.stageAndTimeHeader}
                      </th>
                      <th colSpan={2} className="border-r border-slate-300 p-2.5 w-[48%]">
                        {t.activitiesGroupHeader}
                      </th>
                      <th rowSpan={2} className="border-r border-slate-300 p-2.5 w-[26%] align-middle">
                        {t.competencesCrossCuttingHeader}
                      </th>
                      <th rowSpan={2} className="p-2.5 w-[80px] align-middle">
                        Actions
                      </th>
                    </tr>

                    {/* Header Row 2 (Sub-headers) */}
                    <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300 text-center">
                      <th className="border-r border-slate-300 p-2 w-[24%]">
                        {t.teacherActivitiesHeader}
                      </th>
                      <th className="border-r border-slate-300 p-2 w-[24%]">
                        {t.learnerActivitiesHeader}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-300 bg-white">
                    {plan.stages.map((stage, idx) => (
                      <tr key={stage.id} className="hover:bg-slate-50/80 transition-colors align-top">
                        {/* Col 1: Stage and Time with Easy-to-find Remove Stage button */}
                        <td className="border-r border-slate-300 p-2.5 bg-slate-50/70">
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block">
                              {t.stepNumberPrefix} {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={stage.stageName}
                              onChange={(e) => handleUpdateStage(stage.id, 'stageName', e.target.value)}
                              placeholder={t.stageNamePlaceholder}
                              className="w-full px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-bold text-slate-900 bg-white"
                            />
                            <input
                              type="text"
                              value={stage.duration}
                              onChange={(e) => handleUpdateStage(stage.id, 'duration', e.target.value)}
                              placeholder={t.durationInputPlaceholder}
                              className="w-full px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-[11px] text-slate-700 bg-white"
                            />

                            {/* Prominent, easy-to-find Remove Stage button */}
                            {confirmDeleteStageId === stage.id ? (
                              <div className="mt-2 p-1.5 rounded-lg bg-red-50 border border-red-200 text-center animate-in fade-in duration-150">
                                <p className="text-[10px] font-bold text-red-800 mb-1 leading-tight">
                                  {t.confirmRemoveStage || 'Remove this stage?'}
                                </p>
                                <div className="flex items-center justify-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => executeRemoveStage(stage.id)}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-2xs"
                                  >
                                    Yes, Remove
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteStageId(null)}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRequestRemoveStage(stage.id)}
                                className="w-full mt-2 inline-flex items-center justify-center space-x-1.5 px-2 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors shadow-2xs active:scale-98 cursor-pointer"
                                title={`Remove Stage ${idx + 1}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                <span>{t.removeStageBtn || 'Remove Stage'}</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Col 2: Teacher Activities */}
                        <td className="border-r border-slate-300 p-2.5">
                          <textarea
                            rows={5}
                            value={stage.teacherActivities}
                            onChange={(e) => handleUpdateStage(stage.id, 'teacherActivities', e.target.value)}
                            placeholder={t.teacherActPlaceholder}
                            className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 resize-y min-h-[110px]"
                          />
                        </td>

                        {/* Col 3: Learner Activities */}
                        <td className="border-r border-slate-300 p-2.5">
                          <textarea
                            rows={5}
                            value={stage.learnerActivities}
                            onChange={(e) => handleUpdateStage(stage.id, 'learnerActivities', e.target.value)}
                            placeholder={t.learnerActPlaceholder}
                            className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 resize-y min-h-[110px]"
                          />
                        </td>

                        {/* Col 4: Competences & Cross-Cutting */}
                        <td className="border-r border-slate-300 p-2.5">
                          <textarea
                            rows={5}
                            value={stage.competencesAndCrossCutting || ''}
                            onChange={(e) => handleUpdateStage(stage.id, 'competencesAndCrossCutting', e.target.value)}
                            placeholder={t.competencesPlaceholder}
                            className="w-full p-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 resize-y min-h-[110px]"
                          />
                        </td>

                        {/* Col 5: Reorder & Remove Action */}
                        <td className="p-2.5 text-center align-middle">
                          <div className="flex flex-col items-center space-y-1.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveStage(idx, 'up')}
                              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-20 transition-colors cursor-pointer"
                              title={t.moveUp}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === plan.stages.length - 1}
                              onClick={() => handleMoveStage(idx, 'down')}
                              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-20 transition-colors cursor-pointer"
                              title={t.moveDown}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            {confirmDeleteStageId !== stage.id && (
                              <button
                                type="button"
                                onClick={() => handleRequestRemoveStage(stage.id)}
                                className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                title={t.removeStageBtn || 'Remove Stage'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {plan.stages.length > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {t.stagesCountSummary.replace('{count}', String(plan.stages.length))}
                </span>
                <button
                  type="button"
                  onClick={() => handleAddStage('', '')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addAnotherStageBtn}</span>
                </button>
              </div>
            )}
          </div>

          {/* ================= BOTTOM ROW: ISUZUMA MWARIMU YIKORA ================= */}
          <div className="border-t border-slate-300 p-4 bg-slate-50/80">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              {t.selfEvaluationLabel}
            </label>
            <textarea
              rows={3}
              value={plan.teacherSelfEvaluation}
              onChange={(e) => handleFieldChange('teacherSelfEvaluation', e.target.value)}
              placeholder={t.selfEvaluationPlaceholder}
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 resize-y"
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onCancelOrNew}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {t.resetNewPlan}
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => onPrintPreview(plan)}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors border border-slate-300"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>{t.printPreviewPdf}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? t.saving : t.save}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

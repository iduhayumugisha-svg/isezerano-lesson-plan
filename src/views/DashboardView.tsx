import React from 'react';
import { 
  PlusCircle, 
  BookOpen, 
  GraduationCap, 
  Users, 
  Printer, 
  ArrowRight, 
  CheckCircle2, 
  FileCheck, 
  Search,
  Settings,
  FolderClock,
  ArrowLeft,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { LessonPlan } from '../types/lessonPlan';
import { SaasNavPage } from '../components/Sidebar';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { FEATURE_FLAGS } from '../config/features';

interface DashboardViewProps {
  lessonPlans: LessonPlan[];
  onNavigate: (page: SaasNavPage) => void;
  onSelectPlanToEdit: (plan: LessonPlan) => void;
  onSelectPlanToPrint: (plan: LessonPlan) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  lessonPlans,
  onNavigate,
  onSelectPlanToEdit,
  onSelectPlanToPrint
}) => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();

  const totalPlans = lessonPlans.length;
  const primaryPlans = lessonPlans.filter((p) => p.educationLevel === 'Primary').length;
  const secondaryPlans = lessonPlans.filter((p) => p.educationLevel === 'Secondary').length;

  const totalLearners = lessonPlans.reduce((sum, p) => {
    const val = parseInt(p.numberOfLearners.replace(/\D/g, ''), 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  // Available Education Modules in the Centralized Dashboard
  const educationModules = [
    {
      id: 'create' as SaasNavPage,
      title: t.moduleGeneratorTitle || 'Lesson Plan Generator',
      badge: 'Home / Primary',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: t.moduleGeneratorDesc || 'Create official MINEDUC/REB compliant Rwanda CBC lesson plans with 8-column header, competencies, steps, and evaluation.',
      icon: PlusCircle,
      iconColor: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
      buttonText: t.navCreate || 'Create Lesson Plan'
    },
    {
      id: 'saved' as SaasNavPage,
      title: t.moduleSavedTitle || 'Saved Lesson Plans & Export',
      badge: `${totalPlans} ${t.totalPlans || 'Plans'}`,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      description: t.moduleSavedDesc || 'Search, preview, duplicate, edit, and print or export all your prepared lesson plans as official PDF tables.',
      icon: FolderClock,
      iconColor: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
      buttonText: t.browsePlans || 'Browse Saved Plans'
    },
    {
      id: 'students' as SaasNavPage,
      title: t.moduleStudentsTitle || 'Student Identification',
      badge: `${totalLearners} Active`,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      description: t.moduleStudentsDesc || 'Manage learner demographic profiles, class grades, subjects, terms, and track boy/girl enrollment.',
      icon: Users,
      iconColor: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
      buttonText: t.navStudents || 'Open Demographics'
    },
    {
      id: 'settings' as SaasNavPage,
      title: t.moduleSettingsTitle || 'Settings',
      badge: (isAdmin && FEATURE_FLAGS.ENABLE_ADMIN_UI) ? 'Cloud & Backup' : 'Preferences',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      description: (isAdmin && FEATURE_FLAGS.ENABLE_ADMIN_UI)
        ? (t.moduleSettingsDesc || 'Configure Cloud Firestore database synchronization, offline JSON exports/backups, and security rules.')
        : 'Manage language preferences and application settings.',
      icon: Settings,
      iconColor: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
      buttonText: t.navSettings || 'Configure Settings'
    }
  ];

  if (isAdmin && FEATURE_FLAGS.ENABLE_ADMIN_UI) {
    educationModules.push({
      id: 'admin' as SaasNavPage,
      title: 'Admin Management Dashboard',
      badge: 'Protected',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'Configure platform modules, teacher accounts, and curriculum classes and subjects.',
      icon: ShieldCheck,
      iconColor: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
      buttonText: 'Open Admin'
    });
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation Breadcrumb / Return to Generator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('create')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.backToGenerator || '← Back to Lesson Plan Generator'}</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-500">
            {t.navAllTools || 'Dashboard / All Tools'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rwanda CBC Education Platform</span>
          </span>
        </div>
      </div>

      {/* Centralized Dashboard Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-8 shadow-lg border border-emerald-900/40">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{t.curriculumSubtitle}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t.navAllTools || 'Dashboard / All Tools'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300">
            {t.modulesSubtext || 'Centralized hub for all education features, saved lesson plans, learner tracking, and system settings.'}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('create')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md active:scale-95"
            >
              <PlusCircle className="w-5 h-5 text-slate-950" />
              <span>{t.createFirstPlan || 'Create Lesson Plan'}</span>
            </button>
            <button
              onClick={() => onNavigate('saved')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all border border-slate-700"
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span>{t.browsePlans || 'Browse Plans'} ({totalPlans})</span>
            </button>
          </div>
        </div>

        {/* Decorative subtle background accents */}
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* ================= CENTRALIZED EDUCATION MODULES GRID ================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {t.modulesTitle || 'Education Tools & Modules'}
            </h2>
            <p className="text-xs text-slate-500">
              Select any education module below to open its dedicated workspace.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {educationModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-2xs ${mod.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${mod.badgeColor}`}>
                      {mod.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {mod.title}
                  </h3>

                  <p className="mt-1.5 text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 group-hover:text-emerald-700 flex items-center space-x-1">
                    <span>{mod.buttonText}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Metrics Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Plans */}
        <div 
          onClick={() => onNavigate('saved')}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.totalPlans}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">{totalPlans}</span>
          </div>
        </div>

        {/* Primary Level */}
        <div 
          onClick={() => onNavigate('saved')}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.primaryLevel}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">{primaryPlans}</span>
          </div>
        </div>

        {/* Secondary Level */}
        <div 
          onClick={() => onNavigate('saved')}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.secondaryLevel}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">{secondaryPlans}</span>
          </div>
        </div>

        {/* Students Identification Metric */}
        <div 
          onClick={() => onNavigate('students')}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700">
              {t.totalLearnersActive}
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">{totalLearners}</span>
            <span className="text-xs text-slate-500">active</span>
          </div>
        </div>
      </div>

      {/* Main Section: Recent Plans and CBC Curriculum Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Lesson Plans List / Empty State */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span>{t.recentPlans}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                {totalPlans}
              </span>
            </h2>
            {totalPlans > 0 && (
              <button
                onClick={() => onNavigate('saved')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
              >
                <span>{t.viewAll}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {totalPlans === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-dashed border-slate-300 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {t.noPlansYet}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                {t.noPlansSubtext}
              </p>
              <div className="mt-5">
                <button
                  onClick={() => onNavigate('create')}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t.createFirstPlan}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {lessonPlans.slice(0, 4).map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 hover:border-emerald-300 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          plan.educationLevel === 'Primary'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {plan.educationLevel || 'CBC'} {plan.classGrade && `• ${plan.classGrade}`}
                      </span>
                      {plan.schoolName && (
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {plan.schoolName}
                        </span>
                      )}
                      {plan.subject && (
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {plan.subject}
                        </span>
                      )}
                      {plan.numberOfLearners && (
                        <span className="text-xs text-slate-500">
                          ({plan.numberOfLearners} {t.learnersCol.toLowerCase()})
                        </span>
                      )}
                    </div>
                    <h4
                      className="text-sm font-bold text-slate-900 hover:text-emerald-600 cursor-pointer"
                      onClick={() => onSelectPlanToEdit(plan)}
                    >
                      {plan.lessonTitle || 'Untitled Lesson'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Unit: {plan.unitTitle || plan.unitTopic || '—'} • {t.tableStagesCount}: {plan.stages.length} • {plan.duration || '—'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => onSelectPlanToPrint(plan)}
                      className="p-2 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors"
                      title={t.printPreviewPdf}
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSelectPlanToEdit(plan)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                    >
                      {t.edit}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1/3): CBC Structure Guide */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{t.cbcStructureTitle}</span>
            </h3>

            <div className="text-xs text-slate-600 space-y-3">
              <div>
                <span className="font-bold text-slate-800 block">{t.cbcStep1}</span>
                <p className="text-slate-500 mt-0.5">{t.cbcStep1Desc}</p>
              </div>
              <div>
                <span className="font-bold text-slate-800 block">{t.cbcStep2}</span>
                <p className="text-slate-500 mt-0.5">{t.cbcStep2Desc}</p>
              </div>
              <div>
                <span className="font-bold text-slate-800 block">{t.cbcStep3}</span>
                <p className="text-slate-500 mt-0.5">{t.cbcStep3Desc}</p>
              </div>
              <div>
                <span className="font-bold text-slate-800 block">{t.cbcStep4}</span>
                <p className="text-slate-500 mt-0.5">{t.cbcStep4Desc}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => onNavigate('create')}
                className="w-full py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t.createFirstPlan}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

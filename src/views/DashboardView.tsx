import React from 'react';
import { 
  PlusCircle, 
  BookOpen, 
  GraduationCap, 
  Printer, 
  ArrowRight, 
  CheckCircle2, 
  FileCheck, 
  Search,
  Settings,
  FolderClock,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Home
} from 'lucide-react';
import { LessonPlan } from '../types/lessonPlan';
import { SaasNavPage } from '../components/Sidebar';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { FEATURE_FLAGS } from '../config/features';

interface DashboardViewProps {
  lessonPlans: LessonPlan[];
  onNavigate: (page: SaasNavPage | 'home') => void;
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

  // Available Education Modules in the Dashboard (Students Identification intentionally excluded to keep it hidden)
  const educationModules = [
    {
      id: 'create' as SaasNavPage,
      title: t.moduleGeneratorTitle || 'Create Lesson Plan',
      badge: 'CBC Standard',
      badgeColor: 'bg-teal-50 text-teal-900 border-teal-200',
      description: t.moduleGeneratorDesc || 'Create official MINEDUC/REB compliant Rwanda CBC lesson plans with 8-column header, competencies, steps, and evaluation.',
      icon: PlusCircle,
      iconColor: 'bg-teal-50 text-teal-700 group-hover:bg-teal-700 group-hover:text-white',
      buttonText: t.navCreate || 'Create Lesson Plan'
    },
    {
      id: 'saved' as SaasNavPage,
      title: t.moduleSavedTitle || 'Saved Lesson Plans & Export',
      badge: `${totalPlans} ${t.totalPlans || 'Plans'}`,
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
      description: t.moduleSavedDesc || 'Search, preview, duplicate, edit, and print or export all your prepared lesson plans as official PDF tables.',
      icon: FolderClock,
      iconColor: 'bg-slate-100 text-slate-800 group-hover:bg-slate-800 group-hover:text-white',
      buttonText: t.browsePlans || 'Browse Saved Plans'
    },
    {
      id: 'settings' as SaasNavPage,
      title: t.moduleSettingsTitle || 'Settings & Preferences',
      badge: (isAdmin && FEATURE_FLAGS.ENABLE_ADMIN_UI) ? 'Cloud & Backup' : 'Preferences',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
      description: (isAdmin && FEATURE_FLAGS.ENABLE_ADMIN_UI)
        ? (t.moduleSettingsDesc || 'Configure Cloud Firestore database synchronization, offline JSON exports/backups, and security rules.')
        : 'Manage your school defaults, academic year, and interface language settings.',
      icon: Settings,
      iconColor: 'bg-slate-100 text-slate-800 group-hover:bg-slate-800 group-hover:text-white',
      buttonText: t.navSettings || 'Configure Settings'
    }
  ];

  if (isAdmin) {
    educationModules.push({
      id: 'admin' as SaasNavPage,
      title: 'Homepage Hero Slider & Admin',
      badge: 'Admin Only',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-200',
      description: 'Add, edit, reorder, and publish homepage slides with photo uploads from your phone or computer.',
      icon: Sparkles,
      iconColor: 'bg-purple-50 text-purple-700 group-hover:bg-purple-700 group-hover:text-white',
      buttonText: 'Manage Hero Slider'
    });
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Navigation Breadcrumb / Quick Links */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">
            {t.navDashboard || 'Application Dashboard'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('create')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-teal-400" />
            <span>New Lesson Plan</span>
          </button>
          <button
            onClick={() => onNavigate('saved')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200 cursor-pointer"
          >
            <FolderClock className="w-3.5 h-3.5" />
            <span>Saved ({totalPlans})</span>
          </button>
        </div>
      </div>

      {/* Deep Navy Welcome Banner with Teal Accents */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-6 sm:p-8 shadow-sm border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-teal-300 text-xs font-semibold border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              <span>Rwanda Competence-Based Curriculum (CBC) Platform</span>
            </div>
            <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
              <GraduationCap className="w-3.5 h-3.5 text-teal-400" />
              <span>Built by a Rwandan Teacher • GS GITUMBA, Rulindo District</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Teacher Application Dashboard
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            ISEZERANO ONLINE is a specialized pedagogical platform designed to help primary and secondary school educators in Rwanda prepare structured, REB-compliant 8-column lesson plans with ease. Access your tools, saved records, and clean, printable A4 exports directly from the dashboard.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('create')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>{t.createFirstPlan || 'Create Lesson Plan'}</span>
            </button>
            <button
              onClick={() => onNavigate('saved')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all border border-slate-700 cursor-pointer"
            >
              <Search className="w-4 h-4 text-teal-400" />
              <span>{t.browsePlans || 'Browse Saved Plans'} ({totalPlans})</span>
            </button>
          </div>
        </div>

        {/* Decorative subtle accent */}
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Authorized Administrator Quick Access Banner */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 text-white p-5 rounded-2xl border border-teal-500/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  Administrator Workspace
                </span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-bold border border-teal-500/30">
                  twizerefelix90@gmail.com
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                Manage Homepage Photos & Administration
              </h3>
              <p className="text-xs text-slate-300">
                Upload, replace, reorder, delete, and publish homepage hero slider photos and configure curriculum settings.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('admin')}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition-all cursor-pointer shrink-0 active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Open Photo Manager →</span>
          </button>
        </div>
      )}

      {/* ================= CENTRALIZED EDUCATION MODULES GRID ================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {t.modulesTitle || 'Application Modules & Tools'}
            </h2>
            <p className="text-xs text-slate-500">
              Select any workspace below to begin preparing or reviewing your instructional documents.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {educationModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-teal-400 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
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

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                    {mod.title}
                  </h3>

                  <p className="mt-1.5 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-700 group-hover:text-teal-900 flex items-center space-x-1">
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
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-teal-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.totalPlans}
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">{totalPlans}</span>
            <span className="text-xs text-slate-500">stored locally</span>
          </div>
        </div>

        {/* Primary Level */}
        <div 
          onClick={() => onNavigate('saved')}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-teal-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.primaryLevel}
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">{primaryPlans}</span>
            <span className="text-xs text-slate-500">P1 – P6</span>
          </div>
        </div>

        {/* Secondary Level */}
        <div 
          onClick={() => onNavigate('saved')}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-teal-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.secondaryLevel}
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">{secondaryPlans}</span>
            <span className="text-xs text-slate-500">S1 – S6</span>
          </div>
        </div>

        {/* Official Curriculum Standard */}
        <div 
          onClick={() => onNavigate('create')}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs hover:border-teal-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-teal-700">
              Curriculum Standard
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-xl font-bold text-slate-900">8-Column CBC</span>
            <span className="text-xs text-slate-500">REB / MINEDUC</span>
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
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center space-x-1 cursor-pointer"
              >
                <span>{t.viewAll}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {totalPlans === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-dashed border-slate-300 text-center">
              <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-700 mx-auto flex items-center justify-center mb-3">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {t.noPlansYet}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                {t.noPlansSubtext}
              </p>
              <div className="mt-5">
                <button
                  onClick={() => onNavigate('create')}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-teal-400" />
                  <span>{t.createFirstPlan}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {lessonPlans.slice(0, 4).map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 hover:border-teal-300 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                        {plan.educationLevel || 'CBC'} {plan.classGrade && `• ${plan.classGrade}`}
                      </span>
                      {plan.schoolName && (
                        <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {plan.schoolName}
                        </span>
                      )}
                      {plan.subject && (
                        <span className="text-xs font-semibold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
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
                      className="text-sm font-bold text-slate-900 hover:text-teal-700 cursor-pointer"
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
                      className="p-2 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-teal-50 border border-slate-200 transition-colors cursor-pointer"
                      title={t.printPreviewPdf}
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSelectPlanToEdit(plan)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
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
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
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
                className="w-full py-2 px-3 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-teal-700" />
                <span>{t.createFirstPlan}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

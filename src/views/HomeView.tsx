import React from 'react';
import { 
  FileText, 
  Award, 
  ArrowRight, 
  BookOpen, 
  GraduationCap, 
  Users, 
  Printer, 
  School,
  Sparkles
} from 'lucide-react';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';

interface HomeViewProps {
  onNavigate: (page: any) => void;
  savedPlansCount?: number;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  onNavigate, 
  savedPlansCount = 0 
}) => {
  const { colors, branding } = useWebsiteDesign();

  const lessonPlanTitle = branding?.lessonPlanCardTitle || 'Lesson Plan';
  const lessonPlanDesc = branding?.lessonPlanCardDescription || '';
  const reportCardTitle = branding?.reportCardTitle || 'Report Card';
  const reportCardDesc = branding?.reportCardDescription || '';
  const customHeadline = branding?.homepageWelcomeHeadline || '';
  const customNote = branding?.homepageCustomNote || '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-12">
      
      {/* Optional Administrator Custom Content Banner (Only shown if written by admin) */}
      {(customHeadline || customNote) && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
          {customHeadline && (
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
              {customHeadline}
            </h2>
          )}
          {customNote && (
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              {customNote}
            </p>
          )}
        </section>
      )}

      {/* Main Two Features: Lesson Plan & Report Card */}
      <section className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          
          {/* FEATURE 1: LESSON PLAN */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-teal-600 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                <FileText className="w-7 h-7 text-teal-700" />
              </div>

              <div>
                <h3 
                  className="font-serif text-2xl sm:text-3xl font-bold tracking-tight"
                  style={{ color: colors.headingPrimary }}
                >
                  {lessonPlanTitle}
                </h3>
                {lessonPlanDesc ? (
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    {lessonPlanDesc}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={() => onNavigate('create')}
                className="w-full py-3.5 px-5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-sm sm:text-base transition-all shadow-sm active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-teal-200" />
                <span>Create Lesson Plan</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('saved')}
                  className="py-2.5 px-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                  <span>Saved Plans ({savedPlansCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="py-2.5 px-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-teal-700" />
                  <span>Dashboard</span>
                </button>
              </div>
            </div>
          </div>

          {/* FEATURE 2: REPORT CARD */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-amber-500 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center font-bold">
                <Award className="w-7 h-7 text-amber-700" />
              </div>

              <div>
                <h3 
                  className="font-serif text-2xl sm:text-3xl font-bold tracking-tight"
                  style={{ color: colors.headingPrimary }}
                >
                  {reportCardTitle}
                </h3>
                {reportCardDesc ? (
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    {reportCardDesc}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={() => onNavigate('nursery')}
                className="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm sm:text-base transition-all shadow-sm active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Award className="w-4 h-4 text-slate-950" />
                <span>Open Report Cards</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('nursery')}
                  className="py-2.5 px-3 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-amber-700" />
                  <span>Students &amp; Marks</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('nursery')}
                  className="py-2.5 px-3 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-700" />
                  <span>Print / Export PDF</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Clean Institutional Footnote */}
      <footer className="text-center pt-4 border-t border-slate-100 text-xs text-slate-500">
        <p className="font-semibold text-slate-700">
          {branding?.platformTitle || 'ISEZERANO ONLINE'} • {branding?.platformSubtitle || 'GS GITUMBA'}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {branding?.schoolLocation || 'Buyoga Sector, Rulindo District, Northern Province, Rwanda'}
        </p>
      </footer>

    </div>
  );
};

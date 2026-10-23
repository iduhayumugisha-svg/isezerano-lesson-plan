import React from 'react';
import { 
  GraduationCap, 
  LayoutDashboard,
  PlusCircle, 
  FileCheck2, 
  Printer, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  BookOpen, 
  Clock, 
  Layers, 
  ShieldCheck, 
  Laptop
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { WebsitePage } from '../components/WebsiteHeader';
import { HeroSlider } from '../components/HeroSlider';

interface HomeViewProps {
  onNavigate: (page: WebsitePage) => void;
  savedPlansCount: number;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, savedPlansCount }) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-16 sm:space-y-20 pb-16">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 sm:pt-10">
        
        {/* Homepage Hero Slider: positioned directly above the heading */}
        <div className="px-4">
          <HeroSlider onNavigate={onNavigate} />
        </div>

        {/* Subtle decorative background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-slate-100/80 via-slate-50/40 to-transparent -z-10 rounded-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 px-4">
          
          {/* Official Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Rwanda Competence-Based Curriculum (CBC) Standard</span>
          </div>

          {/* Main Headline (Deep Navy) */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight sm:leading-tight">
            Prepare Official <span className="text-teal-700">Rwanda CBC</span> Lesson Plans with Confidence
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed font-normal">
            ISEZERANO ONLINE is a specialized pedagogical platform designed to help primary and secondary school educators in Rwanda prepare structured, REB-compliant 8-column lesson plans with ease. Access your tools, saved records, and clean printable A4 exports directly from the dashboard.
          </p>

          {/* About the platform */}
          <div className="max-w-3xl mx-auto bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs text-left sm:text-center space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-800 uppercase tracking-wider">
              <GraduationCap className="w-4 h-4 text-teal-700" />
              <span>About the Platform</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
              Built by a Rwandan teacher serving at <strong className="text-slate-900 font-bold">GS GITUMBA</strong>, located in <strong className="text-slate-900 font-bold">Buyoga Sector, Rulindo District, Northern Province, Rwanda</strong>, this platform supports educators in preparing well-structured lesson plans aligned with Rwanda’s Competence-Based Curriculum (CBC).
            </p>
          </div>

          {/* Call-to-Actions (Prominent "Go to Dashboard" button) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-8 py-3.5 rounded-xl text-base font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 shadow-sm transition-all active:scale-98 cursor-pointer ring-4 ring-teal-500/20"
            >
              <LayoutDashboard className="w-5 h-5 text-teal-400" />
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4 text-teal-300" />
            </button>

            <button
              onClick={() => onNavigate('create')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl text-base font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-300 shadow-2xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-teal-700" />
              <span>Create Lesson Plan</span>
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              <span>Official 8-Column Format</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              <span>Clean A4 Selectable PDF Export</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              <span>Zero-Barrier Teacher Access</span>
            </div>
          </div>
        </div>

        {/* 2. OVERVIEW HIGHLIGHT CARD */}
        <div className="max-w-4xl mx-auto mt-12 px-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-slate-900" />
                <span className="w-3 h-3 rounded-full bg-teal-600" />
                <span className="text-xs font-bold text-slate-900 pl-1 uppercase tracking-wider">
                  Platform Workspace Overview
                </span>
              </div>
              <button
                onClick={() => onNavigate('dashboard')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center space-x-1"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div 
                onClick={() => onNavigate('create')}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-teal-300 transition-all cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-teal-800">
                    1. Create Lesson Plan
                  </span>
                  <PlusCircle className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Design official 8-column CBC lesson plans with competencies, steps, timing, and evaluations.
                </p>
              </div>

              <div 
                onClick={() => onNavigate('saved')}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-teal-300 transition-all cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-teal-800">
                    2. Saved Plans ({savedPlansCount})
                  </span>
                  <FileCheck2 className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Reopen, edit, duplicate, and print clean selectable-text PDFs formatted for school inspections.
                </p>
              </div>

              <div 
                onClick={() => onNavigate('settings')}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-teal-300 transition-all cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-teal-800">
                    3. School Preferences
                  </span>
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Save your default school name, academic year, and language for faster weekly preparation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE BENEFITS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700">
            Why Rwandan Educators Trust ISEZERANO ONLINE
          </h2>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Designed for Real Rwandan Classroom Realities
          </p>
          <p className="text-sm text-slate-600">
            Standardized, inspector-ready lesson preparation without repetitive manual table formatting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
                <FileCheck2 className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Official 8-Column CBC Standard
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Follows the national format mandated by the Rwanda Basic Education Board (REB) with Timing, Teacher Activities, Learner Activities, Competences, and Assessment.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 text-xs font-bold text-teal-800">
              <span>MINEDUC Aligned</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Bloom's Taxonomy Objectives
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Structured fields for Knowledge & Understanding, Skills, and Attitudes & Values, keeping lesson aims clear, measurable, and learner-centered.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 text-xs font-bold text-teal-800">
              <span>Pedagogical Rigor</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
                <Printer className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Clean Printable A4 PDF Export
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generates crisp, selectable-text PDFs formatted specifically for standard A4 paper in Portrait or Landscape, with zero awkward text clipping or URL watermarks.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 text-xs font-bold text-teal-800">
              <span>Inspection Ready</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                <Laptop className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Offline Auto-Save & Privacy
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Plans are securely saved directly in your device's browser memory. Draft plans in your staffroom even when the internet is intermittent.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 text-xs font-bold text-teal-800">
              <span>Local Storage Security</span>
            </div>
          </div>

        </div>
      </section>

      {/* 4. CALL TO ACTION BANNER (Deep Navy & Teal) */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="bg-slate-900 rounded-2xl p-8 sm:p-12 text-white text-center space-y-6 border border-slate-800 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-teal-400">
            <GraduationCap className="w-7 h-7" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Ready to Begin Preparing Your Lessons?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Open the centralized dashboard to create new CBC lesson plans, manage saved records, and export documents.
          </p>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl text-base font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 shadow-sm transition-all active:scale-98 cursor-pointer"
            >
              <LayoutDashboard className="w-5 h-5 text-slate-950" />
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

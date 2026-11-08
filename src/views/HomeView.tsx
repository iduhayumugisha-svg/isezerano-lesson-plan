import React, { useMemo } from 'react';
import { 
  Calendar, 
  MapPin, 
  School, 
  BookOpen, 
  GraduationCap, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  Award, 
  Users,
  Printer,
  Compass,
  Check
} from 'lucide-react';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { DEFAULT_HOMEPAGE_SECTIONS } from '../types/websiteDesign';

interface HomeViewProps {
  onNavigate: (page: any) => void;
  savedPlansCount?: number;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  onNavigate, 
  savedPlansCount = 0
}) => {
  const { colors, branding, homepageSections } = useWebsiteDesign();

  // Current formatted date in Kigali / Rwanda context
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const sortedSections = useMemo(() => {
    const list = [...(homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
    return list.sort((a, b) => a.order - b.order);
  }, [homepageSections]);

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      {sortedSections.map((sec) => {
        if (!sec.enabled) return null;

        // 1. OFFICIAL INSTITUTIONAL MASTHEAD BANNER
        if (sec.id === 'masthead') {
          const showTicker = sec.options?.showDateLocationTicker !== false;
          const showBadge = sec.options?.showInstitutionalBadge !== false;

          return (
            <section key={sec.id} className="border-b border-slate-200/80 bg-white shadow-2xs">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
                
                {/* Top Ticker: Date, Location, and Official Edition */}
                {showTicker && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-medium text-slate-500 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      <span className="font-semibold text-slate-800">{todayFormatted}</span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center space-x-1 text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>Buyoga Sector, Rulindo District, Northern Province, Rwanda</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200">
                        Official School Platform
                      </span>
                      <span className="text-slate-500 font-semibold">GS GITUMBA Community Platform</span>
                    </div>
                  </div>
                )}

                {/* School Branding Headline */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-2">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                      <span className="text-xs font-bold tracking-widest uppercase text-teal-800">
                        Urubuga rw'Uburezi • Imfashanyigisho za CBC n'Indangamanota
                      </span>
                    </div>
                    <h1 
                      className="font-serif tracking-tight font-extrabold text-slate-950 text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
                      style={{ color: colors.headingPrimary }}
                    >
                      {branding?.platformTitle || 'ISEZERANO ONLINE'}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-serif italic">
                      {branding?.platformSubtitle || 'GS GITUMBA'} — Imfashanyigisho za CBC n'Indangamanota z'Inshuke mu Rwanda
                    </p>
                  </div>

                  {/* Quick Action Badges */}
                  {showBadge && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold inline-flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-teal-600" />
                        <span>Uburezi ku Buntu (100% Free)</span>
                      </span>
                    </div>
                  )}
                </div>

              </div>
            </section>
          );
        }

        // 2. HERO BANNER: OFFICIAL WELCOME & DIRECT ACTION CALLOUTS
        if (sec.id === 'hero') {
          const showLessonPlanBtn = sec.options?.showLessonPlanButton !== false;
          const showReportCardsBtn = sec.options?.showReportCardsButton !== false;
          const showDashboardBtn = sec.options?.showDashboardButton !== false;
          const showGuarantees = sec.options?.showGuaranteeBadges !== false;

          return (
            <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-teal-950 text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-xl border border-teal-900/40 relative overflow-hidden">
                
                {/* Subtle Ambient Decorative Circles */}
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-3xl space-y-4 sm:space-y-6">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
                    <School className="w-3.5 h-3.5" />
                    <span>GS GITUMBA • Umurenge wa Buyoga, Akarere ka Rulindo</span>
                  </div>

                  <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                    Urubuga rw'Abarimu: Gutegura Amasomo (CBC) n'Indangamanota z'Abanyeshuri ku Buntu
                  </h2>

                  <p className="text-xs sm:text-base text-slate-300 leading-relaxed max-w-2xl font-sans">
                    Ikaze kuri ISEZERANO ONLINE. Umwarimu cyangwa undi wese akoresha ibice byose bya <strong>Lesson Preparation</strong> na <strong>Report Cards</strong> ku buntu nta kiguzi, nta konti cyangwa ijambobanga (password) asabwe.
                  </p>

                  {/* Quick Hero CTA Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    {showLessonPlanBtn && (
                      <button
                        type="button"
                        onClick={() => onNavigate('create')}
                        className="px-5 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg transition-all transform active:scale-95 inline-flex items-center space-x-2 cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Tangira Gutegura Isomo (Lesson Plan)</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    )}

                    {showReportCardsBtn && (
                      <button
                        type="button"
                        onClick={() => onNavigate('nursery')}
                        className="px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold shadow-lg transition-all transform active:scale-95 inline-flex items-center space-x-2 cursor-pointer"
                      >
                        <Award className="w-4 h-4 text-slate-950" />
                        <span>Indangamanota z'Inshuke (Report Cards)</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    )}

                    {showDashboardBtn && (
                      <button
                        type="button"
                        onClick={() => onNavigate('dashboard')}
                        className="px-4 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/20 transition-all inline-flex items-center space-x-2 cursor-pointer backdrop-blur-xs"
                      >
                        <GraduationCap className="w-4 h-4 text-teal-300" />
                        <span>Dashboard y'Uburezi</span>
                        {savedPlansCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] bg-teal-400 text-slate-950 font-extrabold ml-1">
                            {savedPlansCount}
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Guarantee points */}
                  {showGuarantees && (
                    <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-teal-200">
                      <span className="flex items-center space-x-1.5">
                        <Check className="w-4 h-4 text-teal-400" />
                        <span>Nta konti cyangwa password bikenewe</span>
                      </span>
                      <span className="flex items-center space-x-1.5">
                        <Check className="w-4 h-4 text-teal-400" />
                        <span>Byubahirije amabwiriza ya REB & MINEDUC</span>
                      </span>
                      <span className="flex items-center space-x-1.5">
                        <Check className="w-4 h-4 text-teal-400" />
                        <span>Bikora neza kuri Telefoni no kuri Mudasobwa</span>
                      </span>
                    </div>
                  )}

                </div>
              </div>
            </section>
          );
        }

        // 3. PROMINENT HOMEPAGE SECTIONS: LESSON PREPARATION & REPORT CARDS
        if (sec.id === 'quick_tools') {
          const showLessonCard = sec.options?.showLessonPlannerCard !== false;
          const showReportsCard = sec.options?.showReportCardsCard !== false;

          return (
            <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              
              <div className="text-center max-w-3xl mx-auto space-y-2">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Ibikoresho by'Ingenzi ku Barezi (Primary Teacher Tools)</span>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-950">
                  Hitamo Igice Ushaka Gukoresha Ako Kanya
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Kanda kuri kimwe muri ibi bice bibiri kugira ngo utangire gutegura amasomo yawe cyangwa gutegura indangamanota z'abanyeshuri b'inshuke.
                </p>
              </div>

              {/* DUAL PROMINENT CARDS GRID */}
              <div className={`grid grid-cols-1 ${showLessonCard && showReportsCard ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto'} gap-6 sm:gap-8`}>
                
                {/* CARD 1: LESSON PREPARATION (CBC LESSON PLANNER) */}
                {showLessonCard && (
                  <div className="bg-white rounded-3xl border-2 border-teal-500/30 p-6 sm:p-8 shadow-md hover:shadow-xl hover:border-teal-600 transition-all flex flex-col justify-between space-y-6 group">
                    <div className="space-y-4">
                      {/* Header Badge & Icon */}
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold shadow-xs group-hover:bg-teal-700 group-hover:text-white transition-colors">
                          <FileText className="w-7 h-7 text-teal-700 group-hover:text-white" />
                        </div>
                        <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 font-extrabold text-xs border border-teal-200">
                          REB CBC 8-Columns
                        </span>
                      </div>

                      {/* Title & Tagline */}
                      <div>
                        <h4 className="font-serif text-xl sm:text-2xl font-bold text-slate-950 group-hover:text-teal-900 transition-colors">
                          Lesson Preparation (Gutegura Isomo)
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                          Tegura imfashanyigisho z'amasomo (Lesson Plans) zubahirije integanyanyigisho y'u Rwanda ya CBC (Competence-Based Curriculum). Ikora ku buryo bw'inkingi 8 zemewe na REB n'abagenzuzi b'uburezi.
                        </p>
                      </div>

                      {/* Key Features List */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                        <div className="flex items-start space-x-2 text-xs text-slate-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          <span>Inkingi 8 zemewe za REB (Timing, Steps, Teacher & Learner Activities)</span>
                        </div>
                        <div className="flex items-start space-x-2 text-xs text-slate-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          <span>Kubika no gukoporora amasomo wateguye (Saved Schemes)</span>
                        </div>
                        <div className="flex items-start space-x-2 text-xs text-slate-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          <span>Gucapa no gukuramo inyandiko muri PDF ku buryo bworoshye</span>
                        </div>
                        <div className="flex items-start space-x-2 text-xs text-slate-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          <span>Kwinjira nta konti cyangwa password bisabwe</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons for Lesson Preparation */}
                    <div className="pt-4 border-t border-slate-100 space-y-2.5">
                      <button
                        type="button"
                        onClick={() => onNavigate('create')}
                        className="w-full py-3.5 px-5 rounded-2xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-teal-200" />
                        <span>Kora Isomo Rishya (Create Lesson Plan)</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigate('saved')}
                          className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                          <span>Amasomo Yabitswe ({savedPlansCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigate('dashboard')}
                          className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-teal-700" />
                          <span>Dashboard y'Amasomo</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CARD 2: NURSERY REPORT CARDS MANAGEMENT SYSTEM */}
                {showReportsCard && (
                  <div className="bg-white rounded-3xl border-2 border-amber-400/50 p-6 sm:p-8 shadow-md hover:shadow-xl hover:border-amber-500 transition-all flex flex-col justify-between space-y-6 group">
                    <div className="space-y-4">
                      {/* Header Badge & Icon */}
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shadow-xs group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                          <Award className="w-7 h-7 text-amber-700 group-hover:text-slate-950" />
                        </div>
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 font-extrabold text-xs border border-amber-200">
                          Class_Reports_N1_Term_1 CBC
                        </span>
                      </div>

                      {/* Title & Tagline */}
                      <div>
                        <h4 className="font-serif text-xl sm:text-2xl font-bold text-slate-950 group-hover:text-amber-900 transition-colors">
                          Report Cards (Indangamanota z'Inshuke)
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                          Sisitemu y'indangamanota z'abanyeshuri b'inshuke (Nursery N1, N2, N3) yubakiye ku ifishi nyayo ya <strong>Class_Reports_N1_Term_1.pdf</strong>. Ibipimo 22 by'isuzuma n'inkingi 3 z'ibihembwe byose bikora nta makuru y'amahimbano.
                        </p>
                      </div>

                      {/* Key Features List */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                        <div className="flex items-start space-x-2 text-xs text-slate-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>Ibipimo 22 by'isuzuma (Social, Motor, Numeracy, Literacy, Science)</span>
                        </div>
                        <div className="flex items-start space-x-2 text-xs text-slate-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>Amanota n'amanota y'ibihembwe 3 (Term 1, Term 2, Term 3)</span>
                        </div>
                        <div className="flex items-start space-x-2 text-xs text-slate-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>Gukuramo PDF y'umunyeshuri cyangwa A4 PDF ihuriweho n'ishuri ryose</span>
                        </div>
                        <div className="flex items-start space-x-2 text-xs text-slate-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>Nta makuru y'amahimbano (No sample or fake data)</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons for Nursery Report Cards */}
                    <div className="pt-4 border-t border-slate-100 space-y-2.5">
                      <button
                        type="button"
                        onClick={() => onNavigate('nursery')}
                        className="w-full py-3.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-md active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <Award className="w-4 h-4 text-slate-950" />
                        <span>Injira mu Ndangamanota z'Inshuke (Open Report Cards)</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigate('nursery')}
                          className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Users className="w-3.5 h-3.5 text-amber-700" />
                          <span>Ongeramo Abanyeshuri</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigate('nursery')}
                          className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-700" />
                          <span>Capa Indangamanota (PDF)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </section>
          );
        }

        // 4. INSTITUTIONAL & COMMUNITY CREDENTIALS
        if (sec.id === 'school_profile' || sec.type === 'school_profile') {
          const showAboutBtn = sec.options?.showAboutButton !== false;
          const showContactBtn = sec.options?.showContactButton !== false;
          const headline = sec.content?.headline || 'Groupe Scolaire GITUMBA – Umurenge wa Buyoga';
          const badgeText = sec.content?.badgeText || "Amakuru y'Ikigo cy'Amashuri (School Profile)";
          const bodyText = sec.content?.bodyText || "Urubuga rwa ISEZERANO ONLINE rwateguwe n'umwarimu wigisha muri GS GITUMBA (Akarere ka Rulindo, Intara y'Amajyaruguru) hagamijwe korohereza abarezi bose b'u Rwanda kubona ibikoresho by'uburezi byujuje ubuziranenge bwa REB na MINEDUC ku buntu.";

          return (
            <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                  
                  <div className="lg:col-span-2 space-y-3">
                    <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
                      <School className="w-4 h-4" />
                      <span>{badgeText}</span>
                    </div>
                    <h4 className="font-serif text-xl sm:text-2xl font-bold text-white">
                      {headline}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {bodyText}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
                      <span>📍 {branding?.schoolLocation || 'Buyoga, Rulindo, Amajyaruguru'}</span>
                      <span>✉️ twizerefelix90@gmail.com</span>
                      <span>🇷🇼 REB Competence-Based Curriculum</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
                    {showAboutBtn && (
                      <button
                        type="button"
                        onClick={() => onNavigate(sec.content?.secondaryButtonLink || 'about')}
                        className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 text-center cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <Compass className="w-4 h-4 text-teal-400" />
                        <span>{sec.content?.secondaryButtonText || 'Ibyerekeye GS GITUMBA (About Us)'}</span>
                      </button>
                    )}

                    {showContactBtn && (
                      <button
                        type="button"
                        onClick={() => onNavigate(sec.content?.primaryButtonLink || 'contact')}
                        className="py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <MapPin className="w-4 h-4 text-white" />
                        <span>{sec.content?.primaryButtonText || 'Twandikire cyangwa Duhamagare'}</span>
                      </button>
                    )}
                  </div>

                </div>
              </div>
            </section>
          );
        }

        // 5. CUSTOM SECTION TYPE: CALLOUT / BANNER
        if (sec.type === 'callout' || sec.type === 'announcement_banner') {
          const bgClass = sec.content?.bgStyle === 'slate_dark'
            ? 'bg-slate-900 text-white border-slate-800'
            : sec.content?.bgStyle === 'amber_soft'
            ? 'bg-amber-50 text-slate-900 border-amber-200'
            : sec.content?.bgStyle === 'blue_soft'
            ? 'bg-sky-50 text-slate-900 border-sky-200'
            : 'bg-teal-800 text-white border-teal-700';

          return (
            <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm ${bgClass}`}>
                <div className="max-w-3xl space-y-3">
                  {sec.content?.badgeText && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/20">
                      {sec.content.badgeText}
                    </span>
                  )}
                  {sec.content?.headline && (
                    <h3 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {sec.content.headline}
                    </h3>
                  )}
                  {sec.content?.bodyText && (
                    <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                      {sec.content.bodyText}
                    </p>
                  )}
                  {sec.content?.primaryButtonText && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => onNavigate(sec.content?.primaryButtonLink || 'home')}
                        className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs sm:text-sm shadow-md hover:bg-slate-100 transition-all cursor-pointer inline-flex items-center space-x-2"
                      >
                        <span>{sec.content.primaryButtonText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        }

        // 6. CUSTOM SECTION TYPE: RICH TEXT / EDITORIAL ARTICLE
        if (sec.type === 'rich_text') {
          return (
            <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-4">
                {sec.content?.badgeText && (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                    {sec.content.badgeText}
                  </span>
                )}
                {sec.content?.headline && (
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                    {sec.content.headline}
                  </h3>
                )}
                {sec.content?.subheadline && (
                  <p className="text-sm font-semibold text-slate-600">
                    {sec.content.subheadline}
                  </p>
                )}
                {sec.content?.bodyText && (
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 whitespace-pre-line">
                    {sec.content.bodyText}
                  </div>
                )}
              </div>
            </section>
          );
        }

        // 7. CUSTOM SECTION TYPE: CUSTOM CARDS GRID
        if (sec.type === 'custom_cards' && sec.content?.cards && sec.content.cards.length > 0) {
          return (
            <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              {(sec.content.headline || sec.content.badgeText) && (
                <div className="text-center max-w-3xl mx-auto space-y-2">
                  {sec.content.badgeText && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      {sec.content.badgeText}
                    </span>
                  )}
                  {sec.content.headline && (
                    <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-950">
                      {sec.content.headline}
                    </h3>
                  )}
                  {sec.content.bodyText && (
                    <p className="text-xs sm:text-sm text-slate-600">{sec.content.bodyText}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sec.content.cards.map((card) => (
                  <div key={card.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      {card.badge && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                          {card.badge}
                        </span>
                      )}
                      <h4 className="font-serif text-lg font-bold text-slate-900">{card.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{card.description}</p>
                      {card.items && card.items.length > 0 && (
                        <ul className="pt-2 space-y-1.5 text-xs text-slate-700">
                          {card.items.map((it, idx) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {card.buttonText && (
                      <div className="pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onNavigate(card.buttonLink || 'home')}
                          className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs transition-colors cursor-pointer text-center"
                        >
                          {card.buttonText}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // 8. CUSTOM SECTION TYPE: FAQ
        if (sec.type === 'faq' && sec.content?.cards && sec.content.cards.length > 0) {
          return (
            <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="text-center max-w-3xl mx-auto space-y-2">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  {sec.content.badgeText || 'Ibibazo Bikunze Kubazwa (FAQ)'}
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-950">
                  {sec.content.headline || 'Ibisubizo ku Bibazo by’Abarimu'}
                </h3>
              </div>

              <div className="max-w-3xl mx-auto space-y-3">
                {sec.content.cards.map((faq) => (
                  <div key={faq.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-xs flex items-center justify-center font-bold shrink-0">?</span>
                      <span>{faq.title}</span>
                    </h4>
                    <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                      {faq.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
};

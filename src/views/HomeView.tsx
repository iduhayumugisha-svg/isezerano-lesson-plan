import React from 'react';
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

interface HomeViewProps {
  onNavigate: (page: any) => void;
  savedPlansCount?: number;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  onNavigate, 
  savedPlansCount = 0
}) => {
  const { colors, branding } = useWebsiteDesign();

  // Current formatted date in Kigali / Rwanda context
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      
      {/* 1. DIGITAL NEWSPAPER MASTHEAD BANNER */}
      <section className="border-b border-slate-200/80 bg-white shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
          
          {/* Top Ticker: Date, Location, and Official Edition */}
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
                Official Digital Press
              </span>
              <span className="text-slate-500 font-semibold">GS GITUMBA Community Platform</span>
            </div>
          </div>

          {/* Newspaper Name & School Branding Headline */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-2">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                <span className="text-xs font-bold tracking-widest uppercase text-teal-800">
                  Daily Digital Edition • Uburezi & Amakuru
                </span>
              </div>
              <h1 
                className="font-serif tracking-tight font-extrabold text-slate-950 text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
                style={{ color: colors.headingPrimary }}
              >
                {branding?.platformTitle || 'ISEZERANO ONLINE'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-serif italic">
                {branding?.platformSubtitle || 'GS GITUMBA'} — Imfashanyigisho za CBC, Indangamanota z'Inshuke, n'Amakuru y'Uburezi mu Rwanda
              </p>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold inline-flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Uburezi ku Buntu (100% Free)</span>
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* 2. HERO BANNER: OFFICIAL WELCOME & DIRECT ACTION CALLOUTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <button
                type="button"
                onClick={() => onNavigate('create')}
                className="px-5 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg transition-all transform active:scale-95 inline-flex items-center space-x-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Tangira Gutegura Isomo (Lesson Plan)</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('nursery')}
                className="px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold shadow-lg transition-all transform active:scale-95 inline-flex items-center space-x-2 cursor-pointer"
              >
                <Award className="w-4 h-4 text-slate-950" />
                <span>Indangamanota z'Inshuke (Report Cards)</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

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
            </div>

            {/* Guarantee points */}
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

          </div>
        </div>
      </section>

      {/* 3. PROMINENT HOMEPAGE SECTIONS: LESSON PREPARATION & REPORT CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          
          {/* CARD 1: LESSON PREPARATION (CBC LESSON PLANNER) */}
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

          {/* CARD 2: NURSERY REPORT CARDS MANAGEMENT SYSTEM */}
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

        </div>

      </section>

      {/* 4. INSTITUTIONAL & COMMUNITY CREDENTIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            
            <div className="lg:col-span-2 space-y-3">
              <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
                <School className="w-4 h-4" />
                <span>Amakuru y'Ikigo cy'Amashuri (School Profile)</span>
              </div>
              <h4 className="font-serif text-xl sm:text-2xl font-bold text-white">
                Groupe Scolaire GITUMBA – Umurenge wa Buyoga
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Urubuga rwa ISEZERANO ONLINE rwateguwe n'umwarimu wigisha muri GS GITUMBA (Akarere ka Rulindo, Intara y'Amajyaruguru) hagamijwe korohereza abarezi bose b'u Rwanda kubona ibikoresho by'uburezi byujuje ubuziranenge bwa REB na MINEDUC ku buntu.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
                <span>📍 Buyoga, Rulindo, Amajyaruguru</span>
                <span>✉️ twizerefelix90@gmail.com</span>
                <span>🇷🇼 REB Competence-Based Curriculum</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
              <button
                type="button"
                onClick={() => onNavigate('about')}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 text-center cursor-pointer flex items-center justify-center space-x-2"
              >
                <Compass className="w-4 h-4 text-teal-400" />
                <span>Ibyerekeye GS GITUMBA (About Us)</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center space-x-2"
              >
                <MapPin className="w-4 h-4 text-white" />
                <span>Twandikire cyangwa Duhamagare</span>
              </button>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};

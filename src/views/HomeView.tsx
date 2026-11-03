import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  School, 
  BookOpen, 
  GraduationCap, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  FileText, 
  ShieldCheck, 
  Compass, 
  Award, 
  Search,
  ExternalLink,
  Users
} from 'lucide-react';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { NewsCategory, DEFAULT_NEWS_CATEGORIES } from '../types/category';
import { subscribeToNewsCategories } from '../services/categoryService';

interface HomeViewProps {
  onNavigate: (page: any) => void;
  savedPlansCount?: number;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  onNavigate, 
  savedPlansCount = 0,
  selectedCategory: propCategory,
  onSelectCategory: propOnSelectCategory
}) => {
  const { colors, branding } = useWebsiteDesign();
  const [localCategory, setLocalCategory] = useState<string>('All Categories');
  const [categories, setCategories] = useState<NewsCategory[]>(DEFAULT_NEWS_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeCategory = propCategory ?? localCategory;

  const handleCategoryChange = (cat: string) => {
    if (propOnSelectCategory) {
      propOnSelectCategory(cat);
    } else {
      setLocalCategory(cat);
    }
  };

  useEffect(() => {
    // Real-time Firestore subscription for categories
    const unsubscribeCats = subscribeToNewsCategories((cats) => {
      setCategories(cats);
    });

    return () => {
      unsubscribeCats();
    };
  }, []);

  // Current formatted date in Kigali / Rwanda context
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const enabledCategories = categories.filter((c) => c.enabled !== false);

  const filteredCategories = enabledCategories.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || 
           (c.nameEn && c.nameEn.toLowerCase().includes(q)) ||
           (c.description && c.description.toLowerCase().includes(q));
  });

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
                <span>Buyoga Sector, Rulindo District, Rwanda</span>
              </span>
            </div>

            <div className="flex items-center space-x-3 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200">
                Official Digital Press
              </span>
              <span className="text-slate-400">GS GITUMBA Community Platform</span>
            </div>
          </div>

          {/* Newspaper Name & Branding Headline */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-2">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                <span className="text-xs font-bold tracking-widest uppercase text-teal-800">
                  Daily Digital Edition
                </span>
              </div>
              <h1 
                className="font-serif tracking-tight font-extrabold text-slate-950 text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
                style={{ color: colors.headingPrimary }}
              >
                {branding?.platformTitle || 'ISEZERANO ONLINE'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-serif italic">
                {branding?.platformSubtitle || 'GS GITUMBA'} — Pedagogical Innovations, Educational Guidance, and Rwanda Community Press
              </p>
            </div>

            {/* Quick Topic Search */}
            <div className="w-full md:w-80 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search educational topics, CBC schemes..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-medium text-slate-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Category Navigation Bar */}
          <div className="pt-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleCategoryChange('All Categories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === 'All Categories' || activeCategory === 'Byose' || activeCategory === 'Byose (All Stories)'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/90 hover:text-slate-900'
              }`}
            >
              Byose (All Topics)
            </button>
            {enabledCategories.map((cat) => {
              const isSelected = 
                activeCategory.toLowerCase() === cat.name.toLowerCase() ||
                activeCategory.toLowerCase() === cat.slug.toLowerCase() ||
                (cat.nameEn && activeCategory.toLowerCase() === cat.nameEn.toLowerCase());
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-700 text-white shadow-xs font-bold'
                      : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/90 hover:text-slate-900'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* 2. INSTITUTIONAL WELCOME & PEDAGOGICAL MISSION HERO BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-teal-950 text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-xl border border-teal-900/40 relative overflow-hidden">
          
          {/* Subtle Ambient Decorative Circles */}
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4 sm:space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
              <School className="w-3.5 h-3.5" />
              <span>GS GITUMBA • Buyoga Sector, Rulindo District</span>
            </div>

            <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Leading Pedagogical Innovation & Teacher Empowerment in Rwanda
            </h2>

            <p className="text-xs sm:text-base text-slate-300 leading-relaxed max-w-2xl font-sans">
              Welcome to ISEZERANO ONLINE, the official digital press and pedagogical workspace of Groupe Scolaire GITUMBA. We equip Rwandan primary and secondary school teachers with automated Competence-Based Curriculum (CBC) lesson planning, instructional schemes, inspection readiness, and school community news.
            </p>

            {/* Call-to-action Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('create')}
                className="px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg transition-all transform active:scale-95 inline-flex items-center space-x-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Launch CBC Lesson Planner</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/20 transition-all inline-flex items-center space-x-2 cursor-pointer backdrop-blur-xs"
              >
                <GraduationCap className="w-4 h-4 text-teal-300" />
                <span>Teacher Workspace & Saved Plans</span>
                {savedPlansCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-teal-400 text-slate-950 font-extrabold ml-1">
                    {savedPlansCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('about')}
                className="px-4 py-3 rounded-xl text-xs sm:text-sm text-slate-300 hover:text-white transition-colors cursor-pointer inline-flex items-center space-x-1.5"
              >
                <Compass className="w-4 h-4" />
                <span>About Our School</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              <div>
                <p className="text-xl sm:text-2xl font-bold font-serif text-teal-300">8 Columns</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">REB CBC Format</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold font-serif text-teal-300">A4 Printable</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Official Export</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold font-serif text-teal-300">Rulindo</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Buyoga Sector Hub</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold font-serif text-teal-300">MINEDUC</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Standard Aligned</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. CORE EDUCATIONAL PILLARS AT GS GITUMBA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
          <div className="flex items-center space-x-2.5">
            <BookOpen className="w-5 h-5 text-teal-700" />
            <h3 className="font-serif text-xl sm:text-2xl font-extrabold text-slate-950">
              Institutional Programs & Pedagogical Standards
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Rwanda Vision 2050 Education Standards
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pillar 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-base font-bold text-slate-950 leading-snug">
                Competence-Based Curriculum (CBC)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Full compliance with Rwanda Basic Education Board (REB) guidelines. Generates structured 8-column daily lesson plans incorporating generic competences and cross-cutting issues.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('create')}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center space-x-1 pt-2 cursor-pointer"
            >
              <span>Prepare Lesson Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-base font-bold text-slate-950 leading-snug">
                STEM & Practical Sciences
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hands-on inquiry-based learning at GS GITUMBA leveraging national laboratory kits, biology microscopy, and locally sourced scientific materials for classroom experiments.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center space-x-1 pt-2 cursor-pointer"
            >
              <span>Learn About STEM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-base font-bold text-slate-950 leading-snug">
                Learner-Centered Methodology
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Differentiated learning tasks that actively distinguish Teacher's Activities from Learner's Activities, nurturing Critical Thinking, Creativity, Communication, and Cooperation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('students')}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center space-x-1 pt-2 cursor-pointer"
            >
              <span>Manage Class Rosters</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-base font-bold text-slate-950 leading-snug">
                School Inspection Readiness
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Standardized pedagogical templates designed for administrative validation, sector school inspectors, and peer-to-peer teacher observation archives across all academic terms.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center space-x-1 pt-2 cursor-pointer"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* 4. MAIN TWO-COLUMN SECTION: TOPIC EXPLORER & CAMPUS DESK */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: TOPICS & CURRICULUM CATEGORIES (8 COLS) */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-teal-700" />
                <h3 className="font-serif text-xl font-bold text-slate-950">
                  Educational & News Topic Explorer
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {filteredCategories.length} {filteredCategories.length === 1 ? 'topic' : 'topics'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Browse academic disciplines and school community themes established at GS GITUMBA. Each topic represents a core pillar of our pedagogical roadmap and school journalism.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCategories.map((cat) => {
                const isSelected = activeCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.name)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                          {cat.name}
                        </span>
                        {cat.nameEn && cat.nameEn !== cat.name && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {cat.nameEn}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                        {cat.description || 'Pedagogical focus and educational milestones from GS GITUMBA.'}
                      </p>
                    </div>

                    <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-mono text-[10px]">
                        #{cat.slug}
                      </span>
                      <span className="text-teal-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center space-x-1">
                        <span>Select Topic</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* RIGHT COLUMN: CAMPUS & COMMUNITY DESK (4 COLS) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* GS GITUMBA Community & Campus Desk */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-teal-950 text-white rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center space-x-2 text-teal-400">
                <School className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">GS GITUMBA Community Desk</span>
              </div>
              
              <h4 className="font-serif text-lg font-bold text-white leading-snug">
                Authentic Rwandan Pedagogical Journalism
              </h4>
              
              <p className="text-xs text-slate-300 leading-relaxed">
                ISEZERANO ONLINE is published at Groupe Scolaire GITUMBA (Buyoga Sector, Rulindo District). Our goal is to connect teachers, learners, and community members with credible pedagogical insights and national curriculum guidance.
              </p>

              <div className="pt-2 text-xs text-slate-400 space-y-1.5 border-t border-slate-800">
                <p>📍 Location: Buyoga Sector, Rulindo District, Northern Province, Rwanda</p>
                <p>✉️ Inquiries: twizerefelix90@gmail.com</p>
                <p>🇷🇼 Standard: Rwanda Basic Education Board (REB)</p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all text-center cursor-pointer shadow-sm"
                >
                  Contact School Administration
                </button>
              </div>
            </div>

            {/* Quick Workspace Navigation Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h4 className="font-serif text-sm font-bold text-slate-950 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center space-x-2">
                <GraduationCap className="w-4 h-4 text-teal-700" />
                <span>Teacher Quick Tools</span>
              </h4>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onNavigate('create')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer border border-slate-100"
                >
                  <span className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-teal-700" />
                    <span>Create Lesson Plan</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('saved')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer border border-slate-100"
                >
                  <span className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-teal-700" />
                    <span>Saved CBC Schemes</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-50 text-teal-800 font-bold">
                    {savedPlansCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('students')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer border border-slate-100"
                >
                  <span className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-teal-700" />
                    <span>Students Identification</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer border border-slate-100"
                >
                  <span className="flex items-center space-x-2">
                    <Compass className="w-4 h-4 text-teal-700" />
                    <span>About GS GITUMBA</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
};

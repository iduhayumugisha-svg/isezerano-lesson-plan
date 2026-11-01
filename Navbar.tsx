import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  PlusCircle, 
  FolderClock, 
  Settings, 
  LayoutDashboard,
  GraduationCap,
  Globe,
  MoreVertical,
  Check,
  ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';

export type NavPage = 'dashboard' | 'create' | 'saved' | 'students' | 'settings';

interface NavbarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  savedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, savedCount }) => {
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleNavClick = (page: NavPage) => {
    onNavigate(page);
    setIsMenuOpen(false);
  };

  const menuItems = [
    {
      id: 'create' as NavPage,
      label: t.navCreate || 'Create Lesson Plan',
      badgeText: 'Home',
      desc: t.moduleGeneratorDesc ? t.moduleGeneratorDesc.substring(0, 48) + '...' : 'Main generator',
      icon: PlusCircle,
      highlight: true
    },
    {
      id: 'saved' as NavPage,
      label: t.navSaved || 'Saved Lesson Plans',
      badgeText: savedCount > 0 ? String(savedCount) : undefined,
      desc: 'Browse, print & export PDF',
      icon: FolderClock,
      highlight: false
    },
    {
      id: 'settings' as NavPage,
      label: t.navSettings || 'Settings',
      badgeText: undefined,
      desc: 'Preferences & backup',
      icon: Settings,
      highlight: false
    }
  ];

  return (
    <header className="no-print bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Application Brand (Navigates to Home / Lesson Plan Generator) */}
          <div className="flex items-center space-x-3">
            <div 
              onClick={() => onNavigate('create')} 
              className="flex items-center space-x-3 cursor-pointer group select-none"
              title={t.navHomeGenerator || 'Lesson Plan Generator (Home)'}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-400/30 group-hover:bg-emerald-500 transition-colors shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                    {t.appTitle || 'Lesson Plan Generator'}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 hidden xs:inline-block">
                    {t.appSubtitle || 'Rwanda CBC'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden md:block">
                  {t.curriculumSubtitle || 'Rwanda Competence-Based Curriculum (CBC)'}
                </p>
              </div>
            </div>

            {/* Quick Return to Home Button when viewing secondary modules */}
            {currentPage !== 'create' && (
              <button
                onClick={() => onNavigate('create')}
                className="hidden sm:inline-flex items-center space-x-1.5 ml-2 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-700/50 hover:bg-emerald-900/60 transition-colors"
                title={t.backToGenerator || 'Back to Lesson Plan Generator'}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.navCreate || 'Generator'}</span>
              </button>
            )}
          </div>

          {/* Right Controls: Language Selector & Three-Dot Menu (⋮) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Language Selector */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-800/90 hover:bg-slate-800 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-700 transition-colors">
              <Globe className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-400 shrink-0" />
              <label htmlFor="language-select" className="text-[11px] font-semibold text-slate-300 hidden lg:inline whitespace-nowrap">
                {t.languageLabel || 'Language'}:
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
                title="Ururimi / Language / Langue"
              >
                <option value="en" className="bg-slate-900 text-white font-medium">EN</option>
                <option value="rw" className="bg-slate-900 text-white font-medium">RW</option>
                <option value="fr" className="bg-slate-900 text-white font-medium">FR</option>
              </select>
            </div>

            {/* Three-Dot Menu Container */}
            <div className="relative">
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={t.threeDotMenuTooltip || 'Education Tools & Modules (⋮)'}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                className={`p-2 rounded-xl border transition-all flex items-center justify-center relative cursor-pointer ${
                  isMenuOpen
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400/30'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 hover:text-white hover:border-slate-600'
                }`}
                title={t.threeDotMenuTooltip || 'Education Tools & Modules (⋮)'}
              >
                <MoreVertical className="w-5 h-5" />
                {savedCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900"></span>
                )}
              </button>

              {/* Three-Dot Dropdown Menu */}
              {isMenuOpen && (
                <div
                  ref={menuRef}
                  className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900/98 backdrop-blur-md border border-slate-700 shadow-2xl z-50 overflow-hidden ring-1 ring-black/40 animate-in fade-in zoom-in-95 duration-100"
                >
                  {/* Dropdown Header */}
                  <div className="p-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {t.modulesTitle || 'Education Tools & Modules'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Rwanda CBC Education Platform
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      MINEDUC / REB
                    </span>
                  </div>

                  {/* Dropdown Items List */}
                  <div className="p-2 space-y-1 max-h-[calc(100vh-120px)] overflow-y-auto">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isActive
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-800 text-emerald-400 group-hover:bg-slate-700'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs sm:text-sm font-semibold truncate flex items-center space-x-1.5">
                                <span>{item.label}</span>
                                {item.badgeText && (
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    isActive
                                      ? 'bg-emerald-800 text-white'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  }`}>
                                    {item.badgeText}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[11px] truncate ${
                                isActive ? 'text-emerald-100' : 'text-slate-400'
                              }`}>
                                {item.desc}
                              </p>
                            </div>
                          </div>

                          {isActive && (
                            <Check className="w-4 h-4 text-emerald-200 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-2.5 bg-slate-950/70 border-t border-slate-800 text-center">
                    <button
                      onClick={() => handleNavClick('dashboard')}
                      className="w-full text-center text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors py-1"
                    >
                      {t.navAllTools || 'View Centralized Dashboard →'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

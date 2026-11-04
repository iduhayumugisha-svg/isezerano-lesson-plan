import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  LayoutDashboard,
  GraduationCap,
  ShieldCheck,
  LogOut,
  User,
  MoreVertical,
  Award,
  BookOpen,
  FileText
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { TopAnnouncementTicker } from './TopAnnouncementTicker';

export type WebsitePage = 'home' | 'dashboard' | 'create' | 'saved' | 'settings' | 'nursery' | 'about' | 'contact' | 'privacy' | 'terms' | 'admin';

interface WebsiteHeaderProps {
  currentPage: string;
  onNavigate: (page: WebsitePage) => void;
  savedCount?: number;
}

export const WebsiteHeader: React.FC<WebsiteHeaderProps> = ({
  currentPage,
  onNavigate,
  savedCount = 0
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAdmin, signOutUser } = useAuth();
  const { logoUrl, logoSettings, colors, typography, branding } = useWebsiteDesign();

  // Three-dot dropdown state & ref for click-outside
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleNavClick = (page: WebsitePage) => {
    onNavigate(page);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOutUser();
    handleNavClick('home');
  };

  return (
    <>
      <TopAnnouncementTicker onNavigate={handleNavClick} />

      <header 
        className="no-print sticky top-0 z-50 border-b shadow-2xs transition-colors backdrop-blur-md"
        style={{
          backgroundColor: colors.headerBg,
          borderColor: colors.headerBorder,
          color: colors.headerText
        }}
      >
        {/* MAIN ROW: Brand Identity & Direct Fast Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* 1. Newspaper Brand Identity & Masthead Logo */}
            <div 
              onClick={() => handleNavClick('home')}
              className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group select-none min-w-0 shrink"
              title={`${branding?.platformTitle || 'ISEZERANO ONLINE'} – Digital Newspaper`}
            >
              {logoSettings.showInHeader && (
                <div 
                  className={`overflow-hidden bg-slate-900 border border-slate-700/80 shadow-md flex items-center justify-center shrink-0 group-hover:scale-102 transition-all ${logoSettings.borderRadius}`}
                  style={{
                    height: `clamp(34px, 8vw, ${logoSettings.displayHeight}px)`,
                    width: `clamp(34px, 8vw, ${logoSettings.displayHeight}px)`
                  }}
                >
                  <img 
                    src={logoUrl} 
                    alt={logoSettings.altText || `${branding?.platformTitle || 'ISEZERANO ONLINE'} Logo`} 
                    className={`w-full h-full object-${logoSettings.displayFit}`}
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="flex flex-col justify-center min-w-0">
                <span 
                  className="font-serif font-extrabold tracking-tight transition-colors leading-tight truncate text-lg sm:text-xl md:text-2xl"
                  style={{ color: colors.headerText }}
                >
                  {branding?.platformTitle || 'ISEZERANO ONLINE'}
                </span>
                <span 
                  className="font-semibold tracking-wider uppercase leading-none mt-0.5 truncate text-[10px] sm:text-xs text-teal-700"
                  style={{ color: colors.navLinkActive }}
                >
                  {branding?.platformSubtitle || 'GS GITUMBA'} • Digital Press
                </span>
              </div>
            </div>

            {/* 2. Direct Navigation Links (Newspaper, Lesson Preparation, Nursery Report Cards, Admin Portal) */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {/* Home / Newspaper */}
              <button
                type="button"
                onClick={() => handleNavClick('home')}
                style={{
                  fontSize: `${typography.navMenuSize}px`,
                  color: currentPage === 'home' ? colors.navLinkActive : colors.headerText
                }}
                className={`px-3 py-2 rounded-lg font-semibold transition-all relative cursor-pointer ${
                  currentPage === 'home'
                    ? 'font-bold bg-slate-100/80 shadow-2xs'
                    : 'hover:opacity-80 hover:bg-slate-50'
                }`}
              >
                <span>Newspaper</span>
                {currentPage === 'home' && (
                  <span 
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" 
                    style={{ backgroundColor: colors.navLinkActive }}
                  />
                )}
              </button>

              {/* Lesson Preparation (Direct Free Access) */}
              <button
                type="button"
                onClick={() => handleNavClick('dashboard')}
                style={{
                  fontSize: `${typography.navMenuSize}px`,
                  color: (currentPage === 'dashboard' || currentPage === 'create' || currentPage === 'saved' || currentPage === 'settings')
                    ? colors.navLinkActive 
                    : colors.headerText
                }}
                className={`px-3 py-2 rounded-lg font-semibold transition-all relative cursor-pointer inline-flex items-center space-x-1.5 ${
                  currentPage === 'dashboard' || currentPage === 'create' || currentPage === 'saved' || currentPage === 'settings'
                    ? 'font-bold bg-teal-50 shadow-2xs text-teal-900'
                    : 'hover:opacity-80 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-4 h-4 text-teal-700" />
                <span>Lesson Preparation</span>
              </button>

              {/* Nursery Student Report Cards (Direct Free Access) */}
              <button
                type="button"
                onClick={() => handleNavClick('nursery')}
                style={{
                  fontSize: `${typography.navMenuSize}px`,
                  color: currentPage === 'nursery' ? colors.navLinkActive : colors.headerText
                }}
                className={`px-3 py-2 rounded-lg font-semibold transition-all relative cursor-pointer inline-flex items-center space-x-1.5 ${
                  currentPage === 'nursery'
                    ? 'font-bold bg-amber-50 shadow-2xs text-amber-900'
                    : 'hover:opacity-80 hover:bg-slate-50'
                }`}
              >
                <Award className="w-4 h-4 text-amber-600" />
                <span>Report Cards</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold">
                  N1-N3
                </span>
              </button>

              {/* Admin Portal Gateway */}
              <button
                type="button"
                onClick={() => handleNavClick('admin')}
                style={{
                  fontSize: `${typography.navMenuSize}px`,
                  color: currentPage === 'admin' ? colors.navLinkActive : colors.headerText
                }}
                className={`px-3 py-2 rounded-lg font-semibold transition-all relative cursor-pointer inline-flex items-center space-x-1.5 ${
                  currentPage === 'admin'
                    ? 'font-bold bg-slate-900 text-white shadow-2xs'
                    : 'hover:opacity-80 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Admin</span>
              </button>
            </nav>

            {/* 3. Right Section: Language Switcher & Three-Dot Menu (⋮) */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              
              {/* Language Selector */}
              <div className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200/80 p-1 rounded-lg border border-slate-200 transition-colors">
                <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-transparent text-xs font-semibold text-slate-800 py-1 pr-2 pl-1 rounded focus:outline-none cursor-pointer"
                  title="Select Language"
                >
                  <option value="en">EN</option>
                  <option value="rw">RW</option>
                  <option value="fr">FR</option>
                </select>
              </div>

              {/* Three-Dot Menu Dropdown (⋮) */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label="Platform navigation menu"
                  aria-expanded={isMenuOpen}
                  title="Platform Navigation Menu"
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    isMenuOpen
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-teal-500/30'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  <MoreVertical className="w-5 h-5" />
                  {isAdmin && (
                    <span 
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" 
                      title="Admin signed in"
                    />
                  )}
                </button>

                {/* Dropdown Menu Popup */}
                {isMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right text-slate-800"
                    role="menu"
                  >
                    {/* Signed-in Admin Identity (if admin is authenticated) */}
                    {user && (
                      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 mb-1">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200">
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {user.displayName || user.email?.split('@')[0] || 'Administrator'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate font-mono">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION 1: FREE OPEN EDUCATION TOOLS - Lesson Preparation */}
                    <div className="px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => handleNavClick('dashboard')}
                        className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-teal-50 hover:text-teal-900 rounded-xl transition-colors text-left cursor-pointer group"
                        role="menuitem"
                        title="Open Rwanda CBC Education Dashboard & Teacher Tools"
                      >
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 group-hover:bg-teal-700 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                          <GraduationCap className="w-4 h-4 text-teal-700 group-hover:text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900 group-hover:text-teal-900">Education Dashboard</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                              Free CBC
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal truncate">
                            Lesson planner, saved schemes & export
                          </span>
                        </div>
                      </button>

                      {/* Create New Lesson Plan Direct Link */}
                      <button
                        type="button"
                        onClick={() => handleNavClick('create')}
                        className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-teal-50 hover:text-teal-900 rounded-xl transition-colors text-left cursor-pointer group mt-0.5"
                        role="menuitem"
                        title="Create CBC Lesson Plan"
                      >
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 group-hover:bg-teal-700 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                          <FileText className="w-4 h-4 text-teal-700 group-hover:text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-900 group-hover:text-teal-900">Lesson Preparation</span>
                          <span className="text-[10px] text-slate-500 font-normal truncate">
                            REB 8-column automated generator
                          </span>
                        </div>
                      </button>

                      {/* Nursery Report Cards Menu Link */}
                      <button
                        type="button"
                        onClick={() => handleNavClick('nursery')}
                        className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-amber-50 hover:text-amber-900 rounded-xl transition-colors text-left cursor-pointer group mt-0.5"
                        role="menuitem"
                        title="Nursery Student Report Card Management System"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 group-hover:bg-amber-700 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                          <Award className="w-4 h-4 text-amber-700 group-hover:text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900 group-hover:text-amber-900">Nursery Report Cards</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                              N1-N3
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal truncate">
                            Class_Reports_N1_Term_1 CBC template
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* SECTION 2: ADMINISTRATOR PORTAL */}
                    <div className="my-1 border-t border-slate-100" />
                    <div className="px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => handleNavClick('admin')}
                        className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors text-left cursor-pointer group"
                        role="menuitem"
                        title="Administrator Management Portal"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-teal-400 group-hover:bg-teal-950 flex items-center justify-center shrink-0 transition-colors">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900">Admin Portal</span>
                            {isAdmin && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold bg-teal-100 text-teal-800">
                                Verified
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal truncate">
                            Platform settings, announcements & designs
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* SECTION 3: FOR SIGNED IN USERS - Sign Out */}
                    {user && (
                      <>
                        <div className="my-1 border-t border-slate-100" />
                        <div className="px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full flex items-center space-x-3 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                            role="menuitem"
                            title="Sign out from current session"
                          >
                            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                              <LogOut className="w-4 h-4" />
                            </div>
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </>
                    )}

                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

      </header>
    </>
  );
};

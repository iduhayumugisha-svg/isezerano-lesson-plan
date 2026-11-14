import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  ShieldCheck,
  LogOut,
  User,
  MoreVertical,
  Award,
  BookOpen,
  Newspaper,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { NotificationBell } from './NotificationBell';
import { PushAnnouncement } from '../types/platform';
import { BlogCategory, DEFAULT_AI_BLOG_CATEGORIES } from '../types/blog';
import {
  subscribeToBlogCategories,
  mergeCategoriesForDisplay
} from '../services/blogService';

export type WebsitePage =
  | 'home'
  | 'dashboard'
  | 'create'
  | 'saved'
  | 'settings'
  | 'nursery'
  | 'blog'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'admin'
  | 'profile';

interface WebsiteHeaderProps {
  currentPage: string;
  onNavigate: (page: WebsitePage) => void;
  savedCount?: number;
  onSelectAnnouncement?: (announcement: PushAnnouncement) => void;
  newsCategories?: BlogCategory[];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export const WebsiteHeader: React.FC<WebsiteHeaderProps> = ({
  currentPage,
  onNavigate,
  onSelectAnnouncement,
  newsCategories,
  selectedCategory = 'All Categories',
  onSelectCategory
}) => {
  const { language, setLanguage } = useLanguage();
  const { user, isAdmin, signInWithGoogle, signOutUser } = useAuth();
  const { logoUrl, logoSettings, colors, typography, branding } = useWebsiteDesign();
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Fallback live subscription when WebsiteHeader is rendered without newsCategories prop
  const [fallbackRawCategories, setFallbackRawCategories] = useState<BlogCategory[]>(
    DEFAULT_AI_BLOG_CATEGORIES
  );
  const [fallbackInitialized, setFallbackInitialized] = useState(false);

  useEffect(() => {
    setLogoLoadError(false);
  }, [logoUrl]);

  useEffect(() => {
    if (newsCategories && newsCategories.length > 0) {
      return;
    }
    const unsub = subscribeToBlogCategories((fetchedCats, initialized) => {
      setFallbackRawCategories(fetchedCats);
      setFallbackInitialized(initialized);
    });
    return () => unsub();
  }, [newsCategories]);

  const resolvedCategories =
    newsCategories && newsCategories.length > 0
      ? newsCategories
      : mergeCategoriesForDisplay(fallbackRawCategories, fallbackInitialized, []);

  // Three-dot dropdown state & ref for click-outside / Escape key
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  const handleNavClick = (page: WebsitePage) => {
    if (page === 'home') {
      onSelectCategory?.('All Categories');
    }
    onNavigate(page);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryClick = (categoryName: string) => {
    onSelectCategory?.(categoryName);
    if (currentPage !== 'home') {
      onNavigate('home');
    }
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOutUser();
    handleNavClick('home');
  };

  const isNewsFeedPage = currentPage === 'home' || currentPage === 'blog';

  return (
    <header
      className="no-print sticky top-0 z-50 border-b shadow-2xs transition-colors backdrop-blur-md"
      style={{
        backgroundColor: colors.headerBg,
        borderColor: colors.headerBorder,
        color: colors.headerText
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* TIER 1: UPPER-LEFT BRANDING AREA (LOGO LEFT -> WEBSITE NAME & DESCRIPTION) & UPPER-RIGHT UTILITIES */}
        <div className="flex items-center justify-between gap-3 pt-3 sm:pt-3.5 pb-2.5 border-b border-slate-200/80">
          {/* Upper-Left Branding Area: Horizontal Logo FIRST, followed by Website Name & Description */}
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer group select-none min-w-0 flex-1"
            title={`${branding?.platformTitle || 'ISEZERANO ONLINE'} – ${branding?.platformSubtitle || 'GS GITUMBA'}`}
          >
            {logoSettings?.showInHeader !== false && logoUrl && !logoLoadError && (
              <div
                className={`shrink-0 overflow-hidden bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center ${logoSettings?.borderRadius || 'rounded-xl'}`}
                style={{
                  height: `${Math.min(Math.max(logoSettings?.displayHeight || 44, 32), 64)}px`,
                  width: `${Math.min(Math.max(logoSettings?.displayHeight || 44, 32), 64)}px`
                }}
              >
                <img
                  src={logoUrl}
                  alt={logoSettings?.altText || branding?.platformTitle || 'Website Logo'}
                  className={`w-full h-full ${logoSettings?.displayFit === 'contain' ? 'object-contain p-0.5' : 'object-cover'}`}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoLoadError(true)}
                />
              </div>
            )}

            <div className="flex flex-col justify-center min-w-0">
              {branding?.showWebsiteName !== false && (
                <>
                  <span
                    className="font-serif font-extrabold tracking-tight transition-colors leading-tight text-lg sm:text-2xl md:text-[26px] truncate"
                    style={{ color: colors.headerText }}
                  >
                    {branding?.platformTitle || 'ISEZERANO ONLINE'}
                  </span>
                  {branding?.platformSubtitle && (
                    <span
                      className="font-semibold tracking-wider uppercase leading-none mt-0.5 text-[11px] sm:text-xs text-teal-700 truncate"
                      style={{ color: colors.navLinkActive }}
                    >
                      {branding.platformSubtitle}
                    </span>
                  )}
                </>
              )}
              {branding?.showWebsiteDescription !== false && branding?.websiteDescription?.trim() && (
                <span
                  className={`text-[11px] sm:text-xs leading-snug line-clamp-1 max-w-xl ${
                    branding?.showWebsiteName !== false ? 'mt-0.5' : ''
                  }`}
                  style={{ color: colors.mutedText || '#64748b' }}
                >
                  {branding.websiteDescription}
                </span>
              )}
            </div>
          </div>

          {/* Upper-Right Utilities: Notification Bell, Language Switcher, Three-Dot Overflow Menu (⋮) */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
            <NotificationBell onSelectAnnouncement={onSelectAnnouncement} />

            {/* Language Selector */}
            <div className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200/80 p-1 rounded-lg border border-slate-200 transition-colors">
              <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent text-xs font-semibold text-slate-800 py-1 pr-2 pl-1 rounded focus:outline-none cursor-pointer"
                title="Select Language"
                aria-label="Select Language"
              >
                <option value="en">EN</option>
                <option value="rw">RW</option>
                <option value="fr">FR</option>
              </select>
            </div>

            {/* Three-Dot Overflow Menu (⋮): Lesson Preparation, CBC Report Cards N1-N3, Admin Portal */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="More sections menu"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                title="Education Tools & Admin Menu"
                className={`min-w-[40px] min-h-[40px] px-2.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isMenuOpen
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-teal-500/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                }`}
              >
                <MoreVertical className="w-5 h-5" />
                {isAdmin && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                    title="Admin signed in"
                  />
                )}
              </button>

              {isMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800"
                  role="menu"
                >
                  {/* User Profile Identity or Google Sign In */}
                  {user ? (
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 mb-1">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                            isAdmin
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-teal-100 text-teal-800 border-teal-200'
                          }`}
                        >
                          {user.displayName ? (
                            user.displayName.charAt(0).toUpperCase()
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {user.displayName ||
                                user.email?.split('@')[0] ||
                                (isAdmin ? 'Administrator' : 'Teacher')}
                            </p>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                                isAdmin
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-teal-100 text-teal-900'
                              }`}
                            >
                              {isAdmin ? 'Admin' : 'Mwarimu'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate font-mono">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/70">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleNavClick('profile')}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200/80 transition-colors cursor-pointer text-left"
                        >
                          <span className="inline-flex items-center space-x-2">
                            <User className="w-3.5 h-3.5 text-teal-700" />
                            <span>Teacher Profile (Profil)</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-teal-700" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={async () => {
                          setIsMenuOpen(false);
                          await signInWithGoogle();
                        }}
                        className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Sign In with Google</span>
                      </button>
                    </div>
                  )}

                  {/* Platform Tools & Sections moved into Overflow Menu */}
                  <div className="px-4 pt-2 pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Education &amp; School Tools
                    </p>
                  </div>

                  <div className="px-1.5 py-0.5 space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavClick('dashboard')}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-colors text-left cursor-pointer ${
                        ['dashboard', 'create', 'saved', 'settings'].includes(currentPage)
                          ? 'bg-teal-50 text-teal-900'
                          : 'text-slate-800 hover:bg-teal-50 hover:text-teal-900'
                      }`}
                    >
                      <span className="flex items-center space-x-3">
                        <BookOpen className="w-4 h-4 text-teal-700 shrink-0" />
                        <span>Lesson Preparation</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavClick('nursery')}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-colors text-left cursor-pointer ${
                        currentPage === 'nursery'
                          ? 'bg-amber-50 text-amber-950'
                          : 'text-slate-800 hover:bg-amber-50 hover:text-amber-900'
                      }`}
                    >
                      <span className="flex items-center space-x-3">
                        <Award className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>CBC Report Cards N1-N3</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  {/* Administrator Portal */}
                  <div className="my-1.5 border-t border-slate-100" />
                  <div className="px-1.5 py-0.5 space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavClick('admin')}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-colors text-left cursor-pointer ${
                        currentPage === 'admin'
                          ? 'bg-slate-100 text-slate-950'
                          : 'text-slate-800 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center space-x-3">
                        <ShieldCheck className="w-4 h-4 text-slate-700 shrink-0" />
                        <span>Admin Portal</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {currentPage !== 'home' && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleNavClick('home')}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <span className="flex items-center space-x-3">
                          <Newspaper className="w-4 h-4 text-teal-700 shrink-0" />
                          <span>All News (Front Page)</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-teal-600" />
                      </button>
                    )}
                  </div>

                  {/* Sign Out */}
                  {user && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <div className="px-1.5 py-0.5">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleSignOut}
                          className="w-full flex items-center space-x-3 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
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

        {/* TIER 2: NEWSPAPER CATEGORY NAVIGATION BAR (DYNAMICALLY LOADED FROM FIRESTORE) */}
        <div className="flex items-center overflow-x-auto no-scrollbar">
          <nav aria-label="News categories" className="flex items-center space-x-5 sm:space-x-6 min-w-full">
            <button
              type="button"
              onClick={() => handleCategoryClick('All Categories')}
              style={{ fontSize: `${typography.navMenuSize}px` }}
              className={`py-2.5 border-b-2 transition-colors cursor-pointer inline-flex items-center whitespace-nowrap shrink-0 text-xs sm:text-sm ${
                isNewsFeedPage && selectedCategory === 'All Categories'
                  ? 'border-teal-700 text-teal-800 font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-950 font-semibold'
              }`}
            >
              All News
            </button>

            {resolvedCategories.map((category) => {
              const isCurrent = isNewsFeedPage && selectedCategory === category.name;
              return (
                <button
                  key={category.id || category.name}
                  type="button"
                  onClick={() => handleCategoryClick(category.name)}
                  style={{ fontSize: `${typography.navMenuSize}px` }}
                  className={`py-2.5 border-b-2 transition-colors cursor-pointer inline-flex items-center whitespace-nowrap shrink-0 text-xs sm:text-sm ${
                    isCurrent
                      ? 'border-teal-700 text-teal-800 font-bold'
                      : 'border-transparent text-slate-600 hover:text-slate-950 font-semibold'
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};


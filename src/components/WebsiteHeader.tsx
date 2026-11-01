import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  LayoutDashboard,
  ShieldCheck,
  LogIn,
  LogOut,
  User,
  Newspaper,
  MoreVertical,
  ChevronRight,
  Menu,
  X,
  Compass
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { TopAnnouncementTicker } from './TopAnnouncementTicker';
import { NewsCategory, DEFAULT_NEWS_CATEGORIES } from '../types/category';
import { subscribeToNewsCategories } from '../services/categoryService';

export type WebsitePage = 'home' | 'dashboard' | 'create' | 'saved' | 'settings' | 'students' | 'about' | 'contact' | 'privacy' | 'terms' | 'admin' | 'blog';

interface WebsiteHeaderProps {
  currentPage: string;
  onNavigate: (page: WebsitePage) => void;
  savedCount?: number;
  onOpenAuthModal?: () => void;
  selectedCategory?: string;
  onSelectCategory?: (categoryName: string) => void;
}

export const WebsiteHeader: React.FC<WebsiteHeaderProps> = ({
  currentPage,
  onNavigate,
  onOpenAuthModal,
  selectedCategory = 'All Categories',
  onSelectCategory
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAdmin, signOutUser } = useAuth();
  const { logoUrl, logoSettings, colors, typography, branding } = useWebsiteDesign();

  // Three-dot dropdown state & ref for click-outside
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dynamic news categories from Firestore
  const [categories, setCategories] = useState<NewsCategory[]>(DEFAULT_NEWS_CATEGORIES);

  useEffect(() => {
    const unsubscribe = subscribeToNewsCategories((cats) => {
      setCategories(cats);
    });
    return () => unsubscribe();
  }, []);

  // Close three-dot menu when clicking outside
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

  const handleCategoryClick = (categoryName: string) => {
    if (onSelectCategory) {
      onSelectCategory(categoryName);
    }
    if (currentPage !== 'home' && currentPage !== 'blog') {
      onNavigate('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const enabledCategories = categories.filter((c) => c.enabled !== false);

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
        {/* TOP ROW: Main Digital Newspaper Brand & Clean Controls */}
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

            {/* 2. Streamlined Newspaper Navigation (Strictly News & Archive; no private tools) */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              <button
                type="button"
                onClick={() => handleNavClick('home')}
                style={{
                  fontSize: `${typography.navMenuSize}px`,
                  color: currentPage === 'home' ? colors.navLinkActive : colors.headerText
                }}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-all relative cursor-pointer ${
                  currentPage === 'home'
                    ? 'font-bold bg-slate-100/70 shadow-2xs'
                    : 'hover:opacity-80'
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

              <button
                type="button"
                onClick={() => handleNavClick('blog')}
                style={{
                  fontSize: `${typography.navMenuSize}px`,
                  color: currentPage === 'blog' ? colors.navLinkActive : colors.headerText
                }}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-all relative cursor-pointer ${
                  currentPage === 'blog'
                    ? 'font-bold bg-slate-100/70 shadow-2xs'
                    : 'hover:opacity-80'
                }`}
              >
                <span>News Archive</span>
                {currentPage === 'blog' && (
                  <span 
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" 
                    style={{ backgroundColor: colors.navLinkActive }}
                  />
                )}
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
                  aria-label="Account and dashboard options"
                  aria-expanded={isMenuOpen}
                  title="Account & Platform Menu"
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    isMenuOpen
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-teal-500/30'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  <MoreVertical className="w-5 h-5" />
                  {user && (
                    <span 
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" 
                      title="Signed in"
                    />
                  )}
                </button>

                {/* Dropdown Menu Popup */}
                {isMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right text-slate-800"
                    role="menu"
                  >
                    {/* Signed-in User Identity */}
                    {user ? (
                      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 mb-1">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200">
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {user.displayName || 'Authorized User'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate font-mono">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Unauthenticated Option: Login / Account */}
                    {!user && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (onOpenAuthModal) onOpenAuthModal();
                          else handleNavClick('dashboard');
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-teal-50 hover:text-teal-900 transition-colors text-left cursor-pointer"
                        role="menuitem"
                      >
                        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                          <LogIn className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold">Login / Account</span>
                          <span className="text-[10px] text-slate-500 font-normal">Sign in to access teacher tools & curriculum</span>
                        </div>
                      </button>
                    )}

                    {/* Authenticated Option: Dashboard (Only visible when logged in) */}
                    {user && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('dashboard')}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-teal-50 hover:text-teal-900 transition-colors text-left cursor-pointer"
                        role="menuitem"
                      >
                        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                          <LayoutDashboard className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold">Education Dashboard</span>
                          <span className="text-[10px] text-slate-500 font-normal">Lesson planner, classes, students & export</span>
                        </div>
                      </button>
                    )}

                    {/* Authorized Option: Admin Dashboard (Only visible when isAdmin is true) */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('admin')}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left cursor-pointer"
                        role="menuitem"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-900 text-teal-400 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold">Admin Portal</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold bg-teal-100 text-teal-800">
                              Verified
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal">Manage news categories, ads, designs & staff</span>
                        </div>
                      </button>
                    )}

                    {/* Sign Out Option (Authenticated only) */}
                    {user && (
                      <>
                        <div className="my-1.5 border-t border-slate-100" />
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center space-x-3 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                          role="menuitem"
                        >
                          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                            <LogOut className="w-4 h-4" />
                          </div>
                          <span>Sign Out</span>
                        </button>
                      </>
                    )}

                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* BOTTOM ROW: Dynamic News Category Bar (Loaded from Cloud Firestore) */}
        <div className="border-t border-slate-200/70 bg-slate-50/90 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-2 overflow-x-auto no-scrollbar scroll-smooth space-x-1 sm:space-x-1.5">
              
              {/* All Stories / Byose Pill */}
              <button
                type="button"
                onClick={() => handleCategoryClick('All Categories')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-tight whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  selectedCategory === 'All Categories'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                Byose (All Stories)
              </button>

              {/* Dynamic Firestore Categories */}
              {enabledCategories.map((cat) => {
                const isActive = 
                  selectedCategory.toLowerCase() === cat.name.toLowerCase() ||
                  selectedCategory.toLowerCase() === cat.slug.toLowerCase() ||
                  (cat.nameEn && selectedCategory.toLowerCase() === cat.nameEn.toLowerCase());

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryClick(cat.name)}
                    title={cat.description || cat.nameEn || cat.name}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-tight whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-teal-700 text-white shadow-xs ring-1 ring-teal-600'
                        : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat.nameEn && (
                      <span className={`ml-1 text-[10px] font-normal opacity-75 hidden lg:inline`}>
                        ({cat.nameEn})
                      </span>
                    )}
                  </button>
                );
              })}

            </div>
          </div>
        </div>

      </header>
    </>
  );
};

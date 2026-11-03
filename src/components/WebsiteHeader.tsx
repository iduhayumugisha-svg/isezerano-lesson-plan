import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  LayoutDashboard,
  GraduationCap,
  ShieldCheck,
  LogIn,
  LogOut,
  User,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Layers
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { TopAnnouncementTicker } from './TopAnnouncementTicker';
import { NewsCategory, DEFAULT_NEWS_CATEGORIES } from '../types/category';
import { subscribeToNewsCategories } from '../services/categoryService';

export type WebsitePage = 'home' | 'dashboard' | 'create' | 'saved' | 'settings' | 'about' | 'contact' | 'privacy' | 'terms' | 'admin';

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

  // Category navigation states
  const [categories, setCategories] = useState<NewsCategory[]>(DEFAULT_NEWS_CATEGORIES);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToNewsCategories((cats) => {
      setCategories(cats);
    });
    return () => unsubscribe();
  }, []);

  // Check scroll capability of category bar
  const checkScrollState = () => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  useEffect(() => {
    checkScrollState();
    window.addEventListener('resize', checkScrollState);
    return () => window.removeEventListener('resize', checkScrollState);
  }, [categories]);

  const handleScrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const amount = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkScrollState, 250);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isMenuOpen || isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen, isCategoryDropdownOpen]);

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
    if (currentPage !== 'home') {
      onNavigate('home');
    }
    setExpandedCatId(null);
    setIsCategoryDropdownOpen(false);
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
                    className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right text-slate-800"
                    role="menu"
                  >
                    {/* Signed-in User Identity (if user is authenticated) */}
                    {user && (
                      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 mb-1">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200">
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {user.displayName || user.email?.split('@')[0] || 'User'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate font-mono">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION 1: FOR ALL VISITORS - Education Dashboard */}
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
                              CBC Tools
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal truncate">
                            Lesson planner, saved plans, preferences & export
                          </span>
                        </div>
                      </button>

                      {/* FOR ALL VISITORS: Login / Account (when not signed in) */}
                      {!user && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            if (onOpenAuthModal) onOpenAuthModal();
                            else handleNavClick('dashboard');
                          }}
                          className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors text-left cursor-pointer group mt-0.5"
                          role="menuitem"
                          title="Teacher & Staff Authentication"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-200 flex items-center justify-center shrink-0 transition-colors">
                            <LogIn className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900">Login / Account</span>
                            <span className="text-[10px] text-slate-500 font-normal truncate">
                              Teacher and staff authentication
                            </span>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* SECTION 2: FOR AUTHORIZED ADMINISTRATORS ONLY - Admin Portal */}
                    {isAdmin && (
                      <>
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
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold bg-teal-100 text-teal-800">
                                  Verified
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-normal truncate">
                                Categories, announcements, designs & ads
                              </span>
                            </div>
                          </button>
                        </div>
                      </>
                    )}

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

        {/* BOTTOM ROW: Dynamic News Category Bar with Responsive Scroll & Read More for Long Categories */}
        <div className="border-t border-slate-200/70 bg-slate-50/90 backdrop-blur-xs relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-2 relative">
              
              {/* Optional Scroll Left Arrow */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => handleScrollCategories('left')}
                  className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer mr-1 z-10 shrink-0"
                  title="Scroll categories left"
                  aria-label="Scroll categories left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Scrollable Categories Track */}
              <div 
                ref={categoryScrollRef}
                onScroll={checkScrollState}
                className="flex items-center overflow-x-auto no-scrollbar scroll-smooth space-x-1 sm:space-x-1.5 flex-1 min-w-0 py-0.5"
              >
                {/* All Stories / Byose Pill */}
                <button
                  type="button"
                  onClick={() => handleCategoryClick('All Categories')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-tight whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    selectedCategory === 'All Categories' || selectedCategory === 'Byose' || selectedCategory === 'Byose (All Stories)'
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

                  const isLongCategory = cat.name.length > 16;
                  const isExpandedThis = expandedCatId === cat.id;

                  return (
                    <div key={cat.id} className="relative inline-flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCategoryClick(cat.name)}
                        title={cat.description || cat.nameEn || cat.name}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-tight whitespace-nowrap transition-all cursor-pointer inline-flex items-center space-x-1 shrink-0 ${
                          isActive
                            ? 'bg-teal-700 text-white shadow-xs ring-1 ring-teal-600'
                            : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                        }`}
                      >
                        <span>{cat.name}</span>
                        {cat.nameEn && (
                          <span className={`text-[10px] font-normal opacity-75 hidden xl:inline`}>
                            ({cat.nameEn})
                          </span>
                        )}
                      </button>

                      {/* Accessible "Read more" / Details toggle button for long category names */}
                      {isLongCategory && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCatId(isExpandedThis ? null : cat.id);
                          }}
                          title={isExpandedThis ? "Read less" : `Read complete title & details for ${cat.name}`}
                          className={`p-1 rounded-full text-[10px] transition-colors cursor-pointer -ml-1.5 mr-0.5 ${
                            isExpandedThis
                              ? 'bg-teal-800 text-white'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                          }`}
                        >
                          <span className="sr-only">Read more about {cat.name}</span>
                          {isExpandedThis ? <ChevronUp className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                        </button>
                      )}

                      {/* Expandable popup card when "Read more" on category is clicked */}
                      {isExpandedThis && (
                        <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-white rounded-xl shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <h4 className="text-xs font-bold text-slate-950">{cat.name}</h4>
                            <button
                              type="button"
                              onClick={() => setExpandedCatId(null)}
                              className="text-slate-400 hover:text-slate-700 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {cat.nameEn && (
                            <p className="text-[11px] text-teal-700 font-semibold mb-1">
                              English: {cat.nameEn}
                            </p>
                          )}
                          {cat.description && (
                            <p className="text-[11px] text-slate-600 leading-relaxed mb-2.5">
                              {cat.description}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCategoryClick(cat.name)}
                            className="w-full py-1 text-center text-xs font-bold text-white bg-teal-700 hover:bg-teal-600 rounded-lg shadow-2xs cursor-pointer"
                          >
                            Filter "{cat.name}" Articles
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>

              {/* Optional Scroll Right Arrow */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => handleScrollCategories('right')}
                  className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer ml-1 z-10 shrink-0"
                  title="Scroll categories right"
                  aria-label="Scroll categories right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* "More Topics ▾" Dropdown to reveal all categories without cut-off */}
              <div className="relative shrink-0 ml-1.5" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="px-2.5 py-1.5 rounded-full text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-200/70 hover:bg-slate-200 transition-all inline-flex items-center space-x-1 cursor-pointer shrink-0"
                  title="Show all news categories and complete topics"
                  aria-expanded={isCategoryDropdownOpen}
                >
                  <Layers className="w-3.5 h-3.5 text-teal-700" />
                  <span className="hidden sm:inline">More</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {/* All Categories Dropdown Menu */}
                {isCategoryDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800 max-h-96 overflow-y-auto">
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        All News Topics ({enabledCategories.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCategoryDropdownOpen(false)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="py-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => handleCategoryClick('All Categories')}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          selectedCategory === 'All Categories' || selectedCategory === 'Byose' || selectedCategory === 'Byose (All Stories)'
                            ? 'bg-slate-950 text-white'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        Byose (All Stories)
                      </button>

                      {enabledCategories.map((c) => {
                        const isSel = 
                          selectedCategory.toLowerCase() === c.name.toLowerCase() ||
                          selectedCategory.toLowerCase() === c.slug.toLowerCase();
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleCategoryClick(c.name)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                              isSel
                                ? 'bg-teal-700 text-white font-bold'
                                : 'hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold">{c.name}</span>
                              {c.nameEn && (
                                <span className={`text-[10px] ${isSel ? 'text-teal-100' : 'text-slate-500'}`}>
                                  {c.nameEn}
                                </span>
                              )}
                            </div>
                            {c.description && (
                              <p className={`text-[11px] mt-0.5 line-clamp-1 ${isSel ? 'text-teal-100/90' : 'text-slate-500'}`}>
                                {c.description}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
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

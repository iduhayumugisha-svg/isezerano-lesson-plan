import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  LogOut,
  Menu,
  Newspaper,
  ChevronRight,
  ChevronDown,
  Check,
  Info,
  Mail
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
import { resolveAllNewsLabel, resolveCategoryNavItemStyle } from '../utils/categoryStyleUtils';
import { scrollMainContentToTop } from '../utils/scrollUtils';

export type WebsitePage =
  | 'home'
  | 'blog'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'admin';

interface WebsiteHeaderProps {
  currentPage: string;
  onNavigate: (page: WebsitePage) => void;
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
  const { language, setLanguage, t } = useLanguage();
  const { user, isAdmin, signOutUser } = useAuth();
  const { logoUrl, logoSettings, colors, typography, branding, categoryNav } = useWebsiteDesign();
  const [logoLoadError, setLogoLoadError] = useState(false);
  const allNewsLabel = resolveAllNewsLabel(branding);

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

  // Three-dot dropdown & nested language dropdown state + refs for click-outside / Escape key
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      setIsLangDropdownOpen(false);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (langDropdownRef.current && !langDropdownRef.current.contains(target)) {
        setIsLangDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsLangDropdownOpen(false);
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isLangDropdownOpen) {
          setIsLangDropdownOpen(false);
        } else {
          setIsMenuOpen(false);
        }
      }
    };

    if (isMenuOpen || isLangDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen, isLangDropdownOpen]);

  const handleNavClick = (page: WebsitePage) => {
    if (page === 'home') {
      onSelectCategory?.('All Categories');
    }
    onNavigate(page);
    setIsLangDropdownOpen(false);
    setIsMenuOpen(false);
    scrollMainContentToTop('auto');
  };

  const handleCategoryClick = (categoryName: string) => {
    onSelectCategory?.(categoryName);
    if (currentPage !== 'home') {
      onNavigate('home');
    }
    setIsLangDropdownOpen(false);
    setIsMenuOpen(false);
    scrollMainContentToTop('auto');
  };

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOutUser();
    handleNavClick('home');
  };

  const isNewsFeedPage = currentPage === 'home' || currentPage === 'blog';

  const websiteNameFont =
    typography?.websiteNameFontFamily || "'Times New Roman', Times, Baskerville, Georgia, serif";
  const websiteNameBaseSize = Math.min(Math.max(Number(typography?.websiteNameSize) || 26, 14), 48);
  const websiteNameResponsiveSize = `clamp(${Math.min(18, websiteNameBaseSize)}px, 4.5vw, ${websiteNameBaseSize}px)`;
  const websiteNameColor = typography?.websiteNameColor || colors.headerText || '#0f172a';
  const websiteNameCssColor = 'var(--app-website-name-color, ' + websiteNameColor + ')';

  const languageOptions: { code: Language; short: string; label: string; flag: string }[] = [
    { code: 'en', short: 'EN', label: 'English', flag: '🇺🇸' },
    { code: 'rw', short: 'RW', label: 'Kinyarwanda', flag: '🇷🇼' },
    { code: 'fr', short: 'FR', label: 'Français', flag: '🇫🇷' }
  ];
  const activeLanguageOption =
    languageOptions.find((opt) => opt.code === language) || languageOptions[0];

  return (
    <header
      className="no-print sticky top-0 z-40 border-b shadow-2xs transition-colors backdrop-blur-md"
      style={{
        backgroundColor: 'var(--app-header-bg)',
        borderColor: 'var(--app-header-border)',
        color: 'var(--app-header-text)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* TIER 1: FAR-LEFT HAMBURGER MENU & BRANDING AREA (LOGO LEFT -> WEBSITE NAME & DESCRIPTION) + UPPER-RIGHT UTILITIES */}
        <div
          className="flex items-center justify-between gap-2.5 sm:gap-3 h-[78px] border-b"
          style={{ borderColor: 'var(--app-border-color)' }}
        >
          {/* Far-Left Hamburger Menu (☰) + Branding Area */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            {/* Hamburger Menu (☰): Language, Site Pages, Admin Portal */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="More sections menu"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                title="Menu & Settings"
                style={
                  isMenuOpen
                    ? {
                        backgroundColor: 'var(--app-primary)',
                        color: 'var(--app-primary-btn-text)',
                        borderColor: 'var(--app-primary)',
                        borderRadius: 'var(--app-radius-btn)'
                      }
                    : {
                        backgroundColor: 'var(--app-card-bg)',
                        color: 'var(--app-header-text)',
                        borderColor: 'var(--app-border-color)',
                        borderRadius: 'var(--app-radius-btn)'
                      }
                }
                className="min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] px-2.5 py-2 border transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:opacity-90"
              >
                <Menu className="w-5 h-5 shrink-0" aria-hidden="true" />
                {isAdmin && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                    title="Admin signed in"
                  />
                )}
              </button>

              {isMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-5.5rem)] overflow-y-auto shadow-2xl border py-2 z-50"
                  style={{
                    backgroundColor: 'var(--app-card-bg)',
                    borderColor: 'var(--app-border-color)',
                    color: 'var(--app-body-text)',
                    borderRadius: 'var(--app-radius-card)'
                  }}
                  role="menu"
                >
                  {/* Admin Session Badge (Only shown when Admin is authenticated) */}
                  {isAdmin && user && (
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 mb-1">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border bg-amber-100 text-amber-900 border-amber-300">
                          {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {user.displayName || user.email?.split('@')[0] || 'Administrator'}
                            </p>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-extrabold uppercase bg-amber-100 text-amber-900">
                              Admin
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate font-mono">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Newsroom Sections */}
                  <div className="px-4 pt-2 pb-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--app-muted-text)' }}
                    >
                      Sections &amp; Pages
                    </p>
                  </div>

                  <div className="px-1.5 py-0.5 space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavClick('home')}
                      style={
                        currentPage === 'home'
                          ? { backgroundColor: 'var(--app-primary-soft)', color: 'var(--app-primary)', borderRadius: 'var(--app-radius-btn)' }
                          : { color: 'var(--app-body-text)', borderRadius: 'var(--app-radius-btn)' }
                      }
                      className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold transition-colors text-left cursor-pointer hover:opacity-85"
                    >
                      <span className="flex items-center space-x-3">
                        <Newspaper className="w-4 h-4 shrink-0" style={{ color: 'var(--app-primary)' }} />
                        <span>{allNewsLabel} (Front Page)</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavClick('about')}
                      style={
                        currentPage === 'about'
                          ? { backgroundColor: 'var(--app-primary-soft)', color: 'var(--app-primary)', borderRadius: 'var(--app-radius-btn)' }
                          : { color: 'var(--app-body-text)', borderRadius: 'var(--app-radius-btn)' }
                      }
                      className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors text-left cursor-pointer hover:opacity-85"
                    >
                      <span className="flex items-center space-x-3">
                        <Info className="w-4 h-4 shrink-0" style={{ color: 'var(--app-muted-text)' }} />
                        <span>{t.navAbout || 'About Us'}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavClick('contact')}
                      style={
                        currentPage === 'contact'
                          ? { backgroundColor: 'var(--app-primary-soft)', color: 'var(--app-primary)', borderRadius: 'var(--app-radius-btn)' }
                          : { color: 'var(--app-body-text)', borderRadius: 'var(--app-radius-btn)' }
                      }
                      className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors text-left cursor-pointer hover:opacity-85"
                    >
                      <span className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 shrink-0" style={{ color: 'var(--app-muted-text)' }} />
                        <span>{t.navContact || 'Contact Us'}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </div>

                  {/* Language / Translation Dropdown inside Hamburger Menu */}
                  <div className="my-1.5 border-t" style={{ borderColor: 'var(--app-border-color)' }} />
                  <div className="px-3.5 py-2 space-y-2" ref={langDropdownRef}>
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--app-muted-text)' }}
                    >
                      Language / Ururimi
                    </p>

                    <button
                      type="button"
                      data-testid="language-dropdown-trigger"
                      aria-haspopup="menu"
                      aria-expanded={isLangDropdownOpen}
                      aria-label={`Language selector: ${activeLanguageOption.label}`}
                      onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                      style={{
                        backgroundColor: isLangDropdownOpen ? 'var(--app-primary-soft)' : 'var(--app-body-bg)',
                        borderColor: isLangDropdownOpen ? 'var(--app-primary)' : 'var(--app-border-color)',
                        color: 'var(--app-body-text)',
                        borderRadius: 'var(--app-radius-btn)'
                      }}
                      className="w-full min-h-[42px] px-3 py-2 border text-left transition-colors cursor-pointer flex items-center justify-between gap-2.5 focus-visible:outline-none"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="font-sans text-[17px] leading-none shrink-0 inline-flex items-center justify-center select-none"
                          aria-hidden="true"
                        >
                          {activeLanguageOption.flag}
                        </span>
                        <span className="text-xs font-bold truncate">
                          {activeLanguageOption.label}
                        </span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                          isLangDropdownOpen ? 'rotate-180' : ''
                        }`}
                        style={{ color: isLangDropdownOpen ? 'var(--app-primary)' : 'var(--app-muted-text)' }}
                        aria-hidden="true"
                      />
                    </button>

                    {isLangDropdownOpen && (
                      <div
                        role="menu"
                        aria-label="Language selection"
                        data-testid="language-dropdown-menu"
                        style={{
                          backgroundColor: 'var(--app-card-bg)',
                          borderColor: 'var(--app-border-color)',
                          borderRadius: 'var(--app-radius-btn)'
                        }}
                        className="border shadow-lg overflow-hidden divide-y"
                      >
                        {languageOptions.map((langOpt) => {
                          const isSelectedLang = language === langOpt.code;
                          return (
                            <button
                              key={langOpt.code}
                              type="button"
                              role="menuitemradio"
                              aria-checked={isSelectedLang}
                              aria-label={`Switch language to ${langOpt.label}`}
                              onClick={() => {
                                setLanguage(langOpt.code);
                                setIsLangDropdownOpen(false);
                              }}
                              style={{
                                backgroundColor: isSelectedLang ? 'var(--app-primary-soft)' : 'var(--app-card-bg)',
                                color: isSelectedLang ? 'var(--app-primary)' : 'var(--app-body-text)',
                                borderColor: 'var(--app-border-color)'
                              }}
                              className={`w-full min-h-[44px] px-3 py-2.5 text-xs transition-colors cursor-pointer flex items-center justify-between gap-2.5 text-left hover:opacity-90 ${
                                isSelectedLang ? 'font-bold' : 'font-semibold'
                              }`}
                            >
                              <span className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className="font-sans text-[17px] leading-none shrink-0 inline-flex items-center justify-center select-none"
                                  aria-hidden="true"
                                >
                                  {langOpt.flag}
                                </span>
                                <span className="truncate">{langOpt.label}</span>
                              </span>
                              {isSelectedLang && (
                                <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--app-primary)' }} aria-hidden="true" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Administrator Portal */}
                  <div className="my-1.5 border-t" style={{ borderColor: 'var(--app-border-color)' }} />
                  <div className="px-1.5 py-0.5 space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavClick('admin')}
                      style={
                        currentPage === 'admin'
                          ? { backgroundColor: 'var(--app-primary-soft)', color: 'var(--app-primary)', borderRadius: 'var(--app-radius-btn)' }
                          : { color: 'var(--app-body-text)', borderRadius: 'var(--app-radius-btn)' }
                      }
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold transition-colors text-left cursor-pointer hover:opacity-85"
                    >
                      <span className="flex items-center space-x-3">
                        <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--app-primary)' }} />
                        <span>{isAdmin ? 'Admin Dashboard' : 'Admin Portal'}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </div>

                  {/* Admin Sign Out */}
                  {isAdmin && user && (
                    <>
                      <div className="my-1 border-t" style={{ borderColor: 'var(--app-border-color)' }} />
                      <div className="px-1.5 py-0.5">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleSignOut}
                          className="w-full flex items-center space-x-3 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:opacity-80 rounded-xl transition-colors text-left cursor-pointer"
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

            {/* Branding Area: Horizontal Logo FIRST, followed by Website Name & Description */}
            <div
              onClick={() => handleNavClick('home')}
              className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer group select-none min-w-0 flex-1"
              title={`${branding?.platformTitle || 'ISEZERANO ONLINE'}${branding?.platformSubtitle ? ` – ${branding.platformSubtitle}` : ''}`}
            >
              {logoSettings?.showInHeader !== false && logoUrl && !logoLoadError && (
                <div
                  className={`shrink-0 overflow-hidden bg-white border shadow-2xs flex items-center justify-center ${logoSettings?.borderRadius || 'rounded-xl'}`}
                  style={{
                    borderColor: 'var(--app-border-color)',
                    height: `${Math.min(Math.max(logoSettings?.displayHeight || 44, 32), 64)}px`,
                    width: `${Math.min(Math.max(logoSettings?.displayHeight || 44, 32), 64)}px`
                  }}
                >
                  <img
                    src={logoUrl}
                    alt={logoSettings?.altText || branding?.platformTitle || 'Website Logo'}
                    className={`w-full h-full ${logoSettings?.displayFit === 'contain' ? 'object-contain p-0.5' : 'object-cover'}`}
                    referrerPolicy="no-referrer"
                    loading="eager"
                    decoding="async"
                    onError={() => setLogoLoadError(true)}
                  />
                </div>
              )}

              <div className="flex flex-col justify-center min-w-0">
                {branding?.showWebsiteName !== false && (
                  <>
                    <span
                      className="font-extrabold tracking-tight transition-colors leading-tight truncate"
                      style={{
                        fontFamily: websiteNameFont,
                        fontSize: websiteNameResponsiveSize,
                        color: websiteNameCssColor
                      }}
                    >
                      {branding?.platformTitle || 'ISEZERANO ONLINE'}
                    </span>
                    {branding?.platformSubtitle && (
                      <span
                        className="font-semibold tracking-wider uppercase leading-none mt-0.5 text-[11px] sm:text-xs truncate"
                        style={{ color: 'var(--app-nav-link-active)' }}
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
                    style={{ color: 'var(--app-muted-text)' }}
                  >
                    {branding.websiteDescription}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Upper-Right Utilities: Notification Bell */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
            <NotificationBell onSelectAnnouncement={onSelectAnnouncement} />
          </div>
        </div>

        {/* TIER 2: NEWSPAPER CATEGORY NAVIGATION BAR (DYNAMICALLY LOADED FROM FIRESTORE) */}
        <div className="flex items-center min-h-[48px] py-1.5 overflow-x-auto no-scrollbar">
          <nav aria-label="News categories" className="flex items-center gap-2 sm:gap-3 min-w-max">
            <button
              type="button"
              onClick={() => handleCategoryClick('All Categories')}
              style={resolveCategoryNavItemStyle(
                'All Categories',
                categoryNav,
                isNewsFeedPage && selectedCategory === 'All Categories'
              )}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg border-b-2 transition-all cursor-pointer inline-flex items-center whitespace-nowrap shrink-0"
            >
              {allNewsLabel}
            </button>

            {resolvedCategories.map((category) => {
              const isCurrent = isNewsFeedPage && selectedCategory === category.name;
              return (
                <button
                  key={category.id || category.name}
                  type="button"
                  onClick={() => handleCategoryClick(category.name)}
                  style={resolveCategoryNavItemStyle(category.name, categoryNav, isCurrent)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg border-b-2 transition-all cursor-pointer inline-flex items-center whitespace-nowrap shrink-0"
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


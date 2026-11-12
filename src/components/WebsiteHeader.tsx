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
import { NotificationBell } from './NotificationBell';
import { PushAnnouncement } from '../types/announcement';

export type WebsitePage = 'home' | 'dashboard' | 'create' | 'saved' | 'settings' | 'nursery' | 'about' | 'contact' | 'privacy' | 'terms' | 'admin' | 'profile';

interface WebsiteHeaderProps {
  currentPage: string;
  onNavigate: (page: WebsitePage) => void;
  savedCount?: number;
  onSelectAnnouncement?: (announcement: PushAnnouncement) => void;
}

export const WebsiteHeader: React.FC<WebsiteHeaderProps> = ({
  currentPage,
  onNavigate,
  savedCount = 0,
  onSelectAnnouncement
}) => {
  const { language, setLanguage } = useLanguage();
  const { user, isAdmin, signInWithGoogle, signOutUser } = useAuth();
  const { colors, typography, branding, navigationMenus } = useWebsiteDesign();

  // Helper for dynamic navigation icons
  const renderNavIcon = (iconName?: string) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen className="w-3.5 h-3.5 text-teal-700" />;
      case 'Award': return <Award className="w-3.5 h-3.5 text-amber-600" />;
      case 'ShieldCheck': return <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />;
      case 'FileText': return <FileText className="w-3.5 h-3.5 text-teal-700" />;
      case 'GraduationCap': return <GraduationCap className="w-3.5 h-3.5 text-teal-700" />;
      case 'User': return <User className="w-3.5 h-3.5 text-slate-700" />;
      default: return null;
    }
  };

  // Header active items sorted by order
  const headerNavItems = (navigationMenus || [])
    .filter(item => item.enabled && (item.location === 'header' || item.location === 'both'))
    .sort((a, b) => a.order - b.order);

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
    <header 
      className="no-print sticky top-0 z-50 border-b shadow-2xs transition-colors backdrop-blur-md"
      style={{
        backgroundColor: colors.headerBg,
        borderColor: colors.headerBorder,
        color: colors.headerText
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* TIER 1: UPPER-LEFT BRANDING AREA (ABOVE NAVIGATION MENU) & UPPER-RIGHT UTILITIES */}
        <div className="flex items-center justify-between pt-3 sm:pt-4 pb-2 border-b border-slate-100/80">
          
          {/* Upper-Left Branding Area (Clean typography, no images/placeholders) */}
          <div 
            onClick={() => handleNavClick('home')}
            className="flex flex-col justify-center cursor-pointer group select-none min-w-0"
            title={`${branding?.platformTitle || 'ISEZERANO ONLINE'} – ${branding?.platformSubtitle || 'GS GITUMBA'}`}
          >
            <span 
              className="font-serif font-extrabold tracking-tight transition-colors leading-tight text-xl sm:text-2xl md:text-3xl"
              style={{ color: colors.headerText }}
            >
              {branding?.platformTitle || 'ISEZERANO ONLINE'}
            </span>
            <span 
              className="font-semibold tracking-wider uppercase leading-none mt-1 text-xs sm:text-sm text-teal-700"
              style={{ color: colors.navLinkActive }}
            >
              {branding?.platformSubtitle || 'GS GITUMBA'}
            </span>
          </div>

          {/* Upper-Right Utilities: Notification Bell, Language Switcher, User / Menu Button */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Notification Bell (FCM Push Announcements) */}
            <NotificationBell onSelectAnnouncement={onSelectAnnouncement} />

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
                  {/* User Profile Identity or Sign In Prompt */}
                  {user ? (
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 mb-1">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                          isAdmin ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-teal-100 text-teal-800 border-teal-200'
                        }`}>
                          {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {user.displayName || user.email?.split('@')[0] || (isAdmin ? 'Administrator' : 'Teacher')}
                            </p>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                              isAdmin ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900'
                            }`}>
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
                          onClick={() => handleNavClick('profile')}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200/80 transition-colors cursor-pointer text-left"
                        >
                          <User className="w-3.5 h-3.5 text-teal-700" />
                          <span>Profil ya Mwarimu (Teacher Profile)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsMenuOpen(false);
                          await signInWithGoogle();
                        }}
                        className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Injira na Google (Sign In)</span>
                      </button>
                    </div>
                  )}

                  {/* Section 1: Lesson Plan & Reports */}
                  <div className="px-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => handleNavClick('create')}
                      className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-teal-50 hover:text-teal-900 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-teal-700" />
                      <span>Lesson Plan (Gutegura Isomo)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavClick('nursery')}
                      className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-amber-50 hover:text-amber-900 rounded-xl transition-colors text-left cursor-pointer mt-0.5"
                    >
                      <Award className="w-4 h-4 text-amber-700" />
                      <span>Report Cards (Indangamanota)</span>
                    </button>
                  </div>

                  {/* Section 2: Administrator Portal */}
                  <div className="my-1 border-t border-slate-100" />
                  <div className="px-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => handleNavClick('admin')}
                      className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-700" />
                      <span>Admin Dashboard</span>
                    </button>
                  </div>

                  {/* Section 3: Sign Out */}
                  {user && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <div className="px-1.5 py-0.5">
                        <button
                          type="button"
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

        {/* TIER 2: NAVIGATION MENU BAR (SITTING DIRECTLY BELOW THE BRANDING AREA) */}
        <div className="flex items-center justify-between py-2 sm:py-2.5 overflow-x-auto no-scrollbar">
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {headerNavItems.map((item) => {
              const isCurrent = currentPage === item.path || 
                (item.path === 'dashboard' && (currentPage === 'create' || currentPage === 'saved' || currentPage === 'settings'));

              const isExternal = item.isExternal || item.path.startsWith('http://') || item.path.startsWith('https://');

              if (isExternal) {
                return (
                  <a
                    key={item.id}
                    href={item.path}
                    target={item.openInNewTab ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    style={{
                      fontSize: `${typography.navMenuSize}px`,
                      color: colors.headerText
                    }}
                    className="px-3 py-1.5 rounded-lg font-semibold transition-all hover:bg-slate-100 inline-flex items-center space-x-1.5 text-xs sm:text-sm whitespace-nowrap"
                  >
                    {renderNavIcon(item.icon)}
                    <span>{item.label}</span>
                  </a>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.path as WebsitePage)}
                  style={{
                    fontSize: `${typography.navMenuSize}px`,
                    color: isCurrent ? colors.navLinkActive : colors.headerText
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer inline-flex items-center space-x-1.5 text-xs sm:text-sm whitespace-nowrap ${
                    isCurrent
                      ? 'font-bold bg-slate-100 text-teal-800 shadow-2xs'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {renderNavIcon(item.icon)}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-extrabold bg-teal-100 text-teal-800">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

      </div>
    </header>
  );
};

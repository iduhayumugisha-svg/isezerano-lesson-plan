import React, { useState } from 'react';
import { 
  GraduationCap, 
  Menu, 
  X, 
  Globe, 
  LayoutDashboard,
  BookOpen, 
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  LogIn,
  LogOut,
  User,
  Newspaper
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { TopAnnouncementTicker } from './TopAnnouncementTicker';

export type WebsitePage = 'home' | 'dashboard' | 'create' | 'saved' | 'settings' | 'students' | 'about' | 'contact' | 'privacy' | 'terms' | 'admin' | 'blog';

interface WebsiteHeaderProps {
  currentPage: string;
  onNavigate: (page: WebsitePage) => void;
  savedCount?: number;
  onOpenAuthModal?: () => void;
}

export const WebsiteHeader: React.FC<WebsiteHeaderProps> = ({
  currentPage,
  onNavigate,
  savedCount = 0,
  onOpenAuthModal
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAdmin, signOutUser } = useAuth();
  const { logoUrl, logoSettings, colors, typography, branding } = useWebsiteDesign();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dismissAnnouncement, setDismissAnnouncement] = useState(false);

  const isEducationActive = ['dashboard', 'create', 'saved', 'settings', 'students'].includes(currentPage);

  // Clean public digital newspaper links
  const publicNavLinks: { id: WebsitePage; label: string; active: boolean; badge?: string }[] = [
    {
      id: 'home',
      label: 'Newspaper',
      active: currentPage === 'home'
    },
    {
      id: 'blog',
      label: 'News Archive',
      active: currentPage === 'blog'
    },
    {
      id: 'about',
      label: t.navAbout || 'About Us',
      active: currentPage === 'about'
    },
    {
      id: 'contact',
      label: t.navContact || 'Contact Us',
      active: currentPage === 'contact'
    }
  ];

  const handleNavClick = (page: WebsitePage) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* 1. Newspaper Brand & Logo */}
            <div 
              onClick={() => handleNavClick('home')}
              className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group select-none min-w-0 shrink"
              title={`${branding?.platformTitle || 'ISEZERANO ONLINE'} – Digital Newspaper`}
            >
              {logoSettings.showInHeader && (
                <div 
                  className={`overflow-hidden bg-slate-900 border border-slate-700/80 shadow-md flex items-center justify-center shrink-0 group-hover:scale-102 transition-all ${logoSettings.borderRadius}`}
                  style={{
                    height: `clamp(32px, 8vw, ${logoSettings.displayHeight}px)`,
                    width: `clamp(32px, 8vw, ${logoSettings.displayHeight}px)`
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
                  className="font-serif font-extrabold tracking-tight transition-colors leading-tight truncate text-base sm:text-lg md:text-xl"
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

            {/* 2. Desktop Public Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {publicNavLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  style={{
                    fontSize: `${typography.navMenuSize}px`,
                    color: link.active ? colors.navLinkActive : colors.headerText
                  }}
                  className={`px-3 py-2 rounded-lg font-semibold transition-all relative cursor-pointer ${
                    link.active
                      ? 'font-bold bg-slate-100/60 shadow-2xs'
                      : 'hover:opacity-80'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.active && (
                    <span 
                      className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" 
                      style={{ backgroundColor: colors.navLinkActive }}
                    />
                  )}
                </button>
              ))}

              {/* Protected Dashboard Link (Highlighted if logged in) */}
              <button
                onClick={() => handleNavClick('dashboard')}
                style={{
                  fontSize: `${typography.navMenuSize}px`
                }}
                className={`px-3 py-2 rounded-lg font-semibold transition-all inline-flex items-center space-x-1.5 cursor-pointer ${
                  isEducationActive
                    ? 'bg-teal-50 text-teal-900 font-bold border border-teal-200'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-teal-700" />
                <span>Education Dashboard</span>
                {user && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white ml-0.5" title="Logged in" />
                )}
              </button>
            </nav>

            {/* 3. Right Actions: Language Switcher & Authentication */}
            <div className="hidden sm:flex items-center space-x-2.5">
              
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

              {/* Admin Portal Button */}
              <button
                onClick={() => handleNavClick('admin')}
                className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  currentPage === 'admin'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title={isAdmin ? "Administrator Portal (Verified)" : "Administrator Gateway"}
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${currentPage === 'admin' ? 'text-teal-400' : isAdmin ? 'text-teal-600' : 'text-slate-500'}`} />
                <span>Admin</span>
                {isAdmin && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 ring-2 ring-white ml-0.5" />
                )}
              </button>

              {/* User Authentication Buttons */}
              {user ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 text-xs font-bold hover:bg-teal-100 cursor-pointer"
                    title={`Logged in as ${user.email}`}
                  >
                    <User className="w-3.5 h-3.5 text-teal-700" />
                    <span className="max-w-[120px] truncate">{user.displayName || user.email?.split('@')[0]}</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (onOpenAuthModal) onOpenAuthModal();
                    else handleNavClick('dashboard');
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-600 shadow-sm transition-all cursor-pointer ring-2 ring-teal-500/20"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Teacher Login</span>
                </button>
              )}

            </div>

            {/* Mobile Actions: Login/Dashboard & Menu */}
            <div className="flex items-center space-x-2 md:hidden">
              {user ? (
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-700 shadow-2xs"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (onOpenAuthModal) onOpenAuthModal();
                    else handleNavClick('dashboard');
                  }}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 shadow-2xs"
                >
                  <LogIn className="w-3.5 h-3.5 text-teal-400" />
                  <span>Login</span>
                </button>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
            
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3">
              Newspaper & Community
            </div>

            <div className="flex flex-col space-y-1">
              {publicNavLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                    link.active
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>

            {/* Protected Education Section */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1">
                Education Platform (CBC)
              </div>
              
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isEducationActive
                    ? 'bg-teal-50 text-teal-900 font-bold border border-teal-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <GraduationCap className="w-4 h-4 text-teal-700" />
                  <span>Teacher Dashboard</span>
                  {user && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => handleNavClick('admin')}
                className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors mt-1 ${
                  currentPage === 'admin'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Administrator Portal</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Mobile Footer Auth & Language */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                <Globe className="w-4 h-4 text-slate-500" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="en">English (EN)</option>
                  <option value="rw">Ikinyarwanda (RW)</option>
                  <option value="fr">Français (FR)</option>
                </select>
              </div>

              {user ? (
                <button
                  onClick={handleSignOut}
                  className="flex-1 inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onOpenAuthModal) onOpenAuthModal();
                    else handleNavClick('dashboard');
                  }}
                  className="flex-1 inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-teal-700 hover:bg-teal-600 shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Teacher Login</span>
                </button>
              )}
            </div>

          </div>
        )}
      </header>
    </>
  );
};

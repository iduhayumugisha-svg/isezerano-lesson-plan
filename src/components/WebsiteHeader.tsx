import React, { useState } from 'react';
import { 
  GraduationCap, 
  Menu, 
  X, 
  PlusCircle, 
  Globe, 
  LayoutDashboard,
  BookOpen, 
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';

export type WebsitePage = 'home' | 'dashboard' | 'create' | 'saved' | 'settings' | 'about' | 'contact' | 'privacy' | 'terms' | 'admin';

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
  const { isAdmin } = useAuth();
  const { logoUrl, logoSettings, colors, typography, branding } = useWebsiteDesign();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dismissAnnouncement, setDismissAnnouncement] = useState(false);

  const isLessonPlanActive = ['create', 'saved', 'settings'].includes(currentPage);

  const navLinks: { id: WebsitePage; label: string; active: boolean; badge?: string }[] = [
    {
      id: 'home',
      label: t.navHome || 'Home',
      active: currentPage === 'home'
    },
    {
      id: 'dashboard',
      label: t.navDashboard || 'Dashboard',
      active: currentPage === 'dashboard'
    },
    {
      id: 'create',
      label: t.navLessonPlan || 'Lesson Plan',
      active: isLessonPlanActive,
      badge: 'CBC'
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
    },
    {
      id: 'privacy',
      label: t.navPrivacy || 'Privacy Policy',
      active: currentPage === 'privacy'
    }
  ];

  const handleNavClick = (page: WebsitePage) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showAnnouncement = branding?.headerAnnouncementEnabled && branding?.headerAnnouncement && !dismissAnnouncement;

  return (
    <>
      {showAnnouncement && (
        <div 
          className="no-print w-full py-1.5 px-4 text-xs font-semibold flex items-center justify-between transition-colors z-50 border-b"
          style={{
            backgroundColor: colors.accentBg,
            borderColor: colors.cardBorder,
            color: colors.primaryButtonBg
          }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2 w-full text-center">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{branding.headerAnnouncement}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setDismissAnnouncement(true)}
            className="text-slate-400 hover:text-slate-700 ml-2 p-0.5 cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
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
            
            {/* Logo & Platform Name: Dynamic from Admin Branding */}
            <div 
              onClick={() => handleNavClick('home')}
              className="flex items-center space-x-3 cursor-pointer group select-none shrink-0"
              title={`${branding?.platformTitle || 'ISEZERANO ONLINE'} – ${branding?.platformSubtitle || 'GS GITUMBA'}`}
            >
              {/* Dynamic Custom or Default Logo */}
              {logoSettings.showInHeader && (
                <div 
                  className={`overflow-hidden bg-slate-900 border border-slate-700/80 shadow-md flex items-center justify-center shrink-0 group-hover:scale-102 transition-all ${logoSettings.borderRadius}`}
                  style={{
                    height: `${logoSettings.displayHeight}px`,
                    width: `${logoSettings.displayHeight}px`
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
              <div className="flex flex-col justify-center">
                <span 
                  className="font-bold tracking-tight transition-colors leading-tight"
                  style={{
                    fontSize: `${typography.websiteTitleSize}px`,
                    color: colors.headerText
                  }}
                >
                  {branding?.platformTitle || 'ISEZERANO ONLINE'}
                </span>
                <span 
                  className="font-semibold tracking-wider uppercase leading-none mt-0.5"
                  style={{
                    fontSize: `${typography.websiteSubtitleSize}px`,
                    color: colors.navLinkActive
                  }}
                >
                  {branding?.platformSubtitle || 'GS GITUMBA'}
                </span>
              </div>
            </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                style={{
                  fontSize: `${typography.navMenuSize}px`,
                  color: link.active ? colors.navLinkActive : colors.headerText
                }}
                className={`px-3 py-2 rounded-lg font-medium transition-all relative cursor-pointer ${
                  link.active
                    ? 'font-bold shadow-2xs'
                    : 'hover:opacity-80'
                }`}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                    {link.badge}
                  </span>
                )}
                {link.active && (
                  <span 
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" 
                    style={{ backgroundColor: colors.navLinkActive }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Right Actions: Language Switcher & Dashboard / Lesson Plan CTA */}
          <div className="hidden sm:flex items-center space-x-3">
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

            {/* Single Professional Admin Option */}
            <button
              onClick={() => handleNavClick('admin')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                currentPage === 'admin'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border-slate-200'
              }`}
              title={isAdmin ? "Administrator Portal (Logged In)" : "Administrator Portal"}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${currentPage === 'admin' ? 'text-teal-400' : isAdmin ? 'text-teal-600' : 'text-slate-500'}`} />
              <span>Admin</span>
              {isAdmin && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 ring-2 ring-white ml-0.5" title="Logged in as Administrator" />
              )}
            </button>

            {/* Quick Action Button: Go to Dashboard */}
            <button
              onClick={() => handleNavClick('dashboard')}
              style={{
                backgroundColor: colors.primaryButtonBg,
                color: colors.primaryButtonText,
                fontSize: `${typography.buttonSize}px`
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-98 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </button>
          </div>

          {/* Mobile Bar: Dashboard & Hamburger (Single clean action bar, no duplicate Admin) */}
          <div className="flex items-center space-x-2 md:hidden">

            <button
              onClick={() => handleNavClick('dashboard')}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-2xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-teal-400" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
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
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                  link.active
                    ? 'bg-teal-50 text-teal-900 font-bold border border-teal-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                      {link.badge}
                    </span>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 ${link.active ? 'text-teal-600' : 'text-slate-400'}`} />
              </button>
            ))}

            {/* Single Admin Option in Mobile Navigation */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => handleNavClick('admin')}
                className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  currentPage === 'admin'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-700 hover:bg-slate-50 border border-slate-200/80 bg-slate-50/40'
                }`}
                title={isAdmin ? "Administrator Portal (Logged In)" : "Administrator Portal"}
              >
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className={`w-4 h-4 ${currentPage === 'admin' ? 'text-teal-400' : isAdmin ? 'text-teal-600' : 'text-slate-500'}`} />
                  <span>Admin Portal</span>
                  {isAdmin && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                      Verified
                    </span>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 ${currentPage === 'admin' ? 'text-teal-400' : 'text-slate-400'}`} />
              </button>
            </div>
          </div>

          {/* Mobile Language and Primary Action */}
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

            <button
              onClick={() => handleNavClick('dashboard')}
              className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm"
            >
              <LayoutDashboard className="w-4 h-4 text-teal-400" />
              <span>Go to Dashboard</span>
            </button>
          </div>
        </div>
      )}
    </header>
    </>
  );
};

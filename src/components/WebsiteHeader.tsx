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

export type WebsitePage = 'home' | 'dashboard' | 'create' | 'saved' | 'settings' | 'about' | 'contact' | 'privacy' | 'admin';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <header className="no-print sticky top-0 z-50 bg-white/98 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Platform Name: ISEZERANO ONLINE – GS GITUMBA */}
          <div 
            onClick={() => handleNavClick('home')}
            className="flex items-center space-x-3 cursor-pointer group select-none shrink-0"
            title="ISEZERANO ONLINE – GS GITUMBA"
          >
            {/* Square/Rounded-Square Logo Container with Bible Image */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-md flex items-center justify-center shrink-0 group-hover:border-teal-500 group-hover:scale-102 transition-all">
              <img 
                src="/isezerano-online-logo.jpg" 
                alt="ISEZERANO ONLINE – GS GITUMBA Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 group-hover:text-teal-800 transition-colors leading-tight">
                ISEZERANO ONLINE
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-teal-700 tracking-wider uppercase leading-none mt-0.5">
                GS GITUMBA
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all relative cursor-pointer ${
                  link.active
                    ? 'text-teal-900 bg-teal-50 font-bold border border-teal-200/80 shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                    {link.badge}
                  </span>
                )}
                {link.active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-teal-600 rounded-full" />
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

            {/* Admin Manage Photos Button (Visible only to authorized administrator) */}
            {isAdmin && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                  currentPage === 'admin'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                }`}
                title="Manage Homepage Photos (Admin)"
              >
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Manage Photos</span>
              </button>
            )}

            {/* Quick Action Button: Go to Dashboard */}
            <button
              onClick={() => handleNavClick('dashboard')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all active:scale-98 cursor-pointer border border-slate-800"
            >
              <LayoutDashboard className="w-4 h-4 text-teal-400" />
              <span>Go to Dashboard</span>
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center space-x-2 md:hidden">
            {isAdmin && (
              <button
                onClick={() => handleNavClick('admin')}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-2xs"
                title="Manage Homepage Photos"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-900" />
                <span>Photos</span>
              </button>
            )}

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
            {isAdmin && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  currentPage === 'admin'
                    ? 'bg-amber-100 text-amber-950 border border-amber-400'
                    : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Manage Homepage Photos (Admin)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600" />
              </button>
            )}

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
  );
};

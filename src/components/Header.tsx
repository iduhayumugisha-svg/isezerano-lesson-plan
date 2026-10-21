import React from 'react';
import { 
  Menu, 
  Globe, 
  User as UserIcon, 
  LogIn, 
  LogOut, 
  Lock,
  ShieldCheck, 
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { SaasNavPage } from './Sidebar';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentPage: SaasNavPage;
  onOpenMobileMenu: () => void;
  onOpenAuth: () => void;
  isSidebarCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenMobileMenu,
  onOpenAuth,
  isSidebarCollapsed
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAdmin, signOutUser } = useAuth();

  const getPageTitle = (page: SaasNavPage): { title: string; subtitle: string } => {
    switch (page) {
      case 'create':
        return {
          title: 'Lesson Plan Generator',
          subtitle: 'Rwanda CBC Official 8-Column Curriculum Workspace'
        };
      case 'saved':
        return {
          title: t.savedPlansTitle || 'Saved Lesson Plans',
          subtitle: 'Browse, manage, print and export official PDF lesson plans'
        };
      case 'students':
        return {
          title: t.studentsIdTitle || 'Student Identification',
          subtitle: 'Learner enrollment, gender statistics, and class context'
        };
      case 'dashboard':
        return {
          title: t.navAllTools || 'Dashboard / All Tools',
          subtitle: 'Centralized education modules overview and curriculum reference'
        };
      case 'settings':
        return {
          title: t.settingsTitle || 'Settings & Cloud Sync',
          subtitle: 'Firebase Firestore connection, JSON backups, and security rules'
        };
      case 'admin':
        return {
          title: 'Admin Management Dashboard',
          subtitle: 'Platform controls, teacher accounts, and curriculum configuration'
        };
      default:
        return {
          title: 'ISEZERANO Lesson Plan',
          subtitle: 'Rwanda CBC SaaS'
        };
    }
  };

  const { title, subtitle } = getPageTitle(currentPage);

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Mobile hamburger menu & page title */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
              aria-label="Open sidebar navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  {title}
                </h1>
                {currentPage === 'admin' && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                    <span>Admin Mode</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block truncate max-w-md">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Right: Language Selector and User Account Menu */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Language Selector */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-50 hover:bg-slate-100 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 transition-colors">
              <Globe className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-600 shrink-0" />
              <label htmlFor="top-lang-select" className="text-[11px] font-semibold text-slate-600 hidden md:inline whitespace-nowrap">
                {t.languageLabel || 'Language'}:
              </label>
              <select
                id="top-lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                title="Language / Ururimi / Langue"
              >
                <option value="en">English (EN)</option>
                <option value="rw">Ikinyarwanda (RW)</option>
                <option value="fr">Français (FR)</option>
              </select>
            </div>

            {/* User Account Button / Modal Trigger */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {user.displayName || user.email.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 capitalize">
                    {user.role} • {user.schoolName || 'Rwanda'}
                  </span>
                </div>

                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs ${
                  user.role === 'admin'
                    ? 'bg-purple-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {user.displayName ? user.displayName.substring(0, 1).toUpperCase() : 'T'}
                </div>

                <button
                  onClick={() => signOutUser()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer border border-slate-200 shadow-2xs"
                title="Website Owner & Administrator Sign In"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Admin Login</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};

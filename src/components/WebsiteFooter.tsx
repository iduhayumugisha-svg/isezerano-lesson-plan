import React from 'react';
import { GraduationCap, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { WebsitePage } from './WebsiteHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface WebsiteFooterProps {
  onNavigate: (page: any) => void;
  onOpenAuth?: () => void;
}

export const WebsiteFooter: React.FC<WebsiteFooterProps> = ({ onNavigate, onOpenAuth }) => {
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();

  const handleLink = (page: WebsitePage) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="no-print bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          
          {/* Column 1: Brand & Purpose */}
          <div className="md:col-span-2 space-y-4">
            <div 
              onClick={() => handleLink('home')} 
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-md group-hover:border-teal-400 transition-all">
                <img 
                  src="/isezerano-online-logo.jpg" 
                  alt="ISEZERANO ONLINE – GS GITUMBA Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-lg font-bold text-white tracking-tight leading-tight">
                  ISEZERANO ONLINE
                </span>
                <span className="text-xs text-teal-400 font-semibold tracking-wider uppercase mt-0.5">
                  GS GITUMBA
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
              Developed by a Rwandan teacher serving at <strong className="text-white">GS GITUMBA</strong> (Buyoga Sector, Rulindo District, Northern Province) to support fellow educators in preparing well-structured CBC lesson plans aligned with REB & MINEDUC standards.
            </p>

            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Aligned with Rwanda Basic Education Board (REB) & MINEDUC Standards</span>
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Navigation
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button
                  onClick={() => handleLink('home')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {t.navHome || 'Home'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('dashboard')}
                  className="text-teal-400 hover:text-teal-300 font-medium transition-colors cursor-pointer inline-flex items-center space-x-1"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>{t.navDashboard || 'Dashboard'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('create')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {t.navLessonPlan || 'Lesson Plan Workspace'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('about')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {t.navAbout || 'About Us'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('contact')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {t.navContact || 'Contact Us'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('privacy')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {t.navPrivacy || 'Privacy Policy'}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Pedagogical Features */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Key Features
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Official 8-Column CBC Format</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Bloom's Taxonomy Objectives</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Clean Selectable A4 PDF Export</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Zero-Login Offline Auto-Save</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>English, Kinyarwanda & French</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Attribution */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span>© 2026 ISEZERANO ONLINE – GS GITUMBA. All rights reserved.</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleLink('dashboard')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <span>•</span>
            <button
              onClick={() => handleLink('privacy')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => handleLink('contact')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Contact Support
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (isAdmin) {
                  onNavigate('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else if (onOpenAuth) {
                  onOpenAuth();
                }
              }}
              className="hover:text-slate-300 transition-colors cursor-pointer text-slate-500 hover:text-slate-400"
              title="Administrator Management Access"
            >
              {user ? (isAdmin ? 'Admin Dashboard' : 'Account') : 'Admin Portal'}
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

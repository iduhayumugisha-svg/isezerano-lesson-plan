import React from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Info, 
  Mail, 
  Lock, 
  FileCheck, 
  Newspaper,
  BookOpen,
  MapPin
} from 'lucide-react';
import { WebsitePage } from './WebsiteHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';

interface WebsiteFooterProps {
  onNavigate: (page: any) => void;
  onOpenAuth?: () => void;
}

export const WebsiteFooter: React.FC<WebsiteFooterProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { logoUrl, logoSettings, colors, typography, branding } = useWebsiteDesign();

  const handleLink = (page: WebsitePage) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer 
      className="no-print border-t pt-12 pb-8 mt-auto transition-colors"
      style={{
        backgroundColor: colors.footerBg,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        color: colors.footerBodyText
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
          
          {/* Column 1: Brand & Institutional Purpose */}
          <div className="md:col-span-2 space-y-4">
            <div 
              onClick={() => handleLink('home')} 
              className="flex items-center space-x-3 cursor-pointer group"
            >
              {logoSettings.showInFooter && (
                <div 
                  className={`overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-md transition-all ${logoSettings.borderRadius}`}
                  style={{
                    height: `${Math.min(logoSettings.displayHeight, 44)}px`,
                    width: `${Math.min(logoSettings.displayHeight, 44)}px`
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
                  className="font-serif font-extrabold tracking-tight leading-tight"
                  style={{
                    fontSize: `${typography.websiteTitleSize - 2}px`,
                    color: colors.footerHeadingText
                  }}
                >
                  {branding?.platformTitle || 'ISEZERANO ONLINE'}
                </span>
                <span 
                  className="font-semibold tracking-wider uppercase mt-0.5 text-xs text-teal-400"
                  style={{ color: colors.footerLinkColor }}
                >
                  {branding?.platformSubtitle || 'GS GITUMBA'} • Digital Press & CBC Platform
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
              {branding?.footerTagline || 'Serving Rwandan educators and communities from GS GITUMBA (Buyoga Sector, Rulindo District, Northern Province). Providing pedagogical news, CBC curriculum guidance, and educational excellence.'}
            </p>

            <div className="space-y-1.5 pt-1 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Buyoga Sector, Rulindo District, Northern Province, Rwanda</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Aligned with Rwanda Basic Education Board (REB) & MINEDUC Standards</span>
              </div>
            </div>
          </div>

          {/* Column 2: Digital Newspaper Navigation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-1.5">
              <Newspaper className="w-3.5 h-3.5 text-teal-400" />
              <span>Digital Newsroom</span>
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('home')}
                  className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {t.navHome || 'Newspaper Homepage'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('blog')}
                  className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  News Archive & Articles
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('dashboard')}
                  className="text-teal-400 hover:text-teal-300 font-medium transition-colors cursor-pointer inline-flex items-center space-x-1"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Teacher Portal & Dashboard</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('create')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  CBC Lesson Plan Workspace
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Prominent Institutional Links (About Us, Contact Us, Privacy Policy, Terms) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-teal-400" />
              <span>About & Governance</span>
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('about')}
                  className="group flex items-center space-x-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 group-hover:scale-125 transition-transform" />
                  <span className="font-semibold text-white group-hover:underline">{t.navAbout || 'About Us'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('contact')}
                  className="group flex items-center space-x-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 group-hover:scale-125 transition-transform" />
                  <span className="font-semibold text-white group-hover:underline">{t.navContact || 'Contact Us'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('privacy')}
                  className="group flex items-center space-x-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 group-hover:scale-125 transition-transform" />
                  <span className="font-semibold text-white group-hover:underline">{t.navPrivacy || 'Privacy Policy'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('terms')}
                  className="group flex items-center space-x-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 group-hover:scale-125 transition-transform" />
                  <span className="font-semibold text-white group-hover:underline">Terms & Conditions</span>
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Prominent Institutional Links & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span>{branding?.footerCopyright || '© 2026 ISEZERANO ONLINE – GS GITUMBA. All rights reserved.'}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
            <button
              type="button"
              onClick={() => handleLink('about')}
              className="text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
            >
              About Us
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => handleLink('contact')}
              className="text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
            >
              Contact Us
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => handleLink('privacy')}
              className="text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => handleLink('terms')}
              className="text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
            >
              Terms & Conditions
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

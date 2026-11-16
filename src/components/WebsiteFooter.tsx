import React from 'react';
import {
  ShieldCheck,
  Info,
  Newspaper,
  Globe
} from 'lucide-react';
import { WebsitePage } from './WebsiteHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { resolveAllNewsLabel } from '../utils/categoryStyleUtils';

interface WebsiteFooterProps {
  onNavigate: (page: WebsitePage) => void;
}

export const WebsiteFooter: React.FC<WebsiteFooterProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { logoUrl, logoSettings, colors, typography, branding, navigationMenus } = useWebsiteDesign();
  const allNewsLabel = resolveAllNewsLabel(branding);

  const handleLink = (page: WebsitePage) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dynamic footer links filtered to valid news-only routes or external URLs
  const validInternalPages = new Set<string>(['home', 'blog', 'about', 'contact', 'privacy', 'terms', 'admin']);
  const footerNavItems = (navigationMenus || [])
    .filter((item) => {
      if (!item.enabled || (item.location !== 'footer' && item.location !== 'both')) return false;
      const isExternal = item.isExternal || item.path.startsWith('http://') || item.path.startsWith('https://');
      return isExternal || validInternalPages.has(item.path);
    })
    .sort((a, b) => a.order - b.order);

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

          {/* Column 1: Brand & Editorial Identity */}
          <div className="md:col-span-2 space-y-4">
            <div
              onClick={() => handleLink('home')}
              className="cursor-pointer group inline-flex items-center gap-3"
            >
              {logoSettings?.showInFooter !== false && logoUrl && (
                <div
                  className={`shrink-0 overflow-hidden bg-white/10 border border-white/15 flex items-center justify-center ${logoSettings?.borderRadius || 'rounded-xl'}`}
                  style={{
                    height: `${Math.min(Math.max(logoSettings?.displayHeight || 40, 28), 52)}px`,
                    width: `${Math.min(Math.max(logoSettings?.displayHeight || 40, 28), 52)}px`
                  }}
                >
                  <img
                    src={logoUrl}
                    alt={logoSettings?.altText || branding?.platformTitle || 'Website Logo'}
                    className={`w-full h-full ${logoSettings?.displayFit === 'contain' ? 'object-contain p-0.5' : 'object-cover'}`}
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {branding?.showWebsiteName !== false && (
                <div className="flex flex-col justify-center">
                  <span
                    className="font-extrabold tracking-tight leading-tight"
                    style={{
                      fontFamily:
                        typography?.websiteNameFontFamily ||
                        "'Times New Roman', Times, Baskerville, Georgia, serif",
                      fontSize: `clamp(16px, 4vw, ${Math.max(16, (Number(typography?.websiteNameSize) || 26) - 2)}px)`,
                      color: colors.footerHeadingText
                    }}
                  >
                    {branding?.platformTitle || 'ISEZERANO ONLINE'}
                  </span>
                  {branding?.platformSubtitle && (
                    <span
                      className="font-semibold tracking-wider uppercase mt-0.5 text-xs text-teal-400"
                      style={{ color: colors.footerLinkColor }}
                    >
                      {branding.platformSubtitle}
                    </span>
                  )}
                </div>
              )}
            </div>

            {branding?.showWebsiteDescription !== false && (
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
                {branding?.websiteDescription?.trim() || branding?.footerTagline || 'Trusted news, analysis, and timely stories for readers.'}
              </p>
            )}

            <div className="space-y-1.5 pt-1 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Independent Digital News &amp; Information Portal</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => handleLink('admin')}
                  className="hover:text-white transition-colors underline cursor-pointer"
                >
                  Admin Portal
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Newsroom Navigation (Configurable) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-1.5">
              <Newspaper className="w-3.5 h-3.5 text-teal-400" />
              <span>News &amp; Sections</span>
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              {footerNavItems.map((item) => {
                const isExternal = item.isExternal || item.path.startsWith('http://') || item.path.startsWith('https://');

                if (isExternal) {
                  return (
                    <li key={item.id}>
                      <a
                        href={item.path}
                        target={item.openInNewTab ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        className="text-slate-300 hover:text-white transition-colors inline-flex items-center space-x-1.5"
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-extrabold">
                            {item.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                }

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleLink(item.path as WebsitePage)}
                      className="text-slate-300 hover:text-white transition-colors cursor-pointer inline-flex items-center space-x-1.5 text-left"
                    >
                      <span>{item.id === 'nav-blog' && item.label === 'All News' ? allNewsLabel : item.label}</span>
                      {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                          item.badgeColor === 'amber'
                            ? 'bg-amber-400/20 text-amber-300'
                            : 'bg-teal-400/20 text-teal-300'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Column 3: Static Information Pages (About Us, Contact Us, Privacy Policy, Terms) */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-teal-400" />
              <span>About &amp; Governance</span>
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('about')}
                  className="group flex items-center space-x-2.5 text-white hover:text-teal-300 transition-colors cursor-pointer text-left"
                >
                  <span className="w-2 h-2 rounded-full bg-teal-400 group-hover:scale-125 transition-transform shrink-0" />
                  <span className="text-base sm:text-lg font-extrabold tracking-wide text-white group-hover:text-teal-300 group-hover:underline decoration-teal-400/70 underline-offset-4">
                    {t.navAbout || 'About Us'}
                  </span>
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
                  <span className="font-semibold text-white group-hover:underline">Terms &amp; Conditions</span>
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Links & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span>{branding?.footerCopyright || '© 2026 ISEZERANO ONLINE. All rights reserved.'}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
            <button
              type="button"
              onClick={() => handleLink('about')}
              className="text-sm font-bold text-white hover:text-teal-300 underline decoration-teal-400/60 underline-offset-4 transition-colors cursor-pointer"
            >
              {t.navAbout || 'About Us'}
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => handleLink('contact')}
              className="text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
            >
              {t.navContact || 'Contact Us'}
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => handleLink('privacy')}
              className="text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
            >
              {t.navPrivacy || 'Privacy Policy'}
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => handleLink('terms')}
              className="text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
            >
              {t.navTerms || 'Terms & Conditions'}
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

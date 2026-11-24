import React from 'react';
import {
  ShieldCheck,
  FileText,
  Newspaper,
  Globe
} from 'lucide-react';
import { WebsitePage } from './WebsiteHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { resolveAllNewsLabel } from '../utils/categoryStyleUtils';
import { scrollMainContentToTop } from '../utils/scrollUtils';

interface WebsiteFooterProps {
  onNavigate: (page: WebsitePage) => void;
}

const isLegacyAboutFooterItem = (item: { id?: string; path?: string; label?: string }): boolean => {
  const id = (item.id || '').trim().toLowerCase();
  const path = (item.path || '').trim().toLowerCase();
  const label = (item.label || '').trim();
  if (id === 'nav-about' || path === 'about') return true;
  if (/ibyerekeye|gs\s*gitumba|^about(\s+us)?$/i.test(label)) return true;
  return false;
};

export const WebsiteFooter: React.FC<WebsiteFooterProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { logoUrl, logoSettings, colors, typography, branding, navigationMenus } = useWebsiteDesign();
  const allNewsLabel = resolveAllNewsLabel(branding);

  const handleLink = (page: WebsitePage) => {
    onNavigate(page);
    scrollMainContentToTop('auto');
  };

  // Dynamic footer links filtered to valid news-only routes or external URLs (never rendering About/Ibyerekeye)
  const validInternalPages = new Set<string>(['home', 'blog', 'contact', 'privacy', 'terms', 'admin']);
  const footerNavItems = (navigationMenus || [])
    .filter((item) => {
      if (!item.enabled || (item.location !== 'footer' && item.location !== 'both')) return false;
      if (isLegacyAboutFooterItem(item)) return false;
      const isExternal = item.isExternal || item.path.startsWith('http://') || item.path.startsWith('https://');
      return isExternal || validInternalPages.has(item.path);
    })
    .sort((a, b) => a.order - b.order);

  return (
    <footer
      className="no-print border-t pt-12 pb-8 mt-auto transition-colors"
      style={{
        backgroundColor: 'var(--app-footer-bg)',
        borderColor: 'var(--app-border-color)',
        color: 'var(--app-footer-body-text)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main 4-Column Responsive Grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b"
          style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}
        >

          {/* Column 1: Brand & Editorial Identity */}
          <div className="sm:col-span-2 space-y-4">
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
                      color: 'var(--app-footer-heading-text)'
                    }}
                  >
                    {branding?.platformTitle || 'ISEZERANO ONLINE'}
                  </span>
                  {branding?.platformSubtitle && (
                    <span
                      className="font-semibold tracking-wider uppercase mt-0.5 text-xs"
                      style={{ color: 'var(--app-footer-link-color)' }}
                    >
                      {branding.platformSubtitle}
                    </span>
                  )}
                </div>
              )}
            </div>

            {branding?.showWebsiteDescription !== false && (
              <p
                className="text-xs sm:text-sm leading-relaxed max-w-md"
                style={{ color: 'var(--app-footer-body-text)' }}
              >
                {branding?.websiteDescription?.trim() || branding?.footerTagline || 'Trusted news, analysis, and timely stories for readers.'}
              </p>
            )}

            <div className="space-y-1.5 pt-1 text-xs" style={{ color: 'var(--app-footer-body-text)' }}>
              <div className="flex items-center space-x-2">
                <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--app-footer-link-color)' }} />
                <span>Independent Digital News &amp; Information Portal</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--app-footer-link-color)' }} />
                <button
                  type="button"
                  onClick={() => handleLink('admin')}
                  className="hover:opacity-90 transition-opacity underline cursor-pointer"
                  style={{ color: 'var(--app-footer-link-color)' }}
                >
                  Admin Portal
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Newsroom Navigation (Configurable) */}
          <div className="space-y-3">
            <h3
              className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5"
              style={{ color: 'var(--app-footer-heading-text)' }}
            >
              <Newspaper className="w-3.5 h-3.5" style={{ color: 'var(--app-footer-link-color)' }} />
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
                        className="hover:opacity-85 transition-opacity inline-flex items-center space-x-1.5"
                        style={{ color: 'var(--app-footer-body-text)' }}
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
                      className="hover:opacity-85 transition-opacity cursor-pointer inline-flex items-center space-x-1.5 text-left"
                      style={{ color: 'var(--app-footer-body-text)' }}
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

          {/* Column 3: Contact & Legal Pages */}
          <div className="space-y-3">
            <h3
              className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5"
              style={{ color: 'var(--app-footer-heading-text)' }}
            >
              <FileText className="w-3.5 h-3.5" style={{ color: 'var(--app-footer-link-color)' }} />
              <span>Contact &amp; Legal</span>
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('contact')}
                  className="group flex items-center space-x-2 hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ color: 'var(--app-footer-heading-text)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full group-hover:scale-125 transition-transform" style={{ backgroundColor: 'var(--app-footer-link-color)' }} />
                  <span className="font-semibold group-hover:underline">{t.navContact || 'Contact Us'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('privacy')}
                  className="group flex items-center space-x-2 hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ color: 'var(--app-footer-heading-text)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full group-hover:scale-125 transition-transform" style={{ backgroundColor: 'var(--app-footer-link-color)' }} />
                  <span className="font-semibold group-hover:underline">{t.navPrivacy || 'Privacy Policy'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('terms')}
                  className="group flex items-center space-x-2 hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ color: 'var(--app-footer-heading-text)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full group-hover:scale-125 transition-transform" style={{ backgroundColor: 'var(--app-footer-link-color)' }} />
                  <span className="font-semibold group-hover:underline">{t.navTerms || 'Terms & Conditions'}</span>
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Links & Copyright */}
        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{ color: 'var(--app-footer-body-text)' }}
        >
          <div>
            <span>{branding?.footerCopyright || '© 2026 ISEZERANO ONLINE. All rights reserved.'}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
            <button
              type="button"
              onClick={() => handleLink('contact')}
              className="hover:opacity-90 font-medium transition-opacity cursor-pointer"
              style={{ color: 'var(--app-footer-heading-text)' }}
            >
              {t.navContact || 'Contact Us'}
            </button>
            <span className="opacity-50">•</span>
            <button
              type="button"
              onClick={() => handleLink('privacy')}
              className="hover:opacity-90 font-medium transition-opacity cursor-pointer"
              style={{ color: 'var(--app-footer-heading-text)' }}
            >
              {t.navPrivacy || 'Privacy Policy'}
            </button>
            <span className="opacity-50">•</span>
            <button
              type="button"
              onClick={() => handleLink('terms')}
              className="hover:opacity-90 font-medium transition-opacity cursor-pointer"
              style={{ color: 'var(--app-footer-heading-text)' }}
            >
              {t.navTerms || 'Terms & Conditions'}
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  LayoutDashboard,
  PlusCircle, 
  FileCheck2, 
  Printer, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  BookOpen, 
  Clock, 
  Layers, 
  ShieldCheck, 
  Laptop
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { WebsitePage } from '../components/WebsiteHeader';
import { HeroSlider } from '../components/HeroSlider';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { 
  getPageContent, 
  subscribeToPageContent, 
  DEFAULT_PAGES_CONTENT 
} from '../services/websitePagesService';
import { WebsitePageContent } from '../types/websitePages';

interface HomeViewProps {
  onNavigate: (page: WebsitePage) => void;
  savedPlansCount: number;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, savedPlansCount }) => {
  const { t } = useLanguage();
  const { colors, typography, branding } = useWebsiteDesign();
  const [content, setContent] = useState<WebsitePageContent>(DEFAULT_PAGES_CONTENT.home);

  useEffect(() => {
    // 1. Initial load
    getPageContent('home').then((data) => {
      if (data) setContent(data);
    });

    // 2. Real-time subscription across all devices
    const unsubscribe = subscribeToPageContent('home', (updated) => {
      if (updated) setContent(updated);
    });

    // 3. Listen to local save events
    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ pageId: string; page: WebsitePageContent }>;
      if (customEvent.detail?.pageId === 'home' && customEvent.detail.page) {
        setContent(customEvent.detail.page);
      }
    };
    window.addEventListener('website_pages_updated', handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('website_pages_updated', handleLocalUpdate);
    };
  }, []);

  const featureIcons = [FileCheck2, Sparkles, Printer, Laptop];

  return (
    <div className="space-y-16 sm:space-y-20 pb-16">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 sm:pt-10">
        
        {/* Homepage Hero Slider: positioned directly above the heading */}
        <div className="px-4">
          <HeroSlider onNavigate={onNavigate} />
        </div>

        {/* Subtle decorative background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-slate-100/80 via-slate-50/40 to-transparent -z-10 rounded-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 px-4">
          
          {/* Official Badge (Configurable from Website Pages Manager) */}
          {content.badge && (
            <div 
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-2xs border transition-colors"
              style={{
                backgroundColor: colors.accentBadgeBg,
                color: colors.accentBadgeText,
                borderColor: colors.cardBorder
              }}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: colors.accentBadgeText }} />
              <span>{content.badge}</span>
            </div>
          )}

          {/* Main Headline (Configurable from Website Pages Manager) */}
          <h1 
            className="tracking-tight leading-tight sm:leading-tight transition-colors"
            style={{
              fontSize: `${typography.h1Size}px`,
              fontWeight: typography.headingWeight === 'bold' ? 700 : 600,
              color: colors.headingPrimary
            }}
          >
            {content.title}
          </h1>

          {/* Description (Configurable from Website Pages Manager) */}
          <p 
            className="max-w-3xl mx-auto leading-relaxed font-normal transition-colors"
            style={{
              fontSize: `${typography.bodySize + 2}px`,
              color: colors.bodyText
            }}
          >
            {content.subtitle}
          </p>

          {/* About the platform / Classroom Card (Configurable from Website Pages Manager) */}
          {content.highlightBox?.enabled && (
            <div 
              className="max-w-3xl mx-auto rounded-2xl p-4 sm:p-5 shadow-2xs text-left sm:text-center space-y-1.5 border transition-colors"
              style={{
                backgroundColor: colors.cardBg,
                borderColor: colors.cardBorder
              }}
            >
              {content.highlightBox.badge && (
                <div 
                  className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider"
                  style={{ color: colors.navLinkActive }}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>{content.highlightBox.badge}</span>
                </div>
              )}
              <h3 
                className="text-sm font-bold"
                style={{ color: colors.headingPrimary }}
              >
                {content.highlightBox.title}
              </h3>
              <p 
                className="text-xs sm:text-sm leading-relaxed font-normal whitespace-pre-line"
                style={{ color: colors.mutedText }}
              >
                {content.highlightBox.content}
              </p>
            </div>
          )}

          {/* Call-to-Actions (Connected to Admin Theme Colors) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              onClick={() => onNavigate('dashboard')}
              style={{
                backgroundColor: colors.primaryButtonBg,
                color: colors.primaryButtonText,
                fontSize: `${typography.buttonSize}px`
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-8 py-3.5 rounded-xl font-semibold shadow-sm transition-all active:scale-98 cursor-pointer ring-4 ring-teal-500/20"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('create')}
              style={{
                backgroundColor: colors.accentBg,
                color: colors.navLinkActive,
                borderColor: colors.cardBorder,
                fontSize: `${typography.buttonSize}px`
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-semibold border shadow-2xs transition-all hover:opacity-90 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Lesson Plan</span>
            </button>
          </div>

          {/* Trust Highlights */}
          <div 
            className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold"
            style={{ color: colors.mutedText }}
          >
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" style={{ color: colors.navLinkActive }} />
              <span>Official 8-Column Format</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" style={{ color: colors.navLinkActive }} />
              <span>Clean A4 Selectable PDF Export</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" style={{ color: colors.navLinkActive }} />
              <span>Zero-Barrier Teacher Access</span>
            </div>
          </div>
        </div>

        {/* 2. OVERVIEW HIGHLIGHT CARD */}
        <div className="max-w-4xl mx-auto mt-12 px-4">
          <div 
            className="rounded-2xl border p-6 shadow-sm space-y-4 transition-colors"
            style={{
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.secondaryButtonBg }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primaryButtonBg }} />
                <span 
                  className="text-xs font-bold pl-1 uppercase tracking-wider"
                  style={{ color: colors.headingPrimary }}
                >
                  Platform Workspace Overview
                </span>
              </div>
              <button
                onClick={() => onNavigate('dashboard')}
                className="text-xs font-semibold inline-flex items-center space-x-1 hover:underline cursor-pointer"
                style={{ color: colors.linkColor }}
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div 
                onClick={() => onNavigate('create')}
                className="p-4 rounded-xl border transition-all cursor-pointer group space-y-2"
                style={{
                  backgroundColor: colors.bodyBg,
                  borderColor: colors.cardBorder
                }}
              >
                <div className="flex items-center justify-between">
                  <span 
                    className="text-xs font-bold group-hover:opacity-80"
                    style={{ color: colors.headingPrimary }}
                  >
                    1. Create Lesson Plan
                  </span>
                  <PlusCircle className="w-4 h-4" style={{ color: colors.navLinkActive }} />
                </div>
                <p className="text-xs leading-relaxed" style={{ color: colors.mutedText }}>
                  Design official 8-column CBC lesson plans with competencies, steps, timing, and evaluations.
                </p>
              </div>

              <div 
                onClick={() => onNavigate('saved')}
                className="p-4 rounded-xl border transition-all cursor-pointer group space-y-2"
                style={{
                  backgroundColor: colors.bodyBg,
                  borderColor: colors.cardBorder
                }}
              >
                <div className="flex items-center justify-between">
                  <span 
                    className="text-xs font-bold group-hover:opacity-80"
                    style={{ color: colors.headingPrimary }}
                  >
                    2. Saved Plans ({savedPlansCount})
                  </span>
                  <FileCheck2 className="w-4 h-4" style={{ color: colors.navLinkActive }} />
                </div>
                <p className="text-xs leading-relaxed" style={{ color: colors.mutedText }}>
                  Reopen, edit, duplicate, and print clean selectable-text PDFs formatted for school inspections.
                </p>
              </div>

              <div 
                onClick={() => onNavigate('settings')}
                className="p-4 rounded-xl border transition-all cursor-pointer group space-y-2"
                style={{
                  backgroundColor: colors.bodyBg,
                  borderColor: colors.cardBorder
                }}
              >
                <div className="flex items-center justify-between">
                  <span 
                    className="text-xs font-bold group-hover:opacity-80"
                    style={{ color: colors.headingPrimary }}
                  >
                    3. School Preferences
                  </span>
                  <ShieldCheck className="w-4 h-4" style={{ color: colors.navLinkActive }} />
                </div>
                <p className="text-xs leading-relaxed" style={{ color: colors.mutedText }}>
                  Save your default school name, academic year, and language for faster weekly preparation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE BENEFITS SECTION (Editable from Admin Website Pages Manager) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-10">
          <h2 
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: colors.navLinkActive }}
          >
            Why Rwandan Educators Trust {branding?.platformTitle || 'ISEZERANO ONLINE'}
          </h2>
          <p 
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: colors.headingPrimary }}
          >
            Designed for Real Rwandan Classroom Realities
          </p>
          <p className="text-sm" style={{ color: colors.mutedText }}>
            Standardized, inspector-ready lesson preparation without repetitive manual table formatting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {content.sections && content.sections.map((section, idx) => {
            const Icon = featureIcons[idx % featureIcons.length] || FileCheck2;
            return (
              <div 
                key={section.id || idx}
                className="rounded-2xl p-6 border shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                style={{
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder
                }}
              >
                <div className="space-y-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                    style={{
                      backgroundColor: idx % 2 === 0 ? colors.accentBg : colors.bodyBg,
                      color: colors.primaryButtonBg
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: colors.navLinkActive }} />
                  </div>
                  <h3 
                    className="text-base font-bold"
                    style={{ color: colors.headingPrimary }}
                  >
                    {section.title}
                  </h3>
                  <p 
                    className="text-xs leading-relaxed whitespace-pre-line"
                    style={{ color: colors.mutedText }}
                  >
                    {section.content}
                  </p>
                </div>

                {section.bullets && section.bullets.length > 0 && (
                  <div 
                    className="pt-4 mt-4 border-t text-xs font-bold flex flex-wrap gap-1"
                    style={{ 
                      borderColor: colors.cardBorder,
                      color: colors.navLinkActive 
                    }}
                  >
                    {section.bullets.map((b, bIdx) => (
                      <span key={bIdx} className="mr-2">✓ {b}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. CALL TO ACTION BANNER (Dynamic styling) */}
      <section className="max-w-5xl mx-auto px-4">
        <div 
          className="rounded-2xl p-8 sm:p-12 text-center space-y-6 border shadow-md transition-colors"
          style={{
            backgroundColor: colors.secondaryButtonBg,
            borderColor: colors.cardBorder,
            color: colors.secondaryButtonText
          }}
        >
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto border"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: colors.footerLinkColor
            }}
          >
            <GraduationCap className="w-7 h-7" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Ready to Begin Preparing Your Lessons?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Open the centralized dashboard to create new CBC lesson plans, manage saved records, and export documents.
          </p>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('dashboard')}
              style={{
                backgroundColor: colors.primaryButtonBg,
                color: colors.primaryButtonText
              }}
              className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl text-base font-bold shadow-sm transition-all active:scale-98 cursor-pointer hover:opacity-90"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

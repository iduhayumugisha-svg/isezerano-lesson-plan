import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  LayoutDashboard,
  FileText,
  Sparkles
} from 'lucide-react';
import { WebsitePage } from '../components/WebsiteHeader';
import { WebsitePageContent, EditablePageId } from '../types/platform';
import { getPageContent, subscribeToPageContent, DEFAULT_PAGES_CONTENT } from '../services/websitePagesService';

interface InfoPageProps {
  onNavigate: (page: WebsitePage) => void;
}

function useCmsPageContent(pageId: Extract<EditablePageId, 'about' | 'privacy' | 'terms'>) {
  const [content, setContent] = useState<WebsitePageContent>(DEFAULT_PAGES_CONTENT[pageId]);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const data = await getPageContent(pageId);
        setContent(data);
      } catch {
        // retain default
      }
    };

    loadContent();
    const unsubscribe = subscribeToPageContent(pageId, (page) => {
      setContent(page);
    });

    const handleUpdate = (e: any) => {
      if (e.detail?.pageId === pageId) {
        if (e.detail.page) {
          setContent(e.detail.page);
        } else {
          loadContent();
        }
      }
    };

    window.addEventListener('website_pages_updated', handleUpdate);
    return () => {
      unsubscribe();
      window.removeEventListener('website_pages_updated', handleUpdate);
    };
  }, [pageId]);

  return content;
}

export const AboutView: React.FC<InfoPageProps> = ({ onNavigate }) => {
  const content = useCmsPageContent('about');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-14">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        {content.badge && (
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-teal-700" />
            <span>{content.badge}</span>
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
          {content.title}
        </h1>
        {content.subtitle && (
          <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-normal">
            {content.subtitle}
          </p>
        )}
      </div>

      {content.highlightBox?.enabled && (
        <div className="bg-slate-900 rounded-2xl p-6 sm:p-10 border border-slate-800 text-white shadow-sm space-y-4">
          {content.highlightBox.badge && (
            <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
              <GraduationCap className="w-5 h-5 text-teal-400" />
              <span>{content.highlightBox.badge}</span>
            </div>
          )}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {content.highlightBox.title}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal whitespace-pre-line">
            {content.highlightBox.content}
          </p>
        </div>
      )}

      <div className="space-y-8">
        {content.sections.map((section, idx) => (
          <div
            key={section.id || idx}
            className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-2xs space-y-5"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 flex items-center justify-center text-xs font-bold shrink-0">
                {idx + 1}
              </span>
              <span>{section.title}</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
              {section.content}
            </p>

            {section.bullets && section.bullets.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                {section.bullets.map((bullet, bIdx) => (
                  <div key={bIdx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-2.5 text-xs sm:text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{bullet}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Curriculum Standards Supported:
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span><strong>Grades & Levels:</strong> Full coverage of Primary (P1 to P6) and Secondary (S1 to S6) levels.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span><strong>Objectives Structure:</strong> Bloom&apos;s Taxonomy categorization (Knowledge & Understanding, Skills, Attitudes & Values).</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span><strong>CBC Generic Competences:</strong> Critical Thinking, Creativity & Innovation, Research & Problem Solving, Communication, Cooperation, and Lifelong Learning.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span><strong>Cross-Cutting Issues:</strong> Gender Education, Environment & Sustainability, Peace & Values, Comprehensive Sexuality Education, and Financial Education.</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <button
          onClick={() => onNavigate('dashboard')}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all active:scale-98 cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4 text-teal-400" />
          <span>Go to Dashboard</span>
        </button>

        <button
          onClick={() => onNavigate('create')}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-sm font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-300 transition-all cursor-pointer"
        >
          <span>Create Lesson Plan</span>
          <ArrowRight className="w-4 h-4 text-teal-700" />
        </button>
      </div>
    </div>
  );
};

export const PrivacyPolicyView: React.FC<InfoPageProps> = ({ onNavigate }) => {
  const content = useCmsPageContent('privacy');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <div className="space-y-4 border-b border-slate-200 pb-8 text-center sm:text-left">
        {content.badge && (
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
            <span>{content.badge}</span>
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          {content.title}
        </h1>
        {content.subtitle && (
          <p className="text-sm text-slate-500">
            {content.subtitle}
          </p>
        )}
      </div>

      {content.highlightBox?.enabled && (
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-slate-900">
            <AlertTriangle className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{content.highlightBox.title}</span>
          </div>
          <p className="leading-relaxed whitespace-pre-line">
            {content.highlightBox.content}
          </p>
        </div>
      )}

      <div className="space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
        {content.sections.map((section, idx) => (
          <section key={section.id || idx} className="space-y-3 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 flex items-center justify-center text-xs font-bold shrink-0">
                {idx + 1}
              </span>
              <span>{section.title}</span>
            </h2>
            <p className="whitespace-pre-line leading-relaxed text-slate-600">
              {section.content}
            </p>

            {section.bullets && section.bullets.length > 0 && (
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 pt-2">
                {section.bullets.map((b, bIdx) => (
                  <li key={bIdx} className="leading-relaxed">{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          Have questions regarding privacy or data rights?
        </p>
        <button
          onClick={() => onNavigate('contact')}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
        >
          <span>Contact the GS GITUMBA Team</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const TermsConditionsView: React.FC<InfoPageProps> = ({ onNavigate }) => {
  const content = useCmsPageContent('terms');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        {content.badge && (
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5 text-teal-700" />
            <span>{content.badge}</span>
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
          {content.title}
        </h1>
        {content.subtitle && (
          <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-normal">
            {content.subtitle}
          </p>
        )}
      </div>

      {content.highlightBox?.enabled && (
        <div className="bg-slate-900 rounded-2xl p-6 sm:p-10 border border-slate-800 text-white shadow-sm space-y-4">
          {content.highlightBox.badge && (
            <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>{content.highlightBox.badge}</span>
            </div>
          )}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {content.highlightBox.title}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal whitespace-pre-line">
            {content.highlightBox.content}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {content.sections.map((section, idx) => (
          <div key={section.id || idx} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 flex items-center justify-center text-xs font-bold shrink-0">
                {idx + 1}
              </span>
              <span>{section.title}</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
              {section.content}
            </p>

            {section.bullets && section.bullets.length > 0 && (
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600 pt-1">
                {section.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} className="leading-relaxed">{bullet}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-lg font-bold">Ready to Prepare Your CBC Lesson Plan?</h3>
          <p className="text-xs sm:text-sm text-teal-200">
            Open the official 8-column Rwanda lesson planner with immediate zero-barrier access.
          </p>
        </div>
        <button
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all cursor-pointer shrink-0"
        >
          <span>Open Lesson Plan Hub</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

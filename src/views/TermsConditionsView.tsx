import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  GraduationCap, 
  Sparkles, 
  BookOpen, 
  ArrowRight,
  Layers,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { WebsitePage } from '../components/WebsiteHeader';
import { WebsitePageContent } from '../types/websitePages';
import { getPageContent, subscribeToPageContent, DEFAULT_PAGES_CONTENT } from '../services/websitePagesService';

interface TermsConditionsViewProps {
  onNavigate: (page: WebsitePage) => void;
}

export const TermsConditionsView: React.FC<TermsConditionsViewProps> = ({ onNavigate }) => {
  const [content, setContent] = useState<WebsitePageContent>(DEFAULT_PAGES_CONTENT.terms);

  useEffect(() => {
    loadContent();

    // Attach real-time Firestore listener for cross-device updates
    const unsubscribe = subscribeToPageContent('terms', (page) => {
      setContent(page);
    });

    const handleUpdate = (e: any) => {
      if (e.detail?.pageId === 'terms') {
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
  }, []);

  const loadContent = async () => {
    try {
      const data = await getPageContent('terms');
      setContent(data);
    } catch {
      // keep default
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* 1. Header */}
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

      {/* 2. Highlight Callout Box */}
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

      {/* 3. Sections */}
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

      {/* 4. Bottom Link to Lesson Generator */}
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

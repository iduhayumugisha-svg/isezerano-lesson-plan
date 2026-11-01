import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Database, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  HardDrive, 
  Cloud, 
  LayoutDashboard,
  ArrowRight
} from 'lucide-react';
import { WebsitePage } from '../components/WebsiteHeader';
import { WebsitePageContent } from '../types/websitePages';
import { getPageContent, subscribeToPageContent, DEFAULT_PAGES_CONTENT } from '../services/websitePagesService';

interface PrivacyPolicyViewProps {
  onNavigate: (page: WebsitePage) => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onNavigate }) => {
  const [content, setContent] = useState<WebsitePageContent>(DEFAULT_PAGES_CONTENT.privacy);

  useEffect(() => {
    loadContent();

    // Attach real-time Firestore listener for cross-device updates
    const unsubscribe = subscribeToPageContent('privacy', (page) => {
      setContent(page);
    });

    const handleUpdate = (e: any) => {
      if (e.detail?.pageId === 'privacy') {
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
      const data = await getPageContent('privacy');
      setContent(data);
    } catch {
      // keep default
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      
      {/* 1. Header */}
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

      {/* 2. Platform Owner Review / Highlight Callout Box */}
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

      {/* 3. Privacy Sections */}
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

      {/* 4. Bottom Link */}
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

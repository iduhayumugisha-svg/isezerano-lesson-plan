import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  ShieldCheck, 
  Target, 
  Users, 
  Sparkles, 
  ArrowRight,
  Layers,
  LayoutDashboard
} from 'lucide-react';
import { WebsitePage } from '../components/WebsiteHeader';
import { WebsitePageContent } from '../types/websitePages';
import { getPageContent, subscribeToPageContent, DEFAULT_PAGES_CONTENT } from '../services/websitePagesService';

interface AboutViewProps {
  onNavigate: (page: WebsitePage) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  const [content, setContent] = useState<WebsitePageContent>(DEFAULT_PAGES_CONTENT.about);

  useEffect(() => {
    loadContent();

    // Attach real-time Firestore listener for cross-device updates
    const unsubscribe = subscribeToPageContent('about', (page) => {
      setContent(page);
    });

    // In-tab event listener
    const handleUpdate = (e: any) => {
      if (e.detail?.pageId === 'about') {
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
      const data = await getPageContent('about');
      setContent(data);
    } catch {
      // retain default
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-14">
      
      {/* 1. Header Section */}
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

      {/* 2. Built by a Rwandan Teacher / Highlight Section */}
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

      {/* 3. Dynamic Structured Sections */}
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

      {/* 4. Supported Framework Details (MINEDUC & REB Standards) */}
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
            <span><strong>Objectives Structure:</strong> Bloom's Taxonomy categorization (Knowledge & Understanding, Skills, Attitudes & Values).</span>
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

      {/* 5. Direct CTA */}
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

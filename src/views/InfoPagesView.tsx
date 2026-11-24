import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Sparkles
} from 'lucide-react';
import { WebsitePage } from '../components/WebsiteHeader';
import { WebsitePageContent, EditablePageId } from '../types/platform';
import {
  getPageContent,
  subscribeToPageContent,
  DEFAULT_PAGES_CONTENT,
  hasStaticPageContent,
  isRichHtmlEmpty,
  sanitizeStaticPageHtml
} from '../services/websitePagesService';

interface InfoPageProps {
  onNavigate?: (page: WebsitePage) => void;
}

export const StaticPageRichBody: React.FC<{ html?: string }> = ({ html }) => {
  const cleanHtml = sanitizeStaticPageHtml(html || '');
  if (!cleanHtml || isRichHtmlEmpty(cleanHtml)) {
    return null;
  }

  return (
    <div
      className="blog-article-body theme-card border shadow-2xs text-base sm:text-[17px] leading-[1.75] space-y-4 [&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2.5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1.5 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-5 [&_a]:underline [&_hr]:my-6"
      style={{ padding: 'var(--app-space-card)' }}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};

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

const EmptyInfoPageState: React.FC<{ title: string }> = ({ title }) => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-6">
    <div className="border-b pb-6 text-center sm:text-left" style={{ borderColor: 'var(--app-border-color)' }}>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--app-heading-primary)' }}>
        {title}
      </h1>
    </div>
    <div className="theme-card border shadow-2xs text-center" style={{ padding: 'var(--app-space-card)' }}>
      <p className="text-sm" style={{ color: 'var(--app-muted-text)' }}>
        No content has been published for this page yet.
      </p>
    </div>
  </div>
);

export const AboutView: React.FC<InfoPageProps> = () => {
  const content = useCmsPageContent('about');

  if (!hasStaticPageContent(content)) {
    return <EmptyInfoPageState title="About Us" />;
  }

  const validSections = (content.sections || []).filter(
    (s) =>
      s.title?.trim() ||
      s.content?.trim() ||
      (s.bullets && s.bullets.some((b) => b?.trim()))
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        {content.badge?.trim() && (
          <div
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
            style={{
              backgroundColor: 'var(--app-primary-soft)',
              borderColor: 'var(--app-border-color)',
              color: 'var(--app-primary)'
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{content.badge}</span>
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" style={{ color: 'var(--app-heading-primary)' }}>
          {content.title?.trim() || 'About Us'}
        </h1>
        {content.subtitle?.trim() && (
          <p className="text-base sm:text-lg leading-relaxed font-normal" style={{ color: 'var(--app-body-text)' }}>
            {content.subtitle}
          </p>
        )}
      </div>

      <StaticPageRichBody html={content.bodyHtml} />

      {content.highlightBox?.enabled &&
        (content.highlightBox.badge?.trim() ||
          content.highlightBox.title?.trim() ||
          content.highlightBox.content?.trim()) && (
          <div
            className="border text-white shadow-sm space-y-4"
            style={{
              backgroundColor: 'var(--app-secondary)',
              borderColor: 'var(--app-border-color)',
              borderRadius: 'var(--app-radius-card)',
              padding: 'var(--app-space-card)'
            }}
          >
            {content.highlightBox.badge?.trim() && (
              <div className="flex items-center space-x-2 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--app-accent)' }}>
                <Sparkles className="w-4 h-4" />
                <span>{content.highlightBox.badge}</span>
              </div>
            )}
            {content.highlightBox.title?.trim() && (
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {content.highlightBox.title}
              </h2>
            )}
            {content.highlightBox.content?.trim() && (
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal whitespace-pre-line">
                {content.highlightBox.content}
              </p>
            )}
          </div>
        )}

      {validSections.length > 0 && (
        <div className="space-y-8">
          {validSections.map((section, idx) => {
            const validBullets = (section.bullets || []).filter((b) => Boolean(b?.trim()));
            return (
              <div
                key={section.id || idx}
                className="theme-card border shadow-2xs space-y-5"
                style={{ padding: 'var(--app-space-card)' }}
              >
                {section.title?.trim() && (
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center space-x-2.5" style={{ color: 'var(--app-heading-primary)' }}>
                    <span
                      className="w-7 h-7 border flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: 'var(--app-primary-soft)',
                        borderColor: 'var(--app-border-color)',
                        color: 'var(--app-primary)',
                        borderRadius: 'var(--app-radius-btn)'
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span>{section.title}</span>
                  </h2>
                )}

                {section.content?.trim() && (
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line" style={{ color: 'var(--app-body-text)' }}>
                    {section.content}
                  </p>
                )}

                {validBullets.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                    {validBullets.map((bullet, bIdx) => (
                      <div
                        key={bIdx}
                        className="p-3.5 border flex items-start space-x-2.5 text-xs sm:text-sm"
                        style={{
                          backgroundColor: 'var(--app-body-bg)',
                          borderColor: 'var(--app-border-color)',
                          color: 'var(--app-body-text)',
                          borderRadius: 'var(--app-radius-btn)'
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--app-primary)' }} />
                        <span className="leading-relaxed">{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const PrivacyPolicyView: React.FC<InfoPageProps> = () => {
  const content = useCmsPageContent('privacy');

  if (!hasStaticPageContent(content)) {
    return <EmptyInfoPageState title="Privacy Policy" />;
  }

  const validSections = (content.sections || []).filter(
    (s) =>
      s.title?.trim() ||
      s.content?.trim() ||
      (s.bullets && s.bullets.some((b) => b?.trim()))
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      <div className="space-y-4 border-b pb-8 text-center sm:text-left" style={{ borderColor: 'var(--app-border-color)' }}>
        {content.badge?.trim() && (
          <div
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
            style={{
              backgroundColor: 'var(--app-primary-soft)',
              borderColor: 'var(--app-border-color)',
              color: 'var(--app-primary)'
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{content.badge}</span>
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--app-heading-primary)' }}>
          {content.title?.trim() || 'Privacy Policy'}
        </h1>
        {content.subtitle?.trim() && (
          <p className="text-sm" style={{ color: 'var(--app-muted-text)' }}>
            {content.subtitle}
          </p>
        )}
      </div>

      <StaticPageRichBody html={content.bodyHtml} />

      {content.highlightBox?.enabled &&
        (content.highlightBox.title?.trim() || content.highlightBox.content?.trim()) && (
          <div
            className="p-5 border text-xs space-y-2"
            style={{
              backgroundColor: 'var(--app-card-bg)',
              borderColor: 'var(--app-border-color)',
              color: 'var(--app-body-text)',
              borderRadius: 'var(--app-radius-card)'
            }}
          >
            {content.highlightBox.title?.trim() && (
              <div className="flex items-center space-x-2 font-bold" style={{ color: 'var(--app-heading-primary)' }}>
                <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--app-primary)' }} />
                <span>{content.highlightBox.title}</span>
              </div>
            )}
            {content.highlightBox.content?.trim() && (
              <p className="leading-relaxed whitespace-pre-line" style={{ color: 'var(--app-body-text)' }}>
                {content.highlightBox.content}
              </p>
            )}
          </div>
        )}

      {validSections.length > 0 && (
        <div className="space-y-8 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--app-body-text)' }}>
          {validSections.map((section, idx) => {
            const validBullets = (section.bullets || []).filter((b) => Boolean(b?.trim()));
            return (
              <section
                key={section.id || idx}
                className="space-y-3 theme-card border shadow-2xs"
                style={{ padding: 'var(--app-space-card)' }}
              >
                {section.title?.trim() && (
                  <h2 className="text-base sm:text-lg font-bold flex items-center space-x-2" style={{ color: 'var(--app-heading-primary)' }}>
                    <span
                      className="w-6 h-6 border flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: 'var(--app-primary-soft)',
                        borderColor: 'var(--app-border-color)',
                        color: 'var(--app-primary)',
                        borderRadius: 'var(--app-radius-btn)'
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span>{section.title}</span>
                  </h2>
                )}
                {section.content?.trim() && (
                  <p className="whitespace-pre-line leading-relaxed" style={{ color: 'var(--app-body-text)' }}>
                    {section.content}
                  </p>
                )}

                {validBullets.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1.5 pt-2" style={{ color: 'var(--app-muted-text)' }}>
                    {validBullets.map((b, bIdx) => (
                      <li key={bIdx} className="leading-relaxed">{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const TermsConditionsView: React.FC<InfoPageProps> = () => {
  const content = useCmsPageContent('terms');

  if (!hasStaticPageContent(content)) {
    return <EmptyInfoPageState title="Terms & Conditions" />;
  }

  const validSections = (content.sections || []).filter(
    (s) =>
      s.title?.trim() ||
      s.content?.trim() ||
      (s.bullets && s.bullets.some((b) => b?.trim()))
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        {content.badge?.trim() && (
          <div
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
            style={{
              backgroundColor: 'var(--app-primary-soft)',
              borderColor: 'var(--app-border-color)',
              color: 'var(--app-primary)'
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{content.badge}</span>
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" style={{ color: 'var(--app-heading-primary)' }}>
          {content.title?.trim() || 'Terms & Conditions'}
        </h1>
        {content.subtitle?.trim() && (
          <p className="text-base sm:text-lg leading-relaxed font-normal" style={{ color: 'var(--app-body-text)' }}>
            {content.subtitle}
          </p>
        )}
      </div>

      <StaticPageRichBody html={content.bodyHtml} />

      {content.highlightBox?.enabled &&
        (content.highlightBox.badge?.trim() ||
          content.highlightBox.title?.trim() ||
          content.highlightBox.content?.trim()) && (
          <div
            className="border text-white shadow-sm space-y-4"
            style={{
              backgroundColor: 'var(--app-secondary)',
              borderColor: 'var(--app-border-color)',
              borderRadius: 'var(--app-radius-card)',
              padding: 'var(--app-space-card)'
            }}
          >
            {content.highlightBox.badge?.trim() && (
              <div className="flex items-center space-x-2 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--app-accent)' }}>
                <Sparkles className="w-4 h-4" />
                <span>{content.highlightBox.badge}</span>
              </div>
            )}
            {content.highlightBox.title?.trim() && (
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {content.highlightBox.title}
              </h2>
            )}
            {content.highlightBox.content?.trim() && (
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal whitespace-pre-line">
                {content.highlightBox.content}
              </p>
            )}
          </div>
        )}

      {validSections.length > 0 && (
        <div className="space-y-6">
          {validSections.map((section, idx) => {
            const validBullets = (section.bullets || []).filter((b) => Boolean(b?.trim()));
            return (
              <div
                key={section.id || idx}
                className="theme-card border shadow-2xs space-y-4"
                style={{ padding: 'var(--app-space-card)' }}
              >
                {section.title?.trim() && (
                  <h2 className="text-xl font-bold flex items-center space-x-2.5" style={{ color: 'var(--app-heading-primary)' }}>
                    <span
                      className="w-7 h-7 border flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: 'var(--app-primary-soft)',
                        borderColor: 'var(--app-border-color)',
                        color: 'var(--app-primary)',
                        borderRadius: 'var(--app-radius-btn)'
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span>{section.title}</span>
                  </h2>
                )}

                {section.content?.trim() && (
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line" style={{ color: 'var(--app-body-text)' }}>
                    {section.content}
                  </p>
                )}

                {validBullets.length > 0 && (
                  <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm pt-1" style={{ color: 'var(--app-muted-text)' }}>
                    {validBullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="leading-relaxed">{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

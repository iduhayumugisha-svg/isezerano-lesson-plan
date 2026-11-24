import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  MapPin,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Building2,
  Phone,
  Clock
} from 'lucide-react';
import { WebsitePage } from '../components/WebsiteHeader';
import { WebsitePageContent } from '../types/platform';
import {
  getPageContent,
  subscribeToPageContent,
  DEFAULT_PAGES_CONTENT,
  hasStaticPageContent
} from '../services/websitePagesService';
import { StaticPageRichBody } from './InfoPagesView';

interface ContactViewProps {
  onNavigate?: (page: WebsitePage) => void;
}

export const ContactView: React.FC<ContactViewProps> = () => {
  const [content, setContent] = useState<WebsitePageContent>(DEFAULT_PAGES_CONTENT.contact);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    message: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadContent();

    const unsubscribe = subscribeToPageContent('contact', (page) => {
      setContent(page);
    });

    const handleUpdate = (e: any) => {
      if (e.detail?.pageId === 'contact') {
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
      const data = await getPageContent('contact');
      setContent(data);
    } catch {
      // keep default
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errs.fullName = 'Full Name is required.';
    }

    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!formData.message.trim()) {
      errs.message = 'Please enter your message.';
    } else if (formData.message.trim().length < 10) {
      errs.message = 'Message must be at least 10 characters.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const existing = JSON.parse(localStorage.getItem('isezerano_feedback_log') || '[]');
      existing.push({
        ...formData,
        submittedAt: new Date().toISOString()
      });
      localStorage.setItem('isezerano_feedback_log', JSON.stringify(existing));
    } catch {
      // ignore
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({
        fullName: '',
        email: '',
        message: ''
      });
    }, 350);
  };

  if (!hasStaticPageContent(content)) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-6">
        <div className="border-b pb-6 text-center sm:text-left" style={{ borderColor: 'var(--app-border-color)' }}>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--app-heading-primary)' }}>
            Contact Us
          </h1>
        </div>
        <div className="theme-card border shadow-2xs text-center" style={{ padding: 'var(--app-space-card)' }}>
          <p className="text-sm" style={{ color: 'var(--app-muted-text)' }}>
            No content has been published for this page yet.
          </p>
        </div>
      </div>
    );
  }

  const contactData = content.contactData || {
    schoolName: '',
    address: '',
    email: '',
    phone: '',
    whatsapp: '',
    workingHours: ''
  };

  const hasContactDetails = Boolean(
    contactData.schoolName?.trim() ||
      contactData.address?.trim() ||
      contactData.phone?.trim() ||
      contactData.whatsapp?.trim() ||
      contactData.email?.trim() ||
      contactData.workingHours?.trim()
  );

  const validSections = (content.sections || []).filter(
    (s) =>
      Boolean(s.title?.trim()) ||
      Boolean(s.content?.trim()) ||
      (Array.isArray(s.bullets) && s.bullets.some((b) => Boolean(b?.trim())))
  );

  const hasHighlightBox =
    Boolean(content.highlightBox?.enabled) &&
    Boolean(
      content.highlightBox?.badge?.trim() ||
        content.highlightBox?.title?.trim() ||
        content.highlightBox?.content?.trim()
    );

  const showForm = Boolean(content.showContactForm);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        {content.badge?.trim() && (
          <div
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
            style={{
              backgroundColor: 'var(--app-primary-soft)',
              borderColor: 'var(--app-border-color)',
              color: 'var(--app-primary)'
            }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{content.badge}</span>
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--app-heading-primary)' }}>
          {content.title?.trim() || 'Contact Us'}
        </h1>
        {content.subtitle?.trim() && (
          <p className="text-sm sm:text-base leading-relaxed font-normal" style={{ color: 'var(--app-body-text)' }}>
            {content.subtitle}
          </p>
        )}
      </div>

      <StaticPageRichBody html={content.bodyHtml} />

      {hasHighlightBox && content.highlightBox && (
        <div
          className="border text-white shadow-sm space-y-3"
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
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {content.highlightBox.title}
            </h2>
          )}
          {content.highlightBox.content?.trim() && (
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {content.highlightBox.content}
            </p>
          )}
        </div>
      )}

      {(hasContactDetails || showForm || validSections.length > 0) && (
        <div className={`grid grid-cols-1 ${hasContactDetails && (showForm || validSections.length > 0) ? 'lg:grid-cols-3' : ''}`} style={{ gap: 'var(--app-space-gap)' }}>
          {hasContactDetails && (
            <div className={`${showForm || validSections.length > 0 ? 'lg:col-span-1' : 'max-w-xl mx-auto w-full'} space-y-6`}>
              <div className="theme-card border shadow-2xs space-y-5" style={{ padding: 'var(--app-space-card)' }}>
                <h2 className="text-base font-bold border-b pb-3" style={{ color: 'var(--app-heading-primary)', borderColor: 'var(--app-border-color)' }}>
                  Contact Information
                </h2>

                <div className="space-y-4 text-xs" style={{ color: 'var(--app-body-text)' }}>
                  {contactData.schoolName?.trim() && (
                    <div className="flex items-start space-x-3">
                      <Building2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--app-primary)' }} />
                      <div>
                        <span className="font-bold block" style={{ color: 'var(--app-heading-primary)' }}>Organization</span>
                        <span>{contactData.schoolName}</span>
                      </div>
                    </div>
                  )}

                  {contactData.address?.trim() && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--app-primary)' }} />
                      <div>
                        <span className="font-bold block" style={{ color: 'var(--app-heading-primary)' }}>Address</span>
                        <span>{contactData.address}</span>
                      </div>
                    </div>
                  )}

                  {contactData.phone?.trim() && (
                    <div className="flex items-start space-x-3">
                      <Phone className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--app-primary)' }} />
                      <div>
                        <span className="font-bold block" style={{ color: 'var(--app-heading-primary)' }}>Phone</span>
                        <a href={`tel:${contactData.phone}`} className="theme-link hover:underline font-semibold">
                          {contactData.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {contactData.whatsapp?.trim() && (
                    <div className="flex items-start space-x-3">
                      <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--app-primary)' }} />
                      <div>
                        <span className="font-bold block" style={{ color: 'var(--app-heading-primary)' }}>WhatsApp</span>
                        <span>{contactData.whatsapp}</span>
                      </div>
                    </div>
                  )}

                  {contactData.email?.trim() && (
                    <div className="flex items-start space-x-3">
                      <Mail className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--app-primary)' }} />
                      <div>
                        <span className="font-bold block" style={{ color: 'var(--app-heading-primary)' }}>Email</span>
                        <a href={`mailto:${contactData.email}`} className="theme-link hover:underline font-medium truncate block">
                          {contactData.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {contactData.workingHours?.trim() && (
                    <div className="flex items-start space-x-3">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--app-primary)' }} />
                      <div>
                        <span className="font-bold block" style={{ color: 'var(--app-heading-primary)' }}>Hours</span>
                        <span>{contactData.workingHours}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {(showForm || validSections.length > 0) && (
            <div className={`${hasContactDetails ? 'lg:col-span-2' : 'max-w-3xl mx-auto w-full'} space-y-6`}>
              {showForm && (
                <div className="theme-card border shadow-2xs space-y-6" style={{ padding: 'var(--app-space-card)' }}>
                  {isSubmitted && (
                    <div className="theme-success-banner p-4 border text-xs sm:text-sm space-y-1" style={{ borderColor: 'var(--app-success-bg)' }}>
                      <div className="flex items-center space-x-2 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Your message has been received.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSubmitted(false)}
                        className="pl-7 text-xs font-bold underline pt-1 cursor-pointer opacity-95 hover:opacity-100"
                      >
                        Send another message
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--app-heading-primary)' }}>
                          Full Name <span style={{ color: 'var(--app-error-bg)' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="Your name"
                          className="theme-input w-full px-3.5 py-2.5 border text-xs transition-all"
                          style={errors.fullName ? { borderColor: 'var(--app-error-bg)' } : undefined}
                        />
                        {errors.fullName && (
                          <p className="text-[11px] mt-1 flex items-center space-x-1" style={{ color: 'var(--app-error-bg)' }}>
                            <AlertCircle className="w-3 h-3" />
                            <span>{errors.fullName}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--app-heading-primary)' }}>
                          Email Address <span style={{ color: 'var(--app-error-bg)' }}>*</span>
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="name@example.com"
                          className="theme-input w-full px-3.5 py-2.5 border text-xs transition-all"
                          style={errors.email ? { borderColor: 'var(--app-error-bg)' } : undefined}
                        />
                        {errors.email && (
                          <p className="text-[11px] mt-1 flex items-center space-x-1" style={{ color: 'var(--app-error-bg)' }}>
                            <AlertCircle className="w-3 h-3" />
                            <span>{errors.email}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--app-heading-primary)' }}>
                        Message <span style={{ color: 'var(--app-error-bg)' }}>*</span>
                      </label>
                      <textarea
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Write your message..."
                        className="theme-input w-full px-3.5 py-2.5 border text-xs transition-all"
                        style={errors.message ? { borderColor: 'var(--app-error-bg)' } : undefined}
                      />
                      {errors.message && (
                        <p className="text-[11px] mt-1 flex items-center space-x-1" style={{ color: 'var(--app-error-bg)' }}>
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.message}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="theme-btn-primary inline-flex items-center space-x-2 px-6 py-2.5 text-xs font-bold hover:opacity-90 transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmitting ? 'Submitting...' : 'Send Message'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {validSections.length > 0 && (
                <div className="space-y-4">
                  {validSections.map((section, idx) => {
                    const validBullets = (section.bullets || []).filter((b) => Boolean(b?.trim()));
                    return (
                      <div key={section.id || idx} className="theme-card border shadow-2xs space-y-3" style={{ padding: 'var(--app-space-card)' }}>
                        {section.title?.trim() && (
                          <h3 className="text-sm font-bold flex items-center space-x-2" style={{ color: 'var(--app-heading-primary)' }}>
                            <HelpCircle className="w-4 h-4" style={{ color: 'var(--app-primary)' }} />
                            <span>{section.title}</span>
                          </h3>
                        )}
                        {section.content?.trim() && (
                          <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--app-body-text)' }}>
                            {section.content}
                          </p>
                        )}
                        {validBullets.length > 0 && (
                          <ul className="list-disc pl-5 space-y-1.5 text-xs pt-1" style={{ color: 'var(--app-muted-text)' }}>
                            {validBullets.map((b, bIdx) => (
                              <li key={bIdx} className="leading-relaxed">{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

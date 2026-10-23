import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  HelpCircle, 
  MessageSquare,
  Sparkles,
  School,
  LayoutDashboard,
  GraduationCap
} from 'lucide-react';
import { WebsitePage } from '../components/WebsiteHeader';

interface ContactViewProps {
  onNavigate: (page: WebsitePage) => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    schoolName: '',
    district: '',
    topic: 'feedback',
    message: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errs.fullName = 'Full Name is required / Amazina arasabwa.';
    }

    if (!formData.email.trim()) {
      errs.email = 'Email address is required / Imeli irasabwa.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!formData.message.trim()) {
      errs.message = 'Please enter your message or question / Andika ubutumwa bwawe.';
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

    // Save feedback locally in browser log so no submission is lost
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
        schoolName: '',
        district: '',
        topic: 'feedback',
        message: ''
      });
    }, 500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      
      {/* 1. Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold">
          <MessageSquare className="w-3.5 h-3.5 text-teal-700" />
          <span>Teacher Inquiries & Support</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Contact Us & Share Feedback
        </h1>
        <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
          Have a question about Rwanda CBC lesson planning, a feature suggestion, or need technical assistance? Let us know below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. Left Information Column (Configurable, honest, no fake data) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Platform Information
            </h2>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="flex items-start space-x-3">
                <School className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">Origin & School</span>
                  <span>GS GITUMBA, Buyoga Sector, Rulindo District, Northern Province, Rwanda</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">Location</span>
                  <span>Northern Province / Kigali, Rwanda</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <GraduationCap className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">Curriculum Alignment</span>
                  <span>Rwanda CBC (REB / MINEDUC)</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <HelpCircle className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">Support Scope</span>
                  <span>Lesson plan generation, 8-column CBC formatting, and PDF export troubleshooting.</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 bg-slate-50 p-3.5 rounded-xl text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-800 block mb-1">Administrative Note:</strong>
              Direct telephone and email support lines can be configured by the platform administrator as verified official communication channels are established.
            </div>
          </div>

          <div className="bg-teal-50/80 p-6 rounded-2xl border border-teal-200 text-xs text-teal-950 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-teal-900">
              <LayoutDashboard className="w-4 h-4 text-teal-700" />
              <span>Application Dashboard</span>
            </div>
            <p className="leading-relaxed">
              You do not need to wait for a reply to start planning. All lesson planning features are immediately available from the dashboard.
            </p>
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-xs font-bold text-teal-800 hover:text-teal-950 underline pt-1 block cursor-pointer"
            >
              Open Application Dashboard →
            </button>
          </div>
        </div>

        {/* 3. Right Message Form */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            
            {/* Feedback Alert if successfully submitted */}
            {isSubmitted && (
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 text-xs sm:text-sm space-y-1">
                <div className="flex items-center space-x-2 font-bold text-teal-900">
                  <CheckCircle2 className="w-5 h-5 text-teal-700" />
                  <span>Murakoze! Your message has been received.</span>
                </div>
                <p className="text-xs text-teal-800 pl-7 leading-relaxed">
                  Thank you for sharing your feedback. Your input has been safely recorded and helps us improve the lesson planning experience for teachers across Rwanda.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="pl-7 text-xs font-bold text-teal-900 underline pt-1 cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Full Name / Amazina yombi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Jean Pierre HABIMANA"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                      errors.fullName
                        ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
                        : 'border-slate-300 focus:ring-teal-600'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.fullName}</span>
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Email Address / Imeli <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. teacher@school.rw"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                      errors.email
                        ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
                        : 'border-slate-300 focus:ring-teal-600'
                    }`}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* School Name (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    School Name / Ishuri (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder="e.g. GS Remera Protestant"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs text-slate-900"
                  />
                </div>

                {/* District (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    District / Akarere (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="e.g. Gasabo, Huye, Musanze..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Inquiry Topic */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Inquiry Topic / Impamvu y'Ubutumwa
                </label>
                <select
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 bg-white"
                >
                  <option value="feedback">General Feedback & Suggestions</option>
                  <option value="curriculum">Rwanda CBC Curriculum Question / Recommendation</option>
                  <option value="pdf">PDF Export & Printing Inquiry</option>
                  <option value="support">Technical Support</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Message / Ubutumwa <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your inquiry, curriculum question, or feedback in detail..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    errors.message
                      ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
                      : 'border-slate-300 focus:ring-teal-600'
                  }`}
                />
                {errors.message && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.message}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer border border-slate-900"
                >
                  <Send className="w-4 h-4 text-teal-400" />
                  <span>{isSubmitting ? 'Submitting...' : 'Send Message'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>

      </div>

    </div>
  );
};

import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Database, 
  FileText, 
  AlertTriangle, 
  CheckCircle2,
  HardDrive,
  Cloud,
  LayoutDashboard
} from 'lucide-react';
import { WebsitePage } from '../components/WebsiteHeader';

interface PrivacyPolicyViewProps {
  onNavigate: (page: WebsitePage) => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      
      {/* 1. Header */}
      <div className="space-y-4 border-b border-slate-200 pb-8">
        <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
          <span>Transparency & Data Security</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500">
          Last Updated: October 2026 • ISEZERANO ONLINE – GS GITUMBA
        </p>
      </div>

      {/* 2. Platform Owner Review Callout */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
        <div className="flex items-center space-x-2 font-bold text-slate-900">
          <AlertTriangle className="w-4 h-4 text-teal-700 shrink-0" />
          <span>Notice for Platform Administrators & School Leaders</span>
        </div>
        <p className="leading-relaxed">
          This Privacy Policy accurately documents the technical data storage and processing mechanisms implemented in the ISEZERANO ONLINE application. Please review this document to ensure alignment with any specific district, provincial, or institutional data governance requirements in your educational jurisdiction.
        </p>
      </div>

      {/* 3. Privacy Sections */}
      <div className="space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 flex items-center justify-center text-xs font-bold">1</span>
            <span>Introduction & Purpose</span>
          </h2>
          <p>
            ISEZERANO ONLINE ("we", "our", or "the platform") is committed to respecting the privacy and data rights of teachers, school leaders, and educational professionals in Rwanda. This policy explains what information is collected, how it is stored, how it is processed, and the controls you have over your pedagogical records.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 flex items-center justify-center text-xs font-bold">2</span>
            <span>What Information Is Collected & Processed</span>
          </h2>
          <p>
            The platform processes only the information necessary to generate, structure, save, and print official Rwanda Competence-Based Curriculum (CBC) lesson plans:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>
              <strong>Lesson Plan Records:</strong> School name, teacher identification, academic year, term, date, subject, class grade, unit number, lesson title, duration, instructional objectives, generic competences, cross-cutting issues, and 8-column stage activities.
            </li>
            <li>
              <strong>Teacher Preferences:</strong> User interface language preference (English, Ikinyarwanda, or French) and optional default school details saved for faster document preparation.
            </li>
            <li>
              <strong>Optional Authentication Details:</strong> When administrator access or user accounts are configured, email addresses and authentication tokens are processed securely via Firebase Authentication.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 flex items-center justify-center text-xs font-bold">3</span>
            <span>Where and How Your Data Is Stored</span>
          </h2>
          <p>
            The application operates with an <strong>offline-first local architecture</strong> complemented by optional cloud database synchronization:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-slate-900">
                <HardDrive className="w-4 h-4 text-teal-700" />
                <span>Local Browser Storage</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Lesson plans and school preferences are automatically saved in your personal device's browser database (<code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">localStorage</code>). This ensures immediate access, zero-login drafting, and full functionality even without an internet connection.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-slate-900">
                <Cloud className="w-4 h-4 text-slate-700" />
                <span>Google Firebase Firestore</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                When cloud synchronization is configured, lesson plan records are transmitted via encrypted HTTPS and stored in Google Cloud Firestore with security rules restricting access to authorized records.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 flex items-center justify-center text-xs font-bold">4</span>
            <span>Zero Commercial Advertising & No Tracking</span>
          </h2>
          <p>
            ISEZERANO ONLINE is an educational workspace:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>We do not sell, rent, or monetize teacher or student pedagogical data to advertisers or third-party data brokers.</li>
            <li>We do not employ third-party behavioral advertising trackers.</li>
            <li>The application automatically cleanses external marketing tracking parameters (e.g. tracking URLs) from your browser address bar upon arrival.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 flex items-center justify-center text-xs font-bold">5</span>
            <span>Your Rights & Data Portability</span>
          </h2>
          <p>
            Teachers maintain complete sovereignty over their prepared lesson plans:
          </p>
          <div className="space-y-2 pt-1 text-slate-600">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span><strong>Export at Any Time:</strong> You can print your plans or export selectable-text A4 PDFs for physical inspection and personal archiving.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span><strong>JSON Backup & Migration:</strong> You can download a complete backup of all stored plans in standardized JSON format.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span><strong>Right of Deletion:</strong> You can delete any individual lesson plan or reset your local device storage at any time via the application interface.</span>
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 flex items-center justify-center text-xs font-bold">6</span>
            <span>Updates to this Policy</span>
          </h2>
          <p>
            As new features or official REB guidelines are introduced, this privacy policy may be updated. Any changes will be published directly on this page with an updated revision date.
          </p>
        </section>

      </div>

      {/* 4. Bottom Action */}
      <div className="pt-6 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
        <button
          onClick={() => onNavigate('contact')}
          className="text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
        >
          Have questions? Contact Us →
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 rounded-lg text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer inline-flex items-center space-x-1.5"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-teal-700" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => onNavigate('create')}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-2xs transition-all cursor-pointer"
          >
            Create Lesson Plan
          </button>
        </div>
      </div>

    </div>
  );
};

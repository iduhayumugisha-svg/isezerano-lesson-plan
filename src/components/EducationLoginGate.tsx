import React from 'react';
import { 
  GraduationCap, 
  Lock, 
  ArrowLeft, 
  LogIn, 
  CheckCircle2, 
  ShieldCheck, 
  FileCheck2, 
  FileText,
  Users,
  Printer
} from 'lucide-react';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';

interface EducationLoginGateProps {
  onOpenAuthModal: () => void;
  onNavigateHome: () => void;
}

export const EducationLoginGate: React.FC<EducationLoginGateProps> = ({
  onOpenAuthModal,
  onNavigateHome
}) => {
  const { colors, typography, branding } = useWebsiteDesign();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Navy Header Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white p-8 sm:p-10 relative overflow-hidden">
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
              <Lock className="w-3.5 h-3.5 text-teal-400" />
              <span>Teacher & Staff Protected Workspace</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
              ISEZERANO ONLINE Education Platform
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Official Rwanda Competence-Based Curriculum (CBC) 8-column lesson planning, student demographics management, and classroom tools. Please sign in to access your teacher dashboard and saved records.
            </p>
          </div>

          {/* Decorative background glow */}
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Content Body */}
        <div className="p-8 sm:p-10 space-y-8">
          
          {/* Key Platform Capabilities */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Protected Education Tools Included in Dashboard
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck2 className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Official CBC 8-Column Generator</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    REB & MINEDUC compliant structure with automatic timing, competencies, and evaluation.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Printer className="w-5 h-5 text-sky-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">PDF & Word (.docx) Table Export</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Clean portrait layout ready for classroom inspection and printing with zero truncation.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Students Identification</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Class demographic records, boys & girls distribution, and term enrollment counts.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Cloud & Offline Persistence</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Automated Firestore cloud sync with local backup so your lesson plans are never lost.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Call-to-action buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Return to Public Newspaper Homepage</span>
            </button>

            <button
              type="button"
              onClick={onOpenAuthModal}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-98 cursor-pointer ring-4 ring-teal-500/20"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Teacher Login</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

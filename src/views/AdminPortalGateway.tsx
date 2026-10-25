import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert,
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WebsitePage } from '../components/WebsiteHeader';

interface AdminPortalGatewayProps {
  onNavigate: (page: WebsitePage) => void;
  onOpenAuthModal?: () => void;
}

export const AdminPortalGateway: React.FC<AdminPortalGatewayProps> = ({ 
  onNavigate,
  onOpenAuthModal 
}) => {
  const { user, isAdmin, signInWithGoogle, signOutUser } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Requirement: If an unauthorized person selects another account or opens admin without permission,
  // deny access and return them to the public website.
  useEffect(() => {
    if (user && !isAdmin) {
      setErrorMsg('Access Denied: This account is not authorized to access the Admin Portal. Returning to public website...');
      const timer = setTimeout(async () => {
        await signOutUser();
        onNavigate('home');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, isAdmin, onNavigate, signOutUser]);

  // If already verified admin, fast jump to dashboard
  if (isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-8 h-8 text-teal-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Administrator Access Confirmed</h2>
          <p className="text-sm text-slate-600">
            You are signed in with verified platform administrator authorization.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('admin')}
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-teal-700 hover:bg-teal-600 text-white shadow-sm cursor-pointer"
          >
            Open Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Handle Google Sign-In with Account Selection
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        if (res.isAdmin) {
          setSuccessMsg('Authenticated successfully as Administrator! Opening Dashboard...');
        } else {
          // Requirement: If an unauthorized person selects another Google account,
          // deny access and return them to the public website.
          await signOutUser();
          setErrorMsg('Access Denied: This Google account is not authorized to access the Admin Portal. Returning to public website...');
          setTimeout(() => {
            onNavigate('home');
          }, 2000);
        }
      } else {
        setErrorMsg(res.error || 'Google sign-in was not completed.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      
      {/* Return to public website button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Public Website</span>
        </button>

        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
          Admin Portal
        </span>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Brand Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-teal-950 p-6 sm:p-8 text-white relative">
          <div className="flex items-center space-x-3.5 mb-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-md flex items-center justify-center shrink-0">
              <img 
                src="/isezerano-online-logo.jpg" 
                alt="ISEZERANO ONLINE Logo" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                ISEZERANO ONLINE
              </h1>
              <span className="text-xs font-semibold text-teal-400 tracking-wider uppercase">
                GS GITUMBA • Administrator Portal
              </span>
            </div>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Authorized Administrator Access Only</span>
          </div>

          <p className="text-xs text-slate-300 mt-3 leading-relaxed">
            This management gateway is strictly restricted to the authorized platform administrator. All visitors and teachers can freely access and use the public lesson planning tools without signing in.
          </p>
        </div>

        {/* Public info banner */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Public visitors and teachers require no account</span>
          </span>
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-teal-700 hover:text-teal-900 font-semibold cursor-pointer underline text-[11px]"
          >
            Lesson Planner →
          </button>
        </div>

        {/* Action Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Primary Action: Sign in with Google (with Account Chooser prompt) */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center space-x-3 cursor-pointer disabled:opacity-50 hover:border-slate-400 active:scale-98"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{isSubmitting ? 'Authenticating with Google...' : 'Sign in with Google'}</span>
            </button>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-center space-y-1">
              <p className="text-xs text-slate-700 font-semibold">
                Account Selection Required
              </p>
              <p className="text-[11px] text-slate-500 leading-normal">
                Google will prompt you to select an account. Only the explicitly authorized administrator account will be permitted to access the dashboard.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel and Return to Home
            </button>
          </div>

        </div>

        {/* Footer info inside card */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          <span>Official CBC Lesson Planning Portal • GS GITUMBA, Buyoga, Rulindo District</span>
        </div>

      </div>

    </div>
  );
};

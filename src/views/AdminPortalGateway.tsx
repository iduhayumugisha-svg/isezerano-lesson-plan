import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert,
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Key,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Server,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { WebsitePage } from '../components/WebsiteHeader';
import { 
  getFirebaseConfig, 
  saveFirebaseConfig, 
  isFirebaseConfigured, 
  parseFirebaseConfigSnippet 
} from '../services/storageService';

interface AdminPortalGatewayProps {
  onNavigate: (page: WebsitePage) => void;
  onOpenAuthModal?: () => void;
}

export const AdminPortalGateway: React.FC<AdminPortalGatewayProps> = ({ 
  onNavigate 
}) => {
  const { user, isAdmin, signInWithGoogle, signOutUser } = useAuth();
  const { logoUrl, logoSettings } = useWebsiteDesign();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Firebase Web Config Connection State
  const [firebaseReady, setFirebaseReady] = useState<boolean>(() => isFirebaseConfigured());
  const [showConfigHelper, setShowConfigHelper] = useState<boolean>(() => !isFirebaseConfigured());
  const [unauthorizedDomainHost, setUnauthorizedDomainHost] = useState<string | null>(null);
  const [configInput, setConfigInput] = useState<string>('');
  const [configFeedback, setConfigFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setFirebaseReady(isFirebaseConfigured());
  }, []);

  // Requirement: If an unauthorized person selects another account or opens admin without permission,
  // deny access and return them to the public website.
  useEffect(() => {
    if (user && !isAdmin) {
      setErrorMsg('Access Denied: This Google account is not authorized to access the Admin Portal. Returning to public website...');
      const timer = setTimeout(async () => {
        await signOutUser();
        onNavigate('home');
      }, 2500);
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

  // Handle Quick Web App Configuration
  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    setConfigFeedback(null);

    const raw = configInput.trim();
    if (!raw) {
      setConfigFeedback({
        type: 'error',
        message: 'Please paste your Firebase Web API Key or web configuration snippet.'
      });
      return;
    }

    const parsed = parseFirebaseConfigSnippet(raw);
    if (!parsed || !parsed.apiKey) {
      setConfigFeedback({
        type: 'error',
        message: 'Could not extract a valid apiKey. Please paste either your Firebase Web API Key (starts with AIza) or the firebaseConfig snippet.'
      });
      return;
    }

    const current = getFirebaseConfig();
    const updated = {
      ...current,
      apiKey: parsed.apiKey,
      projectId: parsed.projectId || current.projectId || 'isezerano-news',
      authDomain: parsed.authDomain || current.authDomain || `${current.projectId || 'isezerano-news'}.firebaseapp.com`,
      storageBucket: parsed.storageBucket || current.storageBucket || `${current.projectId || 'isezerano-news'}.firebasestorage.app`,
      messagingSenderId: parsed.messagingSenderId || current.messagingSenderId || '',
      appId: parsed.appId || current.appId || '',
      enabled: true
    };

    saveFirebaseConfig(updated);
    setFirebaseReady(true);
    setErrorMsg(null);
    setConfigFeedback({
      type: 'success',
      message: `Firebase Web client successfully connected to project "${updated.projectId}". You can now sign in with Google!`
    });
  };

  // Handle Google Sign-In with Account Selection
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // If Firebase is not configured with an API key, prompt user
    if (!isFirebaseConfigured()) {
      setShowConfigHelper(true);
      setErrorMsg('Firebase Web Configuration required: please enter your Firebase Web API Key below to enable Google Sign-In.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        if (res.isAdmin) {
          setSuccessMsg('Authenticated successfully as Administrator! Opening Dashboard...');
        } else {
          // If an unauthorized person selects another Google account, deny access and return to public website
          await signOutUser();
          setErrorMsg('Access Denied: This Google account is not authorized to access the Admin Portal. Returning to public website...');
          setTimeout(() => {
            onNavigate('home');
          }, 2500);
        }
      } else {
        if (res.code === 'auth/unauthorized-domain') {
          setUnauthorizedDomainHost(typeof window !== 'undefined' ? window.location.hostname : 'this domain');
        } else {
          setUnauthorizedDomainHost(null);
        }
        if (res.code === 'MISSING_API_KEY' || res.code === 'AUTH_UNAVAILABLE') {
          setShowConfigHelper(true);
        }
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
            {logoSettings.showInAdminGateway && (
              <div className={`w-12 h-12 overflow-hidden bg-slate-900 border border-slate-700/80 shadow-md flex items-center justify-center shrink-0 ${logoSettings.borderRadius}`}>
                <img 
                  src={logoUrl} 
                  alt={logoSettings.altText || "ISEZERANO ONLINE Logo"} 
                  className={`w-full h-full object-${logoSettings.displayFit}`} 
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
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

          {unauthorizedDomainHost && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center space-x-2 font-bold text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>1-Step Action in Firebase Console:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                To enable Google Sign-In on this browser URL, add the hostname below to your authorized domains in project <strong className="font-mono">isezerano-news</strong>:
              </p>
              <div className="flex items-center space-x-2 bg-white/80 p-2 rounded-lg border border-amber-200 font-mono text-[11px] select-all">
                <span>{unauthorizedDomainHost}</span>
              </div>
              <div className="pt-1">
                <a
                  href="https://console.firebase.google.com/project/isezerano-news/authentication/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-semibold text-[11px] transition-colors"
                >
                  <span>Open Firebase Authorized Domains Settings</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
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

          {/* Firebase Web Configuration Helper (For project isezerano-news) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowConfigHelper(prev => !prev)}
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Server className="w-3.5 h-3.5 text-teal-600" />
                <span>Firebase Web Connection: <span className="font-mono text-[11px] text-teal-800">isezerano-news</span></span>
                {firebaseReady ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    Config Required
                  </span>
                )}
              </div>
              {showConfigHelper ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showConfigHelper && (
              <div className="p-4 bg-white border-t border-slate-200 space-y-3.5 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Web Google Sign-In requires your Firebase Web App configuration for project <strong className="text-slate-800">isezerano-news</strong>. You can paste your Web API key or the <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">firebaseConfig</code> object below:
                </p>

                {configFeedback && (
                  <div className={`p-3 rounded-lg border text-xs ${
                    configFeedback.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    {configFeedback.message}
                  </div>
                )}

                <form onSubmit={handleSaveConnection} className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Firebase Web API Key or firebaseConfig snippet:
                    </label>
                    <textarea
                      rows={3}
                      value={configInput}
                      onChange={(e) => setConfigInput(e.target.value)}
                      placeholder='Paste your API key (e.g. AIzaSy...) or {"apiKey": "AIzaSy...", ...}'
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-slate-400"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="submit"
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-semibold text-xs cursor-pointer shadow-sm transition-colors"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Save & Connect Firebase</span>
                    </button>

                    <a
                      href="https://console.firebase.google.com/project/isezerano-news/settings/general"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-[11px] text-teal-700 hover:text-teal-900 underline font-medium"
                    >
                      <span>Open Firebase Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </form>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">Where to find this in Firebase Console:</p>
                  <ol className="list-decimal pl-4 space-y-0.5 text-slate-600">
                    <li>Go to <strong>Firebase Console</strong> → Project <strong>isezerano-news</strong></li>
                    <li>Click <strong>Project Settings (gear icon)</strong> → <strong>General</strong></li>
                    <li>Scroll down to <strong>Your apps</strong>. If you haven't created a Web App, click <strong>Web (&lt;/&gt;)</strong> to register one</li>
                    <li>Copy the <strong>apiKey</strong> or the entire <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">firebaseConfig</code> code snippet and paste it above</li>
                  </ol>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tip: For automatic CI/CD deployment via GitHub Actions, add <code className="font-mono">VITE_FIREBASE_API_KEY</code> to your repository environment variables.
                  </p>
                </div>
              </div>
            )}
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

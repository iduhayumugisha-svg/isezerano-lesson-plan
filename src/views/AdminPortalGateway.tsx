import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  KeyRound, 
  Sparkles,
  LogOut,
  ExternalLink,
  BookOpen
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
  const { user, isAdmin, signIn, signInWithGoogle, signOutUser, sendResetEmail } = useAuth();
  
  const [email, setEmail] = useState('twizerefelix90@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);

  // If already verified admin, this shouldn't normally be rendered, but provide a fast jump
  if (isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-8 h-8 text-teal-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Administrator Access Confirmed</h2>
          <p className="text-sm text-slate-600">
            You are signed in as <strong className="text-slate-900">{user?.email}</strong> with full platform administration privileges.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('admin')}
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-teal-700 hover:bg-teal-600 text-white shadow-sm"
          >
            Open Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Handle Google 1-Click Sign-In
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        setSuccessMsg('Authenticated successfully! Loading Administrator Dashboard...');
      } else {
        setErrorMsg(res.error || 'Google sign-in was not completed.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Email & Password Sign-In
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both your administrator email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signIn(email.trim(), password);
      if (res.success) {
        setSuccessMsg('Signed in successfully! Loading Administrator Dashboard...');
      } else {
        setErrorMsg(res.error || 'Failed to sign in. Please verify your email and password.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred during sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Password Reset Request
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter your email to receive password reset instructions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendResetEmail(email.trim());
      if (res.success) {
        setSuccessMsg(`Password reset instructions have been sent to ${email.trim()}. Please check your email inbox.`);
      } else {
        setErrorMsg(res.error || 'Failed to send password reset email.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      
      {/* Back button */}
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
            <span>Designated Admin: twizerefelix90@gmail.com</span>
          </div>

          <p className="text-xs text-slate-300 mt-3 leading-relaxed">
            Sign in to access platform management controls, upload and publish homepage photos, configure Rwanda CBC curriculum parameters, and oversee teacher accounts.
          </p>
        </div>

        {/* Notice for logged-in non-admin user */}
        {user && !isAdmin && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Access Restricted</p>
                <p className="mt-0.5">
                  You are currently signed in as <strong className="text-slate-900">{user.email}</strong> ({user.role || 'teacher'}). This account does not have administrator privileges.
                </p>
                <p className="mt-1 text-[11px] text-amber-800">
                  Only the designated administrator (<strong className="font-bold">twizerefelix90@gmail.com</strong>) has access to the Admin Portal.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-1 pl-6">
              <button
                type="button"
                onClick={() => signOutUser()}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-200/80 hover:bg-amber-300 text-amber-900 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out & Switch Account</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-amber-100 cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Public info banner */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Teachers & public visitors remain in read-only mode</span>
          </span>
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-teal-700 hover:text-teal-900 font-semibold cursor-pointer underline text-[11px]"
          >
            Lesson Planner →
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isResetMode ? (
            <>
              {/* Option 1: Fast 1-Click Google Sign-In */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm transition-all shadow-2xs flex items-center justify-center space-x-3 cursor-pointer disabled:opacity-50 hover:border-slate-400"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Sign in with Google (twizerefelix90@gmail.com)</span>
                </button>

                <div className="relative flex items-center justify-center pt-2 pb-1">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] uppercase font-bold text-slate-400 absolute">
                    or sign in with password
                  </span>
                </div>
              </div>

              {/* Option 2: Email & Password Form */}
              <form onSubmit={handlePasswordSignIn} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Administrator Email
                    </label>
                    <button
                      type="button"
                      onClick={() => setEmail('twizerefelix90@gmail.com')}
                      className="text-[11px] text-teal-700 hover:text-teal-800 font-semibold cursor-pointer underline"
                    >
                      Fill Administrator Email
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="twizerefelix90@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setIsResetMode(true); setErrorMsg(null); setSuccessMsg(null); }}
                      className="text-[11px] text-slate-500 hover:text-teal-700 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-md active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer mt-2"
                >
                  <KeyRound className="w-4 h-4 text-teal-400" />
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Administrator Portal'}</span>
                </button>
              </form>
            </>
          ) : (
            /* Password Reset Request Form */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Administrator Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="twizerefelix90@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-teal-700 hover:bg-teal-600 text-white transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsResetMode(false); setErrorMsg(null); setSuccessMsg(null); }}
                  className="px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer info inside card */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          <span>Official CBC Lesson Planning Portal • GS GITUMBA, Buyoga, Rulindo District</span>
        </div>

      </div>

    </div>
  );
};

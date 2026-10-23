import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  School, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup' | 'reset';
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultMode = 'signin' 
}) => {
  const { signIn, signUp, sendResetEmail } = useAuth();
  const [view, setView] = useState<'signin' | 'signup' | 'reset'>(
    defaultMode === 'signup' ? 'signup' : defaultMode === 'reset' ? 'reset' : 'signin'
  );
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter your email address to receive password reset instructions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendResetEmail(email.trim());
      if (res.success) {
        setSuccessMsg(`Password reset instructions have been sent to ${email.trim()}. Please check your inbox.`);
      } else {
        setErrorMsg(res.error || 'Failed to send password reset email.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (view === 'reset') {
      return handleResetPassword(e);
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (view === 'signin') {
        const result = await signIn(email, password);
        if (result.success) {
          setSuccessMsg('Signed in successfully! Redirecting...');
          setTimeout(() => {
            onClose();
          }, 800);
        } else {
          setErrorMsg(result.error || 'Failed to sign in. Please verify your email and password.');
        }
      } else {
        const result = await signUp(email, password, displayName, schoolName);
        if (result.success) {
          setSuccessMsg('Optional cloud account created! You can now sync lesson plans.');
          setTimeout(() => {
            onClose();
          }, 1000);
        } else {
          setErrorMsg(result.error || 'Failed to create account.');
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 shadow-md">
              <img 
                src="/isezerano-online-logo.jpg" 
                alt="ISEZERANO ONLINE Logo" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center space-x-2">
                <span>Admin & Account Portal</span>
              </h2>
              <p className="text-xs text-teal-300 font-medium">
                ISEZERANO ONLINE • GS GITUMBA
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            {view === 'signin' && 'Sign in for Administrator controls, curriculum configuration, or cloud synchronization.'}
            {view === 'reset' && 'Enter your verified account email to receive a password reset link.'}
            {view === 'signup' && 'Optional account creation for teachers wishing to sync lesson plans across devices.'}
          </p>
        </div>

        {/* Public Notice for Teachers */}
        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 flex items-start space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-900 leading-normal">
            <span className="font-bold">Teachers Notice:</span> You do <span className="font-bold underline">not</span> need an account to generate, customize, or print lesson plans. The CBC Lesson Plan Generator is 100% free and publicly accessible.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          {/* Optional Sign up extra fields */}
          {view === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name / Izina Ryose
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. MUGABO Jean Claude"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  School Name / Ishuri (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <School className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. GS GITUMBA"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Email Address
              </label>
              {view === 'signin' && (
                <button
                  type="button"
                  onClick={() => setEmail('twizerefelix90@gmail.com')}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline"
                >
                  Fill Owner Email
                </button>
              )}
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
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Password (if not password reset) */}
          {view !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                {view === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setView('reset'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-[11px] text-slate-500 hover:text-emerald-700 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
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
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Minimum 6 characters</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <span>Processing...</span>
            ) : view === 'signin' ? (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Sign In to Admin / Workspace</span>
              </>
            ) : view === 'reset' ? (
              <>
                <Mail className="w-4 h-4" />
                <span>Send Password Reset Link</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create Optional Account</span>
              </>
            )}
          </button>

          {/* Secondary Footer Links */}
          <div className="pt-2 border-t border-slate-100 flex flex-col items-center space-y-1 text-xs text-slate-500">
            {view === 'reset' ? (
              <button
                type="button"
                onClick={() => { setView('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer flex items-center space-x-1"
              >
                <span>Back to Admin Sign In</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <div className="flex items-center space-x-3 text-[11px]">
                {view === 'signin' ? (
                  <button
                    type="button"
                    onClick={() => { setView('signup'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Need an optional cloud sync account?
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setView('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                  >
                    Already have an account? Sign In
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

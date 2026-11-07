import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  School,
  GraduationCap,
  BookOpen,
  Calendar,
  MapPin,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Lock,
  Sparkles,
  Layers,
  FileText,
  RefreshCw,
  Home,
  Check,
  Plus,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  TeacherProfile,
  TeacherGender,
  RWANDA_CBC_SUBJECTS,
  RWANDA_EDUCATION_CLASSES,
  TEACHING_QUALIFICATIONS
} from '../types/teacherProfile';
import {
  getTeacherProfile,
  saveTeacherProfile
} from '../services/teacherProfileService';

interface TeacherProfileViewProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
}

export const TeacherProfileView: React.FC<TeacherProfileViewProps> = ({
  onNavigateHome,
  onNavigateDashboard
}) => {
  const { user, isAdmin, signInWithGoogle } = useAuth();

  const [profile, setProfile] = useState<TeacherProfile>({
    ownerUid: user?.uid || '',
    email: user?.email || '',
    fullName: user?.displayName || '',
    phone: '',
    gender: '',
    schoolName: user?.schoolName || 'GS GITUMBA',
    qualification: '',
    subjectsTaught: [],
    classesTaught: [],
    experienceYears: '',
    district: 'Rulindo',
    sector: 'Gitumba',
    bio: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  // Load teacher profile when user changes or on mount
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const saved = await getTeacherProfile(user.uid);
        if (isMounted) {
          if (saved) {
            setProfile(saved);
          } else {
            setProfile(prev => ({
              ...prev,
              ownerUid: user.uid,
              email: user.email || '',
              fullName: user.displayName || user.email?.split('@')[0] || '',
              schoolName: user.schoolName || 'GS GITUMBA'
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load teacher profile:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Handle saving profile
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      setFeedback({ type: 'error', message: 'Ugomba kuba winjiye na Google kugira ngo ubike umwirondoro wawe.' });
      return;
    }

    if (!profile.fullName.trim()) {
      setFeedback({ type: 'error', message: 'Nyamuneka andika amazina yawe yose (Full name is required).' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const result = await saveTeacherProfile({
        ...profile,
        ownerUid: user.uid,
        email: user.email || profile.email
      });

      if (result.success) {
        setFeedback({
          type: 'success',
          message: 'Umwirondoro wawe wabitswe neza muri Firebase Firestore! Biraboneka ku bikoresho byawe byose.'
        });
        if (result.profile) {
          setProfile(result.profile);
        }
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Habaye ikosa mu kubika umwirondoro. Ongera ugerageze.'
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error saving profile';
      setFeedback({ type: 'error', message });
    } finally {
      setIsSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Toggle subject selection
  const handleToggleSubject = (sub: string) => {
    setProfile(prev => {
      const current = prev.subjectsTaught || [];
      if (current.includes(sub)) {
        return { ...prev, subjectsTaught: current.filter(s => s !== sub) };
      } else {
        return { ...prev, subjectsTaught: [...current, sub] };
      }
    });
  };

  // Add custom subject
  const handleAddCustomSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if (!profile.subjectsTaught.includes(trimmed)) {
      setProfile(prev => ({
        ...prev,
        subjectsTaught: [...prev.subjectsTaught, trimmed]
      }));
    }
    setCustomSubjectInput('');
  };

  // Toggle class selection
  const handleToggleClass = (cls: string) => {
    setProfile(prev => {
      const current = prev.classesTaught || [];
      if (current.includes(cls)) {
        return { ...prev, classesTaught: current.filter(c => c !== cls) };
      } else {
        return { ...prev, classesTaught: [...current, cls] };
      }
    });
  };

  // If user is not logged in, prompt sign-in
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center border border-teal-200">
            <User className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Injira muri Konti ya Mwarimu
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Kugira ngo ukoreshe kandi ubike umwirondoro wawe (Teacher Profile) muri ISEZERANO ONLINE – GS GITUMBA, ugomba kwinjira ukoresheje konti yawe ya Google.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z" />
                <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z" />
              </svg>
              <span>Injira na Google (Sign In with Google)</span>
            </button>

            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Subira Ahabanza</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Navigation Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-teal-700" />
            <span>Ahabanza</span>
          </button>
          <span className="text-slate-300">/</span>
          <button
            type="button"
            onClick={onNavigateDashboard}
            className="text-xs font-semibold text-slate-600 hover:text-teal-700 cursor-pointer"
          >
            Dashboard
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">
            Profil ya Mwarimu (Teacher Profile)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || isLoading}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Biracyabikwa...' : 'Bika Umwirondoro'}</span>
          </button>
        </div>
      </div>

      {/* Main Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 shadow-sm border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>Rwanda CBC Educator Profile</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                <School className="w-3 h-3 text-teal-400" />
                <span>GS GITUMBA, Rulindo</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Profil ya Mwarimu (Teacher Profile)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Injiza kandi uvugurure amakuru yawe y\'akazi n\'imyirondoro. Aya makuru ashyirwa ku nyandiko zo kwitegura (Lesson Plans) n\'amakarita y\'amanota (Report Cards) mu buryo bwizewe kandi buhoraho muri Firebase.
            </p>
          </div>

          {/* User Badge Avatar */}
          <div className="flex items-center space-x-3.5 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center font-bold text-lg text-teal-300">
              {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {profile.fullName || user.displayName || 'Mwarimu'}
              </p>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {user.email}
              </p>
              <span className="text-[10px] text-teal-400 font-semibold block mt-0.5">
                Google Verified Account
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications / Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-3 shadow-2xs animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border border-rose-300 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* SECTION 1: Personal Identification */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Umwirondoro Bwite (Personal Identification)
              </h2>
              <p className="text-xs text-slate-500">
                Amazina, nimero ya telefoni, igitsina na konti yawe
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Full Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Amazina Yose (Full Name) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="urugero: MUGABO Jean Claude"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Nimero ya Telefoni (Phone Number)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="urugero: 0782971258 cyangwa +250 788..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Email (Read-only / Locked) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-slate-700">
                  Imeri ya Google (Email Address)
                </label>
                <span className="text-[10px] text-slate-500 flex items-center space-x-1 font-semibold">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Ntihindurwa (Locked)</span>
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  disabled
                  value={user.email || profile.email}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-100/80 text-slate-600 font-mono text-xs cursor-not-allowed select-none"
                  title="Your authenticated Google email cannot be changed manually."
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Konti winjiriyeho ya Google yizewe mu buryo bwa Firebase.
              </p>
            </div>

            {/* Gender */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Igitsina (Gender)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Gabo', 'Gore', 'Other'] as TeacherGender[]).map((gen) => (
                  <button
                    key={gen}
                    type="button"
                    onClick={() => setProfile({ ...profile, gender: gen })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      profile.gender === gen
                        ? 'bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {gen === 'Gabo' ? 'Gabo (Male)' : gen === 'Gore' ? 'Gore (Female)' : 'Ikindi'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: School & Professional Qualifications */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <School className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Ikigo cy'Amashuri & Impamyabumenyi (School & Qualifications)
              </h2>
              <p className="text-xs text-slate-500">
                Aho wigisha n'urwego rw'uburezi ubarizwamo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* School Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Izina ry'Ikigo cy'Amashuri (School Name)
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={profile.schoolName}
                  onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                  placeholder="urugero: GS GITUMBA"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Teaching Qualification */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Impamyabumenyi mu Burezi (Teaching Qualification)
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={profile.qualification}
                  onChange={(e) => setProfile({ ...profile, qualification: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 bg-white"
                >
                  <option value="">-- Hitamo Impamyabumenyi --</option>
                  {TEACHING_QUALIFICATIONS.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Years of Teaching Experience */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Imyaka y'Uburambe mu Bwarimu (Teaching Experience)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={profile.experienceYears || ''}
                  onChange={(e) => setProfile({ ...profile, experienceYears: e.target.value })}
                  placeholder="urugero: Imyaka 5 (5 years)"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900"
                />
              </div>
            </div>

            {/* District & Sector */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Akarere (District)
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={profile.district || ''}
                    onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                    placeholder="Rulindo"
                    className="w-full pl-8 pr-2 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Umurenge (Sector)
                </label>
                <input
                  type="text"
                  value={profile.sector || ''}
                  onChange={(e) => setProfile({ ...profile, sector: e.target.value })}
                  placeholder="Gitumba"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Teaching Assignment (Subjects & Classes) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                3. Ibyigwa n'Imyaka Wigisha (Subjects & Classes Taught)
              </h2>
              <p className="text-xs text-slate-500">
                Hitamo amasomo n'ibyiciro by'abanyeshuri ushinzwe kwigisha (Rwanda CBC)
              </p>
            </div>
          </div>

          {/* Classes Taught Selection */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700 text-xs">
              Imyaka Wigisha (Classes Taught)
            </label>
            <p className="text-[11px] text-slate-500">
              Kanda ku mwaka wose wigisha:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {RWANDA_EDUCATION_CLASSES.map((cls) => {
                const isSelected = profile.classesTaught?.includes(cls);
                const isNursery = cls.startsWith('N');
                const isPrimary = cls.startsWith('P');

                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => handleToggleClass(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                      isSelected
                        ? isNursery
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : isPrimary
                          ? 'bg-teal-700 text-white shadow-2xs'
                          : 'bg-indigo-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{cls}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subjects Taught Selection */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block font-bold text-slate-700 text-xs">
              Amasomo Wigisha (Subjects Taught)
            </label>
            <p className="text-[11px] text-slate-500">
              Kanda ku masomo wigisha (urashobora guhitamo menshi):
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {RWANDA_CBC_SUBJECTS.map((sub) => {
                const isSelected = profile.subjectsTaught?.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleToggleSubject(sub)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-teal-700 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{sub}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Subject Input */}
            <div className="flex items-center space-x-2 pt-2 max-w-md">
              <input
                type="text"
                placeholder="Andi masomo (Custom subject)..."
                value={customSubjectInput}
                onChange={(e) => setCustomSubjectInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSubject();
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium"
              />
              <button
                type="button"
                onClick={handleAddCustomSubject}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ongeraho</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 4: Professional Bio & Responsibilities */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                4. Inshingano n'Ibindi Bisobanuro (Professional Bio & Responsibilities)
              </h2>
              <p className="text-xs text-slate-500">
                Inshingano zihariye ku kigo (urugero: Dean of Studies, Ushinzwe ikinyabupfura, Umwarimu w'ishuri runaka, n'ibindi)
              </p>
            </div>
          </div>

          <div>
            <textarea
              rows={4}
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Andika hano inshingano zawe zihariye, amasomo waba ukunda kwigisha, amatsinda y'uburezi urimo cyangwa ubundi butumwa bw'ingirakamaro..."
              className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium text-slate-900 leading-relaxed"
            />
          </div>
        </div>

        {/* Bottom Save & Reset Action Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {profile.updatedAt 
                ? `Biheruka kubikwa: ${new Date(profile.updatedAt).toLocaleDateString()} saa ${new Date(profile.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Ntabwo bwari bwabikwe muri Cloud'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onNavigateDashboard}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Funga (Dashboard)
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Biracyabikwa muri Firestore...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Bika Umwirondoro Wose</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

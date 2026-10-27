import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  Settings as SettingsIcon, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  Server, 
  Key, 
  Copy, 
  Check, 
  Clock, 
  Search,
  UserX,
  UserCheck,
  Sparkles, 
  Palette,
  ArrowLeft,
  LogOut,
  BarChart3,
  ExternalLink,
  Eye,
  MessageCircle,
  Activity,
  TrendingUp,
  Globe,
  FileText
} from 'lucide-react';
import { UserProfile, AppSettings, LessonPlan } from '../types/lessonPlan';
import { getAppSettings, saveAppSettings } from '../services/appSettingsService';
import { listUsers, setUserStatus, setUserRole } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { SaasNavPage } from '../components/Sidebar';
import { SliderManager } from '../components/SliderManager';
import { WebsiteDesignManager } from '../components/WebsiteDesignManager';
import { WebsitePagesManager } from '../components/WebsitePagesManager';
import { 
  getAnalyticsSummary, 
  subscribeToSharedAnalytics, 
  AnalyticsSummary, 
  GA_MEASUREMENT_ID 
} from '../services/analyticsService';

interface AdminDashboardViewProps {
  lessonPlans: LessonPlan[];
  onNavigate: (page: SaasNavPage) => void;
  onLogout?: () => void;
}

type AdminTab = 'pages' | 'design' | 'slider' | 'analytics' | 'modules' | 'curriculum' | 'teachers' | 'usage' | 'security';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  lessonPlans,
  onNavigate,
  onLogout
}) => {
  const { user, isAdmin, signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('pages');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummary>(() => getAnalyticsSummary());

  // Curriculum editing local states
  const [newSubject, setNewSubject] = useState('');
  const [newClass, setNewClass] = useState('');

  useEffect(() => {
    loadAdminData();
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      const unsubscribe = subscribeToSharedAnalytics((fresh) => {
        setAnalyticsData(fresh);
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [appSettingsData, fetchedUsers] = await Promise.all([
        getAppSettings(),
        listUsers()
      ]);
      setSettings(appSettingsData);
      setUsersList(fetchedUsers);
      setAnalyticsData(getAnalyticsSummary());
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings || !user) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const result = await saveAppSettings(settings, user.uid);
      if (result.success) {
        setSaveStatus({ type: 'success', message: 'Platform settings saved successfully to Firestore!' });
      } else {
        setSaveStatus({ type: 'error', message: result.error || 'Failed to save settings.' });
      }
    } catch (err: unknown) {
      setSaveStatus({ type: 'error', message: err instanceof Error ? err.message : 'Error saving settings' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const handleToggleModule = (key: keyof AppSettings['enabledModules']) => {
    if (!settings) return;
    setSettings({
      ...settings,
      enabledModules: {
        ...settings.enabledModules,
        [key]: !settings.enabledModules[key]
      }
    });
  };

  const handleAddSubject = () => {
    if (!newSubject.trim() || !settings) return;
    if (settings.availableSubjects.includes(newSubject.trim())) return;
    setSettings({
      ...settings,
      availableSubjects: [...settings.availableSubjects, newSubject.trim()]
    });
    setNewSubject('');
  };

  const handleRemoveSubject = (subjectToRemove: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      availableSubjects: settings.availableSubjects.filter(s => s !== subjectToRemove)
    });
  };

  const handleAddClass = () => {
    if (!newClass.trim() || !settings) return;
    if (settings.availableClasses.includes(newClass.trim())) return;
    setSettings({
      ...settings,
      availableClasses: [...settings.availableClasses, newClass.trim()]
    });
    setNewClass('');
  };

  const handleRemoveClass = (classToRemove: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      availableClasses: settings.availableClasses.filter(c => c !== classToRemove)
    });
  };

  const handleToggleUserStatus = async (targetUser: UserProfile) => {
    const newStatus = targetUser.status === 'active' ? 'inactive' : 'active';
    const result = await setUserStatus(targetUser.uid, newStatus);
    if (result.success) {
      setUsersList(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, status: newStatus } : u));
    } else {
      alert(`Could not update status: ${result.error}`);
    }
  };

  const handleToggleUserRole = async (targetUser: UserProfile) => {
    if (targetUser.uid === user?.uid) {
      alert('You cannot demote your own administrator account.');
      return;
    }
    const newRole = targetUser.role === 'admin' ? 'teacher' : 'admin';
    const result = await setUserRole(targetUser.uid, newRole);
    if (result.success) {
      setUsersList(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, role: newRole } : u));
    } else {
      alert(`Could not update role: ${result.error}`);
    }
  };

  // If not logged in as Admin, block access securely
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Access Restricted: Administrator Privileges Required
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            You are signed in as a <strong className="text-emerald-700 capitalize">{user?.role || 'Guest'}</strong>. 
            The Admin Management Dashboard is exclusively reserved for verified administrators with role authorization in Cloud Firestore.
          </p>
          <div className="pt-4 flex justify-center space-x-3">
            <button
              onClick={() => onNavigate('create')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Lesson Plan Generator</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const primaryPlansCount = lessonPlans.filter(p => p.educationLevel === 'Primary').length;
  const secondaryPlansCount = lessonPlans.filter(p => p.educationLevel === 'Secondary').length;
  const filteredUsers = usersList.filter(u => 
    u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (u.displayName && u.displayName.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
    (u.schoolName && u.schoolName.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

  const adminSetupScript = `// scripts/setup-admin.js
// Run in your server or terminal with Firebase Admin SDK credentials:
const admin = require('firebase-admin');

// Initialize with service account:
admin.initializeApp({
  credential: admin.credential.applicationDefault(), // or admin.credential.cert(serviceAccount)
  projectId: 'isezerano-news'
});

const db = admin.firestore();

async function promoteToAdmin(targetEmail) {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', targetEmail).get();

  if (snapshot.empty) {
    console.log('No user found with email:', targetEmail);
    return;
  }

  snapshot.forEach(async (doc) => {
    await doc.ref.update({
      role: 'admin',
      status: 'active',
      updatedAt: new Date().toISOString()
    });
    console.log(\`Successfully promoted \${targetEmail} to Admin!\`);
  });
}

// Example usage:
promoteToAdmin('admin@example.com');`;

  // Defense-in-depth: Strict authorization guard
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 text-center bg-white rounded-2xl border border-red-200 shadow-md space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Administrator Access Required</h2>
        <p className="text-sm text-slate-600">
          This management dashboard is restricted exclusively to authorized platform administrators.
        </p>
        <button
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Public Website</span>
        </button>
      </div>
    );
  }

  const handleLogoutClick = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await signOutUser();
      onNavigate('home' as SaasNavPage);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-teal-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-2 border border-teal-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Authorized Administrator{user?.displayName ? `: ${user.displayName}` : ''}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            ISEZERANO ONLINE – Admin Management Dashboard
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Manage homepage photos, curriculum parameters, platform settings, and teacher access.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadAdminData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving || !settings}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
          <button
            onClick={handleLogoutClick}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all active:scale-95 cursor-pointer ml-1"
            title="Terminate administrator session and return to public website"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveStatus && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-sm ${
          saveStatus.type === 'success'
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
            : 'bg-red-50 border border-red-300 text-red-800'
        }`}>
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'pages'
              ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-400/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-300" />
          <span>Website Pages</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'pages' ? 'bg-teal-800 text-teal-100' : 'bg-teal-100 text-teal-800'}`}>
            About, Contact, Privacy, Terms
          </span>
        </button>

        <button
          onClick={() => setActiveTab('design')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'design'
              ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-400/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Palette className="w-4 h-4 text-amber-300" />
          <span>Website Design & Logo</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'design' ? 'bg-teal-800 text-teal-100' : 'bg-teal-100 text-teal-800'}`}>
            Colors, Fonts & Logo
          </span>
        </button>

        <button
          onClick={() => setActiveTab('slider')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'slider'
              ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-400/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Homepage Photos</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'slider' ? 'bg-teal-800 text-teal-100' : 'bg-teal-100 text-teal-800'}`}>
            Slides
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('analytics');
            setAnalyticsData(getAnalyticsSummary());
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-300" />
          <span>Website Analytics</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'analytics' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'}`}>
            GA4 Live
          </span>
        </button>

        <button
          onClick={() => setActiveTab('modules')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'modules'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Modules & Platform</span>
        </button>

        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'curriculum'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Curriculum & Classes</span>
        </button>

        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Teacher Accounts ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('usage')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'usage'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Usage & Activity</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Admin Setup & Security</span>
        </button>
      </div>

      {/* ================= TAB: WEBSITE PAGES MANAGEMENT (About, Contact, Privacy, Terms) ================= */}
      {activeTab === 'pages' && (
        <WebsitePagesManager />
      )}

      {/* ================= TAB: WEBSITE DESIGN, TYPOGRAPHY & LOGO MANAGER ================= */}
      {activeTab === 'design' && (
        <WebsiteDesignManager />
      )}

      {/* ================= TAB 0: HOMEPAGE HERO SLIDER MANAGEMENT ================= */}
      {activeTab === 'slider' && (
        <SliderManager />
      )}

      {/* ================= TAB: WEBSITE ANALYTICS & GOOGLE ANALYTICS 4 ================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Top Status & Overview Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white border border-emerald-500/30 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Google Analytics 4 • Live Stream Connected</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Website Traffic & Conversion Analytics
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                  Monitoring visitor traffic, lesson-planning activity, and parent/teacher WhatsApp inquiries for <span className="text-emerald-300 font-semibold">ISEZERANO ONLINE – GS GITUMBA</span>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnalyticsData(getAnalyticsSummary())}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                  title="Refresh live metrics from Cloud Firestore and local session"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Metrics</span>
                </button>

                <a
                  href="https://analytics.google.com/analytics/web/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer"
                  title="Open official Google Analytics property console"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open GA4 Console</span>
                </a>
              </div>
            </div>

            {/* Connection Credentials Pill Bar */}
            <div className="mt-5 pt-4 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center space-x-2 bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium">Measurement ID:</span>
                <code className="text-emerald-400 font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                  {analyticsData.measurementId || GA_MEASUREMENT_ID}
                </code>
              </div>
              <div className="flex items-center space-x-2 bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium">Firebase Project:</span>
                <span className="text-teal-300 font-mono font-semibold">isezerano-news</span>
              </div>
              <div className="flex items-center space-x-2 bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium">WhatsApp Conversion:</span>
                <span className="text-amber-300 font-mono font-semibold">0782971258</span>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Page Views */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Page Views
                </span>
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Eye className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">
                {analyticsData.totalPageViews}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                <span className="text-emerald-600 font-semibold">SPA tracked</span>
                <span>across all public & tool pages</span>
              </p>
            </div>

            {/* 2. WhatsApp Inquiries */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs hover:border-emerald-300 transition-all bg-linear-to-b from-white to-emerald-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  WhatsApp Inquiries
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <MessageCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-emerald-700 tracking-tight">
                {analyticsData.totalWhatsAppClicks}
              </div>
              <p className="text-xs text-emerald-800/80 mt-1">
                Clicks on floating 0782971258 button
              </p>
            </div>

            {/* 3. Lesson Plans Created */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  CBC Lesson Plans
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-purple-700 tracking-tight">
                {analyticsData.totalLessonPlansCreated}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {lessonPlans.length} saved in local & cloud storage
              </p>
            </div>

            {/* 4. PDF Exports */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  A4 PDF Exports
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-blue-700 tracking-tight">
                {analyticsData.totalPdfExports}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Standard CBC official prints generated
              </p>
            </div>
          </div>

          {/* Detailed Two-Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column A: Traffic Breakdown by Page */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Traffic by Website Section</span>
                </h3>
                <span className="text-xs text-slate-500">
                  {analyticsData.totalPageViews} total views
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { key: 'home', label: 'Homepage & Hero Slider', path: '/' },
                  { key: 'dashboard', label: 'Lesson Plan Hub', path: '/dashboard' },
                  { key: 'create', label: 'CBC Plan Creator (8 Columns)', path: '/create' },
                  { key: 'saved', label: 'Saved Lesson Plans', path: '/saved' },
                  { key: 'settings', label: 'Teacher Preferences', path: '/settings' },
                  { key: 'about', label: 'About GS GITUMBA', path: '/about' },
                  { key: 'contact', label: 'Contact & Location', path: '/contact' },
                  { key: 'privacy', label: 'Privacy Policy', path: '/privacy' },
                  { key: 'admin', label: 'Admin Management Portal', path: '/admin' }
                ].map((item) => {
                  const count = analyticsData.pageViewsByPage[item.key] || 0;
                  const percentage = analyticsData.totalPageViews > 0 
                    ? Math.round((count / analyticsData.totalPageViews) * 100) 
                    : 0;

                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 font-medium text-slate-700">
                          <span className="font-semibold text-slate-900">{item.label}</span>
                          <span className="text-slate-400 font-mono text-[11px]">({item.path})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{count} views</span>
                          <span className="text-slate-400 text-[11px] w-8 text-right">{percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column B: Real-Time Event Activity Feed */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Recent Activity Stream</span>
                </h3>
                <span className="text-xs text-slate-500">Live feed</span>
              </div>

              {analyticsData.recentEvents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No activity events recorded yet. Browse the website or create a plan to test tracking.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {analyticsData.recentEvents.map((evt) => {
                    const isWhatsApp = evt.eventName === 'whatsapp_click';
                    const isLessonPlan = evt.eventName === 'lesson_plan_created';
                    const isPdf = evt.eventName === 'lesson_plan_export_pdf';

                    const badgeColor = isWhatsApp
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : isLessonPlan
                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                      : isPdf
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200';

                    return (
                      <div
                        key={evt.id}
                        className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-200 transition-colors flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                              {evt.eventName}
                            </span>
                            <span className="text-slate-400 text-[11px] font-mono">
                              /{evt.page}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800 text-xs">
                            {evt.label}
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Architectural Transparency & Security Disclosure */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-xs text-slate-600 space-y-4">
            <div className="font-bold text-slate-900 flex items-center space-x-2 text-sm">
              <Globe className="w-4 h-4 text-teal-600" />
              <span>Google Analytics 4 & Shared Cloud Firestore Telemetry</span>
            </div>
            <p className="leading-relaxed">
              Traffic and user interactions are tracked with dual-layer integrity for <span className="font-semibold text-slate-900">ISEZERANO ONLINE – GS GITUMBA</span>:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-xs">Google Analytics 4 Property</span>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Official stream (<code className="text-emerald-700 font-mono font-semibold">{analyticsData.measurementId || GA_MEASUREMENT_ID}</code>) transmits telemetry to Google Cloud for official reports and geographical demographics.
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-xs">Shared Cloud Counters</span>
                <p className="text-[11px] text-slate-600 leading-normal">
                  All page views, lesson plan generations, and WhatsApp clicks synchronize to Firestore (<code className="text-teal-700 font-mono font-semibold">site_stats/counters</code>) in real time across every visitor device.
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-xs">Data Preservation</span>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Reset buttons have been completely removed. Existing view counts and historical metrics are permanently preserved in the shared database.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 1: MODULES & PLATFORM ================= */}
      {activeTab === 'modules' && settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Platform Info */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <SettingsIcon className="w-4 h-4 text-purple-600" />
              <span>General Platform Settings</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Default School Name (Used in new lesson plans)
                </label>
                <input
                  type="text"
                  value={settings.schoolDefaultName}
                  onChange={(e) => setSettings({ ...settings, schoolDefaultName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Active Academic Year
                </label>
                <input
                  type="text"
                  value={settings.academicYear}
                  onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Curriculum Standard Title
                </label>
                <input
                  type="text"
                  value={settings.curriculumVersion}
                  onChange={(e) => setSettings({ ...settings, curriculumVersion: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Configurable Optional Feature Modules */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <ToggleRight className="w-4 h-4 text-purple-600" />
              <span>Configurable Feature Modules</span>
            </h3>
            <p className="text-xs text-slate-500">
              Enable or disable application modules across the SaaS platform for teachers.
            </p>

            <div className="space-y-3 pt-1">
              {/* Student Identification Module */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Student Identification Module</h4>
                  <p className="text-[11px] text-slate-500">Learner demographics, boy/girl tally and class profiles</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleModule('studentIdentification')}
                  className="text-purple-600 hover:text-purple-700 cursor-pointer"
                >
                  {settings.enabledModules.studentIdentification ? (
                    <ToggleRight className="w-8 h-8 text-purple-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400" />
                  )}
                </button>
              </div>

              {/* AI Assistance Module */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">AI Assistance & Suggestions</h4>
                  <p className="text-[11px] text-slate-500">Curriculum competency guidance and activity drafting</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleModule('aiAssistance')}
                  className="text-purple-600 hover:text-purple-700 cursor-pointer"
                >
                  {settings.enabledModules.aiAssistance ? (
                    <ToggleRight className="w-8 h-8 text-purple-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Cloud Sync Module */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Firestore Cloud Sync</h4>
                  <p className="text-[11px] text-slate-500">Real-time sync to Cloud Firestore collections</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleModule('cloudSync')}
                  className="text-purple-600 hover:text-purple-700 cursor-pointer"
                >
                  {settings.enabledModules.cloudSync ? (
                    <ToggleRight className="w-8 h-8 text-purple-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Print / PDF Export Module */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Official PDF & Print Export</h4>
                  <p className="text-[11px] text-slate-500">Official MINEDUC/REB 8-column printable table formats</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleModule('printExport')}
                  className="text-purple-600 hover:text-purple-700 cursor-pointer"
                >
                  {settings.enabledModules.printExport ? (
                    <ToggleRight className="w-8 h-8 text-purple-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: CURRICULUM & CLASSES ================= */}
      {activeTab === 'curriculum' && settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manage Classes */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span>Available Classes / Grades</span>
            </h3>
            <p className="text-xs text-slate-500">
              Classes available in the generator dropdown for teachers (e.g., P1 to P6, S1 to S6).
            </p>

            {/* Add class */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="New class (e.g., S3B)"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
              />
              <button
                type="button"
                onClick={handleAddClass}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Class badges list */}
            <div className="flex flex-wrap gap-2 pt-2">
              {settings.availableClasses.map((cls) => (
                <span
                  key={cls}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200"
                >
                  <span>{cls}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveClass(cls)}
                    className="p-0.5 rounded hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Manage Subjects */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>Supported Curriculum Subjects</span>
            </h3>
            <p className="text-xs text-slate-500">
              Subjects offered under Rwanda Competence-Based Curriculum (CBC).
            </p>

            {/* Add Subject */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="New subject (e.g., Economics)"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Subjects list */}
            <div className="flex flex-wrap gap-2 pt-2 max-h-80 overflow-y-auto">
              {settings.availableSubjects.map((sub) => (
                <span
                  key={sub}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <span>{sub}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(sub)}
                    className="p-0.5 rounded hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: TEACHER ACCOUNTS ================= */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Teacher & User Accounts Management</span>
              </h3>
              <p className="text-xs text-slate-500">
                View registered users, promote/demote administrator roles, or activate/deactivate teacher accounts.
              </p>
            </div>

            {/* Search users */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, email, school..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
              />
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">
                {usersList.length === 0 ? 'No user records retrieved yet.' : 'No users match your search.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="p-3">User / Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">School</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isSelf = u.uid === user?.uid;
                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">
                          {u.displayName || '—'} {isSelf && <span className="text-[10px] text-purple-600 font-bold">(You)</span>}
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">
                          {u.email}
                        </td>
                        <td className="p-3 text-slate-600">
                          {u.schoolName || '—'}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                              u.status === 'active'
                                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                            title={u.status === 'active' ? 'Deactivate access' : 'Activate access'}
                          >
                            {u.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>

                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleToggleUserRole(u)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors border border-slate-200"
                              title={u.role === 'admin' ? 'Change to Teacher' : 'Promote to Admin'}
                            >
                              {u.role === 'admin' ? 'Set as Teacher' : 'Make Admin'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: USAGE & ACTIVITY ================= */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Lesson Plans
              </span>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">
                {lessonPlans.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Saved across the system</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Primary Education Plans
              </span>
              <div className="mt-2 text-3xl font-extrabold text-blue-600">
                {primaryPlansCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">P1 to P6 curriculums</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Secondary Education Plans
              </span>
              <div className="mt-2 text-3xl font-extrabold text-indigo-600">
                {secondaryPlansCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">S1 to S6 curriculums</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Registered Users
              </span>
              <div className="mt-2 text-3xl font-extrabold text-purple-600">
                {usersList.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {usersList.filter(u => u.role === 'admin').length} Admin(s) • {usersList.filter(u => u.role === 'teacher').length} Teacher(s)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: ADMIN SETUP & SECURITY ================= */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <Key className="w-4 h-4 text-purple-600" />
              <span>Secure First-Admin Provisioning & Security Rules</span>
            </h3>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              In accordance with security requirements, <strong>Admin credentials and passwords are never hardcoded</strong> in client source files, and ordinary public sign-ups are restricted to the <strong>Teacher</strong> role by default.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
              <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>How to establish or promote an Admin in production:</span>
              </div>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                <li>Register the user through the standard Sign Up form (they receive <code>role: "teacher"</code>).</li>
                <li>In the <strong>Firebase Console &gt; Cloud Firestore</strong>, navigate to the <code>users</code> collection.</li>
                <li>Find the document matching the user's UID and change <code>role: "teacher"</code> to <code>role: "admin"</code>.</li>
                <li>Alternatively, execute the trusted server-side Node.js script below using the Firebase Admin SDK.</li>
              </ol>
            </div>

            {/* Script Box */}
            <div className="relative">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-slate-300 rounded-t-xl text-xs font-mono">
                <span>scripts/setup-admin.js</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(adminSetupScript);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2500);
                  }}
                  className="inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-bold"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Copied' : 'Copy Script'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-emerald-300 text-[11px] font-mono rounded-b-xl overflow-x-auto border-x border-b border-slate-800 leading-relaxed">
                {adminSetupScript}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

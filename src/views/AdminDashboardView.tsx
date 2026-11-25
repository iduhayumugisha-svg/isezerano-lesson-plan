import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  Copy,
  Check,
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
  FileText,
  Megaphone,
  Bell,
  Key,
  RefreshCw,
  Newspaper,
  SlidersHorizontal
} from 'lucide-react';
import { SaasNavPage } from '../types/platform';
import { useAuth } from '../context/AuthContext';
import { WebsiteDesignManager } from '../components/WebsiteDesignManager';
import { ColorAppearanceManager } from '../components/ColorAppearanceManager';
import { WebsitePagesManager } from '../components/WebsitePagesManager';
import { AdsManager } from '../components/AdsManager';
import { AdminNotificationManager } from '../components/AdminNotificationManager';
import { AdminBlogManager } from '../components/AdminBlogManager';
import { AdminWhatsAppSettings } from '../components/AdminWhatsAppSettings';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { formatWhatsAppDisplayNumber } from '../utils/whatsappUtils';
import {
  getAnalyticsSummary,
  subscribeToSharedAnalytics,
  AnalyticsSummary,
  GA_MEASUREMENT_ID
} from '../services/analyticsService';

interface AdminDashboardViewProps {
  onNavigate: (page: SaasNavPage) => void;
  onLogout?: () => void;
}

type AdminTab =
  | 'pages'
  | 'blog'
  | 'design'
  | 'appearance'
  | 'whatsapp'
  | 'ads'
  | 'analytics'
  | 'notifications'
  | 'security';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigate,
  onLogout
}) => {
  const { user, isAdmin, signOutUser } = useAuth();
  const { whatsappContact } = useWebsiteDesign();
  const [activeTab, setActiveTab] = useState<AdminTab>('blog');
  const [copiedScript, setCopiedScript] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummary>(() => getAnalyticsSummary());

  useEffect(() => {
    if (activeTab === 'analytics') {
      const unsubscribe = subscribeToSharedAnalytics((fresh) => {
        setAnalyticsData(fresh);
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

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
            The Admin Management Dashboard is exclusively reserved for the verified portal administrator.
          </p>
          <div className="pt-4 flex justify-center">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Public Newsroom</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const adminSetupScript = `// scripts/setup-admin.js
// Run locally with Firebase Admin SDK credentials:
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
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

  for (const docSnap of snapshot.docs) {
    await docSnap.ref.update({
      role: 'admin',
      status: 'active',
      updatedAt: new Date().toISOString()
    });
    console.log(\`Successfully promoted \${targetEmail} to Admin!\`);
  }
}

promoteToAdmin('twizerefelix90@gmail.com');`;

  const handleLogoutClick = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await signOutUser();
      onNavigate('home');
    }
  };

  const trackedSections = [
    { key: 'home', label: 'Newspaper Front Page', path: '/' },
    { key: 'blog', label: 'News Articles & Categories', path: '/blog' },
    { key: 'about', label: 'About Us', path: '/about' },
    { key: 'contact', label: 'Contact Us', path: '/contact' },
    { key: 'privacy', label: 'Privacy Policy', path: '/privacy' },
    { key: 'terms', label: 'Terms & Conditions', path: '/terms' },
    { key: 'admin', label: 'Admin Management Portal', path: '/admin' }
  ];

  const activeSectionsCount = trackedSections.filter(
    (item) => (analyticsData.pageViewsByPage[item.key] || 0) > 0
  ).length;

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
            ISEZERANO ONLINE – Newsroom Admin Dashboard
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Publish news articles, moderate reader comments, customize design &amp; static pages, and monitor live traffic.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <Newspaper className="w-4 h-4" />
            <span>View Public Site</span>
          </button>
          <button
            type="button"
            onClick={handleLogoutClick}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all active:scale-95 cursor-pointer"
            title="Terminate administrator session and return to public website"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('blog')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'blog'
              ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-400/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-teal-400" />
          <span>News &amp; Editorial</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'blog' ? 'bg-teal-800 text-teal-100' : 'bg-teal-100 text-teal-800'
            }`}
          >
            Articles, Categories &amp; Comments
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pages')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'pages'
              ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-400/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-300" />
          <span>Website Pages</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'pages' ? 'bg-teal-800 text-teal-100' : 'bg-teal-100 text-teal-800'
            }`}
          >
            About, Contact, Privacy, Terms
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('design')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'design'
              ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-400/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Palette className="w-4 h-4 text-amber-300" />
          <span>Website Branding &amp; Logo</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'design' ? 'bg-teal-800 text-teal-100' : 'bg-teal-100 text-teal-800'
            }`}
          >
            Name, Desc &amp; Logo
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'appearance'
              ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-400/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-teal-400" />
          <span>Color &amp; Appearance</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'appearance' ? 'bg-teal-800 text-teal-100' : 'bg-teal-100 text-teal-800'
            }`}
          >
            Theme &amp; Colors
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'whatsapp'
              ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span>WhatsApp Contact Settings</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'whatsapp' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {whatsappContact.enabled ? 'Active' : 'Off'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ads')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ads'
              ? 'bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-400/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Megaphone className="w-4 h-4 text-amber-300" />
          <span>Ads Management</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'ads' ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-100 text-indigo-800'
            }`}
          >
            Banners, Video &amp; Slots
          </span>
        </button>

        <button
          type="button"
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
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'analytics' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            GA4 Live
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'notifications'
              ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/30'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-emerald-400" />
          <span>Push Notifications</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'notifications' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            FCM
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Admin Setup &amp; Security</span>
        </button>
      </div>

      {/* ================= TAB: NEWS ARTICLES, CATEGORIES & COMMENTS ================= */}
      {activeTab === 'blog' && <AdminBlogManager />}

      {/* ================= TAB: WEBSITE PAGES MANAGEMENT (About, Contact, Privacy, Terms) ================= */}
      {activeTab === 'pages' && <WebsitePagesManager />}

      {/* ================= TAB: WEBSITE DESIGN, TYPOGRAPHY & LOGO MANAGER ================= */}
      {activeTab === 'design' && <WebsiteDesignManager />}

      {/* ================= TAB: COLOR & APPEARANCE CUSTOMIZATION ================= */}
      {activeTab === 'appearance' && <ColorAppearanceManager />}

      {/* ================= TAB: WHATSAPP CONTACT SETTINGS ================= */}
      {activeTab === 'whatsapp' && <AdminWhatsAppSettings />}

      {/* ================= TAB: ADS MANAGEMENT ================= */}
      {activeTab === 'ads' && <AdsManager />}

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
                  Website Traffic &amp; Reader Analytics
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                  Monitoring readership activity, section page views, and WhatsApp inquiries for{' '}
                  <span className="text-emerald-300 font-semibold">ISEZERANO ONLINE</span>.
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
                <span className="text-amber-300 font-mono font-semibold">
                  {formatWhatsAppDisplayNumber(whatsappContact.phoneNumber)}
                </span>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid (3 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <p className="text-xs text-slate-500 mt-1">
                <span className="text-emerald-600 font-semibold">SPA tracked</span> across all public routes
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
                Clicks on {formatWhatsAppDisplayNumber(whatsappContact.phoneNumber)} button
              </p>
            </div>

            {/* 3. Active Sections */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Portal Sections
                </span>
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                  <Globe className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-sky-700 tracking-tight">
                {activeSectionsCount} / {trackedSections.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Sections visited in shared telemetry
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
                {trackedSections.map((item) => {
                  const count = analyticsData.pageViewsByPage[item.key] || 0;
                  const percentage =
                    analyticsData.totalPageViews > 0
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
                  No activity events recorded yet. Browse the newsroom pages to test tracking.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {analyticsData.recentEvents.map((evt) => {
                    const isWhatsApp = evt.eventName === 'whatsapp_click';
                    const badgeColor = isWhatsApp
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
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
                          {new Date(evt.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
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
              <span>Google Analytics 4 &amp; Shared Cloud Firestore Telemetry</span>
            </div>
            <p className="leading-relaxed">
              Traffic and reader interactions are tracked with dual-layer integrity for{' '}
              <span className="font-semibold text-slate-900">ISEZERANO ONLINE</span>:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-xs">Google Analytics 4 Property</span>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Official stream (
                  <code className="text-emerald-700 font-mono font-semibold">
                    {analyticsData.measurementId || GA_MEASUREMENT_ID}
                  </code>
                  ) transmits telemetry to Google Cloud for reports and audience demographics.
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-xs">Shared Cloud Counters</span>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Page views and WhatsApp clicks synchronize to Firestore (
                  <code className="text-teal-700 font-mono font-semibold">site_stats/counters</code>) across devices.
                </p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-xs">Data Preservation</span>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Existing view counts and historical metrics are preserved continuously in Cloud Firestore.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: PUSH NOTIFICATIONS (FCM) ================= */}
      {activeTab === 'notifications' && <AdminNotificationManager />}

      {/* ================= TAB: ADMIN SETUP & SECURITY ================= */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <Key className="w-4 h-4 text-teal-700" />
              <span>Admin-Only Authentication &amp; Security Rules</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              ISEZERANO ONLINE operates as a dedicated news portal with <strong>Admin-Only authentication</strong>. Public visitors can browse, search, read, comment, and subscribe to breaking news alerts without creating an account. Administrative access is strictly limited to verified Google login for{' '}
              <code className="font-mono text-teal-800 font-semibold">twizerefelix90@gmail.com</code> and enforced server-side in Cloud Firestore and Firebase Storage security rules.
            </p>

            {/* Script Box */}
            <div className="relative">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-slate-300 rounded-t-xl text-xs font-mono">
                <span>scripts/setup-admin.js</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(adminSetupScript);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2500);
                  }}
                  className="inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
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

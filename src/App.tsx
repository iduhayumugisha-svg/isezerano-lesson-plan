import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  FolderClock, 
  Settings as SettingsIcon, 
  LayoutDashboard,
  ShieldCheck, 
  Home,
  Users,
  Newspaper,
  ArrowLeft
} from 'lucide-react';
import { LessonPlan } from './types/lessonPlan';
import { 
  getSavedLessonPlans, 
  saveLessonPlanToFirestore, 
  deleteLessonPlanFromFirestore, 
  duplicateLessonPlanLocal,
  createEmptyLessonPlan
} from './services/storageService';

// Public Website Components & Views
import { WebsiteHeader, WebsitePage } from './components/WebsiteHeader';
import { WebsiteFooter } from './components/WebsiteFooter';
import { HomeView } from './views/HomeView';
import { AboutView } from './views/AboutView';
import { ContactView } from './views/ContactView';
import { PrivacyPolicyView } from './views/PrivacyPolicyView';
import { TermsConditionsView } from './views/TermsConditionsView';
import { BlogListView } from './views/BlogListView';
import { BlogPostDetailView } from './views/BlogPostDetailView';
import { AdSlot } from './components/AdSlot';

// Central Protected Education Application Views
import { DashboardView } from './views/DashboardView';
import { CreateLessonPlanView } from './views/CreateLessonPlanView';
import { SavedLessonPlansView } from './views/SavedLessonPlansView';
import { SettingsView } from './views/SettingsView';
import { StudentsIdentificationView } from './views/StudentsIdentificationView';
import { PrintLessonPlanModal } from './components/PrintLessonPlanModal';
import { AdminPortalGateway } from './views/AdminPortalGateway';
import { EducationLoginGate } from './components/EducationLoginGate';

// Admin Portal & Modals
import { AdminDashboardView } from './views/AdminDashboardView';
import { AuthModal } from './components/AuthModal';

import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebsiteDesignProvider, useWebsiteDesign } from './context/WebsiteDesignContext';
import { FEATURE_FLAGS } from './config/features';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { initGoogleAnalytics, trackPageView, trackEvent } from './services/analyticsService';

export type AppPage = WebsitePage | 'students' | 'admin' | 'blog' | 'blog_post';

// Helper to extract initial blog post slug from URL
const getInitialBlogSlug = (): string | null => {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname;
  if (pathname.startsWith('/blog/') && pathname.length > 6) {
    return pathname.substring(6).replace(/\/$/, '');
  }
  const search = new URLSearchParams(window.location.search);
  if (search.get('post')) return search.get('post');
  return null;
};

// Helper to determine initial page from browser URL or hash (/admin, /manage, #admin, etc.)
const getPageFromUrl = (): AppPage => {
  if (typeof window === 'undefined') return 'home';
  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = new URLSearchParams(window.location.search);

  if (
    pathname === '/admin' || 
    pathname.startsWith('/admin/') || 
    pathname === '/manage' || 
    pathname.startsWith('/manage/') ||
    hash === '#admin' || 
    hash === '#manage' ||
    search.get('page') === 'admin'
  ) {
    return 'admin';
  }
  if (pathname.startsWith('/blog/') && pathname.length > 6) return 'blog_post';
  if (pathname === '/blog' || hash === '#blog' || search.get('page') === 'blog') return 'blog';
  if (pathname === '/dashboard' || hash === '#dashboard' || search.get('page') === 'dashboard') return 'dashboard';
  if (pathname === '/create' || hash === '#create' || search.get('page') === 'create') return 'create';
  if (pathname === '/saved' || hash === '#saved' || search.get('page') === 'saved') return 'saved';
  if (pathname === '/settings' || hash === '#settings' || search.get('page') === 'settings') return 'settings';
  if (pathname === '/students' || hash === '#students' || search.get('page') === 'students') return 'students';
  if (pathname === '/about' || hash === '#about' || search.get('page') === 'about') return 'about';
  if (pathname === '/contact' || hash === '#contact' || search.get('page') === 'contact') return 'contact';
  if (pathname === '/privacy' || hash === '#privacy' || search.get('page') === 'privacy') return 'privacy';
  if (pathname === '/terms' || hash === '#terms' || search.get('page') === 'terms') return 'terms';

  return 'home';
};

function AppContent() {
  const { t } = useLanguage();
  const { user, isAdmin, signOutUser } = useAuth();
  const { colors, typography } = useWebsiteDesign();

  // Route state initialized from browser URL
  const [currentPage, setCurrentPage] = useState<AppPage>(() => getPageFromUrl());
  const [selectedBlogSlug, setSelectedBlogSlug] = useState<string | null>(() => getInitialBlogSlug());

  // Education state: Saved CBC Lesson Plans
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [printingPlan, setPrintingPlan] = useState<LessonPlan | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Load saved lesson plans on mount
  const refreshData = () => {
    setLessonPlans(getSavedLessonPlans());
  };

  useEffect(() => {
    refreshData();

    // Listen to browser navigation (back/forward button and hash changes)
    const handleUrlChange = () => {
      const detected = getPageFromUrl();
      const slug = getInitialBlogSlug();
      setCurrentPage(detected);
      setSelectedBlogSlug(slug);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    // Clean up unwanted tracking parameters (e.g. ?utm_source=chatgpt.com) from browser URL
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const url = new URL(window.location.href);
        let modified = false;
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((key) => {
          if (url.searchParams.has(key)) {
            url.searchParams.delete(key);
            modified = true;
          }
        });
        if (modified) {
          const cleanPath = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash;
          window.history.replaceState({}, document.title, cleanPath);
        }
      } catch {
        // ignore
      }
    }

    // Initialize Google Analytics 4
    initGoogleAnalytics();

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Track SPA navigation in Google Analytics 4
  useEffect(() => {
    trackPageView(currentPage);
  }, [currentPage]);

  // Lesson plan save handler with ownerUid binding
  const handleSaveLessonPlan = async (plan: LessonPlan): Promise<{ success: boolean; error?: string }> => {
    const enrichedPlan: LessonPlan = {
      ...plan,
      ownerUid: user?.uid || plan.ownerUid,
      ownerEmail: user?.email || plan.ownerEmail,
      userId: user?.uid || plan.userId
    };

    const result = await saveLessonPlanToFirestore(enrichedPlan);
    if (result.success) {
      refreshData();
      setEditingPlan(enrichedPlan);
      trackEvent('lesson_plan_created', {
        subject: enrichedPlan.subject,
        grade: enrichedPlan.classGrade,
        page: currentPage
      });
    }
    return result;
  };

  // Lesson plan delete handler
  const handleDeleteLessonPlan = async (id: string) => {
    await deleteLessonPlanFromFirestore(id);
    refreshData();
  };

  // Duplicate lesson plan
  const handleDuplicateLessonPlan = (id: string) => {
    const duplicated = duplicateLessonPlanLocal(id);
    if (duplicated) {
      refreshData();
      setEditingPlan(duplicated);
      setCurrentPage('create');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Navigation router helpers
  const handleEditPlan = (plan: LessonPlan) => {
    setEditingPlan(plan);
    setCurrentPage('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrintPlan = (plan: LessonPlan) => {
    setPrintingPlan(plan);
    trackEvent('lesson_plan_export_pdf', {
      subject: plan.subject,
      title: plan.lessonTitle,
      page: currentPage
    });
  };

  const handleCreateNew = (prefill?: Partial<LessonPlan>) => {
    if (prefill) {
      const newPlan = createEmptyLessonPlan();
      setEditingPlan({ ...newPlan, ...prefill });
    } else {
      setEditingPlan(null);
    }
    setCurrentPage('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (page: WebsitePage | AppPage | 'admin' | 'students') => {
    if (page === 'blog') {
      setSelectedBlogSlug(null);
    }
    setCurrentPage(page as AppPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof window !== 'undefined') {
      try {
        const targetPath = page === 'home' 
          ? '/' 
          : page === 'admin' 
          ? '/admin' 
          : `/${page}`;
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ page }, '', targetPath);
        }
      } catch {
        // Fallback or hash
      }
    }
  };

  const handleSelectBlogPost = (slug: string) => {
    setSelectedBlogSlug(slug);
    setCurrentPage('blog_post');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({ page: 'blog_post', slug }, '', `/blog/${slug}`);
      } catch {
        // Fallback
      }
    }
  };

  // Protected education routes
  const isProtectedEducationPage = ['dashboard', 'create', 'saved', 'settings', 'students'].includes(currentPage);
  const isLessonPlanWorkspace = ['create', 'saved', 'settings', 'students'].includes(currentPage);

  return (
    <div 
      className="min-h-screen flex flex-col antialiased selection:bg-teal-700 selection:text-white transition-colors overflow-x-hidden w-full"
      style={{
        backgroundColor: colors.bodyBg,
        color: colors.bodyText
      }}
    >
      
      {/* 1. Global Professional Public Website Header */}
      <WebsiteHeader
        currentPage={currentPage}
        onNavigate={handleNavigate}
        savedCount={lessonPlans.length}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Ad Placement: Below Header */}
      <AdSlot placement="below_header" />

      {/* 2. Main Content Area */}
      <main className="flex-1 w-full overflow-x-hidden">
        
        {/* PUBLIC PAGE 1: Digital Newspaper Home View (Default opening page at /) */}
        {currentPage === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            savedPlansCount={lessonPlans.length}
            onSelectBlogPost={handleSelectBlogPost}
          />
        )}

        {/* PUBLIC PAGE: News Archive & Journal Articles List */}
        {currentPage === 'blog' && (
          <BlogListView
            onSelectPost={handleSelectBlogPost}
            onNavigate={handleNavigate}
          />
        )}

        {/* PUBLIC PAGE: News Article Detail Reader View */}
        {currentPage === 'blog_post' && selectedBlogSlug && (
          <BlogPostDetailView
            slug={selectedBlogSlug}
            onNavigate={handleNavigate}
            onSelectPost={handleSelectBlogPost}
          />
        )}

        {/* PUBLIC PAGE 2: About Us View */}
        {currentPage === 'about' && (
          <AboutView onNavigate={handleNavigate} />
        )}

        {/* PUBLIC PAGE 3: Contact Us View */}
        {currentPage === 'contact' && (
          <ContactView onNavigate={handleNavigate} />
        )}

        {/* PUBLIC PAGE 4: Privacy Policy View */}
        {currentPage === 'privacy' && (
          <PrivacyPolicyView onNavigate={handleNavigate} />
        )}

        {/* PUBLIC PAGE 5: Terms and Conditions View */}
        {currentPage === 'terms' && (
          <TermsConditionsView onNavigate={handleNavigate} />
        )}

        {/* ============================================================== */}
        {/* PROTECTED EDUCATION PLATFORM: AUTHENTICATION GATE CHECK        */}
        {/* ============================================================== */}
        {isProtectedEducationPage && !user && (
          <EducationLoginGate
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}

        {/* AUTHENTICATED EDUCATION DASHBOARD VIEW */}
        {currentPage === 'dashboard' && user && (
          <DashboardView
            lessonPlans={lessonPlans}
            onNavigate={(page) => {
              if (page === 'home') {
                handleNavigate('home');
              } else if (page === 'create' || page === 'saved' || page === 'settings' || page === 'students') {
                handleNavigate(page);
              } else if (page === 'admin') {
                handleNavigate('admin');
              } else {
                handleNavigate('dashboard');
              }
            }}
            onSelectPlanToEdit={handleEditPlan}
            onSelectPlanToPrint={handlePrintPlan}
          />
        )}

        {/* AUTHENTICATED EDUCATION WORKSPACE: Lesson Plans, Students, and Settings */}
        {isLessonPlanWorkspace && user && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            
            {/* Dedicated Workspace Navigation Bar with Return to Newspaper */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
                
                {/* Return to Public Newspaper */}
                <button
                  type="button"
                  onClick={() => handleNavigate('home')}
                  className="px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all inline-flex items-center space-x-1.5 shrink-0 text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer border border-slate-200"
                  title="Return to Public Newspaper Homepage"
                >
                  <Newspaper className="w-4 h-4 text-teal-700" />
                  <span>Newspaper</span>
                </button>

                {/* Dashboard Home */}
                <button
                  type="button"
                  onClick={() => setCurrentPage('dashboard')}
                  className="px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all inline-flex items-center space-x-1.5 shrink-0 text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer border border-slate-200"
                >
                  <LayoutDashboard className="w-4 h-4 text-teal-700" />
                  <span>Dashboard</span>
                </button>

                {/* Tab 1: Create Lesson Plan */}
                <button
                  type="button"
                  onClick={() => handleCreateNew()}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all inline-flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                    currentPage === 'create'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-teal-400" />
                  <span>{t.navCreate || 'Create Lesson Plan'}</span>
                </button>

                {/* Tab 2: Saved Plans */}
                <button
                  type="button"
                  onClick={() => setCurrentPage('saved')}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all inline-flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                    currentPage === 'saved'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FolderClock className="w-4 h-4 text-teal-400" />
                  <span>{t.navSaved || 'Saved Plans'}</span>
                  {lessonPlans.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                      currentPage === 'saved'
                        ? 'bg-teal-400 text-slate-950'
                        : 'bg-teal-100 text-teal-900'
                    }`}>
                      {lessonPlans.length}
                    </span>
                  )}
                </button>

                {/* Tab 3: Students Identification */}
                <button
                  type="button"
                  onClick={() => setCurrentPage('students')}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all inline-flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                    currentPage === 'students'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4 text-teal-400" />
                  <span>Students</span>
                </button>

                {/* Tab 4: Settings & Preferences */}
                <button
                  type="button"
                  onClick={() => setCurrentPage('settings')}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all inline-flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                    currentPage === 'settings'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4 text-teal-400" />
                  <span>{t.navSettings || 'Preferences'}</span>
                </button>
              </div>

              {/* Status info */}
              <div className="hidden lg:flex items-center space-x-2 text-xs font-semibold text-slate-500 pr-2">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                <span>Rwanda CBC 8-Column Official Generator</span>
              </div>
            </div>

            {/* Sub-View 1: Main Create Lesson Plan View (Primary) */}
            {currentPage === 'create' && (
              <CreateLessonPlanView
                initialPlan={editingPlan}
                onSavePlan={handleSaveLessonPlan}
                onPrintPreview={handlePrintPlan}
                onCancelOrNew={handleCreateNew}
              />
            )}

            {/* Sub-View 2: Saved Lesson Plans */}
            {currentPage === 'saved' && (
              <SavedLessonPlansView
                lessonPlans={lessonPlans}
                onEditPlan={handleEditPlan}
                onDeletePlan={handleDeleteLessonPlan}
                onDuplicatePlan={handleDuplicateLessonPlan}
                onPrintPlan={handlePrintPlan}
                onCreateNew={handleCreateNew}
              />
            )}

            {/* Sub-View 3: Students Identification */}
            {currentPage === 'students' && (
              <StudentsIdentificationView
                lessonPlans={lessonPlans}
                onNavigate={(page) => handleNavigate(page as AppPage)}
                onSelectPlanToEdit={handleEditPlan}
                onCreateNewWithStudents={handleCreateNew}
              />
            )}

            {/* Sub-View 4: Preferences / Settings */}
            {currentPage === 'settings' && (
              <SettingsView
                totalPlansCount={lessonPlans.length}
                onNavigate={(page) => {
                  if (page === 'saved' || page === 'create' || page === 'settings' || page === 'students') {
                    setCurrentPage(page);
                  } else {
                    setCurrentPage('dashboard');
                  }
                }}
                onDataImported={refreshData}
              />
            )}

          </div>
        )}

        {/* ADMIN MANAGEMENT & DASHBOARD PORTAL: Accessible via /admin or Header Admin button */}
        {currentPage === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {isAdmin && user ? (
              <AdminDashboardView
                lessonPlans={lessonPlans}
                onNavigate={(page) => {
                  if (page === 'create' || page === 'saved' || page === 'settings' || page === 'students') {
                    handleNavigate(page);
                  } else {
                    handleNavigate('dashboard');
                  }
                }}
                onLogout={async () => {
                  await signOutUser();
                  handleNavigate('home');
                }}
              />
            ) : (
              <AdminPortalGateway
                onNavigate={handleNavigate}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
              />
            )}
          </div>
        )}

      </main>

      {/* 3. Global Print / PDF Export Modal */}
      {printingPlan && (
        <PrintLessonPlanModal
          plan={printingPlan}
          onClose={() => setPrintingPlan(null)}
        />
      )}

      {/* Ad Placement: Above Footer */}
      <AdSlot placement="above_footer" />

      {/* 4. Global Professional Public Website Footer */}
      <WebsiteFooter 
        onNavigate={handleNavigate}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* 5. Authentication Modal for Teachers & Admins */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 6. Persistent WhatsApp Floating Action Button (Rwanda: 0782971258 / https://wa.me/250782971258) */}
      <WhatsAppFloatingButton currentPage={currentPage} />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <WebsiteDesignProvider>
          <AppContent />
        </WebsiteDesignProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

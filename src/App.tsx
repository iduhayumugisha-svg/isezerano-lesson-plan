import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  FolderClock, 
  Settings as SettingsIcon, 
  LayoutDashboard,
  ShieldCheck,
  Home
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

// Central Application Views
import { DashboardView } from './views/DashboardView';
import { CreateLessonPlanView } from './views/CreateLessonPlanView';
import { SavedLessonPlansView } from './views/SavedLessonPlansView';
import { SettingsView } from './views/SettingsView';
import { PrintLessonPlanModal } from './components/PrintLessonPlanModal';

// Preserved Hidden Views (Retained for future activation, hidden from UI)
import { StudentsIdentificationView } from './views/StudentsIdentificationView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { Sidebar, SaasNavPage } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';

import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FEATURE_FLAGS } from './config/features';

export type AppPage = WebsitePage | 'students' | 'admin';

function AppContent() {
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();

  // Requirement 1: Home page must be the first page displayed when someone opens the website
  const [currentPage, setCurrentPage] = useState<AppPage>('home');

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
  }, []);

  // Redirect hidden routes (admin or students) safely
  useEffect(() => {
    if (currentPage === 'admin' && !isAdmin) {
      setCurrentPage('dashboard');
    }
    if (currentPage === 'students') {
      setCurrentPage('dashboard');
    }
  }, [isAdmin, currentPage]);

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

  const handleNavigate = (page: WebsitePage) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isLessonPlanWorkspace = ['create', 'saved', 'settings'].includes(currentPage);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-serif antialiased selection:bg-teal-700 selection:text-white">
      
      {/* 1. Global Professional Public Website Header */}
      <WebsiteHeader
        currentPage={currentPage}
        onNavigate={handleNavigate}
        savedCount={lessonPlans.length}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 w-full">
        
        {/* PUBLIC PAGE 1: Home View (Default opening page) */}
        {currentPage === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            savedPlansCount={lessonPlans.length}
          />
        )}

        {/* APPLICATION DASHBOARD VIEW: Opened by clicking Dashboard menu or button */}
        {currentPage === 'dashboard' && (
          <DashboardView
            lessonPlans={lessonPlans}
            onNavigate={(page) => {
              if (page === 'home') {
                handleNavigate('home');
              } else if (page === 'create' || page === 'saved' || page === 'settings') {
                handleNavigate(page);
              } else if (page === 'admin' && isAdmin) {
                setCurrentPage('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                handleNavigate('dashboard');
              }
            }}
            onSelectPlanToEdit={handleEditPlan}
            onSelectPlanToPrint={handlePrintPlan}
          />
        )}

        {/* ADMIN DASHBOARD & SLIDER MANAGEMENT VIEW: Accessible only to verified administrators */}
        {currentPage === 'admin' && isAdmin && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <AdminDashboardView
              lessonPlans={lessonPlans}
              onNavigate={(page) => {
                if (page === 'create' || page === 'saved' || page === 'settings') {
                  handleNavigate(page);
                } else {
                  handleNavigate('dashboard');
                }
              }}
            />
          </div>
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

        {/* PRIMARY FUNCTIONAL APPLICATION SECTION: Lesson Plan Workspace */}
        {isLessonPlanWorkspace && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            
            {/* Dedicated Workspace Navigation Bar with Deep Navy and Teal Palette */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
                {/* Return to Dashboard */}
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

                {/* Tab 3: Settings & Preferences */}
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

            {/* Sub-View 3: Preferences / Settings */}
            {currentPage === 'settings' && (
              <SettingsView
                totalPlansCount={lessonPlans.length}
                onNavigate={(page) => {
                  if (page === 'saved' || page === 'create' || page === 'settings') {
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

        {/* 
          PRESERVED BUT HIDDEN SECTIONS:
          The following components are preserved in the codebase for future administrator activation 
          as required by instructions, but remain completely hidden from all standard user paths.
        */}
        {false && (
          <div style={{ display: 'none' }}>
            <StudentsIdentificationView
              lessonPlans={lessonPlans}
              onNavigate={(page) => setCurrentPage(page as AppPage)}
              onSelectPlanToEdit={handleEditPlan}
              onCreateNewWithStudents={handleCreateNew}
            />
            <Sidebar
              currentPage="create"
              onNavigate={(page) => setCurrentPage(page as AppPage)}
              savedCount={lessonPlans.length}
              isCollapsed={false}
              onToggleCollapse={() => {}}
              isMobileOpen={false}
              onCloseMobile={() => {}}
              onOpenAuth={() => {}}
            />
            <Header
              currentPage="create"
              onOpenMobileMenu={() => {}}
              onOpenAuth={() => {}}
              isSidebarCollapsed={false}
            />
            {FEATURE_FLAGS.ENABLE_ADMIN_UI && isAdmin && (
              <AdminDashboardView
                lessonPlans={lessonPlans}
                onNavigate={(page) => setCurrentPage(page as AppPage)}
              />
            )}
            {FEATURE_FLAGS.ENABLE_ADMIN_UI && (
              <AuthModal
                isOpen={false}
                onClose={() => {}}
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

      {/* 4. Global Professional Public Website Footer */}
      <WebsiteFooter 
        onNavigate={(page) => {
          if (page === 'admin' && isAdmin) {
            setCurrentPage('admin');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            handleNavigate(page);
          }
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* 5. Authentication Modal for Teachers & Admins */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}

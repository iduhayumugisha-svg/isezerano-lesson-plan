import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { LessonPlan } from './types/lessonPlan';
import { 
  getSavedLessonPlans, 
  saveLessonPlanToFirestore, 
  deleteLessonPlanFromFirestore, 
  duplicateLessonPlanLocal,
  createEmptyLessonPlan
} from './services/storageService';
import { Sidebar, SaasNavPage } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { StudentsIdentificationView } from './views/StudentsIdentificationView';
import { CreateLessonPlanView } from './views/CreateLessonPlanView';
import { SavedLessonPlansView } from './views/SavedLessonPlansView';
import { SettingsView } from './views/SettingsView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { PrintLessonPlanModal } from './components/PrintLessonPlanModal';
import { AuthModal } from './components/AuthModal';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();

  // Primary application route: Lesson Plan Generator (Home)
  const [currentPage, setCurrentPage] = useState<SaasNavPage>('create');

  // Sidebar Layout States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Education state: Saved CBC Lesson Plans
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [printingPlan, setPrintingPlan] = useState<LessonPlan | null>(null);

  // Load saved lesson plans on mount
  const refreshData = () => {
    setLessonPlans(getSavedLessonPlans());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // When non-admin tries to view admin page, redirect to create
  useEffect(() => {
    if (currentPage === 'admin' && !isAdmin) {
      setCurrentPage('create');
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
    }
  };

  // Navigation router helpers
  const handleEditPlan = (plan: LessonPlan) => {
    setEditingPlan(plan);
    setCurrentPage('create');
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
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* 1. Professional LEFT Sidebar (Fixed on Desktop, Drawer on Mobile) */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        savedCount={lessonPlans.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* 2. Main SaaS Workspace (Positioned to the RIGHT of the Sidebar) */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header */}
        <Header
          currentPage={currentPage}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Content Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 1. Main Lesson Plan Generator (Home) */}
          {currentPage === 'create' && (
            <CreateLessonPlanView
              initialPlan={editingPlan}
              onSavePlan={handleSaveLessonPlan}
              onPrintPreview={handlePrintPlan}
              onCancelOrNew={handleCreateNew}
            />
          )}

          {/* 2. Saved Lesson Plans & Export View */}
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

          {/* 3. Students Identification View */}
          {currentPage === 'students' && (
            <StudentsIdentificationView
              lessonPlans={lessonPlans}
              onNavigate={setCurrentPage}
              onSelectPlanToEdit={handleEditPlan}
              onCreateNewWithStudents={handleCreateNew}
            />
          )}

          {/* 4. Centralized Dashboard View */}
          {currentPage === 'dashboard' && (
            <DashboardView
              lessonPlans={lessonPlans}
              onNavigate={setCurrentPage}
              onSelectPlanToEdit={handleEditPlan}
              onSelectPlanToPrint={handlePrintPlan}
            />
          )}

          {/* 5. Settings & Cloud Sync View */}
          {currentPage === 'settings' && (
            <SettingsView
              totalPlansCount={lessonPlans.length}
              onNavigate={setCurrentPage}
              onDataImported={refreshData}
            />
          )}

          {/* 6. Admin Management Dashboard View (Protected) */}
          {currentPage === 'admin' && (
            <AdminDashboardView
              lessonPlans={lessonPlans}
              onNavigate={setCurrentPage}
            />
          )}
        </main>

        {/* Print / PDF Export Modal */}
        {printingPlan && (
          <PrintLessonPlanModal
            plan={printingPlan}
            onClose={() => setPrintingPlan(null)}
          />
        )}

        {/* Authentication Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />

        {/* Professional SaaS Footer */}
        <footer className="no-print bg-white border-t border-slate-200 py-5 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800">
                ISEZERANO Lesson Plan
              </span>
              <span>•</span>
              <span>Rwanda Competence-Based Curriculum (CBC)</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-400">
              <span className="hidden sm:inline">MINEDUC / REB National Curriculum Compliance</span>
              <span className="hidden sm:inline">•</span>
              <button
                type="button"
                onClick={() => {
                  if (isAdmin) {
                    setCurrentPage('admin');
                  } else {
                    setIsAuthModalOpen(true);
                  }
                }}
                className="inline-flex items-center space-x-1.5 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer py-1 px-2 rounded-md hover:bg-slate-100"
                title="Website Owner / Administrator Portal"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">{isAdmin ? 'Admin Dashboard' : 'Admin Portal'}</span>
              </button>
            </div>
          </div>
        </footer>
      </div>
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

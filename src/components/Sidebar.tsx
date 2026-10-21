import React from 'react';
import { 
  PlusCircle, 
  FolderClock, 
  Users, 
  LayoutDashboard, 
  Settings, 
  ShieldCheck, 
  GraduationCap, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  LogIn, 
  Lock,
  X,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { NavPage } from './Navbar';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';

// Extended NavPage to include 'admin'
export type SaasNavPage = NavPage | 'admin';

interface SidebarProps {
  currentPage: SaasNavPage;
  onNavigate: (page: SaasNavPage) => void;
  savedCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  savedCount,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenAuth
}) => {
  const { t } = useLanguage();
  const { user, isAdmin, signOutUser } = useAuth();

  const handleItemClick = (page: SaasNavPage) => {
    onNavigate(page);
    onCloseMobile();
  };

  const navItems = [
    {
      id: 'create' as SaasNavPage,
      label: t.navCreate || 'Lesson Plan Generator',
      shortLabel: 'Generator',
      icon: PlusCircle,
      badge: 'Home',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'saved' as SaasNavPage,
      label: t.navSaved || 'Saved Lesson Plans',
      shortLabel: 'Saved Plans',
      icon: FolderClock,
      badge: savedCount > 0 ? String(savedCount) : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'students' as SaasNavPage,
      label: t.navStudents || 'Student Identification',
      shortLabel: 'Students',
      icon: Users
    },
    {
      id: 'dashboard' as SaasNavPage,
      label: t.navAllTools || 'Dashboard / All Tools',
      shortLabel: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'settings' as SaasNavPage,
      label: t.navSettings || 'Settings & Sync',
      shortLabel: 'Settings',
      icon: Settings
    }
  ];

  // Admin exclusive item
  if (isAdmin) {
    navItems.push({
      id: 'admin' as SaasNavPage,
      label: 'Admin Dashboard',
      shortLabel: 'Admin',
      icon: ShieldCheck,
      badge: 'Protected',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    });
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className={`p-4 border-b border-slate-800 flex items-center justify-between ${
        isCollapsed ? 'justify-center' : ''
      }`}>
        <div 
          onClick={() => handleItemClick('create')} 
          className="flex items-center space-x-3 cursor-pointer group min-w-0"
          title="ISEZERANO Lesson Plan"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-400/30 group-hover:bg-emerald-500 transition-colors shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-emerald-300 transition-colors truncate">
                  ISEZERANO
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 uppercase">
                  SaaS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                Lesson Plan Platform
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Banner / Status */}
      {!isCollapsed && (
        <div className="px-4 py-2 bg-slate-850/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Curriculum:</span>
          <span className="font-bold text-emerald-300 text-[11px] flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Rwanda CBC</span>
          </span>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              title={item.label}
              className={`w-full flex items-center rounded-xl transition-all cursor-pointer ${
                isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                  : item.id === 'admin'
                  ? 'text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-800/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-white' : item.id === 'admin' ? 'text-purple-400' : 'text-slate-400'
                }`} />
                {!isCollapsed && (
                  <span className="text-xs sm:text-sm truncate">
                    {item.label}
                  </span>
                )}
              </div>

              {!isCollapsed && item.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold border ml-1 ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom User Account Section */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        {user ? (
          <div className="space-y-2">
            {!isCollapsed ? (
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-white truncate block">
                      {user.displayName || user.email.split('@')[0]}
                    </span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                      user.role === 'admin'
                        ? 'bg-purple-900 text-purple-200 border border-purple-700'
                        : 'bg-emerald-900 text-emerald-200 border border-emerald-700'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={() => signOutUser()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={() => signOutUser()}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  title={`Sign out (${user.email})`}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {!isCollapsed ? (
              <button
                onClick={() => onOpenAuth()}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-sm active:scale-98 cursor-pointer border border-slate-700/60"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Admin / Account Sign In</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenAuth()}
                className="w-full flex justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700/60"
                title="Admin Sign In"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Desktop Collapse / Expand Toggle Button */}
        <div className="hidden lg:flex items-center justify-end pt-2 mt-2 border-t border-slate-800/80">
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center space-x-1"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[10px] text-slate-400 font-semibold">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Left Sidebar (Fixed / Collapsible) */}
      <aside 
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-out Drawer with Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div 
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

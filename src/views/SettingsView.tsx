import React, { useState } from 'react';
import { 
  FirebaseConnectionConfig 
} from '../types/lessonPlan';
import { 
  getFirebaseConfig, 
  saveFirebaseConfig, 
  exportDatabaseBackup, 
  importDatabaseBackup, 
  clearAllDataLocal 
} from '../services/storageService';
import { 
  Settings as SettingsIcon, 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  Flame, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Server, 
  Key,
  Users,
  FolderClock,
  ArrowLeft
} from 'lucide-react';
import { SaasNavPage } from '../components/Sidebar';
import { useLanguage } from '../i18n/LanguageContext';

interface SettingsViewProps {
  totalPlansCount: number;
  onNavigate: (page: SaasNavPage) => void;
  onDataImported: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  totalPlansCount,
  onNavigate,
  onDataImported
}) => {
  const { t } = useLanguage();
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConnectionConfig>(getFirebaseConfig());
  const [firebaseSaved, setFirebaseSaved] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const sampleFirestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default deny all access
    match /{document=**} {
      allow read, write: if false;
    }

    // Authenticated teachers can read and write only their own lesson plans
    match /lesson_plans/{planId} {
      allow read, write: if request.auth != null;
    }

    // School and Teacher profile settings
    match /school_profile/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(sampleFirestoreRules);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 3000);
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveFirebaseConfig(firebaseConfig);
    setFirebaseSaved(true);
    setTimeout(() => setFirebaseSaved(false), 4000);
  };

  const handleExportBackup = () => {
    const jsonStr = exportDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rwanda-cbc-lesson-plans-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importDatabaseBackup(content);
        if (result.success) {
          setImportStatus(`Successfully imported ${result.count} lesson plan(s)!`);
          onDataImported();
        } else {
          setImportStatus(`Import failed: ${result.error}`);
        }
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        'WARNING: Are you sure you want to clear all data? This deletes all saved lesson plans from this browser.'
      )
    ) {
      if (window.confirm('Please confirm one more time: Do you want to proceed with deletion?')) {
        clearAllDataLocal();
        onDataImported();
        alert('All local database records cleared.');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Return to Generator Breadcrumb */}
      <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => onNavigate('create')}
          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.backToGenerator || '← Back to Lesson Plan Generator'}</span>
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-xs font-semibold text-slate-500">
          {t.settingsTitle}
        </span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center space-x-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t.settingsTitle}</h1>
          <p className="text-xs text-slate-500">
            {t.settingsSubtext}
          </p>
        </div>
      </div>

      {/* Database & Storage Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
          <Database className="w-4 h-4 text-emerald-600" />
          <span>{t.storageTitle}</span>
        </h2>
        <p className="text-xs text-slate-500">
          {t.storageDescription}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">{t.databaseStorageBox}</span>
              <FolderClock className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="font-bold text-slate-900 text-base">{totalPlansCount} {t.totalPlans}</p>
            <p className="text-slate-500">
              {firebaseConfig.enabled ? 'Synced with Cloud Firestore' : 'Stored in Secure Browser Database'}
            </p>
            <button
              onClick={() => onNavigate('saved')}
              className="text-emerald-600 hover:text-emerald-700 font-bold pt-1 block"
            >
              {t.managePlansLink}
            </button>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">{t.studentsIdTitle}</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="font-bold text-slate-900 text-base">{t.studentsIdTitle}</p>
            <p className="text-slate-500">
              {t.studentsIdSubtext}
            </p>
            <button
              onClick={() => onNavigate('students')}
              className="text-emerald-600 hover:text-emerald-700 font-bold pt-1 block"
            >
              {t.studentsIdTitle} →
            </button>
          </div>
        </div>
      </div>

      {/* Backup and Restore Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{t.backupSectionTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t.backupSectionSubtext}
          </p>
        </div>

        {importStatus && (
          <div className="p-3 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{t.exportJsonBtn}</span>
          </button>

          <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors border border-slate-300">
            <Upload className="w-4 h-4 text-slate-600" />
            <span>{t.importJsonBtn}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.resetDatabaseBtn}</span>
          </button>
        </div>
      </div>

      {/* Cloud Firestore & Firebase Setup Guide */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">
              {t.cloudGuideTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.cloudGuideSubtext}
          </p>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-4 text-xs text-slate-700 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
            <Server className="w-4 h-4 text-emerald-600" />
            <span>{t.stepGuideTitle}</span>
          </h3>

          <ol className="list-decimal list-inside space-y-2.5 pl-1 leading-relaxed">
            <li>
              <strong>{t.step1}</strong>{' '}
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 font-semibold underline inline-flex items-center space-x-0.5"
              >
                <span>Firebase Console</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </li>
            <li>
              <strong>{t.step2}</strong>
            </li>
            <li>
              <strong>{t.step3}</strong>
            </li>
            <li>
              <strong>{t.step4}</strong>
            </li>
            <li>
              <strong>{t.step5}</strong>
              <div className="mt-1.5 bg-slate-900 text-emerald-300 p-2.5 rounded font-mono text-[11px] overflow-x-auto space-y-1">
                <div>npm install -g firebase-tools</div>
                <div>firebase login</div>
                <div>firebase init hosting</div>
                <div>npm run build</div>
                <div>firebase deploy --only hosting</div>
              </div>
            </li>
          </ol>
        </div>

        {/* Hardened Firestore Security Rules */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t.rulesLabel}</span>
            </label>
            <button
              type="button"
              onClick={handleCopyRules}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              {copiedRules ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRules ? t.copied : t.copyRules}</span>
            </button>
          </div>
          <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto border border-slate-800">
            {sampleFirestoreRules}
          </pre>
        </div>

        {/* Optional Firebase Web Config Input */}
        <form onSubmit={handleSaveFirebaseConfig} className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
              <Key className="w-4 h-4 text-amber-500" />
              <span>{t.connectWebConfigTitle}</span>
            </h3>

            <label className="inline-flex items-center space-x-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={firebaseConfig.enabled}
                onChange={(e) =>
                  setFirebaseConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-slate-800">{t.enableFirestoreSync}</span>
            </label>
          </div>

          {firebaseConfig.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">API Key (apiKey)</label>
                <input
                  type="text"
                  value={firebaseConfig.apiKey}
                  onChange={(e) =>
                    setFirebaseConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                  }
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project ID (projectId)</label>
                <input
                  type="text"
                  value={firebaseConfig.projectId}
                  onChange={(e) =>
                    setFirebaseConfig((prev) => ({ ...prev, projectId: e.target.value }))
                  }
                  placeholder="rwanda-cbc-lesson-plan"
                  className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Auth Domain (authDomain)</label>
                <input
                  type="text"
                  value={firebaseConfig.authDomain}
                  onChange={(e) =>
                    setFirebaseConfig((prev) => ({ ...prev, authDomain: e.target.value }))
                  }
                  placeholder="project-id.firebaseapp.com"
                  className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Storage Bucket (storageBucket)</label>
                <input
                  type="text"
                  value={firebaseConfig.storageBucket}
                  onChange={(e) =>
                    setFirebaseConfig((prev) => ({ ...prev, storageBucket: e.target.value }))
                  }
                  placeholder="project-id.appspot.com"
                  className="w-full px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {firebaseSaved && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.saveSuccess}</span>
              </span>
            )}
            <button
              type="submit"
              className="ml-auto inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
            >
              <span>{t.saveCloudSettingsBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Palette,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  ShieldCheck,
  Layers,
  HelpCircle,
  X,
  Award,
  Sliders,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  NurserySubjectItem,
  ReportCardColorSettings,
  NurserySubjectsAndColorsSettings,
  DEFAULT_REPORT_CARD_COLORS,
  ConfigurablePerformanceLevel,
  DEFAULT_PERFORMANCE_LEVELS
} from '../types/nurseryReport';
import {
  getDefaultNurserySubjectsAndColors,
  saveNurserySubjectsAndColorsSettings,
  subscribeToNurserySubjectsAndColors
} from '../services/nurseryStorageService';

// Popular elegant preset palettes for quick one-click theme styling
const PRESET_THEMES: {
  name: string;
  colors: ReportCardColorSettings;
}[] = [
  {
    name: 'Classic School Slate (Default)',
    colors: { ...DEFAULT_REPORT_CARD_COLORS }
  },
  {
    name: 'Emerald Academy',
    colors: {
      ...DEFAULT_REPORT_CARD_COLORS,
      tableHeaderBg: '#064e3b',
      tableHeaderTextColor: '#ffffff',
      sectionHeaderBg: '#d1fae5',
      sectionHeaderTextColor: '#065f46',
      tableBorderColor: '#6ee7b7'
    }
  },
  {
    name: 'Royal Blue & Gold',
    colors: {
      ...DEFAULT_REPORT_CARD_COLORS,
      tableHeaderBg: '#1e3a8a',
      tableHeaderTextColor: '#ffffff',
      sectionHeaderBg: '#dbeafe',
      sectionHeaderTextColor: '#1e40af',
      tableBorderColor: '#93c5fd'
    }
  },
  {
    name: 'Deep Crimson & Rose',
    colors: {
      ...DEFAULT_REPORT_CARD_COLORS,
      tableHeaderBg: '#881337',
      tableHeaderTextColor: '#ffffff',
      sectionHeaderBg: '#ffe4e6',
      sectionHeaderTextColor: '#9f1239',
      tableBorderColor: '#fca5a5'
    }
  },
  {
    name: 'Warm Amber & Teal',
    colors: {
      ...DEFAULT_REPORT_CARD_COLORS,
      tableHeaderBg: '#0f766e',
      tableHeaderTextColor: '#ffffff',
      sectionHeaderBg: '#fef3c7',
      sectionHeaderTextColor: '#92400e',
      tableBorderColor: '#cbd5e1'
    }
  }
];

export const NurserySubjectsAndColorsManager: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'subjects' | 'levels' | 'colors' | 'preview'>('subjects');

  // Working state
  const [subjects, setSubjects] = useState<NurserySubjectItem[]>([]);
  const [colors, setColors] = useState<ReportCardColorSettings>(DEFAULT_REPORT_CARD_COLORS);
  const [performanceLevels, setPerformanceLevels] = useState<ConfigurablePerformanceLevel[]>(DEFAULT_PERFORMANCE_LEVELS);
  const [originalSnapshot, setOriginalSnapshot] = useState<{
    subjects: NurserySubjectItem[];
    colors: ReportCardColorSettings;
    performanceLevels: ConfigurablePerformanceLevel[];
  } | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Subject Modal (Add / Edit)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<NurserySubjectItem | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formSection, setFormSection] = useState('IMYITWARIRE');
  const [formCustomSection, setFormCustomSection] = useState('');
  const [formSectionTitle, setFormSectionTitle] = useState('');
  const [formColorHex, setFormColorHex] = useState('');

  // Performance Level Modal (Add / Edit)
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<ConfigurablePerformanceLevel | null>(null);
  const [levelFormLabel, setLevelFormLabel] = useState('');
  const [levelFormKinyarwanda, setLevelFormKinyarwanda] = useState('');
  const [levelFormColorHex, setLevelFormColorHex] = useState('#48bb78');
  const [levelFormTextColor, setLevelFormTextColor] = useState('#ffffff');

  // Delete confirmations
  const [deleteSubjectCandidate, setDeleteSubjectCandidate] = useState<NurserySubjectItem | null>(null);
  const [deleteLevelCandidate, setDeleteLevelCandidate] = useState<ConfigurablePerformanceLevel | null>(null);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToNurserySubjectsAndColors((data) => {
      setSubjects([...data.subjects].sort((a, b) => a.number - b.number));
      setColors({ ...data.colors });

      const sortedLevels = (data.performanceLevels && data.performanceLevels.length > 0)
        ? [...data.performanceLevels].sort((a, b) => a.order - b.order)
        : [...DEFAULT_PERFORMANCE_LEVELS];
      setPerformanceLevels(sortedLevels);

      setOriginalSnapshot({
        subjects: JSON.parse(JSON.stringify(data.subjects)),
        colors: JSON.parse(JSON.stringify(data.colors)),
        performanceLevels: JSON.parse(JSON.stringify(sortedLevels))
      });
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // Compute distinct sections available
  const standardSections: string[] = ['CORE', 'UBUGENI', 'IBONEZABUZIMA', 'IMYITWARIRE'];
  const customSections = subjects.map(s => s.section).filter(sec => !standardSections.includes(sec));
  const existingSections: string[] = Array.from(new Set([...standardSections, ...customSections]));

  // Open modal to add a new subject
  const handleOpenAddSubjectModal = () => {
    setEditingSubject(null);
    setFormLabel('');
    setFormSection(existingSections[0] || 'IMYITWARIRE');
    setFormCustomSection('');
    setFormSectionTitle('');
    setFormColorHex('');
    setIsSubjectModalOpen(true);
  };

  // Open modal to edit an existing subject
  const handleOpenEditSubjectModal = (subject: NurserySubjectItem) => {
    setEditingSubject(subject);
    setFormLabel(subject.label);
    if (existingSections.includes(subject.section)) {
      setFormSection(subject.section);
      setFormCustomSection('');
    } else {
      setFormSection('__CUSTOM__');
      setFormCustomSection(subject.section);
    }
    setFormSectionTitle(subject.sectionTitle || '');
    setFormColorHex(subject.colorHex || '');
    setIsSubjectModalOpen(true);
  };

  // Save subject from modal
  const handleSaveModalSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      alert('Injiza izina ry\'isomo (Subject name is required).');
      return;
    }

    const effectiveSection = formSection === '__CUSTOM__' ? formCustomSection.trim() || 'General' : formSection;

    if (editingSubject) {
      setSubjects(prev =>
        prev.map(item =>
          item.id === editingSubject.id
            ? {
                ...item,
                label: formLabel.trim(),
                section: effectiveSection,
                sectionTitle: formSectionTitle.trim() ? formSectionTitle.trim() : undefined,
                colorHex: formColorHex.trim() || undefined
              }
            : item
        )
      );
    } else {
      const newNumber = subjects.length > 0 ? Math.max(...subjects.map(s => s.number)) + 1 : 1;
      const newSubjectItem: NurserySubjectItem = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        number: newNumber,
        label: formLabel.trim(),
        section: effectiveSection,
        sectionTitle: formSectionTitle.trim() ? formSectionTitle.trim() : undefined,
        colorHex: formColorHex.trim() || undefined,
        isCustom: true
      };
      setSubjects(prev => [...prev, newSubjectItem]);
    }

    setIsSubjectModalOpen(false);
  };

  // Reorder subjects
  const handleMoveSubjectUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...subjects];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;

    const updated = reordered.map((item, idx) => ({
      ...item,
      number: idx + 1
    }));
    setSubjects(updated);
  };

  const handleMoveSubjectDown = (index: number) => {
    if (index >= subjects.length - 1) return;
    const reordered = [...subjects];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;

    const updated = reordered.map((item, idx) => ({
      ...item,
      number: idx + 1
    }));
    setSubjects(updated);
  };

  // Delete subject
  const handleConfirmDeleteSubject = () => {
    if (!deleteSubjectCandidate) return;
    const filtered = subjects.filter(s => s.id !== deleteSubjectCandidate.id);
    const renumbered = filtered.map((s, idx) => ({
      ...s,
      number: idx + 1
    }));
    setSubjects(renumbered);
    setDeleteSubjectCandidate(null);
  };

  // =========================================================================
  // PERFORMANCE LEVELS HANDLERS
  // =========================================================================

  const handleOpenAddLevelModal = () => {
    setEditingLevel(null);
    setLevelFormLabel('');
    setLevelFormKinyarwanda('');
    setLevelFormColorHex('#10b981');
    setLevelFormTextColor('#ffffff');
    setIsLevelModalOpen(true);
  };

  const handleOpenEditLevelModal = (level: ConfigurablePerformanceLevel) => {
    setEditingLevel(level);
    setLevelFormLabel(level.label);
    setLevelFormKinyarwanda(level.kinyarwandaLabel || '');
    setLevelFormColorHex(level.colorHex);
    setLevelFormTextColor(level.textColor || '#ffffff');
    setIsLevelModalOpen(true);
  };

  const handleSaveModalLevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelFormLabel.trim()) {
      alert('Injiza izina ry\'icyiciro (Performance level label is required).');
      return;
    }

    const trimmedColor = levelFormColorHex.trim() || '#48bb78';

    if (editingLevel) {
      // Update existing level
      setPerformanceLevels(prev =>
        prev.map(l =>
          l.id === editingLevel.id
            ? {
                ...l,
                label: levelFormLabel.trim(),
                kinyarwandaLabel: levelFormKinyarwanda.trim() || undefined,
                colorHex: trimmedColor,
                textColor: levelFormTextColor
              }
            : l
        )
      );

      // Keep colors settings in sync if it's one of the primary 4
      if (editingLevel.id === 'EXCELLENT') {
        setColors(prev => ({ ...prev, excellentColor: trimmedColor }));
      } else if (editingLevel.id === 'VERY_GOOD') {
        setColors(prev => ({ ...prev, veryGoodColor: trimmedColor }));
      } else if (editingLevel.id === 'DEVELOPING') {
        setColors(prev => ({ ...prev, developingColor: trimmedColor }));
      } else if (editingLevel.id === 'NEEDS_IMPROVEMENT') {
        setColors(prev => ({ ...prev, needsImprovementColor: trimmedColor }));
      }
    } else {
      // Create new level
      const newOrder = performanceLevels.length > 0 ? Math.max(...performanceLevels.map(l => l.order)) + 1 : 1;
      const cleanId = `lvl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newLevel: ConfigurablePerformanceLevel = {
        id: cleanId,
        label: levelFormLabel.trim(),
        kinyarwandaLabel: levelFormKinyarwanda.trim() || undefined,
        colorHex: trimmedColor,
        textColor: levelFormTextColor,
        order: newOrder,
        isDefault: false
      };
      setPerformanceLevels(prev => [...prev, newLevel]);
    }

    setIsLevelModalOpen(false);
  };

  const handleMoveLevelUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...performanceLevels];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;

    const updated = reordered.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));
    setPerformanceLevels(updated);
  };

  const handleMoveLevelDown = (index: number) => {
    if (index >= performanceLevels.length - 1) return;
    const reordered = [...performanceLevels];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;

    const updated = reordered.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));
    setPerformanceLevels(updated);
  };

  const handleConfirmDeleteLevel = () => {
    if (!deleteLevelCandidate) return;
    const filtered = performanceLevels.filter(l => l.id !== deleteLevelCandidate.id);
    const reordered = filtered.map((l, idx) => ({
      ...l,
      order: idx + 1
    }));
    setPerformanceLevels(reordered);
    setDeleteLevelCandidate(null);
  };

  // Reset to default subjects, levels, and colors
  const handleResetToDefaults = () => {
    if (window.confirm('Waba wizeye ko ushaka gusubiza amasomo, ibyiciro by\'amanota, n\'amabara ku buryo bwa mbere bwashyizweho (Reset to Factory Defaults)? Ibi bizasubizaho amasomo 17 asanzwe, ibyiciro 4 by\'amanota (Excellent, Very Good, Developing, Need to Improve), n\'amabara y\'ibanze.')) {
      const defaults = getDefaultNurserySubjectsAndColors();
      setSubjects([...defaults.subjects]);
      setColors({ ...defaults.colors });
      setPerformanceLevels([...DEFAULT_PERFORMANCE_LEVELS]);
      setStatusMessage({
        type: 'success',
        text: 'Amasomo, ibyiciro by\'amanota, n\'amabara byasubijwe ku buryo bwa mbere. Kanda "Bika & Shyira ku Rubuga" kugira ngo byoherezwe mu bubiko.'
      });
    }
  };

  // Undo changes back to last saved snapshot
  const handleUndo = () => {
    if (!originalSnapshot) return;
    setSubjects(JSON.parse(JSON.stringify(originalSnapshot.subjects)));
    setColors(JSON.parse(JSON.stringify(originalSnapshot.colors)));
    setPerformanceLevels(JSON.parse(JSON.stringify(originalSnapshot.performanceLevels)));
    setStatusMessage({
      type: 'success',
      text: 'Ihinduka ryasubijwe inyuma ku byari bisanzwe bibitse (Changes undone).'
    });
  };

  // Save to Firebase Firestore globally
  const handleSaveToFirestore = async () => {
    if (!isAdmin) {
      alert('Uruhare rw\'Umuyobozi (Admin) ni rwo gusa rwemerewe guhindura amasomo n\'amabara.');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const payload: NurserySubjectsAndColorsSettings = {
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || 'twizerefelix90@gmail.com',
      subjects: subjects.map((s, idx) => ({
        ...s,
        number: idx + 1
      })),
      colors: { ...colors },
      performanceLevels: performanceLevels.map((l, idx) => ({
        ...l,
        order: idx + 1
      }))
    };

    const res = await saveNurserySubjectsAndColorsSettings(payload, user?.email || undefined);

    setIsSaving(false);
    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: 'Amasomo, ibyiciro by\'amanota n\'amabara byabitswe neza muri Firebase Firestore! Byamaze gukwirakwizwa kuri buri mwarimu no kuri buri karita y\'amanota (Updated globally across all devices & PDF printouts).'
      });
      setOriginalSnapshot({
        subjects: JSON.parse(JSON.stringify(payload.subjects)),
        colors: JSON.parse(JSON.stringify(payload.colors)),
        performanceLevels: JSON.parse(JSON.stringify(payload.performanceLevels || []))
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: `Habaye ikibazo mu kubika: ${res.error || 'Ntabwo byakunze'}`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-500 text-slate-950 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Exclusive Control</span>
              </span>
              <span className="text-[11px] font-mono text-teal-300">
                appSettings/nursery_subjects_and_colors
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
              <Palette className="w-6 h-6 text-amber-400" />
              <span>Nursery Report Cards: Subjects, Levels & Colors</span>
            </h1>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Genzura amasomo, ibyiciro by'amanota (Performance Levels: Excellent, Very Good, Developing, Need to Improve), n'amabara y'ikarita y'amanota.
              Impinduka zose zibitswe hano zihita zigaragara kuri buri karita (Preview, PDF, Print) no kuri buri konti y'umwarimu ku bikoresho byose.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={isSaving}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Subiza inyuma ibyo wahinduye bitarabikwa"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>

            <button
              onClick={handleResetToDefaults}
              disabled={isSaving}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Subizaho amasomo n'amabara asanzwe ya mbere"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Defaults</span>
            </button>

            <button
              onClick={handleSaveToFirestore}
              disabled={isSaving || !isAdmin}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Bika...' : 'Bika & Shyira ku Rubuga (Publish Globally)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Feedback Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-start space-x-3 shadow-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border border-rose-300 text-rose-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Sub-Tabs Switcher */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveSubTab('subjects')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'subjects'
              ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-400/30'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Amasomo (Subjects)</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeSubTab === 'subjects' ? 'bg-teal-900 text-teal-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {subjects.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('levels')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'levels'
              ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-400/30'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4 text-amber-300" />
          <span>Ibyiciro by'Amanota (Performance Levels)</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeSubTab === 'levels' ? 'bg-teal-900 text-teal-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {performanceLevels.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('colors')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'colors'
              ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-400/30'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Amabara y'Imbonerahamwe (Table Colors & Themes)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('preview')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'preview'
              ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-400/30'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Irebere uko bizasa (Live Interactive Preview)</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: SUBJECTS MANAGEMENT
          ========================================================================= */}
      {activeSubTab === 'subjects' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span>Urutonde rw'Amasomo n'Ibyiciro (Subjects & Sections)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ongeramo isomo rishya, hindura amazina, hindura uko akurikirana, cyangwa sehanagura isomo ridakenewe.
              </p>
            </div>

            <button
              onClick={handleOpenAddSubjectModal}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Ongeramo Isomo Rishya (Add Subject)</span>
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Tegereza, amasomo ari gukurwa muri Firestore...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4 w-48">Icyiciro (Section)</th>
                    <th className="py-3 px-4">Izina ry'Isomo (Subject Label)</th>
                    <th className="py-3 px-4 w-28 text-center">Ibara</th>
                    <th className="py-3 px-4 w-32 text-center">Uko rikurikirana</th>
                    <th className="py-3 px-4 w-28 text-center">Ibikorwa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {subjects.map((subject, index) => {
                    const isFirst = index === 0;
                    const isLast = index === subjects.length - 1;

                    return (
                      <tr key={subject.id} className="hover:bg-teal-50/40 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                          {subject.number}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            {subject.section}
                          </span>
                          {subject.sectionTitle && (
                            <div className="text-[10px] text-teal-700 font-semibold mt-0.5 truncate max-w-xs">
                              ↳ Header: {subject.sectionTitle}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center space-x-2">
                            <span>{subject.label}</span>
                            {subject.isCustom && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                                Custom
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {subject.colorHex ? (
                            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full border border-slate-200 bg-white">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: subject.colorHex }}
                              />
                              <span className="font-mono text-[10px] text-slate-600">
                                {subject.colorHex}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center space-x-1">
                            <button
                              onClick={() => handleMoveSubjectUp(index)}
                              disabled={isFirst}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-25 transition-all cursor-pointer"
                              title="Zamura hejuru (Move up)"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveSubjectDown(index)}
                              disabled={isLast}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-25 transition-all cursor-pointer"
                              title="Manura hasi (Move down)"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleOpenEditSubjectModal(subject)}
                              className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-all cursor-pointer"
                              title="Hindura iri somo (Edit)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteSubjectCandidate(subject)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                              title="Siba iri somo (Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* =========================================================================
          SUB-TAB 2: PERFORMANCE LEVELS MANAGEMENT
          ========================================================================= */}
      {activeSubTab === 'levels' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Ibyiciro by'Amanota (Performance Levels Management)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Genzura ibyiciro by'amanota: Hindura amazina (Excellent, Very Good, Developing, Need to Improve), amabara, ongeramo ibindi byiciro bishya, hindura uko bikurikirana, cyangwa siba ibitari ngombwa.
                </p>
              </div>

              <button
                onClick={handleOpenAddLevelModal}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Ongeramo Icyiciro Gishya (Add Level)</span>
              </button>
            </div>

            {/* Performance Scale Preview Strip */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-teal-50/30 to-slate-50 border-b border-slate-200">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center space-x-2">
                <span>Uko bizagaragara mu Mutwe w'Ikarita (Legend Preview):</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {performanceLevels.map((lvl) => (
                  <div
                    key={lvl.id}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  >
                    <span
                      className="w-4 h-2.5 rounded-xs border border-black/20 shrink-0"
                      style={{ backgroundColor: lvl.colorHex }}
                    />
                    <span className="text-xs font-bold text-slate-900">{lvl.label}</span>
                    {lvl.kinyarwandaLabel && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        ({lvl.kinyarwandaLabel})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-12 text-center">Urutonde</th>
                    <th className="py-3 px-4 w-32 text-center">Ibara ry'Icyiciro</th>
                    <th className="py-3 px-4">Izina ry'Icyiciro (Label)</th>
                    <th className="py-3 px-4">Mu Kinyarwanda</th>
                    <th className="py-3 px-4 w-32 text-center">Capsule Preview</th>
                    <th className="py-3 px-4 w-32 text-center">Uko bikurikirana</th>
                    <th className="py-3 px-4 w-28 text-center">Ibikorwa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {performanceLevels.map((lvl, index) => {
                    const isFirst = index === 0;
                    const isLast = index === performanceLevels.length - 1;

                    return (
                      <tr key={lvl.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                          #{lvl.order || index + 1}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full border border-slate-200 bg-white shadow-2xs">
                            <span
                              className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: lvl.colorHex }}
                            />
                            <span className="font-mono text-[11px] text-slate-700 font-bold">
                              {lvl.colorHex}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900 text-xs">
                          <div className="flex items-center space-x-2">
                            <span>{lvl.label}</span>
                            {lvl.isDefault && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-bold border border-teal-200">
                                Standard
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {lvl.kinyarwandaLabel || '—'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-2xs border border-black/10"
                            style={{
                              backgroundColor: lvl.colorHex,
                              color: lvl.textColor || '#ffffff'
                            }}
                          >
                            {lvl.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center space-x-1">
                            <button
                              onClick={() => handleMoveLevelUp(index)}
                              disabled={isFirst}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-25 transition-all cursor-pointer"
                              title="Zamura hejuru (Move up)"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveLevelDown(index)}
                              disabled={isLast}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-25 transition-all cursor-pointer"
                              title="Manura hasi (Move down)"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleOpenEditLevelModal(lvl)}
                              className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-all cursor-pointer"
                              title="Hindura iri somo (Edit)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteLevelCandidate(lvl)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                              title="Siba iki cyiciro (Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: COLORS & THEMES MANAGEMENT
          ========================================================================= */}
      {activeSubTab === 'colors' && (
        <div className="space-y-6">
          {/* Quick Theme Presets */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Hitamo Theme Ihita Itegura Amabara Yose (Quick Color Themes)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kanda kuri imwe muri izi themes ziteguye kugira ngo uhite uhindura amabara y'umutwe n'imbonerahamwe y'ikarita.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRESET_THEMES.map((theme) => {
                const isSelected =
                  colors.tableHeaderBg === theme.colors.tableHeaderBg &&
                  colors.tableBorderColor === theme.colors.tableBorderColor;

                return (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() => {
                      setColors({ ...theme.colors });
                      setStatusMessage({
                        type: 'success',
                        text: `Theme "${theme.name}" yatoranyijwe. Kanda "Bika & Shyira ku Rubuga" kugira ngo byemezwe.`
                      });
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-400/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{theme.name}</span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-teal-600 text-white">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span
                        className="w-5 h-5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: theme.colors.tableHeaderBg }}
                        title="Header BG"
                      />
                      <span
                        className="w-5 h-5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: theme.colors.sectionHeaderBg }}
                        title="Section BG"
                      />
                      <span
                        className="w-5 h-5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: theme.colors.tableBorderColor }}
                        title="Border Color"
                      />
                      <span
                        className="w-5 h-5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: theme.colors.excellentColor }}
                        title="Excellent"
                      />
                      <span
                        className="w-5 h-5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: theme.colors.veryGoodColor }}
                        title="Very Good"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Color Pickers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel 1: Performance Level Capsule Colors */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-teal-600" />
                  <span>Amabara y'Amanota (Primary Performance Colors)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aya mabara ni yo agaragara mu bubonero (Capsules & Badges) bw'ikurikiranacyitegererezo ku ikarita n'amateka y'amanota.
                </p>
              </div>

              {/* Excellent */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center space-x-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                      style={{ backgroundColor: colors.excellentColor }}
                    />
                    <span>1. EXCELLENT (Amanota yo hejuru cyane)</span>
                  </label>
                  <span
                    className="px-2.5 py-1 rounded-md text-[11px] font-black text-white shadow-2xs"
                    style={{ backgroundColor: colors.excellentColor }}
                  >
                    Preview Capsule
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={colors.excellentColor}
                    onChange={(e) => {
                      const newCol = e.target.value;
                      setColors({ ...colors, excellentColor: newCol });
                      setPerformanceLevels(prev =>
                        prev.map(l => (l.id === 'EXCELLENT' ? { ...l, colorHex: newCol } : l))
                      );
                    }}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={colors.excellentColor}
                    onChange={(e) => {
                      const newCol = e.target.value;
                      setColors({ ...colors, excellentColor: newCol });
                      setPerformanceLevels(prev =>
                        prev.map(l => (l.id === 'EXCELLENT' ? { ...l, colorHex: newCol } : l))
                      );
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase"
                    placeholder="#48bb78"
                  />
                </div>
              </div>

              {/* Very Good */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center space-x-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                      style={{ backgroundColor: colors.veryGoodColor }}
                    />
                    <span>2. VERY GOOD (Amanota meza cyane)</span>
                  </label>
                  <span
                    className="px-2.5 py-1 rounded-md text-[11px] font-black text-white shadow-2xs"
                    style={{ backgroundColor: colors.veryGoodColor }}
                  >
                    Preview Capsule
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={colors.veryGoodColor}
                    onChange={(e) => {
                      const newCol = e.target.value;
                      setColors({ ...colors, veryGoodColor: newCol });
                      setPerformanceLevels(prev =>
                        prev.map(l => (l.id === 'VERY_GOOD' ? { ...l, colorHex: newCol } : l))
                      );
                    }}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={colors.veryGoodColor}
                    onChange={(e) => {
                      const newCol = e.target.value;
                      setColors({ ...colors, veryGoodColor: newCol });
                      setPerformanceLevels(prev =>
                        prev.map(l => (l.id === 'VERY_GOOD' ? { ...l, colorHex: newCol } : l))
                      );
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase"
                    placeholder="#3182ce"
                  />
                </div>
              </div>

              {/* Developing */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center space-x-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                      style={{ backgroundColor: colors.developingColor }}
                    />
                    <span>3. DEVELOPING (Ari gutera imbere)</span>
                  </label>
                  <span
                    className="px-2.5 py-1 rounded-md text-[11px] font-black text-slate-950 shadow-2xs"
                    style={{ backgroundColor: colors.developingColor }}
                  >
                    Preview Capsule
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={colors.developingColor}
                    onChange={(e) => {
                      const newCol = e.target.value;
                      setColors({ ...colors, developingColor: newCol });
                      setPerformanceLevels(prev =>
                        prev.map(l => (l.id === 'DEVELOPING' ? { ...l, colorHex: newCol } : l))
                      );
                    }}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={colors.developingColor}
                    onChange={(e) => {
                      const newCol = e.target.value;
                      setColors({ ...colors, developingColor: newCol });
                      setPerformanceLevels(prev =>
                        prev.map(l => (l.id === 'DEVELOPING' ? { ...l, colorHex: newCol } : l))
                      );
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase"
                    placeholder="#ed8936"
                  />
                </div>
              </div>

              {/* Needs Improvement */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center space-x-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                      style={{ backgroundColor: colors.needsImprovementColor }}
                    />
                    <span>4. NEED TO IMPROVE (Akeneye gukosorwa)</span>
                  </label>
                  <span
                    className="px-2.5 py-1 rounded-md text-[11px] font-black text-white shadow-2xs"
                    style={{ backgroundColor: colors.needsImprovementColor }}
                  >
                    Preview Capsule
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={colors.needsImprovementColor}
                    onChange={(e) => {
                      const newCol = e.target.value;
                      setColors({ ...colors, needsImprovementColor: newCol });
                      setPerformanceLevels(prev =>
                        prev.map(l => (l.id === 'NEEDS_IMPROVEMENT' ? { ...l, colorHex: newCol } : l))
                      );
                    }}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={colors.needsImprovementColor}
                    onChange={(e) => {
                      const newCol = e.target.value;
                      setColors({ ...colors, needsImprovementColor: newCol });
                      setPerformanceLevels(prev =>
                        prev.map(l => (l.id === 'NEEDS_IMPROVEMENT' ? { ...l, colorHex: newCol } : l))
                      );
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase"
                    placeholder="#e53e3e"
                  />
                </div>
              </div>
            </div>

            {/* Panel 2: Table Header & Document Styling */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>Imbonerahamwe n'Imitwe (Table & Section Styles)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aya mabara agenga background y'umutwe w'imbonerahamwe, inyandiko, n'imbibi (table borders).
                </p>
              </div>

              {/* Table Header Background */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="text-xs font-extrabold text-slate-800 flex items-center space-x-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                    style={{ backgroundColor: colors.tableHeaderBg }}
                  />
                  <span>Umutwe w'Imbonerahamwe (Table Header Background)</span>
                </label>

                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={colors.tableHeaderBg}
                    onChange={(e) => setColors({ ...colors, tableHeaderBg: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={colors.tableHeaderBg}
                    onChange={(e) => setColors({ ...colors, tableHeaderBg: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase"
                    placeholder="#1e293b"
                  />
                </div>
              </div>

              {/* Table Header Text Color */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="text-xs font-extrabold text-slate-800 flex items-center space-x-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                    style={{ backgroundColor: colors.tableHeaderTextColor }}
                  />
                  <span>Ibara ry'Inyandiko mu Mutwe (Header Text Color)</span>
                </label>

                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={colors.tableHeaderTextColor}
                    onChange={(e) => setColors({ ...colors, tableHeaderTextColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={colors.tableHeaderTextColor}
                    onChange={(e) => setColors({ ...colors, tableHeaderTextColor: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              {/* Section Subheading Background */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="text-xs font-extrabold text-slate-800 flex items-center space-x-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                    style={{ backgroundColor: colors.sectionHeaderBg }}
                  />
                  <span>Umutwe w'Icyiciro (Section Row Background)</span>
                </label>

                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={colors.sectionHeaderBg}
                    onChange={(e) => setColors({ ...colors, sectionHeaderBg: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={colors.sectionHeaderBg}
                    onChange={(e) => setColors({ ...colors, sectionHeaderBg: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase"
                    placeholder="#f1f5f9"
                  />
                </div>
              </div>

              {/* Table Border Color */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="text-xs font-extrabold text-slate-800 flex items-center space-x-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                    style={{ backgroundColor: colors.tableBorderColor }}
                  />
                  <span>Ibara ry'Imbibi z'Imbonerahamwe (Table Border Color)</span>
                </label>

                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={colors.tableBorderColor}
                    onChange={(e) => setColors({ ...colors, tableBorderColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={colors.tableBorderColor}
                    onChange={(e) => setColors({ ...colors, tableBorderColor: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase"
                    placeholder="#cbd5e1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: LIVE INTERACTIVE PREVIEW
          ========================================================================= */}
      {activeSubTab === 'preview' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                <Eye className="w-5 h-5 text-teal-600" />
                <span>Irebere imbonerahamwe n'ubusobanuro bw'amanota (Live Card & Legend Preview)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Irebere uko aya masomo, ibyiciro by'amanota, n'amabara bitoranyijwe azajya agaragara ku makarita asohoka, ku mpirimbano (PDF/Print), no kuri buri mudasobwa cyangwa telefoni.
              </p>
            </div>

            <button
              onClick={handleSaveToFirestore}
              disabled={isSaving}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Bika aya Mabara & Amasomo</span>
            </button>
          </div>

          {/* Performance Legend Live Preview */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-700">
              PERFORMANCE LEGEND (UBUSOBANURO BW'AMANOTA):
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {performanceLevels.map((lvl) => (
                <span
                  key={lvl.id}
                  className="px-3 py-1 rounded-md font-bold shadow-2xs border border-black/10 flex items-center space-x-1.5"
                  style={{
                    backgroundColor: lvl.colorHex,
                    color: lvl.textColor || '#ffffff'
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-white/40 inline-block" />
                  <span>{lvl.label}</span>
                  {lvl.kinyarwandaLabel && (
                    <span className="opacity-90 font-medium text-[10px]">
                      ({lvl.kinyarwandaLabel})
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Mock Interactive Table */}
          <div className="overflow-x-auto rounded-xl shadow-xs border" style={{ borderColor: colors.tableBorderColor }}>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr
                  style={{
                    backgroundColor: colors.tableHeaderBg,
                    color: colors.tableHeaderTextColor
                  }}
                  className="font-black uppercase tracking-wider text-[11px]"
                >
                  <th className="py-2.5 px-3 w-10 text-center" style={{ borderRight: `1px solid ${colors.tableBorderColor}` }}>#</th>
                  <th className="py-2.5 px-4" style={{ borderRight: `1px solid ${colors.tableBorderColor}` }}>
                    IBIPIMO BY'ISUZUMA (ASSESSMENT CRITERIA)
                  </th>
                  <th className="py-2.5 px-3 text-center w-28" style={{ borderRight: `1px solid ${colors.tableBorderColor}` }}>
                    IGIHENGO I (TERM 1)
                  </th>
                  <th className="py-2.5 px-3 text-center w-28" style={{ borderRight: `1px solid ${colors.tableBorderColor}` }}>
                    IGIHENGO II (TERM 2)
                  </th>
                  <th className="py-2.5 px-3 text-center w-28">
                    IGIHENGO III (TERM 3)
                  </th>
                </tr>
              </thead>
              <tbody>
                {subjects.slice(0, 10).map((subject, idx) => {
                  const showSectionHeader = subject.sectionTitle !== undefined;

                  const levelCount = performanceLevels.length;
                  const lvl1 = levelCount > 0 ? performanceLevels[idx % levelCount] : null;
                  const lvl2 = levelCount > 0 ? performanceLevels[(idx + 1) % levelCount] : null;
                  const lvl3 = levelCount > 0 ? performanceLevels[(idx + 2) % levelCount] : null;

                  return (
                    <React.Fragment key={subject.id}>
                      {showSectionHeader && (
                        <tr
                          style={{
                            backgroundColor: colors.sectionHeaderBg,
                            color: colors.sectionHeaderTextColor,
                            borderTop: `1px solid ${colors.tableBorderColor}`,
                            borderBottom: `1px solid ${colors.tableBorderColor}`
                          }}
                        >
                          <td colSpan={5} className="py-1.5 px-4 font-black uppercase text-[10px] tracking-wider">
                            ★ {subject.sectionTitle} ({subject.section})
                          </td>
                        </tr>
                      )}

                      <tr
                        style={{ borderBottom: `1px solid ${colors.tableBorderColor}` }}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td
                          className="py-2 px-3 text-center font-mono font-bold text-slate-400"
                          style={{ borderRight: `1px solid ${colors.tableBorderColor}` }}
                        >
                          {subject.number}
                        </td>
                        <td
                          className="py-2 px-4 font-medium text-slate-800"
                          style={{ borderRight: `1px solid ${colors.tableBorderColor}` }}
                        >
                          <span style={subject.colorHex ? { color: subject.colorHex, fontWeight: 'bold' } : undefined}>
                            {subject.label}
                          </span>
                        </td>
                        <td
                          className="py-2 px-2 text-center"
                          style={{ borderRight: `1px solid ${colors.tableBorderColor}` }}
                        >
                          {lvl1 && (
                            <span
                              className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                              style={{
                                backgroundColor: lvl1.colorHex,
                                color: lvl1.textColor || '#ffffff'
                              }}
                            >
                              {lvl1.label}
                            </span>
                          )}
                        </td>
                        <td
                          className="py-2 px-2 text-center"
                          style={{ borderRight: `1px solid ${colors.tableBorderColor}` }}
                        >
                          {lvl2 && (
                            <span
                              className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                              style={{
                                backgroundColor: lvl2.colorHex,
                                color: lvl2.textColor || '#ffffff'
                              }}
                            >
                              {lvl2.label}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {lvl3 && (
                            <span
                              className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                              style={{
                                backgroundColor: lvl3.colorHex,
                                color: lvl3.textColor || '#ffffff'
                              }}
                            >
                              {lvl3.label}
                            </span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {subjects.length > 10 && (
            <div className="text-center text-slate-400 text-xs italic">
              (Imbonerahamwe yerekana amasomo 10 ya mbere muri {subjects.length} ahari nk'urugero)
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT SUBJECT
          ========================================================================= */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span>
                  {editingSubject ? "Hindura Isomo (Edit Subject)" : "Ongeramo Isomo Rishya (Add Subject)"}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalSubject} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Izina ry'Isomo (Subject Name / Assessment Label) *</label>
                <input
                  type="text"
                  required
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="urugero: Kwandika no gusoma inyuguti z'Ikinyarwanda"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Icyiciro Isomo Ririmo (Section Group) *</label>
                <select
                  value={formSection}
                  onChange={(e) => setFormSection(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {existingSections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ Andika Icyiciro Gishya (Create New Section)...</option>
                </select>
              </div>

              {formSection === '__CUSTOM__' && (
                <div className="space-y-1">
                  <label className="font-bold text-teal-800">Andika Izina ry'Icyiciro Gishya (Custom Section Name)</label>
                  <input
                    type="text"
                    required
                    value={formCustomSection}
                    onChange={(e) => setFormCustomSection(e.target.value)}
                    placeholder="urugero: IMIKORERE N'IMIKINO"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">Umutwe w'Icyiciro (Section Title Bar Header)</label>
                  <span className="text-[10px] text-slate-400">Gusa ku somo rya mbere mu cyiciro</span>
                </div>
                <input
                  type="text"
                  value={formSectionTitle}
                  onChange={(e) => setFormSectionTitle(e.target.value)}
                  placeholder="urugero: I. IMYITWARIRE (Urugero: Niba ari ryo ritangira iki cyiciro)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Ibara ry'Inyandiko y'Isomo (Optional Text Color)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formColorHex || '#0f172a'}
                    onChange={(e) => setFormColorHex(e.target.value)}
                    className="w-9 h-9 rounded-xl border border-slate-300 p-0.5 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={formColorHex}
                    onChange={(e) => setFormColorHex(e.target.value)}
                    placeholder="urugero: #1e3a8a cyangwa rekamo ubusa (Default)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs"
                  />
                  {formColorHex && (
                    <button
                      type="button"
                      onClick={() => setFormColorHex('')}
                      className="px-2.5 py-2 rounded-xl text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Reka (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white font-extrabold bg-teal-600 hover:bg-teal-500 shadow-xs cursor-pointer active:scale-95"
                >
                  {editingSubject ? "Emeza Impinduka (Update)" : "Ongeraho (Add Subject)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT PERFORMANCE LEVEL
          ========================================================================= */}
      {isLevelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>
                  {editingLevel
                    ? "Hindura Icyiciro cy'Amanota (Edit Performance Level)"
                    : "Ongeramo Icyiciro Gishya cy'Amanota (Add Level)"}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsLevelModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalLevel} className="space-y-4 text-xs">
              {/* Level Label */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  Izina ry'Icyiciro (Label - urugero: Excellent, Need to Improve, n'ibindi) *
                </label>
                <input
                  type="text"
                  required
                  value={levelFormLabel}
                  onChange={(e) => setLevelFormLabel(e.target.value)}
                  placeholder="urugero: Excellent cyangwa Need to Improve"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Kinyarwanda translation */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  Ubusobanuro mu Kinyarwanda (Kinyarwanda Label - Optional)
                </label>
                <input
                  type="text"
                  value={levelFormKinyarwanda}
                  onChange={(e) => setLevelFormKinyarwanda(e.target.value)}
                  placeholder="urugero: Ikirenga, Byiza cyane, Biri mu nzira, Bikeneye gukosorwa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Color selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">
                  Ibara ry'Iki Cyiciro (Level Color) *
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={levelFormColorHex}
                    onChange={(e) => setLevelFormColorHex(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    required
                    value={levelFormColorHex}
                    onChange={(e) => setLevelFormColorHex(e.target.value)}
                    placeholder="#48bb78"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase"
                  />
                </div>

                {/* Quick Swatches */}
                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-[10px] text-slate-400 font-bold">Amabara asanzwe:</span>
                  {[
                    { hex: '#48bb78', name: 'Green' },
                    { hex: '#3182ce', name: 'Blue' },
                    { hex: '#ecc94b', name: 'Yellow' },
                    { hex: '#e53e3e', name: 'Red' },
                    { hex: '#805ad5', name: 'Purple' },
                    { hex: '#00b5d8', name: 'Cyan' },
                    { hex: '#dd6b20', name: 'Orange' }
                  ].map((sw) => (
                    <button
                      key={sw.hex}
                      type="button"
                      onClick={() => setLevelFormColorHex(sw.hex)}
                      className="w-5 h-5 rounded-full border border-black/10 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: sw.hex }}
                      title={sw.name}
                    />
                  ))}
                </div>
              </div>

              {/* Text Color for Capsule */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">
                  Ibara ry'Inyandiko imbere muri Capsule (Text Color)
                </label>
                <div className="flex items-center space-x-3">
                  <label className="inline-flex items-center space-x-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="textColor"
                      checked={levelFormTextColor === '#ffffff'}
                      onChange={() => setLevelFormTextColor('#ffffff')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span>Umweru (White - #ffffff)</span>
                  </label>
                  <label className="inline-flex items-center space-x-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="textColor"
                      checked={levelFormTextColor === '#0f172a'}
                      onChange={() => setLevelFormTextColor('#0f172a')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span>Umukara (Dark - #0f172a)</span>
                  </label>
                </div>
              </div>

              {/* Capsule Live Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-600">Capsule Live Preview:</span>
                <span
                  className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-2xs border border-black/10"
                  style={{
                    backgroundColor: levelFormColorHex,
                    color: levelFormTextColor
                  }}
                >
                  {levelFormLabel.trim() || 'Level Preview'}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLevelModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Reka (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white font-extrabold bg-teal-600 hover:bg-teal-500 shadow-xs cursor-pointer active:scale-95"
                >
                  {editingLevel ? "Emeza Impinduka (Update)" : "Ongeraho (Add Level)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DELETE SUBJECT CONFIRMATION
          ========================================================================= */}
      {deleteSubjectCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Gusiba Isomo: {deleteSubjectCandidate.label}?
              </h3>
              <p className="text-xs text-slate-500">
                Gusiba iri somo bizatuma ritazongera kugaragara mu makarita mashya n'uburyo bwo kwinjiza amanota.
              </p>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Umutekano w'Amanota y'Abanyeshuri:</strong> Amanota yose yari asanzwe yanditse ku banyeshuri bahawe amanota kuri iri somo azaguma mu bubiko neza atangiritse.
              </span>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteSubjectCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Reka (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSubject}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-xs cursor-pointer active:scale-95"
              >
                Yego, Siba Isomo (Confirm Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DELETE PERFORMANCE LEVEL CONFIRMATION
          ========================================================================= */}
      {deleteLevelCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Gusiba Icyiciro cy'Amanota: {deleteLevelCandidate.label}?
              </h3>
              <p className="text-xs text-slate-500">
                Gusiba iki cyiciro bizatuma gitavaho mu rutonde rw'ubusobanuro (Legend) no mu buto bwo kwinjiza amanota.
              </p>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Umutekano w'Amanota y'Abanyeshuri:</strong> Amanota yose yahawe abanyeshuri hakoreshejwe iki cyiciro mu bihe byashize azaguma agaragara mu makarita yabo atangiritse.
              </span>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteLevelCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Reka (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLevel}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-xs cursor-pointer active:scale-95"
              >
                Yego, Siba Icyiciro (Confirm Delete)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

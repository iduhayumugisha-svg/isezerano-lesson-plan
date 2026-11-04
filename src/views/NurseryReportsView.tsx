import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  GraduationCap, 
  Users, 
  PlusCircle, 
  Search, 
  Edit3, 
  Trash2, 
  Printer, 
  Save, 
  School, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  FileSpreadsheet, 
  ArrowLeft, 
  Filter, 
  ChevronRight, 
  Download, 
  Sparkles,
  X,
  ExternalLink,
  Award,
  Layers
} from 'lucide-react';
import { 
  NurseryStudent, 
  StudentTermAssessment, 
  NurserySchoolInfo, 
  EMPTY_NURSERY_SCHOOL_INFO, 
  NURSERY_ASSESSMENT_CRITERIA, 
  PERFORMANCE_LEGEND, 
  PerformanceLevel, 
  AssessmentTerm,
  CriterionScores
} from '../types/nurseryReport';
import { 
  getLocalNurserySchoolInfo, 
  saveNurserySchoolInfo, 
  subscribeToNurserySchoolInfo, 
  getLocalNurseryStudents, 
  saveNurseryStudent, 
  deleteNurseryStudent, 
  subscribeToNurseryStudents, 
  getLocalNurseryAssessments, 
  saveStudentAssessment, 
  subscribeToNurseryAssessments 
} from '../services/nurseryStorageService';
import { NurseryReportCardDocument } from '../components/NurseryReportCardDocument';

interface NurseryReportsViewProps {
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
}

type NurseryTab = 'students' | 'marks' | 'print' | 'school';

export const NurseryReportsView: React.FC<NurseryReportsViewProps> = ({
  onNavigateHome,
  onNavigateDashboard
}) => {
  // Main Navigation Tab
  const [activeTab, setActiveTab] = useState<NurseryTab>('students');

  // School Information State (Starts Blank)
  const [schoolInfo, setSchoolInfo] = useState<NurserySchoolInfo>(() => getLocalNurserySchoolInfo());
  const [schoolSaveStatus, setSchoolSaveStatus] = useState<string | null>(null);

  // Students State (Starts strictly empty until real students are added)
  const [students, setStudents] = useState<NurseryStudent[]>(() => getLocalNurseryStudents());
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Assessment Records State
  const [assessments, setAssessments] = useState<StudentTermAssessment[]>(() => getLocalNurseryAssessments());
  
  // Marks Entry States
  const [selectedStudentForMarks, setSelectedStudentForMarks] = useState<NurseryStudent | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<AssessmentTerm>('term1');
  const [currentScores, setCurrentScores] = useState<CriterionScores>({});
  const [marksSaveStatus, setMarksSaveStatus] = useState<string | null>(null);

  // Student Add / Edit Modal State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<NurseryStudent | null>(null);
  const [studentFormData, setStudentFormData] = useState<Partial<NurseryStudent>>({
    fullName: '',
    classGrade: 'N1',
    gender: 'Boy',
    registrationNumber: '',
    dateOfBirth: '',
    parentContact: '',
    photoUrl: ''
  });
  const [studentFormError, setStudentFormError] = useState<string | null>(null);

  // Student Delete Confirmation Modal
  const [studentToDelete, setStudentToDelete] = useState<NurseryStudent | null>(null);

  // Print & PDF View States
  const [printTargetMode, setPrintTargetMode] = useState<'single' | 'batch'>('single');
  const [previewStudentId, setPreviewStudentId] = useState<string>('');
  const [batchClassFilter, setBatchClassFilter] = useState<string>('ALL');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Ref for printable area
  const printableAreaRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    const unsubSchool = subscribeToNurserySchoolInfo((fresh) => {
      setSchoolInfo(fresh);
    });
    const unsubStudents = subscribeToNurseryStudents((fresh) => {
      setStudents(fresh);
    });
    const unsubAssessments = subscribeToNurseryAssessments((fresh) => {
      setAssessments(fresh);
    });

    return () => {
      unsubSchool();
      unsubStudents();
      unsubAssessments();
    };
  }, []);

  // Set default preview student when students load
  useEffect(() => {
    if (students.length > 0 && !previewStudentId) {
      setPreviewStudentId(students[0].id);
    }
    if (students.length > 0 && !selectedStudentForMarks) {
      setSelectedStudentForMarks(students[0]);
    }
  }, [students]);

  // Load scores when selecting a student or term for marks entry
  useEffect(() => {
    if (!selectedStudentForMarks) {
      setCurrentScores({});
      return;
    }
    const foundAssessment = assessments.find(a => a.studentId === selectedStudentForMarks.id);
    if (!foundAssessment) {
      setCurrentScores({});
      return;
    }

    if (selectedTerm === 'term1') {
      setCurrentScores(foundAssessment.term1Scores || {});
    } else if (selectedTerm === 'term2') {
      setCurrentScores(foundAssessment.term2Scores || {});
    } else if (selectedTerm === 'term3') {
      setCurrentScores(foundAssessment.term3Scores || {});
    }
  }, [selectedStudentForMarks, selectedTerm, assessments]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (student.registrationNumber && student.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase().trim()));
      
      const matchesClass = 
        selectedClassFilter === 'ALL' || 
        student.classGrade.toUpperCase() === selectedClassFilter.toUpperCase();

      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClassFilter]);

  // Distinct classes present in student records
  const availableClasses = useMemo(() => {
    const defaultClasses = ['N1', 'N2', 'N3'];
    const dynamicClasses = new Set(defaultClasses);
    students.forEach(s => {
      if (s.classGrade) dynamicClasses.add(s.classGrade.toUpperCase());
    });
    return Array.from(dynamicClasses);
  }, [students]);

  // Save School Information Handler
  const handleSaveSchoolInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolSaveStatus('Saving to database...');
    const result = await saveNurserySchoolInfo(schoolInfo);
    if (result.success) {
      setSchoolSaveStatus('Amakuru y\'ikigo yabitswe neza muri Firestore!');
      setTimeout(() => setSchoolSaveStatus(null), 4000);
    } else {
      setSchoolSaveStatus(`Habaye ikosa: ${result.error}`);
    }
  };

  // Open modal to add new student
  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setStudentFormData({
      fullName: '',
      classGrade: selectedClassFilter !== 'ALL' ? selectedClassFilter : 'N1',
      gender: 'Boy',
      registrationNumber: '',
      dateOfBirth: '',
      parentContact: '',
      photoUrl: ''
    });
    setStudentFormError(null);
    setIsStudentModalOpen(true);
  };

  // Open modal to edit existing student
  const handleOpenEditStudent = (student: NurseryStudent) => {
    setEditingStudent(student);
    setStudentFormData({ ...student });
    setStudentFormError(null);
    setIsStudentModalOpen(true);
  };

  // Submit Student Form
  const handleSaveStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFormData.fullName || !studentFormData.fullName.trim()) {
      setStudentFormError('Amazina y\'umunyeshuri arakenewe (Full name is required).');
      return;
    }

    const id = editingStudent ? editingStudent.id : `nur-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const studentToSave: NurseryStudent = {
      id,
      fullName: studentFormData.fullName.trim(),
      classGrade: studentFormData.classGrade?.trim() || 'N1',
      gender: (studentFormData.gender as any) || 'Boy',
      registrationNumber: studentFormData.registrationNumber?.trim() || '',
      dateOfBirth: studentFormData.dateOfBirth || '',
      parentContact: studentFormData.parentContact?.trim() || '',
      photoUrl: studentFormData.photoUrl?.trim() || '',
      academicYear: schoolInfo.academicYear || '2026',
      createdAt: editingStudent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await saveNurseryStudent(studentToSave);
    if (result.success) {
      setIsStudentModalOpen(false);
      setEditingStudent(null);
      if (!previewStudentId) {
        setPreviewStudentId(id);
      }
      if (!selectedStudentForMarks) {
        setSelectedStudentForMarks(studentToSave);
      }
    } else {
      setStudentFormError(`Habaye ikosa: ${result.error}`);
    }
  };

  // Delete Student Handler
  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    const result = await deleteNurseryStudent(studentToDelete.id);
    if (result.success) {
      setStudentToDelete(null);
      if (previewStudentId === studentToDelete.id) {
        setPreviewStudentId('');
      }
      if (selectedStudentForMarks?.id === studentToDelete.id) {
        setSelectedStudentForMarks(null);
      }
    } else {
      alert(`Could not delete student: ${result.error}`);
    }
  };

  // Set score for a single criterion
  const handleSelectScore = (criterionId: string, level: PerformanceLevel) => {
    setCurrentScores(prev => ({
      ...prev,
      [criterionId]: level
    }));
  };

  // Batch fill current term
  const handleBulkSetScores = (level: PerformanceLevel) => {
    const updated: CriterionScores = {};
    NURSERY_ASSESSMENT_CRITERIA.forEach(c => {
      updated[c.id] = level;
    });
    setCurrentScores(updated);
  };

  // Save current term marks to Firestore
  const handleSaveCurrentTermScores = async () => {
    if (!selectedStudentForMarks) return;

    setMarksSaveStatus('Birimo kubikwa...');
    const existing = assessments.find(a => a.studentId === selectedStudentForMarks.id);

    const payload: StudentTermAssessment = {
      id: existing?.id || `asm_${selectedStudentForMarks.id}`,
      studentId: selectedStudentForMarks.id,
      academicYear: schoolInfo.academicYear || '2026',
      term1Scores: selectedTerm === 'term1' ? currentScores : (existing?.term1Scores || {}),
      term2Scores: selectedTerm === 'term2' ? currentScores : (existing?.term2Scores || {}),
      term3Scores: selectedTerm === 'term3' ? currentScores : (existing?.term3Scores || {}),
      updatedAt: new Date().toISOString()
    };

    const result = await saveStudentAssessment(payload);
    if (result.success) {
      setMarksSaveStatus('Amanota yabitswe neza muri Firestore!');
      setTimeout(() => setMarksSaveStatus(null), 3000);
    } else {
      setMarksSaveStatus(`Habaye ikosa: ${result.error}`);
    }
  };

  // Print Handler (Using browser native print engine with tailored print CSS)
  const handleTriggerPrint = () => {
    window.print();
  };

  // Students for batch printing
  const batchStudents = useMemo(() => {
    if (batchClassFilter === 'ALL') return students;
    return students.filter(s => s.classGrade.toUpperCase() === batchClassFilter.toUpperCase());
  }, [students, batchClassFilter]);

  return (
    <div className="nursery-report-system max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Print-specific style injected into DOM to ensure exact A4 layout with page breaks */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-report-container, .printable-report-container * {
            visibility: visible;
          }
          .printable-report-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .nursery-report-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 1.5cm 1.5cm !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .no-print, header, nav, footer, button {
            display: none !important;
          }
        }
      `}</style>

      {/* TOP NAVIGATION BREADCRUMB */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <span>← Urubuga Nyamukuru</span>
          </button>
          <span className="text-slate-300">/</span>
          <button
            onClick={onNavigateDashboard}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
          >
            Education Workspace
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900">
            Nursery Student Report Card Management
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500">
            Abanyeshuri bose: <strong className="text-slate-900 font-mono">{students.length}</strong>
          </span>
          <button
            onClick={handleOpenAddStudent}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ongeramo Umunyeshuri</span>
          </button>
        </div>
      </div>

      {/* SYSTEM HEADER BANNER */}
      <div className="no-print bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-teal-300 text-xs font-bold border border-slate-700">
            <Award className="w-3.5 h-3.5 text-amber-300" />
            <span>Class_Reports_N1_Term_1 Official CBC Template</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Nursery Student Report Card Management System
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Gacunga amakarita y'amanota n'imyitwarire y'abana b'inshuke (N1, N2, N3 / Nursery). Bikurikije neza amabwiriza n'imiterere ya REB/MINEDUC y'Ibyigwa n'Imyitwarire (Core Subjects, Ubugeni n'Umuco, Ibonezabuzima, n'Imyitwarire).
          </p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="no-print flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'students'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Abanyeshuri (Students)</span>
          <span className={`text-[10px] px-2 py-0.2 rounded-full font-extrabold ${
            activeTab === 'students' ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-700'
          }`}>
            {students.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('marks')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'marks'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Kwinjiza Amanota (Enter Assessment)</span>
        </button>

        <button
          onClick={() => setActiveTab('print')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'print'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Sohora Amakarita (Print & PDF)</span>
        </button>

        <button
          onClick={() => setActiveTab('school')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'school'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Amakuru y'Ikigo (School Profile)</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: STUDENTS MANAGEMENT (STARTS PURE EMPTY)
          ========================================================================= */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          
          {/* Filters & Actions Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Shakisha umunyeshuri..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Class Filter */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedClassFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    selectedClassFilter === 'ALL' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'
                  }`}
                >
                  Bose ({students.length})
                </button>
                {availableClasses.map(cls => {
                  const count = students.filter(s => s.classGrade.toUpperCase() === cls.toUpperCase()).length;
                  return (
                    <button
                      key={cls}
                      onClick={() => setSelectedClassFilter(cls)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        selectedClassFilter === cls ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'
                      }`}
                    >
                      {cls} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleOpenAddStudent}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ongeramo Umunyeshuri Mushya</span>
            </button>
          </div>

          {/* Students List or Empty State */}
          {students.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border-2 border-dashed border-slate-300 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Nta makuru arashyirwamo. Ongeramo abanyeshuri kugira ngo utangire.
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Iki kigo nta banyeshuri kirashyirwamo. Kanda buto yo hasi kugira ngo wandike umunyeshuri wa mbere w'inshuke (N1, N2, N3).
                </p>
              </div>
              <button
                onClick={handleOpenAddStudent}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Ongeramo Umunyeshuri wa Mbere</span>
              </button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-xs">
              Nta munyeshuri uhuye n'ibyo ushakishije. Gerageza guhindura ibyo wanditse cyangwa icyiciro (class).
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Ifoto</th>
                    <th className="py-3 px-4">Amazina y'Umunyeshuri</th>
                    <th className="py-3 px-4">Icyiciro (Class)</th>
                    <th className="py-3 px-4">Igitsina</th>
                    <th className="py-3 px-4">Amanota yanditswe</th>
                    <th className="py-3 px-4 text-right">Ibikorwa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student, idx) => {
                    const studentAssessment = assessments.find(a => a.studentId === student.id);
                    const t1Count = studentAssessment?.term1Scores ? Object.keys(studentAssessment.term1Scores).length : 0;
                    const t2Count = studentAssessment?.term2Scores ? Object.keys(studentAssessment.term2Scores).length : 0;
                    const t3Count = studentAssessment?.term3Scores ? Object.keys(studentAssessment.term3Scores).length : 0;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {student.photoUrl ? (
                              <img 
                                src={student.photoUrl} 
                                alt={student.fullName} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">
                                {student.fullName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {student.fullName}
                          {student.registrationNumber && (
                            <span className="block text-[10px] font-normal text-slate-500 font-mono">
                              Reg: {student.registrationNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                            {student.classGrade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {student.gender}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5 text-[10px] font-mono">
                            <span className={`px-1.5 py-0.5 rounded ${t1Count > 0 ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                              T1: {t1Count}/22
                            </span>
                            <span className={`px-1.5 py-0.5 rounded ${t2Count > 0 ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                              T2: {t2Count}/22
                            </span>
                            <span className={`px-1.5 py-0.5 rounded ${t3Count > 0 ? 'bg-purple-100 text-purple-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                              T3: {t3Count}/22
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => {
                                setSelectedStudentForMarks(student);
                                setActiveTab('marks');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Injiza Amanota"
                            >
                              Andika Amanota
                            </button>
                            <button
                              onClick={() => {
                                setPreviewStudentId(student.id);
                                setPrintTargetMode('single');
                                setActiveTab('print');
                              }}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Reba Ikarita"
                            >
                              <Printer className="w-4 h-4 text-slate-700" />
                            </button>
                            <button
                              onClick={() => handleOpenEditStudent(student)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Hindura"
                            >
                              <Edit3 className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => setStudentToDelete(student)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Siba"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
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
          TAB 2: MARKS / ASSESSMENT ENTRY (EXACT 22 CRITERIA)
          ========================================================================= */}
      {activeTab === 'marks' && (
        <div className="space-y-4">
          {students.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border-2 border-dashed border-slate-300 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                Nta makuru arashyirwamo. Ongeramo abanyeshuri kugira ngo utangire.
              </h3>
              <p className="text-xs text-slate-500">
                Banza ushyiremo umunyeshuri muri tab ya "Abanyeshuri" mbere yo kwinjiza amanota.
              </p>
              <button
                onClick={() => setActiveTab('students')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white cursor-pointer"
              >
                Gana kuri Abanyeshuri →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Student & Term Selection Bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  
                  {/* Select Student */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Hitamo Umunyeshuri (Select Student):
                    </label>
                    <select
                      value={selectedStudentForMarks?.id || ''}
                      onChange={(e) => {
                        const s = students.find(item => item.id === e.target.value) || null;
                        setSelectedStudentForMarks(s);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.classGrade} - {s.gender})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Term */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Igihembwe (Academic Term):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTerm('term1')}
                        className={`py-2 text-xs font-extrabold rounded-xl border cursor-pointer transition-all ${
                          selectedTerm === 'term1' 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' 
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        TERM 1
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTerm('term2')}
                        className={`py-2 text-xs font-extrabold rounded-xl border cursor-pointer transition-all ${
                          selectedTerm === 'term2' 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        TERM 2
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTerm('term3')}
                        className={`py-2 text-xs font-extrabold rounded-xl border cursor-pointer transition-all ${
                          selectedTerm === 'term3' 
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs' 
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        TERM 3
                      </button>
                    </div>
                  </div>

                  {/* Bulk Helpers */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Kuzuza byihuse (Quick Actions for {selectedTerm.toUpperCase()}):
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleBulkSetScores('EXCELLENT')}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors cursor-pointer"
                      >
                        Bose Excellent
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkSetScores('VERY_GOOD')}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                      >
                        Bose Very Good
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkSetScores(null)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Hanagura Bose
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save status notification */}
                {marksSaveStatus && (
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center justify-between">
                    <span>{marksSaveStatus}</span>
                  </div>
                )}
              </div>

              {/* Assessment Table with 1-Click Selectors */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Ibyigwa n'Imyitwarire: {selectedStudentForMarks?.fullName} ({selectedTerm.toUpperCase()})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Hitamo urwego rw'umwana kuri buri ngingo (Excellent, Very Good, Developing, Needs Improvement).
                    </p>
                  </div>

                  <button
                    onClick={handleSaveCurrentTermScores}
                    className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md cursor-pointer active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>Bika Amanota ({selectedTerm.toUpperCase()})</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-200 text-xs">
                  {NURSERY_ASSESSMENT_CRITERIA.map(criterion => {
                    const currentVal = currentScores[criterion.id];
                    const showHeader = criterion.sectionTitle !== undefined;

                    return (
                      <React.Fragment key={criterion.id}>
                        {showHeader && (
                          <div className="bg-slate-100 px-4 py-2 font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-teal-600" />
                            <span>{criterion.sectionTitle}</span>
                          </div>
                        )}

                        <div className="p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80">
                          <div className="font-semibold text-slate-800 text-xs">
                            <span className="font-mono text-slate-400 mr-2">{criterion.number}.</span>
                            <span>{criterion.label}</span>
                          </div>

                          {/* 4 Interactive Level Buttons */}
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSelectScore(criterion.id, 'EXCELLENT')}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                currentVal === 'EXCELLENT'
                                  ? 'bg-[#48bb78] text-white border-[#38a169] shadow-xs ring-2 ring-emerald-400/40'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                              }`}
                            >
                              Excellent
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectScore(criterion.id, 'VERY_GOOD')}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                currentVal === 'VERY_GOOD'
                                  ? 'bg-[#3182ce] text-white border-[#2b6cb0] shadow-xs ring-2 ring-blue-400/40'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
                              }`}
                            >
                              Very Good
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectScore(criterion.id, 'DEVELOPING')}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                currentVal === 'DEVELOPING'
                                  ? 'bg-[#ecc94b] text-slate-950 border-[#d69e2e] shadow-xs ring-2 ring-amber-400/40'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                              }`}
                            >
                              Developing
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectScore(criterion.id, 'NEEDS_IMPROVEMENT')}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                currentVal === 'NEEDS_IMPROVEMENT'
                                  ? 'bg-[#e53e3e] text-white border-[#c53030] shadow-xs ring-2 ring-red-400/40'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50'
                              }`}
                            >
                              Needs Impr.
                            </button>

                            {currentVal && (
                              <button
                                type="button"
                                onClick={() => handleSelectScore(criterion.id, null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer ml-1"
                                title="Hanagura iki kigereranyo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={handleSaveCurrentTermScores}
                    className="inline-flex items-center space-x-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md cursor-pointer active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>Bika Amanota yose ya {selectedTerm.toUpperCase()} muri Firestore</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: PRINT & PDF GENERATION (SINGLE OR BATCH / COMBINED)
          ========================================================================= */}
      {activeTab === 'print' && (
        <div className="space-y-6">
          {students.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border-2 border-dashed border-slate-300 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                Nta makuru arashyirwamo. Ongeramo abanyeshuri kugira ngo utangire.
              </h3>
              <p className="text-xs text-slate-500">
                Ntabwo hashobora gusohorwa amakarita igihe nta banyeshuri banditswe muri system.
              </p>
              <button
                onClick={() => setActiveTab('students')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white cursor-pointer"
              >
                Gana kuri Abanyeshuri →
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Print Controls Card */}
              <div className="no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-700">Uburyo bwo gusohora:</span>
                    <button
                      type="button"
                      onClick={() => setPrintTargetMode('single')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        printTargetMode === 'single'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Umunyeshuri Umwe (Single)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintTargetMode('batch')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        printTargetMode === 'batch'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Ikarita Zose Hamwe (Combined / All Class)
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleTriggerPrint}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      <span>
                        {printTargetMode === 'single' ? 'Print / Export Ikarita (A4)' : `Print Amakarita Yose (${batchStudents.length})`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sub-selector for single or batch */}
                {printTargetMode === 'single' ? (
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700">Hitamo Umunyeshuri:</label>
                    <select
                      value={previewStudentId}
                      onChange={(e) => setPreviewStudentId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.classGrade} - {s.gender})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700">Hitamo Icyiciro (Class):</label>
                    <select
                      value={batchClassFilter}
                      onChange={(e) => setBatchClassFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      <option value="ALL">Ikigo Cyose (All Students: {students.length})</option>
                      {availableClasses.map(cls => (
                        <option key={cls} value={cls}>
                          {cls} ({students.filter(s => s.classGrade.toUpperCase() === cls.toUpperCase()).length} abanyeshuri)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Printable Document Area */}
              <div ref={printableAreaRef} className="printable-report-container space-y-8">
                {printTargetMode === 'single' ? (
                  (() => {
                    const student = students.find(s => s.id === previewStudentId) || students[0];
                    if (!student) return null;
                    const assessment = assessments.find(a => a.studentId === student.id);
                    return (
                      <NurseryReportCardDocument
                        student={student}
                        schoolInfo={schoolInfo}
                        assessment={assessment}
                      />
                    );
                  })()
                ) : (
                  batchStudents.map((student) => {
                    const assessment = assessments.find(a => a.studentId === student.id);
                    return (
                      <NurseryReportCardDocument
                        key={student.id}
                        student={student}
                        schoolInfo={schoolInfo}
                        assessment={assessment}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: SCHOOL SETTINGS / PROFILE (STARTS BLANK)
          ========================================================================= */}
      {activeTab === 'school' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs max-w-3xl space-y-6">
          <div className="space-y-1 border-b border-slate-200 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <School className="w-5 h-5 text-teal-600" />
              <span>Amakuru y'Ikigo (School Profile & Header Settings)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Amakuru wanditse hano ni yo agaragara mu mutwe w'ikarita (Header ya Report Card). Bika amakuru ya nyayo y'ikigo cyawe.
            </p>
          </div>

          <form onSubmit={handleSaveSchoolInfo} className="space-y-4 text-xs">
            {/* School Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Izina ry'Ikigo (School Name):
              </label>
              <input
                type="text"
                value={schoolInfo.schoolName}
                onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolName: e.target.value })}
                placeholder="Urugero: GS GITUMBA"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium"
              />
            </div>

            {/* Location row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Akarere (District):</label>
                <input
                  type="text"
                  value={schoolInfo.district}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, district: e.target.value })}
                  placeholder="Urugero: Rulindo"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Umurenge (Sector):</label>
                <input
                  type="text"
                  value={schoolInfo.sector}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, sector: e.target.value })}
                  placeholder="Urugero: Buyoga"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Akagari (Cell):</label>
                <input
                  type="text"
                  value={schoolInfo.cell}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, cell: e.target.value })}
                  placeholder="Urugero: Gitumba"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Umudugudu (Village):</label>
                <input
                  type="text"
                  value={schoolInfo.village}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, village: e.target.value })}
                  placeholder="Urugero: Nyarubande"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                />
              </div>
            </div>

            {/* Academic Year & Head Teacher */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Umwaka w'Amashuri (Academic Year):</label>
                <input
                  type="text"
                  value={schoolInfo.academicYear}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, academicYear: e.target.value })}
                  placeholder="Urugero: 2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Umuyobozi w'Ikigo (Head Teacher):</label>
                <input
                  type="text"
                  value={schoolInfo.headTeacherName}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, headTeacherName: e.target.value })}
                  placeholder="Amazina y'umuyobozi"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telefoni (Tel):</label>
                <input
                  type="text"
                  value={schoolInfo.headTeacherPhone}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, headTeacherPhone: e.target.value })}
                  placeholder="Urugero: 0788000000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                />
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ifoto / Logo y'Ikigo (Direct Image URL - Optional):
              </label>
              <input
                type="url"
                value={schoolInfo.logoUrl || ''}
                onChange={(e) => setSchoolInfo({ ...schoolInfo, logoUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Ushobora gushyiramo direct HTTPS URL y'ikirango cy'ikigo cyangwa ukabisiga birimo ubusa.
              </p>
            </div>

            {schoolSaveStatus && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold">
                {schoolSaveStatus}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Bika Amakuru y'Ikigo muri Firestore</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT REAL STUDENT
          ========================================================================= */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>{editingStudent ? 'Hindura Umunyeshuri' : 'Ongeramo Umunyeshuri Mushya'}</span>
              </h3>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentSubmit} className="space-y-4 text-xs">
              {/* Full Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Amazina y'Umunyeshuri (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  value={studentFormData.fullName || ''}
                  onChange={(e) => setStudentFormData({ ...studentFormData, fullName: e.target.value })}
                  placeholder="Urugero: KEZA"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-900"
                />
              </div>

              {/* Class & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Icyiciro (Class) *
                  </label>
                  <select
                    value={studentFormData.classGrade || 'N1'}
                    onChange={(e) => setStudentFormData({ ...studentFormData, classGrade: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-bold text-slate-900"
                  >
                    <option value="N1">N1 (Nursery 1 / Baby Class)</option>
                    <option value="N2">N2 (Nursery 2 / Middle Class)</option>
                    <option value="N3">N3 (Nursery 3 / Top Class)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Igitsina (Gender) *
                  </label>
                  <select
                    value={studentFormData.gender || 'Boy'}
                    onChange={(e) => setStudentFormData({ ...studentFormData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-bold text-slate-900"
                  >
                    <option value="Boy">Boy (Gabo)</option>
                    <option value="Girl">Girl (Gore)</option>
                  </select>
                </div>
              </div>

              {/* Registration Number & Date of Birth */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Reg / Roll No (Optional):
                  </label>
                  <input
                    type="text"
                    value={studentFormData.registrationNumber || ''}
                    onChange={(e) => setStudentFormData({ ...studentFormData, registrationNumber: e.target.value })}
                    placeholder="e.g. N1-001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Itariki y'Amavuko (DOB):
                  </label>
                  <input
                    type="date"
                    value={studentFormData.dateOfBirth || ''}
                    onChange={(e) => setStudentFormData({ ...studentFormData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Parent Contact */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Telefoni y'Umubyeyi (Parent Contact - Optional):
                </label>
                <input
                  type="tel"
                  value={studentFormData.parentContact || ''}
                  onChange={(e) => setStudentFormData({ ...studentFormData, parentContact: e.target.value })}
                  placeholder="078..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Photo URL */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ifoto y'Umunyeshuri (Direct Image URL - Optional):
                </label>
                <input
                  type="url"
                  value={studentFormData.photoUrl || ''}
                  onChange={(e) => setStudentFormData({ ...studentFormData, photoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Niba nta foto ihari, kuri report card hazagaragara akazu kanditseho "No Photo" nk'uko biri kuri template.
                </p>
              </div>

              {studentFormError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold text-xs">
                  {studentFormError}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Reka
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm cursor-pointer"
                >
                  {editingStudent ? 'Bika Impinduka' : 'Ongeraho Umunyeshuri'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRM DELETE STUDENT
          ========================================================================= */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Gusiba Umunyeshuri
                </h3>
                <p className="text-xs text-slate-500">
                  Uribaza koko niba ushaka gusiba uyu munyeshuri?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <p className="font-bold text-slate-900">{studentToDelete.fullName}</p>
              <p className="text-slate-500">Icyiciro: {studentToDelete.classGrade} • Igitsina: {studentToDelete.gender}</p>
            </div>

            <p className="text-xs text-red-600 font-medium">
              Icyitonderwa: Amanota yose y'uyu munyeshuri na yo azasibwa burundu.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Reka (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer"
              >
                Yego, Siba
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

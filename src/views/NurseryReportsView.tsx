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
  Layers,
  ShieldCheck,
  Lock,
  LogIn,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  FileDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../context/AuthContext';
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
import { compressLogoFile } from '../services/websiteDesignService';
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
  const { user, isAdmin, signInWithGoogle, isLoading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Main Navigation Tab
  const [activeTab, setActiveTab] = useState<NurseryTab>('students');

  // School Information State (Starts Blank)
  const [schoolInfo, setSchoolInfo] = useState<NurserySchoolInfo>(() => getLocalNurserySchoolInfo(user?.uid));
  const [schoolSaveStatus, setSchoolSaveStatus] = useState<string | null>(null);

  // Students State (Starts strictly empty until real students are added)
  const [students, setStudents] = useState<NurseryStudent[]>(() => getLocalNurseryStudents(user?.uid));
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [adminTeacherFilter, setAdminTeacherFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Assessment Records State
  const [assessments, setAssessments] = useState<StudentTermAssessment[]>(() => getLocalNurseryAssessments(user?.uid));
  
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
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [printSuccessFeedback, setPrintSuccessFeedback] = useState<string | null>(null);

  // School Logo Upload State
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [logoStatusNote, setLogoStatusNote] = useState<string | null>(null);

  // Ref for printable area
  const printableAreaRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time updates from Firestore (Scoped per authenticated teacher or full for admin)
  useEffect(() => {
    if (!user && !isAdmin) {
      setSchoolInfo(EMPTY_NURSERY_SCHOOL_INFO);
      setStudents([]);
      setAssessments([]);
      return;
    }

    const unsubSchool = subscribeToNurserySchoolInfo((fresh) => {
      setSchoolInfo(fresh);
    }, user?.uid, isAdmin);

    const unsubStudents = subscribeToNurseryStudents((fresh) => {
      setStudents(fresh);
    }, user?.uid, isAdmin);

    const unsubAssessments = subscribeToNurseryAssessments((fresh) => {
      setAssessments(fresh);
    }, user?.uid, isAdmin);

    return () => {
      unsubSchool();
      unsubStudents();
      unsubAssessments();
    };
  }, [user?.uid, isAdmin]);

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

  // Distinct teachers when Admin is viewing
  const availableTeachers = useMemo(() => {
    if (!isAdmin) return [];
    const teacherMap = new Map<string, string>();
    students.forEach(s => {
      if (s.ownerUid) {
        teacherMap.set(s.ownerUid, s.ownerEmail || `Teacher (${s.ownerUid.slice(0, 6)})`);
      }
    });
    return Array.from(teacherMap.entries()).map(([uid, email]) => ({ uid, email }));
  }, [students, isAdmin]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (student.registrationNumber && student.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase().trim()));
      
      const matchesClass = 
        selectedClassFilter === 'ALL' || 
        student.classGrade.toUpperCase() === selectedClassFilter.toUpperCase();

      const matchesTeacher = 
        !isAdmin || 
        adminTeacherFilter === 'ALL' || 
        student.ownerUid === adminTeacherFilter;

      return matchesSearch && matchesClass && matchesTeacher;
    });
  }, [students, searchTerm, selectedClassFilter, adminTeacherFilter, isAdmin]);

  // Distinct classes present in student records
  const availableClasses = useMemo(() => {
    const defaultClasses = ['N1', 'N2', 'N3'];
    const dynamicClasses = new Set(defaultClasses);
    students.forEach(s => {
      if (s.classGrade) dynamicClasses.add(s.classGrade.toUpperCase());
    });
    return Array.from(dynamicClasses);
  }, [students]);

  // Google Sign-In Handler for Teachers & Admin
  const handleSignInGoogle = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const res = await signInWithGoogle();
      if (!res.success) {
        setAuthError(res.error || 'Gusinya na Google ntibyakunze. Nyamuneka ongera ugerageze.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Habaye ikosa mu kwinjira na Google.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Save School Information Handler
  const handleSaveSchoolInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setSchoolSaveStatus('Nyamuneka banza winjire na Konti ya Google.');
      return;
    }
    setSchoolSaveStatus('Saving to database...');
    const result = await saveNurserySchoolInfo(schoolInfo, user.uid, user.email);
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
    if (!user) {
      setStudentFormError('Nyamuneka banza winjire na Konti ya Google.');
      return;
    }
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
      ownerUid: editingStudent?.ownerUid || user.uid,
      ownerEmail: editingStudent?.ownerEmail || user.email || '',
      createdAt: editingStudent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await saveNurseryStudent(studentToSave, user.uid, user.email);
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
    if (!studentToDelete || !user) return;
    const result = await deleteNurseryStudent(studentToDelete.id, user.uid);
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
    if (!selectedStudentForMarks || !user) return;

    setMarksSaveStatus('Birimo kubikwa...');
    const existing = assessments.find(a => a.studentId === selectedStudentForMarks.id);

    const payload: StudentTermAssessment = {
      id: existing?.id || `asm_${selectedStudentForMarks.id}`,
      studentId: selectedStudentForMarks.id,
      academicYear: schoolInfo.academicYear || '2026',
      term1Scores: selectedTerm === 'term1' ? currentScores : (existing?.term1Scores || {}),
      term2Scores: selectedTerm === 'term2' ? currentScores : (existing?.term2Scores || {}),
      term3Scores: selectedTerm === 'term3' ? currentScores : (existing?.term3Scores || {}),
      ownerUid: existing?.ownerUid || selectedStudentForMarks.ownerUid || user.uid,
      ownerEmail: existing?.ownerEmail || selectedStudentForMarks.ownerEmail || user.email || '',
      updatedAt: new Date().toISOString()
    };

    const result = await saveStudentAssessment(payload, user.uid, user.email);
    if (result.success) {
      setMarksSaveStatus('Amanota yabitswe neza muri Firestore!');
      setTimeout(() => setMarksSaveStatus(null), 3000);
    } else {
      setMarksSaveStatus(`Habaye ikosa: ${result.error}`);
    }
  };

  // Handle School Logo Device Upload (JPG, PNG, WebP)
  const handleSchoolLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: JPG, PNG, WebP
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const validExts = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      setLogoStatusNote('Habaye ikosa: Hitamo ifoto yo mu bwoko bwa JPG, PNG cyangwa WebP gusa.');
      setTimeout(() => setLogoStatusNote(null), 5000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoStatusNote('Habaye ikosa: Ifoto irengeje ingano yemewe (5MB). Hitamo ifoto ntoya.');
      setTimeout(() => setLogoStatusNote(null), 5000);
      return;
    }

    setIsProcessingLogo(true);
    setLogoStatusNote('Ifoto irimo gutunganywa...');

    try {
      // Compress to high-fidelity base64 data URI (400x400 max)
      const dataUri = await compressLogoFile(file, 400);
      setSchoolInfo(prev => ({
        ...prev,
        logoUrl: dataUri
      }));
      setLogoStatusNote('Ikirango cy\'ikigo cyatoranijwe neza! Kanda buto ya "Bika Amakuru y\'Ikigo muri Firestore" hasi.');
      setTimeout(() => setLogoStatusNote(null), 6000);
    } catch (err: any) {
      console.error('Logo upload error:', err);
      setLogoStatusNote('Habaye ikosa ryo gutunganya ifoto: ' + (err?.message || 'Ntibyashobotse'));
      setTimeout(() => setLogoStatusNote(null), 5000);
    } finally {
      setIsProcessingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleRemoveSchoolLogo = () => {
    setSchoolInfo(prev => ({
      ...prev,
      logoUrl: ''
    }));
    setLogoStatusNote('Ikirango cyakuwemo. Kanda buto ya "Bika Amakuru y\'Ikigo muri Firestore" hasi kugira ngo bibikwe.');
    setTimeout(() => setLogoStatusNote(null), 5000);
  };

  // Standalone isolated iframe print engine (guaranteed zero blank pages & exact colors)
  const handleTriggerPrint = () => {
    const container = printableAreaRef.current;
    if (!container) {
      window.print();
      return;
    }

    const documentTitle = printTargetMode === 'single'
      ? `Indangamanota_${(students.find(s => s.id === previewStudentId)?.fullName || 'Umunyeshuri').replace(/\s+/g, '_')}_${schoolInfo.academicYear || '2026'}`
      : `Amakarita_Yose_Inshuke_${batchClassFilter}_${schoolInfo.academicYear || '2026'}`;

    try {
      // Remove any previously injected print frames
      const existingFrame = document.getElementById('nursery-reports-print-frame');
      if (existingFrame && existingFrame.parentNode) {
        existingFrame.parentNode.removeChild(existingFrame);
      }

      // Create hidden iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'nursery-reports-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-9999';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        return;
      }

      // Build standalone complete HTML document
      const standaloneHtml = `<!DOCTYPE html>
<html lang="rw">
<head>
  <meta charset="utf-8" />
  <title>${documentTitle}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 11px !important;
      line-height: 1.25 !important;
      width: 100% !important;
    }
    .nursery-report-page {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 0 10mm 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      page-break-after: always !important;
      break-after: page !important;
      box-sizing: border-box !important;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 10px !important;
    }
    th, td {
      border: 1px solid #0f172a !important;
      padding: 2px 4px !important;
      box-sizing: border-box !important;
    }
    th {
      background-color: #f1f5f9 !important;
    }
    thead {
      display: table-header-group !important;
    }
    tr {
      page-break-inside: avoid !important;
    }
  </style>
</head>
<body>
  ${container.innerHTML}
</body>
</html>`;

      frameDoc.open();
      frameDoc.write(standaloneHtml);
      frameDoc.close();

      // Wait for all images inside iframe to load before printing
      const images = Array.from(frameDoc.images);
      const imagePromises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });

      Promise.all(imagePromises).then(() => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setPrintSuccessFeedback('Urupapuro rw\'icapiro rwafunguwe neza!');
            setTimeout(() => setPrintSuccessFeedback(null), 4000);
          } catch (err) {
            console.error('Print iframe invocation error:', err);
            window.print();
          } finally {
            setTimeout(() => {
              if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            }, 5000);
          }
        }, 300);
      });

    } catch (err) {
      console.error('Print execution error:', err);
      window.print();
    }
  };

  // Direct high-fidelity PDF export using html2canvas & jsPDF
  const handleDownloadPdf = async () => {
    const container = printableAreaRef.current;
    if (!container) return;

    const pageElements = Array.from(container.querySelectorAll<HTMLElement>('.nursery-report-page'));
    if (pageElements.length === 0) {
      alert('Nta karita ibonetse yo gukuramo PDF.');
      return;
    }

    setIsExportingPdf(true);
    setPrintSuccessFeedback('PDF irimo gutegurwa no gukorwa neza...');

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];

        const canvas = await html2canvas(pageEl, {
          scale: 2, // High resolution for crisp print output
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgWidth = pdfWidth - 16; // 8mm margin each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        pdf.addImage(imgData, 'JPEG', 8, 8, imgWidth, Math.min(imgHeight, pdfHeight - 16));
      }

      const fileName = printTargetMode === 'single'
        ? `Indangamanota_${(students.find(s => s.id === previewStudentId)?.fullName || 'Umunyeshuri').replace(/\s+/g, '_')}_${schoolInfo.academicYear || '2026'}.pdf`
        : `Amakarita_Yose_Inshuke_${batchClassFilter}_${schoolInfo.academicYear || '2026'}.pdf`;

      pdf.save(fileName);
      setPrintSuccessFeedback('🎉 PDF yakozwe neza kandi yabitswe muri telefone/mudasobwa yawe!');
      setTimeout(() => setPrintSuccessFeedback(null), 5000);
    } catch (err: any) {
      console.error('PDF export error:', err);
      alert('Habaye ikosa ryo gukora PDF: ' + (err?.message || 'Ntibyashobotse'));
    } finally {
      setIsExportingPdf(false);
    }
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
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          header, nav, footer, .no-print, button, input, select, form {
            display: none !important;
          }
          body, html, main {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          .nursery-report-system {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .printable-report-container {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .nursery-report-page {
            display: block !important;
            visibility: visible !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 0 10mm 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
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
          {user && (
            <>
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
            </>
          )}
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

      {/* 1. AUTHENTICATION REQUIRED PROMPT FOR TEACHERS & ADMIN */}
      {!user ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center border border-amber-200 shadow-2xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Konti ya Mwarimu Irakenerwa (Teacher Account Required)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Injira na Konti ya Google kugira ngo utangire
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
              Kugira ngo amakuru y'abanyeshuri bawe arindwe mu buryo bwite (Private Workspace) kandi atavangwa n'ay'abandi barimu, banza winjire na Konti yawe ya Google.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3 text-xs text-slate-700 max-w-lg mx-auto">
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span><strong>Amakuru bwite:</strong> Buri mwarimu abona kandi agacunga gusa abanyeshuri n'indangamanota byo mu ishuri rye.</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span><strong>Kwinjira ako kanya:</strong> Nta kwemeza cyangwa gutegereza umuyobozi bisabwa. Konti zose zihita zihabwa inshingano za Mwarimu (Teacher).</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span><strong>Uburenganzira bw'Umuyobozi:</strong> twizerefelix90@gmail.com ni we wenyine ufite uburenganzira bwo kureba amakuru y'abarimu bose.</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span><strong>Ku buntu:</strong> Bikora 100% ku buntu kuri Firebase Spark Plan nta kiguzi icyo ari cyo cyose.</span>
            </div>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium text-left flex items-start space-x-2 max-w-lg mx-auto">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSignInGoogle}
              disabled={isSigningIn}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-md flex items-center justify-center space-x-3 cursor-pointer disabled:opacity-60 active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z" />
                <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z" />
              </svg>
              <span>{isSigningIn ? 'Birimo kwinjira...' : 'Injira na Konti ya Google (Sign in with Google)'}</span>
            </button>

            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            >
              Subira ku rupapuro rw'itangiriro
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* TEACHER ACCOUNT ISOLATION BANNER */}
          <div className="no-print bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                isAdmin ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-teal-100 text-teal-900 border-teal-300'
              }`}>
                {isAdmin ? <ShieldCheck className="w-5 h-5 text-amber-700" /> : <GraduationCap className="w-5 h-5 text-teal-700" />}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900">{user.displayName || user.email?.split('@')[0]}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                    isAdmin ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-teal-100 text-teal-800 border border-teal-200'
                  }`}>
                    {isAdmin ? 'Umuyobozi (Super Admin)' : 'Konti ya Mwarimu'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  {user.email} • {isAdmin ? 'Uburenganzira bw\'ubugenzuzi ku barimu bose' : 'Amakuru y\'abanyeshuri bawe arinzwe mu buryo bwite'}
                </p>
              </div>
            </div>

            {/* If Admin: Filter by Teacher */}
            {isAdmin && availableTeachers.length > 0 && (
              <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-bold text-slate-700">Mwarimu:</span>
                <select
                  value={adminTeacherFilter}
                  onChange={(e) => setAdminTeacherFilter(e.target.value)}
                  className="text-xs bg-transparent font-medium text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Abarimu bose ({students.length} abanyeshuri)</option>
                  {availableTeachers.map(t => (
                    <option key={t.uid} value={t.uid}>
                      {t.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                          {isAdmin && student.ownerEmail && (
                            <span className="block text-[10px] font-semibold text-teal-700 font-mono">
                              Mwarimu: {student.ownerEmail}
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

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerPrint}
                      disabled={isExportingPdf}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      <span>
                        {printTargetMode === 'single' ? 'Print Ikarita (A4)' : `Print Amakarita (${batchStudents.length})`}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isExportingPdf}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isExportingPdf ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                          <span>Gukora PDF...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-teal-300" />
                          <span>Gukuramo PDF (Download)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {printSuccessFeedback && (
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>{printSuccessFeedback}</span>
                  </div>
                )}

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

            {/* School Logo Device Upload (JPG, PNG, WebP) */}
            <div className="space-y-2.5 p-4 rounded-2xl border border-slate-200 bg-slate-50/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-teal-600" />
                    <span>Ikirango cy'Ikigo / Logo (Upload from Device):</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Shyiramo ifoto y'ikirango cy'ishuri ryawe ivuye muri telefone cyangwa mudasobwa (JPG, PNG, WebP).
                  </p>
                </div>

                {schoolInfo.logoUrl && (
                  <span className="self-start sm:self-auto inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Logo Irakora</span>
                  </span>
                )}
              </div>

              {/* Hidden file input strictly for image types */}
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleSchoolLogoFileChange}
                className="hidden"
              />

              {schoolInfo.logoUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="w-20 h-20 shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-1 overflow-hidden shadow-2xs">
                    <img
                      src={schoolInfo.logoUrl}
                      alt="School Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="space-y-1.5 flex-1 text-center sm:text-left">
                    <p className="text-xs font-bold text-slate-900">
                      Ikirango cy'ishuri cyateguwe (School Logo Ready)
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Iki kirango kizajya kigaragara mu mutwe w'ikarita (Header ya Report Card) no mu gihe uyicapa (Print & PDF). Cyihariye kuri konti yawe gusa.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        disabled={isProcessingLogo}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Hindura Logo</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveSchoolLogo}
                        disabled={isProcessingLogo}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Siba Logo</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => logoFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-teal-500 hover:bg-teal-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group bg-white"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Kanda hano kugira ngo ushyiremo Logo y'ikigo ivuye ku gikoresho cyawe
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ubwoko bwemewe: JPG, PNG, WebP (Iragabanywa mu bunini mu buryo bwikora)
                    </p>
                  </div>
                </div>
              )}

              {logoStatusNote && (
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-[11px] font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600" />
                  <span>{logoStatusNote}</span>
                </div>
              )}
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

        </>
      )}

    </div>
  );
};

/**
 * Types and constant criteria for the Nursery Student Report Card Management System
 * Replicating exactly the structure, headings, and criteria of Class_Reports_N1_Term_1.pdf
 */

export type PerformanceLevel = 'EXCELLENT' | 'VERY_GOOD' | 'DEVELOPING' | 'NEEDS_IMPROVEMENT' | string | null;

export interface PerformanceLegendItem {
  key: PerformanceLevel;
  label: string;
  kinyarwandaLabel: string;
  colorHex: string;
  badgeBg: string;
  badgeText: string;
}

export interface ConfigurablePerformanceLevel {
  id: string;
  label: string;
  kinyarwandaLabel?: string;
  colorHex: string;
  textColor?: string;
  order: number;
  isDefault?: boolean;
}

export const DEFAULT_PERFORMANCE_LEVELS: ConfigurablePerformanceLevel[] = [
  {
    id: 'EXCELLENT',
    label: 'Excellent',
    kinyarwandaLabel: 'Ikirenga',
    colorHex: '#48bb78',
    textColor: '#ffffff',
    order: 1,
    isDefault: true
  },
  {
    id: 'VERY_GOOD',
    label: 'Very Good',
    kinyarwandaLabel: 'Byiza cyane',
    colorHex: '#3182ce',
    textColor: '#ffffff',
    order: 2,
    isDefault: true
  },
  {
    id: 'DEVELOPING',
    label: 'Developing',
    kinyarwandaLabel: 'Biri mu nzira',
    colorHex: '#ecc94b',
    textColor: '#0f172a',
    order: 3,
    isDefault: true
  },
  {
    id: 'NEEDS_IMPROVEMENT',
    label: 'Need to Improve',
    kinyarwandaLabel: 'Bikeneye gukosorwa',
    colorHex: '#e53e3e',
    textColor: '#ffffff',
    order: 4,
    isDefault: true
  }
];

export const PERFORMANCE_LEGEND: Record<'EXCELLENT' | 'VERY_GOOD' | 'DEVELOPING' | 'NEEDS_IMPROVEMENT', PerformanceLegendItem> = {
  EXCELLENT: {
    key: 'EXCELLENT',
    label: 'Excellent',
    kinyarwandaLabel: 'Ikirenga',
    colorHex: '#48bb78',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white'
  },
  VERY_GOOD: {
    key: 'VERY_GOOD',
    label: 'Very Good',
    kinyarwandaLabel: 'Byiza cyane',
    colorHex: '#3182ce',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white'
  },
  DEVELOPING: {
    key: 'DEVELOPING',
    label: 'Developing',
    kinyarwandaLabel: 'Biri mu nzira',
    colorHex: '#ecc94b',
    badgeBg: 'bg-amber-400',
    badgeText: 'text-slate-900'
  },
  NEEDS_IMPROVEMENT: {
    key: 'NEEDS_IMPROVEMENT',
    label: 'Need to Improve',
    kinyarwandaLabel: 'Bikeneye gukosorwa',
    colorHex: '#e53e3e',
    badgeBg: 'bg-red-600',
    badgeText: 'text-white'
  }
};

export interface NurserySubjectItem {
  id: string;
  number: number;
  label: string;
  section: 'CORE' | 'UBUGENI' | 'IBONEZABUZIMA' | 'IMYITWARIRE' | string;
  sectionTitle?: string;
  colorHex?: string; // Optional custom color assigned to this subject/criterion
  isCustom?: boolean;
}

export interface ReportCardColorSettings {
  excellentColor: string;
  veryGoodColor: string;
  developingColor: string;
  needsImprovementColor: string;
  tableHeaderBg: string;
  tableHeaderTextColor: string;
  tableBorderColor: string;
  sectionHeaderBg: string;
  sectionHeaderTextColor: string;
}

export interface NurserySubjectsAndColorsSettings {
  subjects: NurserySubjectItem[];
  colors: ReportCardColorSettings;
  performanceLevels?: ConfigurablePerformanceLevel[];
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_REPORT_CARD_COLORS: ReportCardColorSettings = {
  excellentColor: '#48bb78',          // Vibrant green matching PDF
  veryGoodColor: '#3182ce',           // Clear blue matching PDF
  developingColor: '#ecc94b',         // Yellow matching PDF
  needsImprovementColor: '#e53e3e',   // Red matching PDF
  tableHeaderBg: '#f1f5f9',
  tableHeaderTextColor: '#0f172a',
  tableBorderColor: '#0f172a',
  sectionHeaderBg: '#f8fafc',
  sectionHeaderTextColor: '#0f172a'
};

export interface AssessmentCriterion {
  id: string;
  number: number;
  label: string;
  section: 'CORE' | 'UBUGENI' | 'IBONEZABUZIMA' | 'IMYITWARIRE';
  sectionTitle?: string;
  colorHex?: string;
  isCustom?: boolean;
}

/**
 * EXACT 22 ASSESSMENT CRITERIA from Class_Reports_N1_Term_1.pdf
 * Preserves exact wording, spelling, numbering, and category hierarchy.
 */
export const NURSERY_ASSESSMENT_CRITERIA: AssessmentCriterion[] = [
  // 1. Core Subjects
  {
    id: 'c1',
    number: 1,
    label: "UBUMENYI BW'IBIDUKIKIJE",
    section: 'CORE'
  },
  {
    id: 'c2',
    number: 2,
    label: 'IMIBARE',
    section: 'CORE'
  },
  {
    id: 'c3',
    number: 3,
    label: 'IKINYARWANDA',
    section: 'CORE'
  },
  {
    id: 'c4',
    number: 4,
    label: 'ICYONGEREZA',
    section: 'CORE'
  },

  // 2. UBUGENI N'UMUCO (Arts & Culture)
  {
    id: 'c5',
    number: 5,
    label: 'Gushushanya',
    section: 'UBUGENI',
    sectionTitle: "UBUGENI N'UMUCO"
  },
  {
    id: 'c6',
    number: 6,
    label: 'gusiga amabara',
    section: 'UBUGENI'
  },
  {
    id: 'c7',
    number: 7,
    label: 'Gutera irangi',
    section: 'UBUGENI'
  },
  {
    id: 'c8',
    number: 8,
    label: 'Gukata/Komeka',
    section: 'UBUGENI'
  },
  {
    id: 'c9',
    number: 9,
    label: 'Kubumba/Kubaka',
    section: 'UBUGENI'
  },
  {
    id: 'c10',
    number: 10,
    label: 'kuzinga/kuboha',
    section: 'UBUGENI'
  },
  {
    id: 'c11',
    number: 11,
    label: 'Kuririmba no kubyina',
    section: 'UBUGENI'
  },

  // 3. IBONEZABUZIMA (Physical & Health Development)
  {
    id: 'c12',
    number: 12,
    label: "Imiyego y'ingingo nini n'intoya",
    section: 'IBONEZABUZIMA',
    sectionTitle: 'IBONEZABUZIMA'
  },
  {
    id: 'c13',
    number: 13,
    label: "Isuku y'umubiri",
    section: 'IBONEZABUZIMA'
  },
  {
    id: 'c14',
    number: 14,
    label: 'Kwiyitaho no kwita ku bintu bye',
    section: 'IBONEZABUZIMA'
  },
  {
    id: 'c15',
    number: 15,
    label: 'Gukaraba intoki mbere yo gufungura',
    section: 'IBONEZABUZIMA'
  },

  // 4. IMYITWARIRE N'ITERAMBERE MU MBAMUTIMA (Socio-Emotional Behavior)
  {
    id: 'c16',
    number: 16,
    label: "Imibanire ye n'abandi",
    section: 'IMYITWARIRE',
    sectionTitle: "IMYITWARIRE N'ITERAMBERE MU MBAMUTIMA"
  },
  {
    id: 'c17',
    number: 17,
    label: 'Gukora icyo asabwe (kumvira)',
    section: 'IMYITWARIRE'
  },
  {
    id: 'c18',
    number: 18,
    label: "Ubwitange n'amatsiko",
    section: 'IMYITWARIRE'
  },
  {
    id: 'c19',
    number: 19,
    label: 'kwigirira ikizere',
    section: 'IMYITWARIRE'
  },
  {
    id: 'c20',
    number: 20,
    label: 'Kugaragaza no gucunga imbamutima',
    section: 'IMYITWARIRE'
  },
  {
    id: 'c21',
    number: 21,
    label: "Guhugira k'umurimo no kudacika intege",
    section: 'IMYITWARIRE'
  },
  {
    id: 'c22',
    number: 22,
    label: 'Gusukura aho yakoreye no gushyira ibintu mu mwanya wabyo',
    section: 'IMYITWARIRE'
  }
];

export type NurseryGender = 'Boy' | 'Girl' | 'Gabo' | 'Gore';

export interface NurseryStudent {
  id: string;
  fullName: string;
  classGrade: string; // e.g. "N1", "N2", "N3", "Baby Class", "Middle Class", "Top Class"
  gender: NurseryGender;
  registrationNumber?: string;
  dateOfBirth?: string;
  photoUrl?: string;
  parentContact?: string;
  academicYear?: string;
  ownerUid: string;
  ownerEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export type AssessmentTerm = 'term1' | 'term2' | 'term3';

/**
 * Criterion score mapping for a student: criterionId -> PerformanceLevel
 */
export type CriterionScores = Record<string, PerformanceLevel>;

export interface StudentTermAssessment {
  id: string;
  studentId: string;
  academicYear: string;
  term1Scores: CriterionScores;
  term2Scores: CriterionScores;
  term3Scores: CriterionScores;
  teacherCommentTerm1?: string;
  teacherCommentTerm2?: string;
  teacherCommentTerm3?: string;
  headTeacherRemark?: string;
  ownerUid: string;
  ownerEmail?: string;
  updatedAt: string;
}

export interface NurserySchoolInfo {
  schoolName: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  academicYear: string;
  headTeacherName: string;
  headTeacherPhone: string;
  logoUrl?: string;
  stampText?: string;
  ownerUid?: string;
  ownerEmail?: string;
  updatedAt?: string;
}

export const EMPTY_NURSERY_SCHOOL_INFO: NurserySchoolInfo = {
  schoolName: '',
  district: '',
  sector: '',
  cell: '',
  village: '',
  academicYear: '',
  headTeacherName: '',
  headTeacherPhone: '',
  logoUrl: '',
  stampText: ''
};

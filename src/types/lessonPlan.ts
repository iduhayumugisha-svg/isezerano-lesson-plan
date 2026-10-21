export type EducationLevel = 'Primary' | 'Secondary';

export interface SchoolInfo {
  schoolName: string;
  schoolLogoUrl: string;
  province: string;
  district: string;
  academicYear: string;
  term: string;
}

export interface TeacherInfo {
  fullName: string;
  qualification: string;
  email: string;
  phone: string;
  tscNumber?: string;
}

export interface StudentsIdentification {
  country: string;
  educationLevel: EducationLevel | '';
  classGrade: string;
  subject: string;
  term: string;
  date: string;
  totalStudents: string;
  numberOfBoys: string;
  numberOfGirls: string;
}

export interface LessonStage {
  id: string;
  stageName: string; // e.g. "Intangiriro / Introduction", "Isomo nyirizina", "Umusuzo w'isomo"
  duration: string;  // e.g. "5 min", "30 min"
  teacherActivities: string; // "Ibikorwa by'umwarimu"
  learnerActivities: string; // "Ibikorwa by'umunyeshuri"
  competencesAndCrossCutting?: string; // "Ubushobozi Rusange n'Insanganyamatsiko Zambukiranya Amasomo + Ibisobanuro Bigufi"
  materials?: string;
  assessment?: string;
}

export type UserRole = 'admin' | 'teacher';
export type UserStatus = 'active' | 'inactive';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  schoolName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  schoolDefaultName: string;
  academicYear: string;
  curriculumVersion: string;
  enabledModules: {
    studentIdentification: boolean;
    aiAssistance: boolean;
    cloudSync: boolean;
    printExport: boolean;
  };
  availableClasses: string[];
  availableSubjects: string[];
  updatedAt: string;
  updatedBy: string;
}

export interface LessonPlan {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  ownerUid?: string;
  ownerEmail?: string;

  // Header Details (Imbata y'isomo)
  schoolName: string;
  schoolLogoUrl: string;
  province: string;
  district: string;
  academicYear: string;
  term: string; // Igihembwe
  date: string; // Itariki
  subject: string; // Isomo
  classGrade: string; // Umwaka
  unitNo: string; // Umutwe No
  lessonNo: string; // Isomo No
  duration: string; // Igihe (e.g. 40 min)
  numberOfLearners: string; // Umubare w'abanyeshuri (Total Students)
  country?: string; // Country (e.g. Rwanda)
  numberOfBoys?: string; // Number of boys
  numberOfGirls?: string; // Number of girls

  // Teacher Information
  teacherName: string;
  teacherQualification: string;
  educationLevel: EducationLevel | '';

  // Objectives & Context (Table 2 in official format)
  specialNeedsLearners: string; // Ubwoko bw'abanyeshuri bafite ibyifuzo byihariye muri iri somo n'umubare wabo muri buri cyiciro
  unitTopic: string; // Umutwe w'isomo / Inyigisho
  keyUnitCompetence: string; // Ubushobozi bw'ingenzi bugamijwe ku mutwe
  lessonTitle: string; // Umutwe w'isomo
  unitTitle?: string; // Additional unit title reference
  learningObjectives: string; // Intego z'isomo
  lessonLocation: string; // Iteganyamwanya ry'aho isomo ribera (Aho ribera)
  teachingMaterials: string; // Ibikoresho by'isomo
  references: string; // Ibitabo byifashishijwe (Inkamoko)

  // Backward compatibility fields
  knowledgeAndSkills?: string;
  attitudesAndValues?: string;
  genericCompetences?: string;
  crossCuttingIssues?: string;
  prerequisiteKnowledge?: string;
  lessonIntroduction?: string;

  // Main Stages Table (Table 3 in official format: Igihe kuri buri cyiciro | Ibikorwa by'umwarimu | Ibikorwa by'umunyeshuri | Ubushobozi Rusange n'Insanganyamatsiko)
  stages: LessonStage[];

  // Evaluation & Reflection (Bottom row: Isuzuma mwarimu yikora)
  teacherSelfEvaluation: string; // Isuzuma mwarimu yikora
  lessonConclusion?: string;
  assessmentSummary?: string;
  teacherReflection?: string;
  challengesEncountered?: string;
  remedialActivities?: string;
  extensionActivities?: string;
  nextLessonPreparation?: string;

  status?: 'draft' | 'completed';
}

export interface FirebaseConnectionConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
  enabled: boolean;
}

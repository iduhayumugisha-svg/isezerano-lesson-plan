export type Language = 'en' | 'rw' | 'fr';

export interface Translations {
  // Navigation & Branding
  appTitle: string;
  appSubtitle: string;
  curriculumSubtitle: string;
  languageLabel: string;
  navDashboard: string;
  navStudents: string;
  navCreate: string;
  navSaved: string;
  navSettings: string;
  newPlanButton: string;
  footerStandard: string;

  // Three-dot Menu & Centralized Dashboard
  navAllTools: string;
  navHomeGenerator: string;
  threeDotMenuTooltip: string;
  menuLabel: string;
  modulesTitle: string;
  modulesSubtext: string;
  backToGenerator: string;
  openModuleBtn: string;
  moduleGeneratorTitle: string;
  moduleGeneratorDesc: string;
  moduleSavedTitle: string;
  moduleSavedDesc: string;
  moduleStudentsTitle: string;
  moduleStudentsDesc: string;
  moduleSettingsTitle: string;
  moduleSettingsDesc: string;

  // Common Buttons & Actions
  save: string;
  saving: string;
  cancel: string;
  delete: string;
  edit: string;
  duplicate: string;
  printPreviewPdf: string;
  resetNewPlan: string;
  saveSuccess: string;
  saveError: string;
  confirmDeleteTitle: string;
  confirmDeleteMessage: string;
  confirmDeleteBtn: string;
  clearFilters: string;
  browsePlans: string;
  createFirstPlan: string;
  orderDel: string;
  moveUp: string;
  moveDown: string;
  deleteStage: string;
  copied: string;
  copyRules: string;

  // Dashboard
  welcomeHeading: string;
  welcomeSubtext: string;
  totalPlans: string;
  primaryLevel: string;
  secondaryLevel: string;
  totalLearnersActive: string;
  recentPlans: string;
  viewAll: string;
  noPlansYet: string;
  noPlansSubtext: string;
  cbcStructureTitle: string;
  cbcStep1: string;
  cbcStep1Desc: string;
  cbcStep2: string;
  cbcStep2Desc: string;
  cbcStep3: string;
  cbcStep3Desc: string;
  cbcStep4: string;
  cbcStep4Desc: string;

  // Students Identification Section
  studentsIdTitle: string;
  studentsIdSubtext: string;
  termCol: string;
  dateCol: string;
  subjectCol: string;
  classCol: string;
  unitNoCol: string;
  lessonNoCol: string;
  durationCol: string;
  learnersCol: string;
  termPlaceholder: string;
  subjectPlaceholder: string;
  classPlaceholder: string;
  unitNoPlaceholder: string;
  lessonNoPlaceholder: string;
  durationPlaceholder: string;
  learnersPlaceholder: string;
  educationLevelLabel: string;
  primaryRadio: string;
  secondaryRadio: string;
  schoolNameLabel: string;
  schoolNamePlaceholder: string;
  countryLabel: string;
  countryPlaceholder: string;
  numberOfBoysLabel: string;
  numberOfBoysPlaceholder: string;
  numberOfGirlsLabel: string;
  numberOfGirlsPlaceholder: string;
  totalStudentsLabel: string;
  totalStudentsPlaceholder: string;
  validationPassed: string;
  validationMismatch: string;
  autoCalculateTotal: string;
  saveIdentificationBtn: string;
  createPlanWithIdBtn: string;
  identificationSavedSuccess: string;
  identificationProfileTitle: string;
  identificationProfileSubtext: string;
  classOrGradeLabel: string;
  subjectLabel: string;
  termLabel: string;
  dateLabel: string;

  // Section 2: Objectives & Context (Table 2)
  section2Title: string;
  specialNeedsLabel: string;
  specialNeedsPlaceholder: string;
  unitTopicLabel: string;
  unitTopicPlaceholder: string;
  keyCompetenceLabel: string;
  keyCompetencePlaceholder: string;
  lessonTitleLabel: string;
  lessonTitlePlaceholder: string;
  learningObjectivesLabel: string;
  learningObjectivesPlaceholder: string;
  locationLabel: string;
  locationPlaceholder: string;
  materialsLabel: string;
  materialsPlaceholder: string;
  referencesLabel: string;
  referencesPlaceholder: string;

  // Section 3: Main Steps Table (Table 3)
  mainTableTitle: string;
  mainTableSubtext: string;
  addStageBtn: string;
  quickAddLabel: string;
  addIntroStage: string;
  addDevStage: string;
  addConclusionStage: string;
  zeroStagesTitle: string;
  zeroStagesSubtext: string;
  addFirstStageBtn: string;
  stageAndTimeHeader: string;
  activitiesGroupHeader: string;
  teacherActivitiesHeader: string;
  learnerActivitiesHeader: string;
  competencesCrossCuttingHeader: string;
  stepNumberPrefix: string;
  stageNamePlaceholder: string;
  durationInputPlaceholder: string;
  teacherActPlaceholder: string;
  learnerActPlaceholder: string;
  competencesPlaceholder: string;
  stagesCountSummary: string;
  addAnotherStageBtn: string;
  editorTitleDefault: string;
  editorSubtext: string;
  storageTitle: string;
  storageDescription: string;

  // Bottom Section: Evaluation
  selfEvaluationLabel: string;
  selfEvaluationPlaceholder: string;

  // Saved Lesson Plans
  savedPlansTitle: string;
  savedPlansSubtext: string;
  searchPlaceholder: string;
  allLevels: string;
  allSubjects: string;
  showingPlansCount: string;
  noPlansMatchTitle: string;
  noPlansMatchSubtextEmpty: string;
  noPlansMatchSubtextQuery: string;
  durationAndDate: string;
  classAndLearners: string;
  tableStagesCount: string;

  // Settings
  settingsTitle: string;
  settingsSubtext: string;
  databaseStorageBox: string;
  managePlansLink: string;
  backupSectionTitle: string;
  backupSectionSubtext: string;
  exportJsonBtn: string;
  importJsonBtn: string;
  resetDatabaseBtn: string;
  cloudGuideTitle: string;
  cloudGuideSubtext: string;
  stepGuideTitle: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  step5: string;
  rulesLabel: string;
  connectWebConfigTitle: string;
  enableFirestoreSync: string;
  saveCloudSettingsBtn: string;

  // Print Preview Modal
  printModalTitle: string;
  printModalSubtext: string;
  printSavePdfBtn: string;
  closePreview: string;
  noStagesPrint: string;
  removeStageBtn: string;
  confirmRemoveStage: string;
  undoRemove: string;
  printOrientationLabel: string;
  portraitOption: string;
  landscapeOption: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appTitle: 'Lesson Plan Generator',
    appSubtitle: 'Rwanda CBC',
    curriculumSubtitle: 'Rwanda Competence-Based Curriculum (CBC)',
    languageLabel: 'Language / Ururimi / Langue',
    navDashboard: 'Dashboard',
    navStudents: 'Students Identification',
    navCreate: 'Create Lesson Plan',
    navSaved: 'Saved Lesson Plans',
    navSettings: 'Settings',
    newPlanButton: 'New Plan',
    footerStandard: 'Ministry of Education (MINEDUC) / Rwanda Basic Education Board (REB) Standards',

    navAllTools: 'Dashboard / All Tools',
    navHomeGenerator: 'Lesson Plan Generator (Home)',
    threeDotMenuTooltip: 'Education Tools & Modules (⋮)',
    menuLabel: 'Menu',
    modulesTitle: 'Education Tools & Modules',
    modulesSubtext: 'Centralized hub for all education features, saved lesson plans, learner tracking, and system settings.',
    backToGenerator: '← Back to Lesson Plan Generator',
    openModuleBtn: 'Open Module',
    moduleGeneratorTitle: 'Lesson Plan Generator',
    moduleGeneratorDesc: 'Create official MINEDUC/REB compliant Rwanda CBC lesson plans with 8-column header, competencies, steps, and evaluation.',
    moduleSavedTitle: 'Saved Lesson Plans & Export',
    moduleSavedDesc: 'Search, preview, duplicate, edit, and print or export all your prepared lesson plans as official PDF tables.',
    moduleStudentsTitle: 'Student Identification',
    moduleStudentsDesc: 'Manage learner demographic profiles, class grades, subjects, terms, and track boy/girl enrollment.',
    moduleSettingsTitle: 'Settings & Cloud Sync',
    moduleSettingsDesc: 'Configure Cloud Firestore database synchronization, offline JSON exports/backups, and security rules.',

    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    duplicate: 'Duplicate',
    printPreviewPdf: 'Print / Save PDF',
    resetNewPlan: 'Reset / New Blank Plan',
    saveSuccess: 'Lesson plan saved successfully!',
    saveError: 'Failed to save lesson plan. Please check your data.',
    confirmDeleteTitle: 'Delete Lesson Plan?',
    confirmDeleteMessage: 'Are you sure you want to permanently delete this lesson plan? This action cannot be undone.',
    confirmDeleteBtn: 'Yes, Delete Permanently',
    clearFilters: 'Clear filters',
    browsePlans: 'Browse Saved Plans',
    createFirstPlan: 'Create First Lesson Plan',
    orderDel: 'Order / Del',
    moveUp: 'Move Up',
    moveDown: 'Move Down',
    deleteStage: 'Delete Stage',
    copied: 'Copied!',
    copyRules: 'Copy Rules',

    welcomeHeading: 'Rwanda CBC Lesson Planning',
    welcomeSubtext: 'Prepare, customize, and print high-standard CBC lesson plans for Primary and Secondary schools in Rwanda.',
    totalPlans: 'Total Lesson Plans',
    primaryLevel: 'Primary Level (P1–P6)',
    secondaryLevel: 'Secondary Level (S1–S6)',
    totalLearnersActive: 'Learners Active in Lessons',
    recentPlans: 'Recent Lesson Plans',
    viewAll: 'View all',
    noPlansYet: 'No Lesson Plans Created Yet',
    noPlansSubtext: 'Your database starts completely clean. Click below to begin preparing your first Competence-Based Curriculum (CBC) lesson plan.',
    cbcStructureTitle: 'Rwanda CBC Lesson Plan Structure',
    cbcStep1: '1. Students Identification:',
    cbcStep1Desc: 'Class/Grade (P1-P6 or S1-S6), Subject, Unit, Lesson No, Term, Duration & Number of Learners.',
    cbcStep2: '2. Competence Alignment:',
    cbcStep2Desc: 'Key Unit Competence, Knowledge/Skills, Attitudes/Values, Generic Competences & Cross-Cutting Issues.',
    cbcStep3: '3. Main CBC Teaching Stages:',
    cbcStep3Desc: 'Step-by-step table detailing Teacher Activities, Learner Activities, Materials and Formative Assessment.',
    cbcStep4: '4. Evaluation & Reflection:',
    cbcStep4Desc: 'Teacher self-assessment, reflection, and notes for next lesson.',

    studentsIdTitle: 'Students & Lesson Identification',
    studentsIdSubtext: 'Define the class, grade level, number of learners, and lesson metadata for this CBC plan.',
    termCol: 'Term',
    dateCol: 'Date',
    subjectCol: 'Subject',
    classCol: 'Class',
    unitNoCol: 'Unit No',
    lessonNoCol: 'Lesson No',
    durationCol: 'Duration',
    learnersCol: 'Number of Learners',
    termPlaceholder: 'Select...',
    subjectPlaceholder: 'e.g. Kinyarwanda, Mathematics, SET...',
    classPlaceholder: 'e.g. P4A, S2B...',
    unitNoPlaceholder: 'e.g. 1',
    lessonNoPlaceholder: 'e.g. 1 of 1',
    durationPlaceholder: 'e.g. 40 min',
    learnersPlaceholder: 'e.g. 43',
    educationLevelLabel: 'Education Level',
    primaryRadio: 'Primary (P1–P6)',
    secondaryRadio: 'Secondary (S1–S6)',
    schoolNameLabel: 'School Name',
    schoolNamePlaceholder: 'Enter school name (e.g., GS GITUMBA)',
    countryLabel: 'Country',
    countryPlaceholder: 'e.g. Rwanda',
    numberOfBoysLabel: 'Number of Boys',
    numberOfBoysPlaceholder: 'e.g. 18',
    numberOfGirlsLabel: 'Number of Girls',
    numberOfGirlsPlaceholder: 'e.g. 22',
    totalStudentsLabel: 'Total Students',
    totalStudentsPlaceholder: 'e.g. 40',
    validationPassed: 'Validation Passed: Boys ({boys}) + Girls ({girls}) = Total ({total})',
    validationMismatch: 'Validation Mismatch: Boys ({boys}) + Girls ({girls}) = {sum}, but Total is {total}. Please adjust.',
    autoCalculateTotal: 'Auto-set Total (Boys + Girls)',
    saveIdentificationBtn: 'Save Identification Details',
    createPlanWithIdBtn: 'Create Lesson Plan with this Identification',
    identificationSavedSuccess: 'Students identification saved successfully!',
    identificationProfileTitle: 'Class & Student Identification Form',
    identificationProfileSubtext: 'Enter demographic and class details. Validates that Boys + Girls equals Total Students.',
    classOrGradeLabel: 'Class / Grade',
    subjectLabel: 'Subject',
    termLabel: 'Term',
    dateLabel: 'Date',

    section2Title: 'Lesson Context & Objectives',
    specialNeedsLabel: 'Type of special educational needs in this lesson and number of learners in each category',
    specialNeedsPlaceholder: 'e.g., Learners with learning difficulties: 3 (Teacher individual support)...',
    unitTopicLabel: 'Unit Title / Topic',
    unitTopicPlaceholder: 'e.g., Development / Fractions and Decimals / Cell Biology...',
    keyCompetenceLabel: 'Key Unit Competence',
    keyCompetencePlaceholder: 'Enter the broad unit competence from the syllabus...',
    lessonTitleLabel: 'Lesson Title',
    lessonTitlePlaceholder: 'e.g., Reading comprehension: Heritage of three brothers...',
    learningObjectivesLabel: 'Instructional Objectives',
    learningObjectivesPlaceholder: 'By the end of the lesson, learners will be able to...',
    locationLabel: 'Location / Classroom context where lesson takes place',
    locationPlaceholder: 'e.g., Classroom, Field, Science Laboratory...',
    materialsLabel: 'Teaching & Learning Materials',
    materialsPlaceholder: "e.g., Student's Book, chalkboard, illustrations, flashcards, realia...",
    referencesLabel: 'References / Sources',
    referencesPlaceholder: "e.g., Curriculum syllabus, REB, Teacher's guide and student's book...",

    mainTableTitle: "Main Lesson Plan Stages Table (Imbata y'Ibikorwa by'Isomo)",
    mainTableSubtext: 'Exact REB/MINEDUC format: Stage & Time | Teacher Activities | Learner Activities | Generic Competences & Cross-Cutting Issues',
    addStageBtn: '+ Add Stage',
    quickAddLabel: 'Add standard stage:',
    addIntroStage: '+ Introduction (5 min)',
    addDevStage: '+ Development (30 min)',
    addConclusionStage: '+ Conclusion (5 min)',
    zeroStagesTitle: '0 Stages in Table (Starts Empty)',
    zeroStagesSubtext: 'Add the lesson stages (e.g., Introduction, Development, Conclusion) using the buttons above.',
    addFirstStageBtn: 'Add First Stage',
    stageAndTimeHeader: 'Stage & Time',
    activitiesGroupHeader: 'Description of Teaching and Learning Activities',
    teacherActivitiesHeader: "Teacher's Activities",
    learnerActivitiesHeader: "Learner's Activities",
    competencesCrossCuttingHeader: 'Generic Competences and Cross-Cutting Issues + Short Explanations',
    stepNumberPrefix: 'Stage',
    stageNamePlaceholder: 'Stage Name (e.g. Introduction)',
    durationInputPlaceholder: 'Duration (e.g. 5 min)',
    teacherActPlaceholder: 'Teacher guides learners to...',
    learnerActPlaceholder: 'Learners listen, discuss, write, calculate...',
    competencesPlaceholder: 'a) Generic Competences:\n• Communication\n• Teamwork\nb) Cross-Cutting Issues:\n• Gender Education\n• Inclusive Education...',
    stagesCountSummary: '{count} stage(s) in table',
    addAnotherStageBtn: '+ Add Another Stage',
    editorTitleDefault: 'New Lesson Plan',
    editorSubtext: 'Rwanda CBC Format • {stages} Stage(s) Configured',
    storageTitle: 'Database & Storage Status',
    storageDescription: 'Lesson plans and student identification details are stored persistently in your browser database or synced to Firebase Firestore.',

    selfEvaluationLabel: "Teacher's Self-Assessment / Evaluation (Isuzuma mwarimu yikora)",
    selfEvaluationPlaceholder: 'e.g., Most learners achieved the lesson objectives by successfully reading and answering questions. Learners with difficulties will receive remediation...',

    savedPlansTitle: 'Saved Lesson Plans',
    savedPlansSubtext: 'Manage, search, edit, duplicate, and print all previously prepared CBC lesson plans.',
    searchPlaceholder: 'Search by lesson title, subject, class, term, learners...',
    allLevels: 'All Levels (Primary & Secondary)',
    allSubjects: 'All Subjects',
    showingPlansCount: 'Showing {filtered} of {total} plans',
    noPlansMatchTitle: 'No Lesson Plans Found',
    noPlansMatchSubtextEmpty: 'Your database is currently empty. Start by creating a lesson plan for your Primary or Secondary classes.',
    noPlansMatchSubtextQuery: 'No lesson plans matched your search or filter criteria. Try adjusting your search term.',
    durationAndDate: 'Duration & Date',
    classAndLearners: 'Class & Learners',
    tableStagesCount: 'Table Stages',

    settingsTitle: 'Application Settings & Cloud Setup',
    settingsSubtext: 'Manage your database backups, data restore, and online Firebase cloud configuration.',
    databaseStorageBox: 'Database Storage',
    managePlansLink: 'Manage Saved Plans →',
    backupSectionTitle: 'Database Backup & Migration',
    backupSectionSubtext: 'Download an offline JSON copy of your complete CBC lesson plan collection, or import an existing backup file to restore your plans on any device.',
    exportJsonBtn: 'Export All Lesson Plans (JSON)',
    importJsonBtn: 'Import Backup File',
    resetDatabaseBtn: 'Reset Database',
    cloudGuideTitle: 'Firebase Cloud Firestore & Hosting Setup Instructions',
    cloudGuideSubtext: 'Complete instructions for connecting your Rwanda CBC Lesson Plan app to your own Firebase project for cloud synchronization and online hosting.',
    stepGuideTitle: 'Step-by-Step Configuration Guide (Owner Steps)',
    step1: 'Create or Open a Firebase Project in Firebase Console.',
    step2: 'Enable Cloud Firestore in Production Mode with your preferred region.',
    step3: 'Enable Firebase Authentication (Google or Email/Password).',
    step4: 'Deploy hardened Firestore Security Rules from below.',
    step5: 'Deploy to Firebase Hosting using firebase-tools CLI.',
    rulesLabel: 'Recommended Firestore Security Rules',
    connectWebConfigTitle: 'Optional: Connect Live Firebase Web Config',
    enableFirestoreSync: 'Enable Cloud Firestore Sync',
    saveCloudSettingsBtn: 'Save Cloud Settings',

    printModalTitle: "IMBATA Y'ISOMO / Rwanda CBC Lesson Plan",
    printModalSubtext: 'Official Ministry of Education / REB Exact Table Format',
    printSavePdfBtn: 'Print / Save PDF',
    closePreview: 'Close Preview',
    noStagesPrint: 'No lesson stages added yet.',
    removeStageBtn: 'Remove Stage',
    confirmRemoveStage: 'Are you sure you want to remove this stage?',
    undoRemove: 'Undo',
    printOrientationLabel: 'Page Orientation',
    portraitOption: 'Portrait (Standard A4)',
    landscapeOption: 'Landscape (Wide Table)'
  },

  rw: {
    appTitle: "Imbata y'Isomo Generator",
    appSubtitle: 'Rwanda CBC',
    curriculumSubtitle: "Integanyanyigisho y'u Rwanda Ishingiye ku Bushobozi (CBC)",
    languageLabel: 'Ururimi / Language / Langue',
    navDashboard: 'Ahabanza',
    navStudents: "Imyirondoro y'Abanyeshuri",
    navCreate: "Tegura Imbata y'Isomo",
    navSaved: 'Amasomo Yabitswe',
    navSettings: 'Ibihindurwa',
    newPlanButton: 'Isomo Rishya',
    footerStandard: "Ibipimo Ngenderwaho bya Minisiteri y'Uburezi (MINEDUC) / REB",

    navAllTools: 'Ahabanza / Ibikoresho Byose',
    navHomeGenerator: "Tegura Imbata y'Isomo (Ahabanza)",
    threeDotMenuTooltip: "Ibyiciro n'Ibikoresho by'Uburezi (⋮)",
    menuLabel: 'Ibikubiyemo',
    modulesTitle: "Ibyiciro n'Ibikoresho by'Uburezi",
    modulesSubtext: "Ihuriro rikuru ry'ibikoresho by'inyigishirize, amasomo yabitswe, imyirondoro y'abanyeshuri n'ububiko bwa cloud.",
    backToGenerator: "← Subira ku Gutegura Imbata y'Isomo",
    openModuleBtn: 'Fungura Igice',
    moduleGeneratorTitle: "Tegura Imbata y'Isomo",
    moduleGeneratorDesc: "Tegura imbata z'amasomo zubahiriza amabwiriza ya REB/MINEDUC mu buryo bwa CBC bugezweho.",
    moduleSavedTitle: 'Amasomo Yabitswe no Gusohora',
    moduleSavedDesc: 'Genzura, shakisha, hindura, koporora kandi ucape amasomo yose wateguye mu buryo bwa PDF.',
    moduleStudentsTitle: "Imyirondoro y'Abanyeshuri",
    moduleStudentsDesc: "Genzura umwaka w'amashuri, isomo, igihembwe, n'umubare w'abahungu n'abakobwa biga.",
    moduleSettingsTitle: 'Ibihindurwa & Firebase Cloud',
    moduleSettingsDesc: 'Genzura uburyo bwo kubika amakuru kuri Firebase Cloud, gusohora no kwinjiza kopi za JSON.',

    save: 'Bika',
    saving: 'Birabikwa...',
    cancel: 'Reka',
    delete: 'Siba',
    edit: 'Hindura',
    duplicate: 'Koporora',
    printPreviewPdf: 'Gucapa / Bika nka PDF',
    resetNewPlan: 'Tangira Isomo Rishya',
    saveSuccess: "Imbata y'isomo yabitswe neza!",
    saveError: "Ntibyakunze kubika imbata y'isomo. Suzuma amakuru.",
    confirmDeleteTitle: "Gusiba Imbata y'Isomo?",
    confirmDeleteMessage: 'Urifuza koko gusiba burundu iri somo? Iki gikorwa ntigishobora kugarurwa.',
    confirmDeleteBtn: 'Yego, Siba Burundu',
    clearFilters: 'Ihanagure ibyayunguruwe',
    browsePlans: 'Reba Amasomo Yabitswe',
    createFirstPlan: 'Tegura Isomo Rya Mbere',
    orderDel: 'Urutonde / Siba',
    moveUp: 'Zamura',
    moveDown: 'Manura',
    deleteStage: 'Siba Icyiciro',
    copied: 'Byakoporowe!',
    copyRules: 'Koporora Amategeko',

    welcomeHeading: 'Iteganyanyigisho rya CBC mu Rwanda',
    welcomeSubtext: "Tegura, vugurura kandi ucape imbata z'amasomo zujuje ibipimo by'Integanyanyigisho Ishingiye ku Bushobozi (CBC) mu mashuri abanza n'ayisumbuye mu Rwanda.",
    totalPlans: "Imbata z'Amasomo Zose",
    primaryLevel: 'Amashuri Abanza (P1–P6)',
    secondaryLevel: 'Amashuri Ayisumbuye (S1–S6)',
    totalLearnersActive: 'Abanyeshuri Bigishwa',
    recentPlans: 'Amasomo Aheruka',
    viewAll: 'Reba yose',
    noPlansYet: 'Nta Mbata y’Isomo Irategurwa',
    noPlansSubtext: "Ububikoshingiro bwawe bwatangiriye ku busa. Kanda hasi utangire gutegura imbata yawe ya mbere y'isomo.",
    cbcStructureTitle: "Imiterere y'Imbata y'Isomo (CBC Rwanda)",
    cbcStep1: "1. Imyirondoro y'Abanyeshuri n'Isomo:",
    cbcStep1Desc: 'Umwaka (P1-P6 cyangwa S1-S6), Isomo, Umutwe, Isomo No, Igihembwe, Igihe n’Umubare w’Abanyeshuri.',
    cbcStep2: '2. Ubushobozi n’Intego:',
    cbcStep2Desc: "Ubushobozi bw'ingenzi bugamijwe ku mutwe, ubumenyi, ubumenyingiro, imyifatire n'indangagaciro, ubushobozi rusange n'insanganyamatsiko zambukiranya.",
    cbcStep3: '3. Imbata Nyirizina y’Isomo:',
    cbcStep3Desc: "Imbonerahamwe y'ibikorwa bya mwarimu, ibikorwa by'abanyeshuri, ibikoresho n'isuzuma.",
    cbcStep4: '4. Isuzuma n’Isuzumamitekerereze:',
    cbcStep4Desc: 'Isuzuma mwarimu yikora, ingorane zahuye nazo n’imyiteguro y’isomo ritaha.',

    studentsIdTitle: "Imyirondoro y'Abanyeshuri n'Isomo",
    studentsIdSubtext: "Shyiraho umwaka, icyiciro cy'amashuri, umubare w'abanyeshuri n'amakuru y'isomo.",
    termCol: 'Igihembwe',
    dateCol: 'Itariki',
    subjectCol: 'Isomo',
    classCol: 'Umwaka',
    unitNoCol: 'Umutwe No',
    lessonNoCol: 'Isomo No',
    durationCol: 'Igihe',
    learnersCol: "Umubare w'abanyeshuri",
    termPlaceholder: 'Hitamo...',
    subjectPlaceholder: 'urugero: Kinyarwanda, Imibare, SET...',
    classPlaceholder: 'urugero: P4A, S2B...',
    unitNoPlaceholder: 'urugero: 1',
    lessonNoPlaceholder: 'urugero: 1 muri 1',
    durationPlaceholder: 'urugero: 40 min',
    learnersPlaceholder: 'urugero: 43',
    educationLevelLabel: "Icyiciro cy'Amashuri",
    primaryRadio: 'Abanza (P1–P6)',
    secondaryRadio: 'Ayisumbuye (S1–S6)',
    schoolNameLabel: "Izina ry'Ishuri",
    schoolNamePlaceholder: "Injiza izina ry'ishuri (urugero: GS GITUMBA)",
    countryLabel: 'Igihugu',
    countryPlaceholder: "urugero: Rwanda",
    numberOfBoysLabel: "Umubare w'Abahungu",
    numberOfBoysPlaceholder: 'urugero: 18',
    numberOfGirlsLabel: "Umubare w'Abakobwa",
    numberOfGirlsPlaceholder: 'urugero: 22',
    totalStudentsLabel: "Umubare Wose w'Abanyeshuri",
    totalStudentsPlaceholder: 'urugero: 40',
    validationPassed: "Isuzuma Ryemejwe: Abahungu ({boys}) + Abakobwa ({girls}) = Bose ({total})",
    validationMismatch: "Isuzuma Ryatsinzwe: Abahungu ({boys}) + Abakobwa ({girls}) = {sum}, ariko Umubare wose ni {total}. Nyabuneka hindura.",
    autoCalculateTotal: "Kora Umubare Wose (Abahungu + Abakobwa)",
    saveIdentificationBtn: "Bika Imyirondoro y'Abanyeshuri",
    createPlanWithIdBtn: "Tegura Isomo Ukoresheje Iyi Myirondoro",
    identificationSavedSuccess: "Imyirondoro y'abanyeshuri yabitswe neza!",
    identificationProfileTitle: "Ifishi y'Imyirondoro y'Ishuri n'Abanyeshuri",
    identificationProfileSubtext: "Injiza amakuru y'abanyeshuri. Sisitemu igomba kwemeza ko Abahungu + Abakobwa bihuye n'Umubare Wose.",
    classOrGradeLabel: 'Icyiciro / Umwaka',
    subjectLabel: 'Isomo',
    termLabel: 'Igihembwe',
    dateLabel: 'Itariki',

    section2Title: "Intego n'Iteganyabikorwa by'Isomo",
    specialNeedsLabel: "Ubwoko bw'abanyeshuri bafite ibyifuzo byihariye muri iri somo n'umubare wabo muri buri cyiciro",
    specialNeedsPlaceholder: "urugero: Abafite intege nke mu myigire: abanyeshuri 3 (Ubufasha bwite bwa mwarimu)...",
    unitTopicLabel: "Umutwe w'isomo / Inyigisho",
    unitTopicPlaceholder: "urugero: Iterambere / Fractions and Decimals / Ubuzima bw'ingirangingo...",
    keyCompetenceLabel: "Ubushobozi bw'ingenzi bugamijwe ku mutwe",
    keyCompetencePlaceholder: "Shyiramo ubushobozi bw'ingenzi bukomoka mu nteganyanyigisho...",
    lessonTitleLabel: "Umutwe w'isomo",
    lessonTitlePlaceholder: "urugero: Umwandiko: Umurage w'abavandimwe batatu...",
    learningObjectivesLabel: "Intego z'isomo",
    learningObjectivesPlaceholder: "Nyuma y'iri somo, abanyeshuri bazaba bashobora...",
    locationLabel: "Iteganyamwanya ry'aho isomo ribera (Aho ribera)",
    locationPlaceholder: "urugero: Mu cyumba cy'ishuri, Mu kibuga, Muri laboratwari...",
    materialsLabel: "Ibikoresho by'isomo",
    materialsPlaceholder: "urugero: Igitabo cy'umunyeshuri, ikibaho, amafoto, flashcards, ibifatika...",
    referencesLabel: "Ibitabo byifashishijwe (Inkamoko)",
    referencesPlaceholder: "urugero: Integanyanyigisho, REB, Igitabo cy'umwarimu n'icy'umunyeshuri...",

    mainTableTitle: "Imbata y'Ibikorwa by'Isomo (Imbonerahamwe)",
    mainTableSubtext: "Imiterere ya REB/MINEDUC: Igihe kuri buri cyiciro | Ibikorwa by'umwarimu | Ibikorwa by'umunyeshuri | Ubushobozi Rusange n'Insanganyamatsiko",
    addStageBtn: '+ Ongeraho Icyiciro',
    quickAddLabel: 'Hitamo Icyiciro Gisanzwe:',
    addIntroStage: '+ Intangiriro (5 min)',
    addDevStage: '+ Isomo nyirizina (30 min)',
    addConclusionStage: "+ Umusuzo w'isomo (5 min)",
    zeroStagesTitle: 'Nta cyiciro kirajyamo (Biracyari ubusa)',
    zeroStagesSubtext: "Ongeramo ibyiciro by'isomo (urugero: Intangiriro, Isomo nyirizina, Umusuzo) ukoresheje buto ziri hejuru.",
    addFirstStageBtn: 'Ongeraho Icyiciro cya Mbere',
    stageAndTimeHeader: 'Igihe kuri buri cyiciro',
    activitiesGroupHeader: "Ubusobanuro bw'ibikorwa by'inyigire n'inyigishirize",
    teacherActivitiesHeader: "Ibikorwa by'umwarimu",
    learnerActivitiesHeader: "Ibikorwa by'umunyeshuri",
    competencesCrossCuttingHeader: "Ubushobozi Rusange n'Insanganyamatsiko Zambukiranya Amasomo + Ibisobanuro Bigufi",
    stepNumberPrefix: 'Icyiciro',
    stageNamePlaceholder: "Izina ry'icyiciro (urugero: Intangiriro)",
    durationInputPlaceholder: 'Igihe (urugero: 5 min)',
    teacherActPlaceholder: 'Mwarimu ayobora abanyeshuri...',
    learnerActPlaceholder: 'Abanyeshuri baratega amatwi, baraganira, barandika...',
    competencesPlaceholder: "a) Ubushobozi rusange:\n• Itumanaho\n• Gukorera hamwe\nb) Insanganyamatsiko zambukiranya:\n• Uburinganire\n• Uburezi budaheza...",
    stagesCountSummary: 'Ibyiciro {count} biri mu mbonerahamwe',
    addAnotherStageBtn: '+ Ongeraho Ikindi Cyiciro',
    editorTitleDefault: 'Iteganyanyigisho Rishya',
    editorSubtext: "Imbata y'Isomo CBC • Ibyiciro {stages} Byateguwe",
    storageTitle: "Ububiko n'Imimerere y'Amakuru",
    storageDescription: "Amasomo n'imyirondoro y'abanyeshuri bibitswe neza muri mudasobwa yawe cyangwa bishobora guhuzwa na Firebase Firestore.",

    selfEvaluationLabel: "Isuzuma mwarimu yikora (Self-Evaluation)",
    selfEvaluationPlaceholder: "urugero: Abanyeshuri hafi ya bose bageze ku ntego y'isomo kuko bashoboye gusoma no gusobanura umwandiko neza. Abatarishoboye neza bazafashwa mu masomo ari imbere...",

    savedPlansTitle: 'Amasomo Yabitswe',
    savedPlansSubtext: 'Genzura, shakisha, hindura, koporora kandi ucape amasomo yose wateguye.',
    searchPlaceholder: "Shakisha ku mutwe w'isomo, isomo, ishuri, igihembwe...",
    allLevels: 'Ibyiciro Byose (Abanza n’Ayisumbuye)',
    allSubjects: 'Amasomo Yose',
    showingPlansCount: 'Hagaragaye {filtered} kuri {total}',
    noPlansMatchTitle: 'Nta Mbata y’Isomo Ibonetse',
    noPlansMatchSubtextEmpty: "Ububikoshingiro bwawe nta somo ririmo. Tangira utegura imbata y'isomo mu mashuri abanza cyangwa ayisumbuye.",
    noPlansMatchSubtextQuery: 'Nta somo rihuye n’ibyo ushaka. Gerageza guhindura amagambo washakishije.',
    durationAndDate: 'Igihe n’Itariki',
    classAndLearners: 'Umwaka n’Abanyeshuri',
    tableStagesCount: "Ibyiciro by'Imbonerahamwe",

    settingsTitle: "Ibihindurwa by'Urubuga n'Ububiko bwa Cloud",
    settingsSubtext: "Genzura kopi z'ububiko n'ububikoshingiro bwa Firebase.",
    databaseStorageBox: "Ububiko bw'Amasomo",
    managePlansLink: 'Genzura Amasomo Yabitswe →',
    backupSectionTitle: "Kubika Kopi y'Amakuru (Backup) no Kuyigarura",
    backupSectionSubtext: "Kura muri telefone cyangwa mudasobwa dosiye ya JSON irimo amasomo yawe yose, cyangwa uyigarure igihe cyose.",
    exportJsonBtn: "Sohora Amasomo Yose (JSON)",
    importJsonBtn: 'Garura Amasomo muri Dosiye',
    resetDatabaseBtn: 'Siba Amakuru Yose',
    cloudGuideTitle: "Amabwiriza yo Guhuza na Firebase Firestore & Hosting",
    cloudGuideSubtext: "Amabwiriza arambuye yo guhuza urubuga rwawe na Firebase kugira ngo amasomo ajye abikwa kuri interineti.",
    stepGuideTitle: "Intambwe zo Gushyiraho (Bikorerwa na Nyirurubuga)",
    step1: "Fungura umushinga mushya muri Firebase Console.",
    step2: "Fungura Cloud Firestore muri Production Mode.",
    step3: "Fungura Firebase Authentication (Google cyangwa Email/Password).",
    step4: "Shyiraho amategeko y'umutekano (Firestore Security Rules) aboneka hasi.",
    step5: "Shyira urubuga kuri Firebase Hosting ukoresheje firebase-tools.",
    rulesLabel: "Amategeko y'Umutekano ya Firestore Asabwa",
    connectWebConfigTitle: "Kwinjiza Amakuru ya Firebase ku Rubuga",
    enableFirestoreSync: 'Emeza Guhuza na Cloud Firestore',
    saveCloudSettingsBtn: 'Bika Ibyahinduwe kuri Cloud',

    printModalTitle: "IMBATA Y'ISOMO / Rwanda CBC Lesson Plan",
    printModalSubtext: 'Imiterere Yemewe ya Minisiteri y’Uburezi / REB',
    printSavePdfBtn: 'Gucapa / Bika nka PDF',
    closePreview: 'Funga Kureba',
    noStagesPrint: 'Nta cyiciro kirashyirwamo.',
    removeStageBtn: 'Siba Icyiciro',
    confirmRemoveStage: 'Wizeye neza ko ushaka gusiba iki cyiciro?',
    undoRemove: 'Guhagarika (Undo)',
    printOrientationLabel: "Imiterere y'Ipaji",
    portraitOption: 'Bihagaze (Portrait A4)',
    landscapeOption: 'Birambitse (Landscape)'
  },

  fr: {
    appTitle: 'Générateur de Fiche Pédagogique',
    appSubtitle: 'Rwanda CBC',
    curriculumSubtitle: 'Curriculum Basé sur les Compétences du Rwanda (CBC)',
    languageLabel: 'Langue / Language / Ururimi',
    navDashboard: 'Tableau de bord',
    navStudents: 'Identification des Apprenants',
    navCreate: 'Créer une Fiche',
    navSaved: 'Fiches Enregistrées',
    navSettings: 'Paramètres',
    newPlanButton: 'Nouvelle Fiche',
    footerStandard: "Normes du Ministère de l'Éducation (MINEDUC) / REB",

    navAllTools: 'Tableau de bord / Tous les Outils',
    navHomeGenerator: 'Générateur de Fiche (Accueil)',
    threeDotMenuTooltip: 'Outils et Modules Pédagogiques (⋮)',
    menuLabel: 'Menu',
    modulesTitle: 'Outils & Modules Pédagogiques',
    modulesSubtext: 'Pôle central pour la préparation des cours, fiches sauvegardées, effectifs scolaires et cloud.',
    backToGenerator: '← Retour au Générateur de Fiche',
    openModuleBtn: 'Ouvrir le Module',
    moduleGeneratorTitle: 'Générateur de Fiche Pédagogique',
    moduleGeneratorDesc: 'Créez des fiches de leçons officielles conformes aux normes REB/MINEDUC avec tableau CBC complet.',
    moduleSavedTitle: 'Fiches Enregistrées & Export',
    moduleSavedDesc: 'Recherchez, prévisualisez, dupliquez, modifiez et imprimez ou exportez vos fiches au format PDF officiel.',
    moduleStudentsTitle: 'Identification des Apprenants',
    moduleStudentsDesc: 'Gérez la classe, la matière, le trimestre et suivez les effectifs de filles et de garçons.',
    moduleSettingsTitle: 'Paramètres & Synchro Cloud',
    moduleSettingsDesc: 'Configurez la synchronisation Firestore, les sauvegardes JSON hors ligne et les règles de sécurité.',

    save: 'Enregistrer',
    saving: 'Enregistrement...',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    duplicate: 'Dupliquer',
    printPreviewPdf: 'Imprimer / Enregistrer en PDF',
    resetNewPlan: 'Nouvelle Fiche Vierge',
    saveSuccess: 'Fiche pédagogique enregistrée avec succès !',
    saveError: "Échec de l'enregistrement. Veuillez vérifier vos données.",
    confirmDeleteTitle: 'Supprimer la Fiche ?',
    confirmDeleteMessage: 'Êtes-vous sûr de vouloir supprimer définitivement cette fiche pédagogique ? Cette action est irréversible.',
    confirmDeleteBtn: 'Oui, Supprimer Définitivement',
    clearFilters: 'Effacer les filtres',
    browsePlans: 'Parcourir les Fiches',
    createFirstPlan: 'Créer la Première Fiche',
    orderDel: 'Ordre / Suppr',
    moveUp: 'Monter',
    moveDown: 'Descendre',
    deleteStage: "Supprimer l'étape",
    copied: 'Copié !',
    copyRules: 'Copier les règles',

    welcomeHeading: 'Planification Pédagogique CBC Rwanda',
    welcomeSubtext: 'Préparez, personnalisez et imprimez des fiches de cours CBC de haute qualité pour les écoles primaires et secondaires du Rwanda.',
    totalPlans: 'Total des Fiches',
    primaryLevel: 'Niveau Primaire (P1–P6)',
    secondaryLevel: 'Niveau Secondaire (S1–S6)',
    totalLearnersActive: 'Apprenants Inscrits',
    recentPlans: 'Fiches Récentes',
    viewAll: 'Voir tout',
    noPlansYet: 'Aucune Fiche Créée',
    noPlansSubtext: 'Votre base de données démarre vierge. Cliquez ci-dessous pour préparer votre première fiche de cours conforme au CBC.',
    cbcStructureTitle: 'Structure de la Fiche CBC du Rwanda',
    cbcStep1: '1. Identification des Apprenants :',
    cbcStep1Desc: 'Classe (P1-P6 ou S1-S6), Matière, Unité, Leçon, Trimestre, Durée et Nombre d’Apprenants.',
    cbcStep2: '2. Alignement des Compétences :',
    cbcStep2Desc: "Compétence clé de l'unité, connaissances/aptitudes, attitudes/valeurs, compétences génériques et thèmes transversaux.",
    cbcStep3: '3. Étapes Principales de la Leçon :',
    cbcStep3Desc: "Tableau détaillé : Activités de l'enseignant, Activités de l'apprenant, Matériel didactique et Évaluation formative.",
    cbcStep4: '4. Évaluation & Réflexion :',
    cbcStep4Desc: "Auto-évaluation de l'enseignant, difficultés rencontrées et préparation du prochain cours.",

    studentsIdTitle: 'Identification des Apprenants et de la Leçon',
    studentsIdSubtext: "Définissez la classe, le niveau, le nombre d'apprenants et les informations contextuelles de la leçon.",
    termCol: 'Trimestre',
    dateCol: 'Date',
    subjectCol: 'Matière',
    classCol: 'Classe',
    unitNoCol: 'Unité N°',
    lessonNoCol: 'Leçon N°',
    durationCol: 'Durée',
    learnersCol: "Nombre d'Apprenants",
    termPlaceholder: 'Sélectionner...',
    subjectPlaceholder: 'ex: Kinyarwanda, Mathématiques, Sciences...',
    classPlaceholder: 'ex: P4A, S2B...',
    unitNoPlaceholder: 'ex: 1',
    lessonNoPlaceholder: 'ex: 1 sur 1',
    durationPlaceholder: 'ex: 40 min',
    learnersPlaceholder: 'ex: 43',
    educationLevelLabel: "Niveau d'Enseignement",
    primaryRadio: 'Primaire (P1–P6)',
    secondaryRadio: 'Secondaire (S1–S6)',
    schoolNameLabel: "Nom de l'École",
    schoolNamePlaceholder: "Entrez le nom de l'école (ex: GS GITUMBA)",
    countryLabel: 'Pays',
    countryPlaceholder: 'ex: Rwanda',
    numberOfBoysLabel: 'Nombre de Garçons',
    numberOfBoysPlaceholder: 'ex: 18',
    numberOfGirlsLabel: 'Nombre de Filles',
    numberOfGirlsPlaceholder: 'ex: 22',
    totalStudentsLabel: "Nombre Total d'Élèves",
    totalStudentsPlaceholder: 'ex: 40',
    validationPassed: 'Validation Réussie : Garçons ({boys}) + Filles ({girls}) = Total ({total})',
    validationMismatch: 'Erreur de Validation : Garçons ({boys}) + Filles ({girls}) = {sum}, mais le Total est {total}. Veuillez corriger.',
    autoCalculateTotal: 'Calculer le Total (Garçons + Filles)',
    saveIdentificationBtn: "Enregistrer l'Identification",
    createPlanWithIdBtn: 'Créer une Fiche avec cette Identification',
    identificationSavedSuccess: "Identification des apprenants enregistrée avec succès !",
    identificationProfileTitle: "Formulaire d'Identification des Apprenants",
    identificationProfileSubtext: "Enregistrez la démographie de la classe. Valide que Garçons + Filles égale le Total d'Élèves.",
    classOrGradeLabel: 'Classe / Niveau',
    subjectLabel: 'Matière',
    termLabel: 'Trimestre',
    dateLabel: 'Date',

    section2Title: 'Contexte et Objectifs de la Leçon',
    specialNeedsLabel: "Types de besoins éducatifs particuliers et nombre d'apprenants dans chaque catégorie",
    specialNeedsPlaceholder: "ex: Apprenants en difficulté d'apprentissage : 3 (soutien personnalisé de l'enseignant)...",
    unitTopicLabel: "Titre de l'Unité / Thème",
    unitTopicPlaceholder: 'ex: Développement / Fractions et Décimales / Biologie cellulaire...',
    keyCompetenceLabel: "Compétence Clé de l'Unité",
    keyCompetencePlaceholder: "Saisissez la compétence générale tirée du programme officiel...",
    lessonTitleLabel: 'Titre de la Leçon',
    lessonTitlePlaceholder: 'ex: Lecture et compréhension : Héritage des trois frères...',
    learningObjectivesLabel: 'Objectifs Pédagogiques',
    learningObjectivesPlaceholder: "À la fin de la leçon, les apprenants seront capables de...",
    locationLabel: 'Lieu de déroulement de la leçon (Classe / Terrain / Laboratoire)',
    locationPlaceholder: 'ex: Salle de classe, Terrain de sport, Laboratoire scientifique...',
    materialsLabel: 'Matériel Didactique et d’Apprentissage',
    materialsPlaceholder: 'ex: Manuel scolaire, tableau, images, cartes éclairs, objets concrets...',
    referencesLabel: 'Références / Sources',
    referencesPlaceholder: "ex: Programme officiel, REB, Guide de l'enseignant et manuel de l'élève...",

    mainTableTitle: 'Tableau des Étapes de la Leçon (Imbata y’Ibikorwa by’Isomo)',
    mainTableSubtext: "Format REB/MINEDUC : Étape et Durée | Activités de l'enseignant | Activités de l'apprenant | Compétences génériques & Thèmes transversaux",
    addStageBtn: '+ Ajouter une Étape',
    quickAddLabel: 'Ajouter une étape standard :',
    addIntroStage: '+ Introduction (5 min)',
    addDevStage: '+ Développement (30 min)',
    addConclusionStage: '+ Conclusion (5 min)',
    zeroStagesTitle: '0 Étape dans le Tableau (Démarre Vierge)',
    zeroStagesSubtext: "Ajoutez les étapes de la leçon (ex: Introduction, Développement, Conclusion) à l'aide des boutons ci-dessus.",
    addFirstStageBtn: 'Ajouter la Première Étape',
    stageAndTimeHeader: 'Étape & Durée',
    activitiesGroupHeader: "Description des Activités d'Enseignement et d'Apprentissage",
    teacherActivitiesHeader: "Activités de l'Enseignant",
    learnerActivitiesHeader: "Activités de l'Apprenant",
    competencesCrossCuttingHeader: 'Compétences Génériques et Thèmes Transversaux + Brèves Explications',
    stepNumberPrefix: 'Étape',
    stageNamePlaceholder: "Nom de l'étape (ex: Introduction)",
    durationInputPlaceholder: 'Durée (ex: 5 min)',
    teacherActPlaceholder: "L'enseignant guide les apprenants à...",
    learnerActPlaceholder: 'Les apprenants écoutent, discutent, écrivent, calculent...',
    competencesPlaceholder: "a) Compétences génériques :\n• Communication\n• Travail d'équipe\nb) Thèmes transversaux :\n• Égalité des genres\n• Éducation inclusive...",
    stagesCountSummary: '{count} étape(s) dans le tableau',
    addAnotherStageBtn: '+ Ajouter une Autre Étape',
    editorTitleDefault: 'Nouvelle Fiche Pédagogique',
    editorSubtext: 'Format CBC Rwanda • {stages} Étape(s) configurée(s)',
    storageTitle: 'État du Stockage & Base de Données',
    storageDescription: "Les fiches de cours et l'identification des apprenants sont stockées dans votre navigateur ou synchronisées avec Firebase Firestore.",

    selfEvaluationLabel: "Auto-évaluation de l'Enseignant (Isuzuma mwarimu yikora)",
    selfEvaluationPlaceholder: "ex: La plupart des apprenants ont atteint les objectifs de la leçon. Les apprenants en difficulté bénéficieront d'un soutien...",

    savedPlansTitle: 'Fiches Enregistrées',
    savedPlansSubtext: 'Gérez, recherchez, modifiez, dupliquez et imprimez toutes vos fiches pédagogiques préparées.',
    searchPlaceholder: 'Rechercher par titre, matière, classe, trimestre...',
    allLevels: 'Tous les Niveaux (Primaire & Secondaire)',
    allSubjects: 'Toutes les Matières',
    showingPlansCount: 'Affichage de {filtered} sur {total} fiches',
    noPlansMatchTitle: 'Aucune Fiche Trouvée',
    noPlansMatchSubtextEmpty: 'Votre base de données est actuellement vide. Commencez par créer une fiche de cours.',
    noPlansMatchSubtextQuery: 'Aucune fiche ne correspond à vos critères. Essayez de modifier vos termes de recherche.',
    durationAndDate: 'Durée & Date',
    classAndLearners: 'Classe & Apprenants',
    tableStagesCount: 'Étapes du Tableau',

    settingsTitle: "Paramètres de l'Application & Cloud",
    settingsSubtext: 'Gérez vos sauvegardes de la base de données et configuration Firebase Cloud.',
    databaseStorageBox: 'Stockage des Données',
    managePlansLink: 'Gérer les Fiches →',
    backupSectionTitle: 'Sauvegarde & Restauration des Données',
    backupSectionSubtext: 'Téléchargez une sauvegarde hors-ligne au format JSON de toutes vos fiches, ou importez un fichier de sauvegarde.',
    exportJsonBtn: 'Exporter Toutes les Fiches (JSON)',
    importJsonBtn: 'Importer un Fichier de Sauvegarde',
    resetDatabaseBtn: 'Réinitialiser la Base',
    cloudGuideTitle: 'Instructions de Configuration Firebase Firestore & Hosting',
    cloudGuideSubtext: 'Guide complet pour connecter votre application à votre propre projet Firebase pour la synchronisation cloud.',
    stepGuideTitle: 'Guide Pas à Pas (Actions Propriétaire)',
    step1: 'Créez ou ouvrez un projet dans la console Firebase.',
    step2: 'Activez Cloud Firestore en mode production.',
    step3: 'Activez Firebase Authentication (Google ou Email/Mot de passe).',
    step4: 'Déployez les règles de sécurité Firestore ci-dessous.',
    step5: 'Déployez sur Firebase Hosting avec la CLI firebase-tools.',
    rulesLabel: 'Règles de Sécurité Firestore Recommandées',
    connectWebConfigTitle: 'Optionnel : Connecter la Configuration Web Firebase',
    enableFirestoreSync: 'Activer la Synchronisation Cloud Firestore',
    saveCloudSettingsBtn: 'Enregistrer les Paramètres Cloud',

    printModalTitle: "IMBATA Y'ISOMO / Fiche Pédagogique Rwanda CBC",
    printModalSubtext: "Format Officiel Exact du Ministère de l'Éducation / REB",
    printSavePdfBtn: 'Imprimer / Enregistrer en PDF',
    closePreview: "Fermer l'Aperçu",
    noStagesPrint: 'Aucune étape de leçon ajoutée pour le moment.',
    removeStageBtn: "Supprimer l'Étape",
    confirmRemoveStage: 'Êtes-vous sûr de vouloir supprimer cette étape ?',
    undoRemove: 'Annuler',
    printOrientationLabel: 'Orientation de la Page',
    portraitOption: 'Portrait (A4 Standard)',
    landscapeOption: 'Paysage (Tableau Large)'
  }
};

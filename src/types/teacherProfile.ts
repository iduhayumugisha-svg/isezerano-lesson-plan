export type TeacherGender = 'Gabo' | 'Gore' | 'Other' | '';

export interface TeacherProfile {
  id?: string;
  ownerUid: string;          // Authenticated teacher UID
  email: string;             // Authenticated Google account email (strictly locked)
  fullName: string;          // Teacher's full name
  phone: string;             // Teacher's contact phone number
  gender: TeacherGender;     // Gender (Gabo / Gore / Other)
  schoolName: string;        // School name (e.g., GS GITUMBA)
  qualification: string;     // Teaching qualification (e.g., A2, A1, A0, Masters, PhD)
  subjectsTaught: string[];  // Subjects taught under Rwanda CBC
  classesTaught: string[];   // Classes taught (e.g., N1-N3, P1-P6, S1-S6)
  experienceYears?: string;  // Years of teaching experience
  district?: string;         // District (e.g., Rulindo)
  sector?: string;           // Sector (e.g., Gitumba)
  bio?: string;              // Professional notes, bio, or responsibilities
  createdAt?: string;        // Creation timestamp
  updatedAt?: string;        // Last update timestamp
}

export const RWANDA_CBC_SUBJECTS = [
  'Kinyarwanda',
  'English',
  'Mathematics',
  'Science & Elementary Technology (SET)',
  'Social and Religious Studies (SRS)',
  'Creative Arts',
  'Physical Education',
  'French',
  'Biology',
  'Chemistry',
  'Physics',
  'Geography',
  'History & Citizenship',
  'Entrepreneurship',
  'Information & Communication Technology (ICT)',
  'Literature in English',
  'General Studies & Communication'
];

export const RWANDA_EDUCATION_CLASSES = [
  'N1', 'N2', 'N3',
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6',
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6'
];

export const TEACHING_QUALIFICATIONS = [
  'A2 – Secondary Teacher Certificate (TTC)',
  'A1 – Higher Education Diploma in Education',
  'A0 – Bachelor of Education (B.Ed)',
  'Postgraduate Diploma in Education (PGDE)',
  'Master of Education (M.Ed)',
  'Bachelor of Science / Arts with Education',
  'PhD in Education',
  'Other Professional Certificate'
];

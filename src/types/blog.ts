export interface BlogAuthor {
  name: string;
  role: string;
  email?: string;
}

export type BlogImageStorageMode = 'firebase_storage' | 'firestore_embedded';

export type BlogImageSizePreset = 'small' | 'medium' | 'large' | 'custom';
export type BlogImageAlignment = 'left' | 'center' | 'right';

export interface BlogPost {
  id: string;
  title: string;
  slug: string; // Unique SEO-friendly URL slug
  content: string; // Rich HTML formatted content (multiple paragraphs & typography)
  excerpt: string; // Short summary for cards and meta description
  thumbnailUrl: string; // Persistent HTTPS Storage URL, compressed Data URI, or '' (default placeholder)
  thumbnailAlt?: string;
  thumbnailStorageMode?: BlogImageStorageMode;
  thumbnailIsCustomOverride?: boolean; // True only if admin explicitly picked a cover separate from article images
  category: string;
  author: BlogAuthor;
  publishedAt: string; // ISO 8601 date string (empty when draft never published)
  updatedAt?: string;
  status: 'published' | 'draft';
  tags?: string[];
  views?: number;
  readTimeMinutes?: number;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  isDefault?: boolean; // True for categories originally created by AI
  createdAt?: string;
  updatedAt?: string;
}

export const BLOG_CATEGORIES = [
  'All Categories',
  'CBC Curriculum',
  'School News',
  'Teacher Resources',
  'Academic Guidance',
  'Pedagogical Innovation',
  'Announcements'
] as const;

export const BLOG_WRITE_CATEGORIES = BLOG_CATEGORIES.filter(
  (c) => c !== 'All Categories'
);

export const DEFAULT_AI_BLOG_CATEGORIES: BlogCategory[] = [
  {
    id: 'ai_cat_cbc_curriculum',
    name: 'CBC Curriculum',
    slug: 'cbc-curriculum',
    description: 'Rwanda Competence-Based Curriculum (CBC) lesson planning guides and pedagogical standards.',
    isDefault: true
  },
  {
    id: 'ai_cat_school_news',
    name: 'School News',
    slug: 'school-news',
    description: 'Updates, activities, and official news from GS GITUMBA and education partners.',
    isDefault: true
  },
  {
    id: 'ai_cat_teacher_resources',
    name: 'Teacher Resources',
    slug: 'teacher-resources',
    description: 'Classroom teaching materials, assessment templates, and practical educator guides.',
    isDefault: true
  },
  {
    id: 'ai_cat_academic_guidance',
    name: 'Academic Guidance',
    slug: 'academic-guidance',
    description: 'Student learning support, study tips, and academic mentoring insights.',
    isDefault: true
  },
  {
    id: 'ai_cat_pedagogical_innovation',
    name: 'Pedagogical Innovation',
    slug: 'pedagogical-innovation',
    description: 'Modern teaching strategies and classroom methodology improvements.',
    isDefault: true
  },
  {
    id: 'ai_cat_announcements',
    name: 'Announcements',
    slug: 'announcements',
    description: 'Official school notices, term calendars, and important administrative updates.',
    isDefault: true
  }
];

export interface BlogImageUploadResult {
  success: boolean;
  url?: string;
  storageMode?: BlogImageStorageMode;
  byteSize?: number;
  width?: number;
  height?: number;
  fallbackNotice?: string;
  error?: string;
}

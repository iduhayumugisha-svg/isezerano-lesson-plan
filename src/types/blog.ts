export interface BlogAuthor {
  name: string;
  role: string;
  email?: string;
}

export type BlogImageStorageMode = 'firebase_storage' | 'firestore_embedded';

export interface BlogPost {
  id: string;
  title: string;
  slug: string; // Unique SEO-friendly URL slug
  content: string; // Rich HTML formatted content (multiple paragraphs & typography)
  excerpt: string; // Short summary for cards and meta description
  thumbnailUrl: string; // Persistent HTTPS Storage URL or compressed Data URI
  thumbnailAlt?: string;
  thumbnailStorageMode?: BlogImageStorageMode;
  category: string;
  author: BlogAuthor;
  publishedAt: string; // ISO 8601 date string (empty when draft never published)
  updatedAt?: string;
  status: 'published' | 'draft';
  tags?: string[];
  views?: number;
  readTimeMinutes?: number;
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

export interface BlogImageUploadResult {
  success: boolean;
  url?: string;
  storageMode?: BlogImageStorageMode;
  byteSize?: number;
  fallbackNotice?: string;
  error?: string;
}

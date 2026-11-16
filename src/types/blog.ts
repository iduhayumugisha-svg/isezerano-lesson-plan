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
  featuredImage?: string | { url?: string | null } | null;
  coverImage?: string | { url?: string | null } | null;
  image?: string | { url?: string | null } | null;
  imageUrl?: string | null;
  bannerImage?: string | null;
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
  'General News',
  'National',
  'Education',
  'Opinion',
  'Culture & Sports',
  'Announcements'
] as const;

export const BLOG_WRITE_CATEGORIES = BLOG_CATEGORIES.filter(
  (c) => c !== 'All Categories'
);

export const DEFAULT_AI_BLOG_CATEGORIES: BlogCategory[] = [
  {
    id: 'ai_cat_general_news',
    name: 'General News',
    slug: 'general-news',
    description: 'Latest breaking stories, top headlines, and verified news reports.',
    isDefault: true
  },
  {
    id: 'ai_cat_national',
    name: 'National',
    slug: 'national',
    description: 'National news, public affairs, and community developments across Rwanda.',
    isDefault: true
  },
  {
    id: 'ai_cat_education',
    name: 'Education',
    slug: 'education',
    description: 'Education news, academic policy updates, and institutional reports.',
    isDefault: true
  },
  {
    id: 'ai_cat_opinion',
    name: 'Opinion',
    slug: 'opinion',
    description: 'Editorial commentary, perspectives, and in-depth analysis.',
    isDefault: true
  },
  {
    id: 'ai_cat_culture_sports',
    name: 'Culture & Sports',
    slug: 'culture-and-sports',
    description: 'Arts, culture, youth initiatives, and sports coverage.',
    isDefault: true
  },
  {
    id: 'ai_cat_announcements',
    name: 'Announcements',
    slug: 'announcements',
    description: 'Official notices, press releases, and important public updates.',
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

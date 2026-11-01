export interface BlogAuthor {
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string; // Unique SEO-friendly URL slug (e.g. rwanda-cbc-lesson-planning-guidelines)
  content: string; // Rich HTML formatted content
  excerpt: string; // Short summary (120-160 chars) for cards and meta description
  thumbnailUrl: string; // Absolute HTTPS image URL for featured banner & social sharing cards
  thumbnailAlt?: string;
  category: string; // e.g. "CBC Curriculum", "School News", "Academic Guidance", "Teacher Resources"
  author: BlogAuthor;
  publishedAt: string; // ISO 8601 date string
  updatedAt?: string;
  status: 'published' | 'draft';
  tags?: string[];
  views?: number;
  readTimeMinutes?: number;
  thumbnailAuditStatus?: 'verified' | 'upgraded' | 'extracted_from_content' | 'using_fallback';
  needsImageReview?: boolean;
  thumbnailAuditNote?: string;
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

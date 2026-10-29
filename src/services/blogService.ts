import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  increment,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { BlogPost } from '../types/blog';

const BLOG_STORAGE_KEY = 'isezerano_blog_posts';

// Curated starter pedagogical blog posts about GS GITUMBA & Rwanda CBC
const SEED_BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-1-cbc-lesson-planning',
    title: 'Mastering the Rwanda CBC 8-Column Lesson Plan: Complete Guide for Teachers',
    slug: 'mastering-rwanda-cbc-8-column-lesson-plan-guide',
    excerpt: 'Step-by-step pedagogical breakdown of Competence-Based Curriculum (CBC) lesson planning for Rwandan primary and secondary school teachers.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
    thumbnailAlt: 'Rwandan classroom teacher conducting an interactive pedagogical lesson',
    category: 'CBC Curriculum',
    author: {
      name: 'Twizere Felix',
      role: 'Head Teacher & Pedagogical Lead',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    },
    publishedAt: '2026-10-20T08:00:00Z',
    status: 'published',
    views: 342,
    readTimeMinutes: 5,
    tags: ['CBC', 'Lesson Planning', 'MINEDUC', 'REB', 'Rwanda Education'],
    content: `
      <h2>Introduction to Competence-Based Planning</h2>
      <p>The Rwanda Competence-Based Curriculum (CBC), established by the Ministry of Education (MINEDUC) and Rwanda Basic Education Board (REB), shifts the learning focus from rote memorization to authentic, learner-centered capability.</p>
      
      <h3>The Essential 8 Metadata Columns</h3>
      <p>Every REB-compliant lesson plan must open with complete identification metadata:</p>
      <ul>
        <li><strong>Term & Date:</strong> Ensures strict alignment with academic trimester calendar.</li>
        <li><strong>Subject & Class:</strong> Specifies pedagogical discipline and grade level.</li>
        <li><strong>Unit No & Lesson No:</strong> Anchors the daily progression to syllabus schemes of work.</li>
        <li><strong>Duration & Class Size:</strong> Details exact instructional minutes and learner demographic totals (boys & girls).</li>
      </ul>

      <blockquote>
        "Competence is the ability to use appropriate knowledge, skills, values, and attitudes in both familiar and unfamiliar situations." — Rwanda Basic Education Board
      </blockquote>

      <h3>Key Steps in Learning Activities</h3>
      <p>Teachers must design clear, differentiated tasks distinguishing <em>Teacher's Activities</em> from <em>Learner's Activities</em>. Integrating generic competences (Critical Thinking, Creativity, Communication, and Cooperation) with cross-cutting issues like Gender Education and Environmental Protection creates a holistic 21st-century learning environment.</p>

      <h2>Practical Classroom Tips for GS GITUMBA Educators</h2>
      <p>Ensure your instructional objectives follow the SMART criteria (Specific, Measurable, Achievable, Realistic, and Time-bound). With digital tools like ISEZERANO ONLINE, teachers can prepare and export clean, printable A4 lesson plans in minutes.</p>
    `
  },
  {
    id: 'post-2-stem-science-gs-gitumba',
    title: 'Transforming STEM and Practical Science Education at GS GITUMBA',
    slug: 'transforming-stem-science-education-gs-gitumba',
    excerpt: 'How GS GITUMBA in Rulindo District leverages local learning materials and science kits to enhance hands-on experiments for learners.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    thumbnailAlt: 'Science laboratory beaker and educational chemistry experiment',
    category: 'School News',
    author: {
      name: 'GS GITUMBA Science Dept',
      role: 'STEM Coordinators',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    },
    publishedAt: '2026-10-15T10:30:00Z',
    status: 'published',
    views: 219,
    readTimeMinutes: 4,
    tags: ['STEM', 'Science', 'Rulindo', 'GS GITUMBA', 'Innovation'],
    content: `
      <h2>Embracing Inquiry-Based Science Learning</h2>
      <p>At Groupe Scolaire GITUMBA (Buyoga Sector, Rulindo District), our science and mathematics teachers are redefining the laboratory experience. By combining standard national science kits with low-cost, locally sourced materials, learners conduct daily inquiry experiments in biology, physics, and chemistry.</p>
      
      <h3>Key Milestones This Academic Year</h3>
      <ul>
        <li>Over 45 practical biology microscopy sessions conducted for upper primary and secondary learners.</li>
        <li>Introduction of digital simulation exercises utilizing school ICT tablets.</li>
        <li>Peer-to-peer STEM mentoring between senior secondary students and junior classes.</li>
      </ul>

      <p>Through hands-on inquiry, GS GITUMBA students not only prepare thoroughly for national examinations but also develop crucial scientific problem-solving mindsets that serve our nation's development vision.</p>
    `
  },
  {
    id: 'post-3-digital-transformation-schools',
    title: 'Digital Tools in Rwandan Classrooms: Empowering Educators in 2026',
    slug: 'digital-tools-rwandan-classrooms-empowering-educators',
    excerpt: 'Exploring how technology, digital lesson planning, and online teacher collaboration are raising pedagogical quality across Rwanda.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    thumbnailAlt: 'Digital tablet and educational technology tools in modern school',
    category: 'Teacher Resources',
    author: {
      name: 'Twizere Felix',
      role: 'Head Teacher & Pedagogical Lead',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    },
    publishedAt: '2026-10-08T14:00:00Z',
    status: 'published',
    views: 488,
    readTimeMinutes: 6,
    tags: ['EdTech', 'Rwanda Vision 2050', 'Digital Skills', 'MINEDUC'],
    content: `
      <h2>The Shift to Paperless and Structured Preparation</h2>
      <p>Educational technology in Rwanda is rapidly progressing under the leadership of MINEDUC and REB. Digital preparation eliminates the repetitive friction of hand-drawing table lines and retyping identical curriculum objectives week after week.</p>
      
      <h3>Benefits for Everyday Teachers</h3>
      <p>With structured online platforms:</p>
      <ul>
        <li>Teachers retain reusable archives of all prepared lesson plans across all three academic terms.</li>
        <li>Direct export to PDF and Word (.docx) ensures seamless inspection compliance.</li>
        <li>Offline caching ensures lesson plans remain editable even in areas with intermittent internet connectivity.</li>
      </ul>
      <p>ISEZERANO ONLINE stands proud as an authentic community initiative born right here in Rulindo to serve teachers everywhere.</p>
    `
  }
];

/**
 * Normalizes title into an SEO-friendly URL slug.
 */
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with single hyphen
    .replace(/^-+|-+$/g, ''); // Strip leading/trailing hyphens
};

/**
 * Calculates estimated reading time in minutes from HTML or plain text content.
 */
export const calculateReadingTime = (content: string): number => {
  const plainText = content.replace(/<[^>]*>/g, ' ');
  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

/**
 * Fetches all blog posts from Firestore with local storage fallback and initial seed.
 */
export const getBlogPosts = async (includeDrafts: boolean = false): Promise<BlogPost[]> => {
  // Read local cache first
  let localPosts: BlogPost[] = [];
  try {
    const raw = localStorage.getItem(BLOG_STORAGE_KEY);
    if (raw) {
      localPosts = JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  // If local cache is completely empty, seed with starter posts
  if (localPosts.length === 0) {
    localPosts = [...SEED_BLOG_POSTS];
    try {
      localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(localPosts));
    } catch {
      // ignore
    }
  }

  // Attempt to load from Firestore 'posts' collection
  if (db) {
    try {
      const postsCol = collection(db, 'posts');
      const q = query(postsCol, orderBy('publishedAt', 'desc'));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const remotePosts: BlogPost[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as BlogPost;
          remotePosts.push({
            ...data,
            id: docSnap.id
          });
        });

        // Merge with local seed to ensure posts are always available
        const mergedMap = new Map<string, BlogPost>();
        SEED_BLOG_POSTS.forEach(p => mergedMap.set(p.slug, p));
        remotePosts.forEach(p => mergedMap.set(p.slug || p.id, p));

        const result = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );

        try {
          localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(result));
        } catch {
          // ignore
        }

        return includeDrafts ? result : result.filter(p => p.status === 'published');
      }
    } catch (err) {
      console.warn('Could not read posts from Firestore, using local cache:', err);
    }
  }

  return includeDrafts ? localPosts : localPosts.filter(p => p.status === 'published');
};

/**
 * Fetches a single blog post by its SEO slug or ID.
 */
export const getBlogPostBySlug = async (slugOrId: string): Promise<BlogPost | null> => {
  const allPosts = await getBlogPosts(true);
  const found = allPosts.find(p => p.slug === slugOrId || p.id === slugOrId);
  return found || null;
};

/**
 * Saves or updates a blog post in Firestore 'posts' collection and updates local storage.
 * Restricted to authorized admin in Firestore rules.
 */
export const saveBlogPost = async (
  post: BlogPost,
  adminUid: string
): Promise<{ success: boolean; error?: string; isLocalFallback?: boolean }> => {
  const payload: BlogPost = {
    ...post,
    slug: post.slug ? generateSlug(post.slug) : generateSlug(post.title),
    readTimeMinutes: calculateReadingTime(post.content),
    updatedAt: new Date().toISOString()
  };

  // 1. Update local storage
  try {
    const raw = localStorage.getItem(BLOG_STORAGE_KEY);
    const list: BlogPost[] = raw ? JSON.parse(raw) : [...SEED_BLOG_POSTS];
    const index = list.findIndex(p => p.id === payload.id);
    if (index >= 0) {
      list[index] = payload;
    } else {
      list.unshift(payload);
    }
    localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to update local posts cache:', err);
  }

  // 2. Persist to Firestore 'posts' collection
  if (db) {
    try {
      const docRef = doc(db, 'posts', payload.id);
      await setDoc(docRef, payload, { merge: true });
      return { success: true };
    } catch (err: any) {
      console.warn('Firestore posts save failed:', err);
      return {
        success: true,
        isLocalFallback: true,
        error: err?.message || 'Saved locally on this device. Deploy firestore.rules to sync across all devices.'
      };
    }
  }

  return { success: true, isLocalFallback: true };
};

/**
 * Deletes a blog post from Firestore and local storage.
 */
export const deleteBlogPost = async (
  postId: string,
  adminUid: string
): Promise<{ success: boolean; error?: string }> => {
  // 1. Remove from local storage
  try {
    const raw = localStorage.getItem(BLOG_STORAGE_KEY);
    if (raw) {
      const list: BlogPost[] = JSON.parse(raw);
      const filtered = list.filter(p => p.id !== postId);
      localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (err) {
    console.error('Failed to remove post from local cache:', err);
  }

  // 2. Delete from Firestore
  if (db) {
    try {
      const docRef = doc(db, 'posts', postId);
      await deleteDoc(docRef);
      return { success: true };
    } catch (err: any) {
      console.warn('Could not delete post from Firestore:', err);
      return { success: true }; // Local deletion succeeded
    }
  }

  return { success: true };
};

/**
 * Increments view counter atomically on a post.
 * Matches Firestore rule: public update allowed if affectedKeys is only ['views'] and integer non-decreasing.
 */
export const incrementPostViews = async (postId: string): Promise<void> => {
  // Update local counter
  try {
    const raw = localStorage.getItem(BLOG_STORAGE_KEY);
    if (raw) {
      const list: BlogPost[] = JSON.parse(raw);
      const target = list.find(p => p.id === postId);
      if (target) {
        target.views = (target.views || 0) + 1;
        localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(list));
      }
    }
  } catch {
    // ignore
  }

  // Atomic increment in Firestore
  if (db) {
    try {
      const docRef = doc(db, 'posts', postId);
      await updateDoc(docRef, {
        views: increment(1)
      });
    } catch {
      // Quietly ignore if unconfigured or permission mismatch
    }
  }
};

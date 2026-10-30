import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  increment, 
  onSnapshot 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initFirestoreIfConfigured, getFirebaseApp } from './storageService';
import { BlogPost } from '../types/blog';
import { isValidDateString } from '../utils/dateUtils';
import { 
  auditAndRepairBlogPost, 
  auditAllBlogPosts, 
  GlobalAuditReport 
} from '../utils/thumbnailUtils';

const BLOG_STORAGE_KEY = 'isezerano_blog_posts';
const BLOG_INITIALIZED_KEY = 'isezerano_blog_initialized';

// Curated starter pedagogical blog posts about GS GITUMBA & Rwanda CBC
export const SEED_BLOG_POSTS: BlogPost[] = [
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
    views: 0,
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
    views: 0,
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
    views: 0,
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
 * Syncs post change to local disk cache via dev server endpoint if accessible.
 */
const syncToDiskEndpoint = async (action: 'save' | 'delete', post?: BlogPost, postId?: string) => {
  try {
    await fetch('/api/sync-blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, post, postId })
    });
  } catch {
    // Non-fatal if offline or production build
  }
};

/**
 * Real-time subscription to blog posts in Firestore.
 * Automatically synchronizes changes (creates, edits, deletions) across all connected devices in real-time.
 * Returns an unsubscribe cleanup function.
 */
export const subscribeToBlogPosts = (
  callback: (posts: BlogPost[]) => void,
  includeDrafts: boolean = false
): (() => void) => {
  const db = initFirestoreIfConfigured();

  if (!db) {
    getBlogPosts(includeDrafts).then(callback);
    return () => {};
  }

  try {
    const postsCol = collection(db, 'posts');
    const unsubscribe = onSnapshot(
      postsCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const remotePosts: BlogPost[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as BlogPost;
            remotePosts.push({
              ...data,
              id: docSnap.id,
              views: typeof data.views === 'number' ? data.views : 0
            });
          });

          // Sort chronologically by publication or update timestamp
          remotePosts.sort((a, b) => {
            const timeA = isValidDateString(a.publishedAt) 
              ? new Date(a.publishedAt).getTime() 
              : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
            const timeB = isValidDateString(b.publishedAt) 
              ? new Date(b.publishedAt).getTime() 
              : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
            return timeB - timeA;
          });

          // Mirror authoritative Firestore state into localStorage
          try {
            localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(remotePosts));
            localStorage.setItem(BLOG_INITIALIZED_KEY, 'true');
          } catch {
            // ignore
          }

          const filtered = includeDrafts 
            ? remotePosts 
            : remotePosts.filter(p => p.status === 'published');

          callback(filtered);
        } else {
          // Firestore is empty
          const isInitialized = typeof localStorage !== 'undefined' && localStorage.getItem(BLOG_INITIALIZED_KEY) === 'true';
          if (isInitialized) {
            // All posts were deleted from Firestore
            try {
              localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify([]));
            } catch {}
            callback([]);
          } else {
            // Database not yet seeded, show starter posts
            let localPosts: BlogPost[] = [];
            try {
              const raw = localStorage.getItem(BLOG_STORAGE_KEY);
              if (raw) localPosts = JSON.parse(raw);
            } catch {}
            if (localPosts.length === 0) {
              localPosts = [...SEED_BLOG_POSTS];
            }
            const filtered = includeDrafts 
              ? localPosts 
              : localPosts.filter(p => p.status === 'published');
            callback(filtered);
          }
        }
      },
      (error) => {
        console.warn('Firestore blog subscription error, using local cache:', error);
        getBlogPosts(includeDrafts).then(callback);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to establish Firestore blog subscription:', err);
    getBlogPosts(includeDrafts).then(callback);
    return () => {};
  }
};

/**
 * Real-time subscription to a single post by slug or ID.
 * Returns unsubscribe cleanup function.
 */
export const subscribeToBlogPost = (
  slugOrId: string,
  callback: (post: BlogPost | null) => void,
  includeDraft: boolean = false
): (() => void) => {
  return subscribeToBlogPosts((allPosts) => {
    const found = allPosts.find(p => p.slug === slugOrId || p.id === slugOrId);
    if (!found) {
      callback(null);
      return;
    }
    if (!includeDraft && found.status !== 'published') {
      callback(null);
      return;
    }
    callback(found);
  }, includeDraft);
};

/**
 * Fetches all blog posts once from Firestore (authoritative).
 */
export const getBlogPosts = async (includeDrafts: boolean = false): Promise<BlogPost[]> => {
  const db = initFirestoreIfConfigured();

  if (db) {
    try {
      const postsCol = collection(db, 'posts');
      const snap = await getDocs(postsCol);

      if (!snap.empty) {
        const remotePosts: BlogPost[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as BlogPost;
          remotePosts.push({
            ...data,
            id: docSnap.id,
            views: typeof data.views === 'number' ? data.views : 0
          });
        });

        remotePosts.sort((a, b) => {
          const timeA = isValidDateString(a.publishedAt) 
            ? new Date(a.publishedAt).getTime() 
            : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
          const timeB = isValidDateString(b.publishedAt) 
            ? new Date(b.publishedAt).getTime() 
            : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
          return timeB - timeA;
        });

        try {
          localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(remotePosts));
          localStorage.setItem(BLOG_INITIALIZED_KEY, 'true');
        } catch {}

        return includeDrafts 
          ? remotePosts 
          : remotePosts.filter(p => p.status === 'published');
      } else {
        const isInitialized = typeof localStorage !== 'undefined' && localStorage.getItem(BLOG_INITIALIZED_KEY) === 'true';
        if (isInitialized) {
          return [];
        }
      }
    } catch (err) {
      console.warn('Could not read posts from Firestore:', err);
    }
  }

  // Fallback to local storage if Firestore network fails
  let localPosts: BlogPost[] = [];
  try {
    const raw = localStorage.getItem(BLOG_STORAGE_KEY);
    if (raw) localPosts = JSON.parse(raw);
  } catch {}

  const isInitialized = typeof localStorage !== 'undefined' && localStorage.getItem(BLOG_INITIALIZED_KEY) === 'true';
  if (localPosts.length === 0 && !isInitialized) {
    localPosts = [...SEED_BLOG_POSTS];
  }

  return includeDrafts 
    ? localPosts 
    : localPosts.filter(p => p.status === 'published');
};

/**
 * Fetches a single blog post by its SEO slug or ID.
 */
export const getBlogPostBySlug = async (slugOrId: string, includeDraft: boolean = false): Promise<BlogPost | null> => {
  const allPosts = await getBlogPosts(true);
  const found = allPosts.find(p => p.slug === slugOrId || p.id === slugOrId);

  if (!found) return null;
  if (!includeDraft && found.status !== 'published') {
    return null;
  }
  return found;
};

/**
 * Seeds initial baseline posts to Firestore if the collection is empty.
 * Restricted to authorized administrator.
 */
export const seedInitialPostsToFirestore = async (
  adminUid: string
): Promise<{ success: boolean; count: number; error?: string }> => {
  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, count: 0, error: 'Database connection is not available.' };
  }

  try {
    let count = 0;
    for (const post of SEED_BLOG_POSTS) {
      const docRef = doc(db, 'posts', post.id);
      const existing = await getDoc(docRef);
      if (!existing.exists()) {
        await setDoc(docRef, {
          ...post,
          views: 0,
          updatedAt: new Date().toISOString()
        });
        count++;
      }
    }
    try {
      localStorage.setItem(BLOG_INITIALIZED_KEY, 'true');
    } catch {}
    return { success: true, count };
  } catch (err: any) {
    console.error('Failed to seed posts to Firestore:', err);
    return { success: false, count: 0, error: err?.message };
  }
};

/**
 * Saves or updates a blog post in Firestore 'posts' collection and synchronizes state.
 * Strictly checks permissions and returns real success/error after Firestore confirms write.
 */
export const saveBlogPost = async (
  post: BlogPost,
  adminUid: string
): Promise<{ success: boolean; post?: BlogPost; error?: string }> => {
  const db = initFirestoreIfConfigured();

  if (!db) {
    return {
      success: false,
      error: 'Firestore database is not connected. Please verify Firebase connection.'
    };
  }

  // Validate required title
  if (!post.title || !post.title.trim()) {
    return { success: false, error: 'Article title cannot be empty.' };
  }

  // Determine publication date accurately:
  // - If first published: set current ISO timestamp.
  // - If already published: preserve original publishedAt unchanged.
  // - If draft: keep empty or existing.
  let resolvedPublishedAt = post.publishedAt;
  if (post.status === 'published') {
    if (!isValidDateString(resolvedPublishedAt)) {
      resolvedPublishedAt = new Date().toISOString();
    }
  } else {
    if (!resolvedPublishedAt) {
      resolvedPublishedAt = '';
    }
  }

  const rawPayload: BlogPost = {
    ...post,
    title: post.title.trim(),
    slug: post.slug ? generateSlug(post.slug) : generateSlug(post.title),
    readTimeMinutes: calculateReadingTime(post.content || ''),
    publishedAt: resolvedPublishedAt,
    updatedAt: new Date().toISOString(),
    views: typeof post.views === 'number' ? post.views : 0
  };

  // Run automatic thumbnail audit and resolution upgrade before persisting
  const { repairedPost } = auditAndRepairBlogPost(rawPayload);
  const payload = repairedPost;

  // 1. Await Firestore setDoc write
  try {
    const docRef = doc(db, 'posts', payload.id);
    await setDoc(docRef, payload, { merge: true });
  } catch (err: any) {
    console.error('Firestore saveBlogPost failed:', err);
    return {
      success: false,
      error: err?.message || 'Failed to save post to Firestore. Ensure you are signed in as authorized administrator.'
    };
  }

  try {
    localStorage.setItem(BLOG_INITIALIZED_KEY, 'true');
  } catch {}

  // 2. Sync to disk for crawler prerendering
  syncToDiskEndpoint('save', payload);

  return { success: true, post: payload };
};

/**
 * Audits every blog post in Firestore:
 * - Checks thumbnail validity and accessibility
 * - Upgrades Blogger/Google low-resolution URLs to /s1600/
 * - Extracts images from content if thumbnail is missing
 * - Assigns safe category-specific fallbacks and flags for review if no image exists
 * - Persists repairs directly to Firestore and synchronizes disk prerender cache
 */
export const auditAndRepairAllFirestoreBlogPosts = async (
  adminUid: string
): Promise<{ success: boolean; report?: GlobalAuditReport; error?: string }> => {
  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Firestore database is not connected.' };
  }

  try {
    const postsCol = collection(db, 'posts');
    const snap = await getDocs(postsCol);
    const remotePosts: BlogPost[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as BlogPost;
      remotePosts.push({
        ...data,
        id: docSnap.id,
        views: typeof data.views === 'number' ? data.views : 0
      });
    });

    const report = auditAllBlogPosts(remotePosts);

    // Save repaired posts back to Firestore
    for (const result of report.results) {
      if (result.wasModified || !result.repairedPost.thumbnailAuditStatus) {
        const docRef = doc(db, 'posts', result.repairedPost.id);
        await setDoc(docRef, {
          ...result.repairedPost,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        await syncToDiskEndpoint('save', result.repairedPost);
      }
    }

    return { success: true, report };
  } catch (err: any) {
    console.error('Audit failed:', err);
    return { success: false, error: err?.message || 'Failed to complete audit.' };
  }
};

/**
 * Deletes a blog post from Firestore and synchronizes all connected devices via onSnapshot.
 */
export const deleteBlogPost = async (
  postId: string,
  adminUid: string
): Promise<{ success: boolean; error?: string }> => {
  const db = initFirestoreIfConfigured();

  if (!db) {
    return {
      success: false,
      error: 'Firestore database is not connected.'
    };
  }

  // 1. Await Firestore deleteDoc
  try {
    const docRef = doc(db, 'posts', postId);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.error('Could not delete post from Firestore:', err);
    return {
      success: false,
      error: err?.message || 'Failed to delete post from Firestore. Ensure you are signed in as administrator.'
    };
  }

  // 2. Sync deletion to disk
  syncToDiskEndpoint('delete', undefined, postId);

  return { success: true };
};

/**
 * Increments view counter atomically on a post in Firestore.
 * Matches Firestore rule: public update allowed if affectedKeys is only ['views'] and integer non-decreasing.
 * Returns the latest view count.
 */
export const incrementPostViews = async (postId: string): Promise<number | null> => {
  const db = initFirestoreIfConfigured();

  if (db) {
    try {
      const docRef = doc(db, 'posts', postId);
      await updateDoc(docRef, {
        views: increment(1)
      });

      const updatedSnap = await getDoc(docRef);
      if (updatedSnap.exists()) {
        const freshViews = updatedSnap.data()?.views || 1;
        updateLocalPostViews(postId, freshViews);
        return freshViews;
      }
    } catch (err) {
      console.warn('Firestore view counter update failed:', err);
    }
  }

  // Local fallback counter
  return updateLocalPostViews(postId);
};

const updateLocalPostViews = (postId: string, explicitCount?: number): number => {
  let finalCount = explicitCount ?? 1;
  try {
    const raw = localStorage.getItem(BLOG_STORAGE_KEY);
    if (raw) {
      const list: BlogPost[] = JSON.parse(raw);
      const target = list.find(p => p.id === postId);
      if (target) {
        if (typeof explicitCount === 'number') {
          target.views = explicitCount;
        } else {
          target.views = (target.views || 0) + 1;
        }
        finalCount = target.views;
        localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(list));
      }
    }
  } catch {
    // ignore
  }
  return finalCount;
};

/**
 * Uploads a blog post thumbnail image to Firebase Storage (bucket: isezerano-news.firebasestorage.app)
 * Path: posts/thumb_{timestamp}_{random}.{ext}
 * Returns permanent, stable, publicly accessible HTTPS download URL.
 */
export const uploadBlogPostThumbnail = async (
  file: File,
  adminUid: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  // Validate file
  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'File must be an image (JPEG, PNG, WebP, etc.).' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'Image size cannot exceed 10 MB.' };
  }

  const app = getFirebaseApp();
  if (!app) {
    return { success: false, error: 'Firebase connection is not available.' };
  }

  try {
    const bucketName = 'isezerano-news.firebasestorage.app';
    const storage = getStorage(app, `gs://${bucketName}`);
    const rawExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanExt = rawExt === 'jpeg' ? 'jpg' : rawExt;
    const cleanName = file.name.replace(/[^\w.-]/g, '_');
    const storagePath = `posts/thumb_${Date.now()}_${cleanName}.${cleanExt}`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType: file.type || `image/${cleanExt}`,
      customMetadata: {
        uploadedBy: adminUid,
        uploadedAt: new Date().toISOString(),
        originalName: file.name
      }
    };

    const uploadResult = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    return { success: true, url: downloadUrl };
  } catch (err: any) {
    console.error('Failed to upload thumbnail to Firebase Storage:', err);
    return { success: false, error: err?.message || 'Failed to upload image to Firebase Storage.' };
  }
};

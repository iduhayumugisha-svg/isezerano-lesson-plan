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
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { initFirestoreIfConfigured, getFirebaseApp, getFirebaseConfig } from './storageService';
import { BlogPost } from '../types/blog';
import { isValidDateString } from '../utils/dateUtils';
import { 
  auditAndRepairBlogPost, 
  auditAllBlogPosts, 
  GlobalAuditReport 
} from '../utils/thumbnailUtils';

const BLOG_STORAGE_KEY = 'isezerano_blog_posts';
const BLOG_INITIALIZED_KEY = 'isezerano_blog_initialized';

// Old blog posts have been permanently removed
export const SEED_BLOG_POSTS: BlogPost[] = [];

/**
 * Purges all cached blog posts from localStorage.
 */
export const purgeLocalBlogPosts = (): void => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(BLOG_STORAGE_KEY);
      localStorage.removeItem('isezerano_blog_posts_v1');
      localStorage.removeItem(BLOG_INITIALIZED_KEY);
      localStorage.removeItem('isezerano_blog_initialized_v1');
    }
  } catch {}
};

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
 * Optimizes an image before upload (max width/height 1600px, 0.88 quality JPEG/PNG/WebP)
 * Ensures smooth, reliable uploads even from mobile phones with high-megapixel cameras.
 */
export const optimizeThumbnailFile = (file: File, maxDimension = 1600): Promise<{ blob: Blob | File; contentType: string; ext: string }> => {
  return new Promise((resolve) => {
    // If not running in browser or SVG, return as is
    if (typeof window === 'undefined' || typeof document === 'undefined' || file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      resolve({ blob: file, contentType: file.type || 'image/jpeg', ext });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            resolve({ blob: file, contentType: file.type || 'image/jpeg', ext });
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          const outputType = isPng ? 'image/png' : 'image/jpeg';
          const ext = isPng ? 'png' : 'jpg';

          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                resolve({ blob, contentType: outputType, ext });
              } else {
                resolve({ blob: file, contentType: file.type || outputType, ext });
              }
            },
            outputType,
            isPng ? undefined : 0.88
          );
        } catch {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          resolve({ blob: file, contentType: file.type || 'image/jpeg', ext });
        }
      };
      img.onerror = () => {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        resolve({ blob: file, contentType: file.type || 'image/jpeg', ext });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      resolve({ blob: file, contentType: file.type || 'image/jpeg', ext });
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads a blog post thumbnail image to Firebase Storage (bucket: isezerano-news.firebasestorage.app)
 * Path: posts/thumb_{timestamp}_{random}_{basename}.{ext}
 * Returns permanent, stable, publicly accessible HTTPS download URL.
 * Emits real progress (0-100%) based strictly on Firebase uploadTask state_changed events.
 */
export const uploadBlogPostThumbnail = async (
  file: File,
  adminUid: string,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; url?: string; error?: string }> => {
  // 1. Validate file format and size
  if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
    return { success: false, error: 'File must be a valid image (JPEG, PNG, WebP, etc.).' };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { success: false, error: 'Original image size cannot exceed 20 MB.' };
  }

  const app = getFirebaseApp();
  if (!app) {
    return { success: false, error: 'Firebase connection is not available.' };
  }

  try {
    // 2. Prepare optimized image
    const { blob, contentType, ext } = await optimizeThumbnailFile(file);

    // 3. Configure storage bucket and reference
    const config = getFirebaseConfig();
    const bucketName = config.storageBucket || 'isezerano-news.firebasestorage.app';
    const storage = getStorage(app, `gs://${bucketName}`);

    // Set aggressive retry timeouts so Firebase does not hang for 10 minutes when bucket is unreachable
    try {
      storage.maxUploadRetryTime = 15000;
      storage.maxOperationRetryTime = 15000;
    } catch {
      // ignore
    }

    const cleanBaseName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^\w.-]/g, '_')
      .slice(0, 30);
    const uniqueSalt = Math.random().toString(36).substring(2, 8);
    const storagePath = `posts/thumb_${Date.now()}_${uniqueSalt}_${cleanBaseName}.${ext}`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType,
      customMetadata: {
        uploadedBy: adminUid,
        uploadedAt: new Date().toISOString(),
        originalName: file.name
      }
    };

    // 4. Resumable upload with real state_changed progress and safety timeout
    return new Promise((resolve) => {
      let isSettled = false;
      const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

      // Strict 15-second timeout guard to cancel hanging uploads and report real cause
      const timeoutTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            uploadTask.cancel();
          } catch {
            // ignore
          }
          resolve({
            success: false,
            error: `Firebase Storage upload timed out after 15s. The bucket "${bucketName}" could not be reached. Ensure Storage is enabled in Firebase Console (project: isezerano-news).`
          });
        }
      }, 15000);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            // Real progress calculated directly from Firebase bytesTransferred
            const actualPct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress?.(Math.min(99, actualPct));
          }
        },
        (uploadError: any) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timeoutTimer);

          console.error('Firebase Storage upload error:', uploadError);
          const errorCode = uploadError?.code || '';
          const serverMsg = uploadError?.serverResponse || uploadError?.message || '';
          let userMsg = '';

          if (
            errorCode === 'storage/unknown' || 
            uploadError?.status_ === 404 || 
            serverMsg.includes('404') || 
            serverMsg.includes('Not Found') ||
            serverMsg.includes('NoSuchBucket')
          ) {
            userMsg = `Firebase Cloud Storage bucket "${bucketName}" not found (404). In Firebase Console for project "isezerano-news", please go to Build → Storage and click "Get started" to activate Cloud Storage.`;
          } else if (errorCode === 'storage/unauthorized') {
            userMsg = 'Upload permission denied (storage/unauthorized). Please ensure you are signed in as an administrator in the admin portal and storage.rules are deployed.';
          } else if (errorCode === 'storage/canceled') {
            userMsg = `Firebase Storage upload timed out after 15s. Bucket "${bucketName}" may not be active or internet connection was interrupted.`;
          } else if (errorCode === 'storage/retry-limit-exceeded') {
            userMsg = `Upload timed out. Firebase Storage bucket "${bucketName}" could not be reached.`;
          } else {
            userMsg = uploadError?.message 
              ? `Firebase Storage error (${errorCode || 'unknown'}): ${uploadError.message}` 
              : 'Failed to upload image to Firebase Storage.';
          }

          resolve({ success: false, error: userMsg });
        },
        async () => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timeoutTimer);

          try {
            onProgress?.(100);
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ success: true, url: downloadUrl });
          } catch (urlErr: any) {
            console.error('Failed to get download URL from uploaded ref:', urlErr);
            resolve({ 
              success: false, 
              error: urlErr?.message || 'Image uploaded but download URL could not be retrieved from Firebase Storage.' 
            });
          }
        }
      );
    });
  } catch (err: any) {
    console.error('Failed to upload thumbnail to Firebase Storage:', err);
    return { success: false, error: err?.message || 'Failed to upload image to Firebase Storage.' };
  }
};

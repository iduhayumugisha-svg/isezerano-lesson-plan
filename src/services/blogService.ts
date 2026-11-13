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
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  initFirestoreIfConfigured,
  getFirebaseApp,
  getFirebaseConfig,
  getFirebaseAuth
} from './storageService';
import { isAuthorizedAdminEmail } from './authService';
import { BlogImageUploadResult, BlogPost } from '../types/blog';
import { isValidDateString } from '../utils/dateUtils';
import {
  estimateUtf8Bytes,
  extractPlainTextExcerpt,
  sanitizePostThumbnail
} from '../utils/thumbnailUtils';

// Old blog posts have been permanently removed; never seed sample articles.
export const SEED_BLOG_POSTS: BlogPost[] = [];

// Firestore document max size is 1,048,576 bytes. Keep a safe ceiling below 1 MiB.
export const MAX_FIRESTORE_POST_BYTES = 940_000;
export const MAX_EMBEDDED_THUMBNAIL_BYTES = 380_000;
export const MAX_EMBEDDED_INLINE_IMAGE_BYTES = 200_000;

// Session cache when Firebase Storage bucket is confirmed unprovisioned (404)
// so admin uploads never stall waiting repeatedly on 404.
let storageBucketKnownUnavailable = false;

/**
 * Purges any legacy cached blog posts from localStorage.
 */
export const purgeLocalBlogPosts = (): void => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('isezerano_blog_posts');
      localStorage.removeItem('isezerano_blog_posts_v1');
      localStorage.removeItem('isezerano_blog_initialized');
      localStorage.removeItem('isezerano_blog_initialized_v1');
    }
  } catch {
    // ignore
  }
};

/**
 * Generates an SEO-friendly URL slug from an article title.
 */
export const generateSlug = (title: string): string => {
  const cleaned = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `article-${Date.now()}`;
};

/**
 * Calculates estimated reading time in minutes from HTML content.
 */
export const calculateReadingTime = (content: string): number => {
  const plainText = content.replace(/<[^>]*>/g, ' ');
  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const sortPostsChronologically = (posts: BlogPost[]): BlogPost[] => {
  return [...posts].sort((a, b) => {
    const timeA = isValidDateString(a.publishedAt)
      ? new Date(a.publishedAt).getTime()
      : a.updatedAt && isValidDateString(a.updatedAt)
      ? new Date(a.updatedAt).getTime()
      : 0;
    const timeB = isValidDateString(b.publishedAt)
      ? new Date(b.publishedAt).getTime()
      : b.updatedAt && isValidDateString(b.updatedAt)
      ? new Date(b.updatedAt).getTime()
      : 0;
    return timeB - timeA;
  });
};

/**
 * Verifies that the currently signed-in Firebase user is the authorized admin.
 */
const verifyCurrentAdminAuth = (): { ok: boolean; email?: string; uid?: string; error?: string } => {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    return {
      ok: false,
      error: 'Administrator authentication is required. Please sign in with twizerefelix90@gmail.com.'
    };
  }
  if (!isAuthorizedAdminEmail(currentUser.email)) {
    return {
      ok: false,
      error: `Access denied for ${currentUser.email || 'this account'}. Only twizerefelix90@gmail.com can manage Blog articles.`
    };
  }
  return {
    ok: true,
    email: currentUser.email || undefined,
    uid: currentUser.uid
  };
};

/**
 * Real-time subscription to blog posts stored in Cloud Firestore `/posts`.
 * Authoritative across page refreshes, browsers, and devices (never reads stale localStorage).
 */
export const subscribeToBlogPosts = (
  callback: (posts: BlogPost[]) => void,
  includeDrafts: boolean = false
): (() => void) => {
  purgeLocalBlogPosts();
  const db = initFirestoreIfConfigured();

  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const postsCol = collection(db, 'posts');
    const unsubscribe = onSnapshot(
      postsCol,
      (snapshot) => {
        const remotePosts: BlogPost[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as BlogPost;
          remotePosts.push({
            ...data,
            id: docSnap.id,
            views: typeof data.views === 'number' ? data.views : 0
          });
        });

        const sorted = sortPostsChronologically(remotePosts);
        const filtered = includeDrafts
          ? sorted
          : sorted.filter((p) => p.status === 'published');
        callback(filtered);
      },
      (error) => {
        console.warn('Firestore blog subscription error:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to attach Firestore blog subscription:', err);
    callback([]);
    return () => {};
  }
};

/**
 * Real-time subscription to a single post by slug or ID from Cloud Firestore.
 */
export const subscribeToBlogPost = (
  slugOrId: string,
  callback: (post: BlogPost | null) => void,
  includeDraft: boolean = false
): (() => void) => {
  return subscribeToBlogPosts((allPosts) => {
    const found = allPosts.find((p) => p.slug === slugOrId || p.id === slugOrId);
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
 * Fetches blog posts once from Cloud Firestore (authoritative).
 */
export const getBlogPosts = async (includeDrafts: boolean = false): Promise<BlogPost[]> => {
  purgeLocalBlogPosts();
  const db = initFirestoreIfConfigured();
  if (!db) return [];

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

    const sorted = sortPostsChronologically(remotePosts);
    return includeDrafts ? sorted : sorted.filter((p) => p.status === 'published');
  } catch (err) {
    console.warn('Could not read posts from Firestore:', err);
    return [];
  }
};

/**
 * Fetches a single blog post by slug or ID from Cloud Firestore.
 */
export const getBlogPostBySlug = async (
  slugOrId: string,
  includeDraft: boolean = false
): Promise<BlogPost | null> => {
  const allPosts = await getBlogPosts(true);
  const found = allPosts.find((p) => p.slug === slugOrId || p.id === slugOrId);
  if (!found) return null;
  if (!includeDraft && found.status !== 'published') return null;
  return found;
};

/**
 * Ensures the article's URL slug is unique across existing Firestore posts.
 */
export const ensureUniqueSlug = (
  candidateSlug: string,
  currentPostId: string,
  existingPosts: Array<{ id: string; slug: string }>
): string => {
  const base = generateSlug(candidateSlug);
  const taken = new Set(
    existingPosts
      .filter((p) => p.id !== currentPostId)
      .map((p) => p.slug.toLowerCase())
  );

  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix++;
  }
  return `${base}-${suffix}`;
};

/**
 * Validates and prepares a BlogPost payload before persisting to Firestore.
 * Pure helper usable both at runtime and in unit tests.
 */
export const prepareBlogPostPayload = (
  post: BlogPost,
  existingPosts: Array<{ id: string; slug: string }> = []
): { ok: true; post: BlogPost; payloadBytes: number } | { ok: false; error: string } => {
  if (!post.title || !post.title.trim()) {
    return { ok: false, error: 'Article title is required.' };
  }

  const sanitized = sanitizePostThumbnail(post);

  const contentText = extractPlainTextExcerpt(sanitized.content || '', 500);
  if (!contentText) {
    return { ok: false, error: 'Article content cannot be empty.' };
  }

  let resolvedPublishedAt = sanitized.publishedAt || '';
  if (sanitized.status === 'published' && !isValidDateString(resolvedPublishedAt)) {
    resolvedPublishedAt = new Date().toISOString();
  }

  const uniqueSlug = ensureUniqueSlug(
    sanitized.slug || sanitized.title,
    sanitized.id,
    existingPosts
  );

  const payload: BlogPost = {
    ...sanitized,
    id: sanitized.id || `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: sanitized.title.trim(),
    slug: uniqueSlug,
    excerpt: (sanitized.excerpt || '').trim() || extractPlainTextExcerpt(sanitized.content, 160),
    category: sanitized.category || 'School News',
    author: {
      name: sanitized.author?.name?.trim() || 'GS GITUMBA Editorial',
      role: sanitized.author?.role?.trim() || 'Administrator',
      ...(sanitized.author?.email ? { email: sanitized.author.email } : {})
    },
    readTimeMinutes: calculateReadingTime(sanitized.content || ''),
    publishedAt: resolvedPublishedAt,
    updatedAt: new Date().toISOString(),
    views: typeof sanitized.views === 'number' && sanitized.views >= 0 ? sanitized.views : 0
  };

  const payloadBytes = estimateUtf8Bytes(payload);
  if (payloadBytes > MAX_FIRESTORE_POST_BYTES) {
    const kb = Math.round(payloadBytes / 1024);
    const maxKb = Math.round(MAX_FIRESTORE_POST_BYTES / 1024);
    return {
      ok: false,
      error: `Article size (${kb} KB) exceeds Firestore's safe single-document ceiling (${maxKb} KB). Reduce the number of embedded images inside the article body.`
    };
  }

  return { ok: true, post: payload, payloadBytes };
};

/**
 * Creates or updates a blog post directly in Cloud Firestore `/posts/{postId}`.
 * Strictly restricted to verified Admin twizerefelix90@gmail.com.
 */
export const saveBlogPost = async (
  post: BlogPost,
  _adminUid?: string
): Promise<{ success: boolean; post?: BlogPost; error?: string }> => {
  const adminCheck = verifyCurrentAdminAuth();
  if (!adminCheck.ok) {
    return { success: false, error: adminCheck.error };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return {
      success: false,
      error: 'Cloud Firestore is not connected. Check Firebase configuration.'
    };
  }

  let existingPosts: Array<{ id: string; slug: string }> = [];
  try {
    const snap = await getDocs(collection(db, 'posts'));
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Partial<BlogPost>;
      existingPosts.push({ id: docSnap.id, slug: data.slug || docSnap.id });
    });
  } catch {
    // Non-fatal if collection read fails; preparation still validates payload
  }

  const prepared = prepareBlogPostPayload(post, existingPosts);
  if (!prepared.ok) {
    return { success: false, error: prepared.error };
  }

  try {
    const docRef = doc(db, 'posts', prepared.post.id);
    await setDoc(docRef, prepared.post, { merge: true });
    purgeLocalBlogPosts();
    return { success: true, post: prepared.post };
  } catch (err: unknown) {
    console.error('Firestore saveBlogPost failed:', err);
    const msg =
      err instanceof Error
        ? err.message
        : 'Failed to save article to Cloud Firestore. Ensure you are signed in as twizerefelix90@gmail.com.';
    return { success: false, error: msg };
  }
};

/**
 * Updates only publication status ('published' or 'draft') on an existing post.
 */
export const setBlogPostPublicationStatus = async (
  post: BlogPost,
  targetStatus: 'published' | 'draft'
): Promise<{ success: boolean; post?: BlogPost; error?: string }> => {
  const updated: BlogPost = {
    ...post,
    status: targetStatus,
    publishedAt:
      targetStatus === 'published'
        ? isValidDateString(post.publishedAt)
          ? post.publishedAt
          : new Date().toISOString()
        : post.publishedAt || '',
    updatedAt: new Date().toISOString()
  };

  return saveBlogPost(updated);
};

/**
 * Permanently deletes a blog post from Cloud Firestore `/posts/{postId}`.
 * Strictly restricted to verified Admin twizerefelix90@gmail.com.
 */
export const deleteBlogPost = async (
  postId: string,
  _adminUid?: string
): Promise<{ success: boolean; error?: string }> => {
  const adminCheck = verifyCurrentAdminAuth();
  if (!adminCheck.ok) {
    return { success: false, error: adminCheck.error };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not connected.' };
  }

  try {
    await deleteDoc(doc(db, 'posts', postId));
    purgeLocalBlogPosts();
    return { success: true };
  } catch (err: unknown) {
    console.error('Could not delete post from Firestore:', err);
    const msg =
      err instanceof Error
        ? err.message
        : 'Failed to delete article from Cloud Firestore.';
    return { success: false, error: msg };
  }
};

/**
 * Atomically increments the public view counter (+1) on a published post in Firestore.
 * Matches firestore.rules rule requiring affectedKeys().hasOnly(['views']) and +1 delta.
 */
export const incrementPostViews = async (postId: string): Promise<number | null> => {
  const db = initFirestoreIfConfigured();
  if (!db || !postId) return null;

  try {
    const docRef = doc(db, 'posts', postId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const currentViews = snap.data()?.views;
    if (typeof currentViews !== 'number') {
      await updateDoc(docRef, { views: 1 });
      return 1;
    }

    await updateDoc(docRef, { views: increment(1) });
    return currentViews + 1;
  } catch (err) {
    console.warn('Firestore view counter update skipped:', err);
    return null;
  }
};

/**
 * Loads an image File into an HTMLImageElement cleanly for canvas compression.
 */
const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not decode the selected image file.'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read the selected image file from device.'));
    reader.readAsDataURL(file);
  });
};

/**
 * Adaptively compresses an image via <canvas> into a persistent Data URI guaranteed to stay <= targetMaxBytes.
 */
export const compressImageToPersistentDataUri = async (
  file: File,
  targetMaxBytes: number = MAX_EMBEDDED_THUMBNAIL_BYTES
): Promise<{ dataUri: string; byteSize: number }> => {
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    const svgUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read SVG file.'));
      reader.readAsDataURL(file);
    });
    const bytes = estimateUtf8Bytes(svgUri);
    if (bytes > targetMaxBytes) {
      throw new Error(
        `SVG image (${Math.round(bytes / 1024)} KB) exceeds the ${Math.round(targetMaxBytes / 1024)} KB Firestore budget.`
      );
    }
    return { dataUri: svgUri, byteSize: bytes };
  }

  const img = await loadImageFromFile(file);
  const dimensionSteps = [1080, 900, 720, 560, 420];
  const qualitySteps = [0.84, 0.72, 0.6, 0.48, 0.36];
  const hasTransparency =
    file.type === 'image/png' ||
    file.type === 'image/webp' ||
    /\.(png|webp)$/i.test(file.name);

  let bestUri = '';
  let bestBytes = Infinity;

  for (const maxDim of dimensionSteps) {
    let width = img.naturalWidth || img.width || maxDim;
    let height = img.naturalHeight || img.height || maxDim;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.max(1, Math.round((height * maxDim) / width));
        width = maxDim;
      } else {
        width = Math.max(1, Math.round((width * maxDim) / height));
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser canvas context is unavailable for image optimization.');
    }

    ctx.fillStyle = '#ffffff';
    if (!hasTransparency) {
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Try WebP first (significantly smaller), then JPEG
    const mimeCandidates = hasTransparency
      ? ['image/webp', 'image/jpeg']
      : ['image/jpeg', 'image/webp'];

    for (const mime of mimeCandidates) {
      for (const quality of qualitySteps) {
        const uri = canvas.toDataURL(mime, quality);
        if (!uri.startsWith(`data:${mime}`)) continue;
        const bytes = estimateUtf8Bytes(uri);
        if (bytes < bestBytes) {
          bestBytes = bytes;
          bestUri = uri;
        }
        if (bytes <= targetMaxBytes) {
          return { dataUri: uri, byteSize: bytes };
        }
      }
    }
  }

  if (bestUri && bestBytes <= targetMaxBytes) {
    return { dataUri: bestUri, byteSize: bestBytes };
  }

  throw new Error(
    `Could not compress image under ${Math.round(targetMaxBytes / 1024)} KB while keeping readable quality. Try a different image.`
  );
};

/**
 * Prepares an optimized binary Blob for Firebase Storage upload (when bucket is provisioned).
 */
const optimizeForCloudStorage = async (
  file: File,
  maxDimension: number = 1600
): Promise<{ blob: Blob | File; contentType: string; ext: string }> => {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    file.type === 'image/svg+xml' ||
    file.name.toLowerCase().endsWith('.svg')
  ) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    return { blob: file, contentType: file.type || 'image/jpeg', ext };
  }

  try {
    const img = await loadImageFromFile(file);
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

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
      return { blob: file, contentType: file.type || 'image/jpeg', ext };
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    const outputType = isPng ? 'image/webp' : 'image/jpeg';
    const ext = isPng ? 'webp' : 'jpg';

    return await new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve({ blob, contentType: outputType, ext });
          } else {
            const origExt = file.name.split('.').pop()?.toLowerCase() || ext;
            resolve({ blob: file, contentType: file.type || outputType, ext: origExt });
          }
        },
        outputType,
        0.86
      );
    });
  } catch {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    return { blob: file, contentType: file.type || 'image/jpeg', ext };
  }
};

/**
 * Attempts fast upload to Firebase Cloud Storage; if the bucket is unprovisioned (404 on free Spark plan),
 * automatically compresses the image and returns a persistent Data URI for Firestore storage.
 * Never returns temporary blob: URLs or uses localStorage as permanent storage.
 */
export const uploadAndOptimizeBlogImage = async (
  file: File,
  purpose: 'thumbnail' | 'inline' = 'thumbnail',
  onProgress?: (percent: number, stageText?: string) => void
): Promise<BlogImageUploadResult> => {
  const adminCheck = verifyCurrentAdminAuth();
  if (!adminCheck.ok) {
    return { success: false, error: adminCheck.error };
  }

  const validMime =
    file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);
  if (!validMime) {
    return {
      success: false,
      error: 'Invalid file type. Please choose a JPG, PNG, WebP, GIF, or SVG image.'
    };
  }

  if (file.size > 25 * 1024 * 1024) {
    return {
      success: false,
      error: 'Selected image is larger than 25 MB. Please choose a smaller file.'
    };
  }

  onProgress?.(15, 'Inspecting image...');

  const app = getFirebaseApp();
  const config = getFirebaseConfig();
  const bucketName = config.storageBucket || 'isezerano-news.firebasestorage.app';

  // Step A: Attempt Firebase Storage if not already known to be unprovisioned in this session
  if (app && !storageBucketKnownUnavailable) {
    try {
      onProgress?.(30, 'Checking Firebase Cloud Storage...');
      const { blob, contentType, ext } = await optimizeForCloudStorage(file, 1600);
      const storage = getStorage(app, `gs://${bucketName}`);
      try {
        storage.maxUploadRetryTime = 4500;
        storage.maxOperationRetryTime = 4500;
      } catch {
        // ignore
      }

      const safeName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^\w.-]/g, '_')
        .slice(0, 28);
      const prefix = purpose === 'inline' ? 'inline' : 'thumb';
      const storagePath = `posts/${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeName}.${ext}`;
      const storageRef = ref(storage, storagePath);

      const uploadUrl = await new Promise<string | null>((resolve) => {
        let settled = false;
        const task = uploadBytesResumable(storageRef, blob, {
          contentType,
          customMetadata: {
            uploadedBy: adminCheck.email || adminCheck.uid || 'admin',
            uploadedAt: new Date().toISOString()
          }
        });

        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          try {
            task.cancel();
          } catch {
            // ignore
          }
          storageBucketKnownUnavailable = true;
          resolve(null);
        }, 4500);

        task.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0) {
              const pct = 35 + Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 55);
              onProgress?.(Math.min(90, pct), 'Uploading to Firebase Storage...');
            }
          },
          (err: any) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            const code = err?.code || '';
            const status = err?.status_ || err?.status;
            if (
              code === 'storage/unknown' ||
              code === 'storage/bucket-not-found' ||
              status === 404 ||
              String(err?.message || '').includes('404')
            ) {
              storageBucketKnownUnavailable = true;
            }
            resolve(null);
          },
          async () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try {
              const url = await getDownloadURL(task.snapshot.ref);
              resolve(url);
            } catch {
              resolve(null);
            }
          }
        );
      });

      if (uploadUrl) {
        onProgress?.(100, 'Uploaded to Firebase Storage');
        return {
          success: true,
          url: uploadUrl,
          storageMode: 'firebase_storage',
          byteSize: blob.size
        };
      }
    } catch {
      storageBucketKnownUnavailable = true;
    }
  }

  // Step B: Cloud Firestore persistent embedded compression (Spark free-plan compatible)
  try {
    onProgress?.(65, 'Optimizing image for persistent Cloud Firestore storage...');
    const targetBytes =
      purpose === 'inline' ? MAX_EMBEDDED_INLINE_IMAGE_BYTES : MAX_EMBEDDED_THUMBNAIL_BYTES;
    const { dataUri, byteSize } = await compressImageToPersistentDataUri(file, targetBytes);
    onProgress?.(100, 'Ready for Cloud Firestore');
    return {
      success: true,
      url: dataUri,
      storageMode: 'firestore_embedded',
      byteSize,
      fallbackNotice: `Firebase Cloud Storage bucket (${bucketName}) is not provisioned on this Firebase project (404). Image was compressed to ${Math.round(byteSize / 1024)} KB and stored directly inside the Cloud Firestore article document.`
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to prepare image for upload.'
    };
  }
};

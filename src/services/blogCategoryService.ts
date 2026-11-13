import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { initFirestoreIfConfigured, getFirebaseAuth } from './storageService';
import { isAuthorizedAdminEmail } from './authService';
import {
  BlogCategory,
  BlogPost,
  DEFAULT_AI_BLOG_CATEGORIES
} from '../types/blog';

const CATEGORIES_COLLECTION = 'categories';
const CATEGORY_META_DOC = ['siteSettings', 'blog_categories'] as const;

export const generateCategorySlug = (name: string): string => {
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `category-${Date.now()}`;
};

const verifyCurrentAdminAuth = (): { ok: boolean; email?: string; error?: string } => {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    return {
      ok: false,
      error: 'Administrator sign-in is required. Sign in with twizerefelix90@gmail.com.'
    };
  }
  if (!isAuthorizedAdminEmail(currentUser.email)) {
    return {
      ok: false,
      error: `Access denied for ${currentUser.email || 'this account'}. Only twizerefelix90@gmail.com can manage Blog categories.`
    };
  }
  return { ok: true, email: currentUser.email || undefined };
};

/**
 * Pure helper combining Firestore `/categories` docs, initialization state, and any legacy
 * category strings present on existing `/posts` without inventing fake categories.
 */
export const mergeCategoriesForDisplay = (
  firestoreCategories: BlogCategory[],
  isInitialized: boolean,
  posts: Pick<BlogPost, 'category'>[] = []
): BlogCategory[] => {
  const byLowerName = new Map<string, BlogCategory>();

  // 1. Always respect stored Firestore categories first
  for (const cat of firestoreCategories) {
    const cleanName = (cat.name || '').trim();
    if (!cleanName) continue;
    byLowerName.set(cleanName.toLowerCase(), {
      ...cat,
      name: cleanName,
      slug: cat.slug || generateCategorySlug(cleanName),
      description: cat.description || ''
    });
  }

  // 2. Before admin first modifies/initializes categories in Firestore, surface the original AI-created categories
  if (!isInitialized) {
    for (const aiCat of DEFAULT_AI_BLOG_CATEGORIES) {
      const key = aiCat.name.toLowerCase();
      if (!byLowerName.has(key)) {
        byLowerName.set(key, { ...aiCat });
      }
    }
  }

  // 3. Surface any real category names already used on existing articles so none are orphaned
  for (const post of posts) {
    const raw = (post.category || '').trim();
    if (!raw || raw.toLowerCase() === 'all categories' || raw.toLowerCase() === 'uncategorized') {
      continue;
    }
    const key = raw.toLowerCase();
    if (!byLowerName.has(key)) {
      const slug = generateCategorySlug(raw);
      byLowerName.set(key, {
        id: `cat_${slug}`,
        name: raw,
        slug,
        description: '',
        isDefault: DEFAULT_AI_BLOG_CATEGORIES.some((d) => d.name.toLowerCase() === key)
      });
    }
  }

  const defaultOrder = new Map(
    DEFAULT_AI_BLOG_CATEGORIES.map((d, idx) => [d.name.toLowerCase(), idx])
  );

  return Array.from(byLowerName.values()).sort((a, b) => {
    const idxA = defaultOrder.get(a.name.toLowerCase());
    const idxB = defaultOrder.get(b.name.toLowerCase());
    if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
    if (idxA !== undefined) return -1;
    if (idxB !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });
};

/**
 * Fetches categories from Firestore `/categories` + initialization marker `/siteSettings/blog_categories`.
 */
export const getBlogCategories = async (
  postsForDiscovery?: Pick<BlogPost, 'category'>[]
): Promise<{ categories: BlogCategory[]; isInitialized: boolean }> => {
  const db = initFirestoreIfConfigured();
  if (!db) {
    return {
      categories: mergeCategoriesForDisplay([], false, postsForDiscovery || []),
      isInitialized: false
    };
  }

  try {
    const [catSnap, metaSnap] = await Promise.all([
      getDocs(collection(db, CATEGORIES_COLLECTION)),
      getDoc(doc(db, CATEGORY_META_DOC[0], CATEGORY_META_DOC[1]))
    ]);

    const firestoreCats: BlogCategory[] = [];
    catSnap.forEach((docSnap) => {
      const data = docSnap.data() as Partial<BlogCategory>;
      if (data.name && data.name.trim()) {
        firestoreCats.push({
          id: docSnap.id,
          name: data.name.trim(),
          slug: data.slug || generateCategorySlug(data.name),
          description: data.description || '',
          isDefault: Boolean(data.isDefault),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      }
    });

    const isInitialized = Boolean(metaSnap.exists() && metaSnap.data()?.initialized);
    return {
      categories: mergeCategoriesForDisplay(firestoreCats, isInitialized, postsForDiscovery || []),
      isInitialized
    };
  } catch (err) {
    console.warn('Could not fetch blog categories from Firestore:', err);
    return {
      categories: mergeCategoriesForDisplay([], false, postsForDiscovery || []),
      isInitialized: false
    };
  }
};

/**
 * Real-time subscription to `/categories` and `/siteSettings/blog_categories` in Cloud Firestore.
 */
export const subscribeToBlogCategories = (
  callback: (categories: BlogCategory[], isInitialized: boolean) => void
): (() => void) => {
  const db = initFirestoreIfConfigured();
  if (!db) {
    callback(mergeCategoriesForDisplay([], false, []), false);
    return () => {};
  }

  let latestCats: BlogCategory[] = [];
  let isInitialized = false;
  let loadedCats = false;
  let loadedMeta = false;

  const emit = () => {
    if (!loadedCats && !loadedMeta) return;
    callback(mergeCategoriesForDisplay(latestCats, isInitialized, []), isInitialized);
  };

  try {
    const unsubCats = onSnapshot(
      collection(db, CATEGORIES_COLLECTION),
      (snapshot) => {
        const list: BlogCategory[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Partial<BlogCategory>;
          if (data.name && data.name.trim()) {
            list.push({
              id: docSnap.id,
              name: data.name.trim(),
              slug: data.slug || generateCategorySlug(data.name),
              description: data.description || '',
              isDefault: Boolean(data.isDefault),
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          }
        });
        latestCats = list;
        loadedCats = true;
        emit();
      },
      (error) => {
        console.warn('Firestore categories subscription error:', error);
        loadedCats = true;
        emit();
      }
    );

    const unsubMeta = onSnapshot(
      doc(db, CATEGORY_META_DOC[0], CATEGORY_META_DOC[1]),
      (docSnap) => {
        isInitialized = Boolean(docSnap.exists() && docSnap.data()?.initialized);
        loadedMeta = true;
        emit();
      },
      () => {
        loadedMeta = true;
        emit();
      }
    );

    return () => {
      unsubCats();
      unsubMeta();
    };
  } catch (err) {
    console.warn('Failed to subscribe to blog categories:', err);
    callback(mergeCategoriesForDisplay([], false, []), false);
    return () => {};
  }
};

/**
 * Persists the initial AI-created categories (plus any real categories found on existing `/posts`)
 * to Cloud Firestore so subsequent edits or deletions persist permanently across devices.
 */
export const ensureCategoriesInitializedForAdmin = async (
  posts: Pick<BlogPost, 'category'>[] = []
): Promise<{ success: boolean; error?: string }> => {
  const authCheck = verifyCurrentAdminAuth();
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not connected.' };
  }

  try {
    const metaRef = doc(db, CATEGORY_META_DOC[0], CATEGORY_META_DOC[1]);
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists() && metaSnap.data()?.initialized) {
      return { success: true };
    }

    const catSnap = await getDocs(collection(db, CATEGORIES_COLLECTION));
    const existingCats: BlogCategory[] = [];
    catSnap.forEach((docSnap) => {
      const data = docSnap.data() as Partial<BlogCategory>;
      if (data.name) {
        existingCats.push({
          id: docSnap.id,
          name: data.name.trim(),
          slug: data.slug || generateCategorySlug(data.name),
          description: data.description || '',
          isDefault: Boolean(data.isDefault)
        });
      }
    });

    const initialList = mergeCategoriesForDisplay(existingCats, false, posts);
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    for (const cat of initialList) {
      const ref = doc(db, CATEGORIES_COLLECTION, cat.id);
      batch.set(
        ref,
        {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description || '',
          isDefault: Boolean(cat.isDefault),
          createdAt: cat.createdAt || now,
          updatedAt: now
        },
        { merge: true }
      );
    }

    batch.set(
      metaRef,
      {
        initialized: true,
        updatedAt: now,
        updatedBy: authCheck.email || 'admin'
      },
      { merge: true }
    );

    await batch.commit();
    return { success: true };
  } catch (err: unknown) {
    console.error('Failed to initialize blog categories:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to initialize categories in Firestore.'
    };
  }
};

/**
 * Pure helper validating a category input before persisting.
 */
export const validateCategoryInput = (
  name: string,
  existingCategories: BlogCategory[],
  editingCategoryId?: string
): { valid: true; trimmedName: string; slug: string } | { valid: false; error: string } => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { valid: false, error: 'Category name cannot be empty.' };
  }
  if (trimmedName.toLowerCase() === 'all categories') {
    return { valid: false, error: '"All Categories" is reserved for filtering.' };
  }
  if (trimmedName.length > 60) {
    return { valid: false, error: 'Category name must be 60 characters or fewer.' };
  }

  const duplicate = existingCategories.find(
    (c) =>
      c.id !== editingCategoryId &&
      c.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    return { valid: false, error: `A category named "${duplicate.name}" already exists.` };
  }

  return {
    valid: true,
    trimmedName,
    slug: generateCategorySlug(trimmedName)
  };
};

/**
 * Creates a new category or edits an existing category's name/description.
 * When renaming a category, updates all matching `/posts` documents cleanly.
 */
export const saveBlogCategory = async (
  input: {
    id?: string;
    name: string;
    description: string;
    previousName?: string;
    isDefault?: boolean;
  },
  currentCategories: BlogCategory[],
  allPosts: BlogPost[] = []
): Promise<{ success: boolean; category?: BlogCategory; updatedPostsCount?: number; error?: string }> => {
  const authCheck = verifyCurrentAdminAuth();
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  const validation = validateCategoryInput(input.name, currentCategories, input.id);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not connected.' };
  }

  // Ensure AI categories are materialized in Firestore first so all edits/deletes persist
  const initRes = await ensureCategoriesInitializedForAdmin(allPosts);
  if (!initRes.success) {
    return { success: false, error: initRes.error };
  }

  const now = new Date().toISOString();
  const catId = input.id || `cat_${validation.slug}_${Date.now().toString(36).slice(-4)}`;
  const categoryDoc: BlogCategory = {
    id: catId,
    name: validation.trimmedName,
    slug: validation.slug,
    description: (input.description || '').trim(),
    isDefault: Boolean(input.isDefault),
    updatedAt: now
  };

  if (!input.id) {
    categoryDoc.createdAt = now;
  }

  try {
    await setDoc(doc(db, CATEGORIES_COLLECTION, catId), categoryDoc, { merge: true });

    let updatedPostsCount = 0;
    const oldName = (input.previousName || '').trim();
    if (oldName && oldName !== validation.trimmedName) {
      const affected = allPosts.filter(
        (p) => (p.category || '').trim().toLowerCase() === oldName.toLowerCase()
      );
      for (const post of affected) {
        await updateDoc(doc(db, 'posts', post.id), {
          category: validation.trimmedName,
          updatedAt: now
        });
        updatedPostsCount += 1;
      }
    }

    return { success: true, category: categoryDoc, updatedPostsCount };
  } catch (err: unknown) {
    console.error('Failed to save blog category:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save category in Cloud Firestore.'
    };
  }
};

/**
 * Permanently deletes a category from `/categories/{id}` and optionally reassigns articles
 * currently tagged with that category.
 */
export const deleteBlogCategory = async (
  category: BlogCategory,
  allPosts: BlogPost[] = [],
  reassignToCategory?: string
): Promise<{ success: boolean; reassignedCount?: number; error?: string }> => {
  const authCheck = verifyCurrentAdminAuth();
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not connected.' };
  }

  const initRes = await ensureCategoriesInitializedForAdmin(allPosts);
  if (!initRes.success) {
    return { success: false, error: initRes.error };
  }

  try {
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, category.id));

    let reassignedCount = 0;
    const targetCategory = (reassignToCategory || '').trim();
    if (targetCategory && targetCategory.toLowerCase() !== category.name.toLowerCase()) {
      const affected = allPosts.filter(
        (p) => (p.category || '').trim().toLowerCase() === category.name.toLowerCase()
      );
      const now = new Date().toISOString();
      for (const post of affected) {
        await updateDoc(doc(db, 'posts', post.id), {
          category: targetCategory,
          updatedAt: now
        });
        reassignedCount += 1;
      }
    }

    return { success: true, reassignedCount };
  } catch (err: unknown) {
    console.error('Failed to delete blog category:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete category in Cloud Firestore.'
    };
  }
};

/**
 * Updates the category of a single Blog post in Cloud Firestore `/posts/{postId}`.
 */
export const updatePostCategory = async (
  postId: string,
  newCategory: string
): Promise<{ success: boolean; error?: string }> => {
  const authCheck = verifyCurrentAdminAuth();
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  const cleanCat = newCategory.trim();
  if (!cleanCat) {
    return { success: false, error: 'Please select a valid category.' };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not connected.' };
  }

  try {
    await updateDoc(doc(db, 'posts', postId), {
      category: cleanCat,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update article category.'
    };
  }
};

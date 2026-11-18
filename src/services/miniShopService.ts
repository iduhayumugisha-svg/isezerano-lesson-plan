import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import {
  initFirestoreIfConfigured,
  getFirebaseApp,
  getFirebaseConfig,
  getFirebaseAuth
} from '../config/firebase';
import { isAuthorizedAdminEmail } from './authService';
import { stripUndefinedForFirestore } from './blogService';
import { MiniShopProduct } from '../types/platform';
import {
  filterActiveMiniShopProducts,
  sortMiniShopProducts,
  validateMiniShopProductInput
} from '../utils/miniShopUtils';
import { estimateUtf8Bytes } from '../utils/thumbnailUtils';

const MINI_SHOP_COLLECTION = 'mini_shop_products';
const CANONICAL_PROJECT_ID = 'isezerano-news';
const MAX_EMBEDDED_PRODUCT_IMAGE_BYTES = 240_000;
let storageBucketUnavailableSession = false;

export type MiniShopLoadStatus = 'loading' | 'ready' | 'empty' | 'permission-denied';

export interface MiniShopImageUploadResult {
  success: boolean;
  url?: string;
  storageMode?: 'firebase_storage' | 'firestore_embedded';
  byteSize?: number;
  fallbackNotice?: string;
  error?: string;
}

export interface MiniShopActionResult {
  success: boolean;
  product?: MiniShopProduct;
  error?: string;
}

const PUBLIC_MINI_SHOP_FIELDS = [
  'id',
  'title',
  'description',
  'price',
  'imageUrl',
  'imageStorageMode',
  'whatsappNumber',
  'phoneNumber',
  'active',
  'displayOrder',
  'createdAt',
  'updatedAt'
] as const;

interface AdminVerificationResult {
  ok: boolean;
  email?: string;
  uid?: string;
  error?: string;
}

/**
 * Verifies the live Firebase Auth ID token matches Firestore Rules' `isAdmin()`:
 * authenticated via Google OAuth (`google.com`), `email_verified == true`,
 * and canonical Admin email `twizerefelix90@gmail.com`.
 * Never trusts user-editable or plain browser form email strings.
 */
const verifyAdminSessionAsync = async (): Promise<AdminVerificationResult> => {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  if (!currentUser || currentUser.isAnonymous) {
    return {
      ok: false,
      error: 'Administrator authentication required. Please sign in with Google as twizerefelix90@gmail.com.'
    };
  }

  try {
    const tokenResult = await currentUser.getIdTokenResult();
    const provider = tokenResult.signInProvider;
    const tokenEmail = typeof tokenResult.claims?.email === 'string' ? tokenResult.claims.email : currentUser.email;
    const tokenEmailVerified =
      tokenResult.claims?.email_verified === true || currentUser.emailVerified === true;

    if (provider !== 'google.com') {
      return {
        ok: false,
        error:
          'Verified Google Sign-In is required for Mini Shop management. Please sign out and sign in with Google as twizerefelix90@gmail.com.'
      };
    }

    if (!tokenEmailVerified) {
      return {
        ok: false,
        error: 'Verified Google email is required before managing Mini Shop products.'
      };
    }

    if (!isAuthorizedAdminEmail(tokenEmail)) {
      return {
        ok: false,
        error: `Access denied for ${tokenEmail || 'this account'}. Only verified Google Admin twizerefelix90@gmail.com can manage the Mini Shop.`
      };
    }

    return {
      ok: true,
      email: tokenEmail || undefined,
      uid: currentUser.uid
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Could not verify Firebase Admin ID token: ${err.message}`
          : 'Could not verify Firebase Admin session.'
    };
  }
};

const getProjectDiagnostics = (): { projectId: string; mismatchWarning?: string } => {
  const projectId = getFirebaseConfig().projectId || CANONICAL_PROJECT_ID;
  if (projectId !== CANONICAL_PROJECT_ID) {
    return {
      projectId,
      mismatchWarning: `Connected to Firebase project "${projectId}" instead of "${CANONICAL_PROJECT_ID}". Check your Firebase Web configuration.`
    };
  }
  return { projectId };
};

const loadImageElement = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Selected file is not a valid image.'));
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
};

const compressProductImageToDataUri = async (
  file: File,
  targetMaxBytes: number = MAX_EMBEDDED_PRODUCT_IMAGE_BYTES
): Promise<{ dataUri: string; byteSize: number }> => {
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    const rawUri = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(new Error('Failed to read SVG image.'));
      r.readAsDataURL(file);
    });
    const bytes = estimateUtf8Bytes(rawUri);
    if (bytes <= targetMaxBytes) {
      return { dataUri: rawUri, byteSize: bytes };
    }
  }

  const img = await loadImageElement(file);
  const dimensionSteps = [640, 480, 360, 280];
  const qualitySteps = [0.85, 0.72, 0.58, 0.44];
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
      throw new Error('Browser canvas is unavailable for image optimization.');
    }

    if (!hasTransparency) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

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

  throw new Error('Could not compress product image cleanly. Please select a smaller image.');
};

/**
 * Uploads product image to Firebase Storage when provisioned (using `/website_assets/mini_shop/...`),
 * falling back seamlessly to Spark-compatible compressed Data URI stored directly in Firestore.
 */
export const uploadMiniShopProductImage = async (
  file: File,
  onProgress?: (percent: number, stageText?: string) => void
): Promise<MiniShopImageUploadResult> => {
  const adminCheck = await verifyAdminSessionAsync();
  if (!adminCheck.ok) {
    return { success: false, error: adminCheck.error };
  }

  const validMime =
    file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);
  if (!validMime) {
    return {
      success: false,
      error: 'Please select a valid image file (JPG, PNG, WebP, GIF, or SVG).'
    };
  }

  if (file.size > 25 * 1024 * 1024) {
    return {
      success: false,
      error: 'Selected image exceeds 25 MB. Choose a smaller image.'
    };
  }

  onProgress?.(20, 'Preparing product image...');
  const app = getFirebaseApp();
  const config = getFirebaseConfig();
  const bucketName = config.storageBucket || `${CANONICAL_PROJECT_ID}.firebasestorage.app`;

  if (app && !storageBucketUnavailableSession) {
    try {
      onProgress?.(35, 'Checking Firebase Storage...');
      const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
      const storage = getStorage(app, `gs://${bucketName}`);
      try {
        storage.maxUploadRetryTime = 4500;
        storage.maxOperationRetryTime = 4500;
      } catch {
        // ignore
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^\w.-]/g, '_')
        .slice(0, 24);
      const storagePath = `website_assets/mini_shop/prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeName}.${ext}`;
      const storageRef = ref(storage, storagePath);

      const uploadedUrl = await new Promise<string | null>((resolve) => {
        let settled = false;
        const task = uploadBytesResumable(storageRef, file, {
          contentType: file.type || 'image/jpeg',
          customMetadata: {
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
          storageBucketUnavailableSession = true;
          resolve(null);
        }, 4500);

        task.on(
          'state_changed',
          (snap) => {
            if (snap.totalBytes > 0) {
              const pct = 40 + Math.round((snap.bytesTransferred / snap.totalBytes) * 50);
              onProgress?.(Math.min(92, pct), 'Uploading to Firebase Storage...');
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
              storageBucketUnavailableSession = true;
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

      if (uploadedUrl) {
        onProgress?.(100, 'Image uploaded');
        return {
          success: true,
          url: uploadedUrl,
          storageMode: 'firebase_storage',
          byteSize: file.size
        };
      }
    } catch {
      storageBucketUnavailableSession = true;
    }
  }

  try {
    onProgress?.(70, 'Optimizing image for Cloud Firestore...');
    const { dataUri, byteSize } = await compressProductImageToDataUri(file);
    onProgress?.(100, 'Image ready');
    return {
      success: true,
      url: dataUri,
      storageMode: 'firestore_embedded',
      byteSize,
      fallbackNotice: `Image optimized (${Math.round(byteSize / 1024)} KB) for Spark-plan Cloud Firestore storage.`
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to prepare product image.'
    };
  }
};

const normalizeProductRecord = (id: string, raw: Record<string, any>): MiniShopProduct => {
  return {
    id,
    title: typeof raw.title === 'string' ? raw.title : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    price: typeof raw.price === 'string' && raw.price.trim() ? raw.price.trim() : undefined,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : '',
    imageStorageMode:
      raw.imageStorageMode === 'firebase_storage' || raw.imageStorageMode === 'firestore_embedded'
        ? raw.imageStorageMode
        : undefined,
    whatsappNumber:
      typeof raw.whatsappNumber === 'string' && raw.whatsappNumber.trim()
        ? raw.whatsappNumber.trim()
        : undefined,
    phoneNumber:
      typeof raw.phoneNumber === 'string' && raw.phoneNumber.trim()
        ? raw.phoneNumber.trim()
        : undefined,
    active: Boolean(raw.active),
    displayOrder:
      typeof raw.displayOrder === 'number' && Number.isFinite(raw.displayOrder)
        ? Math.max(0, Math.trunc(raw.displayOrder))
        : 0,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : ''
  };
};

/**
 * Strips any extraneous or private/administrative keys before writing to Firestore.
 */
const buildCleanProductPayload = (product: MiniShopProduct): Record<string, unknown> => {
  return stripUndefinedForFirestore({
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    imageStorageMode: product.imageStorageMode,
    whatsappNumber: product.whatsappNumber,
    phoneNumber: product.phoneNumber,
    active: Boolean(product.active),
    displayOrder: Math.max(0, Math.trunc(Number(product.displayOrder) || 0)),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  });
};

const parseFirestoreRestValue = (val: any): any => {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  return undefined;
};

interface RestFetchResult {
  products: MiniShopProduct[];
  permissionDenied: boolean;
}

const fetchActiveMiniShopProductsViaRest = async (): Promise<RestFetchResult> => {
  if (typeof fetch !== 'function') {
    return { products: [], permissionDenied: false };
  }
  try {
    const projectId = getFirebaseConfig().projectId || CANONICAL_PROJECT_ID;
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            select: {
              fields: PUBLIC_MINI_SHOP_FIELDS.map((fieldPath) => ({ fieldPath }))
            },
            from: [{ collectionId: MINI_SHOP_COLLECTION }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'active' },
                op: 'EQUAL',
                value: { booleanValue: true }
              }
            }
          }
        })
      }
    );

    if (res.status === 403) {
      return { products: [], permissionDenied: true };
    }
    if (!res.ok) {
      return { products: [], permissionDenied: false };
    }

    const rows = await res.json();
    if (!Array.isArray(rows)) {
      return { products: [], permissionDenied: false };
    }

    const list: MiniShopProduct[] = [];
    for (const row of rows) {
      const docObj = row?.document;
      if (!docObj?.name || !docObj?.fields) continue;
      const docId = String(docObj.name).split('/').pop() || '';
      const raw: Record<string, any> = {};
      for (const [k, v] of Object.entries(docObj.fields)) {
        raw[k] = parseFirestoreRestValue(v);
      }
      const normalized = normalizeProductRecord(docId, raw);
      if (normalized.active && normalized.title && normalized.imageUrl) {
        list.push(normalized);
      }
    }
    return {
      products: filterActiveMiniShopProducts(list),
      permissionDenied: false
    };
  } catch {
    return { products: [], permissionDenied: false };
  }
};

/**
 * Real-time subscription to ACTIVE Mini Shop products for public display.
 * Never returns inactive, private, fake, or default products.
 */
export const subscribeToActiveMiniShopProducts = (
  callback: (products: MiniShopProduct[], status?: MiniShopLoadStatus) => void
): (() => void) => {
  const db = initFirestoreIfConfigured();
  let isDisposed = false;
  let sdkResponded = false;
  let restHasData = false;

  // Initial REST snapshot scoped strictly to `active == true` and public fields only
  fetchActiveMiniShopProductsViaRest().then((restResult) => {
    if (!isDisposed && !sdkResponded) {
      restHasData = restResult.products.length > 0;
      const status: MiniShopLoadStatus = restResult.permissionDenied
        ? 'permission-denied'
        : restResult.products.length > 0
        ? 'ready'
        : 'empty';
      callback(restResult.products, status);
    }
  });

  if (!db) {
    return () => {
      isDisposed = true;
    };
  }

  try {
    const activeQuery = query(
      collection(db, MINI_SHOP_COLLECTION),
      where('active', '==', true)
    );
    const unsubscribe = onSnapshot(
      activeQuery,
      (snapshot) => {
        if (isDisposed) return;
        sdkResponded = true;
        const list: MiniShopProduct[] = [];
        snapshot.forEach((docSnap) => {
          const item = normalizeProductRecord(docSnap.id, docSnap.data());
          if (item.active && item.title && item.imageUrl) {
            list.push(item);
          }
        });
        const sortedActive = filterActiveMiniShopProducts(list);
        callback(sortedActive, sortedActive.length > 0 ? 'ready' : 'empty');
      },
      (error) => {
        console.warn('[MiniShop] Public subscription error:', error?.code || error);
        if (!isDisposed && !sdkResponded && !restHasData) {
          callback([], error?.code === 'permission-denied' ? 'permission-denied' : 'empty');
        }
      }
    );

    return () => {
      isDisposed = true;
      unsubscribe();
    };
  } catch (err) {
    console.warn('[MiniShop] Failed to subscribe to active products:', err);
    return () => {
      isDisposed = true;
    };
  }
};

/**
 * Real-time subscription to ALL Mini Shop products (active + inactive) for Admin management.
 * Verifies the live Firebase Auth Google ID token before subscribing.
 */
export const subscribeToAllMiniShopProductsForAdmin = (
  callback: (products: MiniShopProduct[], error?: string) => void
): (() => void) => {
  let disposed = false;
  let innerUnsubscribe: (() => void) | null = null;

  (async () => {
    const adminCheck = await verifyAdminSessionAsync();
    if (disposed) return;

    if (!adminCheck.ok) {
      callback([], adminCheck.error);
      return;
    }

    const db = initFirestoreIfConfigured();
    if (!db) {
      callback([], 'Cloud Firestore is not configured.');
      return;
    }

    const { projectId, mismatchWarning } = getProjectDiagnostics();
    if (mismatchWarning) {
      callback([], mismatchWarning);
      return;
    }

    try {
      const colRef = collection(db, MINI_SHOP_COLLECTION);
      innerUnsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (disposed) return;
          const list: MiniShopProduct[] = [];
          snapshot.forEach((docSnap) => {
            list.push(normalizeProductRecord(docSnap.id, docSnap.data()));
          });
          callback(sortMiniShopProducts(list));
        },
        (error) => {
          if (disposed) return;
          console.warn('[MiniShop] Admin subscription error:', error?.code || error);
          if (error?.code === 'permission-denied') {
            callback(
              [],
              `Firestore permission denied reading "${MINI_SHOP_COLLECTION}" on project "${projectId}". Verify you are signed in via Google as twizerefelix90@gmail.com AND deploy the updated firestore.rules (via GitHub Actions or "firebase deploy --only firestore:rules --project ${CANONICAL_PROJECT_ID}").`
            );
          } else {
            callback([], error?.message || 'Unable to load Mini Shop products.');
          }
        }
      );
    } catch (err: unknown) {
      if (!disposed) {
        callback([], err instanceof Error ? err.message : 'Unable to connect to Mini Shop collection.');
      }
    }
  })();

  return () => {
    disposed = true;
    if (innerUnsubscribe) {
      innerUnsubscribe();
    }
  };
};

/**
 * Creates or updates a Mini Shop product (Verified Google Admin only).
 */
export const saveMiniShopProduct = async (input: {
  id?: string;
  title: string;
  description: string;
  price?: string;
  imageUrl: string;
  imageStorageMode?: 'firebase_storage' | 'firestore_embedded';
  whatsappNumber?: string;
  phoneNumber?: string;
  active: boolean;
  displayOrder: number;
  createdAt?: string;
}): Promise<MiniShopActionResult> => {
  const adminCheck = await verifyAdminSessionAsync();
  if (!adminCheck.ok) {
    return { success: false, error: adminCheck.error };
  }

  const { projectId, mismatchWarning } = getProjectDiagnostics();
  if (mismatchWarning) {
    return { success: false, error: mismatchWarning };
  }

  const validation = validateMiniShopProductInput(input);
  if (!validation.valid || !validation.sanitized) {
    return { success: false, error: validation.error || 'Invalid product details.' };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not configured.' };
  }

  try {
    const productId =
      input.id && input.id.trim()
        ? input.id.trim()
        : `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const record: MiniShopProduct = {
      id: productId,
      title: validation.sanitized.title,
      description: validation.sanitized.description,
      price: validation.sanitized.price,
      imageUrl: validation.sanitized.imageUrl,
      imageStorageMode: input.imageStorageMode,
      whatsappNumber: validation.sanitized.whatsappNumber,
      phoneNumber: validation.sanitized.phoneNumber,
      active: Boolean(input.active),
      displayOrder: Math.max(0, Math.trunc(Number(input.displayOrder) || 0)),
      createdAt: input.createdAt && input.createdAt.trim() ? input.createdAt : now,
      updatedAt: now
    };

    const payload = buildCleanProductPayload(record);
    await setDoc(doc(db, MINI_SHOP_COLLECTION, productId), payload);

    return {
      success: true,
      product: record
    };
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      return {
        success: false,
        error: `Permission denied by Firestore security rules on project "${projectId}". Deploy the updated firestore.rules (allowing mini_shop_products for verified Google Admin twizerefelix90@gmail.com).`
      };
    }
    return {
      success: false,
      error: err?.message || 'Failed to save Mini Shop product.'
    };
  }
};

/**
 * Activates or deactivates a Mini Shop product (Verified Google Admin only).
 */
export const toggleMiniShopProductActive = async (
  product: MiniShopProduct,
  nextActive: boolean
): Promise<MiniShopActionResult> => {
  const adminCheck = await verifyAdminSessionAsync();
  if (!adminCheck.ok) {
    return { success: false, error: adminCheck.error };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not configured.' };
  }

  try {
    const now = new Date().toISOString();
    const updated: MiniShopProduct = {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      imageStorageMode: product.imageStorageMode,
      whatsappNumber: product.whatsappNumber,
      phoneNumber: product.phoneNumber,
      active: nextActive,
      displayOrder: Math.max(0, Math.trunc(Number(product.displayOrder) || 0)),
      createdAt: product.createdAt || now,
      updatedAt: now
    };
    await setDoc(doc(db, MINI_SHOP_COLLECTION, product.id), buildCleanProductPayload(updated));
    return { success: true, product: updated };
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.code === 'permission-denied'
          ? 'Permission denied updating Mini Shop product. Deploy updated firestore.rules and confirm verified Google Sign-In.'
          : err?.message || 'Failed to update product visibility.'
    };
  }
};

/**
 * Reorders Mini Shop products cleanly via atomic writeBatch (Verified Google Admin only).
 */
export const reorderMiniShopProducts = async (
  orderedProducts: MiniShopProduct[]
): Promise<{ success: boolean; error?: string }> => {
  const adminCheck = await verifyAdminSessionAsync();
  if (!adminCheck.ok) {
    return { success: false, error: adminCheck.error };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not configured.' };
  }

  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    orderedProducts.forEach((prod, index) => {
      batch.set(
        doc(db, MINI_SHOP_COLLECTION, prod.id),
        buildCleanProductPayload({
          ...prod,
          displayOrder: index,
          createdAt: prod.createdAt || now,
          updatedAt: now
        })
      );
    });
    await batch.commit();
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.code === 'permission-denied'
          ? 'Permission denied reordering Mini Shop products. Deploy updated firestore.rules and confirm verified Google Sign-In.'
          : err?.message || 'Failed to update product display order.'
    };
  }
};

/**
 * Deletes a Mini Shop product permanently from Cloud Firestore (Verified Google Admin only).
 */
export const deleteMiniShopProduct = async (
  productId: string
): Promise<{ success: boolean; error?: string }> => {
  const adminCheck = await verifyAdminSessionAsync();
  if (!adminCheck.ok) {
    return { success: false, error: adminCheck.error };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not configured.' };
  }

  try {
    await deleteDoc(doc(db, MINI_SHOP_COLLECTION, productId));
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.code === 'permission-denied'
          ? 'Permission denied deleting Mini Shop product. Deploy updated firestore.rules and confirm verified Google Sign-In.'
          : err?.message || 'Failed to delete Mini Shop product.'
    };
  }
};

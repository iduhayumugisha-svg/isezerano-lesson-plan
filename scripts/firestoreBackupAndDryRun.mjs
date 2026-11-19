#!/usr/bin/env node
/**
 * ISEZERANO ONLINE — Read-Only Recursive Firestore Backup & Dry-Run Migration Audit
 *
 * Strictly READ-ONLY:
 * - Never writes, updates, patches, or deletes Firestore documents.
 * - Never deploys rules or hosting.
 * - Never logs or exports service account credentials.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/firestoreBackupAndDryRun.mjs
 *
 * Local Emulator Testing:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8188 node scripts/firestoreBackupAndDryRun.mjs --output-dir ./tmp-backup
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const DEFAULT_PROJECT_ID = 'isezerano-news';
export const DEFAULT_DATABASE_ID = '(default)';
export const DEFAULT_ROOT_COLLECTIONS = [
  'comments',
  'mini_shop_products',
  'appSettings',
  'siteSettings',
  'posts'
];

export const COMMENT_PUBLIC_FIELDS = [
  'postId',
  'parentId',
  'replyToName',
  'name',
  'content',
  'status',
  'createdAt',
  'updatedAt',
  'edited',
  'publicSafe'
];

export const COMMENT_PRIVATE_FIELDS = [
  'email',
  'phone',
  'ownerToken',
  'ownerSecret',
  'ipAddress',
  'verifier'
];

export const MINI_SHOP_REQUIRED_FIELDS = [
  'id',
  'title',
  'description',
  'imageUrl',
  'active',
  'displayOrder',
  'createdAt',
  'updatedAt',
  'publicSafe'
];

export const MINI_SHOP_PUBLIC_FIELDS = [
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
  'updatedAt',
  'publicSafe'
];

export const MINI_SHOP_KNOWN_PRIVATE_FIELDS = [
  'sellerEmail',
  'supplierPhone',
  'updatedBy',
  'costPrice',
  'internalNotes',
  'adminNotes'
];

export const PUBLIC_ALLOWLISTED_SETTINGS_PATHS = new Set([
  'appSettings/ads',
  'appSettings/website_design',
  'siteSettings/branding',
  'siteSettings/blog_categories'
]);

const DATASTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';

/**
 * Decodes a single Firestore REST typed value into plain JS for inspection.
 * Preserves lossless types inside rawFields separately in the backup JSON.
 */
export function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('integerValue' in value) {
    const n = Number(value.integerValue);
    return Number.isSafeInteger(n) ? n : String(value.integerValue);
  }
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return String(value.timestampValue);
  if ('stringValue' in value) return String(value.stringValue);
  if ('bytesValue' in value) return { __firestoreType: 'bytes', base64: String(value.bytesValue) };
  if ('referenceValue' in value) return { __firestoreType: 'reference', path: String(value.referenceValue) };
  if ('geoPointValue' in value) return { __firestoreType: 'geoPoint', ...value.geoPointValue };
  if ('arrayValue' in value) {
    const vals = Array.isArray(value.arrayValue?.values) ? value.arrayValue.values : [];
    return vals.map(decodeFirestoreValue);
  }
  if ('mapValue' in value) {
    return decodeFirestoreFields(value.mapValue?.fields || {});
  }
  return value;
}

export function decodeFirestoreFields(fields) {
  const out = {};
  if (!fields || typeof fields !== 'object') return out;
  for (const key of Object.keys(fields).sort()) {
    out[key] = decodeFirestoreValue(fields[key]);
  }
  return out;
}

function base64UrlEncode(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Loads service account JSON from GOOGLE_APPLICATION_CREDENTIALS file path (or env fallback).
 * Never logs or returns raw secrets in artifacts.
 */
export function loadServiceAccountFromEnv() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  let raw = '';
  if (credPath) {
    if (!fs.existsSync(credPath)) {
      throw new Error(`Service account credential file not found at configured GOOGLE_APPLICATION_CREDENTIALS path.`);
    }
    raw = fs.readFileSync(credPath, 'utf8');
  } else if (inlineJson) {
    raw = inlineJson;
  } else {
    throw new Error(
      'Missing GOOGLE_APPLICATION_CREDENTIALS (or FIRESTORE_EMULATOR_HOST for local emulator tests).'
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Service account credentials are not valid JSON.');
  }

  if (!parsed || typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') {
    throw new Error('Service account JSON must contain client_email and private_key fields.');
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
    project_id: typeof parsed.project_id === 'string' ? parsed.project_id : DEFAULT_PROJECT_ID,
    token_uri: typeof parsed.token_uri === 'string' ? parsed.token_uri : 'https://oauth2.googleapis.com/token'
  };
}

/**
 * Creates an OAuth2 access token provider using RS256 JWT assertion.
 * Never logs private keys or access tokens.
 */
export function createAuthHeaderProvider(options = {}) {
  const emulatorHost = options.emulatorHost ?? process.env.FIRESTORE_EMULATOR_HOST ?? '';
  if (emulatorHost) {
    return {
      isEmulator: true,
      projectId: options.projectId || DEFAULT_PROJECT_ID,
      async getHeaders() {
        return { Authorization: 'Bearer owner' };
      }
    };
  }

  const sa = options.serviceAccount || loadServiceAccountFromEnv();
  let cachedToken = null;
  let expiresAtMs = 0;

  return {
    isEmulator: false,
    projectId: options.projectId || sa.project_id || DEFAULT_PROJECT_ID,
    async getHeaders() {
      const nowMs = Date.now();
      if (cachedToken && nowMs < expiresAtMs - 60_000) {
        return { Authorization: `Bearer ${cachedToken}` };
      }

      const iat = Math.floor(nowMs / 1000);
      const exp = iat + 600;
      const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const claimSet = base64UrlEncode(
        JSON.stringify({
          iss: sa.client_email,
          scope: DATASTORE_SCOPE,
          aud: sa.token_uri,
          iat,
          exp
        })
      );
      const signingInput = `${header}.${claimSet}`;
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(signingInput);
      signer.end();
      const signature = base64UrlEncode(signer.sign(sa.private_key));
      const assertion = `${signingInput}.${signature}`;

      const tokenRes = await fetch(sa.token_uri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion
        }).toString()
      });

      if (!tokenRes.ok) {
        throw new Error(`OAuth2 token exchange failed with HTTP ${tokenRes.status}.`);
      }

      const tokenBody = await tokenRes.json();
      if (!tokenBody?.access_token) {
        throw new Error('OAuth2 token response did not include an access_token.');
      }

      cachedToken = tokenBody.access_token;
      expiresAtMs = nowMs + (Number(tokenBody.expires_in) || 600) * 1000;
      return { Authorization: `Bearer ${cachedToken}` };
    }
  };
}

function encodeDocumentPathSegments(relPath) {
  return relPath
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

/**
 * Strictly read-only Firestore REST v1 client (GET list + POST :listCollectionIds only).
 */
export function createReadOnlyFirestoreRestClient({
  projectId = DEFAULT_PROJECT_ID,
  databaseId = DEFAULT_DATABASE_ID,
  emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '',
  authProvider
} = {}) {
  const provider = authProvider || createAuthHeaderProvider({ projectId, emulatorHost });
  const resolvedProjectId = projectId || provider.projectId || DEFAULT_PROJECT_ID;
  const hostBase = emulatorHost
    ? (emulatorHost.startsWith('http') ? emulatorHost.replace(/\/+$/, '') : `http://${emulatorHost}`)
    : 'https://firestore.googleapis.com';
  const documentsBaseUrl = `${hostBase}/v1/projects/${encodeURIComponent(resolvedProjectId)}/databases/${encodeURIComponent(databaseId)}/documents`;

  async function requestWithRetry(url, init, attempt = 0) {
    const authHeaders = await provider.getHeaders();
    const res = await fetch(url, {
      ...init,
      headers: {
        ...authHeaders,
        ...(init.headers || {})
      }
    });

    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      const backoffMs = 300 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return requestWithRetry(url, init, attempt + 1);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Firestore read request failed (${init.method || 'GET'} HTTP ${res.status}): ${errText.slice(0, 300)}`);
    }

    return res.json();
  }

  return {
    projectId: resolvedProjectId,
    databaseId,
    documentsBaseUrl,
    async listDocumentsInCollection(collectionRelativePath) {
      const docs = [];
      let pageToken = '';
      const encodedCollectionPath = encodeDocumentPathSegments(collectionRelativePath);

      do {
        const params = new URLSearchParams({
          pageSize: '300',
          showMissing: 'true'
        });
        if (pageToken) {
          params.set('pageToken', pageToken);
        }
        const url = `${documentsBaseUrl}/${encodedCollectionPath}?${params.toString()}`;
        const page = await requestWithRetry(url, { method: 'GET' });
        if (Array.isArray(page.documents)) {
          docs.push(...page.documents);
        }
        pageToken = typeof page.nextPageToken === 'string' ? page.nextPageToken : '';
      } while (pageToken);

      return docs;
    },
    async listSubcollectionIds(documentRelativePath) {
      const collectionIds = [];
      let pageToken = '';
      const encodedDocPath = encodeDocumentPathSegments(documentRelativePath);

      do {
        const url = `${documentsBaseUrl}/${encodedDocPath}:listCollectionIds`;
        const body = { pageSize: 100 };
        if (pageToken) body.pageToken = pageToken;
        const page = await requestWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (Array.isArray(page.collectionIds)) {
          collectionIds.push(...page.collectionIds);
        }
        pageToken = typeof page.nextPageToken === 'string' ? page.nextPageToken : '';
      } while (pageToken);

      return collectionIds.sort();
    }
  };
}

/**
 * Recursively backs up a collection and all nested subcollections for every document.
 */
export async function backupCollectionRecursive(client, collectionRelativePath, counters) {
  const rawDocs = await client.listDocumentsInCollection(collectionRelativePath);
  const documents = [];

  for (const rawDoc of rawDocs) {
    const resourceName = String(rawDoc.name || '');
    const marker = '/documents/';
    const markerIdx = resourceName.indexOf(marker);
    const relPath = markerIdx >= 0 ? resourceName.slice(markerIdx + marker.length) : `${collectionRelativePath}/${path.basename(resourceName)}`;
    const id = relPath.split('/').pop() || '';
    const exists = Boolean(rawDoc.createTime || rawDoc.updateTime || rawDoc.fields);
    const rawFields = rawDoc.fields || {};
    const data = decodeFirestoreFields(rawFields);

    const depth = relPath.split('/').length / 2;
    if (depth === 1) {
      counters.totalRootDocuments += 1;
      if (exists) counters.existingRootDocuments += 1;
      else counters.missingParentPlaceholders += 1;
    } else {
      counters.totalNestedSubcollectionDocuments += 1;
      const subName = relPath.split('/')[relPath.split('/').length - 2];
      counters.subcollectionCounts[subName] = (counters.subcollectionCounts[subName] || 0) + 1;
    }
    counters.totalDocumentsBackedUp += 1;

    const subIds = await client.listSubcollectionIds(relPath);
    const subcollections = {};
    for (const subId of subIds) {
      const subPath = `${relPath}/${subId}`;
      subcollections[subId] = await backupCollectionRecursive(client, subPath, counters);
    }

    documents.push({
      id,
      path: relPath,
      resourceName,
      exists,
      createTime: rawDoc.createTime || null,
      updateTime: rawDoc.updateTime || null,
      rawFields,
      data,
      subcollections
    });
  }

  documents.sort((a, b) => a.path.localeCompare(b.path));
  return {
    collectionPath: collectionRelativePath,
    documentCount: documents.length,
    documents
  };
}

/**
 * Evaluates a backed-up /comments collection against the hardened firestore.rules schema
 * and produces exact per-document non-destructive migration plans.
 */
export function buildCommentsDryRunPlan(commentsBackup) {
  const byId = new Map();
  for (const doc of commentsBackup.documents) {
    byId.set(doc.id, doc);
  }

  const summary = {
    totalCommentDocs: commentsBackup.documents.length,
    existingDocs: 0,
    missingParentPlaceholders: 0,
    byStatus: {},
    compliantWithNewRules: 0,
    missingPublicSafeTrue: 0,
    missingRequiredPublicFields: 0,
    containingPrivateFields: 0,
    containingUnexpectedExtraFields: 0,
    withPrivateSubcollection: 0,
    withTokensSubcollection: 0,
    visibleCurrentlyUnderPublicSafeFilter: 0,
    wouldDisappearWithoutMigration: 0,
    invalidReplyReferences: 0,
    privateFieldCounts: {}
  };

  const documentPlans = [];

  for (const doc of commentsBackup.documents) {
    const privateDocs = doc.subcollections?.private?.documents || [];
    const tokenDocs = doc.subcollections?.tokens?.documents || [];
    if (privateDocs.length > 0) summary.withPrivateSubcollection += 1;
    if (tokenDocs.length > 0) summary.withTokensSubcollection += 1;

    if (!doc.exists) {
      summary.missingParentPlaceholders += 1;
      documentPlans.push({
        id: doc.id,
        path: doc.path,
        exists: false,
        category: 'phantom_parent_with_subcollections',
        subcollectionCounts: { private: privateDocs.length, tokens: tokenDocs.length },
        requiresMigration: false,
        recommendedAction: 'No parent document exists; leave orphaned subcollection untouched during public backfill.'
      });
      continue;
    }

    summary.existingDocs += 1;
    const data = doc.data || {};
    const status = typeof data.status === 'string' ? data.status : 'MISSING';
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;

    const keys = Object.keys(data);
    const privateFieldsFound = keys.filter((k) => COMMENT_PRIVATE_FIELDS.includes(k));
    const unexpectedExtraFields = keys.filter(
      (k) => !COMMENT_PUBLIC_FIELDS.includes(k) && !COMMENT_PRIVATE_FIELDS.includes(k)
    );
    const missingPublicKeys = COMMENT_PUBLIC_FIELDS.filter((k) => !(k in data));

    if (data.publicSafe !== true) summary.missingPublicSafeTrue += 1;
    if (missingPublicKeys.length > 0) summary.missingRequiredPublicFields += 1;
    if (privateFieldsFound.length > 0) {
      summary.containingPrivateFields += 1;
      for (const f of privateFieldsFound) {
        summary.privateFieldCounts[f] = (summary.privateFieldCounts[f] || 0) + 1;
      }
    }
    if (unexpectedExtraFields.length > 0) summary.containingUnexpectedExtraFields += 1;

    const isPublicStatus = status === 'published' || status === 'approved';
    const hasExact10PublicKeys =
      missingPublicKeys.length === 0 &&
      privateFieldsFound.length === 0 &&
      unexpectedExtraFields.length === 0 &&
      data.publicSafe === true;

    if (hasExact10PublicKeys) {
      summary.compliantWithNewRules += 1;
    }
    if (isPublicStatus && data.publicSafe === true) {
      summary.visibleCurrentlyUnderPublicSafeFilter += 1;
    } else if (isPublicStatus && !hasExact10PublicKeys) {
      summary.wouldDisappearWithoutMigration += 1;
    }

    // Validate reply parent linkage if parentId is present
    let replyWarning = null;
    if (data.parentId != null) {
      const parent = byId.get(String(data.parentId));
      if (!parent || !parent.exists) {
        replyWarning = `Reply references missing parentId "${data.parentId}".`;
        summary.invalidReplyReferences += 1;
      } else if (parent.data?.postId !== data.postId) {
        replyWarning = `Reply postId "${data.postId}" differs from parent postId "${parent.data?.postId}".`;
        summary.invalidReplyReferences += 1;
      } else if (!['published', 'approved'].includes(String(parent.data?.status || ''))) {
        replyWarning = `Reply parent "${data.parentId}" has non-public status "${parent.data?.status}".`;
      }
    }

    const parentFieldsToAddOrUpdate = {};
    if (!('parentId' in data)) parentFieldsToAddOrUpdate.parentId = null;
    if (!('replyToName' in data)) parentFieldsToAddOrUpdate.replyToName = null;
    const fallbackCreatedAt =
      typeof data.createdAt === 'string' && data.createdAt.length >= 10
        ? data.createdAt
        : doc.createTime || doc.updateTime || new Date().toISOString();
    if (!('createdAt' in data) || typeof data.createdAt !== 'string') {
      parentFieldsToAddOrUpdate.createdAt = fallbackCreatedAt;
    }
    if (!('updatedAt' in data) || typeof data.updatedAt !== 'string') {
      parentFieldsToAddOrUpdate.updatedAt = fallbackCreatedAt;
    }
    if (!('edited' in data) || typeof data.edited !== 'boolean') {
      parentFieldsToAddOrUpdate.edited = false;
    }
    if (data.publicSafe !== true) {
      parentFieldsToAddOrUpdate.publicSafe = true;
    }

    const fieldsToMove = [...privateFieldsFound, ...unexpectedExtraFields];
    const hasOwnershipSubdoc = privateDocs.some((p) => p.id === 'ownership');
    const moveTarget =
      privateFieldsFound.length === 1 &&
      privateFieldsFound[0] === 'email' &&
      hasOwnershipSubdoc &&
      unexpectedExtraFields.length === 0
        ? `${doc.path}/private/ownership`
        : `${doc.path}/private/legacy_migration`;

    let category = 'compliant';
    if (fieldsToMove.length > 0 && Object.keys(parentFieldsToAddOrUpdate).length > 0) {
      category = 'needs_private_isolation_and_public_backfill';
    } else if (fieldsToMove.length > 0) {
      category = 'needs_private_isolation';
    } else if (Object.keys(parentFieldsToAddOrUpdate).length > 0) {
      category = 'needs_public_backfill';
    }

    documentPlans.push({
      id: doc.id,
      path: doc.path,
      postId: typeof data.postId === 'string' ? data.postId : null,
      status,
      isReply: Boolean(data.parentId),
      exists: true,
      category,
      requiresMigration: category !== 'compliant',
      willRemainVisibleBeforeMigration: isPublicStatus && hasExact10PublicKeys,
      subcollectionCounts: {
        private: privateDocs.length,
        tokens: tokenDocs.length
      },
      missingPublicKeys,
      privateFieldsFound,
      unexpectedExtraFields,
      migrationActions: {
        moveFieldsToSubcollection: fieldsToMove.length > 0 ? { destinationDocPath: moveTarget, fieldNames: fieldsToMove } : null,
        deleteFieldsFromParent: fieldsToMove,
        setFieldsOnParent: parentFieldsToAddOrUpdate
      },
      warnings: replyWarning ? [replyWarning] : []
    });
  }

  return { summary, documents: documentPlans };
}

/**
 * Evaluates a backed-up /mini_shop_products collection against the hardened firestore.rules schema.
 */
export function buildMiniShopDryRunPlan(productsBackup) {
  const summary = {
    totalProductDocs: productsBackup.documents.length,
    existingDocs: 0,
    missingParentPlaceholders: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    compliantWithNewRules: 0,
    missingPublicSafeTrue: 0,
    missingRequiredPublicFields: 0,
    containingPrivateOrExtraFields: 0,
    withPrivateSubcollection: 0,
    visibleCurrentlyUnderPublicSafeFilter: 0,
    wouldDisappearWithoutMigration: 0,
    nonPublicFieldCounts: {}
  };

  const documentPlans = [];

  for (const doc of productsBackup.documents) {
    const privateDocs = doc.subcollections?.private?.documents || [];
    if (privateDocs.length > 0) summary.withPrivateSubcollection += 1;

    if (!doc.exists) {
      summary.missingParentPlaceholders += 1;
      documentPlans.push({
        id: doc.id,
        path: doc.path,
        exists: false,
        category: 'phantom_parent_with_subcollections',
        subcollectionCounts: { private: privateDocs.length },
        requiresMigration: false
      });
      continue;
    }

    summary.existingDocs += 1;
    const data = doc.data || {};
    const isActive = data.active === true;
    if (isActive) summary.activeProducts += 1;
    else summary.inactiveProducts += 1;

    const keys = Object.keys(data);
    const nonPublicFields = keys.filter((k) => !MINI_SHOP_PUBLIC_FIELDS.includes(k));
    const missingRequired = MINI_SHOP_REQUIRED_FIELDS.filter((k) => !(k in data));
    const hasContact =
      (typeof data.whatsappNumber === 'string' && data.whatsappNumber.trim().length > 0) ||
      (typeof data.phoneNumber === 'string' && data.phoneNumber.trim().length > 0);

    if (data.publicSafe !== true) summary.missingPublicSafeTrue += 1;
    if (missingRequired.length > 0) summary.missingRequiredPublicFields += 1;
    if (nonPublicFields.length > 0) {
      summary.containingPrivateOrExtraFields += 1;
      for (const f of nonPublicFields) {
        summary.nonPublicFieldCounts[f] = (summary.nonPublicFieldCounts[f] || 0) + 1;
      }
    }

    const isCompliant = missingRequired.length === 0 && nonPublicFields.length === 0 && data.publicSafe === true && hasContact;
    if (isCompliant) summary.compliantWithNewRules += 1;
    if (isActive && data.publicSafe === true && nonPublicFields.length === 0 && missingRequired.length === 0) {
      summary.visibleCurrentlyUnderPublicSafeFilter += 1;
    } else if (isActive) {
      summary.wouldDisappearWithoutMigration += 1;
    }

    const parentFieldsToSet = {};
    if (!('id' in data) || !data.id) parentFieldsToSet.id = doc.id;
    const fallbackTs = doc.createTime || doc.updateTime || new Date().toISOString();
    if (!('createdAt' in data) || typeof data.createdAt !== 'string') parentFieldsToSet.createdAt = fallbackTs;
    if (!('updatedAt' in data) || typeof data.updatedAt !== 'string') parentFieldsToSet.updatedAt = doc.updateTime || fallbackTs;
    if (!('displayOrder' in data) || typeof data.displayOrder !== 'number') parentFieldsToSet.displayOrder = 0;
    if (!('active' in data) || typeof data.active !== 'boolean') parentFieldsToSet.active = false;
    if (data.publicSafe !== true) parentFieldsToSet.publicSafe = true;

    const warnings = [];
    if (!hasContact) warnings.push('Missing both whatsappNumber and phoneNumber; required by isValidMiniShopProductWrite.');
    if (!('title' in data)) warnings.push('Missing required field: title.');
    if (!('description' in data)) warnings.push('Missing required field: description.');
    if (!('imageUrl' in data)) warnings.push('Missing required field: imageUrl.');

    let category = 'compliant';
    if (nonPublicFields.length > 0 && Object.keys(parentFieldsToSet).length > 0) {
      category = 'needs_private_isolation_and_public_backfill';
    } else if (nonPublicFields.length > 0) {
      category = 'needs_private_isolation';
    } else if (Object.keys(parentFieldsToSet).length > 0) {
      category = 'needs_public_backfill';
    }
    if (warnings.length > 0) {
      category = 'requires_manual_field_review';
    }

    documentPlans.push({
      id: doc.id,
      path: doc.path,
      active: isActive,
      exists: true,
      category,
      requiresMigration: category !== 'compliant',
      willRemainVisibleBeforeMigration: isActive && isCompliant,
      subcollectionCounts: { private: privateDocs.length },
      missingRequiredPublicFields: missingRequired,
      nonPublicFieldsFound: nonPublicFields,
      knownPrivateFieldsFound: nonPublicFields.filter((f) => MINI_SHOP_KNOWN_PRIVATE_FIELDS.includes(f)),
      migrationActions: {
        moveFieldsToSubcollection:
          nonPublicFields.length > 0
            ? { destinationDocPath: `${doc.path}/private/legacy_meta`, fieldNames: nonPublicFields }
            : null,
        deleteFieldsFromParent: nonPublicFields,
        setFieldsOnParent: parentFieldsToSet
      },
      warnings
    });
  }

  return { summary, documents: documentPlans };
}

/**
 * Evaluates /appSettings and /siteSettings visibility changes (keys & doc paths only; zero secret values).
 */
export function buildSettingsAuditPlan(appSettingsBackup, siteSettingsBackup) {
  const entries = [];
  for (const doc of [...(appSettingsBackup?.documents || []), ...(siteSettingsBackup?.documents || [])]) {
    const isPublicAfterRules = PUBLIC_ALLOWLISTED_SETTINGS_PATHS.has(doc.path);
    entries.push({
      path: doc.path,
      exists: doc.exists,
      fieldKeys: Object.keys(doc.data || {}).sort(),
      accessUnderProposedRules: isPublicAfterRules ? 'public_get_only_admin_write' : 'admin_only_read_and_write',
      hasSubcollections: Object.keys(doc.subcollections || {}).length > 0
    });
  }
  return {
    totalDocs: entries.length,
    publicAllowlistedDocs: entries.filter((e) => e.accessUnderProposedRules === 'public_get_only_admin_write').length,
    adminOnlyDocs: entries.filter((e) => e.accessUnderProposedRules === 'admin_only_read_and_write').length,
    documents: entries
  };
}

export function renderDryRunMarkdownReport({ projectId, generatedAt, counts, commentsPlan, miniShopPlan, settingsPlan, postsBackup }) {
  const lines = [];
  lines.push(`# Firestore Dry-Run Migration & Backup Report (\`${projectId}\`)`);
  lines.push('');
  lines.push(`- **Generated At (UTC):** \`${generatedAt}\``);
  lines.push(`- **Mode:** Strictly Read-Only Backup & Dry-Run (0 writes, 0 deletions, 0 deployments)`);
  lines.push(`- **Total Root Documents Backed Up:** **${counts.totalRootDocuments}**`);
  lines.push(`- **Total Nested Subcollection Documents Backed Up:** **${counts.totalNestedSubcollectionDocuments}**`);
  lines.push(`- **Total All Documents Backed Up:** **${counts.totalDocumentsBackedUp}**`);
  lines.push('');
  lines.push('## 1. Collection Counts');
  lines.push('| Root Collection | Root Docs | Existing | Missing-Parent Placeholders | Nested Subcollection Docs |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const [col, c] of Object.entries(counts.byRootCollection)) {
    lines.push(`| \`/${col}\` | ${c.totalRootDocuments} | ${c.existingRootDocuments} | ${c.missingParentPlaceholders} | ${c.totalNestedSubcollectionDocuments} |`);
  }
  lines.push('');
  lines.push('## 2. `/comments` Dry-Run Migration Analysis');
  lines.push(`- Total \`/comments\` documents inspected: **${commentsPlan.summary.totalCommentDocs}** (existing: ${commentsPlan.summary.existingDocs}, phantom placeholders: ${commentsPlan.summary.missingParentPlaceholders})`);
  lines.push(`- Status breakdown: \`${JSON.stringify(commentsPlan.summary.byStatus)}\``);
  lines.push(`- Already compliant with proposed \`firestore.rules\`: **${commentsPlan.summary.compliantWithNewRules}**`);
  lines.push(`- Missing \`publicSafe: true\`: **${commentsPlan.summary.missingPublicSafeTrue}**`);
  lines.push(`- Missing other required public keys (\`parentId\`, \`replyToName\`, \`updatedAt\`, \`edited\`): **${commentsPlan.summary.missingRequiredPublicFields}**`);
  lines.push(`- Containing inline private fields (\`email\`, \`phone\`, \`ownerToken\`, etc.): **${commentsPlan.summary.containingPrivateFields}** \`${JSON.stringify(commentsPlan.summary.privateFieldCounts)}\``);
  lines.push(`- Containing unexpected extra fields: **${commentsPlan.summary.containingUnexpectedExtraFields}**`);
  lines.push(`- Subcollections found: \`/private\` on **${commentsPlan.summary.withPrivateSubcollection}** docs, \`/tokens\` on **${commentsPlan.summary.withTokensSubcollection}** docs`);
  lines.push(`- Published/approved docs that would disappear if new rules + filters deploy before migration: **${commentsPlan.summary.wouldDisappearWithoutMigration}**`);
  lines.push('');

  const commentsNeedingChanges = commentsPlan.documents.filter((d) => d.requiresMigration);
  if (commentsNeedingChanges.length === 0) {
    lines.push('_No `/comments` documents require migration._');
  } else {
    lines.push('### Planned Per-Document Changes (`/comments`)');
    lines.push('| Document Path | Status | Action Category | Move Fields To Subcollection | Delete From Parent | Set On Parent |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const d of commentsNeedingChanges) {
      const moveStr = d.migrationActions.moveFieldsToSubcollection
        ? `\`${d.migrationActions.moveFieldsToSubcollection.destinationDocPath}\` (${d.migrationActions.moveFieldsToSubcollection.fieldNames.join(', ')})`
        : 'None';
      const delStr = d.migrationActions.deleteFieldsFromParent.length > 0 ? d.migrationActions.deleteFieldsFromParent.join(', ') : 'None';
      const setStr = `\`${JSON.stringify(d.migrationActions.setFieldsOnParent)}\``;
      lines.push(`| \`${d.path}\` | \`${d.status}\` | \`${d.category}\` | ${moveStr} | ${delStr} | ${setStr} |`);
    }
  }

  lines.push('');
  lines.push('## 3. `/mini_shop_products` Dry-Run Migration Analysis');
  lines.push(`- Total \`/mini_shop_products\` documents inspected: **${miniShopPlan.summary.totalProductDocs}** (active: ${miniShopPlan.summary.activeProducts}, inactive: ${miniShopPlan.summary.inactiveProducts})`);
  lines.push(`- Already compliant with proposed \`firestore.rules\`: **${miniShopPlan.summary.compliantWithNewRules}**`);
  lines.push(`- Missing \`publicSafe: true\`: **${miniShopPlan.summary.missingPublicSafeTrue}**`);
  lines.push(`- Missing required public keys: **${miniShopPlan.summary.missingRequiredPublicFields}**`);
  lines.push(`- Containing non-public / extra fields (\`sellerEmail\`, \`updatedBy\`, etc.): **${miniShopPlan.summary.containingPrivateOrExtraFields}** \`${JSON.stringify(miniShopPlan.summary.nonPublicFieldCounts)}\``);
  lines.push(`- Subcollections found: \`/private\` on **${miniShopPlan.summary.withPrivateSubcollection}** docs`);
  lines.push(`- Active products that would disappear if new rules + filters deploy before migration: **${miniShopPlan.summary.wouldDisappearWithoutMigration}**`);
  lines.push('');

  const productsNeedingChanges = miniShopPlan.documents.filter((d) => d.requiresMigration);
  if (productsNeedingChanges.length === 0) {
    lines.push('_No `/mini_shop_products` documents require migration._');
  } else {
    lines.push('### Planned Per-Document Changes (`/mini_shop_products`)');
    lines.push('| Document Path | Active | Action Category | Move Fields To Subcollection | Delete From Parent | Set On Parent | Warnings |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const d of productsNeedingChanges) {
      const moveStr = d.migrationActions.moveFieldsToSubcollection
        ? `\`${d.migrationActions.moveFieldsToSubcollection.destinationDocPath}\` (${d.migrationActions.moveFieldsToSubcollection.fieldNames.join(', ')})`
        : 'None';
      const delStr = d.migrationActions.deleteFieldsFromParent.length > 0 ? d.migrationActions.deleteFieldsFromParent.join(', ') : 'None';
      const setStr = `\`${JSON.stringify(d.migrationActions.setFieldsOnParent)}\``;
      const warnStr = d.warnings.length > 0 ? d.warnings.join('; ') : 'None';
      lines.push(`| \`${d.path}\` | ${d.active} | \`${d.category}\` | ${moveStr} | ${delStr} | ${setStr} | ${warnStr} |`);
    }
  }

  lines.push('');
  lines.push('## 4. `/appSettings` & `/siteSettings` Access Audit');
  lines.push(`- Total settings documents: **${settingsPlan.totalDocs}** (Public \`get\` allowlisted: ${settingsPlan.publicAllowlistedDocs}, Admin-only: ${settingsPlan.adminOnlyDocs})`);
  lines.push('| Path | Access Under Proposed Rules | Field Keys |');
  lines.push('| --- | --- | --- |');
  for (const s of settingsPlan.documents) {
    lines.push(`| \`${s.path}\` | \`${s.accessUnderProposedRules}\` | \`${s.fieldKeys.join(', ')}\` |`);
  }

  lines.push('');
  lines.push('## 5. `/posts` Snapshot Count');
  lines.push(`- Backed up **${postsBackup.documentCount}** post documents cleanly (no schema migration required for \`/posts\`).`);
  lines.push('');

  return lines.join('\n');
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

export async function runBackupAndDryRun({
  projectId = DEFAULT_PROJECT_ID,
  databaseId = DEFAULT_DATABASE_ID,
  outputDir = path.resolve(process.cwd(), 'artifacts', 'firestore-backup'),
  rootCollections = DEFAULT_ROOT_COLLECTIONS,
  client
} = {}) {
  const firestoreClient = client || createReadOnlyFirestoreRestClient({ projectId, databaseId });
  const generatedAt = new Date().toISOString();

  fs.mkdirSync(outputDir, { recursive: true });
  const collectionsDir = path.join(outputDir, 'collections');
  fs.mkdirSync(collectionsDir, { recursive: true });

  const overallCounts = {
    totalRootDocuments: 0,
    existingRootDocuments: 0,
    missingParentPlaceholders: 0,
    totalNestedSubcollectionDocuments: 0,
    totalDocumentsBackedUp: 0,
    byRootCollection: {}
  };

  const collections = {};

  for (const colName of rootCollections) {
    const colCounters = {
      totalRootDocuments: 0,
      existingRootDocuments: 0,
      missingParentPlaceholders: 0,
      totalNestedSubcollectionDocuments: 0,
      totalDocumentsBackedUp: 0,
      subcollectionCounts: {}
    };
    const backedUp = await backupCollectionRecursive(firestoreClient, colName, colCounters);
    collections[colName] = backedUp;
    overallCounts.byRootCollection[colName] = colCounters;
    overallCounts.totalRootDocuments += colCounters.totalRootDocuments;
    overallCounts.existingRootDocuments += colCounters.existingRootDocuments;
    overallCounts.missingParentPlaceholders += colCounters.missingParentPlaceholders;
    overallCounts.totalNestedSubcollectionDocuments += colCounters.totalNestedSubcollectionDocuments;
    overallCounts.totalDocumentsBackedUp += colCounters.totalDocumentsBackedUp;

    fs.writeFileSync(
      path.join(collectionsDir, `${colName}.json`),
      JSON.stringify(backedUp, null, 2) + '\n',
      'utf8'
    );
  }

  const completeBackupPayload = {
    metadata: {
      projectId: firestoreClient.projectId,
      databaseId: firestoreClient.databaseId,
      generatedAt,
      mode: 'READ_ONLY_BACKUP',
      rootCollections
    },
    counts: overallCounts,
    collections
  };

  fs.writeFileSync(
    path.join(outputDir, 'firestore-backup-complete.json'),
    JSON.stringify(completeBackupPayload, null, 2) + '\n',
    'utf8'
  );

  const commentsPlan = buildCommentsDryRunPlan(collections.comments || { documents: [] });
  const miniShopPlan = buildMiniShopDryRunPlan(collections.mini_shop_products || { documents: [] });
  const settingsPlan = buildSettingsAuditPlan(collections.appSettings, collections.siteSettings);

  const dryRunJson = {
    metadata: {
      projectId: firestoreClient.projectId,
      databaseId: firestoreClient.databaseId,
      generatedAt,
      mode: 'DRY_RUN_ONLY_ZERO_WRITES'
    },
    comments: commentsPlan,
    mini_shop_products: miniShopPlan,
    settings: settingsPlan
  };

  fs.writeFileSync(
    path.join(outputDir, 'dry-run-migration-report.json'),
    JSON.stringify(dryRunJson, null, 2) + '\n',
    'utf8'
  );

  const dryRunMarkdown = renderDryRunMarkdownReport({
    projectId: firestoreClient.projectId,
    generatedAt,
    counts: overallCounts,
    commentsPlan,
    miniShopPlan,
    settingsPlan,
    postsBackup: collections.posts || { documentCount: 0 }
  });

  fs.writeFileSync(path.join(outputDir, 'dry-run-migration-report.md'), dryRunMarkdown + '\n', 'utf8');

  // Generate SHA-256 checksum manifest across all produced artifact files
  const filesToHash = [
    'firestore-backup-complete.json',
    'dry-run-migration-report.json',
    'dry-run-migration-report.md',
    ...rootCollections.map((c) => `collections/${c}.json`)
  ];

  const filesManifest = filesToHash.map((relFilePath) => {
    const absPath = path.join(outputDir, relFilePath);
    const stat = fs.statSync(absPath);
    return {
      file: relFilePath,
      bytes: stat.size,
      sha256: sha256File(absPath)
    };
  });

  const manifest = {
    projectId: firestoreClient.projectId,
    databaseId: firestoreClient.databaseId,
    generatedAt,
    mode: 'READ_ONLY_BACKUP_AND_DRY_RUN',
    counts: overallCounts,
    dryRunSummary: {
      comments: commentsPlan.summary,
      mini_shop_products: miniShopPlan.summary,
      settings: {
        totalDocs: settingsPlan.totalDocs,
        publicAllowlistedDocs: settingsPlan.publicAllowlistedDocs,
        adminOnlyDocs: settingsPlan.adminOnlyDocs
      }
    },
    files: filesManifest
  };

  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );

  const checksumLines = filesManifest.map((entry) => `${entry.sha256}  ${entry.file}`);
  const manifestSha = sha256File(path.join(outputDir, 'manifest.json'));
  checksumLines.push(`${manifestSha}  manifest.json`);
  fs.writeFileSync(path.join(outputDir, 'checksums.sha256'), checksumLines.join('\n') + '\n', 'utf8');

  return {
    outputDir,
    manifest,
    dryRunJson,
    dryRunMarkdown
  };
}

function parseCliArgs(argv) {
  const args = {
    projectId: process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID,
    databaseId: process.env.FIRESTORE_DATABASE_ID || DEFAULT_DATABASE_ID,
    outputDir: path.resolve(process.cwd(), 'artifacts', 'firestore-backup')
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project' && argv[i + 1]) {
      args.projectId = argv[++i];
    } else if (a === '--database' && argv[i + 1]) {
      args.databaseId = argv[++i];
    } else if (a === '--output-dir' && argv[i + 1]) {
      args.outputDir = path.resolve(argv[++i]);
    }
  }
  return args;
}

const isEntrypoint =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isEntrypoint) {
  (async () => {
    const cli = parseCliArgs(process.argv.slice(2));
    const result = await runBackupAndDryRun(cli);

    // Log ONLY aggregate counts, checksum status, and redacted dry-run markdown (never credentials or raw PII)
    console.log('=== READ-ONLY FIRESTORE BACKUP & DRY-RUN COMPLETE ===');
    console.log(`Project: ${result.manifest.projectId} (${result.manifest.databaseId})`);
    console.log(`Total Documents Backed Up: ${result.manifest.counts.totalDocumentsBackedUp} (Root: ${result.manifest.counts.totalRootDocuments}, Subcollections: ${result.manifest.counts.totalNestedSubcollectionDocuments})`);
    console.log(`Manifest Files Hashed (SHA-256): ${result.manifest.files.length}`);
    console.log('');
    console.log(result.dryRunMarkdown);

    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.dryRunMarkdown + '\n', 'utf8');
    }
  })().catch((err) => {
    console.error('Read-only Firestore backup/dry-run failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

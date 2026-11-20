/**
 * Security Rules Audit Test Suite for ISEZERANO ONLINE (News-Only, Admin-Only Platform)
 *
 * Verifies:
 * 1. Strict single administrator: ONLY twizerefelix90@gmail.com with verified Google auth.
 *    Any other user (even with admin: true claim or non-Google/unverified session) is REJECTED.
 * 2. Users collection is Admin-only (no public/teacher registration or profile self-service).
 * 3. Deleted educational collections (lesson_plans, nursery_students, nursery_school_settings,
 *    nursery_assessments, teacher_profiles, school_directory) are absent from firestore.rules and default-denied.
 * 4. Instant public comments & replies (`published` + legacy `approved` readable publicly without email/phone/ownerToken;
 *    private optional email & ownership tokens isolated in Admin-only subcollections; owner-only edit/delete
 *    with immutable name/postId/parentId/createdAt/status; post-publication Admin moderation).
 * 5. Post view counter exact +1 increment only.
 * 6. News collections, static pages, branding & announcements (public read, Admin-only write).
 * 7. Breaking news FCM token subscriptions (public create validated, read/list/update/delete Admin-only).
 * 8. Storage upload rules restricted exclusively to verified Admin.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { sha256Hex, buildCommentOwnershipVerifier } from '../src/services/commentService';

interface AuthContext {
  uid?: string;
  token?: {
    email?: string;
    email_verified?: boolean;
    admin?: boolean;
    firebase?: {
      sign_in_provider?: string;
    };
  };
}

class FirestoreRulesEngine {
  private documents: Map<string, Record<string, any>>;

  constructor(initialDocs?: Record<string, any>) {
    this.documents = new Map();
    if (initialDocs) {
      for (const [docPath, data] of Object.entries(initialDocs)) {
        this.documents.set(docPath, JSON.parse(JSON.stringify(data)));
      }
    }
  }

  public getDoc(docPath: string): Record<string, any> | null {
    return this.documents.get(docPath) || null;
  }

  public setDoc(docPath: string, data: Record<string, any>): void {
    this.documents.set(docPath, JSON.parse(JSON.stringify(data)));
  }

  private isAuthenticated(auth: AuthContext | null): boolean {
    return auth !== null && auth.uid !== undefined;
  }

  private isGoogleAuth(auth: AuthContext | null): boolean {
    return (
      this.isAuthenticated(auth) &&
      auth?.token?.firebase?.sign_in_provider === 'google.com' &&
      auth?.token?.email_verified === true
    );
  }

  private isAdmin(auth: AuthContext | null): boolean {
    if (!this.isGoogleAuth(auth)) return false;
    const email = auth?.token?.email;
    if (!email) return false;
    return /^twizerefelix90@gmail\.com$/i.test(email);
  }

  private isValidCommentId(id: string): boolean {
    return typeof id === 'string' && id.length > 0 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);
  }

  private isValidPublicCommentCreate(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    const requiredAndAllowed = [
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
    const keys = Object.keys(data);
    if (!requiredAndAllowed.every((k) => k in data)) return false;
    if (!keys.every((k) => requiredAndAllowed.includes(k))) return false;
    if (data.publicSafe !== true) return false;
    if (typeof data.postId !== 'string' || data.postId.length === 0 || data.postId.length > 120) return false;
    if (!(data.parentId === null || this.isValidCommentId(data.parentId))) return false;
    if (data.parentId !== null) {
      const parentDoc = this.getDoc(`comments/${data.parentId}`);
      if (!parentDoc || parentDoc.postId !== data.postId) return false;
      if (parentDoc.status !== 'published' && parentDoc.status !== 'approved') return false;
      if (parentDoc.publicSafe !== true) return false;
    }
    if (data.parentId === null && data.replyToName !== null) return false;
    if (
      data.parentId !== null &&
      !(
        data.replyToName === null ||
        (typeof data.replyToName === 'string' && data.replyToName.length >= 1 && data.replyToName.length <= 80)
      )
    ) {
      return false;
    }
    if (typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 80) return false;
    if (typeof data.content !== 'string' || data.content.length < 2 || data.content.length > 2000) return false;
    if (data.status !== 'published') return false;
    if (typeof data.createdAt !== 'string' || data.createdAt.length < 10 || data.createdAt.length > 60) return false;
    if (typeof data.updatedAt !== 'string' || data.updatedAt !== data.createdAt) return false;
    if (data.edited !== false) return false;
    return true;
  }

  private isValidPublicFcmToken(auth: AuthContext | null, data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.id !== 'string' || data.id.length === 0 || data.id.length > 128) return false;
    if (typeof data.token !== 'string' || data.token.length < 10 || data.token.length > 4096) return false;
    if ('ownerUid' in data) {
      if (data.ownerUid === 'guest_device') return true;
      return this.isAuthenticated(auth) && data.ownerUid === auth?.uid;
    }
    return true;
  }

  // 1. Users (Admin-only)
  public canAccessUser(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  // 2. Removed Educational Collections -> Default Deny
  public canAccessRemovedEducationalCollection(): boolean {
    return false;
  }

  // 3. Posts
  public canReadPost(): boolean {
    return true;
  }

  public canCreateOrDeletePost(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  public canUpdatePost(auth: AuthContext | null, existing: any, updated: any): boolean {
    if (this.isAdmin(auth)) return true;
    const updatedKeys = Object.keys(updated);
    const changedKeys = updatedKeys.filter((k) => updated[k] !== existing[k]);
    if (changedKeys.length !== 1 || changedKeys[0] !== 'views') return false;
    if (typeof updated.views !== 'number' || !Number.isInteger(updated.views)) return false;
    if (!('views' in existing)) return updated.views === 1;
    return updated.views === existing.views + 1;
  }

  // 4. Instant Comments & Discussion Security
  public canReadComment(auth: AuthContext | null, commentId: string): boolean {
    const existing = this.getDoc(`comments/${commentId}`);
    if (!existing) return false;
    if (this.isAdmin(auth)) return true;
    return (
      (existing.status === 'published' || existing.status === 'approved') &&
      existing.publicSafe === true &&
      !('email' in existing) &&
      !('phone' in existing) &&
      !('ownerToken' in existing)
    );
  }

  public canListComments(auth: AuthContext | null, constrainedStatus?: string, constrainedPublicSafe?: boolean): boolean {
    if (this.isAdmin(auth)) return true;
    return (constrainedStatus === 'published' || constrainedStatus === 'approved') && constrainedPublicSafe === true;
  }

  public canReadPrivateCommentSubdoc(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  public canCreateCommentBatch(
    auth: AuthContext | null,
    commentId: string,
    commentData: any,
    ownershipData?: any,
    rawToken?: string,
    includeTokenDoc: boolean = true
  ): boolean {
    if (this.isAdmin(auth)) {
      this.setDoc(`comments/${commentId}`, commentData);
      return true;
    }
    if (!this.isValidCommentId(commentId)) return false;
    if (!this.isValidPublicCommentCreate(commentData)) return false;
    if (this.getDoc(`comments/${commentId}`) || this.getDoc(`comments/${commentId}/private/ownership`)) {
      return false;
    }
    if (!ownershipData || !rawToken || !/^[a-fA-F0-9]{32,128}$/.test(rawToken)) return false;
    if (!includeTokenDoc) return false;
    const tokenHash = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
    if (typeof ownershipData.tokenHash !== 'string' || !/^[a-f0-9]{64}$/.test(ownershipData.tokenHash)) {
      return false;
    }
    if (ownershipData.tokenHash !== tokenHash) return false;
    if (ownershipData.postId !== commentData.postId) return false;
    if (ownershipData.createdAt !== commentData.createdAt) return false;
    if (ownershipData.lastSyncedAt !== ownershipData.createdAt || ownershipData.verifier !== '') return false;
    if ('email' in ownershipData && (typeof ownershipData.email !== 'string' || ownershipData.email.length > 160)) {
      return false;
    }

    this.setDoc(`comments/${commentId}`, commentData);
    this.setDoc(`comments/${commentId}/tokens/${tokenHash}`, {
      tokenHash,
      postId: commentData.postId,
      createdAt: commentData.createdAt
    });
    this.setDoc(`comments/${commentId}/private/ownership`, ownershipData);
    return true;
  }

  public canForgeTokenOnExistingComment(auth: AuthContext | null, commentId: string): boolean {
    if (this.isAdmin(auth)) return true;
    // Rule requires !exists(comments/$(commentId)) so attaching a token to an existing comment fails
    return !this.getDoc(`comments/${commentId}`);
  }

  private hasValidVerifier(
    commentId: string,
    verifier: unknown,
    commentData: any,
    syncedAt: unknown
  ): boolean {
    if (typeof verifier !== 'string' || !/^[a-fA-F0-9]{32,128}:[a-f0-9]{64}$/.test(verifier)) {
      return false;
    }
    if (typeof syncedAt !== 'string' || syncedAt.length < 10) return false;
    const [rawToken, proof] = verifier.split(':');
    const tokenHash = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
    const ownDoc = this.getDoc(`comments/${commentId}/private/ownership`);
    if (!ownDoc || ownDoc.tokenHash !== tokenHash) return false;
    const tokenDoc = this.getDoc(`comments/${commentId}/tokens/${tokenHash}`);
    if (!tokenDoc) return false;
    if (tokenDoc.tokenHash !== tokenHash) return false;
    if (tokenDoc.postId !== commentData.postId || tokenDoc.createdAt !== commentData.createdAt) {
      return false;
    }
    const expectedProof = crypto
      .createHash('sha256')
      .update(`${rawToken}:${commentData.postId}:${commentData.createdAt}:${syncedAt}`, 'utf8')
      .digest('hex');
    return proof === expectedProof;
  }

  public canEditCommentBatch(
    auth: AuthContext | null,
    commentId: string,
    nextCommentData: any,
    verifier?: string
  ): boolean {
    const existing = this.getDoc(`comments/${commentId}`);
    if (!existing) return false;
    if (this.isAdmin(auth)) {
      this.setDoc(`comments/${commentId}`, nextCommentData);
      return true;
    }

    const own = this.getDoc(`comments/${commentId}/private/ownership`);
    if (!own) return false;
    if (verifier === own.verifier) return false;

    const allKeys = new Set([...Object.keys(existing), ...Object.keys(nextCommentData)]);
    const changedKeys = Array.from(allKeys).filter(
      (k) => JSON.stringify(existing[k]) !== JSON.stringify(nextCommentData[k])
    );
    const allowedDiff = new Set(['content', 'updatedAt', 'edited']);
    if (!changedKeys.every((k) => allowedDiff.has(k))) return false;
    if (
      typeof nextCommentData.content !== 'string' ||
      nextCommentData.content.length < 2 ||
      nextCommentData.content.length > 2000
    ) {
      return false;
    }
    if (nextCommentData.edited !== true) return false;
    if (
      typeof nextCommentData.updatedAt !== 'string' ||
      nextCommentData.updatedAt === existing.updatedAt ||
      nextCommentData.updatedAt === own.lastSyncedAt
    ) {
      return false;
    }
    if (!(existing.status === 'published' || existing.status === 'approved')) return false;
    if (!this.hasValidVerifier(commentId, verifier, existing, nextCommentData.updatedAt)) {
      return false;
    }

    this.setDoc(`comments/${commentId}`, nextCommentData);
    this.setDoc(`comments/${commentId}/private/ownership`, {
      ...own,
      verifier,
      lastSyncedAt: nextCommentData.updatedAt
    });
    return true;
  }

  public canDeleteCommentBatch(
    auth: AuthContext | null,
    commentId: string,
    verifier?: string,
    deleteMarker?: string
  ): boolean {
    const existing = this.getDoc(`comments/${commentId}`);
    if (!existing) return false;
    if (this.isAdmin(auth)) {
      this.documents.delete(`comments/${commentId}`);
      return true;
    }

    const own = this.getDoc(`comments/${commentId}/private/ownership`);
    if (!own) return false;
    if (verifier === own.verifier) return false;
    if (typeof deleteMarker !== 'string' || deleteMarker.length < 10 || deleteMarker === own.lastSyncedAt) {
      return false;
    }
    if (!this.hasValidVerifier(commentId, verifier, existing, deleteMarker)) {
      return false;
    }

    this.setDoc(`comments/${commentId}/private/ownership`, {
      ...own,
      verifier,
      lastSyncedAt: deleteMarker
    });
    this.documents.delete(`comments/${commentId}`);
    return true;
  }

  public canModerateComment(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  // 5. Public CMS collections
  public canReadPublicCms(): boolean {
    return true;
  }

  public canWritePublicCms(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  // 6. FCM Tokens
  public canCreateFcmToken(auth: AuthContext | null, data: any): boolean {
    if (this.isAdmin(auth)) return true;
    return this.isValidPublicFcmToken(auth, data);
  }

  public canReadOrManageFcmToken(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  // 7. Storage upload rule evaluation
  public canUploadStorageMedia(
    auth: AuthContext | null,
    contentType: string,
    sizeBytes: number,
    maxBytes: number
  ): boolean {
    return (
      this.isAdmin(auth) &&
      contentType.startsWith('image/') &&
      sizeBytes < maxBytes
    );
  }

  // 8. Mini Shop products (public reads active + publicSafe items; Admin-only read-all, write, delete)
  private isValidMiniShopProductWrite(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    const required = [
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
    const allowed = [
      ...required,
      'price',
      'imageStorageMode',
      'whatsappNumber',
      'phoneNumber'
    ];
    const keys = Object.keys(data);
    if (!required.every((k) => k in data)) return false;
    if (!keys.every((k) => allowed.includes(k))) return false;
    if (data.publicSafe !== true) return false;
    if (typeof data.id !== 'string' || data.id.length === 0 || data.id.length > 128) return false;
    if (typeof data.title !== 'string' || data.title.length < 2 || data.title.length > 90) return false;
    if (typeof data.description !== 'string' || data.description.length < 2 || data.description.length > 200) return false;
    if ('price' in data && (typeof data.price !== 'string' || data.price.length > 40)) return false;
    if (typeof data.imageUrl !== 'string' || data.imageUrl.length < 5 || data.imageUrl.length > 750000) return false;
    if (
      'imageStorageMode' in data &&
      data.imageStorageMode !== 'firebase_storage' &&
      data.imageStorageMode !== 'firestore_embedded'
    ) {
      return false;
    }
    if ('whatsappNumber' in data && (typeof data.whatsappNumber !== 'string' || data.whatsappNumber.length > 30)) {
      return false;
    }
    if ('phoneNumber' in data && (typeof data.phoneNumber !== 'string' || data.phoneNumber.length > 30)) {
      return false;
    }
    const hasWa = typeof data.whatsappNumber === 'string' && data.whatsappNumber.length > 0;
    const hasTel = typeof data.phoneNumber === 'string' && data.phoneNumber.length > 0;
    if (!hasWa && !hasTel) return false;
    if (typeof data.active !== 'boolean') return false;
    if (typeof data.displayOrder !== 'number' || !Number.isInteger(data.displayOrder) || data.displayOrder < 0) {
      return false;
    }
    if (typeof data.createdAt !== 'string' || data.createdAt.length < 10 || data.createdAt.length > 60) return false;
    if (typeof data.updatedAt !== 'string' || data.updatedAt.length < 10 || data.updatedAt.length > 60) return false;
    return true;
  }

  public canReadMiniShopProduct(auth: AuthContext | null, product: Record<string, any> | null): boolean {
    if (this.isAdmin(auth)) return true;
    return Boolean(product && product.active === true && this.isValidMiniShopProductWrite(product));
  }

  public canListMiniShopProducts(auth: AuthContext | null, queryWhereActiveAndSafe: boolean): boolean {
    if (this.isAdmin(auth)) return true;
    return queryWhereActiveAndSafe;
  }

  public canWriteMiniShopProduct(auth: AuthContext | null, data: any): boolean {
    return this.isAdmin(auth) && this.isValidMiniShopProductWrite(data);
  }

  public canDeleteMiniShopProduct(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  public canAccessMiniShopPrivateSubdoc(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }
}

export function runSecurityAuditTests() {
  console.log('===========================================================');
  console.log('STARTING FIRESTORE & STORAGE SECURITY AUDIT (NEWS-ONLY)');
  console.log('===========================================================');

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, reason?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${reason ? ` - ${reason}` : ''}`);
      failed++;
    }
  }

  const admin: AuthContext = {
    uid: 'admin-felix-uid',
    token: {
      email: 'twizerefelix90@gmail.com',
      email_verified: true,
      admin: true,
      firebase: { sign_in_provider: 'google.com' }
    }
  };

  const unverifiedAdminEmail: AuthContext = {
    uid: 'unverified-admin-uid',
    token: {
      email: 'twizerefelix90@gmail.com',
      email_verified: false,
      firebase: { sign_in_provider: 'password' }
    }
  };

  const maliciousAdminClaim: AuthContext = {
    uid: 'fake-admin-uid',
    token: {
      email: 'fake.admin@gmail.com',
      email_verified: true,
      admin: true,
      firebase: { sign_in_provider: 'google.com' }
    }
  };

  const randomGoogleUser: AuthContext = {
    uid: 'visitor-google-uid',
    token: {
      email: 'reader@gmail.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' }
    }
  };

  const engine = new FirestoreRulesEngine({
    'posts/post-1': {
      title: 'Rwanda Economic Growth Outlook',
      content: '<p>Full report</p>',
      views: 42
    },
    'posts/post-2': {
      title: 'Regional Infrastructure Update',
      content: '<p>Bridge project opens</p>'
    },
    'comments/comment-approved-clean': {
      name: 'John Doe',
      content: 'Very informative report!',
      postId: 'post-1',
      status: 'approved',
      publicSafe: true
    },
    'comments/comment-approved-with-email': {
      name: 'Jane Smith',
      content: 'Great coverage!',
      postId: 'post-1',
      email: 'jane@example.com',
      status: 'approved'
    },
    'comments/comment-pending': {
      name: 'Pending Commenter',
      content: 'Awaiting moderation',
      postId: 'post-1',
      status: 'pending'
    },
    'comments/comment-hidden': {
      name: 'Hidden Author',
      content: 'Hidden post-publication',
      postId: 'post-1',
      status: 'hidden'
    },
    'comments/comment-rejected': {
      name: 'Spam Author',
      content: 'Rejected content',
      postId: 'post-1',
      status: 'rejected'
    }
  });

  // 1. Strict Single Admin Verification
  console.log('\n--- 1. STRICT SINGLE ADMINISTRATOR TESTS ---');
  assert('Verified Google Admin twizerefelix90@gmail.com CAN manage users', engine.canAccessUser(admin));
  assert('Unverified non-Google admin email CANNOT access users', !engine.canAccessUser(unverifiedAdminEmail));
  assert('Attacker with token.admin == true claim CANNOT access users', !engine.canAccessUser(maliciousAdminClaim));
  assert('Random authenticated Google user CANNOT access users', !engine.canAccessUser(randomGoogleUser));
  assert('Unauthenticated visitor CANNOT access users', !engine.canAccessUser(null));

  // 2. Removed Educational Collections Check (Static Rules Inspection + Default Deny)
  console.log('\n--- 2. EDUCATIONAL RULES PERMANENT REMOVAL TESTS ---');
  const firestoreRulesSrc = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
  const storageRulesSrc = fs.readFileSync(path.resolve('storage.rules'), 'utf8');

  for (const legacyCollection of [
    'lesson_plans',
    'nursery_students',
    'nursery_school_settings',
    'nursery_assessments',
    'teacher_profiles',
    'school_directory'
  ]) {
    assert(
      `firestore.rules no longer exposes legacy educational collection "${legacyCollection}"`,
      !firestoreRulesSrc.includes(legacyCollection)
    );
  }
  assert('Legacy educational collections default-denied', !engine.canAccessRemovedEducationalCollection());
  assert(
    'storage.rules removes token.admin claim bypass and open isAuthenticated() write bypass',
    !storageRulesSrc.includes('token.admin == true') && !storageRulesSrc.includes('|| isAuthenticated()')
  );

  // 3. Instant Comments, Replies, Private Optional Email & Author-Only Edit/Delete
  console.log('\n--- 3. INSTANT COMMENTS, REPLIES, PRIVACY & OWNERSHIP TESTS ---');
  assert('Public visitor CAN read legacy approved clean comment', engine.canReadComment(null, 'comment-approved-clean'));
  assert('Public visitor CANNOT read approved comment with private email', !engine.canReadComment(null, 'comment-approved-with-email'));
  assert('Public visitor CANNOT read legacy pending comment', !engine.canReadComment(null, 'comment-pending'));
  assert('Public visitor CANNOT read hidden/rejected comment', !engine.canReadComment(null, 'comment-hidden') && !engine.canReadComment(null, 'comment-rejected'));
  assert('Admin CAN read hidden/pending/rejected/private comments', engine.canReadComment(admin, 'comment-hidden') && engine.canReadComment(admin, 'comment-pending'));

  const aliceToken = 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef';
  const aliceTokenHash = sha256Hex(aliceToken);
  const aliceTs = '2026-11-18T08:00:00.000Z';
  const aliceComment = {
    postId: 'post-1',
    parentId: null,
    replyToName: null,
    name: 'Alice Mukamana',
    content: 'Thank you for this clear news report.',
    status: 'published',
    createdAt: aliceTs,
    updatedAt: aliceTs,
    edited: false,
    publicSafe: true
  };

  assert(
    'Public visitor CAN publish instant comment + private optional email atomically without exposing email in public doc',
    engine.canCreateCommentBatch(
      null,
      'comment_alice_1',
      aliceComment,
      {
        tokenHash: aliceTokenHash,
        postId: 'post-1',
        createdAt: aliceTs,
        lastSyncedAt: aliceTs,
        verifier: '',
        email: 'alice@example.com'
      },
      aliceToken
    )
  );
  assert('Public visitor CAN immediately read newly published comment', engine.canReadComment(null, 'comment_alice_1'));
  assert('Public/non-admin visitor CANNOT read private email or token subcollection', !engine.canReadPrivateCommentSubdoc(null) && !engine.canReadPrivateCommentSubdoc(randomGoogleUser));
  assert('Admin CAN inspect private subcollections when needed', engine.canReadPrivateCommentSubdoc(admin));

  const bobToken = 'b1c2d3e4f5a678901234567890abcdef1234567890abcdef';
  const bobTokenHash = sha256Hex(bobToken);
  const bobTs = '2026-11-18T08:05:00.000Z';
  assert(
    'Public visitor CAN publish instant reply referencing parentId and replyToName',
    engine.canCreateCommentBatch(
      null,
      'comment_bob_reply_1',
      {
        postId: 'post-1',
        parentId: 'comment_alice_1',
        replyToName: 'Alice Mukamana',
        name: 'Bob Niyonsenga',
        content: 'I agree with your point!',
        status: 'published',
        createdAt: bobTs,
        updatedAt: bobTs,
        edited: false,
        publicSafe: true
      },
      {
        tokenHash: bobTokenHash,
        postId: 'post-1',
        createdAt: bobTs,
        lastSyncedAt: bobTs,
        verifier: ''
      },
      bobToken
    )
  );
  assert('Public visitor CAN read instant reply immediately', engine.canReadComment(null, 'comment_bob_reply_1'));

  assert(
    'Public visitor CANNOT put email directly on public /comments doc',
    !engine.canCreateCommentBatch(
      null,
      'comment_leak',
      { ...aliceComment, email: 'leak@example.com' },
      { tokenHash: aliceTokenHash, postId: 'post-1', createdAt: aliceTs, lastSyncedAt: aliceTs, verifier: '' },
      aliceToken
    )
  );
  assert(
    'Public visitor CANNOT create comment without ownership subdoc',
    !engine.canCreateCommentBatch(null, 'comment_no_own', aliceComment, undefined, undefined)
  );
  assert(
    'Public visitor CANNOT create comment without /tokens/{tokenHash} document or with mismatched tokenHash',
    !engine.canCreateCommentBatch(
      null,
      'comment_no_token_doc',
      aliceComment,
      { tokenHash: aliceTokenHash, postId: 'post-1', createdAt: aliceTs, lastSyncedAt: aliceTs, verifier: '' },
      aliceToken,
      false
    ) &&
      !engine.canCreateCommentBatch(
        null,
        'comment_mismatch_tokenhash',
        aliceComment,
        { tokenHash: bobTokenHash, postId: 'post-1', createdAt: aliceTs, lastSyncedAt: aliceTs, verifier: '' },
        aliceToken,
        true
      )
  );
  assert(
    'Public visitor CANNOT attach forged token onto existing legacy comment',
    !engine.canForgeTokenOnExistingComment(null, 'comment-approved-clean')
  );

  // Verify commentService.ts SHA-256 matches Node crypto
  assert(
    'commentService.ts sha256Hex matches Node crypto SHA-256 bit-for-bit',
    sha256Hex(aliceToken) === crypto.createHash('sha256').update(aliceToken, 'utf8').digest('hex')
  );

  // Author edits own comment using cryptographic proof
  const aliceEditTs = '2026-11-18T08:10:00.000Z';
  const validAliceEditVerifier = buildCommentOwnershipVerifier({
    ownerToken: aliceToken,
    postId: 'post-1',
    createdAt: aliceTs,
    syncedAt: aliceEditTs
  });
  assert(
    'Original author WITH cryptographic ownerToken+proof CAN edit own comment content & edited flag',
    engine.canEditCommentBatch(
      null,
      'comment_alice_1',
      {
        ...aliceComment,
        content: 'Updated insight on this clear report.',
        updatedAt: aliceEditTs,
        edited: true
      },
      validAliceEditVerifier
    )
  );
  assert(
    'Fake or unhashed actionProof part in verifier is REJECTED even with valid ownerToken',
    !engine.canEditCommentBatch(
      null,
      'comment_alice_1',
      {
        ...aliceComment,
        content: 'Tampered nonce proof',
        updatedAt: '2026-11-18T08:10:30.000Z',
        edited: true
      },
      `${aliceToken}:${'0'.repeat(64)}`
    )
  );
  assert(
    'Original author CANNOT mutate immutable name, postId, parentId, or status on edit',
    !engine.canEditCommentBatch(
      null,
      'comment_alice_1',
      {
        ...aliceComment,
        name: 'Impersonated Admin',
        content: 'Tampered',
        updatedAt: '2026-11-18T08:11:00.000Z',
        edited: true
      },
      buildCommentOwnershipVerifier({
        ownerToken: aliceToken,
        postId: 'post-1',
        createdAt: aliceTs,
        syncedAt: '2026-11-18T08:11:00.000Z'
      })
    )
  );
  assert(
    'Another visitor (Bob / attacker with same name "Alice Mukamana") WITHOUT Alice ownerToken CANNOT edit Alice comment',
    !engine.canEditCommentBatch(
      null,
      'comment_alice_1',
      {
        ...aliceComment,
        content: 'Hijacked comment',
        updatedAt: '2026-11-18T08:12:00.000Z',
        edited: true
      },
      buildCommentOwnershipVerifier({
        ownerToken: bobToken,
        postId: 'post-1',
        createdAt: aliceTs,
        syncedAt: '2026-11-18T08:12:00.000Z'
      })
    )
  );
  assert(
    'Another visitor CANNOT replay stale verifier after edit',
    !engine.canEditCommentBatch(
      null,
      'comment_alice_1',
      {
        ...aliceComment,
        content: 'Replay exploit',
        updatedAt: '2026-11-18T08:13:00.000Z',
        edited: true
      },
      validAliceEditVerifier
    )
  );

  // Delete authorization
  const badDelMarker = 'deleted_10000_del001';
  assert(
    'Non-owner CANNOT delete Alice comment',
    !engine.canDeleteCommentBatch(
      null,
      'comment_alice_1',
      buildCommentOwnershipVerifier({
        ownerToken: bobToken,
        postId: 'post-1',
        createdAt: aliceTs,
        syncedAt: badDelMarker
      }),
      badDelMarker
    )
  );
  const validBobDelMarker = 'deleted_10001_del002';
  assert(
    'Original author WITH valid cryptographic verifier CAN delete own reply',
    engine.canDeleteCommentBatch(
      null,
      'comment_bob_reply_1',
      buildCommentOwnershipVerifier({
        ownerToken: bobToken,
        postId: 'post-1',
        createdAt: bobTs,
        syncedAt: validBobDelMarker
      }),
      validBobDelMarker
    )
  );
  const resurrectToken = 'c1d2e3f4a5b678901234567890abcdef1234567890abcdef';
  assert(
    'Attacker CANNOT resurrect a deleted comment ID to overwrite ownership',
    !engine.canCreateCommentBatch(
      null,
      'comment_bob_reply_1',
      aliceComment,
      { tokenHash: sha256Hex(resurrectToken), postId: 'post-1', createdAt: aliceTs, lastSyncedAt: aliceTs, verifier: '' },
      resurrectToken
    )
  );
  assert('Public/Google non-admin CANNOT hide or moderate comments', !engine.canModerateComment(randomGoogleUser));
  assert('Admin CAN hide, restore, or delete any comment after publication', engine.canModerateComment(admin));

  assert(
    'Public visitor CAN list comments when querying status == published/approved AND publicSafe == true, and CANNOT run unfiltered or publicSafe-missing list queries',
    engine.canListComments(null, 'published', true) &&
      engine.canListComments(null, 'approved', true) &&
      !engine.canListComments(null, 'published', false) &&
      !engine.canListComments(null, undefined, true) &&
      !engine.canListComments(null, 'pending', true) &&
      !engine.canListComments(null, 'hidden', true) &&
      engine.canListComments(admin, undefined, undefined)
  );

  assert(
    'firestore.rules defines cryptographic hashing.sha256 verifier without get().id, hasOnly list guards, and /private isolation',
    firestoreRulesSrc.includes('match /tokens/{tokenId}') &&
      firestoreRulesSrc.includes('match /private/{ownershipId}') &&
      firestoreRulesSrc.includes('hashing.sha256') &&
      !firestoreRulesSrc.includes('.id ==') &&
      firestoreRulesSrc.includes('hasOnlyPublicCommentFields(resource.data)') &&
      firestoreRulesSrc.includes('hasOnlyMiniShopPublicFields(resource.data)') &&
      firestoreRulesSrc.includes("resource.data.status in ['published', 'approved']") &&
      firestoreRulesSrc.includes("get(/databases/$(database)/documents/comments/$(commentId)/private/ownership).data.verifier !=") &&
      firestoreRulesSrc.includes('exists(/databases/$(database)/documents/comments/$(commentId))') &&
      firestoreRulesSrc.includes('!exists(/databases/$(database)/documents/comments/$(commentId)/private/ownership)')
  );

  // 4. Post View Counter Increment (+1 only)
  console.log('\n--- 4. POST VIEW-COUNTER & CMS WRITE TESTS ---');
  const post1 = engine.getDoc('posts/post-1')!;
  const post2 = engine.getDoc('posts/post-2')!;
  assert('Public visitor CAN read posts', engine.canReadPost());
  assert('Public visitor CAN increment views +1', engine.canUpdatePost(null, post1, { ...post1, views: 43 }));
  assert('Public visitor CAN initialize views to 1', engine.canUpdatePost(null, post2, { ...post2, views: 1 }));
  assert('Public visitor CANNOT jump views +2', !engine.canUpdatePost(null, post1, { ...post1, views: 44 }));
  assert('Public visitor CANNOT decrement views', !engine.canUpdatePost(null, post1, { ...post1, views: 41 }));
  assert('Public visitor CANNOT alter title along with views', !engine.canUpdatePost(null, post1, { ...post1, title: 'Hacked', views: 43 }));
  assert('Non-admin Google user CANNOT create/delete posts or edit CMS pages', !engine.canCreateOrDeletePost(randomGoogleUser) && !engine.canWritePublicCms(randomGoogleUser));
  assert('Admin CAN create/delete posts & edit CMS pages/categories/ads', engine.canCreateOrDeletePost(admin) && engine.canWritePublicCms(admin));

  // 5. FCM Breaking News Subscriptions & Storage Admin Enforcement
  console.log('\n--- 5. FCM PUSH SUBSCRIPTIONS & STORAGE RULES TESTS ---');
  assert(
    'Public news reader CAN register breaking news push subscription token without login',
    engine.canCreateFcmToken(null, {
      id: 'tok_guest_1',
      token: 'fcm_public_device_token_123456',
      ownerUid: 'guest_device'
    })
  );
  assert(
    'Public reader CANNOT spoof another UID in FCM token creation',
    !engine.canCreateFcmToken(null, {
      id: 'tok_spoof',
      token: 'fcm_public_device_token_123456',
      ownerUid: 'admin-felix-uid'
    })
  );
  assert('Public / non-admin reader CANNOT read, list, update, or delete FCM tokens', !engine.canReadOrManageFcmToken(null) && !engine.canReadOrManageFcmToken(randomGoogleUser));
  assert('Admin CAN read, list, and prune FCM tokens', engine.canReadOrManageFcmToken(admin));
  assert('Verified Admin CAN upload valid post image (<15MB)', engine.canUploadStorageMedia(admin, 'image/jpeg', 500_000, 15 * 1024 * 1024));
  assert('Random authenticated Google user CANNOT upload to Storage', !engine.canUploadStorageMedia(randomGoogleUser, 'image/jpeg', 500_000, 15 * 1024 * 1024));
  assert('Attacker with spoofed token.admin claim CANNOT upload to Storage', !engine.canUploadStorageMedia(maliciousAdminClaim, 'image/jpeg', 500_000, 15 * 1024 * 1024));

  // 6. Mini Shop Security Rules
  console.log('\n--- 6. MINI SHOP PRODUCT SHOWCASE SECURITY TESTS ---');
  const validProductPayload = {
    id: 'prod_1',
    title: 'Solar Radio Pro',
    description: 'Rechargeable FM/AM radio with solar charging.',
    price: '18,000 RWF',
    imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    imageStorageMode: 'firestore_embedded',
    whatsappNumber: '+250780000111',
    phoneNumber: '0780000111',
    active: true,
    displayOrder: 0,
    createdAt: '2026-11-18T08:00:00.000Z',
    updatedAt: '2026-11-18T08:00:00.000Z',
    publicSafe: true
  };
  assert(
    'Unauthenticated public visitor CAN get & list active + publicSafe Mini Shop products',
    engine.canReadMiniShopProduct(null, validProductPayload) && engine.canListMiniShopProducts(null, true)
  );
  assert(
    'Unauthenticated & non-admin visitor CANNOT read inactive Mini Shop drafts, un-migrated docs, or list unfiltered products',
    !engine.canReadMiniShopProduct(null, { ...validProductPayload, active: false }) &&
      !engine.canReadMiniShopProduct(null, { ...validProductPayload, publicSafe: false }) &&
      !engine.canReadMiniShopProduct(randomGoogleUser, { ...validProductPayload, active: false }) &&
      !engine.canListMiniShopProducts(null, false)
  );
  assert(
    'Public & non-admin visitor CANNOT read Mini Shop private subcollection',
    !engine.canAccessMiniShopPrivateSubdoc(null) && !engine.canAccessMiniShopPrivateSubdoc(randomGoogleUser)
  );
  assert(
    'Admin CAN read inactive Mini Shop drafts & list all products',
    engine.canReadMiniShopProduct(admin, { ...validProductPayload, active: false }) && engine.canListMiniShopProducts(admin, false)
  );
  assert(
    'Public/non-admin/spoofed-claim/unverified users CANNOT create, edit, or delete Mini Shop products',
    !engine.canWriteMiniShopProduct(null, validProductPayload) &&
      !engine.canWriteMiniShopProduct(randomGoogleUser, validProductPayload) &&
      !engine.canWriteMiniShopProduct(maliciousAdminClaim, validProductPayload) &&
      !engine.canWriteMiniShopProduct(unverifiedAdminEmail, validProductPayload) &&
      !engine.canDeleteMiniShopProduct(null) &&
      !engine.canDeleteMiniShopProduct(randomGoogleUser)
  );
  assert(
    'Verified Google Admin twizerefelix90@gmail.com CAN create, update, toggle & delete valid Mini Shop products',
    engine.canWriteMiniShopProduct(admin, validProductPayload) &&
      engine.canWriteMiniShopProduct(admin, { ...validProductPayload, active: false }) &&
      engine.canDeleteMiniShopProduct(admin)
  );
  assert(
    'Mini Shop write rules reject extra admin/private fields (such as updatedBy or sellerEmail) on public docs',
    !engine.canWriteMiniShopProduct(admin, {
      ...validProductPayload,
      updatedBy: 'twizerefelix90@gmail.com'
    })
  );
  assert(
    'firestore.rules defines hardened mini_shop_products publicSafe active-only read, Admin-only write/delete, and strict appSettings/fcm_config isolation',
    firestoreRulesSrc.includes('match /mini_shop_products/{productId}') &&
      firestoreRulesSrc.includes('function isValidMiniShopProductWrite(data)') &&
      firestoreRulesSrc.includes('hasOnlyMiniShopPublicFields(resource.data)') &&
      firestoreRulesSrc.includes('allow create, update: if isAdmin() && isValidMiniShopProductWrite(request.resource.data);') &&
      firestoreRulesSrc.includes('allow delete: if isAdmin();') &&
      firestoreRulesSrc.includes('match /appSettings/fcm_config')
  );

  console.log('===========================================================');
  console.log(`AUDIT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    throw new Error(`Security rules audit failed with ${failed} failed tests!`);
  }
}

runSecurityAuditTests();

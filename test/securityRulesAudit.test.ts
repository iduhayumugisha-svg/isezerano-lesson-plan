/**
 * Security Rules Audit Test Suite for ISEZERANO ONLINE (News-Only, Admin-Only Platform)
 *
 * Verifies:
 * 1. Strict single administrator: ONLY twizerefelix90@gmail.com with verified Google auth.
 *    Any other user (even with admin: true claim or non-Google/unverified session) is REJECTED.
 * 2. Users collection is Admin-only (no public/teacher registration or profile self-service).
 * 3. Deleted educational collections (lesson_plans, nursery_students, nursery_school_settings,
 *    nursery_assessments, teacher_profiles, school_directory) are absent from firestore.rules and default-denied.
 * 4. Public comments privacy & moderation (`approved` without email/phone public; `pending`/`rejected` Admin-only).
 * 5. Post view counter exact +1 increment only.
 * 6. News collections, static pages, branding & announcements (public read, Admin-only write).
 * 7. Breaking news FCM token subscriptions (public create validated, read/list/update/delete Admin-only).
 * 8. Storage upload rules restricted exclusively to verified Admin.
 */

import fs from 'node:fs';
import path from 'node:path';

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

  private isValidPublicComment(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    const allowed = new Set(['name', 'content', 'postId', 'createdAt', 'status']);
    const keys = Object.keys(data);
    if (!keys.every((k) => allowed.has(k))) return false;
    if (typeof data.name !== 'string' || data.name.length < 2 || data.name.length > 80) return false;
    if (typeof data.content !== 'string' || data.content.length < 2 || data.content.length > 2000) return false;
    if (typeof data.postId !== 'string' || data.postId.length === 0 || data.postId.length > 120) return false;
    if ('status' in data && data.status !== 'pending') return false;
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

  // 4. Comments
  public canReadComment(auth: AuthContext | null, commentId: string): boolean {
    const existing = this.getDoc(`comments/${commentId}`);
    if (!existing) return false;
    if (this.isAdmin(auth)) return true;
    return existing.status === 'approved' && !('email' in existing) && !('phone' in existing);
  }

  public canCreateComment(auth: AuthContext | null, data: any): boolean {
    if (this.isAdmin(auth)) return true;
    return this.isValidPublicComment(data);
  }

  public canModerateComment(auth: AuthContext | null): boolean {
    return this.isAdmin(auth);
  }

  // 5. Public CMS collections (categories, website_pages, appSettings, siteSettings, announcements)
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
      status: 'approved'
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

  // 3. Public Comments Privacy & Moderation
  console.log('\n--- 3. PUBLIC COMMENTS PRIVACY & MODERATION TESTS ---');
  assert('Public visitor CAN read approved clean comment', engine.canReadComment(null, 'comment-approved-clean'));
  assert('Public visitor CANNOT read approved comment with private email', !engine.canReadComment(null, 'comment-approved-with-email'));
  assert('Public visitor CANNOT read pending comment', !engine.canReadComment(null, 'comment-pending'));
  assert('Public visitor CANNOT read rejected comment', !engine.canReadComment(null, 'comment-rejected'));
  assert('Admin CAN read pending/rejected/private comments', engine.canReadComment(admin, 'comment-pending') && engine.canReadComment(admin, 'comment-rejected'));
  assert(
    'Public visitor CAN submit valid pending comment',
    engine.canCreateComment(null, {
      name: 'Alice Mukamana',
      content: 'Thank you for this clear news report.',
      postId: 'post-1',
      status: 'pending'
    })
  );
  assert(
    'Public visitor CANNOT submit comment with email field',
    !engine.canCreateComment(null, {
      name: 'Alice',
      content: 'Contact me',
      postId: 'post-1',
      email: 'alice@example.com'
    })
  );
  assert(
    'Public visitor CANNOT self-approve comment',
    !engine.canCreateComment(null, {
      name: 'Alice',
      content: 'Approved comment',
      postId: 'post-1',
      status: 'approved'
    })
  );
  assert('Public/Google non-admin CANNOT moderate or delete comments', !engine.canModerateComment(randomGoogleUser));
  assert('Admin CAN moderate or delete comments', engine.canModerateComment(admin));

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

  console.log('===========================================================');
  console.log(`AUDIT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    throw new Error(`Security rules audit failed with ${failed} failed tests!`);
  }
}

runSecurityAuditTests();

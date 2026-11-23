/**
 * Real Firebase Firestore Rules Emulator Security Verification Suite
 * for ISEZERANO ONLINE (`isezerano-news`)
 *
 * Executes live reads, writes, queries, and atomic batches against the real
 * Cloud Firestore Security Rules engine via @firebase/rules-unit-testing.
 *
 * Run with:
 *   firebase emulators:exec --only firestore --project isezerano-news "npx tsx test/firestoreEmulator.test.ts"
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { sha256Hex, buildCommentOwnershipVerifier } from '../src/services/commentService';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';

const PROJECT_ID = 'isezerano-news';
const ADMIN_EMAIL = 'twizerefelix90@gmail.com';

async function runFirestoreEmulatorTests(): Promise<void> {
  const rules = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');

  const emulatorHostEnv = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8188';
  const [emuHost, emuPortRaw] = emulatorHostEnv.split(':');
  const emuPort = Number(emuPortRaw) || 8188;

  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: emuHost || '127.0.0.1',
      port: emuPort
    }
  });

  let passed = 0;
  const check = async (name: string, fn: () => Promise<void>) => {
    await fn();
    console.log(`[EMULATOR PASS] ${name}`);
    passed++;
  };

  try {
    await testEnv.clearFirestore();

    // Contexts
    const guestCtx = testEnv.unauthenticatedContext();
    const guestDb = guestCtx.firestore();

    const otherUserCtx = testEnv.authenticatedContext('user-bob-123', {
      email: 'reader@gmail.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' }
    });
    const otherUserDb = otherUserCtx.firestore();

    const spoofedClaimCtx = testEnv.authenticatedContext('attacker-claim-999', {
      email: 'attacker@gmail.com',
      email_verified: true,
      admin: true,
      firebase: { sign_in_provider: 'google.com' }
    });
    const spoofedClaimDb = spoofedClaimCtx.firestore();

    const unverifiedAdminCtx = testEnv.authenticatedContext('unverified-admin', {
      email: ADMIN_EMAIL,
      email_verified: false,
      firebase: { sign_in_provider: 'password' }
    });
    const unverifiedAdminDb = unverifiedAdminCtx.firestore();

    const adminCtx = testEnv.authenticatedContext('admin-felix-uid', {
      email: ADMIN_EMAIL,
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' }
    });
    const adminDb = adminCtx.firestore();

    // Seed initial baseline data bypassing rules to represent existing production records
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'posts', 'post-rw-1'), {
        title: 'Rwanda Development Update',
        content: '<p>Published article</p>',
        status: 'published',
        views: 10
      });
      await setDoc(doc(db, 'appSettings', 'ads'), {
        masterEnabled: true,
        updatedAt: '2026-11-18T00:00:00.000Z'
      });
      await setDoc(doc(db, 'appSettings', 'website_design'), {
        branding: { platformTitle: 'ISEZERANO ONLINE' },
        updatedAt: '2026-11-18T00:00:00.000Z'
      });
      await setDoc(doc(db, 'appSettings', 'fcm_config'), {
        vapidKey: 'SENSITIVE_ADMIN_FCM_CONFIG_KEY',
        serverSecret: 'DO_NOT_EXPOSE',
        updatedAt: '2026-11-18T00:00:00.000Z'
      });
      await setDoc(doc(db, 'appSettings', 'internal_secrets'), {
        apiKey: 'private-admin-only'
      });
      await setDoc(doc(db, 'siteSettings', 'branding'), {
        logoData: 'https://example.com/logo.png'
      });
      await setDoc(doc(db, 'siteSettings', 'blog_categories'), {
        initialized: true,
        updatedAt: '2026-11-18T00:00:00.000Z'
      });
      await setDoc(doc(db, 'siteSettings', 'private_notes'), {
        internal: 'hidden'
      });
      await setDoc(doc(db, 'site_stats', 'counters'), {
        totalPageViews: 100
      });
      await setDoc(doc(db, 'website_pages', 'about'), {
        id: 'about',
        title: 'About Us',
        content: '<p>Newsroom</p>'
      });
      await setDoc(doc(db, 'categories', 'amakuru'), {
        id: 'amakuru',
        name: 'Amakuru',
        slug: 'amakuru'
      });
      await setDoc(doc(db, 'articles', 'art-1'), {
        title: 'Editorial Note',
        status: 'published'
      });
      await setDoc(doc(db, 'news', 'news-1'), {
        title: 'Briefing',
        status: 'published'
      });
      await setDoc(doc(db, 'homepage_slides', 'slide-1'), {
        title: 'Hero Slide',
        active: true
      });
      await setDoc(doc(db, 'announcements', 'ann-1'), {
        id: 'ann-1',
        title: 'Breaking News',
        createdAt: '2026-11-18T00:00:00.000Z'
      });

      // Legacy migrated approved comment (clean + publicSafe: true)
      await setDoc(doc(db, 'comments', 'comment_legacy_clean'), {
        postId: 'post-rw-1',
        parentId: null,
        replyToName: null,
        name: 'Legacy Reader',
        content: 'Clean migrated legacy comment',
        status: 'approved',
        createdAt: '2025-05-01T10:00:00.000Z',
        updatedAt: '2025-05-01T10:00:00.000Z',
        edited: false,
        publicSafe: true
      });

      // Legacy UN-MIGRATED comment with PII (no publicSafe: true) -> must remain hidden from public
      await setDoc(doc(db, 'comments', 'comment_legacy_with_pii'), {
        postId: 'post-rw-1',
        parentId: null,
        replyToName: null,
        name: 'Legacy With Email',
        email: 'private.legacy@example.com',
        phone: '+250780000999',
        ownerToken: 'leaked-legacy-token',
        content: 'Should not leak',
        status: 'approved',
        createdAt: '2025-05-01T10:05:00.000Z',
        updatedAt: '2025-05-01T10:05:00.000Z',
        edited: false
      });

      // Hidden and pending comments -> strictly Admin only
      await setDoc(doc(db, 'comments', 'comment_hidden'), {
        postId: 'post-rw-1',
        parentId: null,
        replyToName: null,
        name: 'Hidden Author',
        content: 'Hidden by admin',
        status: 'hidden',
        createdAt: '2026-11-18T05:00:00.000Z',
        updatedAt: '2026-11-18T05:00:00.000Z',
        edited: false,
        publicSafe: true
      });

    });

    // =========================================================================
    // 1. COMMENTS: INSTANT PUBLISH, PRIVATE SEPARATION & PUBLIC READS
    // =========================================================================
    const tokenB = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'; // 48 hex chars
    const tokenBHash = sha256Hex(tokenB);
    assert.equal(
      tokenBHash,
      crypto.createHash('sha256').update(tokenB, 'utf8').digest('hex'),
      'commentService sha256Hex must match Node crypto SHA-256'
    );
    const tsB = '2026-11-19T06:00:00.000Z';
    const commentBId = 'comment_visitor_b_1';
    const commentBPayload = {
      postId: 'post-rw-1',
      parentId: null,
      replyToName: null,
      name: 'Visitor B',
      content: 'Great investigative article from Visitor B!',
      status: 'published',
      createdAt: tsB,
      updatedAt: tsB,
      edited: false,
      publicSafe: true
    };

    await check('Visitor B CAN publish instant comment atomically with private email & hashed ownership token', async () => {
      const batch = writeBatch(guestDb);
      batch.set(doc(guestDb, 'comments', commentBId), commentBPayload);
      batch.set(doc(guestDb, 'comments', commentBId, 'tokens', tokenBHash), {
        tokenHash: tokenBHash,
        postId: 'post-rw-1',
        createdAt: tsB
      });
      batch.set(doc(guestDb, 'comments', commentBId, 'private', 'ownership'), {
        tokenHash: tokenBHash,
        postId: 'post-rw-1',
        createdAt: tsB,
        lastSyncedAt: tsB,
        verifier: '',
        email: 'visitor.b@example.com'
      });
      await assertSucceeds(batch.commit());
    });

    await check('Public comment creation REQUIRES all 3 docs atomically with matching tokenHash, postId, and createdAt', async () => {
      // 1) Missing /tokens/{tokenHash} (2-doc batch) -> MUST FAIL
      const noTokenBatch = writeBatch(guestDb);
      noTokenBatch.set(doc(guestDb, 'comments', 'comment_missing_token_doc'), commentBPayload);
      noTokenBatch.set(doc(guestDb, 'comments', 'comment_missing_token_doc', 'private', 'ownership'), {
        tokenHash: tokenBHash,
        postId: 'post-rw-1',
        createdAt: tsB,
        lastSyncedAt: tsB,
        verifier: ''
      });
      await assertFails(noTokenBatch.commit());

      // 2) Missing /private/ownership (2-doc batch) -> MUST FAIL
      const noOwnBatch = writeBatch(guestDb);
      noOwnBatch.set(doc(guestDb, 'comments', 'comment_missing_own_doc'), commentBPayload);
      noOwnBatch.set(doc(guestDb, 'comments', 'comment_missing_own_doc', 'tokens', tokenBHash), {
        tokenHash: tokenBHash,
        postId: 'post-rw-1',
        createdAt: tsB
      });
      await assertFails(noOwnBatch.commit());

      // 3) Missing tokenHash in /private/ownership -> MUST FAIL
      const noOwnHashBatch = writeBatch(guestDb);
      noOwnHashBatch.set(doc(guestDb, 'comments', 'comment_missing_own_hash'), commentBPayload);
      noOwnHashBatch.set(doc(guestDb, 'comments', 'comment_missing_own_hash', 'tokens', tokenBHash), {
        tokenHash: tokenBHash,
        postId: 'post-rw-1',
        createdAt: tsB
      });
      noOwnHashBatch.set(doc(guestDb, 'comments', 'comment_missing_own_hash', 'private', 'ownership'), {
        postId: 'post-rw-1',
        createdAt: tsB,
        lastSyncedAt: tsB,
        verifier: ''
      });
      await assertFails(noOwnHashBatch.commit());

      // 4) Mismatched tokenHash between /private/ownership and /tokens/{tokenHash} -> MUST FAIL
      const otherHash = sha256Hex('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
      const mismatchHashBatch = writeBatch(guestDb);
      mismatchHashBatch.set(doc(guestDb, 'comments', 'comment_mismatch_hash'), commentBPayload);
      mismatchHashBatch.set(doc(guestDb, 'comments', 'comment_mismatch_hash', 'tokens', tokenBHash), {
        tokenHash: tokenBHash,
        postId: 'post-rw-1',
        createdAt: tsB
      });
      mismatchHashBatch.set(doc(guestDb, 'comments', 'comment_mismatch_hash', 'private', 'ownership'), {
        tokenHash: otherHash,
        postId: 'post-rw-1',
        createdAt: tsB,
        lastSyncedAt: tsB,
        verifier: ''
      });
      await assertFails(mismatchHashBatch.commit());

      // 5) Mismatched createdAt in /private/ownership -> MUST FAIL
      const mismatchCreatedBatch = writeBatch(guestDb);
      mismatchCreatedBatch.set(doc(guestDb, 'comments', 'comment_mismatch_created'), commentBPayload);
      mismatchCreatedBatch.set(doc(guestDb, 'comments', 'comment_mismatch_created', 'tokens', tokenBHash), {
        tokenHash: tokenBHash,
        postId: 'post-rw-1',
        createdAt: tsB
      });
      mismatchCreatedBatch.set(doc(guestDb, 'comments', 'comment_mismatch_created', 'private', 'ownership'), {
        tokenHash: tokenBHash,
        postId: 'post-rw-1',
        createdAt: '2026-11-19T06:00:01.000Z',
        lastSyncedAt: '2026-11-19T06:00:01.000Z',
        verifier: ''
      });
      await assertFails(mismatchCreatedBatch.commit());
    });

    await check('Public visitor CANNOT create comment with inline email/ownerToken OR raw unhashed tokenId', async () => {
      const badId = 'comment_inline_pii';
      const batch = writeBatch(guestDb);
      batch.set(doc(guestDb, 'comments', badId), {
        ...commentBPayload,
        email: 'leak@example.com'
      });
      batch.set(doc(guestDb, 'comments', badId, 'tokens', tokenBHash), {
        tokenHash: tokenBHash,
        postId: 'post-rw-1',
        createdAt: tsB
      });
      batch.set(doc(guestDb, 'comments', badId, 'private', 'ownership'), {
        tokenHash: tokenBHash,
        postId: 'post-rw-1',
        createdAt: tsB,
        lastSyncedAt: tsB,
        verifier: ''
      });
      await assertFails(batch.commit());

      // Reject 48-char unhashed tokenId or mismatched tokenHash field
      const unhashedBatch = writeBatch(guestDb);
      unhashedBatch.set(doc(guestDb, 'comments', 'comment_unhashed_tok'), commentBPayload);
      unhashedBatch.set(doc(guestDb, 'comments', 'comment_unhashed_tok', 'tokens', tokenB), {
        tokenHash: tokenB,
        postId: 'post-rw-1',
        createdAt: tsB
      });
      unhashedBatch.set(doc(guestDb, 'comments', 'comment_unhashed_tok', 'private', 'ownership'), {
        tokenHash: tokenB,
        postId: 'post-rw-1',
        createdAt: tsB,
        lastSyncedAt: tsB,
        verifier: ''
      });
      await assertFails(unhashedBatch.commit());
    });

    await check('Public visitor CAN read/list published & migrated legacy approved comments (including `in` query) without private PII', async () => {
      const snapGet = await assertSucceeds(getDoc(doc(guestDb, 'comments', commentBId)));
      assert.equal(snapGet.exists(), true);
      assert.equal(snapGet.data()?.email, undefined);
      assert.equal(snapGet.data()?.ownerToken, undefined);

      // commentService.ts per-post queries (`status == 'published'` & `status == 'approved'` + `publicSafe == true`)
      const pubSnap = await assertSucceeds(
        getDocs(
          query(
            collection(guestDb, 'comments'),
            where('postId', '==', 'post-rw-1'),
            where('status', '==', 'published'),
            where('publicSafe', '==', true)
          )
        )
      );
      assert.equal(pubSnap.docs.some((d) => d.id === commentBId), true);

      const appSnap = await assertSucceeds(
        getDocs(
          query(
            collection(guestDb, 'comments'),
            where('postId', '==', 'post-rw-1'),
            where('status', '==', 'approved'),
            where('publicSafe', '==', true)
          )
        )
      );
      assert.equal(appSnap.docs.some((d) => d.id === 'comment_legacy_clean'), true);
      // Un-migrated PII comment MUST NOT be returned
      assert.equal(appSnap.docs.some((d) => d.id === 'comment_legacy_with_pii'), false);

      // commentService.ts collection-wide counts queries
      const allPubSnap = await assertSucceeds(
        getDocs(
          query(
            collection(guestDb, 'comments'),
            where('status', '==', 'published'),
            where('publicSafe', '==', true)
          )
        )
      );
      assert.equal(allPubSnap.docs.some((d) => d.id === commentBId), true);

      const allAppSnap = await assertSucceeds(
        getDocs(
          query(
            collection(guestDb, 'comments'),
            where('status', '==', 'approved'),
            where('publicSafe', '==', true)
          )
        )
      );
      assert.equal(allAppSnap.docs.some((d) => d.id === 'comment_legacy_clean'), true);

      // Exact combined `status in ['published', 'approved']` + `publicSafe == true` query
      const combinedInSnap = await assertSucceeds(
        getDocs(
          query(
            collection(guestDb, 'comments'),
            where('status', 'in', ['published', 'approved']),
            where('publicSafe', '==', true)
          )
        )
      );
      assert.equal(combinedInSnap.docs.some((d) => d.id === commentBId), true);
      assert.equal(combinedInSnap.docs.some((d) => d.id === 'comment_legacy_clean'), true);
      assert.equal(combinedInSnap.docs.some((d) => d.id === 'comment_legacy_with_pii'), false);
      assert.equal(combinedInSnap.docs.some((d) => d.id === 'comment_hidden'), false);
    });

    await check('Public visitor CANNOT list comments without publicSafe == true, cannot read legacy PII comment, and cannot read hidden comments', async () => {
      await assertFails(
        getDocs(
          query(
            collection(guestDb, 'comments'),
            where('status', 'in', ['published', 'approved'])
          )
        )
      );
      await assertFails(
        getDocs(
          query(
            collection(guestDb, 'comments'),
            where('status', '==', 'approved')
          )
        )
      );
      await assertFails(getDocs(collection(guestDb, 'comments')));
      await assertFails(getDoc(doc(guestDb, 'comments', 'comment_legacy_with_pii')));
      await assertFails(getDoc(doc(guestDb, 'comments', 'comment_hidden')));
      await assertFails(
        getDocs(
          query(
            collection(guestDb, 'comments'),
            where('status', '==', 'hidden'),
            where('publicSafe', '==', true)
          )
        )
      );
    });

    await check('Non-admin users CANNOT read ownership metadata or token subcollections', async () => {
      await assertFails(getDoc(doc(guestDb, 'comments', commentBId, 'private', 'ownership')));
      await assertFails(getDoc(doc(otherUserDb, 'comments', commentBId, 'private', 'ownership')));
      await assertFails(getDoc(doc(guestDb, 'comments', commentBId, 'tokens', tokenB)));
      await assertFails(getDocs(collection(otherUserDb, 'comments', commentBId, 'tokens')));
    });

    // =========================================================================
    // 2. REPLIES & CROSS-USER EDIT / DELETE SECURITY
    // =========================================================================
    const tokenA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; // 48 hex chars
    const tokenAHash = sha256Hex(tokenA);
    const tsA = '2026-11-19T06:05:00.000Z';
    const replyAId = 'reply_visitor_a_1';
    const replyAPayload = {
      postId: 'post-rw-1',
      parentId: commentBId,
      replyToName: 'Visitor B',
      name: 'Visitor A',
      content: 'Thank you Visitor B, great point!',
      status: 'published',
      createdAt: tsA,
      updatedAt: tsA,
      edited: false,
      publicSafe: true
    };

    await check('Visitor A CAN publish a reply to Visitor B published comment', async () => {
      const batch = writeBatch(guestDb);
      batch.set(doc(guestDb, 'comments', replyAId), replyAPayload);
      batch.set(doc(guestDb, 'comments', replyAId, 'tokens', tokenAHash), {
        tokenHash: tokenAHash,
        postId: 'post-rw-1',
        createdAt: tsA
      });
      batch.set(doc(guestDb, 'comments', replyAId, 'private', 'ownership'), {
        tokenHash: tokenAHash,
        postId: 'post-rw-1',
        createdAt: tsA,
        lastSyncedAt: tsA,
        verifier: ''
      });
      await assertSucceeds(batch.commit());
    });

    await check('Visitor CANNOT reply to a hidden comment or mismatch postId', async () => {
      const badReplyId = 'reply_to_hidden';
      const batch1 = writeBatch(guestDb);
      batch1.set(doc(guestDb, 'comments', badReplyId), {
        ...replyAPayload,
        parentId: 'comment_hidden'
      });
      batch1.set(doc(guestDb, 'comments', badReplyId, 'tokens', tokenAHash), {
        tokenHash: tokenAHash,
        postId: 'post-rw-1',
        createdAt: tsA
      });
      batch1.set(doc(guestDb, 'comments', badReplyId, 'private', 'ownership'), {
        tokenHash: tokenAHash,
        postId: 'post-rw-1',
        createdAt: tsA,
        lastSyncedAt: tsA,
        verifier: ''
      });
      await assertFails(batch1.commit());

      const badReplyId2 = 'reply_wrong_post';
      const batch2 = writeBatch(guestDb);
      batch2.set(doc(guestDb, 'comments', badReplyId2), {
        ...replyAPayload,
        postId: 'post-other-999'
      });
      batch2.set(doc(guestDb, 'comments', badReplyId2, 'tokens', tokenAHash), {
        tokenHash: tokenAHash,
        postId: 'post-other-999',
        createdAt: tsA
      });
      batch2.set(doc(guestDb, 'comments', badReplyId2, 'private', 'ownership'), {
        tokenHash: tokenAHash,
        postId: 'post-other-999',
        createdAt: tsA,
        lastSyncedAt: tsA,
        verifier: ''
      });
      await assertFails(batch2.commit());
    });

    await check('Visitor A CANNOT edit Visitor B comment (direct update, wrong token, fake proof, or mismatched token metadata)', async () => {
      const attackTs = '2026-11-19T06:06:00.000Z';
      // Direct updateDoc without ownership verifier
      await assertFails(
        updateDoc(doc(guestDb, 'comments', commentBId), {
          content: 'Hijacked directly',
          updatedAt: attackTs,
          edited: true
        })
      );

      // Using Visitor A own token against Visitor B comment
      const attackBatch = writeBatch(guestDb);
      attackBatch.update(doc(guestDb, 'comments', commentBId), {
        content: 'Hijacked with tokenA',
        updatedAt: attackTs,
        edited: true
      });
      attackBatch.update(doc(guestDb, 'comments', commentBId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: tokenA,
          postId: 'post-rw-1',
          createdAt: tsB,
          syncedAt: attackTs
        }),
        lastSyncedAt: attackTs
      });
      await assertFails(attackBatch.commit());

      // Attempting to use Visitor B token with fake/arbitrary Part 2 nonce or mismatched syncedAt in proof
      const fakeProofBatch = writeBatch(guestDb);
      fakeProofBatch.update(doc(guestDb, 'comments', commentBId), {
        content: 'Fake actionProof part2',
        updatedAt: attackTs,
        edited: true
      });
      fakeProofBatch.update(doc(guestDb, 'comments', commentBId, 'private', 'ownership'), {
        verifier: `${tokenB}:${'f'.repeat(64)}`,
        lastSyncedAt: attackTs
      });
      await assertFails(fakeProofBatch.commit());

      const wrongSyncedAtProofBatch = writeBatch(guestDb);
      wrongSyncedAtProofBatch.update(doc(guestDb, 'comments', commentBId), {
        content: 'Stale syncedAt proof',
        updatedAt: attackTs,
        edited: true
      });
      wrongSyncedAtProofBatch.update(doc(guestDb, 'comments', commentBId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: tokenB,
          postId: 'post-rw-1',
          createdAt: tsB,
          syncedAt: '2026-11-19T06:05:59.000Z'
        }),
        lastSyncedAt: attackTs
      });
      await assertFails(wrongSyncedAtProofBatch.commit());

      // Attacker holding only tokenBHash (cannot use hash itself as preimage ownerToken)
      const hashAsRawBatch = writeBatch(guestDb);
      hashAsRawBatch.update(doc(guestDb, 'comments', commentBId), {
        content: 'Hash impersonation',
        updatedAt: attackTs,
        edited: true
      });
      hashAsRawBatch.update(doc(guestDb, 'comments', commentBId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: tokenBHash,
          postId: 'post-rw-1',
          createdAt: tsB,
          syncedAt: attackTs
        }),
        lastSyncedAt: attackTs
      });
      await assertFails(hashAsRawBatch.commit());

      // Attempting to forge token onto Visitor B comment
      await assertFails(
        setDoc(doc(guestDb, 'comments', commentBId, 'tokens', tokenAHash), {
          tokenHash: tokenAHash,
          postId: 'post-rw-1',
          createdAt: attackTs
        })
      );

      // Attempting to create comment whose token document carries a mismatched postId
      const badTokenMetaId = 'comment_mismatched_token_meta';
      const badMetaBatch = writeBatch(guestDb);
      badMetaBatch.set(doc(guestDb, 'comments', badTokenMetaId), commentBPayload);
      badMetaBatch.set(doc(guestDb, 'comments', badTokenMetaId, 'tokens', tokenAHash), {
        tokenHash: tokenAHash,
        postId: 'post-other-mismatch',
        createdAt: tsB
      });
      badMetaBatch.set(doc(guestDb, 'comments', badTokenMetaId, 'private', 'ownership'), {
        tokenHash: tokenAHash,
        postId: 'post-rw-1',
        createdAt: tsB,
        lastSyncedAt: tsB,
        verifier: ''
      });
      await assertFails(badMetaBatch.commit());

      // Seeded legacy token whose postId or createdAt does not match comment CANNOT authorize edit or delete
      const badCommentId = 'comment_token_postid_mismatch';
      const badTokenHex = 'dddddddddddddddddddddddddddddddddddddddddddddddd';
      const badTokenHexHash = sha256Hex(badTokenHex);
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'comments', badCommentId), commentBPayload);
        await setDoc(doc(db, 'comments', badCommentId, 'tokens', badTokenHexHash), {
          tokenHash: badTokenHexHash,
          postId: 'different-post-id',
          createdAt: tsB
        });
        await setDoc(doc(db, 'comments', badCommentId, 'private', 'ownership'), {
          tokenHash: badTokenHexHash,
          postId: 'post-rw-1',
          createdAt: tsB,
          lastSyncedAt: tsB,
          verifier: ''
        });
      });

      const mismatchEditBatch = writeBatch(guestDb);
      mismatchEditBatch.update(doc(guestDb, 'comments', badCommentId), {
        content: 'Should fail postId token check',
        updatedAt: attackTs,
        edited: true
      });
      mismatchEditBatch.update(doc(guestDb, 'comments', badCommentId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: badTokenHex,
          postId: 'post-rw-1',
          createdAt: tsB,
          syncedAt: attackTs
        }),
        lastSyncedAt: attackTs
      });
      await assertFails(mismatchEditBatch.commit());

      const delMismatchMarker = 'deleted_999_del99';
      const mismatchDelBatch = writeBatch(guestDb);
      mismatchDelBatch.update(doc(guestDb, 'comments', badCommentId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: badTokenHex,
          postId: 'post-rw-1',
          createdAt: tsB,
          syncedAt: delMismatchMarker
        }),
        lastSyncedAt: delMismatchMarker
      });
      mismatchDelBatch.delete(doc(guestDb, 'comments', badCommentId));
      await assertFails(mismatchDelBatch.commit());

      // Seeded token whose createdAt does not match comment CANNOT authorize edit
      const badCreatedAtId = 'comment_token_createdat_mismatch';
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'comments', badCreatedAtId), commentBPayload);
        await setDoc(doc(db, 'comments', badCreatedAtId, 'tokens', badTokenHexHash), {
          tokenHash: badTokenHexHash,
          postId: 'post-rw-1',
          createdAt: '2025-01-01T00:00:00.000Z'
        });
        await setDoc(doc(db, 'comments', badCreatedAtId, 'private', 'ownership'), {
          tokenHash: badTokenHexHash,
          postId: 'post-rw-1',
          createdAt: tsB,
          lastSyncedAt: tsB,
          verifier: ''
        });
      });

      const badCreatedEditBatch = writeBatch(guestDb);
      badCreatedEditBatch.update(doc(guestDb, 'comments', badCreatedAtId), {
        content: 'Should fail createdAt token check',
        updatedAt: attackTs,
        edited: true
      });
      badCreatedEditBatch.update(doc(guestDb, 'comments', badCreatedAtId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: badTokenHex,
          postId: 'post-rw-1',
          createdAt: tsB,
          syncedAt: attackTs
        }),
        lastSyncedAt: attackTs
      });
      await assertFails(badCreatedEditBatch.commit());
    });

    await check('Visitor A CANNOT delete Visitor B comment (direct delete, wrong token, or fake proof)', async () => {
      await assertFails(deleteDoc(doc(guestDb, 'comments', commentBId)));

      const delWrongTokenMarker = 'deleted_1000_del99';
      const attackDel = writeBatch(guestDb);
      attackDel.update(doc(guestDb, 'comments', commentBId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: tokenA,
          postId: 'post-rw-1',
          createdAt: tsB,
          syncedAt: delWrongTokenMarker
        }),
        lastSyncedAt: delWrongTokenMarker
      });
      attackDel.delete(doc(guestDb, 'comments', commentBId));
      await assertFails(attackDel.commit());

      const fakeProofDel = writeBatch(guestDb);
      fakeProofDel.update(doc(guestDb, 'comments', commentBId, 'private', 'ownership'), {
        verifier: `${tokenB}:${'a'.repeat(64)}`,
        lastSyncedAt: delWrongTokenMarker
      });
      fakeProofDel.delete(doc(guestDb, 'comments', commentBId));
      await assertFails(fakeProofDel.commit());
    });

    await check('Visitor B CANNOT edit or delete Visitor A reply', async () => {
      const tsEdit = '2026-11-19T06:07:00.000Z';
      const badEdit = writeBatch(guestDb);
      badEdit.update(doc(guestDb, 'comments', replyAId), {
        content: 'Tampered reply',
        updatedAt: tsEdit,
        edited: true
      });
      badEdit.update(doc(guestDb, 'comments', replyAId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: tokenB,
          postId: 'post-rw-1',
          createdAt: tsA,
          syncedAt: tsEdit
        }),
        lastSyncedAt: tsEdit
      });
      await assertFails(badEdit.commit());

      const badDelMarker = 'deleted_1001_del1';
      const badDel = writeBatch(guestDb);
      badDel.update(doc(guestDb, 'comments', replyAId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: tokenB,
          postId: 'post-rw-1',
          createdAt: tsA,
          syncedAt: badDelMarker
        }),
        lastSyncedAt: badDelMarker
      });
      badDel.delete(doc(guestDb, 'comments', replyAId));
      await assertFails(badDel.commit());
    });

    await check('Original author WITH valid cryptographic verifier CAN edit own comment & reply (immutable fields locked)', async () => {
      const tsEditB = '2026-11-19T06:08:00.000Z';
      const validEditB = writeBatch(guestDb);
      validEditB.update(doc(guestDb, 'comments', commentBId), {
        content: 'Edited by original author Visitor B.',
        updatedAt: tsEditB,
        edited: true
      });
      validEditB.update(doc(guestDb, 'comments', commentBId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: tokenB,
          postId: 'post-rw-1',
          createdAt: tsB,
          syncedAt: tsEditB
        }),
        lastSyncedAt: tsEditB
      });
      await assertSucceeds(validEditB.commit());

      // Even original author CANNOT mutate author name or status
      const tsTamper = '2026-11-19T06:09:00.000Z';
      const tamperEdit = writeBatch(guestDb);
      tamperEdit.update(doc(guestDb, 'comments', commentBId), {
        name: 'Impersonated Admin',
        content: 'Updated text',
        updatedAt: tsTamper,
        edited: true
      });
      tamperEdit.update(doc(guestDb, 'comments', commentBId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: tokenB,
          postId: 'post-rw-1',
          createdAt: tsB,
          syncedAt: tsTamper
        }),
        lastSyncedAt: tsTamper
      });
      await assertFails(tamperEdit.commit());

      // Visitor A edits own reply
      const tsEditA = '2026-11-19T06:10:00.000Z';
      const validEditA = writeBatch(guestDb);
      validEditA.update(doc(guestDb, 'comments', replyAId), {
        content: 'Updated reply by Visitor A.',
        updatedAt: tsEditA,
        edited: true
      });
      validEditA.update(doc(guestDb, 'comments', replyAId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: tokenA,
          postId: 'post-rw-1',
          createdAt: tsA,
          syncedAt: tsEditA
        }),
        lastSyncedAt: tsEditA
      });
      await assertSucceeds(validEditA.commit());
    });

    await check('Original author WITH valid cryptographic verifier CAN delete own reply and CANNOT resurrect deleted ID', async () => {
      const validDelMarkerA = 'deleted_1795000000_del03';
      const validDelA = writeBatch(guestDb);
      validDelA.update(doc(guestDb, 'comments', replyAId, 'private', 'ownership'), {
        verifier: buildCommentOwnershipVerifier({
          ownerToken: tokenA,
          postId: 'post-rw-1',
          createdAt: tsA,
          syncedAt: validDelMarkerA
        }),
        lastSyncedAt: validDelMarkerA
      });
      validDelA.delete(doc(guestDb, 'comments', replyAId));
      await assertSucceeds(validDelA.commit());

      // Resurrect check
      const resurrectHash = sha256Hex('cccccccccccccccccccccccccccccccccccccccccccccccc');
      const resurrectBatch = writeBatch(guestDb);
      resurrectBatch.set(doc(guestDb, 'comments', replyAId), replyAPayload);
      resurrectBatch.set(doc(guestDb, 'comments', replyAId, 'tokens', resurrectHash), {
        tokenHash: resurrectHash,
        postId: 'post-rw-1',
        createdAt: tsA
      });
      resurrectBatch.set(doc(guestDb, 'comments', replyAId, 'private', 'ownership'), {
        tokenHash: resurrectHash,
        postId: 'post-rw-1',
        createdAt: tsA,
        lastSyncedAt: tsA,
        verifier: ''
      });
      await assertFails(resurrectBatch.commit());
    });

    await check('Verified Admin CAN moderate & inspect comments; non-admins CANNOT moderate; Admin CANNOT mark PII doc publicSafe', async () => {
      await assertFails(updateDoc(doc(otherUserDb, 'comments', commentBId), { status: 'hidden' }));
      await assertFails(updateDoc(doc(spoofedClaimDb, 'comments', commentBId), { status: 'hidden' }));
      await assertFails(updateDoc(doc(unverifiedAdminDb, 'comments', commentBId), { status: 'hidden' }));

      await assertSucceeds(getDoc(doc(adminDb, 'comments', commentBId, 'private', 'ownership')));
      await assertSucceeds(updateDoc(doc(adminDb, 'comments', commentBId), { status: 'hidden' }));
      await assertFails(getDoc(doc(guestDb, 'comments', commentBId))); // Now hidden from public!
      await assertSucceeds(updateDoc(doc(adminDb, 'comments', commentBId), { status: 'published' }));

      // Even Admin cannot write inline PII onto a publicSafe: true comment
      await assertFails(
        setDoc(doc(adminDb, 'comments', 'admin_bad_comment'), {
          ...commentBPayload,
          email: 'leak@example.com'
        })
      );
    });

    // =========================================================================
    // 3. COMMENTS CORRUPTED EXTRA-FIELD DOC AUDIT & REMOVED MINI SHOP DENY
    // =========================================================================
    await check('Static query analyzer vs corrupted extra-field docs audit (comments) & mini_shop_products default-deny', async () => {
      // Seed Admin-bypass corrupted comment doc having BOTH publicSafe: true AND extra private fields
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'comments', 'comment_corrupt_extra_field'), {
          ...commentBPayload,
          email: 'bypassed@example.com'
        });
      });

      // getDoc MUST reject corrupted extra-field docs via hasRequiredPublicCommentFields
      await assertFails(getDoc(doc(guestDb, 'comments', 'comment_corrupt_extra_field')));

      // Observe list query behavior cleanly (unauthenticated guestDb ONLY)
      let commentListOutcome = 'allowed';
      try {
        const res = await getDocs(
          query(
            collection(guestDb, 'comments'),
            where('status', 'in', ['published', 'approved']),
            where('publicSafe', '==', true)
          )
        );
        const hasCorrupt = res.docs.some((d) => d.id === 'comment_corrupt_extra_field');
        commentListOutcome = `succeeded (${res.size} docs, corrupt_included=${hasCorrupt})`;
      } catch (e: any) {
        commentListOutcome = `rejected (${e?.code || e?.message})`;
      }

      console.log(`[AUDIT-PROBE] Comments list with corrupted extra-field doc: ${commentListOutcome}`);

      // Clean up temporary audit probe doc via rules-disabled context
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await deleteDoc(doc(db, 'comments', 'comment_corrupt_extra_field'));
      });

      // Removed mini_shop_products collection MUST be completely denied for both public visitors and Admin via client rules
      await assertFails(getDoc(doc(guestDb, 'mini_shop_products', 'prod_any')));
      await assertFails(getDocs(collection(guestDb, 'mini_shop_products')));
      await assertFails(getDoc(doc(adminDb, 'mini_shop_products', 'prod_any')));
      await assertFails(setDoc(doc(adminDb, 'mini_shop_products', 'prod_any'), { title: 'Blocked' }));
    });

    // =========================================================================
    // 4. APPSETTINGS, SITESETTINGS, POSTS & DEFAULT DENY
    // =========================================================================
    await check('Public visitors CAN get appSettings/ads and website_design, but CANNOT read appSettings/fcm_config or list appSettings', async () => {
      await assertSucceeds(getDoc(doc(guestDb, 'appSettings', 'ads')));
      await assertSucceeds(getDoc(doc(guestDb, 'appSettings', 'website_design')));
      await assertSucceeds(getDoc(doc(guestDb, 'siteSettings', 'branding')));
      await assertSucceeds(getDoc(doc(guestDb, 'siteSettings', 'blog_categories')));
      await assertSucceeds(getDoc(doc(guestDb, 'site_stats', 'counters')));
      await assertSucceeds(getDoc(doc(guestDb, 'website_pages', 'about')));
      await assertSucceeds(getDoc(doc(guestDb, 'categories', 'amakuru')));
      await assertSucceeds(getDoc(doc(guestDb, 'articles', 'art-1')));
      await assertSucceeds(getDoc(doc(guestDb, 'news', 'news-1')));
      await assertSucceeds(getDoc(doc(guestDb, 'homepage_slides', 'slide-1')));
      await assertSucceeds(getDoc(doc(guestDb, 'announcements', 'ann-1')));

      // Public / non-admin writes to CMS & settings strictly denied
      await assertFails(setDoc(doc(guestDb, 'articles', 'art-hack'), { title: 'x' }));
      await assertFails(setDoc(doc(otherUserDb, 'website_pages', 'about'), { title: 'x' }));
      await assertFails(setDoc(doc(otherUserDb, 'categories', 'hack'), { name: 'x' }));
      await assertFails(setDoc(doc(otherUserDb, 'announcements', 'hack'), { title: 'x' }));

      // Sensitive / private settings strictly denied for public & non-admin users
      await assertFails(getDoc(doc(guestDb, 'appSettings', 'fcm_config')));
      await assertFails(getDoc(doc(otherUserDb, 'appSettings', 'fcm_config')));
      await assertFails(getDoc(doc(spoofedClaimDb, 'appSettings', 'fcm_config')));
      await assertFails(getDoc(doc(guestDb, 'appSettings', 'internal_secrets')));
      await assertFails(getDocs(collection(guestDb, 'appSettings')));
      await assertFails(getDoc(doc(guestDb, 'siteSettings', 'private_notes')));
      await assertFails(getDocs(collection(guestDb, 'siteSettings')));

      // Admin CAN read & update fcm_config & public CMS docs
      await assertSucceeds(getDoc(doc(adminDb, 'appSettings', 'fcm_config')));
      await assertSucceeds(
        setDoc(doc(adminDb, 'appSettings', 'fcm_config'), { vapidKey: 'NEW_ADMIN_KEY' }, { merge: true })
      );
      await assertSucceeds(setDoc(doc(adminDb, 'articles', 'art-1'), { title: 'Edited', status: 'published' }));
    });

    await check('Posts allow +1 views only for public; FCM tokens write-only create for public; unknown collections default-denied', async () => {
      await assertSucceeds(updateDoc(doc(guestDb, 'posts', 'post-rw-1'), { views: 11 }));
      await assertFails(updateDoc(doc(guestDb, 'posts', 'post-rw-1'), { views: 99 }));
      await assertFails(updateDoc(doc(guestDb, 'posts', 'post-rw-1'), { title: 'Hacked' }));

      await assertSucceeds(
        setDoc(doc(guestDb, 'fcm_tokens', 'tok_guest_1'), {
          id: 'tok_guest_1',
          token: 'valid_fcm_device_token_12345',
          ownerUid: 'guest_device'
        })
      );
      await assertFails(getDoc(doc(guestDb, 'fcm_tokens', 'tok_guest_1')));
      await assertFails(getDocs(collection(otherUserDb, 'fcm_tokens')));

      // Default deny
      await assertFails(getDoc(doc(guestDb, 'lesson_plans', 'doc1')));
      await assertFails(getDoc(doc(adminDb, 'unknown_collection', 'doc1')));
      await assertFails(setDoc(doc(adminDb, 'unknown_collection', 'doc1'), { foo: 'bar' }));
    });

    console.log('===========================================================');
    console.log(`FIRESTORE EMULATOR RESULTS: ${passed} TEST GROUPS PASSED, 0 FAILED`);
    console.log('===========================================================');
  } finally {
    await testEnv.cleanup();
  }
}

runFirestoreEmulatorTests().catch((err) => {
  console.error('FIRESTORE EMULATOR TEST FAILED:', err);
  process.exit(1);
});

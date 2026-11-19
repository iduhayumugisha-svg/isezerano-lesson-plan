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
import assert from 'node:assert/strict';
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
      await setDoc(doc(db, 'siteSettings', 'private_notes'), {
        internal: 'hidden'
      });
      await setDoc(doc(db, 'site_stats', 'counters'), {
        totalPageViews: 100
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

      // Un-migrated Mini Shop product with private field (no publicSafe: true) -> must NOT be publicly readable
      await setDoc(doc(db, 'mini_shop_products', 'prod_unmigrated_pii'), {
        id: 'prod_unmigrated_pii',
        title: 'Legacy Product',
        description: 'Contains un-migrated sellerEmail',
        imageUrl: 'https://example.com/item.jpg',
        whatsappNumber: '+250780000111',
        sellerEmail: 'secret.seller@example.com',
        active: true,
        displayOrder: 9,
        createdAt: '2026-11-18T01:00:00.000Z',
        updatedAt: '2026-11-18T01:00:00.000Z'
      });
    });

    // =========================================================================
    // 1. COMMENTS: INSTANT PUBLISH, PRIVATE SEPARATION & PUBLIC READS
    // =========================================================================
    const tokenB = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'; // 48 hex chars
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

    await check('Visitor B CAN publish instant comment atomically with private email & ownership token', async () => {
      const batch = writeBatch(guestDb);
      batch.set(doc(guestDb, 'comments', commentBId), commentBPayload);
      batch.set(doc(guestDb, 'comments', commentBId, 'tokens', tokenB), {
        postId: 'post-rw-1',
        createdAt: tsB
      });
      batch.set(doc(guestDb, 'comments', commentBId, 'private', 'ownership'), {
        postId: 'post-rw-1',
        createdAt: tsB,
        lastSyncedAt: tsB,
        verifier: '',
        email: 'visitor.b@example.com'
      });
      await assertSucceeds(batch.commit());
    });

    await check('Public visitor CANNOT create comment with inline email, phone, or ownerToken', async () => {
      const badId = 'comment_inline_pii';
      const batch = writeBatch(guestDb);
      batch.set(doc(guestDb, 'comments', badId), {
        ...commentBPayload,
        email: 'leak@example.com'
      });
      batch.set(doc(guestDb, 'comments', badId, 'tokens', tokenB), {
        postId: 'post-rw-1',
        createdAt: tsB
      });
      batch.set(doc(guestDb, 'comments', badId, 'private', 'ownership'), {
        postId: 'post-rw-1',
        createdAt: tsB,
        lastSyncedAt: tsB,
        verifier: ''
      });
      await assertFails(batch.commit());
    });

    await check('Public visitor CAN read/list published & migrated legacy approved comments without private PII', async () => {
      const snapGet = await assertSucceeds(getDoc(doc(guestDb, 'comments', commentBId)));
      assert.equal(snapGet.exists(), true);
      assert.equal(snapGet.data()?.email, undefined);
      assert.equal(snapGet.data()?.ownerToken, undefined);

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
    });

    await check('Public visitor CANNOT list comments without publicSafe == true, cannot read legacy PII comment, and cannot read hidden comments', async () => {
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
      batch.set(doc(guestDb, 'comments', replyAId, 'tokens', tokenA), {
        postId: 'post-rw-1',
        createdAt: tsA
      });
      batch.set(doc(guestDb, 'comments', replyAId, 'private', 'ownership'), {
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
      batch1.set(doc(guestDb, 'comments', badReplyId, 'tokens', tokenA), { postId: 'post-rw-1', createdAt: tsA });
      batch1.set(doc(guestDb, 'comments', badReplyId, 'private', 'ownership'), {
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
      batch2.set(doc(guestDb, 'comments', badReplyId2, 'tokens', tokenA), { postId: 'post-other-999', createdAt: tsA });
      batch2.set(doc(guestDb, 'comments', badReplyId2, 'private', 'ownership'), {
        postId: 'post-other-999',
        createdAt: tsA,
        lastSyncedAt: tsA,
        verifier: ''
      });
      await assertFails(batch2.commit());
    });

    await check('Visitor A CANNOT edit Visitor B comment (direct update, wrong token, or forged token)', async () => {
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
        verifier: `${tokenA}:nonce1`,
        lastSyncedAt: attackTs
      });
      await assertFails(attackBatch.commit());

      // Attempting to forge token onto Visitor B comment
      await assertFails(
        setDoc(doc(guestDb, 'comments', commentBId, 'tokens', tokenA), {
          postId: 'post-rw-1',
          createdAt: attackTs
        })
      );
    });

    await check('Visitor A CANNOT delete Visitor B comment (direct delete or wrong token)', async () => {
      await assertFails(deleteDoc(doc(guestDb, 'comments', commentBId)));

      const attackDel = writeBatch(guestDb);
      attackDel.update(doc(guestDb, 'comments', commentBId, 'private', 'ownership'), {
        verifier: `${tokenA}:del99`,
        lastSyncedAt: 'deleted_1000_del99'
      });
      attackDel.delete(doc(guestDb, 'comments', commentBId));
      await assertFails(attackDel.commit());
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
        verifier: `${tokenB}:nonce2`,
        lastSyncedAt: tsEdit
      });
      await assertFails(badEdit.commit());

      const badDel = writeBatch(guestDb);
      badDel.update(doc(guestDb, 'comments', replyAId, 'private', 'ownership'), {
        verifier: `${tokenB}:del1`,
        lastSyncedAt: 'deleted_1001_del1'
      });
      badDel.delete(doc(guestDb, 'comments', replyAId));
      await assertFails(badDel.commit());
    });

    await check('Original author WITH valid ownerToken CAN edit own comment & reply (immutable fields locked)', async () => {
      const tsEditB = '2026-11-19T06:08:00.000Z';
      const validEditB = writeBatch(guestDb);
      validEditB.update(doc(guestDb, 'comments', commentBId), {
        content: 'Edited by original author Visitor B.',
        updatedAt: tsEditB,
        edited: true
      });
      validEditB.update(doc(guestDb, 'comments', commentBId, 'private', 'ownership'), {
        verifier: `${tokenB}:edit01`,
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
        verifier: `${tokenB}:edit02`,
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
        verifier: `${tokenA}:edit03`,
        lastSyncedAt: tsEditA
      });
      await assertSucceeds(validEditA.commit());
    });

    await check('Original author WITH valid ownerToken CAN delete own reply and CANNOT resurrect deleted ID', async () => {
      const validDelA = writeBatch(guestDb);
      validDelA.update(doc(guestDb, 'comments', replyAId, 'private', 'ownership'), {
        verifier: `${tokenA}:del03`,
        lastSyncedAt: 'deleted_1795000000_del03'
      });
      validDelA.delete(doc(guestDb, 'comments', replyAId));
      await assertSucceeds(validDelA.commit());

      // Resurrect check
      const resurrectBatch = writeBatch(guestDb);
      resurrectBatch.set(doc(guestDb, 'comments', replyAId), replyAPayload);
      resurrectBatch.set(doc(guestDb, 'comments', replyAId, 'tokens', 'cccccccccccccccccccccccccccccccccccccccccccccccc'), {
        postId: 'post-rw-1',
        createdAt: tsA
      });
      resurrectBatch.set(doc(guestDb, 'comments', replyAId, 'private', 'ownership'), {
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
    // 3. MINI SHOP PRODUCTS: PUBLIC-ONLY FIELDS, INACTIVE ISOLATION & ADMIN
    // =========================================================================
    const validProduct = {
      id: 'prod_solar_1',
      title: 'Solar Radio Pro',
      description: 'Rechargeable FM/AM radio with solar panel.',
      price: '18,000 RWF',
      imageUrl: 'https://example.com/radio.jpg',
      imageStorageMode: 'firebase_storage',
      whatsappNumber: '+250780000111',
      phoneNumber: '0780000111',
      active: true,
      displayOrder: 0,
      createdAt: '2026-11-19T06:00:00.000Z',
      updatedAt: '2026-11-19T06:00:00.000Z',
      publicSafe: true
    };

    const inactiveProduct = {
      ...validProduct,
      id: 'prod_draft_2',
      title: 'Draft Product',
      active: false,
      displayOrder: 1
    };

    await check('Verified Admin CAN manage Mini Shop products & private metadata; non-admins CANNOT write', async () => {
      await assertSucceeds(setDoc(doc(adminDb, 'mini_shop_products', 'prod_solar_1'), validProduct));
      await assertSucceeds(setDoc(doc(adminDb, 'mini_shop_products', 'prod_draft_2'), inactiveProduct));
      await assertSucceeds(
        setDoc(doc(adminDb, 'mini_shop_products', 'prod_solar_1', 'private', 'seller_meta'), {
          sellerEmail: 'supplier@example.com',
          costPrice: '12,000 RWF'
        })
      );

      // Rules REJECT adding private fields directly on public product document even for Admin
      await assertFails(
        setDoc(doc(adminDb, 'mini_shop_products', 'prod_bad_pii'), {
          ...validProduct,
          id: 'prod_bad_pii',
          sellerEmail: 'supplier@example.com'
        })
      );

      await assertFails(setDoc(doc(guestDb, 'mini_shop_products', 'prod_hack'), validProduct));
      await assertFails(setDoc(doc(otherUserDb, 'mini_shop_products', 'prod_hack'), validProduct));
      await assertFails(setDoc(doc(spoofedClaimDb, 'mini_shop_products', 'prod_hack'), validProduct));
      await assertFails(deleteDoc(doc(otherUserDb, 'mini_shop_products', 'prod_solar_1')));
    });

    await check('Public visitors CAN read/list active clean Mini Shop products WITHOUT accessing inactive, un-migrated, or private docs', async () => {
      const snap = await assertSucceeds(getDoc(doc(guestDb, 'mini_shop_products', 'prod_solar_1')));
      assert.equal(snap.exists(), true);
      assert.equal(snap.data()?.sellerEmail, undefined);

      const listSnap = await assertSucceeds(
        getDocs(
          query(
            collection(guestDb, 'mini_shop_products'),
            where('active', '==', true),
            where('publicSafe', '==', true)
          )
        )
      );
      assert.equal(listSnap.docs.some((d) => d.id === 'prod_solar_1'), true);
      assert.equal(listSnap.docs.some((d) => d.id === 'prod_draft_2'), false);
      assert.equal(listSnap.docs.some((d) => d.id === 'prod_unmigrated_pii'), false);

      // Inactive product denied on direct get
      await assertFails(getDoc(doc(guestDb, 'mini_shop_products', 'prod_draft_2')));
      await assertFails(getDoc(doc(otherUserDb, 'mini_shop_products', 'prod_draft_2')));

      // Un-migrated doc with extra private fields denied on direct get
      await assertFails(getDoc(doc(guestDb, 'mini_shop_products', 'prod_unmigrated_pii')));

      // Unfiltered list or list without publicSafe == true denied
      await assertFails(getDocs(collection(guestDb, 'mini_shop_products')));
      await assertFails(
        getDocs(query(collection(guestDb, 'mini_shop_products'), where('active', '==', true)))
      );

      // Private subcollection strictly Admin-only
      await assertFails(getDoc(doc(guestDb, 'mini_shop_products', 'prod_solar_1', 'private', 'seller_meta')));
      await assertFails(getDoc(doc(otherUserDb, 'mini_shop_products', 'prod_solar_1', 'private', 'seller_meta')));
      await assertSucceeds(getDoc(doc(adminDb, 'mini_shop_products', 'prod_solar_1', 'private', 'seller_meta')));
    });

    await check('Admin CAN list all Mini Shop products (active + inactive) and delete products', async () => {
      const allSnap = await assertSucceeds(getDocs(collection(adminDb, 'mini_shop_products')));
      assert.equal(allSnap.docs.some((d) => d.id === 'prod_draft_2'), true);
      await assertSucceeds(deleteDoc(doc(adminDb, 'mini_shop_products', 'prod_draft_2')));
    });

    // =========================================================================
    // 4. APPSETTINGS, SITESETTINGS, POSTS & DEFAULT DENY
    // =========================================================================
    await check('Public visitors CAN get appSettings/ads and website_design, but CANNOT read appSettings/fcm_config or list appSettings', async () => {
      await assertSucceeds(getDoc(doc(guestDb, 'appSettings', 'ads')));
      await assertSucceeds(getDoc(doc(guestDb, 'appSettings', 'website_design')));
      await assertSucceeds(getDoc(doc(guestDb, 'siteSettings', 'branding')));
      await assertSucceeds(getDoc(doc(guestDb, 'site_stats', 'counters')));

      // Sensitive / private settings strictly denied for public & non-admin users
      await assertFails(getDoc(doc(guestDb, 'appSettings', 'fcm_config')));
      await assertFails(getDoc(doc(otherUserDb, 'appSettings', 'fcm_config')));
      await assertFails(getDoc(doc(spoofedClaimDb, 'appSettings', 'fcm_config')));
      await assertFails(getDoc(doc(guestDb, 'appSettings', 'internal_secrets')));
      await assertFails(getDocs(collection(guestDb, 'appSettings')));
      await assertFails(getDoc(doc(guestDb, 'siteSettings', 'private_notes')));
      await assertFails(getDocs(collection(guestDb, 'siteSettings')));

      // Admin CAN read & update fcm_config
      await assertSucceeds(getDoc(doc(adminDb, 'appSettings', 'fcm_config')));
      await assertSucceeds(
        setDoc(doc(adminDb, 'appSettings', 'fcm_config'), { vapidKey: 'NEW_ADMIN_KEY' }, { merge: true })
      );
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

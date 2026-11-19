import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';

const PROJECT_ID = 'demo-isezerano-security';
const RULES = readFileSync('firestore.rules', 'utf8');
const NOW = '2026-11-19T12:00:00.000Z';
let testEnv: RulesTestEnvironment;

const adminClaims = {
  email: 'twizerefelix90@gmail.com',
  email_verified: true,
  firebase: { sign_in_provider: 'google.com' }
};

const validComment = (id: string, overrides: Record<string, unknown> = {}) => ({
  postId: 'post-1',
  parentId: null,
  replyToName: null,
  name: 'Aline Uwase',
  content: 'This is a useful report.',
  status: 'published',
  createdAt: NOW,
  updatedAt: NOW,
  edited: false,
  publicSafe: true,
  ...overrides
});

const validProduct = (overrides: Record<string, unknown> = {}) => ({
  id: 'product-1',
  title: 'Imyenda myiza',
  description: 'Imyenda yo kwambara buri munsi.',
  imageUrl: 'https://example.com/product.jpg',
  active: true,
  displayOrder: 1,
  createdAt: NOW,
  updatedAt: NOW,
  publicSafe: true,
  phoneNumber: '0780000000',
  ...overrides
});

async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

async function clear() {
  await testEnv.clearFirestore();
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES }
  });
});

after(async () => {
  await testEnv.cleanup();
});

test('Firestore security rules: comments, private ownership, Mini Shop and admin boundary', async () => {
  // 1. Strict administrator identity; an admin claim alone is never sufficient.
  const adminDb = testEnv.authenticatedContext('admin-uid', adminClaims).firestore();
  const fakeAdminDb = testEnv.authenticatedContext('attacker', {
    email: 'attacker@gmail.com',
    email_verified: true,
    admin: true,
    firebase: { sign_in_provider: 'google.com' }
  }).firestore();

  await clear();
  await assertFails(setDoc(doc(fakeAdminDb, 'users/attacker'), { role: 'admin' }));
  await assertSucceeds(setDoc(doc(adminDb, 'users/admin'), { role: 'admin' }));

  // 2. Public comments can be created instantly only with the public schema and
  //    the matching private ownership + opaque token documents in one atomic batch.
  await clear();
  const visitorDb = testEnv.unauthenticatedContext().firestore();
  const commentId = 'comment_public_1';
  const ownerToken = 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef';
  const commentRef = doc(visitorDb, 'comments', commentId);
  const ownershipRef = doc(visitorDb, 'comments', commentId, 'private', 'ownership');
  const tokenRef = doc(visitorDb, 'comments', commentId, 'tokens', ownerToken);
  const createBatch = writeBatch(visitorDb);

  createBatch.set(commentRef, validComment(commentId));
  createBatch.set(tokenRef, { postId: 'post-1', createdAt: NOW });
  createBatch.set(ownershipRef, {
    postId: 'post-1',
    createdAt: NOW,
    lastSyncedAt: NOW,
    verifier: '',
    email: 'private@example.com'
  });
  await assertSucceeds(createBatch.commit());
  await assertSucceeds(getDoc(commentRef));
  await assertFails(getDoc(ownershipRef));
  await assertFails(getDoc(tokenRef));

  // 3. Replies must point to a published/approved safe parent in the same article.
  const replyRef = doc(visitorDb, 'comments/reply_public_1');
  const replyToken = 'b1b2c3d4e5f678901234567890abcdef1234567890abcdef';
  const replyBatch = writeBatch(visitorDb);
  replyBatch.set(replyRef, validComment('reply_public_1', {
    parentId: commentId,
    replyToName: 'Aline Uwase',
    content: 'I agree with this point.'
  }));
  replyBatch.set(doc(visitorDb, 'comments/reply_public_1/tokens', replyToken), {
    postId: 'post-1',
    createdAt: NOW
  });
  replyBatch.set(doc(visitorDb, 'comments/reply_public_1/private/ownership'), {
    postId: 'post-1',
    createdAt: NOW,
    lastSyncedAt: NOW,
    verifier: ''
  });
  await assertSucceeds(replyBatch.commit());

  const crossPostReply = writeBatch(visitorDb);
  crossPostReply.set(doc(visitorDb, 'comments/cross_post_reply'), validComment('cross_post_reply', {
    postId: 'different-post',
    parentId: commentId,
    replyToName: 'Aline Uwase'
  }));
  crossPostReply.set(doc(visitorDb, 'comments/cross_post_reply/tokens', 'c1b2c3d4e5f678901234567890abcdef1234567890abcdef'), {
    postId: 'different-post',
    createdAt: NOW
  });
  crossPostReply.set(doc(visitorDb, 'comments/cross_post_reply/private/ownership'), {
    postId: 'different-post',
    createdAt: NOW,
    lastSyncedAt: NOW,
    verifier: ''
  });
  await assertFails(crossPostReply.commit());

  // 4. Public list queries must include the queryable status + publicSafe filters.
  const commentsQuery = query(
    collection(visitorDb, 'comments'),
    where('status', 'in', ['published', 'approved']),
    where('publicSafe', '==', true)
  );
  await assertSucceeds(getDocs(commentsQuery));
  await assertFails(getDocs(query(
    collection(visitorDb, 'comments'),
    where('status', '==', 'published')
  )));

  // 5. Public comments cannot contain email or any unexpected/private fields.
  await seed('comments/legacy_leak', validComment('legacy_leak', {
    email: 'leak@example.com',
    publicSafe: false
  }));
  await assertFails(getDoc(doc(visitorDb, 'comments/legacy_leak')));
  const safeRows = await assertSucceeds(getDocs(commentsQuery));
  assert.equal(safeRows.docs.some((row) => row.id === 'legacy_leak'), false);

  // 6. Only the original owner with a valid token can edit and delete.
  await clear();
  const ownedId = 'owned_comment';
  const ownedToken = 'd1b2c3d4e5f678901234567890abcdef1234567890abcdef';
  const ownedCommentRef = doc(visitorDb, 'comments', ownedId);
  const ownedBatch = writeBatch(visitorDb);
  ownedBatch.set(ownedCommentRef, validComment(ownedId));
  ownedBatch.set(doc(visitorDb, 'comments', ownedId, 'tokens', ownedToken), {
    postId: 'post-1',
    createdAt: NOW
  });
  ownedBatch.set(doc(visitorDb, 'comments', ownedId, 'private', 'ownership'), {
    postId: 'post-1',
    createdAt: NOW,
    lastSyncedAt: NOW,
    verifier: ''
  });
  await assertSucceeds(ownedBatch.commit());

  await assertFails(updateDoc(ownedCommentRef, {
    content: 'A stranger changed this.',
    updatedAt: '2026-11-19T12:01:00.000Z',
    edited: true
  }));

  const editedAt = '2026-11-19T12:02:00.000Z';
  const editBatch = writeBatch(visitorDb);
  editBatch.update(ownedCommentRef, {
    content: 'The original author edited this.',
    updatedAt: editedAt,
    edited: true
  });
  editBatch.update(doc(visitorDb, 'comments', ownedId, 'private', 'ownership'), {
    verifier: ownedToken + ':edit_1234',
    lastSyncedAt: editedAt
  });
  await assertSucceeds(editBatch.commit());

  const deletedAt = '2026-11-19T12:03:00.000Z';
  const deleteBatch = writeBatch(visitorDb);
  deleteBatch.delete(ownedCommentRef);
  deleteBatch.update(doc(visitorDb, 'comments', ownedId, 'private', 'ownership'), {
    verifier: ownedToken + ':delete_123',
    lastSyncedAt: deletedAt
  });
  await assertSucceeds(deleteBatch.commit());
  await assertFails(getDoc(ownedCommentRef));

  // 7. Admin moderation is allowed; a regular visitor cannot change status.
  await clear();
  await seed('comments/moderation_target', validComment('moderation_target'));
  await assertFails(updateDoc(doc(visitorDb, 'comments/moderation_target'), { status: 'hidden' }));
  await assertSucceeds(updateDoc(doc(adminDb, 'comments/moderation_target'), { status: 'hidden' }));

  // 8. Mini Shop: only active, schema-safe products are publicly readable.
  await clear();
  await seed('mini_shop_products/product-1', validProduct());
  await seed('mini_shop_products/inactive-product', validProduct({
    id: 'inactive-product',
    active: false
  }));
  const productRef = doc(visitorDb, 'mini_shop_products/product-1');
  await assertSucceeds(getDoc(productRef));
  await assertFails(getDoc(doc(visitorDb, 'mini_shop_products/inactive-product')));

  const productsQuery = query(
    collection(visitorDb, 'mini_shop_products'),
    where('active', '==', true),
    where('publicSafe', '==', true)
  );
  await assertSucceeds(getDocs(productsQuery));
  await assertFails(getDocs(query(
    collection(visitorDb, 'mini_shop_products'),
    where('active', '==', true)
  )));

  // Public users cannot write products or read private seller metadata.
  await assertFails(setDoc(doc(visitorDb, 'mini_shop_products/visitor-product'), validProduct({
    id: 'visitor-product'
  })));
  await seed('mini_shop_products/product-1/private/seller', {
    sellerEmail: 'seller@example.com',
    supplierPhone: '0781111111'
  });
  await assertFails(getDoc(doc(visitorDb, 'mini_shop_products/product-1/private/seller')));
  await assertSucceeds(getDoc(doc(adminDb, 'mini_shop_products/product-1/private/seller')));

  // 9. A malformed product carrying publicSafe=true must still be denied on direct get.
  await clear();
  await seed('mini_shop_products/unsafe-product', validProduct({
    id: 'unsafe-product',
    sellerEmail: 'private@example.com'
  }));
  await assertFails(getDoc(doc(visitorDb, 'mini_shop_products/unsafe-product')));

  // 10. Only the verified Google administrator can manage Mini Shop products.
  await assertSucceeds(setDoc(doc(adminDb, 'mini_shop_products/admin-product'), validProduct({
    id: 'admin-product'
  })));
  await assertFails(setDoc(doc(fakeAdminDb, 'mini_shop_products/fake-admin-product'), validProduct({
    id: 'fake-admin-product'
  })));

  // Ensure a path/id mismatch is rejected for administrator product writes.
  await assertFails(setDoc(doc(adminDb, 'mini_shop_products/path-mismatch'), validProduct({
    id: 'different-id'
  })));
  await assertFails(setDoc(doc(adminDb, 'mini_shop_products/private-leak'), validProduct({
    id: 'private-leak',
    sellerEmail: 'secret@example.com'
  })));
});

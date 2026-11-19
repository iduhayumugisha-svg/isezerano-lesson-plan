import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { runBackupAndDryRun } from '../scripts/firestoreBackupAndDryRun.mjs';

const PROJECT_ID = 'isezerano-news';

function parseEmulatorHost(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8188';
  const [host, portStr] = raw.split(':');
  return { host: host || '127.0.0.1', port: Number(portStr) || 8188 };
}

async function run() {
  const { host, port } = parseEmulatorHost();
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host,
      port,
      rules: fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8')
    }
  });

  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'isezerano-backup-test-'));

  try {
    await testEnv.clearFirestore();

    // Seed realistic legacy + modern production-like data across all 5 collections + nested subcollections
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();

      // 1. Legacy 5-field approved comment (mirrors live production LrFSK9cyssUwnbmirR1X)
      await setDoc(doc(db, 'comments/legacy_approved_1'), {
        postId: 'post_1',
        name: 'Jean Bosco',
        content: 'Legacy approved comment without publicSafe',
        status: 'approved',
        createdAt: '2026-10-01T08:00:00.000Z'
      });

      // 2. Legacy comment containing inline private PII + missing publicSafe
      await setDoc(doc(db, 'comments/legacy_pii_comment'), {
        postId: 'post_1',
        parentId: null,
        replyToName: null,
        name: 'Marie Claire',
        content: 'Legacy comment with inline email and token',
        status: 'published',
        createdAt: '2026-10-02T09:00:00.000Z',
        email: 'marie@example.com',
        phone: '+250788000111',
        ownerToken: 'deadbeef123456'
      });

      // 3. Modern compliant comment + subcollections (/private/ownership and /tokens/...)
      await setDoc(doc(db, 'comments/modern_comment_1'), {
        postId: 'post_1',
        parentId: null,
        replyToName: null,
        name: 'Alice Mukamana',
        content: 'Compliant comment with isolated subcollections',
        status: 'published',
        createdAt: '2026-11-18T10:00:00.000Z',
        updatedAt: '2026-11-18T10:00:00.000Z',
        edited: false,
        publicSafe: true
      });
      await setDoc(doc(db, 'comments/modern_comment_1/private/ownership'), {
        postId: 'post_1',
        createdAt: '2026-11-18T10:00:00.000Z',
        lastSyncedAt: '2026-11-18T10:00:00.000Z',
        verifier: '',
        email: 'alice@example.com'
      });
      await setDoc(doc(db, 'comments/modern_comment_1/tokens/abcdef0123456789abcdef0123456789'), {
        postId: 'post_1',
        createdAt: '2026-11-18T10:00:00.000Z'
      });

      // 4. Reply referencing modern_comment_1
      await setDoc(doc(db, 'comments/modern_reply_1'), {
        postId: 'post_1',
        parentId: 'modern_comment_1',
        replyToName: 'Alice Mukamana',
        name: 'Eric Nshimiye',
        content: 'Reply to compliant comment',
        status: 'published',
        createdAt: '2026-11-18T11:00:00.000Z',
        updatedAt: '2026-11-18T11:00:00.000Z',
        edited: false,
        publicSafe: true
      });

      // 5. Orphaned subcollection under a deleted parent comment (phantom parent test)
      await setDoc(doc(db, 'comments/deleted_parent_phantom/private/ownership'), {
        postId: 'post_1',
        createdAt: '2026-11-01T10:00:00.000Z',
        lastSyncedAt: '2026-11-01T10:00:00.000Z',
        verifier: 'tombstone'
      });

      // 6. Legacy Mini Shop product with private/extra fields + missing publicSafe
      await setDoc(doc(db, 'mini_shop_products/prod_legacy'), {
        id: 'prod_legacy',
        title: 'Solar Radio',
        description: 'Portable FM/SW solar radio',
        price: '25,000 RWF',
        imageUrl: 'https://example.com/radio.jpg',
        whatsappNumber: '+250788000222',
        active: true,
        displayOrder: 1,
        createdAt: '2026-10-10T10:00:00.000Z',
        updatedAt: '2026-10-10T10:00:00.000Z',
        sellerEmail: 'seller@example.com',
        supplierPhone: '+250788999000',
        updatedBy: 'twizerefelix90@gmail.com',
        costPrice: '15,000 RWF'
      });

      // 7. Compliant Mini Shop product + /private/seller_meta
      await setDoc(doc(db, 'mini_shop_products/prod_modern'), {
        id: 'prod_modern',
        title: 'Studio Microphone',
        description: 'USB condenser mic',
        imageUrl: 'https://example.com/mic.jpg',
        phoneNumber: '+250788000333',
        active: true,
        displayOrder: 2,
        createdAt: '2026-11-18T10:00:00.000Z',
        updatedAt: '2026-11-18T10:00:00.000Z',
        publicSafe: true
      });
      await setDoc(doc(db, 'mini_shop_products/prod_modern/private/seller_meta'), {
        costPrice: '45,000 RWF',
        supplierPhone: '+250788111222'
      });

      // 8. appSettings & siteSettings & posts
      await setDoc(doc(db, 'appSettings/ads'), { masterEnabled: true });
      await setDoc(doc(db, 'appSettings/fcm_config'), { vapidKey: 'test-public-vapid' });
      await setDoc(doc(db, 'siteSettings/branding'), { siteName: 'ISEZERANO', logoData: 'https://example.com/logo.png' });
      await setDoc(doc(db, 'posts/post_1'), { title: 'Test Article', status: 'published', views: 12 });
    });

    const result = await runBackupAndDryRun({
      projectId: PROJECT_ID,
      outputDir: tmpOut
    });

    const byCol = result.manifest.counts.byRootCollection as Record<string, {
      totalRootDocuments: number;
      existingRootDocuments: number;
      missingParentPlaceholders: number;
      totalNestedSubcollectionDocuments: number;
    }>;

    // Verify exact recursive backup counts
    assert.equal(byCol.comments.totalRootDocuments, 5);
    assert.equal(byCol.comments.existingRootDocuments, 4);
    assert.equal(byCol.comments.missingParentPlaceholders, 1);
    assert.equal(byCol.comments.totalNestedSubcollectionDocuments, 3);
    assert.equal(byCol.mini_shop_products.totalRootDocuments, 2);
    assert.equal(byCol.mini_shop_products.totalNestedSubcollectionDocuments, 1);
    assert.equal(byCol.appSettings.totalRootDocuments, 2);
    assert.equal(byCol.siteSettings.totalRootDocuments, 1);
    assert.equal(byCol.posts.totalRootDocuments, 1);
    assert.equal(result.manifest.counts.totalDocumentsBackedUp, 15);

    // Verify dry-run comment analysis counts
    const cSum = result.dryRunJson.comments.summary;
    assert.equal(cSum.totalCommentDocs, 5);
    assert.equal(cSum.existingDocs, 4);
    assert.equal(cSum.missingParentPlaceholders, 1);
    assert.equal(cSum.compliantWithNewRules, 2);
    assert.equal(cSum.missingPublicSafeTrue, 2);
    assert.equal(cSum.containingPrivateFields, 1);
    assert.equal(cSum.wouldDisappearWithoutMigration, 2);
    assert.deepEqual(cSum.privateFieldCounts, { email: 1, ownerToken: 1, phone: 1 });

    // Verify dry-run Mini Shop analysis counts
    const mSum = result.dryRunJson.mini_shop_products.summary;
    assert.equal(mSum.totalProductDocs, 2);
    assert.equal(mSum.compliantWithNewRules, 1);
    assert.equal(mSum.missingPublicSafeTrue, 1);
    assert.equal(mSum.containingPrivateOrExtraFields, 1);
    assert.equal(mSum.wouldDisappearWithoutMigration, 1);
    assert.deepEqual(mSum.nonPublicFieldCounts, {
      costPrice: 1,
      sellerEmail: 1,
      supplierPhone: 1,
      updatedBy: 1
    });

    // Verify settings classification
    assert.equal(result.dryRunJson.settings.totalDocs, 3);
    assert.equal(result.dryRunJson.settings.publicAllowlistedDocs, 2);
    assert.equal(result.dryRunJson.settings.adminOnlyDocs, 1);

    // Verify PII never appears in markdown dry-run report
    assert.equal(result.dryRunMarkdown.includes('marie@example.com'), false);
    assert.equal(result.dryRunMarkdown.includes('deadbeef123456'), false);
    assert.equal(result.dryRunMarkdown.includes('seller@example.com'), false);

    // Verify raw lossless fields preserved in full JSON backup
    const fullBackup = JSON.parse(fs.readFileSync(path.join(tmpOut, 'firestore-backup-complete.json'), 'utf8'));
    const piiComment = fullBackup.collections.comments.documents.find((d: any) => d.id === 'legacy_pii_comment');
    assert.equal(piiComment.rawFields.email.stringValue, 'marie@example.com');
    const modernComment = fullBackup.collections.comments.documents.find((d: any) => d.id === 'modern_comment_1');
    assert.equal(modernComment.subcollections.private.documents[0].id, 'ownership');
    assert.equal(modernComment.subcollections.tokens.documents.length, 1);

    // Verify sha256sum -c checksums.sha256 succeeds
    const shaOut = execSync('sha256sum -c checksums.sha256', { cwd: tmpOut, encoding: 'utf8' });
    assert.match(shaOut, /manifest\.json: OK/);
    assert.match(shaOut, /firestore-backup-complete\.json: OK/);

    // Validate workflow YAML invariants
    const wfPath = path.resolve(process.cwd(), '.github/workflows/backup-and-dryrun-audit.yml');
    const wfContent = fs.readFileSync(wfPath, 'utf8');
    assert.match(wfContent, /^on:\s*\n\s*workflow_dispatch:/m);
    assert.match(wfContent, /FIREBASE_SERVICE_ACCOUNT_ISEZERANO_NEWS/);
    assert.match(wfContent, /actions\/upload-artifact@v4/);
    assert.match(wfContent, /sha256sum -c checksums\.sha256/);
    assert.equal(wfContent.includes('firebase deploy'), false);
    assert.equal(wfContent.includes('firestore:rules'), false);

    console.log('✅ All Firestore Backup & Dry-Run Audit Emulator tests passed!');
  } finally {
    fs.rmSync(tmpOut, { recursive: true, force: true });
    await testEnv.cleanup();
  }
}

run().catch((err) => {
  console.error('❌ Backup & Dry-Run test failed:', err);
  process.exit(1);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { createServerApp } from '../server.ts';
import { ADMIN_EMAIL, AUTHOR_SESSION_COOKIE_NAME } from '../server/commentsApi.ts';

interface HttpSessionClient {
  cookies: Map<string, string>;
  rawSetCookies: string[];
  request: (
    urlPath: string,
    options?: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
    }
  ) => Promise<{ status: number; headers: Headers; json: any; text: string }>;
}

function createSessionClient(baseUrl: string): HttpSessionClient {
  const cookies = new Map<string, string>();
  const rawSetCookies: string[] = [];

  return {
    cookies,
    rawSetCookies,
    async request(urlPath, options = {}) {
      const headers: Record<string, string> = {
        ...(options.headers || {})
      };
      if (options.body !== undefined && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      if (cookies.size > 0 && !headers.Cookie) {
        headers.Cookie = Array.from(cookies.entries())
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');
      }

      const res = await fetch(`${baseUrl}${urlPath}`, {
        method: options.method || 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined
      });

      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        rawSetCookies.push(setCookie);
        const firstPart = setCookie.split(';')[0] || '';
        const eqIdx = firstPart.indexOf('=');
        if (eqIdx > 0) {
          const name = firstPart.slice(0, eqIdx).trim();
          const value = firstPart.slice(eqIdx + 1).trim();
          cookies.set(name, value);
        }
      }

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      return { status: res.status, headers: res.headers, json, text };
    }
  };
}

function assertNoSecretsOrEmailsLeaked(payloadText: string, secretStrings: string[]) {
  assert.equal(payloadText.includes('ownerToken'), false, 'Response must never expose ownerToken');
  assert.equal(payloadText.includes('ownerSessionHash'), false, 'Response must never expose ownerSessionHash');
  assert.equal(payloadText.includes('ownerProofHash'), false, 'Response must never expose ownerProofHash');
  assert.equal(payloadText.includes('privateEmail'), false, 'Response must never expose privateEmail');
  for (const s of secretStrings) {
    assert.equal(payloadText.includes(s), false, `Response must never leak sensitive string "${s}"`);
  }
}

async function runCommentOwnershipSecuritySuite(): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isezerano-comment-sec-'));
  const storeFilePath = path.join(tempDir, 'comments-store.json');
  const testSecret = 'test_hmac_secret_key_for_isezerano_online_comments_2026';
  const adminToken = 'verified_google_admin_jwt_token_value';
  const nonAdminGoogleToken = 'other_google_user_jwt_token_value';

  const verifyAdminJwt = async (token: string) => {
    if (token === adminToken) {
      return { valid: true, email: ADMIN_EMAIL };
    }
    return { valid: false };
  };

  const createTestServer = async () => {
    const app = createServerApp({
      isProd: false,
      commentsApiOptions: {
        secretKey: testSecret,
        storeFilePath,
        disableFirestoreSync: true,
        verifyAdminJwt
      }
    });
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    return {
      server,
      baseUrl: `http://127.0.0.1:${port}`
    };
  };

  let activeServer: http.Server | null = null;

  try {
    const firstBoot = await createTestServer();
    activeServer = firstBoot.server;
    const baseUrl = firstBoot.baseUrl;

    const visitorA = createSessionClient(baseUrl);
    const visitorB = createSessionClient(baseUrl);
    const freshBrowserC = createSessionClient(baseUrl);
    const postId = 'post_security_audit_1';

    // -----------------------------------------------------------------------
    // 1. Visitor A writes a comment -> instant 'published', HttpOnly cookie, zero leaks
    // -----------------------------------------------------------------------
    const postARes = await visitorA.request('/api/comments', {
      method: 'POST',
      body: {
        postId,
        name: 'Alice Mukamana',
        email: 'alice.private@example.com',
        content: 'Visitor A original public comment.'
      }
    });
    assert.equal(postARes.status, 201);
    assert.equal(postARes.json?.success, true);
    const commentA = postARes.json?.comment;
    assert.ok(commentA?.id);
    assert.equal(commentA.status, 'published', 'Comment must publish immediately without pending status');
    assert.equal(commentA.name, 'Alice Mukamana');
    assert.equal(commentA.canEdit, true);
    assert.equal(commentA.canDelete, true);

    const aCookieHeader = visitorA.rawSetCookies[0] || '';
    assert.equal(aCookieHeader.includes(`${AUTHOR_SESSION_COOKIE_NAME}=`), true);
    assert.equal(/;\s*HttpOnly\b/i.test(aCookieHeader), true, 'Session cookie must be HttpOnly');
    assert.equal(/;\s*SameSite=Lax\b/i.test(aCookieHeader), true, 'Session cookie must enforce SameSite=Lax');

    assertNoSecretsOrEmailsLeaked(postARes.text, ['alice.private@example.com', testSecret]);
    console.log('✓ Test 1: Visitor A posts comment (instant published, HttpOnly cookie, no email/token leak)');

    // -----------------------------------------------------------------------
    // 2. Visitor B can reply openly -> does NOT grant edit/delete on Visitor A's comment
    // -----------------------------------------------------------------------
    const listBeforeReplyB = await visitorB.request(`/api/comments?postId=${encodeURIComponent(postId)}`);
    assert.equal(listBeforeReplyB.status, 200);
    assert.equal(listBeforeReplyB.json.comments.length, 1);
    assert.equal(listBeforeReplyB.json.comments[0].canEdit, false);
    assert.equal(listBeforeReplyB.json.comments[0].canDelete, false);
    assert.equal(
      (listBeforeReplyB.headers.get('cache-control') || '').includes('no-store'),
      true,
      'Per-visitor permission responses must set Cache-Control: no-store'
    );

    const replyBRes = await visitorB.request('/api/comments', {
      method: 'POST',
      body: {
        postId,
        parentId: commentA.id,
        replyToName: 'Alice Mukamana',
        name: 'Bob Niyonsenga',
        email: 'bob.private@example.org',
        content: 'Visitor B reply to Alice.'
      }
    });
    assert.equal(replyBRes.status, 201);
    const replyB = replyBRes.json?.comment;
    assert.ok(replyB?.id);
    assert.equal(replyB.status, 'published');
    assert.equal(replyB.parentId, commentA.id);
    assert.equal(replyB.replyToName, 'Alice Mukamana');
    assert.equal(replyB.canEdit, true);
    assert.equal(replyB.canDelete, true);
    assertNoSecretsOrEmailsLeaked(replyBRes.text, [
      'alice.private@example.com',
      'bob.private@example.org',
      testSecret
    ]);

    const listAfterReplyB = await visitorB.request(`/api/comments?postId=${encodeURIComponent(postId)}`);
    const bViewOfA = listAfterReplyB.json.comments.find((c: any) => c.id === commentA.id);
    const bViewOfB = listAfterReplyB.json.comments.find((c: any) => c.id === replyB.id);
    assert.equal(bViewOfA.canEdit, false, 'Replying must NOT grant edit permission on parent comment');
    assert.equal(bViewOfA.canDelete, false, 'Replying must NOT grant delete permission on parent comment');
    assert.equal(bViewOfB.canEdit, true, 'Visitor B must own only their own reply');
    assert.equal(bViewOfB.canDelete, true);
    console.log('✓ Test 2: Visitor B replies openly without gaining edit/delete on parent comment');

    // -----------------------------------------------------------------------
    // 3. Visitor B CANNOT edit Visitor A's comment (even with ID, name, email, or forged cookies)
    // -----------------------------------------------------------------------
    const spoofByVisitorB = await visitorB.request(`/api/comments/${commentA.id}`, {
      method: 'PATCH',
      body: {
        name: 'Alice Mukamana',
        email: 'alice.private@example.com',
        content: 'Hijacked by Visitor B'
      }
    });
    assert.equal(spoofByVisitorB.status, 403);

    const anonymousEdit = await fetch(`${baseUrl}/api/comments/${commentA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'No cookie exploit' })
    });
    assert.equal(anonymousEdit.status, 403);

    // Tamper signature on Visitor A's session ID
    const aRawSession = decodeURIComponent(visitorA.cookies.get(AUTHOR_SESSION_COOKIE_NAME) || '');
    const aSessionIdOnly = aRawSession.split('.')[0];
    const forgedSigRes = await fetch(`${baseUrl}/api/comments/${commentA.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${AUTHOR_SESSION_COOKIE_NAME}=${encodeURIComponent(`${aSessionIdOnly}.${'0'.repeat(64)}`)}`
      },
      body: JSON.stringify({ content: 'Tampered HMAC signature' })
    });
    assert.equal(forgedSigRes.status, 403);

    // Verify comment A content is still untouched
    const verifyUnchanged = await visitorA.request(`/api/comments?postId=${encodeURIComponent(postId)}`);
    const untouchedA = verifyUnchanged.json.comments.find((c: any) => c.id === commentA.id);
    assert.equal(untouchedA.content, 'Visitor A original public comment.');
    assert.equal(untouchedA.edited, false);
    console.log('✓ Test 3: Visitor B & attackers cannot edit Visitor A comment (403 across all bypass attempts)');

    // -----------------------------------------------------------------------
    // 4. Visitor B CANNOT delete Visitor A's comment
    // -----------------------------------------------------------------------
    const deleteAByB = await visitorB.request(`/api/comments/${commentA.id}`, {
      method: 'DELETE'
    });
    assert.equal(deleteAByB.status, 403);

    const deleteAByAnon = await fetch(`${baseUrl}/api/comments/${commentA.id}`, {
      method: 'DELETE'
    });
    assert.equal(deleteAByAnon.status, 403);
    console.log('✓ Test 4: Visitor B & unauthenticated callers cannot delete Visitor A comment (403)');

    // -----------------------------------------------------------------------
    // 5. Visitor A CAN edit own comment (while immutable fields remain protected)
    //    AND Test 7: Visitor A CANNOT edit or delete Visitor B's reply
    // -----------------------------------------------------------------------
    const editAByA = await visitorA.request(`/api/comments/${commentA.id}`, {
      method: 'PATCH',
      body: {
        name: 'Impersonated Admin',
        status: 'hidden',
        postId: 'other_post',
        content: 'Visitor A updated comment content.'
      }
    });
    assert.equal(editAByA.status, 200);
    assert.equal(editAByA.json.comment.content, 'Visitor A updated comment content.');
    assert.equal(editAByA.json.comment.edited, true);
    assert.equal(editAByA.json.comment.name, 'Alice Mukamana', 'Author name must stay immutable on edit');
    assert.equal(editAByA.json.comment.status, 'published', 'Status must stay immutable on author edit');
    assert.equal(editAByA.json.comment.postId, postId, 'postId must stay immutable on author edit');

    const editReplyBByA = await visitorA.request(`/api/comments/${replyB.id}`, {
      method: 'PATCH',
      body: { content: 'Visitor A trying to hijack reply B' }
    });
    assert.equal(editReplyBByA.status, 403);

    const deleteReplyBByA = await visitorA.request(`/api/comments/${replyB.id}`, {
      method: 'DELETE'
    });
    assert.equal(deleteReplyBByA.status, 403);
    console.log('✓ Tests 5a & 7: Visitor A edits own comment cleanly and is blocked (403) from editing/deleting Visitor B reply');

    // -----------------------------------------------------------------------
    // 10. Refresh / second browser & server reload preserve exact permissions
    // -----------------------------------------------------------------------
    const aAfterRefresh = await visitorA.request(`/api/comments?postId=${encodeURIComponent(postId)}`);
    const cAnotherBrowser = await freshBrowserC.request(`/api/comments?postId=${encodeURIComponent(postId)}`);
    assert.equal(aAfterRefresh.json.comments.find((c: any) => c.id === commentA.id).canEdit, true);
    assert.equal(aAfterRefresh.json.comments.find((c: any) => c.id === replyB.id).canEdit, false);
    assert.equal(cAnotherBrowser.json.comments.find((c: any) => c.id === commentA.id).canEdit, false);
    assert.equal(cAnotherBrowser.json.comments.find((c: any) => c.id === commentA.id).canDelete, false);
    assert.equal(cAnotherBrowser.json.comments.find((c: any) => c.id === replyB.id).canEdit, false);
    assertNoSecretsOrEmailsLeaked(aAfterRefresh.text, ['alice.private@example.com', 'bob.private@example.org', testSecret]);
    assertNoSecretsOrEmailsLeaked(cAnotherBrowser.text, ['alice.private@example.com', 'bob.private@example.org', testSecret]);

    // Restart server to simulate fresh backend process reading persisted store
    await new Promise<void>((resolve, reject) => activeServer!.close((err) => (err ? reject(err) : resolve())));
    const secondBoot = await createTestServer();
    activeServer = secondBoot.server;
    const baseUrl2 = secondBoot.baseUrl;

    const persistedACheck = await fetch(`${baseUrl2}/api/comments?postId=${encodeURIComponent(postId)}`, {
      headers: {
        Cookie: `${AUTHOR_SESSION_COOKIE_NAME}=${visitorA.cookies.get(AUTHOR_SESSION_COOKIE_NAME)}`
      }
    });
    const persistedAJson = (await persistedACheck.json()) as any;
    assert.equal(persistedAJson.comments.find((c: any) => c.id === commentA.id).canEdit, true);
    assert.equal(persistedAJson.comments.find((c: any) => c.id === replyB.id).canEdit, false);

    const persistedBCheck = await fetch(`${baseUrl2}/api/comments?postId=${encodeURIComponent(postId)}`, {
      headers: {
        Cookie: `${AUTHOR_SESSION_COOKIE_NAME}=${visitorB.cookies.get(AUTHOR_SESSION_COOKIE_NAME)}`
      }
    });
    const persistedBJson = (await persistedBCheck.json()) as any;
    assert.equal(persistedBJson.comments.find((c: any) => c.id === commentA.id).canEdit, false);
    assert.equal(persistedBJson.comments.find((c: any) => c.id === replyB.id).canEdit, true);
    console.log('✓ Test 10: Permissions persist accurately across refresh, second browser, and backend restart');

    // -----------------------------------------------------------------------
    // 6. Visitor B CAN edit & delete ONLY their own reply
    // -----------------------------------------------------------------------
    const editReplyBByB = await fetch(`${baseUrl2}/api/comments/${replyB.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${AUTHOR_SESSION_COOKIE_NAME}=${visitorB.cookies.get(AUTHOR_SESSION_COOKIE_NAME)}`
      },
      body: JSON.stringify({ content: 'Visitor B edited their own reply.' })
    });
    assert.equal(editReplyBByB.status, 200);
    const editedBJson = (await editReplyBByB.json()) as any;
    assert.equal(editedBJson.comment.content, 'Visitor B edited their own reply.');
    assert.equal(editedBJson.comment.edited, true);

    const delReplyBByB = await fetch(`${baseUrl2}/api/comments/${replyB.id}`, {
      method: 'DELETE',
      headers: {
        Cookie: `${AUTHOR_SESSION_COOKIE_NAME}=${visitorB.cookies.get(AUTHOR_SESSION_COOKIE_NAME)}`
      }
    });
    assert.equal(delReplyBByB.status, 200);
    console.log('✓ Test 6: Visitor B edits and deletes own reply cleanly');

    // -----------------------------------------------------------------------
    // 8 & 9. Admin moderation & unauthorized API route/method rejection
    // -----------------------------------------------------------------------
    const nonAdminAll = await fetch(`${baseUrl2}/api/comments/all`, {
      headers: { Authorization: `Bearer ${nonAdminGoogleToken}` }
    });
    assert.equal(nonAdminAll.status, 403);

    const nonAdminModerate = await fetch(`${baseUrl2}/api/comments/${commentA.id}/moderate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nonAdminGoogleToken}`
      },
      body: JSON.stringify({ status: 'hidden' })
    });
    assert.equal(nonAdminModerate.status, 403);

    const unsupportedMethod = await fetch(`${baseUrl2}/api/comments/${commentA.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'PUT not allowed' })
    });
    assert.equal(unsupportedMethod.status, 405);

    const adminAllRes = await fetch(`${baseUrl2}/api/comments/all`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(adminAllRes.status, 200);

    const adminHideRes = await fetch(`${baseUrl2}/api/comments/${commentA.id}/moderate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'hidden' })
    });
    assert.equal(adminHideRes.status, 200);
    assert.equal(((await adminHideRes.json()) as any).comment.status, 'hidden');

    const publicAfterHide = await (await fetch(`${baseUrl2}/api/comments?postId=${encodeURIComponent(postId)}`)).json() as any;
    assert.equal(publicAfterHide.comments.length, 0, 'Hidden comment must disappear from public view');

    const adminRestoreRes = await fetch(`${baseUrl2}/api/comments/${commentA.id}/moderate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'published' })
    });
    assert.equal(adminRestoreRes.status, 200);

    // Test 5b: Visitor A deletes own restored comment cleanly
    const delAByA = await fetch(`${baseUrl2}/api/comments/${commentA.id}`, {
      method: 'DELETE',
      headers: {
        Cookie: `${AUTHOR_SESSION_COOKIE_NAME}=${visitorA.cookies.get(AUTHOR_SESSION_COOKIE_NAME)}`
      }
    });
    assert.equal(delAByA.status, 200);

    // Also test parent deletion preserves replies
    const cParent = await (
      await fetch(`${baseUrl2}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, name: 'Parent Author', content: 'Parent will be deleted' })
      })
    );
    const parentCookie = (cParent.headers.get('set-cookie') || '').split(';')[0];
    const parentId = ((await cParent.json()) as any).comment.id;

    const cChild = await (
      await fetch(`${baseUrl2}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          parentId,
          replyToName: 'Parent Author',
          name: 'Reply Author',
          content: 'Reply stays intact when parent deleted'
        })
      })
    );
    const childCookie = (cChild.headers.get('set-cookie') || '').split(';')[0];
    const childId = ((await cChild.json()) as any).comment.id;

    const delParentRes = await fetch(`${baseUrl2}/api/comments/${parentId}`, {
      method: 'DELETE',
      headers: { Cookie: parentCookie }
    });
    assert.equal(delParentRes.status, 200);

    const remainingList = await (await fetch(`${baseUrl2}/api/comments?postId=${encodeURIComponent(postId)}`)).json() as any;
    assert.equal(remainingList.comments.some((c: any) => c.id === parentId), false);
    assert.equal(remainingList.comments.some((c: any) => c.id === childId), true, 'Child reply must be preserved after parent author deletes');

    // Admin cascade delete cleanup check
    const adminCleanupChild = await fetch(`${baseUrl2}/api/comments/${childId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(adminCleanupChild.status, 200);

    // Clean stale author delete attempt on reply with non-admin cookie -> 403
    const cleanupFailRes = await fetch(`${baseUrl2}/api/comments/${childId}`, {
      method: 'DELETE',
      headers: { Cookie: childCookie }
    });
    assert.equal(cleanupFailRes.status, 403);

    console.log('✓ Tests 5b, 8 & 9: Admin moderation (hide/restore/delete), unauthorized 403/405 rejections, and reply preservation verified');
    console.log('\nALL COMMENT OWNERSHIP SECURITY TESTS PASSED!');
  } finally {
    if (activeServer) {
      await new Promise<void>((resolve) => activeServer!.close(() => resolve()));
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runCommentOwnershipSecuritySuite().catch((err) => {
  console.error('COMMENT OWNERSHIP SECURITY SUITE FAILURE:', err);
  process.exit(1);
});

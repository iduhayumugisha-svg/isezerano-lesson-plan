#!/usr/bin/env node
/**
 * ISEZERANO ONLINE — tightly scoped, atomic migration for exactly four legacy comments.
 *
 * Writes are impossible unless MIGRATION_CONFIRMATION is exactly APPLY_4_COMMENTS.
 * The script validates every target before issuing one atomic Firestore commit.
 * It adds missing fields only, uses update-time preconditions, then re-reads all four docs.
 * It never deletes documents, changes existing field values, or deploys rules.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'isezerano-news';
const DATABASE_ID = '(default)';
const CONFIRMATION = 'APPLY_4_COMMENTS';
const OUTPUT = process.env.REPORT_PATH || 'artifacts/comments-migration-result.md';

const TARGETS = {
  bYBKAyChstjl0VVj8w3J: { updatedAt: '2026-11-17T10:12:10.564Z' },
  CnAK2oPNrP3UJqr20C0H: {},
  LrFSK9cyssUwnbmirR1X: { updatedAt: '2026-11-17T13:50:12.652Z' },
  ZUXfb9OjAWmum05GqamE: { updatedAt: '2026-11-17T01:31:30.626Z' }
};

const ALLOWED = new Set([
  'postId', 'parentId', 'replyToName', 'name', 'content',
  'status', 'createdAt', 'updatedAt', 'edited', 'publicSafe'
]);
const PRIVATE = new Set([
  'email', 'phone', 'ownerToken', 'ownerSecret', 'ipAddress',
  'verifier', 'privateEmail', 'sellerEmail'
]);

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_ISEZERANO_NEWS secret.');
  const account = JSON.parse(raw);
  if (!account.client_email || !account.private_key || !account.token_uri) {
    throw new Error('Service account JSON is missing required fields.');
  }
  return account;
}

async function getAccessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: account.token_uri,
    iat: now,
    exp: now + 600
  }));
  const signingInput = header + '.' + claims;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const assertion = signingInput + '.' + signer.sign(account.private_key).toString('base64url');
  const response = await fetch(account.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  if (!response.ok) throw new Error('Google OAuth token request failed: HTTP ' + response.status);
  const body = await response.json();
  if (!body.access_token) throw new Error('Google OAuth response did not contain an access token.');
  return body.access_token;
}

function decode(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  return '[non-scalar Firestore value]';
}

function encode(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  return { stringValue: String(value) };
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decode(value)]));
}

function encodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encode(value)]));
}

function equalValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function readDocument(baseUrl, id, token) {
  const response = await fetch(baseUrl + encodeURIComponent(id), {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (response.status === 404) throw new Error('Target comment not found: ' + id);
  if (!response.ok) throw new Error('Firestore read failed for target ' + id + ': HTTP ' + response.status);
  return response.json();
}

function validateAndPlan(id, document) {
  const data = decodeFields(document.fields);
  const keys = Object.keys(data);
  const errors = [];
  const privateFields = keys.filter((key) => PRIVATE.has(key));
  const unexpectedFields = keys.filter((key) => !ALLOWED.has(key));

  if (privateFields.length) errors.push('private fields found: ' + privateFields.join(', '));
  if (unexpectedFields.length) errors.push('unexpected fields found: ' + unexpectedFields.join(', '));
  if (data.status !== 'approved') errors.push('status is not approved');
  for (const key of ['postId', 'name', 'content', 'createdAt']) {
    if (typeof data[key] !== 'string' || data[key].length === 0) {
      errors.push('required existing field invalid: ' + key);
    }
  }
  if ('publicSafe' in data && data.publicSafe !== true) errors.push('publicSafe exists but is not true');
  if ('parentId' in data && data.parentId !== null) errors.push('parentId exists and is not null');
  if ('replyToName' in data && data.replyToName !== null) errors.push('replyToName exists and is not null');
  if ('edited' in data && typeof data.edited !== 'boolean') errors.push('edited exists but is not boolean');
  if ('updatedAt' in data && typeof data.updatedAt !== 'string') errors.push('updatedAt exists but is not a string');
  if (!document.updateTime) errors.push('Firestore updateTime is missing; cannot safely use an update precondition');

  const target = TARGETS[id];
  const defaults = {
    parentId: null,
    replyToName: null,
    updatedAt: target.updatedAt || data.createdAt,
    edited: false,
    publicSafe: true
  };
  const additions = {};
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in data)) additions[key] = value;
  }

  return { id, document, data, additions, errors };
}

async function main() {
  if (process.env.MIGRATION_CONFIRMATION !== CONFIRMATION) {
    throw new Error('Safety stop: set MIGRATION_CONFIRMATION to the exact approved phrase in the manual workflow input.');
  }

  const account = loadServiceAccount();
  const token = await getAccessToken(account);
  const baseUrl = 'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(PROJECT_ID) + '/databases/' +
    encodeURIComponent(DATABASE_ID) + '/documents/comments/';

  const plans = [];
  for (const id of Object.keys(TARGETS)) {
    const document = await readDocument(baseUrl, id, token);
    plans.push(validateAndPlan(id, document));
  }

  const failures = plans.flatMap((plan) => plan.errors.map((error) => plan.id + ': ' + error));
  if (plans.length !== 4 || failures.length > 0) {
    throw new Error('Pre-write validation failed; NO writes were sent. ' + failures.join(' | '));
  }

  const writes = plans
    .filter((plan) => Object.keys(plan.additions).length > 0)
    .map((plan) => ({
      update: {
        name: plan.document.name,
        fields: encodeFields(plan.additions)
      },
      updateMask: { fieldPaths: Object.keys(plan.additions) },
      currentDocument: { updateTime: plan.document.updateTime }
    }));

  if (writes.length > 0) {
    const commitUrl = 'https://firestore.googleapis.com/v1/projects/' +
      encodeURIComponent(PROJECT_ID) + '/databases/' +
      encodeURIComponent(DATABASE_ID) + '/documents:commit';
    const response = await fetch(commitUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ writes })
    });
    if (!response.ok) {
      throw new Error('Atomic Firestore commit failed: HTTP ' + response.status + '. No partial commit is expected from Firestore.');
    }
    await response.json();
  }

  const verification = [];
  for (const plan of plans) {
    const latest = await readDocument(baseUrl, plan.id, token);
    const latestData = decodeFields(latest.fields);
    const expectedKeys = Object.keys(latestData);
    const valid =
      latestData.status === 'approved' &&
      latestData.publicSafe === true &&
      latestData.parentId === null &&
      latestData.replyToName === null &&
      typeof latestData.updatedAt === 'string' &&
      typeof latestData.edited === 'boolean' &&
      expectedKeys.every((key) => ALLOWED.has(key)) &&
      !expectedKeys.some((key) => PRIVATE.has(key)) &&
      Object.entries(plan.data).every(([key, value]) => equalValue(latestData[key], value));
    verification.push({ id: plan.id, valid, additions: plan.additions });
  }

  const verified = verification.every((item) => item.valid);
  const lines = [
    '# ISEZERANO comments migration result',
    '',
    '- Project: `' + PROJECT_ID + '`',
    '- Generated: ' + new Date().toISOString(),
    '- Scope: exactly four pre-approved `/comments/{id}` documents',
    '- Deletes: **0**',
    '- Rules/Hosting deployments: **0**',
    '- Commit: ' + (writes.length ? 'one atomic Firestore commit' : 'no writes required'),
    '',
    '## Changes and verification',
    ''
  ];
  for (const item of verification) {
    lines.push('### `comments/' + item.id + '`');
    lines.push('- Added missing fields: ' + (Object.keys(item.additions).length
      ? Object.entries(item.additions).map(([key, value]) => '`' + key + '` = `' + JSON.stringify(value) + '`').join(', ')
      : 'none'));
    lines.push('- Post-write verification: **' + (item.valid ? 'PASS' : 'FAIL') + '**', '');
  }
  lines.push('## Overall result', '', verified
    ? '**PASS:** all four comments retain their original fields and now satisfy the public comment schema.'
    : '**FAIL:** post-write verification found a mismatch. Stop further deployments and inspect the report.',
    '');
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, lines.join('\n'), { mode: 0o600 });
  console.log('Migration result report written. Verified: ' + (verified ? 'PASS' : 'FAIL'));
  if (!verified) process.exitCode = 2;
}

main().catch((error) => {
  console.error('Comments migration stopped safely: ' + (error?.message || 'unknown error'));
  process.exitCode = 1;
});

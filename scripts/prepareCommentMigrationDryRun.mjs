#!/usr/bin/env node
/**
 * ISEZERANO ONLINE — read-only preflight for the four legacy comments.
 * This script NEVER writes to Firestore and NEVER deploys Firebase rules.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'isezerano-news';
const DATABASE_ID = '(default)';
const OUTPUT = process.env.REPORT_PATH || 'artifacts/comment-migration-dry-run.md';
const TARGETS = {
  bYBKAyChstjl0VVj8w3J: {
    updatedAt: '2026-11-17T10:12:10.564Z'
  },
  CnAK2oPNrP3UJqr20C0H: {},
  LrFSK9cyssUwnbmirR1X: {
    updatedAt: '2026-11-17T13:50:12.652Z'
  },
  ZUXfb9OjAWmum05GqamE: {
    updatedAt: '2026-11-17T01:31:30.626Z'
  }
};
const ALLOWED = new Set([
  'postId', 'parentId', 'replyToName', 'name', 'content',
  'status', 'createdAt', 'updatedAt', 'edited', 'publicSafe'
]);
const PRIVATE = new Set([
  'email', 'phone', 'ownerToken', 'ownerSecret', 'ipAddress', 'verifier'
]);

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}
function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_ISEZERANO_NEWS secret.');
  const sa = JSON.parse(raw);
  if (!sa.client_email || !sa.private_key || !sa.token_uri) {
    throw new Error('Service account JSON is missing required fields.');
  }
  return sa;
}
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: sa.token_uri,
    iat: now,
    exp: now + 600
  }));
  const input = head + '.' + claim;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(input);
  signer.end();
  const jwt = input + '.' + signer.sign(sa.private_key).toString('base64url');
  const response = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  if (!response.ok) throw new Error('Google OAuth token request failed: HTTP ' + response.status);
  const body = await response.json();
  if (!body.access_token) throw new Error('Google OAuth response did not contain an access token.');
  return body.access_token;
}
function decode(v) {
  if (!v || typeof v !== 'object') return undefined;
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('timestampValue' in v) return v.timestampValue;
  return '[non-scalar Firestore value]';
}
function encode(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  return { stringValue: String(v) };
}
function safeType(v) {
  if (v === null) return 'null';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  return typeof v;
}
async function main() {
  const sa = loadServiceAccount();
  const token = await getAccessToken(sa);
  const base = 'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(PROJECT_ID) + '/databases/' +
    encodeURIComponent(DATABASE_ID) + '/documents/comments/';
  const results = [];
  let failed = false;

  for (const [id, target] of Object.entries(TARGETS)) {
    const response = await fetch(base + encodeURIComponent(id), {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (response.status === 404) {
      results.push({ id, error: 'Document not found' });
      failed = true;
      continue;
    }
    if (!response.ok) {
      throw new Error('Firestore read failed for ' + id + ': HTTP ' + response.status);
    }
    const doc = await response.json();
    const fields = doc.fields || {};
    const data = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));
    const keys = Object.keys(data);
    const privateFields = keys.filter(k => PRIVATE.has(k));
    const unexpected = keys.filter(k => !ALLOWED.has(k));
    const errors = [];
    if (privateFields.length) errors.push('Private fields found: ' + privateFields.join(', '));
    if (unexpected.length) errors.push('Unexpected fields found: ' + unexpected.join(', '));
    if (data.status !== 'approved') errors.push('Expected status approved; found ' + String(data.status));
    for (const key of ['postId', 'name', 'content', 'createdAt']) {
      if (typeof data[key] !== 'string' || !data[key]) errors.push('Required existing field invalid: ' + key);
    }
    if ('publicSafe' in data && data.publicSafe !== true) errors.push('publicSafe exists but is not true');
    if ('parentId' in data && data.parentId !== null) errors.push('parentId exists and is not null; manual review required');
    if ('replyToName' in data && data.replyToName !== null) errors.push('replyToName exists and is not null; manual review required');
    if ('edited' in data && typeof data.edited !== 'boolean') errors.push('edited exists but is not boolean');
    if ('updatedAt' in data && typeof data.updatedAt !== 'string') errors.push('updatedAt exists but is not a string');

    const proposed = {};
    const defaults = {
      parentId: null,
      replyToName: null,
      updatedAt: target.updatedAt || data.createdAt,
      edited: false,
      publicSafe: true
    };
    for (const [key, value] of Object.entries(defaults)) {
      if (!(key in data)) proposed[key] = value;
    }
    if (errors.length) failed = true;
    results.push({
      id,
      status: data.status,
      existingFieldNames: keys.sort(),
      proposedAdditions: proposed,
      errors
    });
  }

  const lines = [
    '# ISEZERANO comments migration — read-only dry-run',
    '',
    '- Project: `' + PROJECT_ID + '`',
    '- Database: `' + DATABASE_ID + '`',
    '- Generated: ' + new Date().toISOString(),
    '- Mode: **READ ONLY — no Firestore writes, no deletes, no rules deployment**',
    '',
    '## Results',
    ''
  ];
  for (const r of results) {
    lines.push('### `comments/' + r.id + '`');
    if (r.error) {
      lines.push('- **STOP:** ' + r.error, '');
      continue;
    }
    lines.push('- Current status: `' + String(r.status) + '`');
    lines.push('- Existing field names: ' + (r.existingFieldNames.map(x => '`' + x + '`').join(', ') || '(none)'));
    lines.push('- Proposed additions (missing fields only):');
    const additions = Object.entries(r.proposedAdditions);
    if (!additions.length) lines.push('  - None');
    for (const [key, value] of additions) {
      lines.push('  - `' + key + '`: `' + JSON.stringify(value) + '`');
    }
    if (r.errors.length) {
      lines.push('- **STOP / manual review required:** ' + r.errors.join('; '));
    } else {
      lines.push('- Preflight: **PASS**');
    }
    lines.push('');
  }
  const pass = !failed && results.length === Object.keys(TARGETS).length;
  lines.push('## Overall result', '', pass
    ? '**PASS:** all four documents match the expected legacy schema. This report does not authorize or perform a migration.'
    : '**STOP:** one or more documents need manual review. No changes were made.',
    '', 'A separate, explicitly confirmed apply step would be required for any production write.', '');

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, lines.join('\n'), { mode: 0o600 });
  console.log('Dry-run report written. No Firestore writes were issued.');
  console.log('Overall preflight: ' + (pass ? 'PASS' : 'STOP'));
  if (!pass) process.exitCode = 2;
}
main().catch(error => {
  console.error('Dry-run failed safely: ' + (error?.message || 'unknown error'));
  process.exitCode = 1;
});

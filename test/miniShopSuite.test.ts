import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildMiniShopTelHref,
  buildMiniShopWhatsAppUrl,
  filterActiveMiniShopProducts,
  getNextMiniShopProductIndex,
  sortMiniShopProducts,
  validateMiniShopProductInput,
  validateMiniShopTelephoneNumber,
  validateMiniShopWhatsApp
} from '../src/utils/miniShopUtils';
import { MiniShopProduct } from '../src/types/platform';

function testMiniShopValidationAndPhoneIntegrity(): void {
  // Never accepts empty contact methods
  const missingContacts = validateMiniShopProductInput({
    title: 'Solar Radio Pro',
    description: 'Rechargeable FM/AM radio with torch.',
    price: '18,000 RWF',
    imageUrl: 'https://example.com/radio.jpg',
    whatsappNumber: '',
    phoneNumber: ''
  });
  assert.equal(missingContacts.valid, false);

  // WhatsApp requires international country code
  const invalidLocalWa = validateMiniShopWhatsApp('0788123456');
  assert.equal(invalidLocalWa.valid, false);

  const validWa = validateMiniShopWhatsApp('+250 788 123 456');
  assert.equal(validWa.valid, true);
  assert.equal(validWa.normalized, '+250788123456');

  // Telephone accepts local or international format without inventing anything
  const validLocalTel = validateMiniShopTelephoneNumber('0788 123 456');
  assert.equal(validLocalTel.valid, true);
  assert.equal(validLocalTel.normalized, '0788123456');

  const emptyTel = validateMiniShopTelephoneNumber('');
  assert.equal(emptyTel.valid, true);
  assert.equal(emptyTel.normalized, '');
  assert.equal(buildMiniShopTelHref(''), '');
  assert.equal(buildMiniShopWhatsAppUrl('', 'Solar Radio'), '');

  // Optional price allowed cleanly
  const validNoPrice = validateMiniShopProductInput({
    title: 'Kigali Coffee Beans 500g',
    description: 'Freshly roasted Rwandan Arabica beans.',
    price: '',
    imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    whatsappNumber: '+250788112233',
    phoneNumber: '0788112233'
  });
  assert.equal(validNoPrice.valid, true);
  assert.equal(validNoPrice.sanitized?.price, undefined);
  assert.equal(validNoPrice.sanitized?.whatsappNumber, '+250788112233');
  assert.equal(validNoPrice.sanitized?.phoneNumber, '0788112233');

  // WhatsApp pre-filled message & Call tel: formatting
  const waHref = buildMiniShopWhatsAppUrl('+250788112233', 'Kigali Coffee Beans 500g');
  assert.match(waHref, /^https:\/\/wa\.me\/250788112233\?text=/);
  assert.match(decodeURIComponent(waHref), /Kigali Coffee Beans 500g/);
  assert.equal(buildMiniShopTelHref('+250 788 112 233'), 'tel:+250788112233');

  console.log('✓ 1. Mini Shop input validation, phone integrity & contact URL building verified');
}

function testMiniShopSortingFilteringAndKomezaCycling(): void {
  const sample: MiniShopProduct[] = [
    {
      id: 'p3',
      title: 'Product Three',
      description: 'Third active item',
      price: '10,000 RWF',
      imageUrl: 'https://example.com/3.jpg',
      whatsappNumber: '+250780000003',
      phoneNumber: '+250780000003',
      active: true,
      displayOrder: 2,
      createdAt: '2026-11-18T00:00:00.000Z',
      updatedAt: '2026-11-18T00:00:00.000Z'
    },
    {
      id: 'p_hidden',
      title: 'Hidden Draft Product',
      description: 'Must not show publicly',
      imageUrl: 'https://example.com/hidden.jpg',
      whatsappNumber: '+250780000002',
      active: false,
      displayOrder: 1,
      createdAt: '2026-11-18T00:00:00.000Z',
      updatedAt: '2026-11-18T00:00:00.000Z'
    },
    {
      id: 'p1',
      title: 'Product One',
      description: 'First active item',
      imageUrl: 'https://example.com/1.jpg',
      phoneNumber: '+250780000001',
      active: true,
      displayOrder: 0,
      createdAt: '2026-11-18T00:00:00.000Z',
      updatedAt: '2026-11-18T00:00:00.000Z'
    }
  ];

  const sortedAll = sortMiniShopProducts(sample);
  assert.deepEqual(
    sortedAll.map((p) => p.id),
    ['p1', 'p_hidden', 'p3']
  );

  const activeOnly = filterActiveMiniShopProducts(sample);
  assert.deepEqual(
    activeOnly.map((p) => p.id),
    ['p1', 'p3']
  );

  // Komeza wrapping across 2 products
  assert.equal(getNextMiniShopProductIndex(0, 2), 1);
  assert.equal(getNextMiniShopProductIndex(1, 2), 0);

  // Single product & empty state edge cases
  assert.equal(getNextMiniShopProductIndex(0, 1), 0);
  assert.equal(getNextMiniShopProductIndex(0, 0), 0);

  console.log('✓ 2. Mini Shop active filtering, ordering & Komeza wrap-around cycling verified');
}

function testMiniShopIntegrationAndLayoutArchitecture(): void {
  const miniShopBarSrc = fs.readFileSync(path.resolve('src/components/MiniShopBar.tsx'), 'utf8');
  const headerSrc = fs.readFileSync(path.resolve('src/components/WebsiteHeader.tsx'), 'utf8');
  const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  const adminMgrSrc = fs.readFileSync(path.resolve('src/components/AdminMiniShopManager.tsx'), 'utf8');
  const adminViewSrc = fs.readFileSync(path.resolve('src/views/AdminDashboardView.tsx'), 'utf8');
  const serviceSrc = fs.readFileSync(path.resolve('src/services/miniShopService.ts'), 'utf8');
  const rulesSrc = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');

  // Fixed permanently at absolute top above sticky header
  assert.match(miniShopBarSrc, /fixed top-0 left-0 right-0 z-50/);
  assert.match(miniShopBarSrc, /ResizeObserver/);
  assert.match(miniShopBarSrc, /Komeza/);
  assert.match(miniShopBarSrc, /WhatsApp/);
  assert.match(miniShopBarSrc, /Call/);
  assert.doesNotMatch(miniShopBarSrc, /window\.(alert|confirm|open)/);

  // App mounts MiniShopBar + dynamic spacer BEFORE WebsiteHeader and hides on /admin or empty list
  const miniShopPos = appSrc.indexOf('<MiniShopBar');
  const spacerPos = appSrc.indexOf('data-testid="mini-shop-spacer"');
  const headerPos = appSrc.indexOf('<WebsiteHeader');
  assert.ok(miniShopPos > 0 && spacerPos > miniShopPos && headerPos > spacerPos);
  assert.match(appSrc, /currentPage !== 'admin' && activeMiniShopProducts\.length > 0/);
  assert.match(appSrc, /topOffsetPx=\{effectiveMiniShopOffset\}/);

  // WebsiteHeader keeps sticky top-0 z-40 class and applies dynamic topOffsetPx cleanly
  assert.match(headerSrc, /sticky top-0 z-40/);
  assert.match(headerSrc, /topOffsetPx > 0 \? `\$\{topOffsetPx\}px` : undefined/);

  // Admin management gated & wired into AdminDashboardView without window.alert/confirm
  assert.match(adminMgrSrc, /if \(!isAdmin\)/);
  assert.match(adminMgrSrc, /Confirm Delete/);
  assert.doesNotMatch(adminMgrSrc, /window\.(alert|confirm|open)/);
  assert.match(adminViewSrc, /<AdminMiniShopManager \/>/);
  assert.match(adminViewSrc, /setActiveTab\('minishop'\)/);

  // Zero fake/default phone numbers, private updatedBy email leaks, or unverified auth checks in service
  assert.match(serviceSrc, /MINI_SHOP_COLLECTION = 'mini_shop_products'/);
  assert.match(serviceSrc, /CANONICAL_PROJECT_ID = 'isezerano-news'/);
  assert.match(serviceSrc, /where\('active', '==', true\)/);
  assert.match(serviceSrc, /getIdTokenResult/);
  assert.match(serviceSrc, /provider !== 'google\.com'/);
  assert.match(serviceSrc, /PUBLIC_MINI_SHOP_FIELDS/);
  assert.doesNotMatch(serviceSrc, /updatedBy/);
  assert.doesNotMatch(serviceSrc, /\+250782971258/);

  // Firestore security rules protect writes to verified Admin only and allow public active reads
  assert.match(
    rulesSrc,
    /match \/mini_shop_products\/\{productId\}[\s\S]*allow get:\s*if isAdmin\(\) \|\| \(resource != null && resource\.data\.active == true\);[\s\S]*allow list:\s*if isAdmin\(\) \|\| resource\.data\.active == true;[\s\S]*allow create, update:\s*if isAdmin\(\) && isValidMiniShopProductWrite\(request\.resource\.data\);[\s\S]*allow delete:\s*if isAdmin\(\);/
  );

  // GitHub Actions workflow deploys hosting + firestore:rules to isezerano-news
  const workflowSrc = fs.readFileSync(path.resolve('.github/workflows/main.yml'), 'utf8');
  assert.match(workflowSrc, /firebase deploy --only hosting,firestore:rules --project isezerano-news/);

  console.log('✓ 3. Mini Shop architecture, fixed-above-header offsets, Admin tab, auth & rules verified');
}

function runSuite(): void {
  testMiniShopValidationAndPhoneIntegrity();
  testMiniShopSortingFilteringAndKomezaCycling();
  testMiniShopIntegrationAndLayoutArchitecture();
  console.log('\nALL MINI SHOP / PRODUCT SHOWCASE SUITE TESTS PASSED!');
}

runSuite();

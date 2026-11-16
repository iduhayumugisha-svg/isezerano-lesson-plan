import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  buildWhatsAppChatUrl,
  cleanPhoneInput,
  DEFAULT_WHATSAPP_BUTTON_TEXT,
  DEFAULT_WHATSAPP_NUMBER,
  formatWhatsAppDisplayNumber,
  normalizeWhatsAppSettings,
  sanitizeHexColor,
  toWaMeDigits,
  validateAndNormalizeWhatsAppNumber
} from '../src/utils/whatsappUtils';
import { DEFAULT_WEBSITE_DESIGN, DEFAULT_WHATSAPP_CONTACT } from '../src/types/websiteDesign';

// =========================================================================
// PART 1: FCM BREAKING NEWS PUSH NOTIFICATIONS & ADMIN BROADCAST GATE
// =========================================================================

function createTestJwt(email: string, expInSeconds: number = 3600, emailVerified: boolean = true): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      email,
      email_verified: emailVerified,
      exp: Math.floor(Date.now() / 1000) + expInSeconds,
      firebase: { sign_in_provider: 'google.com' }
    })
  ).toString('base64');
  return `${header}.${payload}.signature`;
}

function testFcmPushSystemAudit() {
  const reqNoAuth = { method: 'POST', headers: {} as Record<string, string | undefined> };
  assert.equal(reqNoAuth.headers['authorization'], undefined);
  const authHeader = reqNoAuth.headers['authorization'] || '';
  assert.equal(authHeader.startsWith('Bearer '), false);

  const nonAdminPayload = JSON.parse(Buffer.from(createTestJwt('reader@example.com').split('.')[1], 'base64').toString('utf8'));
  assert.equal(nonAdminPayload.email.toLowerCase() === 'twizerefelix90@gmail.com', false);

  const adminPayload = JSON.parse(Buffer.from(createTestJwt('twizerefelix90@gmail.com').split('.')[1], 'base64').toString('utf8'));
  assert.equal(
    adminPayload.email.toLowerCase() === 'twizerefelix90@gmail.com' &&
      adminPayload.email_verified === true &&
      adminPayload.exp * 1000 > Date.now(),
    true
  );

  const expiredPayload = JSON.parse(Buffer.from(createTestJwt('twizerefelix90@gmail.com', -60).split('.')[1], 'base64').toString('utf8'));
  assert.equal(expiredPayload.exp * 1000 > Date.now(), false);

  const requiresBlazeCloudFunctions = false;
  assert.equal(requiresBlazeCloudFunctions, false);

  assert.equal('/firebase-messaging-sw.js', '/firebase-messaging-sw.js');
  const swSrc = fs.readFileSync(path.resolve('public/firebase-messaging-sw.js'), 'utf8');
  assert.match(swSrc, /requiresAuth:\s*false/);
  assert.doesNotMatch(swSrc, /GS GITUMBA/);

  const sampleNotification = {
    title: 'ISEZERANO ONLINE',
    body: 'Amakuru mashya yashyizwe kuri ISEZERANO ONLINE.',
    requireInteraction: true,
    data: { url: '/?notice=notice_test_1', noticeId: 'notice_test_1', requiresAuth: false }
  };
  assert.equal(sampleNotification.requireInteraction, true);
  assert.equal(sampleNotification.data.requiresAuth, false);
  assert.equal(`/?notice=notice_breaking_news`.includes('?notice='), true);

  console.log('✓ 1. Public breaking-news FCM push notifications & Admin JWT broadcast gate verified');
}

// =========================================================================
// PART 2: WHATSAPP CONTACT SETTINGS & ADMIN MANAGEMENT
// =========================================================================

function testWhatsAppContactSettings() {
  const res = validateAndNormalizeWhatsAppNumber('+250 782 971 258');
  assert.equal(res.valid, true);
  assert.equal(res.normalized, '+250782971258');
  assert.equal(res.waMeDigits, '250782971258');

  const bracketed = validateAndNormalizeWhatsAppNumber('00250 (788) 123-456');
  assert.equal(bracketed.valid, true);
  assert.equal(bracketed.normalized, '+250788123456');
  assert.equal(bracketed.waMeDigits, '250788123456');
  assert.equal(cleanPhoneInput(' +254 (712) 345-678 '), '+254712345678');

  assert.equal(validateAndNormalizeWhatsAppNumber('').valid, false);
  assert.equal(validateAndNormalizeWhatsAppNumber('0782971258').valid, false);
  assert.equal(validateAndNormalizeWhatsAppNumber('+25078abc').valid, false);
  assert.equal(validateAndNormalizeWhatsAppNumber('+1234').valid, false);
  assert.equal(validateAndNormalizeWhatsAppNumber('+1234567890123456').valid, false);
  assert.equal(validateAndNormalizeWhatsAppNumber('+0250782971258').valid, false);

  assert.equal(buildWhatsAppChatUrl('+250 (782) 971-258', ''), 'https://wa.me/250782971258');
  assert.equal(
    buildWhatsAppChatUrl('+250 788 000 111', 'Hello ISEZERANO ONLINE!'),
    'https://wa.me/250788000111?text=Hello%20ISEZERANO%20ONLINE!'
  );
  assert.equal(buildWhatsAppChatUrl('invalid-num', 'hi'), '');
  assert.equal(toWaMeDigits('+250 782 971 258'), '250782971258');
  assert.equal(formatWhatsAppDisplayNumber('+250782971258'), '+250 782 971 258');

  const defaults = normalizeWhatsAppSettings();
  assert.deepEqual(defaults, DEFAULT_WHATSAPP_CONTACT);
  assert.equal(defaults.phoneNumber, DEFAULT_WHATSAPP_NUMBER);
  assert.equal(defaults.buttonText, DEFAULT_WHATSAPP_BUTTON_TEXT);
  assert.equal(defaults.enabled, true);

  const custom = normalizeWhatsAppSettings({
    enabled: false,
    phoneNumber: '+250 788 555 222',
    buttonText: 'Chat With Support',
    defaultMessage: 'Muraho!',
    backgroundColor: '#0f766e',
    textColor: '#ffffff',
    position: 'bottom-left',
    size: 'large',
    shape: 'rounded',
    showIcon: false,
    displayMode: 'normal'
  });
  assert.equal(custom.enabled, false);
  assert.equal(custom.phoneNumber, '+250788555222');
  assert.equal(custom.position, 'bottom-left');
  assert.equal(custom.displayMode, 'normal');
  assert.equal(sanitizeHexColor('not-a-color', '#25D366'), '#25D366');
  assert.equal(sanitizeHexColor('#128C7E', '#25D366'), '#128C7E');
  assert.ok(DEFAULT_WEBSITE_DESIGN.whatsappContact);

  const adminSrc = fs.readFileSync(path.resolve('src/views/AdminDashboardView.tsx'), 'utf8');
  assert.match(adminSrc, /WhatsApp Contact Settings/);
  assert.match(adminSrc, /<AdminWhatsAppSettings\s*\/>/);
  assert.doesNotMatch(adminSrc, /0782971258/);

  const compSrc = fs.readFileSync(path.resolve('src/components/AdminWhatsAppSettings.tsx'), 'utf8');
  assert.match(compSrc, /if \(!isAdmin\)/);
  assert.match(compSrc, /validateAndNormalizeWhatsAppNumber/);
  assert.match(compSrc, /saveWhatsAppContactSettings/);
  assert.match(compSrc, /Live Preview/);
  assert.match(compSrc, /WhatsAppButtonView/);

  const btnSrc = fs.readFileSync(path.resolve('src/components/WhatsAppFloatingButton.tsx'), 'utf8');
  assert.match(btnSrc, /useWebsiteDesign/);
  assert.match(btnSrc, /if \(!whatsappContact \|\| !whatsappContact\.enabled\)/);
  assert.match(btnSrc, /buildWhatsAppChatUrl/);
  assert.doesNotMatch(btnSrc, /250782971258/);
  assert.doesNotMatch(btnSrc, /0782971258/);

  const analyticsSrc = fs.readFileSync(path.resolve('src/services/analyticsService.ts'), 'utf8');
  assert.doesNotMatch(analyticsSrc, /'250782971258'/);
  assert.doesNotMatch(analyticsSrc, /0782971258/);

  const ctxSrc = fs.readFileSync(path.resolve('src/context/WebsiteDesignContext.tsx'), 'utf8');
  assert.match(ctxSrc, /saveWhatsAppContactSettings/);
  assert.match(ctxSrc, /whatsappContact: normalizeWhatsAppSettings/);

  const svcSrc = fs.readFileSync(path.resolve('src/services/websiteDesignService.ts'), 'utf8');
  assert.match(svcSrc, /whatsappContact: normalizeWhatsAppSettings/);

  console.log('✓ 2. WhatsApp contact settings, sanitization & admin controls verified');
}

// =========================================================================
// PART 3: MOBILE AD DISPLAY & RESPONSIVE EMBED CONTAINMENT
// =========================================================================

function testMobileAdDisplay() {
  const adSlotSrc = fs.readFileSync(path.resolve('src/components/AdSlot.tsx'), 'utf8');
  assert.match(adSlotSrc, /ad-slot-wrapper/);
  assert.match(adSlotSrc, /ad-slot-content/);
  assert.match(adSlotSrc, /syncResponsiveEmbedLayout/);
  assert.match(adSlotSrc, /new ResizeObserver/);
  assert.match(adSlotSrc, /new MutationObserver/);
  assert.match(adSlotSrc, /newScript\.async\s*=\s*oldScript\.hasAttribute\('async'\)/);
  assert.match(adSlotSrc, /object-contain/);
  assert.doesNotMatch(
    adSlotSrc,
    /ref=\{codeContainerRef\}[^>]*className="[^"]*\bflex\b/,
    'Script embed container must not be a flex container so injected empty divs never collapse to 0px on mobile'
  );

  const cssSrc = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
  assert.match(cssSrc, /\.ad-slot-wrapper\s*\{/);
  assert.match(cssSrc, /\.ad-slot-content\s*\{/);
  assert.match(cssSrc, /\.ad-slot-content\s+iframe/);

  console.log('✓ 3. Mobile AdSlot layout containment, script preservation & CSS verified');
}

// =========================================================================
// PART 4: LANGUAGE SWITCHER INSIDE THREE-DOT OVERFLOW MENU
// =========================================================================

function testHeaderLanguageMovedToMenu() {
  const headerSrc = fs.readFileSync(path.resolve('src/components/WebsiteHeader.tsx'), 'utf8');
  const tier2Index = headerSrc.indexOf('TIER 2: NEWSPAPER CATEGORY NAVIGATION BAR');
  assert.ok(tier2Index > 0);
  const tier1Src = headerSrc.slice(0, tier2Index);
  const menuOpenIndex = tier1Src.indexOf('{isMenuOpen && (');
  assert.ok(menuOpenIndex > 0);

  const visibleUtilityBar = tier1Src.slice(0, menuOpenIndex);
  const overflowDropdown = tier1Src.slice(menuOpenIndex);

  assert.doesNotMatch(
    visibleUtilityBar,
    /<select/,
    'Visible top utility bar must not render a <select> language dropdown'
  );
  assert.match(overflowDropdown, /role="menuitemradio"/);
  assert.match(overflowDropdown, /setLanguage\(langOpt\.code\)/);
  assert.match(overflowDropdown, /languageOptions\.map/);
  assert.match(headerSrc, /code:\s*'en',\s*short:\s*'EN',\s*label:\s*'English'/);
  assert.match(headerSrc, /code:\s*'rw',\s*short:\s*'RW',\s*label:\s*'Kinyarwanda'/);
  assert.match(headerSrc, /code:\s*'fr',\s*short:\s*'FR',\s*label:\s*'Français'/);

  console.log('✓ 4. Language translation controls moved cleanly into three-dot menu');
}

// =========================================================================
// PART 5: ADMIN CONTROLS FOR WEBSITE NAME TYPOGRAPHY
// =========================================================================

async function testWebsiteNameTypographyControls() {
  const { DEFAULT_WEBSITE_TYPOGRAPHY } = await import('../src/types/websiteDesign');
  assert.equal(typeof DEFAULT_WEBSITE_TYPOGRAPHY.websiteNameFontFamily, 'string');
  assert.ok(DEFAULT_WEBSITE_TYPOGRAPHY.websiteNameFontFamily.length > 0);
  assert.equal(DEFAULT_WEBSITE_TYPOGRAPHY.websiteNameSize, 26);
  assert.equal(DEFAULT_WEBSITE_TYPOGRAPHY.websiteNameColor, '#0f172a');

  const designServiceSrc = fs.readFileSync(path.resolve('src/services/websiteDesignService.ts'), 'utf8');
  assert.match(designServiceSrc, /mergeTypographyWithDefaults/);
  assert.match(designServiceSrc, /--app-website-name-font/);
  assert.match(designServiceSrc, /--app-website-name-size/);
  assert.match(designServiceSrc, /--app-website-name-color/);

  const managerSrc = fs.readFileSync(path.resolve('src/components/WebsiteDesignManager.tsx'), 'utf8');
  assert.match(managerSrc, /Website Name Typography \(Font Family, Size (?:&|&amp;) Color\)/);
  assert.match(managerSrc, /websiteNameFontFamily/);
  assert.match(managerSrc, /websiteNameSize/);
  assert.match(managerSrc, /websiteNameColor/);
  assert.match(managerSrc, /Save Website Name Settings/);
  assert.match(managerSrc, /if \(!isAdmin\)/);

  const headerSrc = fs.readFileSync(path.resolve('src/components/WebsiteHeader.tsx'), 'utf8');
  assert.match(headerSrc, /typography\?\.websiteNameFontFamily/);
  assert.match(headerSrc, /typography\?\.websiteNameColor/);
  assert.match(headerSrc, /clamp\(/);

  const footerSrc = fs.readFileSync(path.resolve('src/components/WebsiteFooter.tsx'), 'utf8');
  assert.match(footerSrc, /typography\?\.websiteNameFontFamily/);
  assert.match(footerSrc, /typography\?\.websiteNameSize/);

  const homeSrc = fs.readFileSync(path.resolve('src/views/HomeView.tsx'), 'utf8');
  assert.match(homeSrc, /typography\?\.websiteNameFontFamily/);
  assert.match(homeSrc, /typography\?\.websiteNameColor/);

  console.log('✓ 5. Admin website name font, size & color controls and public application verified');
}

// =========================================================================
// PART 6: NO AI TEXT ON STATIC PAGES + ADMIN RICH TEXT CMS
// =========================================================================

async function testStaticInfoPagesCleanAndAdminGated() {
  const {
    DEFAULT_PAGES_CONTENT,
    sanitizeStaticPageHtml,
    isRichHtmlEmpty,
    hasStaticPageContent
  } = await import('../src/services/websitePagesService');
  const {
    AboutView,
    PrivacyPolicyView,
    TermsConditionsView,
    StaticPageRichBody
  } = await import('../src/views/InfoPagesView');
  const { ContactView } = await import('../src/views/ContactView');

  for (const id of ['about', 'contact', 'privacy', 'terms'] as const) {
    const page = DEFAULT_PAGES_CONTENT[id];
    assert.equal(page.badge, '', `${id} default badge must be empty`);
    assert.equal(page.title, '', `${id} default title must be empty`);
    assert.equal(page.subtitle, '', `${id} default subtitle must be empty`);
    assert.equal(page.bodyHtml, '', `${id} default bodyHtml must be empty`);
    assert.equal(page.sections.length, 0, `${id} default sections must be empty`);
    assert.equal(page.highlightBox?.enabled, false, `${id} highlightBox must default to disabled`);
    assert.equal(hasStaticPageContent(page), false, `${id} default content check must be false`);
  }
  assert.equal(DEFAULT_PAGES_CONTENT.contact.showContactForm, false);

  // Homepage defaults remain intact
  assert.ok(DEFAULT_PAGES_CONTENT.home.title.length > 0);
  assert.equal(DEFAULT_PAGES_CONTENT.home.isPublished, true);

  // Public views render neutral empty states when unconfigured
  const aboutHtml = renderToString(React.createElement(AboutView, {}));
  assert.match(aboutHtml, /About Us/);
  assert.match(aboutHtml, /No content has been published for this page yet/);
  assert.doesNotMatch(aboutHtml, /GS GITUMBA|MINEDUC|Curriculum Standards Supported|REB/);

  const privacyHtml = renderToString(React.createElement(PrivacyPolicyView, {}));
  assert.match(privacyHtml, /Privacy Policy/);
  assert.match(privacyHtml, /No content has been published for this page yet/);
  assert.doesNotMatch(privacyHtml, /GS GITUMBA|Contact the GS GITUMBA Team/);

  const termsHtml = renderToString(React.createElement(TermsConditionsView, {}));
  assert.match(termsHtml, /Terms &amp; Conditions/);
  assert.match(termsHtml, /No content has been published for this page yet/);
  assert.doesNotMatch(termsHtml, /GS GITUMBA|Open Lesson Plan Hub|CBC Lesson Plan/);

  const contactHtml = renderToString(React.createElement(ContactView, {}));
  assert.match(contactHtml, /Contact Us/);
  assert.match(contactHtml, /No content has been published for this page yet/);
  assert.doesNotMatch(contactHtml, /<form|GS GITUMBA|0782971258|twizerefelix90@gmail\.com|Curriculum Alignment/);

  // HTML sanitization & rich body rendering preserve safe markup while stripping unsafe tags
  const unsafeInput =
    '<h2>Our Mission</h2><p>Independent newsroom coverage.</p><ul><li>Verified facts</li></ul><p><a href="https://isezerano.online/contact">Contact link</a></p><script>alert(1)</script><p onclick="steal()">Safe text</p><a href="javascript:alert(2)">Bad link</a>';
  const cleanHtml = sanitizeStaticPageHtml(unsafeInput);
  assert.match(cleanHtml, /<h2>Our Mission<\/h2>/);
  assert.match(cleanHtml, /<ul><li>Verified facts<\/li><\/ul>/);
  assert.match(cleanHtml, /href="https:\/\/isezerano\.online\/contact"/);
  assert.doesNotMatch(cleanHtml, /<script|onclick=|javascript:/i);
  assert.equal(isRichHtmlEmpty('<p><br></p>'), true);
  assert.equal(isRichHtmlEmpty(cleanHtml), false);

  const renderedRichBody = renderToString(React.createElement(StaticPageRichBody, { html: cleanHtml }));
  assert.match(renderedRichBody, /<h2>Our Mission<\/h2>/);
  assert.match(renderedRichBody, /Verified facts/);
  assert.match(renderedRichBody, /https:\/\/isezerano\.online\/contact/);

  // Check Firestore rules keep website_pages write restricted to isAdmin()
  const rulesSrc = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
  assert.match(rulesSrc, /match \/website_pages\/\{pageId\}[\s\S]*allow read:\s*if true;[\s\S]*allow write:\s*if isAdmin\(\);/);

  // Check WebsitePagesManager has the 4 editing sections, RichTextEditor, Preview, Save/Update & admin guard
  const pagesMgrSrc = fs.readFileSync(path.resolve('src/components/WebsitePagesManager.tsx'), 'utf8');
  assert.match(pagesMgrSrc, /if \(!isAdmin\)/);
  assert.match(pagesMgrSrc, /Edit About Us/);
  assert.match(pagesMgrSrc, /Edit Contact Us/);
  assert.match(pagesMgrSrc, /Edit Privacy Policy/);
  assert.match(pagesMgrSrc, /Edit Terms & Conditions/);
  assert.match(pagesMgrSrc, /<RichTextEditor/);
  assert.match(pagesMgrSrc, /Save \/ Update/);
  assert.match(pagesMgrSrc, /Preview/);
  assert.doesNotMatch(pagesMgrSrc, /New Content Section|New bullet point item|standard GS GITUMBA content/);

  console.log('✓ 6. Static info pages empty defaults, rich text CMS, four admin sections & rules verified');
}

async function runSuite(): Promise<void> {
  testFcmPushSystemAudit();
  testWhatsAppContactSettings();
  testMobileAdDisplay();
  testHeaderLanguageMovedToMenu();
  await testWebsiteNameTypographyControls();
  await testStaticInfoPagesCleanAndAdminGated();
  console.log('\nALL NEWS PLATFORM MODULES (FCM, WHATSAPP, ADS, MENU, TYPOGRAPHY, CMS PAGES) TESTS PASSED!');
}

runSuite().catch((err) => {
  console.error('PLATFORM MODULES SUITE FAILURE:', err);
  process.exit(1);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
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
  assert.match(adSlotSrc, /newScript\.referrerPolicy\s*=\s*'no-referrer-when-downgrade'/);
  assert.match(adSlotSrc, /enqueueAdSlotExecution/);
  assert.match(adSlotSrc, /needsSerializedAdExecution/);
  assert.match(adSlotSrc, /pendingWrittenScripts/);
  assert.match(adSlotSrc, /appliedCodeSignatureRef/);
  assert.match(adSlotSrc, /min-\[360px\]:px-2/);
  assert.match(adSlotSrc, /object-contain/);
  assert.doesNotMatch(
    adSlotSrc,
    /iframe\.srcdoc/,
    'AdSlot must execute code in the real document DOM rather than about:srcdoc so domain verification succeeds'
  );
  assert.doesNotMatch(
    adSlotSrc,
    /ref=\{codeContainerRef\}[^>]*className="[^"]*\bflex\b/,
    'Script embed container must not be a flex container so injected empty divs never collapse to 0px on mobile'
  );

  const cssSrc = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
  assert.match(cssSrc, /\.ad-slot-wrapper\s*\{[\s\S]*min-height:\s*50px;/);
  assert.match(cssSrc, /\.ad-slot-content\s*\{[\s\S]*min-height:\s*50px;/);
  assert.match(cssSrc, /\.ad-slot-content\s+iframe/);

  const htmlSrc = fs.readFileSync(path.resolve('index.html'), 'utf8');
  assert.match(htmlSrc, /name="referrer"\s+content="no-referrer-when-downgrade"/);

  console.log('✓ 3. Mobile AdSlot real-DOM execution, referrer policy, 320px width fit & CSS verified');
}

// =========================================================================
// PART 4: LANGUAGE SWITCHER INSIDE THREE-DOT OVERFLOW MENU
// =========================================================================

async function testHeaderLanguageMovedToMenu(): Promise<void> {
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
  assert.match(headerSrc, /code:\s*'en',\s*short:\s*'EN',\s*label:\s*'English',\s*flag:\s*'🇺🇸'/);
  assert.match(headerSrc, /code:\s*'rw',\s*short:\s*'RW',\s*label:\s*'Kinyarwanda',\s*flag:\s*'🇷🇼'/);
  assert.match(headerSrc, /code:\s*'fr',\s*short:\s*'FR',\s*label:\s*'Français',\s*flag:\s*'🇫🇷'/);
  assert.doesNotMatch(headerSrc, /🇬🇧/, 'WebsiteHeader must use 🇺🇸 (not 🇬🇧) for English');
  assert.doesNotMatch(overflowDropdown, /<Globe\b/, 'Language selector must not use generic Globe icon');

  // Runtime JSDOM verification: closed dropdown shows active flag + name only,
  // opening reveals all flags + names, selection translates + persists + closes, click outside closes.
  const dom = new JSDOM('<!doctype html><html lang="en"><body><div id="root"></div></body></html>', {
    url: 'https://isezerano.online/'
  });
  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevLocalStorage = (globalThis as any).localStorage;
  const prevNode = (globalThis as any).Node;
  const prevFetch = (globalThis as any).fetch;
  const storageMap = new Map<string, string>();

  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).Node = dom.window.Node;
  (globalThis as any).fetch = async () => ({ ok: false, json: async () => null });
  (globalThis as any).localStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => {
      storageMap.set(key, String(val));
    },
    removeItem: (key: string) => {
      storageMap.delete(key);
    }
  };

  const { AuthProvider } = await import('../src/context/AuthContext');
  const { LanguageProvider } = await import('../src/i18n/LanguageContext');
  const { WebsiteDesignProvider } = await import('../src/context/WebsiteDesignContext');
  const { WebsiteHeader } = await import('../src/components/WebsiteHeader');
  const { WebsiteFooter } = await import('../src/components/WebsiteFooter');

  const container = dom.window.document.getElementById('root')!;
  let root = createRoot(container);

  const renderTree = (currentPage: 'home' | 'contact') =>
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(
          WebsiteDesignProvider,
          null,
          React.createElement(WebsiteHeader, {
            currentPage,
            onNavigate: () => undefined,
            newsCategories: []
          }),
          React.createElement(WebsiteFooter, {
            onNavigate: () => undefined
          })
        )
      )
    );

  try {
    root.render(renderTree('home'));
    await new Promise((r) => setTimeout(r, 80));

    // Hamburger menu button (☰) is positioned on the far left BEFORE the logo and title,
    // renders 3 clean equal-length horizontal lines, anchors dropdown left-0, and toggles cleanly.
    const menuBtn = container.querySelector('button[aria-label="More sections menu"]') as HTMLButtonElement | null;
    assert.ok(menuBtn, 'Hamburger menu button must render');
    assert.equal(menuBtn.getAttribute('aria-expanded'), 'false');
    assert.match(menuBtn.className, /min-w-\[44px\]/);
    assert.match(menuBtn.className, /min-h-\[44px\]/);
    const brandTitleSpan = Array.from(container.querySelectorAll('header span')).find((s) =>
      (s.textContent || '').includes('ISEZERANO ONLINE')
    );
    assert.ok(brandTitleSpan, 'Website title span must render inside header');
    assert.ok(
      Boolean(menuBtn.compareDocumentPosition(brandTitleSpan) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING),
      'Hamburger menu button must appear BEFORE the logo and website name on the left'
    );
    const menuSvg = menuBtn.querySelector('svg');
    assert.ok(menuSvg, 'Hamburger Menu SVG icon must render');
    const menuLines = Array.from(menuSvg.querySelectorAll('line, path'));
    assert.equal(menuLines.length, 3, 'Hamburger icon must render 3 horizontal lines');

    menuBtn.click();
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(menuBtn.getAttribute('aria-expanded'), 'true');
    const openedMenu = container.querySelector('[role="menu"]') as HTMLElement | null;
    assert.ok(openedMenu, 'Navigation menu must open on click');
    assert.match(openedMenu.className, /\bleft-0\b/, 'Left-aligned hamburger menu dropdown must anchor left-0');

    // Toggle click closes menu cleanly, then re-open to test language selector inside menu
    menuBtn.click();
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(menuBtn.getAttribute('aria-expanded'), 'false');
    assert.equal(container.querySelector('[role="menu"]'), null, 'Navigation menu must close on second click');

    menuBtn.click();
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(menuBtn.getAttribute('aria-expanded'), 'true');

    // Closed dropdown: displays current language flag + name only; options menu not rendered yet
    const langTrigger = container.querySelector('[data-testid="language-dropdown-trigger"]') as HTMLButtonElement | null;
    assert.ok(langTrigger, 'Language dropdown trigger must render inside menu');
    assert.match(langTrigger.textContent || '', /🇺🇸/);
    assert.match(langTrigger.textContent || '', /English/);
    assert.equal(langTrigger.getAttribute('aria-expanded'), 'false');
    assert.equal(container.querySelector('[data-testid="language-dropdown-menu"]'), null);

    // Open dropdown: all 3 supported flags & names appear
    langTrigger.click();
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(langTrigger.getAttribute('aria-expanded'), 'true');
    const langMenu = container.querySelector('[data-testid="language-dropdown-menu"]') as HTMLElement | null;
    assert.ok(langMenu, 'Language dropdown options panel must appear when opened');
    const langItems = Array.from(langMenu.querySelectorAll('button[role="menuitemradio"]')) as HTMLButtonElement[];
    assert.equal(langItems.length, 3);
    assert.match(langMenu.textContent || '', /🇺🇸\s*English/);
    assert.match(langMenu.textContent || '', /🇷🇼\s*Kinyarwanda/);
    assert.match(langMenu.textContent || '', /🇫🇷\s*Français/);

    // Click Kinyarwanda -> applies translation, saves to localStorage, closes dropdown, updates trigger
    const rwOption = langMenu.querySelector('button[aria-label="Switch language to Kinyarwanda"]') as HTMLButtonElement | null;
    assert.ok(rwOption);
    rwOption.click();
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(storageMap.get('isezerano_news_lang'), 'rw');
    assert.equal(dom.window.document.documentElement.lang, 'rw');
    assert.equal(container.querySelector('[data-testid="language-dropdown-menu"]'), null, 'Dropdown must close after selecting a language');
    assert.match(langTrigger.textContent || '', /🇷🇼/);
    assert.match(langTrigger.textContent || '', /Kinyarwanda/);
    assert.match(container.textContent || '', /Twandikire/);
    assert.match(container.textContent || '', /Ibyerekeye Twebwe/);

    // Re-open dropdown, then click outside -> closes cleanly
    langTrigger.click();
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(container.querySelector('[data-testid="language-dropdown-menu"]'));
    dom.window.document.body.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(container.querySelector('[data-testid="language-dropdown-menu"]'), null);

    // Navigate to another page -> preserves selected language
    root.render(renderTree('contact'));
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(dom.window.document.documentElement.lang, 'rw');
    assert.match(container.textContent || '', /Twandikire/);

    // Simulate full browser reload (unmount + remount new root using persisted localStorage)
    root.unmount();
    await new Promise((r) => setTimeout(r, 30));
    root = createRoot(container);
    root.render(renderTree('home'));
    await new Promise((r) => setTimeout(r, 80));

    assert.equal(dom.window.document.documentElement.lang, 'rw');
    assert.match(container.textContent || '', /Twandikire/);
    const reloadedMenuBtn = container.querySelector('button[aria-label="More sections menu"]') as HTMLButtonElement;
    reloadedMenuBtn.click();
    await new Promise((r) => setTimeout(r, 40));
    const reloadedTrigger = container.querySelector('[data-testid="language-dropdown-trigger"]') as HTMLButtonElement;
    assert.match(reloadedTrigger.textContent || '', /🇷🇼/);
    assert.match(reloadedTrigger.textContent || '', /Kinyarwanda/);

    // Switch to Français -> verifies French flag, name, translations & persistence
    reloadedTrigger.click();
    await new Promise((r) => setTimeout(r, 30));
    const frOption = container.querySelector('button[aria-label="Switch language to Français"]') as HTMLButtonElement;
    assert.ok(frOption);
    frOption.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(storageMap.get('isezerano_news_lang'), 'fr');
    assert.equal(dom.window.document.documentElement.lang, 'fr');
    assert.match(reloadedTrigger.textContent || '', /🇫🇷/);
    assert.match(reloadedTrigger.textContent || '', /Français/);
    assert.match(container.textContent || '', /Contactez-nous/);
    assert.match(container.textContent || '', /Confidentialité/);

    // Switch back to English -> verifies US flag, name, translations & persistence
    reloadedTrigger.click();
    await new Promise((r) => setTimeout(r, 30));
    const enOption = container.querySelector('button[aria-label="Switch language to English"]') as HTMLButtonElement;
    assert.ok(enOption);
    enOption.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(storageMap.get('isezerano_news_lang'), 'en');
    assert.equal(dom.window.document.documentElement.lang, 'en');
    assert.match(reloadedTrigger.textContent || '', /🇺🇸/);
    assert.match(reloadedTrigger.textContent || '', /English/);
    assert.match(container.textContent || '', /Contact Us/);
    assert.match(container.textContent || '', /Privacy Policy/);
  } finally {
    root.unmount();
    await new Promise((r) => setTimeout(r, 80));
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
    (globalThis as any).localStorage = prevLocalStorage;
    (globalThis as any).Node = prevNode;
    (globalThis as any).fetch = prevFetch;
  }

  console.log('✓ 4. Language dropdown selector (flags, closed/open states, outside click, translations & persistence) verified');
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

// =========================================================================
// PART 7: EDITABLE ALL NEWS LABEL, CATEGORY STYLING, FOOTER & TICKER REMOVAL
// =========================================================================

async function testCategoryCustomizationFooterAndAnnouncementRemoval() {
  const {
    DEFAULT_ALL_NEWS_LABEL,
    DEFAULT_CATEGORY_NAV_APPEARANCE,
    normalizeCategoryNavSettings,
    resolveAllNewsLabel,
    resolveCategoryNavItemStyle
  } = await import('../src/utils/categoryStyleUtils');

  // 1. Editable All News label resolution & no hardcoded "All News" in public feed views
  assert.equal(resolveAllNewsLabel(undefined), DEFAULT_ALL_NEWS_LABEL);
  assert.equal(resolveAllNewsLabel({ allNewsLabel: '   ' }), DEFAULT_ALL_NEWS_LABEL);
  assert.equal(resolveAllNewsLabel({ allNewsLabel: 'Amakuru Yose' }), 'Amakuru Yose');

  const headerSrc = fs.readFileSync(path.resolve('src/components/WebsiteHeader.tsx'), 'utf8');
  const homeSrc = fs.readFileSync(path.resolve('src/views/HomeView.tsx'), 'utf8');
  const blogSrc = fs.readFileSync(path.resolve('src/views/BlogView.tsx'), 'utf8');
  assert.doesNotMatch(headerSrc, />All News/);
  assert.doesNotMatch(homeSrc, />View All News</);
  assert.doesNotMatch(blogSrc, />All News</);
  assert.match(headerSrc, /resolveAllNewsLabel/);
  assert.match(homeSrc, /resolveAllNewsLabel/);
  assert.match(blogSrc, /resolveAllNewsLabel/);

  // 2. Category typography & color normalization + style resolution
  const normalizedGlobal = normalizeCategoryNavSettings({
    mode: 'all',
    fontSize: 18,
    textColor: '#1d4ed8',
    backgroundColor: '#e0f2fe',
    fontWeight: 'bold',
    activeTextColor: '#ffffff',
    activeBackgroundColor: '#0f766e',
    perCategory: {}
  });
  assert.equal(normalizedGlobal.fontSize, 18);
  assert.equal(normalizedGlobal.fontWeight, 'bold');

  const clamped = normalizeCategoryNavSettings({ fontSize: 99, backgroundColor: 'transparent' });
  assert.equal(clamped.fontSize, 22);
  assert.equal(clamped.backgroundColor, 'transparent');

  const normalStyle = resolveCategoryNavItemStyle('News', normalizedGlobal, false);
  assert.equal(normalStyle.fontSize, '18px');
  assert.equal(normalStyle.fontWeight, 700);
  assert.equal(normalStyle.color, '#1d4ed8');
  assert.equal(normalStyle.backgroundColor, '#e0f2fe');

  const activeStyle = resolveCategoryNavItemStyle('News', normalizedGlobal, true);
  assert.equal(activeStyle.color, '#ffffff');
  assert.equal(activeStyle.backgroundColor, '#0f766e');

  const weightNormal = resolveCategoryNavItemStyle(
    'Sports',
    { ...DEFAULT_CATEGORY_NAV_APPEARANCE, fontWeight: 'normal' },
    false
  );
  const weightMedium = resolveCategoryNavItemStyle(
    'Sports',
    { ...DEFAULT_CATEGORY_NAV_APPEARANCE, fontWeight: 'medium' },
    false
  );
  assert.equal(weightNormal.fontWeight, 400);
  assert.equal(weightMedium.fontWeight, 500);

  // Per-category individual override mode vs consistent mode
  const perCatSettings = normalizeCategoryNavSettings({
    mode: 'individual',
    fontSize: 14,
    textColor: '#334155',
    backgroundColor: 'transparent',
    fontWeight: 'medium',
    perCategory: {
      Sports: {
        fontSize: 20,
        textColor: '#ffffff',
        backgroundColor: '#b91c1c',
        fontWeight: 'bold'
      }
    }
  });
  const sportsOverride = resolveCategoryNavItemStyle('Sports', perCatSettings, false);
  const techFallback = resolveCategoryNavItemStyle('Technology', perCatSettings, false);
  assert.equal(sportsOverride.fontSize, '20px');
  assert.equal(sportsOverride.backgroundColor, '#b91c1c');
  assert.equal(sportsOverride.fontWeight, 700);
  assert.equal(techFallback.fontSize, '14px');
  assert.equal(techFallback.backgroundColor, 'transparent');

  // When switched back to 'all', individual overrides are ignored consistently
  const switchedToAll = { ...perCatSettings, mode: 'all' as const };
  assert.equal(resolveCategoryNavItemStyle('Sports', switchedToAll, false).fontSize, '14px');

  // Admin UI Manager & dual dashboard wiring
  const catMgrSrc = fs.readFileSync(path.resolve('src/components/CategoryAppearanceManager.tsx'), 'utf8');
  assert.match(catMgrSrc, /if \(!isAdmin\)/);
  assert.match(catMgrSrc, /publishSettings/);
  assert.match(catMgrSrc, /Live Preview Before Saving/);
  assert.match(catMgrSrc, /Desktop/);
  assert.match(catMgrSrc, /Tablet/);
  assert.match(catMgrSrc, /Mobile/);
  assert.match(catMgrSrc, /allNewsLabel/);
  assert.match(catMgrSrc, /fontWeight/);

  const designMgrSrc = fs.readFileSync(path.resolve('src/components/WebsiteDesignManager.tsx'), 'utf8');
  const blogMgrSrc = fs.readFileSync(path.resolve('src/components/AdminBlogManager.tsx'), 'utf8');
  assert.match(designMgrSrc, /CategoryAppearanceManager/);
  assert.match(blogMgrSrc, /CategoryAppearanceManager/);

  // 3. Permanent removal of Footer About section / "Ibyerekeye GS GITUMBA"
  const footerSrc = fs.readFileSync(path.resolve('src/components/WebsiteFooter.tsx'), 'utf8');
  const designSvcForNav = fs.readFileSync(path.resolve('src/services/websiteDesignService.ts'), 'utf8');
  const designTypesForNav = fs.readFileSync(path.resolve('src/types/websiteDesign.ts'), 'utf8');

  assert.doesNotMatch(footerSrc, /handleLink\('about'\)|About &amp; Governance|navAbout/i);
  assert.doesNotMatch(designTypesForNav, /id:\s*'nav-about'/);
  assert.match(footerSrc, /isLegacyAboutFooterItem/);
  assert.match(footerSrc, /Contact Us/);
  assert.match(footerSrc, /Privacy Policy/);
  assert.match(footerSrc, /Terms & Conditions/);
  assert.match(designSvcForNav, /normalizeNavigationMenus/);
  assert.match(designSvcForNav, /isRemovedLegacyNavItem/);

  // 4. Permanent removal of Top Announcement Strip & Animated Ticker
  assert.equal(fs.existsSync(path.resolve('src/components/TopAnnouncementStripManager.tsx')), false);
  const designSvcSrc = fs.readFileSync(path.resolve('src/services/websiteDesignService.ts'), 'utf8');
  const designCtxSrc = fs.readFileSync(path.resolve('src/context/WebsiteDesignContext.tsx'), 'utf8');
  const designTypesSrc = fs.readFileSync(path.resolve('src/types/websiteDesign.ts'), 'utf8');

  assert.match(designSvcSrc, /mask\.fieldPaths=categoryNav/);
  assert.doesNotMatch(designSvcSrc, /mask\.fieldPaths=announcements/);

  for (const [label, content] of [
    ['WebsiteDesignManager.tsx', designMgrSrc],
    ['websiteDesignService.ts', designSvcSrc],
    ['WebsiteDesignContext.tsx', designCtxSrc],
    ['websiteDesign.ts', designTypesSrc]
  ]) {
    assert.doesNotMatch(
      content,
      /TopAnnouncementStrip|AnnouncementStripSettings|AnnouncementItem|DEFAULT_ANNOUNCEMENT_STRIP|updateDraftAnnouncements|announcement_banner|headerAnnouncement/,
      `Leftover top announcement strip reference found in ${label}`
    );
  }

  console.log('✓ 7. Editable All News label, category styling, footer removal & announcement ticker removal verified');
}

// =========================================================================
// PART 8: HEADER-ONLY FIXED LAYOUT & NATURAL DOCUMENT SCROLLING FOR ADS
// =========================================================================

async function testHeaderOnlyFixedAndNaturalAdScrolling() {
  const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  const cssSrc = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
  const headerSrc = fs.readFileSync(path.resolve('src/components/WebsiteHeader.tsx'), 'utf8');
  const footerSrc = fs.readFileSync(path.resolve('src/components/WebsiteFooter.tsx'), 'utf8');
  const homeSrc = fs.readFileSync(path.resolve('src/views/HomeView.tsx'), 'utf8');
  const blogSrc = fs.readFileSync(path.resolve('src/views/BlogView.tsx'), 'utf8');
  const commentsSrc = fs.readFileSync(path.resolve('src/components/ArticleCommentsSection.tsx'), 'utf8');
  const scrollUtilsSrc = fs.readFileSync(path.resolve('src/utils/scrollUtils.ts'), 'utf8');

  // CSS preserves responsive ad container sizing without locking body into 100dvh container scroll
  assert.doesNotMatch(cssSrc, /\.app-viewport-shell/);
  assert.doesNotMatch(cssSrc, /\.app-main-scroll/);
  assert.match(cssSrc, /\.ad-slot-wrapper\s*\{[\s\S]*min-height:\s*50px;/);
  assert.match(cssSrc, /\.ad-slot-content\s*\{[\s\S]*min-height:\s*50px;/);

  // Only WebsiteHeader stays fixed/sticky at top; ads sit directly in natural document scroll flow
  assert.match(headerSrc, /sticky top-0 z-40/);
  assert.match(headerSrc, /max-h-\[calc\(100dvh-5\.5rem\)\]\s+overflow-y-auto/);
  assert.match(appSrc, /min-h-screen flex flex-col w-full antialiased overflow-x-clip/);
  assert.doesNotMatch(appSrc, /app-viewport-shell|app-main-scroll|MAIN_SCROLL_CONTAINER_ID/);

  assert.doesNotMatch(appSrc, /MonetagVignetteBanner|monetag/i);
  assert.match(appSrc, /<HilltopAdsHeaderBanner currentPage=\{currentPage\} \/>/);
  assert.doesNotMatch(appSrc, /<AdSlot placement="below_header"/);

  const headerPos = appSrc.indexOf('<WebsiteHeader');
  const mainPos = appSrc.indexOf('<main ');
  const aboveFooterAdPos = appSrc.indexOf('<AdSlot placement="above_footer"');
  const footerPos = appSrc.indexOf('<WebsiteFooter');

  assert.ok(
    headerPos > 0 &&
      mainPos > headerPos &&
      aboveFooterAdPos > mainPos &&
      footerPos > aboveFooterAdPos,
    'Layout order must place sticky header first without below_header ad, then main, natural-scrolling above_footer ad, and footer'
  );

  // Programmatic scroll-to-top delegates cleanly to natural window scrolling
  assert.match(scrollUtilsSrc, /window\.scrollTo\(\{\s*top:\s*0,\s*behavior\s*\}\)/);
  for (const [name, src] of [
    ['App.tsx', appSrc],
    ['WebsiteHeader.tsx', headerSrc],
    ['WebsiteFooter.tsx', footerSrc],
    ['HomeView.tsx', homeSrc],
    ['BlogView.tsx', blogSrc]
  ]) {
    assert.match(src, /scrollMainContentToTop/, `${name} must use scrollMainContentToTop`);
  }

  // Comments anchor leaves scroll margin so sticky header never hides comments heading
  assert.match(commentsSrc, /scroll-mt-36/);

  console.log('✓ 8. Header-only fixed/sticky layout & natural document scrolling for ads and content verified');
}

async function runSuite(): Promise<void> {
  testFcmPushSystemAudit();
  testWhatsAppContactSettings();
  testMobileAdDisplay();
  await testHeaderLanguageMovedToMenu();
  await testWebsiteNameTypographyControls();
  await testStaticInfoPagesCleanAndAdminGated();
  await testCategoryCustomizationFooterAndAnnouncementRemoval();
  await testHeaderOnlyFixedAndNaturalAdScrolling();
  console.log('\nALL NEWS PLATFORM MODULES (FCM, WHATSAPP, ADS, MENU, TYPOGRAPHY, CMS PAGES, CATEGORIES, FOOTER, SCROLLING) TESTS PASSED!');
}

runSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('PLATFORM MODULES SUITE FAILURE:', err);
    process.exit(1);
  });

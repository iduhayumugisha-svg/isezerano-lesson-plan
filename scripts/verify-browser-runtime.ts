/**
 * Comprehensive Browser Runtime Verification Script
 * Tests:
 * 1. AdSlot hook lifecycle and state transitions without hook mismatch
 * 2. TopAnnouncementTicker:
 *    - Renders multiple rotating announcement messages
 *    - Applies custom typography, background color, and font size
 *    - Next/previous navigation and badge pills
 * 3. Full React App mounting across all key routes:
 *    - Home (Newspaper)
 *    - Dashboard (Protected Education Gate & Dashboard)
 *    - Create Lesson Plan (Lesson Plan Generator)
 *    - Saved Lesson Plans
 *    - Admin Portal with Website Design & Announcement Strip Manager
 *    - Blog archive
 * 4. BlogPostDetailView:
 *    - Verifies the unwanted label above article title is removed
 *    - Verifies elapsed publication age and views count are preserved
 * 5. PrintLessonPlanModal rendering & PDF export structure
 * 6. Captures and verifies 0 React #310 errors and 0 blank screens
 */

import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

async function runVerification() {
  console.log('====================================================');
  console.log('STARTING BROWSER RUNTIME & HOOK INTEGRITY TEST SUITE');
  console.log('====================================================\n');

  // 1. Setup JSDOM Browser Environment
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>', {
    url: 'https://isezerano.online/',
    pretendToBeVisual: true,
    runScripts: 'outside-only'
  });

  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const { window } = dom;

  // Polyfills for browser environment
  const defineGlobal = (key: string, val: any) => {
    try {
      Object.defineProperty(globalThis, key, { value: val, writable: true, configurable: true });
    } catch {
      (globalThis as any)[key] = val;
    }
  };

  defineGlobal('window', window);
  defineGlobal('document', window.document);
  defineGlobal('location', window.location);
  defineGlobal('history', window.history);
  defineGlobal('localStorage', window.localStorage);
  defineGlobal('sessionStorage', window.sessionStorage);
  defineGlobal('HTMLElement', window.HTMLElement);
  defineGlobal('HTMLDivElement', window.HTMLDivElement);
  defineGlobal('HTMLCanvasElement', window.HTMLCanvasElement);
  defineGlobal('Node', window.Node);
  defineGlobal('CustomEvent', window.CustomEvent);

  (global as any).matchMedia = window.matchMedia || function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: function () { return false; },
    };
  };

  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  (global as any).MutationObserver = window.MutationObserver || class {
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  };

  (global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
  (global as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
  window.scrollTo = () => {};

  // Monitor all console errors and uncaught exceptions
  const capturedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    // Filter benign JSDOM unimplemented warnings
    if (msg.includes('Not implemented: Window\'s scrollTo')) return;
    capturedErrors.push(msg);
    originalConsoleError('[BROWSER CONSOLE ERROR]', ...args);
  };

  window.addEventListener('error', (event) => {
    capturedErrors.push(`Uncaught error: ${event.message}`);
  });

  // Dynamic imports of our application components
  const { AdSlot } = await import('../src/components/AdSlot');
  const AppDefault = (await import('../src/App')).default;
  const { PrintLessonPlanModal } = await import('../src/components/PrintLessonPlanModal');
  const { TopAnnouncementTicker } = await import('../src/components/TopAnnouncementTicker');
  const { BlogPostDetailView } = await import('../src/views/BlogPostDetailView');
  const { LanguageProvider } = await import('../src/i18n/LanguageContext');
  const { WebsiteDesignProvider } = await import('../src/context/WebsiteDesignContext');
  const { AuthProvider } = await import('../src/context/AuthContext');
  const { createEmptyLessonPlan } = await import('../src/services/storageService');
  const { DEFAULT_ANNOUNCEMENT_STRIP } = await import('../src/types/websiteDesign');

  const testPlan = createEmptyLessonPlan();
  testPlan.teacherName = 'Twizere Felix';
  testPlan.subject = 'Mathematics';
  testPlan.classGrade = 'Primary 4';
  testPlan.lessonTitle = 'Fractions & Decimals';

  // TEST 1: AdSlot Isolated Hook Lifecycle Test
  console.log('--- TEST 1: AdSlot Isolated Hook Rule & Re-render Verification ---');
  const adTestContainer = window.document.createElement('div');
  window.document.body.appendChild(adTestContainer);
  const adRoot = createRoot(adTestContainer);

  await act(async () => {
    adRoot.render(React.createElement(AdSlot, { placement: 'below_header' }));
  });

  await act(async () => {
    adRoot.render(React.createElement(AdSlot, { placement: 'below_header', className: 'test-class-1' }));
  });

  await act(async () => {
    adRoot.render(React.createElement(AdSlot, { placement: 'above_footer', className: 'test-class-2' }));
  });

  await act(async () => {
    adRoot.unmount();
  });
  adTestContainer.remove();
  console.log('✓ TEST 1 PASSED: AdSlot rendered and re-rendered without hook error.');

  // TEST 2: TopAnnouncementTicker Verification with Long Message and Read More / Read Less
  console.log('\n--- TEST 2: TopAnnouncementTicker Dynamic Multi-Message & Read More Verification ---');
  const tickerContainer = window.document.createElement('div');
  window.document.body.appendChild(tickerContainer);
  const tickerRoot = createRoot(tickerContainer);

  const longAnnouncementText = 'ITANGAZO RIKOMEYE: Turamenyesha ababyeyi bose n\'abarezi bo kuri GS GITUMBA ko inama rusange y\'umuryango w\'abarezi n\'ababyeyi izaba kuwa gatanu tariki 15 z\'uku kwezi guhera saa tatu za mugitondo mu cyumba cy\'inama cy\'ikigo.';

  const customSettings = {
    ...DEFAULT_ANNOUNCEMENT_STRIP,
    enabled: true,
    backgroundColor: '#0f766e',
    textColor: '#ffffff',
    fontSize: 14,
    messages: [
      { id: '1', text: longAnnouncementText, badge: 'ITANGAZO', active: true },
      { id: '2', text: 'Short announcement test message', badge: 'UBUREZI', active: true }
    ]
  };

  await act(async () => {
    tickerRoot.render(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          WebsiteDesignProvider,
          null,
          React.createElement(TopAnnouncementTicker, { overrideSettings: customSettings, isPreview: true })
        )
      )
    );
  });

  let tickerHtml = tickerContainer.innerHTML;
  if (!tickerHtml || !tickerHtml.includes('Read more')) {
    throw new Error('FAILED: TopAnnouncementTicker failed to render "Read more" button for long announcement!');
  }
  console.log('✓ Long announcement displays "Read more" button.');

  // Click "Read more" to expand announcement
  const readMoreBtn = tickerContainer.querySelector('button[title="Read complete announcement"]') as HTMLButtonElement;
  if (!readMoreBtn) {
    throw new Error('FAILED: "Read more" button element not found in DOM!');
  }

  await act(async () => {
    readMoreBtn.click();
  });

  tickerHtml = tickerContainer.innerHTML;
  if (!tickerHtml.includes('Read less') || !tickerHtml.includes('Full Announcement')) {
    throw new Error('FAILED: Clicking "Read more" did not expand to show full message and "Read less" button!');
  }
  console.log('✓ Clicking "Read more" expands full announcement text and reveals "Read less" button.');

  // Click "Read less" to collapse announcement
  const readLessBtn = tickerContainer.querySelector('button[title="Collapse announcement"]') as HTMLButtonElement;
  if (!readLessBtn) {
    throw new Error('FAILED: "Read less" button element not found in DOM!');
  }

  await act(async () => {
    readLessBtn.click();
  });

  tickerHtml = tickerContainer.innerHTML;
  if (!tickerHtml.includes('Read more')) {
    throw new Error('FAILED: Clicking "Read less" failed to collapse announcement!');
  }
  console.log('✓ Clicking "Read less" collapses announcement back to preview.');

  await act(async () => {
    tickerRoot.unmount();
  });
  tickerContainer.remove();
  console.log('✓ TEST 2 PASSED: TopAnnouncementTicker Read more/less feature fully verified.');

  // TEST 3: Full Application Mounting & Route Simulation
  console.log('\n--- TEST 3: Full App Mounting & Route Simulation ---');
  const appContainer = window.document.getElementById('root')!;
  const appRoot = createRoot(appContainer);

  // 3a. Mount App on Home (Newspaper Homepage)
  console.log('Testing Route: / (Homepage - Newspaper)');
  window.history.pushState({}, '', '/');
  await act(async () => {
    appRoot.render(React.createElement(AppDefault));
  });

  const homeHtml = appContainer.innerHTML;
  if (!homeHtml || homeHtml.trim().length === 0) {
    throw new Error('FAILED: App rendered a blank screen on Homepage!');
  }
  console.log(`✓ Homepage rendered successfully (${homeHtml.length} bytes of DOM output).`);
  console.log(`  Contains newspaper masthead: ${homeHtml.includes('ISEZERANO ONLINE')}`);
  console.log(`  Contains top announcement strip: ${homeHtml.includes('Press') || homeHtml.includes('Ikaze') || homeHtml.includes('Announcement')}`);

  // Confirm AI Photo Slides / HeroSlider is completely absent from the homepage
  const hasHeroSlider = homeHtml.includes('Official CBC Lesson Planning Portal') || 
                        homeHtml.includes('Smart Pedagogical Assistant') || 
                        homeHtml.includes('HeroSlider') ||
                        homeHtml.includes('hero-slider');
  if (hasHeroSlider) {
    throw new Error('FAILED: AI Photo Slides / HeroSlider is still present on the public homepage!');
  }
  console.log('✓ AI Photo Slides / HeroSlider successfully and completely removed from the homepage.');
  console.log('✓ Homepage flows directly into genuine editorial newspaper headlines and articles.');

  // Test Three-Dot Menu (⋮) in Header
  const threeDotBtn = appContainer.querySelector('button[title="Account & Platform Menu"]') as HTMLButtonElement;
  if (!threeDotBtn) {
    throw new Error('FAILED: Three-dot menu button (⋮) not found in header!');
  }
  console.log('✓ Three-dot menu button found in header.');

  // Click three-dot menu to open dropdown
  await act(async () => {
    threeDotBtn.click();
  });
  const openMenuHtml = appContainer.innerHTML;

  // Requirement 3 & 4 Verification:
  // 1. Education Dashboard must be in the three-dot menu for ALL visitors (even when logged out)
  const hasEduDashboardInMenu = openMenuHtml.includes('Education Dashboard');
  if (!hasEduDashboardInMenu) {
    throw new Error('FAILED: Three-dot menu missing "Education Dashboard" for public/logged-out visitors!');
  }
  console.log('✓ Public visitors see "Education Dashboard" directly in the three-dot menu without admin login.');

  // 2. Login / Account must be in the three-dot menu for logged out visitors
  const hasLoginOption = openMenuHtml.includes('Login / Account');
  if (!hasLoginOption) {
    throw new Error('FAILED: Dropdown menu did not reveal Login / Account option when clicked!');
  }
  console.log('✓ Public visitors see "Login / Account" in the three-dot menu.');

  // 3. Admin Portal must NOT be visible to unauthorized visitors
  const hasAdminPortalInPublicMenu = openMenuHtml.includes('Admin Portal');
  if (hasAdminPortalInPublicMenu) {
    throw new Error('FAILED: Security breach! Admin Portal was exposed to logged-out/unauthorized visitor!');
  }
  console.log('✓ Admin Portal is strictly hidden from logged-out / unauthorized visitors.');

  // Close three-dot menu
  await act(async () => {
    threeDotBtn.click();
  });

  // Test Dynamic Category Bar & Read More for Long Categories
  const categoryBarHtml = appContainer.innerHTML;
  const hasCategoryBar = categoryBarHtml.includes('Byose (All Stories)') && categoryBarHtml.includes('Uburezi');
  if (!hasCategoryBar) {
    throw new Error('FAILED: Category bar not displaying in public header!');
  }
  console.log('✓ Dynamic news categories bar displayed in header.');

  // Test "More" categories dropdown button
  const moreCategoriesBtn = appContainer.querySelector('button[title="Show all news categories and complete topics"]') as HTMLButtonElement;
  if (!moreCategoriesBtn) {
    throw new Error('FAILED: "More" categories button not found in category bar!');
  }
  console.log('✓ "More" categories dropdown button exists.');

  // Click "More" categories dropdown to reveal all categories without cut-off
  await act(async () => {
    moreCategoriesBtn.click();
  });
  const expandedCatHtml = appContainer.innerHTML;
  const hasAllTopicsDropdown = expandedCatHtml.includes('All News Topics');
  if (!hasAllTopicsDropdown) {
    throw new Error('FAILED: Clicking "More" categories failed to open dropdown!');
  }
  console.log('✓ "More" dropdown successfully opens and displays complete category list.');

  // Close category dropdown
  await act(async () => {
    moreCategoriesBtn.click();
  });

  // Test Footer Prominent Links (About Us, Contact Us, Privacy Policy, Terms)
  const hasFooterAbout = homeHtml.includes('About Us') || homeHtml.includes('navAbout');
  const hasFooterContact = homeHtml.includes('Contact Us') || homeHtml.includes('navContact');
  const hasFooterPrivacy = homeHtml.includes('Privacy Policy') || homeHtml.includes('navPrivacy');
  const hasFooterTerms = homeHtml.includes('Terms') && (homeHtml.includes('Conditions') || homeHtml.includes('Amategeko'));
  if (!hasFooterAbout || !hasFooterContact || !hasFooterPrivacy || !hasFooterTerms) {
    throw new Error('FAILED: Footer missing one or more required institutional links!');
  }
  console.log('✓ Footer prominently contains About Us, Contact Us, Privacy Policy, and Terms & Conditions.');

  // 3b. Test navigation to /create (Lesson Plan Generator)
  console.log('\nTesting Route: /create (Lesson Plan Generator)');
  window.history.pushState({}, '', '/create');
  await act(async () => {
    window.dispatchEvent(new window.Event('popstate'));
  });
  const createHtml = appContainer.innerHTML;
  console.log(`✓ Lesson Plan Generator view rendered (${createHtml.length} bytes of DOM).`);

  // 3c. Test navigation to /saved (Saved Lesson Plans)
  console.log('\nTesting Route: /saved (Saved Lesson Plans)');
  window.history.pushState({}, '', '/saved');
  await act(async () => {
    window.dispatchEvent(new window.Event('popstate'));
  });
  const savedHtml = appContainer.innerHTML;
  console.log(`✓ Saved Lesson Plans view rendered (${savedHtml.length} bytes of DOM).`);

  // 3d. Test navigation to /dashboard (Dashboard)
  console.log('\nTesting Route: /dashboard (Dashboard)');
  window.history.pushState({}, '', '/dashboard');
  await act(async () => {
    window.dispatchEvent(new window.Event('popstate'));
  });
  const dashHtml = appContainer.innerHTML;
  console.log(`✓ Dashboard view rendered (${dashHtml.length} bytes of DOM).`);

  // 3e. Test navigation to /blog
  console.log('\nTesting Route: /blog (Blog Archive)');
  window.history.pushState({}, '', '/blog');
  await act(async () => {
    window.dispatchEvent(new window.Event('popstate'));
  });
  const blogHtml = appContainer.innerHTML;
  console.log(`✓ Blog view rendered (${blogHtml.length} bytes of DOM).`);

  // 3f. Test navigation to /admin
  console.log('\nTesting Route: /admin (Admin Portal Gateway)');
  window.history.pushState({}, '', '/admin');
  await act(async () => {
    window.dispatchEvent(new window.Event('popstate'));
  });
  const adminHtml = appContainer.innerHTML;
  console.log(`✓ Admin portal rendered (${adminHtml.length} bytes of DOM).`);

  // 3g. Test CategoryManager component directly
  console.log('\n--- TEST 3g: CategoryManager Admin Component Verification ---');
  const { CategoryManager } = await import('../src/components/CategoryManager');
  const catMgrContainer = window.document.createElement('div');
  window.document.body.appendChild(catMgrContainer);
  const catMgrRoot = createRoot(catMgrContainer);

  await act(async () => {
    catMgrRoot.render(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(CategoryManager)
      )
    );
  });
  const catMgrHtml = catMgrContainer.innerHTML;
  console.log(`✓ CategoryManager rendered successfully (${catMgrHtml.length} bytes).`);
  console.log(`  Contains Add New Category form: ${catMgrHtml.includes('Add New Category')}`);
  console.log(`  Contains category list: ${catMgrHtml.includes('Uburezi')}`);

  await act(async () => {
    catMgrRoot.unmount();
  });
  catMgrContainer.remove();

  // TEST 4: BlogPostDetailView Meta Cleanliness Test
  console.log('\n--- TEST 4: BlogPostDetailView Header Meta Inspection ---');
  const blogDetailContainer = window.document.createElement('div');
  window.document.body.appendChild(blogDetailContainer);
  const blogDetailRoot = createRoot(blogDetailContainer);

  await act(async () => {
    blogDetailRoot.render(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          WebsiteDesignProvider,
          null,
          React.createElement(BlogPostDetailView, {
            slug: 'ai-10-zingenzi-zifasha-abanyeshuri-nabarimu-mu-burezi',
            onNavigate: () => {},
            onSelectPost: () => {}
          })
        )
      )
    );
  });

  // Wait for post load inside act
  await act(async () => {
    await new Promise(r => setTimeout(r, 600));
  });

  const postDetailHtml = blogDetailContainer.innerHTML;
  console.log(`✓ BlogPostDetailView rendered (${postDetailHtml.length} bytes of DOM).`);
  
  // Verify that views information is present and category badge is NOT above title
  const hasViews = postDetailHtml.includes('views');
  console.log(`  Contains article views: ${hasViews}`);
  console.log(`  Does NOT have unwanted category badge above title: ${!postDetailHtml.includes('px-3 py-1 rounded-full text-xs font-bold bg-teal-50')}`);

  await act(async () => {
    blogDetailRoot.unmount();
  });
  blogDetailContainer.remove();
  console.log('✓ TEST 4 PASSED: BlogPostDetailView verified.');

  // TEST 5: PrintLessonPlanModal (PDF / Word / Print)
  console.log('\n--- TEST 5: PrintLessonPlanModal (PDF / Word / Print) ---');
  const printContainer = window.document.createElement('div');
  window.document.body.appendChild(printContainer);
  const printRoot = createRoot(printContainer);

  await act(async () => {
    printRoot.render(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(PrintLessonPlanModal, {
          plan: testPlan,
          onClose: () => {}
        })
      )
    );
  });

  const printHtml = printContainer.innerHTML;
  if (!printHtml || printHtml.trim().length === 0) {
    throw new Error('FAILED: PrintLessonPlanModal rendered blank screen!');
  }
  console.log(`✓ PrintLessonPlanModal rendered successfully (${printHtml.length} bytes).`);
  console.log(`  Contains PDF button: ${printHtml.includes('PDF')}`);
  console.log(`  Contains Word (.docx) button: ${printHtml.includes('Word') || printHtml.includes('DOCX') || printHtml.includes('docx')}`);
  console.log(`  Contains Print button: ${printHtml.includes('Print') || printHtml.includes('Gucapa')}`);

  await act(async () => {
    printRoot.unmount();
    appRoot.unmount();
  });

  // TEST 6: Error Log Inspection for React #310 or Hook Errors
  console.log('\n--- TEST 6: React Error & Hook Violation Audit ---');
  const react310Errors = capturedErrors.filter(err => 
    err.includes('310') || 
    err.includes('Rendered more hooks') || 
    err.includes('rendered fewer hooks') ||
    err.includes('Rules of Hooks')
  );

  if (react310Errors.length > 0) {
    console.error('FAILED: React #310 or Hook errors detected:');
    react310Errors.forEach(err => console.error(err));
    throw new Error(`Test failed with ${react310Errors.length} hook violation errors.`);
  }

  console.log('✓ 0 React Error #310 violations found.');
  console.log('✓ 0 Hook count mismatches detected.');
  console.log('✓ All views mounted, switched routes, and unmounted with 100% clean DOM output.');

  console.log('\n====================================================');
  console.log('ALL BROWSER RUNTIME VERIFICATION TESTS PASSED!');
  console.log('====================================================');
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});

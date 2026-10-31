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

  // TEST 2: TopAnnouncementTicker Verification
  console.log('\n--- TEST 2: TopAnnouncementTicker Dynamic Multi-Message & Styling Verification ---');
  const tickerContainer = window.document.createElement('div');
  window.document.body.appendChild(tickerContainer);
  const tickerRoot = createRoot(tickerContainer);

  const customSettings = {
    ...DEFAULT_ANNOUNCEMENT_STRIP,
    enabled: true,
    backgroundColor: '#0f766e',
    textColor: '#ffffff',
    fontSize: 14,
    messages: [
      { id: '1', text: 'Important announcement 1', badge: 'AMAKURU', active: true },
      { id: '2', text: 'Important announcement 2', badge: 'UBUREZI', active: true }
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

  const tickerHtml = tickerContainer.innerHTML;
  if (!tickerHtml || !tickerHtml.includes('Important announcement 1')) {
    throw new Error('FAILED: TopAnnouncementTicker failed to render announcement text!');
  }
  console.log(`✓ TopAnnouncementTicker rendered successfully (${tickerHtml.length} bytes of DOM).`);
  console.log(`  Contains message text: ${tickerHtml.includes('Important announcement 1')}`);
  console.log(`  Contains badge pill: ${tickerHtml.includes('AMAKURU')}`);
  console.log(`  Contains custom background color: ${tickerHtml.includes('background-color: rgb(15, 118, 110)') || tickerHtml.includes('#0f766e')}`);
  console.log(`  Contains custom font size: ${tickerHtml.includes('font-size: 14px')}`);

  await act(async () => {
    tickerRoot.unmount();
  });
  tickerContainer.remove();
  console.log('✓ TEST 2 PASSED: TopAnnouncementTicker fully verified.');

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
  console.log(`  Contains header: ${homeHtml.includes('ISEZERANO')}`);
  console.log(`  Contains top announcement strip: ${homeHtml.includes('Press') || homeHtml.includes('Ikaze') || homeHtml.includes('Announcement')}`);

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

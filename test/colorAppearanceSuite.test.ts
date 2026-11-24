import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import {
  APPEARANCE_THEME_PRESETS,
  BORDER_RADIUS_MAP,
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_DARK_COLORS,
  DEFAULT_LIGHT_COLORS,
  SPACING_DENSITY_MAP,
  getContrastRatio,
  getReadableContrastText,
  hexToRgba,
  isValidHexColor,
  normalizeAppearanceSettings,
  normalizeColorSettings,
  normalizeHexColor,
  resolveEffectiveAppearanceMode,
  resolveEffectiveColors
} from '../src/utils/appearanceUtils';
import {
  DEFAULT_APPEARANCE_STATE,
  DEFAULT_WEBSITE_COLORS,
  DEFAULT_WEBSITE_DESIGN
} from '../src/types/websiteDesign';
import {
  DESIGN_PUBLIC_REST_URL,
  applyDesignCssVariables,
  normalizeWebsiteDesignPayload
} from '../src/services/websiteDesignService';

// =========================================================================
// PART 1: COLOR TOKEN NORMALIZATION, VALIDATION & LEGACY BACKWARD COMPAT
// =========================================================================

function testNormalizationAndDefaults() {
  assert.equal(isValidHexColor('#0f766e'), true);
  assert.equal(isValidHexColor('#abc'), true);
  assert.equal(isValidHexColor('invalid'), false);
  assert.equal(isValidHexColor('#12345'), false);

  assert.equal(normalizeHexColor('#ABC', '#000000'), '#aabbcc');
  assert.equal(normalizeHexColor('bad-hex', '#0f766e'), '#0f766e');
  assert.equal(hexToRgba('#090e1a', 0.68), 'rgba(9, 14, 26, 0.68)');

  assert.ok(getContrastRatio('#ffffff', '#0f766e') >= 4.5);
  assert.equal(getReadableContrastText('#0f172a'), '#ffffff');
  assert.equal(getReadableContrastText('#f8fafc'), '#0f172a');

  // Legacy Firestore color payload missing new 9 semantic tokens still normalizes cleanly
  const legacyColors = normalizeColorSettings({
    primaryButtonBg: '#1e3a8a',
    secondaryButtonBg: '#111827',
    formFocusRing: '#3b82f6',
    cardBorder: '#cbd5e1',
    headerBg: '#f1f5f9'
  });

  assert.equal(legacyColors.primaryColor, '#1e3a8a');
  assert.equal(legacyColors.secondaryColor, '#111827');
  assert.equal(legacyColors.accentColor, '#3b82f6');
  assert.equal(legacyColors.borderColor, '#cbd5e1');
  assert.equal(legacyColors.successBg, DEFAULT_LIGHT_COLORS.successBg);
  assert.equal(legacyColors.successText, DEFAULT_LIGHT_COLORS.successText);
  assert.equal(legacyColors.errorBg, DEFAULT_LIGHT_COLORS.errorBg);
  assert.equal(legacyColors.warningBg, DEFAULT_LIGHT_COLORS.warningBg);
  assert.equal(legacyColors.modalOverlayBg, DEFAULT_LIGHT_COLORS.modalOverlayBg);
  assert.equal(legacyColors.headerBg, '#f1f5f9');

  // Verify all 18 required user-facing global color tokens exist on DEFAULT_WEBSITE_COLORS
  const required18Keys: Array<keyof typeof DEFAULT_WEBSITE_COLORS> = [
    'primaryColor',
    'secondaryColor',
    'accentColor',
    'bodyBg',
    'cardBg',
    'headerBg',
    'footerBg',
    'bodyText',
    'mutedText',
    'linkColor',
    'primaryButtonBg',
    'primaryButtonText',
    'borderColor',
    'successBg',
    'successText',
    'errorBg',
    'warningBg',
    'modalOverlayBg'
  ];
  for (const key of required18Keys) {
    assert.ok(
      isValidHexColor(DEFAULT_WEBSITE_COLORS[key]),
      `Default token "${key}" must be a valid HEX color`
    );
  }

  // Verify appearance normalization & fallback behavior
  const defaultAppearance = normalizeAppearanceSettings(undefined);
  assert.deepEqual(defaultAppearance, DEFAULT_APPEARANCE_SETTINGS);

  const customAppearance = normalizeAppearanceSettings({
    mode: 'system',
    presetId: 'midnight-slate-dark',
    borderRadius: 'rounded',
    spacing: 'compact'
  });
  assert.equal(customAppearance.mode, 'system');
  assert.equal(customAppearance.borderRadius, 'rounded');
  assert.equal(customAppearance.spacing, 'compact');

  const sanitizedBadAppearance = normalizeAppearanceSettings({
    mode: 'neon' as any,
    borderRadius: 'huge' as any,
    spacing: 'ultra' as any,
    presetId: ''
  });
  assert.deepEqual(sanitizedBadAppearance, DEFAULT_APPEARANCE_SETTINGS);

  // Check DEFAULT_WEBSITE_DESIGN & normalizeWebsiteDesignPayload
  assert.deepEqual(DEFAULT_WEBSITE_DESIGN.appearance, DEFAULT_APPEARANCE_STATE);
  const normalizedPayload = normalizeWebsiteDesignPayload({
    colors: { successBg: '#16a34a', successText: '#f0fdf4' } as any,
    appearance: { mode: 'dark', borderRadius: 'large', spacing: 'compact', presetId: 'midnight-slate-dark' }
  });
  assert.equal(normalizedPayload.colors.successBg, '#16a34a');
  assert.equal(normalizedPayload.colors.successText, '#f0fdf4');
  assert.equal(normalizedPayload.appearance?.mode, 'dark');
  assert.equal(normalizedPayload.appearance?.borderRadius, 'large');
  assert.equal(normalizedPayload.appearance?.spacing, 'compact');

  console.log('✓ 1. All 18 color tokens, legacy backward-compatibility & appearance normalization verified');
}

// =========================================================================
// PART 2: PRESETS, LIGHT / DARK / SYSTEM MODE RESOLUTION & REST FIELD MASK
// =========================================================================

function testPresetsAndModeResolution() {
  assert.equal(APPEARANCE_THEME_PRESETS.length, 6);
  const lightPresets = APPEARANCE_THEME_PRESETS.filter((p) => p.mode === 'light');
  const darkPresets = APPEARANCE_THEME_PRESETS.filter((p) => p.mode === 'dark');
  assert.ok(lightPresets.length >= 4);
  assert.ok(darkPresets.length >= 2);

  for (const preset of APPEARANCE_THEME_PRESETS) {
    const normalized = normalizeColorSettings(preset.colors);
    assert.ok(
      getContrastRatio(normalized.bodyText, normalized.bodyBg) >= 4.5,
      `Preset ${preset.id} bodyText must meet >= 4.5:1 contrast against bodyBg`
    );
    assert.ok(
      getContrastRatio(normalized.successText, normalized.successBg) >= 3.0,
      `Preset ${preset.id} successText must remain readable on successBg`
    );
  }

  assert.equal(resolveEffectiveAppearanceMode('light', true), 'light');
  assert.equal(resolveEffectiveAppearanceMode('dark', false), 'dark');
  assert.equal(resolveEffectiveAppearanceMode('system', true), 'dark');
  assert.equal(resolveEffectiveAppearanceMode('system', false), 'light');

  // System mode adapts light stored surface colors cleanly to dark surface defaults when OS prefers dark
  const sysDark = resolveEffectiveColors(
    DEFAULT_LIGHT_COLORS,
    { ...DEFAULT_APPEARANCE_SETTINGS, mode: 'system' },
    true
  );
  assert.equal(sysDark.effectiveMode, 'dark');
  assert.equal(sysDark.colors.bodyBg, DEFAULT_DARK_COLORS.bodyBg);

  // And adapts dark stored surface colors to light surface defaults when OS prefers light
  const sysLight = resolveEffectiveColors(
    DEFAULT_DARK_COLORS,
    { ...DEFAULT_APPEARANCE_SETTINGS, mode: 'system' },
    false
  );
  assert.equal(sysLight.effectiveMode, 'light');
  assert.equal(sysLight.colors.bodyBg, DEFAULT_LIGHT_COLORS.bodyBg);

  // Custom non-default brand & status colors stay preserved in system mode
  const sysCustom = resolveEffectiveColors(
    { ...DEFAULT_LIGHT_COLORS, primaryColor: '#7c3aed', successBg: '#15803d', successText: '#fef08a' },
    { ...DEFAULT_APPEARANCE_SETTINGS, mode: 'system' },
    true
  );
  assert.equal(sysCustom.colors.primaryColor, '#7c3aed');
  assert.equal(sysCustom.colors.successBg, '#15803d');
  assert.equal(sysCustom.colors.successText, '#fef08a');

  // Firestore REST URL must request `appearance` mask
  assert.match(DESIGN_PUBLIC_REST_URL, /mask\.fieldPaths=appearance/);
  assert.match(DESIGN_PUBLIC_REST_URL, /mask\.fieldPaths=colors/);

  assert.equal(BORDER_RADIUS_MAP.none.card, '0px');
  assert.equal(BORDER_RADIUS_MAP.rounded.card, '24px');
  assert.equal(SPACING_DENSITY_MAP.compact.label, 'Compact');
  assert.equal(SPACING_DENSITY_MAP.comfortable.label, 'Comfortable');

  console.log('✓ 2. Presets contrast, Light/Dark/System mode resolution & Firestore field mask verified');
}

// =========================================================================
// PART 3: ZERO-FOUC BOOTSTRAP, CSS VARIABLES & SOURCE INTEGRATIONS
// =========================================================================

function testFoucScriptCssAndIntegrations() {
  const htmlSrc = fs.readFileSync(path.resolve('index.html'), 'utf8');
  assert.match(htmlSrc, /isezerano_website_design/, 'index.html must include early localStorage hydration script');
  assert.match(htmlSrc, /prefers-color-scheme:\s*dark/, 'index.html must check OS dark preference for system mode');
  assert.match(htmlSrc, /data-theme/, 'index.html must apply data-theme before mount');
  assert.match(htmlSrc, /--app-body-bg/, 'index.html must hydrate early CSS background token');
  assert.match(htmlSrc, /name="referrer"\s+content="no-referrer-when-downgrade"/);

  const cssSrc = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
  assert.match(cssSrc, /@custom-variant dark/);
  assert.match(cssSrc, /--app-primary:/);
  assert.match(cssSrc, /--app-success-bg:/);
  assert.match(cssSrc, /--app-success-text:/);
  assert.match(cssSrc, /--app-error-bg:/);
  assert.match(cssSrc, /--app-warning-bg:/);
  assert.match(cssSrc, /--app-modal-overlay-rgba:/);
  assert.match(cssSrc, /\.theme-surface\s*\{/);
  assert.match(cssSrc, /\.theme-card\s*\{/);
  assert.match(cssSrc, /\.theme-btn-primary\s*\{/);
  assert.match(cssSrc, /\.theme-success-banner\s*\{/);
  assert.match(cssSrc, /\.theme-error-banner\s*\{/);
  assert.match(cssSrc, /\.theme-warning-banner\s*\{/);
  assert.match(cssSrc, /\.theme-modal-overlay\s*\{/);
  assert.match(cssSrc, /\.ad-slot-wrapper\s*\{[\s\S]*min-height:\s*50px;/);
  assert.match(cssSrc, /\.ad-slot-content\s*\{[\s\S]*min-height:\s*50px;/);

  const adminSrc = fs.readFileSync(path.resolve('src/views/AdminDashboardView.tsx'), 'utf8');
  assert.match(adminSrc, /'appearance'/);
  assert.match(adminSrc, /Color &(?:amp;)? Appearance/);
  assert.match(adminSrc, /<ColorAppearanceManager\s*\/>/);

  const designMgrSrc = fs.readFileSync(path.resolve('src/components/WebsiteDesignManager.tsx'), 'utf8');
  assert.match(designMgrSrc, /<ColorAppearanceManager embedded\s*\/>/);
  assert.match(designMgrSrc, /var\(--app-success-bg\)/);
  assert.match(designMgrSrc, /var\(--app-success-text\)/);

  const modalSrc = fs.readFileSync(path.resolve('src/components/AnnouncementDetailModal.tsx'), 'utf8');
  assert.match(modalSrc, /theme-modal-overlay/);
  assert.match(modalSrc, /theme-modal-card/);

  const commentsSrc = fs.readFileSync(path.resolve('src/components/ArticleCommentsSection.tsx'), 'utf8');
  assert.match(commentsSrc, /scroll-mt-36/);
  assert.match(commentsSrc, /theme-success-banner/);
  assert.match(commentsSrc, /theme-error-banner/);

  console.log('✓ 3. Anti-FOUC hydration script, CSS tokens & Admin/Public wiring verified');
}

// =========================================================================
// PART 4: LIVE DOM CSS INJECTION, ADMIN GATE & COMPONENT RENDER VERIFICATION
// =========================================================================

async function testDomApplicationAndComponentRenders() {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url: 'https://isezerano.online/'
  });

  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevLocalStorage = (globalThis as any).localStorage;
  const prevNode = (globalThis as any).Node;
  const prevFetch = (globalThis as any).fetch;
  const storageMap = new Map<string, string>();

  (dom.window as any).matchMedia = () => ({
    matches: false,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined
  });

  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).Node = dom.window.Node;
  (globalThis as any).fetch = async () => ({ ok: false, json: async () => null });
  (globalThis as any).localStorage = {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => storageMap.set(k, String(v)),
    removeItem: (k: string) => storageMap.delete(k)
  };

  try {
    // 4a. Test applyDesignCssVariables applies all 18 color vars, radius, spacing, and dark mode on <html>
    const customDesign = normalizeWebsiteDesignPayload({
      colors: {
        ...DEFAULT_DARK_COLORS,
        primaryColor: '#38bdf8',
        successBg: '#15803d',
        successText: '#ecfdf5',
        errorBg: '#b91c1c',
        warningBg: '#b45309',
        modalOverlayBg: '#020617'
      },
      appearance: {
        mode: 'dark',
        presetId: 'midnight-slate-dark',
        borderRadius: 'rounded',
        spacing: 'compact'
      }
    });

    applyDesignCssVariables(customDesign);

    const rootEl = dom.window.document.documentElement;
    const styleTag = dom.window.document.getElementById('isezerano-custom-design');
    assert.ok(styleTag, '#isezerano-custom-design style tag must be injected into <head>');
    const cssText = styleTag.textContent || '';
    assert.equal(rootEl.classList.contains('dark'), true, '<html> must have .dark class in dark mode');
    assert.equal(rootEl.getAttribute('data-theme'), 'dark');
    assert.equal(rootEl.getAttribute('data-radius'), 'rounded');
    assert.equal(rootEl.getAttribute('data-spacing'), 'compact');
    assert.match(cssText, /--app-primary:\s*#38bdf8;/);
    assert.match(cssText, /--app-success-bg:\s*#15803d;/);
    assert.match(cssText, /--app-success-text:\s*#ecfdf5;/);
    assert.match(cssText, /--app-error-bg:\s*#b91c1c;/);
    assert.match(cssText, /--app-warning-bg:\s*#b45309;/);
    assert.match(cssText, /--app-modal-overlay-rgba:\s*rgba\(2,\s*6,\s*23,\s*0\.68\);/);
    assert.match(cssText, /--app-radius-card:\s*24px;/);
    assert.match(cssText, /--app-space-card:\s*0\.875rem;/);

    // Switch back to light mode and confirm .dark is removed cleanly
    applyDesignCssVariables(DEFAULT_WEBSITE_DESIGN);
    assert.equal(rootEl.classList.contains('dark'), false, '<html> must remove .dark class in light mode');
    assert.equal(rootEl.getAttribute('data-theme'), 'light');

    // 4b. Verify ColorAppearanceManager enforces Admin authentication gate when unauthenticated
    const { AuthProvider } = await import('../src/context/AuthContext');
    const { WebsiteDesignProvider } = await import('../src/context/WebsiteDesignContext');
    const { ColorAppearanceManager } = await import('../src/components/ColorAppearanceManager');
    const { AnnouncementDetailModal } = await import('../src/components/AnnouncementDetailModal');

    const unauthHtml = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          WebsiteDesignProvider,
          null,
          React.createElement(ColorAppearanceManager)
        )
      )
    );
    assert.match(unauthHtml, /Administrator Access Required/);

    // 4c. Mount AnnouncementDetailModal with an urgent announcement and check theme classes
    const container = dom.window.document.getElementById('root')!;
    const root = createRoot(container);
    root.render(
      React.createElement(AnnouncementDetailModal, {
        isOpen: true,
        onClose: () => undefined,
        announcement: {
          id: 'notice_theme_test',
          title: 'Theme Test Breaking Alert',
          body: 'Global Color & Appearance system active.',
          createdAt: new Date().toISOString(),
          senderName: 'Editorial Desk',
          priority: 'urgent'
        } as any
      })
    );
    await new Promise((r) => setTimeout(r, 40));

    assert.ok(container.querySelector('.theme-modal-overlay'), 'AnnouncementDetailModal must use .theme-modal-overlay');
    assert.ok(container.querySelector('.theme-modal-card'), 'AnnouncementDetailModal must use .theme-modal-card');
    assert.match(container.textContent || '', /Theme Test Breaking Alert/);

    root.unmount();
    await new Promise((r) => setTimeout(r, 40));
  } finally {
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
    (globalThis as any).Node = prevNode;
    (globalThis as any).localStorage = prevLocalStorage;
    (globalThis as any).fetch = prevFetch;
  }

  console.log('✓ 4. Live DOM CSS variable injection, admin gate & modal theming verified');
}

async function run() {
  testNormalizationAndDefaults();
  testPresetsAndModeResolution();
  testFoucScriptCssAndIntegrations();
  await testDomApplicationAndComponentRenders();
  console.log('ALL COLOR & APPEARANCE TESTS PASSED SUCCESSFULLY.');
}

run().catch((err) => {
  console.error('Color & Appearance test suite failed:', err);
  process.exit(1);
});

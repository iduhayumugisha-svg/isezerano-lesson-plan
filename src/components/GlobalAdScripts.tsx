import React, { useEffect, useState } from 'react';
import {
  AdsSettings,
  DEFAULT_ADS_SETTINGS,
  HILLTOPADS_MULTITAG_VIDEO_SLIDER_SCRIPT_SRC
} from '../types/platform';
import {
  getAdsSettings,
  getCachedAdsSettingsSync,
  subscribeToAdsSettings
} from '../services/siteSettingsService';
import {
  analyzeAdCodeSnippet,
  installIntrusivePopunderDomGuard,
  isIntrusivePopunderElement,
  isSafeAdScriptUrl,
  normalizeFloatingVideoAdConfig,
  sanitizeAdCodePayload,
  shouldSkipDuplicateOverlayScript
} from '../utils/inArticleAdUtils';

interface GlobalAdScriptsProps {
  currentPage: string;
}

interface HilltopAdsScriptElement extends HTMLScriptElement {
  settings?: Record<string, unknown>;
}

const FLOATING_VIDEO_SCRIPT_KEY = `hilltopads-video-slider::${HILLTOPADS_MULTITAG_VIDEO_SLIDER_SCRIPT_SRC}`;
const executedGlobalScriptSignatures = new Set<string>();
const executedGlobalScriptSources = new Set<string>();

export const __resetGlobalAdScriptsCacheForTests = (): void => {
  executedGlobalScriptSignatures.clear();
  executedGlobalScriptSources.clear();
};

export const GlobalAdScripts: React.FC<GlobalAdScriptsProps> = ({ currentPage }) => {
  const [adsSettings, setAdsSettings] = useState<AdsSettings>(() => getCachedAdsSettingsSync());

  useEffect(() => {
    let active = true;
    getAdsSettings()
      .then((fresh) => {
        if (active) setAdsSettings(fresh);
      })
      .catch(() => {
        // fail gracefully without disrupting app rendering
      });

    const unsub = subscribeToAdsSettings((fresh) => {
      if (active) setAdsSettings(fresh);
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  const globalConfig = adsSettings.globalScripts ?? DEFAULT_ADS_SETTINGS.globalScripts;
  const floatingVideoConfig = normalizeFloatingVideoAdConfig(adsSettings.floatingVideoAd);

  // HilltopAds MultiTag Video Slider (Floating Video Advertisement) — disabled by default; executes strictly when enabled & off /admin
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const isAdminRoute =
      currentPage === 'admin' || window.location.pathname.toLowerCase().startsWith('/admin');
    const shouldLoadFloatingVideo = Boolean(
      !isAdminRoute && adsSettings.masterEnabled && floatingVideoConfig.enabled
    );

    if (!shouldLoadFloatingVideo) {
      executedGlobalScriptSources.delete(FLOATING_VIDEO_SCRIPT_KEY);
      document
        .querySelectorAll('script[data-isezerano-global-ad="hilltopads-video-slider"]')
        .forEach((node) => node.remove());
      return;
    }

    let cancelled = false;

    const timerId = setTimeout(() => {
      if (cancelled) return;
      if (
        executedGlobalScriptSources.has(FLOATING_VIDEO_SCRIPT_KEY) ||
        document.querySelector('script[src*="conventionalresponse.com/bAXuVDs/"]')
      ) {
        executedGlobalScriptSources.add(FLOATING_VIDEO_SCRIPT_KEY);
        return;
      }

      const targetParent = document.body || document.documentElement;
      if (!targetParent) return;

      const s = document.createElement('script') as HilltopAdsScriptElement;
      s.settings = {};
      s.src = HILLTOPADS_MULTITAG_VIDEO_SLIDER_SCRIPT_SRC;
      s.async = true;
      s.referrerPolicy = 'no-referrer-when-downgrade';
      s.setAttribute('data-isezerano-global-ad', 'hilltopads-video-slider');

      executedGlobalScriptSources.add(FLOATING_VIDEO_SCRIPT_KEY);
      targetParent.appendChild(s);
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [currentPage, adsSettings.masterEnabled, floatingVideoConfig.enabled]);

  // Global <head> scripts & verification meta tags
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const isAdminRoute =
      currentPage === 'admin' || window.location.pathname.toLowerCase().startsWith('/admin');
    if (isAdminRoute) return;

    installIntrusivePopunderDomGuard();

    if (!adsSettings.masterEnabled || !globalConfig?.enabled) return;

    const rawCode = sanitizeAdCodePayload(globalConfig.code);
    if (!rawCode) return;

    const isMobileViewport = window.innerWidth < 768;
    if (isMobileViewport && !globalConfig.mobileEnabled) return;
    if (!isMobileViewport && !globalConfig.desktopEnabled) return;

    const signature = `${globalConfig.provider}::${rawCode}`;
    if (executedGlobalScriptSignatures.has(signature)) {
      return;
    }

    const analysis = analyzeAdCodeSnippet(rawCode);

    // Inject verified meta tags safely into document.head (blocking discontinued Monetag verification tags)
    for (const metaDesc of analysis.metaTags) {
      if (metaDesc.name.trim().toLowerCase() === 'monetag') continue;
      const existingMeta = document.head.querySelector(
        `meta[name="${CSS.escape ? CSS.escape(metaDesc.name) : metaDesc.name}"]`
      ) as HTMLMetaElement | null;
      if (!existingMeta) {
        const metaEl = document.createElement('meta');
        metaEl.name = metaDesc.name;
        metaEl.content = metaDesc.content;
        metaEl.setAttribute('data-isezerano-global-ad', 'true');
        document.head.appendChild(metaEl);
      }
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawCode;
    const scripts = Array.from(tempDiv.querySelectorAll('script'));

    for (const oldScript of scripts) {
      if (isIntrusivePopunderElement(oldScript)) continue;

      const src = oldScript.getAttribute('src')?.trim() || '';
      const zoneAttr = oldScript.getAttribute('data-zone')?.trim() || '';

      if (src) {
        if (!isSafeAdScriptUrl(src)) continue;
      }

      if (shouldSkipDuplicateOverlayScript(oldScript)) continue;

      if (src) {
        const srcKey = zoneAttr ? `${src}::${zoneAttr}` : src;
        if (executedGlobalScriptSources.has(srcKey)) continue;

        const alreadyInHead = Array.from(document.querySelectorAll('script[src]')).some(
          (el) => el.getAttribute('src') === src && (!zoneAttr || el.getAttribute('data-zone') === zoneAttr)
        );
        if (alreadyInHead) {
          executedGlobalScriptSources.add(srcKey);
          continue;
        }
        executedGlobalScriptSources.add(srcKey);
      }

      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        if (!attr.name.toLowerCase().startsWith('on')) {
          newScript.setAttribute(attr.name, attr.value);
        }
      });
      if (!newScript.hasAttribute('async') && src) {
        newScript.async = true;
      } else {
        newScript.async = oldScript.hasAttribute('async');
      }
      newScript.referrerPolicy = 'no-referrer-when-downgrade';
      newScript.setAttribute('data-isezerano-global-ad', globalConfig.provider);
      if (oldScript.textContent) {
        newScript.textContent = oldScript.textContent;
      }
      document.head.appendChild(newScript);
    }

    executedGlobalScriptSignatures.add(signature);
  }, [
    currentPage,
    adsSettings.masterEnabled,
    globalConfig?.enabled,
    globalConfig?.provider,
    globalConfig?.code,
    globalConfig?.mobileEnabled,
    globalConfig?.desktopEnabled
  ]);

  return null;
};

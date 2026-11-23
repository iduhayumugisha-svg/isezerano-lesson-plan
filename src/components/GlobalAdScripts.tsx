import React, { useEffect, useState } from 'react';
import { AdsSettings, DEFAULT_ADS_SETTINGS } from '../types/platform';
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
  normalizeInPagePushAdConfig,
  sanitizeAdCodePayload,
  shouldSkipDuplicateOverlayScript
} from '../utils/inArticleAdUtils';

interface GlobalAdScriptsProps {
  currentPage: string;
}

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
  const inPagePushConfig = normalizeInPagePushAdConfig(adsSettings.inPagePushAd);

  // Dedicated Monetag In-Page Push injection (floating/corner push banner, never rendered inside a header card)
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const isAdminRoute =
      currentPage === 'admin' || window.location.pathname.toLowerCase().startsWith('/admin');
    if (isAdminRoute) return;

    installIntrusivePopunderDomGuard();

    if (!adsSettings.masterEnabled || !inPagePushConfig.enabled) return;
    if (!inPagePushConfig.scriptUrl || !isSafeAdScriptUrl(inPagePushConfig.scriptUrl)) return;

    const isMobileViewport = window.innerWidth < 768;
    if (isMobileViewport && !inPagePushConfig.mobileEnabled) return;
    if (!isMobileViewport && !inPagePushConfig.desktopEnabled) return;

    const srcKey = `in-page-push::${inPagePushConfig.scriptUrl}::${inPagePushConfig.zoneId || 'default'}`;
    if (executedGlobalScriptSources.has(srcKey)) return;

    const scriptEl = document.createElement('script');
    scriptEl.src = inPagePushConfig.scriptUrl;
    scriptEl.async = true;
    scriptEl.referrerPolicy = 'no-referrer-when-downgrade';
    scriptEl.setAttribute('data-isezerano-global-ad', 'monetag-in-page-push');
    if (inPagePushConfig.zoneId) {
      scriptEl.dataset.zone = inPagePushConfig.zoneId;
      scriptEl.setAttribute('data-zone', inPagePushConfig.zoneId);
    }

    if (shouldSkipDuplicateOverlayScript(scriptEl)) {
      executedGlobalScriptSources.add(srcKey);
      return;
    }

    executedGlobalScriptSources.add(srcKey);
    const targetParent = document.head || document.documentElement || document.body;
    targetParent?.appendChild(scriptEl);
  }, [
    currentPage,
    adsSettings.masterEnabled,
    inPagePushConfig.enabled,
    inPagePushConfig.zoneId,
    inPagePushConfig.scriptUrl,
    inPagePushConfig.mobileEnabled,
    inPagePushConfig.desktopEnabled
  ]);

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

    // Inject verified meta tags (e.g., Monetag site ownership verification meta tag) safely into document.head
    for (const metaDesc of analysis.metaTags) {
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

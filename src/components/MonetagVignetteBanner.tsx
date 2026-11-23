import React, { useEffect, useState } from 'react';
import { AdsSettings } from '../types/platform';
import {
  getAdsSettings,
  getCachedAdsSettingsSync,
  subscribeToAdsSettings
} from '../services/siteSettingsService';
import {
  installIntrusivePopunderDomGuard,
  isSafeAdScriptUrl,
  normalizeVignetteAdConfig,
  shouldSkipDuplicateOverlayScript
} from '../utils/inArticleAdUtils';

interface MonetagVignetteBannerProps {
  currentPage: string;
}

const executedVignetteKeys = new Set<string>();

export const __resetMonetagVignetteCacheForTests = (): void => {
  executedVignetteKeys.clear();
};

/**
 * Dedicated Monetag Vignette Banner controller (overlay/interstitial format).
 * Executes cleanly at most once per session/config across React SPA navigation,
 * never creates an inline box below the website header, respects Monetag native
 * frequency capping & dismissal, and never runs on /admin.
 */
export const MonetagVignetteBanner: React.FC<MonetagVignetteBannerProps> = ({ currentPage }) => {
  const [adsSettings, setAdsSettings] = useState<AdsSettings>(() => getCachedAdsSettingsSync());

  useEffect(() => {
    let active = true;
    getAdsSettings()
      .then((fresh) => {
        if (active) setAdsSettings(fresh);
      })
      .catch(() => {
        // fail gracefully without disrupting rendering
      });

    const unsub = subscribeToAdsSettings((fresh) => {
      if (active) setAdsSettings(fresh);
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  const vignette = normalizeVignetteAdConfig(adsSettings.vignetteAd);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const isAdminRoute =
      currentPage === 'admin' || window.location.pathname.toLowerCase().startsWith('/admin');
    if (isAdminRoute) return;

    installIntrusivePopunderDomGuard();

    if (!adsSettings.masterEnabled || !vignette.enabled) return;
    if (!vignette.scriptUrl || !isSafeAdScriptUrl(vignette.scriptUrl)) return;

    const isMobileViewport = window.innerWidth < 768;
    if (isMobileViewport && !vignette.mobileEnabled) return;
    if (!isMobileViewport && !vignette.desktopEnabled) return;

    const execKey = `${vignette.scriptUrl}::zone:${vignette.zoneId || 'default'}`;
    if (executedVignetteKeys.has(execKey)) {
      return;
    }

    const script = document.createElement('script');
    script.src = vignette.scriptUrl;
    script.async = true;
    script.referrerPolicy = 'no-referrer-when-downgrade';
    script.setAttribute('data-isezerano-vignette', 'true');
    if (vignette.zoneId) {
      script.dataset.zone = vignette.zoneId;
      script.setAttribute('data-zone', vignette.zoneId);
    }

    if (shouldSkipDuplicateOverlayScript(script)) {
      executedVignetteKeys.add(execKey);
      return;
    }

    executedVignetteKeys.add(execKey);
    const targetParent =
      document.head || document.documentElement || document.body;
    targetParent?.appendChild(script);
  }, [
    currentPage,
    adsSettings.masterEnabled,
    vignette.enabled,
    vignette.zoneId,
    vignette.scriptUrl,
    vignette.mobileEnabled,
    vignette.desktopEnabled
  ]);

  return null;
};

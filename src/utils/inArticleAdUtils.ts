import {
  AdProviderId,
  AdSlotConfig,
  DEFAULT_FLOATING_VIDEO_AD_CONFIG,
  DEFAULT_GLOBAL_AD_SCRIPT_CONFIG,
  DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS,
  DEFAULT_IN_ARTICLE_SLOT_PARAGRAPHS,
  DEFAULT_IN_ARTICLE_VAST_VIDEO_AD_CONFIG,
  FloatingVideoAdConfig,
  GlobalAdScriptConfig,
  HILLTOPADS_MULTITAG_VIDEO_SLIDER_SCRIPT_SRC,
  HOMEPAGE_IN_FEED_POSITION_LIMITS,
  HomepageInFeedAdSlotConfig,
  HomepageInFeedAdSlotKey,
  HomepageInFeedAdsSettings,
  IN_ARTICLE_PARAGRAPH_LIMITS,
  InArticleAdFormat,
  InArticleAdSlotConfig,
  InArticleAdSlotKey,
  InArticleAdsSettings,
  InArticleDirectLinkCardConfig,
  InArticleVastVideoAdConfig,
  createDefaultHomepageInFeedSlotConfig,
  createDefaultInArticleDirectLinkCardConfig,
  createDefaultInArticleSlotConfig
} from '../types/platform';
import { isSafeVastHttpsUrl } from './vastParser';

export const AD_PROVIDER_OPTIONS: ReadonlyArray<{
  id: AdProviderId;
  label: string;
  description: string;
}> = [
  {
    id: 'hilltopads',
    label: 'HilltopAds',
    description: 'Supports approved HilltopAds native banners and non-intrusive ad snippets (intrusive popunders and blocked third-party ad network tags are automatically blocked).'
  },
  {
    id: 'adscod',
    label: 'Adscod',
    description: 'Supports pasted Adscod embed scripts or partner HTML containers when configured by admin.'
  },
  {
    id: 'other',
    label: 'Other / Custom Network',
    description: 'Supports Google AdSense, Adsterra, or custom partner HTML/JavaScript ad units.'
  }
];

export const AD_DISCLOSURE_LABEL_OPTIONS = ['Advertisement', 'Sponsored', 'Kwamamaza'] as const;

export const MAX_AD_CODE_LENGTH = 25000;

/**
 * Matches known intrusive tab-opening OnClick / Popunder script sources and all
 * discontinued Monetag domains, zones, verification meta tags, vignette, in-page push,
 * and service-worker endpoints so stale or pasted Monetag tags are permanently blocked.
 */
export const INTRUSIVE_POPUNDER_SCRIPT_SRC_PATTERN =
  /(?:https?:)?\/\/(?:[^/"'\s]+\.)*(?:quge5\.com|glizauvo\.net|thubanoa\.com|niphaume\.com|propu\.sh|nap5k\.com|n6wxm\.com|alwingulla\.com|5gvci\.com|uplcm\.com|monetag\.com)(?:\/[^"'\s]*)?|(?:\/sw\.js\b|\/vignette\.min\.js\b)/i;

const INTRUSIVE_POPUNDER_ZONE_PATTERN =
  /(?:\bdata-zone|\bdataset\.zone|\bzone)\s*[:=]\s*["']?(?:313598|12145119|12322670|12321969|12329910)["']?/i;

const MONETAG_META_TAG_PATTERN =
  /<meta\b[^>]*\bname\s*=\s*(?:"monetag"|'monetag'|monetag\b)[^>]*>/i;

const INTRUSIVE_INLINE_POPUNDER_PATTERN =
  /\b(?:popunder|onclick[_-]?ad|openPopunder|clickUnder)\b|(?:\bdata-zone|\bdataset\.zone|\bzone)\s*[:=]\s*["']?(?:313598|12145119|12322670|12321969|12329910)["']?|(?:quge5\.com|nap5k\.com|n6wxm\.com|alwingulla\.com|5gvci\.com|uplcm\.com|monetag\.com|vignette\.min\.js)/i;

export interface PopunderSanitizationResult {
  cleanedCode: string;
  removedCount: number;
  hadIntrusivePopunder: boolean;
}

const stripHtmlComments = (raw: string): string => raw.replace(/<!--[\s\S]*?-->/g, '');

export const detectIntrusivePopunderAdCode = (rawCode: unknown): boolean => {
  if (typeof rawCode !== 'string' || !rawCode.trim()) return false;
  const activeMarkup = stripHtmlComments(rawCode);
  if (!activeMarkup.trim()) return false;
  return (
    INTRUSIVE_POPUNDER_SCRIPT_SRC_PATTERN.test(activeMarkup) ||
    INTRUSIVE_POPUNDER_ZONE_PATTERN.test(activeMarkup) ||
    MONETAG_META_TAG_PATTERN.test(activeMarkup) ||
    INTRUSIVE_INLINE_POPUNDER_PATTERN.test(activeMarkup)
  );
};

export const stripIntrusivePopunderAdCode = (
  rawCode: unknown,
  trimWhitespace: boolean = true
): PopunderSanitizationResult => {
  if (typeof rawCode !== 'string' || !rawCode) {
    return { cleanedCode: '', removedCount: 0, hadIntrusivePopunder: false };
  }

  let removedCount = 0;
  let working = rawCode.replace(/\u0000/g, '').slice(0, MAX_AD_CODE_LENGTH);

  // 1. Remove full <script ...>...</script> tags that reference blocked popunder/Monetag scripts or zones
  working = working.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (fullMatch, attrs: string, body: string) => {
    const srcMatch = attrs.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const src = (srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? '').trim();
    const isBlockedSrc = src ? INTRUSIVE_POPUNDER_SCRIPT_SRC_PATTERN.test(src) : false;
    const isBlockedZone = INTRUSIVE_POPUNDER_ZONE_PATTERN.test(attrs);
    const isBlockedInline = INTRUSIVE_INLINE_POPUNDER_PATTERN.test(`${attrs}\n${body}`);

    if (isBlockedSrc || isBlockedZone || isBlockedInline) {
      removedCount += 1;
      return '';
    }
    return fullMatch;
  });

  // 2. Remove Monetag verification <meta name="monetag" ...> tags
  working = working.replace(new RegExp(MONETAG_META_TAG_PATTERN.source, 'gi'), () => {
    removedCount += 1;
    return '';
  });

  // 3. Remove unclosed/self-closing tags referencing blocked domains/zones before line fallback
  if (detectIntrusivePopunderAdCode(working)) {
    working = working.replace(/<(?:script|iframe|img|a|meta)\b[^>]*>/gi, (tag) => {
      if (detectIntrusivePopunderAdCode(tag)) {
        removedCount += 1;
        return '';
      }
      return tag;
    });
  }

  // 4. Also remove bare script-less lines containing blocked domains / zones / popunder loaders
  if (detectIntrusivePopunderAdCode(working)) {
    const filteredLines = working.split('\n').filter((line) => {
      if (detectIntrusivePopunderAdCode(line)) {
        removedCount += 1;
        return false;
      }
      return true;
    });
    working = filteredLines.join('\n');
  }

  const finalCode = trimWhitespace ? working.trim() : working;
  return {
    cleanedCode: finalCode,
    removedCount,
    hadIntrusivePopunder: removedCount > 0 || detectIntrusivePopunderAdCode(rawCode)
  };
};

export const isIntrusivePopunderElement = (el: Element | null | undefined): boolean => {
  if (!el || el.nodeType !== 1) return false;
  const tag = el.tagName?.toUpperCase();
  if (tag === 'META') {
    return (el.getAttribute('name') || '').trim().toLowerCase() === 'monetag';
  }
  if (tag !== 'SCRIPT' && tag !== 'IFRAME') return false;

  const src = el.getAttribute('src')?.trim() || '';
  const dataZone = (el.getAttribute('data-zone') || el.getAttribute('zone') || '').trim();
  const body = el.textContent || '';

  if (src && INTRUSIVE_POPUNDER_SCRIPT_SRC_PATTERN.test(src)) return true;
  if (['313598', '12145119', '12322670', '12321969', '12329910'].includes(dataZone)) return true;
  if (detectIntrusivePopunderAdCode(`${el.outerHTML || ''}\n${body}`)) return true;
  return false;
};

let popunderDomGuardObserver: MutationObserver | null = null;
let popunderDomGuardDocument: Document | null = null;
const executedOverlayScriptKeys = new Set<string>();

export const __resetPopunderGuardAndOverlayCacheForTests = (): void => {
  if (popunderDomGuardObserver) {
    popunderDomGuardObserver.disconnect();
    popunderDomGuardObserver = null;
  }
  popunderDomGuardDocument = null;
  executedOverlayScriptKeys.clear();
};

export const installIntrusivePopunderDomGuard = (): void => {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;

  const purgeExistingPopunders = () => {
    for (const candidate of Array.from(document.querySelectorAll('script, iframe, meta[name="monetag"]'))) {
      if (isIntrusivePopunderElement(candidate)) {
        if (candidate.tagName === 'SCRIPT') {
          candidate.setAttribute('type', 'javascript/blocked');
        }
        candidate.remove();
      }
    }
  };

  purgeExistingPopunders();

  if (popunderDomGuardObserver && popunderDomGuardDocument === document) {
    return;
  }

  if (popunderDomGuardObserver) {
    popunderDomGuardObserver.disconnect();
    popunderDomGuardObserver = null;
  }

  const rootTarget = document.documentElement || document.body;
  if (!rootTarget) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType !== 1) continue;
        const el = node as Element;
        if (isIntrusivePopunderElement(el)) {
          if (el.tagName === 'SCRIPT') {
            el.setAttribute('type', 'javascript/blocked');
          }
          el.remove();
          continue;
        }
        for (const nested of Array.from(el.querySelectorAll('script, iframe, meta[name="monetag"]'))) {
          if (isIntrusivePopunderElement(nested)) {
            if (nested.tagName === 'SCRIPT') {
              nested.setAttribute('type', 'javascript/blocked');
            }
            nested.remove();
          }
        }
      }
    }
  });

  observer.observe(rootTarget, { childList: true, subtree: true });
  popunderDomGuardObserver = observer;
  popunderDomGuardDocument = document;
};

/**
 * Extracts a unique page-level key ONLY for singleton overlay/page-wide injectors.
 * Returns `null` for container-scoped Native Banners, AdSense, Adsterra, or custom HTML slots
 * so multiple container ads continue rendering independently.
 */
export const extractSingletonOverlayKey = (scriptEl: HTMLScriptElement): string | null => {
  const src = scriptEl.getAttribute('src')?.trim() || '';
  const dataZone = (scriptEl.getAttribute('data-zone') || '').trim();
  const body = scriptEl.textContent || '';

  const isKnownOverlaySrc = /(?:multitag|overlay-tag)/i.test(src);
  if (src && isKnownOverlaySrc) {
    return `src:${src}::zone:${dataZone}`;
  }

  const inlineSrcMatch = body.match(/https?:\/\/[^"'\s]+(?:multitag|overlay-tag)/i);
  if (!src && inlineSrcMatch) {
    const inlineZoneMatch = body.match(/(?:dataset\.zone|data-zone|\bzone)\s*[:=]\s*["']?(\d+)["']?/i);
    return `inline:${inlineSrcMatch[0]}::zone:${inlineZoneMatch?.[1] || ''}`;
  }

  return null;
};

export const shouldSkipDuplicateOverlayScript = (scriptEl: HTMLScriptElement): boolean => {
  const key = extractSingletonOverlayKey(scriptEl);
  if (!key) return false;

  if (executedOverlayScriptKeys.has(key)) {
    return true;
  }

  if (typeof document !== 'undefined') {
    const srcPart = key.startsWith('src:')
      ? key.slice(4, key.indexOf('::zone:'))
      : key.startsWith('inline:')
      ? key.slice(7, key.indexOf('::zone:'))
      : '';
    const zonePart = key.split('::zone:')[1] || '';

    if (srcPart) {
      const alreadyLoaded = Array.from(document.querySelectorAll('script[src]')).some((el) => {
        const elSrc = el.getAttribute('src')?.trim() || '';
        const elZone = (el.getAttribute('data-zone') || '').trim();
        return elSrc === srcPart && (!zonePart || !elZone || elZone === zonePart);
      });
      if (alreadyLoaded) {
        executedOverlayScriptKeys.add(key);
        return true;
      }
    }
  }

  executedOverlayScriptKeys.add(key);
  return false;
};

export const clampInArticleParagraph = (
  value: unknown,
  fallback: number
): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(
    IN_ARTICLE_PARAGRAPH_LIMITS.max,
    Math.max(IN_ARTICLE_PARAGRAPH_LIMITS.min, Math.round(parsed))
  );
};

export const clampHomepageInFeedPosition = (
  value: unknown,
  fallback: number
): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(
    HOMEPAGE_IN_FEED_POSITION_LIMITS.max,
    Math.max(HOMEPAGE_IN_FEED_POSITION_LIMITS.min, Math.round(parsed))
  );
};

export const normalizeAdProvider = (raw: unknown): AdProviderId => {
  if (raw === 'hilltopads' || raw === 'adscod' || raw === 'other') {
    return raw;
  }
  if (raw === 'monetag') {
    return 'other';
  }
  return 'hilltopads';
};

export const sanitizeAdConfigText = (
  raw: unknown,
  fallback: string = '',
  maxLen: number = 40
): string => {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
  return cleaned || fallback;
};

export const sanitizeAdCodePayload = (
  raw: unknown,
  trimWhitespace: boolean = true
): string => {
  if (typeof raw !== 'string') return '';
  const { cleanedCode } = stripIntrusivePopunderAdCode(raw, trimWhitespace);
  return cleanedCode;
};

export const sanitizeAdCodeInput = (raw: unknown): string =>
  typeof raw === 'string' ? raw.replace(/\u0000/g, '').slice(0, MAX_AD_CODE_LENGTH) : '';

export const hasRenderableAdCode = (raw: unknown): boolean => {
  const cleaned = sanitizeAdCodePayload(raw, true);
  if (!cleaned) return false;
  const withoutComments = cleaned.replace(/<!--[\s\S]*?-->/g, '').trim();
  return withoutComments.length > 0;
};

export const isSafeAdScriptUrl = (rawUrl: unknown): boolean => {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (/^(javascript|vbscript|data|file):/i.test(trimmed)) return false;
  if (INTRUSIVE_POPUNDER_SCRIPT_SRC_PATTERN.test(trimmed)) return false;
  if (trimmed.startsWith('https://') || trimmed.startsWith('//')) {
    return true;
  }
  return false;
};

export const isSafeDirectLinkUrl = (rawUrl: unknown): boolean => {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 500) return false;
  if (!/^https:\/\/[^\s<>"']+$/i.test(trimmed)) return false;
  if (INTRUSIVE_POPUNDER_SCRIPT_SRC_PATTERN.test(trimmed)) return false;
  if (/[?&](?:zone|z|zoneId)=(?:313598|12145119|12322670|12321969|12329910)\b/i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && parsed.hostname.includes('.');
  } catch {
    return false;
  }
};

export const extractBareSafeDirectLinkUrl = (rawCode: unknown): string | null => {
  if (typeof rawCode !== 'string') return null;
  const trimmed = rawCode.trim();
  if (!trimmed || trimmed.includes('<') || trimmed.includes('>')) return null;
  return isSafeDirectLinkUrl(trimmed) ? trimmed : null;
};

export const isSafeAdAssetOrClickUrl = (rawUrl: unknown): boolean => {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (/^(javascript|vbscript|data:text\/html|file):/i.test(trimmed)) return false;
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//') ||
    (trimmed.startsWith('/') && !trimmed.startsWith('//'))
  ) {
    return true;
  }
  return false;
};

export const normalizeStandardAdSlotConfig = (
  raw?: Partial<AdSlotConfig> | null,
  fallback?: AdSlotConfig,
  trimCode: boolean = true
): AdSlotConfig => {
  const base: AdSlotConfig = fallback || {
    enabled: false,
    type: 'banner',
    code: '',
    imageUrl: '',
    linkUrl: '',
    altText: 'Advertisement',
    label: 'Advertisement'
  };
  if (!raw || typeof raw !== 'object') {
    return { ...base };
  }
  return {
    ...base,
    ...raw,
    code: trimCode ? sanitizeAdCodePayload(raw.code, true) : sanitizeAdCodeInput(raw.code)
  };
};

export const normalizeDisclosureLabel = (
  raw: unknown,
  fallback: 'Advertisement' | 'Sponsored' | 'Kwamamaza' = 'Sponsored'
): 'Advertisement' | 'Sponsored' | 'Kwamamaza' => {
  if (raw === 'Advertisement' || raw === 'Sponsored' || raw === 'Kwamamaza') {
    return raw;
  }
  return fallback;
};

export const normalizeInArticleDirectLinkCardConfig = (
  raw?: Partial<InArticleDirectLinkCardConfig> | null,
  fallbackUrl: string = '',
  fallbackDisclosure: 'Advertisement' | 'Sponsored' | 'Kwamamaza' = 'Sponsored'
): InArticleDirectLinkCardConfig => {
  const defaults = createDefaultInArticleDirectLinkCardConfig();
  const candidateUrl = typeof raw?.directLinkUrl === 'string' ? raw.directLinkUrl.trim() : fallbackUrl;
  const candidateThumb = typeof raw?.thumbnailUrl === 'string' ? raw.thumbnailUrl.trim() : '';

  return {
    directLinkUrl: isSafeDirectLinkUrl(candidateUrl) ? candidateUrl : '',
    headline: sanitizeAdConfigText(raw?.headline, defaults.headline, 120),
    description: sanitizeAdConfigText(raw?.description, defaults.description || '', 240),
    thumbnailUrl:
      candidateThumb && isSafeAdAssetOrClickUrl(candidateThumb) ? candidateThumb.slice(0, 500) : '',
    ctaText: sanitizeAdConfigText(raw?.ctaText, defaults.ctaText, 40),
    disclosureLabel: normalizeDisclosureLabel(raw?.disclosureLabel, fallbackDisclosure)
  };
};

export const isInArticleSlotRenderable = (slot?: Partial<InArticleAdSlotConfig> | null): boolean => {
  if (!slot || !slot.enabled) return false;
  if (slot.adFormat === 'direct_link') {
    const card = slot.directLinkCard;
    return Boolean(
      card &&
        isSafeDirectLinkUrl(card.directLinkUrl) &&
        typeof card.headline === 'string' &&
        card.headline.trim().length > 0 &&
        typeof card.ctaText === 'string' &&
        card.ctaText.trim().length > 0
    );
  }
  // In 'code' mode, reject bare raw URLs so plain links never print as raw text inside articles
  if (extractBareSafeDirectLinkUrl(slot.code)) {
    return false;
  }
  return hasRenderableAdCode(slot.code);
};

export const normalizeInArticleAdSlotConfig = (
  slotKey: InArticleAdSlotKey,
  raw?: Partial<InArticleAdSlotConfig> | null,
  trimCode: boolean = true
): InArticleAdSlotConfig => {
  const defaults = createDefaultInArticleSlotConfig(slotKey);
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const normalizedLabel = sanitizeAdConfigText(raw.label, 'Advertisement', 40);
  const rawCodeNormalized = trimCode
    ? sanitizeAdCodePayload(raw.code, true)
    : sanitizeAdCodeInput(raw.code);
  const bareLegacyDirectUrl = extractBareSafeDirectLinkUrl(rawCodeNormalized);

  const resolvedFormat: InArticleAdFormat =
    raw.adFormat === 'direct_link' || raw.adFormat === 'code'
      ? raw.adFormat
      : bareLegacyDirectUrl
      ? 'direct_link'
      : 'code';

  const disclosureFallback = normalizeDisclosureLabel(normalizedLabel, 'Sponsored');
  const directLinkCard = normalizeInArticleDirectLinkCardConfig(
    raw.directLinkCard,
    bareLegacyDirectUrl || '',
    disclosureFallback
  );

  return {
    enabled: Boolean(raw.enabled),
    provider: normalizeAdProvider(raw.provider),
    providerLabel: sanitizeAdConfigText(raw.providerLabel, '', 40),
    adFormat: resolvedFormat,
    code: rawCodeNormalized,
    directLinkCard,
    afterParagraph: clampInArticleParagraph(
      raw.afterParagraph,
      DEFAULT_IN_ARTICLE_SLOT_PARAGRAPHS[slotKey]
    ),
    mobileEnabled: raw.mobileEnabled !== false,
    desktopEnabled: raw.desktopEnabled !== false,
    label: normalizedLabel,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined
  };
};

export const normalizeInArticleAdsSettings = (
  raw?: Partial<InArticleAdsSettings> | null,
  trimCode: boolean = true
): InArticleAdsSettings => ({
  slot1: normalizeInArticleAdSlotConfig('slot1', raw?.slot1, trimCode),
  slot2: normalizeInArticleAdSlotConfig('slot2', raw?.slot2, trimCode),
  slot3: normalizeInArticleAdSlotConfig('slot3', raw?.slot3, trimCode)
});

export const normalizeHomepageInFeedAdSlotConfig = (
  slotKey: HomepageInFeedAdSlotKey,
  raw?: Partial<HomepageInFeedAdSlotConfig> | null,
  trimCode: boolean = true
): HomepageInFeedAdSlotConfig => {
  const defaults = createDefaultHomepageInFeedSlotConfig(slotKey);
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  return {
    enabled: Boolean(raw.enabled),
    provider: normalizeAdProvider(raw.provider),
    providerLabel: sanitizeAdConfigText(raw.providerLabel, '', 40),
    code: trimCode ? sanitizeAdCodePayload(raw.code, true) : sanitizeAdCodeInput(raw.code),
    afterPost: clampHomepageInFeedPosition(
      raw.afterPost,
      DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS[slotKey]
    ),
    mobileEnabled: raw.mobileEnabled !== false,
    desktopEnabled: raw.desktopEnabled !== false,
    label: sanitizeAdConfigText(raw.label, 'Advertisement', 40),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined
  };
};

export const normalizeHomepageInFeedAdsSettings = (
  raw?: Partial<HomepageInFeedAdsSettings> | null,
  trimCode: boolean = true
): HomepageInFeedAdsSettings => ({
  slot1: normalizeHomepageInFeedAdSlotConfig('slot1', raw?.slot1, trimCode),
  slot2: normalizeHomepageInFeedAdSlotConfig('slot2', raw?.slot2, trimCode),
  slot3: normalizeHomepageInFeedAdSlotConfig('slot3', raw?.slot3, trimCode)
});

export const normalizeGlobalAdScriptConfig = (
  raw?: Partial<GlobalAdScriptConfig> | null,
  trimCode: boolean = true
): GlobalAdScriptConfig => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_GLOBAL_AD_SCRIPT_CONFIG };
  }

  return {
    enabled: Boolean(raw.enabled),
    provider: normalizeAdProvider(raw.provider),
    providerLabel: sanitizeAdConfigText(raw.providerLabel, '', 40),
    code: trimCode ? sanitizeAdCodePayload(raw.code, true) : sanitizeAdCodeInput(raw.code),
    mobileEnabled: raw.mobileEnabled !== false,
    desktopEnabled: raw.desktopEnabled !== false,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined
  };
};

export const normalizeFloatingVideoAdConfig = (
  raw?: Partial<FloatingVideoAdConfig> | null
): FloatingVideoAdConfig => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_FLOATING_VIDEO_AD_CONFIG };
  }
  return {
    enabled: Boolean(raw.enabled),
    provider: 'hilltopads',
    zoneFormat: 'multitag_video_slider',
    scriptUrl: HILLTOPADS_MULTITAG_VIDEO_SLIDER_SCRIPT_SRC,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined
  };
};

export interface AdCodeSnippetAnalysis {
  hasCode: boolean;
  hasMetaTags: boolean;
  hasBareJavaScript: boolean;
  isLikelyGlobalScript: boolean;
  hasUnsafeUrls: boolean;
  hasIntrusivePopunder: boolean;
  needsSerializedQueue: boolean;
  scriptSources: string[];
  metaTags: Array<{ name: string; content: string }>;
  warnings: string[];
}

export const analyzeAdCodeSnippet = (rawCode: string): AdCodeSnippetAnalysis => {
  const hasIntrusivePopunder = detectIntrusivePopunderAdCode(rawCode);
  const code = sanitizeAdCodePayload(rawCode);
  if (!code) {
    return {
      hasCode: false,
      hasMetaTags: false,
      hasBareJavaScript: false,
      isLikelyGlobalScript: false,
      hasUnsafeUrls: false,
      hasIntrusivePopunder,
      needsSerializedQueue: false,
      scriptSources: [],
      metaTags: [],
      warnings: hasIntrusivePopunder
        ? [
            'Intrusive OnClick/Popunder or blocked third-party ad network script detected and automatically removed.'
          ]
        : []
    };
  }

  const scriptSources: string[] = [];
  let hasUnsafeUrls = false;

  const srcAttrRegex = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match: RegExpExecArray | null;
  while ((match = srcAttrRegex.exec(code)) !== null) {
    const val = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (!val) continue;
    scriptSources.push(val);
    if (!isSafeAdScriptUrl(val)) {
      hasUnsafeUrls = true;
    }
  }

  const hrefRegex = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  while ((match = hrefRegex.exec(code)) !== null) {
    const val = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (/^(javascript|vbscript|data:text\/html):/i.test(val)) {
      hasUnsafeUrls = true;
    }
  }

  const metaTags: Array<{ name: string; content: string }> = [];
  const metaTagRegex = /<meta\b([^>]*)>/gi;
  while ((match = metaTagRegex.exec(code)) !== null) {
    const attrs = match[1] || '';
    const nameMatch = attrs.match(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const contentMatch = attrs.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const name = sanitizeAdConfigText(nameMatch?.[1] ?? nameMatch?.[2] ?? nameMatch?.[3] ?? '', '', 80);
    const content = sanitizeAdConfigText(
      contentMatch?.[1] ?? contentMatch?.[2] ?? contentMatch?.[3] ?? '',
      '',
      160
    );
    if (name && content) {
      metaTags.push({ name, content });
    }
  }

  const hasHtmlTags = /<[a-z!/][\s\S]*>/i.test(code);
  const looksLikeJsCode = /\b(?:atOptions|document\.write|function\s*\(|var\s+|const\s+|let\s+|window\.)|\(\s*function\s*\(/.test(
    code
  );
  const hasBareJavaScript = !hasHtmlTags && looksLikeJsCode;

  const hasMetaTags = metaTags.length > 0;
  const isLikelyGlobalScript =
    hasMetaTags ||
    /(multitag|navigator\.serviceWorker|data-zone\s*=)/i.test(
      code
    );
  const needsSerializedQueue = /atOptions\s*=|document\.write/i.test(code);

  const warnings: string[] = [];
  if (hasIntrusivePopunder) {
    warnings.push(
      'Intrusive OnClick/Popunder or blocked third-party ad network script detected and automatically removed.'
    );
  }
  if (hasUnsafeUrls) {
    warnings.push(
      'Contains non-HTTPS or unsafe URL schemes (only https:// and // script/link URLs execute in production containers).'
    );
  }
  if (hasBareJavaScript) {
    warnings.push(
      'This looks like raw JavaScript without <script>...</script> tags. Wrap JavaScript code inside <script>...</script> so browsers execute it instead of displaying it as text.'
    );
  }

  return {
    hasCode: true,
    hasMetaTags,
    hasBareJavaScript,
    isLikelyGlobalScript,
    hasUnsafeUrls,
    hasIntrusivePopunder,
    needsSerializedQueue,
    scriptSources,
    metaTags,
    warnings
  };
};

export const sanitizeStaticAdElement = (el: HTMLElement): void => {
  // Remove inline on* event attributes on static HTML elements
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on')) {
      el.removeAttribute(attr.name);
      continue;
    }
    if ((name === 'href' || name === 'action') && !isSafeAdAssetOrClickUrl(attr.value)) {
      el.removeAttribute(attr.name);
      continue;
    }
    if ((name === 'src' || name === 'data') && !isSafeAdAssetOrClickUrl(attr.value)) {
      el.removeAttribute(attr.name);
    }
  }

  for (const child of Array.from(el.children)) {
    if (child && child.nodeType === 1) {
      sanitizeStaticAdElement(child as HTMLElement);
    }
  }
};

export const getProviderDisplayName = (
  provider: AdProviderId,
  customLabel?: string
): string => {
  if (provider === 'hilltopads') return 'HilltopAds';
  if (provider === 'adscod') return 'Adscod';
  return sanitizeAdConfigText(customLabel, 'Custom Network', 40);
};

export const formatDeviceVisibilitySummary = (
  mobileEnabled: boolean,
  desktopEnabled: boolean
): string => {
  if (mobileEnabled && desktopEnabled) return 'Mobile & Desktop';
  if (mobileEnabled) return 'Mobile Only';
  if (desktopEnabled) return 'Desktop Only';
  return 'Hidden on All Devices';
};

export const normalizeInArticleVastVideoAdConfig = (
  raw?: Partial<InArticleVastVideoAdConfig> | null
): InArticleVastVideoAdConfig => {
  const base: InArticleVastVideoAdConfig = {
    ...DEFAULT_IN_ARTICLE_VAST_VIDEO_AD_CONFIG
  };
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const afterParagraph = clampInArticleParagraph(
    raw.afterParagraph,
    DEFAULT_IN_ARTICLE_VAST_VIDEO_AD_CONFIG.afterParagraph
  );
  const rawSecondParagraph = clampInArticleParagraph(
    raw.secondAfterParagraph,
    DEFAULT_IN_ARTICLE_VAST_VIDEO_AD_CONFIG.secondAfterParagraph
  );
  const secondAfterParagraph = Math.min(
    IN_ARTICLE_PARAGRAPH_LIMITS.max,
    Math.max(afterParagraph + 2, rawSecondParagraph)
  );

  const rawUrl = typeof raw.vastTagUrl === 'string' ? raw.vastTagUrl.trim() : '';
  const vastTagUrl = rawUrl === '' ? '' : isSafeVastHttpsUrl(rawUrl) ? rawUrl : '';

  return {
    enabled: Boolean(raw.enabled),
    provider: 'hilltopads',
    vastTagUrl,
    afterParagraph,
    secondPlacementEnabled: Boolean(raw.secondPlacementEnabled),
    secondAfterParagraph,
    autoplayMuted: raw.autoplayMuted !== false,
    mobileEnabled: raw.mobileEnabled !== false,
    desktopEnabled: raw.desktopEnabled !== false,
    label: sanitizeAdConfigText(
      raw.label,
      DEFAULT_IN_ARTICLE_VAST_VIDEO_AD_CONFIG.label || 'Sponsored Video',
      40
    ),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined
  };
};

import {
  AdProviderId,
  DEFAULT_GLOBAL_AD_SCRIPT_CONFIG,
  DEFAULT_IN_ARTICLE_SLOT_PARAGRAPHS,
  GlobalAdScriptConfig,
  IN_ARTICLE_PARAGRAPH_LIMITS,
  InArticleAdSlotConfig,
  InArticleAdSlotKey,
  InArticleAdsSettings,
  createDefaultInArticleSlotConfig
} from '../types/platform';

export const AD_PROVIDER_OPTIONS: ReadonlyArray<{
  id: AdProviderId;
  label: string;
  description: string;
}> = [
  {
    id: 'monetag',
    label: 'Monetag',
    description: 'Supports Monetag native/in-article snippets, banners, and global Multitag / OnClick / Vignette / In-Page Push tags.'
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

export const AD_DISCLOSURE_LABEL_OPTIONS = ['Advertisement', 'Kwamamaza'] as const;

export const MAX_AD_CODE_LENGTH = 25000;

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

export const normalizeAdProvider = (raw: unknown): AdProviderId => {
  if (raw === 'monetag' || raw === 'adscod' || raw === 'other') {
    return raw;
  }
  return 'monetag';
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
  const cleaned = raw.replace(/\u0000/g, '').slice(0, MAX_AD_CODE_LENGTH);
  return trimWhitespace ? cleaned.trim() : cleaned;
};

export const sanitizeAdCodeInput = (raw: unknown): string =>
  sanitizeAdCodePayload(raw, false);

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
  if (trimmed.startsWith('https://') || trimmed.startsWith('//')) {
    return true;
  }
  return false;
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

export const normalizeInArticleAdSlotConfig = (
  slotKey: InArticleAdSlotKey,
  raw?: Partial<InArticleAdSlotConfig> | null,
  trimCode: boolean = true
): InArticleAdSlotConfig => {
  const defaults = createDefaultInArticleSlotConfig(slotKey);
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  return {
    enabled: Boolean(raw.enabled),
    provider: normalizeAdProvider(raw.provider),
    providerLabel: sanitizeAdConfigText(raw.providerLabel, '', 40),
    code: sanitizeAdCodePayload(raw.code, trimCode),
    afterParagraph: clampInArticleParagraph(
      raw.afterParagraph,
      DEFAULT_IN_ARTICLE_SLOT_PARAGRAPHS[slotKey]
    ),
    mobileEnabled: raw.mobileEnabled !== false,
    desktopEnabled: raw.desktopEnabled !== false,
    label: sanitizeAdConfigText(raw.label, 'Advertisement', 40),
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
    code: sanitizeAdCodePayload(raw.code, trimCode),
    mobileEnabled: raw.mobileEnabled !== false,
    desktopEnabled: raw.desktopEnabled !== false,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined
  };
};

export interface AdCodeSnippetAnalysis {
  hasCode: boolean;
  hasMetaTags: boolean;
  hasBareJavaScript: boolean;
  isLikelyGlobalScript: boolean;
  hasUnsafeUrls: boolean;
  needsSerializedQueue: boolean;
  scriptSources: string[];
  metaTags: Array<{ name: string; content: string }>;
  warnings: string[];
}

export const analyzeAdCodeSnippet = (rawCode: string): AdCodeSnippetAnalysis => {
  const code = sanitizeAdCodePayload(rawCode);
  if (!code) {
    return {
      hasCode: false,
      hasMetaTags: false,
      hasBareJavaScript: false,
      isLikelyGlobalScript: false,
      hasUnsafeUrls: false,
      needsSerializedQueue: false,
      scriptSources: [],
      metaTags: [],
      warnings: []
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
    /(alwingulla|quge5|niphaume|nap5k|in-page-push|vignette|multitag|popunder|navigator\.serviceWorker|sw\.js|data-zone\s*=)/i.test(
      code
    );
  const needsSerializedQueue = /atOptions\s*=|document\.write/i.test(code);

  const warnings: string[] = [];
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
  if (provider === 'monetag') return 'Monetag';
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

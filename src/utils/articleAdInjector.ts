import {
  AdsSettings,
  InArticleAdSlotConfig,
  InArticleAdSlotKey
} from '../types/platform';
import {
  isInArticleSlotRenderable,
  normalizeInArticleAdsSettings
} from './inArticleAdUtils';

export type AdDeviceScope = 'mobile' | 'desktop' | 'all';

export type ArticleRenderSegment =
  | {
      type: 'html';
      key: string;
      html: string;
    }
  | {
      type: 'ad';
      key: string;
      slotId: InArticleAdSlotKey;
      slotConfig: InArticleAdSlotConfig;
    };

export interface ArticleAdInjectionResult {
  segments: ArticleRenderSegment[];
  totalParagraphs: number;
  placedSlots: InArticleAdSlotKey[];
  skippedSlots: Array<{ slotId: InArticleAdSlotKey; reason: string }>;
}

const VOID_HTML_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

const NON_PROSE_ROOT_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'figure',
  'figcaption',
  'ul',
  'ol',
  'li',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'pre',
  'code',
  'iframe',
  'video',
  'audio',
  'picture',
  'img',
  'svg',
  'script',
  'style',
  'hr',
  'aside',
  'nav',
  'header',
  'footer'
]);

const INLINE_STYLE_WRAPPER_TAGS = new Set([
  'span',
  'font',
  'strong',
  'b',
  'i',
  'em',
  'u',
  'small',
  'mark'
]);

const BLOCK_CONTAINER_UNWRAP_TAGS = new Set([
  'div',
  'section',
  'article',
  'main',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  ...INLINE_STYLE_WRAPPER_TAGS
]);

const NESTED_BLOCK_HINT_REGEX =
  /<(p|figure|blockquote|ul|ol|table|iframe|div|section|article|h[1-6])(?=[\s/>])/i;

function splitSingleLevelHtmlBlocks(html: string): string[] {
  if (!html || typeof html !== 'string') return [];

  const blocks: string[] = [];
  const stack: string[] = [];
  let blockStart = 0;
  let i = 0;
  const len = html.length;

  while (i < len) {
    if (html[i] !== '<') {
      i++;
      continue;
    }

    // HTML comment <!-- ... -->
    if (html.startsWith('<!--', i)) {
      const commentEnd = html.indexOf('-->', i + 4);
      const nextPos = commentEnd === -1 ? len : commentEnd + 3;
      if (stack.length === 0) {
        const leadingText = html.slice(blockStart, i);
        if (leadingText.trim()) {
          blocks.push(leadingText);
        }
        blocks.push(html.slice(i, nextPos));
        blockStart = nextPos;
      }
      i = nextPos;
      continue;
    }

    // Find tag closing `>` respecting quoted attribute values
    let quote: '"' | "'" | null = null;
    let tagEnd = -1;
    for (let j = i + 1; j < len; j++) {
      const ch = html[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '>') {
        tagEnd = j;
        break;
      }
    }

    if (tagEnd === -1) {
      break;
    }

    const rawTagBody = html.slice(i + 1, tagEnd).trim();
    const isClosing = rawTagBody.startsWith('/');
    const isSelfClosing = rawTagBody.endsWith('/') || rawTagBody.startsWith('!');
    const nameMatch = rawTagBody.replace(/^\/+/, '').match(/^([a-zA-Z][a-zA-Z0-9:-]*)/);
    const tagName = nameMatch ? nameMatch[1].toLowerCase() : '';

    if (!tagName) {
      i = tagEnd + 1;
      continue;
    }

    if (!isClosing) {
      if (stack.length === 0 && i > blockStart) {
        const textBeforeTag = html.slice(blockStart, i);
        if (textBeforeTag.trim()) {
          blocks.push(textBeforeTag);
        }
        blockStart = i;
      }

      if (!isSelfClosing && !VOID_HTML_TAGS.has(tagName)) {
        stack.push(tagName);
      } else if (stack.length === 0) {
        blocks.push(html.slice(i, tagEnd + 1));
        blockStart = tagEnd + 1;
      }
    } else if (stack.length > 0) {
      // Unwind matching tag cleanly even if an inner tag was unclosed
      let matchIdx = -1;
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k] === tagName) {
          matchIdx = k;
          break;
        }
      }
      if (matchIdx !== -1) {
        stack.length = matchIdx;
        if (stack.length === 0) {
          blocks.push(html.slice(blockStart, tagEnd + 1));
          blockStart = tagEnd + 1;
        }
      }
    }

    i = tagEnd + 1;
  }

  if (blockStart < len) {
    const tail = html.slice(blockStart);
    if (tail.trim()) {
      blocks.push(tail);
    }
  }

  return blocks;
}

const getTopLevelTagName = (blockHtml: string): string | null => {
  const match = blockHtml.trim().match(/^<([a-zA-Z][a-zA-Z0-9:-]*)(?=[\s/>])/);
  return match ? match[1].toLowerCase() : null;
};

function expandWrapperBlock(block: string, depth: number = 0): string[] {
  if (depth >= 6) return [block];
  const trimmed = block.trim();
  const tagName = getTopLevelTagName(trimmed);
  if (!tagName || !BLOCK_CONTAINER_UNWRAP_TAGS.has(tagName)) {
    return [block];
  }

  const openEndIdx = trimmed.indexOf('>');
  if (openEndIdx === -1) return [block];
  const openTag = trimmed.slice(0, openEndIdx + 1);
  const closeSuffixMatch = trimmed.match(new RegExp(`<\\/${tagName}\\s*>$`, 'i'));
  const hasExplicitClose = Boolean(closeSuffixMatch);
  const closeTag = hasExplicitClose ? closeSuffixMatch![0] : `</${tagName}>`;
  const innerHtml = hasExplicitClose
    ? trimmed.slice(openEndIdx + 1, trimmed.length - closeTag.length)
    : trimmed.slice(openEndIdx + 1);

  if (!NESTED_BLOCK_HINT_REGEX.test(innerHtml)) {
    return [block];
  }

  const children = splitSingleLevelHtmlBlocks(innerHtml);
  if (children.length === 0) {
    return [block];
  }

  const expanded: string[] = [];
  const isInlineWrapper = INLINE_STYLE_WRAPPER_TAGS.has(tagName);
  const isHeadingWrapper = /^h[1-6]$/.test(tagName);

  for (const child of children) {
    const childTag = getTopLevelTagName(child);
    if (isInlineWrapper && childTag) {
      // Expand nested child blocks first, then preserve inline span/font styling cleanly around each piece
      const innerExpanded = expandWrapperBlock(child, depth + 1);
      for (const piece of innerExpanded) {
        expanded.push(`${openTag}${piece}${closeTag}`);
      }
    } else if (isHeadingWrapper && !childTag) {
      expanded.push(`${openTag}${child}${closeTag}`);
    } else {
      expanded.push(...expandWrapperBlock(child, depth + 1));
    }
  }

  return expanded;
}

/**
 * Splits HTML cleanly into balanced top-level blocks without breaking nested elements,
 * figures, captions, blockquotes, lists, headings, or inline markup, while automatically
 * unwrapping outer editor containers (`<h1>`, `<div>`, `<span>`) that wrap full `<p>` blocks.
 */
export function splitTopLevelHtmlBlocks(html: string): string[] {
  const initialBlocks = splitSingleLevelHtmlBlocks(html);
  const result: string[] = [];
  for (const block of initialBlocks) {
    result.push(...expandWrapperBlock(block, 0));
  }
  return result;
}

const stripHtmlForParagraphCheck = (blockHtml: string): string =>
  blockHtml
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const unwrapInlineWrapperToInnerTag = (blockHtml: string): { tag: string | null; html: string } => {
  let current = blockHtml.trim();
  for (let i = 0; i < 4; i++) {
    const tag = getTopLevelTagName(current);
    if (!tag || !INLINE_STYLE_WRAPPER_TAGS.has(tag)) {
      return { tag, html: current };
    }
    const openEnd = current.indexOf('>');
    const closeMatch = current.match(new RegExp(`<\\/${tag}\\s*>$`, 'i'));
    if (openEnd === -1 || !closeMatch) {
      return { tag, html: current };
    }
    current = current.slice(openEnd + 1, current.length - closeMatch[0].length).trim();
  }
  return { tag: getTopLevelTagName(current), html: current };
};

/**
 * Determines whether a top-level HTML block is a genuine reading paragraph.
 * Strictly excludes headings, figures, captions, images, lists, blockquotes, embeds,
 * and empty/spacer lines.
 */
export function isQualifyingContentParagraphBlock(
  blockHtml: string,
  allowDivFallback: boolean = false
): boolean {
  const { tag: tagName, html: effectiveHtml } = unwrapInlineWrapperToInnerTag(blockHtml);
  if (!tagName || NON_PROSE_ROOT_TAGS.has(tagName)) {
    return false;
  }

  const isParagraphTag = tagName === 'p';
  const isFallbackDiv = allowDivFallback && tagName === 'div';
  if (!isParagraphTag && !isFallbackDiv) {
    return false;
  }

  // Never split inside wrapper blocks that contain nested structural/media sections
  if (
    isFallbackDiv &&
    /<(h[1-6]|figure|figcaption|ul|ol|blockquote|table|pre|iframe|video|audio|p)\b/i.test(effectiveHtml)
  ) {
    return false;
  }

  const plainText = stripHtmlForParagraphCheck(effectiveHtml);
  if (!plainText) {
    return false;
  }

  // Exclude image/embed-only paragraphs wrapping <img ... /> without real prose
  const hasMediaTag = /<(img|figure|iframe|video|audio|svg)\b/i.test(effectiveHtml);
  if (hasMediaTag && plainText.length < 20) {
    return false;
  }

  const wordCount = plainText.split(' ').filter(Boolean).length;
  return plainText.length >= 10 || wordCount >= 2;
}

export function getQualifyingParagraphBlockIndices(blocks: string[]): number[] {
  const pIndices: number[] = [];
  blocks.forEach((block, index) => {
    if (isQualifyingContentParagraphBlock(block, false)) {
      pIndices.push(index);
    }
  });

  if (pIndices.length >= 2) {
    return pIndices;
  }

  // Fallback for legacy articles pasted as top-level <div> text blocks instead of <p>
  const pOrDivIndices: number[] = [];
  blocks.forEach((block, index) => {
    if (isQualifyingContentParagraphBlock(block, true)) {
      pOrDivIndices.push(index);
    }
  });

  return pOrDivIndices.length > pIndices.length ? pOrDivIndices : pIndices;
}

export function countArticleContentParagraphs(html: string): number {
  const blocks = splitTopLevelHtmlBlocks(html);
  return getQualifyingParagraphBlockIndices(blocks).length;
}

const SLOT_ORDER: InArticleAdSlotKey[] = ['slot1', 'slot2', 'slot3'];

const isSlotAllowedOnDevice = (
  slot: InArticleAdSlotConfig,
  deviceType: AdDeviceScope
): boolean => {
  if (deviceType === 'mobile') return slot.mobileEnabled;
  if (deviceType === 'desktop') return slot.desktopEnabled;
  return slot.mobileEnabled || slot.desktopEnabled;
};

/**
 * Dynamically inserts enabled In-Article Ad Slots 1, 2, 3 at safe block boundaries
 * during DOM rendering WITHOUT modifying stored article HTML or SEO metadata.
 */
export function buildArticleRenderSegments(params: {
  html: string;
  adsSettings?: Partial<AdsSettings> | null;
  deviceType?: AdDeviceScope;
}): ArticleAdInjectionResult {
  const { html, adsSettings, deviceType = 'all' } = params;
  const blocks = splitTopLevelHtmlBlocks(html);

  if (blocks.length === 0) {
    return {
      segments: html ? [{ type: 'html', key: 'html-0', html }] : [],
      totalParagraphs: 0,
      placedSlots: [],
      skippedSlots: []
    };
  }

  const paragraphBlockIndices = getQualifyingParagraphBlockIndices(blocks);
  const totalParagraphs = paragraphBlockIndices.length;

  if (!adsSettings?.masterEnabled) {
    return {
      segments: [{ type: 'html', key: 'html-all', html }],
      totalParagraphs,
      placedSlots: [],
      skippedSlots: []
    };
  }

  const inArticleAds = normalizeInArticleAdsSettings(adsSettings.inArticleAds);
  const skippedSlots: Array<{ slotId: InArticleAdSlotKey; reason: string }> = [];

  const activeCandidates = SLOT_ORDER.map((slotId, orderIndex) => ({
    slotId,
    orderIndex,
    config: inArticleAds[slotId]
  })).filter((item) => {
    if (!isInArticleSlotRenderable(item.config)) {
      return false;
    }
    if (!isSlotAllowedOnDevice(item.config, deviceType)) {
      skippedSlots.push({ slotId: item.slotId, reason: 'device_disabled' });
      return false;
    }
    return true;
  });

  if (activeCandidates.length === 0) {
    return {
      segments: [{ type: 'html', key: 'html-all', html }],
      totalParagraphs,
      placedSlots: [],
      skippedSlots
    };
  }

  // Order slots by configured paragraph number so spacing rules remain consistent
  activeCandidates.sort((a, b) => {
    if (a.config.afterParagraph !== b.config.afterParagraph) {
      return a.config.afterParagraph - b.config.afterParagraph;
    }
    return a.orderIndex - b.orderIndex;
  });

  const blockIndexToSlot = new Map<
    number,
    { slotId: InArticleAdSlotKey; config: InArticleAdSlotConfig }
  >();
  const placedSlots: InArticleAdSlotKey[] = [];
  let lastPlacedAfterParagraph: number | null = null;

  for (const candidate of activeCandidates) {
    const targetParagraph = candidate.config.afterParagraph;

    // Short-article guard: must have at least 1 real content paragraph BEFORE and AFTER the ad
    if (totalParagraphs < 2 || targetParagraph >= totalParagraphs) {
      skippedSlots.push({
        slotId: candidate.slotId,
        reason: 'article_too_short_for_position'
      });
      continue;
    }

    // Anti-crowding guard: prevent two ads from appearing adjacent at the same boundary
    if (lastPlacedAfterParagraph !== null && targetParagraph <= lastPlacedAfterParagraph) {
      skippedSlots.push({
        slotId: candidate.slotId,
        reason: 'adjacent_ad_prevented'
      });
      continue;
    }

    const blockIndex = paragraphBlockIndices[targetParagraph - 1];
    if (blockIndex === undefined || blockIndexToSlot.has(blockIndex)) {
      skippedSlots.push({
        slotId: candidate.slotId,
        reason: 'adjacent_ad_prevented'
      });
      continue;
    }

    blockIndexToSlot.set(blockIndex, {
      slotId: candidate.slotId,
      config: candidate.config
    });
    placedSlots.push(candidate.slotId);
    lastPlacedAfterParagraph = targetParagraph;
  }

  if (blockIndexToSlot.size === 0) {
    return {
      segments: [{ type: 'html', key: 'html-all', html }],
      totalParagraphs,
      placedSlots: [],
      skippedSlots
    };
  }

  const segments: ArticleRenderSegment[] = [];
  let htmlBuffer = '';

  const flushHtmlBuffer = (suffix: string) => {
    if (htmlBuffer.trim()) {
      segments.push({
        type: 'html',
        key: `html-${suffix}`,
        html: htmlBuffer
      });
    }
    htmlBuffer = '';
  };

  blocks.forEach((block, index) => {
    htmlBuffer += block;
    const slotMatch = blockIndexToSlot.get(index);
    if (slotMatch) {
      flushHtmlBuffer(`before-${slotMatch.slotId}-${index}`);
      segments.push({
        type: 'ad',
        key: `ad-${slotMatch.slotId}-p${slotMatch.config.afterParagraph}`,
        slotId: slotMatch.slotId,
        slotConfig: slotMatch.config
      });
    }
  });

  flushHtmlBuffer('tail');

  return {
    segments,
    totalParagraphs,
    placedSlots,
    skippedSlots
  };
}

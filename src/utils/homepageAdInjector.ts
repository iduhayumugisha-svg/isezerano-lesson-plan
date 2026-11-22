import {
  AdsSettings,
  DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS,
  HomepageInFeedAdSlotConfig,
  HomepageInFeedAdSlotKey
} from '../types/platform';
import {
  clampHomepageInFeedPosition,
  hasRenderableAdCode,
  normalizeHomepageInFeedAdsSettings
} from './inArticleAdUtils';

export const HOMEPAGE_IN_FEED_SLOT_KEYS: ReadonlyArray<HomepageInFeedAdSlotKey> = [
  'slot1',
  'slot2',
  'slot3'
];

export type HomepageFeedDeviceType = 'mobile' | 'desktop';

export interface HomepageInFeedPlacementItem {
  slotId: HomepageInFeedAdSlotKey;
  slotConfig: HomepageInFeedAdSlotConfig;
  afterPost: number;
}

export interface HomepageInFeedSkippedSlot {
  slotId: HomepageInFeedAdSlotKey;
  afterPost: number;
  reason:
    | 'master_disabled'
    | 'no_posts'
    | 'slot_disabled'
    | 'empty_or_blocked_code'
    | 'device_hidden'
    | 'beyond_post_count'
    | 'adjacent_ad_prevented';
}

export interface HomepageInFeedPlan {
  totalPosts: number;
  placementsByPosition: Record<number, HomepageInFeedPlacementItem>;
  placedSlots: HomepageInFeedAdSlotKey[];
  skippedSlots: HomepageInFeedSkippedSlot[];
}

export function buildHomepageAdPlan(params: {
  totalPosts: number;
  adsSettings: AdsSettings | null | undefined;
  deviceType: HomepageFeedDeviceType;
}): HomepageInFeedPlan {
  const { totalPosts, adsSettings, deviceType } = params;
  const safeTotal = Math.max(0, Math.floor(totalPosts || 0));
  const feedAds = normalizeHomepageInFeedAdsSettings(adsSettings?.homepageInFeedAds);
  const skippedSlots: HomepageInFeedSkippedSlot[] = [];
  const placementsByPosition: Record<number, HomepageInFeedPlacementItem> = {};
  const placedSlots: HomepageInFeedAdSlotKey[] = [];

  if (!adsSettings?.masterEnabled || safeTotal === 0) {
    const reason = !adsSettings?.masterEnabled ? 'master_disabled' : 'no_posts';
    for (const slotKey of HOMEPAGE_IN_FEED_SLOT_KEYS) {
      skippedSlots.push({
        slotId: slotKey,
        afterPost: feedAds[slotKey].afterPost,
        reason
      });
    }
    return {
      totalPosts: safeTotal,
      placementsByPosition,
      placedSlots,
      skippedSlots
    };
  }

  const eligible: Array<{
    slotId: HomepageInFeedAdSlotKey;
    orderIdx: number;
    afterPost: number;
    config: HomepageInFeedAdSlotConfig;
  }> = [];

  HOMEPAGE_IN_FEED_SLOT_KEYS.forEach((slotKey, orderIdx) => {
    const cfg = feedAds[slotKey];
    const targetPost = clampHomepageInFeedPosition(
      cfg.afterPost,
      DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS[slotKey]
    );

    if (!cfg.enabled) {
      skippedSlots.push({ slotId: slotKey, afterPost: targetPost, reason: 'slot_disabled' });
      return;
    }

    if (!hasRenderableAdCode(cfg.code)) {
      skippedSlots.push({
        slotId: slotKey,
        afterPost: targetPost,
        reason: 'empty_or_blocked_code'
      });
      return;
    }

    const visibleOnDevice = deviceType === 'mobile' ? cfg.mobileEnabled : cfg.desktopEnabled;
    if (!visibleOnDevice) {
      skippedSlots.push({ slotId: slotKey, afterPost: targetPost, reason: 'device_hidden' });
      return;
    }

    if (targetPost > safeTotal) {
      skippedSlots.push({
        slotId: slotKey,
        afterPost: targetPost,
        reason: 'beyond_post_count'
      });
      return;
    }

    eligible.push({
      slotId: slotKey,
      orderIdx,
      afterPost: targetPost,
      config: { ...cfg, afterPost: targetPost }
    });
  });

  eligible.sort((a, b) => a.afterPost - b.afterPost || a.orderIdx - b.orderIdx);

  const usedPositions = new Set<number>();
  for (const item of eligible) {
    if (usedPositions.has(item.afterPost)) {
      skippedSlots.push({
        slotId: item.slotId,
        afterPost: item.afterPost,
        reason: 'adjacent_ad_prevented'
      });
      continue;
    }
    usedPositions.add(item.afterPost);
    placementsByPosition[item.afterPost] = {
      slotId: item.slotId,
      slotConfig: item.config,
      afterPost: item.afterPost
    };
    placedSlots.push(item.slotId);
  }

  return {
    totalPosts: safeTotal,
    placementsByPosition,
    placedSlots,
    skippedSlots
  };
}

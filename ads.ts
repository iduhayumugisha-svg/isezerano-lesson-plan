export type AdPlacement = 'below_header' | 'above_footer';
export type AdType = 'code' | 'banner';

export interface AdSlotConfig {
  enabled: boolean;
  type: AdType;
  code: string; // HTML, Script snippet, Google AdSense
  imageUrl?: string;
  linkUrl?: string;
  altText?: string;
  label?: string; // e.g. "Advertisement" or "Sponsored"
}

export interface AdsSettings {
  masterEnabled: boolean; // Master toggle: false by default
  belowHeaderAd: AdSlotConfig;
  aboveFooterAd: AdSlotConfig;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_ADS_SETTINGS: AdsSettings = {
  masterEnabled: false, // Disabled by default as requested
  belowHeaderAd: {
    enabled: false,
    type: 'banner',
    code: '',
    imageUrl: '',
    linkUrl: '',
    altText: 'Advertisement',
    label: 'Advertisement'
  },
  aboveFooterAd: {
    enabled: false,
    type: 'banner',
    code: '',
    imageUrl: '',
    linkUrl: '',
    altText: 'Advertisement',
    label: 'Advertisement'
  }
};

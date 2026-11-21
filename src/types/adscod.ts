export const ADSCOD_WORKER_URL = 'https://isezerano-adscod.twizerefelix90.workers.dev';
export const ADSCOD_DWELL_ENDPOINT = 'https://api.adscod.com/api/v1/dwell';

export const ADSCOD_PLACEMENTS = {
  banner: {
    key: 'banner',
    placementId: 'fa638e17-ebc6-465c-b3da-7fc78d1cde4c',
    workerParam: 'banner',
    label: 'Banner Placement (Below Header)'
  },
  inline: {
    key: 'inline',
    placementId: '59311ecd-3e34-45e9-8e2c-4d94e01b4ee4',
    workerParam: 'inline',
    label: 'Inline Placement (Feed & Articles)'
  }
} as const;

export type AdscodPlacementKey = keyof typeof ADSCOD_PLACEMENTS;

export interface AdscodAd {
  campaignId?: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  clickUrl: string;
  clickToken?: string;
  cpcUsd?: string;
  cpmRateUsd?: string;
  matchContext?: string;
  adPrice?: string;
  adCompareAtPrice?: string;
  adCurrency?: string;
  brandName?: string;
  brandLogoUrl?: string;
  brandVerified?: boolean;
}

export interface AdscodServeResponse {
  success?: boolean;
  ads?: AdscodAd[];
  error?: string;
}

export type AdscodFillState = 'loading' | 'filled' | 'no-fill' | 'error';

export interface AdscodFetchResult {
  ok: boolean;
  status: number;
  placement: AdscodPlacementKey;
  placementId: string;
  requestUrl: string;
  ad: AdscodAd | null;
  state: Exclude<AdscodFillState, 'loading'>;
  error?: string;
}

export interface AdscodDwellStatus {
  placement: AdscodPlacementKey;
  placementId: string;
  hasClickToken: boolean;
  state: 'idle' | 'observing' | 'flushed' | 'no-token' | 'unsupported';
  accumulatedMs: number;
  reportedMs: number;
  transport?: 'sendBeacon' | 'fetch';
  lastFlushedAt?: string;
}

export interface AdscodPlacementDiagnostic {
  placement: AdscodPlacementKey;
  placementId: string;
  requestUrl: string;
  httpStatus: number;
  state: AdscodFillState;
  campaignId?: string;
  title?: string;
  brandName?: string;
  clickUrlHost?: string;
  hasClickToken: boolean;
  error?: string;
  checkedAt: string;
  dwell?: AdscodDwellStatus;
}

export interface AdscodDiagnosticsSnapshot {
  workerUrl: string;
  dwellEndpoint: string;
  currentOrigin: string;
  isProductionOrigin: boolean;
  placements: Record<AdscodPlacementKey, AdscodPlacementDiagnostic | null>;
}

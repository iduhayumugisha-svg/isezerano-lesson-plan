import { MiniShopProduct } from '../types/platform';
import { cleanPhoneInput, validateAndNormalizeWhatsAppNumber } from './whatsappUtils';

export const MINI_SHOP_TITLE_MAX = 90;
export const MINI_SHOP_DESCRIPTION_MAX = 200;
export const MINI_SHOP_PRICE_MAX = 40;

export interface MiniShopPhoneValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export interface MiniShopProductValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: {
    title: string;
    description: string;
    price?: string;
    imageUrl: string;
    whatsappNumber?: string;
    phoneNumber?: string;
  };
}

/**
 * Collapses repeated whitespace and removes control characters.
 */
export const sanitizeMiniShopText = (value: string, maxLen: number): string => {
  const cleaned = (value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, maxLen);
};

/**
 * Validates an optional telephone number for direct `tel:` calling.
 * Accepts international (`+250...`) or local (`078...`) formats with spaces/dashes.
 * Never invents or substitutes a default phone number.
 */
export const validateMiniShopTelephoneNumber = (rawInput: string): MiniShopPhoneValidationResult => {
  const cleaned = cleanPhoneInput(rawInput);
  if (!cleaned) {
    return { valid: true, normalized: '' };
  }

  if (!/^\+?\d+$/.test(cleaned)) {
    return {
      valid: false,
      normalized: '',
      error: 'Telephone number can only contain digits, spaces, brackets, dashes, and an optional leading +.'
    };
  }

  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return {
      valid: false,
      normalized: '',
      error: 'Telephone number must contain between 7 and 15 digits.'
    };
  }

  return {
    valid: true,
    normalized: cleaned.startsWith('+') ? `+${digits}` : digits
  };
};

/**
 * Validates an optional WhatsApp number using E.164 international format (`+250...`)
 * so `https://wa.me/...` links always open cleanly. Never invents a fallback number.
 */
export const validateMiniShopWhatsApp = (rawInput: string): MiniShopPhoneValidationResult => {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }
  const check = validateAndNormalizeWhatsAppNumber(trimmed);
  if (!check.valid) {
    return {
      valid: false,
      normalized: '',
      error: check.error || 'Enter a valid WhatsApp number with country code (e.g. +25078...).'
    };
  }
  return {
    valid: true,
    normalized: check.normalized
  };
};

/**
 * Validates an entire Mini Shop product submission before persistence.
 */
export const validateMiniShopProductInput = (input: {
  title: string;
  description: string;
  price?: string;
  imageUrl: string;
  whatsappNumber?: string;
  phoneNumber?: string;
}): MiniShopProductValidationResult => {
  const title = sanitizeMiniShopText(input.title, MINI_SHOP_TITLE_MAX);
  if (title.length < 2) {
    return {
      valid: false,
      error: 'Product title must be at least 2 characters.'
    };
  }

  const description = sanitizeMiniShopText(input.description, MINI_SHOP_DESCRIPTION_MAX);
  if (description.length < 2) {
    return {
      valid: false,
      error: 'Short product description must be at least 2 characters.'
    };
  }

  const rawPrice = sanitizeMiniShopText(input.price || '', MINI_SHOP_PRICE_MAX);
  const imageUrl = (input.imageUrl || '').trim();
  if (!imageUrl) {
    return {
      valid: false,
      error: 'Please upload or select a product image.'
    };
  }
  if (!/^(https?:\/\/|data:image\/)/i.test(imageUrl)) {
    return {
      valid: false,
      error: 'Product image must be a valid uploaded image.'
    };
  }

  const waCheck = validateMiniShopWhatsApp(input.whatsappNumber || '');
  if (!waCheck.valid) {
    return {
      valid: false,
      error: waCheck.error
    };
  }

  const phoneCheck = validateMiniShopTelephoneNumber(input.phoneNumber || '');
  if (!phoneCheck.valid) {
    return {
      valid: false,
      error: phoneCheck.error
    };
  }

  if (!waCheck.normalized && !phoneCheck.normalized) {
    return {
      valid: false,
      error: 'Provide at least a Seller WhatsApp number or a Seller Telephone number.'
    };
  }

  return {
    valid: true,
    sanitized: {
      title,
      description,
      price: rawPrice || undefined,
      imageUrl,
      whatsappNumber: waCheck.normalized || undefined,
      phoneNumber: phoneCheck.normalized || undefined
    }
  };
};

/**
 * Builds a clean WhatsApp inquiry URL pre-filled with the product name.
 * Returns empty string if no valid WhatsApp number was configured.
 */
export const buildMiniShopWhatsAppUrl = (
  whatsappNumber: string | undefined,
  productTitle: string
): string => {
  if (!whatsappNumber) return '';
  const check = validateAndNormalizeWhatsAppNumber(whatsappNumber);
  if (!check.valid || !check.waMeDigits) return '';
  const cleanTitle = sanitizeMiniShopText(productTitle, MINI_SHOP_TITLE_MAX) || 'igicuruzwa';
  const message = `Muraho, ndifuza kumenya amakuru y'igicuruzwa: ${cleanTitle}.`;
  return `https://wa.me/${check.waMeDigits}?text=${encodeURIComponent(message)}`;
};

/**
 * Builds a clean `tel:` link strictly from the configured seller phone number.
 * Returns empty string if no valid telephone number was configured.
 */
export const buildMiniShopTelHref = (phoneNumber: string | undefined): string => {
  if (!phoneNumber) return '';
  const check = validateMiniShopTelephoneNumber(phoneNumber);
  if (!check.valid || !check.normalized) return '';
  return `tel:${check.normalized}`;
};

/**
 * Deterministic ordering of Mini Shop products by Admin `displayOrder`.
 */
export const sortMiniShopProducts = (products: MiniShopProduct[]): MiniShopProduct[] => {
  return [...products].sort((a, b) => {
    const orderA = typeof a.displayOrder === 'number' && Number.isFinite(a.displayOrder) ? a.displayOrder : 9999;
    const orderB = typeof b.displayOrder === 'number' && Number.isFinite(b.displayOrder) ? b.displayOrder : 9999;
    if (orderA !== orderB) return orderA - orderB;
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return (a.id || '').localeCompare(b.id || '');
  });
};

/**
 * Returns only active products in configured display order.
 */
export const filterActiveMiniShopProducts = (products: MiniShopProduct[]): MiniShopProduct[] => {
  return sortMiniShopProducts(products.filter((item) => item && item.active === true));
};

/**
 * Cycles cleanly to the next product index, wrapping back to 0 at the end.
 */
export const getNextMiniShopProductIndex = (currentIndex: number, totalCount: number): number => {
  if (totalCount <= 1) return 0;
  const safeCurrent = currentIndex >= 0 && currentIndex < totalCount ? currentIndex : 0;
  return (safeCurrent + 1) % totalCount;
};

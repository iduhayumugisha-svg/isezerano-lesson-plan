/**
 * Scrolls the natural document window back to the top on page/article navigation.
 */
export function scrollMainContentToTop(behavior: ScrollBehavior = 'auto'): void {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior });
}

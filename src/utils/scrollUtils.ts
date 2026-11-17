export const MAIN_SCROLL_CONTAINER_ID = 'main-scroll-container';

/**
 * Scrolls the shared independently scrollable main content region back to the top,
 * falling back to window.scrollTo when rendered standalone without the app shell.
 */
export function scrollMainContentToTop(behavior: ScrollBehavior = 'auto'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const container = document.getElementById(MAIN_SCROLL_CONTAINER_ID);
  if (container) {
    if (behavior === 'auto') {
      container.scrollTop = 0;
    } else if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top: 0, behavior });
    } else {
      container.scrollTop = 0;
    }
    return;
  }
  window.scrollTo({ top: 0, behavior });
}

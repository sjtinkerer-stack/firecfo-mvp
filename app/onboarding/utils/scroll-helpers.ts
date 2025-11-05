/**
 * Scroll Helper Utilities for Onboarding Form
 * Handles smart scrolling behavior with accessibility considerations
 */

/**
 * Checks if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Calculates optimal scroll block position based on viewport height
 * @param elementHeight - Height of the element to scroll to
 * @returns ScrollLogicalPosition - 'start', 'center', or 'end'
 */
export function getOptimalScrollBlock(elementHeight?: number): ScrollLogicalPosition {
  if (typeof window === 'undefined') return 'center';

  const viewportHeight = window.innerHeight;

  // On small screens (mobile), prefer 'start' to maximize content visibility
  if (viewportHeight < 600) {
    return 'start';
  }

  // If element is very tall relative to viewport, use 'start'
  if (elementHeight && elementHeight > viewportHeight * 0.7) {
    return 'start';
  }

  // Default: center positioning for best context
  return 'center';
}

/**
 * Smoothly scrolls an element into view with accessibility and UX considerations
 * @param element - The DOM element to scroll to
 * @param options - Optional scroll configuration
 */
export function scrollToElement(
  element: HTMLElement | null,
  options: {
    block?: ScrollLogicalPosition;
    delay?: number;
    force?: boolean; // Force scroll even if element is already visible
  } = {}
) {
  if (!element) return;

  const {
    block = getOptimalScrollBlock(element.offsetHeight),
    delay = 0,
    force = false,
  } = options;

  // Check if element is already in viewport (unless force is true)
  if (!force && isElementInViewport(element)) {
    return;
  }

  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';

  const scrollFn = () => {
    element.scrollIntoView({
      behavior,
      block,
      inline: 'nearest',
    });
  };

  if (delay > 0) {
    setTimeout(scrollFn, delay);
  } else {
    scrollFn();
  }
}

/**
 * Checks if an element is currently visible in the viewport
 * @param element - The DOM element to check
 * @param threshold - Percentage of element that must be visible (0-1)
 */
export function isElementInViewport(
  element: HTMLElement,
  threshold: number = 0.5
): boolean {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  const vertInView = rect.top <= windowHeight && rect.top + rect.height * threshold >= 0;
  const horInView = rect.left <= windowWidth && rect.left + rect.width >= 0;

  return vertInView && horInView;
}

/**
 * Scrolls to a specific position on the page
 * @param position - 'top', 'bottom', or number (pixel value)
 * @param options - Optional scroll configuration
 */
export function scrollToPosition(
  position: 'top' | 'bottom' | number,
  options: { smooth?: boolean; delay?: number } = {}
) {
  const { smooth = true, delay = 0 } = options;
  const behavior = (smooth && !prefersReducedMotion()) ? 'smooth' : 'auto';

  const scrollFn = () => {
    if (position === 'top') {
      window.scrollTo({ top: 0, behavior });
    } else if (position === 'bottom') {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior
      });
    } else {
      window.scrollTo({ top: position, behavior });
    }
  };

  if (delay > 0) {
    setTimeout(scrollFn, delay);
  } else {
    scrollFn();
  }
}

/**
 * Determines if auto-scroll should occur on component mount
 * Prevents scroll if user is actively interacting with the page
 */
export function shouldScrollOnMount(): boolean {
  if (typeof window === 'undefined') return false;

  // Don't scroll if an input is currently focused (keyboard might be open)
  const activeElement = document.activeElement;
  if (
    activeElement &&
    (activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT')
  ) {
    return false;
  }

  return true;
}

/**
 * Gets the best scroll target element within a container
 * Useful for finding the actual question content vs wrapper divs
 */
export function getScrollTarget(
  containerRef: React.RefObject<HTMLElement>,
  selector?: string
): HTMLElement | null {
  if (!containerRef.current) return null;

  if (selector) {
    return containerRef.current.querySelector(selector);
  }

  return containerRef.current;
}

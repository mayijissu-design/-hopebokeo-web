/**
 * Navigation & Scroll Restoration State Manager
 * Ensures that refreshing the web app or navigating between pages does not
 * cause the application to auto-redirect to 'home', and preserves the user's
 * current view, filters, and exact scroll position.
 */

export type AppTab = 'home' | 'dashboard' | 'about' | 'church-portal' | 'admin';

export const VALID_TABS: readonly AppTab[] = [
  'home',
  'dashboard',
  'about',
  'church-portal',
  'admin',
] as const;

export const TAB_ALIASES: Record<string, { tab: AppTab; adminFeature?: string }> = {
  finance: { tab: 'admin', adminFeature: 'finance' },
  settings: { tab: 'admin', adminFeature: 'settings' },
  church_update: { tab: 'admin', adminFeature: 'church_update' },
  'church-update': { tab: 'admin', adminFeature: 'church_update' },
  church: { tab: 'church-portal' },
  churches: { tab: 'church-portal' },
  insights: { tab: 'dashboard' },
  hub: { tab: 'admin', adminFeature: 'hub' },
  admin: { tab: 'admin', adminFeature: 'hub' },
};

export const STORAGE_KEY_ACTIVE_TAB = 'hb_active_tab';
export const STORAGE_KEY_ADMIN_FEATURE = 'hb_admin_feature';
export const STORAGE_KEY_SCROLL_PREFIX = 'hb_scroll_tab_';
export const STORAGE_KEY_LAST_SCROLL = 'hb_last_scroll_y';

/**
 * Normalizes any string into a valid AppTab or alias
 */
export function normalizeTab(input: string | null | undefined): { tab: AppTab; adminFeature?: string } | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase().replace(/^[#/]+/, '').split(/[?&]/)[0];
  if (!clean) return null;

  if (TAB_ALIASES[clean]) {
    return TAB_ALIASES[clean];
  }

  if (VALID_TABS.includes(clean as AppTab)) {
    return {
      tab: clean as AppTab,
      adminFeature: clean === 'admin' ? 'hub' : undefined,
    };
  }

  return null;
}

/**
 * Resolves the initial active tab on page load/refresh.
 * Always defaults to 'home' (ໜ້າຫຼັກ) on opening as explicitly requested:
 * "ເມື່ອເປີດເວບແຕ່ລະເທື່ອມັນຕ້ອງຢູ່ໜ້າຫຼັກ ບໍ່ແມ່ນໜ້າຂໍ້ມູນ"
 * Only honors explicit URL queries (?tab=...) or hashes (#...) for direct links.
 */
export function getInitialActiveTab(): AppTab {
  try {
    if (typeof window !== 'undefined' && window.location) {
      // 1. Explicit Query Params (?tab=... or ?page=...)
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') || urlParams.get('page') || urlParams.get('view');
      const resolvedFromParam = normalizeTab(tabParam);
      if (resolvedFromParam) {
        if (resolvedFromParam.adminFeature) {
          try {
            sessionStorage.setItem(STORAGE_KEY_ADMIN_FEATURE, resolvedFromParam.adminFeature);
            localStorage.setItem(STORAGE_KEY_ADMIN_FEATURE, resolvedFromParam.adminFeature);
          } catch {}
        }
        return resolvedFromParam.tab;
      }

      // 2. Explicit Hash (#admin, #about, #church-portal, etc.)
      const hash = window.location.hash.replace(/^#/, '');
      const resolvedFromHash = normalizeTab(hash);
      if (resolvedFromHash) {
        if (resolvedFromHash.adminFeature) {
          try {
            sessionStorage.setItem(STORAGE_KEY_ADMIN_FEATURE, resolvedFromHash.adminFeature);
            localStorage.setItem(STORAGE_KEY_ADMIN_FEATURE, resolvedFromHash.adminFeature);
          } catch {}
        }
        return resolvedFromHash.tab;
      }

      // 3. Explicit Pathname sub-route (/admin, /about, etc., ignoring root /)
      const pathSegment = window.location.pathname.replace(/^\//, '').split('/')[0];
      if (pathSegment && pathSegment !== 'home' && pathSegment !== 'index.html') {
        const resolvedFromPath = normalizeTab(pathSegment);
        if (resolvedFromPath) {
          return resolvedFromPath.tab;
        }
      }
    }
  } catch (err) {
    console.warn('Could not resolve initial active tab:', err);
  }

  // Strictly default to 'home' (ໜ້າຫຼັກ)
  return 'home';
}

/**
 * Persists the active tab in storage and history
 */
export function persistActiveTab(tab: string, pushToHistory = false): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY_ACTIVE_TAB, tab);
      if (tab === 'admin') {
        sessionStorage.setItem(STORAGE_KEY_ADMIN_FEATURE, 'hub');
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, tab);
      if (tab === 'admin') {
        localStorage.removeItem(STORAGE_KEY_ADMIN_FEATURE);
      }
    }
    if (typeof window !== 'undefined' && window.history) {
      const targetHash = `#${tab}`;
      if (window.location.hash !== targetHash) {
        if (pushToHistory) {
          window.history.pushState({ tab }, '', targetHash);
        } else {
          window.history.replaceState({ tab }, '', targetHash);
        }
      }
    }
  } catch (err) {
    console.warn('Could not persist active tab:', err);
  }
}

// ---- SCROLL RESTORATION MANAGEMENT ----

let isUserManuallyScrolling = false;

/**
 * Initializes listeners to disable native browser scroll fighting
 * and track if the user starts manually scrolling.
 */
export function initScrollRestoration(): () => void {
  if (typeof window === 'undefined') return () => {};

  if ('scrollRestoration' in window.history) {
    try {
      window.history.scrollRestoration = 'manual';
    } catch {}
  }

  const onUserInteraction = () => {
    isUserManuallyScrolling = true;
  };

  window.addEventListener('wheel', onUserInteraction, { passive: true });
  window.addEventListener('touchmove', onUserInteraction, { passive: true });
  window.addEventListener('keydown', onUserInteraction, { passive: true });

  return () => {
    window.removeEventListener('wheel', onUserInteraction);
    window.removeEventListener('touchmove', onUserInteraction);
    window.removeEventListener('keydown', onUserInteraction);
  };
}

/**
 * Saves current scroll position for a specific tab
 */
export function saveCurrentTabScroll(tab: string): void {
  if (typeof window === 'undefined') return;
  try {
    const scrollY = Math.round(window.scrollY || document.documentElement.scrollTop || 0);
    sessionStorage.setItem(`${STORAGE_KEY_SCROLL_PREFIX}${tab}`, String(scrollY));
    sessionStorage.setItem(STORAGE_KEY_LAST_SCROLL, String(scrollY));
  } catch {}
}

/**
 * Gets saved scroll position for a specific tab
 */
export function getSavedTabScroll(tab: string): number {
  if (typeof sessionStorage === 'undefined') return 0;
  try {
    const val = sessionStorage.getItem(`${STORAGE_KEY_SCROLL_PREFIX}${tab}`);
    if (val !== null) {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 0 ? num : 0;
    }
    const lastGlobal = sessionStorage.getItem(STORAGE_KEY_LAST_SCROLL);
    if (lastGlobal !== null) {
      const num = parseInt(lastGlobal, 10);
      return !isNaN(num) && num >= 0 ? num : 0;
    }
  } catch {}
  return 0;
}

/**
 * Smoothly restores scroll position, with retries as React loads content
 */
export function restoreScrollPosition(targetY: number, maxAttempts = 6): () => void {
  if (typeof window === 'undefined' || targetY <= 0) {
    return () => {};
  }

  isUserManuallyScrolling = false;
  let attempts = 0;
  let timerId: any = null;

  const tryRestore = () => {
    if (isUserManuallyScrolling) {
      return;
    }

    window.scrollTo({
      top: targetY,
      behavior: 'instant' as ScrollBehavior,
    });

    attempts++;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    // If page content is not yet tall enough to accommodate targetY, retry after slight delay
    if (attempts < maxAttempts && scrollHeight - clientHeight < targetY * 0.9) {
      timerId = setTimeout(tryRestore, attempts * 50);
    }
  };

  requestAnimationFrame(tryRestore);

  return () => {
    if (timerId) clearTimeout(timerId);
  };
}

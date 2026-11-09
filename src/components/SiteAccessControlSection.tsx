import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Globe,
  Link2,
  Copy,
  Check,
  KeyRound,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';
import { HomePoster, Language } from '../types';

const ACCESS_SESSION_KEY = 'hb_site_session_unlocked_key';
const ACCESS_SESSION_LINK_KEY = 'hb_site_session_unlocked_link';
const SITE_ACCESS_CONFIG_STORAGE_KEY = 'hb_site_access_config';
const SITE_ACCESS_COOKIE_NAME = 'hb_site_access_cfg';

export const DEFAULT_SITE_ACCESS_KEY = 'hb2026';
export const DEFAULT_CUSTOM_LINK_SLUG = 'hopebokeo-prv';

export interface StoredSiteAccessConfig {
  siteAccessMode: 'link_only' | 'public';
  siteAccessKey: string;
  siteCustomShareUrl: string;
  updatedAt: string;
}

const RESERVED_TAB_NAMES = new Set([
  '',
  'index.html',
  'home',
  'insights',
  'dashboard',
  'about',
  'settings',
  'admin',
  'church-portal',
  'church',
  'churches',
  'church_update',
  'church-update',
  'finance',
  'hub',
]);

// Capture the exact initial landing URL before any router/tab effect modifies window.location
const INITIAL_LANDING_PATH =
  typeof window !== 'undefined' ? window.location.pathname : '';
const INITIAL_LANDING_SEARCH =
  typeof window !== 'undefined' ? window.location.search : '';
const INITIAL_LANDING_HASH =
  typeof window !== 'undefined' ? window.location.hash : '';

function isSearchEngineBot(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || '').toLowerCase();
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot/i.test(
    ua
  );
}

export function getSiteBaseOrigin(): string {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    !window.location.hostname.includes('run.app') &&
    window.location.hostname !== 'localhost'
  ) {
    return window.location.origin;
  }
  return 'https://hopebokeo.org';
}

/**
 * Extracts a clean custom link slug (without domain and without any passcode)
 * from any user input or stored URL.
 * Also rescues typos like `https://hopebokeo-prv.org/?key=hb2026` -> `hopebokeo-prv`.
 */
export function extractCustomLinkSlug(
  rawUrlOrSlug?: string,
  currentPasscode?: string
): string {
  if (!rawUrlOrSlug || typeof rawUrlOrSlug !== 'string') return '';
  const trimmed = rawUrlOrSlug.trim();
  if (!trimmed) return '';

  const passLower = (currentPasscode || '').trim().toLowerCase();

  // If it starts with http:// or https://, parse it carefully
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      let pathSlug = decodeURIComponent(parsed.pathname.replace(/^\/+|\/+$/g, '').trim());

      // Check if user accidentally edited the domain name itself (e.g., hopebokeo-prv.org)
      const host = parsed.hostname.toLowerCase();
      let domainCustomization = '';
      if (
        host !== 'hopebokeo.org' &&
        host !== 'www.hopebokeo.org' &&
        host !== 'localhost' &&
        !host.includes('run.app') &&
        !host.includes('netlify.app') &&
        !host.includes('vercel.app')
      ) {
        domainCustomization = host.replace(/\.(org|com|net|la|info)$/i, '');
      }

      if (pathSlug && !RESERVED_TAB_NAMES.has(pathSlug.toLowerCase())) {
        if (passLower && pathSlug.toLowerCase() === passLower) {
          return domainCustomization || DEFAULT_CUSTOM_LINK_SLUG;
        }
        return pathSlug;
      }

      // Check query params (excluding ?key=passcode)
      for (const [k, v] of parsed.searchParams.entries()) {
        const cleanV = v.trim();
        const cleanK = k.trim();
        if (k.toLowerCase() === 'key') continue; // Never use ?key=passcode as the link slug
        if (
          cleanV &&
          !RESERVED_TAB_NAMES.has(cleanV.toLowerCase()) &&
          cleanV.toLowerCase() !== passLower
        ) {
          return cleanV;
        }
        if (
          cleanK &&
          !RESERVED_TAB_NAMES.has(cleanK.toLowerCase()) &&
          cleanK.toLowerCase() !== passLower
        ) {
          return cleanK;
        }
      }

      // Check hash
      const cleanHash = parsed.hash.replace(/^#+/, '').trim();
      if (
        cleanHash &&
        !RESERVED_TAB_NAMES.has(cleanHash.toLowerCase()) &&
        cleanHash.toLowerCase() !== passLower
      ) {
        return cleanHash;
      }

      if (domainCustomization) {
        return domainCustomization;
      }

      return '';
    } catch {
      return '';
    }
  }

  // Otherwise treat as a direct slug or relative path
  const withoutOrigin = trimmed
    .replace(/^[a-z0-9.-]+\.(org|com|net|la)\/?/i, '')
    .split('?')[0]
    .replace(/^[/#]+|[/#]+$/g, '')
    .trim();

  if (
    !withoutOrigin ||
    RESERVED_TAB_NAMES.has(withoutOrigin.toLowerCase()) ||
    (passLower && withoutOrigin.toLowerCase() === passLower)
  ) {
    return '';
  }

  return withoutOrigin;
}

/**
 * Builds the full shareable URL from a custom slug without ever including the passcode.
 */
export function buildCleanCustomShareUrl(
  rawUrlOrSlug?: string,
  currentPasscode?: string,
  baseOrigin?: string
): string {
  const origin = (baseOrigin || getSiteBaseOrigin()).replace(/\/+$/, '');
  const slug =
    extractCustomLinkSlug(rawUrlOrSlug, currentPasscode) || DEFAULT_CUSTOM_LINK_SLUG;
  const cleanSlug = slug.replace(/^\/+/, '');
  return `${origin}/${cleanSlug}`;
}

function readCookieConfig(): StoredSiteAccessConfig | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${SITE_ACCESS_COOKIE_NAME}=`));
    if (!match) return null;
    const raw = decodeURIComponent(match.split('=').slice(1).join('='));
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.siteAccessKey === 'string' && parsed.siteAccessKey.trim()) {
      const key = parsed.siteAccessKey.trim();
      return {
        siteAccessMode: parsed.siteAccessMode === 'public' ? 'public' : 'link_only',
        siteAccessKey: key,
        siteCustomShareUrl: buildCleanCustomShareUrl(parsed.siteCustomShareUrl, key),
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      };
    }
  } catch {}
  return null;
}

export function getStoredSiteAccessConfig(): StoredSiteAccessConfig | null {
  let localCfg: StoredSiteAccessConfig | null = null;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(SITE_ACCESS_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.siteAccessKey === 'string' && parsed.siteAccessKey.trim()) {
          const key = parsed.siteAccessKey.trim();
          localCfg = {
            siteAccessMode: parsed.siteAccessMode === 'public' ? 'public' : 'link_only',
            siteAccessKey: key,
            siteCustomShareUrl: buildCleanCustomShareUrl(parsed.siteCustomShareUrl, key),
            updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
          };
        }
      }
    } catch {}
  }

  const cookieCfg = readCookieConfig();
  if (localCfg && cookieCfg) {
    const lTime = Date.parse(localCfg.updatedAt || '') || 0;
    const cTime = Date.parse(cookieCfg.updatedAt || '') || 0;
    return cTime > lTime ? cookieCfg : localCfg;
  }
  return localCfg || cookieCfg;
}

export function saveStoredSiteAccessConfig(config: StoredSiteAccessConfig): void {
  const cleanKey = (config.siteAccessKey || '').trim() || DEFAULT_SITE_ACCESS_KEY;
  const cleanUrl = buildCleanCustomShareUrl(config.siteCustomShareUrl, cleanKey);
  const clean: StoredSiteAccessConfig = {
    siteAccessMode: config.siteAccessMode === 'public' ? 'public' : 'link_only',
    siteAccessKey: cleanKey,
    siteCustomShareUrl: cleanUrl,
    updatedAt: config.updatedAt || new Date().toISOString(),
  };

  if (typeof document !== 'undefined') {
    try {
      const encoded = encodeURIComponent(JSON.stringify(clean));
      document.cookie = `${SITE_ACCESS_COOKIE_NAME}=${encoded}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SITE_ACCESS_CONFIG_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      try {
        localStorage.removeItem('hb_cached_events');
        localStorage.setItem(SITE_ACCESS_CONFIG_STORAGE_KEY, JSON.stringify(clean));
      } catch {}
    }

    try {
      const cachedPosterRaw = localStorage.getItem('hb_cached_home_poster');
      if (cachedPosterRaw) {
        const parsedPoster = JSON.parse(cachedPosterRaw);
        if (parsedPoster && typeof parsedPoster === 'object') {
          const updatedPoster = {
            ...parsedPoster,
            siteAccessMode: clean.siteAccessMode,
            siteAccessKey: clean.siteAccessKey,
            siteCustomShareUrl: clean.siteCustomShareUrl,
            updatedAt: clean.updatedAt,
          };
          localStorage.setItem('hb_cached_home_poster', JSON.stringify(updatedPoster));
        }
      }
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hb_site_access_updated', { detail: clean }));
  }
}

export function resolveEffectiveSiteAccessConfig(homePoster?: HomePoster): StoredSiteAccessConfig {
  const stored = getStoredSiteAccessConfig();
  const posterHasKey = Boolean(
    homePoster?.siteAccessKey &&
      typeof homePoster.siteAccessKey === 'string' &&
      homePoster.siteAccessKey.trim()
  );

  if (stored && posterHasKey) {
    const sTime = Date.parse(stored.updatedAt || '') || 0;
    const pTime = Date.parse(homePoster?.updatedAt || '') || 0;
    if (sTime >= pTime) {
      return stored;
    }
    const pKey = homePoster!.siteAccessKey!.trim();
    return {
      siteAccessMode: homePoster?.siteAccessMode === 'public' ? 'public' : 'link_only',
      siteAccessKey: pKey,
      siteCustomShareUrl: buildCleanCustomShareUrl(
        homePoster?.siteCustomShareUrl || stored.siteCustomShareUrl,
        pKey
      ),
      updatedAt: homePoster?.updatedAt || stored.updatedAt,
    };
  }

  if (stored) {
    return stored;
  }

  if (posterHasKey) {
    const pKey = homePoster!.siteAccessKey!.trim();
    return {
      siteAccessMode: homePoster?.siteAccessMode === 'public' ? 'public' : 'link_only',
      siteAccessKey: pKey,
      siteCustomShareUrl: buildCleanCustomShareUrl(homePoster?.siteCustomShareUrl, pKey),
      updatedAt: homePoster?.updatedAt || '',
    };
  }

  return {
    siteAccessMode: homePoster?.siteAccessMode === 'public' ? 'public' : 'link_only',
    siteAccessKey: DEFAULT_SITE_ACCESS_KEY,
    siteCustomShareUrl: buildCleanCustomShareUrl(
      homePoster?.siteCustomShareUrl,
      DEFAULT_SITE_ACCESS_KEY
    ),
    updatedAt: homePoster?.updatedAt || '',
  };
}

/**
 * Checks if the visitor entered the website via the Custom Invite Link (`siteCustomShareUrl`).
 * Visitors entering via the custom invite link bypass the passcode screen automatically.
 * Visitors entering the main website directly (e.g., `/`) must enter the passcode.
 */
function doesVisitorUrlMatchCustomLink(
  customShareUrl: string,
  currentPasscode: string
): boolean {
  if (typeof window === 'undefined') return false;
  const expectedSlug = extractCustomLinkSlug(customShareUrl, currentPasscode);
  if (!expectedSlug) return false;
  const targetLower = expectedSlug.trim().toLowerCase();

  try {
    // 1. Check both initial landing pathname and current pathname (e.g. /hopebokeo-prv or /prv)
    const candidatePaths = [
      INITIAL_LANDING_PATH,
      window.location.pathname,
    ];
    for (const rawPath of candidatePaths) {
      const cleanPath = decodeURIComponent((rawPath || '').replace(/^\/+|\/+$/g, '').trim());
      if (
        cleanPath &&
        !RESERVED_TAB_NAMES.has(cleanPath.toLowerCase()) &&
        cleanPath.toLowerCase() === targetLower
      ) {
        return true;
      }
    }

    // 2. Check query parameters (?invite=..., ?link=..., or ?<slug>)
    const candidateSearches = [
      INITIAL_LANDING_SEARCH,
      window.location.search,
    ];
    for (const rawSearch of candidateSearches) {
      if (!rawSearch) continue;
      const searchParams = new URLSearchParams(rawSearch);
      for (const [k, v] of searchParams.entries()) {
        if (
          v.trim().toLowerCase() === targetLower ||
          k.trim().toLowerCase() === targetLower
        ) {
          return true;
        }
      }
    }

    // 3. Check hash (e.g. #hopebokeo-prv)
    const candidateHashes = [
      INITIAL_LANDING_HASH,
      window.location.hash,
    ];
    for (const rawH of candidateHashes) {
      const cleanHash = decodeURIComponent((rawH || '').replace(/^#+/, '').trim());
      if (
        cleanHash &&
        !RESERVED_TAB_NAMES.has(cleanHash.toLowerCase()) &&
        cleanHash.toLowerCase() === targetLower
      ) {
        return true;
      }
    }
  } catch {}
  return false;
}

function cleanCustomLinkFromAddressBar(expectedSlug: string): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    let modified = false;

    const currentPath = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, '').trim());
    if (
      currentPath &&
      !RESERVED_TAB_NAMES.has(currentPath.toLowerCase()) &&
      currentPath.toLowerCase() === expectedSlug.trim().toLowerCase()
    ) {
      url.pathname = '/';
      modified = true;
    }

    ['key', 'invite', 'access', 'token', 'link'].forEach((param) => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        modified = true;
      }
    });

    if (modified) {
      window.history.replaceState(
        window.history.state,
        document.title,
        url.pathname + url.search + url.hash
      );
    }
  } catch {}
}

function syncRobotsMetaTags(mode: 'link_only' | 'public'): void {
  if (typeof document === 'undefined') return;
  const content =
    mode === 'public'
      ? 'index, follow'
      : 'noindex, nofollow, noarchive, nosnippet, noimageindex, nocache, notranslate';

  const names = ['robots', 'googlebot', 'bingbot'];
  names.forEach((name) => {
    let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  });
}

function doesPasscodeStrictlyMatch(input: string, expectedKey: string): boolean {
  const cleanInput = (input || '').trim();
  const cleanExpected = (expectedKey || '').trim();
  if (!cleanInput || !cleanExpected) return false;
  return cleanInput === cleanExpected;
}

interface SiteAccessGateProps {
  homePoster?: HomePoster;
  language: Language;
  children: React.ReactNode;
}

export const SiteAccessGate: React.FC<SiteAccessGateProps> = ({
  homePoster,
  language,
  children,
}) => {
  const [effectiveConfig, setEffectiveConfig] = useState<StoredSiteAccessConfig>(() =>
    resolveEffectiveSiteAccessConfig(homePoster)
  );

  useEffect(() => {
    const next = resolveEffectiveSiteAccessConfig(homePoster);
    setEffectiveConfig(next);
  }, [
    homePoster?.siteAccessMode,
    homePoster?.siteAccessKey,
    homePoster?.siteCustomShareUrl,
    homePoster?.updatedAt,
  ]);

  useEffect(() => {
    const handleConfigUpdated = (e: Event) => {
      const detail = (e as CustomEvent<StoredSiteAccessConfig>).detail;
      if (detail && detail.siteAccessKey) {
        setEffectiveConfig(detail);
      } else {
        setEffectiveConfig(resolveEffectiveSiteAccessConfig(homePoster));
      }
    };
    window.addEventListener('hb_site_access_updated', handleConfigUpdated);
    return () => window.removeEventListener('hb_site_access_updated', handleConfigUpdated);
  }, [homePoster]);

  const accessMode = effectiveConfig.siteAccessMode;
  const expectedKey = (effectiveConfig.siteAccessKey || DEFAULT_SITE_ACCESS_KEY).trim();
  const customShareUrl = effectiveConfig.siteCustomShareUrl;
  const customSlug =
    extractCustomLinkSlug(customShareUrl, expectedKey) || DEFAULT_CUSTOM_LINK_SLUG;

  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Clear legacy persistent token so the lock screen is strictly enforced
  useEffect(() => {
    try {
      localStorage.removeItem('hb_site_access_token');
    } catch {}
  }, []);

  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    if (isSearchEngineBot()) return false;

    // 1. Entered via the Custom Share Link -> Enter immediately without passcode!
    if (doesVisitorUrlMatchCustomLink(customShareUrl, expectedKey)) {
      try {
        sessionStorage.setItem(ACCESS_SESSION_LINK_KEY, customSlug);
      } catch {}
      cleanCustomLinkFromAddressBar(customSlug);
      return true;
    }

    // 2. Check existing session unlocked via Custom Link or Passcode
    try {
      const savedLinkSlug = sessionStorage.getItem(ACCESS_SESSION_LINK_KEY);
      if (
        savedLinkSlug &&
        savedLinkSlug.trim().toLowerCase() === customSlug.trim().toLowerCase()
      ) {
        return true;
      }
      const savedKey = sessionStorage.getItem(ACCESS_SESSION_KEY);
      if (savedKey && doesPasscodeStrictlyMatch(savedKey, expectedKey)) {
        return true;
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    syncRobotsMetaTags(accessMode);
  }, [accessMode]);

  useEffect(() => {
    const handleLockNow = () => {
      try {
        sessionStorage.removeItem(ACCESS_SESSION_KEY);
        sessionStorage.removeItem(ACCESS_SESSION_LINK_KEY);
      } catch {}
      setInputKey('');
      setErrorMsg('');
      setIsAuthorized(false);
    };
    window.addEventListener('hb_preview_lock_screen', handleLockNow);
    return () => window.removeEventListener('hb_preview_lock_screen', handleLockNow);
  }, []);

  useEffect(() => {
    if (isSearchEngineBot()) {
      setIsAuthorized(false);
      return;
    }
    if (doesVisitorUrlMatchCustomLink(customShareUrl, expectedKey)) {
      try {
        sessionStorage.setItem(ACCESS_SESSION_LINK_KEY, customSlug);
      } catch {}
      cleanCustomLinkFromAddressBar(customSlug);
      setIsAuthorized(true);
      return;
    }
    try {
      const savedLinkSlug = sessionStorage.getItem(ACCESS_SESSION_LINK_KEY);
      if (
        savedLinkSlug &&
        savedLinkSlug.trim().toLowerCase() === customSlug.trim().toLowerCase()
      ) {
        setIsAuthorized(true);
        return;
      }
      const savedKey = sessionStorage.getItem(ACCESS_SESSION_KEY);
      if (savedKey && doesPasscodeStrictlyMatch(savedKey, expectedKey)) {
        setIsAuthorized(true);
        return;
      }
    } catch {}
    setIsAuthorized(false);
  }, [expectedKey, customShareUrl, customSlug]);

  if (accessMode === 'public') {
    return <>{children}</>;
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const latestConfig = resolveEffectiveSiteAccessConfig(homePoster);
    const activeExpectedKey = (
      latestConfig.siteAccessKey ||
      expectedKey ||
      DEFAULT_SITE_ACCESS_KEY
    ).trim();

    if (doesPasscodeStrictlyMatch(inputKey, activeExpectedKey)) {
      try {
        sessionStorage.setItem(ACCESS_SESSION_KEY, activeExpectedKey);
      } catch {}
      setIsAuthorized(true);
      setErrorMsg('');
    } else {
      setErrorMsg(
        language === 'lo'
          ? 'ລະຫັດບໍ່ຖືກຕ້ອງ'
          : language === 'th'
          ? 'รหัสไม่ถูกต้อง'
          : 'Invalid passcode'
      );
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
      <div className="relative z-10 w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-5">
        <div className="w-12 h-12 rounded-xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-black text-white">
            {language === 'lo'
              ? 'ກະລຸນາປ້ອນລະຫັດເຂົ້າເວັບໄຊ'
              : language === 'th'
              ? 'กรุณาป้อนรหัสเข้าเว็บไซต์'
              : 'Enter Access Passcode'}
          </h1>
          <p className="text-xs text-slate-400">
            {language === 'lo'
              ? 'ເວັບໄຊສ່ວນຕົວ — ກະລຸນາປ້ອນລະຫັດເພື່ອເຂົ້າສູ່ເວັບໄຊ'
              : 'Private website — Please enter passcode to access'}
          </p>
        </div>

        <form onSubmit={handleUnlockSubmit} className="space-y-3 text-left">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder={language === 'lo' ? 'ປ້ອນລະຫັດ...' : 'Passcode...'}
              autoFocus
              className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-xl px-3.5 py-2.5 pr-10 text-sm font-mono font-bold text-white placeholder-slate-500 outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-red-400 text-center">{errorMsg}</p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-[#cc0000] hover:bg-red-700 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>{language === 'lo' ? 'ເຂົ້າສູ່ເວັບໄຊ' : 'Unlock'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

interface SiteAccessSettingsBannerProps {
  homePoster?: HomePoster;
  onSaveHomePoster?: (poster: HomePoster) => Promise<void>;
  language: Language;
}

export const SiteAccessSettingsBanner: React.FC<SiteAccessSettingsBannerProps> = ({
  homePoster,
  onSaveHomePoster,
  language,
}) => {
  const defaultOrigin = getSiteBaseOrigin();
  const initialEffective = resolveEffectiveSiteAccessConfig(homePoster);

  const [currentMode, setCurrentMode] = useState<'link_only' | 'public'>(
    initialEffective.siteAccessMode
  );
  const [customKey, setCustomKey] = useState<string>(initialEffective.siteAccessKey);
  const [customSlug, setCustomSlug] = useState<string>(() =>
    extractCustomLinkSlug(
      initialEffective.siteCustomShareUrl,
      initialEffective.siteAccessKey
    ) || DEFAULT_CUSTOM_LINK_SLUG
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const isTypingRef = useRef(false);

  useEffect(() => {
    if (isTypingRef.current) return;
    const eff = resolveEffectiveSiteAccessConfig(homePoster);
    setCurrentMode(eff.siteAccessMode);
    setCustomKey(eff.siteAccessKey);
    setCustomSlug(
      extractCustomLinkSlug(eff.siteCustomShareUrl, eff.siteAccessKey) ||
        DEFAULT_CUSTOM_LINK_SLUG
    );
  }, [
    homePoster?.siteAccessMode,
    homePoster?.siteAccessKey,
    homePoster?.siteCustomShareUrl,
    homePoster?.updatedAt,
  ]);

  const persistAccessSettingsEverywhere = async (
    nextMode: 'link_only' | 'public',
    nextKeyRaw: string,
    nextSlugRaw: string,
    showFeedback = true
  ) => {
    const cleanKey = nextKeyRaw.trim() || DEFAULT_SITE_ACCESS_KEY;
    const cleanSlug =
      extractCustomLinkSlug(nextSlugRaw, cleanKey) ||
      nextSlugRaw.trim().replace(/^[/#?]+|[/#?]+$/g, '') ||
      DEFAULT_CUSTOM_LINK_SLUG;
    const cleanFullUrl = `${defaultOrigin.replace(/\/+$/, '')}/${cleanSlug}`;
    const nowIso = new Date().toISOString();

    if (showFeedback) setIsSaving(true);

    try {
      // 1. Immediately persist to localStorage + cookie + broadcast event
      saveStoredSiteAccessConfig({
        siteAccessMode: nextMode,
        siteAccessKey: cleanKey,
        siteCustomShareUrl: cleanFullUrl,
        updatedAt: nowIso,
      });

      // 2. Keep current admin tab unlocked while editing in Settings
      try {
        sessionStorage.setItem(ACCESS_SESSION_KEY, cleanKey);
        sessionStorage.setItem(ACCESS_SESSION_LINK_KEY, cleanSlug);
      } catch {}

      syncRobotsMetaTags(nextMode);

      // 3. Persist to backend globalSettings as a lightweight backup
      fetch('/api/save-global-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteAccessMode: nextMode,
          siteAccessKey: cleanKey,
          siteCustomShareUrl: cleanFullUrl,
          updatedAt: nowIso,
        }),
      }).catch(() => {});

      // 4. Persist to homePoster (server ledger + Firestore)
      if (onSaveHomePoster && homePoster) {
        await onSaveHomePoster({
          ...homePoster,
          siteAccessMode: nextMode,
          siteAccessKey: cleanKey,
          siteCustomShareUrl: cleanFullUrl,
          updatedAt: nowIso,
        });
      }

      if (showFeedback) {
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
      }
    } finally {
      if (showFeedback) setIsSaving(false);
    }
  };

  // Changing the Passcode ONLY updates the Passcode — NEVER modifies or appears in the Link box!
  const handleKeyChange = (val: string) => {
    isTypingRef.current = true;
    setCustomKey(val);
    const trimmedKey = val.trim();
    if (trimmedKey) {
      const cleanSlug = customSlug.trim() || DEFAULT_CUSTOM_LINK_SLUG;
      const cleanFullUrl = `${defaultOrigin.replace(/\/+$/, '')}/${cleanSlug}`;
      saveStoredSiteAccessConfig({
        siteAccessMode: currentMode,
        siteAccessKey: trimmedKey,
        siteCustomShareUrl: cleanFullUrl,
        updatedAt: new Date().toISOString(),
      });
      try {
        sessionStorage.setItem(ACCESS_SESSION_KEY, trimmedKey);
      } catch {}
    }
    setTimeout(() => {
      isTypingRef.current = false;
    }, 800);
  };

  // Changing the Custom Link ONLY updates the Custom Link — NEVER modifies the Passcode box!
  const handleSlugChange = (val: string) => {
    isTypingRef.current = true;
    // If user pasted a full URL (e.g. https://hopebokeo.org/my-link or https://hopebokeo-prv.org), extract just the custom slug
    const cleaned = /^https?:\/\//i.test(val.trim())
      ? extractCustomLinkSlug(val, customKey)
      : val.replace(/^\/+/, '').replace(/\s+/g, '-');
    setCustomSlug(cleaned);

    const activeSlug = cleaned.trim() || DEFAULT_CUSTOM_LINK_SLUG;
    const cleanKey = customKey.trim() || DEFAULT_SITE_ACCESS_KEY;
    const cleanFullUrl = `${defaultOrigin.replace(/\/+$/, '')}/${activeSlug}`;

    saveStoredSiteAccessConfig({
      siteAccessMode: currentMode,
      siteAccessKey: cleanKey,
      siteCustomShareUrl: cleanFullUrl,
      updatedAt: new Date().toISOString(),
    });
    try {
      sessionStorage.setItem(ACCESS_SESSION_LINK_KEY, activeSlug);
    } catch {}

    setTimeout(() => {
      isTypingRef.current = false;
    }, 800);
  };

  const handleToggleMode = async () => {
    const nextMode: 'link_only' | 'public' =
      currentMode === 'link_only' ? 'public' : 'link_only';
    setCurrentMode(nextMode);
    await persistAccessSettingsEverywhere(nextMode, customKey, customSlug, true);
  };

  const handleLockNowClick = async () => {
    const cleanKey = customKey.trim() || DEFAULT_SITE_ACCESS_KEY;
    const cleanSlug = customSlug.trim() || DEFAULT_CUSTOM_LINK_SLUG;
    setCustomKey(cleanKey);
    setCustomSlug(cleanSlug);
    await persistAccessSettingsEverywhere(currentMode, cleanKey, cleanSlug, false);
    window.dispatchEvent(new CustomEvent('hb_preview_lock_screen'));
  };

  const handleCopyLink = () => {
    const cleanKey = customKey.trim() || DEFAULT_SITE_ACCESS_KEY;
    const cleanSlug = customSlug.trim() || DEFAULT_CUSTOM_LINK_SLUG;
    const fullShareUrl = `${defaultOrigin.replace(/\/+$/, '')}/${cleanSlug}`;
    setCustomSlug(cleanSlug);
    persistAccessSettingsEverywhere(currentMode, cleanKey, cleanSlug, false).catch(
      () => {}
    );
    navigator.clipboard?.writeText(fullShareUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isPrivate = currentMode === 'link_only';
  const displayOriginPrefix = `${defaultOrigin.replace(/\/+$/, '')}/`;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:px-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      {/* Left: Simple ON/OFF Toggle Button (Private vs Public) + Lock Now Button */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleToggleMode}
          className={`relative inline-flex items-center h-8 rounded-full p-1 transition-colors cursor-pointer border ${
            isPrivate
              ? 'bg-[#cc0000] border-red-700 text-white'
              : 'bg-emerald-600 border-emerald-700 text-white'
          }`}
        >
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
              isPrivate ? 'bg-white text-[#cc0000] shadow-xs' : 'text-white/90'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{language === 'lo' ? 'ສ່ວນຕົວ' : 'Private'}</span>
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
              !isPrivate ? 'bg-white text-emerald-700 shadow-xs' : 'text-white/90'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'lo' ? 'ສາທາລະນະ' : 'Public'}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={handleLockNowClick}
          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
          title={language === 'lo' ? 'ລັອກໜ້າເວັບດຽວນີ້' : 'Lock Website Now'}
        >
          <Lock className="w-3.5 h-3.5 text-[#cc0000]" />
          <span>{language === 'lo' ? 'ລັອກດຽວນີ້' : 'Lock Now'}</span>
        </button>
      </div>

      {/* Right: Separate Custom Link Box + Separate Custom Passcode Box + Save & Copy Buttons */}
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* 1. Custom Link Box (Independent from Passcode; preserves domain so link always works) */}
        <div className="flex items-center flex-1 min-w-0 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus-within:border-[#cc0000] overflow-hidden">
          <span className="pl-2.5 pr-1 py-1.5 text-xs font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1.5 select-none shrink-0">
            <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{displayOriginPrefix}</span>
          </span>
          <input
            type="text"
            value={customSlug}
            onChange={(e) => handleSlugChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const cleanKey = customKey.trim() || DEFAULT_SITE_ACCESS_KEY;
                const cleanSlug = customSlug.trim() || DEFAULT_CUSTOM_LINK_SLUG;
                setCustomKey(cleanKey);
                setCustomSlug(cleanSlug);
                persistAccessSettingsEverywhere(currentMode, cleanKey, cleanSlug, true);
              }
            }}
            placeholder={language === 'lo' ? 'ຕັ້ງຊື່ລິ້ງເອງ...' : 'custom-link...'}
            className="w-full pr-3 py-1.5 bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none min-w-[90px]"
          />
        </div>

        {/* 2. Separate Custom Passcode Box (For visitors entering the main website directly) */}
        <div className="relative sm:w-44 shrink-0">
          <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={customKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const cleanKey = customKey.trim() || DEFAULT_SITE_ACCESS_KEY;
                const cleanSlug = customSlug.trim() || DEFAULT_CUSTOM_LINK_SLUG;
                setCustomKey(cleanKey);
                setCustomSlug(cleanSlug);
                persistAccessSettingsEverywhere(currentMode, cleanKey, cleanSlug, true);
              }
            }}
            placeholder={language === 'lo' ? 'ຕັ້ງລະຫັດເອງ...' : 'Custom key...'}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#cc0000]"
          />
        </div>

        {/* Save & Copy Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              const cleanKey = customKey.trim() || DEFAULT_SITE_ACCESS_KEY;
              const cleanSlug = customSlug.trim() || DEFAULT_CUSTOM_LINK_SLUG;
              setCustomKey(cleanKey);
              setCustomSlug(cleanSlug);
              persistAccessSettingsEverywhere(currentMode, cleanKey, cleanSlug, true);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition active:scale-95"
          >
            {savedToast ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'lo' ? 'ບັນທຶກແລ້ວ' : 'Saved'}</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{language === 'lo' ? 'ບັນທຶກ' : 'Save'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-lg bg-[#cc0000] hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition active:scale-95"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'lo' ? 'ກ໊ອບປີ້ແລ້ວ' : 'Copied'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{language === 'lo' ? 'ກ໊ອບປີ້ລິ້ງ' : 'Copy'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

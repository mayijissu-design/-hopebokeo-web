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
const SITE_ACCESS_CONFIG_STORAGE_KEY = 'hb_site_access_config';
const SITE_ACCESS_COOKIE_NAME = 'hb_site_access_cfg';
export const DEFAULT_SITE_ACCESS_KEY = 'hb2026';

export interface StoredSiteAccessConfig {
  siteAccessMode: 'link_only' | 'public';
  siteAccessKey: string;
  siteCustomShareUrl: string;
  updatedAt: string;
}

const RESERVED_TAB_NAMES = new Set([
  '',
  'home',
  'insights',
  'dashboard',
  'about',
  'settings',
  'admin',
  'church-portal',
]);

function isSearchEngineBot(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || '').toLowerCase();
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot/i.test(
    ua
  );
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
      return {
        siteAccessMode: parsed.siteAccessMode === 'public' ? 'public' : 'link_only',
        siteAccessKey: parsed.siteAccessKey.trim(),
        siteCustomShareUrl: typeof parsed.siteCustomShareUrl === 'string' ? parsed.siteCustomShareUrl.trim() : '',
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
          localCfg = {
            siteAccessMode: parsed.siteAccessMode === 'public' ? 'public' : 'link_only',
            siteAccessKey: parsed.siteAccessKey.trim(),
            siteCustomShareUrl:
              typeof parsed.siteCustomShareUrl === 'string' ? parsed.siteCustomShareUrl.trim() : '',
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
  const clean: StoredSiteAccessConfig = {
    siteAccessMode: config.siteAccessMode === 'public' ? 'public' : 'link_only',
    siteAccessKey: (config.siteAccessKey || '').trim() || DEFAULT_SITE_ACCESS_KEY,
    siteCustomShareUrl: (config.siteCustomShareUrl || '').trim(),
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
    homePoster?.siteAccessKey && typeof homePoster.siteAccessKey === 'string' && homePoster.siteAccessKey.trim()
  );

  if (stored && posterHasKey) {
    const sTime = Date.parse(stored.updatedAt || '') || 0;
    const pTime = Date.parse(homePoster?.updatedAt || '') || 0;
    if (sTime >= pTime) {
      return stored;
    }
    return {
      siteAccessMode: homePoster?.siteAccessMode === 'public' ? 'public' : 'link_only',
      siteAccessKey: homePoster!.siteAccessKey!.trim(),
      siteCustomShareUrl: (homePoster?.siteCustomShareUrl || '').trim() || stored.siteCustomShareUrl,
      updatedAt: homePoster?.updatedAt || stored.updatedAt,
    };
  }

  if (stored) {
    return stored;
  }

  if (posterHasKey) {
    return {
      siteAccessMode: homePoster?.siteAccessMode === 'public' ? 'public' : 'link_only',
      siteAccessKey: homePoster!.siteAccessKey!.trim(),
      siteCustomShareUrl: (homePoster?.siteCustomShareUrl || '').trim(),
      updatedAt: homePoster?.updatedAt || '',
    };
  }

  return {
    siteAccessMode: homePoster?.siteAccessMode === 'public' ? 'public' : 'link_only',
    siteAccessKey: DEFAULT_SITE_ACCESS_KEY,
    siteCustomShareUrl: (homePoster?.siteCustomShareUrl || '').trim(),
    updatedAt: homePoster?.updatedAt || '',
  };
}

function buildShareUrlWithKey(baseUrlInput: string, keyInput: string, defaultOrigin: string): string {
  const cleanKey = keyInput.trim() || DEFAULT_SITE_ACCESS_KEY;
  const trimmedUrl = (baseUrlInput || '').trim();
  if (!trimmedUrl) {
    return `${defaultOrigin}/?key=${encodeURIComponent(cleanKey)}`;
  }
  try {
    const parsed = new URL(
      trimmedUrl.startsWith('http')
        ? trimmedUrl
        : `${defaultOrigin}/${trimmedUrl.replace(/^\/+/, '')}`
    );
    parsed.searchParams.set('key', cleanKey);
    return parsed.toString();
  } catch {
    const base = trimmedUrl.split('?')[0] || defaultOrigin;
    return `${base}?key=${encodeURIComponent(cleanKey)}`;
  }
}

/**
 * Checks if the current browser URL contains the exact secret passcode (`expectedKey`) in its query/hash/path.
 */
function doesCurrentUrlContainSecretLink(expectedKey: string): boolean {
  if (typeof window === 'undefined') return false;
  const target = expectedKey.trim();
  if (!target) return false;
  const targetLower = target.toLowerCase();

  try {
    // 1. Check query parameters (?key=..., ?invite=..., etc.)
    const searchParams = new URLSearchParams(window.location.search);
    for (const [k, v] of searchParams.entries()) {
      const cleanV = v.trim();
      const cleanK = k.trim();
      if (
        cleanV === target ||
        cleanV.toLowerCase() === targetLower ||
        cleanK === target ||
        cleanK.toLowerCase() === targetLower
      ) {
        return true;
      }
    }

    // 2. Check hash parameters (e.g. #key=... or #secretToken)
    const rawHash = (window.location.hash || '').replace(/^#+/, '').trim();
    if (rawHash && !RESERVED_TAB_NAMES.has(rawHash.toLowerCase())) {
      if (rawHash.includes('=')) {
        const hashParams = new URLSearchParams(
          rawHash.includes('?') ? rawHash.substring(rawHash.indexOf('?')) : rawHash
        );
        for (const [, v] of hashParams.entries()) {
          if (v.trim() === target || v.trim().toLowerCase() === targetLower) {
            return true;
          }
        }
      } else if (rawHash === target || rawHash.toLowerCase() === targetLower) {
        return true;
      }
    }

    // 3. Check custom path slug
    const pathSlug = decodeURIComponent(window.location.pathname.replace(/^\/+|\/+$/g, '').trim());
    if (
      pathSlug &&
      !RESERVED_TAB_NAMES.has(pathSlug.toLowerCase()) &&
      (pathSlug === target || pathSlug.toLowerCase() === targetLower)
    ) {
      return true;
    }
  } catch {}
  return false;
}

function cleanInviteKeyFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    let modified = false;
    ['key', 'invite', 'access', 'token'].forEach((param) => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        modified = true;
      }
    });
    if (modified) {
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
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
  }, [homePoster?.siteAccessMode, homePoster?.siteAccessKey, homePoster?.siteCustomShareUrl, homePoster?.updatedAt]);

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
    if (doesCurrentUrlContainSecretLink(expectedKey)) {
      try {
        sessionStorage.setItem(ACCESS_SESSION_KEY, expectedKey);
      } catch {}
      cleanInviteKeyFromUrl();
      return true;
    }
    try {
      const saved = sessionStorage.getItem(ACCESS_SESSION_KEY);
      if (saved && doesPasscodeStrictlyMatch(saved, expectedKey)) {
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
    if (doesCurrentUrlContainSecretLink(expectedKey)) {
      try {
        sessionStorage.setItem(ACCESS_SESSION_KEY, expectedKey);
      } catch {}
      cleanInviteKeyFromUrl();
      setIsAuthorized(true);
      return;
    }
    try {
      const saved = sessionStorage.getItem(ACCESS_SESSION_KEY);
      if (saved && doesPasscodeStrictlyMatch(saved, expectedKey)) {
        setIsAuthorized(true);
        return;
      }
    } catch {}
    setIsAuthorized(false);
  }, [expectedKey]);

  if (accessMode === 'public') {
    return <>{children}</>;
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Always re-read latest config on submit in case it was just updated
    const latestConfig = resolveEffectiveSiteAccessConfig(homePoster);
    const activeExpectedKey = (latestConfig.siteAccessKey || expectedKey || DEFAULT_SITE_ACCESS_KEY).trim();

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
              ? 'ເວັບໄຊສ່ວນຕົວ — ກະລຸນາປ້ອນລະຫັດ ຫຼື ເຂົ້າຜ່ານລິ້ງທີ່ໄດ້ຮັບ'
              : 'Private website — Enter passcode or use your invite link'}
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
  const defaultOrigin =
    typeof window !== 'undefined' &&
    window.location.hostname &&
    !window.location.hostname.includes('run.app') &&
    window.location.hostname !== 'localhost'
      ? window.location.origin
      : 'https://hopebokeo.org';

  const initialEffective = resolveEffectiveSiteAccessConfig(homePoster);

  const [currentMode, setCurrentMode] = useState<'link_only' | 'public'>(
    initialEffective.siteAccessMode
  );
  const [customKey, setCustomKey] = useState<string>(initialEffective.siteAccessKey);
  const [customUrl, setCustomUrl] = useState<string>(
    initialEffective.siteCustomShareUrl ||
      buildShareUrlWithKey('', initialEffective.siteAccessKey, defaultOrigin)
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
    setCustomUrl(
      eff.siteCustomShareUrl || buildShareUrlWithKey('', eff.siteAccessKey, defaultOrigin)
    );
  }, [
    homePoster?.siteAccessMode,
    homePoster?.siteAccessKey,
    homePoster?.siteCustomShareUrl,
    homePoster?.updatedAt,
    defaultOrigin,
  ]);

  const persistAccessSettingsEverywhere = async (
    nextMode: 'link_only' | 'public',
    nextKeyRaw: string,
    nextUrlRaw: string,
    showFeedback = true
  ) => {
    const cleanKey = nextKeyRaw.trim() || DEFAULT_SITE_ACCESS_KEY;
    const cleanUrl = buildShareUrlWithKey(nextUrlRaw, cleanKey, defaultOrigin);
    const nowIso = new Date().toISOString();

    if (showFeedback) setIsSaving(true);

    try {
      // 1. Immediately persist to localStorage + cookie + broadcast event
      saveStoredSiteAccessConfig({
        siteAccessMode: nextMode,
        siteAccessKey: cleanKey,
        siteCustomShareUrl: cleanUrl,
        updatedAt: nowIso,
      });

      // 2. Keep current admin tab unlocked with the new passcode while in Settings
      try {
        sessionStorage.setItem(ACCESS_SESSION_KEY, cleanKey);
      } catch {}

      syncRobotsMetaTags(nextMode);

      // 3. Persist to backend globalSettings as a lightweight backup
      fetch('/api/save-global-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteAccessMode: nextMode,
          siteAccessKey: cleanKey,
          siteCustomShareUrl: cleanUrl,
          updatedAt: nowIso,
        }),
      }).catch(() => {});

      // 4. Persist to homePoster (server ledger + Firestore)
      if (onSaveHomePoster && homePoster) {
        await onSaveHomePoster({
          ...homePoster,
          siteAccessMode: nextMode,
          siteAccessKey: cleanKey,
          siteCustomShareUrl: cleanUrl,
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

  const handleKeyChange = (val: string) => {
    isTypingRef.current = true;
    setCustomKey(val);
    const trimmedVal = val.trim();
    const updatedUrl = trimmedVal
      ? buildShareUrlWithKey(customUrl, trimmedVal, defaultOrigin)
      : customUrl;
    if (trimmedVal) {
      setCustomUrl(updatedUrl);
      const nowIso = new Date().toISOString();
      // Immediately activate the new passcode in storage & session so even before clicking Save, this exact passcode is active
      saveStoredSiteAccessConfig({
        siteAccessMode: currentMode,
        siteAccessKey: trimmedVal,
        siteCustomShareUrl: updatedUrl,
        updatedAt: nowIso,
      });
      try {
        sessionStorage.setItem(ACCESS_SESSION_KEY, trimmedVal);
      } catch {}
    }
    setTimeout(() => {
      isTypingRef.current = false;
    }, 800);
  };

  const handleUrlChange = (val: string) => {
    isTypingRef.current = true;
    setCustomUrl(val);
    // If user changed ?key=... inside the URL box directly, keep the passcode box in sync
    try {
      const parsed = new URL(
        val.trim().startsWith('http')
          ? val.trim()
          : `${defaultOrigin}/${val.trim().replace(/^\/+/, '')}`
      );
      const keyParam = parsed.searchParams.get('key');
      if (keyParam && keyParam.trim()) {
        const cleanK = keyParam.trim();
        setCustomKey(cleanK);
        saveStoredSiteAccessConfig({
          siteAccessMode: currentMode,
          siteAccessKey: cleanK,
          siteCustomShareUrl: val.trim(),
          updatedAt: new Date().toISOString(),
        });
        try {
          sessionStorage.setItem(ACCESS_SESSION_KEY, cleanK);
        } catch {}
      }
    } catch {}
    setTimeout(() => {
      isTypingRef.current = false;
    }, 800);
  };

  const handleToggleMode = async () => {
    const nextMode: 'link_only' | 'public' = currentMode === 'link_only' ? 'public' : 'link_only';
    setCurrentMode(nextMode);
    await persistAccessSettingsEverywhere(nextMode, customKey, customUrl, true);
  };

  const handleLockNowClick = async () => {
    const cleanKey = customKey.trim() || DEFAULT_SITE_ACCESS_KEY;
    const cleanUrl = buildShareUrlWithKey(customUrl, cleanKey, defaultOrigin);
    setCustomKey(cleanKey);
    setCustomUrl(cleanUrl);
    await persistAccessSettingsEverywhere(currentMode, cleanKey, cleanUrl, false);
    window.dispatchEvent(new CustomEvent('hb_preview_lock_screen'));
  };

  const handleCopyLink = () => {
    const cleanKey = customKey.trim() || DEFAULT_SITE_ACCESS_KEY;
    const cleanUrl = buildShareUrlWithKey(customUrl, cleanKey, defaultOrigin);
    setCustomUrl(cleanUrl);
    persistAccessSettingsEverywhere(currentMode, cleanKey, cleanUrl, false).catch(() => {});
    navigator.clipboard?.writeText(cleanUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isPrivate = currentMode === 'link_only';

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

      {/* Right: Custom Link Input + Custom Passcode Input + Save & Copy Buttons */}
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Editable Custom Link */}
        <div className="relative flex-1 min-w-0">
          <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={customUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={language === 'lo' ? 'ຕັ້ງລິ້ງເອງ...' : 'Custom link...'}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-[#cc0000]"
          />
        </div>

        {/* Editable Custom Passcode / Key */}
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
                const cleanUrl = buildShareUrlWithKey(customUrl, cleanKey, defaultOrigin);
                setCustomKey(cleanKey);
                setCustomUrl(cleanUrl);
                persistAccessSettingsEverywhere(currentMode, cleanKey, cleanUrl, true);
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
              const cleanUrl = buildShareUrlWithKey(customUrl, cleanKey, defaultOrigin);
              setCustomKey(cleanKey);
              setCustomUrl(cleanUrl);
              persistAccessSettingsEverywhere(currentMode, cleanKey, cleanUrl, true);
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

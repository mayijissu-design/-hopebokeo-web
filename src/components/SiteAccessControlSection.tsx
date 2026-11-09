import React, { useState, useEffect } from 'react';
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
const ADMIN_MASTER_PIN = '76838584';
export const DEFAULT_SITE_ACCESS_KEY = 'hb2026';

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

/**
 * Extracts a custom secret token or slug from a user-defined share URL.
 */
function extractTokenFromCustomUrl(customUrl?: string): string {
  if (!customUrl || typeof customUrl !== 'string') return '';
  const trimmed = customUrl.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(
      trimmed.startsWith('http')
        ? trimmed
        : `https://hopebokeo.org/${trimmed.replace(/^\/+/, '')}`
    );
    const paramVal =
      parsed.searchParams.get('key') ||
      parsed.searchParams.get('invite') ||
      parsed.searchParams.get('access') ||
      parsed.searchParams.get('token') ||
      Array.from(parsed.searchParams.values())[0];
    if (paramVal && !RESERVED_TAB_NAMES.has(paramVal.trim().toLowerCase())) {
      return paramVal.trim();
    }
    if (parsed.hash && parsed.hash.length > 1) {
      const cleanHash = parsed.hash.replace(/^#+/, '').trim();
      if (cleanHash.includes('=')) {
        const val = cleanHash.split('=')[1]?.trim() || '';
        if (val && !RESERVED_TAB_NAMES.has(val.toLowerCase())) return val;
      } else if (!RESERVED_TAB_NAMES.has(cleanHash.toLowerCase())) {
        return cleanHash;
      }
    }
    const cleanPath = parsed.pathname.replace(/^\/+|\/+$/g, '').trim();
    if (cleanPath && !RESERVED_TAB_NAMES.has(cleanPath.toLowerCase())) {
      return cleanPath;
    }
    return '';
  } catch {
    return !RESERVED_TAB_NAMES.has(trimmed.toLowerCase()) ? trimmed : '';
  }
}

/**
 * Checks if the current browser URL explicitly contains the secret invite link parameter/slug.
 */
function doesCurrentUrlContainSecretLink(
  expectedKey: string,
  customShareUrl?: string
): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const validTokens = new Set<string>();
    if (expectedKey.trim()) {
      validTokens.add(expectedKey.trim().toLowerCase());
    }
    const customToken = extractTokenFromCustomUrl(customShareUrl);
    if (customToken) {
      validTokens.add(customToken.toLowerCase());
    }

    if (validTokens.size === 0) return false;

    // 1. Check query parameters (?key=..., ?invite=..., etc.)
    const searchParams = new URLSearchParams(window.location.search);
    for (const [k, v] of searchParams.entries()) {
      const cleanV = v.trim().toLowerCase();
      const cleanK = k.trim().toLowerCase();
      if (validTokens.has(cleanV) || validTokens.has(cleanK)) {
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
          if (validTokens.has(v.trim().toLowerCase())) {
            return true;
          }
        }
      } else if (validTokens.has(rawHash.toLowerCase())) {
        return true;
      }
    }

    // 3. Check custom path slug (e.g. /my-secret-link)
    const pathSlug = window.location.pathname.replace(/^\/+|\/+$/g, '').trim().toLowerCase();
    if (pathSlug && !RESERVED_TAB_NAMES.has(pathSlug) && validTokens.has(pathSlug)) {
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
  const accessMode: 'link_only' | 'public' =
    homePoster?.siteAccessMode === 'public' ? 'public' : 'link_only';
  const expectedKey = (homePoster?.siteAccessKey || DEFAULT_SITE_ACCESS_KEY).trim();
  const customShareUrl = (homePoster?.siteCustomShareUrl || '').trim();
  const customUrlToken = extractTokenFromCustomUrl(customShareUrl);

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
    if (doesCurrentUrlContainSecretLink(expectedKey, customShareUrl)) {
      try {
        sessionStorage.setItem(ACCESS_SESSION_KEY, expectedKey);
      } catch {}
      cleanInviteKeyFromUrl();
      return true;
    }
    try {
      const saved = sessionStorage.getItem(ACCESS_SESSION_KEY);
      if (
        saved &&
        (saved.toLowerCase() === expectedKey.toLowerCase() ||
          (customUrlToken && saved.toLowerCase() === customUrlToken.toLowerCase()) ||
          saved === ADMIN_MASTER_PIN)
      ) {
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
    if (doesCurrentUrlContainSecretLink(expectedKey, customShareUrl)) {
      try {
        sessionStorage.setItem(ACCESS_SESSION_KEY, expectedKey);
      } catch {}
      cleanInviteKeyFromUrl();
      setIsAuthorized(true);
      return;
    }
    try {
      const saved = sessionStorage.getItem(ACCESS_SESSION_KEY);
      if (
        saved &&
        (saved.toLowerCase() === expectedKey.toLowerCase() ||
          (customUrlToken && saved.toLowerCase() === customUrlToken.toLowerCase()) ||
          saved === ADMIN_MASTER_PIN)
      ) {
        setIsAuthorized(true);
        return;
      }
    } catch {}
    setIsAuthorized(false);
  }, [expectedKey, customShareUrl, customUrlToken]);

  if (accessMode === 'public') {
    return <>{children}</>;
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputKey.trim();
    if (
      cleaned.toLowerCase() === expectedKey.toLowerCase() ||
      (customUrlToken && cleaned.toLowerCase() === customUrlToken.toLowerCase()) ||
      cleaned === ADMIN_MASTER_PIN
    ) {
      try {
        sessionStorage.setItem(ACCESS_SESSION_KEY, expectedKey);
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
  const currentMode: 'link_only' | 'public' =
    homePoster?.siteAccessMode === 'public' ? 'public' : 'link_only';
  const isPrivate = currentMode === 'link_only';

  const defaultOrigin =
    typeof window !== 'undefined' &&
    window.location.hostname &&
    !window.location.hostname.includes('run.app') &&
    window.location.hostname !== 'localhost'
      ? window.location.origin
      : 'https://hopebokeo.org';

  const savedKey = (homePoster?.siteAccessKey || DEFAULT_SITE_ACCESS_KEY).trim();
  const savedCustomUrl =
    (homePoster?.siteCustomShareUrl || '').trim() ||
    `${defaultOrigin}/?key=${savedKey}`;

  const [customKey, setCustomKey] = useState(savedKey);
  const [customUrl, setCustomUrl] = useState(savedCustomUrl);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    const k = (homePoster?.siteAccessKey || DEFAULT_SITE_ACCESS_KEY).trim();
    setCustomKey(k);
    setCustomUrl(
      (homePoster?.siteCustomShareUrl || '').trim() || `${defaultOrigin}/?key=${k}`
    );
  }, [homePoster?.siteAccessKey, homePoster?.siteCustomShareUrl, defaultOrigin]);

  const handleSave = async (
    nextMode: 'link_only' | 'public',
    nextKeyInput?: string,
    nextUrlInput?: string
  ) => {
    if (!onSaveHomePoster || !homePoster) return;
    setIsSaving(true);
    const cleanKey = (nextKeyInput ?? customKey).trim() || DEFAULT_SITE_ACCESS_KEY;
    const cleanUrl =
      (nextUrlInput ?? customUrl).trim() || `${defaultOrigin}/?key=${cleanKey}`;

    try {
      // Keep current admin session unlocked while editing in Settings
      sessionStorage.setItem(ACCESS_SESSION_KEY, cleanKey);
      syncRobotsMetaTags(nextMode);
      await onSaveHomePoster({
        ...homePoster,
        siteAccessMode: nextMode,
        siteAccessKey: cleanKey,
        siteCustomShareUrl: cleanUrl,
        updatedAt: new Date().toISOString(),
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyChange = (val: string) => {
    setCustomKey(val);
    if (customUrl.includes('?key=')) {
      const base = customUrl.split('?key=')[0];
      setCustomUrl(`${base}?key=${val}`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(customUrl.trim()).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:px-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      {/* Left: Simple ON/OFF Toggle Button (Private vs Public) + Lock Now Button */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => handleSave(isPrivate ? 'public' : 'link_only')}
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
          onClick={() => window.dispatchEvent(new CustomEvent('hb_preview_lock_screen'))}
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
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder={language === 'lo' ? 'ຕັ້ງລິ້ງເອງ...' : 'Custom link...'}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-[#cc0000]"
          />
        </div>

        {/* Editable Custom Passcode / Key */}
        <div className="relative sm:w-40 shrink-0">
          <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={customKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder={language === 'lo' ? 'ຕັ້ງລະຫັດເອງ...' : 'Custom key...'}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#cc0000]"
          />
        </div>

        {/* Save & Copy Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave(currentMode, customKey, customUrl)}
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

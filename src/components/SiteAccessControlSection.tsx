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

const ACCESS_STORAGE_KEY = 'hb_site_access_token';
const PREVIEW_LOCK_SESSION_KEY = 'hb_preview_lock_gate';
const ADMIN_MASTER_PIN = '76838584';
export const DEFAULT_SITE_ACCESS_KEY = 'hb2026';

function isSearchEngineBot(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || '').toLowerCase();
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot/i.test(
    ua
  );
}

function isPreviewDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = (window.location.hostname || '').toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.includes('.run.app') ||
    host.includes('googleusercontent.com')
  );
}

/**
 * Extracts any token/slug from a custom URL configured by the admin
 * (e.g. "https://hopebokeo.org/?key=abc" -> "abc", or "https://hopebokeo.org/secret" -> "secret")
 */
function extractTokenFromCustomUrl(customUrl?: string): string {
  if (!customUrl || typeof customUrl !== 'string') return '';
  const trimmed = customUrl.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(
      trimmed.startsWith('http') ? trimmed : `https://hopebokeo.org/${trimmed.replace(/^\/+/, '')}`
    );
    const paramVal =
      parsed.searchParams.get('key') ||
      parsed.searchParams.get('invite') ||
      parsed.searchParams.get('access') ||
      parsed.searchParams.get('token') ||
      Array.from(parsed.searchParams.values())[0];
    if (paramVal) return paramVal.trim();
    if (parsed.hash && parsed.hash.length > 1) {
      return parsed.hash.replace(/^#+/, '').trim();
    }
    const cleanPath = parsed.pathname.replace(/^\/+|\/+$/g, '');
    if (cleanPath) return cleanPath;
  } catch {}
  return trimmed;
}

function doesCurrentUrlMatchAccess(expectedKey: string, customShareUrl?: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const currentHref = window.location.href.toLowerCase();
    const searchParams = new URLSearchParams(window.location.search);
    const candidates: string[] = [];

    searchParams.forEach((val, key) => {
      if (val) candidates.push(val.trim().toLowerCase());
      if (key) candidates.push(key.trim().toLowerCase());
    });

    const hash = (window.location.hash || '').replace(/^#+/, '').trim();
    if (hash) {
      candidates.push(hash.toLowerCase());
      if (hash.includes('=')) {
        const parts = hash.split('=');
        if (parts[1]) candidates.push(parts[1].trim().toLowerCase());
      }
    }

    const pathSlug = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (pathSlug) {
      candidates.push(pathSlug);
    }

    const validTokens = new Set<string>([
      expectedKey.toLowerCase(),
      ADMIN_MASTER_PIN.toLowerCase(),
    ]);

    const customUrlToken = extractTokenFromCustomUrl(customShareUrl);
    if (customUrlToken) {
      validTokens.add(customUrlToken.toLowerCase());
    }

    for (const token of validTokens) {
      if (!token) continue;
      if (candidates.includes(token)) return true;
      if (currentHref.includes(`=${encodeURIComponent(token)}`)) return true;
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
  const [previewLockActive, setPreviewLockActive] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(PREVIEW_LOCK_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    if (isSearchEngineBot()) return false;
    if (doesCurrentUrlMatchAccess(expectedKey, customShareUrl)) {
      try {
        localStorage.setItem(ACCESS_STORAGE_KEY, expectedKey);
        sessionStorage.removeItem(PREVIEW_LOCK_SESSION_KEY);
      } catch {}
      cleanInviteKeyFromUrl();
      return true;
    }
    try {
      const saved = localStorage.getItem(ACCESS_STORAGE_KEY);
      if (
        saved &&
        (saved.toLowerCase() === expectedKey.toLowerCase() ||
          (customUrlToken && saved.toLowerCase() === customUrlToken.toLowerCase()) ||
          saved === ADMIN_MASTER_PIN)
      ) {
        return true;
      }
    } catch {}
    return isPreviewDevHost();
  });

  useEffect(() => {
    syncRobotsMetaTags(accessMode);
  }, [accessMode]);

  useEffect(() => {
    const handleTriggerPreviewLock = () => {
      try {
        sessionStorage.setItem(PREVIEW_LOCK_SESSION_KEY, '1');
      } catch {}
      setPreviewLockActive(true);
    };
    window.addEventListener('hb_preview_lock_screen', handleTriggerPreviewLock);
    return () => window.removeEventListener('hb_preview_lock_screen', handleTriggerPreviewLock);
  }, []);

  useEffect(() => {
    if (isSearchEngineBot()) {
      setIsAuthorized(false);
      return;
    }
    if (doesCurrentUrlMatchAccess(expectedKey, customShareUrl)) {
      try {
        localStorage.setItem(ACCESS_STORAGE_KEY, expectedKey);
        sessionStorage.removeItem(PREVIEW_LOCK_SESSION_KEY);
      } catch {}
      cleanInviteKeyFromUrl();
      setPreviewLockActive(false);
      setIsAuthorized(true);
      return;
    }
    try {
      const saved = localStorage.getItem(ACCESS_STORAGE_KEY);
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
    if (!isPreviewDevHost()) {
      setIsAuthorized(false);
    }
  }, [expectedKey, customShareUrl, customUrlToken]);

  if (accessMode === 'public' && !previewLockActive) {
    return <>{children}</>;
  }

  if (isAuthorized && !previewLockActive) {
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
        localStorage.setItem(ACCESS_STORAGE_KEY, expectedKey);
        sessionStorage.removeItem(PREVIEW_LOCK_SESSION_KEY);
      } catch {}
      setPreviewLockActive(false);
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
        {previewLockActive && (
          <div className="bg-amber-500/15 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
            <span>{language === 'lo' ? '👁️ ຕົວຢ່າງໜ້າລັອກ' : '👁️ Lock Preview'}</span>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(PREVIEW_LOCK_SESSION_KEY);
                } catch {}
                setPreviewLockActive(false);
                setIsAuthorized(true);
              }}
              className="px-2.5 py-0.5 bg-amber-400 text-slate-950 rounded-lg text-[11px] font-black hover:bg-amber-300 cursor-pointer"
            >
              {language === 'lo' ? 'ປິດ' : 'Exit'}
            </button>
          </div>
        )}

        <div className="w-12 h-12 rounded-xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>

        <h1 className="text-lg font-black text-white">
          {language === 'lo'
            ? 'ກະລຸນາປ້ອນລະຫັດເຂົ້າເວັບໄຊ'
            : language === 'th'
            ? 'กรุณาป้อนรหัสเข้าเว็บไซต์'
            : 'Enter Access Passcode'}
        </h1>

        <form onSubmit={handleUnlockSubmit} className="space-y-3 text-left">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder={language === 'lo' ? 'ລະຫັດເຂົ້າເວັບໄຊ...' : 'Passcode...'}
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
      localStorage.setItem(ACCESS_STORAGE_KEY, cleanKey);
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
    // Automatically update the ?key= part of the URL if the URL uses ?key=
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
      {/* Left: Simple ON/OFF Toggle Button (Private vs Public) */}
      <div className="flex items-center gap-2.5 shrink-0">
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
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 transition cursor-pointer"
          title={language === 'lo' ? 'ເບິ່ງໜ້າລັອກ' : 'Preview Lock Screen'}
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Custom Link Input + Custom Passcode Input + Copy & Save Buttons */}
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

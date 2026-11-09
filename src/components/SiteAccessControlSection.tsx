import React, { useState, useEffect } from 'react';
import {
  Lock,
  Globe,
  Link2,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
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

function extractUrlInviteKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const fromQuery =
      searchParams.get('key') ||
      searchParams.get('invite') ||
      searchParams.get('access') ||
      searchParams.get('token');
    if (fromQuery) return fromQuery.trim();

    const hash = window.location.hash || '';
    if (hash.includes('?')) {
      const hashQuery = new URLSearchParams(hash.substring(hash.indexOf('?')));
      const fromHashQuery =
        hashQuery.get('key') || hashQuery.get('invite') || hashQuery.get('access');
      if (fromHashQuery) return fromHashQuery.trim();
    }
    const match = hash.match(/(?:^|[#&?])(?:key|invite|access)=([^&]+)/i);
    if (match && match[1]) {
      return decodeURIComponent(match[1]).trim();
    }
  } catch {}
  return null;
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
    const urlKey = extractUrlInviteKey();
    if (urlKey && (urlKey.toLowerCase() === expectedKey.toLowerCase() || urlKey === ADMIN_MASTER_PIN)) {
      try {
        localStorage.setItem(ACCESS_STORAGE_KEY, expectedKey);
        sessionStorage.removeItem(PREVIEW_LOCK_SESSION_KEY);
      } catch {}
      cleanInviteKeyFromUrl();
      return true;
    }
    try {
      const saved = localStorage.getItem(ACCESS_STORAGE_KEY);
      if (saved && (saved.toLowerCase() === expectedKey.toLowerCase() || saved === ADMIN_MASTER_PIN)) {
        return true;
      }
    } catch {}
    return isPreviewDevHost();
  });

  // Sync dynamic robots meta tag whenever accessMode changes
  useEffect(() => {
    syncRobotsMetaTags(accessMode);
  }, [accessMode]);

  // Listen for custom preview lock events triggered from Admin Settings
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

  // Re-verify if expectedKey changes or URL contains key
  useEffect(() => {
    if (isSearchEngineBot()) {
      setIsAuthorized(false);
      return;
    }
    const urlKey = extractUrlInviteKey();
    if (urlKey && (urlKey.toLowerCase() === expectedKey.toLowerCase() || urlKey === ADMIN_MASTER_PIN)) {
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
      if (saved && (saved.toLowerCase() === expectedKey.toLowerCase() || saved === ADMIN_MASTER_PIN)) {
        setIsAuthorized(true);
        return;
      }
    } catch {}
    if (!isPreviewDevHost()) {
      setIsAuthorized(false);
    }
  }, [expectedKey]);

  // If mode is public (and admin is not testing the lock screen), render site directly
  if (accessMode === 'public' && !previewLockActive) {
    return <>{children}</>;
  }

  // If visitor is authorized via shared link or code (and not testing the lock screen), render site
  if (isAuthorized && !previewLockActive) {
    return <>{children}</>;
  }

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputKey.trim();
    if (
      cleaned.toLowerCase() === expectedKey.toLowerCase() ||
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
          ? 'ລະຫັດເຂົ້າເຖິງບໍ່ຖືກຕ້ອງ ກະລຸນາໃຊ້ລິ້ງທີ່ໄດ້ຮັບໂດຍກົງ'
          : language === 'th'
          ? 'รหัสเข้าถึงไม่ถูกต้อง กรุณาใช้ลิงก์ที่ได้รับโดยตรง'
          : 'Invalid access key. Please use your direct invite link.'
      );
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
      {/* Subtle ambient background */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        {previewLockActive && (
          <div className="bg-amber-500/15 border border-amber-500/40 text-amber-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
            <span>
              {language === 'lo'
                ? '👁️ ໂໝດທົດລອງເບິ່ງໜ້າຈໍລັອກ (ຄົນທີ່ຄົ້ນຫາຈາກ Google ຈະເຫັນໜ້ານີ້)'
                : '👁️ Lock Screen Preview (Visitors from Google see this)'}
            </span>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem(PREVIEW_LOCK_SESSION_KEY);
                } catch {}
                setPreviewLockActive(false);
                setIsAuthorized(true);
              }}
              className="px-2.5 py-1 bg-amber-400 text-slate-950 rounded-lg text-[11px] font-black hover:bg-amber-300 cursor-pointer shrink-0"
            >
              {language === 'lo' ? 'ກັບຄືນ' : 'Exit Preview'}
            </button>
          </div>
        )}

        <div className="w-16 h-16 rounded-2xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-black uppercase tracking-wider text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
            <span>
              {language === 'lo'
                ? 'ເຂົ້າເຖິງສະເພາະຜູ້ທີ່ມີລິ້ງເທົ່ານັ້ນ'
                : language === 'th'
                ? 'เข้าถึงเฉพาะผู้ที่มีลิงก์เชิญเท่านั้น'
                : 'Private Link-Only Access'}
            </span>
          </span>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {language === 'lo'
              ? 'ເວັບໄຊນີ້ປິດການເຂົ້າເຖິງສາທາລະນະຊົ່ວຄາວ'
              : language === 'th'
              ? 'เว็บไซต์นี้จำกัดการเข้าถึงเฉพาะลิงก์เชิญ'
              : 'Private Community Portal'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {language === 'lo'
              ? 'ເວັບໄຊນີ້ບໍ່ເປີດໃຫ້ຄົ້ນຫາຜ່ານ Google ທົ່ວໄປ. ກະລຸນາເຂົ້າເວັບໄຊຜ່ານລິ້ງເຊີນ (Invite Link) ທີ່ທ່ານໄດ້ຮັບໂດຍກົງ ຫຼື ປ້ອນລະຫັດເຂົ້າເຖິງດ້ານລຸ່ມ.'
              : language === 'th'
              ? 'เว็บไซต์นี้ไม่เปิดให้ค้นหาทั่วไป กรุณาเข้าผ่านลิงก์เชิญที่คุณได้รับโดยตรง หรือป้อนรหัสเข้าถึงด้านล่าง'
              : 'This portal is not open to public search engines. Please open the direct invite link sent to you, or enter your access key below.'}
          </p>
        </div>

        <form onSubmit={handleUnlockSubmit} className="space-y-3 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {language === 'lo'
                ? 'ປ້ອນລະຫັດລິ້ງເຊີນ (Access Key) ຫຼື ລະຫັດຜູ້ດູແລ:'
                : 'Enter Invite Key or Admin Passcode:'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder={language === 'lo' ? 'ປ້ອນລະຫັດເຂົ້າເຖິງ...' : 'Enter access key...'}
                className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-xl px-4 py-3 pr-10 text-sm font-mono font-bold text-white placeholder-slate-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-red-400 text-center bg-red-950/50 border border-red-800/60 py-2 px-3 rounded-xl">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-[#cc0000] hover:bg-red-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <KeyRound className="w-4 h-4" />
            <span>
              {language === 'lo'
                ? 'ຢືນຢັນເພື່ອເຂົ້າສູ່ເວັບໄຊ'
                : language === 'th'
                ? 'ยืนยันเพื่อเข้าสู่เว็บไซต์'
                : 'Enter Website'}
            </span>
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
  const currentKey = (homePoster?.siteAccessKey || DEFAULT_SITE_ACCESS_KEY).trim();

  const [customKey, setCustomKey] = useState(currentKey);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSavingMode, setIsSavingMode] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setCustomKey((homePoster?.siteAccessKey || DEFAULT_SITE_ACCESS_KEY).trim());
  }, [homePoster?.siteAccessKey]);

  const productionOrigin =
    typeof window !== 'undefined' &&
    window.location.hostname &&
    !window.location.hostname.includes('run.app') &&
    window.location.hostname !== 'localhost'
      ? window.location.origin
      : 'https://hopebokeo.org';

  const shareableLink = `${productionOrigin}/?key=${encodeURIComponent(
    customKey.trim() || DEFAULT_SITE_ACCESS_KEY
  )}`;

  const handleSwitchMode = async (newMode: 'link_only' | 'public', keyToSave?: string) => {
    if (!onSaveHomePoster || !homePoster) return;
    setIsSavingMode(true);
    const finalKey = (keyToSave ?? customKey).trim() || DEFAULT_SITE_ACCESS_KEY;
    try {
      localStorage.setItem(ACCESS_STORAGE_KEY, finalKey);
      syncRobotsMetaTags(newMode);
      await onSaveHomePoster({
        ...homePoster,
        siteAccessMode: newMode,
        siteAccessKey: finalKey,
        updatedAt: new Date().toISOString(),
      });
      setSavedNotice(
        newMode === 'link_only'
          ? language === 'lo'
            ? '✓ ປ່ຽນເປັນໂໝດສ່ວນຕົວ (ເຂົ້າໄດ້ສະເພາະຜູ້ທີ່ມີລິ້ງເທົ່ານັ້ນ) ແລ້ວ!'
            : '✓ Switched to Private Link-Only Mode!'
          : language === 'lo'
          ? '✓ ປ່ຽນເປັນໂໝດສາທາລະນະ (ເປີດໃຫ້ທຸກຄົນເຂົ້າເບິ່ງໄດ້) ແລ້ວ!'
          : '✓ Switched to Public Mode!'
      );
      setTimeout(() => setSavedNotice(''), 3500);
    } finally {
      setIsSavingMode(false);
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard?.writeText(shareableLink).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleGenerateNewKey = () => {
    const randomPart = Math.random().toString(36).substring(2, 7);
    const nextKey = `hb-${randomPart}`;
    setCustomKey(nextKey);
    handleSwitchMode(currentMode, nextKey);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:px-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-700/50 transition"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              currentMode === 'link_only'
                ? 'bg-red-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {currentMode === 'link_only' ? (
              <Lock className="w-5 h-5" />
            ) : (
              <Globe className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {language === 'lo'
                  ? 'ການຄວບຄຸມການຄົ້ນຫາ Google & ການເຂົ້າເຖິງເວັບໄຊ'
                  : 'Website Visibility & Link-Only Access Control'}
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                  currentMode === 'link_only'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                }`}
              >
                {currentMode === 'link_only'
                  ? language === 'lo'
                    ? '🔒 ໂໝດສ່ວນຕົວ (ສົ່ງລິ້ງເທົ່ານັ້ນ)'
                    : '🔒 Private (Link Only)'
                  : language === 'lo'
                  ? '🌐 ໂໝດສາທາລະນະ (ເປີດທົ່ວໄປ)'
                  : '🌐 Public Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currentMode === 'link_only'
                ? language === 'lo'
                  ? 'ປິດກັ້ນຈາກ Google Search ແລ້ວ — ຄົນທົ່ວໄປຈະເຂົ້າເວັບໄຊບໍ່ໄດ້ ຍົກເວັ້ນທ່ານສົ່ງລິ້ງເຊີນໃຫ້ໂດຍກົງ'
                  : 'Hidden from Google Search — Only people with your direct invite link can view the website'
                : language === 'lo'
                ? 'ເປີດສາທາລະນະ — ທຸກຄົນສາມາດເຂົ້າເບິ່ງເວັບໄຊ ແລະ ຄົ້ນຫາເຫັນໃນ Google ໄດ້ຕາມປົກກະຕິ'
                : 'Publicly accessible — Anyone can visit and find the website on Google Search'}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700 space-y-4">
          {/* 2-Mode Switch Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mode 1: Private Link-Only Mode */}
            <button
              type="button"
              disabled={isSavingMode}
              onClick={() => handleSwitchMode('link_only')}
              className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                currentMode === 'link_only'
                  ? 'border-[#cc0000] bg-red-50/70 dark:bg-red-950/30 ring-2 ring-red-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  currentMode === 'link_only'
                    ? 'bg-[#cc0000] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Lock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {language === 'lo'
                      ? '🔒 1. ໂໝດສ່ວນຕົວ (ເຂົ້າຜ່ານລິ້ງເທົ່ານັ້ນ)'
                      : '🔒 1. Private Link-Only Mode'}
                  </span>
                  {currentMode === 'link_only' && (
                    <span className="text-[10px] font-black bg-[#cc0000] text-white px-2 py-0.5 rounded-full">
                      {language === 'lo' ? 'ກຳລັງໃຊ້ງານ' : 'ACTIVE'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {language === 'lo'
                    ? 'ບລັອກ Google ບໍ່ໃຫ້ເກັບຂໍ້ມູນ ແລະ ລັອກໜ້າເວັບໄວ້. ຜູ້ທີ່ຈະເຂົ້າເບິ່ງໄດ້ຕ້ອງກົດຜ່ານລິ້ງທີ່ທ່ານສົ່ງໃຫ້ເທົ່ານັ້ນ.'
                    : 'Blocks Google indexing & locks the site. Visitors can only enter via the invite link you send them.'}
                </p>
              </div>
            </button>

            {/* Mode 2: Public Mode */}
            <button
              type="button"
              disabled={isSavingMode}
              onClick={() => handleSwitchMode('public')}
              className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                currentMode === 'public'
                  ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  currentMode === 'public'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {language === 'lo'
                      ? '🌐 2. ໂໝດສາທາລະນະ (ເປີດໃຫ້ທຸກຄົນເຂົ້າໄດ້)'
                      : '🌐 2. Public Mode (Open to All)'}
                  </span>
                  {currentMode === 'public' && (
                    <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      {language === 'lo' ? 'ກຳລັງໃຊ້ງານ' : 'ACTIVE'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {language === 'lo'
                    ? 'ເມື່ອຕ້ອງການເປີດສາທາລະນະໃນອະນາຄົດ ພຽງກົດປຸ່ມນີ້ ທຸກຄົນກໍຈະເຂົ້າເວັບ ແລະ ຄົ້ນຫາໃນ Google ໄດ້ທັນທີ.'
                    : 'When you are ready to go public in the future, click here so everyone and Google can access the site.'}
                </p>
              </div>
            </button>
          </div>

          {savedNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center">
              {savedNotice}
            </div>
          )}

          {/* Shareable Link Box (Always shown so Admin can copy or customize the link) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                <Link2 className="w-4 h-4 text-[#cc0000]" />
                <span>
                  {language === 'lo'
                    ? 'ລິ້ງສຳລັບກ໊ອບປີ້ສົ່ງໃຫ້ໝູ່ ຫຼື ທີມງານ (Shareable Invite Link):'
                    : 'Shareable Invite Link (Send this link to allow access):'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('hb_preview_lock_screen'))}
                  className="px-2.5 py-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {language === 'lo' ? 'ເບິ່ງໜ້າຈໍລັອກ' : 'Preview Lock Screen'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateNewKey}
                  className="px-2.5 py-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                  title={
                    language === 'lo'
                      ? 'ປ່ຽນລະຫັດລິ້ງໃໝ່ (ລິ້ງເກົ່າຈະໃຊ້ບໍ່ໄດ້ທັນທີ)'
                      : 'Generate a new link key (invalidates old links)'
                  }
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{language === 'lo' ? 'ປ່ຽນລິ້ງໃໝ່' : 'New Link'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex-1 flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 select-all overflow-x-auto">
                {shareableLink}
              </div>

              <button
                type="button"
                onClick={handleCopyShareLink}
                className="px-4 py-2 rounded-xl bg-[#cc0000] hover:bg-red-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer shrink-0 active:scale-95"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{language === 'lo' ? 'ກ໊ອບປີ້ລິ້ງແລ້ວ!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{language === 'lo' ? 'ກ໊ອບປີ້ລິ້ງສົ່ງໃຫ້ໝູ່' : 'Copy Invite Link'}</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {language === 'lo' ? 'ຫຼື ຕັ້ງລະຫັດລິ້ງເອງ:' : 'Custom Access Key:'}
              </span>
              <input
                type="text"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value.replace(/\s+/g, ''))}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 w-32 outline-none focus:border-[#cc0000]"
              />
              {customKey.trim() !== currentKey && (
                <button
                  type="button"
                  onClick={() => handleSwitchMode(currentMode, customKey)}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black cursor-pointer"
                >
                  {language === 'lo' ? 'ບັນທຶກລະຫັດລິ້ງ' : 'Save Key'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

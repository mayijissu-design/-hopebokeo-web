import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { FilterPanel, TimeRange } from './components/FilterPanel';
import { HomeTab } from './components/HomeTab';
import { DashboardTab } from './components/DashboardTab';
import { AboutTab } from './components/AboutTab';
import { ChurchEditPortal } from './components/ChurchEditPortal';
import { AdminTab } from './components/AdminTab';
import { VillageModal } from './components/VillageModal';
import { EventModal } from './components/EventModal';
import { TeamModal } from './components/TeamModal';
import { AiAssistant } from './components/AiAssistant';
import { AutoUpdateListener } from './components/AutoUpdateListener';
import { HbLogo } from './components/HbLogo';
import { NetworkStatusBar } from './components/NetworkStatusBar';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import {
  SiteAccessGate,
  resolveEffectiveSiteAccessConfig,
  saveStoredSiteAccessConfig,
} from './components/SiteAccessControlSection';
import { Village, EventData, TeamMember, HomePoster, DonationInfo, Language, BankAccount } from './types';
import { Sparkles, X, Loader2, WifiOff, Lock } from 'lucide-react';
import { db, collection, doc, onSnapshot } from './lib/firebase';
import {
  loadFirestoreData,
  saveVillageToFirestore,
  deleteVillageFromFirestore,
  saveEventToFirestore,
  deleteEventFromFirestore,
  saveTeamToFirestore,
  deleteTeamFromFirestore,
  saveHomePosterToFirestore,
  saveDonationInfoToFirestore,
  saveGlobalSettingsToFirestore,
  isFirestoreReadQuotaExceeded,
  markFirestoreQuotaExceeded,
  initialDefaultData,
} from './lib/firestore-service';
import initialDefaultDonationBankAccounts from './data/donationBankAccounts.json';
import { resolveUploadUrl, getCachedUploadUrl, normalizeUploadUrl } from './utils/fileUploader';
import {
  getInitialActiveTab,
  persistActiveTab,
  normalizeTab,
  initScrollRestoration,
  saveCurrentTabScroll,
  getSavedTabScroll,
  restoreScrollPosition,
} from './utils/navigationState';

function isValidQrUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('data:image') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  );
}

function shouldAcceptRemoteUpdate(remoteUpdatedAt?: string, localUpdatedAt?: string): boolean {
  if (!localUpdatedAt) return true;
  if (!remoteUpdatedAt) return false;
  const rTime = Date.parse(remoteUpdatedAt);
  const lTime = Date.parse(localUpdatedAt);
  if (isNaN(rTime)) return false;
  if (isNaN(lTime)) return true;
  return rTime >= lTime;
}

function safeCacheEvents(events: EventData[]) {
  try {
    const sanitized = events.map((e) => {
      const cover = e.imageUrl || (Array.isArray(e.imageUrls) ? e.imageUrls[0] : '') || '';
      return {
        ...e,
        imageUrl: cover,
        docUrl: typeof e.docUrl === 'string' && e.docUrl.startsWith('data:') && e.docUrl.length > 50000 ? '' : e.docUrl,
        docUrls: Array.isArray(e.docUrls)
          ? e.docUrls.filter((u) => typeof u === 'string' && (!u.startsWith('data:') || u.length <= 50000))
          : (e.docUrl ? [e.docUrl] : []),
        imageUrls: Array.isArray(e.imageUrls) && e.imageUrls.length > 0
          ? e.imageUrls.slice(0, 10).filter((u) => typeof u === 'string' && (!u.startsWith('data:') || u.length < 200000))
          : (cover ? [cover] : []),
        monthlyReports: Array.isArray(e.monthlyReports)
          ? e.monthlyReports.map((r) => {
              const rCover = r.imageUrl || (Array.isArray(r.imageUrls) ? r.imageUrls[0] : '') || '';
              return {
                ...r,
                imageUrl: rCover,
                docUrl: typeof r.docUrl === 'string' && r.docUrl.startsWith('data:') && r.docUrl.length > 50000 ? '' : r.docUrl,
                docUrls: Array.isArray(r.docUrls)
                  ? r.docUrls.filter((u) => typeof u === 'string' && (!u.startsWith('data:') || u.length <= 50000))
                  : (r.docUrl ? [r.docUrl] : []),
                imageUrls: Array.isArray(r.imageUrls) && r.imageUrls.length > 0
                  ? r.imageUrls.slice(0, 6).filter((u) => typeof u === 'string' && (!u.startsWith('data:') || u.length < 200000))
                  : (rCover ? [rCover] : []),
              };
            })
          : [],
      };
    });
    localStorage.setItem('hb_cached_events', JSON.stringify(sanitized));
  } catch (err) {
    console.warn('Could not cache events to localStorage:', err);
  }
}

function sanitizeClientHomePoster(raw?: HomePoster): HomePoster | undefined {
  const defaultPoster = initialDefaultData?.homePoster as HomePoster | undefined;
  if (!raw && !defaultPoster) return undefined;
  const poster = { ...(defaultPoster || {}), ...(raw || {}) } as HomePoster;

  if (poster.logoUrl === undefined || poster.logoUrl === '/uploads/inline_d892a5b8897e.jpg') {
    poster.logoUrl = defaultPoster?.logoUrl || '/uploads/logo_1791212624840_1791212626418_663.png';
  } else if (poster.logoUrl) {
    poster.logoUrl = normalizeUploadUrl(poster.logoUrl);
  }

  if (
    !poster.bokeoImageUrl ||
    poster.bokeoImageUrl.includes('photo-1542601906990-b4d3fb778b09')
  ) {
    poster.bokeoImageUrl =
      defaultPoster?.bokeoImageUrl ||
      '/uploads/416848893_1441279663411460_5205317115984311446_n__1__jpg_1788632235891_514.jpg';
  } else {
    poster.bokeoImageUrl = normalizeUploadUrl(poster.bokeoImageUrl);
  }

  if (poster.aboutHeroImageUrl) {
    poster.aboutHeroImageUrl = normalizeUploadUrl(poster.aboutHeroImageUrl);
  }

  if (!poster.upcomingEventImageUrl) {
    poster.upcomingEventImageUrl =
      defaultPoster?.upcomingEventImageUrl || '/uploads/upcoming_poster_1790760136318.jpg';
  } else {
    poster.upcomingEventImageUrl = normalizeUploadUrl(poster.upcomingEventImageUrl);
  }

  if (poster.videoUrl === '/uploads/img_1786429196319_5c9ce.jpg') {
    poster.videoUrl = '';
  }

  if (!Array.isArray(poster.imageUrls) || poster.imageUrls.length === 0) {
    if (poster.imageUrl) {
      poster.imageUrls = [normalizeUploadUrl(poster.imageUrl)];
    } else if (defaultPoster?.imageUrls && defaultPoster.imageUrls.length > 0) {
      poster.imageUrls = defaultPoster.imageUrls;
    }
  } else {
    poster.imageUrls = poster.imageUrls.map((u) => normalizeUploadUrl(u));
    if (!poster.imageUrl && poster.imageUrls[0]) {
      poster.imageUrl = poster.imageUrls[0];
    }
  }

  if (!Array.isArray(poster.bokeoTimeline) || poster.bokeoTimeline.length === 0) {
    if (defaultPoster?.bokeoTimeline && defaultPoster.bokeoTimeline.length > 0) {
      poster.bokeoTimeline = defaultPoster.bokeoTimeline as any;
    }
  } else {
    poster.bokeoTimeline = poster.bokeoTimeline.map((item) => ({
      ...item,
      imageUrl: normalizeUploadUrl(item.imageUrl || ''),
      imageUrls: Array.isArray(item.imageUrls)
        ? item.imageUrls.map((u) => normalizeUploadUrl(u))
        : item.imageUrl
        ? [normalizeUploadUrl(item.imageUrl)]
        : [],
    }));
  }

  const effectiveAccess = resolveEffectiveSiteAccessConfig(poster);
  poster.siteAccessMode = effectiveAccess.siteAccessMode;
  poster.siteAccessKey = effectiveAccess.siteAccessKey;
  poster.siteCustomShareUrl = effectiveAccess.siteCustomShareUrl;

  return poster;
}

function sanitizeClientVillages(list: any[]): Village[] {
  const defaultVillages = (initialDefaultData?.villages as Village[]) || [];
  return list.map((v: any) => {
    const def = defaultVillages.find((d) => d.id === v.id);
    const rawLeaders = Number(v.leaders) || 0;
    let imgUrl = normalizeUploadUrl(v.imageUrl || '');
    if (!imgUrl && def?.imageUrl) {
      imgUrl = def.imageUrl;
    }
    return {
      ...v,
      imageUrl: imgUrl || v.imageUrl,
      heard: Number(v.heard) || 0,
      believers: Number(v.believers) || 0,
      baptized: Number(v.baptized) || 0,
      attending: typeof v.attending === 'number' ? v.attending : Number(v.attending) || 0,
      leaders: rawLeaders < 0 ? 1 : rawLeaders === 0 && v.id === 'V8547' ? 1 : rawLeaders,
    } as Village;
  });
}

export default function App() {
  const [activeTab, setActiveTabState] = useState<string>(() => getInitialActiveTab());

  // Function to navigate tabs while preserving scroll & history
  const setActiveTab = useCallback((newTab: string, options?: { skipScrollRestore?: boolean }) => {
    setActiveTabState((prevTab) => {
      if (prevTab === newTab) return prevTab;
      saveCurrentTabScroll(prevTab);
      persistActiveTab(newTab, true);
      const hasPendingScrollTarget = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('hb_scroll_target');
      if (!options?.skipScrollRestore && !hasPendingScrollTarget) {
        const targetScroll = getSavedTabScroll(newTab);
        restoreScrollPosition(targetScroll);
      }
      // Auto-lock admin rooms when switching to any other tab
      if (newTab !== 'admin') {
        try {
          sessionStorage.removeItem('hb_settings_unlocked');
          localStorage.removeItem('hb_settings_unlocked');
          sessionStorage.removeItem('hb_finance_unlocked');
          localStorage.removeItem('hb_finance_unlocked');
          sessionStorage.removeItem('hb_admin_feature');
          localStorage.removeItem('hb_admin_feature');
        } catch {}
      }
      return newTab;
    });
  }, []);

  // Sync activeTab state changes to persistent storage and address bar
  useEffect(() => {
    persistActiveTab(activeTab, false);
    if (activeTab !== 'admin') {
      try {
        sessionStorage.removeItem('hb_settings_unlocked');
        localStorage.removeItem('hb_settings_unlocked');
        sessionStorage.removeItem('hb_finance_unlocked');
        localStorage.removeItem('hb_finance_unlocked');
        sessionStorage.removeItem('hb_admin_feature');
        localStorage.removeItem('hb_admin_feature');
      } catch {}
    }
  }, [activeTab]);

  // Handle browser Back & Forward buttons (popstate) and hash changes smoothly without redirecting to 'home'
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      try {
        const fromState = e.state?.tab;
        const resolved =
          normalizeTab(fromState) ||
          normalizeTab(window.location.hash) ||
          normalizeTab(window.location.pathname);
        if (resolved && resolved.tab !== activeTab) {
          saveCurrentTabScroll(activeTab);
          setActiveTabState(resolved.tab);
          persistActiveTab(resolved.tab, false);
          const targetScroll = getSavedTabScroll(resolved.tab);
          restoreScrollPosition(targetScroll);
        }
      } catch {}
    };

    const handleHashChange = () => {
      try {
        const hash = window.location.hash.replace(/^#/, '');
        const resolved = normalizeTab(hash);
        if (resolved && resolved.tab !== activeTab) {
          saveCurrentTabScroll(activeTab);
          setActiveTabState(resolved.tab);
          persistActiveTab(resolved.tab, false);
          const targetScroll = getSavedTabScroll(resolved.tab);
          restoreScrollPosition(targetScroll);
        }
      } catch {}
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [activeTab]);

  // Scroll Restoration Manager: Tracks scroll, saves on unload, restores on mount
  useEffect(() => {
    const cleanupScroll = initScrollRestoration();

    const handleBeforeUnload = () => {
      saveCurrentTabScroll(activeTab);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    let scrollRaf: number | null = null;
    const handleScroll = () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(() => {
        saveCurrentTabScroll(activeTab);
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Restore saved scroll position on initial load
    const savedPos = getSavedTabScroll(activeTab);
    let cancelRestore: (() => void) | null = null;
    if (savedPos > 0) {
      cancelRestore = restoreScrollPosition(savedPos);
    }

    return () => {
      cleanupScroll();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('scroll', handleScroll);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      if (cancelRestore) cancelRestore();
    };
  }, [activeTab]);
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('hb_language');
      if (saved === 'lo' || saved === 'en' || saved === 'th') {
        return saved as Language;
      }
    } catch {
      // fallback
    }
    return 'lo';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('hb_dark_mode');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Auto-scheduled Theme Mode State & Schedule Settings
  const [autoThemeEnabled, setAutoThemeEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hb_auto_theme_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [autoThemeStart, setAutoThemeStart] = useState<string>(() => {
    try {
      return localStorage.getItem('hb_auto_theme_start') || '18:00';
    } catch {
      return '18:00';
    }
  });
  const [autoThemeEnd, setAutoThemeEnd] = useState<string>(() => {
    try {
      return localStorage.getItem('hb_auto_theme_end') || '06:00';
    } catch {
      return '06:00';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hb_auto_theme_enabled', String(autoThemeEnabled));
    } catch {}
  }, [autoThemeEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('hb_auto_theme_start', autoThemeStart);
    } catch {}
  }, [autoThemeStart]);

  useEffect(() => {
    try {
      localStorage.setItem('hb_auto_theme_end', autoThemeEnd);
    } catch {}
  }, [autoThemeEnd]);

  const checkScheduledTheme = useCallback(() => {
    if (!autoThemeEnabled) return;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = autoThemeStart.split(':').map(Number);
    const [endH, endM] = autoThemeEnd.split(':').map(Number);

    const startMinutes = (isNaN(startH) ? 18 : startH) * 60 + (isNaN(startM) ? 0 : startM);
    const endMinutes = (isNaN(endH) ? 6 : endH) * 60 + (isNaN(endM) ? 0 : endM);

    let shouldBeDark = false;
    if (startMinutes > endMinutes) {
      // Overnight range e.g. 18:00 to 06:00
      shouldBeDark = currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      // Same-day range e.g. 08:00 to 18:00
      shouldBeDark = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    setDarkMode((prev) => (prev !== shouldBeDark ? shouldBeDark : prev));
  }, [autoThemeEnabled, autoThemeStart, autoThemeEnd]);

  useEffect(() => {
    if (autoThemeEnabled) {
      checkScheduledTheme();
      const interval = setInterval(checkScheduledTheme, 10000);
      return () => clearInterval(interval);
    }
  }, [autoThemeEnabled, checkScheduledTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('hb_language', language);
    } catch {
      // ignore
    }
  }, [language]);

  // Data State with Instant Multi-Layer Local Storage Cache & Cloud Firestore Hydration
  const [villages, setVillages] = useState<Village[]>(() => {
    try {
      const cached = localStorage.getItem('hb_cached_villages');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return sanitizeClientVillages(parsed);
      }
    } catch {}
    return sanitizeClientVillages((initialDefaultData?.villages as Village[]) || []);
  });
  const [events, setEvents] = useState<EventData[]>(() => {
    try {
      const cached = localStorage.getItem('hb_cached_events');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return (initialDefaultData?.events as EventData[]) || [];
  });
  const [teams, setTeams] = useState<TeamMember[]>(() => {
    try {
      const cached = localStorage.getItem('hb_cached_teams');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return (initialDefaultData?.teams as TeamMember[]) || [];
  });
  const [homePoster, setHomePoster] = useState<HomePoster | undefined>(() => {
    try {
      const cached = localStorage.getItem('hb_cached_home_poster');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.title) return sanitizeClientHomePoster(parsed);
      }
    } catch {}
    return sanitizeClientHomePoster(initialDefaultData?.homePoster as HomePoster | undefined);
  });
  const [donationInfo, setDonationInfo] = useState<DonationInfo | undefined>(() => {
    const defaults = (initialDefaultDonationBankAccounts as BankAccount[]) || [];
    try {
      const cached = localStorage.getItem('hb_cached_donation_info');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) {
          const accounts = (parsed.bankAccounts && parsed.bankAccounts.length > 0)
            ? parsed.bankAccounts.map((acc: any, idx: number) => {
                const def = defaults[idx] || defaults.find((d) => d.bankName === acc.bankName);
                const hasValidQr = isValidQrUrl(acc.qrImageUrl);
                return {
                  ...acc,
                  qrImageUrl: hasValidQr ? acc.qrImageUrl : (def?.qrImageUrl || acc.qrImageUrl || ''),
                };
              })
            : defaults;
          return { ...parsed, bankAccounts: accounts };
        }
      }
    } catch {}
    const fallback = (initialDefaultData?.donationInfo as DonationInfo) || undefined;
    if (fallback) {
      const accounts = (fallback.bankAccounts && fallback.bankAccounts.length > 0)
        ? fallback.bankAccounts.map((acc: any, idx: number) => {
            const def = defaults[idx] || defaults.find((d) => d.bankName === acc.bankName);
            const hasValidQr = isValidQrUrl(acc.qrImageUrl);
            return {
              ...acc,
              qrImageUrl: hasValidQr ? acc.qrImageUrl : (def?.qrImageUrl || acc.qrImageUrl || ''),
            };
          })
        : defaults;
      return { ...fallback, bankAccounts: accounts };
    }
    return fallback;
  });
  const [isLoading] = useState<boolean>(false);

  // Global Filter Slicers (persisted in sessionStorage so filtered view is preserved on refresh)
  const [selectedProvince, setSelectedProvince] = useState<string>(() => {
    try { return sessionStorage.getItem('hb_filter_province') || 'all'; } catch { return 'all'; }
  });
  const [selectedDistrict, setSelectedDistrict] = useState<string>(() => {
    try { return sessionStorage.getItem('hb_filter_district') || 'all'; } catch { return 'all'; }
  });
  const [selectedChurch, setSelectedChurch] = useState<string>(() => {
    try { return sessionStorage.getItem('hb_filter_church') || 'all'; } catch { return 'all'; }
  });
  const [selectedStatus, setSelectedStatus] = useState<string>(() => {
    try { return sessionStorage.getItem('hb_filter_status') || 'all'; } catch { return 'all'; }
  });
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(() => {
    try { return (sessionStorage.getItem('hb_filter_time_range') as TimeRange) || 'all'; } catch { return 'all'; }
  });
  const [startDate, setStartDate] = useState<string>(() => {
    try { return sessionStorage.getItem('hb_filter_start_date') || ''; } catch { return ''; }
  });
  const [endDate, setEndDate] = useState<string>(() => {
    try { return sessionStorage.getItem('hb_filter_end_date') || ''; } catch { return ''; }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('hb_filter_province', selectedProvince);
      sessionStorage.setItem('hb_filter_district', selectedDistrict);
      sessionStorage.setItem('hb_filter_church', selectedChurch);
      sessionStorage.setItem('hb_filter_status', selectedStatus);
      sessionStorage.setItem('hb_filter_time_range', selectedTimeRange);
      sessionStorage.setItem('hb_filter_start_date', startDate);
      sessionStorage.setItem('hb_filter_end_date', endDate);
    } catch {}
  }, [selectedProvince, selectedDistrict, selectedChurch, selectedStatus, selectedTimeRange, startDate, endDate]);

  // Modals for Admin
  const [isVillageModalOpen, setIsVillageModalOpen] = useState<boolean>(false);
  const [villageToEdit, setVillageToEdit] = useState<Village | null>(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [eventToEdit, setEventToEdit] = useState<EventData | null>(null);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);
  const [teamToEdit, setTeamToEdit] = useState<TeamMember | null>(null);

  // Floating AI Drawer
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [isAiExpanded, setIsAiExpanded] = useState<boolean>(false);

  // Handle dark mode class on html and body elements + persist preference in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hb_dark_mode', String(darkMode));
    } catch {
      // ignore
    }
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // Track whether live Firestore snapshots have already hydrated each slice so stale API fallback never overwrites real-time data
  const hasFirestoreSnapshotRef = useRef<{
    villages: boolean;
    events: boolean;
    teams: boolean;
    homePoster: boolean;
    donationInfo: boolean;
  }>({
    villages: false,
    events: false,
    teams: false,
    homePoster: false,
    donationInfo: false,
  });

  // Fetch Ministry Data silently in the background from Server API (/api/ministry-data) and Cloud Firestore
  const fetchMinistryData = useCallback(async () => {
    let serverResponded = false;

    const applyIncomingData = (sourceData: any, isFromServerApi: boolean) => {
      if (!sourceData) return;

      if (Array.isArray(sourceData.villages) && sourceData.villages.length > 0) {
        const cleanVillages = sanitizeClientVillages(sourceData.villages);
        setVillages((prev) => {
          const nextStr = JSON.stringify(cleanVillages);
          if (JSON.stringify(prev) === nextStr) return prev;
          try {
            localStorage.setItem('hb_cached_villages', nextStr);
          } catch {}
          return cleanVillages;
        });
      }

      if (Array.isArray(sourceData.events) && sourceData.events.length > 0) {
        setEvents((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(sourceData.events)) return prev;
          try {
            safeCacheEvents(sourceData.events);
          } catch {}
          return sourceData.events;
        });
      }

      if (Array.isArray(sourceData.teams) && sourceData.teams.length > 0) {
        setTeams((prev) => {
          const nextStr = JSON.stringify(sourceData.teams);
          if (JSON.stringify(prev) === nextStr) return prev;
          try {
            localStorage.setItem('hb_cached_teams', nextStr);
          } catch {}
          return sourceData.teams;
        });
      }

      if (sourceData.homePoster) {
        let localPoster: HomePoster | undefined;
        try {
          const rawCached = localStorage.getItem('hb_cached_home_poster');
          if (rawCached) localPoster = JSON.parse(rawCached);
        } catch {}

        const remotePoster = sanitizeClientHomePoster(sourceData.homePoster as HomePoster);
        if (remotePoster) {
          if (shouldAcceptRemoteUpdate(remotePoster.updatedAt, localPoster?.updatedAt)) {
            setHomePoster((prev) => {
              const nextStr = JSON.stringify(remotePoster);
              if (prev && JSON.stringify(prev) === nextStr) return prev;
              try {
                localStorage.setItem('hb_cached_home_poster', nextStr);
                if (remotePoster.logoUrl && remotePoster.logoUrl !== prev?.logoUrl) {
                  localStorage.setItem('hb_custom_logo', remotePoster.logoUrl);
                  window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: remotePoster.logoUrl }));
                }
              } catch {}
              return remotePoster;
            });
          } else if (isFromServerApi && localPoster) {
            // Local browser has newer unsynced changes — push them to server so all other visitors get them
            fetch('/api/save-home-poster', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ homePoster: localPoster }),
            }).catch(() => {});
          }
        }
      }

      if (sourceData.donationInfo) {
        let localDonation: DonationInfo | undefined;
        try {
          const rawCached = localStorage.getItem('hb_cached_donation_info');
          if (rawCached) localDonation = JSON.parse(rawCached);
        } catch {}

        const defaults = (initialDefaultDonationBankAccounts as BankAccount[]) || [];
        const accounts =
          sourceData.donationInfo.bankAccounts && sourceData.donationInfo.bankAccounts.length > 0
            ? sourceData.donationInfo.bankAccounts.map((acc: any, idx: number) => {
                const def = defaults[idx] || defaults.find((d) => d.bankName === acc.bankName);
                const hasValidQr = isValidQrUrl(acc.qrImageUrl);
                return {
                  ...acc,
                  qrImageUrl: hasValidQr ? acc.qrImageUrl : def?.qrImageUrl || acc.qrImageUrl || '',
                };
              })
            : defaults;
        const cleanDonationInfo: DonationInfo = { ...sourceData.donationInfo, bankAccounts: accounts };

        if (shouldAcceptRemoteUpdate(cleanDonationInfo.updatedAt, localDonation?.updatedAt)) {
          setDonationInfo((prev) => {
            const nextStr = JSON.stringify(cleanDonationInfo);
            if (prev && JSON.stringify(prev) === nextStr) return prev;
            try {
              localStorage.setItem('hb_cached_donation_info', nextStr);
            } catch {}
            return cleanDonationInfo;
          });
        } else if (isFromServerApi && localDonation) {
          fetch('/api/save-donation-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localDonation),
          }).catch(() => {});
        }
      }

      if (sourceData.globalSettings) {
        const g = sourceData.globalSettings;
        if (typeof g.autoThemeEnabled === 'boolean') {
          setAutoThemeEnabled((prev) => (prev === g.autoThemeEnabled ? prev : g.autoThemeEnabled));
        }
        if (typeof g.autoThemeStart === 'string' && g.autoThemeStart) {
          setAutoThemeStart((prev) => (prev === g.autoThemeStart ? prev : g.autoThemeStart));
        }
        if (typeof g.autoThemeEnd === 'string' && g.autoThemeEnd) {
          setAutoThemeEnd((prev) => (prev === g.autoThemeEnd ? prev : g.autoThemeEnd));
        }
        if (typeof g.logoUrl === 'string' && g.logoUrl) {
          try {
            const existingLogo = localStorage.getItem('hb_custom_logo');
            if (existingLogo !== g.logoUrl) {
              localStorage.setItem('hb_custom_logo', g.logoUrl);
              window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: g.logoUrl }));
            }
          } catch {}
        }
        if (typeof g.siteAccessKey === 'string' && g.siteAccessKey.trim()) {
          const currentAccess = resolveEffectiveSiteAccessConfig();
          if (shouldAcceptRemoteUpdate(g.updatedAt, currentAccess.updatedAt)) {
            saveStoredSiteAccessConfig({
              siteAccessMode: g.siteAccessMode === 'public' ? 'public' : 'link_only',
              siteAccessKey: g.siteAccessKey.trim(),
              siteCustomShareUrl: typeof g.siteCustomShareUrl === 'string' ? g.siteCustomShareUrl : currentAccess.siteCustomShareUrl,
              updatedAt: g.updatedAt || new Date().toISOString(),
            });
          }
        }
      }
    };

    try {
      // 1. Primary sync via server ledger API (/api/ministry-data)
      try {
        const res = await fetch(`/api/ministry-data?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const apiData = await res.json();
          if (apiData && apiData.success) {
            serverResponded = true;
            applyIncomingData(apiData, true);
          }
        }
      } catch {
        // Server API not reachable (e.g., pure static hosting) — fall back to Firestore below
      }

      // 2. Fallback / supplement via Cloud Firestore if read quota is available
      if (!serverResponded && !isFirestoreReadQuotaExceeded()) {
        const fsData = await loadFirestoreData();
        if (fsData && fsData.fromFirestore) {
          applyIncomingData(fsData, false);
        }
      }
    } catch {
      // Silent background sync
    }
  }, []);

  const handleSaveHomePoster = async (poster: HomePoster) => {
    try {
      setIsSyncing(true);
      const effectiveAccess = resolveEffectiveSiteAccessConfig(poster);
      const stampedPoster: HomePoster = {
        ...poster,
        siteAccessMode: poster.siteAccessMode || effectiveAccess.siteAccessMode,
        siteAccessKey: poster.siteAccessKey || effectiveAccess.siteAccessKey,
        siteCustomShareUrl: poster.siteCustomShareUrl ?? effectiveAccess.siteCustomShareUrl,
        updatedAt: new Date().toISOString(),
      };
      setHomePoster(stampedPoster);
      try {
        localStorage.setItem('hb_cached_home_poster', JSON.stringify(stampedPoster));
        if (stampedPoster.logoUrl) {
          localStorage.setItem('hb_custom_logo', stampedPoster.logoUrl);
          window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: stampedPoster.logoUrl }));
        } else if (stampedPoster.logoUrl === '') {
          localStorage.removeItem('hb_custom_logo');
          window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: '/hb-logo.svg' }));
        }
      } catch {}
      triggerSyncIndicator();

      const apiPromise = fetch('/api/save-home-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homePoster: stampedPoster }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data?.homePoster) {
              const cleanServerPoster = sanitizeClientHomePoster(data.homePoster);
              if (cleanServerPoster) {
                setHomePoster(cleanServerPoster);
                try {
                  localStorage.setItem('hb_cached_home_poster', JSON.stringify(cleanServerPoster));
                } catch {}
              }
            }
          }
        })
        .catch(() => {});

      const fsPromise = saveHomePosterToFirestore(stampedPoster).catch((e) =>
        console.warn('Client firestore saveHomePoster notice:', e)
      );

      await Promise.allSettled([apiPromise, fsPromise]);
    } catch (err) {
      setIsSyncing(false);
      console.error('Save poster error:', err);
      throw err;
    }
  };

  const handleSaveDonationInfo = async (info: DonationInfo) => {
    try {
      setIsSyncing(true);
      const stampedInfo: DonationInfo = {
        ...info,
        updatedAt: new Date().toISOString(),
      };
      setDonationInfo(stampedInfo);
      try {
        localStorage.setItem('hb_cached_donation_info', JSON.stringify(stampedInfo));
      } catch {}
      triggerSyncIndicator();

      const apiPromise = fetch('/api/save-donation-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stampedInfo),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data?.donationInfo) {
              setDonationInfo(data.donationInfo);
              try {
                localStorage.setItem('hb_cached_donation_info', JSON.stringify(data.donationInfo));
              } catch {}
            }
          }
        })
        .catch(() => {});

      const fsPromise = saveDonationInfoToFirestore(stampedInfo).catch((e) =>
        console.warn('Client firestore saveDonationInfo notice:', e)
      );

      await Promise.allSettled([apiPromise, fsPromise]);
    } catch (err) {
      setIsSyncing(false);
      console.error('Save donation info error:', err);
      throw err;
    }
  };

  // Real-time network status with automatic synchronization when signal is restored
  const {
    isOnline,
    wasOffline,
    isSyncing: isNetworkSyncing,
    lastSyncTime,
    triggerManualSync,
  } = useNetworkStatus(fetchMinistryData);

  const [isLocalSyncing, setIsLocalSyncing] = useState<boolean>(false);
  const setIsSyncing = setIsLocalSyncing;
  const isSyncing = isLocalSyncing || isNetworkSyncing;

  // Helper to trigger syncing indicator animation
  const triggerSyncIndicator = () => {
    setIsLocalSyncing(true);
    setTimeout(() => {
      setIsLocalSyncing(false);
    }, 1200);
  };

  // Real-time multi-user synchronization (Server-Sent Events + Periodic Poll + Cloud Firestore)
  useEffect(() => {
    fetchMinistryData();

    // 1. Server-Sent Events (SSE) stream for instant cross-browser/cross-device real-time updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime-stream');
      eventSource.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (!msg || msg.type !== 'update') return;

          if (msg.section === 'homePoster' && msg.payload) {
            const cleanPoster = sanitizeClientHomePoster(msg.payload as HomePoster);
            if (cleanPoster) {
              setHomePoster((prev) => {
                const nextStr = JSON.stringify(cleanPoster);
                if (prev && JSON.stringify(prev) === nextStr) return prev;
                try {
                  localStorage.setItem('hb_cached_home_poster', nextStr);
                  if (cleanPoster.logoUrl && cleanPoster.logoUrl !== prev?.logoUrl) {
                    localStorage.setItem('hb_custom_logo', cleanPoster.logoUrl);
                    window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: cleanPoster.logoUrl }));
                  }
                } catch {}
                return cleanPoster;
              });
            }
          } else if (msg.section === 'donationInfo' && msg.payload) {
            setDonationInfo((prev) => {
              const nextStr = JSON.stringify(msg.payload);
              if (prev && JSON.stringify(prev) === nextStr) return prev;
              try {
                localStorage.setItem('hb_cached_donation_info', nextStr);
              } catch {}
              return msg.payload;
            });
          } else if (msg.section === 'villages' && Array.isArray(msg.payload)) {
            const cleanVillages = sanitizeClientVillages(msg.payload);
            setVillages((prev) => {
              const nextStr = JSON.stringify(cleanVillages);
              if (JSON.stringify(prev) === nextStr) return prev;
              try {
                localStorage.setItem('hb_cached_villages', nextStr);
              } catch {}
              return cleanVillages;
            });
          } else if (msg.section === 'events' && Array.isArray(msg.payload)) {
            setEvents((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(msg.payload)) return prev;
              try {
                safeCacheEvents(msg.payload);
              } catch {}
              return msg.payload;
            });
          } else if (msg.section === 'teams' && Array.isArray(msg.payload)) {
            setTeams((prev) => {
              const nextStr = JSON.stringify(msg.payload);
              if (JSON.stringify(prev) === nextStr) return prev;
              try {
                localStorage.setItem('hb_cached_teams', nextStr);
              } catch {}
              return msg.payload;
            });
          } else if (msg.section === 'globalSettings' && msg.payload) {
            const g = msg.payload;
            if (typeof g.autoThemeEnabled === 'boolean') setAutoThemeEnabled((prev) => (prev === g.autoThemeEnabled ? prev : g.autoThemeEnabled));
            if (typeof g.autoThemeStart === 'string' && g.autoThemeStart) setAutoThemeStart((prev) => (prev === g.autoThemeStart ? prev : g.autoThemeStart));
            if (typeof g.autoThemeEnd === 'string' && g.autoThemeEnd) setAutoThemeEnd((prev) => (prev === g.autoThemeEnd ? prev : g.autoThemeEnd));
            if (typeof g.logoUrl === 'string' && g.logoUrl) {
              try {
                const existingLogo = localStorage.getItem('hb_custom_logo');
                if (existingLogo !== g.logoUrl) {
                  localStorage.setItem('hb_custom_logo', g.logoUrl);
                  window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: g.logoUrl }));
                }
              } catch {}
            }
          }
        } catch {}
      };
    } catch {}

    // 2. Silent background sync when tab regains visibility or every 15 seconds
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMinistryData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMinistryData();
      }
    }, 15000);

    // 3. Cloud Firestore real-time listeners (when read quota is available)
    let unsubVillages: (() => void) | undefined;
    let unsubEvents: (() => void) | undefined;
    let unsubTeams: (() => void) | undefined;
    let unsubHomePoster: (() => void) | undefined;
    let unsubDonation: (() => void) | undefined;
    let unsubGlobalSettings: (() => void) | undefined;

    const cleanupFirestoreListeners = () => {
      if (unsubVillages) { unsubVillages(); unsubVillages = undefined; }
      if (unsubEvents) { unsubEvents(); unsubEvents = undefined; }
      if (unsubTeams) { unsubTeams(); unsubTeams = undefined; }
      if (unsubHomePoster) { unsubHomePoster(); unsubHomePoster = undefined; }
      if (unsubDonation) { unsubDonation(); unsubDonation = undefined; }
      if (unsubGlobalSettings) { unsubGlobalSettings(); unsubGlobalSettings = undefined; }
    };

    const handleSnapshotError = (err: any) => {
      if (markFirestoreQuotaExceeded(err)) {
        cleanupFirestoreListeners();
      }
    };

    if (!isFirestoreReadQuotaExceeded()) {
      try {
        unsubVillages = onSnapshot(collection(db, 'villages'), (snapshot) => {
          if (!snapshot.empty) {
            hasFirestoreSnapshotRef.current.villages = true;
            const rawList = snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            const list = sanitizeClientVillages(rawList);
            setVillages((prev) => {
              const nextStr = JSON.stringify(list);
              if (JSON.stringify(prev) === nextStr) return prev;
              try { localStorage.setItem('hb_cached_villages', nextStr); } catch {}
              return list;
            });
          }
        }, handleSnapshotError);

        unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
          if (!snapshot.empty) {
            hasFirestoreSnapshotRef.current.events = true;
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EventData));
            setEvents((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
              try { safeCacheEvents(list); } catch {}
              return list;
            });
          }
        }, handleSnapshotError);

        unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
          if (!snapshot.empty) {
            hasFirestoreSnapshotRef.current.teams = true;
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TeamMember));
            setTeams((prev) => {
              const nextStr = JSON.stringify(list);
              if (JSON.stringify(prev) === nextStr) return prev;
              try { localStorage.setItem('hb_cached_teams', nextStr); } catch {}
              return list;
            });
          }
        }, handleSnapshotError);

        unsubHomePoster = onSnapshot(doc(db, 'app_config', 'homePoster'), (snapshot) => {
          if (snapshot.exists()) {
            hasFirestoreSnapshotRef.current.homePoster = true;
            const data = sanitizeClientHomePoster(snapshot.data() as HomePoster);
            if (data) {
              let localPoster: HomePoster | undefined;
              try {
                const raw = localStorage.getItem('hb_cached_home_poster');
                if (raw) localPoster = JSON.parse(raw);
              } catch {}
              if (shouldAcceptRemoteUpdate(data.updatedAt, localPoster?.updatedAt)) {
                setHomePoster((prev) => {
                  const nextStr = JSON.stringify(data);
                  if (prev && JSON.stringify(prev) === nextStr) return prev;
                  try {
                    localStorage.setItem('hb_cached_home_poster', nextStr);
                    if (data.logoUrl && data.logoUrl !== prev?.logoUrl) {
                      localStorage.setItem('hb_custom_logo', data.logoUrl);
                      window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: data.logoUrl }));
                    } else if (data.logoUrl === '' && prev?.logoUrl !== '') {
                      localStorage.removeItem('hb_custom_logo');
                      window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: '/hb-logo.svg' }));
                    }
                  } catch {}
                  return data;
                });
              }
            }
          }
        }, handleSnapshotError);

        unsubDonation = onSnapshot(doc(db, 'app_config', 'donationInfo'), (snapshot) => {
          if (snapshot.exists()) {
            hasFirestoreSnapshotRef.current.donationInfo = true;
            const data = snapshot.data() as DonationInfo;
            const defaults = (initialDefaultDonationBankAccounts as BankAccount[]) || [];
            const accounts = (data.bankAccounts && data.bankAccounts.length > 0)
              ? data.bankAccounts.map((acc: any, idx: number) => {
                  const def = defaults[idx] || defaults.find((d) => d.bankName === acc.bankName);
                  const hasValidQr = isValidQrUrl(acc.qrImageUrl);
                  return {
                    ...acc,
                    qrImageUrl: hasValidQr ? acc.qrImageUrl : (def?.qrImageUrl || acc.qrImageUrl || ''),
                  };
                })
              : defaults;
            const cleanDonation = { ...data, bankAccounts: accounts };
            let localDon: DonationInfo | undefined;
            try {
              const raw = localStorage.getItem('hb_cached_donation_info');
              if (raw) localDon = JSON.parse(raw);
            } catch {}
            if (shouldAcceptRemoteUpdate(cleanDonation.updatedAt, localDon?.updatedAt)) {
              setDonationInfo((prev) => {
                const nextStr = JSON.stringify(cleanDonation);
                if (prev && JSON.stringify(prev) === nextStr) return prev;
                try { localStorage.setItem('hb_cached_donation_info', nextStr); } catch {}
                return cleanDonation;
              });
            }
          }
        }, handleSnapshotError);

        unsubGlobalSettings = onSnapshot(doc(db, 'app_config', 'globalSettings'), (snapshot) => {
          if (snapshot.exists()) {
            const g = snapshot.data();
            if (typeof g.autoThemeEnabled === 'boolean') {
              setAutoThemeEnabled((prev) => (prev === g.autoThemeEnabled ? prev : g.autoThemeEnabled));
            }
            if (typeof g.autoThemeStart === 'string' && g.autoThemeStart) {
              setAutoThemeStart((prev) => (prev === g.autoThemeStart ? prev : g.autoThemeStart));
            }
            if (typeof g.autoThemeEnd === 'string' && g.autoThemeEnd) {
              setAutoThemeEnd((prev) => (prev === g.autoThemeEnd ? prev : g.autoThemeEnd));
            }
            if (typeof g.logoUrl === 'string' && g.logoUrl) {
              try {
                const existingLogo = localStorage.getItem('hb_custom_logo');
                if (existingLogo !== g.logoUrl) {
                  localStorage.setItem('hb_custom_logo', g.logoUrl);
                  window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: g.logoUrl }));
                }
              } catch {}
            }
          }
        }, handleSnapshotError);
      } catch (err) {
        console.warn('Realtime subscription notice:', err);
      }
    }

    return () => {
      if (eventSource) eventSource.close();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(syncInterval);
      cleanupFirestoreListeners();
    };
  }, [fetchMinistryData]);

  // Filtered Villages according to Slicers & Time Range & Calendar Date Pickers
  const filteredVillages = useMemo(() => {
    const now = new Date();

    const normalizeDateStr = (dateVal: string | undefined): string => {
      if (!dateVal) return '';
      const isoMatch = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      const dmyMatch = dateVal.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (dmyMatch) {
        return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
      }
      const parsed = new Date(dateVal);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return dateVal.split('T')[0];
    };

    return villages.filter((v) => {
      if (activeTab !== 'admin' && v.hidden) return false;
      const matchProv =
        selectedProvince === 'all' ||
        v.province === selectedProvince ||
        (v as any).provinceEn === selectedProvince;

      const matchDist =
        selectedDistrict === 'all' ||
        v.district === selectedDistrict ||
        v.districtEn === selectedDistrict ||
        (v as any).districtTh === selectedDistrict;

      const matchChurch =
        selectedChurch === 'all' ||
        v.name === selectedChurch ||
        v.nameEn === selectedChurch ||
        v.id === selectedChurch ||
        String(v.rowId) === selectedChurch;

      const matchStatus = selectedStatus === 'all' || v.persecution === selectedStatus;

      let matchTime = true;
      if (selectedTimeRange === 'custom') {
        const effectiveStart = startDate || '';
        const effectiveEnd = endDate || '';
        if (effectiveStart || effectiveEnd) {
          let hasActivity = false;
          // 1. Check update history logs
          if (Array.isArray(v.history) && v.history.length > 0) {
            hasActivity = v.history.some((log) => {
              const isBase = log.notes === 'Initial Baseline Record' || (log.id && log.id.startsWith('init_'));
              if (isBase) {
                // If it's the initial planting record, count it ONLY if the church was planted within this window
                const pd = normalizeDateStr(v.initialDate || log.date);
                if (!pd) return false;
                if (effectiveStart && pd < effectiveStart) return false;
                if (effectiveEnd && pd > effectiveEnd) return false;
                return true;
              }
              const ld = normalizeDateStr(log.date);
              if (!ld) return false;
              if (effectiveStart && ld < effectiveStart) return false;
              if (effectiveEnd && ld > effectiveEnd) return false;
              return true;
            });
          } else {
            // 2. Village has no history logs: check if newly planted within this window
            const plantDate = normalizeDateStr(v.initialDate || v.date);
            if (plantDate) {
              let vInRange = true;
              if (effectiveStart && plantDate < effectiveStart) vInRange = false;
              if (effectiveEnd && plantDate > effectiveEnd) vInRange = false;
              hasActivity = vInRange;
            }
          }
          matchTime = hasActivity;
        }
      } else if (selectedTimeRange !== 'all') {
        const maxDays = selectedTimeRange === 'week' ? 7 : selectedTimeRange === 'month' ? 30 : 365;
        let hasActivity = false;
        if (Array.isArray(v.history) && v.history.length > 0) {
          hasActivity = v.history.some((log) => {
            const isBase = log.notes === 'Initial Baseline Record' || (log.id && log.id.startsWith('init_'));
            if (isBase) {
              const pd = normalizeDateStr(v.initialDate || log.date);
              if (!pd) return false;
              const plantDate = new Date(pd);
              if (!isNaN(plantDate.getTime())) {
                const diffDays = (now.getTime() - plantDate.getTime()) / (1000 * 3600 * 24);
                return diffDays >= 0 && diffDays <= maxDays;
              }
              return false;
            }
            const ld = normalizeDateStr(log.date);
            if (!ld) return false;
            const logDate = new Date(ld);
            if (!isNaN(logDate.getTime())) {
              const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
              return diffDays >= 0 && diffDays <= maxDays;
            }
            return false;
          });
        } else {
          const pd = normalizeDateStr(v.initialDate || v.date);
          if (pd) {
            const plantDate = new Date(pd);
            if (!isNaN(plantDate.getTime())) {
              const diffDays = (now.getTime() - plantDate.getTime()) / (1000 * 3600 * 24);
              hasActivity = diffDays >= 0 && diffDays <= maxDays;
            }
          }
        }
        matchTime = hasActivity;
      }

      return matchProv && matchDist && matchChurch && matchStatus && matchTime;
    });
  }, [villages, activeTab, selectedProvince, selectedDistrict, selectedChurch, selectedStatus, selectedTimeRange, startDate, endDate]);

  const handleResetFilters = () => {
    setSelectedProvince('all');
    setSelectedDistrict('all');
    setSelectedChurch('all');
    setSelectedStatus('all');
    setSelectedTimeRange('all');
    setStartDate('');
    setEndDate('');
    try {
      sessionStorage.removeItem('hb_filter_province');
      sessionStorage.removeItem('hb_filter_district');
      sessionStorage.removeItem('hb_filter_church');
      sessionStorage.removeItem('hb_filter_status');
      sessionStorage.removeItem('hb_filter_time_range');
      sessionStorage.removeItem('hb_filter_start_date');
      sessionStorage.removeItem('hb_filter_end_date');
    } catch {}
  };

  // Direct save/update village handler for Church Edit Portal (Room 1) and Admin (Room 2)
  const handleSaveVillageRecord = async (updatedVillage: Village) => {
    try {
      setIsSyncing(true);

      // 1. Instant optimistic update to local state and localStorage for instant reactivity in Insights
      setVillages((prev) => {
        const exists = prev.some(
          (v) => (updatedVillage.id && v.id === updatedVillage.id) || v.rowId === updatedVillage.rowId
        );
        const next = exists
          ? prev.map((v) =>
              (updatedVillage.id && v.id === updatedVillage.id) || v.rowId === updatedVillage.rowId
                ? { ...v, ...updatedVillage }
                : v
            )
          : [...prev, updatedVillage];
        try {
          localStorage.setItem('hb_cached_villages', JSON.stringify(next));
        } catch {}
        return next;
      });
      triggerSyncIndicator();

      // 2. Parallel sync to backend API (which updates in-memory server state and server-side Firestore)
      const apiPromise = fetch('/api/save-village', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedVillage),
      }).catch((e) => console.warn('Backend save-village notice:', e));

      // 3. Parallel sync to client Firestore
      const firestorePromise = saveVillageToFirestore(updatedVillage).catch((e) =>
        console.warn('Client firestore save warning:', e)
      );

      await Promise.allSettled([apiPromise, firestorePromise]);
    } catch (err) {
      console.error('Failed to save village update:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Direct save/update event handler
  const handleSaveEventRecord = async (updatedEvent: EventData) => {
    try {
      setIsSyncing(true);
      setEvents((prev) => {
        const exists = prev.some(
          (e) => e.rowId === updatedEvent.rowId || (updatedEvent.id && e.id === updatedEvent.id)
        );
        const next = exists
          ? prev.map((e) =>
              e.rowId === updatedEvent.rowId || (updatedEvent.id && e.id === updatedEvent.id)
                ? { ...e, ...updatedEvent }
                : e
            )
          : [updatedEvent, ...prev];
        try {
          localStorage.setItem('hb_cached_events', JSON.stringify(next));
        } catch {}
        return next;
      });
      triggerSyncIndicator();

      const apiPromise = fetch('/api/save-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent),
      }).catch(() => {});

      const fsPromise = saveEventToFirestore(updatedEvent).catch((e) =>
        console.warn('Client firestore saveEvent notice:', e)
      );

      await Promise.allSettled([apiPromise, fsPromise]);
    } catch (err) {
      setIsSyncing(false);
      console.error('Failed to save event update:', err);
    }
  };

  // Direct save/update team member handler
  const handleSaveTeamRecord = async (updatedTeam: TeamMember) => {
    try {
      setIsSyncing(true);
      let saved = updatedTeam;
      try {
        saved = await saveTeamToFirestore(updatedTeam);
      } catch (e) {
        console.warn('Client firestore saveTeam notice:', e);
      }
      setTeams((prev) => {
        const targetId = updatedTeam.id;
        const targetRowId = updatedTeam.rowId;
        const targetName = updatedTeam.name?.trim().toLowerCase();

        const exists = prev.some(
          (t) =>
            (targetId && t.id === targetId) ||
            (targetRowId && t.rowId === targetRowId) ||
            (targetName && t.name?.trim().toLowerCase() === targetName)
        );

        const next = exists
          ? prev.map((t) =>
              (targetId && t.id === targetId) ||
              (targetRowId && t.rowId === targetRowId) ||
              (targetName && t.name?.trim().toLowerCase() === targetName)
                ? { ...t, ...saved, hidden: Boolean(updatedTeam.hidden) }
                : t
            )
          : [...prev, saved];
        try {
          localStorage.setItem('hb_cached_teams', JSON.stringify(next));
        } catch {}
        return next;
      });
      triggerSyncIndicator();

      fetch('/api/save-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTeam),
      }).catch(() => {});
    } catch (err) {
      setIsSyncing(false);
      console.error('Failed to save team update:', err);
    }
  };

  // CRUD actions
  const handleDeleteVillage = async (rowId: number) => {
    try {
      setIsSyncing(true);
      const targetVillage = villages.find((v) => v.rowId === rowId);
      await deleteVillageFromFirestore(rowId, targetVillage?.id);
      setVillages((prev) => prev.filter((v) => v.rowId !== rowId));
      triggerSyncIndicator();

      fetch('/api/delete-village', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId }),
      }).catch(() => {});
    } catch (err) {
      setIsSyncing(false);
      console.error('Delete village error:', err);
    }
  };

  const handleDeleteEvent = async (rowId: number) => {
    try {
      setIsSyncing(true);
      const targetEvent = events.find((e) => e.rowId === rowId);
      await deleteEventFromFirestore(rowId, targetEvent?.id);
      setEvents((prev) => {
        const remaining = prev.filter((e) => e.rowId !== rowId && (!targetEvent?.id || e.id !== targetEvent.id));
        try {
          localStorage.setItem('hb_cached_events', JSON.stringify(remaining));
        } catch {}
        return remaining;
      });
      triggerSyncIndicator();

      fetch('/api/delete-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId, id: targetEvent?.id }),
      }).catch(() => {});
    } catch (err) {
      setIsSyncing(false);
      console.error('Delete event error:', err);
    }
  };

  const handleDeleteTeam = async (rowId: number, id?: string) => {
    try {
      setIsSyncing(true);
      const targetTeam = teams.find((t) => (id && t.id === id) || t.rowId === rowId);
      await deleteTeamFromFirestore(rowId, id || targetTeam?.id);
      setTeams((prev) => prev.filter((t) => (id ? t.id !== id : t.rowId !== rowId)));
      triggerSyncIndicator();

      fetch('/api/delete-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId, id }),
      }).catch(() => {});
    } catch (err) {
      setIsSyncing(false);
      console.error('Delete team error:', err);
    }
  };

  const hasCustomBgColor = Boolean(homePoster?.bgColor && homePoster.bgColor.trim() !== '' && homePoster.bgColor.trim() !== '#ffffff');
  const hasCustomBgImage = Boolean(homePoster?.bgImageUrl && homePoster.bgImageUrl.trim() !== '');
  const [resolvedBgImageUrl, setResolvedBgImageUrl] = useState<string>(() =>
    getCachedUploadUrl(homePoster?.bgImageUrl || '')
  );

  useEffect(() => {
    const rawBg = homePoster?.bgImageUrl?.trim() || '';
    if (!rawBg) {
      setResolvedBgImageUrl('');
      return;
    }
    const cached = getCachedUploadUrl(rawBg);
    setResolvedBgImageUrl(cached);
    if (rawBg.includes('/uploads/')) {
      let active = true;
      resolveUploadUrl(rawBg).then((resolved) => {
        if (active && resolved) {
          setResolvedBgImageUrl(resolved);
        }
      });
      return () => {
        active = false;
      };
    }
  }, [homePoster?.bgImageUrl]);

  const bgBrightness = typeof homePoster?.bgBrightness === 'number' ? homePoster.bgBrightness : 100;
  const bgBlur = typeof homePoster?.bgBlur === 'number' ? homePoster.bgBlur : 0;
  const bgWhiteOverlayOpacity = typeof homePoster?.bgWhiteOverlayOpacity === 'number'
    ? homePoster.bgWhiteOverlayOpacity
    : typeof (homePoster as any)?.bgWhiteOpacity === 'number'
    ? (homePoster as any).bgWhiteOpacity
    : 0;

  return (
    <SiteAccessGate homePoster={homePoster} language={language}>
    <div
      className={`${darkMode ? 'dark text-slate-100' : 'text-slate-800'} ${
        !hasCustomBgColor && !hasCustomBgImage
          ? darkMode
            ? 'bg-slate-950'
            : 'bg-[#faf8f5]'
          : hasCustomBgImage
          ? 'bg-transparent'
          : ''
      } min-h-screen w-full max-w-full overflow-x-hidden transition-colors duration-300 flex flex-col font-sans relative`}
      style={{
        backgroundColor: !hasCustomBgImage && hasCustomBgColor ? homePoster!.bgColor : undefined,
      }}
    >
      {/* Auto Update Listener for live sync across Studio and Web */}
      <AutoUpdateListener />

      {/* Blurred & Gently Tinted Background Wallpaper Layer (ສາກຫຼັງພື້ນເວັບໄຊ - ຮູບພາບ, ຄວາມສະຫວ່າງ/ຄວາມມືດ, ຄວາມເບີ ແລະ ຄວາມຂາວບັງພາບ) */}
      {hasCustomBgImage && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
          <div
            className="absolute -inset-4 bg-cover bg-center bg-no-repeat transition-all duration-300 scale-105"
            style={{
              backgroundImage: `url("${resolvedBgImageUrl || homePoster!.bgImageUrl}")`,
              filter: `blur(${bgBlur}px) brightness(${bgBrightness}%)`,
            }}
          />
          {/* White Mask / Overlay Layer (ຄວາມຂາວບັງພາບ - ປັບຄວາມເຂັ້ມສີຂາວບັງພາບຕາມຕ້ອງການ) */}
          {bgWhiteOverlayOpacity > 0 && (
            <div
              className="absolute inset-0 bg-white transition-opacity duration-300"
              style={{ opacity: bgWhiteOverlayOpacity / 100 }}
            />
          )}
          {/* Subtle translucent tint overlay so content remains readable */}
          {hasCustomBgColor ? (
            <div
              className="absolute inset-0 transition-opacity"
              style={{
                backgroundColor: homePoster!.bgColor,
                opacity: 0.18,
              }}
            />
          ) : (
            bgWhiteOverlayOpacity === 0 && <div className="absolute inset-0 bg-white/10 dark:bg-slate-950/40" />
          )}
        </div>
      )}

      {!hasCustomBgImage && hasCustomBgColor && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{ backgroundColor: homePoster!.bgColor }}
        />
      )}

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        autoThemeEnabled={autoThemeEnabled}
        setAutoThemeEnabled={setAutoThemeEnabled}
        autoThemeStart={autoThemeStart}
        setAutoThemeStart={setAutoThemeStart}
        autoThemeEnd={autoThemeEnd}
        setAutoThemeEnd={setAutoThemeEnd}
        isSyncing={isSyncing}
        logoUrl={homePoster?.logoUrl}
      />

      {/* Network Status & Automatic Real-Time Synchronization Banner */}
      <NetworkStatusBar
        isOnline={isOnline}
        wasOffline={wasOffline}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        language={language}
        onManualSync={triggerManualSync}
      />

      {/* Main Container — Full width fluid responsive across phone, tablet, and widescreen */}
      <main className={`flex-1 w-full max-w-full ${activeTab === 'home' || activeTab === 'about' || activeTab === 'dashboard' ? 'p-0 space-y-0' : activeTab === 'admin' ? 'px-1 sm:px-2 md:px-3 lg:px-4 py-1.5 sm:py-3 space-y-2 sm:space-y-3' : 'px-0.5 sm:px-1.5 md:px-3 lg:px-4 py-2 sm:py-3.5 space-y-2.5 sm:space-y-3.5'} relative overflow-x-hidden`}>
        {/* Global Filter Panel (Shown on Dashboard only) */}
        {activeTab === 'dashboard' && (
          <FilterPanel
            villages={villages}
            selectedProvince={selectedProvince}
            setSelectedProvince={setSelectedProvince}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
            selectedChurch={selectedChurch}
            setSelectedChurch={setSelectedChurch}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onResetFilters={handleResetFilters}
            language={language}
            homePoster={homePoster}
          />
        )}

        {/* Tab 1: Home */}
        {activeTab === 'home' && (
          <HomeTab
            events={events}
            villages={villages}
            homePoster={homePoster}
            donationInfo={donationInfo}
            language={language}
            onSaveHomePoster={handleSaveHomePoster}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onNavigateToMap={() => {
              handleResetFilters();
              try {
                sessionStorage.setItem('hb_scroll_target', 'dashboard-area-map-section');
              } catch {}
              setActiveTab('dashboard', { skipScrollRestore: true });
              window.dispatchEvent(new CustomEvent('hb_expand_dashboard_map'));
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('hb_expand_dashboard_map'));
              }, 80);
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('hb_expand_dashboard_map'));
              }, 250);
            }}
            onNavigateToAbout={() => setActiveTab('about')}
            onNavigateToAdmin={(subTab) => {
              if (subTab) {
                try {
                  sessionStorage.setItem('hb_admin_sub_tab', subTab);
                  localStorage.setItem('hb_admin_sub_tab', subTab);
                } catch {}
              }
              setActiveTab('admin');
            }}
          />
        )}

        {/* Tab 2: Dashboard (Deep Insights - includes Chart, Excel Data Table & Embedded Map) */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            filteredVillages={filteredVillages}
            language={language}
            selectedProvince={selectedProvince}
            selectedDistrict={selectedDistrict}
            selectedChurch={selectedChurch}
            selectedTimeRange={selectedTimeRange}
            startDate={startDate}
            endDate={endDate}
          />
        )}

        {/* Tab 3: About Us */}
        {activeTab === 'about' && (
          <AboutTab
            teams={teams}
            donationInfo={donationInfo}
            homePoster={homePoster}
            language={language}
            setLanguage={setLanguage}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onOpenSettings={() => {
              try {
                sessionStorage.setItem('hb_settings_unlocked', 'true');
                sessionStorage.setItem('hb_admin_feature', 'settings');
                sessionStorage.setItem('hb_admin_main_tab', 'about');
                sessionStorage.setItem('hb_admin_sub_tab', 'about_poster');
                localStorage.setItem('hb_admin_main_tab', 'about');
                localStorage.setItem('hb_admin_sub_tab', 'about_poster');
              } catch {}
              setActiveTab('admin');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('hb_open_about_poster_settings'));
              }, 50);
            }}
          />
        )}

        {/* Tab 4: Room 1 - Church Edit Portal (ອັບເດດຂໍ້ມູນຄຣິດຕະຈັກ) */}
        {activeTab === 'church-portal' && (
          <ChurchEditPortal
            villages={villages}
            onSaveVillage={handleSaveVillageRecord}
            language={language}
            onBack={() => setActiveTab('home')}
          />
        )}

        {/* Tab 5: Master Admin Area (ຫ້ອງແອັດມິນ) */}
        {activeTab === 'admin' && (
          <AdminTab
            villages={villages}
            events={events}
            teams={teams}
            homePoster={homePoster}
            donationInfo={donationInfo}
            onSaveHomePoster={handleSaveHomePoster}
            onSaveDonationInfo={handleSaveDonationInfo}
            onSaveVillage={handleSaveVillageRecord}
            onSaveEvent={handleSaveEventRecord}
            onSaveTeam={handleSaveTeamRecord}
            onRefreshData={fetchMinistryData}
            onOpenAddVillage={() => {
              setVillageToEdit(null);
              setIsVillageModalOpen(true);
            }}
            onEditVillage={(v) => {
              setVillageToEdit(v);
              setIsVillageModalOpen(true);
            }}
            onDeleteVillage={handleDeleteVillage}
            onOpenAddEvent={() => {
              setEventToEdit(null);
              setIsEventModalOpen(true);
            }}
            onEditEvent={(e) => {
              setEventToEdit(e);
              setIsEventModalOpen(true);
            }}
            onDeleteEvent={handleDeleteEvent}
            onOpenAddTeam={() => {
              setTeamToEdit(null);
              setIsTeamModalOpen(true);
            }}
            onEditTeam={(t) => {
              setTeamToEdit(t);
              setIsTeamModalOpen(true);
            }}
            onDeleteTeam={handleDeleteTeam}
            language={language}
            onBackToHome={() => setActiveTab('home')}
          />
        )}
      </main>

      {/* Floating AI Assistant Button & Modal — Always bottom-right, no blur overlay */}
      <div className="fixed bottom-5 right-5 z-40">
        {!isAiOpen && (
          <button
            onClick={() => setIsAiOpen(true)}
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#cc0000] hover:bg-black text-white font-bold shadow-lg shadow-red-600/30 flex items-center justify-center border border-white/30 transition transform hover:scale-105 active:scale-95 group"
            title={
              language === 'lo'
                ? 'AI ຜູ້ຊ່ວຍ Hope Bokeo'
                : language === 'th'
                ? 'AI ผู้ช่วย Hope Bokeo'
                : 'Hope Bokeo AI Assistant'
            }
          >
            <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5 animate-pulse text-amber-300" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
          </button>
        )}
      </div>

      {/* Floating AI Assistant Modal with Resizable & Expandable Container */}
      {isAiOpen && (
        <>
          {/* Backdrop overlay to catch clicks outside the modal and close AI */}
          <div
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsAiOpen(false)}
          />
          <div
            className={`fixed z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 animate-fade-in transition-all duration-300 ${
              isAiExpanded
                ? 'inset-3 sm:inset-8 max-w-5xl mx-auto my-auto h-[92vh] flex flex-col justify-between'
                : 'bottom-4 right-4 w-[94vw] max-w-md sm:max-w-lg'
            }`}
          >
            <AiAssistant
              sheetTitle="Hope Bokeo Ministry"
              headers={['id', 'name', 'district', 'believers', 'baptized', 'persecution', 'needs']}
              rows={villages.map((v) => [
                v.id,
                v.name,
                v.district,
                v.believers.toString(),
                v.baptized.toString(),
                v.persecution,
                v.needs,
              ])}
              language={language}
              whatsappNumber={donationInfo?.prayerContactWhatsapp || '8562076838584'}
              onClose={() => setIsAiOpen(false)}
              isExpanded={isAiExpanded}
              onToggleExpand={() => setIsAiExpanded(!isAiExpanded)}
            />
          </div>
        </>
      )}

      {/* Modals */}
      <VillageModal
        isOpen={isVillageModalOpen}
        onClose={() => setIsVillageModalOpen(false)}
        villageToEdit={villageToEdit}
        onSaveSuccess={(savedVillage?: Village) => {
          if (savedVillage) {
            setVillages((prev) => {
              const exists = prev.some((v) => v.rowId === savedVillage.rowId || v.id === savedVillage.id);
              const updated = exists
                ? prev.map((v) =>
                    v.rowId === savedVillage.rowId || v.id === savedVillage.id ? { ...v, ...savedVillage } : v
                  )
                : [...prev, savedVillage];
              try {
                localStorage.setItem('hb_cached_villages', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
          triggerSyncIndicator();
        }}
        language={language}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        eventToEdit={eventToEdit}
        onSaveSuccess={(savedEvent) => {
          if (savedEvent) {
            setEvents((prev) => {
              const idx = prev.findIndex(
                (e) => (savedEvent.id && e.id === savedEvent.id) || e.rowId === savedEvent.rowId
              );
              let updated: EventData[];
              if (idx >= 0) {
                updated = [...prev];
                updated[idx] = { ...prev[idx], ...savedEvent };
              } else {
                updated = [savedEvent, ...prev];
              }
              safeCacheEvents(updated);
              return updated;
            });
          }
          triggerSyncIndicator();
        }}
        language={language}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        teamToEdit={teamToEdit}
        onSaveSuccess={(savedTeam) => {
          if (savedTeam) {
            setTeams((prev) => {
              const idx = prev.findIndex(
                (t) => (savedTeam.id && t.id === savedTeam.id) || t.rowId === savedTeam.rowId
              );
              let updated: TeamMember[];
              if (idx >= 0) {
                updated = [...prev];
                updated[idx] = { ...prev[idx], ...savedTeam };
              } else {
                updated = [...prev, savedTeam];
              }
              try {
                localStorage.setItem('hb_cached_teams', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
          triggerSyncIndicator();
        }}
        language={language}
      />

      {/* Footer */}
      <footer className="bg-[#faf8f5] dark:bg-slate-950 py-3 px-3 sm:px-6 text-[11px] text-slate-500 dark:text-slate-400 mt-auto transition-colors">
        <div className="w-full flex items-center justify-between font-medium leading-tight max-w-7xl mx-auto">
          <span className="inline-flex items-center gap-1.5 flex-wrap">
            <HbLogo logoUrl={homePoster?.logoUrl} className="h-3.5 w-auto text-[#ee1c25] shrink-0" />
            <span>© 2026 Hope Bokeo Ministry • Bokeo Province, Lao PDR</span>
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-[11px] font-medium cursor-pointer"
            title={language === 'lo' ? 'ລະບົບແອັດມິນ' : 'Admin Portal'}
          >
            <Lock className="w-3 h-3 text-slate-400" />
            <span>{language === 'lo' ? 'ແອັດມິນ' : language === 'th' ? 'แอดมิน' : 'Admin'}</span>
          </button>
        </div>
      </footer>
    </div>
    </SiteAccessGate>
  );
}

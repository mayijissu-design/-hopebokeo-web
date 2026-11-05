import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldCheck, RotateCw, RotateCcw, Plus, Edit2, Edit3, Trash2, KeyRound, Check, RefreshCw, Lock, Unlock, Sparkles, LayoutGrid, ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Users, Building, Image as ImageIcon, Save, Loader2, Palette, Map, Eye, EyeOff, Search, ExternalLink, Upload, Settings, Move, Target, Crosshair, BookOpen, Maximize2, Church, Wallet, Coins, FileText, Sliders, Sun, Moon, Layers, Calendar } from 'lucide-react';
import { Heart, CreditCard, QrCode, X } from 'lucide-react';
import { Village, EventData, TeamMember, HomePoster, DonationInfo, Language, BankAccount, PosterImageCustomSetting, UpcomingScheduleItem, MinistryTimelineItem } from '../types';
import { DEFAULT_BOKEO_TIMELINE } from '../data/timelineDefaults';
import initialDefaultDonationBankAccounts from '../data/donationBankAccounts.json';
import { UnifiedMediaUploader } from './UnifiedMediaUploader';
import { MultiImageUploader } from './MultiImageUploader';
import { QRCodeDisplay } from './QRCodeDisplay';
import { HbLogo } from './HbLogo';
import { ChurchEditPortal } from './ChurchEditPortal';
import { FinanceTab } from './FinanceTab';
import { PosterSettingsSection } from './PosterSettingsSection';
import { AboutPosterSettingsSection } from './AboutPosterSettingsSection';
import { InsightsPosterSettingsSection } from './InsightsPosterSettingsSection';
import { CommunitiesSettingsSection } from './CommunitiesSettingsSection';
import { PrayerSettingsSection } from './PrayerSettingsSection';
import { EventReportModal } from './EventReportModal';
import { formatDateRange } from '../utils/dateFormatter';
import { compressImageFile, shrinkBase64DataUrl, optimizePosterForFirestore } from '../utils/imageCompressor';
import { uploadFileDirectly } from '../utils/fileUploader';
import { getLocalizedRole } from '../utils/roleUtils';
import {
  parseCoordinatesFromUrl,
  isShortenedMapsUrl,
  resolveMapsUrlViaApi,
  normalizeCoordinates,
} from '../utils/mapUtils';

interface AdminTabProps {
  villages: Village[];
  events: EventData[];
  teams: TeamMember[];
  homePoster?: HomePoster;
  donationInfo?: DonationInfo;
  onSaveHomePoster?: (poster: HomePoster) => Promise<void>;
  onSaveDonationInfo?: (info: DonationInfo) => Promise<void>;
  onSaveVillage?: (village: Village) => Promise<void>;
  onSaveEvent?: (event: EventData) => Promise<void>;
  onSaveTeam?: (team: TeamMember) => Promise<void>;
  onRefreshData: () => void;
  onOpenAddVillage: () => void;
  onEditVillage: (v: Village) => void;
  onDeleteVillage: (rowId: number) => void;
  onOpenAddEvent: () => void;
  onEditEvent: (e: EventData) => void;
  onDeleteEvent: (rowId: number) => void;
  onOpenAddTeam: () => void;
  onEditTeam: (t: TeamMember) => void;
  onDeleteTeam: (rowId: number, id?: string) => void;
  language: Language;
  onBackToHome?: () => void;
}

export const AdminTab: React.FC<AdminTabProps> = ({
  villages,
  events,
  teams,
  homePoster,
  donationInfo,
  onSaveHomePoster,
  onSaveDonationInfo,
  onSaveVillage,
  onSaveEvent,
  onSaveTeam,
  onRefreshData,
  onOpenAddVillage,
  onEditVillage,
  onDeleteVillage,
  onOpenAddEvent,
  onEditEvent,
  onDeleteEvent,
  onOpenAddTeam,
  onEditTeam,
  onDeleteTeam,
  language,
  onBackToHome,
}) => {
  const [adminActiveFeature, setAdminActiveFeature] = useState<'hub' | 'settings' | 'church_update' | 'finance'>(() => {
    try {
      const sub = sessionStorage.getItem('hb_admin_sub_tab');
      if (sub === 'about_poster' || sub === 'poster' || sub === 'upcoming') return 'settings';
      const feat = sessionStorage.getItem('hb_admin_feature');
      if (feat && ['hub', 'settings', 'church_update', 'finance'].includes(feat)) return feat as any;
      const hash = window.location.hash.replace(/^#/, '');
      if (hash === 'settings') return 'settings';
      if (hash === 'finance') return 'finance';
      if (hash === 'church_update' || hash === 'church-update') return 'church_update';
    } catch {}
    return 'hub';
  });

  // Auto-lock all rooms when leaving the Admin tab (unmount cleanup)
  useEffect(() => {
    return () => {
      try {
        sessionStorage.removeItem('hb_settings_unlocked');
        localStorage.removeItem('hb_settings_unlocked');
        sessionStorage.removeItem('hb_finance_unlocked');
        localStorage.removeItem('hb_finance_unlocked');
        sessionStorage.removeItem('hb_admin_feature');
        localStorage.removeItem('hb_admin_feature');
      } catch {}
    };
  }, []);

  // Listen to hashchange so clicking between header and rooms is immediate
  useEffect(() => {
    const handleHash = () => {
      try {
        const hash = window.location.hash.replace(/^#/, '');
        if (hash === 'admin' || !hash || hash === 'hub') {
          setAdminActiveFeature('hub');
        } else if (hash === 'finance') {
          setAdminActiveFeature('finance');
        } else if (hash === 'settings') {
          setAdminActiveFeature('settings');
        } else if (hash === 'church_update' || hash === 'church-update') {
          setAdminActiveFeature('church_update');
        }
      } catch {}
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const [adminMainTab, setAdminMainTab] = useState<'home' | 'dashboard' | 'churches' | 'about'>(() => {
    try {
      const sub = sessionStorage.getItem('hb_admin_sub_tab');
      if (sub === 'about_poster' || sub === 'teams' || sub === 'donation') {
        return 'about';
      }
      if (sub === 'insights_poster' || sub === 'pins') {
        return 'dashboard';
      }
      const sessionSaved = sessionStorage.getItem('hb_admin_main_tab');
      if (sessionSaved && ['home', 'dashboard', 'churches', 'about'].includes(sessionSaved)) {
        return sessionSaved as any;
      }
      const saved = localStorage.getItem('hb_admin_main_tab');
      if (saved && ['home', 'dashboard', 'churches', 'about'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'home';
  });
  const [adminSubTab, setAdminSubTab] = useState<'poster' | 'upcoming' | 'events' | 'communities' | 'prayer' | 'insights_poster' | 'pins' | 'villages' | 'maps' | 'teams' | 'donation' | 'about_poster'>(() => {
    try {
      const sessionSaved = sessionStorage.getItem('hb_admin_sub_tab');
      if (sessionSaved && ['poster', 'upcoming', 'events', 'communities', 'prayer', 'insights_poster', 'pins', 'villages', 'maps', 'teams', 'donation', 'about_poster'].includes(sessionSaved)) {
        return sessionSaved as any;
      }
      const saved = localStorage.getItem('hb_admin_sub_tab');
      if (saved && ['poster', 'upcoming', 'events', 'communities', 'prayer', 'insights_poster', 'pins', 'villages', 'maps', 'teams', 'donation', 'about_poster'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'poster';
  });

  const [openMenuGroup, setOpenMenuGroup] = useState<string | null>(() => adminMainTab);
  const [donationOpenSections, setDonationOpenSections] = useState<Record<string, boolean>>({});
  const [mapsOpenSections, setMapsOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDonationOpenSections({});
    setMapsOpenSections({});
  }, [adminSubTab]);

  const toggleDonationSection = (key: string) => {
    setDonationOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const isDonationOpen = (key: string) => Boolean(donationOpenSections[key]);

  const toggleMapsSection = (key: string) => {
    setMapsOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const isMapsOpen = (key: string) => Boolean(mapsOpenSections[key]);

  useEffect(() => {
    try {
      if (adminActiveFeature === 'hub') {
        sessionStorage.setItem('hb_admin_feature', 'hub');
        try {
          localStorage.removeItem('hb_admin_feature');
        } catch {}
        if (window.location.hash !== '#admin') {
          window.history.replaceState({ tab: 'admin' }, '', '#admin');
        }
      } else if (adminActiveFeature === 'finance') {
        sessionStorage.setItem('hb_admin_feature', 'finance');
        if (window.location.hash !== '#finance') {
          window.history.replaceState({ tab: 'admin', feature: 'finance' }, '', '#finance');
        }
      } else if (adminActiveFeature === 'settings') {
        sessionStorage.setItem('hb_admin_feature', 'settings');
        if (window.location.hash !== '#settings') {
          window.history.replaceState({ tab: 'admin', feature: 'settings' }, '', '#settings');
        }
      } else if (adminActiveFeature === 'church_update') {
        sessionStorage.setItem('hb_admin_feature', 'church_update');
        if (window.location.hash !== '#church-update') {
          window.history.replaceState({ tab: 'admin', feature: 'church_update' }, '', '#church-update');
        }
      }
    } catch {}
  }, [adminActiveFeature]);

  useEffect(() => {
    try {
      localStorage.setItem('hb_admin_main_tab', adminMainTab);
    } catch {}
  }, [adminMainTab]);

  useEffect(() => {
    try {
      localStorage.setItem('hb_admin_sub_tab', adminSubTab);
    } catch {}
  }, [adminSubTab]);

  useEffect(() => {
    const handleOpenUpcomingSettings = () => {
      setAdminActiveFeature('settings');
      setAdminMainTab('home');
      setAdminSubTab('upcoming');
      try {
        sessionStorage.setItem('hb_admin_feature', 'settings');
        sessionStorage.setItem('hb_admin_sub_tab', 'upcoming');
        localStorage.setItem('hb_admin_sub_tab', 'upcoming');
      } catch {}
      setTimeout(() => {
        const el = document.getElementById('upcoming-event-settings');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
    };
    window.addEventListener('hb_open_upcoming_event_settings', handleOpenUpcomingSettings);
    return () => window.removeEventListener('hb_open_upcoming_event_settings', handleOpenUpcomingSettings);
  }, []);

  useEffect(() => {
    const handleOpenAboutPosterSettings = () => {
      setAdminActiveFeature('settings');
      setAdminMainTab('about');
      setAdminSubTab('about_poster');
      try {
        sessionStorage.setItem('hb_settings_unlocked', 'true');
        sessionStorage.setItem('hb_admin_feature', 'settings');
        sessionStorage.setItem('hb_admin_main_tab', 'about');
        sessionStorage.setItem('hb_admin_sub_tab', 'about_poster');
        localStorage.setItem('hb_admin_main_tab', 'about');
        localStorage.setItem('hb_admin_sub_tab', 'about_poster');
      } catch {}
      setTimeout(() => {
        const el = document.getElementById('about-poster-settings');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 350);
    };
    window.addEventListener('hb_open_about_poster_settings', handleOpenAboutPosterSettings);
    return () => window.removeEventListener('hb_open_about_poster_settings', handleOpenAboutPosterSettings);
  }, []);
  const [editingPinRowId, setEditingPinRowId] = useState<number | null>(null);
  const [tempPin, setTempPin] = useState<string>('');
  const [pinSavedToast, setPinSavedToast] = useState<string>('');
  const [selectedAdminReportEvent, setSelectedAdminReportEvent] = useState<EventData | null>(null);

  const isValidQrImage = (url?: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    const t = url.trim();
    return (
      t.startsWith('data:image') ||
      t.startsWith('/uploads/') ||
      t.startsWith('http://') ||
      t.startsWith('https://') ||
      t.startsWith('blob:')
    );
  };

  // Donation Settings Local State
  const [donationBankName, setDonationBankName] = useState<string>(donationInfo?.bankName || 'ທະນາຄານ ການຄ້າຕ່າງປະເທດລາວ ມະຫາຊົນ (BCEL)');
  const [donationAccountName, setDonationAccountName] = useState<string>(donationInfo?.accountName || 'HOPE BOKEO MINISTRY PROJECT');
  const [donationAccountNumber, setDonationAccountNumber] = useState<string>(donationInfo?.accountNumber || '010-12-00-012345678-001');
  const [donationSwiftCode, setDonationSwiftCode] = useState<string>(donationInfo?.swiftCode || 'BCELLA2X');
  const [donationQrImageUrl, setDonationQrImageUrl] = useState<string>(() => {
    if (isValidQrImage(donationInfo?.qrImageUrl)) {
      return donationInfo!.qrImageUrl!;
    }
    const defQr = (initialDefaultDonationBankAccounts as any[])?.[0]?.qrImageUrl;
    return defQr || donationInfo?.qrImageUrl || '';
  });
  const [donationBankAccounts, setDonationBankAccounts] = useState<BankAccount[]>(() => {
    const defaults = (initialDefaultDonationBankAccounts as BankAccount[]) || [];
    if (donationInfo?.bankAccounts && donationInfo.bankAccounts.length > 0) {
      return donationInfo.bankAccounts.map((acc, idx) => {
        const def = defaults[idx] || defaults.find((d) => d.bankName === acc.bankName);
        const hasValidQr = isValidQrImage(acc.qrImageUrl);
        return {
          ...acc,
          qrImageUrl: hasValidQr ? acc.qrImageUrl : (def?.qrImageUrl || acc.qrImageUrl || ''),
        };
      });
    }
    return defaults;
  });
  const [donationPhone, setDonationPhone] = useState<string>(
    donationInfo?.prayerContactPhone && donationInfo.prayerContactPhone !== '+856 20 55512345'
      ? donationInfo.prayerContactPhone
      : (donationInfo?.prayerContactWhatsapp || '+856 20 76838584')
  );
  const [donationWhatsapp, setDonationWhatsapp] = useState<string>(donationInfo?.prayerContactWhatsapp || '+856 20 76838584');
  const [donationEmail, setDonationEmail] = useState<string>(donationInfo?.prayerContactEmail || 'info@hopebokeo.org');
  const [donationSupportNote, setDonationSupportNote] = useState<string>(donationInfo?.supportNote || 'ທຸກໆການຮ່ວມບໍລິຈາກ ແລະ ຄຳອະທິຖານຂອງທ່ານ ແມ່ນມີຄຸນຄ່າຢ່າງຍິ່ງ ເພື່ອຂະຫຍາຍແຜ່ນດິນຂອງພຣະເຈົ້າ ແລະ ຊ່ວຍເຫຼືອຊຸມຊົນໃນແຂວງບໍ່ແກ້ວ.');
  const [donationSupportNoteEn, setDonationSupportNoteEn] = useState<string>(donationInfo?.supportNoteEn || 'Your donations and faithful prayers are deeply appreciated to help expand God’s Kingdom and empower local communities across Bokeo Province.');
  const [donationSupportNoteTh, setDonationSupportNoteTh] = useState<string>(donationInfo?.supportNoteTh || 'ทุกๆ การร่วมบริจาคและคำอธิษฐานของคุณมีคุณค่าอย่างยิ่ง เพื่อขยายแผ่นดินของพระเจ้าและช่วยเหลือชุมชนในแขวงบ่อแก้ว');

  const [donationVision, setDonationVision] = useState<string>(
    homePoster?.vision || donationInfo?.vision || 'ສ້າງສາວົກ ແລະ ຂະຫຍາຍແຜ່ນດິນຂອງພຣະເຈົ້າໃຫ້ຄວບຄຸມທຸກພື້ນທີ່ໃນແຂວງບໍ່ແກ້ວ.\n\nພວກເຮົາປາຖະໜາທີ່ຈະເຫັນທຸກໝູ່ບ້ານໄດ້ຍິນຂ່າວປະເສີດ ແລະ ມີຄິດສະຈັກທີ່ເຂັ້ມແຂງຕັ້ງຢູ່ ເພື່ອເປັນຄວາມສະຫວ່າງໃຫ້ແກ່ຊຸມຊົນ.'
  );
  const [donationVisionEn, setDonationVisionEn] = useState<string>(
    homePoster?.visionEn || donationInfo?.visionEn || 'Disciple nations and expand the Kingdom of God across every district in Bokeo Province.\n\nWe desire to see every village hear the Gospel and establish vibrant local fellowships that serve as light to their communities.'
  );
  const [donationVisionTh, setDonationVisionTh] = useState<string>(
    homePoster?.visionTh || donationInfo?.visionTh || 'สร้างสาวกและขยายแผ่นดินของพระเจ้าให้ครอบคลุมทุกพื้นที่ในแขวงบ่อแก้ว\n\nเราปรารถนาที่จะเห็นทุกหมู่บ้านได้ยินข่าวประเสริฐ และมีคริสตจักรที่เข้มแข็งตั้งอยู่เพื่อเป็นความสว่างแก่ชุมชน'
  );

  const [donationMission, setDonationMission] = useState<string>(
    homePoster?.mission || donationInfo?.mission || 'ປະກາດຂ່າວປະເສີດຢ່າງກ້າຫານໃນທຸກໆບ້ານ.\nຝຶກອົບຮົມ ແລະ ສ້າງຜູ້ນຳທ້ອງຖິ່ນໃຫ້ເຂັ້ມແຂງ.\nຊ່ວຍເຫຼືອສັງຄົມ ແລະ ຜູ້ທີ່ຖືກຂົ່ມເຫັງທຸກຢາກ.\nອະທິຖານວິງວອນ ແລະ ຕິດຕາມຜົນຢ່າງໃກ້ຊິດ.'
  );
  const [donationMissionEn, setDonationMissionEn] = useState<string>(
    homePoster?.missionEn || donationInfo?.missionEn || 'Proclaim the Gospel boldly in every village.\nTrain and equip local spiritual leaders.\nProvide humanitarian care and relief to the needy.\nIntercede continuously and faithfully track ministry fruit.'
  );
  const [donationMissionTh, setDonationMissionTh] = useState<string>(
    homePoster?.missionTh || donationInfo?.missionTh || 'ประกาศข่าวประเสริฐอย่างกล้าหาญในทุกๆ หมู่บ้าน\nฝึกอบรมและสร้างผู้นำท้องถิ่นให้เข้มแข็ง\nช่วยเหลือสังคมและผู้ที่ถูกข่มเหงยากลำบาก\nอธิษฐานวิงวอนและติดตามผลอย่างใกล้ชิด'
  );

  const [donationPurposeDesc, setDonationPurposeDesc] = useState<string>(donationInfo?.purposeDesc || 'ເງິນບໍລິຈາກທັງໝົດຈະຖືກນຳໃຊ້ເຂົ້າໃນການສະໜັບສະໜູນພັນທະກິດພາກສະໜາມ, ການສ້າງຄຣິດຕະຈັກ, ການຊ່ວຍເຫຼືອຊຸມຊົນ, ການຝຶກອົບຮົມຜູ້ນຳ, ແລະ ການບັນເທົາທຸກໃນ 5 ເມືອງຂອງແຂວງບໍ່ແກ້ວ.');
  const [donationPurposeDescEn, setDonationPurposeDescEn] = useState<string>(donationInfo?.purposeDescEn || 'All donations directly fund field ministry operations, church planting, leadership training, youth activities, and community relief across all 5 districts of Bokeo Province.');
  const [donationPurposeDescTh, setDonationPurposeDescTh] = useState<string>(donationInfo?.purposeDescTh || 'เงินบริจาคทั้งหมดจะถูกนำไปใช้ในการสนับสนุนพันธกิจภาคสนาม การสร้างคริสตจักร การช่วยเหลือชุมชน การฝึกอบรมผู้นำ และการบรรเทาทุกข์ใน 5 เมืองของแขวงบ่อแก้ว');

  const [isSavingDonation, setIsSavingDonation] = useState<boolean>(false);
  const [isEditingDonation, setIsEditingDonation] = useState<boolean>(true);
  const [donationVisionLang, setDonationVisionLang] = useState<'la' | 'tha' | 'en'>('la');
  const [donationMissionLang, setDonationMissionLang] = useState<'la' | 'tha' | 'en'>('la');
  const [donationPurposeLang, setDonationPurposeLang] = useState<'la' | 'tha' | 'en'>('la');
  const [donationSupportNoteLang, setDonationSupportNoteLang] = useState<'la' | 'tha' | 'en'>('la');

  const [hideDonationSectionState, setHideDonationSectionState] = useState<boolean>(donationInfo?.hideDonationSection || donationInfo?.hidden || false);
  const [hideVisionMissionState, setHideVisionMissionState] = useState<boolean>(
    homePoster?.hideVisionMission !== undefined ? homePoster.hideVisionMission : (donationInfo?.hideVisionMission || false)
  );
  const [hidePrayerLineState, setHidePrayerLineState] = useState<boolean>(donationInfo?.hidePrayerLine || false);

  const handleCancelEditDonation = () => {
    const defaults = (initialDefaultDonationBankAccounts as BankAccount[]) || [];
    if (donationInfo) {
      if (donationInfo.bankName) setDonationBankName(donationInfo.bankName);
      if (donationInfo.accountName) setDonationAccountName(donationInfo.accountName);
      if (donationInfo.accountNumber) setDonationAccountNumber(donationInfo.accountNumber);
      if (donationInfo.swiftCode !== undefined) setDonationSwiftCode(donationInfo.swiftCode);
      if (isValidQrImage(donationInfo.qrImageUrl)) {
        setDonationQrImageUrl(donationInfo.qrImageUrl!);
      } else {
        setDonationQrImageUrl((defaults[0] as any)?.qrImageUrl || '');
      }
      if (donationInfo.prayerContactPhone && donationInfo.prayerContactPhone !== '+856 20 55512345') {
        setDonationPhone(donationInfo.prayerContactPhone);
      } else if (donationInfo.prayerContactWhatsapp) {
        setDonationPhone(donationInfo.prayerContactWhatsapp);
      }
      if (donationInfo.prayerContactWhatsapp) setDonationWhatsapp(donationInfo.prayerContactWhatsapp);
      if (donationInfo.prayerContactEmail) setDonationEmail(donationInfo.prayerContactEmail);
      if (donationInfo.supportNote) setDonationSupportNote(donationInfo.supportNote);
      if (donationInfo.supportNoteEn) setDonationSupportNoteEn(donationInfo.supportNoteEn);
      if (donationInfo.supportNoteTh) setDonationSupportNoteTh(donationInfo.supportNoteTh);
      if (donationInfo.purposeDesc) setDonationPurposeDesc(donationInfo.purposeDesc);
      if (donationInfo.purposeDescEn) setDonationPurposeDescEn(donationInfo.purposeDescEn);
      if (donationInfo.purposeDescTh) setDonationPurposeDescTh(donationInfo.purposeDescTh);
      if (donationInfo.vision) setDonationVision(donationInfo.vision);
      if (donationInfo.visionEn) setDonationVisionEn(donationInfo.visionEn);
      if (donationInfo.visionTh) setDonationVisionTh(donationInfo.visionTh);
      if (donationInfo.mission) setDonationMission(donationInfo.mission);
      if (donationInfo.missionEn) setDonationMissionEn(donationInfo.missionEn);
      if (donationInfo.missionTh) setDonationMissionTh(donationInfo.missionTh);
      if (donationInfo.bankAccounts && donationInfo.bankAccounts.length > 0) {
        const merged = donationInfo.bankAccounts.map((acc, idx) => {
          const def = defaults[idx] || defaults.find((d) => d.bankName === acc.bankName);
          const hasValidQr = isValidQrImage(acc.qrImageUrl);
          return {
            ...acc,
            qrImageUrl: hasValidQr ? acc.qrImageUrl : (def?.qrImageUrl || acc.qrImageUrl || ''),
          };
        });
        setDonationBankAccounts(merged);
      } else {
        setDonationBankAccounts(defaults);
      }
      if (donationInfo.hideDonationSection !== undefined) setHideDonationSectionState(donationInfo.hideDonationSection);
      else if (donationInfo.hidden !== undefined) setHideDonationSectionState(donationInfo.hidden);
      if (donationInfo.hideVisionMission !== undefined) setHideVisionMissionState(donationInfo.hideVisionMission);
      if (donationInfo.hidePrayerLine !== undefined) setHidePrayerLineState(donationInfo.hidePrayerLine);
    } else {
      setDonationBankAccounts(defaults);
    }
    setIsEditingDonation(true);
  };

  const isHydratingFromPropsRef = useRef(false);

  useEffect(() => {
    if (donationInfo) {
      isHydratingFromPropsRef.current = true;
      const defaults = (initialDefaultDonationBankAccounts as BankAccount[]) || [];
      if (donationInfo.bankName) setDonationBankName(donationInfo.bankName);
      if (donationInfo.accountName) setDonationAccountName(donationInfo.accountName);
      if (donationInfo.accountNumber) setDonationAccountNumber(donationInfo.accountNumber);
      if (donationInfo.swiftCode !== undefined) setDonationSwiftCode(donationInfo.swiftCode);
      if (donationInfo.qrImageUrl) {
        if (isValidQrImage(donationInfo.qrImageUrl)) {
          setDonationQrImageUrl(donationInfo.qrImageUrl);
        } else if ((defaults[0] as any)?.qrImageUrl) {
          setDonationQrImageUrl((defaults[0] as any).qrImageUrl);
        }
      }
      if (donationInfo.prayerContactPhone && donationInfo.prayerContactPhone !== '+856 20 55512345') {
        setDonationPhone(donationInfo.prayerContactPhone);
      } else if (donationInfo.prayerContactWhatsapp) {
        setDonationPhone(donationInfo.prayerContactWhatsapp);
      }
      if (donationInfo.prayerContactWhatsapp) setDonationWhatsapp(donationInfo.prayerContactWhatsapp);
      if (donationInfo.prayerContactEmail) setDonationEmail(donationInfo.prayerContactEmail);
      if (donationInfo.supportNote) setDonationSupportNote(donationInfo.supportNote);
      if (donationInfo.supportNoteEn) setDonationSupportNoteEn(donationInfo.supportNoteEn);
      if (donationInfo.supportNoteTh) setDonationSupportNoteTh(donationInfo.supportNoteTh);
      if (donationInfo.purposeDesc) setDonationPurposeDesc(donationInfo.purposeDesc);
      if (donationInfo.purposeDescEn) setDonationPurposeDescEn(donationInfo.purposeDescEn);
      if (donationInfo.purposeDescTh) setDonationPurposeDescTh(donationInfo.purposeDescTh);
      if (donationInfo.vision) setDonationVision(donationInfo.vision);
      if (donationInfo.visionEn) setDonationVisionEn(donationInfo.visionEn);
      if (donationInfo.visionTh) setDonationVisionTh(donationInfo.visionTh);
      if (donationInfo.mission) setDonationMission(donationInfo.mission);
      if (donationInfo.missionEn) setDonationMissionEn(donationInfo.missionEn);
      if (donationInfo.missionTh) setDonationMissionTh(donationInfo.missionTh);
      if (donationInfo.bankAccounts && donationInfo.bankAccounts.length > 0) {
        const merged = donationInfo.bankAccounts.map((acc, idx) => {
          const def = defaults[idx] || defaults.find((d) => d.bankName === acc.bankName);
          const hasValidQr = isValidQrImage(acc.qrImageUrl);
          return {
            ...acc,
            qrImageUrl: hasValidQr ? acc.qrImageUrl : (def?.qrImageUrl || acc.qrImageUrl || ''),
          };
        });
        setDonationBankAccounts(merged);
      }
      if (donationInfo.hideDonationSection !== undefined) setHideDonationSectionState(donationInfo.hideDonationSection);
      else if (donationInfo.hidden !== undefined) setHideDonationSectionState(donationInfo.hidden);
      if (donationInfo.hideVisionMission !== undefined) setHideVisionMissionState(donationInfo.hideVisionMission);
      if (donationInfo.hidePrayerLine !== undefined) setHidePrayerLineState(donationInfo.hidePrayerLine);
      setTimeout(() => {
        isHydratingFromPropsRef.current = false;
      }, 150);
    }
  }, [donationInfo]);

  const handleSaveDonationForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDonation(true);
    try {
      const cleanBankAccounts = (donationBankAccounts || []).map((acc) => ({
        ...acc,
        bankName: acc.bankName || '',
        bankNameEn: acc.bankNameEn || '',
        bankNameTh: acc.bankNameTh || '',
        accountName: acc.accountName || '',
        accountNumber: acc.accountNumber || '',
        swiftCode: acc.swiftCode || '',
        qrImageUrl: acc.qrImageUrl || '',
        hidden: Boolean(acc.hidden),
      }));

      const updated: DonationInfo = {
        bankName: cleanBankAccounts[0]?.bankName || donationBankName || '',
        bankNameEn: cleanBankAccounts[0]?.bankNameEn || '',
        bankNameTh: cleanBankAccounts[0]?.bankNameTh || '',
        accountName: cleanBankAccounts[0]?.accountName || donationAccountName || '',
        accountNumber: cleanBankAccounts[0]?.accountNumber || donationAccountNumber || '',
        swiftCode: cleanBankAccounts[0]?.swiftCode || donationSwiftCode || '',
        qrImageUrl: cleanBankAccounts[0]?.qrImageUrl || donationQrImageUrl || '',
        bankAccounts: cleanBankAccounts,
        prayerContactPhone: donationPhone || '',
        prayerContactWhatsapp: donationWhatsapp || '',
        prayerContactEmail: donationEmail || '',
        supportNote: donationSupportNote || '',
        supportNoteEn: donationSupportNoteEn || '',
        supportNoteTh: donationSupportNoteTh || '',
        purposeDesc: donationPurposeDesc || '',
        purposeDescEn: donationPurposeDescEn || '',
        purposeDescTh: donationPurposeDescTh || '',
        vision: donationVision || '',
        visionEn: donationVisionEn || '',
        visionTh: donationVisionTh || '',
        mission: donationMission || '',
        missionEn: donationMissionEn || '',
        missionTh: donationMissionTh || '',
        hidden: Boolean(hideDonationSectionState),
        hideDonationSection: Boolean(hideDonationSectionState),
        hideVisionMission: Boolean(hideVisionMissionState),
        hidePrayerLine: Boolean(hidePrayerLineState),
      };

      if (onSaveDonationInfo) {
        await onSaveDonationInfo(updated);
      }
      setIsEditingDonation(true);
      setPinSavedToast(
        language === 'lo'
          ? 'ອັບເດດຂໍ້ມູນການບໍລິຈາກ ແລະ ຊ່ອງທາງອະທິຖານ ສຳເລັດແລ້ວ!'
          : 'Donation and Prayer channels updated successfully!'
      );
      setTimeout(() => setPinSavedToast(''), 3000);
    } catch (err: any) {
      alert(err?.message || 'Error updating donation info');
    } finally {
      setIsSavingDonation(false);
    }
  };

  // Section visibility toggle state for collapsible UI ("ປຸ່ມຊ້ອນ/ສະແດງ")
  const [showSubSection, setShowSubSection] = useState<boolean>(true);
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
  const [selectedMapVillageRowId, setSelectedMapVillageRowId] = useState<number | null>(null);

  // Home Poster Edit Local State
  const [posterTitle, setPosterTitle] = useState<string>(
    homePoster?.title || 'Hope is growing in Bokeo.'
  );
  const [posterTitleEn, setPosterTitleEn] = useState<string>(
    homePoster?.titleEn || 'Hope is growing in Bokeo.'
  );
  const [posterTitleTh, setPosterTitleTh] = useState<string>(
    homePoster?.titleTh || 'Hope is growing in Bokeo.'
  );
  const [posterSubtitle, setPosterSubtitle] = useState<string>(homePoster?.subtitle || 'ແຂວງບໍ່ແກ້ວ (Bokeo Province)');
  const [posterSubtitleEn, setPosterSubtitleEn] = useState<string>(homePoster?.subtitleEn || 'Bokeo Province (Lao PDR)');
  const [posterSubtitleTh, setPosterSubtitleTh] = useState<string>(homePoster?.subtitleTh || 'แขวงบ่อแก้ว (Bokeo Province)');
  const [posterDesc, setPosterDesc] = useState<string>(homePoster?.description || 'ຮ່ວມເປັນສ່ວນໜຶ່ງໃນການຂັບເຄື່ອນວຽກງານຂອງພຣະເຈົ້າໃນແຂວງບໍ່ແກ້ວ ໂດຍການຕິດຕາມ, ຮ່ວມອະທິຖານ ແລະ ສະໜັບສະໜູນວຽກງານພາກສະໜາມ.');
  const [posterDescEn, setPosterDescEn] = useState<string>(homePoster?.descriptionEn || 'Be a vital part of advancing God’s work in Bokeo Province through tracking, faithful prayer, and supporting field operations.');
  const [posterDescTh, setPosterDescTh] = useState<string>(homePoster?.descriptionTh || 'ร่วมเป็นส่วนหนึ่งในการขับเคลื่อนพระราชกิจของพระเจ้าในแขวงบ่อแก้ว โดยการติดตาม ร่วมอธิษฐาน และสนับสนุนงานภาคสนาม');
  
  const [aboutHeroImageUrl, setAboutHeroImageUrl] = useState<string>(homePoster?.aboutHeroImageUrl || '');
  const [hideAboutHeroPoster, setHideAboutHeroPoster] = useState<boolean>(Boolean(homePoster?.hideAboutHeroPoster));
  const [aboutHeroBadge, setAboutHeroBadge] = useState<string>(homePoster?.aboutHeroBadge || 'ກ່ຽວກັບພວກເຮົາ');
  const [aboutHeroBadgeEn, setAboutHeroBadgeEn] = useState<string>(homePoster?.aboutHeroBadgeEn || 'ABOUT US');
  const [aboutHeroBadgeTh, setAboutHeroBadgeTh] = useState<string>(homePoster?.aboutHeroBadgeTh || 'เกี่ยวกับเรา');
  const [aboutHeroVerse, setAboutHeroVerse] = useState<string>(
    homePoster?.aboutHeroVerse ||
      '“ຈົ່ງໃຫ້ຄວາມສະຫວ່າງຂອງພວກເຈົ້າສ່ອງແຈ້ງຕໍ່ໜ້າຄົນທັງປວງ ເພື່ອເຂົາຈະໄດ້ເຫັນການດີຂອງພວກເຈົ້າ ແລະ ສັນລະເສີນພຣະບິດາຂອງພວກເຈົ້າຜູ້ຊົງສະຖິດຢູ່ໃນສະຫວັນ.”'
  );
  const [aboutHeroVerseEn, setAboutHeroVerseEn] = useState<string>(
    homePoster?.aboutHeroVerseEn ||
      '“Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.”'
  );
  const [aboutHeroVerseTh, setAboutHeroVerseTh] = useState<string>(
    homePoster?.aboutHeroVerseTh ||
      '“พวกท่านจงส่องสว่างแก่คนทั้งปวง เพื่อว่าเมื่อเขาทั้งหลายได้เห็นความดีที่ท่านทำ พวกเขาจะได้สรรเสริญพระบิดาของท่านผู้สถิตในสวรรค์”'
  );
  const [aboutHeroVerseRef, setAboutHeroVerseRef] = useState<string>(homePoster?.aboutHeroVerseRef || 'ມັດທາຍ 5:16');
  const [aboutHeroVerseRefEn, setAboutHeroVerseRefEn] = useState<string>(homePoster?.aboutHeroVerseRefEn || 'Matthew 5:16');
  const [aboutHeroVerseRefTh, setAboutHeroVerseRefTh] = useState<string>(homePoster?.aboutHeroVerseRefTh || 'มัทธิว 5:16');

  const [aboutWhoWeArePosition, setAboutWhoWeArePosition] = useState<string>(homePoster?.aboutWhoWeArePosition || '50% 50%');
  const [aboutWhoWeAreScale, setAboutWhoWeAreScale] = useState<number>(
    typeof homePoster?.aboutWhoWeAreScale === 'number' ? homePoster.aboutWhoWeAreScale : 100
  );
  const [aboutWhoWeAreFit, setAboutWhoWeAreFit] = useState<'cover' | 'contain' | 'fill' | 'scale-down'>(
    homePoster?.aboutWhoWeAreFit || 'cover'
  );
  const [aboutWhoWeAreBadge, setAboutWhoWeAreBadge] = useState<string>(homePoster?.aboutWhoWeAreBadge || 'ພວກເຮົາແມ່ນໃຜ');
  const [aboutWhoWeAreBadgeEn, setAboutWhoWeAreBadgeEn] = useState<string>(homePoster?.aboutWhoWeAreBadgeEn || 'WHO WE ARE');
  const [aboutWhoWeAreBadgeTh, setAboutWhoWeAreBadgeTh] = useState<string>(homePoster?.aboutWhoWeAreBadgeTh || 'พวกเราคือใคร');
  const [aboutWhoWeAreTitle, setAboutWhoWeAreTitle] = useState<string>(
    homePoster?.aboutWhoWeAreTitle || 'ຊຸມຊົນທ້ອງຖິ່ນ, ພາລະກິດລະດັບໂລກ'
  );
  const [aboutWhoWeAreTitleEn, setAboutWhoWeAreTitleEn] = useState<string>(
    homePoster?.aboutWhoWeAreTitleEn || 'A Local Community, A Global Purpose'
  );
  const [aboutWhoWeAreTitleTh, setAboutWhoWeAreTitleTh] = useState<string>(
    homePoster?.aboutWhoWeAreTitleTh || 'ชุมชนท้องถิ่น พันธกิจระดับโลก'
  );

  const [posterBokeoTitle, setPosterBokeoTitle] = useState<string>(homePoster?.bokeoTitle || 'HOPE BOKEO');
  const [posterBokeoTitleEn, setPosterBokeoTitleEn] = useState<string>(homePoster?.bokeoTitleEn || 'HOPE BOKEO');
  const [posterBokeoTitleTh, setPosterBokeoTitleTh] = useState<string>(homePoster?.bokeoTitleTh || 'HOPE BOKEO');
  const [posterBokeoDesc, setPosterBokeoDesc] = useState<string>(
    homePoster?.bokeoDesc ||
    'ໂຄງການ ໂຮບ ບໍ່ແກ້ວ (HOPE BOKEO) ເປັນສູນລວມການຈັດການພັນທະກິດ, ການພັດທະນາຊຸມຊົນ ແລະ ການເຊື່ອມໂຍງຂໍ້ມູນຄຣິດຕະຈັກໃນທົ່ວ 5 ເມືອງຂອງແຂວງບໍ່ແກ້ວ (ເມືອງຫ້ວຍຊາຍ, ເມືອງຕົ້ນເຜິ້ງ, ເມືອງຜາອຸດົມ, ເມືອງປາກທາ, ແລະ ເມືອງເມັກ). ພວກເຮົາຮ່ວມມືກັນຮັບໃຊ້ ແລະ ສ່ງຕໍ່ຄວາມຮັກ, ຄວາມຫວັງ, ແລະ ການພັດທະນາທີ່ຍືນຍົງໃຫ້ແກ່ທຸກຄອບຄົວ.'
  );
  const [posterBokeoDescEn, setPosterBokeoDescEn] = useState<string>(
    homePoster?.bokeoDescEn ||
    'HOPE BOKEO is a centralized ministry and community development platform connecting churches and outreach operations across all 5 districts of Bokeo Province (Huayxai, Tonpheung, Pha Oudom, Paktha, and Meung). Together, we serve communities, nurture spiritual growth, and build sustainable support for families across the region.'
  );
  const [posterBokeoDescTh, setPosterBokeoDescTh] = useState<string>(
    homePoster?.bokeoDescTh ||
    'โครงการ โฮป บ่อแก้ว (HOPE BOKEO) เป็นศูนย์รวมการจัดการพันธกิจ การพัฒนาชุมชน และการเชื่อมโยงข้อมูลคริสตจักรในทั้ง 5 เมืองของแขวงบ่อแก้ว (ห้วยทราย, ต้นผึ้ง, ผาอุดม, ปากทา และเมิง) เราร่วมมือกันรับใช้และส่งต่อความรัก ความหวัง และการพัฒนาที่ยั่งยืนแก่ทุกครอบครัว'
  );
  const [posterBokeoImageUrl, setPosterBokeoImageUrl] = useState<string>(homePoster?.bokeoImageUrl || '');
  const [posterBokeoScale, setPosterBokeoScale] = useState<number>(
    typeof homePoster?.bokeoPosterScale === 'number' ? homePoster.bokeoPosterScale : 100
  );
  const [posterBokeoPosition, setPosterBokeoPosition] = useState<string>(
    homePoster?.bokeoPosterPosition || '50% 50%'
  );
  const [posterBokeoFit, setPosterBokeoFit] = useState<'cover' | 'contain' | 'fill' | 'scale-down'>(
    homePoster?.bokeoPosterFit || 'cover'
  );
  const [posterImgUrl, setPosterImgUrl] = useState<string>(homePoster?.imageUrl || '');
  const [posterImageUrls, setPosterImageUrls] = useState<string[]>(
    Array.isArray(homePoster?.imageUrls)
      ? homePoster.imageUrls
      : (homePoster?.imageUrl ? [homePoster.imageUrl] : [])
  );
  const [posterHeight, setPosterHeight] = useState<number>(() => {
    const raw = homePoster?.posterHeight;
    if (raw === undefined || raw === null) return 50;
    const num = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (isNaN(num)) return 50;
    if (num > 100) {
      return Math.round(Math.min(Math.max((num - 180) / 380 * 100, 0), 100));
    }
    return Math.min(Math.max(num, 0), 100);
  });
  const [posterFit, setPosterFit] = useState<'cover' | 'contain' | 'fill' | 'scale-down'>(
    homePoster?.posterFit || 'cover'
  );
  const [posterScale, setPosterScale] = useState<number>(
    typeof homePoster?.posterScale === 'number' ? homePoster.posterScale : 100
  );
  const [posterAspectRatio, setPosterAspectRatio] = useState<'auto' | '16/9' | '4/3' | '1/1' | '21/9' | '3/4' | '9/16'>(
    homePoster?.posterAspectRatio || 'auto'
  );
  const [posterBrightness, setPosterBrightness] = useState<number>(
    typeof homePoster?.posterBrightness === 'number' ? homePoster.posterBrightness : 100
  );
  const [posterContrast, setPosterContrast] = useState<number>(
    typeof homePoster?.posterContrast === 'number' ? homePoster.posterContrast : 100
  );
  const [posterSaturation, setPosterSaturation] = useState<number>(
    typeof homePoster?.posterSaturation === 'number' ? homePoster.posterSaturation : 100
  );
  const [posterBlur, setPosterBlur] = useState<number>(
    typeof homePoster?.posterBlur === 'number' ? homePoster.posterBlur : 0
  );
  const [posterOverlayOpacity, setPosterOverlayOpacity] = useState<number>(
    typeof homePoster?.posterOverlayOpacity === 'number' ? homePoster.posterOverlayOpacity : 85
  );
  const [posterEdgeFade, setPosterEdgeFade] = useState<number>(
    typeof homePoster?.posterEdgeFade === 'number' ? homePoster.posterEdgeFade : 0
  );
  const [bokeoPosterHeight, setBokeoPosterHeight] = useState<number>(
    typeof homePoster?.bokeoPosterHeight === 'number'
      ? (homePoster.bokeoPosterHeight > 100
          ? Math.round(Math.min(Math.max(((homePoster.bokeoPosterHeight - 180) / 380) * 100, 0), 100))
          : homePoster.bokeoPosterHeight)
      : 50
  );
  const [bokeoPosterOverlayOpacity, setBokeoPosterOverlayOpacity] = useState<number>(
    typeof homePoster?.bokeoPosterOverlayOpacity === 'number' ? homePoster.bokeoPosterOverlayOpacity : 70
  );
  const [bokeoPosterEdgeFade, setBokeoPosterEdgeFade] = useState<number>(
    typeof homePoster?.bokeoPosterEdgeFade === 'number' ? homePoster.bokeoPosterEdgeFade : 0
  );
  const [bokeoPosterDim, setBokeoPosterDim] = useState<number>(
    typeof homePoster?.bokeoPosterDim === 'number' ? homePoster.bokeoPosterDim : 40
  );
  const [posterVideoUrl, setPosterVideoUrl] = useState<string>(homePoster?.videoUrl || '');
  const [posterBtnText, setPosterBtnText] = useState<string>(homePoster?.buttonText || 'ເບິ່ງດາສບອດຂໍ້ມູນ');
  const [posterBtnTextEn, setPosterBtnTextEn] = useState<string>(homePoster?.buttonTextEn || 'View Dashboard');
  const [posterBtnTextTh, setPosterBtnTextTh] = useState<string>(homePoster?.buttonTextTh || 'ดูแดชบอร์ดข้อมูล');

  const [posterLocationTag, setPosterLocationTag] = useState<string>(homePoster?.posterLocationTag || 'BOKEO PROVINCE · LAO PDR');
  const [posterLocationTagEn, setPosterLocationTagEn] = useState<string>(homePoster?.posterLocationTagEn || 'BOKEO PROVINCE · LAO PDR');
  const [posterLocationTagTh, setPosterLocationTagTh] = useState<string>(homePoster?.posterLocationTagTh || 'BOKEO PROVINCE · LAO PDR');

  const [posterVideoBtnText, setPosterVideoBtnText] = useState<string>(homePoster?.videoBtnText || 'ຮັບຊົມເລື່ອງລາວຂອງພວກເຮົາ');
  const [posterVideoBtnTextEn, setPosterVideoBtnTextEn] = useState<string>(homePoster?.videoBtnTextEn || 'Watch Our Story');
  const [posterVideoBtnTextTh, setPosterVideoBtnTextTh] = useState<string>(homePoster?.videoBtnTextTh || 'รับชมเรื่องราวของเรา');

  const [posterBadgeTopText, setPosterBadgeTopText] = useState<string>(homePoster?.badgeTopText || 'Real People.');
  const [posterBadgeTopTextEn, setPosterBadgeTopTextEn] = useState<string>(homePoster?.badgeTopTextEn || 'Real People.');
  const [posterBadgeTopTextTh, setPosterBadgeTopTextTh] = useState<string>(homePoster?.badgeTopTextTh || 'Real People.');

  const [posterBadgeBottomText, setPosterBadgeBottomText] = useState<string>(homePoster?.badgeBottomText || 'Real Hope.');
  const [posterBadgeBottomTextEn, setPosterBadgeBottomTextEn] = useState<string>(homePoster?.badgeBottomTextEn || 'Real Hope.');
  const [posterBadgeBottomTextTh, setPosterBadgeBottomTextTh] = useState<string>(homePoster?.badgeBottomTextTh || 'Real Hope.');

  const [hideRightBadge, setHideRightBadge] = useState<boolean>(homePoster?.hideRightBadge || false);

  // Upcoming Event / Announcement (ງານທີ່ຈະມາເຖິງ / ແຈ້ງການ & ປະກາດ)
  const [upcomingEventTitle, setUpcomingEventTitle] = useState<string>(homePoster?.upcomingEventTitle || '');
  const [upcomingEventTitleEn, setUpcomingEventTitleEn] = useState<string>(homePoster?.upcomingEventTitleEn || '');
  const [upcomingEventTitleTh, setUpcomingEventTitleTh] = useState<string>(homePoster?.upcomingEventTitleTh || '');
  const [upcomingEventDate, setUpcomingEventDate] = useState<string>(homePoster?.upcomingEventDate || '');
  const [upcomingEventLocation, setUpcomingEventLocation] = useState<string>(homePoster?.upcomingEventLocation || '');
  const [upcomingEventLocationEn, setUpcomingEventLocationEn] = useState<string>(homePoster?.upcomingEventLocationEn || '');
  const [upcomingEventLocationTh, setUpcomingEventLocationTh] = useState<string>(homePoster?.upcomingEventLocationTh || '');
  const [upcomingEventDesc, setUpcomingEventDesc] = useState<string>(homePoster?.upcomingEventDesc || '');
  const [upcomingEventDescEn, setUpcomingEventDescEn] = useState<string>(homePoster?.upcomingEventDescEn || '');
  const [upcomingEventDescTh, setUpcomingEventDescTh] = useState<string>(homePoster?.upcomingEventDescTh || '');
  const [upcomingEventImageUrl, setUpcomingEventImageUrl] = useState<string>(homePoster?.upcomingEventImageUrl || '');
  const [upcomingEventBadge, setUpcomingEventBadge] = useState<string>(homePoster?.upcomingEventBadge || '');
  const [hideUpcomingEvent, setHideUpcomingEvent] = useState<boolean>(homePoster?.hideUpcomingEvent || false);
  const [upcomingSchedule, setUpcomingSchedule] = useState<UpcomingScheduleItem[]>(homePoster?.upcomingSchedule || []);
  const [upcomingScheduleHtml, setUpcomingScheduleHtml] = useState<string>(homePoster?.upcomingScheduleHtml || '');
  const [upcomingPdfUrl, setUpcomingPdfUrl] = useState<string>(homePoster?.upcomingPdfUrl || '');
  const [upcomingPdfName, setUpcomingPdfName] = useState<string>(homePoster?.upcomingPdfName || '');
  const [upcomingDocxUrl, setUpcomingDocxUrl] = useState<string>(homePoster?.upcomingDocxUrl || '');
  const [upcomingDocxName, setUpcomingDocxName] = useState<string>(homePoster?.upcomingDocxName || '');
  const [upcomingBgDim, setUpcomingBgDim] = useState<number>(
    typeof homePoster?.upcomingBgDim === 'number' ? homePoster.upcomingBgDim : 60
  );
  const [upcomingTableBg, setUpcomingTableBg] = useState<'transparent' | 'glass' | 'paper' | 'dark' | 'custom'>(
    homePoster?.upcomingTableBg || 'transparent'
  );
  const [upcomingTableCustomBg, setUpcomingTableCustomBg] = useState<string>(
    homePoster?.upcomingTableCustomBg || '#0f172a'
  );
  const [upcomingTableBorderWidth, setUpcomingTableBorderWidth] = useState<number>(
    typeof homePoster?.upcomingTableBorderWidth === 'number' ? homePoster.upcomingTableBorderWidth : 0
  );
  const [upcomingTableBorderColor, setUpcomingTableBorderColor] = useState<string>(
    homePoster?.upcomingTableBorderColor || 'rgba(255, 255, 255, 0.2)'
  );
  const [upcomingEdgeFade, setUpcomingEdgeFade] = useState<number>(
    typeof homePoster?.upcomingEdgeFade === 'number' ? homePoster.upcomingEdgeFade : 25
  );
  const [upcomingHeight, setUpcomingHeight] = useState<number>(() => {
    if (typeof homePoster?.upcomingHeight === 'number') {
      return homePoster.upcomingHeight > 100
        ? Math.min(100, Math.round(homePoster.upcomingHeight / 7.5))
        : Math.max(0, Math.min(100, homePoster.upcomingHeight));
    }
    return 20;
  });
  const [upcomingContentBgOpacity, setUpcomingContentBgOpacity] = useState<number>(() => {
    if (typeof homePoster?.upcomingContentBgOpacity === 'number') {
      return Math.max(0, Math.min(100, homePoster.upcomingContentBgOpacity));
    }
    return homePoster?.upcomingTableBg === 'transparent'
      ? 0
      : homePoster?.upcomingTableBg === 'glass'
      ? 45
      : homePoster?.upcomingTableBg === 'dark'
      ? 80
      : homePoster?.upcomingTableBg === 'paper'
      ? 95
      : 70;
  });
  const [upcomingTitleSize, setUpcomingTitleSize] = useState<number | string>(
    homePoster?.upcomingTitleSize !== undefined ? homePoster.upcomingTitleSize : 28
  );
  const [upcomingBgVisibility, setUpcomingBgVisibility] = useState<number>(
    typeof homePoster?.upcomingBgVisibility === 'number' ? homePoster.upcomingBgVisibility : 100
  );
  const [upcomingTableWidth, setUpcomingTableWidth] = useState<number>(
    typeof homePoster?.upcomingTableWidth === 'number' ? homePoster.upcomingTableWidth : 100
  );
  const [upcomingTableAlign, setUpcomingTableAlign] = useState<'left' | 'center' | 'right'>(
    homePoster?.upcomingTableAlign || 'center'
  );

  // Ministry Timeline states (About Us story & milestones)
  const [bokeoTimeline, setBokeoTimeline] = useState<MinistryTimelineItem[]>(() => {
    if (Array.isArray(homePoster?.bokeoTimeline) && homePoster.bokeoTimeline.length > 0) {
      return homePoster.bokeoTimeline;
    }
    return DEFAULT_BOKEO_TIMELINE;
  });
  const [bokeoTimelineTitle, setBokeoTimelineTitle] = useState<string>(
    homePoster?.bokeoTimelineTitle || 'ຈຸດເລີ່ມຕົ້ນ ແລະ ການເດີນທາງຂອງພັນທະກິດ'
  );
  const [bokeoTimelineTitleEn, setBokeoTimelineTitleEn] = useState<string>(
    homePoster?.bokeoTimelineTitleEn === 'Ministry Journey & Timeline'
      ? 'Story timeline'
      : (homePoster?.bokeoTimelineTitleEn || 'Story timeline')
  );
  const [bokeoTimelineTitleTh, setBokeoTimelineTitleTh] = useState<string>(
    homePoster?.bokeoTimelineTitleTh || 'จุดเริ่มต้นและการเดินทางของพันธกิจ'
  );
  const [hideBokeoTimeline, setHideBokeoTimeline] = useState<boolean>(
    !!homePoster?.hideBokeoTimeline
  );

  const [appBgColor, setAppBgColor] = useState<string>(homePoster?.bgColor || '');
  const [appBgImageUrl, setAppBgImageUrl] = useState<string>(homePoster?.bgImageUrl || '');
  const [appBgBrightness, setAppBgBrightness] = useState<number>(
    typeof homePoster?.bgBrightness === 'number' ? homePoster.bgBrightness : 90
  );
  const [appBgBlur, setAppBgBlur] = useState<number>(
    typeof homePoster?.bgBlur === 'number' ? homePoster.bgBlur : 8
  );
  const [appBgWhiteOverlayOpacity, setAppBgWhiteOverlayOpacity] = useState<number>(
    typeof homePoster?.bgWhiteOverlayOpacity === 'number'
      ? homePoster.bgWhiteOverlayOpacity
      : typeof (homePoster as any)?.bgWhiteOpacity === 'number'
      ? (homePoster as any).bgWhiteOpacity
      : 0
  );
  const [orgLogoUrl, setOrgLogoUrl] = useState<string>(() => {
    if (homePoster?.logoUrl) return homePoster.logoUrl;
    try {
      const saved = localStorage.getItem('hb_custom_logo');
      if (saved) return saved;
    } catch {}
    return '';
  });
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [isSavingPoster, setIsSavingPoster] = useState<boolean>(false);
  const [isEditingPoster, setIsEditingPoster] = useState<boolean>(true);

  const handleCancelEditPoster = () => {
    if (homePoster) {
      if (homePoster.title) setPosterTitle(homePoster.title);
      if (homePoster.titleEn) setPosterTitleEn(homePoster.titleEn);
      if (homePoster.titleTh) setPosterTitleTh(homePoster.titleTh);
      if (homePoster.subtitle) setPosterSubtitle(homePoster.subtitle);
      if (homePoster.subtitleEn) setPosterSubtitleEn(homePoster.subtitleEn);
      if (homePoster.subtitleTh) setPosterSubtitleTh(homePoster.subtitleTh);
      if (homePoster.description) setPosterDesc(homePoster.description);
      if (homePoster.descriptionEn) setPosterDescEn(homePoster.descriptionEn);
      if (homePoster.descriptionTh) setPosterDescTh(homePoster.descriptionTh);
      if (homePoster.aboutHeroImageUrl !== undefined) setAboutHeroImageUrl(homePoster.aboutHeroImageUrl);
      if (homePoster.hideAboutHeroPoster !== undefined) setHideAboutHeroPoster(homePoster.hideAboutHeroPoster);
      if (homePoster.aboutHeroBadge !== undefined) setAboutHeroBadge(homePoster.aboutHeroBadge);
      if (homePoster.aboutHeroBadgeEn !== undefined) setAboutHeroBadgeEn(homePoster.aboutHeroBadgeEn);
      if (homePoster.aboutHeroBadgeTh !== undefined) setAboutHeroBadgeTh(homePoster.aboutHeroBadgeTh);
      if (homePoster.aboutHeroVerse !== undefined) setAboutHeroVerse(homePoster.aboutHeroVerse);
      if (homePoster.aboutHeroVerseEn !== undefined) setAboutHeroVerseEn(homePoster.aboutHeroVerseEn);
      if (homePoster.aboutHeroVerseTh !== undefined) setAboutHeroVerseTh(homePoster.aboutHeroVerseTh);
      if (homePoster.aboutHeroVerseRef !== undefined) setAboutHeroVerseRef(homePoster.aboutHeroVerseRef);
      if (homePoster.aboutHeroVerseRefEn !== undefined) setAboutHeroVerseRefEn(homePoster.aboutHeroVerseRefEn);
      if (homePoster.aboutHeroVerseRefTh !== undefined) setAboutHeroVerseRefTh(homePoster.aboutHeroVerseRefTh);
      if (homePoster.aboutWhoWeArePosition !== undefined) setAboutWhoWeArePosition(homePoster.aboutWhoWeArePosition);
      if (homePoster.aboutWhoWeAreScale !== undefined) setAboutWhoWeAreScale(typeof homePoster.aboutWhoWeAreScale === 'number' ? homePoster.aboutWhoWeAreScale : 100);
      if (homePoster.aboutWhoWeAreFit !== undefined) setAboutWhoWeAreFit(homePoster.aboutWhoWeAreFit);
      if (homePoster.aboutWhoWeAreBadge !== undefined) setAboutWhoWeAreBadge(homePoster.aboutWhoWeAreBadge);
      if (homePoster.aboutWhoWeAreBadgeEn !== undefined) setAboutWhoWeAreBadgeEn(homePoster.aboutWhoWeAreBadgeEn);
      if (homePoster.aboutWhoWeAreBadgeTh !== undefined) setAboutWhoWeAreBadgeTh(homePoster.aboutWhoWeAreBadgeTh);
      if (homePoster.aboutWhoWeAreTitle !== undefined) setAboutWhoWeAreTitle(homePoster.aboutWhoWeAreTitle);
      if (homePoster.aboutWhoWeAreTitleEn !== undefined) setAboutWhoWeAreTitleEn(homePoster.aboutWhoWeAreTitleEn);
      if (homePoster.aboutWhoWeAreTitleTh !== undefined) setAboutWhoWeAreTitleTh(homePoster.aboutWhoWeAreTitleTh);
      if (homePoster.bokeoTitle !== undefined) setPosterBokeoTitle(homePoster.bokeoTitle);
      if (homePoster.bokeoTitleEn !== undefined) setPosterBokeoTitleEn(homePoster.bokeoTitleEn);
      if (homePoster.bokeoTitleTh !== undefined) setPosterBokeoTitleTh(homePoster.bokeoTitleTh);
      if (homePoster.bokeoDesc !== undefined) setPosterBokeoDesc(homePoster.bokeoDesc);
      if (homePoster.bokeoDescEn !== undefined) setPosterBokeoDescEn(homePoster.bokeoDescEn);
      if (homePoster.bokeoDescTh !== undefined) setPosterBokeoDescTh(homePoster.bokeoDescTh);
      if (homePoster.bokeoImageUrl !== undefined) setPosterBokeoImageUrl(homePoster.bokeoImageUrl);
      if (homePoster.bokeoPosterScale !== undefined) setPosterBokeoScale(typeof homePoster.bokeoPosterScale === 'number' ? homePoster.bokeoPosterScale : 100);
      if (homePoster.bokeoPosterPosition !== undefined) setPosterBokeoPosition(homePoster.bokeoPosterPosition);
      if (homePoster.bokeoPosterFit !== undefined) setPosterBokeoFit(homePoster.bokeoPosterFit);
      if (homePoster.imageUrl !== undefined) setPosterImgUrl(homePoster.imageUrl);
      if (Array.isArray(homePoster.imageUrls)) {
        setPosterImageUrls(homePoster.imageUrls);
      } else if (homePoster.imageUrl) {
        setPosterImageUrls([homePoster.imageUrl]);
      }
      if (homePoster.posterHeight !== undefined) {
        const raw = homePoster.posterHeight;
        const num = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
        if (!isNaN(num)) {
          setPosterHeight(num > 100 ? Math.round(Math.min(Math.max((num - 180) / 380 * 100, 0), 100)) : Math.min(Math.max(num, 0), 100));
        }
      }
      if (homePoster.posterFit !== undefined) setPosterFit(homePoster.posterFit);
      if (homePoster.posterScale !== undefined) setPosterScale(typeof homePoster.posterScale === 'number' ? homePoster.posterScale : 100);
      if (homePoster.posterAspectRatio !== undefined) setPosterAspectRatio(homePoster.posterAspectRatio);
      if (homePoster.posterBrightness !== undefined) setPosterBrightness(typeof homePoster.posterBrightness === 'number' ? homePoster.posterBrightness : 100);
      if (homePoster.posterContrast !== undefined) setPosterContrast(typeof homePoster.posterContrast === 'number' ? homePoster.posterContrast : 100);
      if (homePoster.posterSaturation !== undefined) setPosterSaturation(typeof homePoster.posterSaturation === 'number' ? homePoster.posterSaturation : 100);
      if (homePoster.posterBlur !== undefined) setPosterBlur(typeof homePoster.posterBlur === 'number' ? homePoster.posterBlur : 0);
      if (homePoster.posterOverlayOpacity !== undefined) setPosterOverlayOpacity(typeof homePoster.posterOverlayOpacity === 'number' ? homePoster.posterOverlayOpacity : 85);
      if (homePoster.posterEdgeFade !== undefined) setPosterEdgeFade(typeof homePoster.posterEdgeFade === 'number' ? homePoster.posterEdgeFade : 0);
      if (homePoster.bokeoPosterHeight !== undefined) {
        const val = typeof homePoster.bokeoPosterHeight === 'number' ? homePoster.bokeoPosterHeight : 50;
        setBokeoPosterHeight(val > 100 ? Math.round(Math.min(Math.max(((val - 180) / 380) * 100, 0), 100)) : val);
      }
      if (homePoster.bokeoPosterOverlayOpacity !== undefined) setBokeoPosterOverlayOpacity(typeof homePoster.bokeoPosterOverlayOpacity === 'number' ? homePoster.bokeoPosterOverlayOpacity : 70);
      if (homePoster.bokeoPosterEdgeFade !== undefined) setBokeoPosterEdgeFade(typeof homePoster.bokeoPosterEdgeFade === 'number' ? homePoster.bokeoPosterEdgeFade : 0);
      if (homePoster.bokeoPosterDim !== undefined) setBokeoPosterDim(typeof homePoster.bokeoPosterDim === 'number' ? homePoster.bokeoPosterDim : 40);
      if (homePoster.buttonText) setPosterBtnText(homePoster.buttonText);
      if (homePoster.buttonTextEn) setPosterBtnTextEn(homePoster.buttonTextEn);
      if (homePoster.buttonTextTh) setPosterBtnTextTh(homePoster.buttonTextTh);
      if (homePoster.posterLocationTag !== undefined) setPosterLocationTag(homePoster.posterLocationTag);
      if (homePoster.posterLocationTagEn !== undefined) setPosterLocationTagEn(homePoster.posterLocationTagEn);
      if (homePoster.posterLocationTagTh !== undefined) setPosterLocationTagTh(homePoster.posterLocationTagTh);
      if (homePoster.videoBtnText !== undefined) setPosterVideoBtnText(homePoster.videoBtnText);
      if (homePoster.videoBtnTextEn !== undefined) setPosterVideoBtnTextEn(homePoster.videoBtnTextEn);
      if (homePoster.videoBtnTextTh !== undefined) setPosterVideoBtnTextTh(homePoster.videoBtnTextTh);
      if (homePoster.badgeTopText !== undefined) setPosterBadgeTopText(homePoster.badgeTopText);
      if (homePoster.badgeTopTextEn !== undefined) setPosterBadgeTopTextEn(homePoster.badgeTopTextEn);
      if (homePoster.badgeTopTextTh !== undefined) setPosterBadgeTopTextTh(homePoster.badgeTopTextTh);
      if (homePoster.badgeBottomText !== undefined) setPosterBadgeBottomText(homePoster.badgeBottomText);
      if (homePoster.badgeBottomTextEn !== undefined) setPosterBadgeBottomTextEn(homePoster.badgeBottomTextEn);
      if (homePoster.badgeBottomTextTh !== undefined) setPosterBadgeBottomTextTh(homePoster.badgeBottomTextTh);
      if (homePoster.hideRightBadge !== undefined) setHideRightBadge(homePoster.hideRightBadge);
      if (homePoster.videoUrl !== undefined) setPosterVideoUrl(homePoster.videoUrl);
      if (homePoster.bgColor !== undefined) setAppBgColor(homePoster.bgColor);
      if (homePoster.bgImageUrl !== undefined) setAppBgImageUrl(homePoster.bgImageUrl);
      if (homePoster.bgBrightness !== undefined) setAppBgBrightness(typeof homePoster.bgBrightness === 'number' ? homePoster.bgBrightness : 90);
      if (homePoster.bgBlur !== undefined) setAppBgBlur(typeof homePoster.bgBlur === 'number' ? homePoster.bgBlur : 8);
      if (homePoster.bgWhiteOverlayOpacity !== undefined) setAppBgWhiteOverlayOpacity(typeof homePoster.bgWhiteOverlayOpacity === 'number' ? homePoster.bgWhiteOverlayOpacity : 0);
      else if ((homePoster as any)?.bgWhiteOpacity !== undefined) setAppBgWhiteOverlayOpacity(typeof (homePoster as any).bgWhiteOpacity === 'number' ? (homePoster as any).bgWhiteOpacity : 0);
      if (homePoster.logoUrl !== undefined) setOrgLogoUrl(homePoster.logoUrl);
      if (homePoster.bgPosition !== undefined) setPosterBgPosition(homePoster.bgPosition);
      if (homePoster.hidePoster !== undefined) setHidePosterSection(homePoster.hidePoster);
      else if (homePoster.hidden !== undefined) setHidePosterSection(homePoster.hidden);
      if (homePoster.hideBokeoSection !== undefined) setHideBokeoSection(homePoster.hideBokeoSection);
      if (homePoster.showTextOverlay !== undefined) setShowTextOverlay(homePoster.showTextOverlay);
      else if (homePoster.hideTextOverlay !== undefined) setShowTextOverlay(!homePoster.hideTextOverlay);
      if (homePoster.upcomingBgDim !== undefined) setUpcomingBgDim(homePoster.upcomingBgDim);
      if (homePoster.upcomingTableBg !== undefined) setUpcomingTableBg(homePoster.upcomingTableBg);
      if (homePoster.upcomingTableCustomBg !== undefined) setUpcomingTableCustomBg(homePoster.upcomingTableCustomBg);
      if (homePoster.upcomingTableBorderWidth !== undefined) setUpcomingTableBorderWidth(homePoster.upcomingTableBorderWidth);
      if (homePoster.upcomingTableBorderColor !== undefined) setUpcomingTableBorderColor(homePoster.upcomingTableBorderColor);
      if (homePoster.upcomingEdgeFade !== undefined) setUpcomingEdgeFade(homePoster.upcomingEdgeFade);
      if (homePoster.upcomingHeight !== undefined) {
        const h = homePoster.upcomingHeight;
        setUpcomingHeight(h > 100 ? Math.min(100, Math.round(h / 7.5)) : Math.max(0, Math.min(100, h)));
      }
      if (homePoster.upcomingContentBgOpacity !== undefined) setUpcomingContentBgOpacity(homePoster.upcomingContentBgOpacity);
      if (homePoster.upcomingTitleSize !== undefined) setUpcomingTitleSize(homePoster.upcomingTitleSize);
      if (homePoster.upcomingBgVisibility !== undefined) setUpcomingBgVisibility(homePoster.upcomingBgVisibility);
      if (homePoster.upcomingTableWidth !== undefined) setUpcomingTableWidth(homePoster.upcomingTableWidth);
      if (homePoster.upcomingTableAlign !== undefined) setUpcomingTableAlign(homePoster.upcomingTableAlign);
      if (homePoster.bokeoTimeline !== undefined) setBokeoTimeline(homePoster.bokeoTimeline);
      if (homePoster.bokeoTimelineTitle !== undefined) setBokeoTimelineTitle(homePoster.bokeoTimelineTitle);
      if (homePoster.bokeoTimelineTitleEn !== undefined) {
        setBokeoTimelineTitleEn(
          homePoster.bokeoTimelineTitleEn === 'Ministry Journey & Timeline'
            ? 'Story timeline'
            : homePoster.bokeoTimelineTitleEn
        );
      }
      if (homePoster.bokeoTimelineTitleTh !== undefined) setBokeoTimelineTitleTh(homePoster.bokeoTimelineTitleTh);
      if (homePoster.hideBokeoTimeline !== undefined) setHideBokeoTimeline(homePoster.hideBokeoTimeline);
      if (homePoster.vision !== undefined) setDonationVision(homePoster.vision);
      if (homePoster.visionEn !== undefined) setDonationVisionEn(homePoster.visionEn);
      if (homePoster.visionTh !== undefined) setDonationVisionTh(homePoster.visionTh);
      if (homePoster.mission !== undefined) setDonationMission(homePoster.mission);
      if (homePoster.missionEn !== undefined) setDonationMissionEn(homePoster.missionEn);
      if (homePoster.missionTh !== undefined) setDonationMissionTh(homePoster.missionTh);
      if (homePoster.hideVisionMission !== undefined) setHideVisionMissionState(homePoster.hideVisionMission);
    }
  };

  const [posterBgPosition, setPosterBgPosition] = useState<string>(homePoster?.bgPosition || '50% 50%');
  const [selectedPosterIndex, setSelectedPosterIndex] = useState<number>(0);
  const [posterBgPositions, setPosterBgPositions] = useState<string[]>(
    Array.isArray(homePoster?.bgPositions) ? homePoster.bgPositions : []
  );
  const [imageCustomSettings, setImageCustomSettings] = useState<PosterImageCustomSetting[]>(
    Array.isArray(homePoster?.imageCustomSettings)
      ? homePoster.imageCustomSettings
      : Array.isArray(homePoster?.bgPositions)
      ? homePoster.bgPositions.map((p) => ({ position: p }))
      : []
  );
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getEffectiveImageSetting = (index: number) => {
    const custom = imageCustomSettings[index] || {};
    return {
      position: custom.position || posterBgPositions[index] || posterBgPosition || '50% 50%',
      fit: custom.fit || posterFit || 'cover',
      brightness: custom.brightness ?? posterBrightness ?? 100,
      contrast: custom.contrast ?? posterContrast ?? 100,
      saturation: custom.saturation ?? posterSaturation ?? 100,
      blur: custom.blur ?? posterBlur ?? 0,
    };
  };

  const activeImgSetting = getEffectiveImageSetting(selectedPosterIndex);

  const updateActiveImageSetting = (patch: Partial<PosterImageCustomSetting>) => {
    setImageCustomSettings((prev) => {
      const updated = [...prev];
      while (updated.length <= selectedPosterIndex) {
        updated.push({});
      }
      const current = updated[selectedPosterIndex] || {};
      updated[selectedPosterIndex] = {
        position: current.position || posterBgPositions[selectedPosterIndex] || posterBgPosition || '50% 50%',
        fit: current.fit || posterFit || 'cover',
        brightness: current.brightness ?? posterBrightness ?? 100,
        contrast: current.contrast ?? posterContrast ?? 100,
        saturation: current.saturation ?? posterSaturation ?? 100,
        blur: current.blur ?? posterBlur ?? 0,
        ...patch,
      };
      return updated;
    });

    if (patch.position) {
      setPosterBgPosition(patch.position);
      setPosterBgPositions((prev) => {
        const updated = [...prev];
        updated[selectedPosterIndex] = patch.position!;
        return updated;
      });
    }
  };

  const handleResetSelectedImage = (indexToReset: number) => {
    setImageCustomSettings((prev) => {
      const updated = [...prev];
      updated[indexToReset] = {
        position: '50% 50%',
        fit: 'cover',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
      };
      return updated;
    });
    setPosterBgPosition('50% 50%');
    setPosterBgPositions((prev) => {
      const updated = [...prev];
      updated[indexToReset] = '50% 50%';
      return updated;
    });
  };

  const [hidePosterSection, setHidePosterSection] = useState<boolean>(homePoster?.hidePoster || homePoster?.hidden || false);
  const [hideBokeoSection, setHideBokeoSection] = useState<boolean>(homePoster?.hideBokeoSection || false);
  const [showTextOverlay, setShowTextOverlay] = useState<boolean>(
    homePoster?.showTextOverlay !== undefined
      ? homePoster.showTextOverlay
      : (homePoster?.hideTextOverlay !== undefined ? !homePoster.hideTextOverlay : true)
  );
  const [isDraggingPoster, setIsDraggingPoster] = useState<boolean>(false);
  const posterPreviewRef = useRef<HTMLDivElement>(null);

  const updateFocalPointFromCoords = (clientX: number, clientY: number) => {
    if (!posterPreviewRef.current) return;
    const rect = posterPreviewRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const xPercent = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    const newPos = `${Math.round(xPercent)}% ${Math.round(yPercent)}%`;
    updateActiveImageSetting({ position: newPos });
  };

  const handleSelectPresetPos = (pos: string) => {
    updateActiveImageSetting({ position: pos });
  };

  const handlePosterPointerDown = (e: React.PointerEvent) => {
    setIsDraggingPoster(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFocalPointFromCoords(e.clientX, e.clientY);
  };

  const handlePosterPointerMove = (e: React.PointerEvent) => {
    if (isDraggingPoster) {
      updateFocalPointFromCoords(e.clientX, e.clientY);
    }
  };

  const handlePosterPointerUp = (e: React.PointerEvent) => {
    setIsDraggingPoster(false);
  };

  useEffect(() => {
    if (homePoster) {
      isHydratingFromPropsRef.current = true;
      if (homePoster.title !== undefined) {
        setPosterTitle(homePoster.title);
      }
      if (homePoster.titleEn !== undefined) {
        setPosterTitleEn(homePoster.titleEn);
      }
      if (homePoster.titleTh !== undefined) {
        setPosterTitleTh(homePoster.titleTh);
      }
      if (homePoster.subtitle) setPosterSubtitle(homePoster.subtitle);
      if (homePoster.subtitleEn) setPosterSubtitleEn(homePoster.subtitleEn);
      if (homePoster.subtitleTh) setPosterSubtitleTh(homePoster.subtitleTh);
      if (homePoster.description) setPosterDesc(homePoster.description);
      if (homePoster.descriptionEn) setPosterDescEn(homePoster.descriptionEn);
      if (homePoster.descriptionTh) setPosterDescTh(homePoster.descriptionTh);
      if (homePoster.aboutHeroImageUrl !== undefined) setAboutHeroImageUrl(homePoster.aboutHeroImageUrl);
      if (homePoster.hideAboutHeroPoster !== undefined) setHideAboutHeroPoster(homePoster.hideAboutHeroPoster);
      if (homePoster.aboutHeroBadge !== undefined) setAboutHeroBadge(homePoster.aboutHeroBadge);
      if (homePoster.aboutHeroBadgeEn !== undefined) setAboutHeroBadgeEn(homePoster.aboutHeroBadgeEn);
      if (homePoster.aboutHeroBadgeTh !== undefined) setAboutHeroBadgeTh(homePoster.aboutHeroBadgeTh);
      if (homePoster.aboutHeroVerse !== undefined) setAboutHeroVerse(homePoster.aboutHeroVerse);
      if (homePoster.aboutHeroVerseEn !== undefined) setAboutHeroVerseEn(homePoster.aboutHeroVerseEn);
      if (homePoster.aboutHeroVerseTh !== undefined) setAboutHeroVerseTh(homePoster.aboutHeroVerseTh);
      if (homePoster.aboutHeroVerseRef !== undefined) setAboutHeroVerseRef(homePoster.aboutHeroVerseRef);
      if (homePoster.aboutHeroVerseRefEn !== undefined) setAboutHeroVerseRefEn(homePoster.aboutHeroVerseRefEn);
      if (homePoster.aboutHeroVerseRefTh !== undefined) setAboutHeroVerseRefTh(homePoster.aboutHeroVerseRefTh);
      if (homePoster.aboutWhoWeArePosition !== undefined) setAboutWhoWeArePosition(homePoster.aboutWhoWeArePosition);
      if (homePoster.aboutWhoWeAreScale !== undefined) setAboutWhoWeAreScale(typeof homePoster.aboutWhoWeAreScale === 'number' ? homePoster.aboutWhoWeAreScale : 100);
      if (homePoster.aboutWhoWeAreFit !== undefined) setAboutWhoWeAreFit(homePoster.aboutWhoWeAreFit);
      if (homePoster.aboutWhoWeAreBadge !== undefined) setAboutWhoWeAreBadge(homePoster.aboutWhoWeAreBadge);
      if (homePoster.aboutWhoWeAreBadgeEn !== undefined) setAboutWhoWeAreBadgeEn(homePoster.aboutWhoWeAreBadgeEn);
      if (homePoster.aboutWhoWeAreBadgeTh !== undefined) setAboutWhoWeAreBadgeTh(homePoster.aboutWhoWeAreBadgeTh);
      if (homePoster.aboutWhoWeAreTitle !== undefined) setAboutWhoWeAreTitle(homePoster.aboutWhoWeAreTitle);
      if (homePoster.aboutWhoWeAreTitleEn !== undefined) setAboutWhoWeAreTitleEn(homePoster.aboutWhoWeAreTitleEn);
      if (homePoster.aboutWhoWeAreTitleTh !== undefined) setAboutWhoWeAreTitleTh(homePoster.aboutWhoWeAreTitleTh);
      if (homePoster.bokeoTitle !== undefined) setPosterBokeoTitle(homePoster.bokeoTitle);
      if (homePoster.bokeoTitleEn !== undefined) setPosterBokeoTitleEn(homePoster.bokeoTitleEn);
      if (homePoster.bokeoTitleTh !== undefined) setPosterBokeoTitleTh(homePoster.bokeoTitleTh);
      if (homePoster.bokeoDesc !== undefined) setPosterBokeoDesc(homePoster.bokeoDesc);
      if (homePoster.bokeoDescEn !== undefined) setPosterBokeoDescEn(homePoster.bokeoDescEn);
      if (homePoster.bokeoDescTh !== undefined) setPosterBokeoDescTh(homePoster.bokeoDescTh);
      if (homePoster.bokeoImageUrl !== undefined) setPosterBokeoImageUrl(homePoster.bokeoImageUrl);
      if (homePoster.bokeoPosterScale !== undefined) setPosterBokeoScale(typeof homePoster.bokeoPosterScale === 'number' ? homePoster.bokeoPosterScale : 100);
      if (homePoster.bokeoPosterPosition !== undefined) setPosterBokeoPosition(homePoster.bokeoPosterPosition);
      if (homePoster.bokeoPosterFit !== undefined) setPosterBokeoFit(homePoster.bokeoPosterFit);
      if (homePoster.imageUrl !== undefined) setPosterImgUrl(homePoster.imageUrl);
      if (Array.isArray(homePoster.imageUrls)) {
        setPosterImageUrls(homePoster.imageUrls);
      } else if (homePoster.imageUrl) {
        setPosterImageUrls([homePoster.imageUrl]);
      }
      if (homePoster.posterHeight !== undefined) {
        const raw = homePoster.posterHeight;
        const num = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
        if (!isNaN(num)) {
          setPosterHeight(num > 100 ? Math.round(Math.min(Math.max((num - 180) / 380 * 100, 0), 100)) : Math.min(Math.max(num, 0), 100));
        }
      }
      if (homePoster.posterFit !== undefined) setPosterFit(homePoster.posterFit);
      if (homePoster.posterScale !== undefined) setPosterScale(typeof homePoster.posterScale === 'number' ? homePoster.posterScale : 100);
      if (homePoster.posterAspectRatio !== undefined) setPosterAspectRatio(homePoster.posterAspectRatio);
      if (homePoster.posterBrightness !== undefined) setPosterBrightness(typeof homePoster.posterBrightness === 'number' ? homePoster.posterBrightness : 100);
      if (homePoster.posterContrast !== undefined) setPosterContrast(typeof homePoster.posterContrast === 'number' ? homePoster.posterContrast : 100);
      if (homePoster.posterSaturation !== undefined) setPosterSaturation(typeof homePoster.posterSaturation === 'number' ? homePoster.posterSaturation : 100);
      if (homePoster.posterBlur !== undefined) setPosterBlur(typeof homePoster.posterBlur === 'number' ? homePoster.posterBlur : 0);
      if (homePoster.posterOverlayOpacity !== undefined) setPosterOverlayOpacity(typeof homePoster.posterOverlayOpacity === 'number' ? homePoster.posterOverlayOpacity : 85);
      if (homePoster.posterEdgeFade !== undefined) setPosterEdgeFade(typeof homePoster.posterEdgeFade === 'number' ? homePoster.posterEdgeFade : 0);
      if (homePoster.bokeoPosterHeight !== undefined) {
        const val = typeof homePoster.bokeoPosterHeight === 'number' ? homePoster.bokeoPosterHeight : 50;
        setBokeoPosterHeight(val > 100 ? Math.round(Math.min(Math.max(((val - 180) / 380) * 100, 0), 100)) : val);
      }
      if (homePoster.bokeoPosterOverlayOpacity !== undefined) setBokeoPosterOverlayOpacity(typeof homePoster.bokeoPosterOverlayOpacity === 'number' ? homePoster.bokeoPosterOverlayOpacity : 70);
      if (homePoster.bokeoPosterEdgeFade !== undefined) setBokeoPosterEdgeFade(typeof homePoster.bokeoPosterEdgeFade === 'number' ? homePoster.bokeoPosterEdgeFade : 0);
      if (homePoster.bokeoPosterDim !== undefined) setBokeoPosterDim(typeof homePoster.bokeoPosterDim === 'number' ? homePoster.bokeoPosterDim : 40);
      if (homePoster.buttonText) setPosterBtnText(homePoster.buttonText);
      if (homePoster.buttonTextEn) setPosterBtnTextEn(homePoster.buttonTextEn);
      if (homePoster.buttonTextTh) setPosterBtnTextTh(homePoster.buttonTextTh);
      if (homePoster.posterLocationTag !== undefined) setPosterLocationTag(homePoster.posterLocationTag);
      if (homePoster.posterLocationTagEn !== undefined) setPosterLocationTagEn(homePoster.posterLocationTagEn);
      if (homePoster.posterLocationTagTh !== undefined) setPosterLocationTagTh(homePoster.posterLocationTagTh);
      if (homePoster.videoBtnText !== undefined) setPosterVideoBtnText(homePoster.videoBtnText);
      if (homePoster.videoBtnTextEn !== undefined) setPosterVideoBtnTextEn(homePoster.videoBtnTextEn);
      if (homePoster.videoBtnTextTh !== undefined) setPosterVideoBtnTextTh(homePoster.videoBtnTextTh);
      if (homePoster.badgeTopText !== undefined) setPosterBadgeTopText(homePoster.badgeTopText);
      if (homePoster.badgeTopTextEn !== undefined) setPosterBadgeTopTextEn(homePoster.badgeTopTextEn);
      if (homePoster.badgeTopTextTh !== undefined) setPosterBadgeTopTextTh(homePoster.badgeTopTextTh);
      if (homePoster.badgeBottomText !== undefined) setPosterBadgeBottomText(homePoster.badgeBottomText);
      if (homePoster.badgeBottomTextEn !== undefined) setPosterBadgeBottomTextEn(homePoster.badgeBottomTextEn);
      if (homePoster.badgeBottomTextTh !== undefined) setPosterBadgeBottomTextTh(homePoster.badgeBottomTextTh);
      if (homePoster.hideRightBadge !== undefined) setHideRightBadge(homePoster.hideRightBadge);
      if (homePoster.videoUrl !== undefined) setPosterVideoUrl(homePoster.videoUrl);
      if (homePoster.bgColor !== undefined) setAppBgColor(homePoster.bgColor);
      if (homePoster.bgImageUrl !== undefined) setAppBgImageUrl(homePoster.bgImageUrl);
      if (homePoster.bgBrightness !== undefined) setAppBgBrightness(typeof homePoster.bgBrightness === 'number' ? homePoster.bgBrightness : 90);
      if (homePoster.bgBlur !== undefined) setAppBgBlur(typeof homePoster.bgBlur === 'number' ? homePoster.bgBlur : 8);
      if (homePoster.bgWhiteOverlayOpacity !== undefined) setAppBgWhiteOverlayOpacity(typeof homePoster.bgWhiteOverlayOpacity === 'number' ? homePoster.bgWhiteOverlayOpacity : 0);
      else if ((homePoster as any)?.bgWhiteOpacity !== undefined) setAppBgWhiteOverlayOpacity(typeof (homePoster as any).bgWhiteOpacity === 'number' ? (homePoster as any).bgWhiteOpacity : 0);
      if (homePoster.logoUrl !== undefined) setOrgLogoUrl(homePoster.logoUrl);
      if (homePoster.bgPosition !== undefined) setPosterBgPosition(homePoster.bgPosition);
      if (Array.isArray(homePoster.bgPositions)) setPosterBgPositions(homePoster.bgPositions);
      if (Array.isArray(homePoster.imageCustomSettings)) {
        setImageCustomSettings(homePoster.imageCustomSettings);
      } else if (Array.isArray(homePoster.bgPositions)) {
        setImageCustomSettings(homePoster.bgPositions.map((p) => ({ position: p })));
      }
      if (homePoster.hidePoster !== undefined) setHidePosterSection(homePoster.hidePoster);
      else if (homePoster.hidden !== undefined) setHidePosterSection(homePoster.hidden);
      if (homePoster.hideBokeoSection !== undefined) setHideBokeoSection(homePoster.hideBokeoSection);
      if (homePoster.showTextOverlay !== undefined) setShowTextOverlay(homePoster.showTextOverlay);
      else if (homePoster.hideTextOverlay !== undefined) setShowTextOverlay(!homePoster.hideTextOverlay);
      else setShowTextOverlay(true);

      // Upcoming Event / Announcement fields
      if (homePoster.upcomingEventTitle !== undefined) setUpcomingEventTitle(homePoster.upcomingEventTitle);
      if (homePoster.upcomingEventTitleEn !== undefined) setUpcomingEventTitleEn(homePoster.upcomingEventTitleEn);
      if (homePoster.upcomingEventTitleTh !== undefined) setUpcomingEventTitleTh(homePoster.upcomingEventTitleTh);
      if (homePoster.upcomingEventDate !== undefined) setUpcomingEventDate(homePoster.upcomingEventDate);
      if (homePoster.upcomingEventLocation !== undefined) setUpcomingEventLocation(homePoster.upcomingEventLocation);
      if (homePoster.upcomingEventLocationEn !== undefined) setUpcomingEventLocationEn(homePoster.upcomingEventLocationEn);
      if (homePoster.upcomingEventLocationTh !== undefined) setUpcomingEventLocationTh(homePoster.upcomingEventLocationTh);
      if (homePoster.upcomingEventDesc !== undefined) setUpcomingEventDesc(homePoster.upcomingEventDesc);
      if (homePoster.upcomingEventDescEn !== undefined) setUpcomingEventDescEn(homePoster.upcomingEventDescEn);
      if (homePoster.upcomingEventDescTh !== undefined) setUpcomingEventDescTh(homePoster.upcomingEventDescTh);
      if (homePoster.upcomingEventImageUrl !== undefined) setUpcomingEventImageUrl(homePoster.upcomingEventImageUrl);
      if (homePoster.upcomingEventBadge !== undefined) setUpcomingEventBadge(homePoster.upcomingEventBadge);
      if (homePoster.hideUpcomingEvent !== undefined) setHideUpcomingEvent(homePoster.hideUpcomingEvent);
      if (homePoster.upcomingSchedule !== undefined) setUpcomingSchedule(homePoster.upcomingSchedule);
      if (homePoster.upcomingScheduleHtml !== undefined) setUpcomingScheduleHtml(homePoster.upcomingScheduleHtml);
      if (homePoster.upcomingPdfUrl !== undefined) setUpcomingPdfUrl(homePoster.upcomingPdfUrl);
      if (homePoster.upcomingPdfName !== undefined) setUpcomingPdfName(homePoster.upcomingPdfName);
      if (homePoster.upcomingDocxUrl !== undefined) setUpcomingDocxUrl(homePoster.upcomingDocxUrl);
      if (homePoster.upcomingDocxName !== undefined) setUpcomingDocxName(homePoster.upcomingDocxName);
      if (homePoster.upcomingBgDim !== undefined) setUpcomingBgDim(homePoster.upcomingBgDim);
      if (homePoster.upcomingTableBg !== undefined) setUpcomingTableBg(homePoster.upcomingTableBg);
      if (homePoster.upcomingTableCustomBg !== undefined) setUpcomingTableCustomBg(homePoster.upcomingTableCustomBg);
      if (homePoster.upcomingTableBorderWidth !== undefined) setUpcomingTableBorderWidth(homePoster.upcomingTableBorderWidth);
      if (homePoster.upcomingTableBorderColor !== undefined) setUpcomingTableBorderColor(homePoster.upcomingTableBorderColor);
      if (homePoster.upcomingEdgeFade !== undefined) setUpcomingEdgeFade(homePoster.upcomingEdgeFade);
      if (homePoster.upcomingHeight !== undefined) {
        const h = homePoster.upcomingHeight;
        setUpcomingHeight(h > 100 ? Math.min(100, Math.round(h / 7.5)) : Math.max(0, Math.min(100, h)));
      }
      if (homePoster.upcomingContentBgOpacity !== undefined) setUpcomingContentBgOpacity(homePoster.upcomingContentBgOpacity);
      if (homePoster.upcomingTitleSize !== undefined) setUpcomingTitleSize(homePoster.upcomingTitleSize);
      if (homePoster.upcomingBgVisibility !== undefined) setUpcomingBgVisibility(homePoster.upcomingBgVisibility);
      if (homePoster.upcomingTableWidth !== undefined) setUpcomingTableWidth(homePoster.upcomingTableWidth);
      if (homePoster.upcomingTableAlign !== undefined) setUpcomingTableAlign(homePoster.upcomingTableAlign);
      if (homePoster.bokeoTimeline !== undefined) {
        setBokeoTimeline(homePoster.bokeoTimeline);
      }
      if (homePoster.bokeoTimelineTitle !== undefined) setBokeoTimelineTitle(homePoster.bokeoTimelineTitle);
      if (homePoster.bokeoTimelineTitleEn !== undefined) {
        setBokeoTimelineTitleEn(
          homePoster.bokeoTimelineTitleEn === 'Ministry Journey & Timeline'
            ? 'Story timeline'
            : homePoster.bokeoTimelineTitleEn
        );
      }
      if (homePoster.bokeoTimelineTitleTh !== undefined) setBokeoTimelineTitleTh(homePoster.bokeoTimelineTitleTh);
      if (homePoster.hideBokeoTimeline !== undefined) setHideBokeoTimeline(homePoster.hideBokeoTimeline);
      if (homePoster.vision !== undefined) setDonationVision(homePoster.vision);
      if (homePoster.visionEn !== undefined) setDonationVisionEn(homePoster.visionEn);
      if (homePoster.visionTh !== undefined) setDonationVisionTh(homePoster.visionTh);
      if (homePoster.mission !== undefined) setDonationMission(homePoster.mission);
      if (homePoster.missionEn !== undefined) setDonationMissionEn(homePoster.missionEn);
      if (homePoster.missionTh !== undefined) setDonationMissionTh(homePoster.missionTh);
      if (homePoster.hideVisionMission !== undefined) setHideVisionMissionState(homePoster.hideVisionMission);
      setTimeout(() => {
        isHydratingFromPropsRef.current = false;
      }, 150);
    }
  }, [homePoster]);

  const adminSubTabRef = useRef(adminSubTab);
  useEffect(() => {
    adminSubTabRef.current = adminSubTab;
  }, [adminSubTab]);

  // Debounced auto-sync to ensure any changes in About Poster sliders are immediately persisted to homePoster & localStorage
  const hasInitializedAboutPosterRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedAboutPosterRef.current) {
      hasInitializedAboutPosterRef.current = true;
      return;
    }
    if (isHydratingFromPropsRef.current) return;
    if (adminSubTabRef.current !== 'about_poster') return;

    const timer = setTimeout(() => {
      if (isHydratingFromPropsRef.current) return;
      const draft: HomePoster = {
        title: homePoster?.title || 'HOPE BOKEO',
        subtitle: homePoster?.subtitle || '',
        description: homePoster?.description || '',
        imageUrl: homePoster?.imageUrl || '',
        ...(homePoster || {}),
        aboutHeroImageUrl: (aboutHeroImageUrl || '').trim(),
        hideAboutHeroPoster: hideAboutHeroPoster,
        aboutHeroBadge: aboutHeroBadge,
        aboutHeroBadgeEn: aboutHeroBadgeEn,
        aboutHeroBadgeTh: aboutHeroBadgeTh,
        aboutHeroVerse: aboutHeroVerse,
        aboutHeroVerseEn: aboutHeroVerseEn,
        aboutHeroVerseTh: aboutHeroVerseTh,
        aboutHeroVerseRef: aboutHeroVerseRef,
        aboutHeroVerseRefEn: aboutHeroVerseRefEn,
        aboutHeroVerseRefTh: aboutHeroVerseRefTh,
        aboutWhoWeArePosition: aboutWhoWeArePosition,
        aboutWhoWeAreScale: Number(aboutWhoWeAreScale) || 100,
        aboutWhoWeAreFit: aboutWhoWeAreFit,
        aboutWhoWeAreBadge: aboutWhoWeAreBadge,
        aboutWhoWeAreBadgeEn: aboutWhoWeAreBadgeEn,
        aboutWhoWeAreBadgeTh: aboutWhoWeAreBadgeTh,
        aboutWhoWeAreTitle: aboutWhoWeAreTitle,
        aboutWhoWeAreTitleEn: aboutWhoWeAreTitleEn,
        aboutWhoWeAreTitleTh: aboutWhoWeAreTitleTh,
        bokeoPosterHeight: Number(bokeoPosterHeight),
        bokeoPosterOverlayOpacity: Number(bokeoPosterOverlayOpacity),
        bokeoPosterEdgeFade: Number(bokeoPosterEdgeFade),
        bokeoPosterDim: Number(bokeoPosterDim),
        bokeoPosterScale: Number(posterBokeoScale) || 100,
        bokeoPosterPosition: posterBokeoPosition,
        bokeoPosterFit: posterBokeoFit,
        bokeoImageUrl: (posterBokeoImageUrl || '').trim(),
        bokeoTitle: posterBokeoTitle,
        bokeoTitleEn: posterBokeoTitleEn,
        bokeoTitleTh: posterBokeoTitleTh,
        bokeoDesc: posterBokeoDesc,
        bokeoDescEn: posterBokeoDescEn,
        bokeoDescTh: posterBokeoDescTh,
        hideBokeoSection: hideBokeoSection,
        bokeoTimeline: bokeoTimeline || [],
        bokeoTimelineTitle: (bokeoTimelineTitle || '').trim(),
        bokeoTimelineTitleEn: (bokeoTimelineTitleEn || '').trim(),
        bokeoTimelineTitleTh: (bokeoTimelineTitleTh || '').trim(),
        hideBokeoTimeline: hideBokeoTimeline,
        vision: donationVision || '',
        visionEn: donationVisionEn || '',
        visionTh: donationVisionTh || '',
        mission: donationMission || '',
        missionEn: donationMissionEn || '',
        missionTh: donationMissionTh || '',
        hideVisionMission: hideVisionMissionState,
        updatedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem('hb_cached_home_poster', JSON.stringify(draft));
      } catch {}

      if (onSaveHomePoster) {
        onSaveHomePoster(draft).catch(() => {});
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    aboutHeroImageUrl,
    hideAboutHeroPoster,
    aboutHeroBadge,
    aboutHeroBadgeEn,
    aboutHeroBadgeTh,
    aboutHeroVerse,
    aboutHeroVerseEn,
    aboutHeroVerseTh,
    aboutHeroVerseRef,
    aboutHeroVerseRefEn,
    aboutHeroVerseRefTh,
    aboutWhoWeArePosition,
    aboutWhoWeAreScale,
    aboutWhoWeAreFit,
    aboutWhoWeAreBadge,
    aboutWhoWeAreBadgeEn,
    aboutWhoWeAreBadgeTh,
    aboutWhoWeAreTitle,
    aboutWhoWeAreTitleEn,
    aboutWhoWeAreTitleTh,
    bokeoPosterHeight,
    bokeoPosterOverlayOpacity,
    bokeoPosterEdgeFade,
    bokeoPosterDim,
    posterBokeoScale,
    posterBokeoPosition,
    posterBokeoFit,
    posterBokeoImageUrl,
    posterBokeoTitle,
    posterBokeoTitleEn,
    posterBokeoTitleTh,
    posterBokeoDesc,
    posterBokeoDescEn,
    posterBokeoDescTh,
    hideBokeoSection,
    bokeoTimeline,
    bokeoTimelineTitle,
    bokeoTimelineTitleEn,
    bokeoTimelineTitleTh,
    hideBokeoTimeline,
    donationVision,
    donationVisionEn,
    donationVisionTh,
    donationMission,
    donationMissionEn,
    donationMissionTh,
    hideVisionMissionState,
  ]);

  const handleSaveHomePosterForm = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setIsSavingPoster(true);
    try {
      let finalImg = posterImgUrl;
      if (posterFile) {
        try {
          const uploadRes = await uploadFileDirectly(posterFile);
          if (uploadRes?.url) {
            finalImg = uploadRes.url;
          }
        } catch {
          const compressedBase64 = await compressImageFile(posterFile, 2560, 0.95, 750000);
          finalImg = compressedBase64;
        }
      }

      const finalCoverList: string[] = [];
      const sourceList = Array.isArray(posterImageUrls) && posterImageUrls.length > 0 ? posterImageUrls : (finalImg ? [finalImg] : []);

      for (const imgUrl of sourceList) {
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
          finalCoverList.push(imgUrl.trim());
        }
      }

      if (finalCoverList.length === 0 && finalImg && finalImg.trim()) {
        finalCoverList.push(finalImg.trim());
      }

      let finalBgImageUrl = appBgImageUrl;

      let updated: HomePoster = {
        ...(homePoster || {}),
        title: posterTitle,
        titleEn: posterTitleEn,
        titleTh: posterTitleTh,
        subtitle: posterSubtitle,
        subtitleEn: posterSubtitleEn,
        subtitleTh: posterSubtitleTh,
        description: posterDesc,
        descriptionEn: posterDescEn,
        descriptionTh: posterDescTh,
        aboutHeroImageUrl: (aboutHeroImageUrl || '').trim(),
        hideAboutHeroPoster: hideAboutHeroPoster,
        aboutHeroBadge: aboutHeroBadge,
        aboutHeroBadgeEn: aboutHeroBadgeEn,
        aboutHeroBadgeTh: aboutHeroBadgeTh,
        aboutHeroVerse: aboutHeroVerse,
        aboutHeroVerseEn: aboutHeroVerseEn,
        aboutHeroVerseTh: aboutHeroVerseTh,
        aboutHeroVerseRef: aboutHeroVerseRef,
        aboutHeroVerseRefEn: aboutHeroVerseRefEn,
        aboutHeroVerseRefTh: aboutHeroVerseRefTh,
        aboutWhoWeArePosition: aboutWhoWeArePosition,
        aboutWhoWeAreScale: Number(aboutWhoWeAreScale) || 100,
        aboutWhoWeAreFit: aboutWhoWeAreFit,
        aboutWhoWeAreBadge: aboutWhoWeAreBadge,
        aboutWhoWeAreBadgeEn: aboutWhoWeAreBadgeEn,
        aboutWhoWeAreBadgeTh: aboutWhoWeAreBadgeTh,
        aboutWhoWeAreTitle: aboutWhoWeAreTitle,
        aboutWhoWeAreTitleEn: aboutWhoWeAreTitleEn,
        aboutWhoWeAreTitleTh: aboutWhoWeAreTitleTh,
        bokeoTitle: posterBokeoTitle,
        bokeoTitleEn: posterBokeoTitleEn,
        bokeoTitleTh: posterBokeoTitleTh,
        bokeoDesc: posterBokeoDesc,
        bokeoDescEn: posterBokeoDescEn,
        bokeoDescTh: posterBokeoDescTh,
        bokeoImageUrl: (posterBokeoImageUrl || '').trim(),
        imageUrl: finalCoverList[0] || '',
        imageUrls: finalCoverList,
        videoUrl: posterVideoUrl,
        buttonText: posterBtnText,
        buttonTextEn: posterBtnTextEn,
        buttonTextTh: posterBtnTextTh,
        posterLocationTag: posterLocationTag.trim(),
        posterLocationTagEn: posterLocationTagEn.trim(),
        posterLocationTagTh: posterLocationTagTh.trim(),
        videoBtnText: posterVideoBtnText.trim(),
        videoBtnTextEn: posterVideoBtnTextEn.trim(),
        videoBtnTextTh: posterVideoBtnTextTh.trim(),
        badgeTopText: posterBadgeTopText.trim(),
        badgeTopTextEn: posterBadgeTopTextEn.trim(),
        badgeTopTextTh: posterBadgeTopTextTh.trim(),
        badgeBottomText: posterBadgeBottomText.trim(),
        badgeBottomTextEn: posterBadgeBottomTextEn.trim(),
        badgeBottomTextTh: posterBadgeBottomTextTh.trim(),
        hideRightBadge: hideRightBadge,
        upcomingEventTitle: upcomingEventTitle.trim(),
        upcomingEventTitleEn: upcomingEventTitleEn.trim(),
        upcomingEventTitleTh: upcomingEventTitleTh.trim(),
        upcomingEventDate: upcomingEventDate.trim(),
        upcomingEventLocation: upcomingEventLocation.trim(),
        upcomingEventLocationEn: upcomingEventLocationEn.trim(),
        upcomingEventLocationTh: upcomingEventLocationTh.trim(),
        upcomingEventDesc: upcomingEventDesc.trim(),
        upcomingEventDescEn: upcomingEventDescEn.trim(),
        upcomingEventDescTh: upcomingEventDescTh.trim(),
        upcomingEventImageUrl: upcomingEventImageUrl.trim(),
        upcomingEventBadge: upcomingEventBadge.trim(),
        hideUpcomingEvent: hideUpcomingEvent,
        upcomingSchedule: upcomingSchedule || [],
        upcomingScheduleHtml: (upcomingScheduleHtml || '').trim(),
        upcomingPdfUrl: (upcomingPdfUrl || '').trim(),
        upcomingPdfName: (upcomingPdfName || '').trim(),
        upcomingDocxUrl: (upcomingDocxUrl || '').trim(),
        upcomingDocxName: (upcomingDocxName || '').trim(),
        upcomingBgDim: Number(upcomingBgDim),
        upcomingEdgeFade: Number(upcomingEdgeFade),
        upcomingHeight: Number(upcomingHeight),
        upcomingContentBgOpacity: Number(upcomingContentBgOpacity),
        upcomingTitleSize: upcomingTitleSize,
        upcomingBgVisibility: Number(upcomingBgVisibility),
        upcomingTableWidth: Number(upcomingTableWidth),
        upcomingTableAlign: upcomingTableAlign,
        upcomingTableBg: upcomingTableBg,
        upcomingTableCustomBg: (upcomingTableCustomBg || '').trim(),
        upcomingTableBorderWidth: Number(upcomingTableBorderWidth),
        upcomingTableBorderColor: (upcomingTableBorderColor || '').trim(),
        bgColor: appBgColor,
        bgImageUrl: finalBgImageUrl,
        bgBrightness: Number(appBgBrightness),
        bgBlur: Number(appBgBlur),
        bgWhiteOverlayOpacity: Number(appBgWhiteOverlayOpacity),
        bgWhiteOpacity: Number(appBgWhiteOverlayOpacity),
        logoUrl: orgLogoUrl,
        bgPosition: posterBgPosition,
        bgPositions: posterBgPositions,
        imageCustomSettings: imageCustomSettings,
        posterHeight: posterHeight,
        posterScale: Number(posterScale) || 100,
        posterFit: posterFit,
        posterAspectRatio: posterAspectRatio,
        posterBrightness: Number(posterBrightness),
        posterContrast: Number(posterContrast),
        posterSaturation: Number(posterSaturation),
        posterBlur: Number(posterBlur),
        posterOverlayOpacity: Number(posterOverlayOpacity),
        posterEdgeFade: Number(posterEdgeFade),
        bokeoPosterHeight: Number(bokeoPosterHeight),
        bokeoPosterOverlayOpacity: Number(bokeoPosterOverlayOpacity),
        bokeoPosterEdgeFade: Number(bokeoPosterEdgeFade),
        bokeoPosterDim: Number(bokeoPosterDim),
        bokeoPosterScale: Number(posterBokeoScale) || 100,
        bokeoPosterPosition: posterBokeoPosition,
        bokeoPosterFit: posterBokeoFit,
        hidden: hidePosterSection,
        hidePoster: hidePosterSection,
        hideTextOverlay: !showTextOverlay,
        showTextOverlay: showTextOverlay,
        hideBokeoSection: hideBokeoSection,
        bokeoTimeline: bokeoTimeline || [],
        bokeoTimelineTitle: (bokeoTimelineTitle || '').trim(),
        bokeoTimelineTitleEn: (bokeoTimelineTitleEn || '').trim(),
        bokeoTimelineTitleTh: (bokeoTimelineTitleTh || '').trim(),
        hideBokeoTimeline: hideBokeoTimeline,
        vision: donationVision || '',
        visionEn: donationVisionEn || '',
        visionTh: donationVisionTh || '',
        mission: donationMission || '',
        missionEn: donationMissionEn || '',
        missionTh: donationMissionTh || '',
        hideVisionMission: hideVisionMissionState,
      };

      updated = await optimizePosterForFirestore(updated);

      if (orgLogoUrl) {
        try {
          localStorage.setItem('hb_custom_logo', orgLogoUrl);
          window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: orgLogoUrl }));
        } catch (err) {
          console.warn('LocalStorage save error:', err);
        }
      } else {
        try {
          localStorage.removeItem('hb_custom_logo');
          window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: '/hb-logo.svg' }));
        } catch {}
      }

      if (onSaveHomePoster) {
        await onSaveHomePoster(updated);
      }

      // Also keep donationInfo in sync with vision & mission
      if (onSaveDonationInfo && donationInfo) {
        onSaveDonationInfo({
          ...donationInfo,
          vision: donationVision || '',
          visionEn: donationVisionEn || '',
          visionTh: donationVisionTh || '',
          mission: donationMission || '',
          missionEn: donationMissionEn || '',
          missionTh: donationMissionTh || '',
          hideVisionMission: hideVisionMissionState,
        }).catch((err) => console.warn('Sync donationInfo vision/mission error:', err));
      }
      setIsEditingPoster(true);
      setPinSavedToast(
        language === 'lo'
          ? 'ອັບເດດໂປສເຕີ ແລະ ພື້ນຫຼັງໜ້າຫຼັກສຳເລັດແລ້ວ!'
          : 'Home poster & background updated successfully!'
      );
      setTimeout(() => setPinSavedToast(''), 3000);
    } catch (err: any) {
      console.error('Save poster error:', err);
      setPinSavedToast(
        language === 'lo'
          ? 'ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ, ກະລຸນາລອງໃໝ່'
          : 'Error updating poster, please try again'
      );
      setTimeout(() => setPinSavedToast(''), 4000);
    } finally {
      setIsSavingPoster(false);
    }
  };
  // Room 1 Passcode: 76838584 (Settings & Team)
  const SETTINGS_PASSCODE = '76838584';
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState<boolean>(false);
  const [inputSettingsCode, setInputSettingsCode] = useState<string>('');
  const [showSettingsCode, setShowSettingsCode] = useState<boolean>(false);
  const [settingsCodeError, setSettingsCodeError] = useState<string>('');

  // Room 3 Passcode: 46515790 (Finance & Support)
  const FINANCE_PASSCODE = '46515790';
  const [isFinanceUnlocked, setIsFinanceUnlocked] = useState<boolean>(false);
  const [inputFinanceCode, setInputFinanceCode] = useState<string>('');
  const [showFinanceCode, setShowFinanceCode] = useState<boolean>(false);
  const [financeCodeError, setFinanceCodeError] = useState<string>('');

  const isSettingsUnlockedRef = useRef(isSettingsUnlocked);
  useEffect(() => {
    isSettingsUnlockedRef.current = isSettingsUnlocked;
  }, [isSettingsUnlocked]);

  const hasInitializedPosterAutoSaveRef = useRef(false);
  // Real-time debounced auto-sync for Poster & Upcoming Event settings when edited in Admin Panel
  useEffect(() => {
    if (!hasInitializedPosterAutoSaveRef.current) {
      hasInitializedPosterAutoSaveRef.current = true;
      return;
    }
    if (!isSettingsUnlockedRef.current || isHydratingFromPropsRef.current) return;
    if (
      adminSubTabRef.current !== 'poster' &&
      adminSubTabRef.current !== 'upcoming' &&
      adminSubTabRef.current !== 'about_poster' &&
      adminSubTabRef.current !== 'insights_poster'
    ) {
      return;
    }

    const timer = setTimeout(() => {
      if (isHydratingFromPropsRef.current) return;
      const finalCoverList =
        Array.isArray(posterImageUrls) && posterImageUrls.length > 0
          ? posterImageUrls.filter((u) => typeof u === 'string' && u.trim())
          : posterImgUrl && posterImgUrl.trim()
          ? [posterImgUrl.trim()]
          : [];

      const draft: HomePoster = {
        ...(homePoster || {}),
        title: posterTitle,
        titleEn: posterTitleEn,
        titleTh: posterTitleTh,
        subtitle: posterSubtitle,
        subtitleEn: posterSubtitleEn,
        subtitleTh: posterSubtitleTh,
        description: posterDesc,
        descriptionEn: posterDescEn,
        descriptionTh: posterDescTh,
        aboutHeroImageUrl: (aboutHeroImageUrl || '').trim(),
        hideAboutHeroPoster: hideAboutHeroPoster,
        aboutHeroBadge: aboutHeroBadge,
        aboutHeroBadgeEn: aboutHeroBadgeEn,
        aboutHeroBadgeTh: aboutHeroBadgeTh,
        aboutHeroVerse: aboutHeroVerse,
        aboutHeroVerseEn: aboutHeroVerseEn,
        aboutHeroVerseTh: aboutHeroVerseTh,
        aboutHeroVerseRef: aboutHeroVerseRef,
        aboutHeroVerseRefEn: aboutHeroVerseRefEn,
        aboutHeroVerseRefTh: aboutHeroVerseRefTh,
        aboutWhoWeArePosition: aboutWhoWeArePosition,
        aboutWhoWeAreScale: Number(aboutWhoWeAreScale) || 100,
        aboutWhoWeAreFit: aboutWhoWeAreFit,
        aboutWhoWeAreBadge: aboutWhoWeAreBadge,
        aboutWhoWeAreBadgeEn: aboutWhoWeAreBadgeEn,
        aboutWhoWeAreBadgeTh: aboutWhoWeAreBadgeTh,
        aboutWhoWeAreTitle: aboutWhoWeAreTitle,
        aboutWhoWeAreTitleEn: aboutWhoWeAreTitleEn,
        aboutWhoWeAreTitleTh: aboutWhoWeAreTitleTh,
        bokeoTitle: posterBokeoTitle,
        bokeoTitleEn: posterBokeoTitleEn,
        bokeoTitleTh: posterBokeoTitleTh,
        bokeoDesc: posterBokeoDesc,
        bokeoDescEn: posterBokeoDescEn,
        bokeoDescTh: posterBokeoDescTh,
        bokeoImageUrl: (posterBokeoImageUrl || '').trim(),
        bokeoPosterHeight: Number(bokeoPosterHeight),
        bokeoPosterOverlayOpacity: Number(bokeoPosterOverlayOpacity),
        bokeoPosterEdgeFade: Number(bokeoPosterEdgeFade),
        bokeoPosterDim: Number(bokeoPosterDim),
        bokeoPosterScale: Number(posterBokeoScale) || 100,
        bokeoPosterPosition: posterBokeoPosition,
        bokeoPosterFit: posterBokeoFit,
        hideBokeoSection: hideBokeoSection,
        bokeoTimeline: bokeoTimeline || [],
        bokeoTimelineTitle: (bokeoTimelineTitle || '').trim(),
        bokeoTimelineTitleEn: (bokeoTimelineTitleEn || '').trim(),
        bokeoTimelineTitleTh: (bokeoTimelineTitleTh || '').trim(),
        hideBokeoTimeline: hideBokeoTimeline,
        vision: donationVision || '',
        visionEn: donationVisionEn || '',
        visionTh: donationVisionTh || '',
        mission: donationMission || '',
        missionEn: donationMissionEn || '',
        missionTh: donationMissionTh || '',
        hideVisionMission: hideVisionMissionState,
        imageUrl: finalCoverList[0] || '',
        imageUrls: finalCoverList,
        videoUrl: posterVideoUrl,
        buttonText: posterBtnText,
        buttonTextEn: posterBtnTextEn,
        buttonTextTh: posterBtnTextTh,
        posterLocationTag: posterLocationTag.trim(),
        posterLocationTagEn: posterLocationTagEn.trim(),
        posterLocationTagTh: posterLocationTagTh.trim(),
        videoBtnText: posterVideoBtnText.trim(),
        videoBtnTextEn: posterVideoBtnTextEn.trim(),
        videoBtnTextTh: posterVideoBtnTextTh.trim(),
        badgeTopText: posterBadgeTopText.trim(),
        badgeTopTextEn: posterBadgeTopTextEn.trim(),
        badgeTopTextTh: posterBadgeTopTextTh.trim(),
        badgeBottomText: posterBadgeBottomText.trim(),
        badgeBottomTextEn: posterBadgeBottomTextEn.trim(),
        badgeBottomTextTh: posterBadgeBottomTextTh.trim(),
        hideRightBadge: hideRightBadge,
        upcomingEventTitle: upcomingEventTitle.trim(),
        upcomingEventTitleEn: upcomingEventTitleEn.trim(),
        upcomingEventTitleTh: upcomingEventTitleTh.trim(),
        upcomingEventDate: upcomingEventDate.trim(),
        upcomingEventLocation: upcomingEventLocation.trim(),
        upcomingEventLocationEn: upcomingEventLocationEn.trim(),
        upcomingEventLocationTh: upcomingEventLocationTh.trim(),
        upcomingEventDesc: upcomingEventDesc.trim(),
        upcomingEventDescEn: upcomingEventDescEn.trim(),
        upcomingEventDescTh: upcomingEventDescTh.trim(),
        upcomingEventImageUrl: upcomingEventImageUrl.trim(),
        upcomingEventBadge: upcomingEventBadge.trim(),
        hideUpcomingEvent: hideUpcomingEvent,
        upcomingSchedule: upcomingSchedule || [],
        upcomingScheduleHtml: (upcomingScheduleHtml || '').trim(),
        upcomingPdfUrl: (upcomingPdfUrl || '').trim(),
        upcomingPdfName: (upcomingPdfName || '').trim(),
        upcomingDocxUrl: (upcomingDocxUrl || '').trim(),
        upcomingDocxName: (upcomingDocxName || '').trim(),
        upcomingBgDim: Number(upcomingBgDim),
        upcomingEdgeFade: Number(upcomingEdgeFade),
        upcomingHeight: Number(upcomingHeight),
        upcomingContentBgOpacity: Number(upcomingContentBgOpacity),
        upcomingTitleSize: upcomingTitleSize,
        upcomingBgVisibility: Number(upcomingBgVisibility),
        upcomingTableWidth: Number(upcomingTableWidth),
        upcomingTableAlign: upcomingTableAlign,
        upcomingTableBg: upcomingTableBg,
        upcomingTableCustomBg: (upcomingTableCustomBg || '').trim(),
        upcomingTableBorderWidth: Number(upcomingTableBorderWidth),
        upcomingTableBorderColor: (upcomingTableBorderColor || '').trim(),
        bgColor: appBgColor,
        bgImageUrl: appBgImageUrl,
        bgBrightness: Number(appBgBrightness),
        bgBlur: Number(appBgBlur),
        bgWhiteOverlayOpacity: Number(appBgWhiteOverlayOpacity),
        bgWhiteOpacity: Number(appBgWhiteOverlayOpacity),
        logoUrl: orgLogoUrl,
        bgPosition: posterBgPosition,
        bgPositions: posterBgPositions,
        imageCustomSettings: imageCustomSettings,
        posterHeight: posterHeight,
        posterScale: Number(posterScale) || 100,
        posterFit: posterFit,
        posterAspectRatio: posterAspectRatio,
        posterBrightness: Number(posterBrightness),
        posterContrast: Number(posterContrast),
        posterSaturation: Number(posterSaturation),
        posterBlur: Number(posterBlur),
        posterOverlayOpacity: Number(posterOverlayOpacity),
        posterEdgeFade: Number(posterEdgeFade),
        hidden: hidePosterSection,
        hidePoster: hidePosterSection,
        hideTextOverlay: !showTextOverlay,
        showTextOverlay: showTextOverlay,
        updatedAt: new Date().toISOString(),
      };

      if (onSaveHomePoster) {
        onSaveHomePoster(draft).catch(() => {});
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [
    posterTitle,
    posterTitleEn,
    posterTitleTh,
    posterSubtitle,
    posterSubtitleEn,
    posterSubtitleTh,
    posterDesc,
    posterDescEn,
    posterDescTh,
    aboutHeroImageUrl,
    hideAboutHeroPoster,
    aboutHeroBadge,
    aboutHeroBadgeEn,
    aboutHeroBadgeTh,
    aboutHeroVerse,
    aboutHeroVerseEn,
    aboutHeroVerseTh,
    aboutHeroVerseRef,
    aboutHeroVerseRefEn,
    aboutHeroVerseRefTh,
    aboutWhoWeArePosition,
    aboutWhoWeAreScale,
    aboutWhoWeAreFit,
    aboutWhoWeAreBadge,
    aboutWhoWeAreBadgeEn,
    aboutWhoWeAreBadgeTh,
    aboutWhoWeAreTitle,
    aboutWhoWeAreTitleEn,
    aboutWhoWeAreTitleTh,
    posterBokeoTitle,
    posterBokeoTitleEn,
    posterBokeoTitleTh,
    posterBokeoDesc,
    posterBokeoDescEn,
    posterBokeoDescTh,
    posterBokeoImageUrl,
    bokeoPosterHeight,
    bokeoPosterOverlayOpacity,
    bokeoPosterEdgeFade,
    bokeoPosterDim,
    posterBokeoScale,
    posterBokeoPosition,
    posterBokeoFit,
    hideBokeoSection,
    bokeoTimeline,
    bokeoTimelineTitle,
    bokeoTimelineTitleEn,
    bokeoTimelineTitleTh,
    hideBokeoTimeline,
    donationVision,
    donationVisionEn,
    donationVisionTh,
    donationMission,
    donationMissionEn,
    donationMissionTh,
    hideVisionMissionState,
    posterImgUrl,
    posterImageUrls,
    posterVideoUrl,
    posterBtnText,
    posterBtnTextEn,
    posterBtnTextTh,
    posterLocationTag,
    posterLocationTagEn,
    posterLocationTagTh,
    posterVideoBtnText,
    posterVideoBtnTextEn,
    posterVideoBtnTextTh,
    posterBadgeTopText,
    posterBadgeTopTextEn,
    posterBadgeTopTextTh,
    posterBadgeBottomText,
    posterBadgeBottomTextEn,
    posterBadgeBottomTextTh,
    hideRightBadge,
    upcomingEventTitle,
    upcomingEventTitleEn,
    upcomingEventTitleTh,
    upcomingEventDate,
    upcomingEventLocation,
    upcomingEventLocationEn,
    upcomingEventLocationTh,
    upcomingEventDesc,
    upcomingEventDescEn,
    upcomingEventDescTh,
    upcomingEventImageUrl,
    upcomingEventBadge,
    hideUpcomingEvent,
    upcomingSchedule,
    upcomingScheduleHtml,
    upcomingPdfUrl,
    upcomingPdfName,
    upcomingDocxUrl,
    upcomingDocxName,
    upcomingBgDim,
    upcomingEdgeFade,
    upcomingHeight,
    upcomingContentBgOpacity,
    upcomingTitleSize,
    upcomingBgVisibility,
    upcomingTableWidth,
    upcomingTableAlign,
    upcomingTableBg,
    upcomingTableCustomBg,
    upcomingTableBorderWidth,
    upcomingTableBorderColor,
    appBgColor,
    appBgImageUrl,
    appBgBrightness,
    appBgBlur,
    appBgWhiteOverlayOpacity,
    orgLogoUrl,
    posterBgPosition,
    posterBgPositions,
    imageCustomSettings,
    posterHeight,
    posterScale,
    posterFit,
    posterAspectRatio,
    posterBrightness,
    posterContrast,
    posterSaturation,
    posterBlur,
    posterOverlayOpacity,
    posterEdgeFade,
    hidePosterSection,
    showTextOverlay,
  ]);

  const hasInitializedDonationAutoSaveRef = useRef(false);
  // Real-time debounced auto-sync for Donation & Prayer Channels when edited in Admin Panel
  useEffect(() => {
    if (!hasInitializedDonationAutoSaveRef.current) {
      hasInitializedDonationAutoSaveRef.current = true;
      return;
    }
    if (!isSettingsUnlockedRef.current || isHydratingFromPropsRef.current) return;
    if (adminSubTabRef.current !== 'donation') return;

    const timer = setTimeout(() => {
      if (isHydratingFromPropsRef.current) return;
      const cleanBankAccounts = (donationBankAccounts || []).map((acc) => ({
        ...acc,
        bankName: acc.bankName || '',
        bankNameEn: acc.bankNameEn || '',
        bankNameTh: acc.bankNameTh || '',
        accountName: acc.accountName || '',
        accountNumber: acc.accountNumber || '',
        swiftCode: acc.swiftCode || '',
        qrImageUrl: acc.qrImageUrl || '',
        hidden: Boolean(acc.hidden),
      }));

      const draft: DonationInfo = {
        bankName: cleanBankAccounts[0]?.bankName || donationBankName || '',
        bankNameEn: cleanBankAccounts[0]?.bankNameEn || '',
        bankNameTh: cleanBankAccounts[0]?.bankNameTh || '',
        accountName: cleanBankAccounts[0]?.accountName || donationAccountName || '',
        accountNumber: cleanBankAccounts[0]?.accountNumber || donationAccountNumber || '',
        swiftCode: cleanBankAccounts[0]?.swiftCode || donationSwiftCode || '',
        qrImageUrl: cleanBankAccounts[0]?.qrImageUrl || donationQrImageUrl || '',
        bankAccounts: cleanBankAccounts,
        prayerContactPhone: donationPhone || '',
        prayerContactWhatsapp: donationWhatsapp || '',
        prayerContactEmail: donationEmail || '',
        supportNote: donationSupportNote || '',
        supportNoteEn: donationSupportNoteEn || '',
        supportNoteTh: donationSupportNoteTh || '',
        purposeDesc: donationPurposeDesc || '',
        purposeDescEn: donationPurposeDescEn || '',
        purposeDescTh: donationPurposeDescTh || '',
        vision: donationVision || '',
        visionEn: donationVisionEn || '',
        visionTh: donationVisionTh || '',
        mission: donationMission || '',
        missionEn: donationMissionEn || '',
        missionTh: donationMissionTh || '',
        hidden: Boolean(hideDonationSectionState),
        hideDonationSection: Boolean(hideDonationSectionState),
        hideVisionMission: Boolean(hideVisionMissionState),
        hidePrayerLine: Boolean(hidePrayerLineState),
        updatedAt: new Date().toISOString(),
      };

      if (onSaveDonationInfo) {
        onSaveDonationInfo(draft).catch(() => {});
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    donationBankAccounts,
    donationBankName,
    donationAccountName,
    donationAccountNumber,
    donationSwiftCode,
    donationQrImageUrl,
    donationPhone,
    donationWhatsapp,
    donationEmail,
    donationSupportNote,
    donationSupportNoteEn,
    donationSupportNoteTh,
    donationPurposeDesc,
    donationPurposeDescEn,
    donationPurposeDescTh,
    donationVision,
    donationVisionEn,
    donationVisionTh,
    donationMission,
    donationMissionEn,
    donationMissionTh,
    hideDonationSectionState,
    hideVisionMissionState,
    hidePrayerLineState,
  ]);

  const handleLockSettings = () => {
    setIsSettingsUnlocked(false);
    setInputSettingsCode('');
    try {
      sessionStorage.removeItem('hb_settings_unlocked');
      localStorage.removeItem('hb_settings_unlocked');
    } catch {}
    setPinSavedToast(
      language === 'lo'
        ? 'ລັອກຫ້ອງຕັ້ງຄ່າຮຽບຮ້ອຍແລ້ວ'
        : 'Settings room locked successfully'
    );
    setTimeout(() => setPinSavedToast(''), 3000);
  };

  const handleLockFinance = () => {
    setIsFinanceUnlocked(false);
    setInputFinanceCode('');
    try {
      sessionStorage.removeItem('hb_finance_unlocked');
      localStorage.removeItem('hb_finance_unlocked');
    } catch {}
    setPinSavedToast(
      language === 'lo'
        ? 'ລັອກຫ້ອງການເງິນຮຽບຮ້ອຍແລ້ວ'
        : 'Finance room locked successfully'
    );
    setTimeout(() => setPinSavedToast(''), 3000);
  };

  const handleLockAllRooms = () => {
    setIsSettingsUnlocked(false);
    setInputSettingsCode('');
    setIsFinanceUnlocked(false);
    setInputFinanceCode('');
    try {
      sessionStorage.removeItem('hb_settings_unlocked');
      localStorage.removeItem('hb_settings_unlocked');
      sessionStorage.removeItem('hb_finance_unlocked');
      localStorage.removeItem('hb_finance_unlocked');
    } catch {}
    setPinSavedToast(
      language === 'lo'
        ? 'ລັອກຫ້ອງຮຽບຮ້ອຍແລ້ວ'
        : 'Rooms locked successfully'
    );
    setTimeout(() => setPinSavedToast(''), 3000);
  };

  const handleVerifySettingsCode = (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const code = (customCode !== undefined ? customCode : inputSettingsCode).trim();
    if (code === SETTINGS_PASSCODE) {
      setIsSettingsUnlocked(true);
      setSettingsCodeError('');
      setInputSettingsCode('');
      setAdminActiveFeature('settings');
    } else {
      setSettingsCodeError(
        language === 'lo'
          ? 'ລະຫັດຜ່ານຫ້ອງຕັ້ງຄ່າບໍ່ຖືກຕ້ອງ! (ລະຫັດ 8 ຫຼັກ)'
          : language === 'th'
          ? 'รหัสผ่านห้องตั้งค่าไม่ถูกต้อง! (รหัส 8 หลัก)'
          : 'Invalid Settings passcode!'
      );
    }
  };

  const handleVerifyFinanceCode = (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const code = (customCode !== undefined ? customCode : inputFinanceCode).trim();
    if (code === FINANCE_PASSCODE) {
      setIsFinanceUnlocked(true);
      setFinanceCodeError('');
      setInputFinanceCode('');
      setAdminActiveFeature('finance');
    } else {
      setFinanceCodeError(
        language === 'lo'
          ? 'ລະຫັດຜ່ານຫ້ອງການເງິນບໍ່ຖືກຕ້ອງ! (ລະຫັດ 8 ຫຼັກ)'
          : language === 'th'
          ? 'รหัสผ่านห้องการเงินไม่ถูกต้อง! (รหัส 8 หลัก)'
          : 'Invalid Finance passcode!'
      );
    }
  };

  // Auto generate 4-digit PIN for all villages if missing
  const handleAutoGeneratePins = () => {
    const saveFn = onSaveVillage || onEditVillage;
    let startPin = 1001;
    villages.forEach((v) => {
      const generated = (startPin++).toString();
      saveFn({
        ...v,
        pinCode: v.pinCode || generated,
      });
    });
    setPinSavedToast(
      language === 'lo'
        ? 'ສ້າງລະຫັດ PIN ອັດໂນມັດສຳລັບທຸກຄິດສະຈັກສຳເລັດແລ້ວ!'
        : 'Auto-generated PINs for all churches successfully!'
    );
    setTimeout(() => setPinSavedToast(''), 3000);
  };

  // Save specific village PIN
  const handleSavePin = (v: Village) => {
    if (!tempPin.trim()) return;
    const saveFn = onSaveVillage || onEditVillage;
    saveFn({
      ...v,
      pinCode: tempPin.trim(),
    });
    setEditingPinRowId(null);
    setTempPin('');
    setPinSavedToast(
      language === 'lo'
        ? `ອັບເດດລະຫັດ PIN ສຳລັບ ${v.name} ເປັນ: ${tempPin} ສຳເລັດແລ້ວ`
        : `Updated PIN for ${v.name} to: ${tempPin}`
    );
    setTimeout(() => setPinSavedToast(''), 3000);
  };

  return (
    <div className="space-y-2 sm:space-y-4 animate-fade-in pb-8">
      {/* 1. MANAGEMENT HUB MAIN SELECTION VIEW (Shown ONLY when adminActiveFeature === 'hub') */}
      {adminActiveFeature === 'hub' && (
        <div className="space-y-1.5 sm:space-y-3 animate-fade-in">
          {/* Hub Header - Compact & matching other tabs with signature red accent */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs xs:text-sm sm:text-base font-bold sm:font-black text-slate-900 dark:text-white tracking-tight border-l-2 sm:border-l-4 border-[#cc0000] pl-2 sm:pl-3 flex items-center gap-1.5 sm:gap-2">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#cc0000] shrink-0" />
              <span>
                {language === 'lo' ? 'ສູນກາງການຈັດການ Hope Bokeo' : 'Hope Bokeo Management Hub'}
              </span>
            </h2>
          </div>

          {/* 3 Main Room Cards Grid - Compact height & tighter spacing on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 sm:gap-2.5 md:gap-3.5">
            {/* Room 1 Card: Settings & Team */}
            <div
              onClick={() => setAdminActiveFeature('settings')}
              className={`bg-white dark:bg-slate-800 rounded-none py-1.5 px-2 sm:py-2.5 sm:px-3 border transition-all duration-300 flex flex-col justify-between shadow-xs cursor-pointer ${
                isSettingsUnlocked
                  ? 'border-emerald-300 dark:border-emerald-700/60 shadow-emerald-500/5'
                  : 'border-slate-200 dark:border-slate-700 hover:border-[#cc0000] dark:hover:border-red-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <div className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-none bg-red-50 dark:bg-red-950/80 text-[#cc0000] dark:text-red-400 flex items-center justify-center shrink-0">
                      <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-white leading-tight truncate">
                        {language === 'lo' ? '1. ⚙️ ການຕັ້ງຄ່າລະບົບ & ທີມງານ' : '1. Settings & Team Hub'}
                      </h3>
                    </div>
                  </div>
                  {isSettingsUnlocked && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLockSettings();
                      }}
                      className="p-0.5 sm:p-1 rounded-none text-emerald-600 hover:text-red-600 bg-emerald-50 hover:bg-red-50 dark:bg-emerald-950/40 dark:hover:bg-red-950/60 border border-emerald-200 dark:border-emerald-800 transition shrink-0"
                      title={language === 'lo' ? 'ລັອກຫ້ອງຕັ້ງຄ່າ' : 'Lock Settings'}
                    >
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Enter / Unlock Form (Passcode on Left, Key button on Right) */}
              <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                {!isSettingsUnlocked ? (
                  <form
                    onSubmit={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleVerifySettingsCode(e);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="space-y-0.5"
                  >
                    <div className="flex items-center gap-1">
                      <div className="relative flex-1">
                        <input
                          type={showSettingsCode ? 'text' : 'password'}
                          value={inputSettingsCode}
                          onChange={(e) => {
                            setInputSettingsCode(e.target.value);
                            if (settingsCodeError) setSettingsCodeError('');
                          }}
                          placeholder={language === 'lo' ? 'ປ້ອນລະຫັດ 8 ຫຼັກ...' : 'Enter 8-digit passcode...'}
                          maxLength={20}
                          className="w-full h-6 sm:h-7.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-none px-1.5 sm:px-2 py-0 pr-6 text-[11px] sm:text-xs font-mono font-bold tracking-widest text-slate-900 dark:text-white focus:border-[#cc0000] focus:ring-1 focus:ring-red-500/20 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSettingsCode(!showSettingsCode)}
                          className="absolute right-1 top-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title={showSettingsCode ? 'Hide' : 'Show'}
                        >
                          {showSettingsCode ? <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                        </button>
                      </div>

                      <button
                        type="submit"
                        className="h-6 w-6 sm:h-7.5 sm:w-7.5 rounded-none bg-gradient-to-r from-red-600 to-[#cc0000] hover:from-red-700 hover:to-red-800 text-white shadow-xs transition flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                        title={language === 'lo' ? 'ປົດລັອກ' : 'Unlock'}
                      >
                        <KeyRound className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>
                    </div>

                    {settingsCodeError && (
                      <p className="text-[9px] sm:text-[10px] text-red-600 dark:text-red-400 font-bold px-0.5">
                        {settingsCodeError}
                      </p>
                    )}
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAdminActiveFeature('settings');
                    }}
                    className="w-full py-0.75 sm:py-1 px-2 sm:px-2.5 rounded-none bg-gradient-to-r from-red-600 to-[#cc0000] hover:from-red-700 hover:to-red-800 text-white font-bold text-[11px] sm:text-xs shadow-xs transition-all flex items-center justify-center gap-1 group cursor-pointer active:scale-98"
                  >
                    <Settings className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>{language === 'lo' ? 'ເຂົ້າສູ່ຫ້ອງຕັ້ງຄ່າ' : 'Enter Settings Room'}</span>
                    <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>

            {/* Room 2 Card: Church Portal Update */}
            <div
              onClick={() => setAdminActiveFeature('church_update')}
              className="bg-white dark:bg-slate-800 rounded-none py-1.5 px-2 sm:py-2.5 sm:px-3 border border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 transition-all duration-300 flex flex-col justify-between shadow-xs cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-none bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Church className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-white leading-tight truncate">
                      {language === 'lo' ? '2. ⛪ ອັບເດດຂໍ້ມູນຄຣິດຕະຈັກ' : '2. Church Update Portal'}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Enter Button */}
              <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAdminActiveFeature('church_update');
                  }}
                  className="w-full py-0.75 sm:py-1 px-2 sm:px-2.5 rounded-none bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-[11px] sm:text-xs shadow-xs transition-all flex items-center justify-center gap-1 group cursor-pointer active:scale-98"
                >
                  <Church className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>{language === 'lo' ? 'ເຂົ້າສູ່ພອດທັລຄຣິດຕະຈັກ' : 'Enter Church Portal'}</span>
                  <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Room 3 Card: Finance & Support */}
            <div
              onClick={() => setAdminActiveFeature('finance')}
              className={`bg-white dark:bg-slate-800 rounded-none py-1.5 px-2 sm:py-2.5 sm:px-3 border transition-all duration-300 flex flex-col justify-between shadow-xs cursor-pointer ${
                isFinanceUnlocked
                  ? 'border-emerald-300 dark:border-emerald-700/60 shadow-emerald-500/5'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <div className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-none bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-white leading-tight truncate">
                        {language === 'lo' ? '3. 💰 ຈັດການ & ສະແດງລາຍງານການເງິນ' : '3. Finance Overview & Ledger'}
                      </h3>
                    </div>
                  </div>
                  {isFinanceUnlocked && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLockFinance();
                      }}
                      className="p-0.5 sm:p-1 rounded-none text-blue-600 hover:text-red-600 bg-blue-50 hover:bg-red-50 dark:bg-blue-950/40 dark:hover:bg-red-950/60 border border-blue-200 dark:border-blue-800 transition shrink-0"
                      title={language === 'lo' ? 'ລັອກຫ້ອງການເງິນ' : 'Lock Finance'}
                    >
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Enter / Unlock Form (Passcode on Left, Key button on Right) */}
              <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                {!isFinanceUnlocked ? (
                  <form
                    onSubmit={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleVerifyFinanceCode(e);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="space-y-0.5"
                  >
                    <div className="flex items-center gap-1">
                      <div className="relative flex-1">
                        <input
                          type={showFinanceCode ? 'text' : 'password'}
                          value={inputFinanceCode}
                          onChange={(e) => {
                            setInputFinanceCode(e.target.value);
                            if (financeCodeError) setFinanceCodeError('');
                          }}
                          placeholder={language === 'lo' ? 'ປ້ອນລະຫັດ 8 ຫຼັກ...' : 'Enter 8-digit passcode...'}
                          maxLength={20}
                          className="w-full h-6 sm:h-7.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-none px-1.5 sm:px-2 py-0 pr-6 text-[11px] sm:text-xs font-mono font-bold tracking-widest text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFinanceCode(!showFinanceCode)}
                          className="absolute right-1 top-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title={showFinanceCode ? 'Hide' : 'Show'}
                        >
                          {showFinanceCode ? <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                        </button>
                      </div>

                      <button
                        type="submit"
                        className="h-6 w-6 sm:h-7.5 sm:w-7.5 rounded-none bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                        title={language === 'lo' ? 'ປົດລັອກ' : 'Unlock'}
                      >
                        <KeyRound className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>
                    </div>

                    {financeCodeError && (
                      <p className="text-[9px] sm:text-[10px] text-red-600 dark:text-red-400 font-bold px-0.5">
                        {financeCodeError}
                      </p>
                    )}
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAdminActiveFeature('finance');
                    }}
                    className="w-full py-0.75 sm:py-1 px-2 sm:px-2.5 rounded-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-[11px] sm:text-xs shadow-xs transition-all flex items-center justify-center gap-1 group cursor-pointer active:scale-98"
                  >
                    <Wallet className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>{language === 'lo' ? 'ເຂົ້າເບິ່ງລາຍງານການເງິນ' : 'View Finance Ledger'}</span>
                    <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEDICATED ROOM VIEW (Shown when adminActiveFeature !== 'hub') */}
      {adminActiveFeature !== 'hub' && (
        <div className="space-y-6 animate-fade-in">
          {/* ROOM 2 CONTENT: Church Update Portal (NO OUTER PASSWORD) */}
          {adminActiveFeature === 'church_update' && (
            <div className="animate-fade-in space-y-4">
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 sm:p-3 px-3 sm:px-4 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm">
                <button
                  type="button"
                  onClick={() => setAdminActiveFeature('hub')}
                  className="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-none transition flex items-center justify-center group active:scale-95 cursor-pointer shadow-xs border border-slate-200/60 dark:border-slate-600"
                  title={language === 'lo' ? 'ກັບຄືນສູ່ສູນກາງ Admin' : 'Back to Admin Hub'}
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-amber-500" />
                </button>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <Church className="w-4 h-4 text-amber-500" />
                  <span>{language === 'lo' ? 'ພອດທັລອັບເດດຄຣິດຕະຈັກ' : 'Church Update Portal'}</span>
                </div>
              </div>

              <ChurchEditPortal
                villages={villages}
                onSaveVillage={onSaveVillage || (async () => {})}
                language={language}
                onBack={() => setAdminActiveFeature('hub')}
              />
            </div>
          )}

          {/* ROOM 3 CONTENT: Finance & Support Management */}
          {adminActiveFeature === 'finance' && (
            <div className="animate-fade-in">
              {!isFinanceUnlocked ? (
                <div className="max-w-md mx-auto my-8 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 text-center space-y-6 animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-md">
                    <Wallet className="w-8 h-8" />
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                      {language === 'lo' ? 'ຫ້ອງທີ 3: ຈັດການການເງິນ' : 'Room 3: Finance Ledger'}
                    </span>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-3">
                      {language === 'lo' ? 'ກະລຸນາປ້ອນລະຫັດຜ່ານຫ້ອງການເງິນ' : 'Enter Finance Passcode'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      {language === 'lo'
                        ? 'ຫ້ອງນີ້ສະຫງວນໄວ້ສຳລັບການຈັດການເງິນສະໜັບສະໜູນ ແລະ ແບ່ງປັນລູກທີມ'
                        : 'This area is restricted for finance tracking and team distributions.'}
                    </p>
                  </div>

                  <form onSubmit={handleVerifyFinanceCode} className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {language === 'lo' ? 'ລະຫັດຜ່ານຫ້ອງການເງິນ (Passcode):' : 'Finance Passcode:'}
                      </label>
                      <div className="relative">
                        <input
                          type={showFinanceCode ? 'text' : 'password'}
                          value={inputFinanceCode}
                          onChange={(e) => setInputFinanceCode(e.target.value)}
                          placeholder="••••••••"
                          maxLength={20}
                          className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 pr-11 text-center text-xl font-mono font-bold tracking-widest text-slate-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none shadow-sm transition"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowFinanceCode(!showFinanceCode)}
                          className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title={showFinanceCode ? 'Hide passcode' : 'Show passcode'}
                        >
                          {showFinanceCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {financeCodeError && (
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-bold text-center">
                        {financeCodeError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 transform active:scale-98"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{language === 'lo' ? 'ປົດລັອກຫ້ອງການເງິນ' : 'Unlock Finance Area'}</span>
                    </button>
                  </form>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setAdminActiveFeature('hub')}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center justify-center mx-auto cursor-pointer"
                      title={language === 'lo' ? 'ກັບຄືນສູ່ສູນກາງ Admin' : 'Back to Admin Hub'}
                      aria-label="Back"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <FinanceTab
                  teams={teams}
                  donationInfo={donationInfo}
                  language={language}
                  isReadOnly={true}
                  onBack={() => setAdminActiveFeature('hub')}
                />
              )}
            </div>
          )}

          {/* ROOM 1 CONTENT: Admin Settings Layout */}
          {adminActiveFeature === 'settings' && (
            <div className="animate-fade-in">
              {!isSettingsUnlocked ? (
                <div className="max-w-md mx-auto my-8 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 text-center space-y-6 animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/60 text-[#cc0000] dark:text-red-400 flex items-center justify-center mx-auto shadow-md">
                    <Settings className="w-8 h-8" />
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#cc0000] bg-red-50 dark:bg-red-950 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800">
                      {language === 'lo' ? 'ຫ້ອງທີ 1: ການຕັ້ງຄ່າ & ຈັດການລູກທີມ' : 'Room 1: Settings & Team'}
                    </span>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-3">
                      {language === 'lo' ? 'ກະລຸນາປ້ອນລະຫັດຜ່ານຫ້ອງຕັ້ງຄ່າ' : 'Enter Settings Passcode'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      {language === 'lo'
                        ? 'ຫ້ອງນີ້ສະຫງວນໄວ້ສຳລັບຜູ້ດູແລລະບົບ Hope Bokeo'
                        : 'This area requires Settings & Team administrative access.'}
                    </p>
                  </div>

                  <form onSubmit={handleVerifySettingsCode} className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {language === 'lo' ? 'ລະຫັດຜ່ານຫ້ອງຕັ້ງຄ່າ (Passcode):' : 'Settings Passcode:'}
                      </label>
                      <div className="relative">
                        <input
                          type={showSettingsCode ? 'text' : 'password'}
                          value={inputSettingsCode}
                          onChange={(e) => setInputSettingsCode(e.target.value)}
                          placeholder="••••••••"
                          maxLength={20}
                          className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 pr-11 text-center text-xl font-mono font-bold tracking-widest text-slate-900 dark:text-white focus:border-[#cc0000] focus:ring-4 focus:ring-red-500/20 outline-none shadow-sm transition"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowSettingsCode(!showSettingsCode)}
                          className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title={showSettingsCode ? 'Hide passcode' : 'Show passcode'}
                        >
                          {showSettingsCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {settingsCodeError && (
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-bold text-center">
                        {settingsCodeError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-[#cc0000] hover:bg-red-700 text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 transform active:scale-98"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{language === 'lo' ? 'ປົດລັອກຫ້ອງຕັ້ງຄ່າ' : 'Unlock Settings Area'}</span>
                    </button>
                  </form>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setAdminActiveFeature('hub')}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center justify-center mx-auto cursor-pointer"
                      title={language === 'lo' ? 'ກັບຄືນສູ່ສູນກາງ Admin' : 'Back to Admin Hub'}
                      aria-label="Back"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Top Bar with Back to Admin Hub button */}
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 sm:p-3 px-3 sm:px-4 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setAdminActiveFeature('hub')}
                      className="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-none transition flex items-center justify-center group active:scale-95 cursor-pointer shadow-xs border border-slate-200/60 dark:border-slate-600"
                      title={language === 'lo' ? 'ກັບຄືນສູ່ສູນກາງ Admin' : 'Back to Admin Hub'}
                      aria-label="Back"
                    >
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-[#cc0000]" />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <Settings className="w-4 h-4 text-[#cc0000]" />
                        <span>{language === 'lo' ? 'ຫ້ອງຕັ້ງຄ່າລະບົບ & ທີມງານ' : 'Settings & Team Admin'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleLockSettings();
                          setAdminActiveFeature('hub');
                        }}
                        className="px-2.5 py-1 rounded-none bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-[#cc0000] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-red-200 dark:border-red-900/60"
                        title={language === 'lo' ? 'ລັອກຫ້ອງຕັ້ງຄ່າ' : 'Lock Settings'}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{language === 'lo' ? 'ລັອກຫ້ອງ' : 'Lock'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Vertical Navigation Sidebar */}
        <div className="w-full lg:w-72 shrink-0 bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 lg:sticky lg:top-20">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700/80">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#cc0000]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                {language === 'lo' ? 'ເມນູການຕັ້ງຄ່າ' : 'Settings Menu'}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setShowSubSection(!showSubSection)}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-200 dark:border-slate-600"
              title={showSubSection ? (language === 'lo' ? 'ຊ້ອນເນື້ອຫາ' : 'Hide') : (language === 'lo' ? 'ສະແດງເນື້ອຫາ' : 'Show')}
            >
              {showSubSection ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-500" />}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 font-medium px-0.5">
            {language === 'lo' ? 'ເລືອກຫົວຂໍ້ການຕັ້ງຄ່າຢູ່ດ້ານຊ້າຍ:' : 'Select category on the left:'}
          </p>

          <div className="space-y-2">
            {/* 1. Home Settings */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setAdminMainTab('home');
                  setOpenMenuGroup((prev) => (prev === 'home' ? null : 'home'));
                  if (adminSubTab !== 'poster' && adminSubTab !== 'upcoming' && adminSubTab !== 'events' && adminSubTab !== 'communities' && adminSubTab !== 'prayer') {
                    setAdminSubTab('poster');
                  }
                }}
                className={`w-full p-2.5 rounded-xl text-left font-extrabold text-xs flex items-center justify-between transition cursor-pointer ${
                  adminMainTab === 'home'
                    ? 'bg-[#cc0000] text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate font-extrabold">{language === 'lo' ? '1. ໜ້າຫຼັກ' : '1. Home Tab'}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${openMenuGroup === 'home' ? 'rotate-90' : ''}`} />
              </button>

              {openMenuGroup === 'home' && (
                <div className="pl-2 space-y-1 pt-1 border-l-2 border-red-200 dark:border-red-900/60 ml-2.5">
                  <button
                    type="button"
                    onClick={() => setAdminSubTab('poster')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'poster'
                        ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    <span className="truncate font-bold">{language === 'lo' ? '🖼️ ການຕັ້ງຄ່າໂປສເຕີ' : 'Poster Settings'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('upcoming')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'upcoming'
                        ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate font-bold">{language === 'lo' ? '📢 ງານທີ່ຈະມາເຖິງ & ແຈ້ງການ' : 'Upcoming Event & Announcement'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('events')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'events'
                        ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="truncate font-bold">{language === 'lo' ? '🎉 ຈັດການກິດຈະກຳ' : 'Events & News'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('communities')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'communities'
                        ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate font-bold">{language === 'lo' ? '📍 ຂໍ້ຄວາມ Communities & ເລື່ອງລາວ' : 'Communities & Stories'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('prayer')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'prayer'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="truncate font-bold">{language === 'lo' ? '🙏 ຈັດການໜ້າອະທິຖານ' : 'Prayer Settings'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Dashboard / Insights Settings */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setAdminMainTab('dashboard');
                  setOpenMenuGroup((prev) => (prev === 'dashboard' ? null : 'dashboard'));
                  if (adminSubTab !== 'insights_poster' && adminSubTab !== 'pins') {
                    setAdminSubTab('insights_poster');
                  }
                }}
                className={`w-full p-2.5 rounded-xl text-left font-extrabold text-xs flex items-center justify-between transition cursor-pointer ${
                  adminMainTab === 'dashboard'
                    ? 'bg-[#cc0000] text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  <span className="truncate font-extrabold">{language === 'lo' ? '2. ການຕັ້ງຄ່າຫ້ອງຂໍ້ມູນ' : '2. Insights / Dashboard Tab'}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${openMenuGroup === 'dashboard' ? 'rotate-90' : ''}`} />
              </button>

              {openMenuGroup === 'dashboard' && (
                <div className="pl-2 space-y-1 pt-1 border-l-2 border-red-200 dark:border-red-900/60 ml-2.5">
                  <button
                    type="button"
                    onClick={() => setAdminSubTab('insights_poster')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'insights_poster'
                        ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    <span className="truncate font-bold">{language === 'lo' ? '🖼️ ການຕັ້ງຄ່າໂພສເຕີຫ້ອງຂໍ້ມູນ' : 'Insights Poster Settings'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('pins')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'pins'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="truncate font-bold">{language === 'lo' ? '🔑 ລະຫັດ PIN ຄຣິດສະຕະຈັກ' : 'Church PIN Codes'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Church & Map Settings */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setAdminMainTab('churches');
                  setOpenMenuGroup((prev) => (prev === 'churches' ? null : 'churches'));
                  if (adminSubTab !== 'villages' && adminSubTab !== 'maps') {
                    setAdminSubTab('villages');
                  }
                }}
                className={`w-full p-2.5 rounded-xl text-left font-extrabold text-xs flex items-center justify-between transition cursor-pointer ${
                  adminMainTab === 'churches'
                    ? 'bg-[#cc0000] text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Building className="w-4 h-4 shrink-0" />
                  <span className="truncate font-extrabold">{language === 'lo' ? '3. ອັບເດດຂໍ້ມູນຄຣິດຕະຈັກ' : '3. Church & Map'}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${openMenuGroup === 'churches' ? 'rotate-90' : ''}`} />
              </button>

              {openMenuGroup === 'churches' && (
                <div className="pl-2 space-y-1 pt-1 border-l-2 border-red-200 dark:border-red-900/60 ml-2.5">
                  <button
                    type="button"
                    onClick={() => setAdminSubTab('villages')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'villages'
                        ? 'bg-red-100 text-red-900 dark:bg-red-950/80 dark:text-red-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#cc0000] shrink-0" />
                    <span className="truncate font-bold">{language === 'lo' ? '⛪ ຂໍ້ມູນບ້ານ/ຄຣິດສະຕະຈັກ' : 'Village Directory'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('maps')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'maps'
                        ? 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                    <span className="truncate font-bold">{language === 'lo' ? '🗺️ Google Maps & ຮູບພາບ' : 'Google Maps & Photos'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. About Us Settings */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setAdminMainTab('about');
                  setOpenMenuGroup((prev) => (prev === 'about' ? null : 'about'));
                  if (adminSubTab !== 'about_poster' && adminSubTab !== 'teams' && adminSubTab !== 'donation') {
                    setAdminSubTab('about_poster');
                  }
                }}
                className={`w-full p-2.5 rounded-xl text-left font-extrabold text-xs flex items-center justify-between transition cursor-pointer ${
                  adminMainTab === 'about'
                    ? 'bg-[#cc0000] text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate font-extrabold">{language === 'lo' ? '4. ກ່ຽວກັບພວກເຮົາ' : '4. About Us'}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${openMenuGroup === 'about' ? 'rotate-90' : ''}`} />
              </button>

              {openMenuGroup === 'about' && (
                <div className="pl-2 space-y-1 pt-1 border-l-2 border-red-200 dark:border-red-900/60 ml-2.5">
                  <button
                    type="button"
                    onClick={() => setAdminSubTab('about_poster')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'about_poster'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate font-bold">{language === 'lo' ? '🖼️ ໂພສເຕີ & ຂໍ້ມູນ HOPE BOKEO' : '🖼️ About Poster & Story'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('teams')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'teams'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate font-bold">{language === 'lo' ? '👥 ທີມງານ & ບຸກຄະລາກອນ' : 'Ministry Staff & Team'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('donation')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'donation'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate font-bold">{language === 'lo' ? '💳 ບໍລິຈາກ & ຊ່ອງທາງອະທິຖານ' : 'Donation & Prayer'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 5. Finance & Support Distributions */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setAdminMainTab('finance' as any);
                  setOpenMenuGroup((prev) => (prev === 'finance' ? null : 'finance'));
                  setAdminSubTab('finance' as any);
                }}
                className={`w-full p-2.5 rounded-xl text-left font-extrabold text-xs flex items-center justify-between transition cursor-pointer ${
                  adminMainTab === ('finance' as any)
                    ? 'bg-[#cc0000] text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Wallet className="w-4 h-4 shrink-0" />
                  <span className="truncate font-extrabold">{language === 'lo' ? '5. ລະບົບການເງິນ & ທີມງານ' : '5. Finance & Support'}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${openMenuGroup === 'finance' ? 'rotate-90' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Content Panel Area */}
        <div className="flex-1 w-full min-w-0 space-y-6">

      {pinSavedToast && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-bold text-xs flex items-center gap-2 shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{pinSavedToast}</span>
        </div>
      )}

      {/* Admin Sub-Tab: Insights Poster Management */}
      {adminSubTab === 'insights_poster' && (
        <InsightsPosterSettingsSection
          language={language}
          homePoster={homePoster}
          onSavePoster={async (updated) => {
            if (onSaveHomePoster) {
              await onSaveHomePoster(updated);
            }
          }}
        />
      )}

      {/* Admin Sub-Tab 1: Church PIN Management */}
      {adminSubTab === 'pins' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>
                  {language === 'lo'
                    ? 'ຈັດການລະຫັດ PIN ສຳລັບແຕ່ລະຄິດສະຈັກ (ສຳລັບເຂົ້າຫ້ອງທີ່ 1)'
                    : 'Church Access PIN Generator & Manager'}
                </span>
              </h3>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>{villages.length} {language === 'lo' ? 'ຄິດສະຈັກ' : 'Churches'}</span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    {language === 'lo' ? 'ຊື່ຄິດສະຈັກ / ບ້ານ' : 'Church / Village'}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {language === 'lo' ? 'ເມືອງ / ແຂວງ' : 'Location'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ລະຫັດ PIN ປັດຈຸບັນ' : 'Current PIN'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ຈັດການລະຫັດ PIN' : 'Manage PIN'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                {villages.map((v) => {
                  const currentPin = v.pinCode || '1001';
                  const isEditingThis = editingPinRowId === v.rowId;

                  return (
                    <tr
                      key={v.rowId || v.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                    >
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">
                        ⛪ {v.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {v.district}, {v.province}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs border border-amber-200 dark:border-amber-800">
                          🔑 {currentPin}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditingThis ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="text"
                              value={tempPin}
                              onChange={(e) => setTempPin(e.target.value)}
                              placeholder="1001"
                              maxLength={8}
                              className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-amber-400 rounded-lg text-xs font-mono font-bold outline-none"
                            />
                            <button
                              onClick={() => handleSavePin(v)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                            >
                              {language === 'lo' ? 'ບັນທຶກ' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingPinRowId(null)}
                              className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
                            >
                              {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingPinRowId(v.rowId);
                              setTempPin(v.pinCode || '1001');
                            }}
                            className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 font-bold text-xs flex items-center gap-1 mx-auto transition"
                          >
                            <Edit2 className="w-3 h-3 text-amber-500" />
                            <span>{language === 'lo' ? 'ປ່ຽນ PIN' : 'Edit PIN'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Sub-Tab 2: Master Villages Table */}
      {adminSubTab === 'villages' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
              {language === 'lo'
                ? 'ລາຍຊື່ບ້ານ/ຄິດສະຈັກທັງໝົດ'
                : 'Registered Villages & Churches'}
            </h3>
            <button
              onClick={onOpenAddVillage}
              className="px-3.5 py-1.5 bg-[#cc0000] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 hover:bg-red-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'lo' ? 'ເພີ່ມຂໍ້ມູນ' : 'Add Village'}</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    {language === 'lo' ? 'ID / ຊື່ບ້ານ' : 'ID & Name'}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {language === 'lo' ? 'ເມືອງ / ແຂວງ' : 'Location'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ຜູ້ໄດ້ຍິນ' : 'Heard'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ຜູ້ເຊື່ອ' : 'Believers'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ບັບຕິສະມາ' : 'Baptized'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ຜູ້ນະມັດສະການ' : 'Worshipers'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ຜູ້ນຳ' : 'Leaders'}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {language === 'lo' ? 'ສະຖານະ' : 'Status'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ສະແດງຜົນເທິງເວັບ' : 'Visibility'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ຈັດການ' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                {villages.map((v) => {
                  const badgeColor =
                    v.persecution === 'ວິກິດ'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                      : v.persecution === 'ປານກາງ'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';

                  return (
                    <tr
                      key={v.rowId || v.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                    >
                      <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                        <div className="font-bold text-slate-800 dark:text-white">
                          {v.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{v.id}</div>
                      </td>
                      <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                        {v.district}, {v.province}
                      </td>
                      <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center font-bold text-blue-600">
                        {v.heard || 0}
                      </td>
                      <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center font-bold text-slate-800 dark:text-white">
                        {v.believers}
                      </td>
                      <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center font-bold text-emerald-600">
                        {v.baptized}
                      </td>
                      <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center font-bold text-cyan-600">
                        {Number(v.attending) || 0}
                      </td>
                      <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center font-bold text-purple-600">
                        {Number(v.leaders) || 0}
                      </td>
                      <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                          {v.persecution}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center">
                        <button
                          type="button"
                          onClick={() => onSaveVillage && onSaveVillage({ ...v, hidden: !v.hidden })}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition shadow-xs ${
                            v.hidden
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                          }`}
                          title={v.hidden ? 'ກົດເພື່ອສະແດ່ງຂໍ້ມູນ' : 'ກົດເພື່ອເຊື່ອງຂໍ້ມູນ'}
                        >
                          {v.hidden ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{v.hidden ? (language === 'lo' ? '🙈 ເຊື່ອງ' : 'Hidden') : (language === 'lo' ? '👁️ ສະແດ່ງ' : 'Visible')}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onEditVillage(v)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(language === 'lo' ? 'ແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຂໍ້ມູນນີ້?' : 'Delete this village row?')) {
                                onDeleteVillage(v.rowId);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Sub-Tab 3: Events Table */}
      {adminSubTab === 'events' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
              {language === 'lo' ? 'ລາຍການກິດຈະກຳ/ອີເວັນ' : 'All Events & Activities'}
            </h3>
            <button
              onClick={onOpenAddEvent}
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'lo' ? 'ເພີ່ມອີເວັນ' : 'Add Event'}</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold w-16">
                    {language === 'lo' ? 'ຮູບ' : 'Image'}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {language === 'lo' ? 'ຫົວຂໍ້' : 'Title'}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {language === 'lo' ? 'ວັນທີ' : 'Date'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ລາຍງານຍອຍປະຈຳເດືອນ' : 'Monthly Reports'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ສະແດງຜົນເທິງເວັບ' : 'Visibility'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ຈັດການ' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                {events.map((e) => (
                  <tr
                    key={e.rowId || e.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                  >
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                      <img
                        src={
                          e.imageUrl ||
                          'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=200'
                        }
                        alt={e.title}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    </td>
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="font-bold text-slate-800 dark:text-white truncate max-w-xs">
                        {e.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">
                        {e.description}
                      </div>
                      {(e.docUrl || (Array.isArray(e.docUrls) && e.docUrls.length > 0)) && (
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                          <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>
                            {language === 'lo'
                              ? `ແນບເອກະສານ (${e.docUrls?.length || 1} ຟາຍ)`
                              : `Attached (${e.docUrls?.length || 1} files)`}
                          </span>
                          <a
                            href={e.docUrl || (e.docUrls && e.docUrls[0])}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-0.5 hover:text-blue-800"
                            title="Preview File"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 whitespace-nowrap text-xs">
                      {formatDateRange(e.date, e.endDate, language)}
                    </td>
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedAdminReportEvent(e)}
                        className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 text-[11px] font-black inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer hover:scale-102 active:scale-95"
                        title={language === 'lo' ? 'ກົດເພື່ອເພີ່ມ/ແກ້ໄຂຫົວຂໍ້ຍອຍ ແລະ ລາຍງານປະຈຳເດືອນ' : 'Manage monthly sub-reports'}
                      >
                        <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>
                          {e.monthlyReports && e.monthlyReports.length > 0
                            ? language === 'lo'
                              ? `${e.monthlyReports.length} ຫົວຂໍ້ຍອຍ`
                              : `${e.monthlyReports.length} Sub-reports`
                            : language === 'lo'
                            ? '+ ເພີ່ມລາຍງານ'
                            : '+ Add Reports'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center">
                      <button
                        type="button"
                        onClick={() => onSaveEvent && onSaveEvent({ ...e, hidden: !e.hidden })}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition shadow-xs ${
                          e.hidden
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                        }`}
                        title={e.hidden ? 'ກົດເພື່ອສະແດ່ງ' : 'ກົດເພື່ອເຊື່ອງ'}
                      >
                        {e.hidden ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                        <span>{e.hidden ? (language === 'lo' ? '🙈 ເຊື່ອງ' : 'Hidden') : (language === 'lo' ? '👁️ ສະແດ່ງ' : 'Visible')}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEditEvent(e)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(language === 'lo' ? 'ແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຂໍ້ມູນນີ້?' : 'Delete this event row?')) {
                              onDeleteEvent(e.rowId);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Sub-Tab 4: Teams Table */}
      {adminSubTab === 'teams' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
              {language === 'lo' ? 'ລາຍຊື່ທີມງານ' : 'Ministry Staff & Team'}
            </h3>
            <button
              onClick={onOpenAddTeam}
              className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'lo' ? 'ເພີ່ມທີມງານ' : 'Add Staff'}</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold w-16 text-center">
                    {language === 'lo' ? 'ຮູບ' : 'Photo'}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {language === 'lo' ? 'ຊື່ທີມງານ' : 'Name'}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {language === 'lo' ? 'ຕຳແໜ່ງ' : 'Role'}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {language === 'lo' ? 'ເບີໂທ' : 'Phone'}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {language === 'lo' ? 'ຄິວອາ & ບັນຊີຮັບເງິນ' : 'QR & Bank Account'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ສະແດງຜົນເທິງເວັບ' : 'Visibility'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">
                    {language === 'lo' ? 'ຈັດການ' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                {teams.map((t) => (
                  <tr
                    key={t.id || `team_${t.rowId}_${t.name}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                  >
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 w-16">
                      <div className="w-10 h-10 min-w-[40px] max-w-[40px] aspect-square rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs flex items-center justify-center mx-auto">
                        <img
                          src={
                            t.imageUrl ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200'
                          }
                          alt={t.name}
                          className="w-full h-full object-cover rounded-full shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 font-bold text-slate-800 dark:text-white">
                      {t.name}
                    </td>
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md text-[10px] font-bold inline-block">
                        {getLocalizedRole(t, language)}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                      {t.phone || '-'}
                    </td>
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                      {t.financeQrUrl ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={t.financeQrUrl}
                            alt="QR"
                            className="w-7 h-7 object-contain rounded bg-white border border-purple-300 p-0.5 shadow-2xs cursor-pointer hover:scale-125 transition"
                            onClick={() => onEditTeam(t)}
                            title={language === 'lo' ? 'ກົດເພື່ອເບິ່ງ / ແກ້ໄຂ' : 'Click to view / edit'}
                          />
                          <div className="text-[10px]">
                            <div className="font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{t.bankName || 'BCEL One'}</span>
                            </div>
                            <span className="text-slate-400 font-mono text-[9px] block">
                              {t.bankAccountNumber || (language === 'lo' ? 'ມີ QR ແລ້ວ' : 'QR ready')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEditTeam(t)}
                          className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <QrCode className="w-3 h-3 text-amber-600" />
                          <span>{language === 'lo' ? '+ ເພີ່ມຄິວອາ' : '+ Add QR'}</span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center">
                      <button
                        type="button"
                        onClick={() => onSaveTeam && onSaveTeam({ ...t, hidden: !t.hidden })}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition shadow-xs ${
                          t.hidden
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}
                        title={t.hidden ? (language === 'lo' ? 'ກົດເພື່ອເປີດການສະແດງຜົນ' : 'Click to show') : (language === 'lo' ? 'ກົດເພື່ອປິດການສະແດງຜົນ' : 'Click to hide')}
                      >
                        {t.hidden ? (
                          <EyeOff className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span>{t.hidden ? (language === 'lo' ? '🙈 ເຊື່ອງ' : 'Hidden') : (language === 'lo' ? '👁️ ສະແດງ' : 'Visible')}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEditTeam(t)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(language === 'lo' ? 'ແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຂໍ້ມູນນີ້?' : 'Delete team member?')) {
                              onDeleteTeam(t.rowId, t.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Home Poster Management View */}
      {adminSubTab === 'poster' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-600" />
                <span>{language === 'lo' ? 'ການຕັ້ງຄ່າໂປສເຕີ' : 'Poster Settings'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'lo' ? 'ແກ້ໄຂຮູບໂປສເຕີ, ຮູບສະໄລ້, ຫົວຂໍ້ໃຫຍ່ ແລະ ຂໍ້ຄວາມທີ່ຈະປະກົດຢູ່ໜ້າຫຼັກຂອງເວັບໄຊ' : 'Manage hero poster images, slider, titles, and text on the Home tab.'}
              </p>
            </div>
            {/* Eye toggle button at right of header */}
            <button
              type="button"
              onClick={() => setHidePosterSection(!hidePosterSection)}
              className={`p-2 transition rounded-xl flex items-center justify-center border shadow-xs ${
                hidePosterSection
                  ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
              title={
                hidePosterSection
                  ? (language === 'lo' ? 'ປັດຈຸບັນຖືກເຊື່ອງໄວ້ (ກົດເພື່ອສະແດງ)' : 'Currently hidden (Click to show)')
                  : (language === 'lo' ? 'ປັດຈຸບັນສະແດງຢູ່ (ກົດເພື່ອເຊື່ອງ)' : 'Currently visible (Click to hide)')
              }
            >
              {hidePosterSection ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          <PosterSettingsSection
            mode="poster"
            onNavigateToUpcoming={() => setAdminSubTab('upcoming')}
            language={language}
            isEditingPoster={isEditingPoster}
            isSavingPoster={isSavingPoster}
            onSave={handleSaveHomePosterForm}
            hidePosterSection={hidePosterSection}
            setHidePosterSection={setHidePosterSection}
            showTextOverlay={showTextOverlay}
            setShowTextOverlay={setShowTextOverlay}
            orgLogoUrl={orgLogoUrl}
            setOrgLogoUrl={setOrgLogoUrl}
            posterTitle={posterTitle}
            setPosterTitle={setPosterTitle}
            posterTitleEn={posterTitleEn}
            setPosterTitleEn={setPosterTitleEn}
            posterTitleTh={posterTitleTh}
            setPosterTitleTh={setPosterTitleTh}
            posterSubtitle={posterSubtitle}
            setPosterSubtitle={setPosterSubtitle}
            posterSubtitleEn={posterSubtitleEn}
            setPosterSubtitleEn={setPosterSubtitleEn}
            posterSubtitleTh={posterSubtitleTh}
            setPosterSubtitleTh={setPosterSubtitleTh}
            posterDesc={posterDesc}
            setPosterDesc={setPosterDesc}
            posterDescEn={posterDescEn}
            setPosterDescEn={setPosterDescEn}
            posterDescTh={posterDescTh}
            setPosterDescTh={setPosterDescTh}
            posterBokeoTitle={posterBokeoTitle}
            setPosterBokeoTitle={setPosterBokeoTitle}
            posterBokeoTitleEn={posterBokeoTitleEn}
            setPosterBokeoTitleEn={setPosterBokeoTitleEn}
            posterBokeoTitleTh={posterBokeoTitleTh}
            setPosterBokeoTitleTh={setPosterBokeoTitleTh}
            posterBokeoDesc={posterBokeoDesc}
            setPosterBokeoDesc={setPosterBokeoDesc}
            posterBokeoDescEn={posterBokeoDescEn}
            setPosterBokeoDescEn={setPosterBokeoDescEn}
            posterBokeoDescTh={posterBokeoDescTh}
            setPosterBokeoDescTh={setPosterBokeoDescTh}
            posterBokeoImageUrl={posterBokeoImageUrl}
            setPosterBokeoImageUrl={setPosterBokeoImageUrl}
            posterImgUrl={posterImgUrl}
            setPosterImgUrl={setPosterImgUrl}
            posterImageUrls={posterImageUrls}
            setPosterImageUrls={setPosterImageUrls}
            posterVideoUrl={posterVideoUrl}
            setPosterVideoUrl={setPosterVideoUrl}
            posterBtnText={posterBtnText}
            setPosterBtnText={setPosterBtnText}
            posterBtnTextEn={posterBtnTextEn}
            setPosterBtnTextEn={setPosterBtnTextEn}
            posterBtnTextTh={posterBtnTextTh}
            setPosterBtnTextTh={setPosterBtnTextTh}
            posterLocationTag={posterLocationTag}
            setPosterLocationTag={setPosterLocationTag}
            posterLocationTagEn={posterLocationTagEn}
            setPosterLocationTagEn={setPosterLocationTagEn}
            posterLocationTagTh={posterLocationTagTh}
            setPosterLocationTagTh={setPosterLocationTagTh}
            posterVideoBtnText={posterVideoBtnText}
            setPosterVideoBtnText={setPosterVideoBtnText}
            posterVideoBtnTextEn={posterVideoBtnTextEn}
            setPosterVideoBtnTextEn={setPosterVideoBtnTextEn}
            posterVideoBtnTextTh={posterVideoBtnTextTh}
            setPosterVideoBtnTextTh={setPosterVideoBtnTextTh}
            posterBadgeTopText={posterBadgeTopText}
            setPosterBadgeTopText={setPosterBadgeTopText}
            posterBadgeTopTextEn={posterBadgeTopTextEn}
            setPosterBadgeTopTextEn={setPosterBadgeTopTextEn}
            posterBadgeTopTextTh={posterBadgeTopTextTh}
            setPosterBadgeTopTextTh={setPosterBadgeTopTextTh}
            posterBadgeBottomText={posterBadgeBottomText}
            setPosterBadgeBottomText={setPosterBadgeBottomText}
            posterBadgeBottomTextEn={posterBadgeBottomTextEn}
            setPosterBadgeBottomTextEn={setPosterBadgeBottomTextEn}
            posterBadgeBottomTextTh={posterBadgeBottomTextTh}
            setPosterBadgeBottomTextTh={setPosterBadgeBottomTextTh}
            hideRightBadge={hideRightBadge}
            setHideRightBadge={setHideRightBadge}
            appBgColor={appBgColor}
            setAppBgColor={setAppBgColor}
            appBgImageUrl={appBgImageUrl}
            setAppBgImageUrl={setAppBgImageUrl}
            appBgBrightness={appBgBrightness}
            setAppBgBrightness={setAppBgBrightness}
            appBgBlur={appBgBlur}
            setAppBgBlur={setAppBgBlur}
            appBgWhiteOverlayOpacity={appBgWhiteOverlayOpacity}
            setAppBgWhiteOverlayOpacity={setAppBgWhiteOverlayOpacity}
            posterHeight={posterHeight}
            setPosterHeight={setPosterHeight}
            posterAspectRatio={posterAspectRatio}
            setPosterAspectRatio={setPosterAspectRatio}
            posterOverlayOpacity={posterOverlayOpacity}
            setPosterOverlayOpacity={setPosterOverlayOpacity}
            posterEdgeFade={posterEdgeFade}
            setPosterEdgeFade={setPosterEdgeFade}
            posterFit={posterFit}
            setPosterFit={setPosterFit}
            posterScale={posterScale}
            setPosterScale={setPosterScale}
            posterBgPosition={posterBgPosition}
            setPosterBgPosition={setPosterBgPosition}
            posterBrightness={posterBrightness}
            setPosterBrightness={setPosterBrightness}
            posterContrast={posterContrast}
            setPosterContrast={setPosterContrast}
            posterSaturation={posterSaturation}
            setPosterSaturation={setPosterSaturation}
            posterBlur={posterBlur}
            setPosterBlur={setPosterBlur}
            posterBgPositions={posterBgPositions}
            setPosterBgPositions={setPosterBgPositions}
            imageCustomSettings={imageCustomSettings}
            setImageCustomSettings={setImageCustomSettings}
            upcomingEventTitle={upcomingEventTitle}
            setUpcomingEventTitle={setUpcomingEventTitle}
            upcomingEventTitleEn={upcomingEventTitleEn}
            setUpcomingEventTitleEn={setUpcomingEventTitleEn}
            upcomingEventTitleTh={upcomingEventTitleTh}
            setUpcomingEventTitleTh={setUpcomingEventTitleTh}
            upcomingEventDate={upcomingEventDate}
            setUpcomingEventDate={setUpcomingEventDate}
            upcomingEventLocation={upcomingEventLocation}
            setUpcomingEventLocation={setUpcomingEventLocation}
            upcomingEventLocationEn={upcomingEventLocationEn}
            setUpcomingEventLocationEn={setUpcomingEventLocationEn}
            upcomingEventLocationTh={upcomingEventLocationTh}
            setUpcomingEventLocationTh={setUpcomingEventLocationTh}
            upcomingEventDesc={upcomingEventDesc}
            setUpcomingEventDesc={setUpcomingEventDesc}
            upcomingEventDescEn={upcomingEventDescEn}
            setUpcomingEventDescEn={setUpcomingEventDescEn}
            upcomingEventDescTh={upcomingEventDescTh}
            setUpcomingEventDescTh={setUpcomingEventDescTh}
            upcomingEventImageUrl={upcomingEventImageUrl}
            setUpcomingEventImageUrl={setUpcomingEventImageUrl}
            upcomingEventBadge={upcomingEventBadge}
            setUpcomingEventBadge={setUpcomingEventBadge}
            hideUpcomingEvent={hideUpcomingEvent}
            setHideUpcomingEvent={setHideUpcomingEvent}
            upcomingSchedule={upcomingSchedule}
            setUpcomingSchedule={setUpcomingSchedule}
            upcomingScheduleHtml={upcomingScheduleHtml}
            setUpcomingScheduleHtml={setUpcomingScheduleHtml}
            upcomingPdfUrl={upcomingPdfUrl}
            setUpcomingPdfUrl={setUpcomingPdfUrl}
            upcomingPdfName={upcomingPdfName}
            setUpcomingPdfName={setUpcomingPdfName}
            upcomingDocxUrl={upcomingDocxUrl}
            setUpcomingDocxUrl={setUpcomingDocxUrl}
            upcomingDocxName={upcomingDocxName}
            setUpcomingDocxName={setUpcomingDocxName}
            upcomingBgDim={upcomingBgDim}
            setUpcomingBgDim={setUpcomingBgDim}
            upcomingTableBg={upcomingTableBg}
            setUpcomingTableBg={setUpcomingTableBg}
            upcomingTableCustomBg={upcomingTableCustomBg}
            setUpcomingTableCustomBg={setUpcomingTableCustomBg}
            upcomingTableBorderWidth={upcomingTableBorderWidth}
            setUpcomingTableBorderWidth={setUpcomingTableBorderWidth}
            upcomingTableBorderColor={upcomingTableBorderColor}
            setUpcomingTableBorderColor={setUpcomingTableBorderColor}
            upcomingEdgeFade={upcomingEdgeFade}
            setUpcomingEdgeFade={setUpcomingEdgeFade}
            upcomingHeight={upcomingHeight}
            setUpcomingHeight={setUpcomingHeight}
            upcomingContentBgOpacity={upcomingContentBgOpacity}
            setUpcomingContentBgOpacity={setUpcomingContentBgOpacity}
            upcomingTitleSize={upcomingTitleSize}
            setUpcomingTitleSize={setUpcomingTitleSize}
            upcomingBgVisibility={upcomingBgVisibility}
            setUpcomingBgVisibility={setUpcomingBgVisibility}
            upcomingTableWidth={upcomingTableWidth}
            setUpcomingTableWidth={setUpcomingTableWidth}
            upcomingTableAlign={upcomingTableAlign}
            setUpcomingTableAlign={setUpcomingTableAlign}
            events={events}
            onSaveEvent={onSaveEvent}
            onNavigateToEvents={() => setAdminSubTab('events')}
          />
        </div>
      )}

      {/* 5.1. Upcoming Events & Announcements Management View */}
      {adminSubTab === 'upcoming' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#cc0000]" />
                <span>
                  {language === 'lo'
                    ? 'ຕັ້ງຄ່າງານທີ່ຈະມາເຖິງ & ແຈ້ງການ'
                    : 'Upcoming Event & Announcement Settings'}
                </span>
              </h3>
            </div>
          </div>

          <PosterSettingsSection
            mode="upcoming"
            language={language}
            isEditingPoster={isEditingPoster}
            isSavingPoster={isSavingPoster}
            onSave={handleSaveHomePosterForm}
            hidePosterSection={hidePosterSection}
            setHidePosterSection={setHidePosterSection}
            showTextOverlay={showTextOverlay}
            setShowTextOverlay={setShowTextOverlay}
            orgLogoUrl={orgLogoUrl}
            setOrgLogoUrl={setOrgLogoUrl}
            posterTitle={posterTitle}
            setPosterTitle={setPosterTitle}
            posterTitleEn={posterTitleEn}
            setPosterTitleEn={setPosterTitleEn}
            posterTitleTh={posterTitleTh}
            setPosterTitleTh={setPosterTitleTh}
            posterSubtitle={posterSubtitle}
            setPosterSubtitle={setPosterSubtitle}
            posterSubtitleEn={posterSubtitleEn}
            setPosterSubtitleEn={setPosterSubtitleEn}
            posterSubtitleTh={posterSubtitleTh}
            setPosterSubtitleTh={setPosterSubtitleTh}
            posterDesc={posterDesc}
            setPosterDesc={setPosterDesc}
            posterDescEn={posterDescEn}
            setPosterDescEn={setPosterDescEn}
            posterDescTh={posterDescTh}
            setPosterDescTh={setPosterDescTh}
            posterBokeoTitle={posterBokeoTitle}
            setPosterBokeoTitle={setPosterBokeoTitle}
            posterBokeoTitleEn={posterBokeoTitleEn}
            setPosterBokeoTitleEn={setPosterBokeoTitleEn}
            posterBokeoTitleTh={posterBokeoTitleTh}
            setPosterBokeoTitleTh={setPosterBokeoTitleTh}
            posterBokeoDesc={posterBokeoDesc}
            setPosterBokeoDesc={setPosterBokeoDesc}
            posterBokeoDescEn={posterBokeoDescEn}
            setPosterBokeoDescEn={setPosterBokeoDescEn}
            posterBokeoDescTh={posterBokeoDescTh}
            setPosterBokeoDescTh={setPosterBokeoDescTh}
            posterBokeoImageUrl={posterBokeoImageUrl}
            setPosterBokeoImageUrl={setPosterBokeoImageUrl}
            posterImgUrl={posterImgUrl}
            setPosterImgUrl={setPosterImgUrl}
            posterImageUrls={posterImageUrls}
            setPosterImageUrls={setPosterImageUrls}
            posterVideoUrl={posterVideoUrl}
            setPosterVideoUrl={setPosterVideoUrl}
            posterBtnText={posterBtnText}
            setPosterBtnText={setPosterBtnText}
            posterBtnTextEn={posterBtnTextEn}
            setPosterBtnTextEn={setPosterBtnTextEn}
            posterBtnTextTh={posterBtnTextTh}
            setPosterBtnTextTh={setPosterBtnTextTh}
            posterLocationTag={posterLocationTag}
            setPosterLocationTag={setPosterLocationTag}
            posterLocationTagEn={posterLocationTagEn}
            setPosterLocationTagEn={setPosterLocationTagEn}
            posterLocationTagTh={posterLocationTagTh}
            setPosterLocationTagTh={setPosterLocationTagTh}
            posterVideoBtnText={posterVideoBtnText}
            setPosterVideoBtnText={setPosterVideoBtnText}
            posterVideoBtnTextEn={posterVideoBtnTextEn}
            setPosterVideoBtnTextEn={setPosterVideoBtnTextEn}
            posterVideoBtnTextTh={posterVideoBtnTextTh}
            setPosterVideoBtnTextTh={setPosterVideoBtnTextTh}
            posterBadgeTopText={posterBadgeTopText}
            setPosterBadgeTopText={setPosterBadgeTopText}
            posterBadgeTopTextEn={posterBadgeTopTextEn}
            setPosterBadgeTopTextEn={setPosterBadgeTopTextEn}
            posterBadgeTopTextTh={posterBadgeTopTextTh}
            setPosterBadgeTopTextTh={setPosterBadgeTopTextTh}
            posterBadgeBottomText={posterBadgeBottomText}
            setPosterBadgeBottomText={setPosterBadgeBottomText}
            posterBadgeBottomTextEn={posterBadgeBottomTextEn}
            setPosterBadgeBottomTextEn={setPosterBadgeBottomTextEn}
            posterBadgeBottomTextTh={posterBadgeBottomTextTh}
            setPosterBadgeBottomTextTh={setPosterBadgeBottomTextTh}
            hideRightBadge={hideRightBadge}
            setHideRightBadge={setHideRightBadge}
            appBgColor={appBgColor}
            setAppBgColor={setAppBgColor}
            appBgImageUrl={appBgImageUrl}
            setAppBgImageUrl={setAppBgImageUrl}
            appBgBrightness={appBgBrightness}
            setAppBgBrightness={setAppBgBrightness}
            appBgBlur={appBgBlur}
            setAppBgBlur={setAppBgBlur}
            appBgWhiteOverlayOpacity={appBgWhiteOverlayOpacity}
            setAppBgWhiteOverlayOpacity={setAppBgWhiteOverlayOpacity}
            posterHeight={posterHeight}
            setPosterHeight={setPosterHeight}
            posterAspectRatio={posterAspectRatio}
            setPosterAspectRatio={setPosterAspectRatio}
            posterOverlayOpacity={posterOverlayOpacity}
            setPosterOverlayOpacity={setPosterOverlayOpacity}
            posterEdgeFade={posterEdgeFade}
            setPosterEdgeFade={setPosterEdgeFade}
            posterFit={posterFit}
            setPosterFit={setPosterFit}
            posterScale={posterScale}
            setPosterScale={setPosterScale}
            posterBgPosition={posterBgPosition}
            setPosterBgPosition={setPosterBgPosition}
            posterBrightness={posterBrightness}
            setPosterBrightness={setPosterBrightness}
            posterContrast={posterContrast}
            setPosterContrast={setPosterContrast}
            posterSaturation={posterSaturation}
            setPosterSaturation={setPosterSaturation}
            posterBlur={posterBlur}
            setPosterBlur={setPosterBlur}
            imageCustomSettings={imageCustomSettings}
            setImageCustomSettings={setImageCustomSettings}
            posterBgPositions={posterBgPositions}
            setPosterBgPositions={setPosterBgPositions}
            upcomingEventTitle={upcomingEventTitle}
            setUpcomingEventTitle={setUpcomingEventTitle}
            upcomingEventTitleEn={upcomingEventTitleEn}
            setUpcomingEventTitleEn={setUpcomingEventTitleEn}
            upcomingEventTitleTh={upcomingEventTitleTh}
            setUpcomingEventTitleTh={setUpcomingEventTitleTh}
            upcomingEventDate={upcomingEventDate}
            setUpcomingEventDate={setUpcomingEventDate}
            upcomingEventLocation={upcomingEventLocation}
            setUpcomingEventLocation={setUpcomingEventLocation}
            upcomingEventLocationEn={upcomingEventLocationEn}
            setUpcomingEventLocationEn={setUpcomingEventLocationEn}
            upcomingEventLocationTh={upcomingEventLocationTh}
            setUpcomingEventLocationTh={setUpcomingEventLocationTh}
            upcomingEventDesc={upcomingEventDesc}
            setUpcomingEventDesc={setUpcomingEventDesc}
            upcomingEventDescEn={upcomingEventDescEn}
            setUpcomingEventDescEn={setUpcomingEventDescEn}
            upcomingEventDescTh={upcomingEventDescTh}
            setUpcomingEventDescTh={setUpcomingEventDescTh}
            upcomingEventImageUrl={upcomingEventImageUrl}
            setUpcomingEventImageUrl={setUpcomingEventImageUrl}
            upcomingEventBadge={upcomingEventBadge}
            setUpcomingEventBadge={setUpcomingEventBadge}
            hideUpcomingEvent={hideUpcomingEvent}
            setHideUpcomingEvent={setHideUpcomingEvent}
            upcomingSchedule={upcomingSchedule}
            setUpcomingSchedule={setUpcomingSchedule}
            upcomingScheduleHtml={upcomingScheduleHtml}
            setUpcomingScheduleHtml={setUpcomingScheduleHtml}
            upcomingPdfUrl={upcomingPdfUrl}
            setUpcomingPdfUrl={setUpcomingPdfUrl}
            upcomingPdfName={upcomingPdfName}
            setUpcomingPdfName={setUpcomingPdfName}
            upcomingDocxUrl={upcomingDocxUrl}
            setUpcomingDocxUrl={setUpcomingDocxUrl}
            upcomingDocxName={upcomingDocxName}
            setUpcomingDocxName={setUpcomingDocxName}
            upcomingBgDim={upcomingBgDim}
            setUpcomingBgDim={setUpcomingBgDim}
            upcomingTableBg={upcomingTableBg}
            setUpcomingTableBg={setUpcomingTableBg}
            upcomingTableCustomBg={upcomingTableCustomBg}
            setUpcomingTableCustomBg={setUpcomingTableCustomBg}
            upcomingTableBorderWidth={upcomingTableBorderWidth}
            setUpcomingTableBorderWidth={setUpcomingTableBorderWidth}
            upcomingTableBorderColor={upcomingTableBorderColor}
            setUpcomingTableBorderColor={setUpcomingTableBorderColor}
            upcomingEdgeFade={upcomingEdgeFade}
            setUpcomingEdgeFade={setUpcomingEdgeFade}
            upcomingHeight={upcomingHeight}
            setUpcomingHeight={setUpcomingHeight}
            upcomingContentBgOpacity={upcomingContentBgOpacity}
            setUpcomingContentBgOpacity={setUpcomingContentBgOpacity}
            upcomingTitleSize={upcomingTitleSize}
            setUpcomingTitleSize={setUpcomingTitleSize}
            upcomingBgVisibility={upcomingBgVisibility}
            setUpcomingBgVisibility={setUpcomingBgVisibility}
            upcomingTableWidth={upcomingTableWidth}
            setUpcomingTableWidth={setUpcomingTableWidth}
            upcomingTableAlign={upcomingTableAlign}
            setUpcomingTableAlign={setUpcomingTableAlign}
            events={events}
            onSaveEvent={onSaveEvent}
            onNavigateToEvents={() => setAdminSubTab('events')}
          />
        </div>
      )}

      {/* 5.1. Communities, Churches & Field Stories Content Management View */}
      {adminSubTab === 'communities' && (
        <CommunitiesSettingsSection
          language={language}
          homePoster={homePoster}
          onSavePoster={async (updated) => {
            if (onSaveHomePoster) {
              await onSaveHomePoster(updated);
            }
          }}
        />
      )}

      {/* 5.2. Prayer Needs & Settings Management View */}
      {adminSubTab === 'prayer' && (
        <PrayerSettingsSection
          language={language}
          homePoster={homePoster}
          onSavePoster={async (updated) => {
            if (onSaveHomePoster) {
              await onSaveHomePoster(updated);
            }
          }}
        />
      )}

      {/* 6. Maps & Church Images Management View */}
      {adminSubTab === 'maps' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Map className="w-5 h-5 text-cyan-600" />
                <span>
                  {language === 'lo'
                    ? 'ຈັດການລິ້ງແຜນທີ່ Google Maps & ຮູບພາບຄຣິດສະຕະຈັກ'
                    : 'Church Google Maps Link & Photo Manager'}
                </span>
              </h3>
            </div>
          </div>

          {/* Topic 1: Select & Edit Church Map / Photo */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleMapsSection('editor')}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Building className="w-4 h-4 text-[#cc0000] shrink-0" />
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {language === 'lo'
                    ? '1. ເລືອກຄຣິດສະຕະຈັກ ແລະ ແກ້ໄຂແຜນທີ່ / ຮູບພາບ (Select & Edit Church Map / Photo)'
                    : '1. Select & Edit Church Map / Photo'}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                  isMapsOpen('editor') ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {isMapsOpen('editor') && (
              <div className="p-4 sm:p-5 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-4">
                <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-900/10 via-slate-900/5 to-slate-900/10 dark:from-cyan-950/40 dark:to-slate-900/60 rounded-2xl border border-cyan-200/80 dark:border-cyan-800/60 space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#cc0000]" />
                    <span>
                      {language === 'lo'
                        ? 'ເລືອກຄຣິດສະຕະຈັກ / ບ້ານ ທີ່ຕ້ອງການໃສ່ແຜນທີ່ ແລະ ຮູບ:'
                        : 'Select Target Church / Village:'}
                    </span>
                  </label>

                  <select
                    value={selectedMapVillageRowId || (villages[0]?.rowId ?? '')}
                    onChange={(e) => setSelectedMapVillageRowId(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-cyan-500/80 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none shadow-sm cursor-pointer"
                  >
                    {villages.map((v) => (
                      <option key={v.rowId || v.id} value={v.rowId}>
                        ⛪ {v.name} ({v.district}, {v.province}) • ຜູ້ເຊື່ອ {v.believers} ຄົນ {v.mapUrl ? ' [✓ ມີແຜນທີ່]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const activeVillage =
                    villages.find((v) => v.rowId === selectedMapVillageRowId) || villages[0];
                  if (!activeVillage) {
                    return (
                      <div className="text-xs text-slate-400 p-4">
                        {language === 'lo' ? 'ບໍ່ມີຂໍ້ມູນຄຣິດສະຕະຈັກ' : 'No church data available'}
                      </div>
                    );
                  }
                  return (
                    <MapAndImageEditorCard
                      key={activeVillage.rowId || activeVillage.id}
                      village={activeVillage}
                      onSave={onSaveVillage || onEditVillage}
                      language={language}
                    />
                  );
                })()}
              </div>
            )}
          </div>

          {/* Topic 2: Quick Overview Table of All Churches with Map Status */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleMapsSection('overview')}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Map className="w-4 h-4 text-cyan-600 shrink-0" />
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {language === 'lo'
                    ? `2. ຕາຕະລາງລາຍຊື່ຄຣິດສະຕະຈັກທັງໝົດ (${villages.length} ບ້ານ) (All Churches Overview)`
                    : `2. All Churches Overview (${villages.length})`}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                  isMapsOpen('overview') ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {isMapsOpen('overview') && (
              <div className="p-4 sm:p-5 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    {language === 'lo' ? 'ຄົ້ນຫາ ແລະ ເລືອກແກ້ໄຂ:' : 'Search and select to edit:'}
                  </span>
                  <div className="relative w-48 sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={mapSearchQuery}
                      onChange={(e) => setMapSearchQuery(e.target.value)}
                      placeholder={language === 'lo' ? 'ຄົ້ນຫາຊື່ບ້ານ...' : 'Search...'}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="px-3.5 py-2.5">ຮູບ</th>
                        <th className="px-3.5 py-2.5">{language === 'lo' ? 'ຊື່ຄຣິດສະຕະຈັກ' : 'Church Name'}</th>
                        <th className="px-3.5 py-2.5">{language === 'lo' ? 'ເມືອງ' : 'District'}</th>
                        <th className="px-3.5 py-2.5">{language === 'lo' ? 'ສະຖານະ Google Maps' : 'Maps Link'}</th>
                        <th className="px-3.5 py-2.5 text-right">{language === 'lo' ? 'ຈັດການ' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {villages
                        .filter((v) =>
                          v.name.toLowerCase().includes(mapSearchQuery.toLowerCase()) ||
                          v.district.toLowerCase().includes(mapSearchQuery.toLowerCase())
                        )
                        .map((v) => {
                          const isSelected =
                            selectedMapVillageRowId === v.rowId ||
                            (!selectedMapVillageRowId && v.rowId === villages[0]?.rowId);
                          return (
                            <tr
                              key={v.rowId || v.id}
                              className={`hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 transition ${
                                isSelected ? 'bg-cyan-50 dark:bg-cyan-950/60 font-bold' : ''
                              }`}
                            >
                              <td className="px-3.5 py-2">
                                <img
                                  src={v.imageUrl || 'https://images.unsplash.com/photo-1548625361-188683526017?q=80&w=200'}
                                  alt={v.name}
                                  className="w-9 h-7 rounded-md object-cover border border-slate-200 dark:border-slate-700"
                                />
                              </td>
                              <td className="px-3.5 py-2 font-bold text-slate-800 dark:text-white">
                                ⛪ {v.name}
                              </td>
                              <td className="px-3.5 py-2 text-slate-500 dark:text-slate-400">
                                {v.district}
                              </td>
                              <td className="px-3.5 py-2">
                                {v.mapUrl ? (
                                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                    ✓ {language === 'lo' ? 'ມີລິ້ງແຜນທີ່' : 'Linked'}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                    ⚠ {language === 'lo' ? 'ຍັງບໍ່ມີລິ້ງ' : 'No Link'}
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMapVillageRowId(v.rowId);
                                    setMapsOpenSections((prev) => ({ ...prev, editor: true }));
                                  }}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-cyan-600 text-white'
                                      : 'bg-slate-200 dark:bg-slate-700 hover:bg-cyan-600 hover:text-white text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  {isSelected
                                    ? language === 'lo'
                                      ? 'ກຳລັງເລືອກຢູ່'
                                      : 'Selected'
                                    : language === 'lo'
                                    ? 'ເລືອກແກ້ໄຂ'
                                    : 'Select Edit'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab: About Us Poster & Overview Settings */}
      {adminSubTab === 'about_poster' && (
        <AboutPosterSettingsSection
          language={language}
          aboutHeroImageUrl={aboutHeroImageUrl}
          setAboutHeroImageUrl={setAboutHeroImageUrl}
          hideAboutHeroPoster={hideAboutHeroPoster}
          setHideAboutHeroPoster={setHideAboutHeroPoster}
          aboutHeroBadge={aboutHeroBadge}
          setAboutHeroBadge={setAboutHeroBadge}
          aboutHeroBadgeEn={aboutHeroBadgeEn}
          setAboutHeroBadgeEn={setAboutHeroBadgeEn}
          aboutHeroBadgeTh={aboutHeroBadgeTh}
          setAboutHeroBadgeTh={setAboutHeroBadgeTh}
          aboutHeroVerse={aboutHeroVerse}
          setAboutHeroVerse={setAboutHeroVerse}
          aboutHeroVerseEn={aboutHeroVerseEn}
          setAboutHeroVerseEn={setAboutHeroVerseEn}
          aboutHeroVerseTh={aboutHeroVerseTh}
          setAboutHeroVerseTh={setAboutHeroVerseTh}
          aboutHeroVerseRef={aboutHeroVerseRef}
          setAboutHeroVerseRef={setAboutHeroVerseRef}
          aboutHeroVerseRefEn={aboutHeroVerseRefEn}
          setAboutHeroVerseRefEn={setAboutHeroVerseRefEn}
          aboutHeroVerseRefTh={aboutHeroVerseRefTh}
          setAboutHeroVerseRefTh={setAboutHeroVerseRefTh}
          posterBokeoImageUrl={posterBokeoImageUrl}
          setPosterBokeoImageUrl={setPosterBokeoImageUrl}
          aboutWhoWeArePosition={aboutWhoWeArePosition}
          setAboutWhoWeArePosition={setAboutWhoWeArePosition}
          aboutWhoWeAreScale={aboutWhoWeAreScale}
          setAboutWhoWeAreScale={setAboutWhoWeAreScale}
          aboutWhoWeAreFit={aboutWhoWeAreFit}
          setAboutWhoWeAreFit={setAboutWhoWeAreFit}
          aboutWhoWeAreBadge={aboutWhoWeAreBadge}
          setAboutWhoWeAreBadge={setAboutWhoWeAreBadge}
          aboutWhoWeAreBadgeEn={aboutWhoWeAreBadgeEn}
          setAboutWhoWeAreBadgeEn={setAboutWhoWeAreBadgeEn}
          aboutWhoWeAreBadgeTh={aboutWhoWeAreBadgeTh}
          setAboutWhoWeAreBadgeTh={setAboutWhoWeAreBadgeTh}
          aboutWhoWeAreTitle={aboutWhoWeAreTitle}
          setAboutWhoWeAreTitle={setAboutWhoWeAreTitle}
          aboutWhoWeAreTitleEn={aboutWhoWeAreTitleEn}
          setAboutWhoWeAreTitleEn={setAboutWhoWeAreTitleEn}
          aboutWhoWeAreTitleTh={aboutWhoWeAreTitleTh}
          setAboutWhoWeAreTitleTh={setAboutWhoWeAreTitleTh}
          posterBokeoTitle={posterBokeoTitle}
          setPosterBokeoTitle={setPosterBokeoTitle}
          posterBokeoTitleEn={posterBokeoTitleEn}
          setPosterBokeoTitleEn={setPosterBokeoTitleEn}
          posterBokeoTitleTh={posterBokeoTitleTh}
          setPosterBokeoTitleTh={setPosterBokeoTitleTh}
          posterBokeoDesc={posterBokeoDesc}
          setPosterBokeoDesc={setPosterBokeoDesc}
          posterBokeoDescEn={posterBokeoDescEn}
          setPosterBokeoDescEn={setPosterBokeoDescEn}
          posterBokeoDescTh={posterBokeoDescTh}
          setPosterBokeoDescTh={setPosterBokeoDescTh}
          hideBokeoSection={hideBokeoSection}
          setHideBokeoSection={setHideBokeoSection}
          bokeoPosterHeight={bokeoPosterHeight}
          setBokeoPosterHeight={setBokeoPosterHeight}
          bokeoPosterOverlayOpacity={bokeoPosterOverlayOpacity}
          setBokeoPosterOverlayOpacity={setBokeoPosterOverlayOpacity}
          bokeoPosterEdgeFade={bokeoPosterEdgeFade}
          setBokeoPosterEdgeFade={setBokeoPosterEdgeFade}
          bokeoPosterDim={bokeoPosterDim}
          setBokeoPosterDim={setBokeoPosterDim}
          bokeoPosterScale={posterBokeoScale}
          setBokeoPosterScale={setPosterBokeoScale}
          bokeoPosterPosition={posterBokeoPosition}
          setBokeoPosterPosition={setPosterBokeoPosition}
          bokeoPosterFit={posterBokeoFit}
          setBokeoPosterFit={setPosterBokeoFit}
          bokeoTimeline={bokeoTimeline}
          setBokeoTimeline={setBokeoTimeline}
          bokeoTimelineTitle={bokeoTimelineTitle}
          setBokeoTimelineTitle={setBokeoTimelineTitle}
          bokeoTimelineTitleEn={bokeoTimelineTitleEn}
          setBokeoTimelineTitleEn={setBokeoTimelineTitleEn}
          bokeoTimelineTitleTh={bokeoTimelineTitleTh}
          setBokeoTimelineTitleTh={setBokeoTimelineTitleTh}
          hideBokeoTimeline={hideBokeoTimeline}
          setHideBokeoTimeline={setHideBokeoTimeline}
          vision={donationVision}
          setVision={setDonationVision}
          visionEn={donationVisionEn}
          setVisionEn={setDonationVisionEn}
          visionTh={donationVisionTh}
          setVisionTh={setDonationVisionTh}
          mission={donationMission}
          setMission={setDonationMission}
          missionEn={donationMissionEn}
          setMissionEn={setDonationMissionEn}
          missionTh={donationMissionTh}
          setMissionTh={setDonationMissionTh}
          hideVisionMission={hideVisionMissionState}
          setHideVisionMission={setHideVisionMissionState}
          isSaving={isSavingPoster}
          onSave={handleSaveHomePosterForm}
        />
      )}

      {/* Subtab 7: Donation & Prayer Settings Edit */}
      {adminSubTab === 'donation' && (
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-emerald-600" />
              <span>
                {language === 'lo'
                  ? 'ຕັ້ງຄ່າຂໍ້ມູນການບໍລິຈາກ ແລະ ຊ່ອງທາງອະທິຖານ (Donation & Prayer Channels)'
                  : 'Manage Donation & Prayer Channels'}
              </span>
            </h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              {language === 'lo' ? 'ໜ້າກ່ຽວກັບເຮົາ' : 'About Us Page'}
            </span>
          </div>

          <form onSubmit={handleSaveDonationForm} className="space-y-3.5">
            {/* Topic 1: Bank Accounts */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => toggleDonationSection('banks')}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {language === 'lo'
                      ? '1. ລາຍການບັນຊີທະນາຄານບໍລິຈາກ (Multiple Bank Accounts)'
                      : '1. Bank Accounts for Donation'}
                  </h4>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                    isDonationOpen('banks') ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>

              {isDonationOpen('banks') && (
                <div className="p-5 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between gap-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 rounded-xl px-3.5 py-2.5">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                      {language === 'lo'
                        ? '💡 ຈັດການ ຫຼື ເພີ່ມບັນຊີທະນາຄານສຳລັບຮັບບໍລິຈາກ:'
                        : '💡 Manage or add bank accounts for donations:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newAcc: BankAccount = {
                          id: String(Date.now()),
                          bankName: 'ທະນາຄານ ໃໝ່ (New Bank)',
                          bankNameEn: 'New Bank',
                          accountName: 'HOPE BOKEO MINISTRY PROJECT',
                          accountNumber: '000-00-00-000000000-000',
                          swiftCode: '',
                          qrImageUrl: '',
                          hidden: false,
                        };
                        setDonationBankAccounts([...donationBankAccounts, newAcc]);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === 'lo' ? 'ເພີ່ມບັນຊີທະນາຄານ' : 'Add Bank Account'}</span>
                    </button>
                  </div>
              {donationBankAccounts.map((acc, index) => (
                <div
                  key={acc.id || index}
                  className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-4 relative"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {language === 'lo' ? `ບັນຊີທະນາຄານ ທີ ${index + 1}` : `Bank Account #${index + 1}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...donationBankAccounts];
                          updated[index].hidden = !updated[index].hidden;
                          setDonationBankAccounts(updated);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                          acc.hidden
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                        }`}
                        title={acc.hidden ? 'ກົດເພື່ອສະແດ່ງບັນຊີນີ້' : 'ກົດເພື່ອເຊື່ອງບັນຊີນີ້'}
                      >
                        {acc.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>
                          {acc.hidden
                            ? (language === 'lo' ? '🙈 ເຊື່ອງ' : 'Hidden')
                            : (language === 'lo' ? '👁️ ສະແດ່ງ' : 'Visible')}
                        </span>
                      </button>
                      {donationBankAccounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = donationBankAccounts.filter((_, i) => i !== index);
                            setDonationBankAccounts(updated);
                          }}
                          className="p-1 text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title={language === 'lo' ? 'ລົບບັນຊີນີ້' : 'Delete account'}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{language === 'lo' ? 'ລົບ' : 'Delete'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'lo' ? 'ຊື່ທະນາຄານ (ພາສາລາວ) *' : 'Bank Name (Lao) *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={acc.bankName}
                        onChange={(e) => {
                          const updated = [...donationBankAccounts];
                          updated[index].bankName = e.target.value;
                          setDonationBankAccounts(updated);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'lo' ? 'ຊື່ທະນາຄານ (English)' : 'Bank Name (English)'}
                      </label>
                      <input
                        type="text"
                        value={acc.bankNameEn || ''}
                        onChange={(e) => {
                          const updated = [...donationBankAccounts];
                          updated[index].bankNameEn = e.target.value;
                          setDonationBankAccounts(updated);
                        }}
                        placeholder="Banque Pour Le Commerce..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'lo' ? 'ຊື່ທະນາຄານ (Thai)' : 'Bank Name (Thai)'}
                      </label>
                      <input
                        type="text"
                        value={acc.bankNameTh || ''}
                        onChange={(e) => {
                          const updated = [...donationBankAccounts];
                          updated[index].bankNameTh = e.target.value;
                          setDonationBankAccounts(updated);
                        }}
                        placeholder="ธนาคาร..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'lo' ? 'ຊື່ບັນຊີ (Account Name) *' : 'Account Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={acc.accountName}
                        onChange={(e) => {
                          const updated = [...donationBankAccounts];
                          updated[index].accountName = e.target.value;
                          setDonationBankAccounts(updated);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'lo' ? 'ເລກບັນຊີ (Account Number) *' : 'Account Number *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={acc.accountNumber}
                        onChange={(e) => {
                          const updated = [...donationBankAccounts];
                          updated[index].accountNumber = e.target.value;
                          setDonationBankAccounts(updated);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'lo' ? 'SWIFT Code (ຖ້າມີ):' : 'SWIFT Code:'}
                      </label>
                      <input
                        type="text"
                        value={acc.swiftCode || ''}
                        onChange={(e) => {
                          const updated = [...donationBankAccounts];
                          updated[index].swiftCode = e.target.value;
                          setDonationBankAccounts(updated);
                        }}
                        placeholder="BCELLA2X"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'lo' ? 'ລິ້ງບໍລິຈາກ / Deep Link / Payment Payload (ຖ້າມີ):' : 'Donation Link or Custom Payment Payload:'}
                      </label>
                      <input
                        type="text"
                        value={acc.donationLink || ''}
                        onChange={(e) => {
                          const updated = [...donationBankAccounts];
                          updated[index].donationLink = e.target.value;
                          setDonationBankAccounts(updated);
                        }}
                        placeholder="https://bcel.com.la/pay/... ຫຼື ລິ້ງການໂອນເງິນ"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        {language === 'lo'
                          ? 'ຖ້າປະຫວ່າງໄວ້ System ຈະສ້າງ QR Code ອັດໂຕໂນມັດຈາກ ເລກບັນຊີ ແລະ ຊື່ບັນຊີ'
                          : 'If left blank, QR Code is auto-generated from Account Number & Name'}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic QR Code Generator & Static Image Override Section */}
                  <div className="bg-slate-100 dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-xs font-black text-[#cc0000] dark:text-red-400 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4" />
                        <span>
                          {language === 'lo' ? `⚡ Dynamic QR Code (${acc.bankName || 'Bank'})` : `Dynamic QR Generator (${acc.bankName || 'Bank'})`}
                        </span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full">
                        {language === 'lo' ? 'ສ້າງອັດໂຕໂນມັດ' : 'Auto Generated'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      {/* Dynamic QR Code Preview */}
                      <div className="flex flex-col items-center bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <QRCodeDisplay
                          accountNumber={acc.accountNumber}
                          bankName={acc.bankName}
                          accountName={acc.accountName}
                          donationLink={acc.donationLink}
                          qrPayload={acc.qrPayload}
                          size={140}
                          language={language}
                          onGenerated={(dataUrl) => {
                            if (!acc.qrImageUrl || acc.qrImageUrl.includes('unsplash.com')) {
                              const updated = [...donationBankAccounts];
                              updated[index].qrImageUrl = dataUrl;
                              setDonationBankAccounts(updated);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const payload = acc.donationLink || acc.qrPayload || `DONATION|BANK:${acc.bankName}|ACC:${acc.accountNumber}|NAME:${acc.accountName}`;
                            import('../utils/qrCode').then(({ generateQRCodeDataUrl }) => {
                              generateQRCodeDataUrl(payload, { width: 400 }).then((url) => {
                                const updated = [...donationBankAccounts];
                                updated[index].qrImageUrl = url;
                                setDonationBankAccounts(updated);
                              });
                            });
                          }}
                          className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {language === 'lo' ? '⚡ ນຳໃຊ້ Dynamic QR Code ນີ້' : 'Use Dynamic QR Code'}
                          </span>
                        </button>
                      </div>

                      {/* Custom Static Image Override (Optional) */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {language === 'lo' ? 'ຫຼື ອັບໂຫຼດຮູບ QR ຈາກທະນາຄານໂດຍຕົ່ງ (Static Image Override):' : 'Or Upload Custom QR Image:'}
                        </label>
                        <UnifiedMediaUploader
                          value={acc.qrImageUrl}
                          onChange={(url) => {
                            const updated = [...donationBankAccounts];
                            updated[index].qrImageUrl = url;
                            setDonationBankAccounts(updated);
                          }}
                          language={language}
                          label={language === 'lo' ? `ອັບໂຫຼດຮູບ QR` : `Upload Custom QR`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

                  {/* Bottom Save Bar for Topic 1 (Banks) */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSavingDonation}
                      className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingDonation ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>
                        {isSavingDonation
                          ? language === 'lo'
                            ? 'ກຳລັງບັນທຶກ...'
                            : 'Saving...'
                          : language === 'lo'
                          ? 'ບັນທຶກການຕັ້ງຄ່າ'
                          : 'Save Settings'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Topic 2: Prayer Partnership & Hotline */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => toggleDonationSection('hotline')}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {language === 'lo'
                      ? '2. ຊ່ອງທາງຮ່ວມອະທິຖານ & ສາຍດ່ວນ (Prayer Partnership & Hotline)'
                      : '2. Prayer Partnership & Hotline'}
                  </h4>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                    isDonationOpen('hotline') ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>

              {isDonationOpen('hotline') && (
                <div className="p-5 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'lo' ? 'ສະຖານະການສະແດງສາຍດ່ວນ (Visibility):' : 'Hotline Visibility:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHidePrayerLineState(!hidePrayerLineState)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        hidePrayerLineState
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                      }`}
                    >
                      {hidePrayerLineState ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>
                        {hidePrayerLineState
                          ? (language === 'lo' ? '🙈 ເຊື່ອງ' : 'Hidden')
                          : (language === 'lo' ? '👁️ ສະແດງ' : 'Visible')}
                      </span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'lo' ? 'ເບີໂທສາຍດ່ວນອະທິຖານ (Phone):' : 'Prayer Phone Line:'}
                    </label>
                    <input
                      type="text"
                      value={donationPhone}
                      onChange={(e) => setDonationPhone(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'lo' ? 'WhatsApp ຮ່ວມອະທິຖານ:' : 'WhatsApp Support:'}
                    </label>
                    <input
                      type="text"
                      value={donationWhatsapp}
                      onChange={(e) => setDonationWhatsapp(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'lo' ? 'ອີເມວພັນທະກິດ (Email):' : 'Ministry Email:'}
                    </label>
                    <input
                      type="email"
                      value={donationEmail}
                      onChange={(e) => setDonationEmail(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  </div>

                  {/* Bottom Save Bar for Topic 2 (Hotline) */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSavingDonation}
                      className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingDonation ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>
                        {isSavingDonation
                          ? language === 'lo'
                            ? 'ກຳລັງບັນທຶກ...'
                            : 'Saving...'
                          : language === 'lo'
                          ? 'ບັນທຶກການຕັ້ງຄ່າ'
                          : 'Save Settings'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Topic 3: Purpose Description & Support Note */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => toggleDonationSection('notes')}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {language === 'lo'
                      ? '3. ຂໍ້ຄວາມບັນຍາຍການບໍລິຈາກ & ຂອບໃຈ (Donation Purpose & Support Note)'
                      : '3. Donation Purpose & Support Note'}
                  </h4>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                    isDonationOpen('notes') ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>

              {isDonationOpen('notes') && (
                <div className="p-5 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        {language === 'lo'
                          ? 'ຂໍ້ຄວາມບັນຍາຍການບໍລິຈາກ (Purpose Description):'
                          : 'Donation Purpose Description:'}
                      </label>
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {(['la', 'tha', 'en'] as const).map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setDonationPurposeLang(l)}
                            className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                              donationPurposeLang === l
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {l === 'la' ? 'La' : l === 'tha' ? 'Tha' : 'En'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      value={
                        donationPurposeLang === 'la'
                          ? donationPurposeDesc
                          : donationPurposeLang === 'tha'
                          ? donationPurposeDescTh
                          : donationPurposeDescEn
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (donationPurposeLang === 'la') setDonationPurposeDesc(val);
                        else if (donationPurposeLang === 'tha') setDonationPurposeDescTh(val);
                        else setDonationPurposeDescEn(val);
                      }}
                      placeholder={
                        donationPurposeLang === 'la'
                          ? 'ເງິນບໍລິຈາກທັງໝົດຈະຖືກນຳໃຊ້ເຂົ້າໃນ...'
                          : donationPurposeLang === 'tha'
                          ? 'เงินบริจาคทั้งหมดจะถูกนำไปใช้ใน...'
                          : 'All donations directly fund field ministry operations...'
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        {language === 'lo' ? 'ຂໍ້ຄວາມອຸປະຖຳ & ຂອບໃຈ (Support Note):' : 'Support Note:'}
                      </label>
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {(['la', 'tha', 'en'] as const).map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setDonationSupportNoteLang(l)}
                            className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                              donationSupportNoteLang === l
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {l === 'la' ? 'La' : l === 'tha' ? 'Tha' : 'En'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={
                        donationSupportNoteLang === 'la'
                          ? donationSupportNote
                          : donationSupportNoteLang === 'tha'
                          ? donationSupportNoteTh
                          : donationSupportNoteEn
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (donationSupportNoteLang === 'la') setDonationSupportNote(val);
                        else if (donationSupportNoteLang === 'tha') setDonationSupportNoteTh(val);
                        else setDonationSupportNoteEn(val);
                      }}
                      placeholder={
                        donationSupportNoteLang === 'la'
                          ? 'ທຸກໆການຮ່ວມບໍລິຈາກ ແລະ ຄຳອະທິຖານຂອງທ່ານ ແມ່ນມີຄຸນຄ່າຢ່າງຍິ່ງ...'
                          : donationSupportNoteLang === 'tha'
                          ? 'ทุกๆ การร่วมบริจาคและคำอธิษฐานของคุณมีคุณค่าอย่างยิ่ง...'
                          : 'Your donations and faithful prayers are deeply appreciated...'
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {/* Bottom Save Bar for Topic 3 (Notes) */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSavingDonation}
                      className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingDonation ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>
                        {isSavingDonation
                          ? language === 'lo'
                            ? 'ກຳລັງບັນທຶກ...'
                            : 'Saving...'
                          : language === 'lo'
                          ? 'ບັນທຶກການຕັ້ງຄ່າ'
                          : 'Save Settings'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Admin Sub-Tab 5: Finance & Support Distributions */}
      {adminSubTab === ('finance' as any) && (
        <div className="space-y-4">
          <FinanceTab
            teams={teams}
            donationInfo={donationInfo}
            language={language}
            isReadOnly={false}
            onBack={() => setAdminActiveFeature('hub')}
          />
        </div>
      )}
            </div>
          </div>
        </div>
      )}
    </div>
  )}
      </div>
    )}

    {/* Monthly Sub-Reports Management Modal (Admin Full Edit Access) */}
    {selectedAdminReportEvent && (
      <EventReportModal
        event={selectedAdminReportEvent}
        isOpen={Boolean(selectedAdminReportEvent)}
        onClose={() => setSelectedAdminReportEvent(null)}
        language={language}
        isAdmin={true}
        onEventUpdated={(updatedEv) => {
          setSelectedAdminReportEvent(updatedEv);
          if (onSaveEvent) {
            onSaveEvent(updatedEv);
          }
        }}
      />
    )}
  </div>
  );
};

/* Helper Sub-Component for Map Links and Image Upload for Each Church */
const MapAndImageEditorCard: React.FC<{
  village: Village;
  onSave: (v: Village) => void;
  language: Language;
}> = ({ village, onSave, language }) => {
  const [mapUrl, setMapUrl] = useState(village.mapUrl || '');
  const [imageUrl, setImageUrl] = useState(village.imageUrl || '');
  const [latInput, setLatInput] = useState<string>(
    typeof village.lat === 'number' && !isNaN(village.lat) ? String(village.lat) : ''
  );
  const [lngInput, setLngInput] = useState<string>(
    typeof village.lng === 'number' && !isNaN(village.lng) ? String(village.lng) : ''
  );
  const [isSaved, setIsSaved] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [parsedGps, setParsedGps] = useState<{ lat: number; lng: number } | null>(() => {
    if (typeof village.lat === 'number' && typeof village.lng === 'number' && !isNaN(village.lat) && !isNaN(village.lng)) {
      return normalizeCoordinates(village.lat, village.lng);
    }
    if (village.mapUrl) {
      return parseCoordinatesFromUrl(village.mapUrl);
    }
    return null;
  });

  // Auto-resolve shortened URL on mount if coordinates not yet available
  useEffect(() => {
    let isCancelled = false;
    const currentUrl = village.mapUrl?.trim() || '';

    setMapUrl(currentUrl);
    setImageUrl(village.imageUrl || '');

    if (typeof village.lat === 'number' && typeof village.lng === 'number' && !isNaN(village.lat) && !isNaN(village.lng)) {
      const norm = normalizeCoordinates(village.lat, village.lng);
      setParsedGps(norm);
      setLatInput(norm ? String(norm.lat) : '');
      setLngInput(norm ? String(norm.lng) : '');
    } else if (currentUrl) {
      const direct = parseCoordinatesFromUrl(currentUrl);
      if (direct) {
        setParsedGps({ lat: direct.lat, lng: direct.lng });
        setLatInput(String(direct.lat));
        setLngInput(String(direct.lng));
      } else if (isShortenedMapsUrl(currentUrl)) {
        setIsResolving(true);
        resolveMapsUrlViaApi(currentUrl).then((res) => {
          if (!isCancelled && res.success && typeof res.lat === 'number' && typeof res.lng === 'number') {
            setParsedGps({ lat: res.lat, lng: res.lng });
            setLatInput(String(res.lat));
            setLngInput(String(res.lng));
          }
          if (!isCancelled) setIsResolving(false);
        });
      } else {
        setParsedGps(null);
        setLatInput('');
        setLngInput('');
      }
    } else {
      setParsedGps(null);
      setLatInput('');
      setLngInput('');
    }

    return () => {
      isCancelled = true;
    };
  }, [village.rowId, village.id, village.mapUrl, village.imageUrl, village.lat, village.lng]);

  const handleMapUrlChange = async (newUrl: string) => {
    setMapUrl(newUrl);
    if (!newUrl.trim()) {
      setParsedGps(null);
      setLatInput('');
      setLngInput('');
      return;
    }

    // Try direct parsing first
    const directParsed = parseCoordinatesFromUrl(newUrl);
    if (directParsed) {
      setParsedGps({ lat: directParsed.lat, lng: directParsed.lng });
      setLatInput(String(directParsed.lat));
      setLngInput(String(directParsed.lng));
      return;
    }

    // If shortened URL (e.g. maps.app.goo.gl)
    if (isShortenedMapsUrl(newUrl)) {
      setIsResolving(true);
      try {
        const res = await resolveMapsUrlViaApi(newUrl);
        if (res.success && typeof res.lat === 'number' && typeof res.lng === 'number') {
          setParsedGps({ lat: res.lat, lng: res.lng });
          setLatInput(String(res.lat));
          setLngInput(String(res.lng));
        }
      } catch (err) {
        console.error('Failed to resolve short map url:', err);
      } finally {
        setIsResolving(false);
      }
    }
  };

  const handleCoordinateChange = (newLatStr: string, newLngStr: string) => {
    setLatInput(newLatStr);
    setLngInput(newLngStr);
    const nLat = parseFloat(newLatStr);
    const nLng = parseFloat(newLngStr);
    if (!isNaN(nLat) && !isNaN(nLng)) {
      const norm = normalizeCoordinates(nLat, nLng);
      if (norm) {
        setParsedGps(norm);
      }
    }
  };

  const handleSave = async () => {
    let currentGps = parsedGps;

    // Check manual inputs first
    const nLat = parseFloat(latInput);
    const nLng = parseFloat(lngInput);
    if (!isNaN(nLat) && !isNaN(nLng)) {
      const norm = normalizeCoordinates(nLat, nLng);
      if (norm) {
        currentGps = norm;
      }
    }

    if (!currentGps && mapUrl.trim()) {
      const direct = parseCoordinatesFromUrl(mapUrl.trim());
      if (direct) {
        currentGps = direct;
      } else if (isShortenedMapsUrl(mapUrl.trim())) {
        try {
          const res = await resolveMapsUrlViaApi(mapUrl.trim());
          if (res.success && typeof res.lat === 'number' && typeof res.lng === 'number') {
            currentGps = { lat: res.lat, lng: res.lng };
          }
        } catch (e) {
          console.error('Error resolving map url in editor:', e);
        }
      }
    }

    onSave({
      ...village,
      mapUrl: mapUrl.trim(),
      imageUrl: imageUrl.trim(),
      ...(currentGps ? { lat: currentGps.lat, lng: currentGps.lng } : {}),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4 shadow-sm hover:border-cyan-400 dark:hover:border-cyan-600 transition">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-[#cc0000]" />
            <span>⛪ {village.name}</span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {village.district}, {village.province}
          </p>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
          PIN: {village.pinCode || '1001'}
        </span>
      </div>

      {/* Google Maps Link Input */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5 text-cyan-600" />
            <span>{language === 'lo' ? 'ລິ້ງ Google Maps (Embed/Share/Place URL)' : 'Google Maps URL'}</span>
          </span>
          {isResolving && (
            <span className="text-[10px] text-cyan-600 flex items-center gap-1 font-bold animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{language === 'lo' ? 'ກຳລັງກວດສອບພິກັດ...' : 'Resolving GPS...'}</span>
            </span>
          )}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={mapUrl}
            onChange={(e) => handleMapUrlChange(e.target.value)}
            placeholder="https://maps.app.goo.gl/... ຫຼື https://google.com/maps/place/..."
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
          />
          {mapUrl && (
            <a
              href={
                parsedGps
                  ? `https://www.google.com/maps/search/?api=1&query=${parsedGps.lat},${parsedGps.lng}`
                  : mapUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 text-blue-600 dark:text-blue-300 rounded-xl transition border border-blue-200 dark:border-blue-800"
              title="Open Google Maps Pin"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Manual GPS Coordinate Fields */}
        <div className="mt-2 grid grid-cols-2 gap-2 bg-slate-100/70 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
              Latitude (ເສັ້ນຂະໜານ):
            </label>
            <input
              type="text"
              value={latInput}
              onChange={(e) => handleCoordinateChange(e.target.value, lngInput)}
              placeholder="e.g. 20.078897"
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-white font-mono outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
              Longitude (ເສັ້ນແວງ):
            </label>
            <input
              type="text"
              value={lngInput}
              onChange={(e) => handleCoordinateChange(latInput, e.target.value)}
              placeholder="e.g. 100.836816"
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-white font-mono outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* GPS Verification Badge & Mini Map Preview */}
        {parsedGps ? (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>
                {language === 'lo'
                  ? `✓ ຊິງພິກັດປັກໝຸດ GPS ສຳເລັດ: Lat ${parsedGps.lat}, Lng ${parsedGps.lng}`
                  : `✓ Verified GPS Pin: Lat ${parsedGps.lat}, Lng ${parsedGps.lng}`}
              </span>
            </div>

            {/* Live Mini Map Verification Frame */}
            <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 shadow-inner relative">
              <iframe
                title={`Map Preview for ${village.name}`}
                src={`https://maps.google.com/maps?q=${parsedGps.lat},${parsedGps.lng}&t=m&z=15&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer"
              ></iframe>
            </div>
          </div>
        ) : mapUrl.trim() ? (
          <div className="mt-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            {language === 'lo'
              ? '⚠️ ກະລຸນາໃສ່ລິ້ງ Google Maps ທີ່ຖືກຕ້ອງ ຫຼື ໃສ່ຕົວເລກ Latitude / Longitude ໂດຍກົງ'
              : '⚠️ Please provide a valid Google Maps link or enter Latitude / Longitude directly.'}
          </div>
        ) : null}
      </div>

      {/* Church Image Uploader */}
      <UnifiedMediaUploader
        value={imageUrl}
        onChange={(url) => setImageUrl(url)}
        language={language}
        label={
          language === 'lo'
            ? 'ອັບໂຫຼດ ຫຼື ວ່າງລິງຮູບຄິດສະຈັກ/ບ້ານ (Church/Village Photo)'
            : 'Church/Village Photo File or Link'
        }
        acceptTypes="image/*"
      />

      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
        {isSaved ? (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Check className="w-4 h-4" />
            <span>{language === 'lo' ? 'ບັນທຶກສຳເລັດແລ້ວ!' : 'Saved successfully!'}</span>
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 font-medium">
            {language === 'lo' ? 'ກົດບັນທຶກເພື່ອອັບເດດ' : 'Click save to update'}
          </span>
        )}

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{language === 'lo' ? 'ບັນທຶກ' : 'Save'}</span>
        </button>
      </div>
    </div>
  );
};

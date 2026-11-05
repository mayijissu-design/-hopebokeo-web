import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  RotateCcw,
  MapPin,
  BookOpen,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Globe,
  Layers,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { Language, HomePoster } from '../types';

interface CommunitiesSettingsSectionProps {
  language: Language;
  homePoster?: HomePoster;
  onSavePoster: (updatedPoster: HomePoster) => Promise<void>;
}

export const CommunitiesSettingsSection: React.FC<CommunitiesSettingsSectionProps> = ({
  language,
  homePoster,
  onSavePoster,
}) => {
  const [activeLangTab, setActiveLangTab] = useState<'lo' | 'en' | 'th'>('lo');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const isOpen = (key: string) => Boolean(openSections[key]);

  // ==========================================
  // Category 1: Map Section ("WHERE GOD IS WORKING" / "Communities, Churches. Lasting Change.")
  // ==========================================
  const [hideMapSectionDesc, setHideMapSectionDesc] = useState<boolean>(
    Boolean(homePoster?.hideMapSectionDesc)
  );

  const [mapBadgeLo, setMapBadgeLo] = useState<string>(
    homePoster?.mapSectionBadge || 'WHERE GOD IS WORKING'
  );
  const [mapBadgeEn, setMapBadgeEn] = useState<string>(
    homePoster?.mapSectionBadgeEn || 'WHERE GOD IS WORKING'
  );
  const [mapBadgeTh, setMapBadgeTh] = useState<string>(
    homePoster?.mapSectionBadgeTh || 'WHERE GOD IS WORKING'
  );

  const [mapTitleLo, setMapTitleLo] = useState<string>(
    homePoster?.mapSectionTitle || 'Communities, Churches.\nLasting Change.'
  );
  const [mapTitleEn, setMapTitleEn] = useState<string>(
    homePoster?.mapSectionTitleEn || 'Communities, Churches.\nLasting Change.'
  );
  const [mapTitleTh, setMapTitleTh] = useState<string>(
    homePoster?.mapSectionTitleTh || 'Communities, Churches.\nLasting Change.'
  );

  const [mapDescLo, setMapDescLo] = useState<string>(
    homePoster?.mapSectionDesc ||
      'ຈາກການປະກາດຂ່າວປະເສີດໃນໝູ່ບ້ານສູ່ການບຸກເບີກຄຣິດຕະຈັກ, ພຣະເຈົ້າກຳລັງເຄື່ອນໄຫວທົ່ວແຂວງບໍ່ແກ້ວ. ສຳຫຼວດສະຖານທີ່, ຜູ້ຄົນ ແລະ ພັນທະກິດທີ່ສ້າງຄວາມແຕກຕ່າງ.'
  );
  const [mapDescEn, setMapDescEn] = useState<string>(
    homePoster?.mapSectionDescEn ||
      'From village evangelism to church planting, God is at work across Bokeo Province. Explore the places, people and ministries making a difference.'
  );
  const [mapDescTh, setMapDescTh] = useState<string>(
    homePoster?.mapSectionDescTh ||
      'จากการประกาศข่าวประเสริฐในหมู่บ้านสู่การบุกเบิกคริสตจักร พระเจ้ากำลังเคลื่อนไหวทั่วแขวงบ่อแก้ว สำรวจสถานที่ ผู้คน และพันธกิจที่สร้างความเปลี่ยนแปลง'
  );

  const [mapButtonLo, setMapButtonLo] = useState<string>(
    homePoster?.mapSectionButtonText || 'ເບິ່ງສະຖານທີ່ທັງໝົດ'
  );
  const [mapButtonEn, setMapButtonEn] = useState<string>(
    homePoster?.mapSectionButtonTextEn || 'View All Locations'
  );
  const [mapButtonTh, setMapButtonTh] = useState<string>(
    homePoster?.mapSectionButtonTextTh || 'ดูสถานที่ทั้งหมด'
  );

  // ==========================================
  // Category 2: Stories From The Field ("STORIES FROM THE FIELD" / "Real People. Real Hope.")
  // ==========================================
  const [hideStoriesDesc, setHideStoriesDesc] = useState<boolean>(
    Boolean(homePoster?.hideStoriesDesc)
  );

  const [storiesBadgeLo, setStoriesBadgeLo] = useState<string>(
    homePoster?.storiesBadgeText || 'ເລື່ອງລາວຈາກພາກສະໜາມ'
  );
  const [storiesBadgeEn, setStoriesBadgeEn] = useState<string>(
    homePoster?.storiesBadgeTextEn || 'STORIES FROM THE FIELD'
  );
  const [storiesBadgeTh, setStoriesBadgeTh] = useState<string>(
    homePoster?.storiesBadgeTextTh || 'เรื่องราวจากภาคสนาม'
  );

  const [storiesTitleLo, setStoriesTitleLo] = useState<string>(
    homePoster?.storiesTitle || 'Real People. Real Hope.'
  );
  const [storiesTitleEn, setStoriesTitleEn] = useState<string>(
    homePoster?.storiesTitleEn || 'Real People. Real Hope.'
  );
  const [storiesTitleTh, setStoriesTitleTh] = useState<string>(
    homePoster?.storiesTitleTh || 'Real People. Real Hope.'
  );

  const [storiesDescLo, setStoriesDescLo] = useState<string>(
    homePoster?.storiesDesc ||
      'ທຸກໆເລື່ອງລາວເປັນສິ່ງເຕືອນໃຈວ່າ ພຣະເຈົ້າກຳລັງເຄື່ອນໄຫວໃນບໍ່ແກ້ວ — ໃນຊີວິດຂອງເດັກນ້ອຍ, ຄອບຄົວ ແລະ ຊຸມຊົນທັງໝົດ.'
  );
  const [storiesDescEn, setStoriesDescEn] = useState<string>(
    homePoster?.storiesDescEn ||
      'Every story is a reminder that God is moving in Bokeo — in the lives of children, families and entire communities.'
  );
  const [storiesDescTh, setStoriesDescTh] = useState<string>(
    homePoster?.storiesDescTh ||
      'ทุกๆ เรื่องราวคือเครื่องเตือนใจว่าพระเจ้ากำลังเคลื่อนไหวในบ่อแก้ว — ในชีวิตของเด็กๆ ครอบครัว และชุมชนทั้งหมด'
  );

  const [storiesButtonLo, setStoriesButtonLo] = useState<string>(
    homePoster?.storiesButtonText || 'ເບິ່ງເລື່ອງລາວທັງໝົດ'
  );
  const [storiesButtonEn, setStoriesButtonEn] = useState<string>(
    homePoster?.storiesButtonTextEn || 'View All Stories'
  );
  const [storiesButtonTh, setStoriesButtonTh] = useState<string>(
    homePoster?.storiesButtonTextTh || 'ดูเรื่องราวทั้งหมด'
  );

  const isHydratingRef = useRef(false);

  // Sync local form state when homePoster updates in real time from Firestore
  useEffect(() => {
    if (!homePoster) return;
    isHydratingRef.current = true;
    setHideMapSectionDesc(Boolean(homePoster.hideMapSectionDesc));
    if (homePoster.mapSectionBadge !== undefined) setMapBadgeLo(homePoster.mapSectionBadge || 'WHERE GOD IS WORKING');
    if (homePoster.mapSectionBadgeEn !== undefined) setMapBadgeEn(homePoster.mapSectionBadgeEn || 'WHERE GOD IS WORKING');
    if (homePoster.mapSectionBadgeTh !== undefined) setMapBadgeTh(homePoster.mapSectionBadgeTh || 'WHERE GOD IS WORKING');
    if (homePoster.mapSectionTitle !== undefined) setMapTitleLo(homePoster.mapSectionTitle || 'Communities, Churches.\nLasting Change.');
    if (homePoster.mapSectionTitleEn !== undefined) setMapTitleEn(homePoster.mapSectionTitleEn || 'Communities, Churches.\nLasting Change.');
    if (homePoster.mapSectionTitleTh !== undefined) setMapTitleTh(homePoster.mapSectionTitleTh || 'Communities, Churches.\nLasting Change.');
    if (homePoster.mapSectionDesc !== undefined) setMapDescLo(homePoster.mapSectionDesc);
    if (homePoster.mapSectionDescEn !== undefined) setMapDescEn(homePoster.mapSectionDescEn);
    if (homePoster.mapSectionDescTh !== undefined) setMapDescTh(homePoster.mapSectionDescTh);
    if (homePoster.mapSectionButtonText !== undefined) setMapButtonLo(homePoster.mapSectionButtonText || 'ເບິ່ງສະຖານທີ່ທັງໝົດ');
    if (homePoster.mapSectionButtonTextEn !== undefined) setMapButtonEn(homePoster.mapSectionButtonTextEn || 'View All Locations');
    if (homePoster.mapSectionButtonTextTh !== undefined) setMapButtonTh(homePoster.mapSectionButtonTextTh || 'ดูสถานที่ทั้งหมด');

    setHideStoriesDesc(Boolean(homePoster.hideStoriesDesc));
    if (homePoster.storiesBadgeText !== undefined) setStoriesBadgeLo(homePoster.storiesBadgeText || 'ເລື່ອງລາວຈາກພາກສະໜາມ');
    if (homePoster.storiesBadgeTextEn !== undefined) setStoriesBadgeEn(homePoster.storiesBadgeTextEn || 'STORIES FROM THE FIELD');
    if (homePoster.storiesBadgeTextTh !== undefined) setStoriesBadgeTh(homePoster.storiesBadgeTextTh || 'เรื่องราวจากภาคสนาม');
    if (homePoster.storiesTitle !== undefined) setStoriesTitleLo(homePoster.storiesTitle || 'Real People. Real Hope.');
    if (homePoster.storiesTitleEn !== undefined) setStoriesTitleEn(homePoster.storiesTitleEn || 'Real People. Real Hope.');
    if (homePoster.storiesTitleTh !== undefined) setStoriesTitleTh(homePoster.storiesTitleTh || 'Real People. Real Hope.');
    if (homePoster.storiesDesc !== undefined) setStoriesDescLo(homePoster.storiesDesc);
    if (homePoster.storiesDescEn !== undefined) setStoriesDescEn(homePoster.storiesDescEn);
    if (homePoster.storiesDescTh !== undefined) setStoriesDescTh(homePoster.storiesDescTh);
    if (homePoster.storiesButtonText !== undefined) setStoriesButtonLo(homePoster.storiesButtonText || 'ເບິ່ງເລື່ອງລາວທັງໝົດ');
    if (homePoster.storiesButtonTextEn !== undefined) setStoriesButtonEn(homePoster.storiesButtonTextEn || 'View All Stories');
    if (homePoster.storiesButtonTextTh !== undefined) setStoriesButtonTh(homePoster.storiesButtonTextTh || 'ดูเรื่องราวทั้งหมด');

    setTimeout(() => {
      isHydratingRef.current = false;
    }, 150);
  }, [homePoster]);

  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (isHydratingRef.current) return;

    const timer = setTimeout(() => {
      if (isHydratingRef.current) return;
      const draft: HomePoster = {
        title: homePoster?.title || 'HOPE BOKEO',
        subtitle: homePoster?.subtitle || '',
        description: homePoster?.description || '',
        imageUrl: homePoster?.imageUrl || '',
        ...(homePoster || {}),
        hideMapSectionDesc,
        mapSectionBadge: mapBadgeLo.trim(),
        mapSectionBadgeEn: mapBadgeEn.trim(),
        mapSectionBadgeTh: mapBadgeTh.trim(),
        mapSectionTitle: mapTitleLo.trim(),
        mapSectionTitleEn: mapTitleEn.trim(),
        mapSectionTitleTh: mapTitleTh.trim(),
        mapSectionDesc: mapDescLo.trim(),
        mapSectionDescEn: mapDescEn.trim(),
        mapSectionDescTh: mapDescTh.trim(),
        mapSectionButtonText: mapButtonLo.trim(),
        mapSectionButtonTextEn: mapButtonEn.trim(),
        mapSectionButtonTextTh: mapButtonTh.trim(),
        hideStoriesDesc,
        storiesBadgeText: storiesBadgeLo.trim(),
        storiesBadgeTextEn: storiesBadgeEn.trim(),
        storiesBadgeTextTh: storiesBadgeTh.trim(),
        storiesTitle: storiesTitleLo.trim(),
        storiesTitleEn: storiesTitleEn.trim(),
        storiesTitleTh: storiesTitleTh.trim(),
        storiesDesc: storiesDescLo.trim(),
        storiesDescEn: storiesDescEn.trim(),
        storiesDescTh: storiesDescTh.trim(),
        storiesButtonText: storiesButtonLo.trim(),
        storiesButtonTextEn: storiesButtonEn.trim(),
        storiesButtonTextTh: storiesButtonTh.trim(),
      };
      onSavePoster(draft).catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, [
    hideMapSectionDesc,
    mapBadgeLo,
    mapBadgeEn,
    mapBadgeTh,
    mapTitleLo,
    mapTitleEn,
    mapTitleTh,
    mapDescLo,
    mapDescEn,
    mapDescTh,
    mapButtonLo,
    mapButtonEn,
    mapButtonTh,
    hideStoriesDesc,
    storiesBadgeLo,
    storiesBadgeEn,
    storiesBadgeTh,
    storiesTitleLo,
    storiesTitleEn,
    storiesTitleTh,
    storiesDescLo,
    storiesDescEn,
    storiesDescTh,
    storiesButtonLo,
    storiesButtonEn,
    storiesButtonTh,
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updated: HomePoster = {
        title: homePoster?.title || 'HOPE BOKEO',
        subtitle: homePoster?.subtitle || '',
        description: homePoster?.description || '',
        imageUrl: homePoster?.imageUrl || '',
        ...(homePoster || {}),
        // Map / Communities Section
        hideMapSectionDesc,
        mapSectionBadge: mapBadgeLo.trim(),
        mapSectionBadgeEn: mapBadgeEn.trim(),
        mapSectionBadgeTh: mapBadgeTh.trim(),
        mapSectionTitle: mapTitleLo.trim(),
        mapSectionTitleEn: mapTitleEn.trim(),
        mapSectionTitleTh: mapTitleTh.trim(),
        mapSectionDesc: mapDescLo.trim(),
        mapSectionDescEn: mapDescEn.trim(),
        mapSectionDescTh: mapDescTh.trim(),
        mapSectionButtonText: mapButtonLo.trim(),
        mapSectionButtonTextEn: mapButtonEn.trim(),
        mapSectionButtonTextTh: mapButtonTh.trim(),

        // Stories Section
        hideStoriesDesc,
        storiesBadgeText: storiesBadgeLo.trim(),
        storiesBadgeTextEn: storiesBadgeEn.trim(),
        storiesBadgeTextTh: storiesBadgeTh.trim(),
        storiesTitle: storiesTitleLo.trim(),
        storiesTitleEn: storiesTitleEn.trim(),
        storiesTitleTh: storiesTitleTh.trim(),
        storiesDesc: storiesDescLo.trim(),
        storiesDescEn: storiesDescEn.trim(),
        storiesDescTh: storiesDescTh.trim(),
        storiesButtonText: storiesButtonLo.trim(),
        storiesButtonTextEn: storiesButtonEn.trim(),
        storiesButtonTextTh: storiesButtonTh.trim(),
      };

      await onSavePoster(updated);
      showToast(
        language === 'lo'
          ? 'ບັນທຶກຂໍ້ຄວາມ Communities & ເລື່ອງລາວ ສຳເລັດແລ້ວ!'
          : 'Saved Communities & Stories settings successfully!'
      );
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      showToast(
        language === 'lo'
          ? 'ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ: ' + (err?.message || 'ບໍ່ຮູ້ສາເຫດ')
          : 'Failed to save: ' + (err?.message || 'Unknown error')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const confirmReset = window.confirm(
      language === 'lo'
        ? 'ທ່ານຕ້ອງການຣີເຊັດຂໍ້ຄວາມທັງໝົດເປັນຄ່າເລີ່ມຕົ້ນແທ້ບໍ?'
        : 'Are you sure you want to reset all text fields to their defaults?'
    );
    if (!confirmReset) return;

    // Reset Map Section
    setHideMapSectionDesc(false);
    setMapBadgeLo('WHERE GOD IS WORKING');
    setMapBadgeEn('WHERE GOD IS WORKING');
    setMapBadgeTh('WHERE GOD IS WORKING');
    setMapTitleLo('Communities, Churches.\nLasting Change.');
    setMapTitleEn('Communities, Churches.\nLasting Change.');
    setMapTitleTh('Communities, Churches.\nLasting Change.');
    setMapDescLo(
      'ຈາກການປະກາດຂ່າວປະເສີດໃນໝູ່ບ້ານສູ່ການບຸກເບີກຄຣິດຕະຈັກ, ພຣະເຈົ້າກຳລັງເຄື່ອນໄຫວທົ່ວແຂວງບໍ່ແກ້ວ. ສຳຫຼວດສະຖານທີ່, ຜູ້ຄົນ ແລະ ພັນທະກິດທີ່ສ້າງຄວາມແຕກຕ່າງ.'
    );
    setMapDescEn(
      'From village evangelism to church planting, God is at work across Bokeo Province. Explore the places, people and ministries making a difference.'
    );
    setMapDescTh(
      'จากการประกาศข่าวประเสริฐในหมู่บ้านสู่การบุกเบิกคริสตจักร พระเจ้ากำลังเคลื่อนไหวทั่วแขวงบ่อแก้ว สำรวจสถานที่ ผู้คน และพันธกิจที่สร้างความเปลี่ยนแปลง'
    );
    setMapButtonLo('ເບິ່ງສະຖານທີ່ທັງໝົດ');
    setMapButtonEn('View All Locations');
    setMapButtonTh('ดูสถานที่ทั้งหมด');

    // Reset Stories Section
    setHideStoriesDesc(false);
    setStoriesBadgeLo('ເລື່ອງລາວຈາກພາກສະໜາມ');
    setStoriesBadgeEn('STORIES FROM THE FIELD');
    setStoriesBadgeTh('เรื่องราวจากภาคสนาม');
    setStoriesTitleLo('Real People. Real Hope.');
    setStoriesTitleEn('Real People. Real Hope.');
    setStoriesTitleTh('Real People. Real Hope.');
    setStoriesDescLo(
      'ທຸກໆເລື່ອງລາວເປັນສິ່ງເຕືອນໃຈວ່າ ພຣະເຈົ້າກຳລັງເຄື່ອນໄຫວໃນບໍ່ແກ້ວ — ໃນຊີວິດຂອງເດັກນ້ອຍ, ຄອບຄົວ ແລະ ຊຸມຊົນທັງໝົດ.'
    );
    setStoriesDescEn(
      'Every story is a reminder that God is moving in Bokeo — in the lives of children, families and entire communities.'
    );
    setStoriesDescTh(
      'ทุกๆ เรื่องราวคือเครื่องเตือนใจว่าพระเจ้ากำลังเคลื่อนไหวในบ่อแก้ว — ในชีวิตของเด็กๆ ครอบครัว และชุมชนทั้งหมด'
    );
    setStoriesButtonLo('ເບິ່ງເລື່ອງລາວທັງໝົດ');
    setStoriesButtonEn('View All Stories');
    setStoriesButtonTh('ดูเรื่องราวทั้งหมด');

    showToast(
      language === 'lo'
        ? 'ຣີເຊັດເປັນຄ່າເລີ່ມຕົ້ນແລ້ວ (ກະລຸນາກົດປຸ່ມບັນທຶກເພື່ອຢືນຢັນ)'
        : 'Reset to defaults (click Save Changes to apply)'
    );
  };

  // Preview current values according to active language tab
  const currentMapBadge =
    activeLangTab === 'lo' ? mapBadgeLo : activeLangTab === 'th' ? mapBadgeTh : mapBadgeEn;
  const currentMapTitle =
    activeLangTab === 'lo' ? mapTitleLo : activeLangTab === 'th' ? mapTitleTh : mapTitleEn;
  const currentMapDesc =
    activeLangTab === 'lo' ? mapDescLo : activeLangTab === 'th' ? mapDescTh : mapDescEn;
  const currentMapButton =
    activeLangTab === 'lo' ? mapButtonLo : activeLangTab === 'th' ? mapButtonTh : mapButtonEn;

  const currentStoriesBadge =
    activeLangTab === 'lo'
      ? storiesBadgeLo
      : activeLangTab === 'th'
      ? storiesBadgeTh
      : storiesBadgeEn;
  const currentStoriesTitle =
    activeLangTab === 'lo'
      ? storiesTitleLo
      : activeLangTab === 'th'
      ? storiesTitleTh
      : storiesTitleEn;
  const currentStoriesDesc =
    activeLangTab === 'lo'
      ? storiesDescLo
      : activeLangTab === 'th'
      ? storiesDescTh
      : storiesDescEn;
  const currentStoriesButton =
    activeLangTab === 'lo'
      ? storiesButtonLo
      : activeLangTab === 'th'
      ? storiesButtonTh
      : storiesButtonEn;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-7 shadow-sm space-y-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/80 text-[#ee1c25] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-800 dark:text-white">
              {language === 'lo'
                ? '📍 ຕັ້ງຄ່າຂໍ້ຄວາມ Communities, Churches & ເລື່ອງລາວພາກສະໜາມ'
                : 'Communities, Churches & Field Stories Text Settings'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 pl-10.5">
            {language === 'lo'
              ? 'ແກ້ໄຂຫົວຂໍ້, ຂໍ້ຄວາມບັນຍາຍ, ແລະ ປຸ່ມຕ່າງໆ ຕາມແຕ່ລະປະເພດຢ່າງສະດວກ'
              : 'Customize headings, descriptions, and action buttons categorized cleanly.'}
          </p>
        </div>
      </div>

      {/* Language Switcher Tabs */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center gap-1 max-w-md">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase px-3 flex items-center gap-1.5 shrink-0">
          <Globe className="w-3.5 h-3.5 text-red-500" />
          <span>{language === 'lo' ? 'ແກ້ໄຂພາສາ:' : 'Language:'}</span>
        </span>
        <button
          type="button"
          onClick={() => setActiveLangTab('lo')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center cursor-pointer ${
            activeLangTab === 'lo'
              ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          🇱🇦 ພາສາລາວ
        </button>
        <button
          type="button"
          onClick={() => setActiveLangTab('en')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center cursor-pointer ${
            activeLangTab === 'en'
              ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          🇬🇧 English
        </button>
        <button
          type="button"
          onClick={() => setActiveLangTab('th')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center cursor-pointer ${
            activeLangTab === 'th'
              ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          🇹🇭 ภาษาไทย
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. Category 1: "Communities, Churches. Lasting Change." (Map Section)    */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('map')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-[#cc0000] shrink-0" />
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {language === 'lo'
                ? '1. ຊຸມຊົນ ແລະ ຄຣິດຕະຈັກ - ພາກສ່ວນແຜນທີ່ (Communities, Churches. Lasting Change.)'
                : '1. Communities, Churches. Lasting Change. (Map Section)'}
            </h4>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('map') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('map') && (
        <div className="p-5 sm:p-6 pt-4 border-t border-slate-200/70 dark:border-slate-700/60 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Edit Form */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Badge / Kicker Text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>
                  {language === 'lo'
                    ? 'ຂໍ້ຄວາມປ້າຍດ້ານເທິງ (Sub-badge / Kicker)'
                    : 'Sub-badge / Kicker Text'}
                </span>
                <span className="text-[10px] text-red-500 uppercase font-mono font-semibold">
                  {activeLangTab.toUpperCase()}
                </span>
              </label>
              <input
                type="text"
                value={
                  activeLangTab === 'lo'
                    ? mapBadgeLo
                    : activeLangTab === 'th'
                    ? mapBadgeTh
                    : mapBadgeEn
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeLangTab === 'lo') setMapBadgeLo(val);
                  else if (activeLangTab === 'th') setMapBadgeTh(val);
                  else setMapBadgeEn(val);
                }}
                placeholder="WHERE GOD IS WORKING"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
              />
            </div>

            {/* 2. Main Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>
                  {language === 'lo'
                    ? 'ຫົວຂໍ້ໃຫຍ່ (Main Title - ຮອງຮັບການຂຶ້ນແຖວໃໝ່)'
                    : 'Main Heading (Supports line breaks)'}
                </span>
                <span className="text-[10px] text-red-500 uppercase font-mono font-semibold">
                  {activeLangTab.toUpperCase()}
                </span>
              </label>
              <textarea
                rows={2}
                value={
                  activeLangTab === 'lo'
                    ? mapTitleLo
                    : activeLangTab === 'th'
                    ? mapTitleTh
                    : mapTitleEn
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeLangTab === 'lo') setMapTitleLo(val);
                  else if (activeLangTab === 'th') setMapTitleTh(val);
                  else setMapTitleEn(val);
                }}
                placeholder="Communities, Churches.&#10;Lasting Change."
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-medium resize-y"
              />
            </div>

            {/* 3. Description Paragraph */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'lo'
                    ? 'ຂໍ້ຄວາມບັນຍາຍ (Description Paragraph)'
                    : 'Description Paragraph'}
                </label>
                <button
                  type="button"
                  onClick={() => setHideMapSectionDesc(!hideMapSectionDesc)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    hideMapSectionDesc
                      ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                  }`}
                >
                  {hideMapSectionDesc ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                      <span>{language === 'lo' ? 'ເຊື່ອງຂໍ້ຄວາມບັນຍາຍ' : 'Description Hidden'}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{language === 'lo' ? 'ສະແດງຂໍ້ຄວາມບັນຍາຍ' : 'Description Visible'}</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                rows={3}
                value={
                  activeLangTab === 'lo'
                    ? mapDescLo
                    : activeLangTab === 'th'
                    ? mapDescTh
                    : mapDescEn
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeLangTab === 'lo') setMapDescLo(val);
                  else if (activeLangTab === 'th') setMapDescTh(val);
                  else setMapDescEn(val);
                }}
                placeholder="From village evangelism to church planting, God is at work across Bokeo Province..."
                className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-normal leading-relaxed resize-y ${
                  hideMapSectionDesc
                    ? 'border-dashed border-amber-300 dark:border-amber-800/60 opacity-60'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
            </div>

            {/* 4. Button Text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>
                  {language === 'lo'
                    ? 'ຂໍ້ຄວາມປຸ່ມກົດ (Action Button Text)'
                    : 'Action Button Text'}
                </span>
                <span className="text-[10px] text-red-500 uppercase font-mono font-semibold">
                  {activeLangTab.toUpperCase()}
                </span>
              </label>
              <input
                type="text"
                value={
                  activeLangTab === 'lo'
                    ? mapButtonLo
                    : activeLangTab === 'th'
                    ? mapButtonTh
                    : mapButtonEn
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeLangTab === 'lo') setMapButtonLo(val);
                  else if (activeLangTab === 'th') setMapButtonTh(val);
                  else setMapButtonEn(val);
                }}
                placeholder="View All Locations"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
              />
            </div>
          </div>

          {/* Live Preview Box (Looks exactly like image 1) */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'lo' ? 'ຕົວຢ່າງການສະແດງຜົນ (Live Preview)' : 'Live Preview'}</span>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="inline-flex items-center gap-1.5 text-[#ee1c25] text-xs font-black tracking-widest uppercase">
                <MapPin className="w-3.5 h-3.5 text-[#ee1c25] fill-[#ee1c25]/20 shrink-0" />
                <span>{currentMapBadge || 'WHERE GOD IS WORKING'}</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight whitespace-pre-line">
                {currentMapTitle || 'Communities, Churches.\nLasting Change.'}
              </h3>

              {!hideMapSectionDesc && currentMapDesc ? (
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                  {currentMapDesc}
                </p>
              ) : hideMapSectionDesc ? (
                <div className="py-2 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[11px] border border-amber-200 dark:border-amber-900/40 italic">
                  ({language === 'lo' ? 'ຂໍ້ຄວາມບັນຍາຍຖືກເຊື່ອງໄວ້ຕາມການຕັ້ງຄ່າ' : 'Description is currently hidden'})
                </div>
              ) : null}

              <div className="pt-1">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-red-500/80 bg-white dark:bg-slate-900 text-[#cc0000] dark:text-red-400 text-xs font-bold shadow-2xs">
                  <span>{currentMapButton || 'View All Locations'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Inner Save Action Bar for Section 1 */}
          <div className="lg:col-span-12 pt-4 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'lo' ? 'ຣີເຊັດເປັນຄ່າເລີ່ມຕົ້ນ' : 'Reset to Defaults'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#cc0000] hover:bg-[#b30000] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSaving
                  ? language === 'lo'
                    ? 'ກຳລັງບັນທຶກ...'
                    : 'Saving...'
                  : language === 'lo'
                  ? 'ບັນທຶກການຕັ້ງຄ່າ'
                  : 'Save Changes'}
              </span>
            </button>
          </div>
        </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. Category 2: "STORIES FROM THE FIELD" (Real People. Real Hope.)         */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('stories')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#cc0000] shrink-0" />
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {language === 'lo'
                ? '2. ເລື່ອງລາວຈາກພາກສະໜາມ (Real People. Real Hope. - Stories from the Field)'
                : '2. Real People. Real Hope. (Stories from the Field)'}
            </h4>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('stories') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('stories') && (
        <div className="p-5 sm:p-6 pt-4 border-t border-slate-200/70 dark:border-slate-700/60 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Edit Form */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Badge / Kicker Text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>
                  {language === 'lo'
                    ? 'ຂໍ້ຄວາມປ້າຍດ້ານເທິງ (Sub-badge / Kicker)'
                    : 'Sub-badge / Kicker Text'}
                </span>
                <span className="text-[10px] text-red-500 uppercase font-mono font-semibold">
                  {activeLangTab.toUpperCase()}
                </span>
              </label>
              <input
                type="text"
                value={
                  activeLangTab === 'lo'
                    ? storiesBadgeLo
                    : activeLangTab === 'th'
                    ? storiesBadgeTh
                    : storiesBadgeEn
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeLangTab === 'lo') setStoriesBadgeLo(val);
                  else if (activeLangTab === 'th') setStoriesBadgeTh(val);
                  else setStoriesBadgeEn(val);
                }}
                placeholder="STORIES FROM THE FIELD"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
              />
            </div>

            {/* 2. Main Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>
                  {language === 'lo'
                    ? 'ຫົວຂໍ້ໃຫຍ່ (Main Title)'
                    : 'Main Heading'}
                </span>
                <span className="text-[10px] text-red-500 uppercase font-mono font-semibold">
                  {activeLangTab.toUpperCase()}
                </span>
              </label>
              <input
                type="text"
                value={
                  activeLangTab === 'lo'
                    ? storiesTitleLo
                    : activeLangTab === 'th'
                    ? storiesTitleTh
                    : storiesTitleEn
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeLangTab === 'lo') setStoriesTitleLo(val);
                  else if (activeLangTab === 'th') setStoriesTitleTh(val);
                  else setStoriesTitleEn(val);
                }}
                placeholder="Real People. Real Hope."
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-medium"
              />
            </div>

            {/* 3. Description Paragraph */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'lo'
                    ? 'ຂໍ້ຄວາມບັນຍາຍ (Description Paragraph)'
                    : 'Description Paragraph'}
                </label>
                <button
                  type="button"
                  onClick={() => setHideStoriesDesc(!hideStoriesDesc)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    hideStoriesDesc
                      ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                  }`}
                >
                  {hideStoriesDesc ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                      <span>{language === 'lo' ? 'ເຊື່ອງຂໍ້ຄວາມບັນຍາຍ' : 'Description Hidden'}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{language === 'lo' ? 'ສະແດງຂໍ້ຄວາມບັນຍາຍ' : 'Description Visible'}</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                rows={3}
                value={
                  activeLangTab === 'lo'
                    ? storiesDescLo
                    : activeLangTab === 'th'
                    ? storiesDescTh
                    : storiesDescEn
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeLangTab === 'lo') setStoriesDescLo(val);
                  else if (activeLangTab === 'th') setStoriesDescTh(val);
                  else setStoriesDescEn(val);
                }}
                placeholder="Every story is a reminder that God is moving in Bokeo..."
                className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-normal leading-relaxed resize-y ${
                  hideStoriesDesc
                    ? 'border-dashed border-amber-300 dark:border-amber-800/60 opacity-60'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
            </div>

          </div>

          {/* Live Preview Box */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'lo' ? 'ຕົວຢ່າງການສະແດງຜົນ (Live Preview)' : 'Live Preview'}</span>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="text-[#ee1c25] text-xs font-black tracking-widest uppercase">
                {currentStoriesBadge || 'STORIES FROM THE FIELD'}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {currentStoriesTitle || 'Real People. Real Hope.'}
              </h3>

              {!hideStoriesDesc && currentStoriesDesc ? (
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                  {currentStoriesDesc}
                </p>
              ) : hideStoriesDesc ? (
                <div className="py-2 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[11px] border border-amber-200 dark:border-amber-900/40 italic">
                  ({language === 'lo' ? 'ຂໍ້ຄວາມບັນຍາຍຖືກເຊື່ອງໄວ້ຕາມການຕັ້ງຄ່າ' : 'Description is currently hidden'})
                </div>
              ) : null}
            </div>
          </div>

          {/* Inner Save Action Bar for Section 2 */}
          <div className="lg:col-span-12 pt-4 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'lo' ? 'ຣີເຊັດເປັນຄ່າເລີ່ມຕົ້ນ' : 'Reset to Defaults'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#cc0000] hover:bg-[#b30000] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSaving
                  ? language === 'lo'
                    ? 'ກຳລັງບັນທຶກ...'
                    : 'Saving...'
                  : language === 'lo'
                  ? 'ບັນທຶກການຕັ້ງຄ່າ'
                  : 'Save Changes'}
              </span>
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

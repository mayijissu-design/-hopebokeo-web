import React, { useState, useRef } from 'react';
import {
  Compass,
  Image as ImageIcon,
  Save,
  Eye,
  EyeOff,
  Sparkles,
  Trash2,
  Crosshair,
  ZoomIn,
  Move,
  RotateCcw,
  ChevronDown,
  BookOpen,
  Type,
  Users,
} from 'lucide-react';
import { UnifiedMediaUploader } from './UnifiedMediaUploader';
import { RichTextEditor } from './RichTextEditor';
import { Language, MinistryTimelineItem } from '../types';
import { MinistryTimelineManager } from './MinistryTimelineManager';

interface AboutPosterSettingsSectionProps {
  language: Language;
  // Top Hero Poster Image & Visibility
  aboutHeroImageUrl?: string;
  setAboutHeroImageUrl?: (url: string) => void;
  hideAboutHeroPoster?: boolean;
  setHideAboutHeroPoster?: (hide: boolean) => void;
  // Top Hero Poster Badge & Scripture Verse
  aboutHeroBadge?: string;
  setAboutHeroBadge?: (val: string) => void;
  aboutHeroBadgeEn?: string;
  setAboutHeroBadgeEn?: (val: string) => void;
  aboutHeroBadgeTh?: string;
  setAboutHeroBadgeTh?: (val: string) => void;
  aboutHeroVerse?: string;
  setAboutHeroVerse?: (val: string) => void;
  aboutHeroVerseEn?: string;
  setAboutHeroVerseEn?: (val: string) => void;
  aboutHeroVerseTh?: string;
  setAboutHeroVerseTh?: (val: string) => void;
  aboutHeroVerseRef?: string;
  setAboutHeroVerseRef?: (val: string) => void;
  aboutHeroVerseRefEn?: string;
  setAboutHeroVerseRefEn?: (val: string) => void;
  aboutHeroVerseRefTh?: string;
  setAboutHeroVerseRefTh?: (val: string) => void;
  // Top Hero Main Title (HOPE BOKEO)
  posterBokeoTitle: string;
  setPosterBokeoTitle: (title: string) => void;
  posterBokeoTitleEn: string;
  setPosterBokeoTitleEn: (title: string) => void;
  posterBokeoTitleTh: string;
  setPosterBokeoTitleTh: (title: string) => void;
  // Top Hero Appearance & Focal Position
  bokeoPosterHeight?: number;
  setBokeoPosterHeight?: (val: number) => void;
  bokeoPosterOverlayOpacity?: number;
  setBokeoPosterOverlayOpacity?: (val: number) => void;
  bokeoPosterEdgeFade?: number;
  setBokeoPosterEdgeFade?: (val: number) => void;
  bokeoPosterDim?: number;
  setBokeoPosterDim?: (val: number) => void;
  bokeoPosterScale?: number;
  setBokeoPosterScale?: (val: number) => void;
  bokeoPosterPosition?: string;
  setBokeoPosterPosition?: (val: string) => void;
  bokeoPosterFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  setBokeoPosterFit?: (val: 'cover' | 'contain' | 'fill' | 'scale-down') => void;
  // "Who We Are" Section Image & Content
  posterBokeoImageUrl: string;
  setPosterBokeoImageUrl: (url: string) => void;
  aboutWhoWeArePosition?: string;
  setAboutWhoWeArePosition?: (val: string) => void;
  aboutWhoWeAreScale?: number;
  setAboutWhoWeAreScale?: (val: number) => void;
  aboutWhoWeAreFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  setAboutWhoWeAreFit?: (val: 'cover' | 'contain' | 'fill' | 'scale-down') => void;
  aboutWhoWeAreBadge?: string;
  setAboutWhoWeAreBadge?: (val: string) => void;
  aboutWhoWeAreBadgeEn?: string;
  setAboutWhoWeAreBadgeEn?: (val: string) => void;
  aboutWhoWeAreBadgeTh?: string;
  setAboutWhoWeAreBadgeTh?: (val: string) => void;
  aboutWhoWeAreTitle?: string;
  setAboutWhoWeAreTitle?: (val: string) => void;
  aboutWhoWeAreTitleEn?: string;
  setAboutWhoWeAreTitleEn?: (val: string) => void;
  aboutWhoWeAreTitleTh?: string;
  setAboutWhoWeAreTitleTh?: (val: string) => void;
  posterBokeoDesc: string;
  setPosterBokeoDesc: (desc: string) => void;
  posterBokeoDescEn: string;
  setPosterBokeoDescEn: (desc: string) => void;
  posterBokeoDescTh: string;
  setPosterBokeoDescTh: (desc: string) => void;
  hideBokeoSection: boolean;
  setHideBokeoSection: (hide: boolean) => void;
  // Ministry Timeline props
  bokeoTimeline?: MinistryTimelineItem[];
  setBokeoTimeline?: (items: MinistryTimelineItem[]) => void;
  bokeoTimelineTitle?: string;
  setBokeoTimelineTitle?: (val: string) => void;
  bokeoTimelineTitleEn?: string;
  setBokeoTimelineTitleEn?: (val: string) => void;
  bokeoTimelineTitleTh?: string;
  setBokeoTimelineTitleTh?: (val: string) => void;
  hideBokeoTimeline?: boolean;
  setHideBokeoTimeline?: (val: boolean) => void;
  // Vision & Mission props
  vision?: string;
  setVision?: (val: string) => void;
  visionEn?: string;
  setVisionEn?: (val: string) => void;
  visionTh?: string;
  setVisionTh?: (val: string) => void;
  mission?: string;
  setMission?: (val: string) => void;
  missionEn?: string;
  setMissionEn?: (val: string) => void;
  missionTh?: string;
  setMissionTh?: (val: string) => void;
  hideVisionMission?: boolean;
  setHideVisionMission?: (val: boolean) => void;
  isSaving: boolean;
  onSave: () => void;
}

const DEFAULT_ABOUT_HERO_IMAGE =
  '/uploads/d1ff2c16-9f00-4563-a7e3-a34ec0649a7f_1788761811029_129.jpg';

const DEFAULT_WHO_WE_ARE_IMAGE =
  '/uploads/416848893_1441279663411460_5205317115984311446_n__1__jpg_1788632235891_514.jpg';

const SAMPLE_HERO_POSTERS = [
  {
    name: 'Default About Hero',
    url: DEFAULT_ABOUT_HERO_IMAGE,
  },
  {
    name: 'Hope Community',
    url: DEFAULT_WHO_WE_ARE_IMAGE,
  },
  {
    name: 'Bokeo Landscape',
    url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1600',
  },
  {
    name: 'Hands of Hope',
    url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=1600',
  },
];

export const AboutPosterSettingsSection: React.FC<AboutPosterSettingsSectionProps> = ({
  language,
  aboutHeroImageUrl = '',
  setAboutHeroImageUrl,
  hideAboutHeroPoster = false,
  setHideAboutHeroPoster,
  aboutHeroBadge = 'ກ່ຽວກັບພວກເຮົາ',
  setAboutHeroBadge,
  aboutHeroBadgeEn = 'ABOUT US',
  setAboutHeroBadgeEn,
  aboutHeroBadgeTh = 'เกี่ยวกับเรา',
  setAboutHeroBadgeTh,
  aboutHeroVerse = '“ຈົ່ງໃຫ້ຄວາມສະຫວ່າງຂອງພວກເຈົ້າສ່ອງແຈ້ງຕໍ່ໜ້າຄົນທັງປວງ ເພື່ອເຂົາຈະໄດ້ເຫັນການດີຂອງພວກເຈົ້າ ແລະ ສັນລະເສີນພຣະບິດາຂອງພວກເຈົ້າຜູ້ຊົງສະຖິດຢູ່ໃນສະຫວັນ.”',
  setAboutHeroVerse,
  aboutHeroVerseEn = '“Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.”',
  setAboutHeroVerseEn,
  aboutHeroVerseTh = '“พวกท่านจงส่องสว่างแก่คนทั้งปวง เพื่อว่าเมื่อเขาทั้งหลายได้เห็นความดีที่ท่านทำ พวกเขาจะได้สรรเสริญพระบิดาของท่านผู้สถิตในสวรรค์”',
  setAboutHeroVerseTh,
  aboutHeroVerseRef = 'ມັດທາຍ 5:16',
  setAboutHeroVerseRef,
  aboutHeroVerseRefEn = 'Matthew 5:16',
  setAboutHeroVerseRefEn,
  aboutHeroVerseRefTh = 'มัทธิว 5:16',
  setAboutHeroVerseRefTh,
  posterBokeoTitle,
  setPosterBokeoTitle,
  posterBokeoTitleEn,
  setPosterBokeoTitleEn,
  posterBokeoTitleTh,
  setPosterBokeoTitleTh,
  bokeoPosterHeight = 50,
  setBokeoPosterHeight,
  bokeoPosterOverlayOpacity = 70,
  setBokeoPosterOverlayOpacity,
  bokeoPosterEdgeFade = 0,
  setBokeoPosterEdgeFade,
  bokeoPosterDim = 25,
  setBokeoPosterDim,
  bokeoPosterScale = 100,
  setBokeoPosterScale,
  bokeoPosterPosition = '50% 50%',
  setBokeoPosterPosition,
  bokeoPosterFit = 'cover',
  setBokeoPosterFit,
  posterBokeoImageUrl,
  setPosterBokeoImageUrl,
  aboutWhoWeArePosition = '50% 50%',
  setAboutWhoWeArePosition,
  aboutWhoWeAreScale = 100,
  setAboutWhoWeAreScale,
  aboutWhoWeAreFit = 'cover',
  setAboutWhoWeAreFit,
  aboutWhoWeAreBadge = 'ພວກເຮົາແມ່ນໃຜ',
  setAboutWhoWeAreBadge,
  aboutWhoWeAreBadgeEn = 'WHO WE ARE',
  setAboutWhoWeAreBadgeEn,
  aboutWhoWeAreBadgeTh = 'พวกเราคือใคร',
  setAboutWhoWeAreBadgeTh,
  aboutWhoWeAreTitle = 'ຊຸມຊົນທ້ອງຖິ່ນ, ພາລະກິດລະດັບໂລກ',
  setAboutWhoWeAreTitle,
  aboutWhoWeAreTitleEn = 'A Local Community, A Global Purpose',
  setAboutWhoWeAreTitleEn,
  aboutWhoWeAreTitleTh = 'ชุมชนท้องถิ่น พันธกิจระดับโลก',
  setAboutWhoWeAreTitleTh,
  posterBokeoDesc,
  setPosterBokeoDesc,
  posterBokeoDescEn,
  setPosterBokeoDescEn,
  posterBokeoDescTh,
  setPosterBokeoDescTh,
  hideBokeoSection,
  setHideBokeoSection,
  bokeoTimeline = [],
  setBokeoTimeline,
  bokeoTimelineTitle,
  setBokeoTimelineTitle,
  bokeoTimelineTitleEn,
  setBokeoTimelineTitleEn,
  bokeoTimelineTitleTh,
  setBokeoTimelineTitleTh,
  hideBokeoTimeline = false,
  setHideBokeoTimeline,
  vision = '',
  setVision,
  visionEn = '',
  setVisionEn,
  visionTh = '',
  setVisionTh,
  mission = '',
  setMission,
  missionEn = '',
  setMissionEn,
  missionTh = '',
  setMissionTh,
  hideVisionMission = false,
  setHideVisionMission,
  isSaving,
  onSave,
}) => {
  const [activeLangTab, setActiveLangTab] = useState<'lo' | 'en' | 'th'>(
    language === 'en' ? 'en' : language === 'th' ? 'th' : 'lo'
  );
  const [visionLang, setVisionLang] = useState<'la' | 'tha' | 'en'>(
    language === 'en' ? 'en' : language === 'th' ? 'tha' : 'la'
  );
  const [missionLang, setMissionLang] = useState<'la' | 'tha' | 'en'>(
    language === 'en' ? 'en' : language === 'th' ? 'tha' : 'la'
  );
  const [isDraggingHero, setIsDraggingHero] = useState(false);
  const [isDraggingWhoWeAre, setIsDraggingWhoWeAre] = useState(false);
  // Open Section 1 (Hero Poster Image) and Section 3 (Hero Poster Text) by default so user sees it right away
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    hero_cover: true,
    hero_text: true,
  });

  const heroPreviewRef = useRef<HTMLDivElement>(null);
  const whoWeArePreviewRef = useRef<HTMLDivElement>(null);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const isOpen = (key: string) => Boolean(openSections[key]);

  // Focal Point Drag for Top Hero Banner
  const updateHeroFocalPoint = (clientX: number, clientY: number) => {
    if (!heroPreviewRef.current || !setBokeoPosterPosition) return;
    const rect = heroPreviewRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPercent = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setBokeoPosterPosition(`${Math.round(xPercent)}% ${Math.round(yPercent)}%`);
  };

  const handleHeroPointerDown = (e: React.PointerEvent) => {
    setIsDraggingHero(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateHeroFocalPoint(e.clientX, e.clientY);
  };

  const handleHeroPointerMove = (e: React.PointerEvent) => {
    if (isDraggingHero) {
      updateHeroFocalPoint(e.clientX, e.clientY);
    }
  };

  const handleHeroPointerUp = () => {
    setIsDraggingHero(false);
  };

  // Focal Point Drag for "Who We Are" Image
  const updateWhoWeAreFocalPoint = (clientX: number, clientY: number) => {
    if (!whoWeArePreviewRef.current || !setAboutWhoWeArePosition) return;
    const rect = whoWeArePreviewRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPercent = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setAboutWhoWeArePosition(`${Math.round(xPercent)}% ${Math.round(yPercent)}%`);
  };

  const handleWhoWeArePointerDown = (e: React.PointerEvent) => {
    setIsDraggingWhoWeAre(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateWhoWeAreFocalPoint(e.clientX, e.clientY);
  };

  const handleWhoWeArePointerMove = (e: React.PointerEvent) => {
    if (isDraggingWhoWeAre) {
      updateWhoWeAreFocalPoint(e.clientX, e.clientY);
    }
  };

  const handleWhoWeArePointerUp = () => {
    setIsDraggingWhoWeAre(false);
  };

  const currentHeroBadge =
    activeLangTab === 'en'
      ? aboutHeroBadgeEn
      : activeLangTab === 'th'
      ? aboutHeroBadgeTh
      : aboutHeroBadge;

  const currentHeroTitle =
    activeLangTab === 'en'
      ? posterBokeoTitleEn
      : activeLangTab === 'th'
      ? posterBokeoTitleTh
      : posterBokeoTitle;

  const currentHeroVerse =
    activeLangTab === 'en'
      ? aboutHeroVerseEn
      : activeLangTab === 'th'
      ? aboutHeroVerseTh
      : aboutHeroVerse;

  const currentHeroVerseRef =
    activeLangTab === 'en'
      ? aboutHeroVerseRefEn
      : activeLangTab === 'th'
      ? aboutHeroVerseRefTh
      : aboutHeroVerseRef;

  const currentWhoWeAreDesc =
    activeLangTab === 'en'
      ? posterBokeoDescEn
      : activeLangTab === 'th'
      ? posterBokeoDescTh
      : posterBokeoDesc;

  const handleDescChange = (val: string) => {
    if (activeLangTab === 'en') setPosterBokeoDescEn(val);
    else if (activeLangTab === 'th') setPosterBokeoDescTh(val);
    else setPosterBokeoDesc(val);
  };

  const effectiveHeroPoster =
    aboutHeroImageUrl && aboutHeroImageUrl.trim() !== ''
      ? aboutHeroImageUrl
      : DEFAULT_ABOUT_HERO_IMAGE;

  const effectiveWhoWeAreImage =
    posterBokeoImageUrl && posterBokeoImageUrl.trim() !== ''
      ? posterBokeoImageUrl
      : DEFAULT_WHO_WE_ARE_IMAGE;

  const heroPosX = parseInt((bokeoPosterPosition.split(' ')[0] || '50%').replace('%', ''), 10) || 50;
  const heroPosY = parseInt((bokeoPosterPosition.split(' ')[1] || '50%').replace('%', ''), 10) || 50;

  return (
    <div id="about-poster-settings" className="space-y-3.5 animate-fade-in scroll-mt-24">
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#cc0000] font-black text-xs uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>
              {language === 'lo'
                ? 'ຕັ້ງຄ່າໜ້າກ່ຽວກັບພວກເຮົາ (About Us Tab)'
                : language === 'th'
                ? 'ตั้งค่าหน้าเกี่ยวกับเรา (About Us Tab)'
                : 'About Us Page & Poster Settings'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
              {language === 'lo'
                ? 'ໂພສເຕີດ້ານເທິງ & ເນື້ອຫາ HOPE BOKEO'
                : language === 'th'
                ? 'โปสเตอร์ด้านบน & ข้อมูล HOPE BOKEO'
                : 'About Us Hero Poster & Page Content'}
            </h2>
            <button
              type="button"
              onClick={() => setHideBokeoSection(!hideBokeoSection)}
              className={`p-2 transition rounded-xl flex items-center justify-center border shadow-xs cursor-pointer ${
                hideBokeoSection
                  ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
              title={
                hideBokeoSection
                  ? language === 'lo'
                    ? 'ປັດຈຸບັນຖືກເຊື່ອງໄວ້ (ກົດເພື່ອສະແດງ)'
                    : 'Currently hidden (Click to show)'
                  : language === 'lo'
                  ? 'ປັດຈຸບັນສະແດງຢູ່ (ກົດເພື່ອເຊື່ອງ)'
                  : 'Currently visible (Click to hide)'
              }
            >
              {hideBokeoSection ? (
                <EyeOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Eye className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'lo'
              ? 'ປ່ຽນຮູບໂພສເຕີໃຫຍ່ດ້ານເທິງສຸດຂອງໜ້າ About Us (HOPE BOKEO / ມັດທາຍ 5:16), ຮູບພາບພວກເຮົາແມ່ນໃຜ, ເສັ້ນທາງພັນທະກິດ ແລະ ວິໄສທັດ'
              : 'Customize the top Hero Poster banner (ABOUT US / HOPE BOKEO / Matthew 5:16), Who We Are photo, Timeline, and Vision & Mission.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
        >
          {isSaving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{language === 'lo' ? 'ບັນທຶກທັງໝົດ' : 'Save All Changes'}</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 1. TOP HERO POSTER IMAGE UPLOAD & LIVE PREVIEW                        */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('hero_cover')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-4 h-4 text-[#cc0000] shrink-0" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {language === 'lo'
                ? '1. ຮູບໂພສເຕີໃຫຍ່ດ້ານເທິງສຸດຂອງໜ້າ About Us & ຕົວຢ່າງການສະແດງຜົນ (Top Hero Poster Image)'
                : '1. Top Hero Poster Image & Live Preview (ABOUT US / HOPE BOKEO)'}
            </h3>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('hero_cover') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('hero_cover') && (
          <div className="p-5 sm:p-6 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {setHideAboutHeroPoster && (
                <button
                  type="button"
                  onClick={() => setHideAboutHeroPoster(!hideAboutHeroPoster)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                    hideAboutHeroPoster
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {hideAboutHeroPoster ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>
                        {language === 'lo'
                          ? 'ໂພສເຕີດ້ານເທິງຖືກເຊື່ອງຢູ່ (ກົດເພື່ອສະແດງ)'
                          : 'Top Hero Poster Hidden (Click to Show)'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>
                        {language === 'lo'
                          ? 'ກຳລັງສະແດງໂພສເຕີດ້ານເທິງ (ກົດເພື່ອເຊື່ອງ)'
                          : 'Top Hero Poster Visible'}
                      </span>
                    </>
                  )}
                </button>
              )}

              {aboutHeroImageUrl && setAboutHeroImageUrl && (
                <button
                  type="button"
                  onClick={() => setAboutHeroImageUrl('')}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {language === 'lo'
                      ? 'ລຶບຮູບທີ່ອັບໂຫຼດ (ກັບຄືນຮູບເດີມ)'
                      : 'Reset to Default Image'}
                  </span>
                </button>
              )}
            </div>

            {setAboutHeroImageUrl && (
              <UnifiedMediaUploader
                value={aboutHeroImageUrl}
                onChange={setAboutHeroImageUrl}
                language={language}
                acceptTypes="image/*"
                maxDimension={2560}
                maxStringLength={750000}
                label={
                  language === 'lo'
                    ? 'ອັບໂຫຼດໄຟລ໌ຮູບພາບຈາກເຄື່ອງ ຫຼື ວາງລິ້ງ URL ສຳລັບໂພສເຕີດ້ານເທິງ (Top Hero Poster):'
                    : 'Upload Image File or Paste URL for Top Hero Poster:'
                }
              />
            )}

            {/* Quick Sample Images */}
            {setAboutHeroImageUrl && (
              <div className="space-y-2">
                <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {language === 'lo'
                    ? 'ຫຼື ເລືອກຮູບພາບຕົວຢ່າງ (Sample Hero Posters):'
                    : 'Or select a sample hero poster image:'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SAMPLE_HERO_POSTERS.map((sample) => {
                    const isSelected = effectiveHeroPoster === sample.url;
                    return (
                      <button
                        key={sample.name}
                        type="button"
                        onClick={() =>
                          setAboutHeroImageUrl(
                            sample.url === DEFAULT_ABOUT_HERO_IMAGE ? '' : sample.url
                          )
                        }
                        className={`group relative h-16 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                          isSelected
                            ? 'border-[#cc0000] ring-2 ring-red-500/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={sample.url}
                          alt={sample.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/45 flex items-center justify-center p-1">
                          <span className="text-[10px] font-bold text-white text-center leading-tight">
                            {sample.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Realistic Preview matching AboutTab Top Hero Banner */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                    {language === 'lo'
                      ? 'ຕົວຢ່າງໂພສເຕີດ້ານເທິງເທິງເວັບໄຊ (Live Hero Banner Preview)'
                      : 'Live Top Hero Banner Preview'}
                  </h4>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {language === 'lo'
                    ? '✓ ແຕະ ຫຼື ລາກເທິງຮູບເພື່ອປັບຈຸດສູນກາງ'
                    : '✓ Click or drag on image to adjust focal point'}
                </span>
              </div>

              <div
                ref={heroPreviewRef}
                onPointerDown={handleHeroPointerDown}
                onPointerMove={handleHeroPointerMove}
                onPointerUp={handleHeroPointerUp}
                className="relative w-full overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 flex items-center shadow-inner transition-all select-none touch-none cursor-crosshair group rounded-xl"
                style={{
                  minHeight: `${Math.round(160 + (bokeoPosterHeight / 100) * 120)}px`,
                  ...(bokeoPosterEdgeFade > 0
                    ? {
                        WebkitMaskImage: `linear-gradient(to bottom, transparent 0px, black ${Math.round(
                          (bokeoPosterEdgeFade / 100) * 60
                        )}px, black 100%)`,
                        maskImage: `linear-gradient(to bottom, transparent 0px, black ${Math.round(
                          (bokeoPosterEdgeFade / 100) * 60
                        )}px, black 100%)`,
                      }
                    : {}),
                }}
              >
                <img
                  src={effectiveHeroPoster}
                  alt="About Hero Preview"
                  className="absolute inset-0 w-full h-full pointer-events-none select-none transition-all"
                  style={{
                    objectFit: bokeoPosterFit,
                    objectPosition: bokeoPosterPosition,
                    transformOrigin: bokeoPosterPosition,
                    transform: `scale(${bokeoPosterScale / 100})`,
                    filter: `brightness(${Math.max(20, 100 - bokeoPosterDim * 0.75)}%)`,
                  }}
                  referrerPolicy="no-referrer"
                />

                {/* Focal Center Target Indicator */}
                <div
                  className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-white bg-[#cc0000] shadow-2xl pointer-events-none flex items-center justify-center text-white ring-4 ring-red-500/40 z-30 transition-transform active:scale-125"
                  style={{
                    left: bokeoPosterPosition.split(' ')[0] || '50%',
                    top: bokeoPosterPosition.split(' ')[1] || '50%',
                  }}
                  title={language === 'lo' ? 'ຈຸດສູນກາງຮູບ' : 'Focal Center'}
                >
                  <Crosshair className="w-4 h-4 animate-pulse" />
                </div>

                {/* Position & Scale Badge */}
                <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-red-500/30 text-[10px] font-mono text-amber-300 shadow">
                  <span>📍 {bokeoPosterPosition}</span>
                  <span className="text-slate-500">•</span>
                  <span>🔍 {bokeoPosterScale}%</span>
                </div>

                <div
                  className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-slate-950/75 pointer-events-none transition-opacity"
                  style={{ opacity: Math.max(0.2, bokeoPosterOverlayOpacity / 100) }}
                />

                <div className="relative z-10 w-full px-5 py-6 sm:px-8 sm:py-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="space-y-2 max-w-xl">
                    <div>
                      <span className="inline-block text-white font-black text-xs uppercase tracking-wider border-b-2 border-[#ee1c25] pb-1">
                        {currentHeroBadge || 'ABOUT US'}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-black text-white drop-shadow-md tracking-tight leading-none uppercase">
                      {currentHeroTitle || 'HOPE BOKEO'}
                    </h2>
                  </div>

                  <div className="lg:max-w-xs border-l-[3px] border-amber-400 pl-3.5 py-1 space-y-1 text-white drop-shadow-sm">
                    <p className="text-xs leading-relaxed text-white/95 font-medium">
                      {currentHeroVerse}
                    </p>
                    <p className="text-[11px] font-bold text-white text-right">
                      {currentHeroVerseRef}
                    </p>
                  </div>
                </div>

                {/* Subtle wave bottom edge */}
                <div className="absolute -bottom-px left-0 right-0 w-full overflow-hidden leading-none pointer-events-none z-20">
                  <svg
                    viewBox="0 0 1440 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="relative block w-full h-2.5 sm:h-3 text-white dark:text-slate-800"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 0,14 C 180,22 360,22 540,13 C 660,6 800,6 920,13 C 1080,22 1280,22 1440,14 L 1440,24 L 0,24 Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                {isSaving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. TOP HERO POSTER APPEARANCE, HEIGHT & FOCAL POSITION                */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('bg_custom')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#cc0000] shrink-0" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {language === 'lo'
                ? '2. ປັບແຕ່ງຄວາມສູງ, ຄວາມມືດ ແລະ ຕຳແໜ່ງໂພສເຕີດ້ານເທິງ (Hero Poster Size & Position)'
                : '2. Top Hero Poster Size, Darkness & Focal Position'}
            </h3>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('bg_custom') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('bg_custom') && (
          <div className="p-5 sm:p-6 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Height Slider */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-[#cc0000]" />
                    <span>{language === 'lo' ? 'ຄວາມສູງໂພສເຕີ (Height):' : 'Poster Height:'}</span>
                  </span>
                  <span className="font-mono text-[#cc0000] text-xs font-bold">
                    {bokeoPosterHeight}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={bokeoPosterHeight}
                  onChange={(e) => setBokeoPosterHeight && setBokeoPosterHeight(Number(e.target.value))}
                  className="w-full accent-[#cc0000] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <button type="button" onClick={() => setBokeoPosterHeight && setBokeoPosterHeight(0)} className="hover:text-red-500 cursor-pointer">0% (ກະທັດຮັດ)</button>
                  <button type="button" onClick={() => setBokeoPosterHeight && setBokeoPosterHeight(50)} className="hover:text-red-500 cursor-pointer">50% (ມາດຕະຖານ)</button>
                  <button type="button" onClick={() => setBokeoPosterHeight && setBokeoPosterHeight(100)} className="hover:text-red-500 cursor-pointer">100% (ສູງສຸດ)</button>
                </div>
              </div>

              {/* Overlay Opacity Slider */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{language === 'lo' ? 'ຄວາມເຂັ້ມພື້ນຫຼັງຂໍ້ຄວາມ (Overlay):' : 'Overlay Opacity:'}</span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    {bokeoPosterOverlayOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={bokeoPosterOverlayOpacity}
                  onChange={(e) => setBokeoPosterOverlayOpacity && setBokeoPosterOverlayOpacity(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Edge Fade Slider */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>{language === 'lo' ? 'ຄວາມຈາງຂອບ (Edge Fade):' : 'Edge Fade:'}</span>
                  </span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 text-xs font-bold">
                    {bokeoPosterEdgeFade}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={bokeoPosterEdgeFade}
                  onChange={(e) => setBokeoPosterEdgeFade && setBokeoPosterEdgeFade(Number(e.target.value))}
                  className="w-full accent-purple-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Background Dim Slider */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span>{language === 'lo' ? 'ຄວາມມືດຮູບພື້ນຫຼັງ (Background Dim):' : 'Background Dim:'}</span>
                  </span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 text-xs font-bold">
                    {bokeoPosterDim}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={bokeoPosterDim}
                  onChange={(e) => setBokeoPosterDim && setBokeoPosterDim(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Zoom / Scale Slider */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-[#cc0000]" />
                    <span>{language === 'lo' ? 'ຂະຫຍາຍຮູບ / ຊູມ (Zoom & Scale):' : 'Zoom & Scale:'}</span>
                  </span>
                  <span className="font-mono text-[#cc0000] text-xs font-bold">
                    {bokeoPosterScale}%
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="250"
                  step="5"
                  value={bokeoPosterScale}
                  onChange={(e) => setBokeoPosterScale && setBokeoPosterScale(Number(e.target.value))}
                  className="w-full accent-[#cc0000] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Fit Mode & Reset */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>{language === 'lo' ? 'ຮູບແບບການປັບຮູບ (Fit Mode):' : 'Fit Mode:'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (setBokeoPosterPosition) setBokeoPosterPosition('50% 50%');
                      if (setBokeoPosterScale) setBokeoPosterScale(100);
                      if (setBokeoPosterFit) setBokeoPosterFit('cover');
                    }}
                    className="text-[10px] text-slate-500 hover:text-[#cc0000] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{language === 'lo' ? 'ຣີເຊັດ' : 'Reset'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {[
                    { id: 'cover', label: 'Cover' },
                    { id: 'contain', label: 'Contain' },
                    { id: 'fill', label: 'Fill' },
                    { id: 'scale-down', label: 'Scale' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setBokeoPosterFit && setBokeoPosterFit(m.id as any)}
                      className={`py-1 rounded text-[10px] font-bold transition border cursor-pointer ${
                        bokeoPosterFit === m.id
                          ? 'bg-[#cc0000] text-white border-[#cc0000]'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Horizontal & Vertical Sliders */}
            {setBokeoPosterPosition && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>{language === 'lo' ? 'ຕຳແໜ່ງແນວນອນ (Horizontal X):' : 'Horizontal (X):'}</span>
                    <span className="font-mono text-[#cc0000]">{heroPosX}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={heroPosX}
                    onChange={(e) => setBokeoPosterPosition(`${e.target.value}% ${heroPosY}%`)}
                    className="w-full accent-[#cc0000] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>{language === 'lo' ? 'ຕຳແໜ່ງແນວຕັ້ງ (Vertical Y):' : 'Vertical (Y):'}</span>
                    <span className="font-mono text-[#cc0000]">{heroPosY}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={heroPosY}
                    onChange={(e) => setBokeoPosterPosition(`${heroPosX}% ${e.target.value}%`)}
                    className="w-full accent-[#cc0000] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                {isSaving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. TOP HERO POSTER TEXT (BADGE, HOPE BOKEO TITLE & MATTHEW 5:16)      */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('hero_text')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-[#cc0000] shrink-0" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {language === 'lo'
                ? '3. ຂໍ້ຄວາມເທິງໂພສເຕີດ້ານເທິງ: ປ້າຍກຳກັບ, ຫົວຂໍ້ຫຼັກ & ຂໍ້ພຣະຄຳພີ (Hero Poster Text & Scripture)'
                : '3. Top Hero Poster Text: Badge, Main Title & Scripture Quote'}
            </h3>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('hero_text') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('hero_text') && (
          <div className="p-5 sm:p-6 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-5">
            {/* Language Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-[#cc0000]" />
                <span>
                  {language === 'lo' ? 'ເລືອກພາສາທີ່ຕ້ອງການແກ້ໄຂ:' : 'Select language to edit:'}
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'lo', label: 'ລາວ (LA)' },
                    { id: 'en', label: 'English (EN)' },
                    { id: 'th', label: 'ไทย (TH)' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveLangTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      activeLangTab === tab.id
                        ? 'bg-[#cc0000] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Side: Badge & Main Title */}
              <div className="space-y-4 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#cc0000]">
                  {language === 'lo'
                    ? 'ດ້ານຊ້າຍ: ປ້າຍກຳກັບ & ຫົວຂໍ້ໂພສເຕີ (Left Banner Heading)'
                    : 'Left Side: Badge & Main Title'}
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {activeLangTab === 'lo'
                      ? 'ປ້າຍກຳກັບດ້ານເທິງ (ພາສາລາວ):'
                      : activeLangTab === 'th'
                      ? 'ป้ายกำกับด้านบน (ภาษาไทย):'
                      : 'Top Subtitle Badge (English):'}
                  </label>
                  <input
                    type="text"
                    value={
                      activeLangTab === 'en'
                        ? aboutHeroBadgeEn
                        : activeLangTab === 'th'
                        ? aboutHeroBadgeTh
                        : aboutHeroBadge
                    }
                    onChange={(e) => {
                      if (activeLangTab === 'en' && setAboutHeroBadgeEn) setAboutHeroBadgeEn(e.target.value);
                      else if (activeLangTab === 'th' && setAboutHeroBadgeTh) setAboutHeroBadgeTh(e.target.value);
                      else if (setAboutHeroBadge) setAboutHeroBadge(e.target.value);
                    }}
                    placeholder={activeLangTab === 'en' ? 'ABOUT US' : activeLangTab === 'th' ? 'เกี่ยวกับเรา' : 'ກ່ຽວກັບພວກເຮົາ'}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {activeLangTab === 'lo'
                      ? 'ຫົວຂໍ້ຫຼັກໂພສເຕີ (ພາສາລາວ):'
                      : activeLangTab === 'th'
                      ? 'หัวข้อหลักโปสเตอร์ (ภาษาไทย):'
                      : 'Main Poster Title (English):'}
                  </label>
                  <input
                    type="text"
                    value={
                      activeLangTab === 'en'
                        ? posterBokeoTitleEn
                        : activeLangTab === 'th'
                        ? posterBokeoTitleTh
                        : posterBokeoTitle
                    }
                    onChange={(e) => {
                      if (activeLangTab === 'en') setPosterBokeoTitleEn(e.target.value);
                      else if (activeLangTab === 'th') setPosterBokeoTitleTh(e.target.value);
                      else setPosterBokeoTitle(e.target.value);
                    }}
                    placeholder="HOPE BOKEO"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]"
                  />
                </div>
              </div>

              {/* Right Side: Scripture Quote & Reference */}
              <div className="space-y-4 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {language === 'lo'
                    ? 'ດ້ານຂວາ: ຂໍ້ພຣະຄຳພີ & ບ່ອນອ້າງອີງ (Right Scripture Quote)'
                    : 'Right Side: Scripture Verse & Reference'}
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {activeLangTab === 'lo'
                      ? 'ຂໍ້ພຣະຄຳພີໜູນໃຈ (ພາສາລາວ):'
                      : activeLangTab === 'th'
                      ? 'ข้อพระคัมภีร์หนุนใจ (ภาษาไทย):'
                      : 'Scripture Verse Quote (English):'}
                  </label>
                  <textarea
                    rows={3}
                    value={
                      activeLangTab === 'en'
                        ? aboutHeroVerseEn
                        : activeLangTab === 'th'
                        ? aboutHeroVerseTh
                        : aboutHeroVerse
                    }
                    onChange={(e) => {
                      if (activeLangTab === 'en' && setAboutHeroVerseEn) setAboutHeroVerseEn(e.target.value);
                      else if (activeLangTab === 'th' && setAboutHeroVerseTh) setAboutHeroVerseTh(e.target.value);
                      else if (setAboutHeroVerse) setAboutHeroVerse(e.target.value);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {activeLangTab === 'lo'
                      ? 'ບ່ອນອ້າງອີງພຣະຄຳພີ (ພາສາລາວ):'
                      : activeLangTab === 'th'
                      ? 'ข้ออ้างอิงพระคัมภีร์ (ภาษาไทย):'
                      : 'Scripture Reference (English):'}
                  </label>
                  <input
                    type="text"
                    value={
                      activeLangTab === 'en'
                        ? aboutHeroVerseRefEn
                        : activeLangTab === 'th'
                        ? aboutHeroVerseRefTh
                        : aboutHeroVerseRef
                    }
                    onChange={(e) => {
                      if (activeLangTab === 'en' && setAboutHeroVerseRefEn) setAboutHeroVerseRefEn(e.target.value);
                      else if (activeLangTab === 'th' && setAboutHeroVerseRefTh) setAboutHeroVerseRefTh(e.target.value);
                      else if (setAboutHeroVerseRef) setAboutHeroVerseRef(e.target.value);
                    }}
                    placeholder={activeLangTab === 'en' ? 'Matthew 5:16' : activeLangTab === 'th' ? 'มัทธิว 5:16' : 'ມັດທາຍ 5:16'}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                {isSaving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 4. "WHO WE ARE" SECTION: PHOTO, HEADING & RICH DESCRIPTION            */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('who_we_are')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-[#cc0000] shrink-0" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {language === 'lo'
                ? '4. ພາກສ່ວນ "ພວກເຮົາແມ່ນໃຜ" — ຮູບພາບປະກອບ & ເນື້ອຫາແນະນຳ (Who We Are Photo & Story)'
                : '4. "Who We Are" Section: Community Photo, Heading & Story'}
            </h3>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('who_we_are') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('who_we_are') && (
          <div className="p-5 sm:p-6 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-5">
            {/* Who We Are Right-Column Photo */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#cc0000]" />
                  <span>
                    {language === 'lo'
                      ? 'ຮູບພາບປະກອບພາກສ່ວນ "ພວກເຮົາແມ່ນໃຜ" (Who We Are Photo)'
                      : '"Who We Are" Section Photo'}
                  </span>
                </h4>
                {posterBokeoImageUrl && (
                  <button
                    type="button"
                    onClick={() => setPosterBokeoImageUrl('')}
                    className="px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/50 text-xs text-red-600 font-bold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'lo' ? 'ລຶບຮູບ' : 'Reset Photo'}</span>
                  </button>
                )}
              </div>

              <UnifiedMediaUploader
                value={posterBokeoImageUrl}
                onChange={setPosterBokeoImageUrl}
                language={language}
                acceptTypes="image/*"
                maxDimension={2560}
                maxStringLength={750000}
                label={
                  language === 'lo'
                    ? 'ອັບໂຫຼດຮູບພາບ ຫຼື ວາງລິ້ງ URL ສຳລັບຮູບ "ພວກເຮົາແມ່ນໃຜ":'
                    : 'Upload Image File or Paste URL for "Who We Are" Photo:'
                }
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-6">
                  <div
                    ref={whoWeArePreviewRef}
                    onPointerDown={handleWhoWeArePointerDown}
                    onPointerMove={handleWhoWeArePointerMove}
                    onPointerUp={handleWhoWeArePointerUp}
                    className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 select-none touch-none cursor-crosshair"
                  >
                    <img
                      src={effectiveWhoWeAreImage}
                      alt="Who We Are Preview"
                      className="w-full h-full pointer-events-none select-none transition-all"
                      style={{
                        objectFit: aboutWhoWeAreFit,
                        objectPosition: aboutWhoWeArePosition,
                        transformOrigin: aboutWhoWeArePosition,
                        transform: `scale(${aboutWhoWeAreScale / 100})`,
                      }}
                    />
                    <div
                      className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white bg-[#cc0000] shadow-xl pointer-events-none flex items-center justify-center text-white z-20"
                      style={{
                        left: aboutWhoWeArePosition.split(' ')[0] || '50%',
                        top: aboutWhoWeArePosition.split(' ')[1] || '50%',
                      }}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </div>
                    <div className="absolute bottom-2 left-2 z-20 pointer-events-none bg-slate-950/80 px-2 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                      <Move className="w-3 h-3 text-[#cc0000]" />
                      <span>
                        {language === 'lo' ? 'ລາກເພື່ອປັບຈຸດສູນກາງຮູບ' : 'Drag to adjust focal point'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-3">
                  {setAboutWhoWeAreScale && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                        <span>{language === 'lo' ? 'ຊູມຮູບ (Zoom Scale):' : 'Zoom Scale:'}</span>
                        <span className="font-mono text-[#cc0000]">{aboutWhoWeAreScale}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        step="5"
                        value={aboutWhoWeAreScale}
                        onChange={(e) => setAboutWhoWeAreScale(Number(e.target.value))}
                        className="w-full accent-[#cc0000] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}

                  {setAboutWhoWeAreFit && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                        <span>{language === 'lo' ? 'ຮູບແບບການສະແດງຮູບ:' : 'Photo Fit:'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (setAboutWhoWeArePosition) setAboutWhoWeArePosition('50% 50%');
                            if (setAboutWhoWeAreScale) setAboutWhoWeAreScale(100);
                            if (setAboutWhoWeAreFit) setAboutWhoWeAreFit('cover');
                          }}
                          className="text-[10px] text-slate-500 hover:text-[#cc0000] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{language === 'lo' ? 'ຣີເຊັດ' : 'Reset'}</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {(['cover', 'contain', 'fill', 'scale-down'] as const).map((fitMode) => (
                          <button
                            key={fitMode}
                            type="button"
                            onClick={() => setAboutWhoWeAreFit(fitMode)}
                            className={`py-1 rounded text-[10px] font-bold border cursor-pointer ${
                              aboutWhoWeAreFit === fitMode
                                ? 'bg-[#cc0000] text-white border-[#cc0000]'
                                : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {fitMode}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Language Switcher for Who We Are Text */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                {language === 'lo' ? 'ພາສາທີ່ກຳລັງແກ້ໄຂ:' : 'Editing Language:'}
              </span>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {(['lo', 'th', 'en'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLangTab(lang)}
                    className={`px-3 py-1 text-xs font-black rounded-md transition cursor-pointer ${
                      activeLangTab === lang
                        ? 'bg-[#cc0000] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'lo' ? 'ລາວ (LA)' : lang === 'th' ? 'ไทย (TH)' : 'English (EN)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Who We Are Badge & Heading */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {activeLangTab === 'lo'
                    ? 'ປ້າຍກຳກັບ (ພວກເຮົາແມ່ນໃຜ):'
                    : activeLangTab === 'th'
                    ? 'ป้ายกำกับ (พวกเราคือใคร):'
                    : 'Section Badge (WHO WE ARE):'}
                </label>
                <input
                  type="text"
                  value={
                    activeLangTab === 'en'
                      ? aboutWhoWeAreBadgeEn
                      : activeLangTab === 'th'
                      ? aboutWhoWeAreBadgeTh
                      : aboutWhoWeAreBadge
                  }
                  onChange={(e) => {
                    if (activeLangTab === 'en' && setAboutWhoWeAreBadgeEn) setAboutWhoWeAreBadgeEn(e.target.value);
                    else if (activeLangTab === 'th' && setAboutWhoWeAreBadgeTh) setAboutWhoWeAreBadgeTh(e.target.value);
                    else if (setAboutWhoWeAreBadge) setAboutWhoWeAreBadge(e.target.value);
                  }}
                  placeholder={activeLangTab === 'en' ? 'WHO WE ARE' : activeLangTab === 'th' ? 'พวกเราคือใคร' : 'ພວກເຮົາແມ່ນໃຜ'}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-[#cc0000]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {activeLangTab === 'lo'
                    ? 'ຫົວຂໍ້ພາກສ່ວນ (ຊຸມຊົນທ້ອງຖິ່ນ, ພາລະກິດລະດັບໂລກ):'
                    : activeLangTab === 'th'
                    ? 'หัวข้อส่วนนี้ (ชุมชนท้องถิ่น พันธกิจระดับโลก):'
                    : 'Section Heading (A Local Community, A Global Purpose):'}
                </label>
                <input
                  type="text"
                  value={
                    activeLangTab === 'en'
                      ? aboutWhoWeAreTitleEn
                      : activeLangTab === 'th'
                      ? aboutWhoWeAreTitleTh
                      : aboutWhoWeAreTitle
                  }
                  onChange={(e) => {
                    if (activeLangTab === 'en' && setAboutWhoWeAreTitleEn) setAboutWhoWeAreTitleEn(e.target.value);
                    else if (activeLangTab === 'th' && setAboutWhoWeAreTitleTh) setAboutWhoWeAreTitleTh(e.target.value);
                    else if (setAboutWhoWeAreTitle) setAboutWhoWeAreTitle(e.target.value);
                  }}
                  placeholder={
                    activeLangTab === 'en'
                      ? 'A Local Community, A Global Purpose'
                      : activeLangTab === 'th'
                      ? 'ชุมชนท้องถิ่น พันธกิจระดับโลก'
                      : 'ຊຸມຊົນທ້ອງຖິ່ນ, ພາລະກິດລະດັບໂລກ'
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-[#cc0000]"
                />
              </div>
            </div>

            {/* Description Rich Text Editor */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                  {language === 'lo'
                    ? `ເນື້ອຫາແນະນຳພວກເຮົາແມ່ນໃຜ (${activeLangTab.toUpperCase()})`
                    : `Who We Are Description (${activeLangTab.toUpperCase()})`}
                </label>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                  {language === 'lo'
                    ? '✨ ຮອງຮັບການກອບປີລົງແຖວ, ຫົວຂໍ້, ຕົວໜາ ຈາກ Word'
                    : '✨ Supports rich text & Word pasting'}
                </span>
              </div>

              <RichTextEditor
                value={currentWhoWeAreDesc}
                onChange={handleDescChange}
                language={language}
                placeholder={
                  activeLangTab === 'lo'
                    ? 'ພິມ ຫຼື ວາງຂໍ້ຄວາມແນະນຳໂຄງການ ໂຮບ ບໍ່ແກ້ວ ທີ່ນີ້...'
                    : activeLangTab === 'th'
                    ? 'พิมพ์หรือวางข้อความแนะนำโครงการ โฮป บ่อแก้ว ที่นี่...'
                    : 'Type or paste overview description here...'
                }
                minHeight="180px"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                {isSaving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 5. MINISTRY ORIGIN STORY & TIMELINE MANAGER                           */}
      {/* ===================================================================== */}
      {setBokeoTimeline && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('timeline')}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-[#cc0000] shrink-0" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {language === 'lo'
                  ? '5. ເສັ້ນທາງພັນທະກິດ (Our Story & Ministry Timeline)'
                  : '5. Our Story & Ministry Timeline'}
              </h3>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                isOpen('timeline') ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </button>

          {isOpen('timeline') && (
            <div className="p-5 sm:p-6 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
              <MinistryTimelineManager
                timeline={bokeoTimeline || []}
                onChangeTimeline={setBokeoTimeline}
                language={language}
                timelineTitle={bokeoTimelineTitle}
                onChangeTimelineTitle={setBokeoTimelineTitle}
                timelineTitleEn={bokeoTimelineTitleEn}
                onChangeTimelineTitleEn={setBokeoTimelineTitleEn}
                timelineTitleTh={bokeoTimelineTitleTh}
                onChangeTimelineTitleTh={setBokeoTimelineTitleTh}
                hideTimeline={hideBokeoTimeline}
                onToggleHideTimeline={setHideBokeoTimeline}
              />

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                >
                  {isSaving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. VISION & MISSION SETTINGS (MULTILINGUAL)                           */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('vision_mission')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base shrink-0">🎯</span>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {language === 'lo'
                ? '6. ວິໄສທັດ ແລະ ພັນທະກິດ (Vision & Mission Settings)'
                : '6. Vision & Mission Settings'}
            </h3>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('vision_mission') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('vision_mission') && (
          <div className="p-5 sm:p-6 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
            {setHideVisionMission && (
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'lo' ? 'ສະຖານະການສະແດງຜົນ (Visibility):' : 'Section Visibility:'}
                </span>
                <button
                  type="button"
                  onClick={() => setHideVisionMission(!hideVisionMission)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                    hideVisionMission
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {hideVisionMission ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>{language === 'lo' ? 'ຊ້ອນຢູ່ (Hidden)' : 'Hidden'}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>{language === 'lo' ? 'ກຳລັງສະແດງ (Visible)' : 'Visible'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'lo' ? '1. ວິໄສທັດ (Vision) *' : '1. Vision Statement *'}
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {(['la', 'tha', 'en'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setVisionLang(l)}
                      className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                        visionLang === l
                          ? 'bg-[#cc0000] text-white shadow-xs'
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
                  visionLang === 'la'
                    ? vision || ''
                    : visionLang === 'tha'
                    ? visionTh || ''
                    : visionEn || ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (visionLang === 'la' && setVision) setVision(val);
                  else if (visionLang === 'tha' && setVisionTh) setVisionTh(val);
                  else if (visionLang === 'en' && setVisionEn) setVisionEn(val);
                }}
                placeholder={
                  visionLang === 'la'
                    ? 'ສ້າງສາວົກ ແລະ ຂະຫຍາຍແຜ່ນດິນຂອງພຣະເຈົ້າ...'
                    : visionLang === 'tha'
                    ? 'สร้างสาวกและขยายแผ่นดินของพระเจ้า...'
                    : 'Disciple nations and expand the Kingdom of God...'
                }
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none"
              />
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'lo'
                    ? '2. ພັນທະກິດ (Mission - 1 ຂໍ້ຕໍ່ 1 ແຖວ) *'
                    : '2. Mission Items (1 item per line) *'}
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {(['la', 'tha', 'en'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setMissionLang(l)}
                      className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                        missionLang === l
                          ? 'bg-[#cc0000] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {l === 'la' ? 'La' : l === 'tha' ? 'Tha' : 'En'}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={4}
                value={
                  missionLang === 'la'
                    ? mission || ''
                    : missionLang === 'tha'
                    ? missionTh || ''
                    : missionEn || ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (missionLang === 'la' && setMission) setMission(val);
                  else if (missionLang === 'tha' && setMissionTh) setMissionTh(val);
                  else if (missionLang === 'en' && setMissionEn) setMissionEn(val);
                }}
                placeholder={
                  missionLang === 'la'
                    ? 'ປະກາດຂ່າວປະເສີດ...\nຝຶກອົບຮົມຜູ້ນຳ...'
                    : missionLang === 'tha'
                    ? 'ประกาศข่าวประเสริฐ...\nฝึกอบรมผู้นำ...'
                    : 'Proclaim the Gospel...\nTrain local leaders...'
                }
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                {isSaving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

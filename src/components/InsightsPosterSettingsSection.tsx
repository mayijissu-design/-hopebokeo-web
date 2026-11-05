import React, { useState, useRef, useEffect } from 'react';
import {
  BarChart2,
  Image as ImageIcon,
  Save,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  Trash2,
  Crosshair,
  ZoomIn,
  Move,
  RotateCcw,
  ChevronDown,
  BookOpen,
  Type,
} from 'lucide-react';
import { UnifiedMediaUploader } from './UnifiedMediaUploader';
import { Language, HomePoster } from '../types';
import { optimizePosterForFirestore } from '../utils/imageCompressor';

interface InsightsPosterSettingsSectionProps {
  language: Language;
  homePoster?: HomePoster;
  onSavePoster: (updatedPoster: HomePoster) => Promise<void>;
}

const DEFAULT_INSIGHTS_IMAGE =
  '/uploads/d1ff2c16-9f00-4563-a7e3-a34ec0649a7f_1788761811029_129.jpg';

const SAMPLE_INSIGHTS_POSTERS = [
  {
    name: 'Default Insights',
    url: '/uploads/d1ff2c16-9f00-4563-a7e3-a34ec0649a7f_1788761811029_129.jpg',
  },
  {
    name: 'Community Fellowship',
    url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1600',
  },
  {
    name: 'Bokeo Landscape',
    url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1600',
  },
  {
    name: 'Hope Community',
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1600',
  },
];

export const InsightsPosterSettingsSection: React.FC<InsightsPosterSettingsSectionProps> = ({
  language,
  homePoster,
  onSavePoster,
}) => {
  const [activeLangTab, setActiveLangTab] = useState<'lo' | 'en' | 'th'>(
    language === 'en' ? 'en' : language === 'th' ? 'th' : 'lo'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isDraggingPoster, setIsDraggingPoster] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const previewRef = useRef<HTMLDivElement>(null);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const isOpen = (key: string) => Boolean(openSections[key]);

  // Poster State
  const [hideInsightsPoster, setHideInsightsPoster] = useState<boolean>(
    Boolean(homePoster?.hideInsightsPoster)
  );
  const [insightsImageUrl, setInsightsImageUrl] = useState<string>(
    homePoster?.insightsImageUrl || ''
  );
  const [insightsPosterHeight, setInsightsPosterHeight] = useState<number>(
    typeof homePoster?.insightsPosterHeight === 'number' ? homePoster.insightsPosterHeight : 35
  );
  const [insightsPosterOverlayOpacity, setInsightsPosterOverlayOpacity] = useState<number>(
    typeof homePoster?.insightsPosterOverlayOpacity === 'number'
      ? homePoster.insightsPosterOverlayOpacity
      : 85
  );
  const [insightsPosterEdgeFade, setInsightsPosterEdgeFade] = useState<number>(
    typeof homePoster?.insightsPosterEdgeFade === 'number' ? homePoster.insightsPosterEdgeFade : 0
  );
  const [insightsPosterDim, setInsightsPosterDim] = useState<number>(
    typeof homePoster?.insightsPosterDim === 'number' ? homePoster.insightsPosterDim : 25
  );
  const [insightsPosterScale, setInsightsPosterScale] = useState<number>(
    typeof homePoster?.insightsPosterScale === 'number' ? homePoster.insightsPosterScale : 100
  );
  const [insightsPosterPosition, setInsightsPosterPosition] = useState<string>(
    homePoster?.insightsPosterPosition || '50% 50%'
  );
  const [insightsPosterFit, setInsightsPosterFit] = useState<
    'cover' | 'contain' | 'fill' | 'scale-down'
  >(homePoster?.insightsPosterFit || 'cover');

  // Text State (Lao, English, Thai)
  const [insightsTitleLo, setInsightsTitleLo] = useState<string>(
    homePoster?.insightsTitle || 'ຂໍ້ມູນເຊີງເລິກ (Insights)'
  );
  const [insightsTitleEn, setInsightsTitleEn] = useState<string>(
    homePoster?.insightsTitleEn || 'Insights'
  );
  const [insightsTitleTh, setInsightsTitleTh] = useState<string>(
    homePoster?.insightsTitleTh || 'ข้อมูลเชิงลึก (Insights)'
  );

  const [insightsSubtitleLo, setInsightsSubtitleLo] = useState<string>(
    homePoster?.insightsSubtitle ||
      'ເບິ່ງສິ່ງທີ່ພຣະເຈົ້າຊົງກະທຳໃນແຂວງບໍ່ແກ້ວ ຜ່ານທາງລິດອຳນາດຂອງຂ່າວປະເສີດ.'
  );
  const [insightsSubtitleEn, setInsightsSubtitleEn] = useState<string>(
    homePoster?.insightsSubtitleEn ||
      'See what God is doing in Bokeo Province through the power of the Gospel.'
  );
  const [insightsSubtitleTh, setInsightsSubtitleTh] = useState<string>(
    homePoster?.insightsSubtitleTh ||
      'ดูสิ่งที่พระเจ้าทรงกระทำในแขวงบ่อแก้ว ผ่านทางฤทธิ์อำนาจของข่าวประเสริฐ'
  );

  const [insightsVerseLo, setInsightsVerseLo] = useState<string>(
    homePoster?.insightsVerse ||
      '“ຈົ່ງໂມທະນາຂອບພຣະຄຸນພຣະຢາເວ ເພາະພຣະອົງຊົງແສນດີ ຄວາມຮັກໝັ້ນຄົງຂອງພຣະອົງດຳລົງຢູ່ເປັນນິດ.”'
  );
  const [insightsVerseEn, setInsightsVerseEn] = useState<string>(
    homePoster?.insightsVerseEn ||
      '“Give thanks to the LORD, for he is good; his love endures forever.”'
  );
  const [insightsVerseTh, setInsightsVerseTh] = useState<string>(
    homePoster?.insightsVerseTh ||
      '“จงขอบพระคุณพระยาห์เวห์ เพราะพระองค์ประเสริฐ เพราะความรักมั่นคงของพระองค์ดำรงนิจนิรันดร์”'
  );

  const [insightsVerseRefLo, setInsightsVerseRefLo] = useState<string>(
    homePoster?.insightsVerseRef || '1 ຂ່າວຄາວ 16:34'
  );
  const [insightsVerseRefEn, setInsightsVerseRefEn] = useState<string>(
    homePoster?.insightsVerseRefEn || '1 Chronicles 16:34'
  );
  const [insightsVerseRefTh, setInsightsVerseRefTh] = useState<string>(
    homePoster?.insightsVerseRefTh || '1 พงศาวดาร 16:34'
  );

  const isHydratingRef = useRef(false);

  useEffect(() => {
    if (!homePoster) return;
    isHydratingRef.current = true;
    if (homePoster.hideInsightsPoster !== undefined)
      setHideInsightsPoster(homePoster.hideInsightsPoster);
    if (homePoster.insightsImageUrl !== undefined)
      setInsightsImageUrl(homePoster.insightsImageUrl);
    if (typeof homePoster.insightsPosterHeight === 'number')
      setInsightsPosterHeight(homePoster.insightsPosterHeight);
    if (typeof homePoster.insightsPosterOverlayOpacity === 'number')
      setInsightsPosterOverlayOpacity(homePoster.insightsPosterOverlayOpacity);
    if (typeof homePoster.insightsPosterEdgeFade === 'number')
      setInsightsPosterEdgeFade(homePoster.insightsPosterEdgeFade);
    if (typeof homePoster.insightsPosterDim === 'number')
      setInsightsPosterDim(homePoster.insightsPosterDim);
    if (typeof homePoster.insightsPosterScale === 'number')
      setInsightsPosterScale(homePoster.insightsPosterScale);
    if (homePoster.insightsPosterPosition)
      setInsightsPosterPosition(homePoster.insightsPosterPosition);
    if (homePoster.insightsPosterFit) setInsightsPosterFit(homePoster.insightsPosterFit);

    if (homePoster.insightsTitle !== undefined && homePoster.insightsTitle !== '')
      setInsightsTitleLo(homePoster.insightsTitle);
    if (homePoster.insightsTitleEn !== undefined && homePoster.insightsTitleEn !== '')
      setInsightsTitleEn(homePoster.insightsTitleEn);
    if (homePoster.insightsTitleTh !== undefined && homePoster.insightsTitleTh !== '')
      setInsightsTitleTh(homePoster.insightsTitleTh);

    if (homePoster.insightsSubtitle !== undefined && homePoster.insightsSubtitle !== '')
      setInsightsSubtitleLo(homePoster.insightsSubtitle);
    if (homePoster.insightsSubtitleEn !== undefined && homePoster.insightsSubtitleEn !== '')
      setInsightsSubtitleEn(homePoster.insightsSubtitleEn);
    if (homePoster.insightsSubtitleTh !== undefined && homePoster.insightsSubtitleTh !== '')
      setInsightsSubtitleTh(homePoster.insightsSubtitleTh);

    if (homePoster.insightsVerse !== undefined && homePoster.insightsVerse !== '')
      setInsightsVerseLo(homePoster.insightsVerse);
    if (homePoster.insightsVerseEn !== undefined && homePoster.insightsVerseEn !== '')
      setInsightsVerseEn(homePoster.insightsVerseEn);
    if (homePoster.insightsVerseTh !== undefined && homePoster.insightsVerseTh !== '')
      setInsightsVerseTh(homePoster.insightsVerseTh);

    if (homePoster.insightsVerseRef !== undefined && homePoster.insightsVerseRef !== '')
      setInsightsVerseRefLo(homePoster.insightsVerseRef);
    if (homePoster.insightsVerseRefEn !== undefined && homePoster.insightsVerseRefEn !== '')
      setInsightsVerseRefEn(homePoster.insightsVerseRefEn);
    if (homePoster.insightsVerseRefTh !== undefined && homePoster.insightsVerseRefTh !== '')
      setInsightsVerseRefTh(homePoster.insightsVerseRefTh);

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
        hideInsightsPoster,
        insightsImageUrl: (insightsImageUrl || '').trim(),
        insightsPosterHeight: Number(insightsPosterHeight),
        insightsPosterOverlayOpacity: Number(insightsPosterOverlayOpacity),
        insightsPosterEdgeFade: Number(insightsPosterEdgeFade),
        insightsPosterDim: Number(insightsPosterDim),
        insightsPosterScale: Number(insightsPosterScale) || 100,
        insightsPosterPosition,
        insightsPosterFit,
        insightsTitle: insightsTitleLo.trim(),
        insightsTitleEn: insightsTitleEn.trim(),
        insightsTitleTh: insightsTitleTh.trim(),
        insightsSubtitle: insightsSubtitleLo.trim(),
        insightsSubtitleEn: insightsSubtitleEn.trim(),
        insightsSubtitleTh: insightsSubtitleTh.trim(),
        insightsVerse: insightsVerseLo.trim(),
        insightsVerseEn: insightsVerseEn.trim(),
        insightsVerseTh: insightsVerseTh.trim(),
        insightsVerseRef: insightsVerseRefLo.trim(),
        insightsVerseRefEn: insightsVerseRefEn.trim(),
        insightsVerseRefTh: insightsVerseRefTh.trim(),
      };
      onSavePoster(draft).catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, [
    hideInsightsPoster,
    insightsImageUrl,
    insightsPosterHeight,
    insightsPosterOverlayOpacity,
    insightsPosterEdgeFade,
    insightsPosterDim,
    insightsPosterScale,
    insightsPosterPosition,
    insightsPosterFit,
    insightsTitleLo,
    insightsTitleEn,
    insightsTitleTh,
    insightsSubtitleLo,
    insightsSubtitleEn,
    insightsSubtitleTh,
    insightsVerseLo,
    insightsVerseEn,
    insightsVerseTh,
    insightsVerseRefLo,
    insightsVerseRefEn,
    insightsVerseRefTh,
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const updateFocalPointFromCoords = (clientX: number, clientY: number) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPercent = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setInsightsPosterPosition(`${Math.round(xPercent)}% ${Math.round(yPercent)}%`);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDraggingPoster(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFocalPointFromCoords(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingPoster) {
      updateFocalPointFromCoords(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = () => {
    setIsDraggingPoster(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      let updated: HomePoster = {
        title: homePoster?.title || 'HOPE BOKEO',
        subtitle: homePoster?.subtitle || '',
        description: homePoster?.description || '',
        imageUrl: homePoster?.imageUrl || '',
        ...(homePoster || {}),
        hideInsightsPoster,
        insightsImageUrl: (insightsImageUrl || '').trim(),
        insightsPosterHeight: Number(insightsPosterHeight),
        insightsPosterOverlayOpacity: Number(insightsPosterOverlayOpacity),
        insightsPosterEdgeFade: Number(insightsPosterEdgeFade),
        insightsPosterDim: Number(insightsPosterDim),
        insightsPosterScale: Number(insightsPosterScale) || 100,
        insightsPosterPosition,
        insightsPosterFit,
        insightsTitle: insightsTitleLo.trim(),
        insightsTitleEn: insightsTitleEn.trim(),
        insightsTitleTh: insightsTitleTh.trim(),
        insightsSubtitle: insightsSubtitleLo.trim(),
        insightsSubtitleEn: insightsSubtitleEn.trim(),
        insightsSubtitleTh: insightsSubtitleTh.trim(),
        insightsVerse: insightsVerseLo.trim(),
        insightsVerseEn: insightsVerseEn.trim(),
        insightsVerseTh: insightsVerseTh.trim(),
        insightsVerseRef: insightsVerseRefLo.trim(),
        insightsVerseRefEn: insightsVerseRefEn.trim(),
        insightsVerseRefTh: insightsVerseRefTh.trim(),
      };

      updated = await optimizePosterForFirestore(updated);

      try {
        localStorage.setItem('hb_cached_home_poster', JSON.stringify(updated));
      } catch {}

      await onSavePoster(updated);
      showToast(
        language === 'lo'
          ? 'ບັນທຶກການຕັ້ງຄ່າໂພສເຕີຫ້ອງຂໍ້ມູນສຳເລັດແລ້ວ!'
          : language === 'th'
          ? 'บันทึกการตั้งค่าโปสเตอร์หน้าข้อมูลสำเร็จแล้ว!'
          : 'Insights poster settings saved successfully!'
      );
    } catch (err: any) {
      console.error('Failed to save Insights poster:', err);
      showToast(
        language === 'lo'
          ? 'ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ, ກະລຸນາລອງໃໝ່'
          : 'Error saving settings, please try again'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setHideInsightsPoster(false);
    setInsightsImageUrl('');
    setInsightsPosterHeight(35);
    setInsightsPosterOverlayOpacity(85);
    setInsightsPosterEdgeFade(0);
    setInsightsPosterDim(25);
    setInsightsPosterScale(100);
    setInsightsPosterPosition('50% 50%');
    setInsightsPosterFit('cover');
    setInsightsTitleLo('ຂໍ້ມູນເຊີງເລິກ (Insights)');
    setInsightsTitleEn('Insights');
    setInsightsTitleTh('ข้อมูลเชิงลึก (Insights)');
    setInsightsSubtitleLo(
      'ເບິ່ງສິ່ງທີ່ພຣະເຈົ້າຊົງກະທຳໃນແຂວງບໍ່ແກ້ວ ຜ່ານທາງລິດອຳນາດຂອງຂ່າວປະເສີດ.'
    );
    setInsightsSubtitleEn(
      'See what God is doing in Bokeo Province through the power of the Gospel.'
    );
    setInsightsSubtitleTh(
      'ดูสิ่งที่พระเจ้าทรงกระทำในแขวงบ่อแก้ว ผ่านทางฤทธิ์อำนาจของข่าวประเสริฐ'
    );
    setInsightsVerseLo(
      '“ຈົ່ງໂມທະນາຂອບພຣະຄຸນພຣະຢາເວ ເພາະພຣະອົງຊົງແສນດີ ຄວາມຮັກໝັ້ນຄົງຂອງພຣະອົງດຳລົງຢູ່ເປັນນິດ.”'
    );
    setInsightsVerseEn('“Give thanks to the LORD, for he is good; his love endures forever.”');
    setInsightsVerseTh(
      '“จงขอบพระคุณพระยาห์เวห์ เพราะพระองค์ประเสริฐ เพราะความรักมั่นคงของพระองค์ดำรงนิจนิรันดร์”'
    );
    setInsightsVerseRefLo('1 ຂ່າວຄາວ 16:34');
    setInsightsVerseRefEn('1 Chronicles 16:34');
    setInsightsVerseRefTh('1 พงศาวดาร 16:34');
    showToast(
      language === 'lo'
        ? 'ຣີເຊັດເປັນຄ່າເລີ່ມຕົ້ນແລ້ວ (ກົດບັນທຶກເພື່ອຢືນຢັນ)'
        : 'Reset to defaults (Click Save to apply)'
    );
  };

  const effectivePoster = insightsImageUrl || DEFAULT_INSIGHTS_IMAGE;

  const currentTitle =
    activeLangTab === 'en'
      ? insightsTitleEn
      : activeLangTab === 'th'
      ? insightsTitleTh
      : insightsTitleLo;

  const currentSubtitle =
    activeLangTab === 'en'
      ? insightsSubtitleEn
      : activeLangTab === 'th'
      ? insightsSubtitleTh
      : insightsSubtitleLo;

  const currentVerse =
    activeLangTab === 'en'
      ? insightsVerseEn
      : activeLangTab === 'th'
      ? insightsVerseTh
      : insightsVerseLo;

  const currentVerseRef =
    activeLangTab === 'en'
      ? insightsVerseRefEn
      : activeLangTab === 'th'
      ? insightsVerseRefTh
      : insightsVerseRefLo;

  const posX = parseInt((insightsPosterPosition.split(' ')[0] || '50%').replace('%', ''), 10) || 50;
  const posY = parseInt((insightsPosterPosition.split(' ')[1] || '50%').replace('%', ''), 10) || 50;

  return (
    <div id="insights-poster-settings" className="space-y-3.5 animate-fade-in scroll-mt-24">
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center gap-2 shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#cc0000] font-black text-xs uppercase tracking-wider mb-1">
            <BarChart2 className="w-4 h-4" />
            <span>
              {language === 'lo'
                ? 'ຕັ້ງຄ່າໂພສເຕີຫ້ອງຂໍ້ມູນ (Insights Tab)'
                : language === 'th'
                ? 'ตั้งค่าโปสเตอร์หน้าข้อมูล (Insights Tab)'
                : 'Insights Tab Poster Settings'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
              {language === 'lo'
                ? 'ໂພສເຕີ & ຂໍ້ຄວາມຫ້ອງຂໍ້ມູນ (Insights)'
                : language === 'th'
                ? 'โปสเตอร์ & ข้อความหน้าข้อมูล (Insights)'
                : 'Insights Poster & Banner Text'}
            </h2>
            <button
              type="button"
              onClick={() => setHideInsightsPoster(!hideInsightsPoster)}
              className={`p-2 transition rounded-xl flex items-center justify-center border shadow-xs cursor-pointer ${
                hideInsightsPoster
                  ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
              title={
                hideInsightsPoster
                  ? language === 'lo'
                    ? 'ປັດຈຸບັນຖືກເຊື່ອງໄວ້ (ກົດເພື່ອສະແດງ)'
                    : 'Currently hidden (Click to show)'
                  : language === 'lo'
                  ? 'ປັດຈຸບັນສະແດງຢູ່ (ກົດເພື່ອເຊື່ອງ)'
                  : 'Currently visible (Click to hide)'
              }
            >
              {hideInsightsPoster ? (
                <EyeOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Eye className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'lo'
              ? 'ເພີ່ມ ຫຼື ປ່ຽນຮູບພາບໂພສເຕີ, ປັບຄວາມສູງ-ຈຸດສູນກາງຮູບ, ແລະ ແກ້ໄຂຫົວຂໍ້/ຂໍ້ພຣະຄຳພີໃນຫ້ອງຂໍ້ມູນ (Insights)'
              : 'Customize the hero banner image, focal point, height, title, subtitle, and scripture quote on the Insights tab.'}
          </p>
        </div>
      </div>

      {/* 1. Poster Image Upload & Live Preview */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('cover')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-4 h-4 text-[#cc0000] shrink-0" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {language === 'lo'
                ? '1. ຮູບພາບໂພສເຕີຫ້ອງຂໍ້ມູນ & ຕົວຢ່າງການສະແດງຜົນ (Poster Cover Image & Live Preview)'
                : '1. Insights Poster Cover Image & Live Preview'}
            </h3>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('cover') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('cover') && (
          <div className="p-5 sm:p-6 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-5">
            {insightsImageUrl && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setInsightsImageUrl('')}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'lo' ? 'ລຶບຮູບໂພສເຕີ' : 'Remove Image'}</span>
                </button>
              </div>
            )}
            <UnifiedMediaUploader
              value={insightsImageUrl}
              onChange={setInsightsImageUrl}
              language={language}
              acceptTypes="image/*"
              maxDimension={2560}
              maxStringLength={750000}
              label={
                language === 'lo'
                  ? 'ເລືອກໄຟລ໌ຮູບພາບຈາກເຄື່ອງ ຫຼື ວາງລິ້ງ URL ຂອງໂພສເຕີຫ້ອງຂໍ້ມູນ:'
                  : 'Upload Image File or Paste Insights Poster URL:'
              }
            />

            {/* Quick Sample Images */}
            <div className="space-y-2">
              <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {language === 'lo'
                  ? 'ຫຼື ເລືອກຮູບພາບຕົວຢ່າງ (Sample Posters):'
                  : 'Or select a sample poster image:'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {SAMPLE_INSIGHTS_POSTERS.map((sample) => {
                  const isSelected =
                    (insightsImageUrl || DEFAULT_INSIGHTS_IMAGE) === sample.url;
                  return (
                    <button
                      key={sample.name}
                      type="button"
                      onClick={() =>
                        setInsightsImageUrl(
                          sample.url === DEFAULT_INSIGHTS_IMAGE ? '' : sample.url
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
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600';
                        }}
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

            {/* Live Realistic Preview matching FilterPanel Insights Banner */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                    {language === 'lo'
                      ? 'ຕົວຢ່າງການສະແດງຜົນເທິງໜ້າຂໍ້ມູນ (Live Insights Banner Preview)'
                      : 'Live Insights Banner Preview'}
                  </h4>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {language === 'lo'
                    ? '✓ ແຕະ ຫຼື ລາກເທິງຮູບເພື່ອປັບຈຸດສູນກາງ'
                    : '✓ Click or drag on image to adjust focal point'}
                </span>
              </div>

              <div
                ref={previewRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative w-full overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 text-white shadow-inner transition-all select-none touch-none cursor-crosshair group rounded-xl"
                style={{
                  minHeight: `${Math.round(110 + (insightsPosterHeight / 100) * 140)}px`,
                  ...(insightsPosterEdgeFade > 0
                    ? {
                        WebkitMaskImage: `linear-gradient(to bottom, transparent 0px, black ${Math.round(
                          (insightsPosterEdgeFade / 100) * 60
                        )}px, black 100%)`,
                        maskImage: `linear-gradient(to bottom, transparent 0px, black ${Math.round(
                          (insightsPosterEdgeFade / 100) * 60
                        )}px, black 100%)`,
                      }
                    : {}),
                }}
              >
                <img
                  src={effectivePoster}
                  alt="Insights Poster Preview"
                  className="absolute inset-0 w-full h-full pointer-events-none select-none transition-all"
                  style={{
                    objectFit: insightsPosterFit,
                    objectPosition: insightsPosterPosition,
                    transformOrigin: insightsPosterPosition,
                    transform: `scale(${insightsPosterScale / 100})`,
                    filter: `brightness(${Math.max(20, 100 - insightsPosterDim * 0.75)}%)`,
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1600';
                  }}
                />

                {/* Focal Center Target Indicator */}
                <div
                  className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-white bg-[#cc0000] shadow-2xl pointer-events-none flex items-center justify-center text-white ring-4 ring-red-500/40 z-30 transition-transform active:scale-125"
                  style={{
                    left: insightsPosterPosition.split(' ')[0] || '50%',
                    top: insightsPosterPosition.split(' ')[1] || '50%',
                  }}
                  title={language === 'lo' ? 'ຈຸດສູນກາງຮູບ' : 'Focal Center'}
                >
                  <Crosshair className="w-4 h-4 animate-pulse" />
                </div>

                {/* Position & Zoom Badge */}
                <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-red-500/30 text-[10px] font-mono text-amber-300 shadow">
                  <span>📍 {insightsPosterPosition}</span>
                  <span className="text-slate-500">•</span>
                  <span>🔍 {insightsPosterScale}%</span>
                </div>

                <div
                  className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-slate-950/80 pointer-events-none transition-opacity"
                  style={{ opacity: insightsPosterOverlayOpacity / 100 }}
                />

                <div className="relative z-10 max-w-7xl mx-auto px-5 pt-7 pb-10 sm:px-8 sm:pt-9 sm:pb-12 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#4a1018]/90 border border-red-500/30 flex items-center justify-center text-white shrink-0 shadow-md">
                      <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="space-y-1">
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                        {currentTitle}
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-200 max-w-md leading-relaxed">
                        {currentSubtitle}
                      </p>
                    </div>
                  </div>

                  <div className="md:max-w-xs border-l-2 border-amber-400 pl-4 py-0.5 space-y-1 text-white/95">
                    <p className="text-xs sm:text-[13px] italic leading-relaxed text-slate-100">
                      {currentVerse}
                    </p>
                    <p className="text-[11px] font-bold text-amber-300 text-right">
                      {currentVerseRef}
                    </p>
                  </div>
                </div>

                {/* Subtle, restrained wave bottom edge in live preview */}
                <div className="absolute -bottom-px left-0 right-0 w-full overflow-hidden leading-none pointer-events-none z-20">
                  <svg
                    viewBox="0 0 1440 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="relative block w-full h-2.5 sm:h-3 text-slate-50 dark:text-slate-900"
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

            {/* Bottom Save Bar for Section 1 */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'lo' ? 'ຄ່າເລີ່ມຕົ້ນ' : 'Reset'}</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {language === 'lo'
                    ? 'ບັນທຶກການຕັ້ງຄ່າ'
                    : language === 'th'
                    ? 'บันทึกการตั้งค่า'
                    : 'Save Settings'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Poster Background & Size Customization */}
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
                ? '2. ປັບແຕ່ງພື້ນຫຼັງ, ຄວາມສູງ ແລະ ຈຸດສູນກາງຮູບ (Poster Appearance & Position)'
                : '2. Poster Appearance, Height & Focal Position'}
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
                    <BarChart2 className="w-3.5 h-3.5 text-[#cc0000]" />
                    <span>
                      {language === 'lo' ? 'ຄວາມສູງໂພສເຕີ (Poster Height):' : 'Poster Height:'}
                    </span>
                  </span>
                  <span className="font-mono text-[#cc0000] text-xs font-bold">
                    {insightsPosterHeight}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={insightsPosterHeight}
                  onChange={(e) => setInsightsPosterHeight(Number(e.target.value))}
                  className="w-full accent-[#cc0000] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <button
                    type="button"
                    onClick={() => setInsightsPosterHeight(0)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    0% (ກະທັດຮັດ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsightsPosterHeight(35)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    35% (ມາດຕະຖານ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsightsPosterHeight(100)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    100% (ສູງສຸດ)
                  </button>
                </div>
              </div>

              {/* Overlay Opacity Slider */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {language === 'lo'
                        ? 'ຄວາມເຂັ້ມພື້ນຫຼັງຂໍ້ຄວາມ (Overlay Opacity):'
                        : 'Overlay Opacity:'}
                    </span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    {insightsPosterOverlayOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={insightsPosterOverlayOpacity}
                  onChange={(e) => setInsightsPosterOverlayOpacity(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Background Dim Slider */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {language === 'lo'
                        ? 'ຄວາມມືດຮູບພື້ນຫຼັງ (Background Dim):'
                        : 'Background Dim:'}
                    </span>
                  </span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 text-xs font-bold">
                    {insightsPosterDim}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={insightsPosterDim}
                  onChange={(e) => setInsightsPosterDim(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Zoom / Scale Slider */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-blue-500" />
                    <span>
                      {language === 'lo' ? 'ຂະຫຍາຍຮູບພາບ (Image Scale):' : 'Image Zoom Scale:'}
                    </span>
                  </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 text-xs font-bold">
                    {insightsPosterScale}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="1"
                  value={insightsPosterScale}
                  onChange={(e) => setInsightsPosterScale(Number(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Horizontal & Vertical Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>{language === 'lo' ? 'ແນວນອນ (Horizontal X):' : 'Horizontal (X):'}</span>
                  <span className="font-mono text-[#cc0000]">{posX}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={posX}
                  onChange={(e) => setInsightsPosterPosition(`${e.target.value}% ${posY}%`)}
                  className="w-full accent-[#cc0000] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>{language === 'lo' ? 'ແນວຕັ້ງ (Vertical Y):' : 'Vertical (Y):'}</span>
                  <span className="font-mono text-[#cc0000]">{posY}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={posY}
                  onChange={(e) => setInsightsPosterPosition(`${posX}% ${e.target.value}%`)}
                  className="w-full accent-[#cc0000] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Bottom Save Bar for Section 2 */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'lo' ? 'ຄ່າເລີ່ມຕົ້ນ' : 'Reset'}</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {language === 'lo'
                    ? 'ບັນທຶກການຕັ້ງຄ່າ'
                    : language === 'th'
                    ? 'บันทึกการตั้งค่า'
                    : 'Save Settings'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Poster Title, Subtitle & Scripture Quote Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('text_content')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-[#cc0000] shrink-0" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {language === 'lo'
                ? '3. ແກ້ໄຂຫົວຂໍ້, ຄຳອະທິບາຍ ແລະ ຂໍ້ພຣະຄຳພີ (Title, Subtitle & Scripture Verse)'
                : '3. Edit Insights Title, Subtitle & Scripture Verse'}
            </h3>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('text_content') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('text_content') && (
          <div className="p-5 sm:p-6 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-5">
            {/* Language Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-[#cc0000]" />
                <span>
                  {language === 'lo'
                    ? 'ເລືອກພາສາທີ່ຕ້ອງການແກ້ໄຂ:'
                    : 'Select language to edit:'}
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
              {/* Left Side: Main Title & Subtitle */}
              <div className="space-y-4 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#cc0000]">
                  {language === 'lo'
                    ? 'ດ້ານຊ້າຍ: ຫົວຂໍ້ຫຼັກ & ຄຳອະທິບາຍ (Left Banner Heading)'
                    : 'Left Side: Heading & Subtitle'}
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {activeLangTab === 'lo'
                      ? 'ຫົວຂໍ້ຫຼັກ (ພາສາລາວ):'
                      : activeLangTab === 'th'
                      ? 'หัวข้อหลัก (ภาษาไทย):'
                      : 'Main Title (English):'}
                  </label>
                  <input
                    type="text"
                    value={
                      activeLangTab === 'en'
                        ? insightsTitleEn
                        : activeLangTab === 'th'
                        ? insightsTitleTh
                        : insightsTitleLo
                    }
                    onChange={(e) => {
                      if (activeLangTab === 'en') setInsightsTitleEn(e.target.value);
                      else if (activeLangTab === 'th') setInsightsTitleTh(e.target.value);
                      else setInsightsTitleLo(e.target.value);
                    }}
                    placeholder="Insights"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {activeLangTab === 'lo'
                      ? 'ຄຳອະທິບາຍຍ່ອຍ (ພາສາລາວ):'
                      : activeLangTab === 'th'
                      ? 'คำอธิบายย่อย (ภาษาไทย):'
                      : 'Subtitle Description (English):'}
                  </label>
                  <textarea
                    rows={3}
                    value={
                      activeLangTab === 'en'
                        ? insightsSubtitleEn
                        : activeLangTab === 'th'
                        ? insightsSubtitleTh
                        : insightsSubtitleLo
                    }
                    onChange={(e) => {
                      if (activeLangTab === 'en') setInsightsSubtitleEn(e.target.value);
                      else if (activeLangTab === 'th') setInsightsSubtitleTh(e.target.value);
                      else setInsightsSubtitleLo(e.target.value);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]"
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
                        ? insightsVerseEn
                        : activeLangTab === 'th'
                        ? insightsVerseTh
                        : insightsVerseLo
                    }
                    onChange={(e) => {
                      if (activeLangTab === 'en') setInsightsVerseEn(e.target.value);
                      else if (activeLangTab === 'th') setInsightsVerseTh(e.target.value);
                      else setInsightsVerseLo(e.target.value);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs italic font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
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
                        ? insightsVerseRefEn
                        : activeLangTab === 'th'
                        ? insightsVerseRefTh
                        : insightsVerseRefLo
                    }
                    onChange={(e) => {
                      if (activeLangTab === 'en') setInsightsVerseRefEn(e.target.value);
                      else if (activeLangTab === 'th') setInsightsVerseRefTh(e.target.value);
                      else setInsightsVerseRefLo(e.target.value);
                    }}
                    placeholder="1 Chronicles 16:34"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Bar for Section 3 */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'lo' ? 'ຄ່າເລີ່ມຕົ້ນ' : 'Reset'}</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {language === 'lo'
                    ? 'ບັນທຶກການຕັ້ງຄ່າ'
                    : language === 'th'
                    ? 'บันทึกการตั้งค่า'
                    : 'Save Settings'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

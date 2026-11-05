import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  RotateCw,
  Trash2,
  Move,
  Target,
  Crosshair,
  Image as ImageIcon,
  Save,
  Loader2,
  Palette,
  Eye,
  EyeOff,
  FileText,
  Sliders,
  Sun,
  ChevronDown,
  Calendar,
  MapPin,
  Megaphone,
  Check,
  CheckCircle2,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Upload,
  Plus,
  Link as LinkIcon,
  X,
  ZoomIn,
} from 'lucide-react';
import { Language, PosterImageCustomSetting, EventData, UpcomingScheduleItem } from '../types';
import { UnifiedMediaUploader } from './UnifiedMediaUploader';
import { HbLogo } from './HbLogo';
import { RichTextEditor } from './RichTextEditor';
import { LogoBgRemover } from './LogoBgRemover';
import { WordStyleScheduleEditor } from './WordStyleScheduleEditor';
import { compressImageFile } from '../utils/imageCompressor';
import { uploadFileDirectly } from '../utils/fileUploader';
import { db, doc, setDoc } from '../lib/firebase';

interface PosterSettingsSectionProps {
  language: Language;
  isEditingPoster: boolean;
  isSavingPoster: boolean;
  onSave: (e: React.FormEvent) => void;
  mode?: 'all' | 'poster' | 'upcoming';
  onNavigateToUpcoming?: () => void;

  // Events & Latest News integration
  events?: EventData[];
  onSaveEvent?: (event: EventData) => Promise<void> | void;
  onNavigateToEvents?: () => void;

  // Visibility & Mode
  hidePosterSection: boolean;
  setHidePosterSection: (val: boolean) => void;
  showTextOverlay: boolean;
  setShowTextOverlay: (val: boolean) => void;

  // Org Logo
  orgLogoUrl: string;
  setOrgLogoUrl: (val: string) => void;

  // Text Fields
  posterTitle: string;
  setPosterTitle: (val: string) => void;
  posterTitleEn: string;
  setPosterTitleEn: (val: string) => void;
  posterTitleTh: string;
  setPosterTitleTh: (val: string) => void;
  posterSubtitle: string;
  setPosterSubtitle: (val: string) => void;
  posterSubtitleEn: string;
  setPosterSubtitleEn: (val: string) => void;
  posterSubtitleTh: string;
  setPosterSubtitleTh: (val: string) => void;
  posterDesc: string;
  setPosterDesc: (val: string) => void;
  posterDescEn: string;
  setPosterDescEn: (val: string) => void;
  posterDescTh: string;
  setPosterDescTh: (val: string) => void;

  // Location Tag
  posterLocationTag?: string;
  setPosterLocationTag?: (val: string) => void;
  posterLocationTagEn?: string;
  setPosterLocationTagEn?: (val: string) => void;
  posterLocationTagTh?: string;
  setPosterLocationTagTh?: (val: string) => void;

  // Button Text Multilingual
  posterBtnTextEn?: string;
  setPosterBtnTextEn?: (val: string) => void;
  posterBtnTextTh?: string;
  setPosterBtnTextTh?: (val: string) => void;

  // Video Action Button Text Multilingual
  posterVideoBtnText?: string;
  setPosterVideoBtnText?: (val: string) => void;
  posterVideoBtnTextEn?: string;
  setPosterVideoBtnTextEn?: (val: string) => void;
  posterVideoBtnTextTh?: string;
  setPosterVideoBtnTextTh?: (val: string) => void;

  // Right Badge Text Multilingual ("Real People. Real Hope.")
  posterBadgeTopText?: string;
  setPosterBadgeTopText?: (val: string) => void;
  posterBadgeTopTextEn?: string;
  setPosterBadgeTopTextEn?: (val: string) => void;
  posterBadgeTopTextTh?: string;
  setPosterBadgeTopTextTh?: (val: string) => void;
  posterBadgeBottomText?: string;
  setPosterBadgeBottomText?: (val: string) => void;
  posterBadgeBottomTextEn?: string;
  setPosterBadgeBottomTextEn?: (val: string) => void;
  posterBadgeBottomTextTh?: string;
  setPosterBadgeBottomTextTh?: (val: string) => void;
  hideRightBadge?: boolean;
  setHideRightBadge?: (val: boolean) => void;

  // Bokeo Text Fields
  posterBokeoTitle: string;
  setPosterBokeoTitle: (val: string) => void;
  posterBokeoTitleEn: string;
  setPosterBokeoTitleEn: (val: string) => void;
  posterBokeoTitleTh: string;
  setPosterBokeoTitleTh: (val: string) => void;
  posterBokeoDesc: string;
  setPosterBokeoDesc: (val: string) => void;
  posterBokeoDescEn: string;
  setPosterBokeoDescEn: (val: string) => void;
  posterBokeoDescTh: string;
  setPosterBokeoDescTh: (val: string) => void;
  posterBokeoImageUrl?: string;
  setPosterBokeoImageUrl?: (val: string) => void;

  // Upcoming Event / Announcements (ງານທີ່ຈະມາເຖິງ / ແຈ້ງການ & ປະກາດ)
  upcomingEventTitle?: string;
  setUpcomingEventTitle?: (val: string) => void;
  upcomingEventTitleEn?: string;
  setUpcomingEventTitleEn?: (val: string) => void;
  upcomingEventTitleTh?: string;
  setUpcomingEventTitleTh?: (val: string) => void;
  upcomingEventDate?: string;
  setUpcomingEventDate?: (val: string) => void;
  upcomingEventLocation?: string;
  setUpcomingEventLocation?: (val: string) => void;
  upcomingEventLocationEn?: string;
  setUpcomingEventLocationEn?: (val: string) => void;
  upcomingEventLocationTh?: string;
  setUpcomingEventLocationTh?: (val: string) => void;
  upcomingEventDesc?: string;
  setUpcomingEventDesc?: (val: string) => void;
  upcomingEventDescEn?: string;
  setUpcomingEventDescEn?: (val: string) => void;
  upcomingEventDescTh?: string;
  setUpcomingEventDescTh?: (val: string) => void;
  upcomingEventImageUrl?: string;
  setUpcomingEventImageUrl?: (val: string) => void;
  upcomingEventBadge?: string;
  setUpcomingEventBadge?: (val: string) => void;
  hideUpcomingEvent?: boolean;
  setHideUpcomingEvent?: (val: boolean) => void;

  // Upcoming Schedule Table & Documents
  upcomingSchedule?: UpcomingScheduleItem[];
  setUpcomingSchedule?: (val: UpcomingScheduleItem[]) => void;
  upcomingScheduleHtml?: string;
  setUpcomingScheduleHtml?: (val: string) => void;
  upcomingPdfUrl?: string;
  setUpcomingPdfUrl?: (val: string) => void;
  upcomingPdfName?: string;
  setUpcomingPdfName?: (val: string) => void;
  upcomingDocxUrl?: string;
  setUpcomingDocxUrl?: (val: string) => void;
  upcomingDocxName?: string;
  setUpcomingDocxName?: (val: string) => void;

  upcomingBgDim?: number;
  setUpcomingBgDim?: (val: number) => void;
  upcomingTableBg?: 'transparent' | 'glass' | 'paper' | 'dark' | 'custom';
  setUpcomingTableBg?: (val: 'transparent' | 'glass' | 'paper' | 'dark' | 'custom') => void;
  upcomingTableCustomBg?: string;
  setUpcomingTableCustomBg?: (val: string) => void;
  upcomingTableBorderWidth?: number;
  setUpcomingTableBorderWidth?: (val: number) => void;
  upcomingTableBorderColor?: string;
  setUpcomingTableBorderColor?: (val: string) => void;

  upcomingEdgeFade?: number;
  setUpcomingEdgeFade?: (val: number) => void;
  upcomingHeight?: number;
  setUpcomingHeight?: (val: number) => void;
  upcomingContentBgOpacity?: number;
  setUpcomingContentBgOpacity?: (val: number) => void;
  upcomingTitleSize?: 'event' | 'compact' | 'large' | number | string;
  setUpcomingTitleSize?: (val: any) => void;
  upcomingBgVisibility?: number;
  setUpcomingBgVisibility?: (val: number) => void;
  upcomingTableWidth?: number;
  setUpcomingTableWidth?: (val: number) => void;
  upcomingTableAlign?: 'left' | 'center' | 'right';
  setUpcomingTableAlign?: (val: 'left' | 'center' | 'right') => void;

  // Media
  posterImgUrl: string;
  setPosterImgUrl: (val: string) => void;
  posterImageUrls: string[];
  setPosterImageUrls: (val: string[]) => void;
  posterVideoUrl: string;
  setPosterVideoUrl: (val: string) => void;
  posterBtnText: string;
  setPosterBtnText: (val: string) => void;

  // App Background
  appBgColor: string;
  setAppBgColor: (val: string) => void;
  appBgImageUrl: string;
  setAppBgImageUrl: (val: string) => void;
  appBgBrightness: number;
  setAppBgBrightness: (val: number) => void;
  appBgBlur: number;
  setAppBgBlur: (val: number) => void;
  appBgWhiteOverlayOpacity: number;
  setAppBgWhiteOverlayOpacity: (val: number) => void;

  // Studio Sizing & Global Overlay
  posterHeight: number;
  setPosterHeight: (val: number) => void;
  posterAspectRatio: 'auto' | '16/9' | '21/9' | '4/3' | '1/1' | '3/4' | '9/16';
  setPosterAspectRatio: (val: 'auto' | '16/9' | '21/9' | '4/3' | '1/1' | '3/4' | '9/16') => void;
  posterOverlayOpacity: number;
  setPosterOverlayOpacity: (val: number) => void;
  posterEdgeFade?: number;
  setPosterEdgeFade?: (val: number) => void;

  // Global default fallbacks
  posterFit: 'cover' | 'contain' | 'fill' | 'scale-down';
  setPosterFit: (val: 'cover' | 'contain' | 'fill' | 'scale-down') => void;
  posterScale?: number;
  setPosterScale?: (val: number) => void;
  posterBgPosition: string;
  setPosterBgPosition: (val: string) => void;
  posterBrightness: number;
  setPosterBrightness: (val: number) => void;
  posterContrast: number;
  setPosterContrast: (val: number) => void;
  posterSaturation: number;
  setPosterSaturation: (val: number) => void;
  posterBlur: number;
  setPosterBlur: (val: number) => void;

  // Per-Image Custom Settings
  posterBgPositions: string[];
  setPosterBgPositions: React.Dispatch<React.SetStateAction<string[]>>;
  imageCustomSettings: PosterImageCustomSetting[];
  setImageCustomSettings: React.Dispatch<React.SetStateAction<PosterImageCustomSetting[]>>;
}

export const PosterSettingsSection: React.FC<PosterSettingsSectionProps> = ({
  language,
  isEditingPoster: _isEditingPosterProp,
  isSavingPoster,
  onSave,
  mode = 'all',
  onNavigateToUpcoming,
  hidePosterSection,
  setHidePosterSection,
  showTextOverlay,
  setShowTextOverlay,
  orgLogoUrl,
  setOrgLogoUrl,
  posterTitle,
  setPosterTitle,
  posterTitleEn,
  setPosterTitleEn,
  posterTitleTh,
  setPosterTitleTh,
  posterSubtitle,
  setPosterSubtitle,
  posterSubtitleEn,
  setPosterSubtitleEn,
  posterSubtitleTh,
  setPosterSubtitleTh,
  posterDesc,
  setPosterDesc,
  posterDescEn,
  setPosterDescEn,
  posterDescTh,
  setPosterDescTh,
  posterLocationTag = '',
  setPosterLocationTag,
  posterLocationTagEn = '',
  setPosterLocationTagEn,
  posterLocationTagTh = '',
  setPosterLocationTagTh,
  posterBtnTextEn = '',
  setPosterBtnTextEn,
  posterBtnTextTh = '',
  setPosterBtnTextTh,
  posterVideoBtnText = '',
  setPosterVideoBtnText,
  posterVideoBtnTextEn = '',
  setPosterVideoBtnTextEn,
  posterVideoBtnTextTh = '',
  setPosterVideoBtnTextTh,
  posterBadgeTopText = '',
  setPosterBadgeTopText,
  posterBadgeTopTextEn = '',
  setPosterBadgeTopTextEn,
  posterBadgeTopTextTh = '',
  setPosterBadgeTopTextTh,
  posterBadgeBottomText = '',
  setPosterBadgeBottomText,
  posterBadgeBottomTextEn = '',
  setPosterBadgeBottomTextEn,
  posterBadgeBottomTextTh = '',
  setPosterBadgeBottomTextTh,
  hideRightBadge = false,
  setHideRightBadge,
  posterBokeoTitle,
  setPosterBokeoTitle,
  posterBokeoTitleEn,
  setPosterBokeoTitleEn,
  posterBokeoTitleTh,
  setPosterBokeoTitleTh,
  posterBokeoDesc,
  setPosterBokeoDesc,
  posterBokeoDescEn,
  setPosterBokeoDescEn,
  posterBokeoDescTh,
  setPosterBokeoDescTh,
  posterBokeoImageUrl = '',
  setPosterBokeoImageUrl,
  posterImgUrl,
  setPosterImgUrl,
  posterImageUrls,
  setPosterImageUrls,
  posterVideoUrl,
  setPosterVideoUrl,
  posterBtnText,
  setPosterBtnText,
  appBgColor,
  setAppBgColor,
  appBgImageUrl,
  setAppBgImageUrl,
  appBgBrightness,
  setAppBgBrightness,
  appBgBlur,
  setAppBgBlur,
  appBgWhiteOverlayOpacity,
  setAppBgWhiteOverlayOpacity,
  posterHeight,
  setPosterHeight,
  posterAspectRatio,
  setPosterAspectRatio,
  posterOverlayOpacity,
  setPosterOverlayOpacity,
  posterEdgeFade = 0,
  setPosterEdgeFade,
  posterFit,
  setPosterFit,
  posterScale = 100,
  setPosterScale,
  posterBgPosition,
  setPosterBgPosition,
  posterBrightness,
  setPosterBrightness,
  posterContrast,
  setPosterContrast,
  posterSaturation,
  setPosterSaturation,
  posterBlur,
  setPosterBlur,
  posterBgPositions,
  setPosterBgPositions,
  imageCustomSettings,
  setImageCustomSettings,
  events,
  onSaveEvent,
  onNavigateToEvents,
  upcomingEventTitle = '',
  setUpcomingEventTitle,
  upcomingEventTitleEn = '',
  setUpcomingEventTitleEn,
  upcomingEventTitleTh = '',
  setUpcomingEventTitleTh,
  upcomingEventDate = '',
  setUpcomingEventDate,
  upcomingEventLocation = '',
  setUpcomingEventLocation,
  upcomingEventLocationEn = '',
  setUpcomingEventLocationEn,
  upcomingEventLocationTh = '',
  setUpcomingEventLocationTh,
  upcomingEventDesc = '',
  setUpcomingEventDesc,
  upcomingEventDescEn = '',
  setUpcomingEventDescEn,
  upcomingEventDescTh = '',
  setUpcomingEventDescTh,
  upcomingEventImageUrl = '',
  setUpcomingEventImageUrl,
  upcomingEventBadge = '',
  setUpcomingEventBadge,
  hideUpcomingEvent = false,
  setHideUpcomingEvent,
  upcomingSchedule = [],
  setUpcomingSchedule,
  upcomingScheduleHtml = '',
  setUpcomingScheduleHtml,
  upcomingPdfUrl = '',
  setUpcomingPdfUrl,
  upcomingPdfName = '',
  setUpcomingPdfName,
  upcomingDocxUrl = '',
  setUpcomingDocxUrl,
  upcomingDocxName = '',
  setUpcomingDocxName,
  upcomingBgDim = 60,
  setUpcomingBgDim,
  upcomingTableBg = 'transparent',
  setUpcomingTableBg,
  upcomingTableCustomBg = '#0f172a',
  setUpcomingTableCustomBg,
  upcomingTableBorderWidth = 0,
  setUpcomingTableBorderWidth,
  upcomingTableBorderColor = 'rgba(255, 255, 255, 0.2)',
  setUpcomingTableBorderColor,
  upcomingEdgeFade = 25,
  setUpcomingEdgeFade,
  upcomingHeight = 20,
  setUpcomingHeight,
  upcomingContentBgOpacity = 70,
  setUpcomingContentBgOpacity,
  upcomingTitleSize = 28,
  setUpcomingTitleSize,
  upcomingBgVisibility = 100,
  setUpcomingBgVisibility,
  upcomingTableWidth = 100,
  setUpcomingTableWidth,
  upcomingTableAlign = 'center',
  setUpcomingTableAlign,
}) => {
  const [selectedPosterIndex, setSelectedPosterIndex] = useState<number>(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setOpenSections({});
  }, [mode]);
  const [isDraggingPoster, setIsDraggingPoster] = useState<boolean>(false);
  const [upcomingLang, setUpcomingLang] = useState<'lo' | 'en' | 'th'>('lo');
  const [locationTagLang, setLocationTagLang] = useState<'la' | 'tha' | 'en'>('la');
  const [titleLang, setTitleLang] = useState<'la' | 'tha' | 'en'>('la');
  const [subtitleLang, setSubtitleLang] = useState<'la' | 'tha' | 'en'>('la');
  const [descLang, setDescLang] = useState<'la' | 'tha' | 'en'>('la');
  const [btnTextLang, setBtnTextLang] = useState<'la' | 'tha' | 'en'>('la');
  const [videoBtnTextLang, setVideoBtnTextLang] = useState<'la' | 'tha' | 'en'>('la');
  const [badgeTopLang, setBadgeTopLang] = useState<'la' | 'tha' | 'en'>('la');
  const [badgeBottomLang, setBadgeBottomLang] = useState<'la' | 'tha' | 'en'>('la');

  const setAllNarrativeLang = (l: 'la' | 'tha' | 'en') => {
    setLocationTagLang(l);
    setTitleLang(l);
    setSubtitleLang(l);
    setDescLang(l);
    setBtnTextLang(l);
    setVideoBtnTextLang(l);
    setBadgeTopLang(l);
    setBadgeBottomLang(l);
  };
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);
  const [urlInputValue, setUrlInputValue] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const posterFileInputRef = useRef<HTMLInputElement>(null);
  const posterPreviewRef = useRef<HTMLDivElement>(null);

  const numericTitleSize = (() => {
    if (typeof upcomingTitleSize === 'number' && !isNaN(upcomingTitleSize) && upcomingTitleSize > 0) {
      return upcomingTitleSize;
    }
    if (typeof upcomingTitleSize === 'string') {
      const s = upcomingTitleSize.trim().toLowerCase();
      if (s === 'compact') return 20;
      if (s === 'large') return 36;
      if (s === 'event') return 28;
      const n = parseFloat(s);
      if (!isNaN(n) && n > 0) return n;
    }
    return 28;
  })();

  const normalizedPosterHeight = posterHeight <= 100
    ? Math.min(Math.max(posterHeight, 0), 100)
    : Math.round(Math.min(Math.max((posterHeight - 180) / 380 * 100, 0), 100));
  const previewPosterHeightPx = Math.round(180 + (normalizedPosterHeight / 100) * 260);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isOpen = (key: string) => {
    return !!openSections[key];
  };

  // Helper to read effective settings for any index
  const getEffectiveImageSetting = (index: number) => {
    const custom = imageCustomSettings[index] || {};
    return {
      position: custom.position || posterBgPositions[index] || posterBgPosition || '50% 50%',
      fit: custom.fit || posterFit || 'cover',
      scale: custom.scale !== undefined ? custom.scale : (posterScale !== undefined ? posterScale : 100),
      brightness: custom.brightness !== undefined ? custom.brightness : posterBrightness,
      contrast: custom.contrast !== undefined ? custom.contrast : posterContrast,
      saturation: custom.saturation !== undefined ? custom.saturation : posterSaturation,
      blur: custom.blur !== undefined ? custom.blur : posterBlur,
    };
  };

  const activeImgSetting = getEffectiveImageSetting(selectedPosterIndex);

  // Update setting for the selected image ONLY
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
        scale: current.scale !== undefined ? current.scale : (posterScale || 100),
        brightness: current.brightness !== undefined ? current.brightness : posterBrightness,
        contrast: current.contrast !== undefined ? current.contrast : posterContrast,
        saturation: current.saturation !== undefined ? current.saturation : posterSaturation,
        blur: current.blur !== undefined ? current.blur : posterBlur,
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

    if (patch.scale !== undefined && setPosterScale) {
      setPosterScale(patch.scale);
    }
  };

  const handleResetSelectedImage = (indexToReset: number) => {
    setImageCustomSettings((prev) => {
      const updated = [...prev];
      updated[indexToReset] = {
        position: '50% 50%',
        fit: 'cover',
        scale: 100,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
      };
      return updated;
    });
    setPosterBgPosition('50% 50%');
    if (setPosterScale) setPosterScale(100);
    setPosterBgPositions((prev) => {
      const updated = [...prev];
      updated[indexToReset] = '50% 50%';
      return updated;
    });
  };

  const handleResetAllImages = () => {
    setImageCustomSettings([]);
    setPosterBgPositions([]);
    setPosterBgPosition('50% 50%');
    setPosterFit('cover');
    setPosterBrightness(100);
    setPosterContrast(100);
    setPosterSaturation(100);
    setPosterBlur(0);
    setPosterOverlayOpacity(85);
  };

  const handleRemoveSelectedImage = (idx: number) => {
    const updated = posterImageUrls.filter((_, i) => i !== idx);
    setPosterImageUrls(updated);
    if (updated.length > 0) {
      setPosterImgUrl(updated[0]);
      setSelectedPosterIndex(Math.max(0, Math.min(idx, updated.length - 1)));
    } else {
      setPosterImgUrl('');
      setSelectedPosterIndex(0);
    }
    const newSettings = imageCustomSettings.filter((_, i) => i !== idx);
    setImageCustomSettings(newSettings);
  };

  const handleKeepOnlySelectedImage = (idx: number) => {
    const singleUrl = posterImageUrls[idx] || posterImgUrl;
    if (!singleUrl) return;
    setPosterImageUrls([singleUrl]);
    setPosterImgUrl(singleUrl);
    setSelectedPosterIndex(0);
  };

  const isEditingPoster = true;

  const handleUploadMultiplePosterFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        try {
          const uploadRes = await uploadFileDirectly(file);
          if (uploadRes?.url) {
            newUrls.push(uploadRes.url);
          }
        } catch (uploadErr) {
          console.warn('Direct upload fallback to original data URL:', uploadErr);
          const rawDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
          if (rawDataUrl) {
            newUrls.push(rawDataUrl);
          }
        }
      }

      if (newUrls.length > 0) {
        const existing = posterImageUrls.filter((u) => u && typeof u === 'string' && u.trim());
        const updated = [...existing, ...newUrls];
        setPosterImageUrls(updated);
        if (!posterImgUrl || existing.length === 0) {
          setPosterImgUrl(newUrls[0]);
        }
        setSelectedPosterIndex(existing.length);
      }
    } catch (err) {
      console.error('Multi poster image upload error:', err);
    } finally {
      setIsUploadingImages(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!urlInputValue.trim()) return;
    const cleanUrl = urlInputValue.trim();
    const existing = posterImageUrls.filter((u) => u && typeof u === 'string' && u.trim());
    const updated = [...existing, cleanUrl];
    setPosterImageUrls(updated);
    if (!posterImgUrl || existing.length === 0) {
      setPosterImgUrl(cleanUrl);
    }
    setSelectedPosterIndex(updated.length - 1);
    setUrlInputValue('');
    setShowUrlInput(false);
  };

  const handleMoveImage = (fromIdx: number, direction: 'left' | 'right') => {
    const toIdx = direction === 'left' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= posterImageUrls.length) return;
    const newArr = [...posterImageUrls];
    const item = newArr[fromIdx];
    newArr[fromIdx] = newArr[toIdx];
    newArr[toIdx] = item;
    setPosterImageUrls(newArr);
    if (newArr.length > 0) {
      setPosterImgUrl(newArr[0]);
    }
    const newSettings = [...imageCustomSettings];
    const sItem = newSettings[fromIdx];
    newSettings[fromIdx] = newSettings[toIdx];
    newSettings[toIdx] = sItem;
    setImageCustomSettings(newSettings);
    setSelectedPosterIndex(toIdx);
  };

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

  const handlePosterPointerUp = () => {
    setIsDraggingPoster(false);
  };

  const activeImageSrc =
    (posterImageUrls.length > 0 && posterImageUrls[selectedPosterIndex]) ||
    posterImgUrl ||
    posterImageUrls[0] ||
    '';

  const isPosterMode = mode === 'poster' || mode === 'all';
  const isUpcomingMode = mode === 'upcoming' || mode === 'all';

  return (
    <form onSubmit={onSave} className="space-y-3.5">
      {/* Sections: Home Poster & Hero Text */}
      {isPosterMode && (
        <>
      {/* 1. Poster Studio (Per-Image Settings & Multi-Image Upload) */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('studio')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#cc0000] shrink-0" />
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {language === 'lo'
                ? '1. ສະຕູດິໂອອັບໂຫຼດ & ປັບແຕ່ງຮູບໂພສເຕີ (Poster Images & Studio)'
                : '1. Poster Images & Studio'}
            </h4>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('studio') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('studio') && (
          <div className="p-4 sm:p-5 pt-4 space-y-4 border-t border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
            {/* Hidden file input for multi-file upload */}
            <input
              type="file"
              ref={posterFileInputRef}
              onChange={handleUploadMultiplePosterFiles}
              multiple
              accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.gif,.bmp,.avif,.heic,.heif,.jfif,.tif,.tiff"
              className="hidden"
            />

            {/* Top Toolbar: Upload Buttons & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 p-3 rounded-xl border border-purple-800/50 shadow-inner">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={!isEditingPoster || isUploadingImages}
                  onClick={() => posterFileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isUploadingImages ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {language === 'lo'
                      ? '+ ອັບໂຫຼດຮູບໂພສເຕີເພີ່ມ (ເລືອກໄດ້ຫຼາຍຮູບ)'
                      : '+ Upload Poster Images (Multiple)'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!isEditingPoster}
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-700/60 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'lo' ? 'ໃສ່ລິ້ງ URL' : 'Add Image URL'}</span>
                </button>
              </div>
            </div>

            {/* URL Input Form (if toggled) */}
            {showUrlInput && (
              <div className="p-2.5 bg-slate-950/90 border border-purple-700/60 rounded-xl flex items-center gap-2">
                <input
                  type="text"
                  value={urlInputValue}
                  onChange={(e) => setUrlInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  placeholder="https://example.com/poster.jpg"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  {language === 'lo' ? 'ເພີ່ມ' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUrlInput(false);
                    setUrlInputValue('');
                  }}
                  className="px-2 py-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                </button>
              </div>
            )}

            {/* Visual Image Cards Gallery & Reordering */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-200 flex items-center gap-1.5">
                  <span>
                    {language === 'lo'
                      ? `ຮູບພາບໂພສເຕີທັງໝົດ (${posterImageUrls.length} ຮູບ):`
                      : `Poster Images List (${posterImageUrls.length}):`}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {language === 'lo' ? '(ກົດເລືອກເພື່ອແຕ່ງ, ກົດລູກສອນເພື່ອຈັດລຳດັບ)' : '(Click to edit, arrows to reorder)'}
                  </span>
                </span>
                {posterImageUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleKeepOnlySelectedImage(selectedPosterIndex)}
                    className="px-2 py-0.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    title={language === 'lo' ? 'ເກັບຮູບນີ້ໄວ້ຮູບດຽວ' : 'Keep only this image'}
                  >
                    <Check className="w-3 h-3" />
                    <span>{language === 'lo' ? 'ເກັບໄວ້ແຕ່ຮູບທີ່ເລືອກ' : 'Keep Only Selected'}</span>
                  </button>
                )}
              </div>

              {/* Auto-slideshow status notice */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>
                  {language === 'lo'
                    ? '✨ ໂພສເຕີຈະແລ່ນສະຫຼັບປ່ຽນຮູບກັນອັດຕະໂນມັດ (Auto-slideshow) ຕະຫຼອດເວລາຢູ່ໜ້າຫຼັກ'
                    : '✨ All poster banners will automatically rotate/slide continuously on the home page'}
                </span>
              </div>

              {posterImageUrls.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                  {posterImageUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className={`relative group shrink-0 rounded-xl overflow-hidden border-2 transition-all p-1 ${
                        selectedPosterIndex === idx
                          ? 'border-amber-400 ring-2 ring-amber-400/50 bg-purple-900/50 shadow-lg'
                          : 'border-slate-700 bg-slate-900/80 hover:border-purple-500/80'
                      }`}
                    >
                      <div
                        onClick={() => setSelectedPosterIndex(idx)}
                        className="cursor-pointer"
                      >
                        <img
                          src={url}
                          alt={`Poster ${idx + 1}`}
                          className="w-24 h-16 object-cover rounded-lg"
                        />
                        <div className="absolute top-1.5 left-1.5 bg-slate-950/85 text-amber-300 font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                          #{idx + 1}
                        </div>
                      </div>

                      {/* Reorder and Delete controls on each card */}
                      <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-slate-700/60">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveImage(idx, 'left')}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-800 rounded text-[10px] cursor-pointer"
                          title="Move left"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedImage(idx)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/60 rounded cursor-pointer"
                          title={language === 'lo' ? 'ລຶບຮູບນີ້' : 'Delete'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === posterImageUrls.length - 1}
                          onClick={() => handleMoveImage(idx, 'right')}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-800 rounded text-[10px] cursor-pointer"
                          title="Move right"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add more button tile */}
                  <button
                    type="button"
                    disabled={!isEditingPoster}
                    onClick={() => posterFileInputRef.current?.click()}
                    className="shrink-0 w-24 h-24 border-2 border-dashed border-purple-500/60 hover:border-purple-400 hover:bg-purple-950/40 rounded-xl flex flex-col items-center justify-center gap-1.5 text-purple-300 hover:text-white transition cursor-pointer"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-[10px] font-bold">
                      {language === 'lo' ? '+ ເພີ່ມຮູບ' : '+ Add More'}
                    </span>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => posterFileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-600/60 hover:border-purple-400 rounded-xl p-6 text-center cursor-pointer hover:bg-purple-950/30 transition"
                >
                  <Upload className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                  <p className="text-xs font-bold text-white">
                    {language === 'lo'
                      ? 'ກົດບ່ອນນີ້ເພື່ອອັບໂຫຼດຮູບພາບໂພສເຕີ (ເລືອກໄດ້ຫຼາຍຮູບ)'
                      : 'Click here to upload poster images (Multiple images supported)'}
                  </p>
                  <p className="text-[10px] text-purple-300 mt-1">
                    {language === 'lo'
                      ? 'ສາມາດອັບໂຫຼດໄດ້ເທົ່າທີ່ຕ້ອງການ'
                      : 'Upload as many poster images as needed'}
                  </p>
                </div>
              )}
            </div>

            {/* Live Interactive WYSIWYG Canvas (NO LEFT/RIGHT ARROWS) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <label className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {language === 'lo'
                      ? `ຈຸດສູນກາງຮູບທີ ${selectedPosterIndex + 1} (ແຕະ/ລາກເທິງຮູບ):`
                      : `Focal Center #${selectedPosterIndex + 1} (Click/Drag):`}
                  </span>
                </label>
              </div>

              {/* Canvas Box */}
              <div
                ref={posterPreviewRef}
                onPointerDown={handlePosterPointerDown}
                onPointerMove={handlePosterPointerMove}
                onPointerUp={handlePosterPointerUp}
                className="relative rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-2xl bg-slate-950 group flex items-end justify-center select-none touch-none cursor-crosshair"
                style={{
                  height: `${previewPosterHeightPx}px`,
                  maxHeight: '440px',
                  aspectRatio: posterAspectRatio !== 'auto' ? posterAspectRatio : undefined,
                }}
              >
                {activeImageSrc ? (
                  <img
                    src={activeImageSrc}
                    alt="Poster Preview"
                    className="w-full h-full pointer-events-none select-none transition-all duration-75"
                    style={{
                      objectFit: activeImgSetting.fit,
                      objectPosition: activeImgSetting.position,
                      transformOrigin: activeImgSetting.position,
                      transform: activeImgSetting.scale ? `scale(${activeImgSetting.scale / 100})` : undefined,
                      filter: [
                        activeImgSetting.brightness !== 100
                          ? `brightness(${activeImgSetting.brightness}%)`
                          : '',
                        activeImgSetting.contrast !== 100
                          ? `contrast(${activeImgSetting.contrast}%)`
                          : '',
                        activeImgSetting.saturation !== 100
                          ? `saturate(${activeImgSetting.saturation}%)`
                          : '',
                        activeImgSetting.blur > 0 ? `blur(${activeImgSetting.blur}px)` : '',
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined,
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-1.5 p-4 text-center">
                    <ImageIcon className="w-8 h-8 text-purple-400" />
                    <p className="text-xs font-bold text-slate-300">
                      {language === 'lo'
                        ? 'ບໍ່ມີຮູບໂປສເຕີ. ກະລຸນາເພີ່ມຮູບດ້ານເທິງ'
                        : 'No image selected. Add image above to preview'}
                    </p>
                  </div>
                )}

                {/* Badge indicating which image is currently being tuned */}
                {posterImageUrls.length > 1 && (
                  <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
                    <span className="px-2.5 py-0.5 bg-slate-900/90 text-amber-300 text-[10px] font-black rounded-full border border-amber-400/40 shadow">
                      {language === 'lo'
                        ? `ຮູບ ${selectedPosterIndex + 1} / ${posterImageUrls.length}`
                        : `Img ${selectedPosterIndex + 1} / ${posterImageUrls.length}`}
                    </span>
                  </div>
                )}

                {/* Indicator Overlay with position and scale values */}
                <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-amber-400/30 text-[10px] font-mono text-amber-300 shadow">
                  <span>📍 {activeImgSetting.position}</span>
                  <span className="text-slate-500">•</span>
                  <span>🔍 {activeImgSetting.scale}%</span>
                </div>

                <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-none bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700/60 text-[10px] text-slate-300 flex items-center gap-1.5">
                  <Move className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>
                    {language === 'lo'
                      ? 'ແຕະ ຫຼື ລາກເທິງຮູບເພື່ອປັບຈຸດສູນກາງ'
                      : 'Click or drag on image to set focal position'}
                  </span>
                </div>

                {/* Text Overlay gradient if enabled */}
                {showTextOverlay && (
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/20 pointer-events-none"
                    style={{ opacity: posterOverlayOpacity / 100 }}
                  />
                )}

                {/* Crosshair Target Indicator */}
                <div
                  className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-white bg-amber-400 shadow-2xl pointer-events-none flex items-center justify-center text-slate-950 ring-4 ring-amber-400/40 z-30 transition-transform active:scale-125"
                  style={{
                    left: activeImgSetting.position.split(' ')[0],
                    top: activeImgSetting.position.split(' ')[1] || '50%',
                  }}
                  title={language === 'lo' ? 'ຈຸດສູນກາງຮູບ' : 'Focal Center'}
                >
                  <Crosshair className="w-4 h-4 animate-pulse" />
                </div>

                {/* Subtle, restrained wave bottom edge in live preview */}
                <div className="absolute -bottom-px left-0 right-0 w-full overflow-hidden leading-none pointer-events-none z-20">
                  <svg
                    viewBox="0 0 1440 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="relative block w-full h-2.5 sm:h-3 text-slate-900"
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

            {/* Compact Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {/* Zoom & Scale (Per Image) */}
              <div className="space-y-1.5 bg-slate-800/90 p-2.5 rounded-xl border border-purple-800/40">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'lo' ? 'ຂະໜາດຮູບ / ຊູມ (Zoom):' : 'Zoom & Scale:'}</span>
                  </span>
                  <span className="font-mono text-emerald-300 text-[10px]">
                    {activeImgSetting.scale}%
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="250"
                  step="5"
                  value={activeImgSetting.scale}
                  onChange={(e) =>
                    updateActiveImageSetting({ scale: Number(e.target.value) })
                  }
                  className="w-full accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[
                    { val: 60, label: '60%' },
                    { val: 100, label: '100%' },
                    { val: 140, label: '140%' },
                    { val: 180, label: '180%' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => updateActiveImageSetting({ scale: preset.val })}
                      className={`px-1 py-0.5 rounded text-[9px] font-bold transition border cursor-pointer ${
                        activeImgSetting.scale === preset.val
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Fit Mode (Per Image) */}
              <div className="space-y-1.5 bg-slate-800/90 p-2.5 rounded-xl border border-purple-800/40">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                  <span>{language === 'lo' ? 'Fit (ຮູບແບບ):' : 'Fit Mode:'}</span>
                  <span className="font-mono text-emerald-300 text-[10px]">
                    {activeImgSetting.fit}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'cover', label: 'Cover' },
                    { id: 'contain', label: 'Contain' },
                    { id: 'fill', label: 'Fill' },
                    { id: 'scale-down', label: 'Scale' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        updateActiveImageSetting({ fit: mode.id as any })
                      }
                      className={`px-1.5 py-1 rounded text-[10px] font-bold transition border cursor-pointer ${
                        activeImgSetting.fit === mode.id
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Height (0 to 100) */}
              <div className="space-y-1.5 bg-slate-800/90 p-2.5 rounded-xl border border-purple-800/40">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                  <span>{language === 'lo' ? 'H (ຄວາມສູງ 0-100):' : 'Height (0-100):'}</span>
                  <span className="font-mono text-emerald-300 text-[10px]">{normalizedPosterHeight}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={normalizedPosterHeight}
                  onChange={(e) => setPosterHeight(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                  <button type="button" onClick={() => setPosterHeight(0)} className="hover:text-amber-300 cursor-pointer">
                    0 ({language === 'lo' ? 'ຕໍ່າສຸດ' : 'Min'})
                  </button>
                  <button type="button" onClick={() => setPosterHeight(50)} className="hover:text-amber-300 cursor-pointer">
                    50 ({language === 'lo' ? 'ປານກາງ' : 'Mid'})
                  </button>
                  <button type="button" onClick={() => setPosterHeight(100)} className="hover:text-amber-300 cursor-pointer">
                    100 ({language === 'lo' ? 'ສູງສຸດ' : 'Max'})
                  </button>
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5 bg-slate-800/90 p-2.5 rounded-xl border border-purple-800/40">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                  <span>{language === 'lo' ? 'Ratio (ອັດຕາສ່ວນ):' : 'Ratio:'}</span>
                  <span className="font-mono text-emerald-300 text-[10px]">
                    {posterAspectRatio}
                  </span>
                </div>
                <select
                  value={posterAspectRatio}
                  onChange={(e) => setPosterAspectRatio(e.target.value as any)}
                  className="w-full bg-slate-900 border border-purple-700 rounded-lg px-2 py-1 text-[11px] font-bold text-white outline-none cursor-pointer"
                >
                  <option value="auto">Auto (Responsive)</option>
                  <option value="16/9">16:9 Banner</option>
                  <option value="21/9">21:9 Ultra-Wide</option>
                  <option value="4:3">4:3 Standard</option>
                  <option value="1/1">1:1 Square</option>
                  <option value="3/4">3:4 Vertical</option>
                  <option value="9/16">9:16 Story</option>
                </select>
              </div>

              {/* Brightness (Per Image) */}
              <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>B (Brightness):</span>
                  </span>
                  <span className="font-mono text-amber-300 text-[10px]">
                    {activeImgSetting.brightness}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="5"
                  value={activeImgSetting.brightness}
                  onChange={(e) =>
                    updateActiveImageSetting({ brightness: Number(e.target.value) })
                  }
                  className="w-full accent-amber-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Contrast (Per Image) */}
              <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-indigo-400" />
                    <span>C (Contrast):</span>
                  </span>
                  <span className="font-mono text-indigo-300 text-[10px]">
                    {activeImgSetting.contrast}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={activeImgSetting.contrast}
                  onChange={(e) =>
                    updateActiveImageSetting({ contrast: Number(e.target.value) })
                  }
                  className="w-full accent-indigo-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Saturation (Per Image) */}
              <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                  <span className="flex items-center gap-1">
                    <Palette className="w-3 h-3 text-pink-400" />
                    <span>S (Saturation):</span>
                  </span>
                  <span className="font-mono text-pink-300 text-[10px]">
                    {activeImgSetting.saturation}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={activeImgSetting.saturation}
                  onChange={(e) =>
                    updateActiveImageSetting({ saturation: Number(e.target.value) })
                  }
                  className="w-full accent-pink-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Blur (Per Image) */}
              <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Blur (ເບີ):</span>
                  </span>
                  <span className="font-mono text-cyan-300 text-[10px]">
                    {activeImgSetting.blur}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={activeImgSetting.blur}
                  onChange={(e) =>
                    updateActiveImageSetting({ blur: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Overlay Opacity (Global) - ປັບຄວາມມືດທຶບ/ໂປ່ງໃສ 0 ຫາ 100 */}
              <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-emerald-400" />
                    <span>{language === 'lo' ? 'ຄວາມມືດທຶບເນື້ອຫາ/Overlay:' : 'Overlay Opacity:'}</span>
                  </span>
                  <span className="font-mono text-emerald-300 text-[10px]">
                    {posterOverlayOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={posterOverlayOpacity}
                  onChange={(e) => setPosterOverlayOpacity(Number(e.target.value))}
                  className="w-full accent-emerald-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                  <button type="button" onClick={() => setPosterOverlayOpacity(0)}>0% (ໂປ່ງໃສ)</button>
                  <button type="button" onClick={() => setPosterOverlayOpacity(50)}>50%</button>
                  <button type="button" onClick={() => setPosterOverlayOpacity(100)}>100% (ທຶບສຸດ)</button>
                </div>
              </div>

              {/* Edge Fade Blur (Global) - ປັບຄວາມມົວ/ຈາງຂອບເທິງ-ລຸ່ມ 0 ຫາ 100 */}
              <div className="space-y-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>{language === 'lo' ? 'ຄວາມຈາງຂອບເທິງ-ລຸ່ມ (Edge Fade):' : 'Edge Fade Blur:'}</span>
                  </span>
                  <span className="font-mono text-purple-300 text-[10px]">
                    {posterEdgeFade}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={posterEdgeFade}
                  onChange={(e) => setPosterEdgeFade && setPosterEdgeFade(Number(e.target.value))}
                  className="w-full accent-purple-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                  <button type="button" onClick={() => setPosterEdgeFade && setPosterEdgeFade(0)}>0% (ຄົມ)</button>
                  <button type="button" onClick={() => setPosterEdgeFade && setPosterEdgeFade(30)}>30%</button>
                  <button type="button" onClick={() => setPosterEdgeFade && setPosterEdgeFade(70)}>70% (ຈາງມົວ)</button>
                </div>
              </div>
            </div>

            {/* Bottom Save Bar for Section 1 (Studio) */}
            <div className="pt-3 border-t border-purple-800/60 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingPoster}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isSavingPoster ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Poster Text Fields & Narrative */}
      <div id="poster-text-settings-section" className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('text')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-purple-600 shrink-0" />
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {language === 'lo'
                ? '2. ບ່ອນແກ້ໄຂຂໍ້ຄວາມທຸກຢ່າງເທິງໂພສເຕີ (Edit All Poster Texts)'
                : '2. Edit All Poster Texts'}
            </h4>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('text') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('text') && (
          <div className="p-5 pt-4 space-y-4 border-t border-slate-200 dark:border-slate-700">
            {/* Visibility Toggle Inside Section 2 */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'lo' ? 'ສະແດງຂໍ້ຄວາມເທິງໂພສເຕີ (Text Overlay Visibility):' : 'Poster Text Overlay Visibility:'}
              </span>
              <button
                type="button"
                disabled={!isEditingPoster}
                onClick={() => {
                  if (isEditingPoster) {
                    setShowTextOverlay(!showTextOverlay);
                  }
                }}
                className={`px-3 py-1.5 transition rounded-lg text-xs font-bold flex items-center gap-1.5 border cursor-pointer ${
                  !showTextOverlay
                    ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                }`}
              >
                {!showTextOverlay ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>{language === 'lo' ? 'ເຊື່ອງຂໍ້ຄວາມ (Hidden)' : 'Hidden'}</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'lo' ? 'ສະແດງຂໍ້ຄວາມ (Visible)' : 'Visible'}</span>
                  </>
                )}
              </button>
            </div>
            {/* Visual Guide Box Matching Exact Poster Elements in Screenshots */}
            <div className="bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-rose-500/10 border border-purple-300 dark:border-purple-700 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="font-black text-xs text-purple-900 dark:text-purple-200">
                  {language === 'lo'
                    ? '✨ ຫ້ອງນີ້ແມ່ນບ່ອນແກ້ໄຂ 3 ສ່ວນຫຼັກເທິງໂພສເຕີ (ກົດປ້ອນຂໍ້ຄວາມໃສ່ຊ່ອງລຸ່ມນີ້):'
                    : '✨ Edit all 3 main text parts on the poster right below:'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-bold">1. ປ້າຍສະຖານທີ່ (Location Tag):</div>
                  <div className="font-extrabold text-[#ee1c25] flex items-center gap-1 mt-0.5 text-xs truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{posterLocationTag || 'BOKEO PROVINCE · LAO PDR'}</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-bold">2. ຫົວຂໍ້ໃຫຍ່ (Headline):</div>
                  <div className="font-extrabold text-slate-900 dark:text-white truncate mt-0.5 text-xs">
                    {posterTitle || 'Hope is growing in Bokeo.'}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-bold">3. ປ້າຍລາຍມື (Right Badge):</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400 truncate mt-0.5 text-xs">
                    ✍️ {posterBadgeTopText || 'Real People.'} {posterBadgeBottomText || 'Real Hope.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Switch All Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {language === 'lo' ? 'ປ່ຽນພາສາທຸກຊ່ອງພ້ອມກັນ:' : 'Switch All Language Tabs:'}
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {(['la', 'tha', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setAllNarrativeLang(l)}
                    className="px-2.5 py-0.5 rounded-md text-[10.5px] font-black text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer"
                  >
                    {l === 'la' ? 'La' : l === 'tha' ? 'Tha' : 'En'}
                  </button>
                ))}
              </div>
            </div>

            {/* 1. Location Tag / Kicker (ເທິງສຸດຂອງໂພສເຕີ) */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#ee1c25] shrink-0" />
                  <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200">
                    {language === 'lo' ? '1. ປ້າຍສະຖານທີ່ເທິງສຸດ (BOKEO PROVINCE · LAO PDR)' : '1. Top Location Tag (BOKEO PROVINCE · LAO PDR)'}
                  </label>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {(['la', 'tha', 'en'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLocationTagLang(l)}
                      className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                        locationTagLang === l
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {l === 'la' ? 'La' : l === 'tha' ? 'Tha' : 'En'}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                disabled={!isEditingPoster}
                value={
                  locationTagLang === 'la'
                    ? (posterLocationTag || '')
                    : locationTagLang === 'tha'
                    ? (posterLocationTagTh || '')
                    : (posterLocationTagEn || '')
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (locationTagLang === 'la') setPosterLocationTag?.(val);
                  else if (locationTagLang === 'tha') setPosterLocationTagTh?.(val);
                  else setPosterLocationTagEn?.(val);
                }}
                placeholder="BOKEO PROVINCE · LAO PDR"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>

            {/* 2. Main Title (Single box with [La] [Tha] [En] on top) */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200">
                  {language === 'lo' ? '2. ຫົວຂໍ້ຫຼັກໃຫຍ່ (Main Title - Hope is growing in Bokeo.) *' : '2. Main Title / Headline (Hope is growing in Bokeo.) *'}
                </label>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {(['la', 'tha', 'en'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setTitleLang(l)}
                      className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                        titleLang === l
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {l === 'la' ? 'La' : l === 'tha' ? 'Tha' : 'En'}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                required
                disabled={!isEditingPoster}
                value={
                  titleLang === 'la'
                    ? posterTitle
                    : titleLang === 'tha'
                    ? posterTitleTh
                    : posterTitleEn
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (titleLang === 'la') setPosterTitle(val);
                  else if (titleLang === 'tha') setPosterTitleTh(val);
                  else setPosterTitleEn(val);
                }}
                placeholder="Hope is growing in Bokeo."
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>

            {/* 3. Subtitle (Single box with [La] [Tha] [En] on top) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {language === 'lo' ? 'ຫົວຂໍ້ຍ່ອຍ / ຄຳຂວັນ (Subtitle / Tagline)' : 'Subtitle / Tagline'}
                </label>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {(['la', 'tha', 'en'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setSubtitleLang(l)}
                      className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                        subtitleLang === l
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {l === 'la' ? 'La' : l === 'tha' ? 'Tha' : 'En'}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                disabled={!isEditingPoster}
                value={
                  subtitleLang === 'la'
                    ? posterSubtitle
                    : subtitleLang === 'tha'
                    ? posterSubtitleTh
                    : posterSubtitleEn
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (subtitleLang === 'la') setPosterSubtitle(val);
                  else if (subtitleLang === 'tha') setPosterSubtitleTh(val);
                  else setPosterSubtitleEn(val);
                }}
                placeholder={
                  subtitleLang === 'la'
                    ? 'ແຂວງບໍ່ແກ້ວ'
                    : subtitleLang === 'tha'
                    ? 'แขวงบ่อแก้ว'
                    : 'Bokeo Province'
                }
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>

            {/* 4. Narrative Text Below Poster (Single textarea box with [La] [Tha] [En] on top) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="block text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                    {language === 'lo' ? 'ຂໍ້ຄວາມບັນລະຍາຍ ໃຕ້ໂພສເຕີ (Narrative Below Poster)' : 'Narrative Text Below Poster'}
                  </label>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                    ({language === 'lo' ? 'ເນື້ອໃນບັນລະຍາຍຫຼັກ' : 'Main narrative text'})
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {(['la', 'tha', 'en'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setDescLang(l)}
                      className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                        descLang === l
                          ? 'bg-purple-600 text-white shadow-xs'
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
                disabled={!isEditingPoster}
                value={
                  descLang === 'la'
                    ? posterDesc
                    : descLang === 'tha'
                    ? posterDescTh
                    : posterDescEn
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (descLang === 'la') setPosterDesc(val);
                  else if (descLang === 'tha') setPosterDescTh(val);
                  else setPosterDescEn(val);
                }}
                placeholder={
                  descLang === 'la'
                    ? 'ຮ່ວມເປັນສ່ວນສຳຄັນໃນການຊຸກຍູ້ພັນທະກິດຂອງພຣະເຈົ້າ ໃນແຂວງບໍ່ແກ້ວ...'
                    : descLang === 'tha'
                    ? 'เราร่วมมือกับคริสตจักรท้องถิ่นเพื่อประกาศข่าวประเสริฐ...'
                    : 'We partner with local churches to share the gospel...'
                }
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>

            {/* 5. CTA Buttons on Poster */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
              <div className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                <span>{language === 'lo' ? 'ຂໍ້ຄວາມປຸ່ມກົດເທິງໂພສເຕີ (Action Buttons)' : 'Poster Action Buttons'}</span>
              </div>

              {/* Button 1: Primary Action Button (View Dashboard) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {language === 'lo' ? 'ປຸ່ມທີ 1: ເບິ່ງດາສບອດ (Primary Button)' : 'Button 1: View Dashboard (Primary)'}
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {(['la', 'tha', 'en'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setBtnTextLang(l)}
                        className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                          btnTextLang === l
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {l === 'la' ? 'La' : l === 'tha' ? 'Tha' : 'En'}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  disabled={!isEditingPoster}
                  value={
                    btnTextLang === 'la'
                      ? posterBtnText
                      : btnTextLang === 'tha'
                      ? (posterBtnTextTh || '')
                      : (posterBtnTextEn || '')
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (btnTextLang === 'la') setPosterBtnText(val);
                    else if (btnTextLang === 'tha') setPosterBtnTextTh?.(val);
                    else setPosterBtnTextEn?.(val);
                  }}
                  placeholder={
                    btnTextLang === 'la'
                      ? 'ເບິ່ງດາສບອດຂໍ້ມູນ'
                      : btnTextLang === 'tha'
                      ? 'ดูแดชบอร์ดข้อมูล'
                      : 'View Dashboard'
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>

              {/* Button 2: Video Action Button (Watch Our Story) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {language === 'lo' ? 'ປຸ່ມທີ 2: ຮັບຊົມເລື່ອງລາວ (Video Story Button)' : 'Button 2: Watch Story (Video)'}
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {(['la', 'tha', 'en'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setVideoBtnTextLang(l)}
                        className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                          videoBtnTextLang === l
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {l === 'la' ? 'La' : l === 'tha' ? 'Tha' : 'En'}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  disabled={!isEditingPoster}
                  value={
                    videoBtnTextLang === 'la'
                      ? (posterVideoBtnText || '')
                      : videoBtnTextLang === 'tha'
                      ? (posterVideoBtnTextTh || '')
                      : (posterVideoBtnTextEn || '')
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (videoBtnTextLang === 'la') setPosterVideoBtnText?.(val);
                    else if (videoBtnTextLang === 'tha') setPosterVideoBtnTextTh?.(val);
                    else setPosterVideoBtnTextEn?.(val);
                  }}
                  placeholder={
                    videoBtnTextLang === 'la'
                      ? 'ຮັບຊົມເລື່ອງລາວຂອງພວກເຮົາ'
                      : videoBtnTextLang === 'tha'
                      ? 'รับชมเรื่องราวของเรา'
                      : 'Watch Our Story'
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
            </div>

            {/* 6. Right Badge: "Real People. Real Hope." */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-3 p-3 bg-white dark:bg-slate-800/80 rounded-xl border">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{language === 'lo' ? '3. ປ້າຍລາຍມືດ້ານຂວາໂພສເຕີ (Real People. Real Hope.)' : '3. Right Badge (Real People. Real Hope.)'}</span>
                </div>
                <button
                  type="button"
                  disabled={!isEditingPoster}
                  onClick={() => setHideRightBadge?.(!hideRightBadge)}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                    hideRightBadge
                      ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400'
                  }`}
                  title={hideRightBadge ? 'ປັດຈຸບັນເຊື່ອງຢູ່' : 'ປັດຈຸບັນສະແດງຢູ່'}
                >
                  {hideRightBadge ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{hideRightBadge ? (language === 'lo' ? 'ເຊື່ອງແລ້ວ' : 'Hidden') : (language === 'lo' ? 'ກຳລັງສະແດງ' : 'Visible')}</span>
                </button>
              </div>

              {/* Exact visual preview mirroring Image 1 */}
              <div className="bg-slate-950 p-4 rounded-xl flex items-center justify-center select-none shadow-md border border-slate-800">
                <div className="flex flex-col items-center rotate-[-6deg]">
                  <span
                    style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
                    className="text-2xl sm:text-3xl font-bold tracking-wide text-white drop-shadow-md"
                  >
                    {badgeTopLang === 'la'
                      ? (posterBadgeTopText || 'Real People.')
                      : badgeTopLang === 'tha'
                      ? (posterBadgeTopTextTh || posterBadgeTopText || 'Real People.')
                      : (posterBadgeTopTextEn || posterBadgeTopText || 'Real People.')}
                  </span>
                  <span
                    style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
                    className="text-2xl sm:text-3xl font-bold tracking-wide text-white relative inline-block drop-shadow-md"
                  >
                    {badgeBottomLang === 'la'
                      ? (posterBadgeBottomText || 'Real Hope.')
                      : badgeBottomLang === 'tha'
                      ? (posterBadgeBottomTextTh || posterBadgeBottomText || 'Real Hope.')
                      : (posterBadgeBottomTextEn || posterBadgeBottomText || 'Real Hope.')}
                    <svg
                      className="w-full h-3.5 sm:h-4 -mt-1 text-[#ee1c25]"
                      viewBox="0 0 120 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M 4 9 C 35 15, 85 14, 116 3"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Badge Top Line */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {language === 'lo' ? 'ແຖວເທິງ (Top Line - e.g. Real People.)' : 'Top Line (e.g. Real People.)'}
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {(['la', 'tha', 'en'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setBadgeTopLang(l)}
                        className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                          badgeTopLang === l
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {l === 'la' ? 'La' : l === 'tha' ? 'Tha' : 'En'}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  disabled={!isEditingPoster}
                  value={
                    badgeTopLang === 'la'
                      ? (posterBadgeTopText || '')
                      : badgeTopLang === 'tha'
                      ? (posterBadgeTopTextTh || '')
                      : (posterBadgeTopTextEn || '')
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (badgeTopLang === 'la') setPosterBadgeTopText?.(val);
                    else if (badgeTopLang === 'tha') setPosterBadgeTopTextTh?.(val);
                    else setPosterBadgeTopTextEn?.(val);
                  }}
                  placeholder="Real People."
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>

              {/* Badge Bottom Line */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {language === 'lo' ? 'ແຖວລຸ່ມ (Bottom Line - e.g. Real Hope.)' : 'Bottom Line (e.g. Real Hope.)'}
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {(['la', 'tha', 'en'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setBadgeBottomLang(l)}
                        className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                          badgeBottomLang === l
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {l === 'la' ? 'La' : l === 'tha' ? 'Tha' : 'En'}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  disabled={!isEditingPoster}
                  value={
                    badgeBottomLang === 'la'
                      ? (posterBadgeBottomText || '')
                      : badgeBottomLang === 'tha'
                      ? (posterBadgeBottomTextTh || '')
                      : (posterBadgeBottomTextEn || '')
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (badgeBottomLang === 'la') setPosterBadgeBottomText?.(val);
                    else if (badgeBottomLang === 'tha') setPosterBadgeBottomTextTh?.(val);
                    else setPosterBadgeBottomTextEn?.(val);
                  }}
                  placeholder="Real Hope."
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
            </div>

            {/* Bottom Save Bar for Section 2 (Text) */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingPoster}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isSavingPoster ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Official Logo Upload Section */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('logo')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#cc0000] shrink-0" />
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {language === 'lo'
                ? '3. ອັບໂຫຼດໂລໂກ້ຕົ້ນສະບັບຂອງອົງກອນ (Official Organization Logo)'
                : '3. Official Organization Logo'}
            </h4>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('logo') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('logo') && (
          <div className="p-5 pt-4 space-y-4 border-t border-slate-200 dark:border-slate-700">
            <UnifiedMediaUploader
              disabled={!isEditingPoster}
              value={orgLogoUrl}
              preserveTransparency={true}
              onChange={(url) => {
                setOrgLogoUrl(url);
                if (url) {
                  try {
                    localStorage.setItem('hb_custom_logo', url);
                    window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: url }));
                  } catch {}
                } else {
                  try {
                    localStorage.removeItem('hb_custom_logo');
                    window.dispatchEvent(
                      new CustomEvent('hb_logo_updated', { detail: '/hb-logo.svg' })
                    );
                  } catch {}
                }
                if (db) {
                  setDoc(
                    doc(db, 'app_config', 'homePoster'),
                    { logoUrl: url || '', updatedAt: new Date().toISOString() },
                    { merge: true }
                  ).catch(() => {});
                }
              }}
              language={language}
              label={
                language === 'lo'
                  ? 'ເລືອກໄຟລ໌ໂລໂກ້ ຫຼື ວ່າງລິງ URL (ຮອງຮັບຮູບໂປ່ງໃສ ບໍ່ມີພື້ນຫຼັງ):'
                  : 'Choose Logo File or Paste URL (Transparent PNG/SVG Supported):'
              }
              acceptTypes="image/*,.svg,.png,.webp,.jpg,.jpeg"
            />

            {/* Smart Background Remover Tool */}
            <LogoBgRemover
              currentLogoUrl={orgLogoUrl || '/hb-logo.svg'}
              onApplyLogo={(newTransparentUrl) => {
                setOrgLogoUrl(newTransparentUrl);
                try {
                  localStorage.setItem('hb_custom_logo', newTransparentUrl);
                  window.dispatchEvent(new CustomEvent('hb_logo_updated', { detail: newTransparentUrl }));
                } catch {}
                if (db) {
                  setDoc(
                    doc(db, 'app_config', 'homePoster'),
                    { logoUrl: newTransparentUrl || '', updatedAt: new Date().toISOString() },
                    { merge: true }
                  ).catch(() => {});
                }
              }}
              language={language}
              disabled={!isEditingPoster}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <HbLogo logoUrl={orgLogoUrl} className="h-8 w-auto text-[#ee1c25]" />
                  <span className="font-bold text-slate-800 text-xs">Hope Bokeo</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  Light Header
                </span>
              </div>
              <div className="dark dark-preview-container bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <HbLogo logoUrl={orgLogoUrl} className="h-8 w-auto text-[#ee1c25]" />
                  <span className="font-bold text-white text-xs">Hope Bokeo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-700/50 px-1.5 py-0.5 rounded">
                    {language === 'lo' ? 'ຂອບສີຂາວ' : 'White Stroke'}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    Dark Header
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Save Bar for Section 3 (Logo) */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingPoster}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isSavingPoster ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* ງານທີ່ຈະມາເຖິງ (ແຈ້ງການ & ປະກາດ - Upcoming Events & Announcements) */}
      {isUpcomingMode && (
        <div id="upcoming-event-settings" className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs transition">
          <button
            type="button"
            onClick={() => toggleSection('upcoming_event')}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#cc0000] shrink-0" />
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {mode === 'upcoming'
                  ? (language === 'lo' ? '1. ງານທີ່ຈະມາເຖິງ & ແຈ້ງການ (Upcoming Events & Announcements)' : language === 'th' ? '1. กิจกรรมที่กำลังจะมาถึง & ข่าวประกาศ' : '1. Upcoming Events & Announcements')
                  : (language === 'lo' ? '5. ງານທີ່ຈະມາເຖິງ (ແຈ້ງການ & ປະກາດ)' : language === 'th' ? '5. กิจกรรมที่กำลังจะมาถึง (ข่าวประกาศ)' : '5. Upcoming Events & Announcements')}
              </h4>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                isOpen('upcoming_event') ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </button>

        {isOpen('upcoming_event') && (
          <div className="p-5 pt-4 space-y-4 border-t border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100">
            {/* Show/Hide switch & Intro */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 bg-red-50/60 dark:bg-red-950/40 rounded-xl border border-red-200/70 dark:border-red-900/40">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                  <Megaphone className="w-3.5 h-3.5 text-[#cc0000]" />
                  <span>{language === 'lo' ? 'ສະຖານະການສະແດງຜົນງານທີ່ຈະມາເຖິງ' : 'Upcoming Event Visibility'}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'lo'
                    ? 'ບ່ອນປະກາດ ຫຼື ແຈ້ງການຂ່າວສານງານທີ່ຈະມາເຖິງ (ສະແດງຢູ່ກ້ອງໂພສເຕີໜ້າຫຼັກ)'
                    : 'Show upcoming event or announcement notice board directly underneath the hero poster'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  disabled={!isEditingPoster}
                  checked={!hideUpcomingEvent}
                  onChange={(e) => setHideUpcomingEvent && setHideUpcomingEvent(!e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#cc0000]"></div>
                <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {!hideUpcomingEvent
                    ? (language === 'lo' ? 'ສະແດງ' : 'Show')
                    : (language === 'lo' ? 'ເຊື່ອງ' : 'Hide')}
                </span>
              </label>
            </div>

            {/* 1. Event Title (ຫົວຂໍ້ງານ - ຮອງຮັບ Lo, En, Th ພ້ອມປຸ່ມປ່ຽນພາສາໃນຕົວ) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#cc0000]"></span>
                  <span>{language === 'lo' ? 'ຫົວຂໍ້ງານ / ແຈ້ງການ (Title)' : 'Event / Announcement Title'}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 dark:bg-red-950 text-[#cc0000]">
                    {upcomingLang === 'lo' ? 'Lo (ລາວ)' : upcomingLang === 'en' ? 'En (English)' : 'Th (ໄທ)'}
                  </span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  {(['lo', 'en', 'th'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setUpcomingLang(l)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase transition cursor-pointer ${
                        upcomingLang === l
                          ? 'bg-[#cc0000] text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                disabled={!isEditingPoster}
                value={
                  upcomingLang === 'lo'
                    ? upcomingEventTitle
                    : upcomingLang === 'en'
                    ? upcomingEventTitleEn
                    : upcomingEventTitleTh
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (upcomingLang === 'lo' && setUpcomingEventTitle) setUpcomingEventTitle(val);
                  else if (upcomingLang === 'en' && setUpcomingEventTitleEn) setUpcomingEventTitleEn(val);
                  else if (upcomingLang === 'th' && setUpcomingEventTitleTh) setUpcomingEventTitleTh(val);
                }}
                placeholder={
                  upcomingLang === 'lo'
                    ? 'ຕົວຢ່າງ: ງານສຳມະນາ ແລະ ງານປະກາດຂ່າວປະເສີດ ປະຈຳປີ'
                    : upcomingLang === 'en'
                    ? 'e.g. Annual Gospel & Leadership Conference'
                    : 'เช่น งานสัมมนาและประกาศข่าวประเสริฐประจำปี'
                }
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500/40 font-medium shadow-xs"
              />

              {/* Title Size Control: Microsoft Word Style (Number input, +/-, and quick presets) */}
              <div className="flex flex-wrap items-center gap-2 pt-1 p-2 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span className="text-xs font-serif font-black text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    A
                  </span>
                  <span>{language === 'lo' ? 'ຂະໜາດຫົວຂໍ້ (Font Size):' : 'Title Font Size:'}</span>
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-300 dark:border-slate-600 shadow-xs">
                  {/* Decrease font size button (-) */}
                  <button
                    type="button"
                    disabled={!isEditingPoster || numericTitleSize <= 10}
                    onClick={() => {
                      if (!setUpcomingTitleSize) return;
                      const next = Math.max(10, numericTitleSize - (numericTitleSize > 24 ? 2 : 1));
                      setUpcomingTitleSize(next);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-black transition cursor-pointer disabled:opacity-30"
                    title={language === 'lo' ? 'ລົດຂະໜາດຕົວໜັງສື' : 'Decrease Font Size (Ctrl+[)'}
                  >
                    −
                  </button>

                  {/* Word-style Number Input Box */}
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={10}
                      max={80}
                      step={1}
                      disabled={!isEditingPoster}
                      value={numericTitleSize}
                      onChange={(e) => {
                        if (!setUpcomingTitleSize) return;
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setUpcomingTitleSize(Math.max(10, Math.min(80, val)));
                        }
                      }}
                      className="w-12 text-center py-0.5 text-xs font-black font-mono bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded border border-slate-200 dark:border-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 font-bold ml-1 mr-1">px</span>
                  </div>

                  {/* Increase font size button (+) */}
                  <button
                    type="button"
                    disabled={!isEditingPoster || numericTitleSize >= 80}
                    onClick={() => {
                      if (!setUpcomingTitleSize) return;
                      const next = Math.min(80, numericTitleSize + (numericTitleSize >= 24 ? 2 : 1));
                      setUpcomingTitleSize(next);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-black transition cursor-pointer disabled:opacity-30"
                    title={language === 'lo' ? 'ເພີ່ມຂະໜາດຕົວໜັງສື' : 'Increase Font Size (Ctrl+])'}
                  >
                    +
                  </button>
                </div>

                {/* Quick Word Font Size Presets Dropdown */}
                <select
                  disabled={!isEditingPoster}
                  value={numericTitleSize}
                  onChange={(e) => {
                    if (!setUpcomingTitleSize) return;
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setUpcomingTitleSize(val);
                  }}
                  className="h-7 px-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 cursor-pointer outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                  title={language === 'lo' ? 'ເລືອກຂະໜາດມາດຕະຖານ Word' : 'Select Word Font Size'}
                >
                  {[14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 48, 56, 72].map((s) => (
                    <option key={s} value={s}>
                      {s} pt {s === 28 ? `(${language === 'lo' ? 'ມາດຕະຖານ' : 'Default'})` : ''}
                    </option>
                  ))}
                </select>

                {/* Quick preset buttons */}
                <div className="flex items-center gap-1">
                  {[18, 24, 28, 36].map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={!isEditingPoster}
                      onClick={() => setUpcomingTitleSize && setUpcomingTitleSize(s)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                        numericTitleSize === s
                          ? 'bg-blue-600 text-white font-black shadow-xs'
                          : 'bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                  {numericTitleSize !== 28 && (
                    <button
                      type="button"
                      disabled={!isEditingPoster}
                      onClick={() => setUpcomingTitleSize && setUpcomingTitleSize(28)}
                      className="px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-200/70 dark:bg-slate-700/60 rounded transition cursor-pointer"
                      title={language === 'lo' ? 'ຄືນຄ່າມາດຕະຖານ (28px)' : 'Reset to default (28px)'}
                    >
                      {language === 'lo' ? 'ຄືນຄ່າ 28' : 'Reset 28'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Date, Location & Badge (3 ຊ່ອງກະທັດຮັດ) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#cc0000]" />
                  <span>{language === 'lo' ? 'ວັນທີເດືອນປີ (Date)' : 'Date'}</span>
                </label>
                <input
                  type="text"
                  disabled={!isEditingPoster}
                  value={upcomingEventDate}
                  onChange={(e) => setUpcomingEventDate && setUpcomingEventDate(e.target.value)}
                  placeholder="15 - 18 ຕຸລາ 2026"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500/40 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#cc0000]" />
                    <span>{language === 'lo' ? 'ສະຖານທີ່ (Location)' : 'Location'}</span>
                    <span className="px-1 rounded text-[9px] font-black uppercase bg-red-100 dark:bg-red-950 text-[#cc0000]">
                      {upcomingLang}
                    </span>
                  </span>
                  <div className="flex items-center gap-0.5">
                    {(['lo', 'en', 'th'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setUpcomingLang(l)}
                        className={`px-1 py-0.2 rounded text-[9px] font-bold uppercase ${
                          upcomingLang === l ? 'bg-[#cc0000] text-white' : 'text-slate-400'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </label>
                <input
                  type="text"
                  disabled={!isEditingPoster}
                  value={
                    upcomingLang === 'lo'
                      ? upcomingEventLocation
                      : upcomingLang === 'en'
                      ? upcomingEventLocationEn
                      : upcomingEventLocationTh
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (upcomingLang === 'lo' && setUpcomingEventLocation) setUpcomingEventLocation(val);
                    else if (upcomingLang === 'en' && setUpcomingEventLocationEn) setUpcomingEventLocationEn(val);
                    else if (upcomingLang === 'th' && setUpcomingEventLocationTh) setUpcomingEventLocationTh(val);
                  }}
                  placeholder={
                    upcomingLang === 'lo'
                      ? 'ແຂວງບໍ່ແກ້ວ'
                      : upcomingLang === 'en'
                      ? 'Bokeo Province'
                      : 'แขวงบ่อแก้ว'
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500/40 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-[#cc0000]" />
                  <span>{language === 'lo' ? 'ປ້າຍແຈ້ງການ (Badge)' : 'Badge / Tag'}</span>
                </label>
                <input
                  type="text"
                  disabled={!isEditingPoster}
                  value={upcomingEventBadge}
                  onChange={(e) => setUpcomingEventBadge && setUpcomingEventBadge(e.target.value)}
                  placeholder="ແຈ້ງການ & ປະກາດ"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500/40 font-medium"
                />
              </div>
            </div>

            {/* 4. Description (ຄຳບັນຍາຍ - 1 ຊ່ອງພິມດຽວ ຮອງຮັບ Lo, En, Th) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#cc0000]" />
                  <span>{language === 'lo' ? 'ຄຳບັນຍາຍ / ເນື້ອໃນແຈ້ງການ (Description)' : 'Announcement Description'}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-100 dark:bg-red-950 text-[#cc0000]">
                    {upcomingLang === 'lo' ? 'La' : upcomingLang === 'th' ? 'Tha' : 'En'}
                  </span>
                </label>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {(['lo', 'th', 'en'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setUpcomingLang(l)}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-black transition cursor-pointer ${
                        upcomingLang === l
                          ? 'bg-[#cc0000] text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {l === 'lo' ? 'La' : l === 'th' ? 'Tha' : 'En'}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={2}
                disabled={!isEditingPoster}
                value={
                  upcomingLang === 'lo'
                    ? upcomingEventDesc
                    : upcomingLang === 'en'
                    ? upcomingEventDescEn
                    : upcomingEventDescTh
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (upcomingLang === 'lo' && setUpcomingEventDesc) setUpcomingEventDesc(val);
                  else if (upcomingLang === 'en' && setUpcomingEventDescEn) setUpcomingEventDescEn(val);
                  else if (upcomingLang === 'th' && setUpcomingEventDescTh) setUpcomingEventDescTh(val);
                }}
                placeholder={
                  upcomingLang === 'lo'
                    ? 'ປ້ອນລາຍລະອຽດ, ເວລາ, ສະຖານທີ່ ຫຼື ຄຳເຊີນຊວນ (ພາສາລາວ)...'
                    : upcomingLang === 'en'
                    ? 'Enter event details, schedule summary, or notes in English...'
                    : 'กรอกรายละเอียด ข้อความประกาศ หรือคำเชิญชวนภาษาไทย...'
                }
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500/40"
              />
            </div>

            {/* 5. Flyer Banner Photo & Presets */}
            <div className="space-y-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#cc0000]" />
                  <span>{language === 'lo' ? 'ຮູບພາບງານ / ໃບປະກາດ (Photo / Flyer)' : 'Event Photo / Flyer Banner'}</span>
                </span>
                {upcomingEventImageUrl && (
                  <button
                    type="button"
                    disabled={!isEditingPoster}
                    onClick={() => setUpcomingEventImageUrl && setUpcomingEventImageUrl('')}
                    className="text-[10px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{language === 'lo' ? 'ລຶບຮູບ' : 'Remove Image'}</span>
                  </button>
                )}
              </label>

              <UnifiedMediaUploader
                disabled={!isEditingPoster}
                value={upcomingEventImageUrl}
                onChange={(url) => setUpcomingEventImageUrl && setUpcomingEventImageUrl(url)}
                language={language}
                label={language === 'lo' ? 'ອັບໂຫລດຮູບພາບງານ ຫຼື ໃບປະກາດ' : 'Upload Event Flyer/Photo'}
              />
            </div>

            {/* 6. Background Fade to White (100 -> 0) - ຈາງລົງຫາສີຂາວ ບໍ່ເຫັນພື້ນຫຼັງ */}
            <div className="space-y-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/70 dark:border-emerald-800/40">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {language === 'lo'
                      ? 'ຄວາມຈາງພື້ນຫຼັງ / ສີພື້ນຫຼັງເວັບ (Background Fade & Tone 100-0%)'
                      : 'Background Fade / Website Tone (100% -> 0%)'}
                  </span>
                </label>
                <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400">
                  {upcomingBgVisibility}%{' '}
                  {upcomingBgVisibility === 100
                    ? language === 'lo' ? '(ພື້ນຫຼັງເຕັມ 100%)' : '(100% Full)'
                    : upcomingBgVisibility === 0
                    ? language === 'lo' ? '(ສີພື້ນເວັບ / ບໍ່ມີພື້ນຫຼັງ)' : '(Default / Transparent)'
                    : language === 'lo' ? `(ຈາງສີພື້ນ ${100 - upcomingBgVisibility}%)` : `(${100 - upcomingBgVisibility}% Faded)`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {language === 'lo'
                  ? 'ປັບໃຫ້ພື້ນຫຼັງຈາງລົງຫາສີຂອງເວັບໄຊຕ໌: 0% = ເປັນສີເລີ່ມຕົ້ນຂອງເວັບ ຫຼື ບໍ່ມີພື້ນຫຼັງ (ໂປ່ງໃສ ບໍ່ເຫັນຮູບ), 100% = ເຫັນຮູບເຕັມ'
                  : 'Fades background into website default color or transparent: 0% = default website color / transparent with no background, 100% = full background photo.'}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold whitespace-nowrap">
                  🌐 0% {language === 'lo' ? 'ສີເວັບ/ໂປ່ງໃສ' : 'Default/Transparent'}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  disabled={!isEditingPoster}
                  value={upcomingBgVisibility}
                  onChange={(e) => setUpcomingBgVisibility && setUpcomingBgVisibility(Number(e.target.value))}
                  className="flex-1 accent-emerald-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold whitespace-nowrap">
                  🖼️ 100% {language === 'lo' ? 'ຮູບເຕັມ' : 'Full'}
                </span>
              </div>
              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {[
                  { label: language === 'lo' ? '🌐 0% ສີເວັບ/ບໍ່ມີພື້ນຫຼັງ' : '🌐 0% Default Website', val: 0 },
                  { label: language === 'lo' ? '🌫️ 25% ຈາງຫຼາຍ' : '🌫️ 25%', val: 25 },
                  { label: language === 'lo' ? '⛅ 50% ຈາງເຄິ່ງໜຶ່ງ' : '⛅ 50%', val: 50 },
                  { label: language === 'lo' ? '🌤️ 75% ເຫັນຮູບ' : '🌤️ 75%', val: 75 },
                  { label: language === 'lo' ? '🖼️ 100% ພື້ນຫຼັງເຕັມ' : '🖼️ 100% Full', val: 100 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    disabled={!isEditingPoster}
                    onClick={() => setUpcomingBgVisibility && setUpcomingBgVisibility(preset.val)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      upcomingBgVisibility === preset.val
                        ? 'bg-emerald-600 text-white font-black shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. Background Dim, Edge Fade & Height (ຈັດເປັນກຸ່ມກະທັດຮັດ) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Dim */}
              <div className="p-2.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/70 dark:border-amber-800/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-800 dark:text-white">
                    {language === 'lo' ? 'ຄວາມມືດພື້ນຫຼັງ (Dim)' : 'Background Dim'}
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    {upcomingBgDim}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  disabled={!isEditingPoster}
                  value={upcomingBgDim}
                  onChange={(e) => setUpcomingBgDim && setUpcomingBgDim(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
                <div className="flex items-center justify-between text-[9px] text-slate-500">
                  <span>0% ສະຫວ່າງ</span>
                  <span>100% ມືດ</span>
                </div>
              </div>

              {/* Edge Fade */}
              <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/70 dark:border-indigo-800/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-800 dark:text-white">
                    {language === 'lo' ? 'ຈາງຂອບເທິງ-ລຸ່ມ' : 'Edge Fade'}
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {upcomingEdgeFade}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  disabled={!isEditingPoster}
                  value={upcomingEdgeFade}
                  onChange={(e) => setUpcomingEdgeFade && setUpcomingEdgeFade(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
                <div className="flex items-center justify-between text-[9px] text-slate-500">
                  <span>0% ຕັດ</span>
                  <span>50% ຈາງເລິກ</span>
                </div>
              </div>

              {/* Height (0 - 100 Scale with thin slider line) */}
              {(() => {
                const normalizedHeight =
                  upcomingHeight > 100
                    ? Math.min(100, Math.round(upcomingHeight / 7.5))
                    : Math.max(0, Math.min(100, upcomingHeight));
                return (
                  <div className="p-2.5 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200/70 dark:border-sky-800/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800 dark:text-white flex items-center gap-1">
                        <span>📏 {language === 'lo' ? 'ຄວາມສູງພື້ນຫຼັງ (0-100)' : 'Poster Height (0-100)'}</span>
                      </label>
                      <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                        {normalizedHeight}%{' '}
                        {normalizedHeight === 0
                          ? language === 'lo'
                            ? '(ກະທັດຮັດສຸດ)'
                            : '(Compact)'
                          : normalizedHeight === 100
                          ? language === 'lo'
                            ? '(ສູງສຸດ)'
                            : '(Tallest)'
                          : ''}
                      </span>
                    </div>
                    {/* Thin sleek slider line: "ເສັ້ນລາກນ້ອຍໆ" */}
                    <div className="py-1">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        disabled={!isEditingPoster}
                        value={normalizedHeight}
                        onChange={(e) => setUpcomingHeight && setUpcomingHeight(Number(e.target.value))}
                        className="w-full accent-sky-500 cursor-pointer h-1 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium">
                      <span>0% (ກະທັດຮັດ ບໍ່ສູງ)</span>
                      <span>50%</span>
                      <span>100% (ສູງສຸດ)</span>
                    </div>
                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      {[
                        { label: language === 'lo' ? '0% ກະທັດຮັດ' : '0% Compact', val: 0 },
                        { label: '25%', val: 25 },
                        { label: '50%', val: 50 },
                        { label: '75%', val: 75 },
                        { label: '100%', val: 100 },
                      ].map((p) => (
                        <button
                          key={p.val}
                          type="button"
                          disabled={!isEditingPoster}
                          onClick={() => setUpcomingHeight && setUpcomingHeight(p.val)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition ${
                            normalizedHeight === p.val
                              ? 'bg-sky-600 text-white font-black shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 8. Table Sizing, Alignment, Background & Borders (ຕາຕະລາງ: ປັບຂະໜາດ ແລະ ຕຳແໜ່ງ) */}
            <div className="space-y-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/70 dark:border-blue-800/40">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <TableIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {language === 'lo'
                      ? 'ຕັ້ງຄ່າຂະໜາດ, ຕຳແໜ່ງ & ຮູບແບບຕາຕະລາງ (Table Settings)'
                      : 'Table Size, Position & Styling Settings'}
                  </span>
                </label>
              </div>

              {/* Table Width & Alignment Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                {/* Width */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {language === 'lo' ? '📏 ຂະໜາດຄວາມກວ້າງຕາຕະລາງ:' : '📏 Table Width:'}
                    </span>
                    <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">
                      {upcomingTableWidth}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold">30%</span>
                    <input
                      type="range"
                      min={30}
                      max={100}
                      step={5}
                      disabled={!isEditingPoster}
                      value={upcomingTableWidth}
                      onChange={(e) => setUpcomingTableWidth && setUpcomingTableWidth(Number(e.target.value))}
                      className="flex-1 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                    />
                    <span className="text-[10px] text-slate-500 font-bold">100%</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    {[
                      { label: language === 'lo' ? '100% ເຕັມຈໍ' : '100%', val: 100 },
                      { label: '85%', val: 85 },
                      { label: '70%', val: 70 },
                      { label: '50%', val: 50 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        disabled={!isEditingPoster}
                        onClick={() => setUpcomingTableWidth && setUpcomingTableWidth(p.val)}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                          upcomingTableWidth === p.val
                            ? 'bg-blue-600 text-white font-black'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alignment */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    {language === 'lo' ? '📍 ຕຳແໜ່ງຕາຕະລາງ (ຈັດວາງຈຸດໃດກໍໄດ້):' : '📍 Table Alignment:'}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    {[
                      { id: 'left', icon: AlignLeft, label: language === 'lo' ? 'ຊ້າຍ' : 'Left' },
                      { id: 'center', icon: AlignCenter, label: language === 'lo' ? 'ກາງ' : 'Center' },
                      { id: 'right', icon: AlignRight, label: language === 'lo' ? 'ຂວາ' : 'Right' },
                    ].map((pos) => {
                      const IconComp = pos.icon;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          disabled={!isEditingPoster}
                          onClick={() => setUpcomingTableAlign && setUpcomingTableAlign(pos.id as any)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                            upcomingTableAlign === pos.id
                              ? 'bg-blue-600 text-white border-blue-600 font-black shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                          <span>{pos.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[9px] text-slate-400 block pt-0.5">
                    {language === 'lo' ? 'ເລືອກໃຫ້ຕາຕະລາງຕິດຊ້າຍ, ຢູ່ເຄິ່ງກາງ ຫຼື ຕິດຂວາ' : 'Align table to left, center, or right'}
                  </span>
                </div>
              </div>

              {/* Content Opacity / Darkness (0 - 100 with thin slider line) */}
              <div className="space-y-2 p-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-800/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {language === 'lo'
                        ? '1. ຄວາມມືດທຶບຂອງເນື້ອຄວາມໃນຊ່ອງການແຈ້ງການ (Content Opacity 0 - 100%)'
                        : '1. Announcement Content Darkness / Opacity (0 - 100%)'}
                    </span>
                  </label>
                  <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">
                    {upcomingContentBgOpacity}%{' '}
                    {upcomingContentBgOpacity === 0
                      ? language === 'lo'
                        ? '(ໂປ່ງໃສ 100%)'
                        : '(Transparent)'
                      : upcomingContentBgOpacity === 100
                      ? language === 'lo'
                        ? '(ທຶບສຸດ 100%)'
                        : '(Solid Opaque)'
                      : language === 'lo'
                      ? '(ໂປ່ງແສງ)'
                      : '(Translucent)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {language === 'lo'
                    ? 'ປັບຄວາມທຶບຂອງເນື້ອຄວາມ/ຕາຕະລາງ: 0% = ໂປ່ງໃສ 100% (ເຫັນຮູບພື້ນຫຼັງເຕັມຕາ) ຈົນຮອດ 100% = ມືດທຶບສຸດ.'
                    : 'Adjust content/table opacity: 0% = 100% transparent (full background photo visibility) up to 100% = solid opaque.'}
                </p>

                {/* Thin sleek slider line: "ເສັ້ນລາກນ້ອຍໆ" */}
                <div className="flex items-center gap-3 py-1">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold whitespace-nowrap">
                    💎 0% {language === 'lo' ? 'ໂປ່ງໃສ' : 'Transparent'}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    disabled={!isEditingPoster}
                    value={upcomingContentBgOpacity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (setUpcomingContentBgOpacity) setUpcomingContentBgOpacity(val);
                      if (val === 0 && setUpcomingTableBg) setUpcomingTableBg('transparent');
                      else if (val > 0 && upcomingTableBg === 'transparent' && setUpcomingTableBg) {
                        setUpcomingTableBg('dark');
                      }
                    }}
                    className="flex-1 accent-blue-600 cursor-pointer h-1 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold whitespace-nowrap">
                    ⬛ 100% {language === 'lo' ? 'ທຶບສຸດ' : 'Opaque'}
                  </span>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {[
                    { label: language === 'lo' ? '💎 0% ໂປ່ງໃສ' : '💎 0% Transparent', val: 0 },
                    { label: language === 'lo' ? '🌫️ 25% ບາງໆ' : '🌫️ 25% Subtle', val: 25 },
                    { label: language === 'lo' ? '⛅ 50% ປານກາງ' : '⛅ 50% Medium', val: 50 },
                    { label: language === 'lo' ? '🌑 75% ເຂັ້ມ' : '🌑 75% Deep', val: 75 },
                    { label: language === 'lo' ? '⬛ 100% ທຶບສຸດ' : '⬛ 100% Opaque', val: 100 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      disabled={!isEditingPoster}
                      onClick={() => {
                        if (setUpcomingContentBgOpacity) setUpcomingContentBgOpacity(preset.val);
                        if (preset.val === 0 && setUpcomingTableBg) setUpcomingTableBg('transparent');
                        else if (preset.val > 0 && upcomingTableBg === 'transparent' && setUpcomingTableBg) {
                          setUpcomingTableBg('dark');
                        }
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        upcomingContentBgOpacity === preset.val
                          ? 'bg-blue-600 text-white font-black shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Background Tone */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">
                  {language === 'lo'
                    ? '2. ໂທນສີພື້ນຫຼັງຕາຕະລາງ (Table Tone):'
                    : '2. Table Background Tone:'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: 'transparent', label: language === 'lo' ? '💎 ໂປ່ງໃສ' : '💎 Transparent' },
                    { id: 'glass', label: language === 'lo' ? '🌌 ແກ້ວໂປ່ງໃສ' : '🌌 Glass' },
                    { id: 'paper', label: language === 'lo' ? '📄 ເຈ້ຍຂາວ' : '📄 White Paper' },
                    { id: 'dark', label: language === 'lo' ? '🌑 ສີດຳ' : '🌑 Deep Dark' },
                    { id: 'custom', label: language === 'lo' ? '🎨 ສີກຳນົດເອງ' : '🎨 Custom' },
                  ].map((bgOption) => (
                    <button
                      key={bgOption.id}
                      type="button"
                      disabled={!isEditingPoster}
                      onClick={() => {
                        if (setUpcomingTableBg) setUpcomingTableBg(bgOption.id as any);
                        if (bgOption.id === 'transparent' && setUpcomingContentBgOpacity) {
                          setUpcomingContentBgOpacity(0);
                        } else if (bgOption.id !== 'transparent' && upcomingContentBgOpacity === 0 && setUpcomingContentBgOpacity) {
                          setUpcomingContentBgOpacity(75);
                        }
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition text-center cursor-pointer border ${
                        upcomingTableBg === bgOption.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {bgOption.label}
                    </button>
                  ))}
                </div>

                {upcomingTableBg === 'custom' && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-500">
                      {language === 'lo' ? 'ເລືອກສີໄຮໄລ້:' : 'Color:'}
                    </span>
                    <input
                      type="color"
                      disabled={!isEditingPoster}
                      value={upcomingTableCustomBg || '#0f172a'}
                      onChange={(e) =>
                        setUpcomingTableCustomBg && setUpcomingTableCustomBg(e.target.value)
                      }
                      className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      disabled={!isEditingPoster}
                      value={upcomingTableCustomBg}
                      onChange={(e) =>
                        setUpcomingTableCustomBg && setUpcomingTableCustomBg(e.target.value)
                      }
                      placeholder="#0f172a"
                      className="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs w-24 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Table Border Width */}
              <div className="space-y-1.5 pt-1 border-t border-blue-100 dark:border-blue-900/30">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">
                  {language === 'lo'
                    ? '2. ຂະໜາດເສັ້ນຕາຕະລາງ (Table Border Width):'
                    : '2. Border Width:'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { val: 0, label: language === 'lo' ? '🚫 ບໍ່ສະແດງເສັ້ນ' : '🚫 No Border' },
                    { val: 1, label: language === 'lo' ? '➖ ເສັ້ນບາງ (1px)' : '➖ Thin (1px)' },
                    { val: 2, label: language === 'lo' ? '⚌ ເສັ້ນປານກາງ (2px)' : '⚌ Medium (2px)' },
                    { val: 3, label: language === 'lo' ? '☲ ເສັ້ນໜາ (3px)' : '☲ Thick (3px)' },
                  ].map((borderOption) => (
                    <button
                      key={borderOption.val}
                      type="button"
                      disabled={!isEditingPoster}
                      onClick={() =>
                        setUpcomingTableBorderWidth && setUpcomingTableBorderWidth(borderOption.val)
                      }
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition text-center cursor-pointer border ${
                        upcomingTableBorderWidth === borderOption.val
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {borderOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Border Color (if border width > 0) */}
              {upcomingTableBorderWidth > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-blue-100 dark:border-blue-900/30">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">
                    {language === 'lo' ? '3. ສີເສັ້ນຕາຕະລາງ (Border Color):' : '3. Border Color:'}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      {
                        color: 'rgba(255, 255, 255, 0.25)',
                        label: language === 'lo' ? 'ຂາວຈາງ' : 'White 25%',
                      },
                      { color: '#ffffff', label: language === 'lo' ? 'ຂາວແຈ້ງ' : 'White' },
                      { color: '#94a3b8', label: language === 'lo' ? 'ເທົາ' : 'Gray' },
                      { color: '#f59e0b', label: language === 'lo' ? 'ທອງ' : 'Gold' },
                      { color: '#ef4444', label: language === 'lo' ? 'ແດງ' : 'Red' },
                      { color: '#3b82f6', label: language === 'lo' ? 'ຟ້າ' : 'Blue' },
                      { color: '#000000', label: language === 'lo' ? 'ດຳ' : 'Black' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        disabled={!isEditingPoster}
                        onClick={() =>
                          setUpcomingTableBorderColor && setUpcomingTableBorderColor(c.color)
                        }
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer border ${
                          upcomingTableBorderColor === c.color
                            ? 'ring-2 ring-blue-500 border-blue-500 font-black'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: c.color }}
                        />
                        <span>{c.label}</span>
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-auto">
                      <input
                        type="color"
                        disabled={!isEditingPoster}
                        value={
                          upcomingTableBorderColor?.startsWith('#')
                            ? upcomingTableBorderColor
                            : '#ffffff'
                        }
                        onChange={(e) =>
                          setUpcomingTableBorderColor &&
                          setUpcomingTableBorderColor(e.target.value)
                        }
                        className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 9. Word-style Schedule Table & Document Editor */}
            <div className="space-y-2 pt-2 border-t border-red-100 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <TableIcon className="w-4 h-4 text-blue-600" />
                  <span>
                    {language === 'lo'
                      ? 'ຕາຕະລາງງານ & ເນື້ອໃນ Word (ຄັດລອກຈາກ Word / Excel / Docs ມາໃສ່ໄດ້ທັນທີ)'
                      : 'Schedule Table & Word Content (Paste directly from Word / Excel / Docs)'}
                  </span>
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === 'lo'
                    ? 'ຮັກສາຕາຕະລາງ, ສີສັນ ແລະ ຮູບແບບຕົ້ນສະບັບ 100%'
                    : '100% original styles, tables, and colors preserved'}
                </span>
              </div>

              <WordStyleScheduleEditor
                disabled={!isEditingPoster}
                language={language}
                schedule={upcomingSchedule}
                onChangeSchedule={(newSch) => setUpcomingSchedule && setUpcomingSchedule(newSch)}
                scheduleHtml={upcomingScheduleHtml}
                onChangeScheduleHtml={(newHtml) => setUpcomingScheduleHtml && setUpcomingScheduleHtml(newHtml)}
              />
            </div>

            {/* 10. REAL-TIME LIVE PREVIEW (ສະແດງແບບ Real Time ຂະນະຕັ້ງຄ່າ) */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>
                    {language === 'lo'
                      ? 'ຕົວຢ່າງການສະແດງຜົນແບບ Real-time (ສະແດງທັນທີຕາມການຕັ້ງຄ່າດ້ານເທິງ)'
                      : 'Real-time Live Preview (Updates instantly with all settings)'}
                  </span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black">
                  LIVE REAL-TIME
                </span>
              </div>

              {(() => {
                // Compute real-time preview values
                const visRatio = Math.max(0, Math.min(100, upcomingBgVisibility)) / 100;
                const isWhite = visRatio < 0.5;
                const whiteOverlay = 1 - visRatio;
                const alignClass =
                  upcomingTableAlign === 'left'
                    ? 'mr-auto'
                    : upcomingTableAlign === 'right'
                    ? 'ml-auto'
                    : 'mx-auto';

                const previewOpacity =
                  typeof upcomingContentBgOpacity === 'number' ? upcomingContentBgOpacity : 70;
                let liveTableBg = 'transparent';
                let liveTextColor = isWhite ? '#0f172a' : '#ffffff';

                if (previewOpacity === 0) {
                  liveTableBg = 'transparent';
                } else {
                  let baseHex = '#020617';
                  if (upcomingTableBg === 'paper') {
                    baseHex = '#ffffff';
                    liveTextColor = '#0f172a';
                  } else if (upcomingTableBg === 'custom' && upcomingTableCustomBg) {
                    baseHex = upcomingTableCustomBg;
                  } else if (upcomingTableBg === 'glass') {
                    baseHex = isWhite ? '#ffffff' : '#020617';
                  }
                  const alpha = previewOpacity / 100;
                  let cleanHex = baseHex.replace('#', '');
                  if (cleanHex.length === 3) cleanHex = cleanHex.split('').map((c) => c + c).join('');
                  const num = parseInt(cleanHex, 16);
                  if (!isNaN(num) && cleanHex.length === 6) {
                    liveTableBg = `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
                  } else {
                    liveTableBg = `rgba(2, 6, 23, ${alpha})`;
                  }
                }

                const normalizedPreviewHeight =
                  upcomingHeight > 100
                    ? Math.min(100, Math.round(upcomingHeight / 7.5))
                    : Math.max(0, Math.min(100, upcomingHeight));
                const previewMinHeight = Math.round(150 + (normalizedPreviewHeight / 100) * 120);

                const currentActiveTitle =
                  upcomingLang === 'lo'
                    ? upcomingEventTitle || upcomingEventTitleEn || upcomingEventTitleTh
                    : upcomingLang === 'en'
                    ? upcomingEventTitleEn || upcomingEventTitle || upcomingEventTitleTh
                    : upcomingEventTitleTh || upcomingEventTitle || upcomingEventTitleEn;

                const currentActiveDesc =
                  upcomingLang === 'lo'
                    ? upcomingEventDesc || upcomingEventDescEn || upcomingEventDescTh
                    : upcomingLang === 'en'
                    ? upcomingEventDescEn || upcomingEventDesc || upcomingEventDescTh
                    : upcomingEventDescTh || upcomingEventDesc || upcomingEventDescEn;

                const currentActiveLocation =
                  upcomingLang === 'lo'
                    ? upcomingEventLocation || upcomingEventLocationEn || upcomingEventLocationTh
                    : upcomingLang === 'en'
                    ? upcomingEventLocationEn || upcomingEventLocation || upcomingEventLocationTh
                    : upcomingEventLocationTh || upcomingEventLocation || upcomingEventLocationEn;

                return (
                  <div
                    style={{ minHeight: `${previewMinHeight}px` }}
                    className={`relative isolate rounded-2xl overflow-hidden shadow-xl p-5 flex flex-col justify-end border transition-all duration-300 ${
                      isWhite
                        ? 'border-slate-300 text-slate-900 bg-white'
                        : 'border-slate-800 text-white bg-slate-950'
                    }`}
                  >
                    {/* Background image & dynamic fade to white */}
                    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                      <img
                        src={
                          upcomingEventImageUrl ||
                          'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1600&auto=format&fit=crop'
                        }
                        alt="Poster preview"
                        className="w-full h-full object-cover object-center transition-opacity duration-300"
                        style={{ opacity: Math.max(0.05, (1 - (upcomingBgDim / 100) * 0.55) * visRatio) }}
                      />
                      {/* Dark gradient for photo legibility */}
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/70 to-slate-950/30 transition-opacity duration-300"
                        style={{ opacity: visRatio }}
                      />
                      {/* White overlay for 100 -> 0 fade */}
                      <div
                        className="absolute inset-0 bg-white transition-opacity duration-300 pointer-events-none"
                        style={{ opacity: whiteOverlay }}
                      />
                    </div>

                    <div className="space-y-2.5 relative z-10">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#cc0000] text-white text-[10px] font-black uppercase shadow-xs">
                          {upcomingEventBadge || (language === 'lo' ? 'ແຈ້ງການ & ປະກາດ' : 'Announcement')}
                        </span>
                        {upcomingEventDate && (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                              isWhite
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-amber-500/30 text-amber-300 border-amber-400/30'
                            }`}
                          >
                            📅 {upcomingEventDate}
                          </span>
                        )}
                        {currentActiveLocation && (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border ${
                              isWhite
                                ? 'bg-slate-100 text-slate-800 border-slate-300'
                                : 'bg-white/20 text-white border-white/20'
                            }`}
                          >
                            📍 {currentActiveLocation}
                          </span>
                        )}
                      </div>

                      <h4
                        style={{
                          fontSize: `${Math.round(numericTitleSize * 0.85)}px`,
                          lineHeight: 1.25,
                        }}
                        className={`font-black tracking-tight transition-all duration-200 ${
                          isWhite ? 'text-slate-950' : 'text-white'
                        }`}
                      >
                        {currentActiveTitle ||
                          (language === 'lo' ? 'ຫົວຂໍ້ງານທີ່ຈະມາເຖິງ' : 'Upcoming Event Title')}
                      </h4>

                      {currentActiveDesc && (
                        <p
                          className={`text-xs line-clamp-2 leading-relaxed max-w-xl ${
                            isWhite ? 'text-slate-700' : 'text-slate-200'
                          }`}
                        >
                          {currentActiveDesc}
                        </p>
                      )}

                      {/* Real-time Dynamic Table Preview with Width & Alignment */}
                      <div className="pt-2">
                        <div
                          className={`transition-all duration-300 rounded-xl overflow-hidden p-2.5 ${alignClass}`}
                          style={{
                            width: `${upcomingTableWidth}%`,
                            backgroundColor: liveTableBg,
                            color: liveTextColor,
                            borderWidth: `${upcomingTableBorderWidth}px`,
                            borderStyle: upcomingTableBorderWidth > 0 ? 'solid' : 'none',
                            borderColor:
                              upcomingTableBorderColor ||
                              (isWhite ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'),
                          }}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold pb-1.5 border-b border-current/20">
                            <span className="flex items-center gap-1.5">
                              <TableIcon className="w-3.5 h-3.5 text-blue-500" />
                              <span>
                                {language === 'lo'
                                  ? `ຕາຕະລາງງານ (${upcomingTableWidth}%, ${
                                      upcomingTableAlign === 'left'
                                        ? 'ຕິດຊ້າຍ'
                                        : upcomingTableAlign === 'right'
                                        ? 'ຕິດຂວາ'
                                        : 'ເຄິ່ງກາງ'
                                    })`
                                  : `Schedule (${upcomingTableWidth}%, ${upcomingTableAlign})`}
                              </span>
                            </span>
                            <span className="text-[10px] opacity-75 font-mono">
                              {upcomingTableBg}
                            </span>
                          </div>

                          {upcomingScheduleHtml ? (
                            <div
                              className="text-xs pt-1.5 max-h-32 overflow-y-auto leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: upcomingScheduleHtml }}
                            />
                          ) : upcomingSchedule.length > 0 ? (
                            <div className="space-y-1 pt-1.5 text-xs">
                              {upcomingSchedule.slice(0, 3).map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-2 py-0.5 text-[11px] border-b border-current/10"
                                >
                                  <span className="font-semibold opacity-90">{item.time || `Session ${idx + 1}`}</span>
                                  <span className="truncate flex-1 text-right">{item.activity || item.speaker}</span>
                                </div>
                              ))}
                              {upcomingSchedule.length > 3 && (
                                <span className="text-[10px] opacity-75 block text-center pt-0.5">
                                  + {upcomingSchedule.length - 3} more items...
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="py-2 text-center text-xs opacity-70 italic">
                              {language === 'lo'
                                ? 'ຕາຕະລາງງານພ້ອມສະແດງ (ປັບຂະໜາດ ແລະ ຕຳແໜ່ງໄດ້ແບບ Real-time)'
                                : 'Schedule ready (Real-time sizing and alignment enabled)'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Bottom Save Bar for Upcoming Events */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingPoster}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isSavingPoster ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Sections 4 to 6: Poster Extended Customizations & Studio */}
      {isPosterMode && (
        <>
          {/* 4. Video Link Banner */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection('video')}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {language === 'lo'
                    ? '4. ລິ້ງວີດີໂອໂປສເຕີ / ແບນເນີ (Hero Video Banner)'
                    : '4. Hero Video Banner'}
                </h4>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                  isOpen('video') ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {isOpen('video') && (
              <div className="p-5 pt-4 space-y-4 border-t border-slate-200 dark:border-slate-700">
                <UnifiedMediaUploader
                  disabled={!isEditingPoster}
                  value={posterVideoUrl}
                  onChange={(url) => setPosterVideoUrl(url)}
                  language={language}
                  label={
                    language === 'lo'
                      ? 'ລິ້ງວີດີໂອ (YouTube, MP4, etc.):'
                      : 'Video URL or Upload File:'
                  }
                  acceptTypes="video/*"
                />

                {/* Bottom Save Bar for Section 4 (Video) */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSavingPoster}
                    className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isSavingPoster ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. Button Text */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection('button')}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {language === 'lo' ? '5. ຂໍ້ຄວາມເທິງປຸ່ມ (Button Text)' : '5. Button Text'}
                </h4>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                  isOpen('button') ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {isOpen('button') && (
              <div className="p-5 pt-4 space-y-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                    {language === 'lo' ? 'ປຸ່ມເບິ່ງດາສບອດຂໍ້ມູນ (ສາມາດຕັ້ງຄ່າທຸກປຸ່ມໄດ້ທີ່ລຳດັບ 2 ເຊັ່ນກັນ):' : 'Dashboard Button Text (Also editable in #2):'}
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {(['la', 'tha', 'en'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setBtnTextLang(l)}
                        className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black transition cursor-pointer ${
                          btnTextLang === l
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {l === 'la' ? 'La' : l === 'tha' ? 'Tha' : 'En'}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  disabled={!isEditingPoster}
                  value={
                    btnTextLang === 'la'
                      ? posterBtnText
                      : btnTextLang === 'tha'
                      ? (posterBtnTextTh || '')
                      : (posterBtnTextEn || '')
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (btnTextLang === 'la') setPosterBtnText(val);
                    else if (btnTextLang === 'tha') setPosterBtnTextTh?.(val);
                    else setPosterBtnTextEn?.(val);
                  }}
                  placeholder={
                    btnTextLang === 'la'
                      ? 'ເບິ່ງດາສບອດຂໍ້ມູນ'
                      : btnTextLang === 'tha'
                      ? 'ดูแดชบอร์ดข้อมูล'
                      : 'View Dashboard'
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-purple-500"
                />

                {/* Bottom Save Bar for Section 5 (Button) */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSavingPoster}
                    className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isSavingPoster ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 6. Background Settings */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection('background')}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Palette className="w-4 h-4 text-[#cc0000] shrink-0" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {language === 'lo'
                    ? '6. ຕັ້ງຄ່າພື້ນຫຼັງຂອງເວັບໄຊ (Website Background Settings)'
                    : '6. Website Background Settings'}
                </h4>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                  isOpen('background') ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

        {isOpen('background') && (
          <div className="p-5 pt-4 space-y-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ສີພື້ນຫຼັງ (Color)' : 'Background Color'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={!isEditingPoster}
                    value={appBgColor.startsWith('#') ? appBgColor : '#f8fafc'}
                    onChange={(e) => setAppBgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600 p-0.5"
                  />
                  <input
                    type="text"
                    disabled={!isEditingPoster}
                    value={appBgColor}
                    onChange={(e) => setAppBgColor(e.target.value)}
                    placeholder="#f8fafc"
                    className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ໂທນສີສຳເລັດຮູບ' : 'Presets'}
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { name: 'Default', color: '#f8fafc' },
                    { name: 'Gray', color: '#f1f5f9' },
                    { name: 'Cream', color: '#fefce8' },
                    { name: 'Sky', color: '#f0f9ff' },
                    { name: 'Dark', color: '#0f172a' },
                  ].map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      disabled={!isEditingPoster}
                      onClick={() => setAppBgColor(preset.color)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-400"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Background Image Upload */}
            <UnifiedMediaUploader
              disabled={!isEditingPoster}
              value={appBgImageUrl}
              onChange={(url) => {
                setAppBgImageUrl(url);
                if (url && (appBgBrightness < 60 || !appBgBrightness)) {
                  setAppBgBrightness(100);
                }
              }}
              language={language}
              acceptTypes="image/*"
              maxDimension={1280}
              maxStringLength={95000}
              label={
                language === 'lo'
                  ? 'ຮູບພາບພື້ນຫຼັງເວັບໄຊ:'
                  : 'Background Image File or URL:'
              }
            />

            {appBgImageUrl && (
              <div className="space-y-3 pt-1">
                {/* Live Preview Box */}
                <div className="relative h-28 sm:h-32 rounded-2xl overflow-hidden border-2 border-dashed border-indigo-300 dark:border-indigo-700/60 shadow-inner group">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-300 scale-105"
                    style={{
                      backgroundImage: `url("${appBgImageUrl}")`,
                      filter: `blur(${appBgBlur}px) brightness(${appBgBrightness}%)`,
                    }}
                  />
                  {/* White Overlay Layer in Preview */}
                  {appBgWhiteOverlayOpacity > 0 && (
                    <div
                      className="absolute inset-0 bg-white transition-opacity duration-200"
                      style={{ opacity: appBgWhiteOverlayOpacity / 100 }}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/25 flex flex-col items-center justify-center text-white text-center p-2">
                    <span className="text-xs font-black drop-shadow-md">
                      {language === 'lo' ? '👁️ ຕົວຢ່າງພື້ນຫຼັງຕົວຈິງ (Live Background Preview)' : '👁️ Live Background Preview'}
                    </span>
                    <span className="text-[10px] text-white/90 font-medium">
                      Brightness: {appBgBrightness}% • Blur: {appBgBlur}px • White Mask: {appBgWhiteOverlayOpacity}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* 1. Brightness Slider */}
                  <div className="space-y-1.5 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{language === 'lo' ? 'ຄວາມສະຫວ່າງ:' : 'Brightness:'}</span>
                      <span className="font-mono text-amber-500 font-extrabold">{appBgBrightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="150"
                      step="5"
                      disabled={!isEditingPoster}
                      value={appBgBrightness}
                      onChange={(e) => setAppBgBrightness(Number(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1 gap-1">
                      {[50, 80, 100, 120].map((val) => (
                        <button
                          key={val}
                          type="button"
                          disabled={!isEditingPoster}
                          onClick={() => setAppBgBrightness(val)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition cursor-pointer ${
                            appBgBrightness === val
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {val}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Blur Slider */}
                  <div className="space-y-1.5 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{language === 'lo' ? 'ຄວາມເບີ:' : 'Blur:'}</span>
                      <span className="font-mono text-indigo-500 font-extrabold">{appBgBlur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      disabled={!isEditingPoster}
                      value={appBgBlur}
                      onChange={(e) => setAppBgBlur(Number(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1 gap-1">
                      {[
                        { label: '0px (ແຈ້ງ)', val: 0 },
                        { label: '4px (ນຸ່ມ)', val: 4 },
                        { label: '10px', val: 10 },
                        { label: '20px (ມົວ)', val: 20 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          disabled={!isEditingPoster}
                          onClick={() => setAppBgBlur(item.val)}
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md transition cursor-pointer ${
                            appBgBlur === item.val
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. White Overlay Opacity Slider (ຄວາມຂາວບັງພາບ / ປັບຄວາມເຂັ້ມສີຂາວບັງພາບ) */}
                  <div className="space-y-1.5 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-cyan-300 dark:border-cyan-800/80 shadow-xs sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-cyan-800 dark:text-cyan-300 flex items-center gap-1">
                        <span>✨</span>
                        <span>{language === 'lo' ? 'ຄວາມຂາວບັງພາບ (White Overlay):' : language === 'th' ? 'ความขาวบังภาพ (White Overlay):' : 'White Mask / Overlay:'}</span>
                      </span>
                      <span className="font-mono text-cyan-600 dark:text-cyan-400 font-extrabold">{appBgWhiteOverlayOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      disabled={!isEditingPoster}
                      value={appBgWhiteOverlayOpacity}
                      onChange={(e) => setAppBgWhiteOverlayOpacity(Number(e.target.value))}
                      className="w-full accent-cyan-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1 gap-1 flex-wrap">
                      {[
                        { label: '0% (ແຈ້ງ)', val: 0 },
                        { label: '30%', val: 30 },
                        { label: '50% (ນຸ່ມ)', val: 50 },
                        { label: '70%', val: 70 },
                        { label: '90% (ຂາວເນັ້ນ)', val: 90 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          disabled={!isEditingPoster}
                          onClick={() => setAppBgWhiteOverlayOpacity(item.val)}
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md transition cursor-pointer ${
                            appBgWhiteOverlayOpacity === item.val
                              ? 'bg-cyan-600 text-white shadow-xs'
                              : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 border border-cyan-200 dark:border-cyan-800/60'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Save Bar for Section 6 (Background) */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingPoster}
                className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isSavingPoster ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{language === 'lo' ? 'ບັນທຶກການຕັ້ງຄ່າ' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

</>
      )}
    </form>
  );
};

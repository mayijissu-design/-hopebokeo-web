import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Heart,
  Users,
  Shield,
  Church,
  BookOpen,
  Upload,
  Globe,
  Layers,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { Language, HomePoster, PrayerTopicItem, PrayerBoxItem } from '../types';
import { UnifiedMediaUploader } from './UnifiedMediaUploader';

interface PrayerSettingsSectionProps {
  language: Language;
  homePoster?: HomePoster;
  onSavePoster: (updatedPoster: HomePoster) => Promise<void>;
}

const buildDefaultPrayerBoxes = (homePoster?: HomePoster): PrayerBoxItem[] => {
  if (homePoster?.prayerBoxes && Array.isArray(homePoster.prayerBoxes) && homePoster.prayerBoxes.length > 0) {
    return homePoster.prayerBoxes;
  }
  return [
    {
      id: 'workers',
      title: homePoster?.prayerCard1Title || 'ຄົນງານເພີ່ມເຕີມສຳລັບການກ່ຽວ',
      titleEn: homePoster?.prayerCard1TitleEn || 'More workers for the harvest',
      titleTh: homePoster?.prayerCard1TitleTh || 'คนงานเพิ่มเติมสำหรับการเกี่ยว',
      subtitle: homePoster?.prayerCard1Subtitle || '(ໂດຍສະເພາະໃນໝູ່ບ້ານຫ່າງໄກ)',
      subtitleEn: homePoster?.prayerCard1SubtitleEn || '(especially in remote villages)',
      subtitleTh: homePoster?.prayerCard1SubtitleTh || '(โดยเฉพาะในหมู่บ้านห่างไกล)',
      desc: 'ອະທິຖານຂໍພຣະເຈົ້າຊົງສົ່ງຄົນງານທີ່ມີຫົວໃຈ ແລະ ຄວາມອົດທົນໄປສູ່ບ້ານຫ່າງໄກໃນແຂວງບໍ່ແກ້ວ.',
      descEn: 'Pray for God to send dedicated, compassionate workers into unreached remote villages.',
      descTh: 'อธิษฐานขอพระเจ้าทรงส่งคนงานที่มีใจและอดทนไปสู่หมู่บ้านห่างไกลในแขวงบ่อแก้ว',
      icon: 'users',
      count: homePoster?.prayerCard1Count ?? 142,
      comments: [],
    },
    {
      id: 'protection',
      title: homePoster?.prayerCard2Title || 'ສະຕິປັນຍາ ແລະ ການປົກປ້ອງ',
      titleEn: homePoster?.prayerCard2TitleEn || 'Wisdom and protection',
      titleTh: homePoster?.prayerCard2TitleTh || 'สติปัญญา และการปกป้อง',
      subtitle: homePoster?.prayerCard2Subtitle || 'ສຳລັບຜູ້ນຳທ້ອງຖິ່ນ',
      subtitleEn: homePoster?.prayerCard2SubtitleEn || 'for local leaders',
      subtitleTh: homePoster?.prayerCard2SubtitleTh || 'สำหรับผู้นำท้องถิ่น',
      desc: 'ອະທິຖານຂໍສັນຕິສຸກ, ການນຳພາ ແລະ ການປົກປ້ອງສຳລັບສິດຍາພິບານ ແລະ ທີມງານພັນທະກິດທຸກທ່ານ.',
      descEn: 'Pray for wisdom, supernatural guidance, and safety for pastors and church leaders.',
      descTh: 'อธิษฐานขอสันติสุข การทรงนำ และการปกป้องสำหรับศิษยาภิบาลและทีมงานพันธกิจทุกท่าน',
      icon: 'shield',
      count: homePoster?.prayerCard2Count ?? 98,
      comments: [],
    },
    {
      id: 'provision',
      title: homePoster?.prayerCard3Title || 'ການຈັດຕຽມສຳລັບຄອບຄົວ',
      titleEn: homePoster?.prayerCard3TitleEn || 'Provision for families',
      titleTh: homePoster?.prayerCard3TitleTh || 'การจัดเตรียมสำหรับครอบครัว',
      subtitle: homePoster?.prayerCard3Subtitle || 'ແລະ ເດັກນ້ອຍທີ່ຂັດສົນ',
      subtitleEn: homePoster?.prayerCard3SubtitleEn || 'and children in need',
      subtitleTh: homePoster?.prayerCard3SubtitleTh || 'และเด็กๆ ที่ขัดสน',
      desc: 'ອະທິຖານຂໍການຈັດຕຽມດ້ານອາຫານ, ການສຶກສາ ແລະ ສຸຂະພາບສຳລັບເດັກນ້ອຍ ແລະ ຄອບຄົວທີ່ຍາກລຳບາກ.',
      descEn: 'Pray for food security, education support, and health for underprivileged children.',
      descTh: 'อธิษฐานขอการจัดเตรียมด้านอาหาร การศึกษา และสุขภาพสำหรับเด็กๆ และครอบครัวที่ยากลำบาก',
      icon: 'heart',
      count: homePoster?.prayerCard3Count ?? 126,
      comments: [],
    },
  ];
};

const DEFAULT_PRAYER_ITEMS: PrayerTopicItem[] = [
  {
    id: 'workers',
    title: '1. ຄົນງານເພີ່ມເຕີມສຳລັບການກ່ຽວ',
    titleEn: '1. More Workers for the Harvest',
    titleTh: '1. คนงานเพิ่มเติมสำหรับการเกี่ยว',
    desc: 'ອະທິຖານຂໍພຣະເຈົ້າຊົງສົ່ງຄົນງານທີ່ມີຫົວໃຈ ແລະ ຄວາມອົດທົນໄປສູ່ບ້ານຫ່າງໄກໃນແຂວງບໍ່ແກ້ວ.',
    descEn: 'Pray for God to send dedicated, compassionate workers into unreached remote villages.',
    descTh: 'อธิษฐานขอพระเจ้าทรงส่งคนงานที่มีใจและอดทนไปสู่หมู่บ้านห่างไกลในแขวงบ่อแก้ว',
    count: 142,
  },
  {
    id: 'protection',
    title: '2. ສະຕິປັນຍາ ແລະ ການປົກປ້ອງຜູ້ນຳ',
    titleEn: '2. Wisdom & Protection for Leaders',
    titleTh: '2. สติปัญญา และการปกป้องผู้นำ',
    desc: 'ອະທິຖານຂໍສັນຕິສຸກ, ການນຳພາ ແລະ ການປົກປ້ອງສຳລັບສິດຍາພິບານ ແລະ ທີມງານພັນທະກິດທຸກທ່ານ.',
    descEn: 'Pray for wisdom, supernatural guidance, and safety for pastors and church leaders.',
    descTh: 'อธิษฐานขอสันติสุข การทรงนำ และการปกป้องสำหรับศิษยาภิบาลและทีมงานพันธกิจทุกท่าน',
    count: 98,
  },
  {
    id: 'provision',
    title: '3. ການຈັດຕຽມສຳລັບຄອບຄົວ ແລະ ເດັກນ້ອຍ',
    titleEn: '3. Provision for Vulnerable Families',
    titleTh: '3. การจัดเตรียมสำหรับครอบครัวและเด็กๆ',
    desc: 'ອະທິຖານຂໍການຈັດຕຽມດ້ານອາຫານ, ການສຶກສາ ແລະ ສຸຂະພາບສຳລັບເດັກນ້ອຍ ແລະ ຄອບຄົວທີ່ຍາກລຳບາກ.',
    descEn: 'Pray for food security, education support, and health for underprivileged children.',
    descTh: 'อธิษฐานขอการจัดเตรียมด้านอาหาร การศึกษา และสุขภาพสำหรับเด็กๆ และครอบครัวที่ยากลำบาก',
    count: 126,
  },
  {
    id: 'unity',
    title: '4. ຄວາມເປັນນ້ຳໜຶ່ງໃຈດຽວຂອງຄຣິດຕະຈັກ',
    titleEn: '4. Unity Across Local Churches',
    titleTh: '4. ความเป็นน้ำหนึ่งใจเดียวกันของคริสตจักร',
    desc: 'ອະທິຖານເພື່ອຄວາມຮັກ, ຄວາມສາມັກຄີ ແລະ ການຮ່ວມມືຢ່າງແໜ້ນແຟ້ນລະຫວ່າງຄຣິດຕະຈັກຕ່າງໆ.',
    descEn: 'Pray for deep love, unity, and partnership among local believers and churches.',
    descTh: 'อธิษฐานเพื่อความรัก ความสามัคคี และการร่วมมืออย่างแน่นแฟ้นระหว่างคริสตจักรต่างๆ',
    count: 85,
  },
];

export const PrayerSettingsSection: React.FC<PrayerSettingsSectionProps> = ({
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

  // Visibility toggle
  const [hidePrayerSection, setHidePrayerSection] = useState<boolean>(
    Boolean(homePoster?.hidePrayerSection)
  );

  // Section Header Fields
  const [badgeTextLo, setBadgeTextLo] = useState<string>(homePoster?.prayerBadgeText || 'ຫົວຂໍ້ອະທິຖານ');
  const [badgeTextEn, setBadgeTextEn] = useState<string>(homePoster?.prayerBadgeTextEn || 'PRAYER NEEDS');
  const [badgeTextTh, setBadgeTextTh] = useState<string>(homePoster?.prayerBadgeTextTh || 'หัวข้ออธิษฐาน');

  const [titleLo, setTitleLo] = useState<string>(homePoster?.prayerTitle || 'ທ່ານຈະຮ່ວມອະທິຖານກັບພວກເຮົາບໍ?');
  const [titleEn, setTitleEn] = useState<string>(homePoster?.prayerTitleEn || 'Will you pray with us?');
  const [titleTh, setTitleTh] = useState<string>(homePoster?.prayerTitleTh || 'คุณจะร่วมอธิษฐานกับเราไหม?');

  const [subtitleLo, setSubtitleLo] = useState<string>(homePoster?.prayerSubtitle || 'ນີ້ແມ່ນຫົວຂໍ້ອະທິຖານອັນຮີບດ່ວນໃນແຂວງບໍ່ແກ້ວເວລານີ້.');
  const [subtitleEn, setSubtitleEn] = useState<string>(homePoster?.prayerSubtitleEn || 'Here are a few urgent needs in Bokeo right now.');
  const [subtitleTh, setSubtitleTh] = useState<string>(homePoster?.prayerSubtitleTh || 'นี่คือหัวข้ออธิษฐานเร่งด่วนในบ่อแก้วในเวลานี้');

  const [buttonTextLo, setButtonTextLo] = useState<string>(homePoster?.prayerButtonText || 'ເບິ່ງຫົວຂໍ້ອະທິຖານ →');
  const [buttonTextEn, setButtonTextEn] = useState<string>(homePoster?.prayerButtonTextEn || 'View Prayer Needs →');
  const [buttonTextTh, setButtonTextTh] = useState<string>(homePoster?.prayerButtonTextTh || 'ดูหัวข้ออธิษฐาน →');

  const [bgImageUrl, setBgImageUrl] = useState<string>(
    homePoster?.prayerBgImageUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1600'
  );

  const [countSuffixLo, setCountSuffixLo] = useState<string>(homePoster?.prayerPrayingCountSuffix || 'ຄົນກຳລັງອະທິຖານ');
  const [countSuffixEn, setCountSuffixEn] = useState<string>(homePoster?.prayerPrayingCountSuffixEn || 'praying');
  const [countSuffixTh, setCountSuffixTh] = useState<string>(homePoster?.prayerPrayingCountSuffixTh || 'คนกำลังอธิษฐาน');

  // Dynamic Prayer Boxes on Home Section (Can Add or Remove in Settings)
  const [prayerBoxes, setPrayerBoxes] = useState<PrayerBoxItem[]>(() =>
    buildDefaultPrayerBoxes(homePoster)
  );

  const handleUpdatePrayerBox = (index: number, field: keyof PrayerBoxItem, value: any) => {
    setPrayerBoxes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddPrayerBox = () => {
    const newBox: PrayerBoxItem = {
      id: `prayer-box-${Date.now()}`,
      title: 'ຫົວຂໍ້ອະທິຖານໃໝ່',
      titleEn: 'New Prayer Need',
      titleTh: 'หัวข้ออธิษฐานใหม่',
      subtitle: 'ຄຳອະທິບາຍສັ້ນໆ',
      subtitleEn: 'Short subtitle description',
      subtitleTh: 'คำอธิบายสั้นๆ',
      desc: 'ຂໍเชີນຮ່ວມພິມຄຳອະທິຖານເພື່ອຫົວຂໍ້ນີ້...',
      descEn: 'Please type your prayer and stand in faith with us for this need...',
      descTh: 'ขอเชิญร่วมพิมพ์คำอธิษฐานเผื่อหัวข้อนี้...',
      icon: 'heart',
      count: 50,
      comments: [],
    };
    setPrayerBoxes((prev) => [...prev, newBox]);
    setOpenSections((prev) => ({ ...prev, cards: true }));
  };

  const handleDeletePrayerBox = (index: number) => {
    setPrayerBoxes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteBoxComment = (boxIndex: number, commentId: string) => {
    setPrayerBoxes((prev) => {
      const next = [...prev];
      const box = next[boxIndex];
      if (!box) return prev;
      next[boxIndex] = {
        ...box,
        comments: (box.comments || []).filter((c) => c.id !== commentId),
      };
      return next;
    });
  };

  // Modal Content
  const [modalTitleLo, setModalTitleLo] = useState<string>(homePoster?.prayerModalTitle || 'ຫົວຂໍ້ອະທິຖານເພື່ອແຂວງບໍ່ແກ້ວ');
  const [modalTitleEn, setModalTitleEn] = useState<string>(homePoster?.prayerModalTitleEn || 'Prayer Needs for Bokeo');
  const [modalTitleTh, setModalTitleTh] = useState<string>(homePoster?.prayerModalTitleTh || 'หัวข้ออธิษฐานเพื่อแขวงบ่อแก้ว');

  const [modalSubtitleLo, setModalSubtitleLo] = useState<string>(homePoster?.prayerModalSubtitle || 'ຮ່ວມອະທິຖານ ແລະ ກົດຖືກໃຈເພື່ອຮ່ວມອະທິຖານ');
  const [modalSubtitleEn, setModalSubtitleEn] = useState<string>(homePoster?.prayerModalSubtitleEn || 'Stand in faith with our local field team');
  const [modalSubtitleTh, setModalSubtitleTh] = useState<string>(homePoster?.prayerModalSubtitleTh || 'ร่วมอธิษฐาน และกดถูกใจเพื่อร่วมอธิษฐาน');

  // Modal Items
  const [modalItems, setModalItems] = useState<PrayerTopicItem[]>(() => {
    if (homePoster?.prayerModalItems && Array.isArray(homePoster.prayerModalItems) && homePoster.prayerModalItems.length > 0) {
      return homePoster.prayerModalItems;
    }
    return DEFAULT_PRAYER_ITEMS;
  });

  const isHydratingRef = useRef(false);

  // Sync local form state when homePoster updates in real time from Firestore
  useEffect(() => {
    if (!homePoster) return;
    isHydratingRef.current = true;
    setHidePrayerSection(Boolean(homePoster.hidePrayerSection));
    if (homePoster.prayerBadgeText !== undefined) setBadgeTextLo(homePoster.prayerBadgeText || 'ຫົວຂໍ້ອະທິຖານ');
    if (homePoster.prayerBadgeTextEn !== undefined) setBadgeTextEn(homePoster.prayerBadgeTextEn || 'PRAYER NEEDS');
    if (homePoster.prayerBadgeTextTh !== undefined) setBadgeTextTh(homePoster.prayerBadgeTextTh || 'หัวข้ออธิษฐาน');
    if (homePoster.prayerTitle !== undefined) setTitleLo(homePoster.prayerTitle || 'ທ່ານຈະຮ່ວມອະທິຖານກັບພວກເຮົາບໍ?');
    if (homePoster.prayerTitleEn !== undefined) setTitleEn(homePoster.prayerTitleEn || 'Will you pray with us?');
    if (homePoster.prayerTitleTh !== undefined) setTitleTh(homePoster.prayerTitleTh || 'คุณจะร่วมอธิษฐานกับเราไหม?');
    if (homePoster.prayerSubtitle !== undefined) setSubtitleLo(homePoster.prayerSubtitle || 'ນີ້ແມ່ນຫົວຂໍ້ອະທິຖານອັນຮີບດ່ວນໃນແຂວງບໍ່ແກ້ວເວລານີ້.');
    if (homePoster.prayerSubtitleEn !== undefined) setSubtitleEn(homePoster.prayerSubtitleEn || 'Here are a few urgent needs in Bokeo right now.');
    if (homePoster.prayerSubtitleTh !== undefined) setSubtitleTh(homePoster.prayerSubtitleTh || 'นี่คือหัวข้ออธิษฐานเร่งด่วนในบ่อแก้วในเวลานี้');
    if (homePoster.prayerButtonText !== undefined) setButtonTextLo(homePoster.prayerButtonText || 'ເບິ່ງຫົວຂໍ້ອະທິຖານ →');
    if (homePoster.prayerButtonTextEn !== undefined) setButtonTextEn(homePoster.prayerButtonTextEn || 'View Prayer Needs →');
    if (homePoster.prayerButtonTextTh !== undefined) setButtonTextTh(homePoster.prayerButtonTextTh || 'ดูหัวข้ออธิษฐาน →');
    if (homePoster.prayerBgImageUrl !== undefined) {
      setBgImageUrl(homePoster.prayerBgImageUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1600');
    }
    if (homePoster.prayerPrayingCountSuffix !== undefined) setCountSuffixLo(homePoster.prayerPrayingCountSuffix || 'ຄົນກຳລັງອະທິຖານ');
    if (homePoster.prayerPrayingCountSuffixEn !== undefined) setCountSuffixEn(homePoster.prayerPrayingCountSuffixEn || 'praying');
    if (homePoster.prayerPrayingCountSuffixTh !== undefined) setCountSuffixTh(homePoster.prayerPrayingCountSuffixTh || 'คนกำลังอธิษฐาน');
    if (homePoster.prayerBoxes && Array.isArray(homePoster.prayerBoxes) && homePoster.prayerBoxes.length > 0) {
      setPrayerBoxes(homePoster.prayerBoxes);
    }
    if (homePoster.prayerModalTitle !== undefined) setModalTitleLo(homePoster.prayerModalTitle || 'ຫົວຂໍ້ອະທິຖານເພື່ອແຂວງບໍ່ແກ້ວ');
    if (homePoster.prayerModalTitleEn !== undefined) setModalTitleEn(homePoster.prayerModalTitleEn || 'Prayer Needs for Bokeo');
    if (homePoster.prayerModalTitleTh !== undefined) setModalTitleTh(homePoster.prayerModalTitleTh || 'หัวข้ออธิษฐานเพื่อแขวงบ่อแก้ว');
    if (homePoster.prayerModalSubtitle !== undefined) setModalSubtitleLo(homePoster.prayerModalSubtitle || 'ຮ່ວມອະທິຖານ ແລະ ກົດຖືກໃຈເພື່ອຮ່ວມອະທິຖານ');
    if (homePoster.prayerModalSubtitleEn !== undefined) setModalSubtitleEn(homePoster.prayerModalSubtitleEn || 'Stand in faith with our local field team');
    if (homePoster.prayerModalSubtitleTh !== undefined) setModalSubtitleTh(homePoster.prayerModalSubtitleTh || 'ร่วมอธิษฐาน และกดถูกใจเพื่อร่วมอธิษฐาน');
    if (homePoster.prayerModalItems && Array.isArray(homePoster.prayerModalItems) && homePoster.prayerModalItems.length > 0) {
      setModalItems(homePoster.prayerModalItems);
    }
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
      const box1 = prayerBoxes[0];
      const box2 = prayerBoxes[1];
      const box3 = prayerBoxes[2];
      const draft: HomePoster = {
        ...(homePoster || { title: '', subtitle: '', description: '', imageUrl: '' }),
        hidePrayerSection,
        prayerBadgeText: badgeTextLo.trim(),
        prayerBadgeTextEn: badgeTextEn.trim(),
        prayerBadgeTextTh: badgeTextTh.trim(),
        prayerTitle: titleLo.trim(),
        prayerTitleEn: titleEn.trim(),
        prayerTitleTh: titleTh.trim(),
        prayerSubtitle: subtitleLo.trim(),
        prayerSubtitleEn: subtitleEn.trim(),
        prayerSubtitleTh: subtitleTh.trim(),
        prayerButtonText: buttonTextLo.trim(),
        prayerButtonTextEn: buttonTextEn.trim(),
        prayerButtonTextTh: buttonTextTh.trim(),
        prayerBgImageUrl: bgImageUrl.trim(),
        prayerPrayingCountSuffix: countSuffixLo.trim(),
        prayerPrayingCountSuffixEn: countSuffixEn.trim(),
        prayerPrayingCountSuffixTh: countSuffixTh.trim(),
        prayerBoxes,
        prayerCard1Title: box1 ? box1.title.trim() : '',
        prayerCard1TitleEn: box1 ? (box1.titleEn || box1.title).trim() : '',
        prayerCard1TitleTh: box1 ? (box1.titleTh || box1.title).trim() : '',
        prayerCard1Subtitle: box1 ? box1.subtitle.trim() : '',
        prayerCard1SubtitleEn: box1 ? (box1.subtitleEn || box1.subtitle).trim() : '',
        prayerCard1SubtitleTh: box1 ? (box1.subtitleTh || box1.subtitle).trim() : '',
        prayerCard1Count: box1 ? Number(box1.count) || 0 : 0,
        prayerCard2Title: box2 ? box2.title.trim() : '',
        prayerCard2TitleEn: box2 ? (box2.titleEn || box2.title).trim() : '',
        prayerCard2TitleTh: box2 ? (box2.titleTh || box2.title).trim() : '',
        prayerCard2Subtitle: box2 ? box2.subtitle.trim() : '',
        prayerCard2SubtitleEn: box2 ? (box2.subtitleEn || box2.subtitle).trim() : '',
        prayerCard2SubtitleTh: box2 ? (box2.subtitleTh || box2.subtitle).trim() : '',
        prayerCard2Count: box2 ? Number(box2.count) || 0 : 0,
        prayerCard3Title: box3 ? box3.title.trim() : '',
        prayerCard3TitleEn: box3 ? (box3.titleEn || box3.title).trim() : '',
        prayerCard3TitleTh: box3 ? (box3.titleTh || box3.title).trim() : '',
        prayerCard3Subtitle: box3 ? box3.subtitle.trim() : '',
        prayerCard3SubtitleEn: box3 ? (box3.subtitleEn || box3.subtitle).trim() : '',
        prayerCard3SubtitleTh: box3 ? (box3.subtitleTh || box3.subtitle).trim() : '',
        prayerCard3Count: box3 ? Number(box3.count) || 0 : 0,
        prayerModalTitle: modalTitleLo.trim(),
        prayerModalTitleEn: modalTitleEn.trim(),
        prayerModalTitleTh: modalTitleTh.trim(),
        prayerModalSubtitle: modalSubtitleLo.trim(),
        prayerModalSubtitleEn: modalSubtitleEn.trim(),
        prayerModalSubtitleTh: modalSubtitleTh.trim(),
        prayerModalItems: modalItems,
      };
      onSavePoster(draft).catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, [
    hidePrayerSection,
    badgeTextLo,
    badgeTextEn,
    badgeTextTh,
    titleLo,
    titleEn,
    titleTh,
    subtitleLo,
    subtitleEn,
    subtitleTh,
    buttonTextLo,
    buttonTextEn,
    buttonTextTh,
    bgImageUrl,
    countSuffixLo,
    countSuffixEn,
    countSuffixTh,
    prayerBoxes,
    modalTitleLo,
    modalTitleEn,
    modalTitleTh,
    modalSubtitleLo,
    modalSubtitleEn,
    modalSubtitleTh,
    modalItems,
  ]);

  const handleUpdateModalItem = (index: number, field: keyof PrayerTopicItem, value: any) => {
    setModalItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddModalItem = () => {
    const newItem: PrayerTopicItem = {
      id: `prayer-${Date.now()}`,
      title: `${modalItems.length + 1}. ຫົວຂໍ້ອະທິຖານໃໝ່`,
      titleEn: `${modalItems.length + 1}. New Prayer Need`,
      titleTh: `${modalItems.length + 1}. หัวข้ออธิษฐานใหม่`,
      desc: 'ລາຍລະອຽດຫົວຂໍ້ອະທິຖານ...',
      descEn: 'Details for this prayer need...',
      descTh: 'รายละเอียดหัวข้ออธิษฐาน...',
      count: 50,
    };
    setModalItems((prev) => [...prev, newItem]);
  };

  const handleDeleteModalItem = (index: number) => {
    if (modalItems.length <= 1) return;
    setModalItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const box1 = prayerBoxes[0];
      const box2 = prayerBoxes[1];
      const box3 = prayerBoxes[2];

      const updated: HomePoster = {
        ...(homePoster || { title: '', subtitle: '', description: '', imageUrl: '' }),
        hidePrayerSection,
        prayerBadgeText: badgeTextLo.trim(),
        prayerBadgeTextEn: badgeTextEn.trim(),
        prayerBadgeTextTh: badgeTextTh.trim(),
        prayerTitle: titleLo.trim(),
        prayerTitleEn: titleEn.trim(),
        prayerTitleTh: titleTh.trim(),
        prayerSubtitle: subtitleLo.trim(),
        prayerSubtitleEn: subtitleEn.trim(),
        prayerSubtitleTh: subtitleTh.trim(),
        prayerButtonText: buttonTextLo.trim(),
        prayerButtonTextEn: buttonTextEn.trim(),
        prayerButtonTextTh: buttonTextTh.trim(),
        prayerBgImageUrl: bgImageUrl.trim(),
        prayerPrayingCountSuffix: countSuffixLo.trim(),
        prayerPrayingCountSuffixEn: countSuffixEn.trim(),
        prayerPrayingCountSuffixTh: countSuffixTh.trim(),

        // Save full dynamic prayerBoxes array
        prayerBoxes,

        // Also keep legacy fields synced with the first 3 boxes
        prayerCard1Title: box1 ? box1.title.trim() : '',
        prayerCard1TitleEn: box1 ? (box1.titleEn || box1.title).trim() : '',
        prayerCard1TitleTh: box1 ? (box1.titleTh || box1.title).trim() : '',
        prayerCard1Subtitle: box1 ? box1.subtitle.trim() : '',
        prayerCard1SubtitleEn: box1 ? (box1.subtitleEn || box1.subtitle).trim() : '',
        prayerCard1SubtitleTh: box1 ? (box1.subtitleTh || box1.subtitle).trim() : '',
        prayerCard1Count: box1 ? Number(box1.count) || 0 : 0,

        prayerCard2Title: box2 ? box2.title.trim() : '',
        prayerCard2TitleEn: box2 ? (box2.titleEn || box2.title).trim() : '',
        prayerCard2TitleTh: box2 ? (box2.titleTh || box2.title).trim() : '',
        prayerCard2Subtitle: box2 ? box2.subtitle.trim() : '',
        prayerCard2SubtitleEn: box2 ? (box2.subtitleEn || box2.subtitle).trim() : '',
        prayerCard2SubtitleTh: box2 ? (box2.subtitleTh || box2.subtitle).trim() : '',
        prayerCard2Count: box2 ? Number(box2.count) || 0 : 0,

        prayerCard3Title: box3 ? box3.title.trim() : '',
        prayerCard3TitleEn: box3 ? (box3.titleEn || box3.title).trim() : '',
        prayerCard3TitleTh: box3 ? (box3.titleTh || box3.title).trim() : '',
        prayerCard3Subtitle: box3 ? box3.subtitle.trim() : '',
        prayerCard3SubtitleEn: box3 ? (box3.subtitleEn || box3.subtitle).trim() : '',
        prayerCard3SubtitleTh: box3 ? (box3.subtitleTh || box3.subtitle).trim() : '',
        prayerCard3Count: box3 ? Number(box3.count) || 0 : 0,

        prayerModalTitle: modalTitleLo.trim(),
        prayerModalTitleEn: modalTitleEn.trim(),
        prayerModalTitleTh: modalTitleTh.trim(),
        prayerModalSubtitle: modalSubtitleLo.trim(),
        prayerModalSubtitleEn: modalSubtitleEn.trim(),
        prayerModalSubtitleTh: modalSubtitleTh.trim(),
        prayerModalItems: modalItems,
      };

      await onSavePoster(updated);
      setToastMessage(language === 'lo' ? '✅ ບັນທຶກຂໍ້ມູນໜ້າອະທິຖານສຳເລັດແລ້ວ!' : '✅ Prayer settings saved successfully!');
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err: any) {
      console.error('Failed to save prayer settings:', err);
      setToastMessage(language === 'lo' ? '❌ ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ' : '❌ Error saving prayer settings');
      setTimeout(() => setToastMessage(''), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
        <div>
          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <span className="text-xl">🙏</span>
            <span>{language === 'lo' ? 'ຈັດການຂໍ້ຄວາມໜ້າອະທິຖານ' : 'Prayer Page & Needs Settings'}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'lo'
              ? 'ແກ້ໄຂທຸກຂໍ້ຄວາມ, ເພີ່ມ ຫຼື ລຶບກ່ອງອະທິຖານຢູ່ໜ້າຫຼັກ ແລະ ປ໊ອບອັບພິມຄຳອະທິຖານ'
              : 'Edit all titles, add or remove prayer boxes on the Home page, and configure the typing prayer popup.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Eye visibility toggle */}
          <button
            type="button"
            onClick={() => setHidePrayerSection(!hidePrayerSection)}
            className={`px-3 py-1.5 transition rounded-xl flex items-center gap-2 border text-xs font-bold shadow-xs cursor-pointer ${
              hidePrayerSection
                ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
            }`}
          >
            {hidePrayerSection ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span>{language === 'lo' ? 'ເຊື່ອງຢູ່' : 'Hidden'}</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>{language === 'lo' ? 'ສະແດງຢູ່' : 'Visible'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Language Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mr-2">
          <Globe className="w-3.5 h-3.5" />
          {language === 'lo' ? 'ພາສາທີ່ກຳລັງແກ້ໄຂ:' : 'Editing Language:'}
        </span>
        <button
          type="button"
          onClick={() => setActiveLangTab('lo')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeLangTab === 'lo'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <span>🇱🇦 ພາສາລາວ (Lao)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveLangTab('en')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeLangTab === 'en'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <span>🇬🇧 English</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveLangTab('th')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeLangTab === 'th'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <span>🇹🇭 ภาษาไทย (Thai)</span>
        </button>
      </div>

      {/* SECTION 1: MAIN CALLOUT HEADER */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('header')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5 text-sm font-extrabold text-slate-900 dark:text-white">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <h4 className="font-extrabold">{language === 'lo' ? '1. ຫົວຂໍ້ຫຼັກຂອງໜ້າອະທິຖານ (Main Callout Header)' : '1. Main Callout Header'}</h4>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('header') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('header') && (
        <div className="p-5 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Badge */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'lo' ? 'ປ້າຍກຳກັບດ້ານເທິງ (Badge Tag)' : 'Top Badge Tag'} ({activeLangTab.toUpperCase()})
            </label>
            <input
              type="text"
              value={activeLangTab === 'lo' ? badgeTextLo : activeLangTab === 'en' ? badgeTextEn : badgeTextTh}
              onChange={(e) => {
                if (activeLangTab === 'lo') setBadgeTextLo(e.target.value);
                else if (activeLangTab === 'en') setBadgeTextEn(e.target.value);
                else setBadgeTextTh(e.target.value);
              }}
              placeholder="PRAYER NEEDS / ຫົວຂໍ້ອະທິຖານ"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Button Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'lo' ? 'ຂໍ້ຄວາມເທິງປຸ່ມກົດ (Button Text)' : 'Action Button Text'} ({activeLangTab.toUpperCase()})
            </label>
            <input
              type="text"
              value={activeLangTab === 'lo' ? buttonTextLo : activeLangTab === 'en' ? buttonTextEn : buttonTextTh}
              onChange={(e) => {
                if (activeLangTab === 'lo') setButtonTextLo(e.target.value);
                else if (activeLangTab === 'en') setButtonTextEn(e.target.value);
                else setButtonTextTh(e.target.value);
              }}
              placeholder="ເບິ່ງຫົວຂໍ້ອະທິຖານ →"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Main Title */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'lo' ? 'ຫົວຂໍ້ໃຫຍ່ (Main Title)' : 'Main Title'} ({activeLangTab.toUpperCase()})
            </label>
            <input
              type="text"
              value={activeLangTab === 'lo' ? titleLo : activeLangTab === 'en' ? titleEn : titleTh}
              onChange={(e) => {
                if (activeLangTab === 'lo') setTitleLo(e.target.value);
                else if (activeLangTab === 'en') setTitleEn(e.target.value);
                else setTitleTh(e.target.value);
              }}
              placeholder="ທ່ານຈະຮ່ວມອະທິຖານກັບພວກເຮົາບໍ?"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Subtitle / Description */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'lo' ? 'ຄຳອະທິບາຍກ້ອງຫົວຂໍ້ (Subtitle / Description)' : 'Subtitle / Description'} ({activeLangTab.toUpperCase()})
            </label>
            <textarea
              rows={2}
              value={activeLangTab === 'lo' ? subtitleLo : activeLangTab === 'en' ? subtitleEn : subtitleTh}
              onChange={(e) => {
                if (activeLangTab === 'lo') setSubtitleLo(e.target.value);
                else if (activeLangTab === 'en') setSubtitleEn(e.target.value);
                else setSubtitleTh(e.target.value);
              }}
              placeholder="ນີ້ແມ່ນຫົວຂໍ້ອະທິຖານອັນຮີບດ່ວນໃນແຂວງບໍ່ແກ້ວເວລານີ້..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Praying Count Suffix */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'lo' ? 'ຄຳຕໍ່ທ້າຍຈຳນວນຄົນອະທິຖານ (Count Label)' : 'Count Suffix'} ({activeLangTab.toUpperCase()})
            </label>
            <input
              type="text"
              value={activeLangTab === 'lo' ? countSuffixLo : activeLangTab === 'en' ? countSuffixEn : countSuffixTh}
              onChange={(e) => {
                if (activeLangTab === 'lo') setCountSuffixLo(e.target.value);
                else if (activeLangTab === 'en') setCountSuffixEn(e.target.value);
                else setCountSuffixTh(e.target.value);
              }}
              placeholder="ຄົນກຳລັງອະທິຖານ / praying"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Background Image URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'lo' ? 'ຮູບພາບພື້ນຫຼັງ (Background Image URL)' : 'Section Background Image URL'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={bgImageUrl}
                onChange={(e) => setBgImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
              />
              <UnifiedMediaUploader
                value={bgImageUrl}
                onChange={(url) => setBgImageUrl(url)}
                language={language}
                label={language === 'lo' ? 'ອັບໂຫຼດ' : 'Upload'}
              />
            </div>
          </div>

          {/* Inner Save Bar for Section 1 */}
          <div className="md:col-span-2 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? (language === 'lo' ? 'ກຳລັງບັນທຶກ...' : 'Saving...') : (language === 'lo' ? 'ບັນທຶກຂໍ້ມູນ' : 'Save Changes')}</span>
            </button>
          </div>
        </div>
        )}
      </div>

      {/* SECTION 2: FLOATING PRAYER BOXES ON HOME PAGE (ADD / REMOVE / EDIT) */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('cards')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5 text-sm font-extrabold text-slate-900 dark:text-white">
            <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
            <h4 className="font-extrabold">
              {language === 'lo'
                ? `2. ກ່ອງອະທິຖານຢູ່ໜ້າຫຼັກ (Prayer Boxes - ${prayerBoxes.length} ກ່ອງ)`
                : `2. Prayer Boxes on Home Page (${prayerBoxes.length} Boxes)`}
            </h4>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('cards') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('cards') && (
        <div className="p-5 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between gap-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 rounded-xl px-3.5 py-2.5">
            <p className="text-xs text-emerald-800 dark:text-emerald-200 font-semibold">
              {language === 'lo'
                ? '💡 ທ່ານສາມາດເພີ່ມ ຫຼື ລຶບກ່ອງອະທິຖານໄດ້ຕາມຕ້ອງການ. ເມື່ອຜູ້ຊົມກົດໃສ່ກ່ອງອະທິຖານ ຈະມີປ໊ອບອັບຂຶ້ນມາໃຫ້ພິມຄຳອະທິຖານທັນທີ.'
                : '💡 You can add or remove prayer boxes freely. When visitors click any prayer box on the Home page, a typing prayer popup opens.'}
            </p>
            <button
              type="button"
              onClick={handleAddPrayerBox}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'lo' ? 'ເພີ່ມກ່ອງອະທິຖານ' : 'Add Prayer Box'}</span>
            </button>
          </div>

          {prayerBoxes.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
              <p className="text-xs text-slate-500">
                {language === 'lo' ? 'ຍັງບໍ່ມີກ່ອງອະທິຖານ' : 'No prayer boxes configured yet.'}
              </p>
              <button
                type="button"
                onClick={handleAddPrayerBox}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'lo' ? 'ເພີ່ມກ່ອງອະທິຖານກ່ອງທຳອິດ' : 'Add First Prayer Box'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prayerBoxes.map((box, idx) => (
                <div
                  key={box.id || idx}
                  className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between shadow-2xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-white">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[11px] font-black">
                          {idx + 1}
                        </span>
                        <span>
                          {language === 'lo' ? `ກ່ອງອະທິຖານທີ ${idx + 1}` : `Prayer Box #${idx + 1}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePrayerBox(idx)}
                        className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        title={language === 'lo' ? 'ລຶບກ່ອງອະທິຖານນີ້' : 'Remove this prayer box'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{language === 'lo' ? 'ລຶບ' : 'Remove'}</span>
                      </button>
                    </div>

                    {/* Icon & Count Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                          {language === 'lo' ? 'ໄອຄອນ (Icon)' : 'Icon'}
                        </label>
                        <select
                          value={box.icon || 'users'}
                          onChange={(e) => handleUpdatePrayerBox(idx, 'icon', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                          <option value="users">👥 Users / Workers</option>
                          <option value="shield">🛡️ Shield / Protection</option>
                          <option value="heart">❤️ Heart / Provision</option>
                          <option value="church">⛪ Church / Ministry</option>
                          <option value="sparkles">✨ Sparkles / Blessing</option>
                          <option value="globe">🌏 Globe / Outreach</option>
                          <option value="book">📖 Bible / Teaching</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                          {language === 'lo' ? 'ຈຳນວນອະທິຖານ' : 'Praying Count'}
                        </label>
                        <input
                          type="number"
                          value={box.count ?? 50}
                          onChange={(e) => handleUpdatePrayerBox(idx, 'count', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        {language === 'lo' ? 'ຫົວຂໍ້ກ່ອງອະທິຖານ' : 'Box Title'} ({activeLangTab.toUpperCase()})
                      </label>
                      <input
                        type="text"
                        value={
                          activeLangTab === 'lo'
                            ? (box.title || '')
                            : activeLangTab === 'en'
                            ? (box.titleEn ?? box.title ?? '')
                            : (box.titleTh ?? box.title ?? '')
                        }
                        onChange={(e) => {
                          const field = activeLangTab === 'lo' ? 'title' : activeLangTab === 'en' ? 'titleEn' : 'titleTh';
                          handleUpdatePrayerBox(idx, field, e.target.value);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                      />
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        {language === 'lo' ? 'ຄຳອະທິບາຍຍ່ອຍເທິງກ່ອງ' : 'Box Subtitle'} ({activeLangTab.toUpperCase()})
                      </label>
                      <input
                        type="text"
                        value={
                          activeLangTab === 'lo'
                            ? (box.subtitle || '')
                            : activeLangTab === 'en'
                            ? (box.subtitleEn ?? box.subtitle ?? '')
                            : (box.subtitleTh ?? box.subtitle ?? '')
                        }
                        onChange={(e) => {
                          const field = activeLangTab === 'lo' ? 'subtitle' : activeLangTab === 'en' ? 'subtitleEn' : 'subtitleTh';
                          handleUpdatePrayerBox(idx, field, e.target.value);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Detailed Prayer Description shown inside Typing Prayer Popup */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        {language === 'lo' ? 'ລາຍລະອຽດໃນປ໊ອບອັບພິມຄຳອະທິຖານ' : 'Popup Prayer Description'} ({activeLangTab.toUpperCase()})
                      </label>
                      <textarea
                        rows={2}
                        value={
                          activeLangTab === 'lo'
                            ? (box.desc || '')
                            : activeLangTab === 'en'
                            ? (box.descEn ?? box.desc ?? '')
                            : (box.descTh ?? box.desc ?? '')
                        }
                        onChange={(e) => {
                          const field = activeLangTab === 'lo' ? 'desc' : activeLangTab === 'en' ? 'descEn' : 'descTh';
                          handleUpdatePrayerBox(idx, field, e.target.value);
                        }}
                        placeholder={language === 'lo' ? 'ລາຍລະອຽດຫົວຂໍ້ອະທິຖານເມື່ອຄລິກກ່ອງ...' : 'Description shown when user clicks to type a prayer...'}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Submitted Typed Prayers Count & Preview */}
                  {box.comments && box.comments.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                      <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                        <span>💬 {language === 'lo' ? `ຄຳອະທິຖານທີ່ສົ່ງເຂົ້າມາ (${box.comments.length})` : `Submitted Prayers (${box.comments.length})`}</span>
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                        {box.comments.map((c) => (
                          <div key={c.id} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 text-[11px] flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{c.authorName || 'Anonymous'}: </span>
                              <span className="text-slate-600 dark:text-slate-400 break-words">{c.message}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteBoxComment(idx, c.id)}
                              className="text-slate-400 hover:text-red-500 shrink-0 cursor-pointer"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Inner Save Bar for Section 2 */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? (language === 'lo' ? 'ກຳລັງບັນທຶກ...' : 'Saving...') : (language === 'lo' ? 'ບັນທຶກຂໍ້ມູນ' : 'Save Changes')}</span>
            </button>
          </div>
        </div>
        )}
      </div>

      {/* SECTION 3: PRAYER MODAL FULL CONTENT */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('modal')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5 text-sm font-extrabold text-slate-900 dark:text-white">
            <span className="text-base shrink-0">📋</span>
            <h4 className="font-extrabold">{language === 'lo' ? '3. ປ໊ອບອັບລາຍການຫົວຂໍ້ອະທິຖານທັງໝົດ (Prayer Modal Needs)' : '3. Full Prayer Modal Content'}</h4>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
              isOpen('modal') ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {isOpen('modal') && (
        <div className="p-5 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
        {/* Modal Header Titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'lo' ? 'ຫົວຂໍ້ປ໊ອບອັບ (Modal Title)' : 'Modal Title'} ({activeLangTab.toUpperCase()})
            </label>
            <input
              type="text"
              value={activeLangTab === 'lo' ? modalTitleLo : activeLangTab === 'en' ? modalTitleEn : modalTitleTh}
              onChange={(e) => {
                if (activeLangTab === 'lo') setModalTitleLo(e.target.value);
                else if (activeLangTab === 'en') setModalTitleEn(e.target.value);
                else setModalTitleTh(e.target.value);
              }}
              placeholder="ຫົວຂໍ້ອະທິຖານເພື່ອແຂວງບໍ່ແກ້ວ"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'lo' ? 'ຄຳອະທິບາຍປ໊ອບອັບ (Modal Subtitle)' : 'Modal Subtitle'} ({activeLangTab.toUpperCase()})
            </label>
            <input
              type="text"
              value={activeLangTab === 'lo' ? modalSubtitleLo : activeLangTab === 'en' ? modalSubtitleEn : modalSubtitleTh}
              onChange={(e) => {
                if (activeLangTab === 'lo') setModalSubtitleLo(e.target.value);
                else if (activeLangTab === 'en') setModalSubtitleEn(e.target.value);
                else setModalSubtitleTh(e.target.value);
              }}
              placeholder="ຮ່ວມອະທິຖານ ແລະ ກົດຖືກໃຈເພື່ອຮ່ວມອະທິຖານ"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Add Item Bar Inside Section 3 */}
        <div className="flex items-center justify-between gap-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/60 rounded-xl px-3.5 py-2.5">
          <p className="text-xs text-purple-800 dark:text-purple-200 font-semibold">
            {language === 'lo'
              ? '💡 ຈັດການລາຍການຫົວຂໍ້ອະທິຖານທັງໝົດທີ່ສະແດງໃນປ໊ອບອັບ.'
              : '💡 Manage all prayer topics displayed inside the full Prayer Needs modal.'}
          </p>
          <button
            type="button"
            onClick={handleAddModalItem}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'lo' ? 'ເພີ່ມຫົວຂໍ້ໃໝ່' : 'Add Item'}</span>
          </button>
        </div>

        {/* Modal Items List */}
        <div className="space-y-3">
          {modalItems.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-700 dark:text-purple-400">
                  #{idx + 1} {language === 'lo' ? 'ຫົວຂໍ້ອະທິຖານ' : 'Prayer Topic'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">
                    {language === 'lo' ? 'ຈຳນວນ:' : 'Count:'}
                  </span>
                  <input
                    type="number"
                    value={item.count ?? 50}
                    onChange={(e) => handleUpdateModalItem(idx, 'count', Number(e.target.value))}
                    className="w-20 px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  {modalItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteModalItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                      title={language === 'lo' ? 'ລຶບ' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                  {language === 'lo' ? 'ຫົວຂໍ້' : 'Title'} ({activeLangTab.toUpperCase()})
                </label>
                <input
                  type="text"
                  value={activeLangTab === 'lo' ? (item.title || '') : activeLangTab === 'en' ? (item.titleEn || item.title || '') : (item.titleTh || item.title || '')}
                  onChange={(e) => {
                    const field = activeLangTab === 'lo' ? 'title' : activeLangTab === 'en' ? 'titleEn' : 'titleTh';
                    handleUpdateModalItem(idx, field, e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                  {language === 'lo' ? 'ຄຳອະທິບາຍລະອຽດ' : 'Description'} ({activeLangTab.toUpperCase()})
                </label>
                <textarea
                  rows={2}
                  value={activeLangTab === 'lo' ? (item.desc || '') : activeLangTab === 'en' ? (item.descEn || item.desc || '') : (item.descTh || item.desc || '')}
                  onChange={(e) => {
                    const field = activeLangTab === 'lo' ? 'desc' : activeLangTab === 'en' ? 'descEn' : 'descTh';
                    handleUpdateModalItem(idx, field, e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Inner Save Bar for Section 3 */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? (language === 'lo' ? 'ກຳລັງບັນທຶກ...' : 'Saving...') : (language === 'lo' ? 'ບັນທຶກຂໍ້ມູນ' : 'Save Changes')}</span>
          </button>
        </div>
        </div>
        )}
      </div>
    </div>
  );
};

import { Language, Village } from '../types';

/**
 * Maps Lao district names to English, Thai, and standard Lao names
 */
const DISTRICT_TRANSLATIONS: Record<string, { en: string; th: string; lo: string }> = {
  'ຜາອຸດົມ': { en: 'Pha Oudom', th: 'ผาอุดม', lo: 'ຜາອຸດົມ' },
  'ປາກທາ': { en: 'Paktha', th: 'ปากทา', lo: 'ປາກທາ' },
  'ຕົ້ນເຜິ້ງ': { en: 'Ton Pheung', th: 'ต้นผึ้ง', lo: 'ຕົ້ນເຜິ້ງ' },
  'ຫ້ວຍຊາຍ': { en: 'Huayxai', th: 'ห้วยทราย', lo: 'ຫ້ວຍຊາຍ' },
  'ເມິງ': { en: 'Meung', th: 'เมิง', lo: 'ເມິງ' },
  'ຫ້ວຍໄຜ່': { en: 'Houeyphay', th: 'ห้วยไผ่', lo: 'ຫ້ວຍໄຜ່' },
};

/**
 * Returns localized district name
 */
export function getLocalizedDistrict(district: string | undefined | null, lang: Language): string {
  if (!district) return '';
  const dTrim = district.trim();
  const dLower = dTrim.toLowerCase();

  // Check direct key match
  for (const [loKey, translations] of Object.entries(DISTRICT_TRANSLATIONS)) {
    if (
      dTrim === loKey ||
      dLower === translations.en.toLowerCase() ||
      dTrim === translations.th ||
      dLower.includes(loKey) ||
      (dLower.includes('pha') && loKey === 'ຜາອຸດົມ') ||
      (dLower.includes('oudom') && loKey === 'ຜາອຸດົມ') ||
      (dLower.includes('pak') && loKey === 'ປາກທາ') ||
      (dLower.includes('ton') && loKey === 'ຕົ້ນເຜິ້ງ') ||
      (dLower.includes('pheung') && loKey === 'ຕົ້ນເຜິ້ງ') ||
      (dLower.includes('huay') && loKey === 'ຫ້ວຍຊາຍ') ||
      (dLower.includes('houay') && loKey === 'ຫ້ວຍຊາຍ') ||
      (dLower.includes('xai') && loKey === 'ຫ້ວຍຊາຍ') ||
      (dLower.includes('meung') && loKey === 'ເມິງ')
    ) {
      if (lang === 'en') return translations.en;
      if (lang === 'th') return translations.th;
      return translations.lo;
    }
  }

  if (lang === 'en' && (dTrim === 'ອື່ນໆ' || dTrim === 'ອື່ນໆ...' || dTrim === 'ທັງໝົດ')) {
    return dTrim === 'ທັງໝົດ' ? 'All Districts' : 'Other';
  }

  return dTrim;
}

/**
 * Status / Persecution localization
 */
export function getLocalizedStatus(status: string | undefined | null, lang: Language): string {
  if (!status) return lang === 'en' ? 'Normal' : lang === 'th' ? 'ปกติ' : 'ປົກກະຕິ';
  const s = status.trim().toLowerCase();

  if (s === 'ປານກາງ' || s === 'ปานกลาง' || s === 'moderate') {
    if (lang === 'en') return 'Moderate';
    if (lang === 'th') return 'ปานกลาง';
    return 'ປານກາງ';
  }

  if (s === 'ປົກກະຕິ' || s === 'ปกติ' || s === 'normal') {
    if (lang === 'en') return 'Normal';
    if (lang === 'th') return 'ปกติ';
    return 'ປົກກະຕິ';
  }

  if (s === 'ວິກິດ' || s === 'วิกฤต' || s === 'severe' || s === 'critical' || s === 'urgent') {
    if (lang === 'en') return 'Critical / Urgent';
    if (lang === 'th') return 'วิกฤต / เร่งด่วน';
    return 'ວິກິດ';
  }

  if (s === 'ສູງ' || s === 'สูง' || s === 'high') {
    if (lang === 'en') return 'High';
    if (lang === 'th') return 'สูง';
    return 'ສູງ';
  }

  return status;
}

/**
 * Province localization
 */
export function getLocalizedProvince(province: string | undefined | null, lang: Language): string {
  if (!province) return '';
  const p = province.trim().toLowerCase();
  if (p === 'ບໍ່ແກ້ວ' || p === 'บ่อแก้ว' || p.includes('bokeo')) {
    if (lang === 'en') return 'Bokeo Province';
    if (lang === 'th') return 'แขวงบ่อแก้ว';
    return 'ແຂວງບໍ່ແກ້ວ';
  }
  return province;
}

/**
 * Known Village Names transliterations / translations for clean multilingual display
 */
const KNOWN_VILLAGES: Record<string, { en: string; th: string }> = {
  'ມັກສຸກ': { en: 'Maksouk', th: 'มักสุก' },
  'ພຽງດຳ': { en: 'Phiangdam', th: 'เพียงดำ' },
  'ຫ້ວຍກູມ': { en: 'Huay Koom', th: 'ห้วยกูม' },
  'ແກ່ນຄຳ': { en: 'Kaen Kham', th: 'แก่นคำ' },
  'ມົກໄປຼ': { en: 'Mokplai', th: 'มกไปล' },
  'ປ່າອ້ອຍ': { en: 'Pa Oi', th: 'ป่าอ้อย' },
  'ນ້ຳເກິ່ງ': { en: 'Nam Keung', th: 'น้ำเกิ่ง' },
  'ດອນມູນ': { en: 'Don Moon', th: 'ดอนมูล' },
  'ຫ້ວຍຊາຍ': { en: 'Huayxai', th: 'ห้วยทราย' },
  'ປາກທາ': { en: 'Paktha', th: 'ปากทา' },
  'ຕົ້ນເຜິ້ງ': { en: 'Tonpheung', th: 'ต้นผึ้ง' },
  'ຜາອຸດົມ': { en: 'Pha Oudom', th: 'ผาอุดม' },
  'ເມິງ': { en: 'Meung', th: 'เมิง' },
  'ປຸ່ງ': { en: 'Pung', th: 'ปุ่ง' },
  'ໂພນໄຊ': { en: 'Phonxay', th: 'โพนไซ' },
  'ໃຫຍ່': { en: 'Yai', th: 'ใหญ่' },
};

/**
 * Localized Village / Church Name
 */
export function getLocalizedVillageName(
  v: { name: string; nameEn?: string; nameTh?: string },
  lang: Language
): string {
  if (!v || !v.name) return '';
  if (lang === 'en') {
    if (v.nameEn && v.nameEn.trim()) return v.nameEn.trim();
    const cleanName = v.name.trim().replace(/^⛪\s*/, '');
    if (KNOWN_VILLAGES[cleanName]) return KNOWN_VILLAGES[cleanName].en;
    return cleanName;
  }
  if (lang === 'th') {
    if (v.nameTh && v.nameTh.trim()) return v.nameTh.trim();
    const cleanName = v.name.trim().replace(/^⛪\s*/, '');
    if (KNOWN_VILLAGES[cleanName]) return KNOWN_VILLAGES[cleanName].th;
    return cleanName;
  }
  return v.name;
}

/**
 * Needs / Requests localization helper
 */
const KNOWN_NEEDS_TRANSLATIONS: Record<string, { en: string; th: string }> = {
  'ເພື່ອ ອາຄານທີ່ກຳລັງສ້າງ': {
    en: 'Building construction in progress',
    th: 'สำหรับอาคารที่กำลังก่อสร้าง',
  },
  'ຕ້ອງການປື້ມຄຳສອນ': {
    en: 'Requires discipleship study materials',
    th: 'ต้องการหนังสือคำสอน',
  },
  'ອາຄານທີ່ກຳລັງສ້າງ': {
    en: 'Building currently under construction',
    th: 'อาคารที่กำลังก่อสร้าง',
  },
  'ຕ້ອງການຄຳອະທິຖານ ແລະ ຄວາມຊ່ວຍເຫຼືອເລັ່ງດ່ວນ': {
    en: 'Urgent prayer and community relief needed',
    th: 'ต้องการคำอธิษฐานและความช่วยเหลือเร่งด่วน',
  },
  'ບໍ່ມີໝາຍເຫດ': {
    en: 'No specific notes recorded',
    th: 'ไม่มีหมายเหตุเพิ่มเติม',
  },
};

export function getLocalizedNeeds(
  v: { needs?: string; needsEn?: string; needsTh?: string; notes?: string },
  lang: Language
): string {
  if (lang === 'en') {
    if (v.needsEn && v.needsEn.trim()) return v.needsEn.trim();
    const raw = (v.needs || v.notes || '').trim();
    if (KNOWN_NEEDS_TRANSLATIONS[raw]) return KNOWN_NEEDS_TRANSLATIONS[raw].en;
    if (!raw) return 'Active fellowship & outreach';
    return raw;
  }
  if (lang === 'th') {
    if (v.needsTh && v.needsTh.trim()) return v.needsTh.trim();
    const raw = (v.needs || v.notes || '').trim();
    if (KNOWN_NEEDS_TRANSLATIONS[raw]) return KNOWN_NEEDS_TRANSLATIONS[raw].th;
    return raw || 'การรวมตัวนมัสการและพันธกิจ';
  }
  return v.needs || v.notes || '';
}

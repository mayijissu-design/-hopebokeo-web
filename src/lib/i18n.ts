import { Language } from '../types';

export const translations = {
  // Navigation & Tabs
  navHome: { lo: 'ໜ້າຫຼັກ', en: 'Home', th: 'หน้าหลัก' },
  navDashboard: { lo: 'ດາສບອດພັນທະກິດ', en: 'Ministry Dashboard', th: 'แดชบอร์ดพันธกิจ' },
  navAbout: { lo: 'ກ່ຽວກັບພວກເຮົາ', en: 'About Us', th: 'เกี่ยวกับเรา' },
  navChurchPortal: { lo: 'ຫ້ອງອັບເດດຄຣິດຕະຈັກ', en: 'Church Portal', th: 'ห้องอัปเดตคริสตจักร' },
  navAdmin: { lo: 'ຫ້ອງແອັດມິນ', en: 'Admin Portal', th: 'ห้องผู้ดูแลระบบ' },

  // Header & App Info
  appName: { lo: 'Hope Bokeo Ministry', en: 'Hope Bokeo Ministry', th: 'Hope Bokeo Ministry' },
  appSub: { lo: 'ແຂວງບໍ່ແກ້ວ (Lao PDR)', en: 'Bokeo Province (Lao PDR)', th: 'แขวงบ่อแก้ว (สปป.ลาว)' },

  // System status
  syncing: { lo: 'ກຳລັງຊິງຄ໌...', en: 'Syncing...', th: 'กำลังซิงค์...' },
  offlineBanner: {
    lo: 'ໂໝດອອຟໄລນ໌ (Offline) — ກຳລັງສະແດງຂໍ້ມູນທີ່ບັນທຶກໄວ້. ຂໍ້ມູນຈະຊິງຄ໌ອັດໂຕໂນມັດເມື່ອມີສັນຍານອິນເຕີເນັດ.',
    en: 'Offline Mode — Displaying cached data. Any updates will sync automatically when back online.',
    th: 'โหมดออฟไลน์ — กำลังแสดงข้อมูลที่บันทึกไว้ ข้อมูลจะซิงค์อัตโนมัติเมื่อเชื่อมต่ออินเทอร์เน็ต',
  },

  // Buttons & Actions
  save: { lo: 'ບັນທຶກ', en: 'Save', th: 'บันทึก' },
  cancel: { lo: 'ຍົກເລີກ', en: 'Cancel', th: 'ยกเลิก' },
  delete: { lo: 'ລົບ', en: 'Delete', th: 'ลบ' },
  edit: { lo: 'ແກ້ໄຂ', en: 'Edit', th: 'แก้ไข' },
  add: { lo: 'ເພີ່ມ', en: 'Add', th: 'เพิ่ม' },
  close: { lo: 'ປິດ', en: 'Close', th: 'ปิด' },
  search: { lo: 'ຄົ້ນຫາ', en: 'Search', th: 'ค้นหา' },
  viewDashboard: { lo: 'ເບິ່ງດາສບອດຂໍ້ມູນ', en: 'View Dashboard', th: 'ดูแดชบอร์ดข้อมูล' },
  copy: { lo: 'ກັອບປີ້', en: 'Copy', th: 'คัดลอก' },
  copied: { lo: 'ກັອບປີ້ແລ້ວ', en: 'Copied', th: 'คัดลอกแล้ว' },
  saving: { lo: 'ກຳລັງບັນທຶກ...', en: 'Saving...', th: 'กำลังบันทึก...' },

  // Home Page
  defaultHeroTitle: {
    lo: 'ປະກາດຂ່າວປະເສີດ ແລະ ສ້າງສາວົກ',
    en: 'Proclaim Gospel & Disciple Nations',
    th: 'ประกาศข่าวประเสริฐ และสร้างสาวก',
  },
  defaultHeroSubtitle: {
    lo: 'ແຂວງບໍ່ແກ້ວ (Bokeo Province)',
    en: 'Bokeo Province (Lao PDR)',
    th: 'แขวงบ่อแก้ว (Bokeo Province)',
  },
  defaultHeroDesc: {
    lo: 'ຮ່ວມເປັນສ່ວນໜຶ່ງໃນການຂັບເຄື່ອນວຽກງານຂອງພຣະເຈົ້າໃນແຂວງບໍ່ແກ້ວ ໂດຍການຕິດຕາມ, ຮ່ວມອະທິຖານ ແລະ ສະໜັບສະໜູນວຽກງານພາກສະໜາມ.',
    en: 'Be a vital part of advancing God’s work in Bokeo Province through tracking, faithful prayer, and supporting field operations.',
    th: 'ร่วมเป็นส่วนหนึ่งในการขับเคลื่อนพระราชกิจของพระเจ้าในแขวงบ่อแก้ว โดยการติดตาม ร่วมอธิษฐาน และสนับสนุนงานภาคสนาม',
  },
  eventsHeader: {
    lo: 'ຮູບພາບກິດຈະກຳ ແລະ ຂ່າວສານພາກສະໜາມ',
    en: 'Field Events & News Gallery',
    th: 'ภาพกิจกรรมและข่าวสารภาคสนาม',
  },

  // About Page
  visionMissionTitle: {
    lo: 'ວິໄສທັດ ແລະ ພັນທະກິດ (Vision & Mission)',
    en: 'Vision & Mission Statement',
    th: 'วิสัยทัศน์ และพันธกิจ (Vision & Mission)',
  },
  visionTitle: { lo: 'ວິໄສທັດ (Our Vision)', en: 'Our Vision', th: 'วิสัยทัศน์ (Our Vision)' },
  missionTitle: { lo: 'ພັນທະກິດ (Our Mission)', en: 'Our Mission', th: 'พันธกิจ (Our Mission)' },
  partnershipTitle: {
    lo: 'ຊ່ອງທາງການຮ່ວມບໍລິຈາກ ແລະ ອຸປະຖຳພັນທະກິດ',
    en: 'Support & Financial Giving Channels',
    th: 'ช่องทางการร่วมบริจาค และอุปถัมภ์พันธกิจ',
  },
  bankAccountsHeader: {
    lo: 'ຂໍ້ມູນບັນຊີທະນາຄານ',
    en: 'Bank Account Information',
    th: 'ข้อมูลบัญชีธนาคาร',
  },
  swipeInstruction: {
    lo: 'ສາມາດ ປັດໄປຊ້າຍ/ຂວາ ຫຼື ກົດປຸ່ມດ້ານເທິງ ເພື່ອປ່ຽນບັນຊີທະນາຄານ ແລະ ແກນ QR Code',
    en: 'Swipe left/right or click buttons above to switch bank accounts & QR code',
    th: 'สามารถปัดไปซ้าย/ขวา หรือกดปุ่มด้านบน เพื่อเปลี่ยนบัญชีธนาคารและสแกน QR Code',
  },
  prayerLineTitle: {
    lo: 'ຊ່ອງທາງຮ່ວມອະທິຖານ ແລະ ຝາກຄຳອະທິຖານ (Prayer & Support Line)',
    en: 'Prayer Partnership & Hotline',
    th: 'ช่องทางร่วมอธิษฐาน และฝากคำอธิษฐาน (Prayer & Support Line)',
  },
  teamTitle: {
    lo: 'ທີມງານພັນທະກິດ (Ministry Team)',
    en: 'Our Ministry Team',
    th: 'ทีมงานพันธกิจ (Ministry Team)',
  },

  // Admin & Forms
  adminHeader: { lo: 'ລະບົບຈັດການຂໍ້ມູນແອັດມິນ', en: 'Master Admin Management', th: 'ระบบจัดการข้อมูลผู้ดูแลระบบ' },
  heroSettings: { lo: 'ຕັ້ງຄ່າໜ້າໂປສເຕີຫຼັກ (Hero Banner)', en: 'Hero Banner Settings', th: 'ตั้งค่าหน้าโปสเตอร์หลัก (Hero Banner)' },
  donationSettings: { lo: 'ຕັ້ງຄ່າບັນຊີບໍລິຈາກ & ການຕິດຕໍ່', en: 'Donation Accounts & Contacts', th: 'ตั้งค่าบัญชีบริจาคและการติดต่อ' },
  villageManage: { lo: 'ຈັດການຂໍ້ມູນຄຣິດຕະຈັກ / ບ້ານ', en: 'Church & Village Management', th: 'จัดการข้อมูลคริสตจักร / หมู่บ้าน' },
  eventsManage: { lo: 'ຈັດການກິດຈະກຳ / ຂ່າວສານ', en: 'Events & News Management', th: 'จัดการกิจกรรม / ข่าวสาร' },
  teamManage: { lo: 'ຈັດການທີມງານພັນທະກິດ', en: 'Ministry Team Management', th: 'จัดการทีมงานพันธกิจ' },

  // AI Assistant
  aiTitle: { lo: 'AI ຜູ້ຊ່ວຍ Hope Bokeo', en: 'Hope Bokeo AI Assistant', th: 'AI ผู้ช่วย Hope Bokeo' },
  aiPlaceholder: { lo: 'ພິມຄຳຖາມຂອງທ່ານຢູ່ທີ່ນີ້...', en: 'Type your question here...', th: 'พิมพ์คำถามของคุณที่นี่...' },
};

/**
 * Gets translation string for specified key and language with fallback to Lao/English
 */
export function t(key: keyof typeof translations, lang: Language): string {
  const item = translations[key];
  if (!item) return '';
  return item[lang] || item.lo || item.en || '';
}

/**
 * Gets localized text from an entity containing multilingual fields (e.g. title, titleEn, titleTh)
 */
export function getLocalizedText(
  item: Record<string, any> | undefined | null,
  baseField: string,
  lang: Language,
  fallback: string = ''
): string {
  if (!item) return fallback;
  if (lang === 'en' && item[`${baseField}En`]) {
    return item[`${baseField}En`];
  }
  if (lang === 'th' && item[`${baseField}Th`]) {
    return item[`${baseField}Th`];
  }
  return item[baseField] || item[`${baseField}En`] || item[`${baseField}Th`] || fallback;
}

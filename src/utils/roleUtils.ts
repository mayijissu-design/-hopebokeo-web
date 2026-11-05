import { TeamMember, Language } from '../types';

export const getLocalizedRole = (team: Partial<TeamMember> | undefined | null, lang: Language): string => {
  if (!team) return '';

  const rawRole = (team.role || '').trim();
  const rawRoleEn = (team.roleEn || '').trim();
  const rawRoleTh = (team.roleTh || '').trim();

  if (lang === 'en') {
    if (rawRoleEn) return rawRoleEn;
    const lower = rawRole.toLowerCase();
    if (lower.includes('ປະສານງານ') || lower.includes('coordinator')) return 'Coordinator';
    if (lower.includes('ພັນທະກິດ') || lower.includes('ຜູ້ນຳ') || lower.includes('leader')) return 'Ministry Leader';
    if (lower.includes('ດູແລ') || lower.includes('ເບິ່ງແຍງ') || lower.includes('ກຸ່ມ') || lower.includes('care') || lower.includes('shepherd')) return 'Group Shepherd';
    if (lower.includes('ການເງິນ') || lower.includes('ບັນຊີ') || lower.includes('finance') || lower.includes('treasurer')) return 'Finance / Treasurer';
    if (lower.includes('ປະຊາສຳພັນ') || lower.includes('public relation') || lower.includes('pr')) return 'Public Relations';
    if (lower.includes('ສື່') || lower.includes('ໄອທີ') || lower.includes('media') || lower.includes('it')) return 'Media & IT';
    if (lower.includes('ອາຄານ') || lower.includes('ສະຖານທີ່') || lower.includes('logistics') || lower.includes('facility')) return 'Facilities & Logistics';
    if (lower.includes('ສິດຍາພິບານ') || lower.includes('ອາຈານ') || lower.includes('pastor')) return 'Pastor';
    if (lower.includes('ຊາວໜຸ່ມ') || lower.includes('youth')) return 'Youth Leader';
    if (lower.includes('ນະມັດສະການ') || lower.includes('worship')) return 'Worship Leader';
    if (lower.includes('ເດັກ') || lower.includes('children') || lower.includes('kids')) return 'Children Ministry';
    if (lower.includes('ປະກາດ') || lower.includes('evangelist')) return 'Evangelist';
    if (lower.includes('ຜູ້ຊ່ວຍ') || lower.includes('assistant')) return 'Assistant';
    return rawRole || 'Staff';
  }

  if (lang === 'th') {
    if (rawRoleTh) return rawRoleTh;
    const lower = (rawRole || rawRoleEn).toLowerCase();
    if (lower.includes('ປະສານງານ') || lower.includes('coordinator')) return 'ผู้ประสานงาน';
    if (lower.includes('ພັນທະກິດ') || lower.includes('ຜູ້ນຳ') || lower.includes('leader')) return 'ผู้นำพันธกิจ';
    if (lower.includes('ດູແລ') || lower.includes('ເບິ່ງແຍງ') || lower.includes('ກຸ່ມ') || lower.includes('care') || lower.includes('shepherd')) return 'ผู้ดูแลกลุ่ม';
    if (lower.includes('ການເງິນ') || lower.includes('ບັນຊີ') || lower.includes('finance') || lower.includes('treasurer')) return 'การเงิน / บัญชี';
    if (lower.includes('ປະຊາສຳພັນ') || lower.includes('public relation') || lower.includes('pr')) return 'ประชาสัมพันธ์';
    if (lower.includes('ສື່') || lower.includes('ໄອທີ') || lower.includes('media') || lower.includes('it')) return 'สื่อและไอที';
    if (lower.includes('ອາຄານ') || lower.includes('ສະຖານທີ່') || lower.includes('logistics') || lower.includes('facility')) return 'สถานที่และสิ่งอำนวยความสะดวก';
    if (lower.includes('ສິດຍາພິບານ') || lower.includes('ອາຈານ') || lower.includes('pastor')) return 'ศิษยาภิบาล';
    if (lower.includes('ຊາວໜຸ່ມ') || lower.includes('youth')) return 'ผู้นำเยาวชน';
    if (lower.includes('ນະມັດສະການ') || lower.includes('worship')) return 'ผู้นำนมัสการ';
    if (lower.includes('ເດັກ') || lower.includes('children') || lower.includes('kids')) return 'พันธกิจเด็ก';
    if (lower.includes('ປະກາດ') || lower.includes('evangelist')) return 'ผู้ประกาศ';
    if (lower.includes('ຜູ້ຊ່ວຍ') || lower.includes('assistant')) return 'ผู้ช่วย';
    return rawRole || 'ทีมงาน';
  }

  // Default Lao ('lo')
  const lower = rawRole.toLowerCase();
  if (lower === 'public relation' || lower === 'public relations' || lower === 'pr') return 'ປະຊາສຳພັນ';
  if (lower === 'coordinator') return 'ຜູ້ປະສານງານ';
  if (lower === 'ministry leader' || lower === 'leader') return 'ຜູ້ນຳພັນທະກິດ';
  if (lower === 'group shepherd' || lower === 'group care' || lower === 'shepherd') return 'ຜູ້ດູແລກຸ່ມ';
  if (lower === 'finance' || lower === 'treasurer' || lower === 'finance / treasurer') return 'ການເງິນ';
  if (lower === 'media' || lower === 'media & it') return 'ສື່ ແລະ ໄອທີ';
  if (lower === 'pastor') return 'ສິດຍາພິບານ';
  return rawRole || '';
};

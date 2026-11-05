import { Language } from '../types';

export const formatSingleDate = (dateStr?: string, _lang: Language = 'lo'): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.trim().split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const formatDateRange = (
  startDate?: string,
  endDate?: string,
  lang: Language = 'lo'
): string => {
  if (!startDate) return '';
  const cleanStart = startDate.trim();
  const cleanEnd = endDate?.trim();

  const formattedStart = formatSingleDate(cleanStart, lang);
  if (!cleanEnd || cleanEnd === cleanStart) {
    return formattedStart;
  }

  const formattedEnd = formatSingleDate(cleanEnd, lang);
  return `${formattedStart} - ${formattedEnd}`;
};

export const formatVerbalDateRange = (
  startDate?: string,
  endDate?: string,
  lang: Language = 'lo'
): string => {
  if (!startDate) return '';
  const cleanStart = startDate.trim();
  const cleanEnd = endDate?.trim();

  try {
    const d1 = new Date(cleanStart);
    if (isNaN(d1.getTime())) return cleanStart;

    const monthNamesLo = [
      'ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ',
      'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'
    ];
    const monthNamesTh = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const monthNamesEn = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    if (!cleanEnd || cleanEnd === cleanStart) {
      if (lang === 'lo') return `ວັນທີ ${d1.getDate()} ${monthNamesLo[d1.getMonth()]} ${d1.getFullYear()}`;
      if (lang === 'th') return `วันที่ ${d1.getDate()} ${monthNamesTh[d1.getMonth()]} ${d1.getFullYear()}`;
      return `${monthNamesEn[d1.getMonth()]} ${d1.getDate()}, ${d1.getFullYear()}`;
    }

    const d2 = new Date(cleanEnd);
    if (isNaN(d2.getTime())) {
      return `${formatSingleDate(cleanStart, lang)} - ${cleanEnd}`;
    }

    // Same year and same month
    if (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()) {
      if (lang === 'lo') return `ວັນທີ ${d1.getDate()} ຫາ ${d2.getDate()} ${monthNamesLo[d1.getMonth()]} ${d1.getFullYear()}`;
      if (lang === 'th') return `วันที่ ${d1.getDate()} ถึง ${d2.getDate()} ${monthNamesTh[d1.getMonth()]} ${d1.getFullYear()}`;
      return `${monthNamesEn[d1.getMonth()]} ${d1.getDate()} - ${d2.getDate()}, ${d1.getFullYear()}`;
    }

    // Same year, different month
    if (d1.getFullYear() === d2.getFullYear()) {
      if (lang === 'lo') return `ວັນທີ ${d1.getDate()} ${monthNamesLo[d1.getMonth()]} ຫາ ${d2.getDate()} ${monthNamesLo[d2.getMonth()]} ${d1.getFullYear()}`;
      if (lang === 'th') return `วันที่ ${d1.getDate()} ${monthNamesTh[d1.getMonth()]} ถึง ${d2.getDate()} ${monthNamesTh[d2.getMonth()]} ${d1.getFullYear()}`;
      return `${monthNamesEn[d1.getMonth()]} ${d1.getDate()} - ${monthNamesEn[d2.getMonth()]} ${d2.getDate()}, ${d1.getFullYear()}`;
    }

    // Different year
    if (lang === 'lo') return `ວັນທີ ${d1.getDate()} ${monthNamesLo[d1.getMonth()]} ${d1.getFullYear()} ຫາ ${d2.getDate()} ${monthNamesLo[d2.getMonth()]} ${d2.getFullYear()}`;
    if (lang === 'th') return `วันที่ ${d1.getDate()} ${monthNamesTh[d1.getMonth()]} ${d1.getFullYear()} ถึง ${d2.getDate()} ${monthNamesTh[d2.getMonth()]} ${d2.getFullYear()}`;
    return `${monthNamesEn[d1.getMonth()]} ${d1.getDate()}, ${d1.getFullYear()} - ${monthNamesEn[d2.getMonth()]} ${d2.getDate()}, ${d2.getFullYear()}`;
  } catch {
    return `${formatSingleDate(cleanStart, lang)} - ${formatSingleDate(cleanEnd, lang)}`;
  }
};

import React from 'react';
import {
  Filter,
  RotateCcw,
  Calendar,
  MapPin,
  Building2,
  Church,
  AlertCircle,
  CalendarDays,
  BarChart2,
} from 'lucide-react';
import { Village, Language, HomePoster } from '../types';
import { getLocalizedDistrict, getLocalizedProvince, getLocalizedVillageName } from '../utils/localization';
import { handleImageErrorWithFirestore } from '../utils/imageFallback';

export type TimeRange = 'all' | 'week' | 'month' | 'year' | 'custom';

interface FilterPanelProps {
  villages: Village[];
  selectedProvince: string;
  setSelectedProvince: (p: string) => void;
  selectedDistrict: string;
  setSelectedDistrict: (d: string) => void;
  selectedChurch: string;
  setSelectedChurch: (c: string) => void;
  selectedStatus: string;
  setSelectedStatus: (s: string) => void;
  selectedTimeRange: TimeRange;
  setSelectedTimeRange: (t: TimeRange) => void;
  startDate?: string;
  setStartDate?: (d: string) => void;
  endDate?: string;
  setEndDate?: (d: string) => void;
  onResetFilters: () => void;
  language: Language;
  homePoster?: HomePoster;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  villages,
  selectedProvince,
  setSelectedProvince,
  selectedDistrict,
  setSelectedDistrict,
  selectedChurch,
  setSelectedChurch,
  selectedStatus,
  setSelectedStatus,
  selectedTimeRange,
  setSelectedTimeRange,
  startDate = '',
  setStartDate,
  endDate = '',
  setEndDate,
  onResetFilters,
  language,
  homePoster,
}) => {
  // Extract unique provinces
  const provinces: string[] = Array.from(
    new Set(villages.map((v) => v.province).filter((p): p is string => Boolean(p)))
  );

  // Extract unique districts based on selected province
  const filteredForDistricts =
    selectedProvince === 'all'
      ? villages
      : villages.filter((v) => v.province === selectedProvince);

  const districts: string[] = Array.from(
    new Set(filteredForDistricts.map((v) => v.district).filter((d): d is string => Boolean(d)))
  );

  // Extract unique village/church names based on selected province and district
  const filteredForChurches = filteredForDistricts.filter(
    (v) => selectedDistrict === 'all' || v.district === selectedDistrict
  );

  const churches: string[] = Array.from(
    new Set(filteredForChurches.map((v) => v.name).filter((n): n is string => Boolean(n)))
  );

  // Calculate active filter count
  const isFiltered =
    selectedProvince !== 'all' ||
    selectedDistrict !== 'all' ||
    selectedChurch !== 'all' ||
    selectedStatus !== 'all' ||
    selectedTimeRange !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate);

  const posterImageUrl =
    homePoster?.insightsImageUrl ||
    '/uploads/d1ff2c16-9f00-4563-a7e3-a34ec0649a7f_1788761811029_129.jpg';
  const posterHeightPercent =
    typeof homePoster?.insightsPosterHeight === 'number' ? homePoster.insightsPosterHeight : null;
  const posterOverlayOpacity =
    typeof homePoster?.insightsPosterOverlayOpacity === 'number'
      ? homePoster.insightsPosterOverlayOpacity
      : 85;
  const posterDim =
    typeof homePoster?.insightsPosterDim === 'number' ? homePoster.insightsPosterDim : 25;
  const posterScale =
    typeof homePoster?.insightsPosterScale === 'number' ? homePoster.insightsPosterScale : 100;
  const posterPosition = homePoster?.insightsPosterPosition || '50% 50%';
  const posterFit = homePoster?.insightsPosterFit || 'cover';
  const posterEdgeFade =
    typeof homePoster?.insightsPosterEdgeFade === 'number' ? homePoster.insightsPosterEdgeFade : 0;

  const displayTitle =
    language === 'lo'
      ? homePoster?.insightsTitle || 'ຂໍ້ມູນເຊີງເລິກ (Insights)'
      : language === 'th'
      ? homePoster?.insightsTitleTh || 'ข้อมูลเชิงลึก (Insights)'
      : homePoster?.insightsTitleEn || 'Insights';

  const displaySubtitle =
    language === 'lo'
      ? homePoster?.insightsSubtitle ||
        'ເບິ່ງສິ່ງທີ່ພຣະເຈົ້າຊົງກະທຳໃນແຂວງບໍ່ແກ້ວ ຜ່ານທາງລິດອຳນາດຂອງຂ່າວປະເສີດ.'
      : language === 'th'
      ? homePoster?.insightsSubtitleTh ||
        'ดูสิ่งที่พระเจ้าทรงกระทำในแขวงบ่อแก้ว ผ่านทางฤทธิ์อำนาจของข่าวประเสริฐ'
      : homePoster?.insightsSubtitleEn ||
        'See what God is doing in Bokeo Province through the power of the Gospel.';

  const displayVerse =
    language === 'lo'
      ? homePoster?.insightsVerse ||
        '“ຈົ່ງໂມທະນາຂອບພຣະຄຸນພຣະຢາເວ ເພາະພຣະອົງຊົງແສນດີ ຄວາມຮັກໝັ້ນຄົງຂອງພຣະອົງດຳລົງຢູ່ເປັນນິດ.”'
      : language === 'th'
      ? homePoster?.insightsVerseTh ||
        '“จงขอบพระคุณพระยาห์เวห์ เพราะพระองค์ประเสริฐ เพราะความรักมั่นคงของพระองค์ดำรงนิจนิรันดร์”'
      : homePoster?.insightsVerseEn ||
        '“Give thanks to the LORD, for he is good; his love endures forever.”';

  const displayVerseRef =
    language === 'lo'
      ? homePoster?.insightsVerseRef || '1 ຂ່າວຄາວ 16:34'
      : language === 'th'
      ? homePoster?.insightsVerseRefTh || '1 พงศาวดาร 16:34'
      : homePoster?.insightsVerseRefEn || '1 Chronicles 16:34';

  return (
    <div className="w-full bg-[#faf8f5] dark:bg-slate-950">
      {/* Insights Scenic Hero Banner with Curved Bottom Border matching Home & About Us */}
      {!homePoster?.hideInsightsPoster && (
        <div
          className="relative w-full overflow-hidden bg-slate-950 text-white flex items-center"
          style={{
            ...(posterHeightPercent !== null
              ? { minHeight: `${Math.round(110 + (posterHeightPercent / 100) * 160)}px` }
              : {}),
            ...(posterEdgeFade > 0
              ? {
                  WebkitMaskImage: `linear-gradient(to bottom, transparent 0px, black ${Math.round(
                    (posterEdgeFade / 100) * 60
                  )}px, black 100%)`,
                  maskImage: `linear-gradient(to bottom, transparent 0px, black ${Math.round(
                    (posterEdgeFade / 100) * 60
                  )}px, black 100%)`,
                }
              : {}),
          }}
        >
          <img
            src={posterImageUrl}
            alt="Insights Bokeo"
            className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300"
            style={{
              objectFit: posterFit,
              objectPosition: posterPosition,
              transformOrigin: posterPosition,
              transform: `scale(${posterScale / 100})`,
              filter: `brightness(${Math.max(20, 100 - posterDim * 0.75)}%)`,
            }}
            onError={handleImageErrorWithFirestore(
              'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1600'
            )}
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-slate-950/80 pointer-events-none"
            style={{ opacity: posterOverlayOpacity / 100 }}
          />

          <div className="relative z-10 w-full max-w-7xl mx-auto px-5 pt-7 pb-10 sm:px-8 sm:pt-9 sm:pb-12 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#4a1018]/90 border border-red-500/30 flex items-center justify-center text-white shrink-0 shadow-md">
                <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-none">
                  {displayTitle}
                </h1>
                <p className="text-xs sm:text-sm text-slate-200 max-w-md leading-relaxed">
                  {displaySubtitle}
                </p>
              </div>
            </div>

            <div className="md:max-w-xs border-l-2 border-amber-400 pl-4 py-0.5 space-y-1 text-white/95">
              <p className="text-xs sm:text-[13px] italic leading-relaxed text-slate-100">
                {displayVerse}
              </p>
              <p className="text-[11px] font-bold text-amber-300 text-right">{displayVerseRef}</p>
            </div>
          </div>

          {/* Subtle, restrained wave bottom edge matching reference screenshot */}
          <div className="absolute -bottom-px left-0 right-0 w-full overflow-hidden leading-none pointer-events-none z-20">
            <svg
              viewBox="0 0 1440 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative block w-full h-2.5 sm:h-3 md:h-3.5 text-[#faf8f5] dark:text-slate-950"
              preserveAspectRatio="none"
            >
              <path
                d="M 0,14 C 180,22 360,22 540,13 C 660,6 800,6 920,13 C 1080,22 1280,22 1440,14 L 1440,24 L 0,24 Z"
                fill="currentColor"
              />
              <path
                d="M 0,14 C 180,22 360,22 540,13 C 660,6 800,6 920,13 C 1080,22 1280,22 1440,14"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-3 space-y-3.5 transition-colors">
        {/* Header with Title & Reset Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#cc0000] dark:text-red-400 flex items-center justify-center font-bold shadow-2xs">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                {language === 'lo'
                  ? 'ຕົວກັ່ນຕອງຂໍ້ມູນ (Filter Data)'
                  : language === 'th'
                  ? 'ตัวกรองข้อมูล (Filter Data)'
                  : 'Filter Data'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {language === 'lo'
                  ? 'ເລືອກກັ່ນຕອງຕາມກອບເວລາ, ແຂວງ, ເມືອງ, ຄຣິດຕະຈັກ ຫຼື ສະຖານະ'
                  : language === 'th'
                  ? 'เลือกกรองตามช่วงเวลา แขวง อำเภอ คริสตจักร หรือสถานะ'
                  : 'Filter by time range, province, district, church, or persecution status'}
              </p>
            </div>
          </div>

          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="px-3 py-1.5 text-xs text-[#cc0000] dark:text-red-400 hover:text-white hover:bg-[#cc0000] dark:hover:bg-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              title={language === 'lo' ? 'ລ້າງຕົວກັ່ນຕອງທັງໝົດ' : 'Reset all filters'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">{language === 'lo' ? 'ລ້າງຄ່າຕົວກັ່ນຕອງ' : 'Reset Filters'}</span>
            </button>
          )}
        </div>

        {/* Main Filter Dropdowns: Clean responsive horizontal row with smooth scrolling if needed */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {/* 1. Time Range Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#cc0000]" />
              <span className="truncate">{language === 'lo' ? 'ກອບເວລາ (Period)' : 'Time Period'}</span>
            </label>
            <select
              value={selectedTimeRange}
              onChange={(e) => {
                const val = e.target.value as TimeRange;
                setSelectedTimeRange(val);
                if (val === 'custom' && setStartDate && setEndDate) {
                  const today = new Date().toISOString().split('T')[0];
                  if (!startDate) setStartDate(today);
                  if (!endDate) setEndDate(today);
                }
              }}
              className="w-full bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]/20 transition-all cursor-pointer h-9 shadow-xs"
            >
              <option value="all">🕒 {language === 'lo' ? 'ທຸກເວລາ (All)' : 'All Time'}</option>
              <option value="week">📅 {language === 'lo' ? 'ອາທິດນີ້' : 'This Week'}</option>
              <option value="month">📆 {language === 'lo' ? 'ເດືອນນີ້' : 'This Month'}</option>
              <option value="year">🗓️ {language === 'lo' ? 'ປີນີ້' : 'This Year'}</option>
              <option value="custom">📅 {language === 'lo' ? 'ກຳນົດເອງ' : 'Custom'}</option>
            </select>
          </div>

          {/* 2. Province Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#cc0000]" />
              <span className="truncate">{language === 'lo' ? 'ແຂວງ (Province)' : 'Province'}</span>
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setSelectedDistrict('all');
                setSelectedChurch('all');
              }}
              className="w-full bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]/20 transition-all cursor-pointer h-9 shadow-xs"
            >
              <option value="all">🌐 {language === 'lo' ? 'ທຸກແຂວງ (All)' : 'All Provinces'}</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {getLocalizedProvince(p, language)}
                </option>
              ))}
            </select>
          </div>

          {/* 3. District Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              <span className="truncate">{language === 'lo' ? 'ເມືອງ (District)' : 'District'}</span>
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedChurch('all');
              }}
              className="w-full bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]/20 transition-all cursor-pointer h-9 shadow-xs"
            >
              <option value="all">📍 {language === 'lo' ? 'ທຸກເມືອງ (All)' : 'All Districts'}</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {getLocalizedDistrict(d, language)}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Church / Village Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Church className="w-3.5 h-3.5 text-emerald-500" />
              <span className="truncate">{language === 'lo' ? 'ບ້ານ/ຄຣິດຕະຈັກ' : 'Church/Village'}</span>
            </label>
            <select
              value={selectedChurch}
              onChange={(e) => setSelectedChurch(e.target.value)}
              className="w-full bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]/20 transition-all cursor-pointer h-9 shadow-xs"
            >
              <option value="all">⛪ {language === 'lo' ? 'ທຸກບ້ານ/ຄຣິດຕະຈັກ' : 'All Churches'}</option>
              {churches.map((c) => {
                const matchVillage = villages.find((v) => v.name === c);
                const displayName = matchVillage ? getLocalizedVillageName(matchVillage, language) : c;
                return (
                  <option key={c} value={c}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 5. Persecution Status Filter */}
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
              <span className="truncate">{language === 'lo' ? 'ສະຖານະ (Status)' : 'Status'}</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]/20 transition-all cursor-pointer h-9 shadow-xs"
            >
              <option value="all">🚦 {language === 'lo' ? 'ທຸກສະຖານະ (All)' : 'All Statuses'}</option>
              <option value="ປົກກະຕິ">🟢 {language === 'lo' ? 'ປົກກະຕິ' : 'Normal'}</option>
              <option value="ປານກາງ">🟡 {language === 'lo' ? 'ປານກາງ' : 'Moderate'}</option>
              <option value="ວິກິດ">🔴 {language === 'lo' ? 'ວິກິດ' : 'Urgent'}</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Picker when selectedTimeRange === 'custom' */}
        {selectedTimeRange === 'custom' && setStartDate && setEndDate && (
          <div className="bg-red-50/70 dark:bg-red-950/30 p-3.5 rounded-xl flex flex-wrap items-center gap-3 transition-all duration-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#cc0000] dark:text-red-400">
              <CalendarDays className="w-4 h-4" />
              <span>{language === 'lo' ? 'ເລືອກວັນທີ:' : 'Select Dates:'}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]/20 shadow-xs"
              />
              <span className="text-xs text-slate-500 font-bold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]/20 shadow-xs"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


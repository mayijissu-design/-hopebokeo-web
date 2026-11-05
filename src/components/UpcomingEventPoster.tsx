import React from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  User,
  Maximize2,
} from 'lucide-react';
import { Language, HomePoster, UpcomingScheduleItem } from '../types';
import { handleImageErrorWithFirestore } from '../utils/imageFallback';

interface UpcomingEventPosterProps {
  language: Language;
  homePoster: HomePoster | null | undefined;
  onOpenFlyerModal?: (imageUrl: string) => void;
}

export const UpcomingEventPoster: React.FC<UpcomingEventPosterProps> = ({
  language,
  homePoster,
  onOpenFlyerModal,
}) => {
  if (!homePoster || homePoster.hideUpcomingEvent) return null;

  // Language prioritized strings
  const title =
    (language === 'en' && homePoster.upcomingEventTitleEn?.trim() ? homePoster.upcomingEventTitleEn.trim() : undefined) ||
    (language === 'th' && homePoster.upcomingEventTitleTh?.trim() ? homePoster.upcomingEventTitleTh.trim() : undefined) ||
    (homePoster.upcomingEventTitle?.trim() ? homePoster.upcomingEventTitle.trim() : undefined) ||
    (homePoster.upcomingEventTitleEn?.trim() ? homePoster.upcomingEventTitleEn.trim() : undefined) ||
    (homePoster.upcomingEventTitleTh?.trim() ? homePoster.upcomingEventTitleTh.trim() : undefined) ||
    '';

  const desc =
    (language === 'en' && homePoster.upcomingEventDescEn?.trim() ? homePoster.upcomingEventDescEn.trim() : undefined) ||
    (language === 'th' && homePoster.upcomingEventDescTh?.trim() ? homePoster.upcomingEventDescTh.trim() : undefined) ||
    (homePoster.upcomingEventDesc?.trim() ? homePoster.upcomingEventDesc.trim() : undefined) ||
    (homePoster.upcomingEventDescEn?.trim() ? homePoster.upcomingEventDescEn.trim() : undefined) ||
    (homePoster.upcomingEventDescTh?.trim() ? homePoster.upcomingEventDescTh.trim() : undefined) ||
    '';

  const date = homePoster.upcomingEventDate?.trim() || '';
  const imageUrl = homePoster.upcomingEventImageUrl?.trim() || '';

  const schedule: UpcomingScheduleItem[] = homePoster.upcomingSchedule || [];
  const scheduleHtml = homePoster.upcomingScheduleHtml?.trim() || '';

  // Background Dim / Darkness Settings
  const bgDim = typeof homePoster.upcomingBgDim === 'number' ? homePoster.upcomingBgDim : 60;
  const dimRatio = Math.max(0, Math.min(100, bgDim)) / 100;
  const imageOpacity = Math.max(0.2, 1 - dimRatio * 0.55);

  // Background Visibility / Fade to White (100 -> 0; at 0 it's completely invisible / pure white)
  const bgVisibility =
    typeof homePoster.upcomingBgVisibility === 'number'
      ? Math.max(0, Math.min(100, homePoster.upcomingBgVisibility))
      : 100;
  const visibilityRatio = bgVisibility / 100;
  const isLightBg = visibilityRatio < 0.5;
  const whiteOverlayOpacity = 1 - visibilityRatio;

  // Top & Bottom Edge Fade (ຄວາມຈາງຂອບເທິງ-ລຸ່ມ)
  const edgeFade = typeof homePoster.upcomingEdgeFade === 'number' ? homePoster.upcomingEdgeFade : 25;
  const edgeFadePct = Math.max(0, Math.min(50, edgeFade));

  // Height / Vertical Size (0 to 100 scale: 0 = minimum/ultra-compact height, 100 = full/spacious height)
  const rawHeight = typeof homePoster.upcomingHeight === 'number' ? homePoster.upcomingHeight : 0;
  // If stored as legacy pixel value (> 100), convert to 0-100 scale
  const heightScale = rawHeight > 100 ? Math.min(100, Math.round(rawHeight / 7.5)) : Math.max(0, Math.min(100, rawHeight));
  const heightRatio = heightScale / 100;

  // Dynamic vertical padding: scales compactly from 4px at 0% to 20px at 100%
  const paddingY = Math.round(4 + heightRatio * 16);
  // Dynamic content gap: scales compactly from 4px at 0% to 12px at 100%
  const contentGap = Math.round(4 + heightRatio * 8);
  // Dynamic table cell padding: scales compactly from 2px (compact) to 6px (comfortable)
  const cellPaddingY = Math.round(2 + heightRatio * 4);
  const cellPaddingX = Math.round(5 + heightRatio * 6);
  const cellFontSize = heightScale < 25 ? '0.78rem' : heightScale < 60 ? '0.82rem' : '0.88rem';
  const tableLineHeight = heightScale < 25 ? '1.2' : '1.3';

  // Title Size (ຂະໜາດຫົວຂໍ້ອີເວັນ: Default 28px ຫຼື ປ້ອນຕົວເລກຕາມ MS Word)
  const numericTitleSize = (() => {
    const s = homePoster.upcomingTitleSize;
    if (typeof s === 'number' && !isNaN(s) && s > 0) return s;
    if (typeof s === 'string') {
      const trimmed = s.trim().toLowerCase();
      if (trimmed === 'compact') return 20;
      if (trimmed === 'large') return 36;
      if (trimmed === 'event') return 28;
      const parsed = parseFloat(trimmed);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 28;
  })();

  // Table Background & Border Settings
  const tableBg = homePoster.upcomingTableBg || 'transparent';
  const tableCustomBg = homePoster.upcomingTableCustomBg || '#0f172a';
  const tableBorderWidth =
    typeof homePoster.upcomingTableBorderWidth === 'number' ? homePoster.upcomingTableBorderWidth : 0;
  const tableBorderColor =
    homePoster.upcomingTableBorderColor || (isLightBg ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)');

  // Table Width and Alignment
  const tableWidth =
    typeof homePoster.upcomingTableWidth === 'number'
      ? Math.max(30, Math.min(100, homePoster.upcomingTableWidth))
      : 100;
  const tableAlign = homePoster.upcomingTableAlign || 'center';
  const tableAlignClass =
    tableAlign === 'left' ? 'mr-auto' : tableAlign === 'right' ? 'ml-auto' : 'mx-auto';

  // Content Darkness / Opacity (0 to 100: 0 = ໂປ່ງໃສ 100%, 100 = ທຶບສຸດ 100%)
  const rawContentOpacity =
    typeof homePoster.upcomingContentBgOpacity === 'number'
      ? homePoster.upcomingContentBgOpacity
      : homePoster.upcomingTableBg === 'transparent'
      ? 0
      : homePoster.upcomingTableBg === 'glass'
      ? 45
      : homePoster.upcomingTableBg === 'dark'
      ? 80
      : homePoster.upcomingTableBg === 'paper'
      ? 95
      : 70;
  const contentOpacity = Math.max(0, Math.min(100, rawContentOpacity));
  const contentAlpha = contentOpacity / 100;

  const hexToRgba = (hex: string, alpha: number) => {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map((c) => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    if (isNaN(num) || cleanHex.length !== 6) {
      return `rgba(2, 6, 23, ${alpha})`;
    }
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  let resolvedTableBg = 'transparent';
  let resolvedTableTextColor = isLightBg ? '#0f172a' : '#ffffff';

  if (contentOpacity === 0) {
    resolvedTableBg = 'transparent';
  } else {
    let baseHex = '#020617';
    if (tableBg === 'paper') {
      baseHex = '#ffffff';
      resolvedTableTextColor = '#0f172a';
    } else if (tableBg === 'custom' && tableCustomBg) {
      baseHex = tableCustomBg;
    } else if (tableBg === 'glass') {
      baseHex = isLightBg ? '#ffffff' : '#020617';
    }
    resolvedTableBg = hexToRgba(baseHex, contentAlpha);
  }

  // If there is no title, date, image or description, do not render
  if (!title && !date && !imageUrl && !desc) return null;

  const defaultBg = '/uploads/upcoming_poster_1790760136318.jpg';
  const finalBgImage = imageUrl || defaultBg;

  // CSS mask for smooth top & bottom edge fade without visible borders
  const maskStyle: React.CSSProperties =
    edgeFadePct > 0
      ? {
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${edgeFadePct}%, black ${100 - edgeFadePct}%, transparent 100%)`,
          maskImage: `linear-gradient(to bottom, transparent 0%, black ${edgeFadePct}%, black ${100 - edgeFadePct}%, transparent 100%)`,
        }
      : {};

  return (
    <section
      id="upcoming-events-poster"
      className={`relative isolate w-full rounded-none overflow-hidden bg-transparent ${
        isLightBg ? 'text-slate-900' : 'text-white'
      } transition-all duration-200 select-none flex flex-col justify-center`}
      style={{
        minHeight: heightScale > 0 ? `${Math.round(110 + heightRatio * 200)}px` : undefined,
      }}
    >
      {/* 1. BACKGROUND LAYER WITH CONFIGURABLE IMAGE, DIM, TOP/BOTTOM EDGE FADE & FADE-TO-WEBSITE/TRANSPARENT (100 -> 0) */}
      <div
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none transition-colors duration-300"
        style={{
          ...maskStyle,
          backgroundColor:
            visibilityRatio === 0
              ? 'transparent'
              : undefined,
        }}
      >
        {/* Background gradient only shown when image visibility is active */}
        {visibilityRatio > 0 && (
          <div
            className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 transition-opacity duration-300"
            style={{ opacity: visibilityRatio }}
          />
        )}

        {/* Background image: completely hidden when visibilityRatio is 0 */}
        {visibilityRatio > 0 && finalBgImage && (
          <img
            src={finalBgImage}
            alt={title || 'Upcoming Event Poster'}
            decoding="async"
            className="w-full h-full object-cover object-center transition-all duration-500 ease-out"
            style={{
              opacity: (1 - dimRatio * 0.35) * visibilityRatio,
              imageRendering: 'auto',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
            }}
            onError={handleImageErrorWithFirestore(defaultBg)}
          />
        )}

        {/* Dynamic dark overlay depending on user's Dim setting */}
        {visibilityRatio > 0 && dimRatio > 0.05 && (
          <div
            className="absolute inset-0 bg-slate-950 transition-opacity duration-300 pointer-events-none"
            style={{ opacity: dimRatio * 0.7 * visibilityRatio }}
          />
        )}

        {/* Soft edge gradient to ensure smooth blending if text is present */}
        {visibilityRatio > 0 && (title || desc) && (
          <div
            className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20 transition-opacity duration-300 pointer-events-none"
            style={{ opacity: Math.min(0.85, dimRatio) * visibilityRatio }}
          />
        )}

        {/* Website background theme fade overlay (100 -> 0: at 0 it seamlessly blends with the website background #faf8f5 / transparent) */}
        {whiteOverlayOpacity > 0 && (
          <div
            className="absolute inset-0 bg-[#faf8f5] dark:bg-slate-950 transition-opacity duration-300 pointer-events-none"
            style={{ opacity: whiteOverlayOpacity }}
          />
        )}
      </div>

      {/* 2. POSTER CONTENT LAYER (Aligned with events container width - ບໍ່ມີກອບ ຫຼື ບ໋ອກ) */}
      <div
        className="relative z-10 w-full px-4 sm:px-6 md:px-8 flex flex-col transition-all duration-200"
        style={{
          paddingTop: `${paddingY}px`,
          paddingBottom: `${paddingY}px`,
          gap: `${contentGap}px`,
        }}
      >
        {/* Centerpiece: Clean Title & Description (No redundant badges or pill buttons) */}
        {(title || desc) && (
          <div className="space-y-1 sm:space-y-1.5 max-w-4xl">
            {/* Prestigious Event Title (Matches Event title size or custom Word font size) */}
            {title && (
              <h1
                style={{
                  fontSize: `clamp(14px, 4vw, ${numericTitleSize}px)`,
                  lineHeight: 1.2,
                }}
                className={`font-black ${
                  isLightBg ? 'text-slate-950' : 'text-white'
                } tracking-tight ${isLightBg ? '' : 'drop-shadow-md'}`}
              >
                {title}
              </h1>
            )}

            {/* Description (Contains date, venue, instructions, etc.) */}
            {desc && (
              <p
                className={`text-xs sm:text-base md:text-lg ${
                  isLightBg ? 'text-slate-700' : 'text-slate-200'
                } leading-snug font-normal whitespace-pre-line max-w-3xl ${isLightBg ? '' : 'drop-shadow-xs'}`}
              >
                {desc}
              </p>
            )}
          </div>
        )}

        {/* 3. EVENT TIMETABLE / WORD CONTENT (ບໍ່ມີກອບ ຫຼື ບ໋ອກ - ຕາຕະລາງລອຍເທິງພື້ນຫຼັງ) */}
        {(schedule.length > 0 || scheduleHtml) && (
          <div className="pt-0.5 w-full">
            {/* Dynamic CSS injection for table background, cell height & borders based on settings */}
            <style>{`
              #upcoming-events-poster .upcoming-table-view {
                ${contentOpacity > 0 ? `background-color: ${resolvedTableBg} !important;` : 'background-color: transparent !important;'}
                ${contentOpacity > 0 && contentOpacity < 98 ? 'backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);' : ''}
              }
              #upcoming-events-poster .upcoming-table-view table {
                width: 100% !important;
                border-collapse: collapse !important;
                ${contentOpacity > 0 ? `background-color: ${resolvedTableBg} !important;` : 'background-color: transparent !important;'}
                ${tableBorderWidth === 0 ? 'border: none !important;' : `border: ${tableBorderWidth}px solid ${tableBorderColor} !important;`}
              }
              #upcoming-events-poster .upcoming-table-view th,
              #upcoming-events-poster .upcoming-table-view td {
                padding: ${cellPaddingY}px ${cellPaddingX}px !important;
                font-size: ${cellFontSize} !important;
                line-height: ${tableLineHeight} !important;
                ${tableBorderWidth === 0 ? 'border: none !important;' : `border: ${tableBorderWidth}px solid ${tableBorderColor} !important;`}
                ${contentOpacity === 0 ? 'background-color: transparent !important;' : ''}
                ${resolvedTableTextColor !== 'inherit' ? `color: ${resolvedTableTextColor} !important;` : ''}
              }
              #upcoming-events-poster .upcoming-table-view tr {
                ${contentOpacity === 0 ? 'background-color: transparent !important;' : ''}
              }
              #upcoming-events-poster .upcoming-table-view .rich-word-content p {
                margin-top: 0.15rem !important;
                margin-bottom: 0.25rem !important;
                line-height: 1.35 !important;
              }
              #upcoming-events-poster .upcoming-table-view .rich-word-content h1,
              #upcoming-events-poster .upcoming-table-view .rich-word-content h2,
              #upcoming-events-poster .upcoming-table-view .rich-word-content h3,
              #upcoming-events-poster .upcoming-table-view .rich-word-content h4 {
                margin-top: 0.35rem !important;
                margin-bottom: 0.2rem !important;
                line-height: 1.25 !important;
              }
              #upcoming-events-poster .upcoming-table-view .rich-word-content ul,
              #upcoming-events-poster .upcoming-table-view .rich-word-content ol {
                margin-top: 0.2rem !important;
                margin-bottom: 0.25rem !important;
                padding-left: 1.25rem !important;
              }
              #upcoming-events-poster .upcoming-table-view .rich-word-content li {
                margin-top: 0.1rem !important;
                margin-bottom: 0.1rem !important;
              }
              #upcoming-events-poster .upcoming-table-view .rich-word-content table,
              #upcoming-events-poster .upcoming-table-view .rich-word-content td,
              #upcoming-events-poster .upcoming-table-view .rich-word-content th,
              #upcoming-events-poster .upcoming-table-view .rich-word-content tr {
                ${contentOpacity === 0 ? 'background-color: transparent !important;' : `background-color: ${resolvedTableBg} !important;`}
                padding: ${cellPaddingY}px ${cellPaddingX}px !important;
                font-size: ${cellFontSize} !important;
                line-height: ${tableLineHeight} !important;
              }
            `}</style>

            <div
              className={`upcoming-table-view overflow-x-auto ${tableAlignClass}`}
              style={{ width: `${tableWidth}%`, maxWidth: '100%' }}
            >
              {/* Word Doc Content */}
              {scheduleHtml && (
                <div
                  className={`rich-word-content text-sm sm:text-base leading-relaxed overflow-x-auto ${
                    isLightBg && contentOpacity === 0 ? 'text-slate-800' : ''
                  }`}
                  style={{
                    backgroundColor: contentOpacity > 0 ? resolvedTableBg : 'transparent',
                    color: resolvedTableTextColor !== 'inherit' ? resolvedTableTextColor : undefined,
                    padding: contentOpacity > 0 ? `${Math.max(4, cellPaddingY * 1.5)}px ${cellPaddingX}px` : '0',
                    borderRadius: '0px',
                  }}
                  dangerouslySetInnerHTML={{ __html: scheduleHtml }}
                />
              )}

              {/* Structured Timetable Rows (if no HTML content is provided) */}
              {schedule.length > 0 && !scheduleHtml && (
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr
                      style={{
                        backgroundColor:
                          tableBg === 'transparent'
                            ? isLightBg
                              ? 'rgba(0,0,0,0.04)'
                              : 'rgba(255,255,255,0.08)'
                            : undefined,
                      }}
                    >
                      <th
                        className={`px-3 py-1.5 sm:py-2 w-32 sm:w-40 font-black ${
                          isLightBg ? 'text-[#cc0000]' : 'text-amber-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {language === 'lo' ? 'ເວລາ' : 'Time'}
                        </span>
                      </th>
                      <th
                        className={`px-3 py-1.5 sm:py-2 min-w-[200px] font-black ${
                          isLightBg ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {language === 'lo' ? 'ກິດຈະກຳ / ລາຍການ' : 'Session / Activity'}
                      </th>
                      <th
                        className={`px-3 py-1.5 sm:py-2 min-w-[150px] font-black ${
                          isLightBg ? 'text-blue-700' : 'text-blue-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          {language === 'lo' ? 'ຜູ້ຮັບຜິດຊອບ' : 'Speaker / In-charge'}
                        </span>
                      </th>
                      <th
                        className={`px-3 py-1.5 sm:py-2 min-w-[150px] font-black ${
                          isLightBg ? 'text-rose-700' : 'text-rose-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {language === 'lo' ? 'ສະຖານທີ່ / ໝາຍເຫດ' : 'Location / Note'}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className={
                          tableBg === 'transparent'
                            ? isLightBg
                              ? 'hover:bg-black/5 transition'
                              : 'hover:bg-white/5 transition'
                            : ''
                        }
                      >
                        <td
                          className={`px-3 py-1.5 sm:py-2 font-mono font-bold whitespace-nowrap ${
                            isLightBg ? 'text-[#cc0000]' : 'text-amber-300'
                          }`}
                        >
                          {item.time}
                        </td>
                        <td
                          className={`px-3 py-1.5 sm:py-2 font-semibold ${
                            isLightBg ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {item.activity}
                        </td>
                        <td
                          className={`px-3 py-1.5 sm:py-2 font-medium ${
                            isLightBg ? 'text-slate-700' : 'text-slate-200'
                          }`}
                        >
                          {item.speaker || '-'}
                        </td>
                        <td
                          className={`px-3 py-1.5 sm:py-2 ${
                            isLightBg ? 'text-slate-600' : 'text-slate-200'
                          }`}
                        >
                          {item.location || item.note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subtle, restrained wave bottom edge matching reference screenshot */}
      {visibilityRatio > 0 && (
        <div className="absolute -bottom-px left-0 right-0 w-full overflow-hidden leading-none pointer-events-none z-20">
          <svg
            viewBox="0 0 1440 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative block w-full h-2.5 sm:h-3 text-[#faf8f5] dark:text-slate-950"
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
      )}
    </section>
  );
};

export default UpcomingEventPoster;

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Clock,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { MinistryTimelineItem, Language } from '../types';
import { handleImageErrorWithFirestore } from '../utils/imageFallback';

interface TimelineImageSlideshowProps {
  images: string[];
  title?: string;
  year?: string;
  language: Language;
}

const TimelineImageSlideshow: React.FC<TimelineImageSlideshowProps> = ({
  images,
  title,
  year,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) return null;

  return (
    <div className="w-full">
      <div className="relative w-full h-36 sm:h-40 md:h-44 bg-slate-100 dark:bg-slate-950 overflow-hidden select-none rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs group">
        {images.map((imgUrl, idx) => (
          <img
            key={imgUrl + idx}
            src={imgUrl}
            alt={`${title || year || 'Milestone photo'} ${idx + 1}`}
            className={`absolute inset-0 w-full h-full object-cover block transition-opacity duration-700 ease-in-out select-none ${
              idx === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
            }`}
            onError={handleImageErrorWithFirestore('/uploads/timeline_0_0_1790760136842.jpg')}
            referrerPolicy="no-referrer"
          />
        ))}

        {/* Subtle carousel dots if multiple photos */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-0.5 bg-black/50 backdrop-blur-xs rounded-full">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={`block h-1 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'w-3 bg-white' : 'w-1 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface MinistryTimelineProps {
  timeline: MinistryTimelineItem[];
  language: Language;
  title?: string;
  titleEn?: string;
  titleTh?: string;
  subtitle?: string;
}

export const MinistryTimeline: React.FC<MinistryTimelineProps> = ({
  timeline,
  language,
  title,
  titleEn,
  titleTh,
  subtitle,
}) => {
  // Filter out hidden items and sort by order
  const visibleTimeline = (timeline || []).filter((item) => !item.hidden);
  const sortedTimeline = [...visibleTimeline].sort((a, b) => (a.order || 0) - (b.order || 0));

  const normalizedTitleEn =
    titleEn === 'Ministry Journey & Timeline'
      ? 'A Journey of Faith and Faithful Service'
      : (titleEn || 'A Journey of Faith and Faithful Service');

  const displayTitle =
    language === 'en'
      ? normalizedTitleEn
      : language === 'th'
      ? (titleTh || title || 'การเดินทางแห่งความเชื่อและการรับใช้อย่างสัตย์ซื่อ')
      : (title || normalizedTitleEn || 'ການເດີນທາງແຫ່ງຄວາມເຊື່ອ ແລະ ການຮັບໃຊ້ອັນສັດຊື່');

  const defaultSubtitle =
    language === 'en'
      ? 'From a small beginning to a growing movement, God has been faithful through every season. Here are some key milestones in our journey.'
      : language === 'th'
      ? 'จากจุดเริ่มต้นเล็กๆ สู่การขับเคลื่อนที่เติบโต พระเจ้าทรงสัตย์ซื่อในทุกฤดูกาล นี่คือหมุดหมายสำคัญในการเดินทางของเรา'
      : 'ຈາກຈຸດເລີ່ມຕົ້ນເລັກນ້ອຍສູ່ການຂັບເຄື່ອນທີ່ເຕີບໂຕ, ພຣະເຈົ້າຊົງສັດຊື່ໃນທຸກລະດູການ. ນີ້ແມ່ນໝຸດໝາຍສຳຄັນໃນການເດີນທາງຂອງພວກເຮົາ.';

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isAutoShifting, setIsAutoShifting] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);

  // Check scroll boundary states
  const checkScrollState = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);

    const firstCard = el.querySelector<HTMLElement>('.timeline-card');
    const cardWidth = firstCard ? firstCard.offsetWidth + 20 : 360;
    const newIdx = Math.round(el.scrollLeft / cardWidth);
    setCurrentIndex(Math.min(Math.max(newIdx, 0), sortedTimeline.length - 1));
  };

  // Automatic horizontal shift (ຍັບອັດຕະໂນມັດ)
  useEffect(() => {
    if (!isAutoShifting || isHovered) return;
    const el = scrollContainerRef.current;
    if (!el) return;

    // Check if container overflows horizontally
    const isScrollable = el.scrollWidth > el.clientWidth + 10;
    if (!isScrollable) return;

    const interval = setInterval(() => {
      const target = scrollContainerRef.current;
      if (!target) return;

      const card = target.querySelector<HTMLElement>('.timeline-card');
      const shiftWidth = card ? card.offsetWidth + 20 : 380;
      const maxScroll = target.scrollWidth - target.clientWidth;

      if (target.scrollLeft >= maxScroll - 15) {
        // Rewind smoothly back to first story
        target.scrollTo({ left: 0, behavior: 'smooth' });
        setCurrentIndex(0);
      } else {
        target.scrollBy({ left: shiftWidth, behavior: 'smooth' });
        setCurrentIndex((prev) => (prev + 1) % sortedTimeline.length);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isAutoShifting, isHovered, sortedTimeline.length]);

  const handlePrev = () => {
    const target = scrollContainerRef.current;
    if (!target) return;
    const card = target.querySelector<HTMLElement>('.timeline-card');
    const shiftWidth = card ? card.offsetWidth + 20 : 380;
    target.scrollBy({ left: -shiftWidth, behavior: 'smooth' });
  };

  const handleNext = () => {
    const target = scrollContainerRef.current;
    if (!target) return;
    const card = target.querySelector<HTMLElement>('.timeline-card');
    const shiftWidth = card ? card.offsetWidth + 20 : 380;
    const maxScroll = target.scrollWidth - target.clientWidth;

    if (target.scrollLeft >= maxScroll - 15) {
      target.scrollTo({ left: 0, behavior: 'smooth' });
      setCurrentIndex(0);
    } else {
      target.scrollBy({ left: shiftWidth, behavior: 'smooth' });
    }
  };

  const handleJumpToIndex = (idx: number) => {
    const target = scrollContainerRef.current;
    if (!target) return;
    const cards = target.querySelectorAll<HTMLElement>('.timeline-card');
    if (cards[idx]) {
      cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      setCurrentIndex(idx);
    }
  };

  if (sortedTimeline.length === 0) {
    return null;
  }

  // Determine whether desktop layout should stretch 100% full width (4 cards or fewer)
  const isCompactStretch = sortedTimeline.length <= 4;

  return (
    <div className="space-y-5 sm:space-y-6 w-full">
      {/* Header with Kicker & Subtitle matching the human-designed mockup */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="text-[#ee1c25] text-xs sm:text-[13px] font-black tracking-wider uppercase flex items-center gap-3">
            <span>{language === 'lo' ? 'ເລື່ອງລາວຂອງພວກເຮົາ' : language === 'th' ? 'เรื่องราวของเรา' : 'OUR STORY'}</span>
            <span className="w-6 h-0.5 bg-[#ee1c25] rounded-full" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-[#0f172a] dark:text-white tracking-tight leading-tight">
            {displayTitle}
          </h2>
        </div>

        {/* Right side: Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:justify-end">
          <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 max-w-md font-medium leading-relaxed md:text-right">
            {subtitle || defaultSubtitle}
          </p>
        </div>
      </div>

      {/* Connected Milestone Track Layout (Full Width Left to Right) */}
      <div className="relative pt-2 pb-1 group/timeline">
        {/* Milestone Cards Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollState}
          className={`relative w-full overflow-x-auto scrollbar-none scroll-smooth pb-2 ${
            isCompactStretch
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch w-full'
              : 'flex gap-5 lg:gap-6 items-stretch w-full snap-x snap-mandatory'
          }`}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Continuous Red Line across top connecting milestone dots on desktop */}
          <div className="hidden lg:block absolute top-[7px] left-[7px] right-0 h-[2px] bg-[#ee1c25] z-0 pointer-events-none" />

          {sortedTimeline.map((item, idx) => {
            const itemTitle =
              language === 'en' && item.titleEn
                ? item.titleEn
                : language === 'th' && item.titleTh
                ? item.titleTh
                : item.title;

            const itemDesc =
              language === 'en' && item.descriptionEn
                ? item.descriptionEn
                : language === 'th' && item.descriptionTh
                ? item.descriptionTh
                : item.description;

            const defaultLocalPhotos: string[][] = [
              ['/uploads/timeline_0_0_1790760136842.jpg', '/uploads/timeline_0_1_1790760137172.jpg'],
              ['/uploads/timeline_1_0_1790760137428.jpg', '/uploads/timeline_1_1_1790760137837.jpg'],
              ['/uploads/timeline_2_0_1790760138092.jpg'],
              ['/uploads/timeline_3_0_1790760138340.jpg', '/uploads/timeline_3_1_1790760138587.jpg'],
            ];

            // Collect all images, replacing old unsplash seed placeholders with the local uploaded photos
            const allImages: string[] = [];
            const isLegacyUnsplash = (url: string) =>
              url.includes('images.unsplash.com/photo-1529156069898-49953e39b3ac') ||
              url.includes('images.unsplash.com/photo-1511632765486-a01980e01a18') ||
              url.includes('images.unsplash.com/photo-1488521787991-ed7bbaae773c') ||
              url.includes('images.unsplash.com/photo-1542601906990-b4d3fb778b09') ||
              url.includes('images.unsplash.com/photo-1469571486292-0ba58a3f068b');

            if (item.imageUrl && item.imageUrl.trim() && !isLegacyUnsplash(item.imageUrl.trim())) {
              allImages.push(item.imageUrl.trim());
            }
            if (Array.isArray(item.imageUrls)) {
              item.imageUrls.forEach((url) => {
                if (url && url.trim() && !isLegacyUnsplash(url.trim()) && !allImages.includes(url.trim())) {
                  allImages.push(url.trim());
                }
              });
            }

            // Use authentic local uploaded photos if none specified or if using legacy unsplash seed URLs
            if (allImages.length === 0) {
              const fallbackSet = defaultLocalPhotos[idx] || defaultLocalPhotos[3];
              allImages.push(...fallbackSet);
            }

            return (
              <div
                key={item.id || idx}
                className={`timeline-card relative flex flex-col justify-between group ${
                  isCompactStretch
                    ? 'w-full min-w-0'
                    : 'w-[86vw] sm:w-[320px] md:w-[350px] lg:w-[380px] shrink-0 snap-start'
                }`}
              >
                {/* Top Horizontal Red Connector for mobile/tablet */}
                <div className="lg:hidden absolute top-[7px] left-[7px] right-0 h-[2px] bg-[#ee1c25] z-0 pointer-events-none" />

                {/* Milestone Solid Red Dot on Top Line */}
                <div className="relative z-10 flex items-center">
                  <div className="w-4 h-4 rounded-full bg-[#ee1c25] ring-4 ring-white dark:ring-slate-900 shadow-xs shrink-0" />
                </div>

                {/* Content Area with Left Red Accent Line aligned to center of the 16px dot (ml-[7px]) */}
                <div className="flex-1 flex flex-col justify-between pt-1">
                  <div className="ml-[7px] border-l-2 border-[#ee1c25]/85 pl-3.5 pt-2 pb-1 flex-1">
                    {/* Year badge in bold red digits */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg sm:text-xl font-black text-[#ee1c25] dark:text-red-400 tracking-tight leading-none">
                        {item.year || ''}
                      </span>
                    </div>

                    {/* Milestone Title */}
                    {itemTitle && (
                      <h3 className="text-xs sm:text-[13.5px] font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                        {itemTitle}
                      </h3>
                    )}

                    {/* Milestone Description */}
                    {itemDesc && (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                        {itemDesc}
                      </p>
                    )}
                  </div>

                  {/* Photo Slideshow at Bottom of Card */}
                  <div className="pt-3 mt-auto">
                    <TimelineImageSlideshow
                      images={allImages}
                      title={itemTitle}
                      year={item.year}
                      language={language}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

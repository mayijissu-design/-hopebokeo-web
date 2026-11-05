import React, { useState } from "react";
import {
  Users,
  Heart,
  Target,
  Eye,
  Settings,
  Mail,
  Phone,
  MessageCircle,
  CreditCard,
  QrCode,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  Globe,
  Moon,
  Sun,
  ChevronDown,
} from "lucide-react";
import { TeamMember, DonationInfo, HomePoster, Language } from "../types";
import { MinistryTimeline } from "./MinistryTimeline";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { HbLogo } from "./HbLogo";
import { DEFAULT_BOKEO_TIMELINE } from "../data/timelineDefaults";
import { handleImageErrorWithFirestore } from "../utils/imageFallback";

export interface AboutTabProps {
  teams: TeamMember[];
  donationInfo?: DonationInfo | null;
  homePoster?: HomePoster | null;
  language: Language;
  setLanguage?: (lang: Language) => void;
  darkMode?: boolean;
  setDarkMode?: (dark: boolean) => void;
  onOpenSettings?: () => void;
}

export const AboutTab: React.FC<AboutTabProps> = ({
  teams,
  donationInfo,
  homePoster,
  language,
  setLanguage,
  darkMode = false,
  setDarkMode,
  onOpenSettings,
}) => {
  const [selectedAccountIdx, setSelectedAccountIdx] = useState<number>(0);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const [showAllTeam, setShowAllTeam] = useState<boolean>(false);

  const bokeoPosterHeight =
    typeof homePoster?.bokeoPosterHeight === "number" ? homePoster.bokeoPosterHeight : 50;
  const bokeoPosterOverlayOpacity =
    typeof homePoster?.bokeoPosterOverlayOpacity === "number"
      ? homePoster.bokeoPosterOverlayOpacity
      : 75;
  const bokeoPosterEdgeFade =
    typeof homePoster?.bokeoPosterEdgeFade === "number" ? homePoster.bokeoPosterEdgeFade : 0;
  const bokeoPosterDim =
    typeof homePoster?.bokeoPosterDim === "number" ? homePoster.bokeoPosterDim : 0;
  const bokeoPosterScale =
    typeof homePoster?.bokeoPosterScale === "number" ? homePoster.bokeoPosterScale : 100;
  const bokeoPosterPosition = homePoster?.bokeoPosterPosition || "50% 50%";
  const bokeoPosterFit = homePoster?.bokeoPosterFit || "cover";

  const defaultAboutHeroImage =
    "/uploads/d1ff2c16-9f00-4563-a7e3-a34ec0649a7f_1788761811029_129.jpg";

  const heroBannerImage =
    homePoster?.aboutHeroImageUrl && homePoster.aboutHeroImageUrl.trim() !== ""
      ? homePoster.aboutHeroImageUrl
      : defaultAboutHeroImage;

  const defaultWhoWeAreLocalImage =
    "/uploads/416848893_1441279663411460_5205317115984311446_n__1__jpg_1788632235891_514.jpg";

  const whoWeAreImage =
    homePoster?.bokeoImageUrl &&
    homePoster.bokeoImageUrl.trim() !== "" &&
    !homePoster.bokeoImageUrl.includes("photo-1542601906990-b4d3fb778b09")
      ? homePoster.bokeoImageUrl
      : defaultWhoWeAreLocalImage;

  const whoWeArePosition = homePoster?.aboutWhoWeArePosition || "50% 50%";
  const whoWeAreScale =
    typeof homePoster?.aboutWhoWeAreScale === "number" ? homePoster.aboutWhoWeAreScale : 100;
  const whoWeAreFit = homePoster?.aboutWhoWeAreFit || "cover";

  const posterHeroBadge =
    language === "lo"
      ? homePoster?.aboutHeroBadge || "ກ່ຽວກັບພວກເຮົາ"
      : language === "th"
      ? homePoster?.aboutHeroBadgeTh || homePoster?.aboutHeroBadge || "เกี่ยวกับเรา"
      : homePoster?.aboutHeroBadgeEn || "ABOUT US";

  const posterBannerTitle =
    language === "lo"
      ? homePoster?.bokeoTitle || "HOPE BOKEO"
      : language === "th"
      ? homePoster?.bokeoTitleTh || homePoster?.bokeoTitle || "HOPE BOKEO"
      : homePoster?.bokeoTitleEn || "HOPE BOKEO";

  const posterHeroVerse =
    language === "lo"
      ? homePoster?.aboutHeroVerse ||
        "“ຈົ່ງໃຫ້ຄວາມສະຫວ່າງຂອງພວກເຈົ້າສ່ອງແຈ້ງຕໍ່ໜ້າຄົນທັງປວງ ເພື່ອເຂົາຈະໄດ້ເຫັນການດີຂອງພວກເຈົ້າ ແລະ ສັນລະເສີນພຣະບິດາຂອງພວກເຈົ້າຜູ້ຊົງສະຖິດຢູ່ໃນສະຫວັນ.”"
      : language === "th"
      ? homePoster?.aboutHeroVerseTh ||
        "“พวกท่านจงส่องสว่างแก่คนทั้งปวง เพื่อว่าเมื่อเขาทั้งหลายได้เห็นความดีที่ท่านทำ พวกเขาจะได้สรรเสริญพระบิดาของท่านผู้สถิตในสวรรค์”"
      : homePoster?.aboutHeroVerseEn ||
        "“Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.”";

  const posterHeroVerseRef =
    language === "lo"
      ? homePoster?.aboutHeroVerseRef || "ມັດທາຍ 5:16"
      : language === "th"
      ? homePoster?.aboutHeroVerseRefTh || "มัทธิว 5:16"
      : homePoster?.aboutHeroVerseRefEn || "Matthew 5:16";

  const whoWeAreBadge =
    language === "lo"
      ? homePoster?.aboutWhoWeAreBadge || "ພວກເຮົາແມ່ນໃຜ"
      : language === "th"
      ? homePoster?.aboutWhoWeAreBadgeTh || "พวกเราคือใคร"
      : homePoster?.aboutWhoWeAreBadgeEn || "WHO WE ARE";

  const customWhoWeAreTitle =
    language === "lo"
      ? homePoster?.aboutWhoWeAreTitle
      : language === "th"
      ? homePoster?.aboutWhoWeAreTitleTh
      : homePoster?.aboutWhoWeAreTitleEn;

  const rawWhoWeAreDesc =
    language === "lo"
      ? homePoster?.bokeoDesc
      : language === "th"
      ? homePoster?.bokeoDescTh || homePoster?.bokeoDesc
      : homePoster?.bokeoDescEn;

  // If the stored HTML is the initial auto-seeded paste with data-path-to-node and a long <ul> list,
  // extract the lead paragraph so the card matches image_f9103855.png; if the admin edits it in RichTextEditor, render their full HTML.
  const customWhoWeAreDesc = React.useMemo(() => {
    if (!rawWhoWeAreDesc || rawWhoWeAreDesc.trim() === "") return "";
    if (rawWhoWeAreDesc.includes("data-path-to-node") && rawWhoWeAreDesc.includes("<ul")) {
      const firstParaMatch = rawWhoWeAreDesc.match(/<p[^>]*>[\s\S]*?<\/p>/i);
      if (firstParaMatch) return firstParaMatch[0];
    }
    return rawWhoWeAreDesc;
  }, [rawWhoWeAreDesc]);

  const visionText =
    language === "lo"
      ? homePoster?.vision ||
        donationInfo?.vision ||
        "ສ້າງສາວົກ ແລະ ຂະຫຍາຍແຜ່ນດິນຂອງພຣະເຈົ້າໃຫ້ຄວບຄຸມທຸກພື້ນທີ່ໃນແຂວງບໍ່ແກ້ວ.\n\nພວກເຮົາປາຖະໜາທີ່ຈະເຫັນທຸກໝູ່ບ້ານໄດ້ຍິນຂ່າວປະເສີດ ແລະ ມີຄຣິດຕະຈັກທີ່ເຂັ້ມແຂງຕັ້ງຢູ່ ເພື່ອເປັນຄວາມສະຫວ່າງໃຫ້ແກ່ຊຸມຊົນ."
      : language === "th"
      ? homePoster?.visionTh ||
        donationInfo?.visionTh ||
        "สร้างสาวกและขยายแผ่นดินของพระเจ้าให้ครอบคลุมทุกพื้นที่ในแขวงบ่อแก้ว\n\nเราปรารถนาที่จะเห็นทุกหมู่บ้านได้ยินข่าวประเสริฐและมีคริสตจักรที่เข้มแข็งตั้งอยู่ เพื่อเป็นความสว่างให้แก่ชุมชน"
      : homePoster?.visionEn ||
        donationInfo?.visionEn ||
        "Disciple nations and expand the Kingdom of God across every district in Bokeo Province.\n\nWe desire to see every village hear the Gospel and establish vibrant local fellowships that serve as light to their communities.";

  const missionText =
    language === "lo"
      ? homePoster?.mission ||
        donationInfo?.mission ||
        "ປະກາດຂ່າວປະເສີດຢ່າງກ້າຫານໃນທຸກໆບ້ານ.\nຝຶກອົບຮົມ ແລະ ສ້າງຜູ້ນຳທ້ອງຖິ່ນໃຫ້ເຂັ້ມແຂງ.\nຊ່ວຍເຫຼືອສັງຄົມ ແລະ ຜູ້ທີ່ຖືກຂົ່ມເຫັງທຸກຍາກ.\nອະທິຖານວິງວອນ ແລະ ຕິດຕາມຜົນຢ່າງໃກ້ຊິດ."
      : language === "th"
      ? homePoster?.missionTh ||
        donationInfo?.missionTh ||
        "ประกาศข่าวประเสริฐอย่างกล้าหาญในทุกหมู่บ้าน\nฝึกอบรมและสร้างผู้นำฝ่ายวิญญาณในท้องถิ่น\nช่วยเหลือด้านมนุษยธรรมและบรรเทาทุกข์แก่ผู้ยากไร้\nอธิษฐานวิงวอนอย่างต่อเนื่องและติดตามผลพันธกิจอย่างสัตย์ซื่อ"
      : homePoster?.missionEn ||
        donationInfo?.missionEn ||
        "Proclaim the Gospel boldly in every village.\nTrain and equip local spiritual leaders.\nProvide humanitarian care and relief to the needy.\nIntercede continuously and faithfully track ministry fruit.";

  const visionParagraphs = visionText
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const missionItems = missionText
    .split(/\n/)
    .map((m) => m.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter(Boolean);

  const timelineItems = React.useMemo(() => {
    const raw =
      homePoster?.bokeoTimeline && homePoster.bokeoTimeline.length > 0
        ? [...homePoster.bokeoTimeline]
        : [...DEFAULT_BOKEO_TIMELINE];
    // If stored timeline had the legacy 3-item seed without the 3rd milestone (timeline_2_0), restore all 4 default milestones
    if (
      raw.length === 3 &&
      !raw.some((item) => item.id === "timeline-2022" || (item.imageUrl && item.imageUrl.includes("timeline_2_0")))
    ) {
      return [
        raw[0] || DEFAULT_BOKEO_TIMELINE[0],
        raw[1] || DEFAULT_BOKEO_TIMELINE[1],
        DEFAULT_BOKEO_TIMELINE[2],
        { ...(raw[2] || DEFAULT_BOKEO_TIMELINE[3]), order: 4 },
      ];
    }
    return raw;
  }, [homePoster?.bokeoTimeline]);

  const visibleTeams = (teams || []).filter((m) => !m.hidden);
  const displayedTeams = showAllTeam ? visibleTeams : visibleTeams.slice(0, 3);

  const bankAccounts =
    donationInfo?.bankAccounts && donationInfo.bankAccounts.length > 0
      ? donationInfo.bankAccounts.filter((a) => !a.hidden)
      : [
          {
            bankName: donationInfo?.bankName || "BCEL Bank",
            accountName: donationInfo?.accountName || "Hope Bokeo Ministry",
            accountNumber: donationInfo?.accountNumber || "160-12-00-01234567-001",
            qrImageUrl: donationInfo?.qrImageUrl || "",
            donationLink: donationInfo?.donationLink || "",
          },
        ];

  const currentAccount = bankAccounts[selectedAccountIdx] || bankAccounts[0];

  const handleCopyAccount = (num: string) => {
    if (!num) return;
    navigator.clipboard?.writeText(num).catch(() => {});
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const prayerPhone =
    donationInfo?.prayerContactPhone &&
    donationInfo.prayerContactPhone.trim() !== "" &&
    donationInfo.prayerContactPhone !== "+856 20 55512345"
      ? donationInfo.prayerContactPhone
      : donationInfo?.prayerContactWhatsapp || "+856 20 76838584";
  const prayerWhatsapp = donationInfo?.prayerContactWhatsapp || "+856 20 76838584";
  const prayerEmail = donationInfo?.prayerContactEmail || "info@hopebokeo.org";

  return (
    <div className="w-full bg-[#faf8f5] dark:bg-slate-950">
      {/* ========================================================================= */}
      {/* 1. TOP FULL-BLEED SCENIC HERO BANNER (ABOUT US / HOPE BOKEO / MATTHEW 5:16) */}
      {/* ========================================================================= */}
      {!homePoster?.hideBokeoSection && !homePoster?.hideAboutHeroPoster && (
        <section
          className="relative w-full overflow-hidden bg-slate-950 flex items-center transition-all"
          style={{
            minHeight: `${Math.round(230 + (bokeoPosterHeight / 100) * 130)}px`,
            ...(bokeoPosterEdgeFade > 0
              ? {
                  WebkitMaskImage: `linear-gradient(to bottom, transparent 0px, black ${Math.round(
                    (bokeoPosterEdgeFade / 100) * 60
                  )}px, black 100%)`,
                  maskImage: `linear-gradient(to bottom, transparent 0px, black ${Math.round(
                    (bokeoPosterEdgeFade / 100) * 60
                  )}px, black 100%)`,
                }
              : {}),
          }}
        >
          <img
            src={heroBannerImage}
            alt={posterBannerTitle}
            className="absolute inset-0 w-full h-full pointer-events-none select-none transition-all"
            style={{
              objectFit: bokeoPosterFit,
              objectPosition: bokeoPosterPosition,
              transformOrigin: bokeoPosterPosition,
              transform: `scale(${bokeoPosterScale / 100})`,
              filter: `brightness(${Math.max(20, 100 - bokeoPosterDim * 0.75)}%)`,
            }}
            onError={handleImageErrorWithFirestore(
              "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1600"
            )}
            referrerPolicy="no-referrer"
          />

          <div
            className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-slate-950/75 pointer-events-none"
            style={{ opacity: Math.max(0.2, bokeoPosterOverlayOpacity / 100) }}
          />

          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-10">
            {/* Left Hero Column */}
            <div className="space-y-2.5 max-w-xl">
              <div>
                <span className="inline-block text-white font-black text-xs sm:text-sm uppercase tracking-wider border-b-2 border-[#ee1c25] pb-1">
                  {posterHeroBadge}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-black text-white drop-shadow-md tracking-tight leading-none uppercase pt-0.5">
                {posterBannerTitle}
              </h1>
            </div>

            {/* Right Scripture Quote Box */}
            <div className="lg:max-w-xs border-l-[3px] border-amber-400 pl-4 py-1 space-y-1.5 text-white drop-shadow-sm">
              <p className="text-xs sm:text-[13px] leading-relaxed text-white/95 font-medium">
                {posterHeroVerse}
              </p>
              <p className="text-xs font-bold text-white text-right">
                {posterHeroVerseRef}
              </p>
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
        </section>
      )}

      {/* ========================================================================= */}
      {/* MAIN CENTERED CONTENT CONTAINER (Open Website Layout — No Box Borders)    */}
      {/* ========================================================================= */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10 sm:space-y-14">
        {/* 2. WHO WE ARE — A Local Community, A Global Purpose */}
        {!homePoster?.hideBokeoSection && (
          <section
            id="who-we-are-section"
            className="relative scroll-mt-20"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Left Content Column */}
              <div className="lg:col-span-6 space-y-4 sm:space-y-5">
                <div className="flex items-center gap-3">
                  <span className="text-[#ee1c25] font-black text-xs sm:text-[13px] uppercase tracking-wider">
                    {whoWeAreBadge}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-black text-[#0f172a] dark:text-white tracking-tight leading-[1.15]">
                  {customWhoWeAreTitle && customWhoWeAreTitle.trim() !== "" ? (
                    customWhoWeAreTitle
                  ) : language === "lo" ? (
                    "ຊຸມຊົນທ້ອງຖິ່ນ, ພາລະກິດລະດັບໂລກ"
                  ) : language === "th" ? (
                    "ชุมชนท้องถิ่น พันธกิจระดับโลก"
                  ) : (
                    <>
                      A Local Community,
                      <br />A Global Purpose
                    </>
                  )}
                </h2>

                {customWhoWeAreDesc && customWhoWeAreDesc.trim() !== "" ? (
                  <div
                    className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2.5 [&_p]:mb-2 [&_strong]:font-black [&_strong]:text-slate-800 dark:[&_strong]:text-white [&_b]:font-black [&_b]:text-slate-800 dark:[&_b]:text-white"
                    dangerouslySetInnerHTML={{ __html: customWhoWeAreDesc }}
                  />
                ) : (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong className="font-black text-slate-800 dark:text-white">HOPE BOKEO</strong>{" "}
                    {language === "lo"
                      ? "ແມ່ນຄອບຄົວຂອງຜູ້ເຊື່ອ ແລະ ຜູ້ຮັບໃຊ້ທ້ອງຖິ່ນທີ່ຮ່ວມເປັນໜຶ່ງດຽວກັນດ້ວຍການຊົງເອີ້ນທີ່ລຽບງ່າຍແຕ່ເລິກເຊິ່ງ: ເພື່ອດຳເນີນຊີວິດຕາມພຣະບັນຍັດໃຫຍ່ ແລະ ຕອບສະໜອງຕໍ່ພຣະມະຫາບັນຊາທົ່ວແຂວງບໍ່ແກ້ວ. ພວກເຮົາແມ່ນກຸ່ມຜູ້ຮັບໃຊ້ ແລະ ຊຸມຊົນທີ່ອຸທິດຕົນເພື່ອສະແດງຄວາມຮັກຂອງພຣະອົງສູ່ຊຸມຊົນຕ່າງໆ ໂດຍເລີ່ມຕົ້ນຈາກຊຸມຊົນຂອງພວກເຮົາເອງ."
                      : language === "th"
                      ? "คือครอบครัวของผู้เชื่อและผู้รับใช้ท้องถิ่นที่รวมเป็นหนึ่งเดียวกันด้วยการทรงเรียกที่เรียบง่ายแต่ลึกซึ้ง เพื่อดำเนินชีวิตตามพระบัญญัติใหญ่และตอบสนองต่อพระมหาบัญชาทั่วแขวงบ่อแก้ว เราเป็นกลุ่มผู้รับใช้และชุมชนที่อุทิศตนเพื่อสำแดงความรักของพระองค์สู่ชุมชนต่างๆ โดยเริ่มต้นจากชุมชนของเราเอง"
                      : "is a family of local believers and servants united by a simple yet profound calling: to live out the Great Commandment and respond to the Great Commission throughout Bokeo Province. We are a group of servants, a community dedicated to displaying His love to various communities, starting with our own."}
                  </p>
                )}

                {/* Two Highlight Feature Items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/60 text-[#ee1c25] flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {language === "lo"
                          ? "ຄົນທ້ອງຖິ່ນ"
                          : language === "th"
                          ? "คนท้องถิ่น"
                          : "Local People"}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {language === "lo"
                          ? "ຮ່ວມມືກັນເປັນກາຍດຽວ"
                          : language === "th"
                          ? "ทำงานร่วมกันเป็นกายเดียว"
                          : "Working together as one body"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/60 text-[#ee1c25] flex items-center justify-center shrink-0">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {language === "lo"
                          ? "ການປ່ຽນແປງທີ່ຍືນຍົງ"
                          : language === "th"
                          ? "การเปลี่ยนแปลงที่ยั่งยืน"
                          : "Lasting Change"}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {language === "lo"
                          ? "ຊຸມຊົນທີ່ຖືກປ່ຽນແປງດ້ວຍຂ່າວປະເສີດ"
                          : language === "th"
                          ? "ชุมชนที่เปลี่ยนแปลงด้วยข่าวประเสริฐ"
                          : "Communities transformed by the Gospel"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Image Column (Who We Are Photo) */}
              <div className="lg:col-span-6">
                <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden shadow-md bg-slate-100 dark:bg-slate-800">
                  <img
                    src={whoWeAreImage}
                    alt="Hope Bokeo Community"
                    className="w-full h-full transition-all"
                    style={{
                      objectFit: whoWeAreFit,
                      objectPosition: whoWeArePosition,
                      transformOrigin: whoWeArePosition,
                      transform: `scale(${whoWeAreScale / 100})`,
                    }}
                    onError={handleImageErrorWithFirestore(
                      "/uploads/c084c02a-adf5-4498-ace3-aac9a4626ad2_jpg_1788505827641_344.jpg"
                    )}
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. OUR STORY — A Journey of Faith and Faithful Service */}
        {timelineItems.some((item) => !item.hidden) && !homePoster?.hideBokeoTimeline && (
          <section className="w-full">
            <MinistryTimeline
              timeline={timelineItems}
              title={homePoster?.bokeoTimelineTitle}
              titleEn={homePoster?.bokeoTimelineTitleEn}
              titleTh={homePoster?.bokeoTimelineTitleTh}
              language={language}
            />
          </section>
        )}

        {/* 4. Our Vision & Our Mission Cards */}
        {!homePoster?.hideVisionMission && !donationInfo?.hideVisionMission && (
          <section className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
              {/* Our Vision Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#fff5f5] via-[#fff0ed] to-[#fde5df] dark:from-red-950/40 dark:via-slate-900 dark:to-rose-950/40 p-6 sm:p-8 shadow-xs flex items-start gap-4 sm:gap-5">
                <svg
                  viewBox="0 0 200 180"
                  className="absolute right-0 bottom-0 w-44 sm:w-52 h-auto text-red-900/[0.06] dark:text-red-400/[0.06] pointer-events-none select-none"
                  fill="currentColor"
                >
                  <path d="M135 20 V55 L165 38 L135 20 Z" />
                  <rect x="132" y="18" width="4" height="50" />
                  <polygon points="60,180 134,62 195,180" />
                  <polygon points="10,180 75,95 135,180" opacity="0.7" />
                </svg>

                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-100/80 dark:bg-red-900/40 flex items-center justify-center shrink-0 text-[#ee1c25] dark:text-red-400">
                  <Eye className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>

                <div className="relative z-10 flex-1 space-y-3">
                  <h3 className="text-xl sm:text-2xl font-black text-[#ee1c25] dark:text-red-400 tracking-tight">
                    {language === "lo"
                      ? "ວິໄສທັດຂອງພວກເຮົາ"
                      : language === "th"
                      ? "วิสัยทัศน์ของเรา"
                      : "Our Vision"}
                  </h3>

                  <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {visionParagraphs.map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Our Mission Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f2f8ff] via-[#ecf4ff] to-[#dfeaff] dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/40 p-6 sm:p-8 shadow-xs flex items-start gap-4 sm:gap-5">
                <svg
                  viewBox="0 0 200 180"
                  className="absolute right-0 bottom-0 w-44 sm:w-52 h-auto text-blue-900/[0.06] dark:text-blue-400/[0.06] pointer-events-none select-none"
                  fill="currentColor"
                >
                  <path d="M100 45 C75 35 45 40 20 55 L20 155 C45 140 75 135 100 145 C125 135 155 140 180 155 L180 55 C155 40 125 35 100 45 Z" />
                </svg>

                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white dark:bg-blue-900/40 shadow-2xs flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                  <Target className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>

                <div className="relative z-10 flex-1 space-y-3">
                  <h3 className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                    {language === "lo"
                      ? "ພັນທະກິດຂອງພວກເຮົາ"
                      : language === "th"
                      ? "พันธกิจของเรา"
                      : "Our Mission"}
                  </h3>

                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium">
                    {missionItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 fill-blue-600 dark:fill-blue-500 stroke-white dark:stroke-slate-950" />
                        <span className="leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 5. PRAYER PARTNERSHIP & HOTLINE */}
        {!donationInfo?.hidePrayerLine && (
          <section className="w-full space-y-4">
            <div>
              <h3 className="font-black text-xs sm:text-[13px] uppercase tracking-wider text-slate-900 dark:text-white">
                {language === "lo"
                  ? "ສາຍດ່ວນອະທິຖານ ແລະ ການພົວພັນຮ່ວມພັນທະກິດ"
                  : language === "th"
                  ? "สายด่วนอธิษฐานและการประสานงานพันธกิจ"
                  : "PRAYER PARTNERSHIP & HOTLINE"}
              </h3>
              <div className="w-8 h-0.5 bg-[#ee1c25] rounded-full mt-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Prayer Phone Line */}
              <a
                href={`tel:${prayerPhone.replace(/\s+/g, "")}`}
                className="p-4 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 shadow-xs hover:shadow-md flex items-center gap-3.5 transition group"
              >
                <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {language === "lo"
                      ? "ສາຍດ່ວນອະທິຖານ"
                      : language === "th"
                      ? "สายด่วนอธิษฐาน"
                      : "Prayer Phone Line"}
                  </div>
                  <div className="text-sm sm:text-base font-black text-[#16a34a] dark:text-emerald-400 truncate tabular-nums">
                    {prayerPhone}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {language === "lo"
                      ? "ພວກເຮົາຍິນດີອະທິຖານຮ່ວມກັບທ່ານ."
                      : language === "th"
                      ? "เรายินดีอธิษฐานเผื่อท่าน"
                      : "We would love to pray with you."}
                  </div>
                </div>
              </a>

              {/* Card 2: WhatsApp Ministry */}
              <a
                href={`https://wa.me/${prayerWhatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 shadow-xs hover:shadow-md flex items-center gap-3.5 transition group"
              >
                <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {language === "lo"
                      ? "WhatsApp ພັນທະກິດ"
                      : language === "th"
                      ? "WhatsApp พันธกิจ"
                      : "WhatsApp Ministry"}
                  </div>
                  <div className="text-sm sm:text-base font-black text-[#16a34a] dark:text-emerald-400 truncate tabular-nums">
                    {prayerWhatsapp}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {language === "lo"
                      ? "ສົ່ງຂໍ້ຄວາມຫາພວກເຮົາໄດ້ທຸກເວລາ."
                      : language === "th"
                      ? "ส่งข้อความถึงเราได้ทุกเวลา"
                      : "Send a message anytime."}
                  </div>
                </div>
              </a>

              {/* Card 3: Email Support */}
              <a
                href={`mailto:${prayerEmail}`}
                className="p-4 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 shadow-xs hover:shadow-md flex items-center gap-3.5 transition group"
              >
                <div className="w-11 h-11 rounded-full bg-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {language === "lo"
                      ? "ອີເມວຕິດຕໍ່"
                      : language === "th"
                      ? "อีเมลติดต่อ"
                      : "Email Support"}
                  </div>
                  <div className="text-sm sm:text-base font-black text-[#2563eb] dark:text-blue-400 truncate">
                    {prayerEmail}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {language === "lo"
                      ? "ສຳລັບຄຳຖາມ, ການຮ່ວມມື ຫຼື ຂໍ້ມູນເພີ່ມເຕີມ."
                      : language === "th"
                      ? "สำหรับคำถาม การร่วมพันธกิจ หรือข้อมูลเพิ่มเติม"
                      : "For questions, partnership, or more information."}
                  </div>
                </div>
              </a>
            </div>
          </section>
        )}

        {/* 6. OUR MINISTRY TEAM — Horizontal Circular Avatar Cards */}
        {visibleTeams.length > 0 && (
          <section className="w-full space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-black text-xs sm:text-[13px] uppercase tracking-wider text-slate-900 dark:text-white">
                    {language === "lo"
                      ? "ທີມງານພັນທະກິດຂອງພວກເຮົາ"
                      : language === "th"
                      ? "ทีมงานพันธกิจของเรา"
                      : "OUR MINISTRY TEAM"}
                  </h2>
                </div>
                <div className="w-8 h-0.5 bg-[#ee1c25] rounded-full mt-1" />
              </div>

              <button
                type="button"
                onClick={() => setShowAllTeam((prev) => !prev)}
                className="text-xs font-bold text-[#ee1c25] hover:underline inline-flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <span>
                  {showAllTeam && visibleTeams.length > 3
                    ? language === "lo"
                      ? "ສະແດງໜ້ອຍລົງ"
                      : language === "th"
                      ? "แสดงน้อยลง"
                      : "Show Less"
                    : language === "lo"
                    ? "ເບິ່ງສະມາຊິກທັງໝົດ"
                    : language === "th"
                    ? "ดูสมาชิกทีมทั้งหมด"
                    : "View All Team Members"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {displayedTeams.map((member) => {
                const roleName =
                  language === "lo"
                    ? member.role
                    : language === "th"
                    ? member.roleTh || member.role
                    : member.roleEn || member.role;

                return (
                  <div
                    key={member.rowId || member.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={
                          member.imageUrl ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600"
                        }
                        alt={member.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover object-center ring-[2.5px] ring-[#16a34a] shadow-xs"
                        onError={handleImageErrorWithFirestore(
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600"
                        )}
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                        {member.name}
                      </h4>

                      <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#dcfce7] dark:bg-emerald-950/70 text-[#15803d] dark:text-emerald-300">
                        {roleName}
                      </span>

                      {(member.phone || member.email) && (
                        <div className="pt-1.5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          {member.phone && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Phone className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                              <span className="tabular-nums font-medium">{member.phone}</span>
                            </div>
                          )}
                          {member.email && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                              <span className="truncate font-medium">{member.email}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 7. Support & Donation Section (when enabled in Admin Settings) */}
        {!donationInfo?.hidden && !donationInfo?.hideDonationSection && (
          <section className="w-full py-2">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-[#ee1c25] dark:text-red-400 text-xs font-bold uppercase tracking-wider">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>
                    {language === "lo"
                      ? "ຮ່ວມຖວາຍສະໜັບສະໜູນພັນທະກິດ"
                      : language === "th"
                      ? "ร่วมถวายสนับสนุนพันธกิจ"
                      : "Support the Ministry"}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {language === "lo"
                    ? "ຮ່ວມເປັນສ່ວນໜຶ່ງໃນການຂະຫຍາຍອານາຈັກພຣະເຈົ້າ"
                    : language === "th"
                    ? "ร่วมเป็นส่วนหนึ่งในการขยายอาณาจักรพระเจ้า"
                    : "Partner With Hope Bokeo"}
                </h3>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  {language === "lo"
                    ? donationInfo?.purposeDesc ||
                      "ທຸກການຖວາຍຂອງທ່ານ ຈະຖືກນຳໄປໃຊ້ໃນການປະກາດຂ່າວປະເສີດ, ບຸກເບີກຄຣິດຕະຈັກ, ແລະ ຊ່ວຍເຫຼືອຊຸມຊົນທີ່ຂາດເຂີນໃນແຂວງບໍ່ແກ້ວ."
                    : language === "th"
                    ? donationInfo?.purposeDescTh ||
                      "ทุกการถวายของท่านจะถูกนำไปใช้ในการประกาศข่าวประเสริฐ บุกเบิกคริสตจักร และช่วยเหลือชุมชนที่ขาดแคลนในแขวงบ่อแก้ว"
                    : donationInfo?.purposeDescEn ||
                      "Your generous support directly empowers local church planting, gospel outreach, and community relief across Bokeo Province."}
                </p>

                {bankAccounts.length > 1 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {bankAccounts.map((acc, idx) => (
                      <button
                        key={acc.id || idx}
                        type="button"
                        onClick={() => setSelectedAccountIdx(idx)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          idx === selectedAccountIdx
                            ? "bg-[#cc0000] text-white shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {acc.bankName} {(acc as any).currency ? `(${(acc as any).currency})` : ""}
                      </button>
                    ))}
                  </div>
                )}

                {currentAccount && (
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{language === "lo" ? "ທະນາຄານ:" : "Bank:"}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {currentAccount.bankName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{language === "lo" ? "ຊື່ບັນຊີ:" : "Account Name:"}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {currentAccount.accountName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{language === "lo" ? "ເລກບັນຊີ:" : "Account Number:"}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm sm:text-base text-[#cc0000] dark:text-red-400">
                          {currentAccount.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(currentAccount.accountNumber)}
                          className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:text-[#cc0000] transition cursor-pointer"
                          title="Copy"
                        >
                          {copiedAccount ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {currentAccount.donationLink && (
                      <div className="pt-2">
                        <a
                          href={currentAccount.donationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#cc0000] hover:underline"
                        >
                          <span>
                            {language === "lo" ? "ລິ້ງຮ່ວມຖວາຍອອນລາຍ" : "Online Donation Link"}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-xs flex flex-col items-center space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <QrCode className="w-4 h-4 text-[#cc0000]" />
                    <span>{language === "lo" ? "ສະແກນ QR ເພື່ອຮ່ວມຖວາຍ" : "Scan QR to Donate"}</span>
                  </div>
                  {currentAccount?.qrImageUrl || donationInfo?.qrImageUrl ? (
                    <img
                      src={currentAccount?.qrImageUrl || donationInfo?.qrImageUrl}
                      alt="Donation QR"
                      className="w-48 h-48 object-contain rounded-2xl bg-white p-2 shadow-xs"
                    />
                  ) : (
                    <QRCodeDisplay
                      accountNumber={currentAccount?.accountNumber}
                      bankName={currentAccount?.bankName}
                      accountName={currentAccount?.accountName}
                      donationLink={currentAccount?.donationLink}
                      size={200}
                      language={language}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

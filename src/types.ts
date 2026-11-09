export interface DonationTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency?: string;
  donorName?: string;
  evidenceUrl?: string;
  category?: string;
  deductionPercent?: number;
  notes?: string;
  createdAt?: string;
  batchId?: string;
  batchName?: string;
  batchRound?: number;
  batchMonth?: string;
}

export interface TeamDistribution {
  id: string;
  period: string; // e.g. "2026-10" or "October 2026"
  batchId?: string; // unique ID or key for grouping installment/batch (ງວດ/ຊຸດ)
  batchName?: string; // e.g. "ງວດທີ 1", "ງວດທີ 2", "ງວດຕົ້ນເດືອນ", "Batch #1"
  batchIndex?: number; // 1, 2, 3...
  batchRound?: number; // Round / ຊຸດທີ e.g. 1, 2, 3...
  batchMonth?: string; // Month / ປະຈຳເດືອນ e.g. "08", "09"
  recipientId?: string;
  recipientName: string;
  amount: number;
  currency?: string;
  evidenceUrl?: string;
  evidenceUrls?: string[];
  status: 'transferred' | 'pending';
  transferDate: string; // YYYY-MM-DD
  transferTime?: string; // HH:mm or HH:mm:ss
  notes?: string;
  category?: 'team' | 'emergency';
  createdAt?: string;
}

export interface SheetMetadata {
  title: string;
  spreadsheetId: string;
  sheets: {
    sheetId?: number;
    title: string;
    rowCount?: number;
    columnCount?: number;
  }[];
}

export type TimeRange = 'all' | 'week' | 'month' | 'year' | 'custom';

export interface VillageUpdateRecord {
  id: string;
  date: string; // YYYY-MM-DD
  addedHeard: number;
  addedBelievers: number;
  addedBaptized: number;
  totalHeard?: number;
  totalBelievers?: number;
  totalBaptized?: number;
  attending?: number;
  leaders?: number;
  notes?: string;
  createdAt?: string;
}

export interface Village {
  rowId: number;
  id: string;
  name: string;
  nameEn?: string;
  nameTh?: string;
  district: string;
  districtEn?: string;
  districtTh?: string;
  province: string;
  heard: number;
  believers: number;
  baptized: number;
  attending?: number;
  leaders?: number;
  persecution: 'ປົກກະຕິ' | 'ປານກາງ' | 'ວິກິດ' | string;
  needs: string;
  notes?: string;
  imageUrl: string;
  mapUrl?: string;
  lat?: number;
  lng?: number;
  date: string;
  pinCode?: string;
  hidden?: boolean;
  history?: VillageUpdateRecord[];
  initialHeard?: number;
  initialBelievers?: number;
  initialBaptized?: number;
  initialDate?: string;
}

export interface MonthlyReportItem {
  id: string;
  month: string; // e.g., "2026-08" or "ສິງຫາ 2026"
  date: string; // ISO date string "2026-08-20"
  endDate?: string; // Optional end date for multi-day events "2026-08-25"
  title: string;
  titleEn?: string;
  titleTh?: string;
  summary: string;
  summaryEn?: string;
  summaryTh?: string;
  imageUrl?: string;
  imageUrls?: string[];
  docUrl?: string;
  docUrls?: string[];
  videoUrl?: string;
  attendees?: number;
  baptized?: number;
  believers?: number;
  location?: string;
  createdAt?: string;
}

export interface EventData {
  rowId: number;
  id?: string;
  title: string;
  titleEn?: string;
  titleTh?: string;
  description: string;
  descriptionEn?: string;
  descriptionTh?: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  audioUrl?: string;
  docUrl?: string;
  docUrls?: string[];
  date: string;
  endDate?: string; // Optional end date for multi-day events
  hidden?: boolean;
  monthlyReports?: MonthlyReportItem[];
}

export interface TeamMember {
  id?: string;
  rowId: number;
  name: string;
  role: string;
  roleEn?: string;
  roleTh?: string;
  phone: string;
  email: string;
  imageUrl?: string;
  bio?: string;
  bioEn?: string;
  bioTh?: string;
  hidden?: boolean;
  // Private Finance Transfer Information (strictly displayed ONLY in Finance Tab)
  financeQrUrl?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export interface FinanceQrMember {
  id: string;
  name: string;
  imageUrl?: string;
  financeQrUrl?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  role?: string;
  phone?: string;
  createdAt?: string;
}

export interface HomePoster {
  title: string;
  titleEn?: string;
  titleTh?: string;
  subtitle: string;
  subtitleEn?: string;
  subtitleTh?: string;
  description: string;
  descriptionEn?: string;
  descriptionTh?: string;
  bokeoTitle?: string;
  bokeoTitleEn?: string;
  bokeoTitleTh?: string;
  bokeoSubtitle?: string;
  bokeoSubtitleEn?: string;
  bokeoSubtitleTh?: string;
  bokeoShortIntro?: string;
  bokeoShortIntroEn?: string;
  bokeoShortIntroTh?: string;
  bokeoDesc?: string;
  bokeoDescEn?: string;
  bokeoDescTh?: string;
  bokeoImageUrl?: string;
  imageUrl: string;
  imageUrls?: string[];
  videoUrl?: string;
  buttonText?: string;
  buttonTextEn?: string;
  buttonTextTh?: string;
  videoBtnText?: string;
  videoBtnTextEn?: string;
  videoBtnTextTh?: string;
  posterLocationTag?: string;
  posterLocationTagEn?: string;
  posterLocationTagTh?: string;
  badgeTopText?: string;
  badgeTopTextEn?: string;
  badgeTopTextTh?: string;
  badgeBottomText?: string;
  badgeBottomTextEn?: string;
  badgeBottomTextTh?: string;
  hideRightBadge?: boolean;
  linkUrl?: string;
  bgColor?: string;
  bgImageUrl?: string;
  bgBrightness?: number;
  bgBlur?: number;
  bgWhiteOverlayOpacity?: number;
  bgWhiteOpacity?: number;
  logoUrl?: string;
  bgPosition?: string;
  bgPositions?: string[];
  imageCustomSettings?: PosterImageCustomSetting[];
  posterHeight?: number | string;
  posterScale?: number;
  posterFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  posterAspectRatio?: 'auto' | '16/9' | '4/3' | '1/1' | '21/9' | '3/4' | '9/16';
  posterBrightness?: number;
  posterContrast?: number;
  posterSaturation?: number;
  posterBlur?: number;
  posterOverlayOpacity?: number;
  posterEdgeFade?: number;
  hidden?: boolean;
  hidePoster?: boolean;
  hideTextOverlay?: boolean;
  showTextOverlay?: boolean;
  hideBokeoSection?: boolean;
  hideAboutHeroPoster?: boolean;
  aboutHeroImageUrl?: string;
  aboutHeroBadge?: string;
  aboutHeroBadgeEn?: string;
  aboutHeroBadgeTh?: string;
  aboutHeroVerse?: string;
  aboutHeroVerseEn?: string;
  aboutHeroVerseTh?: string;
  aboutHeroVerseRef?: string;
  aboutHeroVerseRefEn?: string;
  aboutHeroVerseRefTh?: string;
  aboutWhoWeAreBadge?: string;
  aboutWhoWeAreBadgeEn?: string;
  aboutWhoWeAreBadgeTh?: string;
  aboutWhoWeAreTitle?: string;
  aboutWhoWeAreTitleEn?: string;
  aboutWhoWeAreTitleTh?: string;
  aboutWhoWeArePosition?: string;
  aboutWhoWeAreScale?: number;
  aboutWhoWeAreFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  bokeoPosterHeight?: number;
  bokeoPosterDim?: number;
  bokeoPosterEdgeFade?: number;
  bokeoPosterOverlayOpacity?: number;
  bokeoPosterBrightness?: number;
  bokeoPosterScale?: number;
  bokeoPosterPosition?: string;
  bokeoPosterFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  bokeoTimeline?: MinistryTimelineItem[];
  bokeoTimelineTitle?: string;
  bokeoTimelineTitleEn?: string;
  bokeoTimelineTitleTh?: string;
  hideBokeoTimeline?: boolean;

  // Vision & Mission (ວິໄສທັດ ແລະ ພັນທະກິດ)
  vision?: string;
  visionEn?: string;
  visionTh?: string;
  mission?: string;
  missionEn?: string;
  missionTh?: string;
  hideVisionMission?: boolean;

  // Upcoming Event / Announcement (ງານທີ່ຈະມາເຖິງ / ແຈ້ງການ & ປະກາດ)
  upcomingEventTitle?: string;
  upcomingEventTitleEn?: string;
  upcomingEventTitleTh?: string;
  upcomingEventDate?: string;
  upcomingEventLocation?: string;
  upcomingEventLocationEn?: string;
  upcomingEventLocationTh?: string;
  upcomingEventDesc?: string;
  upcomingEventDescEn?: string;
  upcomingEventDescTh?: string;
  upcomingEventImageUrl?: string;
  upcomingEventBadge?: string;
  upcomingEventBadgeEn?: string;
  upcomingEventBadgeTh?: string;
  hideUpcomingEvent?: boolean;
  upcomingSchedule?: UpcomingScheduleItem[];
  upcomingScheduleHtml?: string;
  upcomingPdfUrl?: string;
  upcomingPdfName?: string;
  upcomingDocxUrl?: string;
  upcomingDocxName?: string;
  upcomingAttachments?: UpcomingEventAttachment[];
  upcomingPosterStyle?: 'cinematic' | 'banner' | 'clean';
  upcomingBgDim?: number;
  upcomingEdgeFade?: number;
  upcomingHeight?: number;
  upcomingTitleSize?: 'event' | 'compact' | 'large' | number | string;
  upcomingTableBg?: 'transparent' | 'glass' | 'paper' | 'dark' | 'custom';
  upcomingTableCustomBg?: string;
  upcomingTableBorderWidth?: number;
  upcomingTableBorderColor?: string;
  upcomingTableWidth?: number;
  upcomingTableAlign?: 'left' | 'center' | 'right';
  upcomingBgVisibility?: number;
  upcomingContentBgOpacity?: number;
  // Communities, Churches & Map Section Content (ບ່ອນພຣະເຈົ້າກຳລັງເຄື່ອນໄຫວ / Communities, Churches. Lasting Change.)
  mapSectionBadge?: string;
  mapSectionBadgeEn?: string;
  mapSectionBadgeTh?: string;
  mapSectionTitle?: string;
  mapSectionTitleEn?: string;
  mapSectionTitleTh?: string;
  mapSectionDesc?: string;
  mapSectionDescEn?: string;
  mapSectionDescTh?: string;
  hideMapSectionDesc?: boolean;
  mapSectionButtonText?: string;
  mapSectionButtonTextEn?: string;
  mapSectionButtonTextTh?: string;

  // Stories From The Field Content (ເລື່ອງລາວຈາກພາກສະໜາມ / Real People. Real Hope.)
  storiesBadgeText?: string;
  storiesBadgeTextEn?: string;
  storiesBadgeTextTh?: string;
  storiesTitle?: string;
  storiesTitleEn?: string;
  storiesTitleTh?: string;
  storiesDesc?: string;
  storiesDescEn?: string;
  storiesDescTh?: string;
  hideStoriesDesc?: boolean;
  storiesButtonText?: string;
  storiesButtonTextEn?: string;
  storiesButtonTextTh?: string;

  // Prayer Section & Needs Settings (ການຕັ້ງຄ່າໜ້າອະທິຖານ / Prayer Page Settings)
  hidePrayerSection?: boolean;
  prayerBadgeText?: string;
  prayerBadgeTextEn?: string;
  prayerBadgeTextTh?: string;
  prayerTitle?: string;
  prayerTitleEn?: string;
  prayerTitleTh?: string;
  prayerSubtitle?: string;
  prayerSubtitleEn?: string;
  prayerSubtitleTh?: string;
  prayerButtonText?: string;
  prayerButtonTextEn?: string;
  prayerButtonTextTh?: string;
  prayerBgImageUrl?: string;
  prayerPrayingCountSuffix?: string;
  prayerPrayingCountSuffixEn?: string;
  prayerPrayingCountSuffixTh?: string;

  // 3 Floating Prayer Cards on Home Section
  prayerCard1Title?: string;
  prayerCard1TitleEn?: string;
  prayerCard1TitleTh?: string;
  prayerCard1Subtitle?: string;
  prayerCard1SubtitleEn?: string;
  prayerCard1SubtitleTh?: string;
  prayerCard1Count?: number;

  prayerCard2Title?: string;
  prayerCard2TitleEn?: string;
  prayerCard2TitleTh?: string;
  prayerCard2Subtitle?: string;
  prayerCard2SubtitleEn?: string;
  prayerCard2SubtitleTh?: string;
  prayerCard2Count?: number;

  prayerCard3Title?: string;
  prayerCard3TitleEn?: string;
  prayerCard3TitleTh?: string;
  prayerCard3Subtitle?: string;
  prayerCard3SubtitleEn?: string;
  prayerCard3SubtitleTh?: string;
  prayerCard3Count?: number;

  // Prayer Modal Full Content
  prayerModalTitle?: string;
  prayerModalTitleEn?: string;
  prayerModalTitleTh?: string;
  prayerModalSubtitle?: string;
  prayerModalSubtitleEn?: string;
  prayerModalSubtitleTh?: string;
  prayerModalItems?: PrayerTopicItem[];

  // Dynamic Prayer Boxes on Home Section (can add or remove in Settings)
  prayerBoxes?: PrayerBoxItem[];

  // Insights (Dashboard) Tab Hero Poster Settings (ການຕັ້ງຄ່າໂພສເຕີຫ້ອງຂໍ້ມູນ)
  hideInsightsPoster?: boolean;
  insightsImageUrl?: string;
  insightsPosterHeight?: number;
  insightsPosterOverlayOpacity?: number;
  insightsPosterEdgeFade?: number;
  insightsPosterDim?: number;
  insightsPosterScale?: number;
  insightsPosterPosition?: string;
  insightsPosterFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  insightsTitle?: string;
  insightsTitleEn?: string;
  insightsTitleTh?: string;
  insightsSubtitle?: string;
  insightsSubtitleEn?: string;
  insightsSubtitleTh?: string;
  insightsVerse?: string;
  insightsVerseEn?: string;
  insightsVerseTh?: string;
  insightsVerseRef?: string;
  insightsVerseRefEn?: string;
  insightsVerseRefTh?: string;
  // Website Privacy & Access Mode ('link_only' = Private Invite Link Only & No Google Indexing, 'public' = Open to Everyone & Search Engines)
  siteAccessMode?: 'link_only' | 'public';
  siteAccessKey?: string;
  updatedAt?: string;
}

export interface TypedPrayerComment {
  id: string;
  authorName?: string;
  message: string;
  createdAt: string;
}

export interface PrayerBoxItem {
  id: string;
  title: string;
  titleEn?: string;
  titleTh?: string;
  subtitle: string;
  subtitleEn?: string;
  subtitleTh?: string;
  desc?: string;
  descEn?: string;
  descTh?: string;
  icon?: 'users' | 'shield' | 'heart' | 'church' | 'sparkles' | 'globe' | 'book';
  count?: number;
  comments?: TypedPrayerComment[];
}

export interface PrayerTopicItem {
  id: string;
  title: string;
  titleEn?: string;
  titleTh?: string;
  desc: string;
  descEn?: string;
  descTh?: string;
  count?: number;
}

export type HomePosterSettings = HomePoster;

export interface UpcomingScheduleItem {
  id: string;
  time: string;
  activity: string;
  speaker?: string;
  location?: string;
  note?: string;
}

export interface MinistryTimelineItem {
  id: string;
  year: string;
  date?: string;
  title: string;
  titleEn?: string;
  titleTh?: string;
  description: string;
  descriptionEn?: string;
  descriptionTh?: string;
  imageUrl?: string;
  imageUrls?: string[];
  order?: number;
  hidden?: boolean;
}

export interface UpcomingEventAttachment {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'doc' | 'image' | 'other';
  size?: string;
}

export interface PosterImageCustomSetting {
  position?: string;
  scale?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
}

export interface BankAccount {
  id?: string;
  bankName: string;
  bankNameEn?: string;
  bankNameTh?: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
  qrImageUrl: string;
  donationLink?: string;
  qrPayload?: string;
  hidden?: boolean;
}

export interface DonationInfo {
  bankName: string;
  bankNameEn?: string;
  bankNameTh?: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
  qrImageUrl: string;
  donationLink?: string;
  qrPayload?: string;
  bankAccounts?: BankAccount[];
  prayerContactPhone: string;
  prayerContactWhatsapp: string;
  prayerContactEmail: string;
  supportNote: string;
  supportNoteEn?: string;
  supportNoteTh?: string;
  purposeDesc?: string;
  purposeDescEn?: string;
  purposeDescTh?: string;
  vision?: string;
  visionEn?: string;
  visionTh?: string;
  mission?: string;
  missionEn?: string;
  missionTh?: string;
  hidden?: boolean;
  hideDonationSection?: boolean;
  hideVisionMission?: boolean;
  hidePrayerLine?: boolean;
  updatedAt?: string;
}

export interface MinistryData {
  villages: Village[];
  events: EventData[];
  teams: TeamMember[];
  homePoster?: HomePoster;
  donationInfo?: DonationInfo;
}

export interface SheetDataResponse {
  success: boolean;
  fallback?: boolean;
  range?: string;
  values?: string[][];
  headers?: string[];
  rows?: string[][];
  error?: string;
}

export interface ChatSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'mixed';
  sources?: ChatSource[];
  webSearchUsed?: boolean;
  modelUsed?: string;
}

export type Language = 'lo' | 'en' | 'th' | 'la';


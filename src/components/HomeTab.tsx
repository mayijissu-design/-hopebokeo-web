import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  ArrowRight,
  Play,
  Church,
  Users,
  Heart,
  Droplets,
  UsersRound,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  Compass,
  Check,
  Edit2,
  Sparkles,
  Globe,
  BookOpen,
  Send,
  MessageSquare,
} from 'lucide-react';
import { DonationInfo, EventData, HomePoster, Language, Village, PrayerBoxItem, TypedPrayerComment } from '../types';
import { EventReportModal } from './EventReportModal';
import { getVillageGPS } from './MapsTab';
import { UpcomingEventPoster } from './UpcomingEventPoster';
import { RealBokeoMap } from './RealBokeoMap';
import { handleImageErrorWithFirestore } from '../utils/imageFallback';

interface HomeTabProps {
  events: EventData[];
  villages?: Village[];
  homePoster?: HomePoster;
  donationInfo?: DonationInfo;
  language: Language;
  onSaveHomePoster?: (poster: HomePoster) => Promise<void>;
  onNavigateToDashboard?: () => void;
  onNavigateToAbout?: () => void;
  onNavigateToAdmin?: (subTab?: 'poster' | 'events' | 'donation') => void;
  onNavigateToMap?: () => void;
}

interface FieldStoryItem {
  id: string;
  category: string;
  categoryLo: string;
  categoryTh: string;
  title: string;
  titleLo: string;
  titleTh: string;
  excerpt: string;
  excerptLo: string;
  excerptTh: string;
  imageUrl: string;
  eventRef?: EventData;
}

interface LocationItem {
  id: string;
  name: string;
  nameLo: string;
  nameTh: string;
  desc: string;
  descLo: string;
  descTh: string;
  imageUrl: string;
  pinX: number; // percentage on map
  pinY: number; // percentage on map
  villageRef?: Village;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  events,
  villages = [],
  homePoster,
  donationInfo,
  language,
  onSaveHomePoster,
  onNavigateToDashboard,
  onNavigateToAbout,
  onNavigateToAdmin,
  onNavigateToMap,
}) => {
  // Modal states
  const [selectedReportEvent, setSelectedReportEvent] = useState<EventData | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState<boolean>(false);
  const [activeTypingPrayerBox, setActiveTypingPrayerBox] = useState<PrayerBoxItem | null>(null);
  const [prayerAuthorName, setPrayerAuthorName] = useState<string>('');
  const [prayerMessageText, setPrayerMessageText] = useState<string>('');
  const [prayerSubmittedNotice, setPrayerSubmittedNotice] = useState<boolean>(false);

  // Prayer items state & counts (persisted in localStorage)
  const [prayedItems, setPrayedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('hope_bokeo_prayed_items');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [prayerCounts, setPrayerCounts] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {
      workers: 142,
      protection: 98,
      provision: 126,
      unity: 85,
    };
    try {
      const saved = localStorage.getItem('hope_bokeo_prayer_counts');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  const [localBoxComments, setLocalBoxComments] = useState<Record<string, TypedPrayerComment[]>>(() => {
    try {
      const saved = localStorage.getItem('hope_bokeo_prayer_comments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync prayer counts from Firestore homePoster whenever admin updates them in Settings
  useEffect(() => {
    if (!homePoster) return;
    setPrayerCounts((prev) => {
      const next = { ...prev };
      let changed = false;
      if (Array.isArray(homePoster.prayerBoxes) && homePoster.prayerBoxes.length > 0) {
        homePoster.prayerBoxes.forEach((box) => {
          if (box && box.id && typeof box.count === 'number' && next[box.id] !== box.count) {
            next[box.id] = box.count;
            changed = true;
          }
        });
      }
      if (Array.isArray(homePoster.prayerModalItems) && homePoster.prayerModalItems.length > 0) {
        homePoster.prayerModalItems.forEach((item) => {
          if (item && item.id && typeof item.count === 'number' && next[item.id] !== item.count) {
            next[item.id] = item.count;
            changed = true;
          }
        });
      }
      if (changed) {
        try {
          localStorage.setItem('hope_bokeo_prayer_counts', JSON.stringify(next));
        } catch {}
        return next;
      }
      return prev;
    });
  }, [homePoster?.prayerBoxes, homePoster?.prayerModalItems]);

  // Story carousel page index
  const [storyCarouselIndex, setStoryCarouselIndex] = useState<number>(0);

  // Active highlighted location on the map
  const [activeLocationId, setActiveLocationId] = useState<string>('');

  // Selected village preview modal
  const [selectedVillagePreview, setSelectedVillagePreview] = useState<Village | null>(null);

  // Dynamic stats calculated from real villages in the database (Insights / ຂໍ້ມູນເຊິງເລິກ)
  const computedStats = useMemo(() => {
    const activeVillages = (villages || []).filter((v) => !v.hidden);
    if (activeVillages.length === 0) {
      return {
        churches: 7,
        gospelHeard: '1,137',
        believers: '344',
        baptized: '233',
        worshippers: '118',
      };
    }

    let totalHeard = 0;
    let totalBelievers = 0;
    let totalBaptized = 0;
    let totalWorshippers = 0;

    activeVillages.forEach((v) => {
      totalHeard += Number(v.heard) || 0;
      totalBelievers += Number(v.believers) || 0;
      totalBaptized += Number(v.baptized) || 0;
      totalWorshippers += Number(v.attending) || 0;
    });

    return {
      churches: activeVillages.length,
      gospelHeard: totalHeard > 0 ? totalHeard.toLocaleString() : '1,137',
      believers: totalBelievers > 0 ? totalBelievers.toLocaleString() : '344',
      baptized: totalBaptized > 0 ? totalBaptized.toLocaleString() : '233',
      worshippers: totalWorshippers > 0 ? totalWorshippers.toLocaleString() : '118',
    };
  }, [villages]);

  // Video embed url parser
  const videoUrl = homePoster?.videoUrl?.trim() || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const getEmbedUrl = (raw: string) => {
    const match = raw.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (match && match[2] && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`;
    }
    return raw;
  };

  // Dynamic Real Churches / Locations linked directly from ຂໍ້ມູນເຊິງເລິກ (Insights / Database)
  const churchLocations: LocationItem[] = useMemo(() => {
    const activeList = (villages || []).filter((v) => !v.hidden);
    if (activeList.length === 0) {
      return [
        {
          id: 'huaysung',
          name: 'Huaysung',
          nameLo: 'ຫ້ວຍຊຸງ',
          nameTh: 'ห้วยซุง',
          desc: 'Evangelism and discipleship.',
          descLo: 'ການປະກາດຂ່າວປະເສີດ ແລະ ການສ້າງສາວົກ.',
          descTh: 'การประกาศและการสร้างสาวก',
          imageUrl: '/uploads/village______.jpg',
          pinX: 47,
          pinY: 31,
        },
        {
          id: 'mokplai',
          name: 'Mok Plai',
          nameLo: 'ມົກປາຍ',
          nameTh: 'มกปาย',
          desc: 'Growing a new faith community.',
          descLo: 'ການເຕີບໃຫຍ່ຂອງຊຸມຊົນແຫ່ງຄວາມເຊື່ອໃໝ່.',
          descTh: 'การเติบโตของชุมชนความเชื่อใหม่',
          imageUrl: '/uploads/423454290_1612023499336326_7751003763328_1788761411282_249.jpg',
          pinX: 74,
          pinY: 37,
        },
        {
          id: 'moksouk',
          name: 'Moksouk',
          nameLo: 'ມົກສຸກ',
          nameTh: 'มกสุก',
          desc: 'Supporting families and local churches.',
          descLo: 'ການຊ່ວຍເຫຼືອຄອບຄົວ ແລະ ຄຣິດຕະຈັກທ້ອງຖິ່ນ.',
          descTh: 'การช่วยเหลือครอบครัวและคริสตจักรท้องถิ่น',
          imageUrl: '/uploads/village_______.jpg',
          pinX: 32,
          pinY: 53,
        },
        {
          id: 'kankham',
          name: 'Kankham',
          nameLo: 'ແກ່ນຄຳ',
          nameTh: 'แก่นคำ',
          desc: 'Reaching remote mountain villages.',
          descLo: 'ການເຂົ້າເຖິງໝູ່ບ້ານຫ່າງໄກສອກຫຼີກດ້ວຍຂ່າວປະເສີດ.',
          descTh: 'เข้าถึงหมู่บ้านบนดอยด้วยความรัก',
          imageUrl: '/uploads/village________.jpg',
          pinX: 63,
          pinY: 74,
        },
        {
          id: 'monkeum',
          name: 'Monkeum',
          nameLo: 'ມົນຄຳ',
          nameTh: 'มนคำ',
          desc: 'Faith community and leadership development.',
          descLo: 'ຊຸມຊົນແຫ່ງຄວາມເຊື່ອ ແລະ ການພັດທະນາຜູ້ນຳ.',
          descTh: 'ชุมชนความเชื่อและการพัฒนาผู้นำ',
          imageUrl: '/uploads/village___________.jpg',
          pinX: 75,
          pinY: 67,
        },
      ];
    }

    return activeList.map((v) => {
      const gps = getVillageGPS(v);
      // Bokeo coordinate mapping: [19.72, 100.02] to [20.82, 101.05]
      const lngMin = 100.02;
      const lngMax = 101.05;
      const latMin = 19.72;
      const latMax = 20.82;
      
      const rawX = ((gps.lng - lngMin) / (lngMax - lngMin)) * 100;
      const rawY = ((latMax - gps.lat) / (latMax - latMin)) * 100;

      const pinX = Math.max(18, Math.min(84, Math.round(18 + rawX * 0.64)));
      const pinY = Math.max(16, Math.min(84, Math.round(14 + rawY * 0.70)));

      const name = v.nameEn || v.name;
      const nameLo = v.name;
      const nameTh = v.nameTh || v.name;

      const descLo = `ເມືອງ${v.district || 'ບໍ່ແກ້ວ'} · ຜູ້ເຊື່ອ ${Number(v.believers) || 0} ຄົນ, ບັບຕິສະມາ ${Number(v.baptized) || 0} ຄົນ`;
      const desc = `${v.districtEn || v.district || 'Bokeo'} District · ${Number(v.believers) || 0} Believers, ${Number(v.baptized) || 0} Baptized`;
      const descTh = `เมือง${v.districtTh || v.district || 'บ่อแก้ว'} · ผู้เชื่อ ${Number(v.believers) || 0} คน, บัพติศมา ${Number(v.baptized) || 0} คน`;

      return {
        id: v.id || String(v.rowId),
        name,
        nameLo,
        nameTh,
        desc,
        descLo,
        descTh,
        imageUrl: v.imageUrl?.trim() || '/uploads/village______.jpg',
        pinX,
        pinY,
        villageRef: v,
      };
    });
  }, [villages, language]);

  // Synchronize active church location
  useEffect(() => {
    if (churchLocations.length > 0 && (!activeLocationId || !churchLocations.some((c) => c.id === activeLocationId))) {
      setActiveLocationId(churchLocations[0].id);
    }
  }, [churchLocations, activeLocationId]);

  // Curated story items: prioritize real events created in the database
  const storyItems: FieldStoryItem[] = useMemo(() => {
    // If real events are present from database (events created by user), use them!
    if (events && events.length > 0) {
      const activeEvents = events.filter((e) => !e.hidden);
      if (activeEvents.length > 0) {
        return activeEvents.slice(0, 8).map((ev, idx) => {
          const clean = (ev.description || '').replace(/<[^>]*>/g, ' ').slice(0, 150);
          return {
            id: ev.id || `event-${ev.rowId || idx}`,
            category: '',
            categoryLo: '',
            categoryTh: '',
            title: ev.titleEn || ev.title,
            titleLo: ev.title,
            titleTh: ev.titleTh || ev.title,
            excerpt: ev.descriptionEn ? ev.descriptionEn.replace(/<[^>]*>/g, ' ').slice(0, 150) : clean,
            excerptLo: clean,
            excerptTh: ev.descriptionTh ? ev.descriptionTh.replace(/<[^>]*>/g, ' ').slice(0, 150) : clean,
            imageUrl:
              ev.imageUrl ||
              (ev.imageUrls && ev.imageUrls[0]) ||
              '/uploads/551239041_802528468839951_42532514368066_1788761477530_359.jpg',
            eventRef: ev,
          };
        });
      }
    }

    // Default fallback list without hardcoded category headers
    const defaultList: FieldStoryItem[] = [
      {
        id: 'story-1',
        category: '',
        categoryLo: '',
        categoryTh: '',
        title: "A Brighter Future for Bokeo's Children",
        titleLo: 'ອະນາຄົດທີ່ສົດໃສສຳລັບເດັກນ້ອຍບໍ່ແກ້ວ',
        titleTh: 'อนาคตที่สดใสสำหรับเด็กๆ บ่อแก้ว',
        excerpt:
          'Through Bible teaching and discipleship, children are finding hope, purpose and a new family in Christ.',
        excerptLo:
          'ຜ່ານການສອນພຣະຄຳພີ ແລະ ການສ້າງສາວົກ, ເດັກນ້ອຍໄດ້ພົບຄວາມຫວັງ, ເປົ້າໝາຍຊີວິດ ແລະ ຄອບຄົວໃໝ່ໃນພຣະຄຣິດ.',
        excerptTh:
          'ผ่านการสอนพระคัมภีร์และการสร้างสาวก เด็กๆ กำลังพบความหวัง เป้าหมาย และครอบครัวใหม่ในพระคริสต์',
        imageUrl:
          '/uploads/551239041_802528468839951_42532514368066_1788761477530_359.jpg',
      },
      {
        id: 'story-2',
        category: '',
        categoryLo: '',
        categoryTh: '',
        title: 'Equipping Local Leaders',
        titleLo: 'ການເສີມສ້າງ ແລະ ຝຶກອົບຮົມຜູ້ນຳທ້ອງຖິ່ນ',
        titleTh: 'เสริมสร้างศักยภาพผู้นำท้องถิ่น',
        excerpt:
          'Local believers are being trained and encouraged to lead, helping churches grow from within.',
        excerptLo:
          'ຜູ້ເຊື່ອທ້ອງຖິ່ນໄດ້ຮັບການຝຶກອົບຮົມ ແລະ ໄດ້ຮັບການໜູນໃຈໃຫ້ເປັນຜູ້ນຳ, ຊ່ວຍໃຫ້ຄຣິດຕະຈັກເຕີບໃຫຍ່ຂຶ້ນຈາກພາຍໃນ.',
        excerptTh:
          'ผู้เชื่อในท้องถิ่นได้รับการฝึกอบรมและหนุนใจให้นำ ช่วยให้คริสตจักรเติบโตจากภายใน',
        imageUrl:
          '/uploads/5b593987-79b3-4309-ac43-e717cbc3c838_1788761424505_430.jpg',
      },
      {
        id: 'story-3',
        category: '',
        categoryLo: '',
        categoryTh: '',
        title: 'Hope Reaches New Villages',
        titleLo: 'ຄວາມຫວັງກ້າວໄປສູ່ໝູ່ບ້ານໃໝ່',
        titleTh: 'ความหวังเข้าถึงหมู่บ้านใหม่',
        excerpt:
          'In remote communities, the gospel is bringing new life, new churches and lasting change.',
        excerptLo:
          'ໃນຊຸມຊົນເຂດຫ່າງໄກ, ຂ່າວປະເສີດກຳລັງນຳເອົາຊີວິດໃໝ່, ການເລີ່ມຕົ້ນຄຣິດຕະຈັກໃໝ່ ແລະ ການປ່ຽນແປງທີ່ຢືນຍົງ.',
        excerptTh:
          'ในชุมชนห่างไกล ข่าวประเสริฐกำลังนำชีวิตใหม่ คริสตจักรใหม่ และการเปลี่ยนแปลงที่ยั่งยืน',
        imageUrl:
          '/uploads/423454290_1612023499336326_7751003763328_1788761411282_249.jpg',
      },
      {
        id: 'story-4',
        category: '',
        categoryLo: '',
        categoryTh: '',
        title: 'Strengthening Families',
        titleLo: 'ການສ້າງຄວາມເຂັ້ມແຂງໃຫ້ຄອບຄົວ',
        titleTh: 'เสริมสร้างความเข้มแข็งให้ครอบครัว',
        excerpt:
          'We walk alongside families in their faith journey, providing support, encouragement and care.',
        excerptLo:
          'ພວກເຮົາຮ່ວມເດີນທາງຄຽງຂ້າງຄອບຄົວໃນເສັ້ນທາງຄວາມເຊື່ອ, ໃຫ້ການຊ່ວຍເຫຼືອ, ການໜູນໃຈ ແລະ ຄວາມຮັກຄວາມຫ່ວງໃຍ.',
        excerptTh:
          'เราก้าวเดินเคียงข้างครอบครัวในการเดินทางแห่งความเชื่อ ให้การสนับสนุน การหนุนใจ และความห่วงใย',
        imageUrl:
          '/uploads/717201340_1929460084468373_1885511797468_1788632603451_840.jpg',
      },
    ];

    return defaultList;
  }, [events]);

  const handleOpenStory = (item: FieldStoryItem) => {
    if (item.eventRef) {
      setSelectedReportEvent(item.eventRef);
    } else {
      const simulated: EventData = {
        rowId: 9999,
        id: item.id,
        title: item.titleLo,
        titleEn: item.title,
        titleTh: item.titleTh,
        description: item.excerptLo,
        descriptionEn: item.excerpt,
        imageUrl: item.imageUrl,
        date: '2026-03-15',
      };
      setSelectedReportEvent(simulated);
    }
  };

  // Dynamic Prayer Boxes from Settings (supports adding or removing boxes in Settings)
  const activePrayerBoxes: PrayerBoxItem[] = useMemo(() => {
    if (homePoster?.prayerBoxes && Array.isArray(homePoster.prayerBoxes)) {
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
  }, [homePoster]);

  const renderPrayerBoxIcon = (iconName?: string) => {
    switch (iconName) {
      case 'shield':
        return <Shield className="w-5 h-5 text-slate-900" />;
      case 'heart':
        return <Heart className="w-5 h-5 text-slate-900" />;
      case 'church':
        return <Church className="w-5 h-5 text-slate-900" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-slate-900" />;
      case 'globe':
        return <Globe className="w-5 h-5 text-slate-900" />;
      case 'book':
        return <BookOpen className="w-5 h-5 text-slate-900" />;
      case 'users':
      default:
        return <Users className="w-5 h-5 text-slate-900" />;
    }
  };

  const handleOpenTypingPrayer = (box: PrayerBoxItem) => {
    setActiveTypingPrayerBox(box);
    setPrayerMessageText('');
    setPrayerSubmittedNotice(false);
  };

  const handleSubmitTypedPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTypingPrayerBox) return;

    const id = activeTypingPrayerBox.id;
    const trimmedMsg = prayerMessageText.trim();
    const author =
      prayerAuthorName.trim() ||
      (language === 'lo' ? 'ຜູ້ຮ່ວມອະທິຖານ' : language === 'th' ? 'ผู้ร่วมอธิษฐาน' : 'Prayer Partner');

    const newComment: TypedPrayerComment | null = trimmedMsg
      ? {
          id: `comment-${Date.now()}`,
          authorName: author,
          message: trimmedMsg,
          createdAt: new Date().toISOString(),
        }
      : null;

    // Mark box as prayed
    setPrayedItems((prev) => {
      const next = { ...prev, [id]: true };
      try {
        localStorage.setItem('hope_bokeo_prayed_items', JSON.stringify(next));
      } catch {}
      return next;
    });

    // Increment count
    const baseCount =
      prayerCounts[id] ??
      activeTypingPrayerBox.count ??
      (id === 'workers' ? 142 : id === 'protection' ? 98 : id === 'provision' ? 126 : 50);
    const nextCount = baseCount + 1;

    setPrayerCounts((prev) => {
      const next = { ...prev, [id]: nextCount };
      try {
        localStorage.setItem('hope_bokeo_prayer_counts', JSON.stringify(next));
      } catch {}
      return next;
    });

    if (newComment) {
      setLocalBoxComments((prev) => {
        const existing = prev[id] || [];
        const next = { ...prev, [id]: [newComment, ...existing] };
        try {
          localStorage.setItem('hope_bokeo_prayer_comments', JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    setPrayerMessageText('');
    setPrayerSubmittedNotice(true);

    // Persist updated count & typed prayer comment to Firestore if handler is available
    if (onSaveHomePoster && homePoster) {
      try {
        const updatedBoxes = activePrayerBoxes.map((b) => {
          if (b.id !== id) return b;
          const existingComments = Array.isArray(b.comments) ? b.comments : [];
          return {
            ...b,
            count: nextCount,
            comments: newComment ? [newComment, ...existingComments] : existingComments,
          };
        });
        await onSaveHomePoster({
          ...homePoster,
          prayerBoxes: updatedBoxes,
        });
      } catch (err) {
        console.warn('Could not sync typed prayer to Firestore:', err);
      }
    }
  };

  const handleTogglePray = (id: string) => {
    const currentlyPrayed = !!prayedItems[id];
    const newPrayedState = !currentlyPrayed;

    setPrayedItems((prev) => {
      const next = { ...prev, [id]: newPrayedState };
      try {
        localStorage.setItem('hope_bokeo_prayed_items', JSON.stringify(next));
      } catch {}
      return next;
    });

    setPrayerCounts((prev) => {
      const matchedBox = activePrayerBoxes.find((b) => b.id === id);
      const currentCount =
        prev[id] ??
        matchedBox?.count ??
        (id === 'workers' ? 142 : id === 'protection' ? 98 : id === 'provision' ? 126 : 85);
      const nextCount = newPrayedState ? currentCount + 1 : Math.max(0, currentCount - 1);
      const next = { ...prev, [id]: nextCount };
      try {
        localStorage.setItem('hope_bokeo_prayer_counts', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Dynamic Poster Height calculation directly linked to user customization from Admin
  const normalizedPosterHeight = useMemo(() => {
    const raw = homePoster?.posterHeight;
    if (raw === undefined || raw === null) return 50;
    const num = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (isNaN(num)) return 50;
    if (num > 100) {
      return Math.round(Math.min(Math.max((num - 180) / 380 * 100, 0), 100));
    }
    return Math.min(Math.max(num, 0), 100);
  }, [homePoster?.posterHeight]);

  const heroHeightMobile = useMemo(() => {
    return Math.round(260 + (normalizedPosterHeight / 100) * 340);
  }, [normalizedPosterHeight]);

  const heroHeightDesktop = useMemo(() => {
    return Math.round(360 + (normalizedPosterHeight / 100) * 400);
  }, [normalizedPosterHeight]);

  const posterImages = useMemo(() => {
    const list: string[] = [];
    if (homePoster?.imageUrls && Array.isArray(homePoster.imageUrls) && homePoster.imageUrls.length > 0) {
      homePoster.imageUrls.forEach((u) => {
        if (u && typeof u === 'string' && u.trim()) {
          list.push(u.trim());
        }
      });
    }
    if (list.length === 0 && homePoster?.imageUrl?.trim()) {
      list.push(homePoster.imageUrl.trim());
    }
    // If empty, provide curated rotating banners so the poster always has a valid visual
    if (list.length === 0) {
      list.push(
        '/uploads/home_poster_banner.jpg',
        '/uploads/5b593987-79b3-4309-ac43-e717cbc3c838_1788761424505_430.jpg',
        '/uploads/551239041_802528468839951_42532514368066_1788761477530_359.jpg'
      );
    }
    return list;
  }, [homePoster?.imageUrls, homePoster?.imageUrl]);

  const [currentPosterIndex, setCurrentPosterIndex] = useState<number>(0);

  // Auto-play continuous slideshow: rotates every 4.5 seconds smoothly
  useEffect(() => {
    if (posterImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPosterIndex((prev) => (prev + 1) % posterImages.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [posterImages.length]);

  // Keep index within array bounds
  useEffect(() => {
    if (currentPosterIndex >= posterImages.length) {
      setCurrentPosterIndex(0);
    }
  }, [posterImages.length, currentPosterIndex]);

  const handlePrevPoster = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (posterImages.length <= 1) return;
    setCurrentPosterIndex((prev) => (prev - 1 + posterImages.length) % posterImages.length);
  };

  const handleNextPoster = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (posterImages.length <= 1) return;
    setCurrentPosterIndex((prev) => (prev + 1) % posterImages.length);
  };

  const getPosterImageStyle = (idx: number) => {
    const custom = homePoster?.imageCustomSettings?.[idx] || {};
    const pos = custom.position || (homePoster?.bgPositions && homePoster.bgPositions[idx]) || homePoster?.bgPosition || 'center center';
    const fit = custom.fit || homePoster?.posterFit || 'cover';
    const scale = custom.scale !== undefined ? custom.scale / 100 : (typeof homePoster?.posterScale === 'number' ? homePoster.posterScale / 100 : 1);
    const brightness = custom.brightness !== undefined ? custom.brightness / 100 : (typeof homePoster?.posterBrightness === 'number' ? homePoster.posterBrightness / 100 : 1);
    const contrast = custom.contrast !== undefined ? custom.contrast / 100 : (typeof homePoster?.posterContrast === 'number' ? homePoster.posterContrast / 100 : 1);
    const saturation = custom.saturation !== undefined ? custom.saturation / 100 : (typeof homePoster?.posterSaturation === 'number' ? homePoster.posterSaturation / 100 : 1);
    const blur = custom.blur !== undefined ? custom.blur : (typeof homePoster?.posterBlur === 'number' ? homePoster.posterBlur : 0);

    return {
      objectFit: fit as any,
      objectPosition: pos,
      transform: scale !== 1 ? `scale(${scale})` : undefined,
      filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) blur(${blur}px)`,
    };
  };

  const heroPosterOverlayOpacity = typeof homePoster?.posterOverlayOpacity === 'number' ? Math.max(0, Math.min(100, homePoster.posterOverlayOpacity)) / 100 : 0.65;

  return (
    <div className="w-full bg-[#faf8f5] dark:bg-slate-950 font-sans selection:bg-[#cc0000] selection:text-white">
      {/* Dynamic CSS injecting precise pixel poster heights from user settings */}
      <style>{`
        .hero-banner-container {
          min-height: ${heroHeightMobile}px !important;
          height: ${heroHeightMobile}px;
        }
        @media (min-width: 640px) {
          .hero-banner-container {
            min-height: ${heroHeightDesktop}px !important;
            height: ${heroHeightDesktop}px;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Customizable Poster with Straight Bottom Border)        */}
      {/* ========================================================================= */}
      {!homePoster?.hidden && !homePoster?.hidePoster && (
        <section className="hero-banner-container relative w-full flex items-center justify-start overflow-hidden bg-slate-950 select-none">
          {/* Hero Background Images Slideshow / Carousel */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            {posterImages.map((imgUrl, idx) => {
              const isActive = idx === currentPosterIndex;
              return (
                <img
                  key={`${imgUrl}-${idx}`}
                  src={imgUrl}
                  alt={`Hope is growing in Bokeo - Banner ${idx + 1}`}
                  className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                    isActive ? 'opacity-100 z-1' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                  style={getPosterImageStyle(idx)}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  onError={handleImageErrorWithFirestore(
                    'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1800'
                  )}
                />
              );
            })}

            {/* Dark Vignette to guarantee pristine text contrast */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent pointer-events-none transition-opacity duration-300 z-2"
              style={{ opacity: heroPosterOverlayOpacity }}
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none transition-opacity duration-300 z-2"
              style={{ opacity: heroPosterOverlayOpacity }}
            />
          </div>

          {/* Hero Content Overlay (Aligned to Left) */}
          {!homePoster?.hideTextOverlay && (
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-16 lg:py-20 flex flex-col justify-center">
              <div className="max-w-2xl space-y-4 sm:space-y-6">

                {/* Main Headline: "Hope is growing in Bokeo." or custom title */}
                <h1 className="text-4xl xs:text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.08] tracking-tight drop-shadow-lg">
                  {(() => {
                    const currentTitle =
                      language === 'en'
                        ? (homePoster?.titleEn || homePoster?.title)
                        : language === 'th'
                        ? (homePoster?.titleTh || homePoster?.title)
                        : homePoster?.title;

                    if (currentTitle && currentTitle.trim()) {
                      if (currentTitle.includes('in Bokeo.') || currentTitle.includes('in Bokeo')) {
                        const parts = currentTitle.split(/(in Bokeo\.?)/);
                        return (
                          <>
                            {parts.map((p, idx) =>
                              p.startsWith('in Bokeo') ? (
                                <React.Fragment key={idx}>
                                  in <span className="text-[#ee1c25]">Bokeo.</span>
                                </React.Fragment>
                              ) : (
                                <span key={idx}>{p}</span>
                              )
                            )}
                          </>
                        );
                      }
                      return currentTitle;
                    }
                    return (
                      <>
                        Hope is growing<br />
                        in <span className="text-[#ee1c25]">Bokeo.</span>
                      </>
                    );
                  })()}
                </h1>

                {/* Subtitle / Tagline */}
                {(() => {
                  const currentSub =
                    language === 'en'
                      ? (homePoster?.subtitleEn || homePoster?.subtitle)
                      : language === 'th'
                      ? (homePoster?.subtitleTh || homePoster?.subtitle)
                      : homePoster?.subtitle;

                  if (currentSub && currentSub.trim()) {
                    return (
                      <div className="text-sm sm:text-base font-bold text-amber-300 drop-shadow-md">
                        {currentSub}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Subtitle Paragraph */}
                <p className="text-slate-100 text-sm sm:text-base lg:text-lg leading-relaxed font-medium max-w-xl drop-shadow-md">
                  {(() => {
                    const currentDesc =
                      language === 'en'
                        ? (homePoster?.descriptionEn || homePoster?.description)
                        : language === 'th'
                        ? (homePoster?.descriptionTh || homePoster?.description)
                        : homePoster?.description;

                    if (currentDesc && currentDesc.trim() && !currentDesc.includes('ຮ່ວມເປັນສ່ວນໜຶ່ງໃນການຂັບເຄື່ອນວຽກງານຂອງພຣະເຈົ້າໃນແຂວງບໍ່ແກ້ວ ໂດຍການຕິດຕາມ')) {
                      return currentDesc;
                    }
                    return language === 'lo'
                      ? 'ຮ່ວມເປັນສ່ວນສຳຄັນໃນການຊຸກຍູ້ພັນທະກິດຂອງພຣະເຈົ້າ ໃນແຂວງບໍ່ແກ້ວ ໂດຍຜ່ານການຕິດຕາມຜົນ, ການອະທິຖານດ້ວຍຄວາມສັດຊື່, ແລະ ການສະໜັບສະໜູນວຽກງານພາກສະໜາມ.'
                      : language === 'th'
                      ? 'เราร่วมมือกับคริสตจักรท้องถิ่นเพื่อประกาศข่าวประเสริฐ สร้างสาวก และเห็นชีวิตเปลี่ยนแปลงไปทั่วแขวงบ่อแก้ว ด้วยฤทธิ์เดชของพระเยซูคริสต์'
                      : 'We partner with local churches to share the gospel, make disciples and see lives transformed across Bokeo Province through the power of Jesus Christ.';
                  })()}
                </p>
              </div>
            </div>
          )}

          {/* 1. "Real People. Real Hope." Strictly Positioned on the Right Side */}
          {!homePoster?.hideRightBadge && (
            <div className="flex flex-col items-center select-none rotate-[-6deg] absolute right-4 sm:right-10 lg:right-16 xl:right-24 bottom-8 sm:bottom-12 lg:bottom-14 z-20 pointer-events-none drop-shadow-2xl">
              <span
                style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
                className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl text-white font-bold tracking-wide whitespace-nowrap"
              >
                {language === 'en'
                  ? (homePoster?.badgeTopTextEn || homePoster?.badgeTopText || 'Real People.')
                  : language === 'th'
                  ? (homePoster?.badgeTopTextTh || homePoster?.badgeTopText || 'Real People.')
                  : (homePoster?.badgeTopText || 'Real People.')}
              </span>
              <span
                style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
                className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl text-white font-bold tracking-wide relative inline-block whitespace-nowrap"
              >
                {language === 'en'
                  ? (homePoster?.badgeBottomTextEn || homePoster?.badgeBottomText || 'Real Hope.')
                  : language === 'th'
                  ? (homePoster?.badgeBottomTextTh || homePoster?.badgeBottomText || 'Real Hope.')
                  : (homePoster?.badgeBottomText || 'Real Hope.')}
                {/* Red brush swoosh underneath */}
                <svg
                  className="w-full h-3 sm:h-4.5 -mt-1 text-[#ee1c25]"
                  viewBox="0 0 120 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M 4 9 C 35 15, 85 14, 116 3"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </div>
          )}

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

      {/* 1.1 Upcoming Event Poster (If configured) */}
      {!homePoster?.hideUpcomingEvent && homePoster?.upcomingEventTitle && (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-1">
          <UpcomingEventPoster
            homePoster={homePoster}
            language={language}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. IMPACT STATS RIBBON (Linked Directly to Insights / ຂໍ້ມູນເຊິງເລິກ)     */}
      {/* ========================================================================= */}
      <section
        id="impact-stats-ribbon"
        className="relative z-20 w-full bg-[#faf8f5] dark:bg-slate-950 pt-1 pb-1 sm:pt-2 sm:pb-1.5"
      >
        <div
          onClick={() => onNavigateToDashboard && onNavigateToDashboard()}
          className="max-w-7xl mx-auto px-1.5 sm:px-6 lg:px-8 cursor-pointer group"
          title={language === 'lo' ? 'ຄລິກເພື່ອເບິ່ງຂໍ້ມູນເຊິງເລິກທັງໝົດ' : 'Click to view full Insights dashboard'}
        >
          <div className="bg-[#faf8f5] dark:bg-slate-900/90 py-2 sm:py-3 px-1 sm:px-6">
            <div className="grid grid-cols-5 gap-1 sm:gap-3 items-center">
              {/* Stat 1: Churches */}
              <div className="flex items-center gap-1 sm:gap-2.5 md:gap-3 px-0.5 sm:px-2 md:px-4 justify-center md:justify-start min-w-0">
                <div className="shrink-0 text-[#ee1c25] group-hover:scale-110 transition-transform">
                  <Church className="w-4 h-4 sm:w-7 sm:h-7 md:w-9 md:h-9 stroke-[1.8]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-xl md:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-none truncate">
                    {computedStats.churches}
                  </span>
                  <span className="text-[9px] sm:text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight truncate">
                    {language === 'lo' ? 'ຄຣິດຕະຈັກ' : language === 'th' ? 'คริสตจักร' : 'Churches'}
                  </span>
                </div>
              </div>

              {/* Stat 2: Heard the Gospel */}
              <div className="flex items-center gap-1 sm:gap-2.5 md:gap-3 px-0.5 sm:px-2 md:px-4 justify-center md:justify-start min-w-0">
                <div className="shrink-0 text-[#ee1c25] group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4 sm:w-7 sm:h-7 md:w-9 md:h-9 stroke-[1.8]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-xl md:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-none truncate">
                    {computedStats.gospelHeard}
                  </span>
                  <span className="text-[9px] sm:text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight truncate">
                    {language === 'lo' ? 'ໄດ້ຍິນຂ່າວປະເສີດ' : language === 'th' ? 'ได้ยินข่าวประเสริฐ' : 'Heard the Gospel'}
                  </span>
                </div>
              </div>

              {/* Stat 3: Believers */}
              <div className="flex items-center gap-1 sm:gap-2.5 md:gap-3 px-0.5 sm:px-2 md:px-4 justify-center md:justify-start min-w-0">
                <div className="shrink-0 text-[#ee1c25] group-hover:scale-110 transition-transform">
                  <Heart className="w-4 h-4 sm:w-7 sm:h-7 md:w-9 md:h-9 stroke-[1.8]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-xl md:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-none truncate">
                    {computedStats.believers}
                  </span>
                  <span className="text-[9px] sm:text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight truncate">
                    {language === 'lo' ? 'ຜູ້ເຊື່ອໃໝ່' : language === 'th' ? 'ผู้เชื่อ' : 'Believers'}
                  </span>
                </div>
              </div>

              {/* Stat 4: Baptized */}
              <div className="flex items-center gap-1 sm:gap-2.5 md:gap-3 px-0.5 sm:px-2 md:px-4 justify-center md:justify-start min-w-0">
                <div className="shrink-0 text-[#ee1c25] group-hover:scale-110 transition-transform">
                  <Droplets className="w-4 h-4 sm:w-7 sm:h-7 md:w-9 md:h-9 stroke-[1.8]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-xl md:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-none truncate">
                    {computedStats.baptized}
                  </span>
                  <span className="text-[9px] sm:text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight truncate">
                    {language === 'lo' ? 'ຮັບບັບຕິສະມາ' : language === 'th' ? 'รับบัพติศมา' : 'Baptized'}
                  </span>
                </div>
              </div>

              {/* Stat 5: Worshippers */}
              <div className="flex items-center gap-1 sm:gap-2.5 md:gap-3 px-0.5 sm:px-2 md:px-4 justify-center md:justify-start min-w-0">
                <div className="shrink-0 text-[#ee1c25] group-hover:scale-110 transition-transform">
                  <UsersRound className="w-4 h-4 sm:w-7 sm:h-7 md:w-9 md:h-9 stroke-[1.8]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-xl md:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-none truncate">
                    {computedStats.worshippers}
                  </span>
                  <span className="text-[9px] sm:text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight truncate">
                    {language === 'lo' ? 'ສະມາຊິກນະມັດສະການ' : language === 'th' ? 'ผู้นมัสการ' : 'Worshippers'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. "WHERE GOD IS WORKING" (Communities, Churches. Lasting Change.)        */}
      {/* ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Column: Heading, Subtitle & Action */}
          <div className="lg:col-span-3 xl:col-span-3 space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-1.5 text-[#ee1c25] text-xs font-black tracking-widest uppercase">
              <MapPin className="w-3.5 h-3.5 text-[#ee1c25] fill-[#ee1c25]/20 shrink-0" />
              <span>
                {language === 'lo'
                  ? (homePoster?.mapSectionBadge || 'WHERE GOD IS WORKING')
                  : language === 'th'
                  ? (homePoster?.mapSectionBadgeTh || 'WHERE GOD IS WORKING')
                  : (homePoster?.mapSectionBadgeEn || 'WHERE GOD IS WORKING')}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight whitespace-pre-line">
              {language === 'lo' && homePoster?.mapSectionTitle
                ? homePoster.mapSectionTitle
                : language === 'th' && homePoster?.mapSectionTitleTh
                ? homePoster.mapSectionTitleTh
                : homePoster?.mapSectionTitleEn || 'Communities, Churches.\nLasting Change.'}
            </h2>

            {!homePoster?.hideMapSectionDesc && (
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm lg:text-base leading-relaxed">
                {language === 'lo'
                  ? (homePoster?.mapSectionDesc ||
                      'ຈາກການປະກາດຂ່າວປະເສີດໃນໝູ່ບ້ານສູ່ການບຸກເບີກຄຣິດຕະຈັກ, ພຣະເຈົ້າກຳລັງເຄື່ອນໄຫວທົ່ວແຂວງບໍ່ແກ້ວ. ສຳຫຼວດສະຖານທີ່, ຜູ້ຄົນ ແລະ ພັນທະກິດທີ່ສ້າງຄວາມແຕກຕ່າງ.')
                  : language === 'th'
                  ? (homePoster?.mapSectionDescTh ||
                      'จากการประกาศข่าวประเสริฐในหมู่บ้านสู่การบุกเบิกคริสตจักร พระเจ้ากำลังเคลื่อนไหวทั่วแขวงบ่อแก้ว สำรวจสถานที่ ผู้คน และพันธกิจที่สร้างความเปลี่ยนแปลง')
                  : (homePoster?.mapSectionDescEn ||
                      'From village evangelism to church planting, God is at work across Bokeo Province. Explore the places, people and ministries making a difference.')}
              </p>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToMap) {
                    onNavigateToMap();
                  } else if (onNavigateToDashboard) {
                    onNavigateToDashboard();
                  }
                }}
                className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-full border border-red-500/80 bg-white dark:bg-slate-900 text-[#cc0000] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>
                  {language === 'lo'
                    ? (homePoster?.mapSectionButtonText || 'ເບິ່ງສະຖານທີ່ທັງໝົດ')
                    : language === 'th'
                    ? (homePoster?.mapSectionButtonTextTh || 'ดูสถานที่ทั้งหมด')
                    : (homePoster?.mapSectionButtonTextEn || 'View All Locations')}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Center Column: REAL Bokeo Province Map with Single Authentic Google Maps Boundary, District Labels, and Tiny Red Church Dots */}
          <div className="lg:col-span-5 xl:col-span-5 relative flex items-center justify-center min-h-[300px] sm:min-h-[360px] lg:min-h-[400px] bg-transparent p-0 border-0 shadow-none overflow-hidden select-none">
            <RealBokeoMap
              churchLocations={churchLocations}
              activeLocationId={activeLocationId}
              onSelectLocation={(id) => {
                setActiveLocationId(id);
              }}
              language={language}
            />
          </div>

          {/* Right Column: Church Cards */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-2.5 lg:pl-1 lg:pr-3">
            {churchLocations.slice(0, 4).map((loc) => {
              const isActive = activeLocationId === loc.id;
              const displayTitle = language === 'lo' ? loc.nameLo : language === 'th' ? loc.nameTh : loc.name;
              const displayDesc = language === 'lo' ? loc.descLo : language === 'th' ? loc.descTh : loc.desc;

              return (
                <div
                  key={loc.id}
                  onClick={() => {
                    setActiveLocationId(loc.id);
                  }}
                  className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 flex items-stretch justify-between cursor-pointer shadow-xs h-[84px] sm:h-[88px] ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 border-red-500/80 shadow-md ring-1 ring-red-400/30'
                      : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                  }`}
                >
                  {/* Left: Strictly Uniform Fixed-Size Photo across all cards (ຂະໜາດຮູບເທົ່າກັນໝົດ 100%) */}
                  <div className="w-28 sm:w-32 h-full shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                    <img
                      src={loc.imageUrl}
                      alt={displayTitle}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      onError={handleImageErrorWithFirestore(
                        'https://images.unsplash.com/photo-1548625361-188683526017?q=80&w=400'
                      )}
                    />
                  </div>

                  {/* Middle: Content */}
                  <div className="flex-1 min-w-0 px-3.5 py-2 sm:py-2.5 flex flex-col justify-center pr-4">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-red-700 transition-colors">
                      {displayTitle}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight mt-0.5">
                      {displayDesc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. STORIES FROM THE FIELD SECTION (Exact Card Grid from Mockup)         */}
      {/* ========================================================================= */}
      <section id="field-stories-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 sm:pt-5 sm:pb-7">
        {/* Header with Title, Subtitle, CTA and Carousel arrows */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 mb-4 sm:mb-5">
          <div className="max-w-2xl space-y-2">
            {/* Red Uppercase Kicker */}
            <div className="text-[#ee1c25] text-xs font-black tracking-widest uppercase">
              {language === 'lo'
                ? (homePoster?.storiesBadgeText || 'ເລື່ອງລາວຈາກພາກສະໜາມ')
                : language === 'th'
                ? (homePoster?.storiesBadgeTextTh || 'เรื่องราวจากภาคสนาม')
                : (homePoster?.storiesBadgeTextEn || 'STORIES FROM THE FIELD')}
            </div>

            {/* Main Section Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'lo' && homePoster?.storiesTitle
                ? homePoster.storiesTitle
                : language === 'th' && homePoster?.storiesTitleTh
                ? homePoster.storiesTitleTh
                : homePoster?.storiesTitleEn || 'Real People. Real Hope.'}
            </h2>

            {/* Description */}
            {!homePoster?.hideStoriesDesc && (
              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-normal pt-1">
                {language === 'lo'
                  ? (homePoster?.storiesDesc ||
                      'ທຸກໆເລື່ອງລາວເປັນສິ່ງເຕືອນໃຈວ່າ ພຣະເຈົ້າກຳລັງເຄື່ອນໄຫວໃນບໍ່ແກ້ວ — ໃນຊີວິດຂອງເດັກນ້ອຍ, ຄອບຄົວ ແລະ ຊຸມຊົນທັງໝົດ.')
                  : language === 'th'
                  ? (homePoster?.storiesDescTh ||
                      'ทุกๆ เรื่องราวคือเครื่องเตือนใจว่าพระเจ้ากำลังเคลื่อนไหวในบ่อแก้ว — ในชีวิตของเด็กๆ ครอบครัว และชุมชนทั้งหมด')
                  : (homePoster?.storiesDescEn ||
                      'Every story is a reminder that God is moving in Bokeo — in the lives of children, families and entire communities.')}
              </p>
            )}
          </div>
        </div>

        {/* 4 Story Cards Grid */}
        <div id="field-stories-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {storyItems.map((item) => {
            const displayCat = language === 'lo' ? item.categoryLo : language === 'th' ? item.categoryTh : item.category;
            const displayTitle = language === 'lo' ? item.titleLo : language === 'th' ? item.titleTh : item.title;
            const displayExcerpt = language === 'lo' ? item.excerptLo : language === 'th' ? item.excerptTh : item.excerpt;

            return (
              <article
                key={item.id}
                onClick={() => handleOpenStory(item)}
                className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer"
              >
                {/* Story Image */}
                <div className="w-full h-48 sm:h-52 overflow-hidden relative bg-slate-100 dark:bg-slate-800 shrink-0">
                  <img
                    src={item.imageUrl}
                    alt={displayTitle}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={handleImageErrorWithFirestore(
                      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=800'
                    )}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Story Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {/* Story Title */}
                    <h3 className="font-bold sm:font-black text-slate-900 dark:text-white text-base leading-snug group-hover:text-[#cc0000] transition-colors">
                      {displayTitle}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed line-clamp-3">
                      {displayExcerpt}
                    </p>
                  </div>

                  {/* Read More Link */}
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#cc0000] dark:text-red-400 group-hover:translate-x-1 transition-transform">
                      <span>{language === 'lo' ? 'ອ່ານເພີ່ມເຕີມ' : language === 'th' ? 'อ่านเพิ่มเติม' : 'Read More'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. WILL YOU PRAY WITH US? (PRAYER NEEDS BANNER - Mekong Sunset Landscape) */}
      {/* ========================================================================= */}
      {!homePoster?.hidePrayerSection && (
        <section className="relative w-full overflow-hidden bg-slate-950 py-10 sm:py-12 lg:py-14 text-white select-none">
          {/* Full panoramic sunset background image */}
          <div className="absolute inset-0 z-0">
            <img
              src={
                homePoster?.prayerBgImageUrl?.trim() ||
                '/uploads/d1ff2c16-9f00-4563-a7e3-a34ec0649a7f_1788761811029_129.jpg'
              }
              alt="Mekong River Sunset in Bokeo"
              className="w-full h-full object-cover object-center brightness-75 contrast-110"
              onError={handleImageErrorWithFirestore(
                'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1600'
              )}
            />
            {/* Subtle dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/40 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30 pointer-events-none" />
          </div>

          {/* Content Container */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
            {/* Left Side: Prayer Needs Callout */}
            <div className="max-w-xl space-y-2.5 sm:space-y-3">
              <div className="inline-flex items-center gap-1.5 text-[#ee1c25] text-xs font-black tracking-widest uppercase">
                <span className="text-sm">🙏</span>
                <span>
                  {language === 'lo'
                    ? (homePoster?.prayerBadgeText || 'ຫົວຂໍ້ອະທິຖານ')
                    : language === 'th'
                    ? (homePoster?.prayerBadgeTextTh || homePoster?.prayerBadgeText || 'หัวข้ออธิษฐาน')
                    : (homePoster?.prayerBadgeTextEn || homePoster?.prayerBadgeText || 'PRAYER NEEDS')}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md leading-tight">
                {language === 'lo'
                  ? (homePoster?.prayerTitle || 'ທ່ານຈະຮ່ວມອະທິຖານກັບພວກເຮົາບໍ?')
                  : language === 'th'
                  ? (homePoster?.prayerTitleTh || homePoster?.prayerTitle || 'คุณจะร่วมอธิษฐานกับเราไหม?')
                  : (homePoster?.prayerTitleEn || homePoster?.prayerTitle || 'Will you pray with us?')}
              </h2>

              <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-normal">
                {language === 'lo'
                  ? (homePoster?.prayerSubtitle || 'ນີ້ແມ່ນຫົວຂໍ້ອະທິຖານອັນຮີບດ່ວນໃນແຂວງບໍ່ແກ້ວເວລານີ້.')
                  : language === 'th'
                  ? (homePoster?.prayerSubtitleTh || homePoster?.prayerSubtitle || 'นี่คือหัวข้ออธิษฐานเร่งด่วนในบ่อแก้วในเวลานี้')
                  : (homePoster?.prayerSubtitleEn || homePoster?.prayerSubtitle || 'Here are a few urgent needs in Bokeo right now.')}
              </p>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsPrayerModalOpen(true)}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#cc0000] hover:bg-[#b30000] text-white text-xs sm:text-sm font-black shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 cursor-pointer active:scale-95 group"
                >
                  <span>
                    {language === 'lo'
                      ? (homePoster?.prayerButtonText || 'ເບິ່ງຫົວຂໍ້ອະທິຖານ →')
                      : language === 'th'
                      ? (homePoster?.prayerButtonTextTh || homePoster?.prayerButtonText || 'ดูหัวข้ออธิษฐาน →')
                      : (homePoster?.prayerButtonTextEn || homePoster?.prayerButtonText || 'View Prayer Needs →')}
                  </span>
                </button>
              </div>
            </div>

            {/* Right Side: Dynamic Floating Prayer Boxes (Click to pop up Typing Prayer) */}
            {activePrayerBoxes.length > 0 && (
              <div
                className={`grid grid-cols-1 ${
                  activePrayerBoxes.length === 1
                    ? 'sm:grid-cols-1 lg:max-w-xs'
                    : activePrayerBoxes.length === 2
                    ? 'sm:grid-cols-2 lg:max-w-xl'
                    : 'sm:grid-cols-3 lg:max-w-2xl'
                } gap-3 sm:gap-3.5 w-full`}
              >
                {activePrayerBoxes.map((box) => {
                  const isPrayed = Boolean(prayedItems[box.id]);
                  const boxTitle =
                    language === 'lo'
                      ? box.title
                      : language === 'th'
                      ? (box.titleTh || box.title)
                      : (box.titleEn || box.title);
                  const boxSubtitle =
                    language === 'lo'
                      ? box.subtitle
                      : language === 'th'
                      ? (box.subtitleTh || box.subtitle)
                      : (box.subtitleEn || box.subtitle);
                  const currentCount =
                    prayerCounts[box.id] ??
                    box.count ??
                    (box.id === 'workers' ? 142 : box.id === 'protection' ? 98 : box.id === 'provision' ? 126 : 50);

                  return (
                    <div
                      key={box.id}
                      onClick={() => handleOpenTypingPrayer(box)}
                      className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl backdrop-blur-md border transition-all duration-300 flex flex-col items-center justify-between text-center cursor-pointer shadow-lg active:scale-98 min-h-[165px] sm:min-h-[175px] group ${
                        isPrayed
                          ? 'bg-emerald-950/75 border-emerald-500/70 text-emerald-200 ring-1 ring-emerald-500/40'
                          : 'bg-black/50 hover:bg-black/65 border-white/20 text-white'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                        {isPrayed ? (
                          <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
                        ) : (
                          renderPrayerBoxIcon(box.icon)
                        )}
                      </div>
                      <div className="space-y-0.5 my-1.5">
                        <h4 className="text-xs sm:text-sm font-bold leading-snug">
                          {boxTitle}
                        </h4>
                        <p className="text-[11px] text-slate-300">
                          {boxSubtitle}
                        </p>
                      </div>

                      {/* Bottom: Number of people praying */}
                      <div className="w-full pt-2 border-t border-white/10 flex items-center justify-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold transition-all ${
                            isPrayed
                              ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50'
                              : 'bg-white/10 text-slate-200 border border-white/15 hover:bg-white/15'
                          }`}
                        >
                          <span className="font-black text-amber-300">
                            {currentCount}
                          </span>
                          <span className="text-[10px] text-slate-200">
                            {language === 'lo'
                              ? (homePoster?.prayerPrayingCountSuffix || 'ຄົນກຳລັງອະທິຖານ')
                              : language === 'th'
                              ? (homePoster?.prayerPrayingCountSuffixTh || homePoster?.prayerPrayingCountSuffix || 'คนกำลังอธิษฐาน')
                              : (homePoster?.prayerPrayingCountSuffixEn || homePoster?.prayerPrayingCountSuffix || 'praying')}
                          </span>
                          {isPrayed && <span className="text-[9px] text-emerald-300 font-bold">✓</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 6. INTERACTIVE MODALS (Video, Prayer, Village, Event Report)             */}
      {/* ========================================================================= */}

      {/* Video Modal: "Watch Our Story" */}
      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-[#cc0000]" />
                <h3 className="font-bold text-white text-sm">
                  {language === 'lo' ? 'ເລື່ອງລາວພັນທະກິດ Hope Bokeo' : 'Hope Bokeo Ministry Story'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={getEmbedUrl(videoUrl)}
                title="Hope Bokeo Story Video"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Typing Prayer Popup Modal (Opens when clicking any Prayer Box) */}
      {activeTypingPrayerBox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setActiveTypingPrayerBox(null)}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[78vh] my-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-5 pt-4 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-100 dark:border-red-900/50 flex items-center justify-center shrink-0 text-[#cc0000]">
                  {renderPrayerBoxIcon(activeTypingPrayerBox.icon)}
                </div>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#cc0000] dark:text-red-400">
                      🙏 {language === 'lo' ? 'ຮ່ວມພິມຄຳອະທິຖານ' : language === 'th' ? 'ร่วมพิมพ์คำอธิษฐาน' : 'Join in Prayer'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                      {prayerCounts[activeTypingPrayerBox.id] ?? activeTypingPrayerBox.count ?? 50}{' '}
                      {language === 'lo'
                        ? (homePoster?.prayerPrayingCountSuffix || 'ຄົນກຳລັງອະທິຖານ')
                        : language === 'th'
                        ? (homePoster?.prayerPrayingCountSuffixTh || 'คนกำลังอธิษฐาน')
                        : (homePoster?.prayerPrayingCountSuffixEn || 'praying')}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {language === 'lo'
                      ? activeTypingPrayerBox.title
                      : language === 'th'
                      ? (activeTypingPrayerBox.titleTh || activeTypingPrayerBox.title)
                      : (activeTypingPrayerBox.titleEn || activeTypingPrayerBox.title)}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {language === 'lo'
                      ? activeTypingPrayerBox.subtitle
                      : language === 'th'
                      ? (activeTypingPrayerBox.subtitleTh || activeTypingPrayerBox.subtitle)
                      : (activeTypingPrayerBox.subtitleEn || activeTypingPrayerBox.subtitle)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTypingPrayerBox(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="px-4 sm:px-5 py-3.5 space-y-3 overflow-y-auto">
              {/* Optional Prayer Prompt Description */}
              {(activeTypingPrayerBox.desc || activeTypingPrayerBox.descEn || activeTypingPrayerBox.descTh) && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {language === 'lo'
                    ? activeTypingPrayerBox.desc
                    : language === 'th'
                    ? (activeTypingPrayerBox.descTh || activeTypingPrayerBox.desc)
                    : (activeTypingPrayerBox.descEn || activeTypingPrayerBox.desc)}
                </div>
              )}

              {/* Typing Prayer Form */}
              <form onSubmit={handleSubmitTypedPrayer} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'lo'
                      ? 'ຊື່ຂອງທ່ານ (ບໍ່ບັງຄັບ)'
                      : language === 'th'
                      ? 'ชื่อของคุณ (ไม่บังคับ)'
                      : 'Your Name (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={prayerAuthorName}
                    onChange={(e) => setPrayerAuthorName(e.target.value)}
                    placeholder={
                      language === 'lo'
                        ? 'ຕົວຢ່າງ: ພີ່ນ້ອງຈາກວຽງຈັນ...'
                        : language === 'th'
                        ? 'ตัวอย่าง: พี่น้องผู้ร่วมอธิษฐาน...'
                        : 'e.g., A brother/sister in Christ...'
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'lo'
                      ? 'ພິມຄຳອະທິຖານຂອງທ່ານທີ່ນີ້'
                      : language === 'th'
                      ? 'พิมพ์คำอธิษฐานของคุณที่นี่'
                      : 'Type Your Prayer Here'}
                  </label>
                  <textarea
                    rows={2}
                    autoFocus
                    value={prayerMessageText}
                    onChange={(e) => setPrayerMessageText(e.target.value)}
                    placeholder={
                      language === 'lo'
                        ? 'ຂໍພຣະເຈົ້າຊົງອວຍພອນ ແລະ ນຳພາພັນທະກິດໃນຫົວຂໍ້ນີ້...'
                        : language === 'th'
                        ? 'ขอพระเจ้าทรงอวยพรและนำพันธกิจในหัวข้อนี้...'
                        : 'Lord, we lift up this need in Bokeo to You...'
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none resize-none"
                  />
                </div>

                {prayerSubmittedNotice && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold flex items-center gap-2 animate-fade-in">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {language === 'lo'
                        ? 'ຂອບໃຈທີ່ຮ່ວມອະທິຖານ! ຄຳອະທິຖານຂອງທ່ານຖືກບັນທຶກແລ້ວ.'
                        : language === 'th'
                        ? 'ขอบคุณที่ร่วมอธิษฐาน! คำอธิษฐานของคุณถูกบันทึกแล้ว'
                        : 'Thank you for praying! Your prayer has been recorded.'}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleTogglePray(activeTypingPrayerBox.id);
                      setPrayerSubmittedNotice(true);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                      prayedItems[activeTypingPrayerBox.id]
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {prayedItems[activeTypingPrayerBox.id]
                        ? language === 'lo'
                          ? 'ອະທິຖານແລ້ວ ✓'
                          : 'Prayed ✓'
                        : language === 'lo'
                        ? 'ກົດຮ່ວມອະທິຖານ'
                        : 'Quick Pray'}
                    </span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 rounded-xl bg-[#cc0000] hover:bg-[#b30000] text-white text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {language === 'lo'
                        ? 'ສົ່ງຄຳອະທິຖານ'
                        : language === 'th'
                        ? 'ส่งคำอธิษฐาน'
                        : 'Send Prayer'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Recent Typed Prayers for this Box */}
              {(() => {
                const boxId = activeTypingPrayerBox.id;
                const fromPoster =
                  activePrayerBoxes.find((b) => b.id === boxId)?.comments || [];
                const fromLocal = localBoxComments[boxId] || [];
                const mergedMap = new Map<string, TypedPrayerComment>();
                [...fromLocal, ...fromPoster].forEach((c) => {
                  if (c && c.id && !mergedMap.has(c.id)) {
                    mergedMap.set(c.id, c);
                  }
                });
                const allComments = Array.from(mergedMap.values());

                if (allComments.length === 0) return null;

                return (
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                      <MessageSquare className="w-3.5 h-3.5 text-[#cc0000]" />
                      <span>
                        {language === 'lo'
                          ? `ຄຳອະທິຖານຈາກພີ່ນ້ອງ (${allComments.length})`
                          : language === 'th'
                          ? `คำอธิษฐานจากพี่น้อง (${allComments.length})`
                          : `Prayers from Partners (${allComments.length})`}
                      </span>
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                      {allComments.map((c) => (
                        <div
                          key={c.id}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              🙏 {c.authorName || 'Prayer Partner'}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                            {c.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Prayer Needs Modal */}
      {isPrayerModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsPrayerModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[80vh] my-auto flex flex-col p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🙏</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {language === 'lo'
                      ? (homePoster?.prayerModalTitle || 'ຫົວຂໍ້ອະທິຖານເພື່ອແຂວງບໍ່ແກ້ວ')
                      : language === 'th'
                      ? (homePoster?.prayerModalTitleTh || homePoster?.prayerModalTitle || 'หัวข้ออธิษฐานเพื่อแขวงบ่อแก้ว')
                      : (homePoster?.prayerModalTitleEn || homePoster?.prayerModalTitle || 'Prayer Needs for Bokeo')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'lo'
                      ? (homePoster?.prayerModalSubtitle || 'ຮ່ວມອະທິຖານ ແລະ ກົດຖືກໃຈເພື່ອຮ່ວມອະທິຖານ')
                      : language === 'th'
                      ? (homePoster?.prayerModalSubtitleTh || homePoster?.prayerModalSubtitle || 'ร่วมอธิษฐาน และกดถูกใจเพื่อร่วมอธิษฐาน')
                      : (homePoster?.prayerModalSubtitleEn || homePoster?.prayerModalSubtitle || 'Stand in faith with our local field team')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrayerModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {(
                homePoster?.prayerModalItems &&
                Array.isArray(homePoster.prayerModalItems) &&
                homePoster.prayerModalItems.length > 0
                  ? homePoster.prayerModalItems
                  : [
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
                    ]
              ).map((p) => {
                const isPrayed = prayedItems[p.id];
                const displayTitle =
                  language === 'lo'
                    ? p.title
                    : language === 'th'
                    ? (p.titleTh || p.title)
                    : (p.titleEn || p.title);
                const displayDesc =
                  language === 'lo'
                    ? p.desc
                    : language === 'th'
                    ? (p.descTh || p.desc)
                    : (p.descEn || p.desc);
                const suffix =
                  language === 'lo'
                    ? (homePoster?.prayerPrayingCountSuffix || 'ຄົນກຳລັງອະທິຖານ')
                    : language === 'th'
                    ? (homePoster?.prayerPrayingCountSuffixTh || homePoster?.prayerPrayingCountSuffix || 'คนกำลังอธิษฐาน')
                    : (homePoster?.prayerPrayingCountSuffixEn || homePoster?.prayerPrayingCountSuffix || 'praying');

                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{displayTitle}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                          {prayerCounts[p.id] ?? (p.count ?? (p.id === 'workers' ? 142 : p.id === 'protection' ? 98 : p.id === 'provision' ? 126 : 85))} {suffix}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{displayDesc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePray(p.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isPrayed
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-red-50 dark:bg-red-950/50 text-[#cc0000] border border-red-200 dark:border-red-800 hover:bg-[#cc0000] hover:text-white'
                      }`}
                    >
                      {isPrayed ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{language === 'lo' ? 'ອະທິຖານແລ້ວ' : 'Praying'}</span>
                        </>
                      ) : (
                        <>
                          <Heart className="w-3.5 h-3.5 text-red-500" />
                          <span>{language === 'lo' ? 'ຮ່ວມອະທິຖານ' : 'Pray'}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsPrayerModalOpen(false)}
                className="px-6 py-2.5 rounded-full bg-[#cc0000] text-white text-xs font-bold shadow-md hover:bg-[#b30000] transition cursor-pointer"
              >
                {language === 'lo' ? 'ປິດ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Village Details Preview Modal */}
      {selectedVillagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedVillagePreview(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-none overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-700 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Church className="w-5 h-5 text-[#cc0000]" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedVillagePreview.name} ({selectedVillagePreview.nameEn || 'Village'})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVillagePreview(null)}
                className="w-8 h-8 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedVillagePreview.imageUrl && (
              <img
                src={selectedVillagePreview.imageUrl}
                alt={selectedVillagePreview.name}
                className="w-full h-48 object-cover rounded-none border border-slate-200 dark:border-slate-800"
              />
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-none bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Heard</span>
                <span className="text-base font-black text-slate-900 dark:text-white">{selectedVillagePreview.heard || 0}</span>
              </div>
              <div className="p-2.5 rounded-none bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Believers</span>
                <span className="text-base font-black text-[#cc0000]">{selectedVillagePreview.believers || 0}</span>
              </div>
              <div className="p-2.5 rounded-none bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Baptized</span>
                <span className="text-base font-black text-blue-600">{selectedVillagePreview.baptized || 0}</span>
              </div>
              <div className="p-2.5 rounded-none bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Worshippers</span>
                <span className="text-base font-black text-emerald-600">{selectedVillagePreview.attending || 0}</span>
              </div>
            </div>

            {selectedVillagePreview.notes && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                {selectedVillagePreview.notes}
              </p>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedVillagePreview(null);
                  if (onNavigateToDashboard) onNavigateToDashboard();
                }}
                className="text-xs font-bold text-[#cc0000] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{language === 'lo' ? 'ເປີດໃນແຜນທີ່ & ດາສບອດ →' : 'View in GIS Dashboard →'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedVillagePreview(null)}
                className="px-5 py-2 rounded-none bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                {language === 'lo' ? 'ປິດ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Story Detail Report Modal */}
      <EventReportModal
        event={selectedReportEvent}
        isOpen={Boolean(selectedReportEvent)}
        onClose={() => setSelectedReportEvent(null)}
        language={language}
        isAdmin={false}
        onEventUpdated={(updatedEv) => {
          setSelectedReportEvent(updatedEv);
        }}
      />
    </div>
  );
};

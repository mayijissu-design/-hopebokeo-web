import React, { useState, useMemo, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Video,
  FileText,
  Share2,
  Printer,
  MapPin,
  Image as ImageIcon,
  Maximize2,
  Clock,
  Sparkles,
  Layers,
  ArrowLeft,
  Search,
  Filter,
  Users,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  Tag,
  ExternalLink,
  Upload,
  Edit2,
  Globe,
  Download,
} from 'lucide-react';
import { EventData, MonthlyReportItem, Language } from '../types';
import { formatDateRange } from '../utils/dateFormatter';
import { cleanRichHtml, RichTextEditor } from './RichTextEditor';
import { MultiImageUploader } from './MultiImageUploader';
import { saveEventToFirestore } from '../lib/firestore-service';
import { uploadFileDirectly } from '../utils/fileUploader';
import { ReportDocumentViewer } from './ReportDocumentViewer';
import { PdfThumbnail } from './PdfThumbnail';

interface EventReportModalProps {
  event: EventData | null;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onEventUpdated?: (updatedEvent: EventData) => void;
  isAdmin?: boolean;
}

// Error boundary to prevent any blank screen crashes
class ReportErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void; language: Language },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onClose: () => void; language: Language }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Report modal error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const errorContent = (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-950 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {this.props.language === 'lo' ? 'ເກີດຂໍ້ຜິດພາດໃນການສະແດງລາຍງານ' : 'Unable to render report'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {this.props.language === 'lo'
                ? 'ກະລຸນາກົດປຸ່ມຍ້ອນກັບເພື່ອໄປໜ້າຫຼັກ'
                : 'An unexpected issue occurred. Please go back to the home screen.'}
            </p>
            <button
              onClick={this.props.onClose}
              className="p-3 bg-[#cc0000] text-white font-black rounded-xl shadow-md hover:bg-red-700 transition flex items-center justify-center mx-auto cursor-pointer active:scale-95"
              title={this.props.language === 'lo' ? 'ຍ້ອນກັບໜ້າຫຼັກ' : 'Back to Home'}
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      );
      return typeof document !== 'undefined' ? createPortal(errorContent, document.body) : errorContent;
    }
    return this.props.children;
  }
}

export const EventReportModal: React.FC<EventReportModalProps> = (props) => {
  if (!props.isOpen || !props.event) return null;

  const content = (
    <ReportErrorBoundary onClose={props.onClose} language={props.language}>
      <EventReportModalContent {...props} />
    </ReportErrorBoundary>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

const EventReportModalContent: React.FC<EventReportModalProps> = ({
  event: initialEvent,
  isOpen,
  onClose,
  language,
  onEventUpdated,
  isAdmin = false,
}) => {
  const [currentEvent, setCurrentEvent] = useState<EventData | null>(initialEvent);
  const [activeImgIndex, setActiveImgIndex] = useState<number>(0);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedSubReportId, setExpandedSubReportId] = useState<string | null>(null);

  // Sub-report editor / creator state
  const [isSubReportModalOpen, setIsSubReportModalOpen] = useState(false);
  const [editingSubReport, setEditingSubReport] = useState<MonthlyReportItem | null>(null);
  const [subReportForm, setSubReportForm] = useState<Partial<MonthlyReportItem>>({
    month: new Date().toISOString().substring(0, 7),
    date: new Date().toISOString().split('T')[0],
    endDate: '',
    title: '',
    titleEn: '',
    titleTh: '',
    summary: '',
    summaryEn: '',
    summaryTh: '',
    imageUrls: [],
    location: '',
    attendees: 0,
    baptized: 0,
    believers: 0,
    videoUrl: '',
    docUrl: '',
  });
  const [subReportImages, setSubReportImages] = useState<string[]>([]);
  const [isSavingSubReport, setIsSavingSubReport] = useState(false);
  const [subReportLangTab, setSubReportLangTab] = useState<Language>('lo');
  const [isUploadingSubPdf, setIsUploadingSubPdf] = useState(false);
  const [subReportPdfName, setSubReportPdfName] = useState<string | null>(null);
  const [subReportDocs, setSubReportDocs] = useState<string[]>([]);

  // Main topic narrative quick-edit modal state for Admin
  const [isEditingMainNarrative, setIsEditingMainNarrative] = useState(false);
  const [mainNarrativeEdit, setMainNarrativeEdit] = useState({
    description: '',
    descriptionTh: '',
    descriptionEn: '',
  });
  const [mainNarrativeLangTab, setMainNarrativeLangTab] = useState<Language>('lo');
  const [isSavingMainNarrative, setIsSavingMainNarrative] = useState(false);

  const subReportPdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentEvent(initialEvent);
  }, [initialEvent]);

  // ESC key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSubReportModalOpen) {
          setIsSubReportModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubReportModalOpen, onClose]);

  // Strictly ONLY include sub-reports belonging to THIS SPECIFIC EVENT (Never mix other events!)
  const subReportsList: MonthlyReportItem[] = useMemo(() => {
    if (!currentEvent || !Array.isArray(currentEvent.monthlyReports)) return [];
    const list = [...currentEvent.monthlyReports];
    // Sort strictly in Chronological order (latest date at top)
    list.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() || 0 : 0;
      const timeB = b.date ? new Date(b.date).getTime() || 0 : 0;
      return timeB - timeA;
    });
    return list;
  }, [currentEvent?.monthlyReports]);

  // Filter sub-reports based on search, month filter, and calendar date picker
  const filteredSubReports = useMemo(() => {
    return subReportsList.filter((item) => {
      const itemDate = (item.date || '').trim();
      const itemMonth = (item.month || (item.date ? item.date.substring(0, 7) : '')).trim();

      // Filter by selected date from calendar
      if (selectedCalendarDate) {
        if (selectedCalendarDate.length === 10) {
          const itemEndDate = (item.endDate || itemDate).trim();
          const inRange =
            (itemDate && selectedCalendarDate >= itemDate && selectedCalendarDate <= itemEndDate) ||
            itemDate === selectedCalendarDate;
          if (!inRange) {
            if (itemMonth !== selectedCalendarDate.substring(0, 7)) return false;
          }
        } else if (selectedCalendarDate.length === 7) {
          if (itemMonth !== selectedCalendarDate) return false;
        }
      }

      if (selectedMonthFilter !== 'all') {
        if (itemMonth !== selectedMonthFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const t = (item.title || '').toLowerCase();
        const te = (item.titleEn || '').toLowerCase();
        const tt = (item.titleTh || '').toLowerCase();
        const s = (item.summary || '').toLowerCase();
        const loc = (item.location || '').toLowerCase();
        return t.includes(q) || te.includes(q) || tt.includes(q) || s.includes(q) || loc.includes(q);
      }
      return true;
    });
  }, [subReportsList, selectedCalendarDate, selectedMonthFilter, searchQuery]);

  // Distinct available months for this event only
  const distinctMonths = useMemo(() => {
    const set = new Set<string>();
    subReportsList.forEach((m) => {
      const ym = m.month || m.date?.substring(0, 7);
      if (ym) set.add(ym);
    });
    return Array.from(set).sort().reverse();
  }, [subReportsList]);

  const activeEvent = currentEvent || initialEvent;
  if (!activeEvent) return null;

  // Safe field access for the MAIN TOPIC
  const safeTitle = activeEvent.title || 'Untitled Event';
  const safeDate = activeEvent.date || new Date().toISOString().split('T')[0];
  const safeDescription = activeEvent.description || '';

  const displayTitle =
    language === 'th' && activeEvent.titleTh
      ? activeEvent.titleTh
      : language === 'en' && activeEvent.titleEn
      ? activeEvent.titleEn
      : safeTitle;

  const displayDescription =
    language === 'th' && activeEvent.descriptionTh
      ? activeEvent.descriptionTh
      : language === 'en' && activeEvent.descriptionEn
      ? activeEvent.descriptionEn
      : safeDescription;

  // Gather all available image URLs for the Main Event gallery
  const galleryImages: string[] = [];
  if (Array.isArray(activeEvent.imageUrls) && activeEvent.imageUrls.length > 0) {
    activeEvent.imageUrls.forEach((url) => {
      if (url && typeof url === 'string' && url.trim() && !galleryImages.includes(url.trim())) {
        galleryImages.push(url.trim());
      }
    });
  }
  if (
    activeEvent.imageUrl &&
    typeof activeEvent.imageUrl === 'string' &&
    activeEvent.imageUrl.trim() &&
    !galleryImages.includes(activeEvent.imageUrl.trim())
  ) {
    galleryImages.unshift(activeEvent.imageUrl.trim());
  }

  const handlePrevImg = () => {
    setActiveImgIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextImg = () => {
    setActiveImgIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: safeTitle,
          text: safeDescription,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert(
        language === 'lo'
          ? 'ກັອບປີ້ລິ້ງລາຍງານສຳເລັດແລ້ວ!'
          : language === 'th'
          ? 'ก๊อบปี้ลิงก์รายงานสำเร็จแล้ว!'
          : 'Report link copied to clipboard!'
      );
    }
  };

  // Helper to format Month/Year into readable text
  const formatMonthYear = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const monthNamesLo = [
        'ມັງກອນ (Jan)',
        'ກຸມພາ (Feb)',
        'ມີນາ (Mar)',
        'ເມສາ (Apr)',
        'ພຶດສະພາ (May)',
        'ມິຖຸນາ (Jun)',
        'ກໍລະກົດ (Jul)',
        'ສິງຫາ (Aug)',
        'ກັນຍາ (Sep)',
        'ຕຸລາ (Oct)',
        'ພະຈິກ (Nov)',
        'ທັນວາ (Dec)',
      ];
      const monthNamesTh = [
        'มกราคม (Jan)',
        'กุมภาพันธ์ (Feb)',
        'มีนาคม (Mar)',
        'เมษายน (Apr)',
        'พฤษภาคม (May)',
        'มิถุนายน (Jun)',
        'กรกฎาคม (Jul)',
        'สิงหาคม (Aug)',
        'กันยายน (Sep)',
        'ตุลาคม (Oct)',
        'พฤศจิกายน (Nov)',
        'ธันวาคม (Dec)',
      ];

      const mIndex = d.getMonth();
      const year = d.getFullYear();

      if (language === 'lo') return `${monthNamesLo[mIndex]} ${year}`;
      if (language === 'th') return `${monthNamesTh[mIndex]} ${year}`;
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Open Sub-Report Add Modal
  const handleOpenAddSubReport = () => {
    setEditingSubReport(null);
    setSubReportForm({
      month: new Date().toISOString().substring(0, 7),
      date: new Date().toISOString().split('T')[0],
      endDate: '',
      title: '',
      titleEn: '',
      titleTh: '',
      summary: '',
      summaryEn: '',
      summaryTh: '',
      imageUrls: [],
      location: '',
      attendees: 0,
      baptized: 0,
      believers: 0,
      videoUrl: '',
      docUrl: '',
      docUrls: [],
    });
    setSubReportImages([]);
    setSubReportDocs([]);
    setSubReportPdfName(null);
    setSubReportLangTab('lo');
    setIsSubReportModalOpen(true);
  };

  // Open Sub-Report Edit Modal
  const handleOpenEditSubReport = (item: MonthlyReportItem) => {
    setEditingSubReport(item);
    setSubReportForm({
      ...item,
      endDate: item.endDate || '',
    });
    setSubReportImages(item.imageUrls || []);
    const existingDocs: string[] = [];
    if (Array.isArray(item.docUrls)) {
      item.docUrls.forEach((d) => {
        if (d && typeof d === 'string' && d.trim() && !existingDocs.includes(d.trim())) {
          existingDocs.push(d.trim());
        }
      });
    }
    if (item.docUrl && item.docUrl.trim() && !existingDocs.includes(item.docUrl.trim())) {
      existingDocs.unshift(item.docUrl.trim());
    }
    setSubReportDocs(existingDocs);
    if (existingDocs.length > 0) {
      setSubReportPdfName(`${existingDocs.length} Documents Attached`);
    } else {
      setSubReportPdfName(null);
    }
    setSubReportLangTab('lo');
    setIsSubReportModalOpen(true);
  };

  // Upload PDF / Documents for Sub-Report (Support multiple files freely)
  const handleUploadSubReportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingSubPdf(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const result = await uploadFileDirectly(file);
        if (result?.url) {
          uploadedUrls.push(result.url);
        }
      }
      setSubReportDocs((prev) => {
        const next = [...prev, ...uploadedUrls];
        return next;
      });
      setSubReportForm((prev) => {
        const allDocs = [...(prev.docUrls || []), ...uploadedUrls];
        return {
          ...prev,
          docUrls: allDocs,
          docUrl: prev.docUrl || allDocs[0] || '',
        };
      });
    } catch (err: any) {
      console.error('Document upload error:', err);
      alert('Failed to upload files: ' + (err?.message || 'Upload error'));
    } finally {
      setIsUploadingSubPdf(false);
      if (subReportPdfInputRef.current) subReportPdfInputRef.current.value = '';
    }
  };

  // Save Sub-Report (Add or Update)
  const handleSaveSubReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subReportForm.title?.trim()) {
      alert(language === 'lo' ? 'ກະລຸນາໃສ່ຫົວຂໍ້ຍອຍ' : 'Please enter sub-topic title');
      return;
    }

    setIsSavingSubReport(true);
    try {
      const updatedSubReports = [...(currentEvent.monthlyReports || [])];
      const newSubReport: MonthlyReportItem = {
        id: editingSubReport?.id || `mr-${Date.now()}`,
        month: subReportForm.month || subReportForm.date?.substring(0, 7) || new Date().toISOString().substring(0, 7),
        date: subReportForm.date || new Date().toISOString().split('T')[0],
        endDate: subReportForm.endDate?.trim() || undefined,
        title: subReportForm.title || '',
        titleEn: subReportForm.titleEn || '',
        titleTh: subReportForm.titleTh || '',
        summary: subReportForm.summary || '',
        summaryEn: subReportForm.summaryEn || '',
        summaryTh: subReportForm.summaryTh || '',
        imageUrls: subReportImages.filter(Boolean),
        imageUrl: subReportImages[0] || '',
        location: subReportForm.location || '',
        attendees: Number(subReportForm.attendees) || 0,
        baptized: Number(subReportForm.baptized) || 0,
        believers: Number(subReportForm.believers) || 0,
        videoUrl: subReportForm.videoUrl || '',
        docUrl: subReportDocs[0] || '',
        docUrls: subReportDocs,
        createdAt: editingSubReport?.createdAt || new Date().toISOString(),
      };

      if (editingSubReport) {
        const index = updatedSubReports.findIndex((x) => x.id === editingSubReport.id);
        if (index >= 0) {
          updatedSubReports[index] = newSubReport;
        } else {
          updatedSubReports.unshift(newSubReport);
        }
      } else {
        updatedSubReports.unshift(newSubReport);
      }

      let updatedEvent: EventData = {
        ...currentEvent,
        monthlyReports: updatedSubReports,
      };

      // 1. Sync to server backend
      let serverSaved = false;
      try {
        const res = await fetch('/api/save-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedEvent),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData?.success && resData.event) {
            updatedEvent = { ...updatedEvent, ...resData.event };
            serverSaved = true;
          }
        }
      } catch (serverErr) {
        console.warn('Backend sub-report save notify warning:', serverErr);
      }

      // 2. Direct client-side Firestore write
      try {
        await saveEventToFirestore(updatedEvent);
      } catch (fsErr) {
        console.warn('Direct Firestore save warning:', fsErr);
        if (!serverSaved) throw fsErr;
      }

      setCurrentEvent(updatedEvent);
      if (onEventUpdated) {
        onEventUpdated(updatedEvent);
      }

      setIsSubReportModalOpen(false);
    } catch (err: any) {
      console.error('Error saving sub-report:', err);
      alert('Failed to save sub-report: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSavingSubReport(false);
    }
  };

  // Open Main Topic Narrative Editor (Admin Only)
  const handleOpenEditMainNarrative = () => {
    setMainNarrativeEdit({
      description: currentEvent.description || '',
      descriptionTh: currentEvent.descriptionTh || '',
      descriptionEn: currentEvent.descriptionEn || '',
    });
    setMainNarrativeLangTab('lo');
    setIsEditingMainNarrative(true);
  };

  // Save Main Topic Narrative in 3 Languages
  const handleSaveMainNarrative = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMainNarrative(true);
    try {
      const updatedEvent: EventData = {
        ...currentEvent,
        description: mainNarrativeEdit.description || '',
        descriptionTh: mainNarrativeEdit.descriptionTh || '',
        descriptionEn: mainNarrativeEdit.descriptionEn || '',
      };

      await saveEventToFirestore(updatedEvent);
      setCurrentEvent(updatedEvent);
      if (onEventUpdated) {
        onEventUpdated(updatedEvent);
      }
      setIsEditingMainNarrative(false);
    } catch (err: any) {
      console.error('Error saving main narrative:', err);
      alert('Failed to save: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSavingMainNarrative(false);
    }
  };

  // Delete Sub-Report
  const handleDeleteSubReport = async (subId: string) => {
    if (!confirm(language === 'lo' ? 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຫົວຂໍ້ຍອຍນີ້?' : 'Delete this monthly sub-report?')) {
      return;
    }

    try {
      const updatedSubReports = (currentEvent.monthlyReports || []).filter((x) => x.id !== subId);
      const updatedEvent: EventData = {
        ...currentEvent,
        monthlyReports: updatedSubReports,
      };

      await saveEventToFirestore(updatedEvent);
      setCurrentEvent(updatedEvent);
      if (onEventUpdated) {
        onEventUpdated(updatedEvent);
      }
    } catch (err: any) {
      console.error('Error deleting sub-report:', err);
      alert('Failed to delete: ' + err?.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col w-screen h-screen overflow-hidden animate-fade-in text-slate-900 dark:text-slate-100">
      {/* ========================================================================= */}
      {/* MAIN SCROLLABLE REPORT WORKSPACE */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* ========================================================================= */}
          {/* SECTION A: ຫົວຂໍ້ຫຼັກ ແລະ ພາບລວມກິດຈະກຳ (MAIN TOPIC & OVERVIEW) */}
          {/* ========================================================================= */}
          <header className="pb-6 border-b border-slate-200 dark:border-slate-800 space-y-5">
            {/* Top Back Nav with Event Title & Date */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <button
                  onClick={onClose}
                  className="inline-flex items-center justify-center p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#cc0000] dark:hover:text-red-400 transition cursor-pointer active:scale-95 border border-slate-200/60 dark:border-slate-700/60 shadow-xs shrink-0"
                  title={language === 'lo' ? 'ຍ້ອນກັບໜ້າຫຼັກ' : 'Back to Home'}
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5 text-[#cc0000]" />
                </button>
                <h2 className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight line-clamp-2">
                  {displayTitle}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{formatDateRange(safeDate, activeEvent.endDate, language)}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>{formatMonthYear(safeDate)}</span>
                </div>
              </div>
            </div>

            {/* Main Event Attached Documents & Video (Do NOT display main event images/cover photo at the top) */}
            {(() => {
              const mainDocs: string[] = [];
              if (Array.isArray(currentEvent.docUrls) && currentEvent.docUrls.length > 0) {
                currentEvent.docUrls.forEach((d) => {
                  if (d && typeof d === 'string' && d.trim() && !mainDocs.includes(d.trim())) mainDocs.push(d.trim());
                });
              }
              if (currentEvent.docUrl && currentEvent.docUrl.trim() && !mainDocs.includes(currentEvent.docUrl.trim())) {
                mainDocs.unshift(currentEvent.docUrl.trim());
              }

              const hasMainDoc = mainDocs.length > 0;
              const hasMainVideo = Boolean(currentEvent.videoUrl && currentEvent.videoUrl.trim());

              if (!hasMainDoc && !hasMainVideo) return null;

              return (
                <div className="space-y-3 pt-1">
                  <ReportDocumentViewer
                    docUrls={mainDocs}
                    imageUrls={[]}
                    videoUrl={currentEvent.videoUrl}
                    title={displayTitle}
                    language={language}
                    isFullWidth
                  />
                </div>
              );
            })()}
          </header>

          {/* ========================================================================= */}
          {/* SECTION B: ຫົວຂໍ້ຍອຍ & ລາຍງານແຕ່ລະເດືອນ (MONTHLY SUB-TOPICS & ACTIVITIES) */}
          {/* ========================================================================= */}
          <section className="space-y-6">
            {/* Sub-Topics Header & Controls - Clean Web Inline Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                  <span>
                    {language === 'lo'
                      ? 'ກິດຈະກຳ ແລະ ລາຍງານແຕ່ລະເດືອນຂອງຫົວຂໍ້ນີ້'
                      : language === 'th'
                      ? 'กิจกรรมและรายงานแต่ละเดือนของหัวข้อนี้'
                      : 'Activities & Monthly Sub-Reports'}
                  </span>
                  <span className="text-xs font-black bg-[#cc0000] text-white px-2.5 py-0.5 rounded-full shadow-xs">
                    {filteredSubReports.length}
                  </span>
                </h3>
              </div>

              {/* Actions: Add Sub-report + Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Add Monthly Sub-Report Button (Admin only) */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleOpenAddSubReport}
                    className="px-4 py-2 bg-[#cc0000] hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition hover:scale-102 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {language === 'lo'
                        ? '+ ເພີ່ມລາຍງານຍອຍປະຈຳເດືອນ'
                        : language === 'th'
                        ? '+ เพิ่มรายงานย่อยประจำเดือน'
                        : '+ Add Monthly Sub-Report'}
                    </span>
                  </button>
                )}

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'lo' ? 'ຄົ້ນຫາຫົວຂໍ້ຍອຍ...' : 'Search sub-reports...'}
                    className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-[#cc0000] w-36 sm:w-48"
                  />
                </div>

                {/* Calendar Date Picker Filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 shadow-2xs focus-within:ring-1 focus-within:ring-[#cc0000]">
                  <Calendar className="w-3.5 h-3.5 text-[#cc0000] shrink-0" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden sm:inline">
                    {language === 'lo' ? 'ປະຕິຖິນ:' : language === 'th' ? 'ปฏิทิน:' : 'Calendar:'}
                  </span>
                  <input
                    type="date"
                    value={selectedCalendarDate}
                    onChange={(e) => {
                      setSelectedCalendarDate(e.target.value);
                      if (selectedMonthFilter !== 'all') setSelectedMonthFilter('all');
                    }}
                    className="text-xs bg-transparent text-slate-800 dark:text-slate-100 font-bold outline-none cursor-pointer"
                    title={language === 'lo' ? 'ເລືອກວັນທີຈາກປະຕິຖິນ' : 'Filter by Calendar Date'}
                  />
                  {selectedCalendarDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedCalendarDate('')}
                      className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 rounded transition"
                      title={language === 'lo' ? 'ລ້າງວັນທີ' : 'Clear date'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Quick Month Filter Dropdown */}
                {distinctMonths.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={selectedMonthFilter}
                      onChange={(e) => {
                        setSelectedMonthFilter(e.target.value);
                        if (e.target.value !== 'all') setSelectedCalendarDate('');
                      }}
                      className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-bold outline-none focus:ring-1 focus:ring-[#cc0000] cursor-pointer"
                    >
                      <option value="all">
                        {language === 'lo' ? '📅 ທຸກໆເດືອນ' : '📅 All Months'}
                      </option>
                      {distinctMonths.map((ym) => (
                        <option key={ym} value={ym}>
                          {formatMonthYear(`${ym}-01`)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* List of Sub-Reports */}
            {filteredSubReports.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto border border-purple-200 dark:border-purple-900/60">
                  <Layers className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-lg mx-auto">
                  <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
                    {language === 'lo'
                      ? 'ຍັງບໍ່ມີລາຍງານຍອຍປະຈຳເດືອນສຳລັບກິດຈະກຳນີ້'
                      : 'No monthly sub-reports added yet for this event'}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {isAdmin
                      ? language === 'lo'
                        ? 'ຫ້ອງນີ້ແມ່ນບ່ອນເພີ່ມລາຍງານປະຈຳແຕ່ລະເດືອນ (ສາມາດເພີ່ມໄດ້ທັງຟາຍ PDF, ຮູບພາບກິດຈະກຳ, ຄລິບວິດີໂອ, ແລະ ເນື້ອໃນລາຍງານ 3 ພາສາ). ທ່ານສາມາດກົດປຸ່ມດ້ານລຸ່ມເພື່ອເລີ່ມຕົ້ນເພີ່ມລາຍງານໄດ້ທັນທີ.'
                        : 'This section is where you add monthly reports (supports PDF documents, photo galleries, videos, and multi-language narratives). Click the button below to add a report.'
                      : language === 'lo'
                      ? 'ຍັງບໍ່ທັນມີການອັບເດດລາຍງານຍອຍເພີ່ມເຕີມໃນຂະນະນີ້.'
                      : 'No additional monthly sub-reports available at this time.'}
                  </p>
                </div>
                {isAdmin && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleOpenAddSubReport}
                      className="px-6 py-2.5 bg-[#cc0000] hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-black inline-flex items-center gap-2 shadow-md transition hover:scale-102 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {language === 'lo'
                          ? '+ ເພີ່ມລາຍງານປະຈຳເດືອນ (ອັບໂຫຼດ PDF, ຮູບພາບ, ຫົວຂໍ້ & ເນື້ອໃນ)'
                          : language === 'th'
                          ? '+ เพิ่มรายงานประจำเดือน (อัปโหลด PDF, รูปภาพ, หัวข้อ & เนื้อหา)'
                          : '+ Add Monthly Report (Upload PDF, Photos, Title & Content)'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {filteredSubReports.map((sub, index) => {
                  const subTitle =
                    language === 'th' && sub.titleTh
                      ? sub.titleTh
                      : language === 'en' && sub.titleEn
                      ? sub.titleEn
                      : sub.title;

                  const subImages: string[] = [];
                  if (Array.isArray(sub.imageUrls)) {
                    sub.imageUrls.forEach((img) => {
                      if (img && typeof img === 'string' && img.trim() && !subImages.includes(img.trim())) {
                        subImages.push(img.trim());
                      }
                    });
                  }
                  if (sub.imageUrl && typeof sub.imageUrl === 'string' && sub.imageUrl.trim() && !subImages.includes(sub.imageUrl.trim())) {
                    subImages.unshift(sub.imageUrl.trim());
                  }
                  const isExpanded = expandedSubReportId === sub.id;

                  return (
                    <article
                      key={sub.id || index}
                      className="py-8 first:pt-2 space-y-4"
                    >
                      {/* Top Header of Sub-Report */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Month Tag */}
                          <span className="px-3 py-1 bg-slate-900 text-white dark:bg-slate-800 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xs">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            <span>{formatMonthYear(sub.date || `${sub.month}-01`)}</span>
                          </span>

                          {sub.date && (
                            <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold border border-blue-200/60 dark:border-blue-900/60">
                              🗓️ {formatDateRange(sub.date, sub.endDate, language)}
                            </span>
                          )}

                          {index === 0 && (
                            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              ⭐ {language === 'lo' ? 'ເດືອນຫຼ້າສຸດ' : 'Latest Month'}
                            </span>
                          )}
                        </div>

                        {/* Edit & Delete Action Buttons (Admin only) */}
                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSubReport(sub)}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Edit Sub-report"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{language === 'lo' ? 'ແກ້ໄຂ' : 'Edit'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSubReport(sub.id)}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950 text-slate-600 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-300 rounded-lg text-xs font-bold transition cursor-pointer"
                              title="Delete Sub-report"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Sub-Topic Title */}
                      <div className="space-y-1">
                        <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                          {subTitle}
                        </h4>
                      </div>

                      {/* Sub-Report Body: Embedded Display & Side-by-side Narrative (Clean Web Layout) */}
                      {(() => {
                        const subSummary =
                          language === 'th' && sub.summaryTh
                            ? sub.summaryTh
                            : language === 'en' && sub.summaryEn
                            ? sub.summaryEn
                            : sub.summary || '';
                        const subDocs: string[] = [];
                        if (Array.isArray(sub.docUrls) && sub.docUrls.length > 0) {
                          sub.docUrls.forEach((d) => {
                            if (d && typeof d === 'string' && d.trim() && !subDocs.includes(d.trim())) {
                              subDocs.push(d.trim());
                            }
                          });
                        }
                        if (sub.docUrl && sub.docUrl.trim() && !subDocs.includes(sub.docUrl.trim())) {
                          subDocs.unshift(sub.docUrl.trim());
                        }
                        const hasDoc = subDocs.length > 0;
                        const hasImages = subImages.length > 0;
                        const hasVideo = Boolean(sub.videoUrl && sub.videoUrl.trim());
                        const hasMedia = hasDoc || hasImages || hasVideo;
                        const totalMediaCount = subDocs.length + subImages.length + (hasVideo ? 1 : 0);
                        const rawText = subSummary ? subSummary.replace(/<[^>]*>/g, '').trim() : '';
                        const hasNarrative = rawText.length > 0;

                        // Case 1: Both Media and Narrative exist
                        if (hasMedia && hasNarrative) {
                          // If there are 2 or more media items, stack narrative then media across full width
                          if (totalMediaCount >= 2) {
                            return (
                              <div className="space-y-5 pt-1">
                                {/* Text Narrative (Clean web typography, NO extra box) */}
                                <div className="space-y-3">
                                  <div className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm leading-relaxed text-justify [text-align-last:left] break-words">
                                    {/<[a-z][\s\S]*>/i.test(subSummary) ? (
                                      <div
                                        className="rich-content-view [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_b]:font-black"
                                        dangerouslySetInnerHTML={{ __html: cleanRichHtml(subSummary) }}
                                      />
                                    ) : (
                                      <p className="whitespace-pre-line leading-relaxed">{subSummary}</p>
                                    )}
                                  </div>

                                  {/* Highlighted Stats Pills */}
                                  {(sub.baptized || sub.believers) && (
                                    <div className="pt-2 flex flex-wrap gap-2 text-xs">
                                      {sub.believers ? (
                                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 font-semibold">
                                          ⛪ ຜູ້ເຊື່ອໃໝ່ {sub.believers} ຄົນ
                                        </span>
                                      ) : null}
                                      {sub.baptized ? (
                                        <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 font-semibold">
                                          💧 ຮັບບັບຕິສະມາ {sub.baptized} ຄົນ
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
                                </div>

                                {/* Media Viewer */}
                                <ReportDocumentViewer
                                  docUrls={subDocs}
                                  imageUrls={subImages}
                                  videoUrl={sub.videoUrl}
                                  title={subTitle}
                                  language={language}
                                  isFullWidth
                                />
                              </div>
                            );
                          }

                          // If there is only 1 file and narrative:
                          const hasDocsOnly = subDocs.length > 0;
                          const mediaColSpan = hasDocsOnly ? 'lg:col-span-6 xl:col-span-6' : 'lg:col-span-5 xl:col-span-5';
                          const narrativeColSpan = hasDocsOnly ? 'lg:col-span-6 xl:col-span-6' : 'lg:col-span-7 xl:col-span-7';

                          return (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
                              {/* Media Viewer on the Left */}
                              <div className={`${mediaColSpan} space-y-3`}>
                                <ReportDocumentViewer
                                  docUrls={subDocs}
                                  imageUrls={subImages}
                                  videoUrl={sub.videoUrl}
                                  title={subTitle}
                                  language={language}
                                />
                              </div>

                              {/* Text Narrative on the Right (Clean web typography, NO extra box) */}
                              <div className={`${narrativeColSpan} space-y-3`}>
                                <div className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm leading-relaxed text-justify [text-align-last:left] break-words">
                                  {/<[a-z][\s\S]*>/i.test(subSummary) ? (
                                    <div
                                      className="rich-content-view [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_b]:font-black"
                                      dangerouslySetInnerHTML={{ __html: cleanRichHtml(subSummary) }}
                                    />
                                  ) : (
                                    <p className="whitespace-pre-line leading-relaxed">{subSummary}</p>
                                  )}
                                </div>

                                {/* Highlighted Stats Pills */}
                                {(sub.baptized || sub.believers) && (
                                  <div className="pt-2 flex flex-wrap gap-2 text-xs">
                                    {sub.believers ? (
                                      <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 font-semibold">
                                        ⛪ ຜູ້ເຊື່ອໃໝ່ {sub.believers} ຄົນ
                                      </span>
                                    ) : null}
                                    {sub.baptized ? (
                                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 font-semibold">
                                        💧 ຮັບບັບຕິສະມາ {sub.baptized} ຄົນ
                                      </span>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Case 2: Only Media exists
                        if (hasMedia && !hasNarrative) {
                          return (
                            <div className="pt-2">
                              <ReportDocumentViewer
                                docUrls={subDocs}
                                imageUrls={subImages}
                                videoUrl={sub.videoUrl}
                                title={subTitle}
                                language={language}
                                isFullWidth
                              />
                            </div>
                          );
                        }

                        // Case 3: Only Narrative exists
                        return (
                          <div className="pt-2 text-slate-700 dark:text-slate-200 text-xs sm:text-sm leading-relaxed text-justify [text-align-last:left] break-words">
                            {/<[a-z][\s\S]*>/i.test(subSummary) ? (
                              <div
                                className="rich-content-view [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_b]:font-black"
                                dangerouslySetInnerHTML={{ __html: cleanRichHtml(subSummary) }}
                              />
                            ) : (
                              <p className="whitespace-pre-line leading-relaxed">{subSummary}</p>
                            )}
                          </div>
                        );
                      })()}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SUB-REPORT ADD / EDIT MODAL (POPUP FORM - ADMIN ONLY) */}
      {/* ========================================================================= */}
      {isAdmin && isSubReportModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 animate-fade-in overflow-y-auto">
          <div className="my-auto bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#cc0000] text-white flex items-center justify-center font-black">
                  <Calendar className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-black text-sm sm:text-base">
                  {editingSubReport
                    ? language === 'lo'
                      ? 'ແກ້ໄຂຫົວຂໍ້ຍອຍ / ລາຍງານປະຈຳເດືອນ'
                      : 'Edit Monthly Sub-Report'
                    : language === 'lo'
                    ? 'ເພີ່ມຫົວຂໍ້ຍອຍ / ລາຍງານປະຈຳເດືອນໃໝ່'
                    : 'Add New Monthly Sub-Report'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSubReportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveSubReport} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Month and Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    📅 {language === 'lo' ? 'ປະຈຳເດືອນ (Month YYYY-MM) *' : 'Reporting Month *'}
                  </label>
                  <input
                    type="month"
                    required
                    value={subReportForm.month || ''}
                    onChange={(e) => setSubReportForm({ ...subReportForm, month: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#cc0000]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    🗓️ {language === 'lo' ? 'ວັນທີເລີ່ມຕົ້ນ (Start Date)' : language === 'th' ? 'วันที่เริ่มต้น' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    value={subReportForm.date || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubReportForm({
                        ...subReportForm,
                        date: val,
                        month: val ? val.substring(0, 7) : subReportForm.month,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#cc0000]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      🏁 {language === 'lo' ? 'ຫາ ວັນທີສິ້ນສຸດ (End Date)' : language === 'th' ? 'ถึง วันที่สิ้นสุด' : 'To End Date'}
                    </label>
                    {subReportForm.endDate && (
                      <button
                        type="button"
                        onClick={() => setSubReportForm({ ...subReportForm, endDate: '' })}
                        className="text-[10px] text-red-500 hover:underline cursor-pointer"
                      >
                        {language === 'lo' ? 'ລຶບ' : 'Clear'}
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    min={subReportForm.date || undefined}
                    value={subReportForm.endDate || ''}
                    onChange={(e) => setSubReportForm({ ...subReportForm, endDate: e.target.value })}
                    placeholder="ເລືອກວັນທີສິ້ນສຸດ"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#cc0000]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {language === 'lo'
                      ? '(ຖ້າຈັດຫຼາຍມື້: ໃສ່ວັນທີເລີ່ມ ຫາ ວັນທີສິ້ນສຸດ)'
                      : language === 'th'
                      ? '(ถ้าจัดหลายวัน: ใส่วันที่เริ่ม ถึง สิ้นสุด)'
                      : '(For multi-day events)'}
                  </p>
                </div>
              </div>

              {/* Sub-Report Language Tabs */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#cc0000]" />
                  <span>{language === 'lo' ? 'ພາສາຫົວຂໍ້ & ເນື້ອໃນ:' : 'Language:'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSubReportLangTab('lo')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    subReportLangTab === 'lo'
                      ? 'bg-[#cc0000] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>🇱🇦 ພາສາລາວ (Lao)</span>
                  {subReportForm.title && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSubReportLangTab('th')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    subReportLangTab === 'th'
                      ? 'bg-[#cc0000] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>🇹🇭 ພາສາໄທ (Thai)</span>
                  {subReportForm.titleTh && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSubReportLangTab('en')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    subReportLangTab === 'en'
                      ? 'bg-[#cc0000] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>🇬🇧 English</span>
                  {subReportForm.titleEn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              </div>

              {/* Title & Summary per Selected Language Tab */}
              {subReportLangTab === 'lo' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      🇱🇦 ຫົວຂໍ້ຍອຍປະຈຳເດືອນ (ພາສາລາວ) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ຕົວຢ່າງ: ແຈກຢາຍຊຸດນັກຮຽນ ແລະ ອຸປະກອນການຮຽນ 80 ຊຸດ ບ້ານແກ່ນຄຳ"
                      value={subReportForm.title || ''}
                      onChange={(e) => setSubReportForm({ ...subReportForm, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#cc0000]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      📝 ເນື້ອໃນບົດລາຍງານຍອຍລະອຽດປະຈຳເດືອນ (ພາສາລາວ)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="ຂຽນລາຍລະອຽດຜົນການດຳເນີນງານ, ສິ່ງທີ່ໄດ້ເຮັດ ແລະ ຜົນຮັບໃນເດືອນນີ້..."
                      value={subReportForm.summary || ''}
                      onChange={(e) => setSubReportForm({ ...subReportForm, summary: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#cc0000]"
                    />
                  </div>
                </div>
              )}

              {subReportLangTab === 'th' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      🇹🇭 หัวข้อย่อยประจำเดือน (ภาษาไทย)
                    </label>
                    <input
                      type="text"
                      placeholder="หัวข้อย่อยภาษาไทย..."
                      value={subReportForm.titleTh || ''}
                      onChange={(e) => setSubReportForm({ ...subReportForm, titleTh: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      📝 เนื้อหารายงานย่อยประจำเดือน (ภาษาไทย)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="เขียนรายละเอียดผลการดำเนินงาน สิ่งที่ได้ทำ และผลลัพธ์ในเดือนนี้..."
                      value={subReportForm.summaryTh || ''}
                      onChange={(e) => setSubReportForm({ ...subReportForm, summaryTh: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {subReportLangTab === 'en' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      🇬🇧 Monthly Sub-Topic Title (English)
                    </label>
                    <input
                      type="text"
                      placeholder="English sub-topic title..."
                      value={subReportForm.titleEn || ''}
                      onChange={(e) => setSubReportForm({ ...subReportForm, titleEn: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      📝 Monthly Summary / Narrative (English)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Detailed monthly update, activities conducted, and achievements..."
                      value={subReportForm.summaryEn || ''}
                      onChange={(e) => setSubReportForm({ ...subReportForm, summaryEn: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Location & Participants */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    📍 ສະຖານທີ່ (Location)
                  </label>
                  <input
                    type="text"
                    placeholder="ບ້ານແກ່ນຄຳ, ເມືອງຜາອຸດົມ"
                    value={subReportForm.location || ''}
                    onChange={(e) => setSubReportForm({ ...subReportForm, location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    👥 ຈຳນວນຜູ້ເຂົ້າຮ່ວມ (Attendees)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="80"
                    value={subReportForm.attendees || ''}
                    onChange={(e) => setSubReportForm({ ...subReportForm, attendees: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Dedicated Documents Report Uploader Box (Supports Multiple Files) */}
              <div className="space-y-3 p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>
                      {language === 'lo'
                        ? '📄 ຟາຍເອກະສານບົດລາຍງານ (ອັບໂຫຼດໄດ້ຫຼາຍຟາຍ)'
                        : '📄 Report Documents (Multiple Files Allowed)'}
                    </span>
                  </label>

                  <input
                    ref={subReportPdfInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,image/*"
                    onChange={handleUploadSubReportPdf}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => subReportPdfInputRef.current?.click()}
                    disabled={isUploadingSubPdf}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isUploadingSubPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isUploadingSubPdf
                        ? language === 'lo'
                          ? 'ກຳລັງອັບໂຫຼດ...'
                          : 'Uploading...'
                        : language === 'lo'
                        ? '📤 ອັບໂຫຼດຟາຍ (ເລືອກໄດ້ຫຼາຍຟາຍ)'
                        : 'Upload Files (Multiple)'}
                    </span>
                  </button>
                </div>

                {subReportDocs.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {subReportDocs.map((doc, idx) => {
                        const fileName = doc.includes('data:')
                          ? `Document ${idx + 1}`
                          : doc.split('/').pop() || `Document ${idx + 1}`;

                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-2 shadow-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 font-black text-xs">
                                {idx + 1}
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={fileName}>
                                  {fileName}
                                </div>
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  ✓ {language === 'lo' ? 'ແນບສຳເລັດ' : 'Attached'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={doc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition"
                                title="Open"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = subReportDocs.filter((_, i) => i !== idx);
                                  setSubReportDocs(next);
                                  setSubReportForm((prev) => ({
                                    ...prev,
                                    docUrls: next,
                                    docUrl: next[0] || '',
                                  }));
                                }}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Previews: 2 per row if multiple */}
                    <div className={`pt-1 ${subReportDocs.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' : ''}`}>
                      {subReportDocs.map((doc, idx) => (
                        <div
                          key={idx}
                          className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center"
                        >
                          {doc.toLowerCase().includes('.pdf') || doc.startsWith('data:application/pdf') ? (
                            <div className="w-full h-full flex flex-col items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 text-center overflow-hidden">
                              <div className="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                                <PdfThumbnail
                                  url={doc}
                                  title={doc.split('/').pop() || `PDF ${idx + 1}`}
                                  className="max-h-28 w-auto max-w-full object-contain rounded-md"
                                />
                              </div>
                              <div className="w-full pt-1.5 flex items-center justify-between gap-1 border-t border-slate-200 dark:border-slate-800 shrink-0">
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={doc.split('/').pop() || `PDF ${idx + 1}`}>
                                  📄 {doc.split('/').pop()?.split('?')[0] || `PDF ${idx + 1}`}
                                </span>
                                <a
                                  href={doc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-[10px] font-bold flex items-center gap-1 shrink-0"
                                >
                                  <span>{language === 'lo' ? 'ເປີດ' : 'Open'}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={doc}
                              alt={`Preview ${idx + 1}`}
                              className="w-full h-full object-contain bg-white dark:bg-slate-800"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    {language === 'lo'
                      ? 'ຍັງບໍ່ທັນມີຟາຍເອກະສານ. ທ່ານສາມາດກົດປຸ່ມ "ອັບໂຫຼດຟາຍ" ເພື່ອເລືອກຟາຍ PDF ຫຼື ຮູບພາບໄດ້ຫຼາຍຟາຍຕາມໃຈ.'
                      : 'No document files attached. Click "Upload Files" to upload as many PDF/doc files as desired.'}
                  </p>
                )}
              </div>

              {/* Photo Uploader */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  📸 ຮູບພາບປະກອບປະຈຳເດືອນ (Monthly Photos)
                </label>
                <MultiImageUploader
                  images={subReportImages}
                  onChange={(urls) => setSubReportImages(urls)}
                  language={language}
                  label={language === 'lo' ? 'ອັບໂຫຼດຮູບພາບປະກອບລາຍງານເດືອນນີ້' : 'Upload photos for this month'}
                />
              </div>

              {/* Video Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-red-500" />
                  <span>🎥 ລິ້ງວິດີໂອ (YouTube / Facebook Video URL)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://youtube.com/watch?v=..."
                  value={subReportForm.videoUrl || ''}
                  onChange={(e) => setSubReportForm({ ...subReportForm, videoUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubReportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSavingSubReport}
                  className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSavingSubReport ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {language === 'lo'
                      ? 'ບັນທຶກລາຍງານຍອຍ'
                      : language === 'th'
                      ? 'บันทึกรายงานย่อย'
                      : 'Save Sub-Report'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MAIN TOPIC NARRATIVE EDIT MODAL (ADMIN ONLY - 3 LANGUAGES) */}
      {/* ========================================================================= */}
      {isAdmin && isEditingMainNarrative && (
        <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 animate-fade-in overflow-y-auto">
          <div className="my-auto bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                  <Edit2 className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    {language === 'lo'
                      ? 'ແກ້ໄຂຄຳບັນຍາຍ & ພາບລວມຂອງກິດຈະກຳ (3 ພາສາ)'
                      : language === 'th'
                      ? 'แก้ไขคำบรรยาย & ภาพรวมของกิจกรรม (3 ภาษา)'
                      : 'Edit Event Overview & Description (3 Languages)'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentEvent.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingMainNarrative(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMainNarrative} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#cc0000]" />
                  <span>{language === 'lo' ? 'ພາສາຄຳບັນຍາຍ:' : 'Language:'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMainNarrativeLangTab('lo')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    mainNarrativeLangTab === 'lo'
                      ? 'bg-[#cc0000] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>🇱🇦 ພາສາລາວ (Lao)</span>
                  {mainNarrativeEdit.description && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setMainNarrativeLangTab('th')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    mainNarrativeLangTab === 'th'
                      ? 'bg-[#cc0000] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>🇹🇭 ພາສາໄທ (Thai)</span>
                  {mainNarrativeEdit.descriptionTh && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setMainNarrativeLangTab('en')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    mainNarrativeLangTab === 'en'
                      ? 'bg-[#cc0000] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>🇬🇧 English</span>
                  {mainNarrativeEdit.descriptionEn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              </div>

              {mainNarrativeLangTab === 'lo' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    🇱🇦 ຄຳບັນຍາຍ & ພາບລວມຂອງກິດຈະກຳ (ພາສາລາວ) *
                  </label>
                  <textarea
                    rows={6}
                    value={mainNarrativeEdit.description}
                    onChange={(e) => setMainNarrativeEdit({ ...mainNarrativeEdit, description: e.target.value })}
                    placeholder="ຂຽນຄຳບັນຍາຍພາບລວມຂອງກິດຈະກຳ ເຊັ່ນ: ທີມງານພັນທະກິດລົງຢ້ຽມຢາມຄອບຄົວທ້ອງຖິ່ນ..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs leading-relaxed outline-none focus:ring-2 focus:ring-[#cc0000]"
                  />
                </div>
              )}

              {mainNarrativeLangTab === 'th' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    🇹🇭 คำบรรยาย & ภาพรวมของกิจกรรม (ภาษาไทย)
                  </label>
                  <textarea
                    rows={6}
                    value={mainNarrativeEdit.descriptionTh}
                    onChange={(e) => setMainNarrativeEdit({ ...mainNarrativeEdit, descriptionTh: e.target.value })}
                    placeholder="เขียนคำบรรยายภาพรวมของกิจกรรมภาษาไทย..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs leading-relaxed outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {mainNarrativeLangTab === 'en' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    🇬🇧 Event Overview & Narrative (English)
                  </label>
                  <textarea
                    rows={6}
                    value={mainNarrativeEdit.descriptionEn}
                    onChange={(e) => setMainNarrativeEdit({ ...mainNarrativeEdit, descriptionEn: e.target.value })}
                    placeholder="Ministry team visiting local families, interceding, and providing relief support..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs leading-relaxed outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingMainNarrative(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingMainNarrative}
                  className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSavingMainNarrative ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{language === 'lo' ? 'ບັນທຶກຄຳບັນຍາຍ' : 'Save Narrative'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Fullscreen Lightbox for Event Photos */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div
            className="relative max-w-5xl max-h-[92vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-[#cc0000] rounded-full transition cursor-pointer"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImg}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain block"
            />
          </div>
        </div>
      )}
    </div>
  );
};

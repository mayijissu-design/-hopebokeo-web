import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Loader2,
  FileUp,
  Sparkles,
  Check,
  FileText,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Image as ImageIcon,
  Video,
  Eye,
  EyeOff,
  Save,
  Upload,
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  Maximize2,
  Minimize2,
  Edit2,
  MapPin,
  Users,
  FolderPlus,
} from 'lucide-react';
import mammoth from 'mammoth';
import { EventData, Language, MonthlyReportItem } from '../types';
import { formatDateRange } from '../utils/dateFormatter';
import { MultiImageUploader } from './MultiImageUploader';
import { RichTextEditor, cleanRichHtml } from './RichTextEditor';
import { saveEventToFirestore } from '../lib/firestore-service';
import { uploadFileDirectly } from '../utils/fileUploader';
import { PdfThumbnail } from './PdfThumbnail';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit: EventData | null;
  onSaveSuccess: (savedEvent?: EventData) => void;
  language: Language;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  onSaveSuccess,
  language,
}) => {
  const [formData, setFormData] = useState<Partial<EventData>>({
    rowId: 0,
    title: '',
    titleEn: '',
    titleTh: '',
    description: '',
    descriptionEn: '',
    descriptionTh: '',
    date: new Date().toISOString().split('T')[0],
    endDate: '',
    imageUrl: '',
    imageUrls: [],
    videoUrl: '',
    docUrl: '',
    hidden: false,
    monthlyReports: [],
  });
  const [eventImages, setEventImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [descLangTab, setDescLangTab] = useState<Language>('lo');
  const [isImportingDoc, setIsImportingDoc] = useState(false);
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [eventDocs, setEventDocs] = useState<string[]>([]);

  // Split tabs for Right Panel: 'narrative' (Event Overview) vs 'subReports' (Sub-events & Monthly Reports)
  const [activeRightTab, setActiveRightTab] = useState<'narrative' | 'subReports'>('narrative');

  // Sub-report editing state
  const [isAddingSubReport, setIsAddingSubReport] = useState(false);
  const [editingSubReportIndex, setEditingSubReportIndex] = useState<number | null>(null);
  const [subReportLangTab, setSubReportLangTab] = useState<'lo' | 'th' | 'en'>('lo');
  const [subReportPdfName, setSubReportPdfName] = useState<string | null>(null);
  const [isUploadingSubPdf, setIsUploadingSubPdf] = useState(false);
  const [subReportImages, setSubReportImages] = useState<string[]>([]);
  const [subReportDocs, setSubReportDocs] = useState<string[]>([]);
  const [subReportForm, setSubReportForm] = useState<Partial<MonthlyReportItem>>({
    id: '',
    month: new Date().toISOString().substring(0, 7),
    date: new Date().toISOString().split('T')[0],
    endDate: '',
    title: '',
    titleEn: '',
    titleTh: '',
    summary: '',
    summaryEn: '',
    summaryTh: '',
    location: '',
    attendees: 0,
    videoUrl: '',
    docUrl: '',
  });

  const mainDocFileInputRef = useRef<HTMLInputElement>(null);
  const pdfDirectFileInputRef = useRef<HTMLInputElement>(null);
  const subReportPdfInputRef = useRef<HTMLInputElement>(null);

  // ESC key to go back / close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (eventToEdit) {
      setFormData({
        ...eventToEdit,
        title: eventToEdit.title || '',
        titleEn: eventToEdit.titleEn || '',
        titleTh: eventToEdit.titleTh || '',
        description: eventToEdit.description || '',
        descriptionEn: eventToEdit.descriptionEn || '',
        descriptionTh: eventToEdit.descriptionTh || '',
        videoUrl: eventToEdit.videoUrl || '',
        docUrl: eventToEdit.docUrl || '',
        hidden: Boolean(eventToEdit.hidden),
        monthlyReports: eventToEdit.monthlyReports || [],
        date: eventToEdit.date
          ? new Date(eventToEdit.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        endDate: eventToEdit.endDate
          ? new Date(eventToEdit.endDate).toISOString().split('T')[0]
          : '',
      });

      const initialImgs: string[] = [];
      if (eventToEdit.imageUrls && eventToEdit.imageUrls.length > 0) {
        eventToEdit.imageUrls.forEach((img) => {
          if (img && img.trim()) initialImgs.push(img.trim());
        });
      }
      if (eventToEdit.imageUrl && !initialImgs.includes(eventToEdit.imageUrl.trim())) {
        initialImgs.unshift(eventToEdit.imageUrl.trim());
      }
      setEventImages(initialImgs);

      if (eventToEdit.docUrl || (Array.isArray(eventToEdit.docUrls) && eventToEdit.docUrls.length > 0)) {
        const initialDocs: string[] = [];
        if (Array.isArray(eventToEdit.docUrls)) {
          eventToEdit.docUrls.forEach((d) => {
            if (d && d.trim() && !initialDocs.includes(d.trim())) initialDocs.push(d.trim());
          });
        }
        if (eventToEdit.docUrl && eventToEdit.docUrl.trim() && !initialDocs.includes(eventToEdit.docUrl.trim())) {
          initialDocs.unshift(eventToEdit.docUrl.trim());
        }
        setEventDocs(initialDocs);
        setPdfFileName(`${initialDocs.length} Document(s) Attached`);
      } else {
        setEventDocs([]);
        setPdfFileName(null);
      }
    } else {
      setFormData({
        rowId: 0,
        title: '',
        titleEn: '',
        titleTh: '',
        description: '',
        descriptionEn: '',
        descriptionTh: '',
        date: new Date().toISOString().split('T')[0],
        imageUrl: '',
        imageUrls: [],
        videoUrl: '',
        docUrl: '',
        docUrls: [],
        hidden: false,
        monthlyReports: [],
      });
      setEventImages([]);
      setEventDocs([]);
      setPdfFileName(null);
    }
    setIsAddingSubReport(false);
    setEditingSubReportIndex(null);
  }, [eventToEdit, isOpen]);

  // Sub-Report management handlers
  const handleStartAddSubReport = () => {
    setSubReportForm({
      id: `sub_${Date.now()}`,
      month: new Date().toISOString().substring(0, 7),
      date: new Date().toISOString().split('T')[0],
      endDate: '',
      title: '',
      titleEn: '',
      titleTh: '',
      summary: '',
      summaryEn: '',
      summaryTh: '',
      location: '',
      attendees: 0,
      videoUrl: '',
      docUrl: '',
      docUrls: [],
    });
    setSubReportImages([]);
    setSubReportDocs([]);
    setSubReportPdfName(null);
    setEditingSubReportIndex(null);
    setIsAddingSubReport(true);
  };

  const handleStartEditSubReport = (report: MonthlyReportItem, index: number) => {
    setSubReportForm({
      ...report,
      endDate: report.endDate || '',
    });
    const imgs: string[] = [];
    if (report.imageUrls && report.imageUrls.length > 0) {
      report.imageUrls.forEach((img) => {
        if (img && img.trim()) imgs.push(img.trim());
      });
    } else if (report.imageUrl && report.imageUrl.trim()) {
      imgs.push(report.imageUrl.trim());
    }
    setSubReportImages(imgs);

    const sDocs: string[] = [];
    if (Array.isArray(report.docUrls)) {
      report.docUrls.forEach((d) => {
        if (d && d.trim() && !sDocs.includes(d.trim())) sDocs.push(d.trim());
      });
    }
    if (report.docUrl && report.docUrl.trim() && !sDocs.includes(report.docUrl.trim())) {
      sDocs.unshift(report.docUrl.trim());
    }
    setSubReportDocs(sDocs);
    setSubReportPdfName(sDocs.length > 0 ? `${sDocs.length} Document(s) Attached` : null);
    setEditingSubReportIndex(index);
    setIsAddingSubReport(true);
  };

  const handleSaveSubReport = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const validImgs = subReportImages.filter((u) => u && typeof u === 'string' && u.trim());
    const newReport: MonthlyReportItem = {
      id: subReportForm.id || `sub_${Date.now()}`,
      month: subReportForm.month || new Date().toISOString().substring(0, 7),
      date: subReportForm.date || new Date().toISOString().split('T')[0],
      endDate: subReportForm.endDate?.trim() || undefined,
      title: subReportForm.title || '',
      titleEn: subReportForm.titleEn || '',
      titleTh: subReportForm.titleTh || '',
      summary: subReportForm.summary || '',
      summaryEn: subReportForm.summaryEn || '',
      summaryTh: subReportForm.summaryTh || '',
      location: subReportForm.location || '',
      attendees: Number(subReportForm.attendees) || 0,
      imageUrls: validImgs,
      imageUrl: validImgs[0] || '',
      docUrl: subReportDocs[0] || '',
      docUrls: subReportDocs,
      videoUrl: subReportForm.videoUrl || '',
    };

    const currentReports = [...(formData.monthlyReports || [])];
    if (editingSubReportIndex !== null && editingSubReportIndex >= 0) {
      currentReports[editingSubReportIndex] = newReport;
    } else {
      currentReports.push(newReport);
    }

    // Sort descending by month / date
    currentReports.sort((a, b) => (b.month || b.date || '').localeCompare(a.month || a.date || ''));

    setFormData((prev) => ({
      ...prev,
      monthlyReports: currentReports,
    }));

    setIsAddingSubReport(false);
    setEditingSubReportIndex(null);
  };

  const handleDeleteSubReport = (index: number) => {
    const confirmMsg =
      language === 'lo'
        ? 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບສັບອີເວັນນີ້?'
        : language === 'th'
        ? 'คุณแน่ใจหรือไม่ว่าต้องการลบซับอีเวนต์นี้?'
        : 'Are you sure you want to delete this sub-event?';
    if (window.confirm(confirmMsg)) {
      const currentReports = [...(formData.monthlyReports || [])];
      currentReports.splice(index, 1);
      setFormData((prev) => ({ ...prev, monthlyReports: currentReports }));
    }
  };

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
      setSubReportDocs((prev) => [...prev, ...uploadedUrls]);
      setSubReportForm((prev) => {
        const allDocs = [...(prev.docUrls || []), ...uploadedUrls];
        return {
          ...prev,
          docUrls: allDocs,
          docUrl: prev.docUrl || allDocs[0] || '',
        };
      });
      setSubReportPdfName(`${files.length} File(s) Uploaded`);
    } catch (err: any) {
      console.error('Sub-report document upload error:', err);
      alert('Upload failed: ' + (err?.message || 'Error'));
    } finally {
      setIsUploadingSubPdf(false);
      if (subReportPdfInputRef.current) subReportPdfInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  // Handle document import directly into entire form (.docx, .pdf, .json, .html, .txt)
  const handleImportDocumentFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingDoc(true);
    setImportStatusMsg(null);

    try {
      const fileName = file.name.toLowerCase();
      const rawTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      // 1. Upload the file to server immediately so it is attached as a document
      let uploadedFileUrl = '';
      try {
        const uploadRes = await uploadFileDirectly(file);
        if (uploadRes?.url) {
          uploadedFileUrl = uploadRes.url;
          setEventDocs((prev) => (prev.includes(uploadedFileUrl) ? prev : [...prev, uploadedFileUrl]));
          setFormData((prev) => {
            const allDocs = Array.from(new Set([...(prev.docUrls || []), uploadedFileUrl]));
            return {
              ...prev,
              docUrls: allDocs,
              docUrl: prev.docUrl || allDocs[0] || '',
            };
          });
          setPdfFileName(file.name);
        }
      } catch (upErr) {
        console.warn('File direct upload during import notice:', upErr);
      }

      if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const sanitized = cleanRichHtml(result.value);

          setFormData((prev) => ({
            ...prev,
            title: prev.title || rawTitle,
            description: sanitized,
          }));
        } catch (mErr) {
          console.warn('Mammoth docx parse notice:', mErr);
        }

        setImportStatusMsg(
          language === 'lo'
            ? `ອິມພອດ ແລະ ແນບເອກະສານ "${file.name}" ສຳເລັດ!`
            : language === 'th'
            ? `นำเข้าและแนบเอกสาร "${file.name}" สำเร็จ!`
            : `Successfully attached & imported "${file.name}"!`
        );
      } else if (fileName.endsWith('.pdf')) {
        setFormData((prev) => ({
          ...prev,
          title: prev.title || rawTitle,
        }));
        setImportStatusMsg(
          language === 'lo'
            ? `ອິມພອດ ແລະ ແນບຟາຍ PDF "${file.name}" ສຳເລັດ!`
            : `Attached PDF "${file.name}" successfully!`
        );
      } else if (fileName.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        setFormData((prev) => ({
          ...prev,
          title: parsed.title || prev.title || rawTitle,
          titleEn: parsed.titleEn || prev.titleEn,
          titleTh: parsed.titleTh || prev.titleTh,
          date: parsed.date || prev.date,
          videoUrl: parsed.videoUrl || prev.videoUrl,
          docUrl: parsed.docUrl || prev.docUrl,
          description: parsed.description ? cleanRichHtml(parsed.description) : prev.description,
          descriptionEn: parsed.descriptionEn ? cleanRichHtml(parsed.descriptionEn) : prev.descriptionEn,
          descriptionTh: parsed.descriptionTh ? cleanRichHtml(parsed.descriptionTh) : prev.descriptionTh,
        }));
        if (Array.isArray(parsed.imageUrls) && parsed.imageUrls.length > 0) {
          setEventImages(parsed.imageUrls);
        }
        setImportStatusMsg(`Imported report package "${file.name}" successfully!`);
      } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        const text = await file.text();
        const sanitized = cleanRichHtml(text);
        setFormData((prev) => ({
          ...prev,
          title: prev.title || rawTitle,
          description: sanitized,
        }));
        setImportStatusMsg(`Imported HTML "${file.name}" successfully!`);
      } else {
        // Plain text (.txt, .md, .rtf)
        const text = await file.text();
        const formatted = text
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => `<p>${line}</p>`)
          .join('');
        setFormData((prev) => ({
          ...prev,
          title: prev.title || rawTitle,
          description: formatted || `<p>${text}</p>`,
        }));
        setImportStatusMsg(`Imported text report "${file.name}"!`);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      alert('Failed to import file: ' + (err?.message || 'Invalid format'));
    } finally {
      setIsImportingDoc(false);
      if (mainDocFileInputRef.current) mainDocFileInputRef.current.value = '';
      setTimeout(() => setImportStatusMsg(null), 5000);
    }
  };

  // Dedicated PDF/Document attachment uploader handler (Multiple files supported)
  const handlePdfDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingPdf(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const result = await uploadFileDirectly(file);
        if (result?.url) {
          uploadedUrls.push(result.url);
        }
      }
      setEventDocs((prev) => [...prev, ...uploadedUrls]);
      setFormData((prev) => {
        const allDocs = [...(prev.docUrls || []), ...uploadedUrls];
        return {
          ...prev,
          docUrls: allDocs,
          docUrl: prev.docUrl || allDocs[0] || '',
        };
      });
      setPdfFileName(`${files.length} Document(s) Attached!`);
      setImportStatusMsg(
        language === 'lo'
          ? `ແນບຟາຍເອກະສານ ${files.length} ຟາຍ ສຳເລັດ!`
          : `Attached ${files.length} document(s)!`
      );
    } catch (err: any) {
      console.error('PDF attach error:', err);
      alert('Failed to attach document: ' + (err?.message || 'Upload error'));
    } finally {
      setIsUploadingPdf(false);
      if (pdfDirectFileInputRef.current) pdfDirectFileInputRef.current.value = '';
      setTimeout(() => setImportStatusMsg(null), 4000);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      const validImages = eventImages.filter((u) => u && typeof u === 'string' && u.trim());
      const mainCover = validImages[0] || formData.imageUrl || '';

      let eventPayload: EventData = {
        rowId: formData.rowId || Date.now(),
        id: formData.id || `E${Math.floor(100 + Math.random() * 900)}`,
        title: formData.title || '',
        titleEn: formData.titleEn || '',
        titleTh: formData.titleTh || '',
        description: formData.description || '',
        descriptionEn: formData.descriptionEn || '',
        descriptionTh: formData.descriptionTh || '',
        date: formData.date || new Date().toISOString().split('T')[0],
        endDate: formData.endDate?.trim() || undefined,
        imageUrl: mainCover,
        imageUrls: validImages,
        videoUrl: formData.videoUrl || '',
        audioUrl: formData.audioUrl || '',
        docUrl: eventDocs[0] || formData.docUrl || '',
        docUrls: eventDocs,
        hidden: Boolean(formData.hidden),
        monthlyReports: formData.monthlyReports || (eventToEdit?.monthlyReports || []),
      };

      // 1. Persist to server first: converts any remaining base64 files to disk, syncs Firestore safely
      let serverSaved = false;
      try {
        const res = await fetch('/api/save-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventPayload),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData?.success && resData.event) {
            eventPayload = { ...eventPayload, ...resData.event };
            serverSaved = true;
          }
        }
      } catch (serverErr) {
        console.warn('Backend event save notify notice:', serverErr);
      }

      // 2. Direct client-side Firestore write ensures instant sync on client
      try {
        await saveEventToFirestore(eventPayload);
      } catch (fsErr) {
        console.warn('Direct Firestore save note:', fsErr);
        if (!serverSaved) throw fsErr;
      }

      onSaveSuccess(eventPayload);
      onClose();
    } catch (err: any) {
      console.error('Event save error:', err);
      alert(err?.message || 'Failed to save event data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col w-screen h-screen overflow-hidden text-slate-900 dark:text-slate-100 animate-fade-in">
      {/* ========================================================================= */}
      {/* 1. TOP STICKY NAVIGATION BAR WITH PROMINENT BACK ARROW & ACTIONS */}
      {/* ========================================================================= */}
      <header className="px-4 sm:px-6 py-3 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg z-20">
        {/* Left: Back Arrow Button & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-2.5 bg-slate-800 hover:bg-[#cc0000] text-slate-200 hover:text-white rounded-xl transition shadow-sm cursor-pointer border border-slate-700 active:scale-95 flex items-center justify-center"
            title={language === 'lo' ? 'ຍ້ອນກັບ (Back / ESC)' : language === 'th' ? 'ย้อนกลับ (Back / ESC)' : 'Back (ESC)'}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 hover:-translate-x-0.5 transition-transform" />
          </button>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#cc0000] text-white flex items-center justify-center font-black shadow-md shrink-0">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h1 className="font-black text-white text-sm sm:text-base leading-tight truncate max-w-xs sm:max-w-md lg:max-w-xl">
                {eventToEdit
                  ? `${language === 'lo' ? 'ແກ້ໄຂບົດລາຍງານ' : 'Edit Report'}: ${eventToEdit.title}`
                  : language === 'lo'
                  ? 'ຂຽນບົດລາຍງານກິດຈະກຳໃໝ່ (Full-Screen Report Writer)'
                  : 'New Event Report Suite'}
              </h1>
              <p className="text-[11px] text-slate-400 hidden md:block">
                {language === 'lo'
                  ? 'ຮອງຮັບການແຕ້ມຮູບແບບ Word ເຕັມຈໍ, ອິມພອດຟາຍ (.docx), ຮູບພາບ ແລະ PDF'
                  : 'Full-screen Word layout with formatting tools, .docx import, photos & PDF support'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Quick Import, Save Button & Close (X) */}
        <div className="flex items-center gap-2">
          {/* Quick Import Word/PDF/File button */}
          <input
            ref={mainDocFileInputRef}
            type="file"
            accept=".docx,.pdf,.doc,.txt,.html,.json"
            onChange={handleImportDocumentFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => mainDocFileInputRef.current?.click()}
            disabled={isImportingDoc}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/30 transition cursor-pointer shadow-xs disabled:opacity-50"
            title={language === 'lo' ? 'ອິມພອດຟາຍ Word / PDF / Document' : 'Import Document File'}
          >
            {isImportingDoc ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <FileUp className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{language === 'lo' ? 'ອິມພອດຟາຍ Word / PDF' : 'Import File'}</span>
          </button>

          {/* Primary Save Button */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#cc0000] hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition hover:scale-102 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{language === 'lo' ? 'ບັນທຶກລາຍງານ' : language === 'th' ? 'บันทึกรายงาน' : 'Save Report'}</span>
          </button>

          {/* Close X */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer border border-slate-700"
            title="Close (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Import feedback banner */}
      {importStatusMsg && (
        <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-bold flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{importStatusMsg}</span>
          </div>
          <button onClick={() => setImportStatusMsg(null)} className="text-white/80 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN FULL-SCREEN WORKSPACE (SPLIT 2-COLUMN RESPONSIVE LAYOUT) */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-100 dark:bg-slate-900">
        {/* LEFT SIDEBAR: Event Metadata, Media Attachments & Gallery (Scrollable) */}
        <aside className="w-full lg:w-[420px] xl:w-[460px] bg-white dark:bg-slate-850 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 sm:p-6 space-y-6 shrink-0">
          {/* Section 1: Event Title */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#cc0000]" />
              <span>{language === 'lo' ? '1. ຫົວຂໍ້ກິດຈະກຳ' : '1. Event Title'}</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                🇱🇦 ຫົວຂໍ້ພາສາລາວ (Lao Title) *
              </label>
              <input
                type="text"
                required
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="ຕົວຢ່າງ: ງານມອບຂອງຂວັນວັນຄຣິດສະມາດ..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                🇹🇭 ຫົວຂໍ້ພາສາໄທ (Thai Title)
              </label>
              <input
                type="text"
                value={formData.titleTh || ''}
                onChange={(e) => setFormData({ ...formData, titleTh: e.target.value })}
                placeholder="ชื่อกิจกรรมภาษาไทย..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                🇬🇧 ຫົວຂໍ້ພາສາອັງກິດ (English Title)
              </label>
              <input
                type="text"
                value={formData.titleEn || ''}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                placeholder="English event title..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Date Range & Visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  📅 {language === 'lo' ? 'ວັນທີເລີ່ມຕົ້ນ (Start Date) *' : language === 'th' ? 'วันที่เริ่มต้น *' : 'Start Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    🏁 {language === 'lo' ? 'ຫາ ວັນທີສິ້ນສຸດ (End Date)' : language === 'th' ? 'ถึง วันที่สิ้นสุด' : 'To End Date'}
                  </label>
                  {formData.endDate && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, endDate: '' })}
                      className="text-[10px] text-red-500 hover:underline cursor-pointer"
                    >
                      {language === 'lo' ? 'ລຶບ' : 'Clear'}
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  min={formData.date || undefined}
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  placeholder="ເລືອກວັນທີສິ້ນສຸດ"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {language === 'lo'
                    ? '(ຖ້າຈັດຫຼາຍມື້: ໃສ່ວັນທີເລີ່ມ ຫາ ວັນທີສິ້ນສຸດ)'
                    : language === 'th'
                    ? '(ถ้าจัดหลายวัน: ใส่วันที่เริ่ม ถึง สิ้นสุด)'
                    : '(For multi-day events)'}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  👁️ {language === 'lo' ? 'ສະຖານະສະແດງຜົນ' : 'Visibility'}
                </label>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, hidden: !prev.hidden }))}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border ${
                    formData.hidden
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                  }`}
                >
                  {formData.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{formData.hidden ? (language === 'lo' ? '🙈 ເຊື່ອງ' : 'Hidden') : (language === 'lo' ? '👁️ ສະແດງ' : 'Visible')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Documents & Media Attachments (Multiple Files Supported) */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>{language === 'lo' ? '2. ແນບເອກະສານ & ວິດີໂອ (ຫຼາຍຟາຍ)' : '2. Documents & Media Attachments'}</span>
            </div>

            {/* Dedicated Documents Attachment Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  📄 {language === 'lo' ? 'ແນບຟາຍເອກະສານ (PDF, Word, Excel, ຮູບພາບ)' : 'Attach Documents (PDF, Word, Excel, Images)'}
                </label>
                <input
                  ref={pdfDirectFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,image/*"
                  onChange={handlePdfDirectUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => pdfDirectFileInputRef.current?.click()}
                  disabled={isUploadingPdf}
                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-[11px] font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition cursor-pointer"
                >
                  {isUploadingPdf ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  <span>{language === 'lo' ? 'ອັບໂຫຼດຟາຍ' : 'Upload Files'}</span>
                </button>
              </div>

              {eventDocs.length > 0 ? (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    {eventDocs.map((doc, idx) => {
                      const docName = doc.includes('data:')
                        ? `Document ${idx + 1}`
                        : doc.split('/').pop() || `Document ${idx + 1}`;
                      return (
                        <div
                          key={idx}
                          className="p-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 rounded-xl flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <div className="truncate text-xs font-bold text-blue-900 dark:text-blue-200" title={docName}>
                              {docName}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-300"
                              title="Preview File"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                const next = eventDocs.filter((_, i) => i !== idx);
                                setEventDocs(next);
                                setFormData((prev) => ({
                                  ...prev,
                                  docUrls: next,
                                  docUrl: next[0] || '',
                                }));
                                setPdfFileName(next.length > 0 ? `${next.length} Document(s) Attached` : null);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                              title="Remove File"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Clean Visual Preview Grid for Inspection */}
                  <div className={`pt-1 ${eventDocs.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' : ''}`}>
                    {eventDocs.map((doc, idx) => (
                      <div
                        key={`preview-${idx}`}
                        className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center relative"
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
                        ) : doc.match(/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i) || doc.startsWith('data:image/') ? (
                          <img
                            src={doc}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-contain bg-white dark:bg-slate-800"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-3 text-center gap-1.5">
                            <FileText className="w-8 h-8 text-blue-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                              {doc.split('/').pop() || `File ${idx + 1}`}
                            </span>
                            <a
                              href={doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <span>{language === 'lo' ? 'ເປີດເບິ່ງ' : 'Open file'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  {language === 'lo'
                    ? 'ຍັງບໍ່ທັນມີຟາຍເອກະສານ. ກົດປຸ່ມ "ອັບໂຫຼດຟາຍ" ເພື່ອເລືອກຟາຍ PDF ຫຼື ຮູບພາບໄດ້ຫຼາຍຟາຍ'
                    : 'No document attached. Click "Upload Files" to select multiple files.'}
                </p>
              )}
            </div>

            {/* Video Link */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-red-500" />
                <span>ລິງວິດີໂອ (YouTube / Facebook Video URL)</span>
              </label>
              <input
                type="text"
                value={formData.videoUrl || ''}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Section 3: Photo Gallery Showcase */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                <span>{language === 'lo' ? '3. ຄັງຮູບພາບກິດຈະກຳ' : '3. Event Photo Gallery'}</span>
              </div>
              <span className="text-[11px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                {eventImages.length} ຮູບ
              </span>
            </div>

            <MultiImageUploader
              images={eventImages}
              onChange={(urls) => setEventImages(urls)}
              language={language}
              label={language === 'lo' ? 'ອັບໂຫຼດຮູບພາບປະກອບລາຍງານ' : 'Upload photos for report gallery'}
            />
          </div>
        </aside>

        {/* RIGHT MAIN PANEL: Structured 2-Tab Workspace */}
        <section className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          {/* Main Top Tab Switcher: 1. Event Narrative vs 2. Sub-Events / Monthly Reports */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 pt-3 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto pb-px">
              <button
                type="button"
                onClick={() => {
                  setActiveRightTab('narrative');
                }}
                className={`px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 border-t-2 transition cursor-pointer shrink-0 ${
                  activeRightTab === 'narrative'
                    ? 'bg-white dark:bg-slate-850 text-[#cc0000] border-[#cc0000] shadow-sm'
                    : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800/80'
                }`}
              >
                <span>
                  📖 1.{' '}
                  {language === 'lo'
                    ? 'ຄຳບັນຍາຍພາບລວມກິດຈະກຳ'
                    : language === 'th'
                    ? 'คำบรรยายภาพรวมกิจกรรม'
                    : 'Event Overview & Narrative'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRightTab('subReports');
                }}
                className={`px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 border-t-2 transition cursor-pointer shrink-0 ${
                  activeRightTab === 'subReports'
                    ? 'bg-white dark:bg-slate-850 text-[#cc0000] border-[#cc0000] shadow-sm'
                    : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800/80'
                }`}
              >
                <span>
                  📑 2.{' '}
                  {language === 'lo'
                    ? 'ສັບອີເວັນ & ລາຍງານຍອຍ'
                    : language === 'th'
                    ? 'ซับอีเวนต์ & รายงานย่อย'
                    : 'Sub-Events & Reports'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeRightTab === 'subReports'
                      ? 'bg-red-100 dark:bg-red-950/70 text-[#cc0000] dark:text-red-400'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {formData.monthlyReports?.length || 0}
                </span>
              </button>
            </div>

            {activeRightTab === 'subReports' && !isAddingSubReport && (
              <button
                type="button"
                onClick={handleStartAddSubReport}
                className="mb-2 px-3 py-1.5 bg-[#cc0000] hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'lo' ? '+ ເພີ່ມສັບອີເວັນ' : '+ Add Sub-Event'}</span>
              </button>
            )}
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: EVENT OVERVIEW & NARRATIVE (3 LANGUAGES) */}
          {/* ========================================================================= */}
          {activeRightTab === 'narrative' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Banner Clarifying Event Overview Narrative */}
              <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                    📖
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200">
                      {language === 'lo'
                        ? 'ຄຳບັນຍາຍ & ພາບລວມຂອງກິດຈະກຳ (Event Overview & Narrative) - 3 ພາສາ'
                        : language === 'th'
                        ? 'คำบรรยาย & ภาพรวมของกิจกรรม (Event Overview & Narrative) - 3 ภาษา'
                        : 'Event Overview & Narrative (3 Languages)'}
                    </h4>
                    <p className="text-[11px] text-amber-800 dark:text-amber-400">
                      {language === 'lo'
                        ? '💡 ຫ້ອງນີ້ແມ່ນສຳລັບພິມຄຳບັນຍາຍເຖິງອີເວັນນີ້ (3 ພາສາ). ສ່ວນບົດລາຍງານແຕ່ລະເດືອນ ແລະ ຟາຍຕ່າງໆ ແມ່ນຈະຢູ່ດ້ານລຸ່ມໃນແຖບ "ສັບອີເວັນ & ລາຍງານຍອຍ".'
                        : '💡 Use this box to write the overview & narrative of this event (3 languages). Monthly reports and files belong in the "Sub-Events & Reports" tab.'}
                    </p>
                  </div>
                </div>
                {formData.monthlyReports && formData.monthlyReports.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('subReports')}
                    className="px-2.5 py-1 bg-amber-200/70 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    📑 ມີ {formData.monthlyReports.length} ລາຍງານຍອຍ (ກົດເພື່ອເບິ່ງ)
                  </button>
                )}
              </div>

              {/* Language Selector Tabs for Narrative */}
              <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mr-2">
                    <Globe className="w-4 h-4 text-[#cc0000]" />
                    <span>{language === 'lo' ? 'ພາສາຄຳບັນຍາຍ:' : 'Narrative Language:'}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setDescLangTab('lo')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      descLangTab === 'lo'
                        ? 'bg-[#cc0000] text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>🇱🇦 ພາສາລາວ (Lao)</span>
                    {formData.description && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDescLangTab('th')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      descLangTab === 'th'
                        ? 'bg-[#cc0000] text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>🇹🇭 ພາສາໄທ (Thai)</span>
                    {formData.descriptionTh && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDescLangTab('en')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      descLangTab === 'en'
                        ? 'bg-[#cc0000] text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>🇬🇧 English</span>
                    {formData.descriptionEn && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 font-semibold hidden sm:flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{language === 'lo' ? 'ຈັດແຖວເຕັມຊ້າຍ-ຂວາ (Justified Text)' : 'Justified Formatting Ready'}</span>
                </div>
              </div>

              {/* Full Height Word Canvas for Event Narrative */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4">
                {descLangTab === 'lo' && (
                  <RichTextEditor
                    key="lo-editor"
                    value={formData.description || ''}
                    onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
                    label={
                      language === 'lo'
                        ? '📖 ຄຳບັນຍາຍ & ພາບລວມຂອງກິດຈະກຳ (ພາສາລາວ) - ຮອງຮັບການພິມບັນຍາຍ, ຈັດຮູບແບບ ແລະ ແຊກຮູບພາບ'
                        : 'Event Overview & Narrative (Lao Language)'
                    }
                    language={language}
                    minHeight="480px"
                    className="shadow-sm"
                    onImageAttached={(imgUrl) => {
                      if (!eventImages.includes(imgUrl)) {
                        setEventImages((prev) => [...prev, imgUrl]);
                      }
                    }}
                    onPdfAttached={(pdfUrl, fileName) => {
                      setFormData((prev) => ({ ...prev, docUrl: pdfUrl }));
                      setPdfFileName(fileName);
                    }}
                    onFileImportedTitle={(importedTitle) => {
                      if (!formData.title) setFormData((prev) => ({ ...prev, title: importedTitle }));
                    }}
                  />
                )}

                {descLangTab === 'th' && (
                  <RichTextEditor
                    key="th-editor"
                    value={formData.descriptionTh || ''}
                    onChange={(val) => setFormData((prev) => ({ ...prev, descriptionTh: val }))}
                    label="📖 คำบรรยาย & ภาพรวมของกิจกรรม (ภาษาไทย) - Rich Text Formatting"
                    language={language}
                    minHeight="480px"
                    className="shadow-sm"
                    onImageAttached={(imgUrl) => {
                      if (!eventImages.includes(imgUrl)) {
                        setEventImages((prev) => [...prev, imgUrl]);
                      }
                    }}
                    onPdfAttached={(pdfUrl, fileName) => {
                      setFormData((prev) => ({ ...prev, docUrl: pdfUrl }));
                      setPdfFileName(fileName);
                    }}
                  />
                )}

                {descLangTab === 'en' && (
                  <RichTextEditor
                    key="en-editor"
                    value={formData.descriptionEn || ''}
                    onChange={(val) => setFormData((prev) => ({ ...prev, descriptionEn: val }))}
                    label="📖 Event Overview & Narrative (English) - Full MS Word Formatting"
                    language={language}
                    minHeight="480px"
                    className="shadow-sm"
                    onImageAttached={(imgUrl) => {
                      if (!eventImages.includes(imgUrl)) {
                        setEventImages((prev) => [...prev, imgUrl]);
                      }
                    }}
                    onPdfAttached={(pdfUrl, fileName) => {
                      setFormData((prev) => ({ ...prev, docUrl: pdfUrl }));
                      setPdfFileName(fileName);
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SUB-EVENTS & MONTHLY REPORTS (LIST & INLINE EDITOR) */}
          {/* ========================================================================= */}
          {activeRightTab === 'subReports' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
              {/* Header Banner Clarifying Sub-Events */}
              <div className="px-6 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    📑
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-blue-950 dark:text-blue-200">
                      {language === 'lo'
                        ? 'ສັບອີເວັນ & ລາຍງານຍອຍປະຈຳເດືອນ (Sub-Events & Monthly Reports)'
                        : language === 'th'
                        ? 'ซับอีเวนต์ & รายงานย่อยประจำเดือน (Sub-Events & Monthly Reports)'
                        : 'Sub-Events & Monthly Reports'}
                    </h4>
                    <p className="text-[11px] text-blue-800 dark:text-blue-400">
                      {language === 'lo'
                        ? '💡 ສ່ວນນີ້ແມ່ນລາຍງານລະອຽດແຕ່ລະເດືອນ ຫຼື ສັບອີເວັນ ຢູ່ດ້ານລຸ່ມຂອງກິດຈະກຳ ເຊິ່ງປະກອບມີ: ຫົວຂໍ້ຍອຍ (3 ພາສາ), ເນື້ອໃນລາຍງານ (3 ພາສາ), ຟາຍ PDF, ຮູບພາບ, ແລະ ວິດີໂອ.'
                        : '💡 Monthly sub-reports with sub-topic titles, reports, attached PDFs, photo galleries, and video URLs.'}
                    </p>
                  </div>
                </div>
                {!isAddingSubReport && (
                  <button
                    type="button"
                    onClick={handleStartAddSubReport}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === 'lo' ? '+ ເພີ່ມສັບອີເວັນ / ລາຍງານຍອຍ' : '+ Add Sub-Event'}</span>
                  </button>
                )}
              </div>

              {/* Sub-Events Workspace (Form or List) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {isAddingSubReport ? (
                  /* ========================================================================= */
                  /* SUB-EVENT EDITING FORM */
                  /* ========================================================================= */
                  <form onSubmit={handleSaveSubReport} className="bg-white dark:bg-slate-850 rounded-2xl border border-blue-200 dark:border-blue-900/60 p-5 sm:p-6 shadow-md space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                          {editingSubReportIndex !== null ? '✏️' : '➕'}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {editingSubReportIndex !== null
                              ? language === 'lo'
                                ? 'ແກ້ໄຂສັບອີເວັນ / ລາຍງານຍອຍ'
                                : 'Edit Sub-Event Report'
                              : language === 'lo'
                              ? 'ເພີ່ມສັບອີເວັນ / ລາຍງານຍອຍໃໝ່'
                              : 'Add New Sub-Event Report'}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {language === 'lo'
                              ? 'ກະລຸນາປ້ອນຂໍ້ມູນຫົວຂໍ້ຍອຍ, ເນື້ອໃນລາຍງານລະອຽດ ແລະ ແນບຟາຍ PDF'
                              : 'Enter sub-topic title, monthly detailed narrative, and PDF document.'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSubReport(false);
                          setEditingSubReportIndex(null);
                        }}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                      </button>
                    </div>

                    {/* Month & Date Range Picker */}
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
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          📆 {language === 'lo' ? 'ວັນທີເລີ່ມຕົ້ນ (Start Date)' : language === 'th' ? 'วันที่เริ่มต้น' : 'Start Date'}
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
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
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

                    {/* Language Switcher for Sub-Event */}
                    <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <span>{language === 'lo' ? 'ພາສາສັບອີເວັນ:' : 'Language:'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSubReportLangTab('lo')}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          subReportLangTab === 'lo'
                            ? 'bg-blue-600 text-white shadow-xs'
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
                            ? 'bg-blue-600 text-white shadow-xs'
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
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>🇬🇧 English</span>
                        {subReportForm.titleEn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      </button>
                    </div>

                    {/* Sub-Topic Title & Report Content Fields per Language */}
                    {subReportLangTab === 'lo' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            🇱🇦 ຫົວຂໍ້ຍອຍ / ສັບອີເວັນ (ພາສາລາວ) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="ຕົວຢ່າງ: ລາຍງານການແຈກຢາຍອາຫານ ແລະ ເຄື່ອງນຸ່ງຫົ່ມ..."
                            value={subReportForm.title || ''}
                            onChange={(e) => setSubReportForm({ ...subReportForm, title: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            📝 ເນື້ອໃນລາຍງານລະອຽດປະຈຳເດືອນ (ພາສາລາວ)
                          </label>
                          <textarea
                            rows={6}
                            placeholder="ຂຽນເນື້ອໃນການເຄື່ອນໄຫວລາຍລະອຽດ, ຜົນການດຳເນີນງານ, ສິ່ງທ້າທາຍ ແລະ ແຜນຕໍ່ໜ້າ..."
                            value={subReportForm.summary || ''}
                            onChange={(e) => setSubReportForm({ ...subReportForm, summary: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs leading-relaxed outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    {subReportLangTab === 'th' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            🇹🇭 หัวข้อย่อย / ซับอีเวนต์ (ภาษาไทย)
                          </label>
                          <input
                            type="text"
                            placeholder="หัวข้อย่อยภาษาไทย..."
                            value={subReportForm.titleTh || ''}
                            onChange={(e) => setSubReportForm({ ...subReportForm, titleTh: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            📝 เนื้อหารายงานประจำเดือน (ภาษาไทย)
                          </label>
                          <textarea
                            rows={6}
                            placeholder="เขียนเนื้อหารายงานกิจกรรม ผลการดำเนินงาน..."
                            value={subReportForm.summaryTh || ''}
                            onChange={(e) => setSubReportForm({ ...subReportForm, summaryTh: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs leading-relaxed outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    {subReportLangTab === 'en' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            🇬🇧 Sub-Event Topic / Title (English)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Monthly Outreach & Relief Distribution..."
                            value={subReportForm.titleEn || ''}
                            onChange={(e) => setSubReportForm({ ...subReportForm, titleEn: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            📝 Detailed Monthly Report (English)
                          </label>
                          <textarea
                            rows={6}
                            placeholder="Detailed monthly summary, achievements, and next steps..."
                            value={subReportForm.summaryEn || ''}
                            onChange={(e) => setSubReportForm({ ...subReportForm, summaryEn: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs leading-relaxed outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Location & Attendees */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          📍 ສະຖານທີ່ (Location)
                        </label>
                        <input
                          type="text"
                          placeholder="ຕົວຢ່າງ: ບ້ານນາເລົາ, ເມືອງຕົ້ນເຜິ້ງ"
                          value={subReportForm.location || ''}
                          onChange={(e) => setSubReportForm({ ...subReportForm, location: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400"
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
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    </div>

                    {/* Video URL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        🎥 ລິ້ງວິດີໂອ (YouTube / Video URL)
                      </label>
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={subReportForm.videoUrl || ''}
                        onChange={(e) => setSubReportForm({ ...subReportForm, videoUrl: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>

                    {/* Dedicated Documents Attachment for this Sub-Report (Supports Multiple Files) */}
                    <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-3">
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
                              ? '📤 ອັບໂຫຼດຟາຍ (ຫຼາຍຟາຍ)'
                              : 'Upload Files'}
                          </span>
                        </button>
                      </div>

                      {subReportDocs.length > 0 ? (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {subReportDocs.map((doc, idx) => {
                              const docName = doc.includes('data:')
                                ? `Document ${idx + 1}`
                                : doc.split('/').pop() || `Document ${idx + 1}`;
                              return (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-2 shadow-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 font-bold text-xs">
                                      {idx + 1}
                                    </div>
                                    <div className="truncate text-xs font-bold text-slate-900 dark:text-white" title={docName}>
                                      {docName}
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
                                        setSubReportPdfName(next.length > 0 ? `${next.length} Document(s)` : null);
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

                          {/* 2-column grid preview for clean inspection */}
                          <div className={`pt-1 ${subReportDocs.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' : ''}`}>
                            {subReportDocs.map((doc, idx) => (
                              <div
                                key={idx}
                                className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center"
                              >
                                {doc.toLowerCase().includes('.pdf') || doc.startsWith('data:application/pdf') ? (
                                  <iframe
                                    src={`${doc}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                                    className="w-full h-full border-0 bg-white"
                                    title={`PDF preview ${idx + 1}`}
                                  />
                                ) : (
                                  <img
                                    src={doc}
                                    alt={`Doc preview ${idx + 1}`}
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
                            ? 'ຍັງບໍ່ທັນໄດ້ແນບຟາຍເອກະສານ. ທ່ານສາມາດກົດປຸ່ມ "ອັບໂຫຼດຟາຍ" ເພື່ອເລືອກຟາຍ PDF ຫຼື ຮູບພາບໄດ້ຫຼາຍຟາຍ'
                            : 'No document attached. Click "Upload Files" above to attach documents.'}
                        </p>
                      )}
                    </div>

                    {/* Photos Gallery for this Sub-Report */}
                    <div className="space-y-2">
                      <MultiImageUploader
                        images={subReportImages}
                        onChange={(urls) => setSubReportImages(urls)}
                        language={language}
                        label={language === 'lo' ? '📸 ຄັງຮູບພາບຂອງສັບອີເວັນນີ້ (Photo Gallery)' : 'Sub-Event Photos Gallery'}
                      />
                    </div>

                    {/* Form Action Buttons */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSubReport(false);
                          setEditingSubReportIndex(null);
                        }}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                      </button>

                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
                      >
                        <Save className="w-4 h-4" />
                        <span>
                          {editingSubReportIndex !== null
                            ? language === 'lo'
                              ? 'ບັນທຶກການແກ້ໄຂສັບອີເວັນ'
                              : 'Update Sub-Event'
                            : language === 'lo'
                            ? 'ບັນທຶກສັບອີເວັນ'
                            : 'Save Sub-Event'}
                        </span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ========================================================================= */
                  /* SUB-EVENTS LIST VIEW */
                  /* ========================================================================= */
                  <div className="space-y-4">
                    {formData.monthlyReports && formData.monthlyReports.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {formData.monthlyReports.map((report, idx) => {
                          const displaySubTitle =
                            language === 'th' && report.titleTh
                              ? report.titleTh
                              : language === 'en' && report.titleEn
                              ? report.titleEn
                              : report.title;
                          const displaySubSummary =
                            language === 'th' && report.summaryTh
                              ? report.summaryTh
                              : language === 'en' && report.summaryEn
                              ? report.summaryEn
                              : report.summary;
                          const reportImgs = report.imageUrls && report.imageUrls.length > 0
                            ? report.imageUrls
                            : report.imageUrl
                            ? [report.imageUrl]
                            : [];

                          return (
                            <div
                              key={report.id || idx}
                              className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition space-y-3"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-black">
                                      🗓️ {report.month || 'Monthly Report'}
                                    </span>
                                    {report.date && (
                                      <span className="text-[11px] text-slate-500 font-medium">
                                        • {formatDateRange(report.date, report.endDate, language)}
                                      </span>
                                    )}
                                    {report.location && (
                                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        <span>{report.location}</span>
                                      </span>
                                    )}
                                    {report.attendees ? (
                                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                        <Users className="w-3 h-3 text-slate-400" />
                                        <span>{report.attendees} ຄົນ</span>
                                      </span>
                                    ) : null}
                                  </div>

                                  <h4 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                                    {displaySubTitle}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditSubReport(report, idx)}
                                    className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>{language === 'lo' ? 'ແກ້ໄຂ' : 'Edit'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubReport(idx)}
                                    className="p-1.5 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-800 transition cursor-pointer"
                                    title="Delete Sub-event"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {displaySubSummary && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                  {displaySubSummary}
                                </p>
                              )}

                              {/* Badges and Thumbnail previews */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                  {report.docUrl && (
                                    <a
                                      href={report.docUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800 hover:underline"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>📄 PDF ແນບແລ້ວ</span>
                                      <ExternalLink className="w-3 h-3 opacity-60" />
                                    </a>
                                  )}

                                  {reportImgs.length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                                      <ImageIcon className="w-3.5 h-3.5" />
                                      <span>{reportImgs.length} ຮູບພາບ</span>
                                    </span>
                                  )}

                                  {report.videoUrl && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[11px] font-bold">
                                      <Video className="w-3.5 h-3.5" />
                                      <span>ວິດີໂອ</span>
                                    </span>
                                  )}
                                </div>

                                {reportImgs.length > 0 && (
                                  <div className="flex items-center -space-x-2 overflow-hidden">
                                    {reportImgs.slice(0, 4).map((url, i) => (
                                      <img
                                        key={i}
                                        src={url}
                                        alt="thumbnail"
                                        className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-800 object-cover"
                                      />
                                    ))}
                                    {reportImgs.length > 4 && (
                                      <span className="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-800 bg-slate-200 text-slate-600 text-[10px] font-bold">
                                        +{reportImgs.length - 4}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Empty State */
                      <div className="text-center py-12 px-4 bg-white dark:bg-slate-850 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-xl font-bold">
                          📑
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {language === 'lo'
                            ? 'ຍັງບໍ່ມີສັບອີເວັນ / ລາຍງານຍອຍປະຈຳເດືອນ'
                            : 'No Sub-Events / Monthly Reports Added Yet'}
                        </h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          {language === 'lo'
                            ? 'ທ່ານສາມາດເພີ່ມບົດລາຍງານຍອຍປະຈຳເດືອນ ພ້ອມຫົວຂໍ້ຍອຍ, ເນື້ອໃນລາຍງານລະອຽດ, ຟາຍ PDF ແລະ ຮູບພາບໄດ້ທີ່ນີ້'
                            : 'Add monthly sub-reports with sub-topic titles, reports, attached PDFs, and photos.'}
                        </p>
                        <button
                          type="button"
                          onClick={handleStartAddSubReport}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{language === 'lo' ? '+ ເພີ່ມສັບອີເວັນທຳອິດ' : '+ Add First Sub-Event'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Canvas Footer Action Bar */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
              <span>{language === 'lo' ? 'ສະຖານະ:' : 'Status:'}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {language === 'lo' ? '✓ ພ້ອມບັນທຶກ' : 'Ready'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="p-2 sm:p-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer flex items-center justify-center active:scale-95 shadow-xs"
                title={language === 'lo' ? 'ຍ້ອນກັບ / ຍົກເລີກ' : 'Back / Cancel'}
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="px-6 py-2 bg-[#cc0000] hover:bg-red-700 text-white font-black rounded-xl shadow-md transition hover:scale-102 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{language === 'lo' ? 'ບັນທຶກລາຍງານ' : language === 'th' ? 'บันทึกรายงาน' : 'Save Report'}</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

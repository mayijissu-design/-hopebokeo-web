import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Table as TableIcon,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  CheckCircle2,
  Eye,
  Code,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Palette,
  Highlighter,
  Eraser,
  ClipboardPaste,
  Undo2,
  Redo2,
  Check,
  X,
} from 'lucide-react';
import { Language, UpcomingScheduleItem } from '../types';
import { sanitizeWordHtml, formatPlainTextToHtml } from '../utils/wordPasteHelper';

interface WordStyleScheduleEditorProps {
  disabled?: boolean;
  language: Language;
  schedule: UpcomingScheduleItem[];
  onChangeSchedule: (schedule: UpcomingScheduleItem[]) => void;
  scheduleHtml?: string;
  onChangeScheduleHtml?: (html: string) => void;
}

// Color presets for rich text toolbar
const TEXT_COLORS = [
  { label: 'Default', value: 'inherit' },
  { label: 'Black', value: '#0f172a' },
  { label: 'Dark Gray', value: '#475569' },
  { label: 'Red (Hope)', value: '#cc0000' },
  { label: 'Amber / Gold', value: '#d97706' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Purple', value: '#9333ea' },
  { label: 'White', value: '#ffffff' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: 'transparent' },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Cyan', value: '#a5f3fc' },
  { label: 'Rose', value: '#fecdd3' },
];

// Preset schedule templates for the structured table
const PRESET_TEMPLATES: {
  id: string;
  labelLo: string;
  labelEn: string;
  items: Omit<UpcomingScheduleItem, 'id'>[];
}[] = [
  {
    id: 'camp_2d1n',
    labelLo: '🏕️ ແມ່ແບບ: ງານຄ້າຍຜູ້ນຳ 2 ວັນ 1 ຄືນ (Camp Schedule)',
    labelEn: '🏕️ 2-Day Leadership Camp Schedule',
    items: [
      { time: '08:00 - 09:00', activity: 'ລົງທະບຽນ, ຮັບປ້າຍຊື່ ແລະ ເອກະສານ', speaker: 'ທີມງານຕ້ອນຮັບ', location: 'ຈຸດລົງທະບຽນ' },
      { time: '09:00 - 10:30', activity: 'ນະມັດສະການ ແລະ ພິທີເປີດງານຄ້າຍ', speaker: 'ທີມນະມັດສະການ & ປະທານຄຣິສຕະຈັກ', location: 'ຫ້ອງປະຊຸມໃຫຍ່' },
      { time: '10:30 - 12:00', activity: 'ບົດຮຽນທີ 1: ຫົວໃຈຂອງຜູ້ນຳຕາມແບບພຣະເຢຊູ', speaker: 'ອາຈານຮັບເຊີນ', location: 'ຫ້ອງປະຊຸມໃຫຍ່' },
      { time: '12:00 - 13:30', activity: 'ຮັບປະທານອາຫານທ່ຽງ ແລະ ພັກຜ່ອນ', speaker: 'ທີມແມ່ຄົວ', location: 'ໂຮງອາຫານ' },
      { time: '13:30 - 15:30', activity: 'ກິດຈະກຳສ້າງຄວາມສຳພັນ ແລະ ສຶກສາກຸ່ມຍ່ອຍ', speaker: 'ທີມງານຊາວໜຸ່ມ', location: 'ລານກິດຈະກຳ' },
      { time: '15:30 - 17:00', activity: 'ບົດຮຽນທີ 2: ການຮັບໃຊ້ດ້ວຍຄວາມຮັກ ແລະ ຄວາມສັດຊື່', speaker: 'ອາຈານຮັບເຊີນ', location: 'ຫ້ອງປະຊຸມໃຫຍ່' },
      { time: '18:00 - 19:30', activity: 'ຮັບປະທານອາຫານແລງ', speaker: 'ທຸກຄົນ', location: 'ໂຮງອາຫານ' },
      { time: '19:30 - 21:30', activity: 'ຄ່ຳຄືນແຫ່ງການຟື້ນຟູ ແລະ ອະທິຖານອ້ອນວອນ', speaker: 'ຄະນະຜູ້ນຳທຸກຄົນ', location: 'ຫ້ອງປະຊຸມໃຫຍ່' },
    ],
  },
  {
    id: 'seminar_1day',
    labelLo: '📖 ແມ່ແບບ: ກຳນົດການສຳມະນາ 1 ວັນ (1-Day Seminar)',
    labelEn: '📖 1-Day Seminar Schedule',
    items: [
      { time: '08:30 - 09:00', activity: 'ລົງທະບຽນ ແລະ ຮັບປະທານອາຫານຫວ່າງເຊົ້າ', speaker: 'ຝ່າຍຕ້ອນຮັບ', location: 'ໜ້າຫ້ອງປະຊຸມ' },
      { time: '09:00 - 09:30', activity: 'ນະມັດສະການເປີດງານ ແລະ ອະທິຖານມອບງານ', speaker: 'ທີມນະມັດສະການ', location: 'ຫ້ອງປະຊຸມ' },
      { time: '09:30 - 11:30', activity: 'ຊ່ວງທີ 1: ຫຼັກການພັດທະນາງານພັນທະກິດ', speaker: 'ວິທະຍາກອນ', location: 'ຫ້ອງປະຊຸມ' },
      { time: '12:00 - 13:30', activity: 'ພັກຮັບປະທານອາຫານທ່ຽງ', speaker: '-', location: 'ໂຮງອາຫານ' },
      { time: '13:30 - 15:30', activity: 'ຊ່ວງທີ 2: ເວີກຊັອບປະຕິບັດຕົວຈິງໃນຊຸມຊົນ', speaker: 'ວິທະຍາກອນ & ຜູ້ນຳກຸ່ມ', location: 'ຫ້ອງປະຊຸມ' },
      { time: '15:30 - 16:30', activity: 'ຖາມ-ຕອບ, ສະຫຼຸບ ແລະ ອະທິຖານອວຍພອນ', speaker: 'ຄະນະກຳມະການ', location: 'ຫ້ອງປະຊຸມ' },
    ],
  },
  {
    id: 'sunday_special',
    labelLo: '⛪ ແມ່ແບບ: ລາຍການນະມັດສະການພິເສດ (Worship Service)',
    labelEn: '⛪ Special Worship & Celebration Schedule',
    items: [
      { time: '08:30 - 09:00', activity: 'ອະທິຖານກ່ອນການນະມັດສະການ', speaker: 'ທີມອະທິຖານ', location: 'ຫ້ອງອະທິຖານ' },
      { time: '09:00 - 09:45', activity: 'ການນະມັດສະການ ແລະ ສັນລະເສີນພຣະເຈົ້າ', speaker: 'ທີມນະມັດສະການ', location: 'ພຣະວິຫານ' },
      { time: '09:45 - 10:00', activity: 'ຖວາຍຊັບ, ແຈ້ງການຂ່າວສານ ແລະ ຕ້ອນຮັບສະມາຊິກໃໝ່', speaker: 'ຜູ້ດຳເນີນລາຍການ', location: 'ພຣະວິຫານ' },
      { time: '10:00 - 11:00', activity: 'ເທດສະໜາສັ່ງສອນພຣະຄຳ', speaker: 'ສິດຍາພິບານ', location: 'ພຣະວິຫານ' },
      { time: '11:00 - 11:15', activity: 'ອະທິຖານຕອບສະໜອງ ແລະ ອວຍພອນ', speaker: 'ສິດຍາພິບານ', location: 'ພຣະວິຫານ' },
      { time: '11:30 - 13:00', activity: 'ສາມັກຄີທຳ ແລະ ຮັບປະທານອາຫານຮ່ວມກັນ', speaker: 'ທຸກຄົນ', location: 'ໂຮງອາຫານ' },
    ],
  },
];

export const WordStyleScheduleEditor: React.FC<WordStyleScheduleEditorProps> = ({
  disabled = false,
  language = 'lo',
  schedule,
  onChangeSchedule,
  scheduleHtml = '',
  onChangeScheduleHtml,
}) => {
  // Default to Word Document Paste tab since users frequently copy-paste from Word
  const [activeTab, setActiveTab] = useState<'word_doc' | 'grid'>('word_doc');
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [pasteSuccessNotice, setPasteSuccessNotice] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  // Synchronize internal editor HTML with props when not focused
  useEffect(() => {
    if (editorRef.current && !isHtmlMode) {
      if (editorRef.current.innerHTML !== scheduleHtml) {
        editorRef.current.innerHTML = scheduleHtml || '';
      }
    }
  }, [scheduleHtml, isHtmlMode]);

  const handleEditorInput = () => {
    if (!editorRef.current || !onChangeScheduleHtml) return;
    const html = editorRef.current.innerHTML;
    onChangeScheduleHtml(html);
  };

  // Intercept Paste event to strictly keep 100% of Word / Excel / Google Docs formatting, styles, tables, & colors
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled || isHtmlMode) return;
    e.preventDefault();

    const clipboardData = e.clipboardData;
    const htmlData = clipboardData.getData('text/html');
    const plainText = clipboardData.getData('text/plain');

    let contentToInsert = '';

    if (htmlData && htmlData.trim()) {
      contentToInsert = sanitizeWordHtml(htmlData);
    } else if (plainText && plainText.trim()) {
      contentToInsert = formatPlainTextToHtml(plainText);
    }

    if (contentToInsert) {
      document.execCommand('insertHTML', false, contentToInsert);
      handleEditorInput();
      setPasteSuccessNotice(
        language === 'lo'
          ? '✅ ຄັດລອກ ແລະ ວາງເນື້ອໃນສຳເລັດ! ຮັກສາຮູບແບບຕາຕະລາງ, ສີສັນ ແລະ ຕົວໜັງສືຕາມຕົ້ນສະບັບ 100%'
          : '✅ Pasted successfully! 100% of Word tables, colors, styles & formatting preserved.'
      );
      setTimeout(() => setPasteSuccessNotice(null), 5000);
    }
  };

  // Dedicated button to trigger or guide clipboard paste
  const handleTriggerPaste = async () => {
    if (disabled || isHtmlMode) return;

    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        let foundHtml = '';
        let foundText = '';

        for (const item of items) {
          if (item.types.includes('text/html')) {
            const blob = await item.getType('text/html');
            foundHtml = await blob.text();
            break;
          } else if (item.types.includes('text/plain')) {
            const blob = await item.getType('text/plain');
            foundText = await blob.text();
          }
        }

        let content = '';
        if (foundHtml) {
          content = sanitizeWordHtml(foundHtml);
        } else if (foundText) {
          content = formatPlainTextToHtml(foundText);
        }

        if (content) {
          editorRef.current?.focus();
          document.execCommand('insertHTML', false, content);
          handleEditorInput();
          setPasteSuccessNotice(
            language === 'lo'
              ? '✅ ວາງເນື້ອໃນຈາກ Clipboard ສຳເລັດ! ຮັກສາຮູບແບບຕາຕະລາງ ແລະ ສີສັນຕາມຕົ້ນສະບັບ'
              : '✅ Pasted from Clipboard! Tables, colors and formatting fully preserved.'
          );
          setTimeout(() => setPasteSuccessNotice(null), 5000);
          return;
        }
      }
    } catch {
      // If browser clipboard permission is blocked, prompt the user clearly
    }

    editorRef.current?.focus();
    alert(
      language === 'lo'
        ? '💡 ກະລຸນາກົດປຸ່ມ Ctrl+V (ຫຼື Command+V ເທິງ Mac) ເພື່ອວາງເນື້ອໃນທີ່ຄັດລອກມາຈາກ Word / Excel ລົງໃນກ່ອງເອກະສານໄດ້ເລີຍ!'
        : '💡 Please press Ctrl+V (or Cmd+V on Mac) to paste your copied Word / Excel content into the document area!'
    );
  };

  // Formatting execution command
  const executeCommand = (command: string, val: string | undefined = undefined) => {
    if (disabled || isHtmlMode) return;
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    handleEditorInput();
  };

  // Insert sample timetable table
  const handleInsertSampleTable = () => {
    if (disabled || isHtmlMode) return;
    const sampleTableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1.5px solid #2563eb;">
        <thead>
          <tr style="background-color: #1e40af; color: #ffffff;">
            <th style="padding: 10px 12px; border: 1px solid #3b82f6; text-align: center; width: 22%;">⏰ ເວລາ (Time)</th>
            <th style="padding: 10px 12px; border: 1px solid #3b82f6; text-align: left; width: 45%;">📝 ລາຍການ / ກິດຈະກຳ</th>
            <th style="padding: 10px 12px; border: 1px solid #3b82f6; text-align: left; width: 33%;">👤 ຜູ້ຮັບຜິດຊອບ</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background-color: #ffffff; color: #0f172a;">
            <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; text-align: center;">08:30 - 09:00</td>
            <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">ລົງທະບຽນ ແລະ ຕ້ອນຮັບສະມາຊິກ</td>
            <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">ທີມຕ້ອນຮັບ</td>
          </tr>
          <tr style="background-color: #f8fafc; color: #0f172a;">
            <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; text-align: center;">09:00 - 10:30</td>
            <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">ນະມັດສະການ ແລະ ພິທີເປີດ</td>
            <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">ທີມນະມັດສະການ</td>
          </tr>
          <tr style="background-color: #ffffff; color: #0f172a;">
            <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; text-align: center;">10:30 - 12:00</td>
            <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">ບົດຮຽນ ແລະ ຄຳເທດສະໜາ</td>
            <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">ອາຈານຮັບເຊີນ</td>
          </tr>
        </tbody>
      </table>
      <p></p>
    `;
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, sampleTableHtml);
    handleEditorInput();
  };

  // Grid Table Handlers
  const handleAddRow = () => {
    const newItem: UpcomingScheduleItem = {
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time: '08:00 - 09:00',
      activity: '',
      speaker: '',
      location: '',
      note: '',
    };
    onChangeSchedule([...schedule, newItem]);
  };

  const handleUpdateRow = (id: string, field: keyof UpcomingScheduleItem, value: string) => {
    const updated = schedule.map((row) => (row.id === id ? { ...row, [field]: value } : row));
    onChangeSchedule(updated);
  };

  const handleDeleteRow = (id: string) => {
    onChangeSchedule(schedule.filter((row) => row.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...schedule];
    const temp = newItems[index - 1];
    newItems[index - 1] = newItems[index];
    newItems[index] = temp;
    onChangeSchedule(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index >= schedule.length - 1) return;
    const newItems = [...schedule];
    const temp = newItems[index + 1];
    newItems[index + 1] = newItems[index];
    newItems[index] = temp;
    onChangeSchedule(newItems);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = PRESET_TEMPLATES.find((p) => p.id === presetId);
    if (!preset) return;

    const newRows: UpcomingScheduleItem[] = preset.items.map((it, idx) => ({
      ...it,
      id: `preset-${presetId}-${idx}-${Date.now()}`,
    }));

    if (schedule.length > 0) {
      const confirmText =
        language === 'lo'
          ? 'ທ່ານຕ້ອງການປ່ຽນແທນຕາຕະລາງປະຈຸບັນດ້ວຍແມ່ແບບນີ້ແທ້ບໍ່?'
          : 'Replace current schedule with this preset template?';
      if (!window.confirm(confirmText)) return;
    }

    onChangeSchedule(newRows);
  };

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black shadow-xs">
            <span className="text-white text-lg">W</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wide">
                {language === 'lo'
                  ? 'ຕາຕະລາງງານ & ເນື້ອໃນ Word (ຮັກສາຮູບແບບຕົ້ນສະບັບ 100%)'
                  : 'Word Document & Schedule Editor (100% Original Style)'}
              </span>
            </div>
            <p className="text-[11px] text-blue-100">
              {language === 'lo'
                ? 'ຄັດລອກ (Copy) ຕາຕະລາງ, ຂໍ້ຄວາມ ແລະ ສີສັນຈາກ Word/Excel ແລ້ວມາວາງ (Paste) ໄດ້ທັນທີ'
                : 'Copy & paste tables, formatted text, and colors directly from Word or Excel'}
            </p>
          </div>
        </div>

        {/* Tab switcher: Word Document (Primary) vs Table Grid (Secondary) */}
        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('word_doc')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'word_doc'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'lo' ? '📋 ຄັດລອກຈາກ Word (ແນະນຳ)' : '📋 Paste from Word'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'grid'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>
              {language === 'lo' ? 'ຕາຕະລາງຕາມຊ່ອງ' : 'Table Rows'}
              {schedule.length > 0 && ` (${schedule.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Success Notification on Paste */}
      {pasteSuccessNotice && (
        <div className="mx-3.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {pasteSuccessNotice}
          </span>
          <button
            type="button"
            onClick={() => setPasteSuccessNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: WORD DOCUMENT VISUAL WYSIWYG EDITOR (ຄັດລອກຈາກ WORD 100%) */}
      {/* ============================================================== */}
      {activeTab === 'word_doc' && (
        <div className="p-3 sm:p-4 space-y-3">
          {/* Word Ribbon Formatting Toolbar */}
          <div className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-1 text-xs">
            {/* Quick Paste & Table Insert (Word Ribbon Style) */}
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={handleTriggerPaste}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer disabled:opacity-40"
              title={language === 'lo' ? 'ກົດເພື່ອວາງເນື້ອໃນຈາກ Word (Ctrl+V)' : 'Paste from Word / Clipboard (Ctrl+V)'}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>{language === 'lo' ? 'ວາງ (Paste)' : 'Paste'}</span>
            </button>
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={handleInsertSampleTable}
              className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-40"
              title={language === 'lo' ? 'ແຊກຕາຕະລາງ' : 'Insert Table'}
            >
              <TableIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'lo' ? 'ຕາຕະລາງ' : 'Table'}</span>
            </button>

            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Undo / Redo */}
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('undo')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-40"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('redo')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-40"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Bold, Italic, Underline, Strikethrough */}
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('bold')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 font-bold transition cursor-pointer text-slate-800 dark:text-slate-200 disabled:opacity-40"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('italic')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 italic transition cursor-pointer text-slate-800 dark:text-slate-200 disabled:opacity-40"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('underline')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 underline transition cursor-pointer text-slate-800 dark:text-slate-200 disabled:opacity-40"
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('strikeThrough')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 line-through transition cursor-pointer text-slate-800 dark:text-slate-200 disabled:opacity-40"
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Text Color Picker */}
            <div className="relative">
              <button
                type="button"
                disabled={disabled || isHtmlMode}
                onClick={() => {
                  setShowColorPicker((prev) => !prev);
                  setShowHighlightPicker(false);
                }}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer text-slate-800 dark:text-slate-200 disabled:opacity-40 flex items-center gap-1"
                title={language === 'lo' ? 'ສີຕົວໜັງສື' : 'Text Color'}
              >
                <Palette className="w-4 h-4 text-red-600" />
                <span className="text-[10px] font-bold">A</span>
              </button>

              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 z-30 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2.5 w-48 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {language === 'lo' ? 'ເລືອກສີຕົວໜັງສື' : 'Select Text Color'}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        title={c.label}
                        onClick={() => {
                          executeCommand('foreColor', c.value);
                          setShowColorPicker(false);
                        }}
                        className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center transition hover:scale-110 shadow-xs cursor-pointer"
                        style={{ backgroundColor: c.value === 'inherit' ? '#e2e8f0' : c.value }}
                      >
                        {c.value === 'inherit' && <span className="text-[9px] font-bold text-slate-700">A</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Highlight Color Picker */}
            <div className="relative">
              <button
                type="button"
                disabled={disabled || isHtmlMode}
                onClick={() => {
                  setShowHighlightPicker((prev) => !prev);
                  setShowColorPicker(false);
                }}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer text-slate-800 dark:text-slate-200 disabled:opacity-40 flex items-center gap-1"
                title={language === 'lo' ? 'ສີໄຮໄລ້ພື້ນຫຼັງ' : 'Highlight Background'}
              >
                <Highlighter className="w-4 h-4 text-amber-500" />
              </button>

              {showHighlightPicker && (
                <div className="absolute top-full left-0 mt-1 z-30 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2.5 w-44 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {language === 'lo' ? 'ເລືອກສີໄຮໄລ້' : 'Select Highlight'}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {HIGHLIGHT_COLORS.map((hl) => (
                      <button
                        key={hl.label}
                        type="button"
                        title={hl.label}
                        onClick={() => {
                          executeCommand('hiliteColor', hl.value);
                          setShowHighlightPicker(false);
                        }}
                        className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center transition hover:scale-110 shadow-xs cursor-pointer"
                        style={{ backgroundColor: hl.value === 'transparent' ? '#ffffff' : hl.value }}
                      >
                        {hl.value === 'transparent' && <span className="text-[9px] font-bold text-slate-400">✕</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Alignments */}
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('justifyLeft')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-40"
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('justifyCenter')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-40"
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('justifyRight')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-40"
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('justifyFull')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-40"
              title="Align Justify"
            >
              <AlignJustify className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Lists */}
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('insertUnorderedList')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-40"
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('insertOrderedList')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer text-slate-700 dark:text-slate-300 disabled:opacity-40"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            {/* Clear Formatting */}
            <button
              type="button"
              disabled={disabled || isHtmlMode}
              onClick={() => executeCommand('removeFormat')}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer text-slate-500 hover:text-red-500 disabled:opacity-40 ml-1"
              title={language === 'lo' ? 'ລຶບຮູບແບບ' : 'Clear Formatting'}
            >
              <Eraser className="w-4 h-4" />
            </button>

            {/* Right: Mode & Clear All Content */}
            <div className="ml-auto flex items-center gap-2">
              {scheduleHtml && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const confirmClear = window.confirm(
                      language === 'lo'
                        ? 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບເນື້ອໃນເອກະສານທັງໝົດນີ້?'
                        : 'Are you sure you want to clear all document content?'
                    );
                    if (confirmClear && onChangeScheduleHtml) {
                      onChangeScheduleHtml('');
                      if (editorRef.current) editorRef.current.innerHTML = '';
                    }
                  }}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'lo' ? 'ລຶບເນື້ອໃນ' : 'Clear'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsHtmlMode((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isHtmlMode
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                }`}
                title={isHtmlMode ? 'View Visual' : 'View Raw HTML Code'}
              >
                {isHtmlMode ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
                <span>{isHtmlMode ? 'Visual' : 'HTML'}</span>
              </button>
            </div>
          </div>

          {/* Visual Canvas Area (Word Document Sheet Style) */}
          <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-inner bg-white dark:bg-slate-900">
            {isHtmlMode ? (
              <textarea
                rows={12}
                disabled={disabled}
                value={scheduleHtml}
                onChange={(e) => onChangeScheduleHtml && onChangeScheduleHtml(e.target.value)}
                placeholder="<table style='...'>...</table>"
                className="w-full p-4 font-mono text-xs bg-slate-950 text-emerald-400 outline-none resize-y"
              />
            ) : (
              <div
                ref={editorRef}
                contentEditable={!disabled}
                onInput={handleEditorInput}
                onPaste={handlePaste}
                onBlur={handleEditorInput}
                className="rich-word-content p-6 min-h-[220px] max-h-[500px] overflow-y-auto outline-none text-slate-900 dark:text-slate-100 text-sm leading-relaxed select-text"
                data-placeholder={
                  language === 'lo'
                    ? 'ຄລິກທີ່ນີ້ ແລ້ວກົດ Ctrl+V ເພື່ອວາງຕາຕະລາງ ຫຼື ເນື້ອໃນທີ່ຄັດລອກມາຈາກ Word / Excel...'
                    : 'Click here and press Ctrl+V to paste tables or text copied from Word / Excel...'
                }
              />
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: STRUCTURED TABLE ROWS (ຕາຕະລາງລາຍການກຳນົດການ) */}
      {/* ============================================================== */}
      {activeTab === 'grid' && (
        <div className="p-3 sm:p-4 space-y-3">
          {/* Quick Actions Bar for Rows */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={handleAddRow}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>{language === 'lo' ? 'ເພີ່ມແຖວຕາຕະລາງ' : 'Add Row'}</span>
              </button>

              {/* Preset Template Selector */}
              <div className="relative inline-block">
                <select
                  disabled={disabled}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleApplyPreset(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
                >
                  <option value="" disabled>
                    {language === 'lo' ? '📋 ເລືອກແມ່ແບບຕາຕະລາງດ່ວນ...' : '📋 Select Preset Template...'}
                  </option>
                  {PRESET_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {language === 'lo' ? tpl.labelLo : tpl.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {schedule.length > 0 && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const confirmClear = window.confirm(
                    language === 'lo'
                      ? 'ທ່ານຕ້ອງການລຶບທຸກແຖວໃນຕາຕະລາງນີ້ແທ້ບໍ່?'
                      : 'Clear all schedule rows?'
                  );
                  if (confirmClear) onChangeSchedule([]);
                }}
                className="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'lo' ? 'ລຶບທັງໝົດ' : 'Clear All'}</span>
              </button>
            )}
          </div>

          {schedule.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
              <TableIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {language === 'lo' ? 'ຍັງບໍ່ມີລາຍການຕາຕະລາງງານ' : 'No schedule items yet'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {language === 'lo'
                  ? 'ກົດປຸ່ມ "ເພີ່ມແຖວຕາຕະລາງ" ຫຼື ເລືອກ "ແມ່ແບບຕາຕະລາງດ່ວນ" ເພື່ອເລີ່ມຕົ້ນ, ຫຼື ໃຊ້ແທັບ "ຄັດລອກຈາກ Word" ເພື່ອວາງຕາຕະລາງທີ່ຄັດລອກມາ'
                  : 'Click "Add Row" or choose a preset template to start, or use "Paste from Word" tab.'}
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={handleAddRow}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
                >
                  + {language === 'lo' ? 'ເພີ່ມແຖວທຳອິດ' : 'Add First Row'}
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleApplyPreset('camp_2d1n')}
                  className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  🏕️ {language === 'lo' ? 'ໃຊ້ແມ່ແບບງານຄ້າຍ' : 'Use Camp Preset'}
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-black">
                    <th className="p-2.5 w-12 text-center">#</th>
                    <th className="p-2.5 w-36">
                      {language === 'lo' ? '⏰ ເວລາ (Time)' : '⏰ Time'}
                    </th>
                    <th className="p-2.5 min-w-[180px]">
                      {language === 'lo' ? '📝 ລາຍການ / ກິດຈະກຳ' : '📝 Activity'}
                    </th>
                    <th className="p-2.5 min-w-[140px]">
                      {language === 'lo' ? '👤 ຜູ້ຮັບຜິດຊອບ' : '👤 Speaker'}
                    </th>
                    <th className="p-2.5 min-w-[140px]">
                      {language === 'lo' ? '📍 ສະຖານທີ່' : '📍 Location'}
                    </th>
                    <th className="p-2.5 w-20 text-center">
                      {language === 'lo' ? 'ຈັດການ' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {schedule.map((row, idx) => (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition group"
                    >
                      <td className="p-2 text-center font-bold text-slate-400 dark:text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          disabled={disabled}
                          value={row.time}
                          onChange={(e) => handleUpdateRow(row.id, 'time', e.target.value)}
                          placeholder="08:00 - 09:00"
                          className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          disabled={disabled}
                          value={row.activity}
                          onChange={(e) => handleUpdateRow(row.id, 'activity', e.target.value)}
                          placeholder={language === 'lo' ? 'ຊື່ກິດຈະກຳ ຫຼື ຫົວຂໍ້' : 'Activity title'}
                          className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          disabled={disabled}
                          value={row.speaker || ''}
                          onChange={(e) => handleUpdateRow(row.id, 'speaker', e.target.value)}
                          placeholder={language === 'lo' ? 'ອາຈານ / ຜູ້ນຳ' : 'Speaker name'}
                          className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          disabled={disabled}
                          value={row.location || ''}
                          onChange={(e) => handleUpdateRow(row.id, 'location', e.target.value)}
                          placeholder={language === 'lo' ? 'ຫ້ອງປະຊຸມ / ໝາຍເຫດ' : 'Room / note'}
                          className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={disabled || idx === 0}
                            onClick={() => handleMoveUp(idx)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={disabled || idx === schedule.length - 1}
                            onClick={() => handleMoveDown(idx)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

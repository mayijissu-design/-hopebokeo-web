import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Users,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Download,
  DollarSign,
  FileSpreadsheet,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Sparkles,
  AlertCircle,
  X,
  Eye,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Building,
  CreditCard,
  Send,
  Phone,
  FileText,
  UserCheck,
  Filter,
  RotateCcw,
  Package,
  CalendarClock,
  Percent,
  Sliders,
  Settings,
  Settings2,
  QrCode,
  Loader2
} from 'lucide-react';
import { DonationTransaction, TeamDistribution, TeamMember, FinanceQrMember, Language, DonationInfo } from '../types';
import { initialDefaultFinanceData } from '../data/financeDefaults';
import initialDefaultFinanceQrMembers from '../data/financeQrDefaults.json';
import { getLocalizedRole } from '../utils/roleUtils';
import {
  saveDonationTransactionToFirestore,
  deleteDonationTransactionFromFirestore,
  saveTeamDistributionToFirestore,
  deleteTeamDistributionFromFirestore,
  deleteBatchDistributionsFromFirestore,
  loadFinanceData,
  saveFinanceSettingsToFirestore,
  loadFinanceQrMembers,
  saveFinanceQrMemberToFirestore,
  deleteFinanceQrMemberFromFirestore,
  saveTeamToFirestore,
} from '../lib/firestore-service';
import { UnifiedMediaUploader } from './UnifiedMediaUploader';
import { generateQRCodeDataUrl } from '../utils/qrCode';
import { db, collection, doc, onSnapshot } from '../lib/firebase';

export interface ParsedBatchMeta {
  round: number;
  month: string;
  year: string;
  labelLao: string;
  labelEn: string;
  monthNameLao: string;
  monthNameEn: string;
  fullTitleLao: string;
  fullTitleEn: string;
}

export const MONTHS_LIST = [
  { num: '01', lao: '1 (ມັງກອນ)', en: '1 (Jan)' },
  { num: '02', lao: '2 (ກຸມພາ)', en: '2 (Feb)' },
  { num: '03', lao: '3 (ມີນາ)', en: '3 (Mar)' },
  { num: '04', lao: '4 (ເມສາ)', en: '4 (Apr)' },
  { num: '05', lao: '5 (ພຶດສະພາ)', en: '5 (May)' },
  { num: '06', lao: '6 (ມິຖຸນາ)', en: '6 (Jun)' },
  { num: '07', lao: '7 (ກໍລະກົດ)', en: '7 (Jul)' },
  { num: '08', lao: '8 (ສິງຫາ)', en: '8 (Aug)' },
  { num: '09', lao: '9 (ກັນຍາ)', en: '9 (Sep)' },
  { num: '10', lao: '10 (ຕຸລາ)', en: '10 (Oct)' },
  { num: '11', lao: '11 (ພະຈິກ)', en: '11 (Nov)' },
  { num: '12', lao: '12 (ທັນວາ)', en: '12 (Dec)' },
];

export function parseBatchMeta(item: {
  batchName?: string;
  batchRound?: number | string;
  batchMonth?: string;
  transferDate?: string;
  period?: string;
}): ParsedBatchMeta {
  const rawName = (item.batchName || '').trim();

  // 1. Detect Round / ຊຸດ / ງວດ
  let round = 1;
  if (item.batchRound !== undefined && item.batchRound !== null && item.batchRound !== '') {
    const parsed = parseInt(String(item.batchRound), 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 500) round = parsed;
  } else if (rawName && !rawName.startsWith('batch_1') && !rawName.startsWith('dist_')) {
    const m = rawName.match(/(?:ຊຸດ|ງວດ|batch|round|#)\s*(?:ທີ\s*)?#?(\d+)/i);
    if (m && m[1]) {
      const parsed = parseInt(m[1], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 500) round = parsed;
    } else {
      const numMatch = rawName.match(/#?(\d+)/);
      if (numMatch && numMatch[1]) {
        const parsed = parseInt(numMatch[1], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 500) round = parsed;
      }
    }
  }

  // 2. Detect Month
  let month = '';
  if (item.batchMonth) {
    const clean = item.batchMonth.replace(/[^0-9]/g, '');
    if (clean) month = clean.padStart(2, '0');
  }
  if (!month) {
    const m = rawName.match(/ເດືອນ\s*(\d{1,2})/i) || rawName.match(/month\s*(\d{1,2})/i);
    if (m && (m[1] || m[2])) {
      const parsed = parseInt(m[1] || m[2], 10);
      if (parsed >= 1 && parsed <= 12) month = String(parsed).padStart(2, '0');
    }
  }
  const laoMonthNameToNum: Record<string, string> = {
    'ມັງກອນ': '01', 'ກຸມພາ': '02', 'ມີນາ': '03', 'ເມສາ': '04',
    'ພຶດສະພາ': '05', 'ມິຖຸນາ': '06', 'ກໍລະກົດ': '07', 'ສິງຫາ': '08',
    'ກັນຍາ': '09', 'ຕຸລາ': '10', 'ພະຈິກ': '11', 'ທັນວາ': '12',
  };
  if (!month) {
    for (const [name, num] of Object.entries(laoMonthNameToNum)) {
      if (rawName.includes(name)) {
        month = num;
        break;
      }
    }
  }
  let year = '2026';
  const dateStr = item.transferDate || item.period || '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0] && parts[0].length === 4) year = parts[0];
    if (!month && parts[1]) month = parts[1].padStart(2, '0');
  }
  if (!month) month = '08'; // Default fallback

  const laoMonths: Record<string, string> = {
    '01': 'ມັງກອນ', '02': 'ກຸມພາ', '03': 'ມີນາ', '04': 'ເມສາ',
    '05': 'ພຶດສະພາ', '06': 'ມິຖຸນາ', '07': 'ກໍລະກົດ', '08': 'ສິງຫາ',
    '09': 'ກັນຍາ', '10': 'ຕຸລາ', '11': 'ພະຈິກ', '12': 'ທັນວາ',
  };
  const enMonths: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
  };

  const mInt = parseInt(month, 10);
  const laoMonthName = laoMonths[month] || `ເດືອນ ${mInt}`;
  const enMonthName = enMonths[month] || `Month ${mInt}`;

  return {
    round,
    month,
    year,
    labelLao: `ຊຸດ ${round} ເດືອນ ${mInt}`,
    labelEn: `Batch ${round} Month ${mInt}`,
    monthNameLao: laoMonthName,
    monthNameEn: enMonthName,
    fullTitleLao: `ຊຸດ ${round} ເດືອນ ${mInt} (${laoMonthName} ${year})`,
    fullTitleEn: `Batch ${round} Month ${mInt} (${enMonthName} ${year})`,
  };
}

interface FinanceTabProps {
  teams: TeamMember[];
  donationInfo?: DonationInfo;
  language: Language;
  isReadOnly?: boolean;
  onBack?: () => void;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({
  teams,
  donationInfo,
  language,
  isReadOnly = true,
  onBack,
}) => {
  // Independent Finance QR Members list (Strictly separated from About Us teams)
  const [qrMembers, setQrMembers] = useState<FinanceQrMember[]>(() => {
    try {
      const defaults = (initialDefaultFinanceQrMembers as any[]) || [];
      const defMap = new Map<string, any>(defaults.map((d) => [d.name?.trim().toLowerCase(), d]));
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('hb_cached_qr_members');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Restore any missing base64 QR codes or bank details from defaults
            const merged = parsed.map((p: any) => {
              const def = defMap.get(p.name?.trim().toLowerCase());
              if (def) {
                const hasValidUserQr = Boolean(p.financeQrUrl && p.financeQrUrl.startsWith('data:image'));
                const hasValidDefQr = Boolean(def.financeQrUrl && def.financeQrUrl.startsWith('data:image'));
                const finalQr = hasValidUserQr ? p.financeQrUrl : (hasValidDefQr ? def.financeQrUrl : (p.financeQrUrl || def.financeQrUrl || ''));
                return {
                  ...def,
                  ...p,
                  financeQrUrl: finalQr,
                  imageUrl: (p.imageUrl && p.imageUrl.trim() !== '') ? p.imageUrl : (def.imageUrl || ''),
                  bankName: (p.bankName && p.bankName.trim() !== '') ? p.bankName : (def.bankName || 'BCEL One'),
                  bankAccountName: (p.bankAccountName && p.bankAccountName.trim() !== '') ? p.bankAccountName : (def.bankAccountName || p.name),
                  bankAccountNumber: (p.bankAccountNumber && p.bankAccountNumber.trim() !== '') ? p.bankAccountNumber : (def.bankAccountNumber || ''),
                };
              }
              return p;
            });
            // Also append any default members that were missing from cached list
            defaults.forEach((def) => {
              const exists = merged.some((m: any) => m.name?.trim().toLowerCase() === def.name?.trim().toLowerCase());
              if (!exists) merged.push({ ...def });
            });
            return merged;
          }
        }
      }
      return (defaults as unknown as FinanceQrMember[]) || [];
    } catch {}
    return (initialDefaultFinanceQrMembers as unknown as FinanceQrMember[]) || [];
  });

  const [donations, setDonations] = useState<DonationTransaction[]>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem('hb_cached_donations');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}
    return initialDefaultFinanceData.donations;
  });

  const [distributions, setDistributions] = useState<TeamDistribution[]>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem('hb_cached_distributions');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}
    return initialDefaultFinanceData.distributions;
  });

  const [currency, setCurrency] = useState<'₭' | '$' | '฿'>('₭');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const d = new Date();
    const m = d.toLocaleString('en-US', { month: 'long' });
    return `${m} ${d.getFullYear()}`;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Configurable Emergency Reserve % (Default 20%, but admin can customize in Finance management)
  const [emergencyPercent, setEmergencyPercent] = useState<number>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem('hb_cached_finance_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed.emergencyReservePercent === 'number') {
            return parsed.emergencyReservePercent;
          }
        }
      }
    } catch {}
    return initialDefaultFinanceData.financeSettings.emergencyReservePercent;
  });
  const [tempPercentInput, setTempPercentInput] = useState<string>(() => String(emergencyPercent));
  const [isSavingPercent, setIsSavingPercent] = useState<boolean>(false);
  const [percentSaveSuccess, setPercentSaveSuccess] = useState<boolean>(false);
  const [isPercentConfigOpen, setIsPercentConfigOpen] = useState<boolean>(false);

  // Personal Member Finance QR Code Viewing & Management State
  const [viewingMemberQr, setViewingMemberQr] = useState<FinanceQrMember | TeamMember | null>(null);
  const [copiedQrNumber, setCopiedQrNumber] = useState<boolean>(false);
  const [copiedMemberId, setCopiedMemberId] = useState<string | number | null>(null);
  const [isTeamQrManagerOpen, setIsTeamQrManagerOpen] = useState<boolean>(false);
  const [editingMemberQr, setEditingMemberQr] = useState<FinanceQrMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<FinanceQrMember | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState<boolean>(false);
  const [isSavingMemberQr, setIsSavingMemberQr] = useState<boolean>(false);
  const [qrSaveMsg, setQrSaveMsg] = useState<string>('');

  // General In-App Delete Confirmation State (Replaces window.confirm which is blocked in iframes)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'inflow' | 'team_dist' | 'emergency_dist' | 'batch' | 'batch_cut_item';
    id: string;
    title: string;
    subtitle?: string;
    amount?: number;
    batchCount?: number;
    itemIds?: string[];
  } | null>(null);
  const [isDeletingTarget, setIsDeletingTarget] = useState<boolean>(false);

  // Inflow Filter & Active Selection State
  const [selectedInflowId, setSelectedInflowId] = useState<string | 'all'>('all');
  const [selectedInflowDetail, setSelectedInflowDetail] = useState<DonationTransaction | null>(null);

  // Selected Team Distribution Detail Modal (Shows full info & slip upon tap/click)
  const [selectedDistDetail, setSelectedDistDetail] = useState<TeamDistribution | null>(null);

  // Modals state
  const [isAddDonationOpen, setIsAddDonationOpen] = useState<boolean>(false);
  const [editingDonation, setEditingDonation] = useState<DonationTransaction | null>(null);
  const [donationDate, setDonationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [donationDesc, setDonationDesc] = useState<string>('');
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [donationEvidence, setDonationEvidence] = useState<string>('');
  const [donationPercent, setDonationPercent] = useState<number>(20);
  const [donationBatchId, setDonationBatchId] = useState<string>('');
  const [donationBatchName, setDonationBatchName] = useState<string>('');
  const [donationBatchRound, setDonationBatchRound] = useState<number>(1);
  const [donationBatchMonth, setDonationBatchMonth] = useState<string>(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedKpiBatch, setSelectedKpiBatch] = useState<string>('latest');
  const [isCustomPercent, setIsCustomPercent] = useState<boolean>(false);
  const [updateGlobalPercent, setUpdateGlobalPercent] = useState<boolean>(false);
  const [applyPercentToBatch, setApplyPercentToBatch] = useState<boolean>(false);

  // Dedicated Batch Percentage Config Modal (allows defining deduction % independently per batch)
  const [isBatchPercentModalOpen, setIsBatchPercentModalOpen] = useState<boolean>(false);
  const [batchPercentTarget, setBatchPercentTarget] = useState<any>(null);
  const [batchPercentInput, setBatchPercentInput] = useState<string>('20');

  // Distribution Transfer Modal state
  const [isAddDistOpen, setIsAddDistOpen] = useState<boolean>(false);
  const [editingDist, setEditingDist] = useState<TeamDistribution | null>(null);
  const [distBatchId, setDistBatchId] = useState<string>('');
  const [distBatchName, setDistBatchName] = useState<string>('ຊຸດ 1 ເດືອນ 8');
  const [distRound, setDistRound] = useState<number>(1);
  const [distMonth, setDistMonth] = useState<string>(() => {
    const now = new Date();
    return String(now.getMonth() + 1).padStart(2, '0');
  });
  const [distYear, setDistYear] = useState<string>(() => String(new Date().getFullYear()));
  const [distRecipient, setDistRecipient] = useState<string>('');
  const [distAmount, setDistAmount] = useState<string>('');
  const [distDate, setDistDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [distTime, setDistTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [distEvidence, setDistEvidence] = useState<string>('');
  const [distStatus, setDistStatus] = useState<'transferred' | 'pending'>('transferred');
  const [distNotes, setDistNotes] = useState<string>('');

  // Emergency Outflow Modal state
  const [isAddEmergencyOpen, setIsAddEmergencyOpen] = useState<boolean>(false);
  const [editingEmergency, setEditingEmergency] = useState<TeamDistribution | null>(null);
  const [emBatchId, setEmBatchId] = useState<string>('');
  const [emBatchName, setEmBatchName] = useState<string>('ສຸກເສິນ ງວດທີ 1');
  const [emRecipient, setEmRecipient] = useState<string>('');
  const [emAmount, setEmAmount] = useState<string>('');
  const [emDate, setEmDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [emTime, setEmTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [emEvidence, setEmEvidence] = useState<string>('');
  const [emStatus, setEmStatus] = useState<'transferred' | 'pending'>('transferred');
  const [emNotes, setEmNotes] = useState<string>('');

  // Auto Batch Modal state
  const [isAutoBatchModalOpen, setIsAutoBatchModalOpen] = useState<boolean>(false);
  const [autoBatchName, setAutoBatchName] = useState<string>('');
  const [autoBatchRound, setAutoBatchRound] = useState<number>(1);
  const [autoBatchMonth, setAutoBatchMonth] = useState<string>(() => {
    const now = new Date();
    return String(now.getMonth() + 1).padStart(2, '0');
  });
  const [autoBatchYear, setAutoBatchYear] = useState<string>(() => String(new Date().getFullYear()));
  const [autoBatchDate, setAutoBatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [autoBatchTime, setAutoBatchTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [autoBatchCustomPool, setAutoBatchCustomPool] = useState<string>('');
  const [autoBatchNotes, setAutoBatchNotes] = useState<string>('');

  // Team Batch Filter: 'all' or specific batch name
  const [selectedTeamBatchFilter, setSelectedTeamBatchFilter] = useState<string>('all');

  // Edit / Merge Entire Batch Modal state
  const [isEditBatchModalOpen, setIsEditBatchModalOpen] = useState<boolean>(false);
  const [editingBatchTarget, setEditingBatchTarget] = useState<any>(null);
  const [editBatchRoundInput, setEditBatchRoundInput] = useState<number>(1);
  const [editBatchMonthInput, setEditBatchMonthInput] = useState<string>('08');
  const [editBatchYearInput, setEditBatchYearInput] = useState<string>('2026');
  const [editBatchNameInput, setEditBatchNameInput] = useState<string>('');
  const [editBatchDateInput, setEditBatchDateInput] = useState<string>('');
  const [mergeTargetBatchName, setMergeTargetBatchName] = useState<string>('');
  const [isSavingBatchEdit, setIsSavingBatchEdit] = useState<boolean>(false);

  // In-modal Batch Recipient Management: Add member to batch or cut/adjust amount
  const [modalNewRecipient, setModalNewRecipient] = useState<string>('');
  const [modalNewAmount, setModalNewAmount] = useState<string>('');
  const [modalNewNotes, setModalNewNotes] = useState<string>('');
  const [isAddingInModal, setIsAddingInModal] = useState<boolean>(false);
  const [editingItemAmountId, setEditingItemAmountId] = useState<string | null>(null);
  const [editingItemAmountVal, setEditingItemAmountVal] = useState<string>('');

  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);

  // Load finance transactions, QR accounts, and settings
  const fetchFinance = async () => {
    setIsLoading(true);
    try {
      const data = await loadFinanceData();
      setDonations(data.donations as DonationTransaction[]);
      setDistributions(data.distributions as TeamDistribution[]);
      if (data.financeSettings?.emergencyReservePercent !== undefined) {
        const p = Number(data.financeSettings.emergencyReservePercent);
        if (!isNaN(p) && p >= 0 && p <= 100) {
          setEmergencyPercent(p);
          setTempPercentInput(String(p));
        }
      }

      // Load dedicated Finance QR members collection
      const qrData = await loadFinanceQrMembers();
      
      // Intelligent merge to ensure existing QR codes, photos, and bank accounts are NEVER lost:
      const qrMap = new Map<string, FinanceQrMember>();
      // Base defaults containing all 9 members with full base64 QR codes
      ((initialDefaultFinanceQrMembers as any[]) || []).forEach((def: any) => {
        qrMap.set(String(def.id), { ...def } as FinanceQrMember);
      });

      // Overlay server or local cached data
      (qrData || []).forEach((q: any) => {
        if (q && q.id) {
          const matched = qrMap.get(String(q.id)) || Array.from(qrMap.values()).find(
            (x) => x.name?.trim().toLowerCase() === q.name?.trim().toLowerCase()
          );
          if (matched) {
            const hasValidMatchedQr = Boolean(matched.financeQrUrl && matched.financeQrUrl.startsWith('data:image'));
            const hasValidNewQr = Boolean(q.financeQrUrl && q.financeQrUrl.startsWith('data:image'));
            const finalQr = hasValidNewQr ? q.financeQrUrl : (hasValidMatchedQr ? matched.financeQrUrl : (q.financeQrUrl || matched.financeQrUrl || ''));
            qrMap.set(matched.id, {
              ...matched,
              ...q,
              financeQrUrl: finalQr,
              imageUrl: (q.imageUrl && q.imageUrl.trim() !== '') ? q.imageUrl : (matched.imageUrl || ''),
              bankName: (q.bankName && q.bankName.trim() !== '') ? q.bankName : (matched.bankName || 'BCEL One'),
              bankAccountName: (q.bankAccountName && q.bankAccountName.trim() !== '') ? q.bankAccountName : (matched.bankAccountName || q.name),
              bankAccountNumber: (q.bankAccountNumber && q.bankAccountNumber.trim() !== '') ? q.bankAccountNumber : (matched.bankAccountNumber || ''),
            });
          } else {
            qrMap.set(String(q.id), q as FinanceQrMember);
          }
        }
      });

      // Synchronize with teams: make sure any team member with QR or bank details is preserved
      if (teams && teams.length > 0) {
        teams.forEach((t) => {
          const matchedById = qrMap.get(String(t.id));
          const matchedByName = Array.from(qrMap.values()).find(
            (q) => q.name?.trim().toLowerCase() === t.name?.trim().toLowerCase()
          );
          const matched = matchedById || matchedByName;

          if (matched) {
            // Keep whatever has the valid QR code and bank info
            const hasValidMatchedQr = Boolean(matched.financeQrUrl && matched.financeQrUrl.startsWith('data:image'));
            const hasValidTeamQr = Boolean(t.financeQrUrl && t.financeQrUrl.startsWith('data:image'));
            const finalQr = hasValidMatchedQr ? matched.financeQrUrl : (hasValidTeamQr ? t.financeQrUrl : (matched.financeQrUrl || t.financeQrUrl || ''));
            const merged: FinanceQrMember = {
              ...matched,
              name: matched.name || t.name,
              imageUrl: (matched.imageUrl && matched.imageUrl.trim()) || t.imageUrl || '',
              financeQrUrl: finalQr,
              bankName: (matched.bankName && matched.bankName.trim()) || t.bankName || 'BCEL One',
              bankAccountNumber: (matched.bankAccountNumber && matched.bankAccountNumber.trim()) || t.bankAccountNumber || '',
              bankAccountName: (matched.bankAccountName && matched.bankAccountName.trim()) || t.bankAccountName || t.name,
            };
            qrMap.set(matched.id, merged);
          } else if (t.financeQrUrl || t.bankAccountNumber) {
            // Add team member with QR to Finance QR list
            const newMember: FinanceQrMember = {
              id: t.id || `fq_${t.rowId || Date.now()}`,
              name: t.name || '',
              imageUrl: t.imageUrl || '',
              financeQrUrl: t.financeQrUrl || '',
              bankName: t.bankName || 'BCEL One',
              bankAccountNumber: t.bankAccountNumber || '',
              bankAccountName: t.bankAccountName || t.name || '',
            };
            qrMap.set(newMember.id, newMember);
          }
        });
      }

      const finalQrList = Array.from(qrMap.values());
      if (finalQrList.length > 0) {
        setQrMembers(finalQrList);
      } else if (teams && teams.length > 0) {
        // Initial auto-seed from teams into isolated finance_qr_members
        const initialSeed: FinanceQrMember[] = teams.map((t, idx) => ({
          id: t.id || `fq_${t.rowId || idx + 1}_${Date.now()}`,
          name: t.name || '',
          imageUrl: t.imageUrl || '',
          financeQrUrl: t.financeQrUrl || '',
          bankName: t.bankName || 'BCEL One',
          bankAccountNumber: t.bankAccountNumber || '',
          bankAccountName: t.bankAccountName || t.name || '',
        }));
        setQrMembers(initialSeed);
        // Persist seed in background so it remains fully independent
        Promise.all(initialSeed.map((item) => saveFinanceQrMemberToFirestore(item))).catch(console.error);
      }
    } catch (err) {
      console.error('Error fetching finance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();

    let unsubDonations: (() => void) | undefined;
    let unsubDistributions: (() => void) | undefined;
    let unsubQrMembers: (() => void) | undefined;
    let unsubFinanceSettings: (() => void) | undefined;

    try {
      unsubDonations = onSnapshot(
        collection(db, 'donations_ledger'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as DonationTransaction))
              .sort((a, b) =>
                String((b as any).createdAt || b.date || '').localeCompare(
                  String((a as any).createdAt || a.date || '')
                )
              );
            setDonations(list);
            try {
              localStorage.setItem('hb_cached_donations', JSON.stringify(list));
            } catch {}
          }
        },
        () => {}
      );

      unsubDistributions = onSnapshot(
        collection(db, 'team_distributions'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as TeamDistribution))
              .sort((a, b) =>
                String((b as any).createdAt || b.transferDate || '').localeCompare(
                  String((a as any).createdAt || a.transferDate || '')
                )
              );
            setDistributions(list);
            try {
              localStorage.setItem('hb_cached_distributions', JSON.stringify(list));
            } catch {}
          }
        },
        () => {}
      );

      unsubQrMembers = onSnapshot(
        collection(db, 'finance_qr_members'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceQrMember));
            setQrMembers(list);
            try {
              localStorage.setItem('hb_cached_qr_members', JSON.stringify(list));
            } catch {}
          }
        },
        () => {}
      );

      unsubFinanceSettings = onSnapshot(
        doc(db, 'app_config', 'financeSettings'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (typeof data?.emergencyReservePercent === 'number') {
              const p = Math.min(100, Math.max(0, Number(data.emergencyReservePercent)));
              setEmergencyPercent(p);
              setTempPercentInput(String(p));
              try {
                localStorage.setItem('hb_cached_finance_settings', JSON.stringify({ emergencyReservePercent: p }));
              } catch {}
            }
          }
        },
        () => {}
      );
    } catch (e) {
      console.warn('FinanceTab realtime subscription notice:', e);
    }

    return () => {
      if (unsubDonations) unsubDonations();
      if (unsubDistributions) unsubDistributions();
      if (unsubQrMembers) unsubQrMembers();
      if (unsubFinanceSettings) unsubFinanceSettings();
    };
  }, [teams]);

  // Save Configured Percentage (Default for new entries)
  const handleSavePercentage = async (customVal?: number) => {
    const valToSave = customVal !== undefined ? customVal : (Number(tempPercentInput) || 20);
    const safePercent = Math.min(100, Math.max(0, valToSave));
    setIsSavingPercent(true);
    try {
      await saveFinanceSettingsToFirestore({ emergencyReservePercent: safePercent });
      setEmergencyPercent(safePercent);
      setTempPercentInput(String(safePercent));
      setPercentSaveSuccess(true);
      setTimeout(() => setPercentSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving finance reserve percent:', err);
    } finally {
      setIsSavingPercent(false);
    }
  };

  // Save Percentage specifically for a chosen batch (updates all donations in that batch)
  const handleSaveBatchPercentage = async (customVal?: number) => {
    if (!batchPercentTarget || !batchPercentTarget.donations) return;
    const val = customVal !== undefined ? customVal : (Number(batchPercentInput) || 20);
    const safePercent = Math.min(100, Math.max(0, val));
    setIsLoading(true);
    try {
      for (const d of batchPercentTarget.donations) {
        const updated: DonationTransaction = {
          ...d,
          deductionPercent: safePercent,
        };
        await saveDonationTransactionToFirestore(updated);
      }
      await fetchFinance();
      setIsBatchPercentModalOpen(false);
      setBatchPercentTarget(null);
    } catch (err) {
      console.error('Error saving batch percentage:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Team Share Percentage
  const teamPercent = Math.max(0, 100 - emergencyPercent);

  // Filtered active team list (Uses independent qrMembers or fallback)
  const activeTeams = useMemo(() => {
    if (qrMembers.length > 0) return qrMembers;
    const visible = teams.filter((t) => !t.hidden);
    if (visible.length > 0) return visible;
    return [
      { id: '1', name: 'Person 1', role: 'Staff', phone: '', email: '' },
      { id: '2', name: 'Person 2', role: 'Staff', phone: '', email: '' },
    ];
  }, [qrMembers, teams]);

  // Quick Copy Account Number
  const handleCopyQrAccount = (accNum: string, memberId?: string | number) => {
    if (!accNum) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(accNum);
      setCopiedQrNumber(true);
      if (memberId !== undefined) setCopiedMemberId(memberId);
      setTimeout(() => {
        setCopiedQrNumber(false);
        setCopiedMemberId(null);
      }, 2500);
    }
  };

  // Auto-generate dynamic QR data URL from Account Number
  const handleGenerateMemberQr = async () => {
    if (!editingMemberQr) return;
    const accNum = editingMemberQr.bankAccountNumber?.trim();
    if (!accNum) {
      alert(language === 'lo' ? 'ກະລຸນາປ້ອນເລກບັນຊີກ່ອນ' : 'Please enter an account number first');
      return;
    }
    try {
      const payload = `DONATION|BANK:${editingMemberQr.bankName || 'BCEL'}|ACC:${accNum}|NAME:${editingMemberQr.bankAccountName || editingMemberQr.name}`;
      const dataUrl = await generateQRCodeDataUrl(payload, { width: 400 });
      setEditingMemberQr((prev) => (prev ? { ...prev, financeQrUrl: dataUrl } : null));
    } catch (err) {
      console.error('Failed to generate QR code', err);
    }
  };

  // Overall Total Inflow (All-time sum)
  const totalBalanceAll = useMemo(() => {
    return donations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [donations]);

  // Separate Distributions: Team Support vs Emergency Outflow
  const teamDistributionsAll = useMemo(() => {
    return distributions.filter((d) => d.category !== 'emergency');
  }, [distributions]);

  const emergencyDistributionsAll = useMemo(() => {
    return distributions.filter((d) => d.category === 'emergency');
  }, [distributions]);

  // Total transferred out to Team Support
  const totalTeamTransferred = useMemo(() => {
    return teamDistributionsAll.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [teamDistributionsAll]);

  // Total transferred out for Emergency
  const totalEmergencyTransferred = useMemo(() => {
    return emergencyDistributionsAll.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [emergencyDistributionsAll]);

  // Total transferred out combined
  const totalTransferred = useMemo(() => {
    return totalTeamTransferred + totalEmergencyTransferred;
  }, [totalTeamTransferred, totalEmergencyTransferred]);

  // Overall Actual Net Balance in Hand (ຮັບທັງໝົດ - ໂອນອອກທັງໝົດ)
  const netRemainingActual = useMemo(() => {
    return Math.max(0, totalBalanceAll - totalTransferred);
  }, [totalBalanceAll, totalTransferred]);

  // Emergency Savings across all batches, respecting each donation's individual configured deduction percentage
  const totalSavings20 = useMemo(() => {
    return donations.reduce((sum, d) => {
      const amt = Number(d.amount) || 0;
      const pct = typeof d.deductionPercent === 'number' ? d.deductionPercent : emergencyPercent;
      return sum + Math.round(amt * (pct / 100));
    }, 0);
  }, [donations, emergencyPercent]);

  // Remaining Emergency Reserve
  const remainingEmergencySavings = useMemo(() => {
    return Math.max(0, totalSavings20 - totalEmergencyTransferred);
  }, [totalSavings20, totalEmergencyTransferred]);

  // Total Team Pool based on individual donation deduction percentages
  const totalPool80 = useMemo(() => {
    return totalBalanceAll - totalSavings20;
  }, [totalBalanceAll, totalSavings20]);

  // Remaining for team after team transfers
  const remaining80Actual = useMemo(() => {
    return Math.max(0, totalPool80 - totalTeamTransferred);
  }, [totalPool80, totalTeamTransferred]);

  // Group donations into structured batches (ຊຸດ / ງວດເງິນສະໜັບສະໜູນ)
  // Each batch and donation can have its OWN independent deduction percentage!
  const groupedDonationBatches = useMemo(() => {
    const map = new Map<
      string,
      {
        batchKey: string;
        batchName: string;
        batchRound: number;
        batchMonth: string;
        batchYear: string;
        date: string;
        donations: DonationTransaction[];
        totalInflow: number;
        emergencySavings: number;
        teamPool: number;
        deductionPercent: number;
        labelLao: string;
        labelEn: string;
      }
    >();

    // Sort ascending by date/creation first to assign sequential rounds if not explicitly set
    const ascDonations = [...donations].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    ascDonations.forEach((d, idx) => {
      const amt = Number(d.amount) || 0;
      const parsed = parseBatchMeta({
        batchName: d.batchName,
        batchRound: d.batchRound ?? (idx + 1),
        batchMonth: d.batchMonth,
        transferDate: d.date,
      });

      const key = d.batchId || (d.batchName ? d.batchName.trim().toLowerCase() : `round_${parsed.round}_m_${parsed.month}_y_${parsed.year}`);
      // Each batch/donation can define its own deduction percentage!
      const pct = typeof d.deductionPercent === 'number' ? d.deductionPercent : emergencyPercent;
      const emAmt = Math.round(amt * (pct / 100));
      const poolAmt = amt - emAmt;

      const cleanName = d.batchName || (language === 'lo' ? parsed.labelLao : parsed.labelEn);

      const existing = map.get(key);
      if (existing) {
        existing.donations.push(d);
        existing.totalInflow += amt;
        existing.emergencySavings += emAmt;
        existing.teamPool += poolAmt;
        if (typeof d.deductionPercent === 'number') {
          existing.deductionPercent = d.deductionPercent;
        }
        if (d.date && d.date > existing.date) existing.date = d.date;
      } else {
        map.set(key, {
          batchKey: key,
          batchName: cleanName,
          batchRound: parsed.round,
          batchMonth: parsed.month,
          batchYear: parsed.year,
          date: d.date || '',
          donations: [d],
          totalInflow: amt,
          emergencySavings: emAmt,
          teamPool: poolAmt,
          deductionPercent: pct,
          labelLao: parsed.labelLao,
          labelEn: parsed.labelEn,
        });
      }
    });

    // Return batches sorted newest first (descending by date and round)
    return Array.from(map.values()).sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.batchRound - a.batchRound;
    });
  }, [donations, emergencyPercent, language]);

  // The latest / newest batch (ຊຸດໃໝ່ຫຼ້າສຸດ)
  const latestDonationBatch = useMemo(() => {
    return groupedDonationBatches[0] || null;
  }, [groupedDonationBatches]);

  // Active KPI batch based on selection (Defaults to 'latest' - ຊຸດໃໝ່ຫຼ້າສຸດ)
  const activeKpiBatch = useMemo(() => {
    if (selectedKpiBatch === 'all') return null;
    if (selectedKpiBatch === 'latest') return latestDonationBatch;
    return groupedDonationBatches.find((b) => b.batchKey === selectedKpiBatch) || latestDonationBatch;
  }, [selectedKpiBatch, latestDonationBatch, groupedDonationBatches]);

  // Outflow transfers linked to the active batch (team and emergency)
  const activeBatchTransfers = useMemo(() => {
    if (!activeKpiBatch) {
      return {
        teamTransferred: totalTeamTransferred,
        emergencyTransferred: totalEmergencyTransferred,
        totalTransferred: totalTransferred,
      };
    }

    // Helper to extract round, month, and year from any distribution
    const getDistBatchInfo = (d: TeamDistribution) => {
      const meta = parseBatchMeta({
        batchName: d.batchName,
        batchRound: d.batchRound,
        batchMonth: d.batchMonth,
        transferDate: d.transferDate,
        period: d.period,
      });
      return meta;
    };

    const isSingleBatchMode = groupedDonationBatches.length <= 1;

    // Check how many donation batches belong to the same month and year as activeKpiBatch
    const donationsInSameMonth = groupedDonationBatches.filter(
      (b) => b.batchMonth === activeKpiBatch.batchMonth && b.batchYear === activeKpiBatch.batchYear
    );
    const isOnlyDonationBatchInMonth = donationsInSameMonth.length <= 1;

    // Filter helper that determines if a distribution strictly belongs to the active donation batch
    const isDistributionInActiveBatch = (d: TeamDistribution) => {
      if (isSingleBatchMode) return true;

      // 1. Direct explicit ID match
      if (d.batchId && (d.batchId === activeKpiBatch.batchKey || d.batchId === activeKpiBatch.batchName)) {
        return true;
      }

      // 2. Direct clean Name match (case-insensitive)
      if (
        d.batchName &&
        activeKpiBatch.batchName &&
        d.batchName.trim().toLowerCase() === activeKpiBatch.batchName.trim().toLowerCase()
      ) {
        return true;
      }

      const dMeta = getDistBatchInfo(d);

      // CRITICAL: A distribution must NEVER match across different months or years
      // unless explicitly linked by batchId or batchName above!
      if (dMeta.month !== activeKpiBatch.batchMonth || dMeta.year !== activeKpiBatch.batchYear) {
        return false;
      }

      // 3. Exact Round match when in the same month & year
      if (dMeta.round === activeKpiBatch.batchRound) {
        return true;
      }

      // 4. Same Month & Year: If this is the only donation batch in this month & year,
      // all distributions made in this month & year deduct from this batch's pool!
      if (isOnlyDonationBatchInMonth) {
        return true;
      }

      // 5. If there are multiple donation batches in this month, check if this distribution
      // belongs to another donation batch with matching round. If not, match current active batch.
      const matchesOtherBatchInMonth = donationsInSameMonth.some(
        (b) => b.batchKey !== activeKpiBatch.batchKey && b.batchRound === dMeta.round
      );
      if (!matchesOtherBatchInMonth) {
        return true;
      }

      return false;
    };

    // Match team distributions that belong specifically to this batch
    const matchedTeam = teamDistributionsAll.filter(isDistributionInActiveBatch);

    // Match emergency distributions that belong specifically to this batch
    const matchedEmergency = emergencyDistributionsAll.filter(isDistributionInActiveBatch);

    const teamAmt = matchedTeam.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const emAmt = matchedEmergency.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return {
      teamTransferred: teamAmt,
      emergencyTransferred: emAmt,
      totalTransferred: teamAmt + emAmt,
    };
  }, [activeKpiBatch, teamDistributionsAll, emergencyDistributionsAll, totalTeamTransferred, totalEmergencyTransferred, totalTransferred, groupedDonationBatches]);

  // KPI Display Figures for the New / Active Batch:
  // 1. Total Balance for Active Batch (ຕົວເລກເງິນຊຸດໃໝ່)
  const kpiBatchInflow = activeKpiBatch ? activeKpiBatch.totalInflow : totalBalanceAll;
  const kpiBatchOutflow = activeBatchTransfers.totalTransferred;
  const kpiBatchNetRemaining = Math.max(0, kpiBatchInflow - kpiBatchOutflow);

  // 2. Emergency Savings for Active Batch (ເງິນສຳຮອງສຸກເສີນຊຸດໃໝ່)
  const kpiBatchEmergencyReserve = activeKpiBatch ? activeKpiBatch.emergencySavings : totalSavings20;
  const kpiBatchEmergencyTransferred = activeBatchTransfers.emergencyTransferred;
  const kpiBatchEmergencyRemaining = Math.max(0, kpiBatchEmergencyReserve - kpiBatchEmergencyTransferred);

  // 3. Team Pool for Active Batch (ກອງທຶນລູກທີມຊຸດໃໝ່)
  const kpiBatchTeamPool = activeKpiBatch ? activeKpiBatch.teamPool : totalPool80;
  const kpiBatchTeamTransferred = activeBatchTransfers.teamTransferred;
  const kpiBatchTeamRemaining = Math.max(0, kpiBatchTeamPool - kpiBatchTeamTransferred);

  // Batch labels
  const activeBatchLabel = activeKpiBatch
    ? (language === 'lo' ? activeKpiBatch.labelLao : activeKpiBatch.labelEn)
    : (language === 'lo' ? 'ທຸກໆຊຸດ' : 'All Batches');

  // Individual percentage for the active batch vs global default
  const activeBatchPercent = activeKpiBatch ? activeKpiBatch.deductionPercent : emergencyPercent;
  const activeBatchTeamPercent = Math.max(0, 100 - activeBatchPercent);

  // Specific Data Filters for Lower Section (Year, Month)
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  // Dynamically generate endless years starting from 2026 onwards to infinity + any year in records >= 2026
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const startYear = 2026;
    const currentYear = new Date().getFullYear();
    const endYear = Math.max(startYear + 20, currentYear + 15);
    
    // Generate endless years from 2026 upwards (2026..2050+)
    for (let y = startYear; y <= endYear; y++) {
      years.add(y.toString());
    }
    donations.forEach((d) => {
      if (d.date) {
        const y = d.date.split('-')[0];
        if (y && Number(y) >= 2026) years.add(y);
      }
    });
    distributions.forEach((d) => {
      if (d.transferDate) {
        const y = d.transferDate.split('-')[0];
        if (y && Number(y) >= 2026) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => Number(a) - Number(b)); // Ascending starting at 2026
  }, [donations, distributions]);

  // Months list for filtering
  const monthsList = [
    { value: '01', lo: '01 - ມັງກອນ', en: '01 - January' },
    { value: '02', lo: '02 - ກຸມພາ', en: '02 - February' },
    { value: '03', lo: '03 - ມີນາ', en: '03 - March' },
    { value: '04', lo: '04 - ເມສາ', en: '04 - April' },
    { value: '05', lo: '05 - ພຶດສະພາ', en: '05 - May' },
    { value: '06', lo: '06 - ມິຖຸນາ', en: '06 - June' },
    { value: '07', lo: '07 - ກໍລະກົດ', en: '07 - July' },
    { value: '08', lo: '08 - ສິງຫາ', en: '08 - August' },
    { value: '09', lo: '09 - ກັນຍາ', en: '09 - September' },
    { value: '10', lo: '10 - ຕຸລາ', en: '10 - October' },
    { value: '11', lo: '11 - ພະຈິກ', en: '11 - November' },
    { value: '12', lo: '12 - ທັນວາ', en: '12 - December' },
  ];

  // Filtered donations for lower section based on Year and Month
  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      if (!d.date) return true;
      const [y, m] = d.date.split('-');
      if (filterYear !== 'all' && y !== filterYear) return false;
      if (filterMonth !== 'all' && m !== filterMonth) return false;
      return true;
    });
  }, [donations, filterYear, filterMonth]);

  // Filtered Team Distributions for lower section based on Year and Month
  const filteredTeamDistributions = useMemo(() => {
    return teamDistributionsAll.filter((d) => {
      if (d.transferDate) {
        const [y, m] = d.transferDate.split('-');
        if (filterYear !== 'all' && y !== filterYear) return false;
        if (filterMonth !== 'all' && m !== filterMonth) return false;
      }
      return true;
    });
  }, [teamDistributionsAll, filterYear, filterMonth]);

  // Filtered Emergency Distributions for lower section based on Year and Month
  const filteredEmergencyDistributions = useMemo(() => {
    return emergencyDistributionsAll.filter((d) => {
      if (d.transferDate) {
        const [y, m] = d.transferDate.split('-');
        if (filterYear !== 'all' && y !== filterYear) return false;
        if (filterMonth !== 'all' && m !== filterMonth) return false;
      }
      return true;
    });
  }, [emergencyDistributionsAll, filterYear, filterMonth]);

  // Format Full Date with Month Name in Lao/English
  const formatFullDateWithMonth = (dateStr?: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    const laoMonths: Record<string, string> = {
      '01': 'ມັງກອນ', '02': 'ກຸມພາ', '03': 'ມີນາ', '04': 'ເມສາ',
      '05': 'ພຶດສະພາ', '06': 'ມິຖຸນາ', '07': 'ກໍລະກົດ', '08': 'ສິງຫາ',
      '09': 'ກັນຍາ', '10': 'ຕຸລາ', '11': 'ພະຈິກ', '12': 'ທັນວາ',
    };
    const enMonths: Record<string, string> = {
      '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
    };
    if (language === 'lo') {
      return `ວັນທີ ${d}/${m}/${y} (${d} ${laoMonths[m] || m} ${y})`;
    }
    return `${d}/${m}/${y} (${d} ${enMonths[m] || m} ${y})`;
  };

  // Helper to extract timestamp from a distribution
  const getDistTimestamp = (item: TeamDistribution): number => {
    if (item.transferDate) {
      const tStr = item.transferTime || '12:00';
      const parsed = new Date(`${item.transferDate}T${tStr}`).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (item.createdAt) {
      const parsed = new Date(item.createdAt).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 0;
  };

  // Helper to get latest transfer time in a batch
  const getBatchLatestTime = (b: { items: TeamDistribution[]; transferDate: string; transferTime?: string }): number => {
    let maxTime = 0;
    for (const it of b.items) {
      const t = getDistTimestamp(it);
      if (t > maxTime) maxTime = t;
    }
    if (!maxTime && b.transferDate) {
      const tStr = b.transferTime || '12:00';
      maxTime = new Date(`${b.transferDate}T${tStr}`).getTime() || 0;
    }
    return maxTime;
  };

  // Group Team distributions into Batches / Rounds (ງວດ / ຊຸດການໂອນທີມ)
  const groupedTeamBatches = useMemo(() => {
    const map = new Map<
      string,
      {
        batchId: string;
        batchName: string;
        transferDate: string;
        transferTime?: string;
        notes?: string;
        items: TeamDistribution[];
        totalAmount: number;
        meta: ParsedBatchMeta;
        label: string;
      }
    >();

    filteredTeamDistributions.forEach((item) => {
      const rawName = (item.batchName || '').trim();
      const amt = Number(item.amount) || 0;

      const itemMeta = parseBatchMeta({
        batchName: rawName,
        batchRound: item.batchRound,
        batchMonth: item.batchMonth,
        transferDate: item.transferDate,
        period: item.period,
      });

      // Check if item has a custom unique title (not starting with batch_, dist_, batch, round, ຊຸດ, ງວດ)
      const isCustomBatchTitle = Boolean(
        rawName &&
        !rawName.startsWith('batch_1') &&
        !rawName.startsWith('dist_') &&
        !rawName.toLowerCase().startsWith('batch') &&
        !rawName.startsWith('ຊຸດ') &&
        !rawName.startsWith('ງວດ')
      );

      // Consistent grouping key: Group standard batches by Round + Month + Year
      // Or by custom title if explicitly titled differently
      const key = isCustomBatchTitle
        ? `custom_${rawName.toLowerCase()}_m_${itemMeta.month}_y_${itemMeta.year}`
        : `round_${itemMeta.round}_m_${itemMeta.month}_y_${itemMeta.year}`;

      const cleanBatchName = isCustomBatchTitle
        ? rawName
        : (language === 'lo' ? itemMeta.labelLao : itemMeta.labelEn);

      const existing = map.get(key);

      if (existing) {
        existing.items.push(item);
        existing.totalAmount += amt;
        if (!existing.transferTime && item.transferTime) {
          existing.transferTime = item.transferTime;
        }
        if (item.transferDate && item.transferDate > existing.transferDate) {
          existing.transferDate = item.transferDate;
        }
        if (!existing.notes && item.notes) {
          existing.notes = item.notes;
        }
      } else {
        map.set(key, {
          batchId: item.batchId || `batch_r${itemMeta.round}_m${itemMeta.month}_${itemMeta.year}`,
          batchName: cleanBatchName,
          transferDate: item.transferDate || new Date().toISOString().split('T')[0],
          transferTime: item.transferTime || '',
          notes: item.notes || '',
          items: [item],
          totalAmount: amt,
          meta: itemMeta,
          label: cleanBatchName,
        });
      }
    });

    // Sort items inside each batch: newest transfer at the top
    const batches = Array.from(map.values()).map((batch) => {
      batch.items.sort((a, b) => {
        const timeA = getDistTimestamp(a);
        const timeB = getDistTimestamp(b);
        if (timeB !== timeA) return timeB - timeA;
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      });
      return batch;
    });

    // CRITICAL USER REQUIREMENT:
    // "2. ທີ່ສຳຄັນ ມັນຈະລຽງລຳດັບ ຄືການໂອນຫຼາສຸດຈະຢູ່ດ້ານເທິງ"
    // Latest transfers MUST be at the top!
    return batches.sort((a, b) => {
      // 1. Primary: Latest transfer timestamp first
      const timeA = getBatchLatestTime(a);
      const timeB = getBatchLatestTime(b);
      if (timeB !== timeA) return timeB - timeA;

      // 2. Secondary: Highest round first
      if (b.meta.round !== a.meta.round) return b.meta.round - a.meta.round;

      // 3. Fallback: string compare
      const dateA = `${a.transferDate} ${a.transferTime || '00:00'}`;
      const dateB = `${b.transferDate} ${b.transferTime || '00:00'}`;
      return dateB.localeCompare(dateA);
    });
  }, [filteredTeamDistributions, language]);

  // Unique Batch options for filter tabs
  const uniqueBatchOptions = useMemo(() => {
    const list: { key: string; label: string; count: number; round: number; month: string }[] = [];
    const seen = new Set<string>();

    groupedTeamBatches.forEach((b) => {
      const key = b.batchName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        const label = language === 'lo'
          ? (b.batchName.includes('ຊຸດ') ? b.batchName : `ຊຸດ ${b.meta.round} (ເດືອນ ${parseInt(b.meta.month, 10)})`)
          : (b.batchName.toLowerCase().includes('batch') ? b.batchName : `Batch ${b.meta.round} (Month ${parseInt(b.meta.month, 10)})`);
        list.push({
          key,
          label,
          count: b.items.length,
          round: b.meta.round,
          month: b.meta.month,
        });
      }
    });
    return list;
  }, [groupedTeamBatches, language]);

  // Displayed Batches based on filter
  const displayedTeamBatches = useMemo(() => {
    if (selectedTeamBatchFilter === 'all') {
      return groupedTeamBatches;
    }
    return groupedTeamBatches.filter((b) => b.batchName.toLowerCase() === selectedTeamBatchFilter.toLowerCase());
  }, [groupedTeamBatches, selectedTeamBatchFilter]);

  // Check if there are multiple batches on the same date (e.g. #1, #2... on 05/09/2026)
  const hasMultipleSingleBatchesOnSameDay = useMemo(() => {
    if (groupedTeamBatches.length < 2) return false;
    const sameDateMap: Record<string, number> = {};
    groupedTeamBatches.forEach((b) => {
      sameDateMap[b.transferDate] = (sameDateMap[b.transferDate] || 0) + 1;
    });
    return Object.values(sameDateMap).some((cnt) => cnt >= 2);
  }, [groupedTeamBatches]);

  // Open Edit Batch Dialog
  const handleOpenEditBatch = (batch: any) => {
    setEditingBatchTarget(batch);
    setEditBatchRoundInput(batch.meta.round || 1);
    setEditBatchMonthInput(batch.meta.month || '08');
    setEditBatchYearInput(batch.meta.year || '2026');
    setEditBatchNameInput(
      batch.batchName ||
        (language === 'lo'
          ? `ຊຸດ ${batch.meta.round} ເດືອນ ${parseInt(batch.meta.month, 10)}`
          : `Batch ${batch.meta.round} Month ${parseInt(batch.meta.month, 10)}`)
    );
    setEditBatchDateInput(batch.transferDate || new Date().toISOString().split('T')[0]);
    setMergeTargetBatchName('');
    setIsEditBatchModalOpen(true);
  };

  // Save changes to all items in an entire batch (or merge into another batch)
  const handleSaveBatchEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingBatchTarget) return;
    setIsSavingBatchEdit(true);
    try {
      const isMerge = Boolean(mergeTargetBatchName && mergeTargetBatchName !== editingBatchTarget.batchName);
      const finalName = isMerge
        ? mergeTargetBatchName
        : editBatchNameInput.trim() ||
          (language === 'lo'
            ? `ຊຸດ ${editBatchRoundInput} ເດືອນ ${parseInt(editBatchMonthInput, 10)}`
            : `Batch ${editBatchRoundInput} Month ${parseInt(editBatchMonthInput, 10)}`);

      const parsedMeta = parseBatchMeta({
        batchName: finalName,
        batchRound: editBatchRoundInput,
        batchMonth: editBatchMonthInput,
        transferDate: editBatchDateInput || editingBatchTarget.transferDate,
      });

      const finalPeriod = `${parsedMeta.year}-${parsedMeta.month}`;
      const finalDate = editBatchDateInput || editingBatchTarget.transferDate;
      const targetBatchId = isMerge
        ? groupedTeamBatches.find((b) => b.batchName.toLowerCase() === mergeTargetBatchName.toLowerCase())?.batchId ||
          editingBatchTarget.batchId
        : editingBatchTarget.batchId;

      for (const item of editingBatchTarget.items) {
        const updated: TeamDistribution = {
          ...item,
          batchName: finalName,
          batchId: targetBatchId,
          batchRound: parsedMeta.round,
          batchMonth: parsedMeta.month,
          period: finalPeriod,
          transferDate: finalDate,
        };
        await saveTeamDistributionToFirestore(updated);
      }
      await fetchFinance();
      setIsEditBatchModalOpen(false);
      setEditingBatchTarget(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to update batch');
    } finally {
      setIsSavingBatchEdit(false);
    }
  };

  // Quick Batch Round Inline Edit State
  const [editingBatchRoundId, setEditingBatchRoundId] = useState<string | null>(null);
  const [editingBatchRoundValue, setEditingBatchRoundValue] = useState<string>('');
  const [isSavingQuickRound, setIsSavingQuickRound] = useState<boolean>(false);

  // Quick Emergency Batch Round Inline Edit State
  const [editingEmBatchRoundId, setEditingEmBatchRoundId] = useState<string | null>(null);
  const [editingEmBatchRoundValue, setEditingEmBatchRoundValue] = useState<string>('');
  const [isSavingQuickEmRound, setIsSavingQuickEmRound] = useState<boolean>(false);

  // Collapsed Batches State (Map of batchId -> boolean)
  const [collapsedTeamBatchIds, setCollapsedTeamBatchIds] = useState<Record<string, boolean>>({});
  const [collapsedEmBatchIds, setCollapsedEmBatchIds] = useState<Record<string, boolean>>({});

  // Helper to check if a batch is collapsed: by default, only latest batch (bIdx === 0) is open, all others collapsed
  const isTeamBatchCollapsed = (batchId: string, bIdx: number): boolean => {
    if (collapsedTeamBatchIds[batchId] !== undefined) {
      return collapsedTeamBatchIds[batchId];
    }
    return bIdx !== 0;
  };

  const toggleTeamBatchCollapse = (batchId: string, bIdx: number) => {
    const current = isTeamBatchCollapsed(batchId, bIdx);
    setCollapsedTeamBatchIds((prev) => ({
      ...prev,
      [batchId]: !current,
    }));
  };

  const toggleAllTeamBatchesCollapse = () => {
    const allCollapsed =
      displayedTeamBatches.length > 0 &&
      displayedTeamBatches.every((b, idx) => isTeamBatchCollapsed(b.batchId, idx));
    const next: Record<string, boolean> = {};
    displayedTeamBatches.forEach((b) => {
      next[b.batchId] = !allCollapsed;
    });
    setCollapsedTeamBatchIds(next);
  };

  const isEmBatchCollapsed = (batchId: string, bIdx: number): boolean => {
    if (collapsedEmBatchIds[batchId] !== undefined) {
      return collapsedEmBatchIds[batchId];
    }
    return bIdx !== 0;
  };

  const toggleEmBatchCollapse = (batchId: string, bIdx: number) => {
    const current = isEmBatchCollapsed(batchId, bIdx);
    setCollapsedEmBatchIds((prev) => ({
      ...prev,
      [batchId]: !current,
    }));
  };

  const toggleAllEmBatchesCollapse = () => {
    const allCollapsed =
      groupedEmergencyBatches.length > 0 &&
      groupedEmergencyBatches.every((b, idx) => isEmBatchCollapsed(b.batchId, idx));
    const next: Record<string, boolean> = {};
    groupedEmergencyBatches.forEach((b) => {
      next[b.batchId] = !allCollapsed;
    });
    setCollapsedEmBatchIds(next);
  };

  // Quick Change Batch Round (Update all items in the batch to the new round)
  const handleSaveQuickBatchRound = async (batch: typeof groupedTeamBatches[0], newRound: number) => {
    if (isNaN(newRound) || newRound < 1) {
      alert(language === 'lo' ? 'ກະລຸນາປ້ອນເລກຊຸດທີ່ຖືກຕ້ອງ (1, 2, 3...)' : 'Please enter a valid round number');
      return;
    }
    setIsSavingQuickRound(true);
    try {
      const mInt = parseInt(batch.meta.month, 10) || 1;
      const finalName = language === 'lo' ? `ຊຸດ ${newRound} ເດືອນ ${mInt}` : `Batch ${newRound} Month ${mInt}`;
      const targetBatchId = `batch_r${newRound}_m${batch.meta.month}_${batch.meta.year}`;
      for (const item of batch.items) {
        const updated: TeamDistribution = {
          ...item,
          batchRound: newRound,
          batchName: finalName,
          batchId: targetBatchId,
        };
        await saveTeamDistributionToFirestore(updated);
      }
      await fetchFinance();
      setEditingBatchRoundId(null);
    } catch (err: any) {
      console.error('Failed to update batch round:', err);
      alert(err?.message || 'Error updating batch number');
    } finally {
      setIsSavingQuickRound(false);
    }
  };

  // Quick Change Emergency Batch Round
  const handleSaveQuickEmBatchRound = async (batch: typeof groupedEmergencyBatches[0], newRound: number) => {
    if (isNaN(newRound) || newRound < 1) {
      alert(language === 'lo' ? 'ກະລຸນາປ້ອນເລກງວດທີ່ຖືກຕ້ອງ (1, 2, 3...)' : 'Please enter a valid batch number');
      return;
    }
    setIsSavingQuickEmRound(true);
    try {
      const finalName = language === 'lo' ? `ສຸກເສິນ ງວດ ${newRound}` : `Emergency Batch #${newRound}`;
      const targetBatchId = `em_batch_r${newRound}_${Date.now()}`;
      for (const item of batch.items) {
        const updated: TeamDistribution = {
          ...item,
          batchRound: newRound,
          batchName: finalName,
          batchId: targetBatchId,
        };
        await saveTeamDistributionToFirestore(updated);
      }
      await fetchFinance();
      setEditingEmBatchRoundId(null);
    } catch (err: any) {
      console.error('Failed to update emergency batch round:', err);
      alert(err?.message || 'Error updating emergency batch number');
    } finally {
      setIsSavingQuickEmRound(false);
    }
  };

  // Cut / Remove single recipient item from current batch inside settings modal
  const handleCutItemFromBatchInModal = (itemId: string, recipientName: string, amount?: number) => {
    setDeleteTarget({
      type: 'batch_cut_item',
      id: itemId,
      title: recipientName,
      amount,
    });
  };

  // Update / Adjust recipient transfer amount inside settings modal
  const handleSaveItemAmountInModal = async (itemId: string) => {
    const amt = parseFloat(editingItemAmountVal);
    if (isNaN(amt) || amt <= 0) {
      setEditingItemAmountId(null);
      return;
    }
    try {
      const item = editingBatchTarget?.items.find((it: any) => it.id === itemId);
      if (!item) return;
      const updated: TeamDistribution = {
        ...item,
        amount: amt,
      };
      await saveTeamDistributionToFirestore(updated);
      setDistributions((prev) => prev.map((d) => (d.id === itemId ? updated : d)));
      if (editingBatchTarget) {
        const updatedItems = editingBatchTarget.items.map((it: any) => (it.id === itemId ? updated : it));
        const newTotal = updatedItems.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
        setEditingBatchTarget({
          ...editingBatchTarget,
          items: updatedItems,
          totalAmount: newTotal,
        });
      }
      setEditingItemAmountId(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to update amount');
    }
  };

  // Add new recipient and transfer amount directly to this batch inside settings modal
  const handleAddItemToBatchInModal = async () => {
    if (!modalNewRecipient.trim()) {
      alert(language === 'lo' ? 'ກະລຸນາເລືອກ ຫຼື ປ້ອນຊື່ຜູ້ຮັບ' : 'Please select recipient');
      return;
    }
    const amt = parseFloat(modalNewAmount);
    if (isNaN(amt) || amt <= 0) {
      alert(language === 'lo' ? 'ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຖືກຕ້ອງ' : 'Please enter valid amount');
      return;
    }
    if (!editingBatchTarget) return;

    setIsAddingInModal(true);
    try {
      const now = new Date();
      const finalDate = editBatchDateInput || editingBatchTarget.transferDate || now.toISOString().split('T')[0];
      const finalPeriod = `${editBatchYearInput}-${editBatchMonthInput}`;
      const newDist: TeamDistribution = {
        id: `dist_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        period: finalPeriod,
        batchId: editingBatchTarget.batchId,
        batchName: editBatchNameInput.trim() || editingBatchTarget.batchName,
        batchRound: editBatchRoundInput,
        batchMonth: editBatchMonthInput,
        recipientName: modalNewRecipient.trim(),
        amount: amt,
        currency,
        status: 'transferred',
        transferDate: finalDate,
        transferTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        notes: modalNewNotes.trim() || '',
        category: 'team',
        createdAt: new Date().toISOString(),
      };
      await saveTeamDistributionToFirestore(newDist);
      setDistributions((prev) => [newDist, ...prev]);
      const updatedItems = [newDist, ...(editingBatchTarget.items || [])];
      const newTotal = updatedItems.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
      setEditingBatchTarget({
        ...editingBatchTarget,
        items: updatedItems,
        totalAmount: newTotal,
      });
      setModalNewRecipient('');
      setModalNewAmount('');
      setModalNewNotes('');
    } catch (err: any) {
      alert(err?.message || 'Failed to add recipient');
    } finally {
      setIsAddingInModal(false);
    }
  };

  // Quick Merge all existing team distributions into "ຊຸດ 1 ເດືອນ 8" with 1-click
  const handleQuickMergeAllToBatch1Month8 = async () => {
    if (
      !confirm(
        language === 'lo'
          ? 'ທ່ານຕ້ອງການຮວມທຸກລາຍການໂອນທີມໃນປັດຈຸບັນ ເຂົ້າເປັນ "ຊຸດ 1 ເດືອນ 8" ດຽວກັນແທ້ບໍ່?'
          : 'Merge all team distributions into "Batch 1 Month 8"?'
      )
    ) {
      return;
    }
    setIsLoading(true);
    try {
      const targetBatchId = `batch_${Date.now()}`;
      for (const item of teamDistributionsAll) {
        const updated: TeamDistribution = {
          ...item,
          batchName: 'ຊຸດ 1 ເດືອນ 8',
          batchId: targetBatchId,
          batchRound: 1,
          batchMonth: '08',
          period: '2026-08',
        };
        await saveTeamDistributionToFirestore(updated);
      }
      await fetchFinance();
    } catch (err: any) {
      alert(err?.message || 'Failed to merge');
    } finally {
      setIsLoading(false);
    }
  };

  // Group Emergency distributions into Batches / Rounds (ງວດການໂອນສຸກເສິນ)
  const groupedEmergencyBatches = useMemo(() => {
    const map = new Map<
      string,
      {
        batchId: string;
        batchName: string;
        transferDate: string;
        transferTime?: string;
        notes?: string;
        items: TeamDistribution[];
        totalAmount: number;
        round: number;
      }
    >();

    filteredEmergencyDistributions.forEach((item) => {
      const cleanName = (item.batchName || (language === 'lo' ? 'ສຸກເສິນ ງວດ 1' : 'Emergency #1')).trim();
      const key = cleanName.toLowerCase();
      const existing = map.get(key);
      const amt = Number(item.amount) || 0;

      const parsedRound = item.batchRound ? parseInt(String(item.batchRound), 10) : NaN;
      let emRound = !isNaN(parsedRound) && parsedRound > 0 ? parsedRound : 0;
      if (!emRound) {
        const m = cleanName.match(/(?:ງວດ|batch|#)\s*(\d+)/i) || cleanName.match(/(\d+)/);
        if (m && m[1]) emRound = parseInt(m[1], 10);
      }
      if (!emRound) emRound = 1;

      if (existing) {
        existing.items.push(item);
        existing.totalAmount += amt;
        if (!existing.transferTime && item.transferTime) {
          existing.transferTime = item.transferTime;
        }
        if (item.transferDate && item.transferDate > existing.transferDate) {
          existing.transferDate = item.transferDate;
        }
        if (!existing.notes && item.notes) {
          existing.notes = item.notes;
        }
      } else {
        map.set(key, {
          batchId: item.batchId || `em_batch_${cleanName.replace(/[^a-zA-Z0-9_\u0E80-\u0EFF]/g, '_')}`,
          batchName: cleanName,
          transferDate: item.transferDate || new Date().toISOString().split('T')[0],
          transferTime: item.transferTime || '',
          notes: item.notes || '',
          items: [item],
          totalAmount: amt,
          round: emRound,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const dateA = `${a.transferDate} ${a.transferTime || '00:00'}`;
      const dateB = `${b.transferDate} ${b.transferTime || '00:00'}`;
      return dateB.localeCompare(dateA);
    });
  }, [filteredEmergencyDistributions, language]);

  // Filtered sums for lower section
  const filteredInflowSum = useMemo(() => {
    return filteredDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [filteredDonations]);

  const filteredTeamOutflowSum = useMemo(() => {
    return filteredTeamDistributions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [filteredTeamDistributions]);

  const filteredEmergencyOutflowSum = useMemo(() => {
    return filteredEmergencyDistributions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [filteredEmergencyDistributions]);

  const isFilterActive = filterYear !== 'all' || filterMonth !== 'all';

  // Reset all lower section filters
  const handleResetFilters = () => {
    setFilterYear('all');
    setFilterMonth('all');
    setSelectedInflowId('all');
    setSelectedInflowDetail(null);
  };

  // Currently Selected Inflow Object (if single inflow detail is active)
  const selectedInflow = useMemo(() => {
    if (selectedInflowId === 'all') return null;
    return donations.find((d) => d.id === selectedInflowId) || null;
  }, [donations, selectedInflowId]);

  // Handle clicking a Supporter Inflow row
  const handleSelectInflowRow = (donation: DonationTransaction) => {
    if (selectedInflowId === donation.id) {
      setSelectedInflowId('all');
      setSelectedInflowDetail(null);
    } else {
      setSelectedInflowId(donation.id);
      setSelectedInflowDetail(donation);
    }
  };

  // Save Donation Inflow with custom percentage deduction
  const handleSaveDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(donationAmount);
    if (isNaN(amt) || amt <= 0) {
      alert(language === 'lo' ? 'ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຖືກຕ້ອງ' : 'Please enter a valid amount');
      return;
    }

    const chosenPercent = typeof donationPercent === 'number' ? donationPercent : emergencyPercent;

    const dateParts = donationDate.split('-');
    const mStr = dateParts[1] || donationBatchMonth || '09';
    const yStr = dateParts[0] || '2026';
    const parsedBatch = parseBatchMeta({
      batchName: donationBatchName,
      batchRound: donationBatchRound,
      batchMonth: mStr,
      transferDate: donationDate,
    });

    const finalBatchName = donationBatchName.trim() || (language === 'lo' ? parsedBatch.labelLao : parsedBatch.labelEn);

    const payload: DonationTransaction = {
      id: editingDonation ? editingDonation.id : `don_${Date.now()}`,
      date: donationDate,
      description: donationDesc || (language === 'lo' ? 'ເງິນສະໜັບສະໜູນທົ່ວໄປ' : 'General Support'),
      amount: amt,
      currency,
      deductionPercent: chosenPercent,
      evidenceUrl: donationEvidence,
      batchId: donationBatchId || `batch_r${parsedBatch.round}_m${parsedBatch.month}_${yStr}`,
      batchName: finalBatchName,
      batchRound: parsedBatch.round,
      batchMonth: parsedBatch.month,
      createdAt: editingDonation?.createdAt || new Date().toISOString(),
    };

    await saveDonationTransactionToFirestore(payload);

    if (applyPercentToBatch) {
      const targetBatchKey = payload.batchId;
      const targetRound = payload.batchRound;
      const sameBatchItems = donations.filter(
        (it) => it.id !== payload.id && (it.batchId === targetBatchKey || (it.batchRound === targetRound && targetRound !== undefined))
      );
      for (const item of sameBatchItems) {
        await saveDonationTransactionToFirestore({
          ...item,
          deductionPercent: chosenPercent,
        });
      }
    }

    if (updateGlobalPercent) {
      await saveFinanceSettingsToFirestore({ emergencyReservePercent: chosenPercent });
      setEmergencyPercent(chosenPercent);
    }

    await fetchFinance();
    setIsAddDonationOpen(false);
    setEditingDonation(null);
    setDonationDesc('');
    setDonationAmount('');
    setDonationEvidence('');
    setDonationBatchName('');
    setDonationBatchId('');
    setUpdateGlobalPercent(false);
    setApplyPercentToBatch(false);
  };

  // Save / Update Team Member's Private Finance QR (Strictly isolated in Finance collection)
  const handleSaveMemberQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemberQr || !editingMemberQr.name.trim()) {
      alert(language === 'lo' ? 'ກະລຸນາປ້ອນຊື່' : 'Please enter a name');
      return;
    }
    setIsSavingMemberQr(true);
    try {
      const docId = editingMemberQr.id || `fq_${Date.now()}`;
      const existing = qrMembers.find((t) => t.id === docId);

      const payload: FinanceQrMember = {
        id: docId,
        name: editingMemberQr.name.trim(),
        // Safeguard: Never wipe existing photo if not edited
        imageUrl: (editingMemberQr.imageUrl && editingMemberQr.imageUrl.trim()) || existing?.imageUrl || '',
        // Safeguard: Never wipe existing QR code if not edited
        financeQrUrl: (editingMemberQr.financeQrUrl && editingMemberQr.financeQrUrl.trim()) || existing?.financeQrUrl || '',
        bankName: (editingMemberQr.bankName && editingMemberQr.bankName.trim()) || existing?.bankName || 'BCEL One',
        bankAccountNumber: (editingMemberQr.bankAccountNumber && editingMemberQr.bankAccountNumber.trim()) || existing?.bankAccountNumber || '',
        bankAccountName: (editingMemberQr.bankAccountName && editingMemberQr.bankAccountName.trim()) || existing?.bankAccountName || editingMemberQr.name.trim(),
        createdAt: editingMemberQr.createdAt || existing?.createdAt || new Date().toISOString(),
      };

      await saveFinanceQrMemberToFirestore(payload);

      // Also sync to matching team member in TEAMS_COL if present
      const matchedTeam = teams.find(
        (t) => (t.id && (t.id === docId || docId.includes(t.id))) ||
               t.name?.trim().toLowerCase() === payload.name.trim().toLowerCase()
      );
      if (matchedTeam) {
        saveTeamToFirestore({
          ...matchedTeam,
          financeQrUrl: payload.financeQrUrl || matchedTeam.financeQrUrl || '',
          bankName: payload.bankName || matchedTeam.bankName || 'BCEL One',
          bankAccountNumber: payload.bankAccountNumber || matchedTeam.bankAccountNumber || '',
          bankAccountName: payload.bankAccountName || matchedTeam.bankAccountName || matchedTeam.name,
        }).catch(console.warn);
      }

      setQrMembers((prev) => {
        const idx = prev.findIndex((t) => t.id === docId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = payload;
          return next;
        }
        return [...prev, payload];
      });

      setQrSaveMsg(language === 'lo' ? 'ບັນທຶກຂໍ້ມູນ QR ສຳເລັດ!' : 'Saved QR details successfully!');
      setTimeout(() => {
        setQrSaveMsg('');
        setEditingMemberQr(null);
      }, 1000);
    } catch (err: any) {
      alert(err?.message || 'Failed to save QR info');
    } finally {
      setIsSavingMemberQr(false);
    }
  };

  // Remove QR from Finance Tab without deleting the Team Member from About Us database
  const confirmDeleteMemberQr = async () => {
    if (!memberToDelete) return;
    setIsDeletingMember(true);
    try {
      await deleteFinanceQrMemberFromFirestore(memberToDelete.id);
      setQrMembers((prev) => prev.filter((t) => t.id !== memberToDelete.id));
      setMemberToDelete(null);
      setQrSaveMsg(
        language === 'lo'
          ? 'ລຶບລາຍຊື່ QR ອອກຈາກຫ້ອງການເງິນສຳເລັດ (ລາຍຊື່ໃນຫ້ອງກ່ຽວກັບພວກເຮົາ ຍັງຄົງຢູ່ຄືເກົ່າ ບໍ່ໄດ້ຮັບຜົນກະທົບ)'
          : 'Removed QR from Finance successfully (About Us team profile remains untouched)'
      );
      setTimeout(() => setQrSaveMsg(''), 2500);
    } catch (err: any) {
      alert(err?.message || 'Failed to remove QR');
    } finally {
      setIsDeletingMember(false);
    }
  };

  // Dedicated In-App Confirmation Execution for Deleting Financial Records (Replaces blocked window.confirm)
  const confirmDeleteTarget = async () => {
    if (!deleteTarget) return;
    setIsDeletingTarget(true);
    const target = deleteTarget;
    try {
      if (target.type === 'inflow') {
        setDonations((prev) => prev.filter((d) => d.id !== target.id));
        if (selectedInflowId === target.id) {
          setSelectedInflowId('all');
          setSelectedInflowDetail(null);
        }
        await deleteDonationTransactionFromFirestore(target.id);
      } else if (target.type === 'team_dist' || target.type === 'emergency_dist') {
        setDistributions((prev) => prev.filter((d) => d.id !== target.id));
        if (selectedDistDetail?.id === target.id) {
          setSelectedDistDetail(null);
        }
        await deleteTeamDistributionFromFirestore(target.id);
      } else if (target.type === 'batch') {
        const idSet = new Set(target.itemIds || []);
        const itemsToDelete = distributions.filter(
          (d) =>
            idSet.has(d.id) ||
            (d.batchId && d.batchId === target.id) ||
            (d.batchName && d.batchName === target.title) ||
            (d.batchName && target.id && d.batchName === target.id) ||
            `${d.transferDate || 'nodate'}_${d.batchName || 'default'}` === target.id
        );
        const toDeleteIds = itemsToDelete.length > 0 ? itemsToDelete.map((x) => x.id) : (target.itemIds || []);
        const toDeleteSet = new Set(toDeleteIds);

        setDistributions((prev) => prev.filter((d) => !toDeleteSet.has(d.id)));
        await deleteBatchDistributionsFromFirestore(target.id, toDeleteIds, target.title);
      } else if (target.type === 'batch_cut_item') {
        setDistributions((prev) => prev.filter((d) => d.id !== target.id));
        if (editingBatchTarget) {
          const remaining = (editingBatchTarget.items || []).filter((d: any) => d.id !== target.id);
          const newTotal = remaining.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
          setEditingBatchTarget({
            ...editingBatchTarget,
            items: remaining,
            totalAmount: newTotal,
          });
        }
        await deleteTeamDistributionFromFirestore(target.id);
      }
      setDeleteTarget(null);
      await fetchFinance();
    } catch (err: any) {
      console.error('Failed to delete item:', err);
      alert(err?.message || (language === 'lo' ? 'ເກີດຂໍ້ຜິດພາດໃນການລຶບ' : 'Delete failed'));
    } finally {
      setIsDeletingTarget(false);
    }
  };

  const handleDeleteDonation = (id: string, description?: string, amount?: number, date?: string) => {
    setDeleteTarget({
      type: 'inflow',
      id,
      title: description || (language === 'lo' ? 'ເງິນສະໜັບສະໜູນ' : 'Inflow Donation'),
      subtitle: date,
      amount,
    });
  };

  // Save Single Team Distribution Record
  const handleSaveDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(distAmount);
    if (isNaN(amt) || amt <= 0) {
      alert(language === 'lo' ? 'ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຖືກຕ້ອງ' : 'Please enter a valid amount');
      return;
    }
    if (!distRecipient.trim()) {
      alert(language === 'lo' ? 'ກະລຸນາເລືອກລູກທີມຜູ້ຮັບ' : 'Please select recipient');
      return;
    }

    const effectiveBatchId = distBatchId || `batch_${Date.now()}`;
    const defaultBatchTitle =
      language === 'lo'
        ? `ຊຸດ ${distRound} ເດືອນ ${parseInt(distMonth, 10)}`
        : `Batch ${distRound} Month ${parseInt(distMonth, 10)}`;

    const finalBatchName = distBatchName.trim() || defaultBatchTitle;
    const finalPeriod = `${distYear}-${distMonth}`;

    const payload: TeamDistribution = {
      id: editingDist ? editingDist.id : `dist_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      period: finalPeriod,
      batchId: effectiveBatchId,
      batchName: finalBatchName,
      batchRound: distRound,
      batchMonth: distMonth,
      recipientName: distRecipient,
      amount: amt,
      currency,
      evidenceUrl: distEvidence,
      status: distStatus,
      transferDate: distDate,
      transferTime: distTime,
      notes: distNotes,
      category: 'team',
      createdAt: editingDist?.createdAt || new Date().toISOString(),
    };

    await saveTeamDistributionToFirestore(payload);
    await fetchFinance();
    setIsAddDistOpen(false);
    setEditingDist(null);
    setDistRecipient('');
    setDistAmount('');
    setDistEvidence('');
    setDistNotes('');
  };

  // Save Emergency Outflow Distribution Record
  const handleSaveEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(emAmount);
    if (isNaN(amt) || amt <= 0) {
      alert(language === 'lo' ? 'ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຖືກຕ້ອງ' : 'Please enter a valid amount');
      return;
    }
    if (!emRecipient.trim()) {
      alert(language === 'lo' ? 'ກະລຸນາປ້ອນຊື່ຜູ້ຮັບ ຫຼື ຈຸດປະສົງສຸກເສິນ' : 'Please enter recipient or emergency purpose');
      return;
    }

    const effectiveBatchId = emBatchId || `em_batch_${Date.now()}`;
    const payload: TeamDistribution = {
      id: editingEmergency ? editingEmergency.id : `em_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      period: `${emDate.split('-')[0]}-${emDate.split('-')[1]}`,
      batchId: effectiveBatchId,
      batchName: emBatchName.trim() || (language === 'lo' ? 'ສຸກເສິນ ງວດ 1' : 'Emergency #1'),
      recipientName: emRecipient.trim(),
      amount: amt,
      currency,
      evidenceUrl: emEvidence,
      status: emStatus,
      transferDate: emDate,
      transferTime: emTime,
      notes: emNotes,
      category: 'emergency',
      createdAt: editingEmergency?.createdAt || new Date().toISOString(),
    };

    await saveTeamDistributionToFirestore(payload);
    await fetchFinance();
    setIsAddEmergencyOpen(false);
    setEditingEmergency(null);
    setEmRecipient('');
    setEmAmount('');
    setEmEvidence('');
    setEmNotes('');
  };

  const handleDeleteDist = (id: string, name?: string, notes?: string, amount?: number, isEmergency?: boolean) => {
    setDeleteTarget({
      type: isEmergency ? 'emergency_dist' : 'team_dist',
      id,
      title: name || (language === 'lo' ? 'ລາຍການໂອນ' : 'Transfer Record'),
      subtitle: notes,
      amount,
    });
  };

  // Delete an Entire Batch / Round (Works for both Team & Emergency batches)
  const handleDeleteBatch = (batchId: string, batchName: string, count: number, itemIds?: string[]) => {
    setDeleteTarget({
      type: 'batch',
      id: batchId,
      title: batchName,
      batchCount: count,
      itemIds: itemIds || [],
    });
  };

  // Auto Split 80% into a dedicated Batch / Round
  const handleAutoDistributeToBatch = async (customPool?: number, targetBatchName?: string, batchDateParam?: string, batchTimeParam?: string) => {
    if (activeTeams.length === 0) return;
    const targetPool = customPool !== undefined ? customPool : (activeKpiBatch ? kpiBatchTeamRemaining : remaining80Actual);
    const splitAmount = Math.floor(targetPool / activeTeams.length);
    if (splitAmount <= 0) {
      alert(language === 'lo' ? 'ຍອດເງິນ 80% ບໍ່ພຽງພໍສຳລັບການແບ່ງປັນ' : 'Remaining 80% balance is zero');
      return;
    }

    const defaultBatchTitle =
      language === 'lo'
        ? `ຊຸດ ${autoBatchRound} ເດືອນ ${parseInt(autoBatchMonth, 10)}`
        : `Batch ${autoBatchRound} Month ${parseInt(autoBatchMonth, 10)}`;
    const finalBatchName = targetBatchName || autoBatchName.trim() || defaultBatchTitle;
    const finalDate = batchDateParam || autoBatchDate;
    const finalTime =
      batchTimeParam ||
      autoBatchTime ||
      `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const newBatchId = `batch_${Date.now()}`;
    const finalPeriod = `${autoBatchYear}-${autoBatchMonth}`;

    for (const t of activeTeams) {
      const payload: TeamDistribution = {
        id: `dist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        period: finalPeriod,
        batchId: newBatchId,
        batchName: finalBatchName,
        batchRound: autoBatchRound,
        batchMonth: autoBatchMonth,
        recipientName: t.name,
        amount: splitAmount,
        currency,
        status: 'transferred',
        transferDate: finalDate,
        transferTime: finalTime,
        category: 'team',
        notes: autoBatchNotes || (selectedInflow ? `ແບ່ງ 80% ຈາກຍອດ ${selectedInflow.description}` : 'ແບ່ງປັນອັດຕະໂນມັດ 80%'),
        createdAt: new Date().toISOString(),
      };
      await saveTeamDistributionToFirestore(payload);
    }
    await fetchFinance();
    setIsAutoBatchModalOpen(false);
    setAutoBatchName('');
    setAutoBatchCustomPool('');
    setAutoBatchNotes('');
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = `Finance Ledger Report - HOPE BOKEO\n`;
    csv += `Total Inflow Balance,${totalBalanceAll},${currency}\n`;
    csv += `20% Savings Reserve,${totalSavings20},${currency}\n`;
    csv += `Emergency Transferred,${totalEmergencyTransferred},${currency}\n`;
    csv += `Remaining Emergency 20%,${remainingEmergencySavings},${currency}\n`;
    csv += `80% Team Pool,${totalPool80},${currency}\n`;
    csv += `Team Transferred,${totalTeamTransferred},${currency}\n`;
    csv += `Remaining 80% Pool,${remaining80Actual},${currency}\n`;
    csv += `Total Combined Transferred,${totalTransferred},${currency}\n`;
    csv += `Actual Net Remaining,${netRemainingActual},${currency}\n\n`;

    csv += `1. DONATIONS INFLOW (ຜູ້ສະໜັບສະໜູນ)\nDate,Description,Amount,Currency\n`;
    donations.forEach((d) => {
      csv += `"${d.date}","${d.description.replace(/"/g, '""')}",${d.amount},${currency}\n`;
    });

    csv += `\n2. EMERGENCY OUTFLOW (ການໂອນເງິນສຸກເສິນ - 20% Reserve)\nBatch Name,Recipient / Purpose,Amount,Status,Transfer Date,Transfer Time,Notes\n`;
    emergencyDistributionsAll.forEach((d) => {
      csv += `"${d.batchName || 'ສຸກເສິນ ງວດ 1'}","${d.recipientName}",${d.amount},"${d.status}","${d.transferDate}","${d.transferTime || ''}","${(d.notes || '').replace(/"/g, '""')}"\n`;
    });

    csv += `\n3. TEAM SUPPORT DISTRIBUTIONS (ການໂອນສະໜັບສະໜູນທີມ - 80% Pool)\nBatch Name,Recipient,Amount,Status,Transfer Date,Transfer Time,Notes\n`;
    teamDistributionsAll.forEach((d) => {
      csv += `"${d.batchName || 'ງວດທີ 1'}","${d.recipientName}",${d.amount},"${d.status}","${d.transferDate}","${d.transferTime || ''}","${(d.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hope_bokeo_finance_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Currency Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-slate-900 text-white p-3.5 sm:p-6 rounded-none border border-slate-800 shadow-xl">
        <div className="flex items-start sm:items-center justify-between w-full sm:w-auto gap-2 sm:gap-3">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1 -ml-1 text-slate-300 hover:text-white active:scale-90 transition flex items-center justify-center shrink-0 group cursor-pointer -mt-1 sm:mt-0"
                title={language === 'lo' ? 'ຍ້ອນກັບ (Back)' : 'Go Back'}
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-1 transition-transform" />
              </button>
            )}
            <div className="text-red-500 shrink-0 flex items-center justify-center -mt-0.5 sm:mt-0">
              <Wallet className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm xs:text-base sm:text-2xl font-black text-white leading-tight sm:leading-normal">
                {language === 'lo' ? 'ລະບົບການຈັດການການເງິນ & ຜູ້ສະໜັບສະໜູນ' : 'Financial Management & Team Support'}
              </h2>
            </div>
          </div>

          {/* Mobile buttons: right aligned on the same row as the title */}
          <div className="sm:hidden shrink-0 self-start -mt-0.5 flex items-center gap-1.5">
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setIsTeamQrManagerOpen(true)}
                className="p-1.5 xs:p-2 bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white rounded-none text-xs font-bold transition flex items-center gap-1 border border-purple-500 shadow cursor-pointer active:scale-95"
                title={language === 'lo' ? '💳 ຈັດການບັນຊີຄິວອາ (QR Accounts)' : 'Manage QR Accounts'}
              >
                <QrCode className="w-4 h-4 text-purple-200" />
                <span className="text-[10px] font-mono bg-purple-900/90 px-1 rounded">{qrMembers.length}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-1.5 xs:p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-none text-xs font-bold transition flex items-center justify-center border border-slate-700 shadow cursor-pointer active:scale-95"
              title={language === 'lo' ? 'ດາວໂຫຼດ CSV' : 'Export CSV'}
            >
              <Download className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
          {/* Desktop QR Accounts Manager button */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsTeamQrManagerOpen(true)}
              className="hidden sm:flex p-2 sm:px-3 sm:py-2.5 bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white rounded-none text-xs font-bold transition items-center gap-1.5 border border-purple-500 shadow cursor-pointer"
              title={language === 'lo' ? '💳 ຈັດການບັນຊີຄິວອາ (QR Accounts)' : 'Manage QR Accounts'}
            >
              <QrCode className="w-4 h-4 text-purple-200" />
              <span>{language === 'lo' ? '💳 ຈັດການບັນຊີຄິວອາ' : 'Manage QR Accounts'}</span>
              <span className="text-[10px] font-mono bg-purple-900/90 px-1.5 py-0.5 rounded-full border border-purple-400/50">
                {qrMembers.length}
              </span>
            </button>
          )}
          {/* Desktop Download button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="hidden sm:flex p-2 sm:p-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-none text-xs font-bold transition items-center justify-center border border-slate-700 shadow cursor-pointer"
            title={language === 'lo' ? 'ດາວໂຫຼດ CSV' : 'Export CSV'}
          >
            <Download className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* BATCH SELECTOR & KPI CARDS: SHOWS NEW BATCH AMOUNT AS MAIN NUMBER & ALL BATCHES TOTAL BELOW */}
      <div className="space-y-3">
        {/* TOP 3 MAIN SPREADSHEET KPI CARDS (Side-by-side on mobile and desktop) */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-4 md:gap-5">
          {/* 1. Total Net Remaining Balance (ເງິນຕົວຈິງທີ່ຍັງເຫຼືອ) */}
          <div className="text-white p-2 sm:p-4 md:p-5 rounded-none shadow-lg border relative overflow-hidden flex flex-col justify-between min-h-[96px] sm:min-h-[140px] md:min-h-[170px] bg-[#243b67] border-blue-400/40">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8.5px] sm:text-xs md:text-sm font-black uppercase tracking-wider text-blue-200 leading-tight truncate">
                TOTAL BALANCE
              </span>
              <Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-blue-300/80 shrink-0" />
            </div>

            <div className="my-0.5 sm:my-2">
              {/* MAIN NUMBER: Shows New Batch amount only (5,400,000) - full batch inflow */}
              <div className="text-[11px] sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight break-all sm:break-normal">
                {(activeKpiBatch ? activeKpiBatch.totalInflow : netRemainingActual).toLocaleString()}{' '}
                <span className="text-[9px] sm:text-lg md:text-2xl font-serif">{currency}</span>
              </div>
            </div>

            {/* ດ້ານລຸ່ມ: TOTAL ຂອງທຸກຊຸດເລີຍ ຕາມທີ່ຜູ້ໃຊ້ຮ້ອງຂໍ */}
            <div className="pt-1 sm:pt-2 border-t border-blue-400/35 space-y-0.5 sm:space-y-1">
              <div className="flex items-center justify-between text-[7.5px] sm:text-xs text-blue-100 font-bold gap-1">
                <span className="flex items-center gap-1 truncate">
                  <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-300 shrink-0" />
                  <span className="truncate">
                    {language === 'lo' ? 'Total ທຸກຊຸດ:' : 'Total All Batches:'}
                  </span>
                </span>
                <span className="text-[8px] sm:text-sm font-black text-white font-mono shrink-0">
                  {totalBalanceAll.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex items-center justify-between text-[7.5px] sm:text-xs text-blue-200/90 font-medium">
                <span>{language === 'lo' ? 'ຈຳນວນຊຸດ:' : 'Batches:'}</span>
                <span className="font-bold text-white font-mono">
                  {groupedDonationBatches.length} {language === 'lo' ? 'ຊຸດ' : 'batches'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Configured % Emergency Savings Reserve */}
          <div className="text-white p-2 sm:p-4 md:p-5 rounded-none shadow-lg border relative overflow-hidden flex flex-col justify-between min-h-[96px] sm:min-h-[140px] md:min-h-[170px] bg-[#1a4a38] border-emerald-500/40">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8.5px] sm:text-xs md:text-sm font-black uppercase tracking-wider text-emerald-200 leading-tight truncate">
                {activeKpiBatch ? activeBatchPercent : emergencyPercent}% <span className="hidden sm:inline">EMERGENCY</span> SAVINGS
              </span>
              <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-300/80 shrink-0" />
            </div>

            <div className="my-0.5 sm:my-2">
              {/* MAIN NUMBER: Shows Net Emergency Savings after deduction */}
              <div className="text-[11px] sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight break-all sm:break-normal">
                {(activeKpiBatch ? kpiBatchEmergencyRemaining : remainingEmergencySavings).toLocaleString()}{' '}
                <span className="text-[9px] sm:text-lg md:text-2xl font-serif">{currency}</span>
              </div>
            </div>

            {/* 2. ດ້ານລຸ່ມ: ບອກຍອດລວມ ໂອນເທົ່າໃດ ຍັງເທົ່າໃດ (ບໍ່ເອົາເລກຊຸດ) */}
            <div className="pt-1 sm:pt-2 border-t border-emerald-500/35 space-y-0.5 sm:space-y-1">
              <div className="flex items-center justify-between text-[7.5px] sm:text-xs text-emerald-100 font-bold gap-1">
                <span className="flex items-center gap-1 truncate">
                  <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400 shrink-0" />
                  <span className="truncate">
                    {language === 'lo' ? 'ໂອນລວມ:' : 'Total Paid:'}
                  </span>
                </span>
                <span className="text-[8px] sm:text-sm font-black text-white font-mono shrink-0">
                  {totalEmergencyTransferred.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex items-center justify-between text-[7.5px] sm:text-xs text-emerald-200/90 font-medium gap-1">
                <span className="flex items-center gap-1 truncate">
                  <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-300 shrink-0" />
                  <span className="truncate">
                    {language === 'lo' ? 'ຍັງເຫຼືອ:' : 'Remaining:'}
                  </span>
                </span>
                <span className="font-bold text-white font-mono shrink-0">
                  {remainingEmergencySavings.toLocaleString()} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Configured % Team Support Distribution Pool */}
          <div className="text-white p-2 sm:p-4 md:p-5 rounded-none shadow-lg border relative overflow-hidden flex flex-col justify-between min-h-[96px] sm:min-h-[140px] md:min-h-[170px] bg-[#5c2424] border-red-400/40">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8.5px] sm:text-xs md:text-sm font-black uppercase tracking-wider text-red-200 leading-tight truncate">
                {activeKpiBatch ? activeBatchTeamPercent : teamPercent}% TEAM POOL
              </span>
              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-amber-300/80 shrink-0" />
            </div>

            <div className="my-0.5 sm:my-2">
              {/* MAIN NUMBER: Shows Net Team Pool after deduction */}
              <div className="text-[11px] sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight break-all sm:break-normal">
                {(activeKpiBatch ? kpiBatchTeamRemaining : remaining80Actual).toLocaleString()}{' '}
                <span className="text-[9px] sm:text-lg md:text-2xl font-serif">{currency}</span>
              </div>
            </div>

            {/* 3. ດ້ານລຸ່ມ: ບອກຍອດລວມ ໂອນເທົ່າໃດ ຍັງເທົ່າໃດ (ບໍ່ເອົາເລກຊຸດ) */}
            <div className="pt-1 sm:pt-2 border-t border-red-400/35 space-y-0.5 sm:space-y-1">
              <div className="flex items-center justify-between text-[7.5px] sm:text-xs text-red-100 font-bold gap-1">
                <span className="flex items-center gap-1 truncate">
                  <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="truncate">
                    {language === 'lo' ? 'ໂອນລວມ:' : 'Total Paid:'}
                  </span>
                </span>
                <span className="text-[8px] sm:text-sm font-black text-white font-mono shrink-0">
                  {totalTeamTransferred.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex items-center justify-between text-[7.5px] sm:text-xs text-red-200/90 font-medium gap-1">
                <span className="flex items-center gap-1 truncate">
                  <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">
                    {language === 'lo' ? 'ຍັງເຫຼືອ:' : 'Remaining:'}
                  </span>
                </span>
                <span className="font-bold text-white font-mono shrink-0">
                  {remaining80Actual.toLocaleString()} {currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COMPACT FILTER PANEL FOR SPREADSHEET (Single Row Layout) */}
      <div className="bg-white dark:bg-slate-800 px-2.5 sm:px-3.5 py-2 rounded-none border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 shrink-0">
          <Filter className="w-3.5 h-3.5 text-[#cc0000] shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 whitespace-nowrap">
            {language === 'lo' ? 'ກັ່ນຕອງ' : 'Filter'}
          </span>
          {isFilterActive && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-black shrink-0 hidden xs:inline sm:inline">
              {language === 'lo' ? 'ກັ່ນຕອງຢູ່' : 'Active'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-end min-w-0">
          {/* Year Filter: Starts from 2026 onwards to infinity + manual typing input */}
          <div className="relative flex items-center flex-1 max-w-[120px] sm:max-w-[160px] min-w-0">
            <input
              list="finance-years-list"
              type="text"
              value={filterYear === 'all' ? '' : filterYear}
              onChange={(e) => {
                const val = e.target.value.trim();
                setFilterYear(val === '' ? 'all' : val);
              }}
              placeholder={language === 'lo' ? 'ປີ 2026...' : 'Year 2026...'}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none px-2 py-1 text-[11px] sm:text-xs text-slate-800 dark:text-white font-bold outline-none focus:border-amber-500"
            />
            <datalist id="finance-years-list">
              <option value="all">{language === 'lo' ? 'ທຸກໆປີ (All Years)' : 'All Years'}</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {language === 'lo' ? `ປີ ${y}` : `Year ${y}`}
                </option>
              ))}
            </datalist>
            {filterYear !== 'all' && filterYear !== '' && (
              <button
                type="button"
                onClick={() => setFilterYear('all')}
                className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear Year"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Month Filter */}
          <div className="flex-1 max-w-[125px] sm:max-w-[160px] min-w-0">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none px-2 py-1 text-[11px] sm:text-xs text-slate-800 dark:text-white font-bold outline-none focus:border-amber-500"
            >
              <option value="all">{language === 'lo' ? 'ທຸກໆເດືອນ' : 'All Months'}</option>
              {monthsList.map((m) => (
                <option key={m.value} value={m.value}>
                  {language === 'lo' ? m.lo : m.en}
                </option>
              ))}
            </select>
          </div>

          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-none transition shrink-0"
              title={language === 'lo' ? 'ລ້າງຕົວກັ່ນຕອງ' : 'Reset Filters'}
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">{language === 'lo' ? 'ລ້າງ' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SPREADSHEET 3-COLUMN SECTION: Left (Inflow) | Middle (Emergency Outflow) | Right (Team Support) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5 sm:gap-5 items-start">
        {/* 1. LEFT SECTION: Supporter Donations Inflow */}
        <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-auto">
          {/* Table Header Bar */}
          <div className="bg-[#1e293b] text-white px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <h3 className="text-[11px] font-black uppercase tracking-wider">
                {language === 'lo' ? 'ເງິນສະໜັບສະໜູນ (Inflow)' : 'Supporter Inflows'}
              </h3>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => {
                  setEditingDonation(null);
                  setDonationDate(new Date().toISOString().split('T')[0]);
                  setDonationAmount('');
                  setDonationDesc('');
                  setDonationPercent(emergencyPercent);
                  setDonationEvidence('');
                  setDonationBatchRound(1);
                  setDonationBatchMonth(filterMonth !== 'all' ? filterMonth : '09');
                  setDonationBatchName('');
                  setIsAddDonationOpen(true);
                }}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow flex items-center gap-1 cursor-pointer transition active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>{language === 'lo' ? '+ ເພີ່ມເງິນເຂົ້າ' : '+ Add Inflow'}</span>
              </button>
            )}
          </div>

          {/* Spreadsheet Header Row: Date | Supporter | Amount */}
          <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 px-3 py-1.5">
            <div className="col-span-3">Date (ວັນທີ)</div>
            <div className="col-span-5">Supporter / Purpose</div>
            <div className="col-span-4 text-right">
              {isReadOnly ? (language === 'lo' ? 'ຈຳນວນເງິນ' : 'Amount') : (language === 'lo' ? 'ຈຳນວນ & ຈັດການ' : 'Amount & Actions')}
            </div>
          </div>

          {/* Scrollable Rows - Shrinks to fit data without huge empty gaps */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60 overflow-y-auto max-h-[480px]">
            {filteredDonations.length === 0 ? (
              <div className="p-4 sm:p-6 text-center text-slate-400 space-y-1.5">
                <FileSpreadsheet className="w-7 h-7 mx-auto opacity-40 text-emerald-500" />
                <p className="text-[11px] font-medium">
                  {language === 'lo' ? 'ຍັງບໍ່ມີຂໍ້ມູນເງິນສະໜັບສະໜູນ' : 'No donation records found'}
                </p>
              </div>
            ) : (
              filteredDonations.map((d) => {
                const isSelected = selectedInflowId === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => handleSelectInflowRow(d)}
                    className={`grid grid-cols-12 items-center px-3 py-2 hover:bg-emerald-50/60 dark:hover:bg-slate-750 text-xs transition cursor-pointer group ${
                      isSelected
                        ? 'bg-emerald-100/70 dark:bg-emerald-950/60 border-l-4 border-emerald-500 font-bold'
                        : ''
                    }`}
                    title={language === 'lo' ? 'ກົດເພື່ອເບິ່ງລາຍລະອຽດ ຫຼື ສະລິບ' : 'Click to view slip / details'}
                  >
                    <div className="col-span-3 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {d.date}
                    </div>

                    <div className="col-span-5 truncate pr-1">
                      <div className="font-bold text-slate-800 dark:text-white text-[11px] truncate group-hover:text-emerald-600 transition">
                        {d.description}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="inline-flex items-center gap-0.5 text-[8.5px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800"
                          title={language === 'lo' ? `ອັດຕາຫັກສຳຮອງ: ${typeof d.deductionPercent === 'number' ? d.deductionPercent : emergencyPercent}%` : `Deduction: ${typeof d.deductionPercent === 'number' ? d.deductionPercent : emergencyPercent}%`}
                        >
                          🛡️ {typeof d.deductionPercent === 'number' ? d.deductionPercent : emergencyPercent}%
                        </span>
                        {d.evidenceUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewSlipUrl(d.evidenceUrl || null);
                            }}
                            className="inline-flex items-center gap-1 text-[9.5px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                          >
                            <ImageIcon className="w-2.5 h-2.5" />
                            <span>{language === 'lo' ? 'ສະລິບ' : 'Slip'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="col-span-4 flex items-center justify-end gap-1.5">
                      <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                        {d.amount.toLocaleString()} {currency}
                      </span>
                      {!isReadOnly && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDonation(d);
                              setDonationDate(d.date || new Date().toISOString().split('T')[0]);
                              setDonationAmount(String(d.amount));
                              setDonationDesc(d.description || '');
                              setDonationPercent(typeof d.deductionPercent === 'number' ? d.deductionPercent : emergencyPercent);
                              setDonationEvidence(d.evidenceUrl || '');
                              setDonationBatchRound(d.batchRound || 1);
                              setDonationBatchMonth(d.batchMonth || '09');
                              setDonationBatchName(d.batchName || '');
                              setIsAddDonationOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-100/50 dark:hover:bg-emerald-950/50 transition cursor-pointer"
                            title={language === 'lo' ? 'ແກ້ໄຂ' : 'Edit'}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDonation(d.id, d.description, d.amount, d.date);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-100/50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            title={language === 'lo' ? 'ລຶບ' : 'Delete'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Table Footer Summary */}
          <div className="mt-auto bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-3 py-2 flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
            <span>
              {language === 'lo'
                ? isFilterActive
                  ? 'ລວມຍອດຮັບ (ຕາມຟິວເຕີ):'
                  : 'ລວມຍອດຮັບທັງໝົດ:'
                : 'Total Inflow:'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[9.5px] font-normal">
                ({language === 'lo' ? 'Total ທຸກຊຸດ:' : 'All Batches:'}{' '}
                <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                  {totalBalanceAll.toLocaleString()} {currency}
                </span>)
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono">
                {filteredInflowSum.toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </div>

        {/* 2. MIDDLE SECTION: Emergency Outflow Transfers (ການໂອນເງິນສຸກເສິນ - 20% Reserve) */}
        <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-auto">
          {/* Main Top Header Bar */}
          <div className="bg-[#881337] text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
              <h3 className="text-[11px] font-black uppercase tracking-wider">
                {language === 'lo' ? '🚨 ການໂອນເງິນສຸກເສິນ (Emergency)' : 'Emergency Transfers'}
              </h3>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => {
                  setEditingEmergency(null);
                  setEmBatchId('');
                  setEmBatchName(language === 'lo' ? `ສຸກເສິນ ງວດ ${groupedEmergencyBatches.length + 1}` : `Emergency #${groupedEmergencyBatches.length + 1}`);
                  setEmRecipient('');
                  setEmAmount('');
                  setEmDate(new Date().toISOString().split('T')[0]);
                  setEmTime('12:00');
                  setEmEvidence('');
                  setEmStatus('transferred');
                  setEmNotes('');
                  setIsAddEmergencyOpen(true);
                }}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold shadow flex items-center gap-1 cursor-pointer transition active:scale-95"
                title={language === 'lo' ? 'ເພີ່ມລາຍການໂອນສຸກເສິນ' : 'Add Emergency Transfer'}
              >
                <Plus className="w-3 h-3" />
                <span>{language === 'lo' ? '+ ໂອນສຸກເສິນ' : '+ Add Transfer'}</span>
              </button>
            )}
          </div>

          {/* Emergency Summary Bar: Batch Count */}
          <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-1 flex items-center justify-end text-[10px]">
            <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <span>{language === 'lo' ? 'ຈຳນວນງວດສຸກເສິນ:' : 'Emergency Batches:'}</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-800/60">
                {groupedEmergencyBatches.length} {language === 'lo' ? 'ງວດ' : 'Batches'}
              </span>
            </div>
          </div>

          {/* Scrollable Container with Clean Emergency Batch Items - Shrinks to fit content */}
          <div className="p-2.5 sm:p-3 space-y-3 overflow-y-auto max-h-[480px] bg-white dark:bg-slate-800/60">
            {groupedEmergencyBatches.length === 0 ? (
              <div className="p-3.5 sm:p-5 text-center text-slate-400 space-y-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <ShieldAlert className="w-8 h-8 mx-auto opacity-40 text-rose-500" />
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                    {language === 'lo' ? 'ຍັງບໍ່ມີລາຍການໂອນເງິນສຸກເສິນ' : 'No Emergency Transfers Recorded'}
                  </h4>
                  <p className="text-[11px] font-medium text-slate-400">
                    {language === 'lo'
                      ? 'ຍອດເງິນສຳຮອງສຸກເສິນຍັງຄົງເຫຼືອຄົບຖ້ວນ ແລະ ຖືກເກັບຮັກສາໄວ້ຢ່າງປອດໄພ'
                      : 'Emergency reserve is fully intact and safely stored'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Emergency Batches Quick Header Toolbar with Collapse/Expand All */}
                {groupedEmergencyBatches.length > 0 && (
                  <div className="flex items-center justify-between gap-2 px-2.5 py-1 bg-rose-50/70 dark:bg-rose-950/30 rounded-lg border border-rose-200/60 dark:border-rose-900/40 text-[10px] mb-2">
                    <span className="font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      <span>{language === 'lo' ? 'ລາຍການງວດສຸກເສິນ' : 'Emergency Batches'}</span>
                      <span className="font-mono text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-white dark:bg-rose-900/60 px-1.5 py-0.2 rounded-full border border-rose-300 dark:border-rose-800">
                        {groupedEmergencyBatches.length} {language === 'lo' ? 'ງວດ' : 'Batches'}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={toggleAllEmBatchesCollapse}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition shadow-xs cursor-pointer"
                      title={groupedEmergencyBatches.every((b, idx) => isEmBatchCollapsed(b.batchId, idx)) ? (language === 'lo' ? 'ສະແດງທຸກງວດ' : 'Expand All') : (language === 'lo' ? 'ເຊື່ອງທຸກງວດ' : 'Collapse All')}
                    >
                      {groupedEmergencyBatches.every((b, idx) => isEmBatchCollapsed(b.batchId, idx)) ? (
                        <>
                          <ChevronsDown className="w-3 h-3 text-rose-500" />
                          <span>{language === 'lo' ? 'ສະແດງທຸກງວດ' : 'Expand All'}</span>
                        </>
                      ) : (
                        <>
                          <ChevronsUp className="w-3 h-3 text-slate-400" />
                          <span>{language === 'lo' ? 'ເຊື່ອງທຸກງວດ' : 'Collapse All'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {groupedEmergencyBatches.map((batch, bIdx) => {
                  const isCollapsed = isEmBatchCollapsed(batch.batchId, bIdx);
                  const emRoundNum = batch.round || bIdx + 1;

                  return (
                    /* EMERGENCY BATCH SECTION: Clear Prominent Divider Line Between Batches */
                    <div
                      key={batch.batchId}
                      className="border-b-2 border-slate-300 dark:border-slate-650 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0 space-y-2"
                    >
                      {/* BATCH HEADER: Number, Date, Arrow toggle, Member count, and Admin Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 px-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Collapse / Expand Arrow Button */}
                          <button
                            type="button"
                            onClick={() => toggleEmBatchCollapse(batch.batchId, bIdx)}
                            className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-750 transition cursor-pointer flex items-center justify-center shrink-0"
                            title={isCollapsed ? (language === 'lo' ? 'ກົດເພື່ອເບິ່ງລາຍການ' : 'Click to expand') : (language === 'lo' ? 'ກົດເພື່ອເຊື່ອງລາຍການ' : 'Click to collapse')}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            )}
                          </button>

                          {/* Round Number Badge */}
                          <span className="w-6 h-6 rounded-md bg-rose-600 text-white font-bold text-[11px] flex items-center justify-center font-mono shadow-xs shrink-0">
                            {emRoundNum}
                          </span>

                          {batch.batchName && !batch.batchName.toLowerCase().startsWith('emergency') && !batch.batchName.startsWith('ສຸກເສິນ') && (
                            <span className="font-bold text-[11px] text-slate-800 dark:text-white">
                              {batch.batchName}
                            </span>
                          )}

                          {/* Date only */}
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                            {formatFullDateWithMonth(batch.transferDate)}
                          </span>

                          {/* Member / item count */}
                          <span className="text-[10px] text-slate-400 font-medium">
                            • {batch.items.length} {language === 'lo' ? 'ລາຍການ' : 'items'}
                          </span>

                          {batch.notes && (
                            <span className="text-[10px] text-slate-400 italic">
                              ({batch.notes})
                            </span>
                          )}
                        </div>
                        {/* Emergency Batch Actions */}
                        {!isReadOnly && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBatch(
                                  batch.batchId,
                                  batch.batchName || (language === 'lo' ? `ສຸກເສິນ ງວດ ${emRoundNum}` : `Emergency #${emRoundNum}`),
                                  batch.items.length,
                                  batch.items.map((it: any) => it.id)
                                );
                              }}
                              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-100/50 dark:hover:bg-rose-950/50 transition cursor-pointer flex items-center gap-0.5 font-bold"
                              title={language === 'lo' ? 'ລຶບງວດສຸກເສິນນີ້ທັງໝົດ' : 'Delete Emergency Batch'}
                            >
                              <Trash2 className="w-2.5 h-2.5 text-rose-500" />
                              <span className="hidden xs:inline">{language === 'lo' ? 'ລຶບງວດ' : 'Delete'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Collapsed View: Names Hidden, Showing Only Total & Tap to Expand */}
                      {isCollapsed ? (
                        <div
                          onClick={() => toggleEmBatchCollapse(batch.batchId, bIdx)}
                          className="px-3 py-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-dashed border-rose-300/80 dark:border-rose-800/60 hover:bg-rose-100/70 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center justify-between text-[10px] group"
                          title={language === 'lo' ? 'ກົດເພື່ອເປີດສະແດງລາຍການ' : 'Click to expand list'}
                        >
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <ShieldAlert className="w-3 h-3 text-rose-500" />
                            <span className="font-semibold group-hover:text-rose-600 dark:group-hover:text-rose-400">
                              {language === 'lo' ? `ເຊື່ອງ ${batch.items.length} ລາຍການໄວ້ • ແຕະເພື່ອເປີດເບິ່ງ` : `${batch.items.length} items hidden • Click to expand`}
                            </span>
                          </div>
                          <div className="font-mono font-bold text-[11px] text-rose-600 dark:text-rose-400">
                            {batch.totalAmount.toLocaleString()} {currency}
                          </div>
                        </div>
                      ) : (
                        /* Expanded: Emergency Spreadsheet Rows & Bottom Total */
                        <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/80 dark:border-slate-700/60 overflow-hidden">
                          {batch.items.map((d) => (
                            <div
                              key={d.id}
                              onClick={() => setSelectedDistDetail(d)}
                              className="grid grid-cols-12 items-center px-3 py-2 hover:bg-rose-50/70 dark:hover:bg-slate-750/70 text-xs transition cursor-pointer group"
                            >
                              {/* Recipient & Emergency Transfer Purpose / Note (ໂອນເຮັດຫຍັງ) */}
                              <div className="col-span-6 flex items-start gap-2 min-w-0 py-0.5 pr-1">
                                <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-rose-300 dark:border-rose-700 shadow-xs mt-0.5">
                                  <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="font-bold text-slate-800 dark:text-white text-[11px] group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                                    {d.recipientName}
                                  </div>
                                  {/* ໝາຍເຫດວ່າ ໂອນເຮັດຫຍັງ (Emergency Purpose / Note) */}
                                  {d.notes ? (
                                    <div className="inline-flex items-start gap-1 text-[9.5px] text-rose-800 dark:text-rose-200 bg-rose-100/70 dark:bg-rose-950/70 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900/60 leading-tight">
                                      <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">
                                        {language === 'lo' ? 'ໝາຍເຫດ:' : 'Note:'}
                                      </span>
                                      <span className="font-medium break-words">{d.notes}</span>
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-slate-400 italic">
                                      {language === 'lo' ? '(ບໍ່ມີໝາຍເຫດ)' : '(No note)'}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Amount */}
                              <div className="col-span-4 text-left pl-2 sm:pl-4 font-bold text-[11px] sm:text-xs text-rose-600 dark:text-rose-400 font-mono whitespace-nowrap">
                                {d.amount.toLocaleString()} {currency}
                              </div>

                              {/* Actions: Evidence Slip, Edit, Delete */}
                              <div className="col-span-2 text-center flex items-center justify-end gap-1 pr-1 sm:pr-2">
                                {d.evidenceUrl && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewSlipUrl(d.evidenceUrl || null);
                                    }}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded text-[9px] font-bold border border-rose-300 dark:border-rose-700 shadow-xs hover:bg-rose-100 transition cursor-pointer"
                                    title={language === 'lo' ? 'ເບິ່ງສະລິບ' : 'Slip'}
                                  >
                                    <ImageIcon className="w-2.5 h-2.5 text-rose-500" />
                                    <span className="hidden xs:inline">{language === 'lo' ? 'ສະລິບ' : 'Slip'}</span>
                                  </button>
                                )}
                                {!isReadOnly && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingEmergency(d);
                                        setEmBatchId(d.batchId || '');
                                        setEmBatchName(d.batchName || (language === 'lo' ? 'ສຸກເສິນ ງວດ 1' : 'Emergency #1'));
                                        setEmRecipient(d.recipientName);
                                        setEmAmount(String(d.amount));
                                        setEmDate(d.transferDate || new Date().toISOString().split('T')[0]);
                                        setEmTime(d.transferTime || '12:00');
                                        setEmEvidence(d.evidenceUrl || '');
                                        setEmStatus(d.status);
                                        setEmNotes(d.notes || '');
                                        setIsAddEmergencyOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-100/50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                      title={language === 'lo' ? 'ແກ້ໄຂ' : 'Edit'}
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDist(d.id, d.recipientName, d.notes || d.batchName, d.amount, true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-100/50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                      title={language === 'lo' ? 'ລຶບ' : 'Delete'}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Emergency Batch Bottom Total Row */}
                          <div className="px-3 py-2 bg-rose-500/10 dark:bg-rose-950/30 border-t border-rose-200/80 dark:border-rose-800/60 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                              <span>{language === 'lo' ? 'ລວມຍອດໂອນງວດນີ້:' : 'Batch Total:'}</span>
                              <span className="text-[9.5px] font-normal text-slate-500 dark:text-slate-400">
                                ({batch.items.length} {language === 'lo' ? 'ລາຍການ' : 'items'})
                              </span>
                            </span>
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                              {batch.totalAmount.toLocaleString()} {currency}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Table Footer Summary */}
          <div className="mt-auto bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-3 py-2 flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
            <span>
              {language === 'lo'
                ? isFilterActive
                  ? 'ລວມໂອນສຸກເສິນ (ຕາມຟິວເຕີ):'
                  : 'ລວມໂອນສຸກເສິນທັງໝົດ:'
                : 'Total Emergency Outflow:'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[9.5px] font-normal">
                ({language === 'lo' ? 'Total ທຸກຊຸດ:' : 'All Batches:'}{' '}
                <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                  {totalEmergencyTransferred.toLocaleString()} {currency}
                </span>)
              </span>
              <span className="text-rose-600 dark:text-rose-400 text-xs font-bold font-mono">
                {filteredEmergencyOutflowSum.toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </div>

        {/* 3. RIGHT SECTION: Distribution to Team Members in Batches (ການໂອນສະໜັບສະໜູນທີມ - 80% Pool) */}
        <div className="bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-auto">
          {/* Main Top Header Bar */}
          <div className="bg-[#1e3a5f] text-white px-3 py-2 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <h3 className="text-[11px] font-black uppercase tracking-wider">
                {language === 'lo' ? '👥 ການໂອນສະໜັບສະໜູນທີມ (Team Support)' : 'Team Support'}
              </h3>
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDist(null);
                    setDistBatchId('');
                    const currentMonthStr = filterMonth !== 'all' ? filterMonth : (new Date().getMonth() + 1).toString().padStart(2, '0');
                    const nextRound = groupedTeamBatches.length + 1;
                    setDistRound(nextRound);
                    setDistMonth(currentMonthStr);
                    setDistBatchName(language === 'lo' ? `ຊຸດ ${nextRound} ເດືອນ ${parseInt(currentMonthStr, 10)}` : `Batch ${nextRound} Month ${parseInt(currentMonthStr, 10)}`);
                    setDistRecipient(activeTeams[0]?.name || '');
                    setDistAmount('');
                    setDistDate(new Date().toISOString().split('T')[0]);
                    setDistTime('12:00');
                    setDistEvidence('');
                    setDistStatus('transferred');
                    setDistNotes('');
                    setIsAddDistOpen(true);
                  }}
                  className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95"
                  title={language === 'lo' ? 'ເພີ່ມລາຍການໂອນໃຫ້ທີມ' : 'Add Team Transfer'}
                >
                  <Plus className="w-3 h-3 text-slate-950" />
                  <span>{language === 'lo' ? '+ ໂອນໃຫ້ທີມ' : '+ Add Transfer'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Team Summary Bar & Batch/Set Switcher Tabs */}
          <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-1.5 space-y-1.5">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 text-[10px]">
                <Package className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {language === 'lo' ? 'ການແບ່ງຊຸດ/ເດືອນ:' : 'Batch / Month Groups:'}
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                  {groupedTeamBatches.length} {language === 'lo' ? 'ຊຸດ' : 'Batches'}
                </span>
              </div>
            </div>

            {/* Batch Filter Pills (ທຸກຊຸດ, ຊຸດ 1 ເດືອນ 8, ຊຸດ 2 ເດືອນ 9...) */}
            {uniqueBatchOptions.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar">
                <button
                  onClick={() => setSelectedTeamBatchFilter('all')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
                    selectedTeamBatchFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                >
                  <span>{language === 'lo' ? 'ທຸກຊຸດ' : 'All Batches'}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-white">
                    {groupedTeamBatches.length}
                  </span>
                </button>

                {uniqueBatchOptions.map((opt) => {
                  const isActive = selectedTeamBatchFilter.toLowerCase() === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setSelectedTeamBatchFilter(isActive ? 'all' : opt.key)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      <Package className="w-2.5 h-2.5 text-amber-500" />
                      <span>{opt.label}</span>
                      <span className={`text-[9px] px-1 py-0.2 rounded-full ${isActive ? 'bg-slate-950 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {opt.count} {language === 'lo' ? 'ຄົນ' : 'recipients'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team Batches Quick Header Toolbar with Collapse/Expand All */}
          {displayedTeamBatches.length > 0 && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-750 text-[10px]">
              <div className="flex items-center gap-1.5">
                <Package className="w-3 h-3 text-amber-500" />
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {language === 'lo' ? 'ລາຍການຊຸດການໂອນ' : 'Transfer Batches'}
                </span>
                <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.2 rounded-full border border-amber-300 dark:border-amber-800">
                  {displayedTeamBatches.length} {language === 'lo' ? 'ຊຸດ' : 'Batches'}
                </span>
              </div>

              <button
                type="button"
                onClick={toggleAllTeamBatchesCollapse}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition shadow-xs cursor-pointer"
                title={displayedTeamBatches.every((b, idx) => isTeamBatchCollapsed(b.batchId, idx)) ? (language === 'lo' ? 'ສະແດງທຸກຊຸດ' : 'Expand All') : (language === 'lo' ? 'ເຊື່ອງທຸກຊຸດ' : 'Collapse All')}
              >
                {displayedTeamBatches.every((b, idx) => isTeamBatchCollapsed(b.batchId, idx)) ? (
                  <>
                    <ChevronsDown className="w-3 h-3 text-amber-500" />
                    <span>{language === 'lo' ? 'ສະແດງທຸກຊຸດ' : 'Expand All'}</span>
                  </>
                ) : (
                  <>
                    <ChevronsUp className="w-3 h-3 text-slate-400" />
                    <span>{language === 'lo' ? 'ເຊື່ອງທຸກຊຸດ' : 'Collapse All'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Scrollable Container with Clean Batch Items - Shrinks to fit content */}
          <div className="p-2.5 sm:p-3 space-y-3 overflow-y-auto max-h-[480px] bg-white dark:bg-slate-800/60">
            {displayedTeamBatches.length === 0 ? (
              <div className="p-3.5 sm:p-5 text-center text-slate-400 space-y-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <Package className="w-8 h-8 mx-auto opacity-40 text-amber-500" />
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                    {language === 'lo' ? 'ຍັງບໍ່ມີຊຸດ ຫຼື ງວດການໂອນເງິນ' : 'No Transfer Batches Recorded'}
                  </h4>
                  <p className="text-[11px] font-medium text-slate-400">
                    {language === 'lo'
                      ? 'ຍັງບໍ່ມີລາຍການໂອນເງິນໃນຊຸດນີ້'
                      : 'No transfer batches recorded for this period'}
                  </p>
                </div>
              </div>
            ) : (
              displayedTeamBatches.map((batch, bIdx) => {
                const isCollapsed = isTeamBatchCollapsed(batch.batchId, bIdx);

                return (
                  /* BATCH SECTION: Clear Prominent Divider Line Between Batches */
                  <div
                    key={batch.batchId}
                    className="border-b-2 border-slate-300 dark:border-slate-650 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0 space-y-2"
                  >
                    {/* If Collapsed: Show Batch Round, Month, Total and Actions */}
                    {isCollapsed ? (
                      <div
                        onClick={() => toggleTeamBatchCollapse(batch.batchId, bIdx)}
                        className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg hover:bg-amber-50/70 dark:hover:bg-slate-750/70 transition cursor-pointer select-none group"
                        title={language === 'lo' ? 'ກົດເພື່ອເປີດເບິ່ງລາຍຊື່' : 'Click to expand'}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="p-0.5 text-slate-400 group-hover:text-amber-500 rounded transition">
                            <ChevronRight className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                          </div>

                          {/* Batch Round Number Badge */}
                          <span className="w-6 h-6 rounded-md bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center justify-center font-mono shadow-xs shrink-0">
                            {batch.meta.round}
                          </span>

                          {/* Month Tag */}
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-200 dark:border-blue-800/80 shrink-0 flex items-center gap-1 shadow-xs">
                            <Calendar className="w-3 h-3 text-blue-500" />
                            <span>
                              {language === 'lo'
                                ? `ເດືອນ ${parseInt(batch.meta.month, 10)} (${batch.meta.monthNameLao})`
                                : `Month ${parseInt(batch.meta.month, 10)} (${batch.meta.monthNameEn})`}
                            </span>
                          </span>

                          <span className="text-[10px] text-slate-400 font-medium">
                            • {batch.items.length} {language === 'lo' ? 'ຄົນ' : 'recipients'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                            {batch.totalAmount.toLocaleString()} {currency}
                          </span>
                          {!isReadOnly && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditBatch(batch);
                                }}
                                className="p-1 text-slate-400 hover:text-amber-600 rounded transition cursor-pointer"
                                title={language === 'lo' ? 'ແກ້ໄຂຊຸດ' : 'Edit Batch'}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBatch(
                                    batch.batchId,
                                    batch.batchName || (language === 'lo' ? `ຊຸດ ${batch.meta.round}` : `Batch #${batch.meta.round}`),
                                    batch.items.length,
                                    batch.items.map((it: any) => it.id)
                                  );
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                title={language === 'lo' ? 'ລຶບຊຸດນີ້ທັງໝົດ' : 'Delete Batch'}
                              >
                                <Trash2 className="w-3 h-3 text-rose-500" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Expanded Batch Header & Details */
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-1.5 px-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Collapse Arrow Button */}
                            <button
                              type="button"
                              onClick={() => toggleTeamBatchCollapse(batch.batchId, bIdx)}
                              className="p-0.5 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-750 transition cursor-pointer flex items-center justify-center shrink-0"
                              title={language === 'lo' ? 'ກົດເພື່ອເຊື່ອງລາຍຊື່' : 'Click to collapse'}
                            >
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            </button>

                            {/* Batch Round Number Badge */}
                            <span className="w-6 h-6 rounded-md bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center justify-center font-mono shadow-xs shrink-0">
                              {batch.meta.round}
                            </span>

                            {/* Month Tag */}
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-200 dark:border-blue-800/80 shrink-0 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-blue-500" />
                              <span>
                                {language === 'lo'
                                  ? `ເດືອນ ${parseInt(batch.meta.month, 10)} (${batch.meta.monthNameLao})`
                                  : `Month ${parseInt(batch.meta.month, 10)} (${batch.meta.monthNameEn})`}
                              </span>
                            </span>

                            {/* Custom Batch Title if present and unique */}
                            {batch.batchName &&
                              !batch.batchName.toLowerCase().startsWith('batch') &&
                              !batch.batchName.startsWith('ງວດ') &&
                              !batch.batchName.startsWith('ຊຸດ') && (
                                <span className="font-bold text-[11px] text-slate-800 dark:text-white">
                                  {batch.batchName}
                                </span>
                              )}

                            {/* Transfer Date */}
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                              {formatFullDateWithMonth(batch.transferDate)}
                            </span>

                            {/* Member count */}
                            <span className="text-[10px] text-slate-400 font-medium">
                              • {batch.items.length} {language === 'lo' ? 'ຄົນ' : 'recipients'}
                            </span>

                            {batch.notes && (
                              <span className="text-[10px] text-slate-400 italic">
                                ({batch.notes})
                              </span>
                            )}
                          </div>
                          {/* Team Batch Action Buttons: Edit Batch, Delete Batch */}
                          {!isReadOnly && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditBatch(batch);
                                }}
                                className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 rounded hover:bg-amber-100/50 dark:hover:bg-amber-950/50 transition cursor-pointer flex items-center gap-0.5 font-bold"
                                title={language === 'lo' ? 'ແກ້ໄຂຊຸດ' : 'Edit Batch'}
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                                <span className="hidden xs:inline">{language === 'lo' ? 'ແກ້ໄຂ' : 'Edit'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBatch(
                                    batch.batchId,
                                    batch.batchName || (language === 'lo' ? `ຊຸດ ${batch.meta.round}` : `Batch #${batch.meta.round}`),
                                    batch.items.length,
                                    batch.items.map((it: any) => it.id)
                                  );
                                }}
                                className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-100/50 dark:hover:bg-rose-950/50 transition cursor-pointer flex items-center gap-0.5 font-bold"
                                title={language === 'lo' ? 'ລຶບຊຸດນີ້ທັງໝົດ' : 'Delete Batch'}
                              >
                                <Trash2 className="w-2.5 h-2.5 text-rose-500" />
                                <span className="hidden xs:inline">{language === 'lo' ? 'ລຶບຊຸດ' : 'Delete'}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Expanded: Batch Spreadsheet Rows WITHOUT dividing lines between names */}
                        <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/80 dark:border-slate-700/60 overflow-hidden">
                    {batch.items.map((d) => {
                      const teamMember = qrMembers.find(
                        (t) => t.name.trim().toLowerCase() === d.recipientName.trim().toLowerCase()
                      ) || teams.find(
                        (t) => t.name.trim().toLowerCase() === d.recipientName.trim().toLowerCase()
                      );
                      return (
                        <div
                          key={d.id}
                          onClick={() => setSelectedDistDetail(d)}
                          className="grid grid-cols-12 items-center px-2.5 sm:px-3 py-2 hover:bg-amber-50/70 dark:hover:bg-slate-750/70 text-xs transition cursor-pointer group"
                        >
                          {/* Recipient Photo, Name & Role */}
                          <div className="col-span-6 flex items-center gap-1.5 truncate pr-1">
                            {teamMember?.imageUrl ? (
                              <img
                                src={teamMember.imageUrl}
                                alt={d.recipientName}
                                className="w-6 h-6 rounded-full object-cover border border-amber-400 dark:border-amber-500 shrink-0 shadow-xs"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-400 dark:border-amber-600 shadow-xs">
                                {d.recipientName.charAt(0)}
                              </div>
                            )}
                            <div className="truncate flex-1 min-w-0">
                              <div className="font-bold text-slate-800 dark:text-white text-[11px] truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition flex items-center gap-1 flex-wrap">
                                <span className="truncate">{d.recipientName}</span>
                                {teamMember?.role && (
                                  <span className="text-[8px] font-semibold px-1 py-0.2 rounded bg-slate-150 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                    {teamMember.role}
                                  </span>
                                )}
                              </div>
                              {d.notes && <p className="text-[9.5px] text-slate-400 truncate">{d.notes}</p>}
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="col-span-4 text-left pl-2 sm:pl-4 font-bold text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 font-mono whitespace-nowrap">
                            {d.amount.toLocaleString()} {currency}
                          </div>

                          {/* Actions: Evidence Slip, Edit, Delete */}
                          <div className="col-span-2 text-center flex items-center justify-end gap-1 pr-1 sm:pr-2">
                            {d.evidenceUrl && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewSlipUrl(d.evidenceUrl || null);
                                }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-bold border border-emerald-300 dark:border-emerald-700 shadow-xs hover:bg-emerald-100 transition cursor-pointer"
                                title={language === 'lo' ? 'ເບິ່ງສະລິບ' : 'Slip'}
                              >
                                <ImageIcon className="w-2.5 h-2.5 text-emerald-500" />
                                <span className="hidden xs:inline">{language === 'lo' ? 'ສະລິບ' : 'Slip'}</span>
                              </button>
                            )}
                            {!isReadOnly && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingDist(d);
                                    setDistBatchId(d.batchId || '');
                                    setDistBatchName(d.batchName || (language === 'lo' ? 'ງວດທີ 1' : 'Batch #1'));
                                    setDistRecipient(d.recipientName);
                                    setDistAmount(String(d.amount));
                                    setDistDate(d.transferDate || new Date().toISOString().split('T')[0]);
                                    setDistTime(d.transferTime || '12:00');
                                    setDistEvidence(d.evidenceUrl || '');
                                    setDistStatus(d.status);
                                    setDistNotes(d.notes || '');
                                    setIsAddDistOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-600 rounded hover:bg-amber-100/50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                                  title={language === 'lo' ? 'ແກ້ໄຂ' : 'Edit'}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDist(d.id, d.recipientName, d.notes || d.batchName, d.amount, false);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-100/50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                  title={language === 'lo' ? 'ລຶບ' : 'Delete'}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Batch Bottom Total Row */}
                    <div className="px-3 py-2 bg-amber-500/10 dark:bg-amber-950/30 border-t border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <span>{language === 'lo' ? 'ລວມຍອດໂອນຊຸດນີ້:' : 'Batch Total:'}</span>
                        <span className="text-[9.5px] font-normal text-slate-500 dark:text-slate-400">
                          ({batch.items.length} {language === 'lo' ? 'ຄົນ' : 'recipients'})
                        </span>
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {batch.totalAmount.toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            );
          })
        )}
      </div>

          {/* Table Footer Summary */}
          <div className="mt-auto bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-3 py-2 flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
            <span>
              {language === 'lo'
                ? isFilterActive
                  ? 'ລວມຍອດໂອນທີມ (ຕາມຟິວເຕີ):'
                  : 'ລວມຍອດໂອນໃຫ້ລູກທີມທັງໝົດ:'
                : 'Total Team Distributed:'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[9.5px] font-normal">
                ({language === 'lo' ? 'Total ທຸກຊຸດ:' : 'All Batches:'}{' '}
                <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                  {totalTeamTransferred.toLocaleString()} {currency}
                </span>)
              </span>
              <span className="text-amber-600 dark:text-amber-400 text-xs font-bold font-mono">
                {filteredTeamOutflowSum.toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Add / Edit Supporter Donation Inflow */}
      {isAddDonationOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
          onClick={() => setIsAddDonationOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-none p-5 sm:p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-scale-in max-h-[90vh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                <span>
                  {editingDonation
                    ? language === 'lo'
                      ? 'ແກ້ໄຂເງິນສະໜັບສະໜູນ'
                      : 'Edit Supporter Inflow'
                    : language === 'lo'
                    ? 'ບັນທຶກເງິນສະໜັບສະໜູນເຂົ້າມາ'
                    : 'Add Supporter Inflow'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDonationOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDonation} className="space-y-3.5 text-xs overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ວັນທີ (Date)' : 'Date'}
                </label>
                <input
                  type="date"
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ລາຍລະອຽດ / ຊື່ຜູ້ສະໜັບສະໜູນ (Description)' : 'Description / Supporter Name'}
                </label>
                <input
                  type="text"
                  value={donationDesc}
                  onChange={(e) => setDonationDesc(e.target.value)}
                  placeholder="e.g. ຄອບຄົວອາຈານໂຢຮັນ ສະໜັບສະໜູນວຽກງານພັນທະກິດ"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? `ຈຳນວນເງິນ (${currency}) (Amount)` : `Amount (${currency})`}
                </label>
                <input
                  type="number"
                  step="any"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-base font-black text-emerald-600 dark:text-emerald-400"
                  required
                />
              </div>

              {/* BATCH / ROUND SELECTION */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {language === 'lo' ? 'ຊຸດທີ / ງວດທີ (Round)' : 'Round / Batch #'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={donationBatchRound}
                      onChange={(e) => {
                        const r = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setDonationBatchRound(r);
                        if (!donationBatchName || donationBatchName.startsWith('ຊຸດ') || donationBatchName.startsWith('Batch')) {
                          const mNum = parseInt(donationBatchMonth, 10) || (donationDate ? parseInt(donationDate.split('-')[1], 10) : 9);
                          setDonationBatchName(language === 'lo' ? `ຊຸດ ${r} ເດືອນ ${mNum}` : `Batch ${r} Month ${mNum}`);
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 text-slate-800 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {language === 'lo' ? 'ຊື່ຊຸດ (Batch Name)' : 'Batch Name'}
                    </label>
                    <input
                      type="text"
                      value={donationBatchName}
                      onChange={(e) => setDonationBatchName(e.target.value)}
                      placeholder={language === 'lo' ? `ຊຸດ ${donationBatchRound}` : `Batch ${donationBatchRound}`}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 text-slate-800 dark:text-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* DYNAMIC PERCENTAGE DEDUCTION SELECTOR FOR THIS DONATION */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-amber-300 dark:border-amber-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {language === 'lo'
                        ? 'ເລືອກອັດຕາສ່ວນຫັກເງິນສຳຮອງສຸກເສີນ'
                        : 'Reserve Deduction % for this donation'}
                    </span>
                  </label>
                  <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-800 shadow-2xs">
                    {donationPercent}%
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[10, 15, 20, 25, 30, 40].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setDonationPercent(pct);
                        setIsCustomPercent(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                        donationPercent === pct && !isCustomPercent
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pct}% {pct === emergencyPercent ? '(Default)' : ''}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomPercent(!isCustomPercent)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                      isCustomPercent
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {language === 'lo' ? 'ປ້ອນ % ເອງ' : 'Custom %'}
                  </button>
                </div>

                {isCustomPercent && (
                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={donationPercent}
                      onChange={(e) => setDonationPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-24 bg-white dark:bg-slate-950 border border-amber-400 dark:border-amber-600 rounded-lg px-2.5 py-1 text-xs font-black text-amber-500 outline-none"
                    />
                    <span className="text-[11px] text-slate-400 font-medium">%</span>
                  </div>
                )}

                {/* Real-time Calculation Breakdown Preview */}
                {donationAmount && parseFloat(donationAmount) > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                      <span className="text-rose-600 dark:text-rose-400 font-bold block">
                        🛡️ {language === 'lo' ? `ສຳຮອງສຸກເສີນ (${donationPercent}%)` : `Reserve (${donationPercent}%)`}:
                      </span>
                      <span className="font-mono font-black text-rose-700 dark:text-rose-300 text-xs">
                        {Math.round(parseFloat(donationAmount) * (donationPercent / 100)).toLocaleString()} {currency}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                        👥 {language === 'lo' ? `ແບ່ງລູກທີມ (${100 - donationPercent}%)` : `Team (${100 - donationPercent}%)`}:
                      </span>
                      <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-xs">
                        {(parseFloat(donationAmount) - Math.round(parseFloat(donationAmount) * (donationPercent / 100))).toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>
                )}

                {/* Optional: Checkbox to apply to all in this batch */}
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyPercentToBatch}
                    onChange={(e) => setApplyPercentToBatch(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {language === 'lo'
                      ? `ນຳໃຊ້ ${donationPercent}% ນີ້ໃຫ້ທຸກລາຍການໃນຊຸດທີ ${donationBatchRound}`
                      : `Apply this ${donationPercent}% to all donations in Round ${donationBatchRound}`}
                  </span>
                </label>

                {/* Optional: Checkbox to set as global default */}
                <label className="flex items-center gap-2 pt-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateGlobalPercent}
                    onChange={(e) => setUpdateGlobalPercent(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {language === 'lo' ? 'ຕັ້ງເປັນຄ່າເລີ່ມຕົ້ນຂອງລະບົບນຳ (Set as default system %)' : 'Set as default system %'}
                  </span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ຫຼັກຖານການໂອນ / ສະລິບ (Evidence Slip Image)' : 'Transfer Evidence / Slip'}
                </label>
                <UnifiedMediaUploader
                  value={donationEvidence}
                  onChange={setDonationEvidence}
                  language={language}
                  label=""
                  placeholder={language === 'lo' ? 'ວ່າງລິ້ງຮູບສະລິບ ຫຼື ເລືອກຮູບຈາກເຄື່ອງ...' : 'Paste slip image URL or choose file...'}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddDonationOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  {language === 'lo' ? 'ບັນທຶກ' : 'Save Donation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create New Batch / Installment (ສ້າງງວດໃໝ່ / ແບ່ງ 80%) */}
      {isAutoBatchModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
          onClick={() => setIsAutoBatchModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-none p-5 sm:p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-scale-in max-h-[90vh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>
                  {language === 'lo'
                    ? '⚡ ສ້າງຊຸດ & ແບ່ງປັນກອງທຶນທີມ (Batch / Month Split)'
                    : 'Create Batch & Auto-Split Team Funds'}
                </span>
              </h3>
              <button onClick={() => setIsAutoBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs overflow-y-auto pr-1 flex-1">
              {/* Round (ຊຸດ) and Month (ເດືອນ) Selectors */}
              <div className="bg-amber-50/80 dark:bg-amber-950/30 p-3 rounded-none border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                <div className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>{language === 'lo' ? 'ກຳນົດຊຸດ ແລະ ເດືອນ (Set & Month Selection)' : 'Set Batch Round & Month'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'lo' ? 'ຊຸດທີ / ງວດ (Batch #)' : 'Batch Round #'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={autoBatchRound}
                        onChange={(e) => {
                          const r = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setAutoBatchRound(r);
                          const mInt = parseInt(autoBatchMonth, 10);
                          setAutoBatchName(
                            language === 'lo' ? `ຊຸດ ${r} ເດືອນ ${mInt}` : `Batch ${r} Month ${mInt}`
                          );
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-black text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'lo' ? 'ປະຈຳເດືອນ (Month)' : 'Month'}
                    </label>
                    <select
                      value={autoBatchMonth}
                      onChange={(e) => {
                        const m = e.target.value;
                        setAutoBatchMonth(m);
                        const mInt = parseInt(m, 10);
                        setAutoBatchName(
                          language === 'lo' ? `ຊຸດ ${autoBatchRound} ເດືອນ ${mInt}` : `Batch ${autoBatchRound} Month ${mInt}`
                        );
                        // Also sync date month
                        const [y] = autoBatchDate.split('-');
                        setAutoBatchDate(`${y || '2026'}-${m}-01`);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-white font-bold"
                    >
                      {MONTHS_LIST.map((m) => (
                        <option key={m.num} value={m.num}>
                          {language === 'lo' ? `ເດືອນ ${m.lao}` : `Month ${m.en}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                    {language === 'lo' ? 'ຊື່ຊຸດເຕັມ (Batch Title Preview)' : 'Batch Full Title'}
                  </label>
                  <input
                    type="text"
                    value={autoBatchName}
                    onChange={(e) => setAutoBatchName(e.target.value)}
                    placeholder="e.g. ຊຸດ 1 ເດືອນ 8, ຊຸດ 2 ເດືອນ 9..."
                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-black"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'lo' ? 'ວັນທີໂອນ (Transfer Date)' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={autoBatchDate}
                    onChange={(e) => setAutoBatchDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'lo' ? 'ເວລາ (Time)' : 'Time'}
                  </label>
                  <input
                    type="time"
                    value={autoBatchTime}
                    onChange={(e) => setAutoBatchTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>{language === 'lo' ? `ກອງທຶນ ${activeKpiBatch ? activeBatchTeamPercent : teamPercent}% ທີ່ຈະແບ່ງປັນ (${currency})` : `Pool Amount (${currency})`}</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                    {language === 'lo' ? `ຍອດ ${activeKpiBatch ? activeBatchTeamPercent : teamPercent}% ຄົງເຫຼືອ:` : `Available:`} {(activeKpiBatch ? kpiBatchTeamRemaining : remaining80Actual).toLocaleString()} {currency}
                  </span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={autoBatchCustomPool}
                  onChange={(e) => setAutoBatchCustomPool(e.target.value)}
                  placeholder={`ຄ່າເລີ່ມຕົ້ນ: ${(activeKpiBatch ? kpiBatchTeamRemaining : remaining80Actual).toLocaleString()}`}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-base font-black text-amber-600 dark:text-amber-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {language === 'lo'
                    ? `ລະບົບຈະຫານສະເລ່ຍໃຫ້ລູກທີມ ${activeTeams.length} ທ່ານ ເທົ່າໆກັນ (ຄົນລະ ${(
                        Math.floor((Number(autoBatchCustomPool) || (activeKpiBatch ? kpiBatchTeamRemaining : remaining80Actual)) / (activeTeams.length || 1))
                      ).toLocaleString()} ${currency})`
                    : `Will be equally distributed to all ${activeTeams.length} active team members`}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ໝາຍເຫດຊຸດ (Batch Notes)' : 'Batch Notes'}
                </label>
                <input
                  type="text"
                  value={autoBatchNotes}
                  onChange={(e) => setAutoBatchNotes(e.target.value)}
                  placeholder={language === 'lo' ? 'ເບ້ຍລ້ຽງປະຈຳຊຸດ, ເງິນສະໜັບສະໜູນ...' : 'Regular batch allowance...'}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAutoBatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const customAmount = autoBatchCustomPool ? parseFloat(autoBatchCustomPool) : undefined;
                    handleAutoDistributeToBatch(customAmount, autoBatchName, autoBatchDate, autoBatchTime);
                  }}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{language === 'lo' ? `⚡ ສ້າງຊຸດ & ແບ່ງ ${teamPercent}%` : 'Create Batch'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Configure Batch-Specific Deduction Percentage */}
      {isBatchPercentModalOpen && batchPercentTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
          onClick={() => {
            setIsBatchPercentModalOpen(false);
            setBatchPercentTarget(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-none p-5 sm:p-6 max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-scale-in my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-none bg-amber-500/15 flex items-center justify-center text-amber-500">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    {language === 'lo' ? 'ກຳນົດ % ຫັກເງິນສະເພາະຊຸດ' : 'Configure Batch Deduction %'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    {batchPercentTarget.batchName || (language === 'lo' ? batchPercentTarget.labelLao : batchPercentTarget.labelEn)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBatchPercentModalOpen(false);
                  setBatchPercentTarget(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Batch summary card */}
            <div className="bg-slate-50 dark:bg-slate-900/70 p-3.5 rounded-none border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  {language === 'lo' ? 'ຍອດຮັບເງິນໃນຊຸດນີ້:' : 'Total Inflow in Batch:'}
                </span>
                <span className="font-black text-slate-900 dark:text-white font-mono">
                  {batchPercentTarget.totalInflow.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  {language === 'lo' ? 'ຈຳນວນລາຍການບໍລິຈາກ:' : 'Total Donations:'}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {batchPercentTarget.donations?.length || 0} {language === 'lo' ? 'ລາຍການ' : 'transactions'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  {language === 'lo' ? 'ອັດຕາສ່ວນປັດຈຸບັນ:' : 'Current Setting:'}
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {batchPercentTarget.deductionPercent}% {language === 'lo' ? 'ສຳຮອງ' : 'reserve'} / {100 - batchPercentTarget.deductionPercent}% {language === 'lo' ? 'ທີມ' : 'team'}
                </span>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                {language === 'lo' ? 'ເລືອກອັດຕາສ່ວນດ່ວນ:' : 'Quick Presets:'}
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {[10, 15, 20, 25, 30, 40, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setBatchPercentInput(String(pct))}
                    className={`py-2 px-1 rounded-xl text-xs font-black transition border text-center cursor-pointer ${
                      Number(batchPercentInput) === pct
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                {language === 'lo' ? 'ອັດຕາສ່ວນສຳຮອງສຸກເສິນ (%)' : 'Emergency Reserve %'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={batchPercentInput}
                  onChange={(e) => setBatchPercentInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-lg font-black text-amber-500 outline-none focus:border-amber-500"
                  placeholder="20"
                />
                <span className="absolute right-3.5 top-3 text-sm text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Live Calculation Preview */}
            {(() => {
              const p = Math.min(100, Math.max(0, Number(batchPercentInput) || 0));
              const tp = Math.max(0, 100 - p);
              const emReserve = Math.round(batchPercentTarget.totalInflow * (p / 100));
              const tPool = batchPercentTarget.totalInflow - emReserve;
              return (
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      {p}% {language === 'lo' ? 'ສຳຮອງສຸກເສິນ' : 'Emergency Reserve'}
                    </span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono block">
                      {emReserve.toLocaleString()} {currency}
                    </span>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">
                      {tp}% {language === 'lo' ? 'ກອງທຶນແບ່ງທີມ' : 'Team Pool'}
                    </span>
                    <span className="text-sm font-black text-red-700 dark:text-red-300 font-mono block">
                      {tPool.toLocaleString()} {currency}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setIsBatchPercentModalOpen(false);
                  setBatchPercentTarget(null);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer text-xs"
              >
                {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSaveBatchPercentage()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                {isLoading ? (
                  <span>...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{language === 'lo' ? 'ບັນທຶກໃຫ້ຊຸດນີ້' : 'Save for this Batch'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Single Distribution to Team Member */}
      {isAddDistOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
          onClick={() => setIsAddDistOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-scale-in max-h-[90vh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span>
                  {editingDist
                    ? language === 'lo'
                      ? 'ແກ້ໄຂການໂອນເງິນ'
                      : 'Edit Transfer Record'
                    : language === 'lo'
                    ? 'ບັນທຶກການໂອນເງິນໃຫ້ລູກທີມ'
                    : 'Record Transfer to Team Member'}
                </span>
              </h3>
              <button onClick={() => setIsAddDistOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDistribution} className="space-y-3.5 text-xs overflow-y-auto pr-1 flex-1">
              {/* Set (ຊຸດ) and Month (ເດືອນ) Grouping Controls */}
              <div className="bg-amber-50/80 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                <div className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>{language === 'lo' ? 'ກຳນົດຊຸດ ແລະ ເດືອນ (Set & Month Selection)' : 'Set Batch Round & Month'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'lo' ? 'ຊຸດທີ / ງວດ (Batch #)' : 'Batch Round #'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={distRound}
                      onChange={(e) => {
                        const r = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setDistRound(r);
                        const mInt = parseInt(distMonth, 10);
                        setDistBatchName(
                          language === 'lo' ? `ຊຸດ ${r} ເດືອນ ${mInt}` : `Batch ${r} Month ${mInt}`
                        );
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-black text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'lo' ? 'ປະຈຳເດືອນ (Month)' : 'Month'}
                    </label>
                    <select
                      value={distMonth}
                      onChange={(e) => {
                        const m = e.target.value;
                        setDistMonth(m);
                        const mInt = parseInt(m, 10);
                        setDistBatchName(
                          language === 'lo' ? `ຊຸດ ${distRound} ເດືອນ ${mInt}` : `Batch ${distRound} Month ${mInt}`
                        );
                        // Also sync date month
                        const [y] = distDate.split('-');
                        setDistDate(`${y || '2026'}-${m}-01`);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-white font-bold"
                    >
                      {MONTHS_LIST.map((m) => (
                        <option key={m.num} value={m.num}>
                          {language === 'lo' ? `ເດືອນ ${m.lao}` : `Month ${m.en}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                    {language === 'lo' ? 'ຊື່ຊຸດເຕັມ (Batch Title Preview)' : 'Batch Full Title'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={distBatchName}
                      onChange={(e) => setDistBatchName(e.target.value)}
                      placeholder="e.g. ຊຸດ 1 ເດືອນ 8, ຊຸດ 2 ເດືອນ 9..."
                      className="flex-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-black"
                      required
                    />
                    {groupedTeamBatches.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const found = groupedTeamBatches.find((b) => b.batchName === e.target.value || b.batchId === e.target.value);
                            if (found) {
                              setDistBatchName(found.batchName);
                              setDistBatchId(found.batchId);
                              setDistDate(found.transferDate);
                              setDistRound(found.meta.round);
                              setDistMonth(found.meta.month);
                              setDistYear(found.meta.year);
                              if (found.transferTime) setDistTime(found.transferTime);
                            }
                          }
                        }}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-slate-700 dark:text-slate-300 text-xs font-bold"
                      >
                        <option value="">{language === 'lo' ? 'ເລືອກຊຸດທີ່ມີ' : 'Pick Existing'}</option>
                        {groupedTeamBatches.map((b) => (
                          <option key={b.batchId} value={b.batchId}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ລູກທີມຜູ້ຮັບ (Recipient)' : 'Team Recipient'}
                </label>
                <select
                  value={distRecipient}
                  onChange={(e) => setDistRecipient(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-bold"
                  required
                >
                  <option value="">-- {language === 'lo' ? 'ເລືອກລູກທີມ' : 'Select Team Member'} --</option>
                  {activeTeams.map((t, idx) => (
                    <option key={t.rowId || idx} value={t.name}>
                      👤 {t.name} {getLocalizedRole(t, language) ? `(${getLocalizedRole(t, language)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Personal Bank & QR Code Quick Scan Preview */}
              {(() => {
                const selectedMember = qrMembers.find(
                  (t) => t.name.trim().toLowerCase() === distRecipient.trim().toLowerCase()
                ) || teams.find(
                  (t) => t.name.trim().toLowerCase() === distRecipient.trim().toLowerCase()
                );
                if (!selectedMember) return null;
                return (
                  <div className="bg-purple-50/80 dark:bg-purple-950/40 p-3 rounded-2xl border border-purple-200 dark:border-purple-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        <span>{language === 'lo' ? 'ຄິວອາ & ບັນຊີຮັບເງິນປະຈຳຕົວ' : 'Personal Transfer QR & Account'}</span>
                      </span>
                      {selectedMember.financeQrUrl && (
                        <button
                          type="button"
                          onClick={() => setViewingMemberQr(selectedMember)}
                          className="text-[10px] font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Eye className="w-2.5 h-2.5" />
                          <span>{language === 'lo' ? 'ເບິ່ງ QR ຂະໜາດເຕັມ' : 'View Full QR'}</span>
                        </button>
                      )}
                    </div>

                    {selectedMember.financeQrUrl ? (
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => setViewingMemberQr(selectedMember)}
                          className="w-14 h-14 bg-white p-1 rounded-xl border border-purple-300 dark:border-purple-700 shadow-sm shrink-0 cursor-pointer group relative overflow-hidden"
                          title={language === 'lo' ? 'ຄລິກເພື່ອເບິ່ງຂະໜາດເຕັມ' : 'Click to zoom QR'}
                        >
                          <img
                            src={selectedMember.financeQrUrl}
                            alt="Member QR"
                            className="w-full h-full object-contain group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition text-[9px] font-bold">
                            🔍
                          </div>
                        </div>
                        <div className="text-[11px] space-y-0.5 min-w-0 flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{selectedMember.bankName || 'BCEL One'}</span>
                            {selectedMember.bankAccountName && (
                              <span className="text-slate-500 text-[10px] font-normal truncate">({selectedMember.bankAccountName})</span>
                            )}
                          </div>
                          {selectedMember.bankAccountNumber ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-purple-700 dark:text-purple-300 text-xs">
                                {selectedMember.bankAccountNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyQrAccount(selectedMember.bankAccountNumber || '')}
                                className="p-1 text-slate-400 hover:text-purple-600 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 cursor-pointer"
                                title="Copy Account Number"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">
                              {language === 'lo' ? 'ຍັງບໍ່ມີເລກບັນຊີ' : 'No account number set'}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => setViewingMemberQr(selectedMember)}
                              className="text-[10px] font-black text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-2.5 h-2.5" />
                              <span>{language === 'lo' ? 'ເບິ່ງຄິວອາຂະໜາດເຕັມ' : 'View Full QR'}</span>
                            </button>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMemberQr({
                                  id: selectedMember.id,
                                  name: selectedMember.name,
                                  imageUrl: selectedMember.imageUrl,
                                  financeQrUrl: selectedMember.financeQrUrl || '',
                                  bankName: selectedMember.bankName || 'BCEL One',
                                  bankAccountNumber: selectedMember.bankAccountNumber || '',
                                  bankAccountName: selectedMember.bankAccountName || selectedMember.name || '',
                                });
                                setIsTeamQrManagerOpen(true);
                              }}
                              className="text-[10px] font-bold text-slate-500 hover:text-purple-600 dark:hover:text-purple-300 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                              <span>{language === 'lo' ? 'ແກ້ໄຂ QR' : 'Edit QR'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-dashed border-purple-300 dark:border-purple-800 text-center space-y-1.5">
                        <div className="text-[11px] text-slate-500">
                          {language === 'lo' ? 'ຍັງບໍ່ທັນມີຮູບ QR ຮັບເງິນ' : 'No transfer QR code uploaded yet'}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMemberQr({
                              id: selectedMember.id,
                              name: selectedMember.name,
                              imageUrl: selectedMember.imageUrl,
                              financeQrUrl: '',
                              bankName: selectedMember.bankName || 'BCEL One',
                              bankAccountNumber: selectedMember.bankAccountNumber || '',
                              bankAccountName: selectedMember.bankAccountName || selectedMember.name || '',
                            });
                            setIsTeamQrManagerOpen(true);
                          }}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold shadow inline-flex items-center gap-1 cursor-pointer transition"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>{language === 'lo' ? '+ ຕັ້ງຄ່າ / ເພີ່ມຮູບ QR ໃຫ້ລູກທີມຄົນນີ້' : '+ Set / Add QR for Member'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'lo' ? `ຈຳນວນ (${currency})` : `Amount (${currency})`}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={distAmount}
                    onChange={(e) => setDistAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-base font-black text-amber-600 dark:text-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'lo' ? 'ສະຖານະ (Status)' : 'Status'}
                  </label>
                  <select
                    value={distStatus}
                    onChange={(e) => setDistStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-bold"
                  >
                    <option value="transferred">✅ {language === 'lo' ? 'ໂອນສຳເລັດແລ້ວ' : 'Transferred'}</option>
                    <option value="pending">⏳ {language === 'lo' ? 'ລໍຖ້າການໂອນ' : 'Pending'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'lo' ? 'ວັນທີໂອນ (Date)' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={distDate}
                    onChange={(e) => setDistDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'lo' ? 'ເວລາໂອນ (Time)' : 'Time'}
                  </label>
                  <input
                    type="time"
                    value={distTime}
                    onChange={(e) => setDistTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ຫຼັກຖານການໂອນ / ສະລິບ (Transfer Evidence Slip)' : 'Evidence Slip'}
                </label>
                <UnifiedMediaUploader
                  value={distEvidence}
                  onChange={setDistEvidence}
                  language={language}
                  label=""
                  placeholder={language === 'lo' ? 'ວ່າງລິ້ງຮູບສະລິບ ຫຼື ເລືອກຮູບຈາກເຄື່ອງ...' : 'Paste slip image URL or choose file...'}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ໝາຍເຫດ (Notes)' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={distNotes}
                  onChange={(e) => setDistNotes(e.target.value)}
                  placeholder={language === 'lo' ? 'ເບ້ຍລ້ຽງປະຈຳເດືອນ, ຄ່າເດີນທາງ...' : 'Monthly allowance, fuel, travel...'}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddDistOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow cursor-pointer"
                >
                  {language === 'lo' ? 'ບັນທຶກການໂອນ' : 'Save Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Emergency Outflow Transfer */}
      {isAddEmergencyOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
          onClick={() => setIsAddEmergencyOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-scale-in max-h-[90vh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span>
                  {editingEmergency
                    ? language === 'lo'
                      ? 'ແກ້ໄຂການໂອນສຸກເສິນ'
                      : 'Edit Emergency Transfer'
                    : language === 'lo'
                    ? 'ບັນທຶກການໂອນເງິນສຸກເສິນ (20% Reserve)'
                    : 'Record Emergency Transfer'}
                </span>
              </h3>
              <button onClick={() => setIsAddEmergencyOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmergency} className="space-y-3.5 text-xs overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ຊື່ງວດສຸກເສິນ (Batch Name)' : 'Emergency Batch Name'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={emBatchName}
                    onChange={(e) => setEmBatchName(e.target.value)}
                    placeholder="e.g. ສຸກເສິນ ງວດ 1, ຊ່ອຍເຫຼືອໄພພິບັດ..."
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-bold"
                    required
                  />
                  {groupedEmergencyBatches.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          const found = groupedEmergencyBatches.find((b) => b.batchName === e.target.value);
                          setEmBatchName(e.target.value);
                          if (found) {
                            setEmBatchId(found.batchId);
                            setEmDate(found.transferDate);
                            if (found.transferTime) setEmTime(found.transferTime);
                          }
                        }
                      }}
                      className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-slate-600 dark:text-slate-300 text-xs font-bold"
                    >
                      <option value="">{language === 'lo' ? 'ເລືອກງວດທີ່ມີ' : 'Pick Existing'}</option>
                      {groupedEmergencyBatches.map((b) => (
                        <option key={b.batchId} value={b.batchName}>
                          {b.batchName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ຈຸດປະສົງ / ຜູ້ຮັບສຸກເສິນ (Recipient / Purpose)' : 'Recipient / Purpose'}
                </label>
                <input
                  type="text"
                  value={emRecipient}
                  onChange={(e) => setEmRecipient(e.target.value)}
                  placeholder="e.g. ຄ່າປິ່ນປົວສຸກເສິນ, ຊ່ອຍເຫຼືອໄພພິບັດ, ສ້ອມແປງດ່ວນ..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>{language === 'lo' ? `ຈຳນວນ (${currency})` : `Amount (${currency})`}</span>
                    <span className="text-[10px] text-rose-500 font-bold">
                      {language === 'lo' ? 'ເຫຼືອ:' : 'Left:'} {remainingEmergencySavings.toLocaleString()}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={emAmount}
                    onChange={(e) => setEmAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-base font-black text-rose-600 dark:text-rose-400"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'lo' ? 'ສະຖານະ (Status)' : 'Status'}
                  </label>
                  <select
                    value={emStatus}
                    onChange={(e) => setEmStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-bold"
                  >
                    <option value="transferred">✅ {language === 'lo' ? 'ໂອນສຳເລັດແລ້ວ' : 'Transferred'}</option>
                    <option value="pending">⏳ {language === 'lo' ? 'ລໍຖ້າການໂອນ' : 'Pending'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'lo' ? 'ວັນທີໂອນ (Date)' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={emDate}
                    onChange={(e) => setEmDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'lo' ? 'ເວລາໂອນ (Time)' : 'Time'}
                  </label>
                  <input
                    type="time"
                    value={emTime}
                    onChange={(e) => setEmTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ຫຼັກຖານການໂອນ / ສະລິບ (Transfer Slip)' : 'Evidence Slip'}
                </label>
                <UnifiedMediaUploader
                  value={emEvidence}
                  onChange={setEmEvidence}
                  language={language}
                  label=""
                  placeholder={language === 'lo' ? 'ວ່າງລິ້ງຮູບສະລິບ ຫຼື ເລືອກຮູບຈາກເຄື່ອງ...' : 'Paste slip image URL or choose file...'}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ໝາຍເຫດ (Notes)' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={emNotes}
                  onChange={(e) => setEmNotes(e.target.value)}
                  placeholder={language === 'lo' ? 'ລາຍລະອຽດການໃຊ້ຈ່າຍສຸກເສິນ...' : 'Emergency expense details...'}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddEmergencyOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  {language === 'lo' ? 'ບັນທຶກການໂອນສຸກເສິນ' : 'Save Emergency Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit / Manage Entire Batch (ຫ້ອງການຕັ້ງຄ່າ ແລະ ຈັດການຊຸດ) */}
      {isEditBatchModalOpen && editingBatchTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
          onClick={() => setIsEditBatchModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-scale-in max-h-[92vh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {language === 'lo' ? 'ຫ້ອງການຕັ້ງຄ່າ ແລະ ຈັດການຊຸດ' : 'Batch Settings & Management'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {editingBatchTarget.batchName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* Current Batch Info Banner */}
              <div className="bg-gradient-to-br from-amber-500/10 via-slate-50 to-blue-500/10 dark:from-amber-950/30 dark:via-slate-800 dark:to-blue-950/30 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-700/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-black tracking-wider block">
                    {language === 'lo' ? 'ຊຸດທີ່ກຳລັງຕັ້ງຄ່າ' : 'Active Batch Target'}
                  </span>
                  <span className="font-black text-slate-800 dark:text-white text-base">
                    {editingBatchTarget.batchName}
                  </span>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {formatFullDateWithMonth(editingBatchTarget.transferDate)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {editingBatchTarget.items?.length || 0} {language === 'lo' ? 'ລາຍການໂອນ' : 'recipients'}
                  </span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                    {(editingBatchTarget.totalAmount || 0).toLocaleString()} {currency}
                  </span>
                </div>
              </div>

              {/* SECTION 1: Recipients in this batch — CUT (ຕັດ) OR ADJUST AMOUNT (ປັບຍອດ) */}
              <div className="bg-slate-50 dark:bg-slate-900/70 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>
                      {language === 'lo'
                        ? `ລາຍການຜູ້ຮັບໃນຊຸດນີ້ (${editingBatchTarget.items?.length || 0} ຄົນ) — ຕັດ ຫຼື ປັບຍອດ:`
                        : `Recipients in this Batch (${editingBatchTarget.items?.length || 0}) — Cut or Edit:`}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 italic">
                    {language === 'lo' ? 'ກົດ 🗑️ ເພື່ອຕັດອອກ' : 'Click 🗑️ to remove'}
                  </span>
                </div>

                {(!editingBatchTarget.items || editingBatchTarget.items.length === 0) ? (
                  <p className="text-slate-400 text-center py-3 italic text-xs">
                    {language === 'lo' ? 'ບໍ່ມີລາຍການໃນຊຸດນີ້' : 'No members in this batch'}
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200/80 dark:divide-slate-800 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 overflow-hidden max-h-48 overflow-y-auto">
                    {editingBatchTarget.items.map((it: TeamDistribution) => {
                      const isEditingThisAmt = editingItemAmountId === it.id;
                      return (
                        <div
                          key={it.id}
                          className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-700 dark:text-slate-200 shrink-0">
                              {it.recipientName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 dark:text-white block truncate text-xs">
                                {it.recipientName}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {it.transferDate} {it.transferTime ? `• ${it.transferTime}` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Amount & Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isEditingThisAmt ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={editingItemAmountVal}
                                  onChange={(e) => setEditingItemAmountVal(e.target.value)}
                                  className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-amber-400 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveItemAmountInModal(it.id)}
                                  className="px-2 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold"
                                >
                                  {language === 'lo' ? 'ບັນທຶກ' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemAmountId(null)}
                                  className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-[10px]"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemAmountId(it.id);
                                  setEditingItemAmountVal(String(it.amount));
                                }}
                                className="font-mono font-black text-xs text-slate-800 dark:text-white px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 transition flex items-center gap-1 cursor-pointer"
                                title={language === 'lo' ? 'ກົດເພື່ອປັບຍອດເງິນ' : 'Click to adjust amount'}
                              >
                                <span>{(Number(it.amount) || 0).toLocaleString()} {currency}</span>
                                <Edit2 className="w-2.5 h-2.5 text-slate-400 hover:text-amber-500" />
                              </button>
                            )}

                            {/* Cut / Remove Button (ຕັດອອກ) */}
                            <button
                              type="button"
                              onClick={() => handleCutItemFromBatchInModal(it.id, it.recipientName)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition"
                              title={language === 'lo' ? `ຕັດ ${it.recipientName} ອອກຈາກຊຸດນີ້` : `Remove ${it.recipientName} from batch`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: ADD RECIPIENT TO THIS BATCH (ເພີ່ມຍອດໂອນ / ເພີ່ມຄົນເຂົ້າຊຸດນີ້) */}
              <div className="bg-blue-50/70 dark:bg-blue-950/30 p-3.5 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 space-y-2.5">
                <div className="font-bold text-blue-900 dark:text-blue-200 text-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{language === 'lo' ? 'ເພີ່ມຍອດໂອນ / ເພີ່ມຄົນເຂົ້າຊຸດນີ້:' : 'Add Recipient / Transfer to this Batch:'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {language === 'lo' ? 'ເລືອກສະມາຊິກຜູ້ຮັບ' : 'Select Recipient'}
                    </label>
                    <select
                      value={modalNewRecipient}
                      onChange={(e) => setModalNewRecipient(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white font-bold"
                    >
                      <option value="">-- {language === 'lo' ? 'ເລືອກຜູ້ຮັບ' : 'Select Member'} --</option>
                      {activeTeams.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} ({t.role || 'Member'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {language === 'lo' ? `ຈຳນວນເງິນ (${currency})` : `Amount (${currency})`}
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 450000"
                      value={modalNewAmount}
                      onChange={(e) => setModalNewAmount(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={language === 'lo' ? 'ໝາຍເຫດ (ທາງເລືອກ)...' : 'Notes (optional)...'}
                    value={modalNewNotes}
                    onChange={(e) => setModalNewNotes(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddItemToBatchInModal}
                    disabled={isAddingInModal || !modalNewRecipient || !modalNewAmount}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center gap-1 shrink-0"
                  >
                    {isAddingInModal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{language === 'lo' ? 'ເພີ່ມເຂົ້າຊຸດ' : 'Add to Set'}</span>
                  </button>
                </div>
              </div>

              {/* SECTION 3: EDIT ROUND, MONTH, TITLE, DATE */}
              <form onSubmit={handleSaveBatchEdit} className="space-y-3 pt-1">
                <div className="bg-amber-50/80 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                  <div className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>{language === 'lo' ? 'ຕັ້ງຄ່າຊຸດ, ເດືອນ ແລະ ຊື່ຊຸດ' : 'Batch Round & Month Settings'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'lo' ? 'ຊຸດທີ / ງວດ (Round #)' : 'Batch Round #'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editBatchRoundInput}
                        onChange={(e) => {
                          const r = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setEditBatchRoundInput(r);
                          const mInt = parseInt(editBatchMonthInput, 10);
                          setEditBatchNameInput(
                            language === 'lo' ? `ຊຸດ ${r} ເດືອນ ${mInt}` : `Batch ${r} Month ${mInt}`
                          );
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-black text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'lo' ? 'ປະຈຳເດືອນ (Month)' : 'Month'}
                      </label>
                      <select
                        value={editBatchMonthInput}
                        onChange={(e) => {
                          const m = e.target.value;
                          setEditBatchMonthInput(m);
                          const mInt = parseInt(m, 10);
                          setEditBatchNameInput(
                            language === 'lo' ? `ຊຸດ ${editBatchRoundInput} ເດືອນ ${mInt}` : `Batch ${editBatchRoundInput} Month ${mInt}`
                          );
                          // Sync date month
                          const [y] = editBatchDateInput.split('-');
                          setEditBatchDateInput(`${y || '2026'}-${m}-01`);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-white font-bold"
                      >
                        {MONTHS_LIST.map((m) => (
                          <option key={m.num} value={m.num}>
                            {language === 'lo' ? `ເດືອນ ${m.lao}` : `Month ${m.en}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                      {language === 'lo' ? 'ຊື່ຊຸດ (Batch Title)' : 'Batch Full Title'}
                    </label>
                    <input
                      type="text"
                      value={editBatchNameInput}
                      onChange={(e) => setEditBatchNameInput(e.target.value)}
                      placeholder="e.g. ຊຸດ 1 ເດືອນ 8..."
                      className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-black"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'lo' ? 'ວັນທີໂອນຂອງຊຸດນີ້ (Transfer Date)' : 'Transfer Date'}
                  </label>
                  <input
                    type="date"
                    value={editBatchDateInput}
                    onChange={(e) => setEditBatchDateInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium"
                    required
                  />
                </div>

                {/* Merge into another existing batch option */}
                {groupedTeamBatches.filter((b) => b.batchId !== editingBatchTarget.batchId).length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-1.5">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      {language === 'lo' ? '🔄 ຫຼື ຮວມຊຸດນີ້ເຂົ້າກັບຊຸດອື່ນ:' : '🔄 Or merge into another batch:'}
                    </label>
                    <select
                      value={mergeTargetBatchName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMergeTargetBatchName(val);
                        if (val) {
                          const target = groupedTeamBatches.find((b) => b.batchName === val || b.batchId === val);
                          if (target) {
                            setEditBatchNameInput(target.batchName);
                            setEditBatchRoundInput(target.meta.round);
                            setEditBatchMonthInput(target.meta.month);
                            setEditBatchDateInput(target.transferDate);
                          }
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 text-xs font-bold"
                    >
                      <option value="">-- {language === 'lo' ? 'ເລືອກຊຸດທີ່ຕ້ອງການຮວມເຂົ້າກັນ' : 'Select target batch to merge into'} --</option>
                      {groupedTeamBatches
                        .filter((b) => b.batchId !== editingBatchTarget.batchId)
                        .map((b) => (
                          <option key={b.batchId} value={b.batchName}>
                            {b.label} ({b.items.length} {language === 'lo' ? 'ຄົນ' : 'recipients'})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteBatch(
                        editingBatchTarget.batchId,
                        editingBatchTarget.batchName,
                        editingBatchTarget.items?.length || 0,
                        (editingBatchTarget.items || []).map((it: any) => it.id)
                      );
                      setIsEditBatchModalOpen(false);
                    }}
                    className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl font-bold transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'lo' ? 'ລຶບຊຸດນີ້ທັງໝົດ' : 'Delete Batch'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditBatchModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                    >
                      {language === 'lo' ? 'ປິດ' : 'Close'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingBatchEdit}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                    >
                      {isSavingBatchEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{language === 'lo' ? 'ບັນທຶກການປ່ຽນແປງ' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX: Preview Slip Modal */}
      {previewSlipUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewSlipUrl(null)}
        >
          <div className="relative max-w-lg w-full bg-slate-900 rounded-3xl p-4 border border-slate-700 shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>{language === 'lo' ? 'ຫຼັກຖານການໂອນເງິນ (Transfer Slip)' : 'Transfer Evidence'}</span>
              </span>
              <button onClick={() => setPreviewSlipUrl(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center">
              <img src={previewSlipUrl} alt="Transfer Slip" className="max-h-[65vh] object-contain mx-auto" />
            </div>
            <div className="flex justify-end">
              <a
                href={previewSlipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{language === 'lo' ? 'ເປີດຮູບເຕັມ' : 'Open Full Image'}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: Team Transfer Details & Evidence Slip (Opens when tapping on any team distribution row) */}
      {selectedDistDetail && (() => {
        const teamMember = teams.find(
          (t) => t.name.trim().toLowerCase() === selectedDistDetail.recipientName.trim().toLowerCase()
        );
        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setSelectedDistDetail(null)}
          >
            <div
              className="relative max-w-xl w-full bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 my-auto animate-scale-in text-slate-800 dark:text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3.5">
                <div className="flex items-center gap-3">
                  {selectedDistDetail.category === 'emergency' ? (
                    <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center font-black text-sm border-2 border-rose-400 dark:border-rose-600 shadow">
                      <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                  ) : teamMember?.imageUrl ? (
                    <img
                      src={teamMember.imageUrl}
                      alt={selectedDistDetail.recipientName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 dark:border-amber-500 shadow"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-sm border-2 border-amber-400 dark:border-amber-600 shadow">
                      {selectedDistDetail.recipientName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        selectedDistDetail.category === 'emergency'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      }`}>
                        {selectedDistDetail.category === 'emergency' ? '🚨 ' : ''}
                        {selectedDistDetail.batchName || (language === 'lo' ? 'ງວດທີ 1' : 'Batch #1')}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedDistDetail.status === 'transferred'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                        }`}
                      >
                        {selectedDistDetail.status === 'transferred' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>{language === 'lo' ? 'ໂອນສຳເລັດແລ້ວ' : 'Transferred'}</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>{language === 'lo' ? 'ລໍຖ້າການໂອນ' : 'Pending'}</span>
                          </>
                        )}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedDistDetail.recipientName}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDistDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Amount Highlight Card */}
              <div className={`border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-2 ${
                selectedDistDetail.category === 'emergency'
                  ? 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border-rose-400/40'
                  : 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-400/40'
              }`}>
                <div>
                  <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                    selectedDistDetail.category === 'emergency'
                      ? 'text-rose-700 dark:text-rose-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {language === 'lo' ? 'ຈຳນວນເງິນທີ່ໂອນ (Transfer Amount)' : 'Transferred Amount'}
                  </span>
                  <div className={`text-2xl sm:text-3xl font-black tracking-tight mt-0.5 ${
                    selectedDistDetail.category === 'emergency'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {selectedDistDetail.amount.toLocaleString()}{' '}
                    <span className="text-xl font-serif">{currency}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {language === 'lo' ? 'ໝວດໝູ່' : 'Category'}
                  </span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    {selectedDistDetail.category === 'emergency'
                      ? (language === 'lo' ? '🚨 ເງິນສຳຮອງສຸກເສິນ (20%)' : 'Emergency Reserve (20%)')
                      : (language === 'lo' ? '👥 ເງິນສະໜັບສະໜູນທີມ (80%)' : 'Team Pool (80%)')}
                  </span>
                </div>
              </div>

              {/* Transfer Evidence / Slip Image Presentation */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>{language === 'lo' ? 'ສະລິບຫຼັກຖານການໂອນ (Transfer Slip)' : 'Transfer Slip Evidence'}</span>
                  </span>
                  {selectedDistDetail.evidenceUrl && (
                    <a
                      href={selectedDistDetail.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{language === 'lo' ? 'ເບິ່ງຮູບໃຫຍ່' : 'Full Size'}</span>
                    </a>
                  )}
                </label>

                {selectedDistDetail.evidenceUrl ? (
                  <div className="relative group rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-200 dark:border-slate-700 shadow-inner flex flex-col items-center justify-center p-2 max-h-[380px]">
                    <img
                      src={selectedDistDetail.evidenceUrl}
                      alt="Transfer Slip Evidence"
                      className="max-h-[340px] w-auto object-contain rounded-xl transition group-hover:scale-[1.01]"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <a
                        href={selectedDistDetail.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-slate-900/90 hover:bg-black text-white text-xs font-bold rounded-xl backdrop-blur-md shadow-lg border border-white/20 transition flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{language === 'lo' ? 'ເປີດຮູບເຕັມ' : 'Open Full'}</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2 bg-slate-50 dark:bg-slate-800/50">
                    <ImageIcon className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                    <p className="text-xs text-slate-500 font-medium">
                      {language === 'lo' ? 'ຍັງບໍ່ມີຮູບສະລິບການໂອນສຳລັບລາຍການນີ້' : 'No transfer slip attached to this record'}
                    </p>
                    {!isReadOnly && (
                      <button
                        onClick={() => {
                          const distToEdit = selectedDistDetail;
                          setSelectedDistDetail(null);
                          if (distToEdit.category === 'emergency') {
                            setEditingEmergency(distToEdit);
                            setEmBatchId(distToEdit.batchId || '');
                            setEmBatchName(distToEdit.batchName || (language === 'lo' ? 'ສຸກເສິນ ງວດ 1' : 'Emergency #1'));
                            setEmRecipient(distToEdit.recipientName);
                            setEmAmount(String(distToEdit.amount));
                            setEmDate(distToEdit.transferDate || new Date().toISOString().split('T')[0]);
                            setEmTime(distToEdit.transferTime || '12:00');
                            setEmEvidence(distToEdit.evidenceUrl || '');
                            setEmStatus(distToEdit.status);
                            setEmNotes(distToEdit.notes || '');
                            setIsAddEmergencyOpen(true);
                          } else {
                            setEditingDist(distToEdit);
                            setDistBatchId(distToEdit.batchId || '');
                            setDistBatchName(distToEdit.batchName || (language === 'lo' ? 'ງວດທີ 1' : 'Batch #1'));
                            setDistRecipient(distToEdit.recipientName);
                            setDistAmount(String(distToEdit.amount));
                            setDistDate(distToEdit.transferDate || new Date().toISOString().split('T')[0]);
                            setDistTime(distToEdit.transferTime || '12:00');
                            setDistEvidence(distToEdit.evidenceUrl || '');
                            setDistStatus(distToEdit.status);
                            setDistNotes(distToEdit.notes || '');
                            setIsAddDistOpen(true);
                          }
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{language === 'lo' ? 'ອັບໂຫຼດສະລິບດຽວນີ້' : 'Upload Slip Now'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Information Grid with Date, Time, Role, Phone, Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {language === 'lo' ? 'ວັນທີ ແລະ ເວລາໂອນ' : 'Transfer Date & Time'}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>{selectedDistDetail.transferDate}</span>
                    {selectedDistDetail.transferTime && (
                      <span className="text-amber-600 dark:text-amber-400 font-mono">
                        ⏰ {selectedDistDetail.transferTime}
                      </span>
                    )}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {language === 'lo' ? 'ຕຳແໜ່ງ / ໜ້າທີ່' : 'Team Member Role'}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{teamMember?.role || (language === 'lo' ? 'ລູກທີມພັນທະກິດ' : 'Ministry Member')}</span>
                  </span>
                </div>

                {teamMember?.phone && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      {language === 'lo' ? 'ເບີໂທຕິດຕໍ່' : 'Contact Phone'}
                    </span>
                    <a
                      href={`tel:${teamMember.phone.replace(/\s+/g, '')}`}
                      className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center gap-1.5 select-all"
                      title={language === 'lo' ? 'ກົດເພື່ອໂທອອກ' : 'Click to call'}
                    >
                      <Phone className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{teamMember.phone}</span>
                    </a>
                  </div>
                )}

                {/* Private Member Transfer QR Card in Detail Modal */}
                {teamMember?.financeQrUrl && (
                  <div className="space-y-1 sm:col-span-2 bg-purple-50/80 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={teamMember.financeQrUrl}
                        alt="Member QR"
                        className="w-10 h-10 object-contain rounded-lg bg-white p-0.5 border border-purple-300 dark:border-purple-700"
                      />
                      <div>
                        <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 block">
                          {teamMember.bankName || 'BCEL One'}
                          {teamMember.bankAccountNumber ? `: ${teamMember.bankAccountNumber}` : ''}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {language === 'lo' ? 'ຄິວອາຮັບເງິນສ່ວນຕົວ (Finance Only)' : 'Private Member Transfer QR'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingMemberQr(teamMember)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold shadow flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{language === 'lo' ? 'ເບິ່ງ QR' : 'View QR'}</span>
                    </button>
                  </div>
                )}

                {selectedDistDetail.notes && (
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      {language === 'lo' ? 'ໝາຍເຫດ / ບັນທຶກ' : 'Notes / Remarks'}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{selectedDistDetail.notes}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end pt-2 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedDistDetail(null)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  {language === 'lo' ? 'ປິດ' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* INSTANT FULL QR CODE VIEWER / SCANNER MODAL (NAME + QR IMAGE ONLY)         */}
      {/* ========================================================================= */}
      {viewingMemberQr && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewingMemberQr(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border-2 border-purple-500/40 shadow-2xl space-y-4 animate-scale-in text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Name and Close button only */}
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-left min-w-0">
                {viewingMemberQr.imageUrl ? (
                  <img
                    src={viewingMemberQr.imageUrl}
                    alt={viewingMemberQr.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-400 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-black text-sm flex items-center justify-center border-2 border-purple-400 shrink-0">
                    {viewingMemberQr.name ? viewingMemberQr.name.charAt(0) : '👤'}
                  </div>
                )}
                <h4 className="font-black text-base text-slate-900 dark:text-white truncate">
                  {viewingMemberQr.name}
                </h4>
              </div>

              <button
                onClick={() => setViewingMemberQr(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Image Presentation */}
            {viewingMemberQr.financeQrUrl ? (
              <div className="p-3 bg-white rounded-2xl border-2 border-purple-400 dark:border-purple-600 shadow-xl inline-block mx-auto max-w-[280px]">
                <img
                  src={viewingMemberQr.financeQrUrl}
                  alt={`${viewingMemberQr.name} Transfer QR`}
                  className="w-64 h-64 object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="p-8 bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 space-y-2">
                <QrCode className="w-10 h-10 mx-auto opacity-50" />
                <p className="text-xs font-bold">
                  {language === 'lo' ? 'ຍັງບໍ່ມີຮູບຄິວອາ' : 'No QR Code Available'}
                </p>
              </div>
            )}

            {/* Bank Account Number & Details with 1-Click Copy */}
            {viewingMemberQr.bankAccountNumber ? (
              <div className="bg-purple-50/80 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900/60 p-3 rounded-2xl space-y-1.5 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    <span>{viewingMemberQr.bankName || 'BCEL One'}</span>
                  </span>
                  {viewingMemberQr.bankAccountName && (
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                      {viewingMemberQr.bankAccountName}
                    </span>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">
                      {language === 'lo' ? 'ເລກບັນຊີ' : 'Account Number'}
                    </span>
                    <span className="text-sm sm:text-base font-black font-mono tracking-wider text-slate-900 dark:text-white select-all truncate block">
                      {viewingMemberQr.bankAccountNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyQrAccount(viewingMemberQr.bankAccountNumber!, 'modal_viewer')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95"
                  >
                    {copiedMemberId === 'modal_viewer' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>{language === 'lo' ? 'ກັອບປີ້ແລ້ວ!' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{language === 'lo' ? 'ກັອບປີ້ເລກບັນຊີ' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : !isReadOnly ? (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingMemberQr;
                    setViewingMemberQr(null);
                    setEditingMemberQr({
                      id: target.id,
                      name: target.name,
                      imageUrl: target.imageUrl,
                      financeQrUrl: target.financeQrUrl,
                      bankName: target.bankName || 'BCEL One',
                      bankAccountNumber: target.bankAccountNumber || '',
                      bankAccountName: target.bankAccountName || target.name || '',
                    });
                    setIsTeamQrManagerOpen(true);
                  }}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold"
                >
                  {language === 'lo' ? '+ ເພີ່ມເລກບັນຊີສຳລັບຄິວອານີ້' : '+ Add account number for this QR'}
                </button>
              </div>
            ) : null}

            {/* Simple Close Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setViewingMemberQr(null)}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow transition cursor-pointer"
              >
                {language === 'lo' ? 'ປິດ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FINANCE ROOM TEAM QR MANAGER & LABEL SETTINGS MODAL                       */}
      {/* Strictly within the Finance Room only                                     */}
      {/* ========================================================================= */}
      {isTeamQrManagerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
          onClick={() => {
            setIsTeamQrManagerOpen(false);
            setEditingMemberQr(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-5 sm:p-6 border-2 border-purple-500/50 shadow-2xl space-y-4 animate-scale-in max-h-[90vh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-300 dark:border-purple-800">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {language === 'lo' ? '💳 ຈັດການບັນຊີຄິວອາ (QR Accounts)' : 'Manage QR Accounts'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'lo'
                      ? 'ຈັດການລາຍຊື່, ຮູບ ແລະ ຮູບ QR ໂອນເງິນສຳລັບລູກທີມ'
                      : 'Manage team member names, photos, and transfer QR codes'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsTeamQrManagerOpen(false);
                  setEditingMemberQr(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Banner Alert */}
            {qrSaveMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-2xl border border-emerald-300 dark:border-emerald-700 text-xs font-bold flex items-center gap-2 animate-scale-in shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{qrSaveMsg}</span>
              </div>
            )}

            <div className="overflow-y-auto pr-1 flex-1 space-y-4">
              {/* Form when editing or adding a member's QR (Strictly Name, Profile Photo, QR image) */}
              {editingMemberQr ? (
                <form onSubmit={handleSaveMemberQr} className="p-4 bg-purple-50/50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/80 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-200 dark:border-purple-800/60">
                    <h4 className="font-extrabold text-sm text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Edit2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>
                        {editingMemberQr.name
                          ? (language === 'lo' ? `ແກ້ໄຂ: ${editingMemberQr.name}` : `Edit: ${editingMemberQr.name}`)
                          : (language === 'lo' ? 'ເພີ່ມບັນຊີຄິວອາໃໝ່' : 'Add New QR Account')}
                      </span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingMemberQr(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold cursor-pointer"
                    >
                      {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Auto-pull from About Us team members */}
                    {teams && teams.length > 0 && (
                      <div className="p-3 bg-purple-100/80 dark:bg-purple-900/40 rounded-2xl border border-purple-300 dark:border-purple-700/80 space-y-1.5">
                        <label className="block font-black text-xs text-purple-950 dark:text-purple-200">
                          {language === 'lo'
                            ? '✨ ດຶງຂໍ້ມູນຈາກລາຍຊື່ທີມງານ (ຫ້ອງກ່ຽວກັບພວກເຮົາ):'
                            : '✨ Pull from Team Members ("About Us"): '}
                        </label>
                        <select
                          onChange={(e) => {
                            const selectedVal = e.target.value;
                            if (!selectedVal) return;
                            const target = teams.find(
                              (t) => (t.id && t.id === selectedVal) || String(t.rowId) === selectedVal
                            );
                            if (target) {
                              setEditingMemberQr({
                                id: `fq_${target.id || target.rowId || Date.now()}`,
                                name: target.name || '',
                                imageUrl: target.imageUrl || '',
                                financeQrUrl: target.financeQrUrl || '',
                                bankName: target.bankName || 'BCEL One',
                                bankAccountNumber: target.bankAccountNumber || '',
                                bankAccountName: target.bankAccountName || target.name || '',
                              });
                            }
                          }}
                          className="w-full bg-white dark:bg-slate-900 border border-purple-400 dark:border-purple-600 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold text-xs"
                          defaultValue=""
                        >
                          <option value="">
                            {language === 'lo'
                              ? '-- ເລືອກລາຍຊື່ທີມງານເພື່ອດຶງຊື່ ແລະ ຮູບອັດຕະໂນມັດ --'
                              : '-- Select a team member to auto-fill --'}
                          </option>
                          {teams.map((t, idx) => (
                            <option key={t.id || t.rowId || idx} value={t.id || String(t.rowId)}>
                              {t.name} {t.role ? `(${t.role})` : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                          {language === 'lo'
                            ? '💡 ເລືອກລາຍຊື່ເພື່ອດຶງຊື່, ຮູບ ແລະ ເລກບັນຊີມາໃສ່ໃຫ້ອັດຕະໂນມັດ (ການເພີ່ມ ຫຼື ລຶບໃນຫ້ອງນີ້ ຈະບໍ່ກະທົບຖານຂໍ້ມູນຫຼັກ)'
                            : '💡 Select to auto-fill name, photo & account. Adding or deleting here will not affect About Us.'}
                        </p>
                      </div>
                    )}

                    {/* Name field */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'lo' ? 'ຊື່ຜູ້ຮັບເງິນ / ຊື່ລູກທີມ (Name) *' : 'Name *'}
                      </label>
                      <input
                        type="text"
                        value={editingMemberQr.name}
                        onChange={(e) => setEditingMemberQr({ ...editingMemberQr, name: e.target.value })}
                        placeholder={language === 'lo' ? 'ປ້ອນຊື່ຜູ້ຮັບເງິນ / ຊື່ລູກທີມ...' : 'Enter recipient / team member name...'}
                        className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
                        required
                      />
                    </div>

                    {/* Bank Account Details Grid */}
                    <div className="bg-purple-100/60 dark:bg-purple-950/40 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>{language === 'lo' ? 'ຂໍ້ມູນບັນຊີທະນາຄານ (Bank Account Details)' : 'Bank Account Details'}</span>
                        </span>
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                          {language === 'lo' ? 'ສະແດງພ້ອມປຸ່ມກັອບປີ້' : 'With 1-click copy'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Bank Name */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                            <Building className="w-3 h-3 text-purple-600" />
                            <span>{language === 'lo' ? 'ທະນາຄານ (Bank Name):' : 'Bank Name:'}</span>
                          </label>
                          <input
                            type="text"
                            value={editingMemberQr.bankName || ''}
                            onChange={(e) => setEditingMemberQr({ ...editingMemberQr, bankName: e.target.value })}
                            placeholder="e.g. BCEL One, LDB, JDB"
                            className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          {/* Quick Bank Presets */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {['BCEL One', 'LDB', 'JDB', 'APB', 'Kasikorn', 'PromptPay'].map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => setEditingMemberQr({ ...editingMemberQr, bankName: b })}
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold transition cursor-pointer ${
                                  editingMemberQr.bankName === b
                                    ? 'bg-purple-600 text-white shadow-2xs'
                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                                }`}
                              >
                                {b}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Account Number */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-purple-600" />
                            <span>{language === 'lo' ? 'ເລກບັນຊີ (Account Number):' : 'Account Number:'}</span>
                          </label>
                          <input
                            type="text"
                            value={editingMemberQr.bankAccountNumber || ''}
                            onChange={(e) => setEditingMemberQr({ ...editingMemberQr, bankAccountNumber: e.target.value })}
                            placeholder="e.g. 010-12-00-12345678-001"
                            className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-purple-900 dark:text-purple-300 outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            {language === 'lo' ? 'ເລກບັນຊີສຳລັບໂອນເງິນ' : 'Account number for transfers'}
                          </p>
                        </div>

                        {/* Account Name */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {language === 'lo' ? 'ຊື່ເຈົ້າຂອງບັນຊີ (Account Holder Name):' : 'Account Holder Name:'}
                          </label>
                          <input
                            type="text"
                            value={editingMemberQr.bankAccountName || ''}
                            onChange={(e) => setEditingMemberQr({ ...editingMemberQr, bankAccountName: e.target.value })}
                            placeholder={editingMemberQr.name || 'e.g. SOMCHAY VONGSA'}
                            className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      {/* Auto-generate QR Button */}
                      {editingMemberQr.bankAccountNumber && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleGenerateMemberQr}
                            className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {language === 'lo'
                                ? '⚡ ສ້າງ QR Code ຈາກເລກບັນຊີນີ້ອັດຕະໂນມັດ'
                                : '⚡ Auto-Generate QR Code from this Account Number'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Profile Photo */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'lo' ? 'ຮູບໂປຣໄຟລ໌ / ຮູບຄົນ (Profile Photo)' : 'Profile Photo'}
                      </label>
                      <UnifiedMediaUploader
                        value={editingMemberQr.imageUrl || ''}
                        onChange={(url) => setEditingMemberQr({ ...editingMemberQr, imageUrl: url })}
                        language={language}
                        fileType="image"
                        label=""
                        placeholder={language === 'lo' ? 'ອັບໂຫຼດຮູບໂປຣໄຟລ໌ ຫຼື ວາງລິ້ງ...' : 'Upload profile picture or paste URL...'}
                      />
                      {editingMemberQr.imageUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <img
                            src={editingMemberQr.imageUrl}
                            alt="Profile Preview"
                            className="w-12 h-12 rounded-full object-cover border-2 border-purple-400"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingMemberQr({ ...editingMemberQr, imageUrl: '' })}
                            className="text-[11px] text-red-500 hover:underline font-bold cursor-pointer"
                          >
                            {language === 'lo' ? 'ລຶບຮູບ' : 'Remove Photo'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* QR Image Upload */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'lo' ? 'ຮູບ QR Code (QR Code Image)' : 'QR Code Image'}
                      </label>
                      <UnifiedMediaUploader
                        value={editingMemberQr.financeQrUrl}
                        onChange={(url) => setEditingMemberQr({ ...editingMemberQr, financeQrUrl: url })}
                        language={language}
                        fileType="image"
                        label=""
                        placeholder={language === 'lo' ? 'ອັບໂຫຼດຮູບ QR ຈາກເຄື່ອງ ຫຼື ວາງລິ້ງຮູບ...' : 'Upload QR image or paste URL...'}
                      />

                      {editingMemberQr.financeQrUrl && (
                        <div className="mt-2 p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-purple-300 dark:border-purple-700 inline-flex items-center gap-3">
                          <img
                            src={editingMemberQr.financeQrUrl}
                            alt="QR Preview"
                            className="w-20 h-20 object-contain rounded-xl border border-purple-200 dark:border-purple-800 bg-white"
                          />
                          <div className="text-[11px]">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{language === 'lo' ? 'ມີຮູບ QR ພ້ອມໃຊ້ງານ' : 'QR code attached'}</span>
                            </span>
                            {editingMemberQr.bankAccountNumber && (
                              <span className="font-mono text-purple-700 dark:text-purple-300 font-bold block mt-0.5">
                                {editingMemberQr.bankAccountNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-purple-200 dark:border-purple-800">
                    <button
                      type="button"
                      onClick={() => setEditingMemberQr(null)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                    >
                      {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingMemberQr}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSavingMemberQr ? (language === 'lo' ? 'ກຳລັງບັນທຶກ...' : 'Saving...') : (language === 'lo' ? 'ບັນທຶກ' : 'Save')}</span>
                    </button>
                  </div>
                </form>
              ) : null}

              {/* List of all QR entries */}
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {language === 'lo' ? `ລາຍຊື່ຄິວອາ (${qrMembers.length} ລາຍການ)` : `QR Accounts (${qrMembers.length})`}
                    </span>
                    {!editingMemberQr && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingMemberQr({
                            id: `fq_${Date.now()}`,
                            name: '',
                            imageUrl: '',
                            financeQrUrl: '',
                            bankName: 'BCEL One',
                            bankAccountNumber: '',
                            bankAccountName: '',
                          })
                        }
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{language === 'lo' ? '+ ເພີ່ມຄິວອາໃໝ່' : '+ Add New QR'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  {qrMembers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <QrCode className="w-10 h-10 mx-auto opacity-30 mb-2" />
                      <p className="text-xs font-bold">
                        {language === 'lo' ? 'ຍັງບໍ່ມີຂໍ້ມູນບັນຊີຄິວອາ' : 'No QR accounts registered yet'}
                      </p>
                    </div>
                  ) : (
                    qrMembers.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="p-3.5 bg-white dark:bg-slate-900/90 flex items-center justify-between gap-3 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition"
                      >
                        {/* Left: Profile Photo & Person's Name and Bank Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          {m.imageUrl ? (
                            <img
                              src={m.imageUrl}
                              alt={m.name}
                              className="w-11 h-11 rounded-full object-cover border-2 border-purple-300 dark:border-purple-700 shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-black text-sm flex items-center justify-center border-2 border-purple-300 shrink-0 shadow-sm">
                              {m.name ? m.name.charAt(0) : '👤'}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h5 className="font-black text-sm text-slate-900 dark:text-white truncate">
                              {m.name}
                            </h5>
                            {m.bankAccountNumber ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                  {m.bankName || 'BCEL One'}
                                </span>
                                <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 truncate">
                                  {m.bankAccountNumber}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                {language === 'lo' ? 'ຍັງບໍ່ມີເລກບັນຊີ' : 'No account number'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: QR Thumbnail & Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* QR Image preview thumbnail */}
                          {m.financeQrUrl ? (
                            <button
                              type="button"
                              onClick={() => setViewingMemberQr(m)}
                              className="p-1 bg-white dark:bg-slate-800 rounded-xl border border-purple-300 dark:border-purple-700 hover:border-purple-500 transition shadow-xs group cursor-pointer"
                              title={language === 'lo' ? 'ກົດເພື່ອເບິ່ງ QR ຂະໜາດໃຫຍ່' : 'Click to view full QR'}
                            >
                              <img
                                src={m.financeQrUrl}
                                alt="QR"
                                className="w-10 h-10 object-contain rounded-lg group-hover:scale-105 transition"
                              />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                              <QrCode className="w-4 h-4 opacity-40" />
                            </div>
                          )}

                          {/* Edit & Delete Buttons */}
                          {!isReadOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingMemberQr({
                                    id: m.id,
                                    name: m.name || '',
                                    imageUrl: m.imageUrl || '',
                                    financeQrUrl: m.financeQrUrl || '',
                                    bankName: m.bankName || 'BCEL One',
                                    bankAccountNumber: m.bankAccountNumber || '',
                                    bankAccountName: m.bankAccountName || m.name || '',
                                  })
                                }
                                className="px-3 py-1.5 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 dark:bg-slate-800 dark:hover:bg-purple-900/60 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-300 dark:border-slate-700 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>{language === 'lo' ? 'ແກ້ໄຂ' : 'Edit'}</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => setMemberToDelete(m)}
                                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/50 dark:hover:bg-red-900/50 dark:text-red-400 rounded-xl transition border border-red-200 dark:border-red-900/50 cursor-pointer"
                                title={language === 'lo' ? 'ລຶບ' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex justify-end border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsTeamQrManagerOpen(false);
                  setEditingMemberQr(null);
                }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
              >
                {language === 'lo' ? 'ປິດໜ້າຕ່າງ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION POPUP MODAL                                           */}
      {/* ========================================================================= */}
      {memberToDelete && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => setMemberToDelete(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border-2 border-red-500/50 shadow-2xl space-y-4 text-center animate-scale-in my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center border-2 border-red-300 dark:border-red-800 shadow">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                {language === 'lo' ? 'ຢືນຢັນການລຶບ QR ອອກຈາກຫ້ອງການເງິນ' : 'Confirm Remove QR from Finance'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'lo'
                  ? `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບ QR ໂອນເງິນຂອງ "${memberToDelete.name}" ອອກຈາກຫ້ອງການເງິນ?`
                  : `Are you sure you want to remove the transfer QR code for "${memberToDelete.name}" from the Finance tab?`}
              </p>
              <div className="mt-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                {language === 'lo'
                  ? '🔒 ຂໍ້ມູນບຸກຄະລາກອນໃນຫ້ອງ "ກ່ຽວກັບພວກເຮົາ" ຈະຍັງຄົງຢູ່ຄືເກົ່າ ບໍ່ຖືກລຶບ'
                  : '🔒 Team member profile in "About Us" will remain intact and will NOT be deleted'}
              </div>
            </div>

            <div className="p-3 bg-red-50/60 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900/50 flex items-center gap-3 text-left">
              {memberToDelete.imageUrl ? (
                <img
                  src={memberToDelete.imageUrl}
                  alt={memberToDelete.name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-red-300 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 font-black flex items-center justify-center shrink-0">
                  {memberToDelete.name ? memberToDelete.name.charAt(0) : '👤'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-black text-sm text-slate-900 dark:text-white truncate">
                  {memberToDelete.name}
                </div>
                {memberToDelete.financeQrUrl ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{language === 'lo' ? 'ມີຮູບ QR ຕິດຢູ່' : 'QR code attached'}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    {language === 'lo' ? 'ບໍ່ມີ QR' : 'No QR'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingMember}
                onClick={() => setMemberToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingMember}
                onClick={confirmDeleteMemberQr}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingMember ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{language === 'lo' ? 'ຢືນຢັນລຶບ' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FINANCIAL RECORD GENERAL DELETE CONFIRMATION POPUP MODAL                  */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => {
            if (!isDeletingTarget) setDeleteTarget(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border-2 border-red-500/50 shadow-2xl space-y-4 text-center animate-scale-in my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center border-2 border-red-300 dark:border-red-800 shadow">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                {deleteTarget.type === 'inflow'
                  ? language === 'lo'
                    ? 'ຢືນຢັນການລຶບລາຍການເງິນສະໜັບສະໜູນ'
                    : 'Confirm Delete Inflow Record'
                  : deleteTarget.type === 'emergency_dist'
                  ? language === 'lo'
                    ? 'ຢືນຢັນການລຶບລາຍການໂອນສຸກເສິນ'
                    : 'Confirm Delete Emergency Record'
                  : deleteTarget.type === 'team_dist'
                  ? language === 'lo'
                    ? 'ຢືນຢັນການລຶບການໂອນໃຫ້ທີມ'
                    : 'Confirm Delete Team Transfer'
                  : deleteTarget.type === 'batch'
                  ? language === 'lo'
                    ? 'ຢືນຢັນການລຶບຊຸດການໂອນທັງໝົດ'
                    : 'Confirm Delete Entire Batch'
                  : language === 'lo'
                  ? 'ຢືນຢັນການຕັດລາຍຊື່ອອກຈາກຊຸດ'
                  : 'Confirm Remove from Batch'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'lo'
                  ? 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລາຍການນີ້ອອກຈາກລະບົບ? ການກະທຳນີ້ບໍ່ສາມາດກູ້ຄືນໄດ້.'
                  : 'Are you sure you want to delete this record? This action cannot be undone.'}
              </p>
            </div>

            <div className="p-3 bg-red-50/60 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900/50 space-y-1 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {deleteTarget.title}
                </span>
                {deleteTarget.amount !== undefined && (
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono shrink-0">
                    {deleteTarget.amount.toLocaleString()} {currency}
                  </span>
                )}
              </div>
              {deleteTarget.subtitle && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {deleteTarget.subtitle}
                </div>
              )}
              {deleteTarget.batchCount !== undefined && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'lo'
                    ? `ລວມທັງໝົດ ${deleteTarget.batchCount} ລາຍການໃນຊຸດນີ້`
                    : `Contains ${deleteTarget.batchCount} items in this batch`}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingTarget}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingTarget}
                onClick={confirmDeleteTarget}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingTarget ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{language === 'lo' ? 'ຢືນຢັນລຶບ' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

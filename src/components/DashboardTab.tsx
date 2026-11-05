import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  Heart,
  Droplets,
  GraduationCap,
  Download,
  Search,
  ArrowUpDown,
  Table as TableIcon,
  Eye,
  EyeOff,
  Ear,
  Building2,
  Map,
  MapPin,
  Filter,
  Bell,
  FileSpreadsheet,
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trophy,
  Activity,
  Check,
} from 'lucide-react';
import { Village, VillageUpdateRecord, Language, TimeRange } from '../types';
import { MapsTab } from './MapsTab';
import {
  getLocalizedDistrict,
  getLocalizedProvince,
  getLocalizedStatus,
  getLocalizedVillageName,
  getLocalizedNeeds,
} from '../utils/localization';
import { formatNumber } from '../utils/numberFormat';

interface DashboardTabProps {
  filteredVillages: Village[];
  language: Language;
  selectedProvince?: string;
  selectedDistrict?: string;
  selectedChurch?: string;
  selectedTimeRange?: TimeRange;
  startDate?: string;
  endDate?: string;
}

const COLORS = ['#cc0000', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
  return (
    <span key={value} className="inline-block transition-all duration-300">
      {value.toLocaleString()}
    </span>
  );
};

export const DashboardTab: React.FC<DashboardTabProps> = ({
  filteredVillages,
  language,
  selectedProvince = 'all',
  selectedDistrict = 'all',
  selectedChurch = 'all',
  selectedTimeRange = 'all',
  startDate = '',
  endDate = '',
}) => {
  // Chart display toggles & state
  const [chartViewTarget, setChartViewTarget] = useState<'church' | 'district'>('church');
  const [tableSearch, setTableSearch] = useState('');
  const [sortField, setSortField] = useState<'name' | 'district' | 'heard' | 'believers' | 'baptized' | 'attending' | 'leaders' | 'persecution' | 'date'>('believers');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Interactive Section Visibility Toggles ("ປຸ່ມຊ້ອນ/ສະແດງ ແຕ່ລະສ່ວນ")
  const [showStats, setShowStats] = useState(true);
  const [showCharts, setShowCharts] = useState(true);
  const [showChartFilters, setShowChartFilters] = useState(true);
  const [showUrgent, setShowUrgent] = useState(true);
  const [showMapSection, setShowMapSection] = useState(true);
  const [showFullTable, setShowFullTable] = useState(true);

  // Auto-expand and smoothly scroll to Area & Map section when navigated from "View All Locations" button
  useEffect(() => {
    let scrollTimer: any = null;
    let attempts = 0;
    const maxAttempts = 18;

    const performScrollToMap = () => {
      setShowMapSection(true);
      attempts = 0;
      if (scrollTimer) clearInterval(scrollTimer);

      const checkAndScroll = () => {
        attempts++;
        const el = document.getElementById('dashboard-area-map-section');
        if (el) {
          const navOffset = 70; // Offset to clear sticky top header
          const targetY = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - navOffset);
          window.scrollTo({
            top: targetY,
            behavior: attempts <= 2 ? 'auto' : 'smooth',
          });

          // Once it has aligned accurately after layout settles
          if (attempts >= 6) {
            clearInterval(scrollTimer);
            scrollTimer = null;
            try {
              sessionStorage.removeItem('hb_scroll_target');
            } catch {}
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(scrollTimer);
          scrollTimer = null;
          try {
            sessionStorage.removeItem('hb_scroll_target');
          } catch {}
        }
      };

      checkAndScroll();
      scrollTimer = setInterval(checkAndScroll, 60);
    };

    // Check if target was queued in sessionStorage
    try {
      if (sessionStorage.getItem('hb_scroll_target') === 'dashboard-area-map-section') {
        performScrollToMap();
      }
    } catch {}

    const handleExpandMap = () => {
      performScrollToMap();
    };

    window.addEventListener('hb_expand_dashboard_map', handleExpandMap);
    return () => {
      if (scrollTimer) clearInterval(scrollTimer);
      window.removeEventListener('hb_expand_dashboard_map', handleExpandMap);
    };
  }, []);

  // Table District & Status Quick Sub-Filters
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  const isDateFiltered =
    selectedTimeRange === 'custom'
      ? Boolean(startDate || endDate)
      : (selectedTimeRange !== undefined && selectedTimeRange !== 'all');

  // Helper function to normalize date strings across ISO, DMY, and YMD formats
  const normalizeDateStr = useCallback((dateVal: string | undefined): string => {
    if (!dateVal) return '';
    const isoMatch = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const dmyMatch = dateVal.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return dateVal.split('T')[0];
  }, []);

  // Map of incremental period metrics per village when date-filtered
  const villagePeriodMap = useMemo(() => {
    const map: Record<string, { believers: number; baptized: number; heard: number }> = {};
    if (!isDateFiltered) return map;

    const now = new Date();
    filteredVillages.forEach((v) => {
      const vKey = v.id || `${v.rowId}`;
      let pBelievers = 0;
      let pBaptized = 0;
      let pHeard = 0;

      const historyLogs: VillageUpdateRecord[] = Array.isArray(v.history) ? v.history : [];

      if (historyLogs.length > 0) {
        historyLogs.forEach((log) => {
          const isBase = log.notes === 'Initial Baseline Record' || (log.id && log.id.startsWith('init_'));
          if (isBase) {
            // Count baseline numbers ONLY if the church was planted within the selected date range
            const plantDate = normalizeDateStr(v.initialDate || log.date || v.date);
            if (!plantDate) return;
            let inRange = true;
            if (selectedTimeRange === 'custom') {
              if (startDate && plantDate < startDate) inRange = false;
              if (endDate && plantDate > endDate) inRange = false;
            } else {
              const d = new Date(plantDate);
              if (!isNaN(d.getTime())) {
                const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
                if (selectedTimeRange === 'week') inRange = diffDays >= 0 && diffDays <= 7;
                else if (selectedTimeRange === 'month') inRange = diffDays >= 0 && diffDays <= 30;
                else if (selectedTimeRange === 'year') inRange = diffDays >= 0 && diffDays <= 365;
              } else {
                inRange = false;
              }
            }
            if (inRange) {
              pBelievers += Number(log.addedBelievers) || 0;
              pBaptized += Number(log.addedBaptized) || 0;
              pHeard += Number(log.addedHeard) || 0;
            }
            return;
          }

          // Incremental update log
          const logDate = normalizeDateStr(log.date);
          if (!logDate) return;

          let inRange = true;
          if (selectedTimeRange === 'custom') {
            if (startDate && logDate < startDate) inRange = false;
            if (endDate && logDate > endDate) inRange = false;
          } else {
            const d = new Date(logDate);
            if (!isNaN(d.getTime())) {
              const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
              if (selectedTimeRange === 'week') inRange = diffDays >= 0 && diffDays <= 7;
              else if (selectedTimeRange === 'month') inRange = diffDays >= 0 && diffDays <= 30;
              else if (selectedTimeRange === 'year') inRange = diffDays >= 0 && diffDays <= 365;
            } else {
              inRange = false;
            }
          }

          if (inRange) {
            pBelievers += Number(log.addedBelievers) || 0;
            pBaptized += Number(log.addedBaptized) || 0;
            pHeard += Number(log.addedHeard) || 0;
          }
        });
      } else {
        // Village has no history logs: check if the establishment date is in range
        const plantDate = normalizeDateStr(v.initialDate || v.date);
        let inRange = false;
        if (plantDate) {
          if (selectedTimeRange === 'custom') {
            inRange = true;
            if (startDate && plantDate < startDate) inRange = false;
            if (endDate && plantDate > endDate) inRange = false;
          } else {
            const d = new Date(plantDate);
            if (!isNaN(d.getTime())) {
              const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
              if (selectedTimeRange === 'week') inRange = diffDays >= 0 && diffDays <= 7;
              else if (selectedTimeRange === 'month') inRange = diffDays >= 0 && diffDays <= 30;
              else if (selectedTimeRange === 'year') inRange = diffDays >= 0 && diffDays <= 365;
            }
          }
        }
        if (inRange) {
          pBelievers = Number(v.believers) || 0;
          pBaptized = Number(v.baptized) || 0;
          pHeard = Number(v.heard) || 0;
        }
      }

      map[vKey] = { believers: pBelievers, baptized: pBaptized, heard: pHeard };
    });

    return map;
  }, [filteredVillages, isDateFiltered, selectedTimeRange, startDate, endDate, normalizeDateStr]);

  // Aggregated Stats based on filtered data (Accurate calculations handling both All Time and Custom Date Windows)
  const stats = useMemo(() => {
    let periodBelievers = 0;
    let periodBaptized = 0;
    let periodHeard = 0;
    let totalAllBelievers = 0;
    let totalAllBaptized = 0;
    let totalAllHeard = 0;
    let totalAttending = 0;
    let totalLeaders = 0;

    filteredVillages.forEach((v) => {
      const vAllBelievers = Number(v.believers) || 0;
      const vAllBaptized = Number(v.baptized) || 0;
      const vAllHeard = Number(v.heard) || 0;
      const vAttending = Number(v.attending) || 0;
      const rawLeaders = Number(v.leaders) || 0;
      const vLeaders = rawLeaders < 0 ? 1 : rawLeaders;

      totalAllBelievers += vAllBelievers;
      totalAllBaptized += vAllBaptized;
      totalAllHeard += vAllHeard;
      totalAttending += vAttending;
      totalLeaders += vLeaders;

      if (!isDateFiltered) {
        periodBelievers += vAllBelievers;
        periodBaptized += vAllBaptized;
        periodHeard += vAllHeard;
      } else {
        const vKey = v.id || `${v.rowId}`;
        const p = villagePeriodMap[vKey];
        if (p) {
          periodBelievers += p.believers;
          periodBaptized += p.baptized;
          periodHeard += p.heard;
        }
      }
    });

    return {
      believers: periodBelievers,
      baptized: periodBaptized,
      heard: periodHeard,
      attending: totalAttending,
      leaders: totalLeaders,
      allTimeBelievers: totalAllBelievers,
      allTimeBaptized: totalAllBaptized,
      allTimeHeard: totalAllHeard,
      isDateFiltered,
    };
  }, [filteredVillages, isDateFiltered, villagePeriodMap]);

  // Urgent Needs / Persecution List
  const urgentVillages = useMemo(() => {
    return filteredVillages.filter(
      (v) => v.persecution === 'ວິກິດ' || v.persecution === 'ປານກາງ' || (v.needs && v.needs.trim().length > 0)
    );
  }, [filteredVillages]);

  // District Statistics Grouped by District (Sorted ascending: shortest to longest bar)
  const allDistrictStats = useMemo(() => {
    const districtMap: {
      [key: string]: {
        district: string;
        rawDistrict: string;
        believers: number;
        baptized: number;
        heard: number;
        attending: number;
        leaders: number;
        churches: number;
        baptismRate: number;
        percentOfTotalBelievers: number;
        leaderRatio: number;
        avgChurchSize: number;
      };
    } = {};

    let totalBelieversCount = 0;

    filteredVillages.forEach((v) => {
      const rawD = v.district || 'Other';
      const localizedD = getLocalizedDistrict(rawD, language);
      if (!districtMap[localizedD]) {
        districtMap[localizedD] = {
          district: localizedD,
          rawDistrict: rawD,
          believers: 0,
          baptized: 0,
          heard: 0,
          attending: 0,
          leaders: 0,
          churches: 0,
          baptismRate: 0,
          percentOfTotalBelievers: 0,
          leaderRatio: 0,
          avgChurchSize: 0,
        };
      }
      const vKey = v.id || `${v.rowId}`;
      const p = villagePeriodMap[vKey];
      const b = isDateFiltered ? (p?.believers || 0) : (Number(v.believers) || 0);
      const bp = isDateFiltered ? (p?.baptized || 0) : (Number(v.baptized) || 0);
      const h = isDateFiltered ? (p?.heard || 0) : (Number(v.heard) || 0);

      const rawLeaders = Number(v.leaders) || 0;
      districtMap[localizedD].believers += b;
      districtMap[localizedD].baptized += bp;
      districtMap[localizedD].heard += h;
      districtMap[localizedD].attending += Number(v.attending) || 0;
      districtMap[localizedD].leaders += rawLeaders < 0 ? 1 : rawLeaders;
      districtMap[localizedD].churches += 1;
      totalBelieversCount += b;
    });

    const list = Object.values(districtMap).map((d) => ({
      ...d,
      baptismRate: d.believers > 0 ? Math.round((d.baptized / d.believers) * 100) : 0,
      percentOfTotalBelievers: totalBelieversCount > 0 ? Math.round((d.believers / totalBelieversCount) * 100) : 0,
      leaderRatio: d.leaders > 0 ? Math.round(d.believers / d.leaders) : d.believers,
      avgChurchSize: d.churches > 0 ? Math.round(d.believers / d.churches) : 0,
    }));

    // Ascending: from smallest to largest (shortest bar to longest bar)
    return list.sort((a, b) => a.believers - b.believers);
  }, [filteredVillages, language, isDateFiltered, villagePeriodMap]);

  // All Church Statistics (Sorted ascending from smallest to largest / shortest to longest bar)
  const allChurchStats = useMemo(() => {
    const list = filteredVillages.map((v) => {
      const name = getLocalizedVillageName(v, language) || v.name || 'Unknown';
      const district = getLocalizedDistrict(v.district, language) || v.district || '';
      const vKey = v.id || `${v.rowId}`;
      const p = villagePeriodMap[vKey];
      const believers = isDateFiltered ? (p?.believers || 0) : (Number(v.believers) || 0);
      const baptized = isDateFiltered ? (p?.baptized || 0) : (Number(v.baptized) || 0);
      const rawLeaders = Number(v.leaders) || 0;
      return {
        id: v.id || `${v.rowId}`,
        name,
        displayName: district ? `${name} (${district})` : name,
        district,
        believers,
        baptized,
        baptismRate: believers > 0 ? Math.round((baptized / believers) * 100) : 0,
        attending: Number(v.attending) || 0,
        leaders: rawLeaders < 0 ? 1 : rawLeaders,
      };
    });

    // Ascending: from smallest believers to largest believers (short to long bar!)
    return list.sort((a, b) => a.believers - b.believers);
  }, [filteredVillages, language, isDateFiltered, villagePeriodMap]);

  // Active Chart Data based on user toggle: 'church' or 'district'
  const activeChartData = useMemo(() => {
    if (chartViewTarget === 'church') {
      return allChurchStats.map((item) => ({
        name: item.name,
        displayName: item.displayName,
        district: item.district,
        believers: item.believers,
        baptized: item.baptized,
        baptismRate: item.baptismRate,
      }));
    } else {
      return allDistrictStats.map((item) => ({
        name: item.district,
        displayName: item.district,
        district: item.district,
        believers: item.believers,
        baptized: item.baptized,
        baptismRate: item.baptismRate,
      }));
    }
  }, [chartViewTarget, allChurchStats, allDistrictStats]);

  // Filtered & Sorted Table Data
  const tableVillages = useMemo(() => {
    return filteredVillages
      .filter((v) => {
        if (selectedDistrictFilter !== 'all' && v.district !== selectedDistrictFilter) return false;
        if (selectedStatusFilter !== 'all' && v.persecution !== selectedStatusFilter) return false;

        const q = tableSearch.toLowerCase().trim();
        if (!q) return true;
        const heardVal = (Number(v.heard) || 0).toString();
        return (
          (v.name && v.name.toLowerCase().includes(q)) ||
          (v.district && v.district.toLowerCase().includes(q)) ||
          (v.province && v.province.toLowerCase().includes(q)) ||
          heardVal.includes(q) ||
          (v.believers !== undefined && v.believers.toString().includes(q)) ||
          (v.baptized !== undefined && v.baptized.toString().includes(q)) ||
          (v.date && v.date.toLowerCase().includes(q)) ||
          (v.needs && v.needs.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortField === 'date') {
          const timeA = a.date ? new Date(a.date).getTime() : 0;
          const timeB = b.date ? new Date(b.date).getTime() : 0;
          if (timeA < timeB) return sortOrder === 'asc' ? -1 : 1;
          if (timeA > timeB) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        }

        let valA: any = sortField === 'heard' ? (Number(a.heard) || 0) : a[sortField];
        let valB: any = sortField === 'heard' ? (Number(b.heard) || 0) : b[sortField];

        if (typeof valA === 'number' || typeof valB === 'number') {
          const numA = Number(valA) || 0;
          const numB = Number(valB) || 0;
          if (numA < numB) return sortOrder === 'asc' ? -1 : 1;
          if (numA > numB) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        }

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = (valB || '').toString().toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [filteredVillages, tableSearch, selectedDistrictFilter, selectedStatusFilter, sortField, sortOrder]);

  const toggleSort = (field: 'name' | 'district' | 'heard' | 'believers' | 'baptized' | 'attending' | 'leaders' | 'persecution' | 'date') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' || field === 'district' ? 'asc' : 'desc');
    }
  };

  // Export Table Data to Excel / CSV with UTF-8 BOM for Lao/Thai Font
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Church Name (ບ້ານ/ຄິດສະຈັກ)',
      'District (ເມືອງ)',
      'Province (ແຂວງ)',
      'Heard Gospel (ຜູ້ໄດ້ຍິນຂ່າວປະເສີດ)',
      'Believers (ຜູ້ເຊື່ອ)',
      'Baptized (ບັບຕິສະມາ)',
      'Status (ສະຖານະ)',
      'Needs (ຄວາມຕ້ອງການ)',
      'Date (ວັນທີ)'
    ];

    const rows = tableVillages.map((v) => [
      v.id || v.rowId,
      `"${(v.name || '').replace(/"/g, '""')}"`,
      `"${(v.district || '').replace(/"/g, '""')}"`,
      `"${(v.province || '').replace(/"/g, '""')}"`,
      Number(v.heard) || 0,
      Number(v.believers) || 0,
      Number(v.baptized) || 0,
      `"${(v.persecution || '').replace(/"/g, '""')}"`,
      `"${(v.needs || '').replace(/"/g, '""')}"`,
      v.date || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Hope_Bokeo_Filtered_Data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Quick Stats Summary Card */}
      <div className="bg-[#0f172a] text-white p-3.5 sm:p-5 md:p-6 rounded-2xl shadow-md relative overflow-hidden space-y-3.5 sm:space-y-4 transition-colors">
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#cc0000] text-white flex items-center justify-center font-bold shadow-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg tracking-tight text-white">
                {language === 'lo'
                  ? 'ສະຫຼຸບສະຖິຕິ'
                  : language === 'th'
                  ? 'สรุปสถิติ'
                  : 'Summary Statistics'}
              </h2>
              {isDateFiltered && (
                <span className="text-[11px] text-amber-400 font-bold block mt-0.5">
                  {language === 'lo'
                    ? `📅 ຕົວເລກເພີ່ມຂຶ້ນໃນຊ່ວງວັນທີ: ${startDate || '...'} ຫາ ${endDate || '...'}`
                    : `📅 Metrics added in period: ${startDate || '...'} to ${endDate || '...'}`}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowStats(!showStats)}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs active:scale-95 border border-slate-700"
            title={showStats ? (language === 'lo' ? 'ເຊື່ອງສະຖິຕິ' : 'Collapse') : (language === 'lo' ? 'ສະແດງສະຖິຕິ' : 'Expand')}
          >
            {showStats ? (
              <ChevronUp className="w-4 h-4 text-red-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>

        {showStats && (
          <div className="relative z-10 animate-fade-in">
            {/* 6 Metric Cards: 2 rows of 3 boxes on mobile, 1 row of 6 boxes on desktop */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3.5">
              {/* Active Churches / Villages */}
              <div className="bg-[#16274c] hover:bg-[#1b305c] border border-[#233b6e] rounded-xl p-2.5 sm:p-3.5 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-xs min-w-0">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-blue-400 text-[10px] sm:text-xs font-bold mb-1 w-full">
                  <Building2 className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">
                    {language === 'lo'
                      ? 'ຄິດສະຈັກ/ບ້ານ'
                      : language === 'th'
                      ? 'คริสตจักร/หมู่บ้าน'
                      : 'Churches'}
                  </span>
                </div>
                <span className="text-lg sm:text-2xl font-black text-white tracking-tight tabular-nums leading-tight">
                  <AnimatedCounter value={filteredVillages.length} />
                </span>
              </div>

              {/* Heard Gospel */}
              <div className="bg-[#2c2823] hover:bg-[#36312a] border border-[#4d4227] rounded-xl p-2.5 sm:p-3.5 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-xs min-w-0">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-amber-400 text-[10px] sm:text-xs font-bold mb-1 w-full">
                  <Ear className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">
                    {language === 'lo'
                      ? isDateFiltered ? 'ໄດ້ຍິນຂ່າວ (ເພີ່ມ)' : 'ໄດ້ຍິນຂ່າວ'
                      : language === 'th'
                      ? isDateFiltered ? 'ได้ยินข่าว (เพิ่ม)' : 'ได้ยินข่าว'
                      : isDateFiltered ? 'Heard (Added)' : 'Heard'}
                  </span>
                </div>
                <span className="text-lg sm:text-2xl font-black text-amber-400 tracking-tight tabular-nums leading-tight">
                  <AnimatedCounter value={stats.heard} />
                </span>
                {isDateFiltered && (
                  <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 block font-semibold truncate w-full">
                    {language === 'lo' ? `(ສະສົມ: ${stats.allTimeHeard.toLocaleString()})` : `(Total: ${stats.allTimeHeard.toLocaleString()})`}
                  </span>
                )}
              </div>

              {/* Total Believers */}
              <div className="bg-[#311f2c] hover:bg-[#3c2536] border border-[#582a3e] rounded-xl p-2.5 sm:p-3.5 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-xs min-w-0">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-rose-400 text-[10px] sm:text-xs font-bold mb-1 w-full">
                  <Heart className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">
                    {language === 'lo'
                      ? isDateFiltered ? 'ຜູ້ເຊື່ອໃໝ່ (ເພີ່ມ)' : 'ຮັບເຊື່ອແລ້ວ'
                      : language === 'th'
                      ? isDateFiltered ? 'ผู้เชื่อใหม่ (เพิ่ม)' : 'ผู้เชื่อ'
                      : isDateFiltered ? 'New Believers' : 'Believers'}
                  </span>
                </div>
                <span className="text-lg sm:text-2xl font-black text-rose-400 tracking-tight tabular-nums leading-tight">
                  <AnimatedCounter value={stats.believers} />
                </span>
                {isDateFiltered && (
                  <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 block font-semibold truncate w-full">
                    {language === 'lo' ? `(ສະສົມ: ${stats.allTimeBelievers.toLocaleString()})` : `(Total: ${stats.allTimeBelievers.toLocaleString()})`}
                  </span>
                )}
              </div>

              {/* Total Baptized */}
              <div className="bg-[#132f32] hover:bg-[#17393d] border border-[#1f4e4b] rounded-xl p-2.5 sm:p-3.5 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-xs min-w-0">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-emerald-400 text-[10px] sm:text-xs font-bold mb-1 w-full">
                  <Droplets className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">
                    {language === 'lo'
                      ? isDateFiltered ? 'ບັບຕິສະມາ (ເພີ່ມ)' : 'ຮັບບັບຕິສະມາ'
                      : language === 'th'
                      ? isDateFiltered ? 'บัพติศมา (เพิ่ม)' : 'บัพติศมา'
                      : isDateFiltered ? 'Baptized (Added)' : 'Baptized'}
                  </span>
                </div>
                <span className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight tabular-nums leading-tight">
                  <AnimatedCounter value={stats.baptized} />
                </span>
                {isDateFiltered && (
                  <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 block font-semibold truncate w-full">
                    {language === 'lo' ? `(ສະສົມ: ${stats.allTimeBaptized.toLocaleString()})` : `(Total: ${stats.allTimeBaptized.toLocaleString()})`}
                  </span>
                )}
              </div>

              {/* Worship Attendance */}
              <div className="bg-[#132a42] hover:bg-[#173350] border border-[#1e4568] rounded-xl p-2.5 sm:p-3.5 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-xs min-w-0">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-cyan-400 text-[10px] sm:text-xs font-bold mb-1 w-full">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">
                    {language === 'lo'
                      ? 'ນະມັດສະການ'
                      : language === 'th'
                      ? 'ผู้ร่วมนมัสการ'
                      : 'Worshipers'}
                  </span>
                </div>
                <span className="text-lg sm:text-2xl font-black text-cyan-400 tracking-tight tabular-nums leading-tight">
                  <AnimatedCounter value={stats.attending} />
                </span>
              </div>

              {/* Leaders Trained */}
              <div className="bg-[#251f42] hover:bg-[#2d2650] border border-[#3d2e68] rounded-xl p-2.5 sm:p-3.5 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-xs min-w-0">
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-purple-400 text-[10px] sm:text-xs font-bold mb-1 w-full">
                  <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">
                    {language === 'lo'
                      ? 'ຜູ້ອົບຮົມ/ຜູ້ນຳ'
                      : language === 'th'
                      ? 'ผู้นำที่อบรม'
                      : 'Leaders'}
                  </span>
                </div>
                <span className="text-lg sm:text-2xl font-black text-purple-400 tracking-tight tabular-nums leading-tight">
                  <AnimatedCounter value={stats.leaders} />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Charts & Urgent Needs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Growth Statistics by District View */}
        <div className={`${showUrgent ? 'lg:col-span-1' : 'lg:col-span-2'} bg-white dark:bg-slate-900 p-4 sm:p-5 md:p-6 rounded-2xl shadow-xs transition-all flex flex-col space-y-4`}>
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#cc0000] dark:text-red-400 flex items-center justify-center font-bold shadow-2xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                  <span>
                    {chartViewTarget === 'church'
                      ? language === 'lo'
                        ? 'ສະຖິຕິການເຕີບໂຕຕາມຄຣິດຕະຈັກ'
                        : language === 'th'
                        ? 'สถิติการเติบโตตามคริสตจักร'
                        : 'Growth Statistics by Church'
                      : language === 'lo'
                      ? 'ສະຖິຕິການເຕີບໂຕຕາມແຕ່ລະເມືອງ'
                      : language === 'th'
                      ? 'สถิติการเติบโตตามแต่ละอำเภอ'
                      : 'Growth Statistics by District'}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-[#cc0000] dark:text-red-400 border border-red-200/70 dark:border-red-900/60 shadow-2xs">
                    {activeChartData.length}{' '}
                    {chartViewTarget === 'church'
                      ? language === 'lo'
                        ? 'ແຫ່ງ'
                        : 'churches'
                      : language === 'lo'
                      ? 'ເມືອງ'
                      : 'districts'}
                  </span>
                </h3>
              </div>
            </div>

            {/* View Switcher (All Churches / By District) & Collapse Toggle */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
              {/* Toggle to Show/Hide Filter Buttons */}
              <button
                type="button"
                onClick={() => setShowChartFilters(!showChartFilters)}
                className={`p-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs ${
                  showChartFilters
                    ? 'bg-red-50 text-[#cc0000] border-red-200/80 dark:bg-red-950/50 dark:border-red-900/60'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700'
                }`}
                title={showChartFilters ? (language === 'lo' ? 'ເຊື່ອງປຸ່ມຟິວເຕີ' : 'Hide Filters') : (language === 'lo' ? 'ສະແດງປຸ່ມຟິວເຕີ' : 'Show Filters')}
                aria-label="Toggle Filter Options"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>

              {/* Smaller Collapsible Filter Switcher */}
              {showChartFilters && (
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/70 shadow-2xs animate-fade-in">
                  <button
                    type="button"
                    onClick={() => setChartViewTarget('church')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      chartViewTarget === 'church'
                        ? 'bg-white dark:bg-slate-700 text-[#cc0000] dark:text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                    title={language === 'lo' ? 'ສະແດງທຸກຄຣິດຕະຈັກ' : 'All Churches'}
                  >
                    <Building2 className="w-3 h-3" />
                    <span>{language === 'lo' ? 'ທຸກຄຣິດຕະຈັກ' : language === 'th' ? 'ทุกคริสตจักร' : 'All'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartViewTarget('district')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      chartViewTarget === 'district'
                        ? 'bg-white dark:bg-slate-700 text-[#cc0000] dark:text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                    title={language === 'lo' ? 'ສະແດງຕາມເມືອງ' : 'By District'}
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{language === 'lo' ? 'ຕາມເມືອງ' : language === 'th' ? 'ตามอำเภอ' : 'District'}</span>
                  </button>
                </div>
              )}

              {/* Collapse/Expand Whole Chart */}
              <button
                type="button"
                onClick={() => setShowCharts(!showCharts)}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs active:scale-95"
                title={showCharts ? (language === 'lo' ? 'ເຊື່ອງສະຖິຕິ' : 'Collapse') : (language === 'lo' ? 'ສະແດງສະຖິຕິ' : 'Expand')}
              >
                {showCharts ? (
                  <ChevronUp className="w-4 h-4 text-[#cc0000] dark:text-red-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </button>
            </div>
          </div>

          {/* Simple Clean Bar Chart (Ascending: shortest to longest) */}
          {showCharts && (
            <div className="pt-1">
              {activeChartData.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center min-h-[340px]">
                  {language === 'lo' ? 'ບໍ່ມີຂໍ້ມູນໃນການສະແດງຜົນ' : 'No data to display'}
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <div
                    style={{
                      minWidth: `${Math.max(320, activeChartData.length * (chartViewTarget === 'church' ? 44 : 70))}px`,
                      height: 340,
                    }}
                    className="w-full"
                  >
                    <ResponsiveContainer width="100%" height={340} debounce={50}>
                      <BarChart
                        data={activeChartData}
                        margin={{
                          top: 12,
                          right: 14,
                          left: 2,
                          bottom: activeChartData.length > 5 ? 20 : 8,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          fontSize={10}
                          fontWeight={600}
                          tickLine={false}
                          interval={0}
                          angle={activeChartData.length > 5 ? -28 : 0}
                          textAnchor={activeChartData.length > 5 ? 'end' : 'middle'}
                          height={activeChartData.length > 5 ? 36 : 24}
                          dy={4}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={10}
                          fontWeight={600}
                          tickLine={false}
                          width={34}
                          allowDecimals={false}
                        />
                        <Tooltip
                          formatter={(val: any, name: any) => [
                            typeof val === 'number' ? formatNumber(val) : val,
                            name,
                          ]}
                          labelFormatter={(label: any, payload: any) => {
                            const item = payload?.[0]?.payload;
                            if (item?.displayName) return item.displayName;
                            return label;
                          }}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            color: '#ffffff',
                            fontSize: '12px',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
                            padding: '8px 12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px', lineHeight: '16px' }} />
                        <Bar
                          dataKey="believers"
                          name={language === 'lo' ? 'ຜູ້ເຊື່ອ (Believers)' : 'Believers'}
                          fill="#cc0000"
                          radius={[5, 5, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={800}
                        />
                        <Bar
                          dataKey="baptized"
                          name={language === 'lo' ? 'ຮັບບັບຕິສະມາ (Baptized)' : 'Baptized'}
                          fill="#10b981"
                          radius={[5, 5, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={900}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Urgent Needs Panel */}
        <div className={`${showCharts ? 'lg:col-span-1' : 'lg:col-span-2'} bg-white dark:bg-slate-900 p-4 sm:p-5 md:p-6 rounded-2xl shadow-xs flex flex-col transition-all space-y-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-2xs">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                {language === 'lo'
                  ? 'ແຈ້ງເຕືອນເລັ່ງດ່ວນ (Urgent Needs)'
                  : language === 'th'
                  ? 'แจ้งเตือนเร่งด่วน (Urgent Needs)'
                  : 'Urgent Persecution / Needs Alerts'}
              </h3>
            </div>
            <button
              onClick={() => setShowUrgent(!showUrgent)}
              className="w-8 h-8 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer shadow-2xs border border-slate-200/60 dark:border-slate-700/60 active:scale-95"
              title={showUrgent ? (language === 'lo' ? 'ເຊື່ອງແຈ້ງເຕືອນ' : 'Collapse') : (language === 'lo' ? 'ສະແດງແຈ້ງເຕືອນ' : 'Expand')}
            >
              {showUrgent ? (
                <ChevronUp className="w-4 h-4 text-[#cc0000] dark:text-red-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </button>
          </div>

          {showUrgent && (
            <div
              className={`overflow-y-auto flex-1 max-h-[360px] sm:max-h-[380px] pr-1.5 animate-fade-in ${
                !showCharts
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 space-y-0'
                  : 'space-y-2.5'
              }`}
            >
              {urgentVillages.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-12 col-span-full">
                  {language === 'lo'
                    ? 'ບໍ່ມີແຈ້ງເຕືອນເລັ່ງດ່ວນໃນຂະນະນີ້ 🟢'
                    : language === 'th'
                    ? 'ไม่มีการแจ้งเตือนเร่งด่วนในขณะนี้ 🟢'
                    : 'No urgent alerts reported at this time 🟢'}
                </div>
              ) : (
                urgentVillages.map((v) => (
                  <div
                    key={v.rowId || v.id}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-200 space-y-1.5 shadow-2xs hover:-translate-y-0.5 ${
                      v.persecution === 'ວິກິດ' || v.persecution === 'critical'
                        ? 'bg-red-50/70 hover:bg-red-50 dark:bg-red-950/30 dark:hover:bg-red-950/50 border-red-200/80 dark:border-red-900/50'
                        : 'bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border-amber-200/80 dark:border-amber-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white flex items-center gap-1.5 min-w-0">
                        <AlertTriangle className="w-4 h-4 text-[#cc0000] shrink-0" />
                        <span className="truncate">
                          {getLocalizedVillageName(v, language) || v.name || v.id}
                          {v.district ? ` (${getLocalizedDistrict(v.district, language)})` : ''}
                        </span>
                      </h4>
                      <span
                        className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs ${
                          v.persecution === 'ວິກິດ' || v.persecution === 'critical'
                            ? 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
                        }`}
                      >
                        {getLocalizedStatus(v.persecution, language)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {getLocalizedNeeds(v, language)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comprehensive Excel Data Table Section (Full Interactive Grid) */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 md:p-6 rounded-2xl shadow-xs space-y-4 animate-fade-in transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-2xs">
              <TableIcon className="w-4 h-4" />
            </div>
            <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
              {language === 'lo'
                ? 'ຕາຕະລາງຂໍ້ມູນພັນທະກິດແບບລະອຽດ (Interactive Data Table)'
                : language === 'th'
                ? 'ตารางข้อมูลพันธกิจแบบละเอียด (Interactive Data Table)'
                : 'Interactive Ministry Data Table'}
            </h3>
          </div>

          <button
            onClick={() => setShowFullTable(!showFullTable)}
            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer shadow-2xs border border-slate-200/60 dark:border-slate-700/60 active:scale-95"
            title={showFullTable ? (language === 'lo' ? 'ເຊື່ອງຕາຕະລາງ' : 'Collapse') : (language === 'lo' ? 'ສະແດງຕາຕະລາງ' : 'Expand')}
          >
            {showFullTable ? (
              <ChevronUp className="w-4 h-4 text-[#cc0000] dark:text-red-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </button>
        </div>

        {showFullTable && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Search & Export Controls */}
            <div className="flex flex-row items-center gap-2.5 w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder={
                    language === 'lo'
                      ? 'ຄົ້ນຫາບ້ານ, ເມືອງ, ຜູ້ເຊື່ອ, ສະຖານະ, ຄວາມຕ້ອງການ...'
                      : language === 'th'
                      ? 'ค้นหาหมู่บ้าน, อำเภอ, ผู้เชื่อ, สถานะ, ความต้องการ...'
                      : 'Search villages, districts, believers, needs...'
                  }
                  className="w-full pl-9 pr-3 py-2 h-10 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#cc0000]/20 focus:border-[#cc0000] transition-all shadow-2xs"
                />
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="h-10 px-4 py-2 bg-[#cc0000] hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                <span className="whitespace-nowrap">
                  {language === 'lo' ? 'ດາວໂຫຼດ CSV' : language === 'th' ? 'ส่งออก CSV' : 'Export CSV'}
                </span>
              </button>
            </div>

            {/* Full Table */}
            <div className="overflow-x-auto max-h-[480px] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs sm:text-[13px] whitespace-nowrap">
                <thead className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-xs text-slate-700 dark:text-slate-200 font-bold sticky top-0 z-10 border-b border-slate-200/80 dark:border-slate-700">
                  <tr>
                    <th
                      onClick={() => toggleSort('name')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{language === 'lo' ? 'ຄິດສະຈັກ / ບ້ານ' : language === 'th' ? 'คริสตจักร / หมู่บ้าน' : 'Church / Village'}</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('district')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{language === 'lo' ? 'ເມືອງ, ແຂວງ' : language === 'th' ? 'เมือง, แขวง' : 'Location'}</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('heard')}
                      className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition text-blue-600 dark:text-blue-400"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{language === 'lo' ? 'ຜູ້ໄດ້ຍິນຂ່າວປະເສີດ' : language === 'th' ? 'ผู้ได้ยินข่าวประเสริฐ' : 'Heard Gospel'}</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('believers')}
                      className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition text-[#cc0000] dark:text-red-400"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{language === 'lo' ? 'ຜູ້ເຊື່ອ' : language === 'th' ? 'ผู้เชื่อ' : 'Believers'}</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('baptized')}
                      className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition text-emerald-600 dark:text-emerald-400"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{language === 'lo' ? 'ບັບຕິສະມາ' : language === 'th' ? 'บัพติศมา' : 'Baptized'}</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('attending')}
                      className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition text-cyan-600 dark:text-cyan-400"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{language === 'lo' ? 'ຜູ້ມານະມັດສະການ' : language === 'th' ? 'ผู้มาร่วมนมัสการ' : 'Worshipers'}</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('leaders')}
                      className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition text-purple-600 dark:text-purple-400"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{language === 'lo' ? 'ຜູ້ນຳ' : language === 'th' ? 'ผู้นำ' : 'Leaders'}</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('persecution')}
                      className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{language === 'lo' ? 'ສະຖານະ' : language === 'th' ? 'สถานะ' : 'Status'}</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>

                    <th
                      onClick={() => toggleSort('date')}
                      className="px-4 py-3.5 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>{language === 'lo' ? 'ວັນທີອັບເດດ' : language === 'th' ? 'วันที่อัปเดต' : 'Last Updated'}</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {tableVillages.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400 text-xs font-medium">
                        {language === 'lo' ? 'ບໍ່ພົບຂໍ້ມູນທີ່ກົງກັບການຄົ້ນຫາ' : language === 'th' ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา' : 'No records found.'}
                      </td>
                    </tr>
                  ) : (
                    tableVillages.map((v) => {
                      const statusBadge =
                        v.persecution === 'ວິກິດ'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200/80 dark:border-red-900/50'
                          : v.persecution === 'ປານກາງ'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/50';

                      return (
                        <tr key={v.rowId || v.id} className="hover:bg-red-50/30 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                            ⛪ {getLocalizedVillageName(v, language)}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {getLocalizedDistrict(v.district, language)}, {getLocalizedProvince(v.province, language)}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-blue-600 dark:text-blue-400">
                            {formatNumber(v.heard)}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-[#cc0000] dark:text-red-400">
                            {formatNumber(v.believers)}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {formatNumber(v.baptized)}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-cyan-600 dark:text-cyan-400">
                            {formatNumber(v.attending)}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-purple-600 dark:text-purple-400">
                            {formatNumber(v.leaders)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-2xs ${statusBadge}`}>
                              {getLocalizedStatus(v.persecution, language)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right text-slate-500 dark:text-slate-400 text-xs">
                            {v.date ? new Date(v.date).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Total Summary Row */}
                <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-black text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <td className="px-4 py-3.5">
                      {language === 'lo' ? '📊 ຜົນລວມທັງໝົດ:' : language === 'th' ? '📊 ผลรวมทั้งหมด:' : 'Total Summary:'}
                    </td>
                    <td className="px-4 py-3.5"></td>
                    <td className="px-4 py-3.5 text-center text-blue-600 dark:text-blue-400 text-sm font-black">
                      {formatNumber(tableVillages.reduce((sum, v) => sum + (Number(v.heard) || 0), 0))}
                    </td>
                    <td className="px-4 py-3.5 text-center text-[#cc0000] dark:text-red-400 text-sm font-black">
                      {formatNumber(tableVillages.reduce((sum, v) => sum + (Number(v.believers) || 0), 0))}
                    </td>
                    <td className="px-4 py-3.5 text-center text-emerald-600 dark:text-emerald-400 text-sm font-black">
                      {formatNumber(tableVillages.reduce((sum, v) => sum + (Number(v.baptized) || 0), 0))}
                    </td>
                    <td className="px-4 py-3.5 text-center text-cyan-600 dark:text-cyan-400 text-sm font-black">
                      {formatNumber(tableVillages.reduce((sum, v) => sum + (Number(v.attending) || 0), 0))}
                    </td>
                    <td className="px-4 py-3.5 text-center text-purple-600 dark:text-purple-400 text-sm font-black">
                      {formatNumber(tableVillages.reduce((sum, v) => sum + (Number(v.leaders) || 0), 0))}
                    </td>
                    <td className="px-4 py-3.5" colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Area & Map Section inside ຂໍ້ມູນເຊິງເລິກ (Deep Insights) */}
      <div id="dashboard-area-map-section" className="bg-white dark:bg-slate-900 p-4 sm:p-5 md:p-6 rounded-2xl shadow-xs space-y-4 animate-fade-in transition-colors scroll-mt-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#cc0000] dark:text-red-400 flex items-center justify-center font-bold shadow-2xs">
              <Map className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                {language === 'lo' ? 'ພື້ນທີ່ ແລະ ແຜນທີ່ພັນທະກິດ (Area & Map)' : language === 'th' ? 'พื้นที่และแผนที่พันธกิจ (Area & Map)' : 'Area & Ministry Map'}
              </h3>
            </div>
          </div>

          <button
            onClick={() => setShowMapSection(!showMapSection)}
            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer shadow-2xs border border-slate-200/60 dark:border-slate-700/60 active:scale-95"
            title={showMapSection ? (language === 'lo' ? 'ເຊື່ອງແຜນທີ່' : 'Collapse') : (language === 'lo' ? 'ສະແດງແຜນທີ່' : 'Expand')}
          >
            {showMapSection ? (
              <ChevronUp className="w-4 h-4 text-[#cc0000] dark:text-red-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </button>
        </div>

        {showMapSection && (
          <div className="animate-fade-in pt-1 rounded-xl overflow-hidden">
            <MapsTab
              villages={filteredVillages}
              language={language}
              selectedProvince={selectedProvince}
              selectedDistrict={selectedDistrict}
              selectedChurch={selectedChurch}
            />
          </div>
        )}
      </div>
    </div>
  );
};

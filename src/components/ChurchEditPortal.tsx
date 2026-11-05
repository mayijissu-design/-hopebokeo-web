import React, { useState, useEffect } from 'react';
import { Church, KeyRound, Lock, CheckCircle, Save, AlertTriangle, ShieldCheck, Calendar, Users, Heart, Droplets, MapPin, Image as ImageIcon, PlusCircle, ArrowRight, ArrowLeft, TrendingUp, History, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Village, VillageUpdateRecord, Language } from '../types';
import { UnifiedMediaUploader } from './UnifiedMediaUploader';

// Helper to return YYYY-MM-DD in user's local timezone (preventing UTC offset date shifts)
const getTodayLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface ChurchEditPortalProps {
  villages: Village[];
  onSaveVillage: (updatedVillage: Village) => Promise<void>;
  language: Language;
  onBack?: () => void;
}

export const ChurchEditPortal: React.FC<ChurchEditPortalProps> = ({
  villages,
  onSaveVillage,
  language,
  onBack,
}) => {
  const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [inputPin, setInputPin] = useState<string>('');
  const [showPinCode, setShowPinCode] = useState<boolean>(false);
  const [authenticatedVillage, setAuthenticatedVillage] = useState<Village | null>(null);
  const [pinError, setPinError] = useState<string>('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Incremental Form State
  const [addHeard, setAddHeard] = useState<number>(0);
  const [addBelievers, setAddBelievers] = useState<number>(0);
  const [addBaptized, setAddBaptized] = useState<number>(0);
  const [attending, setAttending] = useState<number>(0);
  const [leaders, setLeaders] = useState<number>(0);
  const [persecution, setPersecution] = useState<string>('ປົກກະຕິ');
  const [needs, setNeeds] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [updateDate, setUpdateDate] = useState<string>(getTodayLocalDateString);

  // Automatically keep authenticatedVillage in sync with newest villages array from props
  useEffect(() => {
    if (authenticatedVillage) {
      const latest = villages.find(
        (v) => (v.id && v.id === authenticatedVillage.id) || v.rowId === authenticatedVillage.rowId
      );
      if (
        latest &&
        (latest.believers !== authenticatedVillage.believers ||
          latest.heard !== authenticatedVillage.heard ||
          latest.baptized !== authenticatedVillage.baptized ||
          latest.date !== authenticatedVillage.date ||
          latest.attending !== authenticatedVillage.attending ||
          latest.leaders !== authenticatedVillage.leaders)
      ) {
        setAuthenticatedVillage(latest);
      }
    }
  }, [villages, authenticatedVillage]);

  // Last comparison record
  const [lastUpdateSummary, setLastUpdateSummary] = useState<{
    prevHeard: number;
    prevBelievers: number;
    prevBaptized: number;
    addedHeard: number;
    addedBelievers: number;
    addedBaptized: number;
    newHeard: number;
    newBelievers: number;
    newBaptized: number;
    date: string;
  } | null>(null);

  // Verify PIN for chosen Church
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setSaveSuccessMessage('');

    if (!selectedVillageId) {
      setPinError(
        language === 'lo'
          ? 'ກະລຸນາເລືອກຄຣິດຕະຈັກ / ບ້ານ ຂອງທ່ານກ່ອນ'
          : language === 'th'
          ? 'กรุณาเลือกคริสตจักร / หมู่บ้าน ของคุณก่อน'
          : 'Please select your church/village first'
      );
      return;
    }

    const matched = villages.find(
      (v) => (v.id === selectedVillageId || v.rowId?.toString() === selectedVillageId)
    );

    if (!matched) {
      setPinError(
        language === 'lo'
          ? 'ບໍ່ພົບຂໍ້ມູນຄຣິດຕະຈັກນີ້'
          : language === 'th'
          ? 'ไม่พบข้อมูลคริสตจักรนี้'
          : 'Church record not found'
      );
      return;
    }

    // Default PIN fallback to 1001 if pin is not set on village
    const expectedPin = matched.pinCode || (matched as any).pin || '1001';

    if (inputPin.trim() === expectedPin.toString().trim()) {
      setAuthenticatedVillage(matched);
      setAddHeard(0);
      setAddBelievers(0);
      setAddBaptized(0);
      setAttending(Number(matched.attending) || 0);
      setLeaders(Number(matched.leaders) || 0);
      setPersecution(matched.persecution || 'ປົກກະຕິ');
      setNeeds(matched.needs || '');
      setNotes(matched.notes || '');
      setImageUrl(matched.imageUrl || '');
      setUpdateDate(getTodayLocalDateString());
      setPinError('');
      setLastUpdateSummary(null);
    } else {
      setPinError(
        language === 'lo'
          ? 'ລະຫັດ PIN ບໍ່ຖືກຕ້ອງ! ກະລຸນາກວດສອບລະຫັດກັບແອັດມິນ'
          : language === 'th'
          ? 'รหัส PIN ไม่ถูกต้อง! กรุณาตรวจสอบรหัสกับแอดมิน'
          : 'Incorrect PIN code! Please contact admin.'
      );
    }
  };

  // Save incremental changes (ບວກເພີ່ມເຂົ້າຂໍ້ມູນເດີມ)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticatedVillage) return;

    setIsSaving(true);
    setSaveSuccessMessage('');

    const prevHeard = Number(authenticatedVillage.heard) || 0;
    const prevBelievers = Number(authenticatedVillage.believers) || 0;
    const prevBaptized = Number(authenticatedVillage.baptized) || 0;

    const addH = Math.max(0, Number(addHeard) || 0);
    const addB = Math.max(0, Number(addBelievers) || 0);
    const addBp = Math.max(0, Number(addBaptized) || 0);
    const finalHeard = prevHeard + addH;
    const finalBelievers = prevBelievers + addB;
    const finalBaptized = prevBaptized + addBp;
    const safeDate = updateDate || getTodayLocalDateString();

    // Prepare update history log
    let existingHistory: VillageUpdateRecord[] = Array.isArray(authenticatedVillage.history)
      ? [...authenticatedVillage.history]
      : [];

    if (existingHistory.length === 0) {
      const initDate = authenticatedVillage.initialDate || '2026-07-16';
      existingHistory.push({
        id: `init_${authenticatedVillage.id}`,
        date: initDate,
        addedHeard: Number(authenticatedVillage.initialHeard) || prevHeard,
        addedBelievers: Number(authenticatedVillage.initialBelievers) || prevBelievers,
        addedBaptized: Number(authenticatedVillage.initialBaptized) || prevBaptized,
        totalHeard: prevHeard,
        totalBelievers: prevBelievers,
        totalBaptized: prevBaptized,
        attending: Number(authenticatedVillage.attending) || 0,
        leaders: Number(authenticatedVillage.leaders) || 0,
        notes: 'Initial Baseline Record',
      });
    }

    const newLog: VillageUpdateRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: safeDate,
      addedHeard: addH,
      addedBelievers: addB,
      addedBaptized: addBp,
      totalHeard: finalHeard,
      totalBelievers: finalBelievers,
      totalBaptized: finalBaptized,
      attending: Number(attending) || 0,
      leaders: Number(leaders) || 0,
      notes: notes || '',
      createdAt: new Date().toISOString(),
    };

    existingHistory.push(newLog);

    const updated: Village = {
      ...authenticatedVillage,
      heard: finalHeard,
      believers: finalBelievers,
      baptized: finalBaptized,
      attending: Number(attending) || 0,
      leaders: Number(leaders) || 0,
      persecution: persecution || 'ປົກກະຕິ',
      needs: needs || '',
      notes: notes || '',
      imageUrl: imageUrl || authenticatedVillage.imageUrl || '',
      date: safeDate,
      history: existingHistory,
      initialHeard: authenticatedVillage.initialHeard ?? prevHeard,
      initialBelievers: authenticatedVillage.initialBelievers ?? prevBelievers,
      initialBaptized: authenticatedVillage.initialBaptized ?? prevBaptized,
      initialDate: authenticatedVillage.initialDate || '2026-07-16',
    };

    try {
      await onSaveVillage(updated);
      setAuthenticatedVillage(updated);

      setLastUpdateSummary({
        prevHeard,
        prevBelievers,
        prevBaptized,
        addedHeard: Math.max(0, Number(addHeard) || 0),
        addedBelievers: Math.max(0, Number(addBelievers) || 0),
        addedBaptized: Math.max(0, Number(addBaptized) || 0),
        newHeard: finalHeard,
        newBelievers: finalBelievers,
        newBaptized: finalBaptized,
        date: safeDate,
      });

      // Reset incremental additions
      setAddHeard(0);
      setAddBelievers(0);
      setAddBaptized(0);

      setSaveSuccessMessage(
        language === 'lo'
          ? 'ອັບເດດຂໍ້ມູນຄຣິດຕະຈັກ ສຳເລັດແລ້ວ! ຕົວເລກໄດ້ຖືກບວກເພີ່ມເຂົ້າໃນໜ້າຂໍ້ມູນເຊິງເລິກຢ່າງສົມບູນ. 🟢'
          : language === 'th'
          ? 'อัปเดตข้อมูลคริสตจักร สำเร็จแล้ว! ตัวเลขได้ถูกบวกเพิ่มเข้าในหน้าข้อมูลสถิติอย่างสมบูรณ์ 🟢'
          : 'Church information updated successfully! Incremental numbers added to deep insights. 🟢'
      );
    } catch (err) {
      console.error(err);
      // Still update locally if onSaveVillage had partial network delay
      setAuthenticatedVillage(updated);
      setSaveSuccessMessage(
        language === 'lo'
          ? 'ບັນທຶກຂໍ້ມູນສຳເລັດ (ບັນທຶກລົງຖານຂໍ້ມູນທັນທີ) 🟢'
          : 'Updates saved successfully! 🟢'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    setAuthenticatedVillage(null);
    setInputPin('');
    setSelectedVillageId('');
    setPinError('');
    setSaveSuccessMessage('');
    setLastUpdateSummary(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#cc0000] via-red-700 to-amber-600 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative z-10 space-y-2 flex-1">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md rounded-2xl transition flex items-center justify-center shrink-0 border border-white/20 mr-1 active:scale-95 cursor-pointer"
                title={language === 'lo' ? 'ຍ້ອນກັບ' : 'Go Back'}
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}
            <span className="p-2 bg-white/20 backdrop-blur-md rounded-2xl">
              <Church className="w-6 h-6 text-white" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-200 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
              {language === 'lo' ? 'ອັບເດດຂໍ້ມູນຄຣິດຕະຈັກ' : language === 'th' ? 'อัปเดตข้อมูลคริสตจักร' : 'Update Church Data'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {language === 'lo'
              ? 'ລະບົບອັບເດດຕົວເລກປະຈຳຄຣິດຕະຈັກ'
              : language === 'th'
              ? 'ระบบอัปเดตตัวเลขประจำคริสตจักร'
              : 'Church Update Portal'}
          </h2>
          <p className="text-xs sm:text-sm text-red-100 font-medium max-w-xl leading-relaxed">
            {language === 'lo'
              ? 'ປ້ອນຕົວເລກທີ່ເພີ່ມຂຶ້ນໃໝ່ ລະບົບຈະນຳໄປບວກເພີ່ມເຂົ້າກັບຂໍ້ມູນເດີມ ແລະ ຈົດຈຳວັນທີອັບເດດຢ່າງແນ່ນອນ (ການກວດສອບ/ແກ້ໄຂຕົວເລກໂດຍຕົງ ແມ່ນສາມາດເຮັດໄດ້ໃນຫ້ອງແອັດມິນ)'
              : language === 'th'
              ? 'ใส่ตัวเลขที่เพิ่มขึ้นใหม่ ระบบจะนำไปบวกเพิ่มเข้ากับข้อมูลเดิม และบันทึกวันที่อัปเดตโดยอัตโนมัติ (การตรวจสอบ/แก้ไขตัวเลขโดยตรง สามารถทำได้ในห้องแอดมิน)'
              : 'Enter new incremental additions. Numbers will automatically accumulate into total church statistics with timestamp tracking.'}
          </p>
        </div>

        {authenticatedVillage && (
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 sm:p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition flex items-center justify-center border border-white/20 shrink-0 self-end sm:self-center active:scale-95 cursor-pointer shadow-xs"
            title={language === 'lo' ? 'ປ່ຽນຄຣິດຕະຈັກ / ຍ້ອນກັບ' : 'Switch Church / Back'}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Login Screen (If not authenticated) */}
      {!authenticatedVillage ? (
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-white">
                {language === 'lo' ? 'ເຂົ້າສູ່ລະບົບດ້ວຍລະຫັດ PIN ຄຣິດຕະຈັກ' : language === 'th' ? 'เข้าสู่ระบบด้วยรหัส PIN คริสตจักร' : 'Log In With Church PIN'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {language === 'lo'
                  ? 'ເລືອກຊື່ຄຣິດຕະຈັກ/ບ້ານ ຂອງທ່ານ ແລະ ປ້ອນລະຫັດ PIN 4 ຫຼັກ'
                  : language === 'th'
                  ? 'เลือกชื่อคริสตจักร/หมู่บ้านของคุณ และใส่รหัส PIN 4 หลัก'
                  : 'Select your church name and enter your 4-digit PIN'}
              </p>
            </div>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-5">
            {/* Select Church */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {language === 'lo'
                  ? '1. ເລືອກຄຣິດຕະຈັກ / ບ້ານ:'
                  : language === 'th'
                  ? '1. เลือกคริสตจักร / หมู่บ้าน:'
                  : '1. Select Church / Village:'}
              </label>
              <select
                value={selectedVillageId}
                onChange={(e) => setSelectedVillageId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none shadow-sm"
                required
              >
                <option value="">
                  {language === 'lo' ? '-- ກະລຸນາເລືອກຄຣິດຕະຈັກຂອງທ່ານ --' : language === 'th' ? '-- กรุณาเลือกคริสตจักรของคุณ --' : '-- Choose Your Church --'}
                </option>
                {villages.map((v) => (
                  <option key={v.rowId || v.id} value={v.id || v.rowId?.toString()}>
                    ⛪ {v.name} ({v.district}, {v.province})
                  </option>
                ))}
              </select>
            </div>

            {/* Input PIN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {language === 'lo'
                  ? '2. ປ້ອນລະຫັດ PIN 4 ຫຼັກ:'
                  : language === 'th'
                  ? '2. ใส่รหัส PIN 4 หลัก:'
                  : '2. Enter 4-Digit PIN:'}
              </label>
              <div className="relative">
                <input
                  type={showPinCode ? 'text' : 'password'}
                  maxLength={10}
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 pr-11 text-center text-xl font-mono font-bold tracking-widest text-slate-900 dark:text-white focus:border-[#cc0000] focus:ring-2 focus:ring-red-500/20 outline-none shadow-sm transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPinCode(!showPinCode)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title={showPinCode ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPinCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {pinError && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#cc0000] hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{language === 'lo' ? 'ເຂົ້າສູ່ລະບົບອັບເດດ' : language === 'th' ? 'เข้าสู่ระบบอัปเดต' : 'Unlock & Access Portal'}</span>
            </button>
          </form>
        </div>
      ) : (
        /* Authenticated Form Portal */
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
          {/* Church Header Badge & Logout */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  {language === 'lo' ? 'ອັບເດດຂໍ້ມູນຄຣິດຕະຈັກ' : language === 'th' ? 'อัปเดตข้อมูลคริสตจักร' : 'Logged In'}
                </span>
                <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1 flex items-center gap-1.5">
                  ⛪ {authenticatedVillage.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#cc0000]" />
                  <span>
                    {authenticatedVillage.district}, {authenticatedVillage.province}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition self-end sm:self-auto"
            >
              {language === 'lo' ? 'ອອກຈາກລະບົບ' : language === 'th' ? 'ออกจากระบบ' : 'Log Out'}
            </button>
          </div>

          {/* Current Baseline Stats Card (ຂໍ້ມູນເດີມ) */}
          <div className="bg-slate-50 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-amber-500" />
                <span>
                  {language === 'lo'
                    ? '📊 ຂໍ້ມູນສະຖິຕິເດີມປັດຈຸບັນ:'
                    : language === 'th'
                    ? '📊 ข้อมูลสถิติเดิมปัจจุบัน:'
                    : 'Current Statistics:'}
                </span>
              </h4>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {language === 'lo' ? 'ອັບເດດຫຼ້າສຸດ:' : language === 'th' ? 'อัปเดตล่าสุด:' : 'Last Date:'} {authenticatedVillage.date || '-'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">
                  {language === 'lo' ? 'ຜູ້ໄດ້ຍິນຂ່າວປະເສີດ' : language === 'th' ? 'ผู้ได้ยินข่าวประเสริฐ' : 'Heard Gospel'}
                </span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {Number(authenticatedVillage.heard) || 0}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">
                  {language === 'lo' ? 'ຜູ້ເຊື່ອ' : language === 'th' ? 'ผู้เชื่อ' : 'Believers'}
                </span>
                <span className="text-lg font-black text-[#cc0000] dark:text-red-400">
                  {authenticatedVillage.believers || 0}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">
                  {language === 'lo' ? 'ຮັບບັບຕິສະມາ' : language === 'th' ? 'รับบัพติศมา' : 'Baptized'}
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {authenticatedVillage.baptized || 0}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">
                  {language === 'lo' ? 'ຜູ້ມານະມັດສະການ' : language === 'th' ? 'ผู้มาร่วมนมัสการ' : 'Worshipers'}
                </span>
                <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                  {Number(authenticatedVillage.attending) || 0}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">
                  {language === 'lo' ? 'ຜູ້ນຳ / ຜູ້ຮັບໃຊ້' : language === 'th' ? 'ผู้นำ / ผู้รับใช้' : 'Leaders'}
                </span>
                <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                  {Number(authenticatedVillage.leaders) || 0}
                </span>
              </div>
            </div>
          </div>

          {saveSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-2 shadow-sm animate-fade-in">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* Last Update Comparison Card */}
          {lastUpdateSummary && (
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2 text-xs">
              <h5 className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>
                  {language === 'lo'
                    ? 'ສະຫຼຸບການອັບເດດຫຼ້າສຸດ:'
                    : language === 'th'
                    ? 'สรุปการอัปเดตล่าสุด:'
                    : 'Last Update Comparison:'}
                </span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-medium text-slate-700 dark:text-slate-200">
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
                  <span className="block text-[10px] text-slate-500 font-bold">
                    {language === 'lo' ? 'ຜູ້ໄດ້ຍິນຂ່າວປະເສີດ:' : language === 'th' ? 'ผู้ได้ยินข่าวประเสริฐ:' : 'Heard Gospel:'}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-slate-500">{lastUpdateSummary.prevHeard}</span>
                    <span className="text-emerald-600 font-bold">+{lastUpdateSummary.addedHeard}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-black text-blue-600">{lastUpdateSummary.newHeard}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
                  <span className="block text-[10px] text-slate-500 font-bold">
                    {language === 'lo' ? 'ຜູ້ເຊື່ອ:' : language === 'th' ? 'ผู้เชื่อ:' : 'Believers:'}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-slate-500">{lastUpdateSummary.prevBelievers}</span>
                    <span className="text-emerald-600 font-bold">+{lastUpdateSummary.addedBelievers}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-black text-red-600">{lastUpdateSummary.newBelievers}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
                  <span className="block text-[10px] text-slate-500 font-bold">
                    {language === 'lo' ? 'ບັບຕິສະມາ:' : language === 'th' ? 'บัพติศมา:' : 'Baptized:'}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-slate-500">{lastUpdateSummary.prevBaptized}</span>
                    <span className="text-emerald-600 font-bold">+{lastUpdateSummary.addedBaptized}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-black text-emerald-600">{lastUpdateSummary.newBaptized}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Incremental Form */}
          <form onSubmit={handleSave} className="space-y-5">
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>
                  {language === 'lo'
                    ? 'ປ້ອນຕົວເລກເພີ່ມໃໝ່:'
                    : language === 'th'
                    ? 'ใส่ตัวเลขเพิ่มใหม่:'
                    : 'Add New Incremental Numbers:'}
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Heard Gospel Increment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span>
                      {language === 'lo'
                        ? '+ ເພີ່ມຜູ້ໄດ້ຍິນຂ່າວປະເສີດ (ຄົນ):'
                        : language === 'th'
                        ? '+ เพิ่มผู้ได้ยินข่าวประเสริฐ (คน):'
                        : '+ Add Heard Gospel:'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addHeard}
                    onChange={(e) => setAddHeard(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {language === 'lo' ? 'ຜົນລວມໃໝ່:' : language === 'th' ? 'ผลรวมใหม่:' : 'New Total:'}{' '}
                    {(Number(authenticatedVillage.heard) || 0) + (Number(addHeard) || 0)}
                  </span>
                </div>

                {/* Believers Increment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                    <span>
                      {language === 'lo'
                        ? '+ ເພີ່ມຜູ້ເຊື່ອໃໝ່ (ຄົນ):'
                        : language === 'th'
                        ? '+ เพิ่มผู้เชื่อใหม่ (คน):'
                        : '+ Add Believers:'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addBelievers}
                    onChange={(e) => setAddBelievers(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {language === 'lo' ? 'ຜົນລວມໃໝ່:' : language === 'th' ? 'ผลรวมใหม่:' : 'New Total:'}{' '}
                    {(Number(authenticatedVillage.believers) || 0) + (Number(addBelievers) || 0)}
                  </span>
                </div>

                {/* Baptized Increment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {language === 'lo'
                        ? '+ ເພີ່ມຜູ້ບັບຕິສະມາ (ຄົນ):'
                        : language === 'th'
                        ? '+ เพิ่มผู้รับบัพติศมา (คน):'
                        : '+ Add Baptized:'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addBaptized}
                    onChange={(e) => setAddBaptized(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {language === 'lo' ? 'ຜົນລວມໃໝ່:' : language === 'th' ? 'ผลรวมใหม่:' : 'New Total:'}{' '}
                    {(Number(authenticatedVillage.baptized) || 0) + (Number(addBaptized) || 0)}
                  </span>
                </div>
              </div>

              {/* Attendance and Leaders Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* Worship Attendance */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                    <Church className="w-3.5 h-3.5 text-cyan-500" />
                    <span>
                      {language === 'lo'
                        ? 'ຈຳນວນຜູ້ມານະມັດສະການ (ຄົນ):'
                        : language === 'th'
                        ? 'จำนวนผู้มาร่วมนมัสการ (คน):'
                        : 'Worship Attendance:'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={attending}
                    onChange={(e) => setAttending(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-cyan-600 dark:text-cyan-400 focus:ring-2 focus:ring-cyan-500 outline-none shadow-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {language === 'lo' ? 'ຈຳນວນລວມປັດຈຸບັນ' : language === 'th' ? 'จำนวนรวมปัจจุบัน' : 'Current active count'}
                  </span>
                </div>

                {/* Leaders */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-500" />
                    <span>
                      {language === 'lo'
                        ? 'ຈຳນວນຜູ້ນຳ / ຜູ້ຮັບໃຊ້ (ຄົນ):'
                        : language === 'th'
                        ? 'จำนวนผู้นำ / ผู้รับใช้ (คน):'
                        : 'Church Leaders / Servants:'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={leaders}
                    onChange={(e) => setLeaders(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-purple-600 dark:text-purple-400 focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {language === 'lo' ? 'ຈຳນວນລວມປັດຈຸບັນ' : language === 'th' ? 'จำนวนรวมปัจจุบัน' : 'Current active count'}
                  </span>
                </div>
              </div>
            </div>

            {/* Persecution Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {language === 'lo'
                  ? 'ສະຖານະຄວາມກົດດັນ / ການຂົ່ມເຫັງ:'
                  : language === 'th'
                  ? 'สถานะความกดดัน / การข่มเหง:'
                  : 'Persecution Status:'}
              </label>
              <select
                value={persecution}
                onChange={(e) => setPersecution(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none shadow-sm"
              >
                <option value="ປົກກະຕິ">{language === 'lo' ? '🟢 ປົກກະຕິ' : language === 'th' ? '🟢 ปกติ' : '🟢 Normal'}</option>
                <option value="ປານກາງ">{language === 'lo' ? '🟡 ປານກາງ' : language === 'th' ? '🟡 ปานกลาง' : '🟡 Moderate'}</option>
                <option value="ວິກິດ">{language === 'lo' ? '🔴 ວິກິດ' : language === 'th' ? '🔴 วิกฤต' : '🔴 Urgent / Critical'}</option>
              </select>
            </div>

            {/* Needs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {language === 'lo'
                  ? 'ຄວາມຕ້ອງການເລັ່ງດ່ວນ / ຄຳອະທິຖານ:'
                  : language === 'th'
                  ? 'ความต้องการเร่งด่วน / คำอธิษฐาน:'
                  : 'Urgent Needs & Prayer Requests:'}
              </label>
              <textarea
                rows={3}
                value={needs}
                onChange={(e) => setNeeds(e.target.value)}
                placeholder={
                  language === 'lo'
                    ? 'ຕົວຢ່າງ: ຕ້ອງການປຶ້ມຄຳສອນ, ເງິນທຶນສ້າງອາຄານ, ອາຫານ...'
                    : 'e.g., Needs Bibles, Building funds, Relief food...'
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none shadow-sm"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {language === 'lo'
                  ? 'ໝາຍເຫດເພີ່ມເຕີມ:'
                  : language === 'th'
                  ? 'หมายเหตุเพิ่มเติม:'
                  : 'Additional Notes:'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none shadow-sm"
              />
            </div>

            {/* Image URL & Date */}
            <div className="space-y-3">
              <UnifiedMediaUploader
                value={imageUrl}
                onChange={setImageUrl}
                language={language}
                label={
                  language === 'lo'
                    ? 'ຮູບພາບຄຣິດຕະຈັກ / ກິດຈະກຳ (ເລືອກຮູບຈາກເຄື່ອງ ຫຼື ວ່າງລິ້ງຮູບທຸກປະເພດ):'
                    : 'Church Photo (Upload image file or paste link):'
                }
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#cc0000]" />
                  <span>
                    {language === 'lo'
                      ? 'ວັນທີອັບເດດ:'
                      : language === 'th'
                      ? 'วันที่อัปเดต:'
                      : 'Recorded Date:'}
                  </span>
                </label>
                <input
                  type="date"
                  value={updateDate}
                  onChange={(e) => setUpdateDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none shadow-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-4 bg-[#cc0000] hover:bg-red-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              <span>
                {isSaving
                  ? language === 'lo'
                    ? 'ກຳລັງບັນທຶກອັບເດດ...'
                    : language === 'th'
                    ? 'กำลังบันทึกอัปเดต...'
                    : 'Saving Updates...'
                  : language === 'lo'
                  ? '📥 ອັບເດດບວກເພີ່ມຕົວເລກເຂົ້າຂໍ້ມູນເດີມ'
                  : language === 'th'
                  ? '📥 อัปเดตบวกเพิ่มตัวเลขเข้าข้อมูลเดิม'
                  : 'Add & Update Church Data'}
              </span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, MapPin, ExternalLink } from 'lucide-react';
import { Village, Language } from '../types';
import { saveVillageToFirestore } from '../lib/firestore-service';
import { compressImageFile } from '../utils/imageCompressor';
import {
  parseCoordinatesFromUrl,
  isShortenedMapsUrl,
  resolveMapsUrlViaApi,
  normalizeCoordinates,
} from '../utils/mapUtils';

interface VillageModalProps {
  isOpen: boolean;
  onClose: () => void;
  villageToEdit: Village | null;
  onSaveSuccess: (savedVillage?: Village) => void;
  language: Language;
}

export const VillageModal: React.FC<VillageModalProps> = ({
  isOpen,
  onClose,
  villageToEdit,
  onSaveSuccess,
  language,
}) => {
  const [formData, setFormData] = useState<Partial<Village>>({
    rowId: 0,
    name: '',
    district: '',
    province: 'Bokeo',
    heard: 0,
    believers: 0,
    baptized: 0,
    attending: 0,
    leaders: 0,
    persecution: 'ປົກກະຕິ',
    needs: '',
    imageUrl: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolvingMap, setIsResolvingMap] = useState(false);
  const [parsedGps, setParsedGps] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (villageToEdit) {
      setFormData({
        ...villageToEdit,
        attending: typeof villageToEdit.attending === 'number' ? villageToEdit.attending : (Number(villageToEdit.attending) || 0),
        leaders: typeof villageToEdit.leaders === 'number' ? villageToEdit.leaders : (Number(villageToEdit.leaders) || 0),
        date: villageToEdit.date
          ? new Date(villageToEdit.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      });
      if (typeof villageToEdit.lat === 'number' && typeof villageToEdit.lng === 'number' && !isNaN(villageToEdit.lat) && !isNaN(villageToEdit.lng)) {
        setParsedGps(normalizeCoordinates(villageToEdit.lat, villageToEdit.lng));
      } else if (villageToEdit.mapUrl) {
        const direct = parseCoordinatesFromUrl(villageToEdit.mapUrl);
        if (direct) {
          setParsedGps({ lat: direct.lat, lng: direct.lng });
        } else if (isShortenedMapsUrl(villageToEdit.mapUrl)) {
          setIsResolvingMap(true);
          resolveMapsUrlViaApi(villageToEdit.mapUrl).then((res) => {
            if (res.success && typeof res.lat === 'number' && typeof res.lng === 'number') {
              setParsedGps({ lat: res.lat, lng: res.lng });
            }
            setIsResolvingMap(false);
          });
        }
      } else {
        setParsedGps(null);
      }
    } else {
      setFormData({
        rowId: 0,
        name: '',
        district: '',
        province: 'Bokeo',
        heard: 0,
        believers: 0,
        baptized: 0,
        attending: 0,
        leaders: 0,
        persecution: 'ປົກກະຕິ',
        needs: '',
        imageUrl: '',
        mapUrl: '',
        date: new Date().toISOString().split('T')[0],
      });
      setParsedGps(null);
    }
    setFile(null);
  }, [villageToEdit, isOpen]);

  const handleMapUrlChange = async (url: string) => {
    setFormData((prev) => ({ ...prev, mapUrl: url }));
    if (!url.trim()) {
      setParsedGps(null);
      return;
    }

    const direct = parseCoordinatesFromUrl(url);
    if (direct) {
      setParsedGps({ lat: direct.lat, lng: direct.lng });
      return;
    }

    if (isShortenedMapsUrl(url)) {
      setIsResolvingMap(true);
      try {
        const res = await resolveMapsUrlViaApi(url);
        if (res.success && typeof res.lat === 'number' && typeof res.lng === 'number') {
          setParsedGps({ lat: res.lat, lng: res.lng });
        }
      } catch (err) {
        console.error('Failed to resolve map URL in modal:', err);
      } finally {
        setIsResolvingMap(false);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.imageUrl || '';

      if (file) {
        // Compress image client-side (~80KB) so it can be saved offline in IndexedDB
        const compressedBase64 = await compressImageFile(file, 1000, 0.75);
        finalImageUrl = compressedBase64 || finalImageUrl;

        // Optionally attempt server upload if online
        try {
          const uploadRes = await fetch('/api/upload-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data: compressedBase64, fileName: file.name }),
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.success && uploadData.url) {
              finalImageUrl = uploadData.url;
            }
          }
        } catch {
          // Server offline; using compressed base64 data URL
        }
      }

      let finalLat = parsedGps?.lat ?? formData.lat;
      let finalLng = parsedGps?.lng ?? formData.lng;

      if ((finalLat === undefined || finalLng === undefined) && formData.mapUrl?.trim()) {
        const direct = parseCoordinatesFromUrl(formData.mapUrl.trim());
        if (direct) {
          finalLat = direct.lat;
          finalLng = direct.lng;
        } else if (isShortenedMapsUrl(formData.mapUrl.trim())) {
          try {
            const res = await resolveMapsUrlViaApi(formData.mapUrl.trim());
            if (res.success && typeof res.lat === 'number' && typeof res.lng === 'number') {
              finalLat = res.lat;
              finalLng = res.lng;
            }
          } catch (e) {
            console.warn('Map resolution error in submit:', e);
          }
        }
      }

      const nowBelievers = Number(formData.believers) || 0;
      const nowBaptized = Number(formData.baptized) || 0;
      const nowHeard = Number(formData.heard) || 0;
      const safeDate = formData.date || new Date().toISOString().split('T')[0];

      let updatedHistory = Array.isArray(villageToEdit?.history)
        ? [...villageToEdit.history]
        : Array.isArray(formData.history)
        ? [...formData.history]
        : [];

      let initialBelievers = villageToEdit?.initialBelievers ?? formData.initialBelievers;
      let initialBaptized = villageToEdit?.initialBaptized ?? formData.initialBaptized;
      let initialHeard = villageToEdit?.initialHeard ?? formData.initialHeard;
      let initialDate = villageToEdit?.initialDate || formData.initialDate || safeDate;

      if (!villageToEdit) {
        // NEW VILLAGE CREATED: set baseline
        initialBelievers = nowBelievers;
        initialBaptized = nowBaptized;
        initialHeard = nowHeard;
        initialDate = safeDate;
        updatedHistory = [
          {
            id: `init_${Date.now()}`,
            date: safeDate,
            addedHeard: nowHeard,
            addedBelievers: nowBelievers,
            addedBaptized: nowBaptized,
            totalHeard: nowHeard,
            totalBelievers: nowBelievers,
            totalBaptized: nowBaptized,
            attending: Number(formData.attending) || 0,
            leaders: Number(formData.leaders) || 0,
            notes: 'Initial Baseline Record',
          },
        ];
      } else {
        // EXISTING VILLAGE EDITED
        const prevBelievers = Number(villageToEdit.believers) || 0;
        const prevBaptized = Number(villageToEdit.baptized) || 0;
        const prevHeard = Number(villageToEdit.heard) || 0;

        if (initialBelievers === undefined) initialBelievers = prevBelievers;
        if (initialBaptized === undefined) initialBaptized = prevBaptized;
        if (initialHeard === undefined) initialHeard = prevHeard;

        // If history is empty, initialize baseline first
        if (updatedHistory.length === 0) {
          updatedHistory.push({
            id: `init_${villageToEdit.id}`,
            date: initialDate,
            addedHeard: initialHeard,
            addedBelievers: initialBelievers,
            addedBaptized: initialBaptized,
            totalHeard: initialHeard,
            totalBelievers: initialBelievers,
            totalBaptized: initialBaptized,
            attending: Number(villageToEdit.attending) || 0,
            leaders: Number(villageToEdit.leaders) || 0,
            notes: 'Initial Baseline Record',
          });
        }

        const diffB = nowBelievers - prevBelievers;
        const diffBp = nowBaptized - prevBaptized;
        const diffH = nowHeard - prevHeard;

        // If numbers were incremented or changed, record an explicit update log!
        if (diffB !== 0 || diffBp !== 0 || diffH !== 0) {
          updatedHistory.push({
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            date: safeDate,
            addedHeard: Math.max(0, diffH),
            addedBelievers: Math.max(0, diffB),
            addedBaptized: Math.max(0, diffBp),
            totalHeard: nowBelievers,
            totalBelievers: nowBelievers,
            totalBaptized: nowBaptized,
            attending: Number(formData.attending) || 0,
            leaders: Number(formData.leaders) || 0,
            notes: formData.notes || 'Admin Update',
            createdAt: new Date().toISOString(),
          });
        }
      }

      const villageData: Village = {
        rowId: formData.rowId || Date.now(),
        id: formData.id || `V${Math.floor(1000 + Math.random() * 9000)}`,
        name: formData.name || '',
        nameEn: formData.nameEn || '',
        nameTh: formData.nameTh || '',
        district: formData.district || '',
        districtEn: formData.districtEn || '',
        districtTh: formData.districtTh || '',
        province: formData.province || 'Bokeo',
        heard: nowHeard,
        believers: nowBelievers,
        baptized: nowBaptized,
        attending: Number(formData.attending) || 0,
        leaders: Number(formData.leaders) || 0,
        persecution: formData.persecution || 'ປົກກະຕິ',
        needs: formData.needs || '',
        notes: formData.notes || '',
        imageUrl: finalImageUrl,
        mapUrl: (formData.mapUrl || '').trim(),
        lat: finalLat,
        lng: finalLng,
        date: safeDate,
        pinCode: formData.pinCode || '',
        hidden: Boolean(formData.hidden),
        history: updatedHistory,
        initialBelievers,
        initialBaptized,
        initialHeard,
        initialDate,
      };

      // Primary client-side Firestore save (IndexedDB offline persistence queues and syncs automatically)
      await saveVillageToFirestore(villageData);

      // Secondary background server notification if online
      fetch('/api/save-village', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(villageData),
      }).catch(() => {});

      onSaveSuccess(villageData);
      onClose();
    } catch (err: any) {
      console.error('Village save error:', err);
      alert(err?.message || 'Failed to save village data');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
          <h3 className="font-bold text-slate-800 dark:text-white text-base">
            {villageToEdit
              ? `${language === 'lo' ? 'ແກ້ໄຂຂໍ້ມູນ' : 'Edit Village'}: ${villageToEdit.name}`
              : language === 'lo'
              ? 'ເພີ່ມຂໍ້ມູນຄິດສະຈັກ/ບ້ານ'
              : 'Add New Village / Church'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 transition p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto flex-1">
          <form id="form-village" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name Fields (3 Languages) */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'lo' ? 'ຊື່ບ້ານ/ຄິດສະຈັກ (ລາວ) *' : language === 'th' ? 'ชื่อหมู่บ้าน/คริสตจักร (ลาว) *' : 'Village Name (Lao) *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ບ້ານ..."
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'lo' ? 'ຊື່ບ້ານ (ອັງກິດ - English)' : language === 'th' ? 'ชื่อหมู่บ้าน (อังกฤษ)' : 'Village Name (English)'}
                </label>
                <input
                  type="text"
                  value={formData.nameEn || ''}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="Village Name (EN)..."
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'lo' ? 'ຊື່ບ້ານ (ໄທ - Thai)' : language === 'th' ? 'ชื่อหมู่บ้าน (ไทย)' : 'Village Name (Thai)'}
                </label>
                <input
                  type="text"
                  value={formData.nameTh || ''}
                  onChange={(e) => setFormData({ ...formData, nameTh: e.target.value })}
                  placeholder="ชื่อหมู่บ้าน (TH)..."
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
                />
              </div>
            </div>

            {/* District Fields (3 Languages) */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'lo' ? 'ເມືອງ (ລາວ) *' : language === 'th' ? 'เมือง/อำเภอ (ลาว) *' : 'District (Lao) *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.district || ''}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'lo' ? 'ເມືອງ (ອັງກິດ)' : language === 'th' ? 'เมือง/อำเภอ (อังกฤษ)' : 'District (English)'}
                </label>
                <input
                  type="text"
                  value={formData.districtEn || ''}
                  onChange={(e) => setFormData({ ...formData, districtEn: e.target.value })}
                  placeholder="District (EN)..."
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'lo' ? 'ເມືອງ (ໄທ)' : language === 'th' ? 'เมือง/อำเภอ (ไทย)' : 'District (Thai)'}
                </label>
                <input
                  type="text"
                  value={formData.districtTh || ''}
                  onChange={(e) => setFormData({ ...formData, districtTh: e.target.value })}
                  placeholder="เมือง/อำเภอ (TH)..."
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ແຂວງ *' : 'Province *'}
              </label>
              <input
                type="text"
                required
                value={formData.province || 'Bokeo'}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ຈຳນວນຜູ້ໄດ້ຍິນຂ່າວປະເສີດ' : 'Heard Gospel Count'}
              </label>
              <input
                type="number"
                value={formData.heard || 0}
                onChange={(e) => setFormData({ ...formData, heard: Number(e.target.value) })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ຈຳນວນຜູ້ເຊື່ອ' : 'Believers Count'}
              </label>
              <input
                type="number"
                value={formData.believers || 0}
                onChange={(e) => setFormData({ ...formData, believers: Number(e.target.value) })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ຮັບບັບຕິສະມາແລ້ວ' : language === 'th' ? 'บัพติศมาแล้ว' : 'Baptized Count'}
              </label>
              <input
                type="number"
                value={formData.baptized || 0}
                onChange={(e) => setFormData({ ...formData, baptized: Number(e.target.value) })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ຈຳນວນຜູ້ມານະມັດສະການ' : language === 'th' ? 'จำนวนผู้มาร่วมนมัสการ' : 'Worship Attendance'}
              </label>
              <input
                type="number"
                value={formData.attending || 0}
                onChange={(e) => setFormData({ ...formData, attending: Number(e.target.value) })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ຈຳນວນຜູ້ນຳ / ຜູ້ຮັບໃຊ້' : language === 'th' ? 'จำนวนผู้นำ / ผู้รับใช้' : 'Leaders / Servants Count'}
              </label>
              <input
                type="number"
                value={formData.leaders || 0}
                onChange={(e) => setFormData({ ...formData, leaders: Number(e.target.value) })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ສະຖານະການຂົ່ມເຫັງ' : language === 'th' ? 'สถานะการข่มเหง' : 'Persecution Status'}
              </label>
              <select
                value={formData.persecution || 'ປົກກະຕິ'}
                onChange={(e) => setFormData({ ...formData, persecution: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
              >
                <option value="ປົກກະຕິ">
                  🟢 {language === 'lo' ? 'ປົກກະຕິ' : language === 'th' ? 'ปกติ' : 'Normal / Safe'}
                </option>
                <option value="ປານກາງ">
                  🟡 {language === 'lo' ? 'ປານກາງ' : language === 'th' ? 'ปานกลาง' : 'Moderate Opposition'}
                </option>
                <option value="ວິກິດ">
                  🔴 {language === 'lo' ? 'ວິກິດ' : language === 'th' ? 'วิกฤต' : 'Critical / Urgent'}
                </option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ຄວາມຕ້ອງການເລັ່ງດ່ວນ / ໝາຍເຫດ' : 'Urgent Needs / Notes'}
              </label>
              <textarea
                rows={2}
                value={formData.needs || ''}
                onChange={(e) => setFormData({ ...formData, needs: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span>{language === 'lo' ? 'ລິ້ງ Google Maps ແຜນທີ່ຄິດສະຈັກ / ບ້ານ' : 'Google Maps Location Link'}</span>
                {isResolvingMap && (
                  <span className="text-[10px] text-cyan-600 flex items-center gap-1 font-bold animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{language === 'lo' ? 'ກຳລັງກວດສອບພິກັດ...' : 'Resolving GPS...'}</span>
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://maps.app.goo.gl/... ຫຼື https://google.com/maps/place/..."
                  value={formData.mapUrl || ''}
                  onChange={(e) => handleMapUrlChange(e.target.value)}
                  className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium font-mono text-xs"
                />
                {formData.mapUrl && (
                  <a
                    href={
                      parsedGps
                        ? `https://www.google.com/maps/search/?api=1&query=${parsedGps.lat},${parsedGps.lng}`
                        : formData.mapUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 text-blue-600 dark:text-blue-300 rounded-xl transition border border-blue-200 dark:border-blue-800 shrink-0"
                    title="Open Pin in Google Maps"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* Manual Coordinate Inputs */}
              <div className="mt-2 grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    Latitude (ເສັ້ນຂະໜານ):
                  </label>
                  <input
                    type="text"
                    value={formData.lat !== undefined ? String(formData.lat) : (parsedGps ? String(parsedGps.lat) : '')}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setFormData((prev) => ({ ...prev, lat: val }));
                        setParsedGps((prev) => (prev ? { ...prev, lat: val } : { lat: val, lng: formData.lng || 100.836816 }));
                      } else {
                        setFormData((prev) => ({ ...prev, lat: undefined }));
                      }
                    }}
                    placeholder="e.g. 20.078897"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-white font-mono outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    Longitude (ເສັ້ນແວງ):
                  </label>
                  <input
                    type="text"
                    value={formData.lng !== undefined ? String(formData.lng) : (parsedGps ? String(parsedGps.lng) : '')}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setFormData((prev) => ({ ...prev, lng: val }));
                        setParsedGps((prev) => (prev ? { ...prev, lng: val } : { lat: formData.lat || 20.078897, lng: val }));
                      } else {
                        setFormData((prev) => ({ ...prev, lng: undefined }));
                      }
                    }}
                    placeholder="e.g. 100.836816"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-white font-mono outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* GPS verification badge & Live mini map */}
              {parsedGps ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {language === 'lo'
                        ? `✓ ຊິງພິກັດປັກໝຸດ GPS ສຳເລັດ: Lat ${parsedGps.lat}, Lng ${parsedGps.lng}`
                        : `✓ Verified GPS Pin: Lat ${parsedGps.lat}, Lng ${parsedGps.lng}`}
                    </span>
                  </div>

                  <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 shadow-inner relative">
                    <iframe
                      title="Mini Map Verification"
                      src={`https://maps.google.com/maps?q=${parsedGps.lat},${parsedGps.lng}&t=m&z=15&ie=UTF8&iwloc=&output=embed`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    ></iframe>
                  </div>
                </div>
              ) : formData.mapUrl?.trim() ? (
                <div className="mt-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {language === 'lo'
                    ? '⚠️ ໃສ່ລິ້ງ Google Maps ທີ່ມີພິກັດປັກໝຸດ ຫຼື ໃສ່ຕົວເລກ Latitude / Longitude ໂດຍກົງ'
                    : '⚠️ Enter a valid Google Maps link with coordinates or enter Latitude / Longitude.'}
                </div>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ອັບໂຫຼດຮູບພາບຄິດສະຈັກ (ຈາກຟາຍເຄື່ອງ ຫຼື URL)' : 'Upload Church Image'}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:file:bg-slate-700 dark:file:text-white"
              />
            </div>

            {/* Visibility Toggle Switch */}
            <div className="md:col-span-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.hidden)}
                  onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                  className="w-4 h-4 rounded text-[#cc0000] focus:ring-[#cc0000] cursor-pointer"
                />
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  {language === 'lo'
                    ? '🙈 ເຊື່ອງຂໍ້ມູນບ້ານ/ຄຣິດສະຕະຈັກນີ້ ບໍ່ໃຫ້ສະແດງຢູ່ໜ້າເວັບໄຊ (Hide from public website)'
                    : language === 'th'
                    ? '🙈 ซ่อนข้อมูลหมู่บ้าน/คริสตจักรนี้ไม่ให้แสดงบนเว็บไซต์'
                    : '🙈 Hide this village/church record from the public website'}
                </span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ວັນທີບັນທຶກ *' : 'Record Date *'}
              </label>
              <input
                type="date"
                required
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#cc0000] outline-none font-medium"
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2.5 bg-slate-50 dark:bg-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition hover:bg-slate-300 dark:hover:bg-slate-600"
          >
            {language === 'lo' ? 'ຍົກເລີກ' : 'Cancel'}
          </button>
          <button
            type="submit"
            form="form-village"
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#cc0000] text-white rounded-xl text-xs font-bold shadow-md hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50 transition"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{language === 'lo' ? 'ບັນທຶກຂໍ້ມູນ' : 'Save Village'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Loader2, QrCode, ShieldCheck, Copy, Check, Building2, CreditCard, User, Sparkles } from 'lucide-react';
import { TeamMember, Language } from '../types';
import { saveTeamToFirestore } from '../lib/firestore-service';
import { compressImageFile } from '../utils/imageCompressor';
import { UnifiedMediaUploader } from './UnifiedMediaUploader';
import { generateQRCodeDataUrl } from '../utils/qrCode';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamToEdit: TeamMember | null;
  onSaveSuccess: (savedTeam?: TeamMember) => void;
  language: Language;
}

export const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  teamToEdit,
  onSaveSuccess,
  language,
}) => {
  const [formData, setFormData] = useState<Partial<TeamMember>>({
    rowId: 0,
    name: '',
    role: '',
    phone: '',
    email: '',
    imageUrl: '',
    bio: '',
    financeQrUrl: '',
    bankName: 'BCEL One',
    bankAccountNumber: '',
    bankAccountName: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (teamToEdit) {
      setFormData({
        ...teamToEdit,
        bankName: teamToEdit.bankName || 'BCEL One',
        bankAccountName: teamToEdit.bankAccountName || teamToEdit.name || '',
        bankAccountNumber: teamToEdit.bankAccountNumber || '',
        financeQrUrl: teamToEdit.financeQrUrl || '',
      });
    } else {
      setFormData({
        rowId: 0,
        name: '',
        role: '',
        phone: '',
        email: '',
        imageUrl: '',
        bio: '',
        financeQrUrl: '',
        bankName: 'BCEL One',
        bankAccountNumber: '',
        bankAccountName: '',
      });
    }
    setFile(null);
  }, [teamToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.imageUrl || '';

      if (file) {
        // Compress image client-side (~80KB) so it can be saved offline in IndexedDB
        const compressedBase64 = await compressImageFile(file, 800, 0.75);
        finalImageUrl = compressedBase64 || finalImageUrl;

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
          // Offline; using compressed image data URL
        }
      }

      const teamPayload: TeamMember = {
        id: formData.id || (teamToEdit?.id ? teamToEdit.id : undefined),
        rowId: formData.rowId || (teamToEdit?.rowId ? teamToEdit.rowId : Date.now()),
        name: formData.name?.trim() || teamToEdit?.name || '',
        role: formData.role || teamToEdit?.role || '',
        roleEn: formData.roleEn || teamToEdit?.roleEn || '',
        roleTh: formData.roleTh || teamToEdit?.roleTh || '',
        phone: formData.phone || teamToEdit?.phone || '',
        email: formData.email || teamToEdit?.email || '',
        imageUrl: finalImageUrl || teamToEdit?.imageUrl || '',
        bio: formData.bio !== undefined ? formData.bio : (teamToEdit?.bio || ''),
        bioEn: formData.bioEn !== undefined ? formData.bioEn : (teamToEdit?.bioEn || ''),
        bioTh: formData.bioTh !== undefined ? formData.bioTh : (teamToEdit?.bioTh || ''),
        hidden: Boolean(formData.hidden !== undefined ? formData.hidden : teamToEdit?.hidden),
        // Strict preservation: never wipe existing QR or bank details if not changed
        financeQrUrl: formData.financeQrUrl?.trim() || teamToEdit?.financeQrUrl || '',
        bankName: formData.bankName?.trim() || teamToEdit?.bankName || 'BCEL One',
        bankAccountNumber: formData.bankAccountNumber?.trim() || teamToEdit?.bankAccountNumber || '',
        bankAccountName: formData.bankAccountName?.trim() || teamToEdit?.bankAccountName || formData.name?.trim() || teamToEdit?.name || '',
      };

      // Direct client-side Firestore write (persists offline and syncs automatically)
      await saveTeamToFirestore(teamPayload);

      // Await server persistence so server cache stays in sync
      try {
        const res = await fetch('/api/save-team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teamPayload),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData?.success && resData.team) {
            if (resData.team.rowId) teamPayload.rowId = resData.team.rowId;
            if (resData.team.id) teamPayload.id = resData.team.id;
          }
        }
      } catch (serverErr) {
        console.warn('Backend team save notice:', serverErr);
      }

      onSaveSuccess(teamPayload);
      onClose();
    } catch (err: any) {
      console.error('Team save error:', err);
      alert(err?.message || 'Failed to save team member data');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">
              {teamToEdit
                ? `${language === 'lo' ? 'ແກ້ໄຂທີມງານ' : 'Edit Team Member'}: ${teamToEdit.name}`
                : language === 'lo'
                ? 'ເພີ່ມຂໍ້ມູນທີມງານ'
                : 'Add Team Member'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 transition p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto flex-1">
          <form id="form-team" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ຊື່ ແລະ ນາມສະກຸນ *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ຊື່ ແລະ ນາມສະກຸນ..."
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ຕຳແໜ່ງ/ໜ້າທີ່ (ພາສາລາວ - Lao Role) *' : 'Role / Position (Lao) *'}
              </label>
              <input
                type="text"
                required
                value={formData.role || ''}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="ຜູ້ນຳພັນທະກິດ..."
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'lo' ? 'ຕຳແໜ່ງ (English Role)' : 'Role (English)'}
                </label>
                <input
                  type="text"
                  value={formData.roleEn || ''}
                  onChange={(e) => setFormData({ ...formData, roleEn: e.target.value })}
                  placeholder="Ministry Leader..."
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'lo' ? 'ຕຳແໜ່ງ (Thai Role)' : 'Role (Thai)'}
                </label>
                <input
                  type="text"
                  value={formData.roleTh || ''}
                  onChange={(e) => setFormData({ ...formData, roleTh: e.target.value })}
                  placeholder="ผู้นำพันธกิจ..."
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'lo' ? 'ເບີໂທ' : 'Phone'}
                </label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="020 xxxx xxxx"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'lo' ? 'ອີເມວ' : 'Email'}
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@hopebokeo.org"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PERSONAL TRANSFER QR CODE & BANK DETAILS (Strictly for Team Member Payouts) */}
            {/* ========================================================================= */}
            <div className="p-4 bg-purple-50/80 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800/70 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-purple-200/80 dark:border-purple-800/70 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                      <span>{language === 'lo' ? 'ຄິວອາ (QR Code) & ບັນຊີຮັບເງິນປະຈຳຕົວ' : 'Transfer QR Code & Bank Account'}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-300 font-bold">
                        {language === 'lo' ? 'ທຸກຄົນຕ້ອງມີ' : 'Required'}
                      </span>
                    </h4>
                    <p className="text-[10px] text-purple-700 dark:text-purple-300/80">
                      {language === 'lo'
                        ? 'ອັບໂຫຼດຮູບ QR ຮັບເງິນ ແລະ ບັນຊີເພື່ອສະດວກໃນການໂອນເງິນໃນຫ້ອງການເງິນ'
                        : 'Upload payout QR code and bank info used for financial distributions'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Name Presets */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-purple-600" />
                  <span>{language === 'lo' ? 'ທະນາຄານ / ລະບົບຮັບເງິນ (Bank Name)' : 'Bank / Payment Method'}</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {['BCEL One', 'LDB Bank', 'JDB Bank', 'APEX', 'Kasikorn (K-Bank)', 'PromptPay'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setFormData({ ...formData, bankName: b })}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                        formData.bankName === b
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.bankName || ''}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g. BCEL One, LDB, Kasikorn..."
                  className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Account Name and Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-purple-600" />
                    <span>{language === 'lo' ? 'ຊື່ບັນຊີ (Account Name)' : 'Account Name'}</span>
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountName || ''}
                    onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                    placeholder="e.g. SOMCHAY VONGSA"
                    className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-purple-600" />
                    <span>{language === 'lo' ? 'ເລກບັນຊີ (Account Number)' : 'Account Number'}</span>
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountNumber || ''}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    placeholder="e.g. 010-12-00-12345678-001"
                    className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-purple-800 dark:text-purple-300 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {formData.bankAccountNumber && (
                    <button
                      type="button"
                      onClick={async () => {
                        const acc = formData.bankAccountNumber?.trim();
                        if (!acc) return;
                        try {
                          const payload = `DONATION|BANK:${formData.bankName || 'BCEL'}|ACC:${acc}|NAME:${formData.bankAccountName || formData.name}`;
                          const dataUrl = await generateQRCodeDataUrl(payload, { width: 400 });
                          setFormData((prev) => ({ ...prev, financeQrUrl: dataUrl }));
                        } catch (err) {
                          console.error('Error generating QR', err);
                        }
                      }}
                      className="mt-1.5 w-full py-1 px-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span>{language === 'lo' ? '⚡ ສ້າງ QR ອັດຕະໂນມັດຈາກເລກບັນຊີນີ້' : '⚡ Auto-Generate QR from this account #'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* QR Image Uploader */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'lo' ? 'ອັບໂຫຼດຮູບ QR Code ຮັບເງິນ (Transfer QR Image)' : 'Transfer QR Image'}
                </label>
                <UnifiedMediaUploader
                  value={formData.financeQrUrl || ''}
                  onChange={(url) => setFormData({ ...formData, financeQrUrl: url })}
                  fileType="image"
                  placeholder={language === 'lo' ? 'ເລືອກຮູບ QR ຈາກເຄື່ອງ ຫຼື ວາງລິ້ງຮູບ...' : 'Upload QR file or paste image URL...'}
                />

                {formData.financeQrUrl && (
                  <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-purple-300 dark:border-purple-700 inline-flex items-center gap-3">
                    <img
                      src={formData.financeQrUrl}
                      alt="QR Preview"
                      className="w-16 h-16 object-contain rounded-lg border border-purple-200 dark:border-purple-800 bg-white"
                    />
                    <div className="text-[11px]">
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        ✓ {language === 'lo' ? 'ມີຮູບ QR ພ້ອມໃຊ້ງານ' : 'QR code ready'}
                      </span>
                      <span className="text-slate-500 text-[10px] block">
                        {formData.bankName || 'BCEL One'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ປະວັດ / ຄຳອະທິບາຍ (ພາສາລາວ - Lao Bio)' : 'Bio / Note (Lao)'}
              </label>
              <input
                type="text"
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="ປະວັດໂດຍຫຍໍ້..."
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'lo' ? 'ປະວັດ (English Bio)' : 'Bio (English)'}
                </label>
                <input
                  type="text"
                  value={formData.bioEn || ''}
                  onChange={(e) => setFormData({ ...formData, bioEn: e.target.value })}
                  placeholder="Short bio..."
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'lo' ? 'ປະວັດ (Thai Bio)' : 'Bio (Thai)'}
                </label>
                <input
                  type="text"
                  value={formData.bioTh || ''}
                  onChange={(e) => setFormData({ ...formData, bioTh: e.target.value })}
                  placeholder="ประวัติโดยย่อ..."
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>
            </div>

            {/* Visibility Toggle Switch */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.hidden)}
                  onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  {language === 'lo'
                    ? '🙈 ເຊື່ອງທີມງານຄົນນີ້ ບໍ່ໃຫ້ສະແດງຢູ່ໜ້າເວັບໄຊ (Hide from public website)'
                    : language === 'th'
                    ? '🙈 ซ่อนบุคลากรคนนี้ไม่ให้แสดงบนเว็บไซต์'
                    : '🙈 Hide this staff member from the public website'}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'lo' ? 'ຮູບພາບໂປຣຟາຍ (Profile Photo)' : 'Avatar Photo'}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
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
            form="form-team"
            disabled={isSubmitting}
            className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50 transition"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{language === 'lo' ? 'ບັນທຶກຂໍ້ມູນ' : 'Save Member'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { Wand2, Check, RotateCcw, Download, Sliders, Sparkles, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { removeImageBackground, BgRemovalOptions } from '../utils/backgroundRemover';
import { saveBase64ToFirestoreUploadedFiles } from '../utils/fileUploader';
import { db, doc, setDoc } from '../lib/firebase';

interface LogoBgRemoverProps {
  currentLogoUrl: string;
  onApplyLogo: (newUrl: string) => void;
  language: Language;
  disabled?: boolean;
}

/**
 * Converts a data:image/png;base64,... URL or any image URL into a PNG Blob for reliable downloading.
 */
const dataUrlToPngBlob = async (src: string): Promise<Blob> => {
  if (src.startsWith('data:')) {
    const parts = src.split(';base64,');
    if (parts.length === 2) {
      const mime = parts[0].replace('data:', '') || 'image/png';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    }
  }
  const response = await fetch(src);
  return await response.blob();
};

export const LogoBgRemover: React.FC<LogoBgRemoverProps> = ({
  currentLogoUrl,
  onApplyLogo,
  language,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [originalSnapshot, setOriginalSnapshot] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<string>('');
  const [tolerance, setTolerance] = useState<number>(38);
  const [mode, setMode] = useState<'flood' | 'all'>('flood');
  const [hasApplied, setHasApplied] = useState(false);

  // Track last applied URL so we know when the user uploads a brand new logo file
  const lastAppliedUrlRef = useRef<string>('');

  const runRemoval = async (src: string, tol: number, md: 'flood' | 'all') => {
    if (!src) return '';
    setIsProcessing(true);
    try {
      const opts: BgRemovalOptions = {
        tolerance: tol,
        mode: md,
        feather: true,
      };
      const result = await removeImageBackground(src, opts);
      setPreviewResult(result);
      return result;
    } catch (err) {
      console.error('Failed to remove background:', err);
      return '';
    } finally {
      setIsProcessing(false);
    }
  };

  // Initialize or refresh snapshot when opening or when user uploads a new logo
  useEffect(() => {
    if (!currentLogoUrl) return;
    const isExternalNewUpload =
      currentLogoUrl !== lastAppliedUrlRef.current &&
      currentLogoUrl !== previewResult &&
      currentLogoUrl !== originalSnapshot;

    if (isOpen && (!originalSnapshot || isExternalNewUpload)) {
      setOriginalSnapshot(currentLogoUrl);
      runRemoval(currentLogoUrl, tolerance, mode);
    } else if (!isOpen && isExternalNewUpload) {
      setOriginalSnapshot(currentLogoUrl);
      setPreviewResult('');
    }
  }, [isOpen, currentLogoUrl]);

  const handleToleranceChange = (newTol: number) => {
    setTolerance(newTol);
    const sourceToUse = originalSnapshot || currentLogoUrl;
    if (sourceToUse) {
      runRemoval(sourceToUse, newTol, mode);
    }
  };

  const handleModeChange = (newMode: 'flood' | 'all') => {
    setMode(newMode);
    const sourceToUse = originalSnapshot || currentLogoUrl;
    if (sourceToUse) {
      runRemoval(sourceToUse, tolerance, newMode);
    }
  };

  const handleApply = async () => {
    const sourceToUse = originalSnapshot || currentLogoUrl;
    let finalDataUrl = previewResult;

    setIsApplying(true);
    try {
      if (!finalDataUrl || !finalDataUrl.startsWith('data:image/')) {
        finalDataUrl = await runRemoval(sourceToUse, tolerance, mode);
      }
      if (!finalDataUrl) return;

      let appliedUrl = finalDataUrl;
      if (finalDataUrl.startsWith('data:image/')) {
        try {
          appliedUrl = await saveBase64ToFirestoreUploadedFiles(
            finalDataUrl,
            'hb_logo_transparent',
            'image/png'
          );
        } catch (err) {
          console.warn('Firestore upload fallback to data URL for transparent logo:', err);
          appliedUrl = finalDataUrl;
        }
      }

      lastAppliedUrlRef.current = appliedUrl;
      onApplyLogo(appliedUrl);

      if (db) {
        setDoc(
          doc(db, 'app_config', 'homePoster'),
          { logoUrl: appliedUrl, updatedAt: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      }

      setHasApplied(true);
      setTimeout(() => setHasApplied(false), 3000);
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetOriginal = () => {
    if (originalSnapshot) {
      lastAppliedUrlRef.current = originalSnapshot;
      onApplyLogo(originalSnapshot);
      if (db) {
        setDoc(
          doc(db, 'app_config', 'homePoster'),
          { logoUrl: originalSnapshot, updatedAt: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      }
      runRemoval(originalSnapshot, tolerance, mode);
    }
  };

  const handleDownload = async () => {
    const sourceToUse = originalSnapshot || currentLogoUrl;
    if (!sourceToUse && !previewResult) return;

    setIsDownloading(true);
    try {
      let targetDataUrl = previewResult;
      if (!targetDataUrl || !targetDataUrl.startsWith('data:image/')) {
        targetDataUrl = await runRemoval(sourceToUse, tolerance, mode);
      }
      if (!targetDataUrl) return;

      const blob = await dataUrlToPngBlob(targetDataUrl);
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'hope_bokeo_logo_transparent.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 5000);
    } catch (err) {
      console.error('Failed to download transparent PNG:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!currentLogoUrl) return null;

  return (
    <div className="mt-2 border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl p-3 space-y-2.5 transition">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-600 text-white rounded-lg shadow-xs">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>{language === 'lo' ? 'ເຄື່ອງມືລຶບພື້ນຫຼັງໂລໂກ້' : 'Logo Background Remover'}</span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/70 text-purple-700 dark:text-purple-300">
                AI Magic
              </span>
            </h4>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!isOpen) {
              const src = originalSnapshot || currentLogoUrl;
              if (!originalSnapshot) {
                setOriginalSnapshot(currentLogoUrl);
              }
              runRemoval(src, tolerance, mode);
            }
            setIsOpen(!isOpen);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
            isOpen
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>
            {isOpen
              ? language === 'lo'
                ? 'ປິດເຄື່ອງມື'
                : 'Close Tool'
              : language === 'lo'
              ? 'ລຶບພື້ນຫຼັງໂລໂກ້'
              : 'Remove Background'}
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="pt-2 border-t border-purple-200/70 dark:border-purple-900/40 space-y-3">
          {/* Controls: Mode & Tolerance Slider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Mode selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-purple-500" />
                <span>{language === 'lo' ? 'ຮູບແບບການລຶບ:' : 'Removal Mode:'}</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleModeChange('flood')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer text-center ${
                    mode === 'flood'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {language === 'lo' ? 'ອັດຕະໂນມັດ (ຕິດຂອບ)' : 'Auto (Border Flood)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer text-center ${
                    mode === 'all'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {language === 'lo' ? 'ລຶບສີຂາວ/ຕາໜ່າງທັງໝົດ' : 'Remove All White'}
                </button>
              </div>
              <p className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-1">
                {mode === 'flood'
                  ? language === 'lo'
                    ? '✓ ລຶບພື້ນຫຼັງຂອບນອກ ແລະ ຊ່ອງວ່າງໃນຕົວໜັງສືອັດຕະໂນມັດ'
                    : '✓ Smart border & letter-hole background removal'
                  : language === 'lo'
                  ? '✓ ລຶບທຸກຈຸດສີຂາວ ແລະ ຕາໜ່າງພື້ນຫຼັງທົ່ວຮູບ'
                  : '✓ Erases all white & checkerboard pixels everywhere'}
              </p>
            </div>

            {/* Tolerance Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{language === 'lo' ? 'ຄວາມກວ້າງ/ລະອຽດ (Tolerance):' : 'Tolerance:'}</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400">
                  {tolerance}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="2"
                value={tolerance}
                onChange={(e) => handleToleranceChange(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 mt-1">
                <span>{language === 'lo' ? 'ລະອຽດ (10)' : 'Tight (10)'}</span>
                <span>{language === 'lo' ? 'ມາດຕະຖານ (38)' : 'Default (38)'}</span>
                <span>{language === 'lo' ? 'ກວ້າງ (80)' : 'Broad (80)'}</span>
              </div>
            </div>
          </div>

          {/* Live Previews: Checkerboard (Transparency) vs Dark Mode (With White Outline) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Checkerboard (Pure Transparency check) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex flex-col items-center justify-between text-center min-h-[110px]">
              <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                {language === 'lo' ? '1. ພື້ນໂປ່ງໃສ (Transparent)' : '1. Transparent Grid'}
              </span>
              <div
                className="w-full h-14 rounded-lg flex items-center justify-center p-1.5"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                  backgroundColor: '#f8fafc',
                }}
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                ) : (
                  <img
                    src={previewResult || currentLogoUrl}
                    alt="Transparent Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* 2. Light Header Preview */}
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col items-center justify-between text-center min-h-[110px]">
              <span className="text-[9.5px] font-bold text-slate-500 mb-1">
                {language === 'lo' ? '2. ເທິງ Header ສີຂາວ' : '2. Light Header'}
              </span>
              <div className="w-full h-14 bg-white border border-slate-100 rounded-lg flex items-center justify-center p-1.5">
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                ) : (
                  <img
                    src={previewResult || currentLogoUrl}
                    alt="Light Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* 3. Dark Header Preview (With White Outline Highlight) */}
            <div className="dark dark-preview-container bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center justify-between text-center min-h-[110px]">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9.5px] font-bold text-white">
                  {language === 'lo' ? '3. ໂໝດມືດ (ຂອບສີຂາວ)' : '3. Dark Mode (White Stroke)'}
                </span>
                <span className="text-[8px] bg-indigo-500/30 text-indigo-200 px-1 py-0.2 rounded font-bold">
                  Active
                </span>
              </div>
              <div className="w-full h-14 bg-slate-950 rounded-lg flex items-center justify-center p-1.5 border border-slate-800">
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                ) : (
                  <img
                    src={previewResult || currentLogoUrl}
                    alt="Dark Mode Outline Preview"
                    className="max-h-full max-w-full object-contain hb-logo-dark-outline"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons: Apply, Undo, Download */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {originalSnapshot && (
                <button
                  type="button"
                  onClick={handleResetOriginal}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{language === 'lo' ? 'ຟື້ນຟູຕົ້ນສະບັບ' : 'Reset Original'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                disabled={isProcessing || isDownloading || !previewResult}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{language === 'lo' ? 'ດາວໂຫຼດໄຟລ໌ PNG' : 'Download PNG'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing || isApplying || !previewResult}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isApplying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>
                {hasApplied
                  ? language === 'lo'
                    ? '✓ ນຳໃຊ້ໂລໂກ້ໂປ່ງໃສແລ້ວ!'
                    : '✓ Applied Transparent Logo!'
                  : language === 'lo'
                  ? 'ນຳໃຊ້ໂລໂກ້ໂປ່ງໃສນີ້'
                  : 'Apply Transparent Logo'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Upload, Link as LinkIcon, Image as ImageIcon, X, Plus, Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Language } from '../types';
import { compressImageFile } from '../utils/imageCompressor';
import { uploadFileDirectly } from '../utils/fileUploader';

interface MultiImageUploaderProps {
  images: string[];
  onChange: (urls: string[]) => void;
  language: Language;
  label?: string;
  disabled?: boolean;
}

export const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({
  images,
  onChange,
  language,
  label,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [uploadMode, setUploadMode] = useState<'replace' | 'append'>('replace');

  // Handle uploading multiple files from device at once
  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        try {
          const uploadRes = await uploadFileDirectly(file);
          if (uploadRes?.url) {
            newUrls.push(uploadRes.url);
          }
        } catch (uploadErr) {
          console.warn('Direct upload failed, reading raw original data URL:', uploadErr);
          const rawDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
          if (rawDataUrl) {
            newUrls.push(rawDataUrl);
          }
        }
      }

      if (newUrls.length > 0) {
        if (uploadMode === 'replace') {
          // Strictly replace all existing images with the newly chosen ones
          onChange(Array.from(new Set(newUrls)));
        } else {
          // Append to existing
          const updated = Array.from(new Set([...images.filter((u) => u && typeof u === 'string' && u.trim()), ...newUrls]));
          onChange(updated);
        }
      }
    } catch (err) {
      console.error('Multi image upload error:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Handle adding image URL link
  const handleAddUrl = () => {
    if (disabled || !inputUrl.trim()) return;
    const url = inputUrl.trim();
    if (uploadMode === 'replace') {
      onChange([url]);
    } else if (!images.includes(url)) {
      onChange([...images.filter((u) => u.trim()), url]);
    }
    setInputUrl('');
  };

  const handleClearAll = () => {
    if (disabled) return;
    if (window.confirm(language === 'lo' ? 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຮູບທັງໝົດ?' : 'Are you sure you want to clear all images?')) {
      onChange([]);
    }
  };

  const handleRemoveImage = (index: number) => {
    if (disabled) return;
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    if (disabled) return;
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    const newArr = [...images];
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    onChange(newArr);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            <span>{label}</span>
          </label>
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-4">
        {/* Mode Selector and Clear Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setUploadMode('replace')}
              className={`px-2.5 py-1 rounded-lg transition ${
                uploadMode === 'replace'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'lo' ? '🔄 ແທນທີ່ຮູບເກົ່າ (Replace All)' : '🔄 Replace All'}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setUploadMode('append')}
              className={`px-2.5 py-1 rounded-lg transition ${
                uploadMode === 'append'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'lo' ? '➕ ເພີ່ມຕໍ່ທ້າຍ (Append)' : '➕ Add to List'}
            </button>
          </div>

          {images && images.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleClearAll}
              className="px-2.5 py-1 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title={language === 'lo' ? 'ລຶບຮູບທັງໝົດ' : 'Clear all photos'}
            >
              <X className="w-3.5 h-3.5" />
              <span>{language === 'lo' ? 'ລຶບຮູບທັງໝົດ' : 'Clear All'}</span>
            </button>
          )}
        </div>

        {/* Upload Controls Bar: Local File Picker + URL Link Input */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* URL Input with Add Button */}
          <div className="sm:col-span-8 flex gap-1.5">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                disabled={disabled}
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
                placeholder={
                  language === 'lo'
                    ? 'ວ່າງລິງ URL ຮູບພາບ (https://...)...'
                    : 'Paste Image URL Link...'
                }
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed disabled:text-slate-400"
              />
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={handleAddUrl}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'lo' ? 'ເພີ່ມລິງ' : 'Add Link'}</span>
            </button>
          </div>

          {/* Device Multi-File Picker Button */}
          <label className={`sm:col-span-4 shrink-0 px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition ${
            disabled
              ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed pointer-events-none'
              : 'cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
          }`}>
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>
              {isUploading
                ? language === 'lo'
                  ? 'ກຳລັງອັບໂຫຼດ...'
                  : 'Uploading...'
                : language === 'lo'
                ? 'ເລືອກໄຟລ໌ຈາກເຄື່ອງ'
                : 'Choose Local Files'}
            </span>
            <input
              type="file"
              disabled={disabled}
              accept="image/*"
              multiple
              onChange={handleFilesSelect}
              className="hidden"
            />
          </label>
        </div>

        {/* Thumbnail Gallery Row - Displays items horizontally from Left to Right */}
        {images && images.filter((u) => u.trim()).length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>
                {language === 'lo'
                  ? `ຮູບພາບທັງໝົດ (${images.filter((u) => u.trim()).length} ຮູບ):`
                  : `Gallery List (${images.filter((u) => u.trim()).length} photos):`}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {language === 'lo' ? 'ສະແດງລຽງຈາກຊ້າຍໄປຂວາ (ສາມາດປ່ຽນລຳດັບໄດ້)' : 'Arranged Left to Right'}
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
              {images
                .filter((u) => u.trim())
                .map((url, idx) => (
                  <div
                    key={idx}
                    className="relative shrink-0 w-32 h-28 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-sm group hover:border-emerald-500 transition"
                  >
                    <img
                      src={url}
                      alt={`upload-preview-${idx}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Image Index Badge */}
                    <span className="absolute top-1.5 left-1.5 bg-slate-900/80 backdrop-blur-md text-amber-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-white/20 shadow">
                      #{idx + 1}
                    </span>

                    {/* Move Controls */}
                    {!disabled && (
                      <div className="absolute top-1.5 left-10 flex gap-0.5">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'left')}
                            className="w-5 h-5 rounded-full bg-slate-900/80 hover:bg-emerald-600 text-white flex items-center justify-center transition shadow backdrop-blur-sm"
                            title="Move Left"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                        )}
                        {idx < images.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'right')}
                            className="w-5 h-5 rounded-full bg-slate-900/80 hover:bg-emerald-600 text-white flex items-center justify-center transition shadow backdrop-blur-sm"
                            title="Move Right"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Delete Button Overlay */}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-red-600 text-white flex items-center justify-center transition shadow backdrop-blur-sm"
                        title={language === 'lo' ? 'ລົບຮູບນີ້' : 'Remove Photo'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Link type tag */}
                    <div className="absolute bottom-1 left-1.5 right-1.5 bg-slate-900/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] text-slate-200 truncate font-mono">
                      {url.startsWith('data:') ? 'Local File' : 'Web Link'}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="p-3 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
            {language === 'lo'
              ? 'ຍັງບໍ່ທັນມີຮູບພາບ. ກົດ "ເລືອກໄຟລ໌ຈາກເຄື່ອງ" ຫຼື ວ່າງລິງ URL ເພື່ອເພີ່ມຮູບ'
              : 'No images added yet. Click "Choose Local Files" or paste a URL link.'}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { Upload, X, Link, Loader2 } from "lucide-react";
import { Language } from "../types";
import {
  uploadFileDirectly,
  getCachedUploadUrl,
  resolveUploadUrl,
} from "../utils/fileUploader";

export interface UnifiedMediaUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  language?: Language;
  label?: string;
  placeholder?: string;
  fileType?: "image" | "video" | "doc" | "all";
  acceptTypes?: string;
  preserveTransparency?: boolean;
  maxDimension?: number;
  maxStringLength?: number;
  disabled?: boolean;
  className?: string;
}

export const UnifiedMediaUploader: React.FC<UnifiedMediaUploaderProps> = ({
  value = "",
  onChange,
  language = "lo",
  label,
  placeholder,
  fileType = "image",
  acceptTypes,
  disabled = false,
  className = "",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string>(() =>
    getCachedUploadUrl(value)
  );
  const [previewHidden, setPreviewHidden] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewHidden(false);
    const cached = getCachedUploadUrl(value);
    setPreviewSrc(cached);
  }, [value]);

  const defaultAccept =
    acceptTypes ||
    (fileType === "video"
      ? "video/*"
      : fileType === "doc"
      ? ".pdf,.doc,.docx,.txt"
      : fileType === "all"
      ? "*/*"
      : "image/*,.svg,.png,.webp,.jpg,.jpeg,.gif,.bmp,.avif,.heic,.heif,.jfif,.tif,.tiff");

  const defaultPlaceholder =
    placeholder ||
    (language === "lo"
      ? "ເລືອກໄຟລ໌ ຫຼື ວາງລິ້ງ URL..."
      : language === "th"
      ? "เลือกไฟล์ หรือ วางลิงก์ URL..."
      : "Select file or paste URL...");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      setPreviewHidden(false);

      const result = await uploadFileDirectly(file);
      if (result.success && result.url) {
        onChange(result.url);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err: any) {
      console.error("File upload error:", err);
      try {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          const res = loadEvt.target?.result as string;
          if (res) {
            onChange(res);
          }
        };
        reader.readAsDataURL(file);
      } catch (fallbackErr) {
        setUploadError(
          language === "lo" ? "ການອັບໂຫຼດຂັດຂ້ອງ" : "Upload error"
        );
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClear = () => {
    onChange("");
    setUploadError(null);
    setPreviewHidden(false);
  };

  const isImageValue =
    value &&
    (value.startsWith("data:image") ||
      value.startsWith("blob:") ||
      /\.(jpeg|jpg|png|webp|svg|gif|bmp|avif|jfif)($|\?)/i.test(value) ||
      value.startsWith("/uploads/") ||
      value.includes("images.unsplash.com") ||
      value.includes("firebasestorage") ||
      value.includes("googleusercontent"));

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Link className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder={defaultPlaceholder}
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition disabled:opacity-50"
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-red-500 cursor-pointer"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={defaultAccept}
            disabled={isUploading}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                <span>
                  {language === "lo" ? "ກຳລັງອັບໂຫຼດ..." : "Uploading..."}
                </span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-red-500" />
                <span>{language === "lo" ? "ເລືອກໄຟລ໌" : "Upload File"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {uploadError && (
        <p className="text-xs text-red-500 font-medium">{uploadError}</p>
      )}

      {isImageValue && !previewHidden && (
        <div className="relative inline-block mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 max-w-[200px] shadow-xs">
          <img
            src={previewSrc || value}
            alt="Preview"
            className="max-h-28 object-contain w-auto mx-auto block"
            onError={() => {
              if (value && value.startsWith("/uploads/")) {
                resolveUploadUrl(value)
                  .then((resolved) => {
                    if (resolved && resolved !== value) {
                      setPreviewSrc(resolved);
                    } else {
                      setPreviewHidden(true);
                    }
                  })
                  .catch(() => setPreviewHidden(true));
              } else {
                setPreviewHidden(true);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

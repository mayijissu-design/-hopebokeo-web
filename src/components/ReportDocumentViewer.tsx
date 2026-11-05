import React, { useState, useMemo } from 'react';
import { X, FileText, Download, ExternalLink } from 'lucide-react';
import { Language } from '../types';
import { PdfCanvasViewer } from './PdfCanvasViewer';

interface ReportDocumentViewerProps {
  docUrl?: string;
  docUrls?: string[];
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  title?: string;
  language: Language;
  isFullWidth?: boolean;
}

/**
 * Single Document Item:
 * Direct embedded canvas PDF, compact document image, or downloadable file tile.
 * Aligned strictly from left to right.
 */
const SingleDocItem: React.FC<{
  doc: string;
  idx: number;
  totalDocs: number;
  title: string;
  language: Language;
  onOpenImage?: (url: string) => void;
}> = ({ doc, idx, totalDocs, title, language, onOpenImage }) => {
  const isPdf = useMemo(() => {
    if (!doc) return false;
    const clean = doc.split('?')[0].toLowerCase();
    return (
      clean.endsWith('.pdf') ||
      doc.toLowerCase().includes('application/pdf') ||
      doc.startsWith('data:application/pdf')
    );
  }, [doc]);

  const isImage = useMemo(() => {
    if (!doc) return false;
    const clean = doc.split('?')[0].toLowerCase();
    return (
      clean.endsWith('.jpg') ||
      clean.endsWith('.jpeg') ||
      clean.endsWith('.png') ||
      clean.endsWith('.webp') ||
      clean.endsWith('.gif') ||
      clean.endsWith('.svg') ||
      doc.startsWith('data:image/')
    );
  }, [doc]);

  if (isPdf) {
    return <PdfCanvasViewer url={doc} title={title} language={language} mode="full" />;
  }

  // Compact document image view
  if (isImage) {
    return (
      <div
        className={`w-full ${totalDocs === 1 ? 'w-full' : 'max-w-2xl'} text-left mr-auto bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-slate-800 cursor-pointer p-1`}
        onClick={() => onOpenImage?.(doc)}
        title={language === 'lo' ? 'ກົດເພື່ອຂະຫຍາຍເຕັມຈໍ' : 'Click to view full screen'}
      >
        <img
          src={doc}
          alt={title ? `${title} - Document ${idx + 1}` : `Document ${idx + 1}`}
          className="w-full h-auto max-h-[560px] block rounded-xl object-contain bg-white dark:bg-slate-900 text-left"
          loading="lazy"
        />
      </div>
    );
  }

  // Generic document file download tile
  const fileName = doc.split('/').pop()?.split('?')[0] || `Document ${idx + 1}`;
  return (
    <div className="w-full max-w-md p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-left mr-auto shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2.5 bg-red-100 dark:bg-red-950/80 text-[#cc0000] rounded-lg shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {fileName}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {language === 'lo' ? 'ຟາຍເອກະສານ' : 'Document File'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <a
          href={doc}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition"
          title={language === 'lo' ? 'ເປີດໃນແທັບໃໝ່' : 'Open in New Tab'}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>{language === 'lo' ? 'ເປີດ' : 'Open'}</span>
        </a>
        <a
          href={doc}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-[#cc0000] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{language === 'lo' ? 'ດາວໂຫຼດ' : 'Download'}</span>
        </a>
      </div>
    </div>
  );
};

export const ReportDocumentViewer: React.FC<ReportDocumentViewerProps> = ({
  docUrl,
  docUrls = [],
  imageUrl,
  imageUrls = [],
  videoUrl,
  title = '',
  language,
}) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Aggregate all document URLs
  const allDocs = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(docUrls)) {
      docUrls.forEach((d) => {
        if (d && typeof d === 'string' && d.trim() && !list.includes(d.trim())) {
          list.push(d.trim());
        }
      });
    }
    if (docUrl && typeof docUrl === 'string' && docUrl.trim() && !list.includes(docUrl.trim())) {
      list.unshift(docUrl.trim());
    }
    return list;
  }, [docUrl, docUrls]);

  // Combine gallery images
  const allImages = useMemo(() => {
    const list: string[] = [];
    if (imageUrl && !list.includes(imageUrl)) list.push(imageUrl);
    if (Array.isArray(imageUrls)) {
      imageUrls.forEach((img) => {
        if (img && typeof img === 'string' && img.trim() && !list.includes(img)) {
          list.push(img);
        }
      });
    }
    return list;
  }, [imageUrl, imageUrls]);

  // YouTube embed helper
  const embedVideoUrl = useMemo(() => {
    if (!videoUrl) return null;
    const match = videoUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i
    );
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return null;
  }, [videoUrl]);

  const hasVisualMedia = allImages.length > 0 || Boolean(embedVideoUrl);
  const totalVisualCount = allImages.length + (embedVideoUrl ? 1 : 0);

  return (
    <div className="w-full space-y-4 text-left">
      {/* 1. DOCUMENTS SECTION:
          - Native PDF embedding with selectable vector text
          - Left-aligned (NO mx-auto)
          - Arranged from left to right (single doc max-w-4xl, multi docs 2 columns)
      */}
      {allDocs.length > 0 && (
        <div
          className={`w-full text-left ${
            allDocs.length === 1
              ? 'max-w-4xl mr-auto'
              : 'grid grid-cols-1 md:grid-cols-2 gap-4 items-start justify-start w-full'
          }`}
        >
          {allDocs.map((doc, idx) => (
            <SingleDocItem
              key={idx}
              doc={doc}
              idx={idx}
              totalDocs={allDocs.length}
              title={title}
              language={language}
              onOpenImage={(img) => setLightboxImage(img)}
            />
          ))}
        </div>
      )}

      {/* 2. PHOTOS & VIDEOS COMBINED MEDIA GALLERY:
          - Flow strictly from left to right (ລຽນ ຈາກຊາຍໄປຂວາ)
          - If single photo/video: fills full container width from left to right (ເຕັ້ມຈໍຊາຍ ຂວາ)
          - If 2 items: 50% / 50% split filling full container width
          - If 3+ items: multi-column responsive grid filling full container width
      */}
      {hasVisualMedia && (
        <div className="w-full text-left">
          <div
            className={`grid ${
              totalVisualCount === 1
                ? 'grid-cols-1 w-full'
                : totalVisualCount === 2
                ? 'grid-cols-1 sm:grid-cols-2 w-full'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 w-full'
            } gap-4 items-start justify-start w-full`}
          >
            {/* Gallery Photos */}
            {allImages.map((img, idx) => (
              <div
                key={`img-${idx}`}
                onClick={() => setLightboxImage(img)}
                className={`group relative ${
                  totalVisualCount === 1 ? 'rounded-2xl' : 'rounded-xl'
                } overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 bg-slate-50 dark:bg-slate-850 cursor-pointer border border-slate-200 dark:border-slate-800 w-full`}
                title={title ? `${title} - Photo ${idx + 1}` : `Photo ${idx + 1}`}
              >
                <div
                  className={`w-full ${
                    totalVisualCount === 1
                      ? 'h-[360px] sm:h-[480px] md:h-[560px] lg:h-[620px]'
                      : 'aspect-video'
                  } bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center`}
                >
                  <img
                    src={img}
                    alt={title ? `${title} - Photo ${idx + 1}` : `Photo ${idx + 1}`}
                    className={`w-full h-full object-cover ${
                      totalVisualCount === 1 ? 'rounded-2xl' : 'rounded-xl'
                    } block transition-transform duration-300 group-hover:scale-[1.01]`}
                    loading="lazy"
                  />
                </div>
              </div>
            ))}

            {/* Embedded YouTube / Facebook Video item in the grid side-by-side with photos */}
            {embedVideoUrl && (
              <div
                key="video-item"
                className={`${
                  totalVisualCount === 1 ? 'rounded-2xl max-h-[580px]' : 'rounded-xl'
                } overflow-hidden bg-slate-900 shadow-2xs border border-slate-200 dark:border-slate-800 w-full`}
              >
                <div
                  className={`relative w-full ${
                    totalVisualCount === 1
                      ? 'aspect-video max-h-[580px]'
                      : 'aspect-video'
                  } bg-black`}
                >
                  <iframe
                    src={embedVideoUrl}
                    title={title ? `${title} - Video` : 'Report Video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0 block"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal when any photo is clicked */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[92vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-[#cc0000] rounded-full transition cursor-pointer"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="Fullscreen Preview"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain block"
            />
          </div>
        </div>
      )}
    </div>
  );
};

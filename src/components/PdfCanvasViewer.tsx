import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  Loader2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { Language } from '../types';

interface PdfCanvasViewerProps {
  url: string;
  title?: string;
  language: Language;
  mode?: 'full' | 'thumbnail';
  className?: string;
  height?: number | string;
}

// Resilient helper to retrieve or dynamically load PDF.js engine
async function getPdfJsEngine(): Promise<any> {
  if (typeof window === 'undefined') return null;

  // 1. Check window.pdfjsLib (from /pdf.min.js in index.html)
  if ((window as any).pdfjsLib) {
    const lib = (window as any).pdfjsLib;
    if (!lib.GlobalWorkerOptions?.workerSrc) {
      lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
    return lib;
  }

  // 2. Poll for up to 1.5 seconds if script is still parsing
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if ((window as any).pdfjsLib) {
      const lib = (window as any).pdfjsLib;
      if (!lib.GlobalWorkerOptions?.workerSrc) {
        lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      }
      return lib;
    }
  }

  // 3. Fallback: dynamically load PDF.js from official unpkg/cdnjs CDN
  try {
    if (!document.getElementById('pdfjs-cdn-fallback')) {
      const script = document.createElement('script');
      script.id = 'pdfjs-cdn-fallback';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      document.head.appendChild(script);
      await new Promise<void>((resolve) => {
        script.onload = () => resolve();
        script.onerror = () => resolve();
      });
      if ((window as any).pdfjsLib) {
        const lib = (window as any).pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        return lib;
      }
    }
  } catch (err) {
    console.warn('PDF.js dynamic CDN load notice:', err);
  }

  return null;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  url,
  title,
  language,
  mode = 'full',
  className = '',
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(mode === 'thumbnail' ? 1.0 : 1.35);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);

  const fileName = useMemo(() => {
    if (title && title.trim()) return title;
    try {
      const clean = url.split('?')[0].split('#')[0];
      const part = clean.split('/').pop();
      return part ? decodeURIComponent(part) : 'Document.pdf';
    } catch {
      return 'Document.pdf';
    }
  }, [url, title]);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    setPdfDoc(null);
    setPageNum(1);

    async function loadPdf() {
      try {
        const pdfjs = await getPdfJsEngine();
        if (!pdfjs) {
          throw new Error('PDF.js engine is not ready');
        }

        let docSource: any = url;
        if (typeof url === 'string' && url.startsWith('data:')) {
          try {
            const base64Index = url.indexOf(';base64,');
            if (base64Index !== -1) {
              const b64 = url.substring(base64Index + 8);
              const binary = atob(b64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              docSource = { data: bytes };
            }
          } catch (e) {
            console.warn('Failed to parse base64 data for PDF:', e);
          }
        } else {
          try {
            if (url.startsWith('/') || url.startsWith('http')) {
              const res = await fetch(url);
              if (res.ok) {
                const buf = await res.arrayBuffer();
                docSource = { data: new Uint8Array(buf) };
              }
            }
          } catch {
            // fallback to passing url directly
          }
        }

        const loadingTask = pdfjs.getDocument(
          typeof docSource === 'object' && docSource.data
            ? {
                data: docSource.data,
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                cMapPacked: true,
              }
            : {
                url,
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                cMapPacked: true,
              }
        );

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages || 1);
        setIsLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('PDF rendering notice:', err?.message || err);
          setError(err?.message || 'Could not render PDF preview');
          setIsLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [url]);

  // Render Current Page onto Canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Use viewport with rotation & high resolution ratio
      const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1.5;
      const baseViewport = page.getViewport({ scale, rotation });
      const scaledViewport = page.getViewport({ scale: scale * pixelRatio, rotation });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${baseViewport.width}px`;
      canvas.style.height = `${baseViewport.height}px`;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const renderContext = {
        canvasContext: ctx,
        viewport: scaledViewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Canvas render page notice:', err);
      }
    }
  }, [pdfDoc, pageNum, scale, rotation]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Handle Thumbnail Mode (Compact for previews in editor modal)
  if (mode === 'thumbnail') {
    return (
      <div className={`relative w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-850 p-2 overflow-hidden ${className}`}>
        {isLoading && (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 py-6">
            <Loader2 className="w-5 h-5 text-[#cc0000] animate-spin" />
            <span className="text-[10px] font-bold">
              {language === 'lo' ? 'ກຳລັງໂຫຼດເອກະສານ...' : 'Loading PDF...'}
            </span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center text-center p-3 gap-1">
            <FileText className="w-8 h-8 text-[#cc0000]" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={fileName}>
              {fileName}
            </span>
            <span className="text-[9px] text-slate-500">PDF Document</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-full object-contain shadow-xs rounded bg-white transition-opacity duration-200 ${
            isLoading || error ? 'hidden' : 'block'
          }`}
        />
      </div>
    );
  }

  // Full Mode: Clean direct document view without bulky header tab
  return (
    <div className={`w-full max-w-4xl text-left mr-auto space-y-2 ${className}`}>
      {/* Main PDF Canvas Presentation Viewport */}
      <div
        className="w-full bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-auto border border-slate-200 dark:border-slate-800 shadow-inner flex flex-col items-center justify-start p-3 sm:p-5 relative"
        style={{ minHeight: height || 520, maxHeight: 760 }}
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center my-auto py-24 gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 text-[#cc0000] animate-spin" />
            <span className="text-xs font-bold">
              {language === 'lo' ? 'ກຳລັງເປີດອ່ານເອກະສານ PDF...' : 'Rendering PDF Document...'}
            </span>
          </div>
        )}

        {error ? (
          // Reliable native browser PDF embed fallback so uploaded PDF always displays!
          <object
            data={url}
            type="application/pdf"
            className="w-full min-h-[580px] h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
          >
            <iframe
              src={url}
              title={fileName}
              className="w-full min-h-[580px] h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
            />
          </object>
        ) : (
          <canvas
            ref={canvasRef}
            className={`shadow-xl rounded-lg bg-white border border-slate-200 dark:border-slate-800 block transition-opacity duration-300 max-w-full ${
              isLoading ? 'hidden' : 'opacity-100'
            }`}
          />
        )}
      </div>

      {/* Discreet Bottom Controls (Only Page navigation if multi-page + quick action links) */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-500">
        {numPages > 1 ? (
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}
              disabled={pageNum <= 1}
              className="p-0.5 text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white disabled:opacity-30 cursor-pointer"
              title={language === 'lo' ? 'ໜ້າກ່ອນ' : 'Previous page'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold font-mono">
              {pageNum} / {numPages}
            </span>
            <button
              type="button"
              onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
              disabled={pageNum >= numPages}
              className="p-0.5 text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white disabled:opacity-30 cursor-pointer"
              title={language === 'lo' ? 'ໜ້າຕໍ່ໄປ' : 'Next page'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : <div />}

        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{language === 'lo' ? 'ເປີດເຕັມຈໍ' : 'Open in New Tab'}</span>
          </a>
          <span>•</span>
          <a
            href={url}
            download={fileName}
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'lo' ? 'ດາວໂຫຼດ' : 'Download'}</span>
          </a>
        </div>
      </div>
    </div>
  );
};

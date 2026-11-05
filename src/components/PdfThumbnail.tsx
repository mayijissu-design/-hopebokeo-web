import React, { useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface PdfThumbnailProps {
  url: string;
  title?: string;
  className?: string;
}

export const PdfThumbnail: React.FC<PdfThumbnailProps> = ({ url, title, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function renderThumb() {
      try {
        let pdfjs = (window as any).pdfjsLib;
        if (!pdfjs) {
          for (let i = 0; i < 15; i++) {
            await new Promise((r) => setTimeout(r, 100));
            if (isCancelled) return;
            if ((window as any).pdfjsLib) {
              pdfjs = (window as any).pdfjsLib;
              break;
            }
          }
        }
        if (!pdfjs) {
          setError(true);
          return;
        }

        const loadingTask = pdfjs.getDocument({
          url,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        const page = await doc.getPage(1);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 2.2 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!isCancelled) {
          setLoaded(true);
        }
      } catch (e) {
        if (!isCancelled) {
          setError(true);
        }
      }
    }

    renderThumb();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  if (error) {
    return (
      <div className={`w-full h-56 bg-slate-50 flex flex-col items-center justify-center p-4 text-center ${className}`}>
        <FileText className="w-10 h-10 text-[#cc0000] mb-2" />
        <span className="text-xs font-bold text-slate-700 truncate max-w-full">
          {title || 'PDF Document'}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden bg-white ${className}`}>
      {!loaded && (
        <div className="w-full h-56 flex items-center justify-center bg-white">
          <Loader2 className="w-6 h-6 text-[#cc0000] animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-auto block bg-white transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0 h-0'
        }`}
        style={{ width: '100%', height: 'auto', display: loaded ? 'block' : 'none' }}
      />
    </div>
  );
};

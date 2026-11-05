import React, { useState, useEffect } from 'react';
import { getCachedUploadUrl, resolveUploadUrl, normalizeUploadUrl } from '../utils/fileUploader';

interface HbLogoProps {
  className?: string;
  size?: number;
  alt?: string;
  logoUrl?: string;
  disableDarkOutline?: boolean;
}

const DEFAULT_OFFICIAL_LOGO = '/uploads/logo_1791212624840_1791212626418_663.png';

function sanitizeLogoCandidate(candidate?: string | null): string {
  if (!candidate || typeof candidate !== 'string') return '';
  const clean = normalizeUploadUrl(candidate.trim());
  // Upgrade legacy JPEG logo with white background to the official transparent PNG logo
  if (clean === '/uploads/inline_d892a5b8897e.jpg') {
    return DEFAULT_OFFICIAL_LOGO;
  }
  return clean;
}

export const HbLogo: React.FC<HbLogoProps> = ({
  className = 'h-9 w-auto',
  size,
  alt = 'Hope Bokeo HB Logo',
  logoUrl,
  disableDarkOutline = false,
}) => {
  const [currentLogo, setCurrentLogo] = useState<string>(() => {
    const cleanProp = sanitizeLogoCandidate(logoUrl);
    if (cleanProp) return getCachedUploadUrl(cleanProp);
    try {
      const saved = sanitizeLogoCandidate(localStorage.getItem('hb_custom_logo'));
      if (saved) return getCachedUploadUrl(saved);
    } catch {
      // ignore
    }
    return DEFAULT_OFFICIAL_LOGO;
  });

  useEffect(() => {
    let target = DEFAULT_OFFICIAL_LOGO;
    const cleanProp = sanitizeLogoCandidate(logoUrl);
    if (cleanProp) {
      target = cleanProp;
    } else {
      try {
        const saved = sanitizeLogoCandidate(localStorage.getItem('hb_custom_logo'));
        if (saved) {
          target = saved;
        }
      } catch {
        // ignore
      }
    }
    setCurrentLogo(getCachedUploadUrl(target));
  }, [logoUrl]);

  // Listen to custom logo updates in real-time
  useEffect(() => {
    const handleLogoUpdate = (e: any) => {
      if (e?.detail && typeof e.detail === 'string') {
        const target = sanitizeLogoCandidate(e.detail) || DEFAULT_OFFICIAL_LOGO;
        setCurrentLogo(getCachedUploadUrl(target));
      } else {
        try {
          const saved = sanitizeLogoCandidate(localStorage.getItem('hb_custom_logo'));
          if (saved) {
            setCurrentLogo(getCachedUploadUrl(saved));
            return;
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('hb_logo_updated', handleLogoUpdate as EventListener);
    window.addEventListener('storage', handleLogoUpdate as EventListener);
    return () => {
      window.removeEventListener('hb_logo_updated', handleLogoUpdate as EventListener);
      window.removeEventListener('storage', handleLogoUpdate as EventListener);
    };
  }, []);

  return (
    <img
      src={currentLogo}
      alt={alt}
      className={`object-contain shrink-0 ${
        !disableDarkOutline ? 'hb-logo-dark-outline' : ''
      } ${className}`}
      style={size ? { height: `${size}px`, width: 'auto' } : undefined}
      onError={() => {
        if (currentLogo.startsWith('/uploads/')) {
          resolveUploadUrl(currentLogo)
            .then((resolved) => {
              if (resolved && resolved !== currentLogo) {
                setCurrentLogo(resolved);
              } else if (currentLogo !== DEFAULT_OFFICIAL_LOGO) {
                setCurrentLogo(DEFAULT_OFFICIAL_LOGO);
              } else {
                setCurrentLogo('/hb-logo.svg');
              }
            })
            .catch(() => {
              setCurrentLogo('/hb-logo.svg');
            });
        } else if (currentLogo !== '/hb-logo.svg') {
          setCurrentLogo('/hb-logo.svg');
        }
      }}
    />
  );
};


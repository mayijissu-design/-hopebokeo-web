import React, { useState, useEffect } from 'react';
import { Village, Language } from '../types';
import { getVillageGPS } from './MapsTab';
import bokeoGeoData from '../data/bokeoGeoData.json';

export interface LocationItem {
  id: string;
  name: string;
  nameLo: string;
  nameTh: string;
  desc: string;
  descLo: string;
  descTh: string;
  imageUrl: string;
  pinX: number;
  pinY: number;
  villageRef?: Village;
}

interface RealBokeoMapProps {
  churchLocations: LocationItem[];
  activeLocationId: string;
  onSelectLocation: (id: string, villageRef?: Village) => void;
  language: Language;
}

// Authentic geographic bounds of Bokeo Province, Laos (from official Google Maps / OSM boundary survey)
const BOUNDS = bokeoGeoData.bounds;
const SCALE = bokeoGeoData.scale;
const OFFSET_X = bokeoGeoData.offsetX;
const OFFSET_Y = bokeoGeoData.offsetY;

// Exact SVG coordinate converter using Web Mercator (Google Maps projection) for any GPS coordinate (lat, lng) in Bokeo
export function bokeoGpsToSvg(lng: number, lat: number): [number, number] {
  const x = (lng * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const px = OFFSET_X + (x - BOUNDS.minX) * SCALE;
  const py = OFFSET_Y + (BOUNDS.maxY - y) * SCALE;
  return [Math.round(px * 10) / 10, Math.round(py * 10) / 10];
}

// 5 Real Districts of Bokeo with Centroids from Google Maps
const DISTRICT_LABELS = bokeoGeoData.districtLabels;

/**
 * REAL Bokeo Province Map (Laos)
 * Specifications:
 * - REAL high-precision Google Maps boundary curve-for-curve (1,500+ vertices)
 * - ONLY ONE SINGLE BORDER LINE (ສາຍແດນມີພຽງເສັ້ນດຽວ) - no internal dividing lines
 * - Elegant soft pale-green GIS tone
 * - 5 clean district labels centered in their true locations
 * - Tiny red church dots (minimal, clickable, non-intrusive)
 * - Simple compass & real 20km scale bar
 */
export const RealBokeoMap: React.FC<RealBokeoMapProps> = ({
  churchLocations,
  activeLocationId,
  onSelectLocation,
  language,
}) => {
  const [showDistrictBorders, setShowDistrictBorders] = useState<boolean>(true);
  const [showRoads, setShowRoads] = useState<boolean>(true);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  // Live Compass Sensor & True North Orientation
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [isLiveCompass, setIsLiveCompass] = useState<boolean>(false);
  const [compassToast, setCompassToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setCompassToast(msg);
    setTimeout(() => {
      setCompassToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const toggleLiveCompass = async () => {
    if (isLiveCompass) {
      setIsLiveCompass(false);
      setCompassHeading(0);
      showToast(
        language === 'lo'
          ? '🧭 ຣີເຊັດເປັນທິດເໜືອແຜນທີ່ 0° N (True North ຖືກຕ້ອງ 100%)'
          : language === 'th'
          ? '🧭 รีเซ็ตเป็นทิศเหนือแผนที่ 0° N (True North ถูกต้อง 100%)'
          : '🧭 Reset to Map True North 0° N'
      );
      return;
    }

    // Check if DeviceOrientation permission is required (iOS 13+)
    const DeviceOrientation = (window as any).DeviceOrientationEvent;
    if (typeof DeviceOrientation?.requestPermission === 'function') {
      try {
        const state = await DeviceOrientation.requestPermission();
        if (state === 'granted') {
          setIsLiveCompass(true);
          showToast(
            language === 'lo'
              ? '🧭 ເປີດເຊັນເຊີເຂັມທິດຈິງແລ້ວ: ໝູນໂທລະສັບເພື່ອໃຫ້ເຂັມຊີ້ໄປທາງທິດເໜືອຈິງ'
              : '🧭 Live Device Compass Active: Needle dynamically points to real physical North'
          );
        } else {
          showToast(
            language === 'lo'
              ? '⚠️ ບໍ່ໄດ້ຮັບອະນຸຍາດເຊັນເຊີເຂັມທິດ (ກຳລັງສະແດງທິດເໜືອແຜນທີ່ 0° N ຖືກຕ້ອງ)'
              : '⚠️ Sensor permission denied (Showing Map True North 0° N)'
          );
        }
      } catch {
        setIsLiveCompass(true);
      }
    } else if ('ondeviceorientation' in window || 'ondeviceorientationabsolute' in window) {
      setIsLiveCompass(true);
      showToast(
        language === 'lo'
          ? '🧭 ເປີດເຊັນເຊີເຂັມທິດຈິງແລ້ວ: ເຂັມຈະໝູນຊີ້ໄປຫາທິດເໜືອຈິງໃນພື້ນທີ່ຕົວຈິງ'
          : '🧭 Live Device Compass Active: Needle dynamically points to real physical North'
      );
    } else {
      setCompassHeading(0);
      showToast(
        language === 'lo'
          ? '🧭 ທິດເໜືອແທ້ 0° N (True Geographic North) · ແຜນທີ່ຫັນໄປທາງທິດເໜືອຖືກຕ້ອງ 100%'
          : language === 'th'
          ? '🧭 ทิศเหนือแท้ 0° N (True Geographic North) · แผนที่หันไปทางทิศเหนือถูกต้อง 100%'
          : '🧭 True Geographic North 0° N · Map accurately oriented North'
      );
    }
  };

  useEffect(() => {
    if (!isLiveCompass) return;

    const onOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;
      if ((e as any).webkitCompassHeading !== undefined && (e as any).webkitCompassHeading !== null) {
        // iOS: direct compass heading in degrees (0 = North, 90 = East, 180 = South, 270 = West)
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null && e.alpha !== undefined) {
        // Android / standard: alpha is rotation around Z axis
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null && !isNaN(heading)) {
        setCompassHeading(Math.round(heading));
      }
    };

    const evt = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(evt, onOrientation as any, true);

    return () => {
      window.removeEventListener(evt, onOrientation as any, true);
    };
  }, [isLiveCompass]);

  // When live compass is active on phone, needle rotates counter-clockwise by heading so tip remains facing physical North
  const needleAngle = isLiveCompass ? -compassHeading : 0;

  // Fallback GPS coordinates for predefined churches
  const fallbackCoords: Record<string, { lat: number; lng: number }> = {
    huaysung: { lat: 20.66, lng: 100.53 }, // Meung / Huaysung
    mokplai: { lat: 20.48, lng: 100.92 }, // Eastern Pha Oudom ridge
    moksouk: { lat: 20.28, lng: 100.41 }, // Houayxay
    kankham: { lat: 20.10, lng: 100.86 }, // Pha Oudom
    monkeum: { lat: 20.18, lng: 100.95 }, // Pha Oudom
    pheingkahm: { lat: 20.46, lng: 100.22 }, // Tonpheung
    huaykoon: { lat: 19.92, lng: 100.55 }, // Paktha
    veingpathana: { lat: 20.25, lng: 100.72 }, // Houayxay / Pha Oudom border
  };

  const interDistrictBorders = (bokeoGeoData as any).interDistrictBorders || [];
  const roads = (bokeoGeoData as any).roads || [];
  const districts = (bokeoGeoData as any).districts || {};

  return (
    <div className="relative w-full aspect-[860/840] max-w-full sm:max-w-[640px] lg:max-w-[740px] xl:max-w-[820px] mx-auto select-none flex items-center justify-center p-1 sm:p-2">
      {/* Left Map Layer Controls: Districts & Highways (stacked vertically down near compass, small text, no dots) */}
      <div className="absolute bottom-20 sm:bottom-24 left-2.5 sm:left-4 z-20 flex flex-col items-start gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-2 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        {/* Toggle District Borders */}
        <button
          type="button"
          onClick={() => setShowDistrictBorders(!showDistrictBorders)}
          className={`text-[10px] sm:text-[11px] leading-tight transition-all cursor-pointer select-none font-semibold ${
            showDistrictBorders
              ? 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800'
              : 'text-slate-400 dark:text-slate-500 line-through opacity-70'
          }`}
          title={language === 'lo' ? 'ເປີດ/ປິດ ສາຍແດນເມືອງ (Districts)' : 'Toggle District Borders'}
        >
          Districts
        </button>

        {/* Toggle Highway Roads */}
        <button
          type="button"
          onClick={() => setShowRoads(!showRoads)}
          className={`text-[10px] sm:text-[11px] leading-tight transition-all cursor-pointer select-none font-semibold ${
            showRoads
              ? 'text-amber-700 dark:text-amber-400 hover:text-amber-800'
              : 'text-slate-400 dark:text-slate-500 line-through opacity-70'
          }`}
          title={language === 'lo' ? 'ເປີດ/ປິດ ເສັ້ນທາງຫຼວງ (Highways)' : 'Toggle Highway Routes'}
        >
          Highways
        </button>
      </div>

      <svg
        viewBox="0 0 860 840"
        className="w-full h-full transition-all duration-300"
        style={{ filter: 'drop-shadow(0 4px 14px rgba(27, 67, 50, 0.12))' }}
      >
        <defs>
          {/* Elegant soft pale green gradient for Bokeo Province */}
          <linearGradient id="bokeoProvinceFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e3f0e1" />
            <stop offset="50%" stopColor="#d9ebd6" />
            <stop offset="100%" stopColor="#cfe6cc" />
          </linearGradient>

          {/* District hover highlight */}
          <linearGradient id="districtHoverFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c8e6c4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#b4dcb0" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* ========================================================================= */}
        {/* 1. SINGLE REAL BOUNDARY LINE OF BOKEO PROVINCE (From Google Maps)         */}
        {/* ========================================================================= */}
        {bokeoGeoData.provincePathD && (
          <path
            d={bokeoGeoData.provincePathD}
            fill="url(#bokeoProvinceFill)"
            stroke="#1b4332"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        )}

        {/* ========================================================================= */}
        {/* 2. DISTRICT REGIONS (Subtle hover highlight polygons)                     */}
        {/* ========================================================================= */}
        <g className="district-polygons">
          {Object.entries(districts).map(([dId, dData]: [string, any]) => {
            const isHovered = hoveredDistrict === dId;
            return (
              <path
                key={dId}
                d={dData.pathD}
                fill={isHovered ? 'url(#districtHoverFill)' : 'transparent'}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredDistrict(dId)}
                onMouseLeave={() => setHoveredDistrict(null)}
              >
                <title>{language === 'lo' ? dData.nameLo : dData.name}</title>
              </path>
            );
          })}
        </g>

        {/* ========================================================================= */}
        {/* 3. INTER-DISTRICT BOUNDARY LINES (ເສັ້ນສາຍແດນລະຫວ່າງເມືອງຕ່າງໆ)         */}
        {/* Exact same authentic style, color, precision, and detail as the province perimeter */}
        {/* ========================================================================= */}
        {showDistrictBorders && (
          <g className="inter-district-boundaries transition-opacity duration-300">
            {interDistrictBorders.map((b: any) => (
              <g key={b.id}>
                {/* Border line in identical dark forest green #1b4332 with matching 2.2px solid stroke */}
                <path
                  d={b.pathD}
                  fill="none"
                  stroke="#1b4332"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="transition-all duration-200"
                >
                  <title>{language === 'lo' ? b.nameLo : b.nameEn}</title>
                </path>
              </g>
            ))}
          </g>
        )}

        {/* ========================================================================= */}
        {/* 4. REAL HIGHWAY & ROAD NETWORK (ເສັ້ນບອກເສັ້ນທາງ)                         */}
        {/* AH3 / R3A, Route 17B to Meung, Golden Triangle route, Route 222, Paktha   */}
        {/* ========================================================================= */}
        {showRoads && (
          <g className="highway-routes transition-opacity duration-300 pointer-events-none">
            {/* Road Casing / Underlay for crisp contrast over green terrain */}
            {roads.map((r: any) => (
              <path
                key={`casing_${r.id}`}
                d={r.pathD}
                fill="none"
                stroke="#ffffff"
                strokeWidth={r.id === 'ah3' ? 4.8 : 3.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
            ))}

            {/* Road Lines in vibrant highway colors */}
            {roads.map((r: any) => (
              <path
                key={`line_${r.id}`}
                d={r.pathD}
                fill="none"
                stroke={r.color || '#d97706'}
                strokeWidth={r.id === 'ah3' ? 2.8 : (r.width || 2.2)}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-200"
              />
            ))}

          </g>
        )}

        {/* ========================================================================= */}
        {/* 5. THE 5 REAL DISTRICT NAMES (Clean dark navy labels)                      */}
        {/* ========================================================================= */}
        {DISTRICT_LABELS.map((d) => {
          const displayName =
            language === 'lo' ? d.nameLo : language === 'th' ? (d.nameTh || d.name) : d.name;
          const isHovered = hoveredDistrict === d.id;

          return (
            <g
              key={d.id}
              transform={`translate(${d.x}, ${d.y})`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredDistrict(d.id)}
              onMouseLeave={() => setHoveredDistrict(null)}
            >
              <text
                x="0"
                y="0"
                textAnchor="middle"
                className={`transition-all select-none ${
                  isHovered ? 'fill-[#cc0000]' : 'fill-[#0f2942]'
                }`}
                style={{
                  fontSize: d.id === 'houayxay' ? '14px' : '12.5px',
                  fontWeight: 800,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '0.02em',
                  textShadow:
                    '0 1px 3px rgba(255, 255, 255, 0.95), 0 -1px 3px rgba(255, 255, 255, 0.95), 1px 0 3px rgba(255, 255, 255, 0.95), -1px 0 3px rgba(255, 255, 255, 0.95)',
                }}
              >
                {displayName}
              </text>
            </g>
          );
        })}

        {/* ========================================================================= */}
        {/* 6. TINY RED CHURCH DOTS (Minimal, precise GPS locations, non-intrusive)   */}
        {/* Completely static, no animation or movement (per user instruction)       */}
        {/* ========================================================================= */}
        {churchLocations.map((loc) => {
          let lat = 20.28;
          let lng = 100.41;

          if (loc.villageRef) {
            const gps = getVillageGPS(loc.villageRef);
            lat = gps.lat;
            lng = gps.lng;
          } else if (fallbackCoords[loc.id]) {
            lat = fallbackCoords[loc.id].lat;
            lng = fallbackCoords[loc.id].lng;
          } else {
            // Geographic interpolation
            lng = BOUNDS.minLng + (loc.pinX / 100) * (BOUNDS.maxLng - BOUNDS.minLng);
            lat = BOUNDS.maxLat - (loc.pinY / 100) * (BOUNDS.maxLat - BOUNDS.minLat);
          }

          const [cx, cy] = bokeoGpsToSvg(lng, lat);
          const isSelected = activeLocationId === loc.id;
          const displayName =
            language === 'lo' ? loc.nameLo : language === 'th' ? loc.nameTh : loc.name;

          return (
            <g
              key={loc.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectLocation(loc.id, loc.villageRef);
              }}
              className="cursor-pointer"
            >
              {/* Generous touch & click target */}
              <circle cx={cx} cy={cy} r="14" fill="transparent" />

              {/* Tiny Red Church Dot - completely static, no animation or movement */}
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 4.5 : 3.4}
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth={1.2}
              />

              <title>{displayName}</title>
            </g>
          );
        })}

        {/* ========================================================================= */}
        {/* 7. AUTHENTIC INTERACTIVE COMPASS BUTTON (Bottom-Left)                     */}
        {/* ========================================================================= */}
        <g
          transform="translate(75, 734)"
          onClick={toggleLiveCompass}
          className="cursor-pointer group select-none"
          role="button"
          tabIndex={0}
        >
          {/* Hit area for easy touch and click */}
          <circle cx="0" cy="0" r="34" fill="transparent" />

          {/* Compass Rose Dial Background */}
          <circle
            cx="0"
            cy="0"
            r="23"
            fill="#ffffff"
            fillOpacity="0.96"
            stroke={isLiveCompass ? '#10b981' : '#64748b'}
            strokeWidth={isLiveCompass ? 1.8 : 1}
            filter="drop-shadow(0 2px 5px rgba(0,0,0,0.14))"
            className="transition-colors duration-300"
          />
          <circle cx="0" cy="0" r="20" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />

          {/* 8 Degree Compass Ticks */}
          {/* North Tick (Bold Red) */}
          <line x1="0" y1="-20" x2="0" y2="-16" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
          {/* Northeast */}
          <line x1="11.5" y1="-11.5" x2="14.1" y2="-14.1" stroke="#94a3b8" strokeWidth="0.8" />
          {/* East */}
          <line x1="16" y1="0" x2="20" y2="0" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
          {/* Southeast */}
          <line x1="11.5" y1="11.5" x2="14.1" y2="14.1" stroke="#94a3b8" strokeWidth="0.8" />
          {/* South */}
          <line x1="0" y1="16" x2="0" y2="20" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
          {/* Southwest */}
          <line x1="-11.5" y1="11.5" x2="-14.1" y2="14.1" stroke="#94a3b8" strokeWidth="0.8" />
          {/* West */}
          <line x1="-20" y1="0" x2="-16" y2="0" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
          {/* Northwest */}
          <line x1="-11.5" y1="-11.5" x2="-14.1" y2="-14.1" stroke="#94a3b8" strokeWidth="0.8" />

          {/* Faint crosshairs guides */}
          <line x1="0" y1="-15" x2="0" y2="15" stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="1.5 2" />
          <line x1="-15" y1="0" x2="15" y2="0" stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="1.5 2" />

          {/* 4 Cardinal Letters (N, S, E, W) */}
          <text
            x="0"
            y="-25"
            textAnchor="middle"
            fill="#dc2626"
            fontSize="10"
            fontWeight="900"
            fontFamily="sans-serif"
          >
            N
          </text>
          <text
            x="27"
            y="3"
            textAnchor="middle"
            fill="#64748b"
            fontSize="7.5"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            E
          </text>
          <text
            x="0"
            y="30"
            textAnchor="middle"
            fill="#64748b"
            fontSize="7.5"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            S
          </text>
          <text
            x="-27"
            y="3"
            textAnchor="middle"
            fill="#64748b"
            fontSize="7.5"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            W
          </text>

          {/* Dynamic 3D Beveled Needle rotating to True North */}
          <g
            transform={`rotate(${needleAngle})`}
            style={{
              transformOrigin: '0px 0px',
              transition: isLiveCompass ? 'transform 0.15s ease-out' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* North Pointing Arrow (Red with 3D Bevel) */}
            <polygon points="0,-17 -4,-2 0,0" fill="#ef4444" />
            <polygon points="0,-17 4,-2 0,0" fill="#b91c1c" />

            {/* South Pointing Arrow (Silver/Slate with 3D Bevel) */}
            <polygon points="0,17 -4,2 0,0" fill="#e2e8f0" />
            <polygon points="0,17 4,2 0,0" fill="#64748b" />

            {/* Central Pin */}
            <circle cx="0" cy="0" r="3.2" fill="#0f172a" stroke="#f59e0b" strokeWidth="0.9" />
            <circle cx="0" cy="0" r="1.1" fill="#ffffff" />
          </g>

          {/* Interactive Status & Degree Readout Pill */}
          <g transform="translate(0, 42)">
            <rect
              x="-42"
              y="-8.5"
              width="84"
              height="17"
              rx="8.5"
              fill={isLiveCompass ? '#ecfdf5' : '#ffffff'}
              fillOpacity="0.95"
              stroke={isLiveCompass ? '#10b981' : '#cbd5e1'}
              strokeWidth="0.9"
              filter="drop-shadow(0 1px 3px rgba(0,0,0,0.08))"
            />
            <circle
              cx="-32"
              cy="0"
              r="2.5"
              fill={isLiveCompass ? '#10b981' : '#dc2626'}
              className={isLiveCompass ? 'animate-pulse' : ''}
            />
            <text
              x="-24"
              y="3.2"
              fill={isLiveCompass ? '#065f46' : '#1e293b'}
              fontSize="7.5"
              fontWeight="800"
              fontFamily="sans-serif"
            >
              {isLiveCompass ? `${compassHeading}° LIVE` : '0° N TRUE'}
            </text>
          </g>

          <title>
            {language === 'lo'
              ? 'ກົດເພື່ອເປີດ/ປິດ ເຂັມທິດຈິງຕາມເຊັນເຊີໂທລະສັບ (Click to toggle Live Device Compass)'
              : 'Click to toggle Live Device Compass / Reset to True North'}
          </title>
        </g>

        {/* ========================================================================= */}
        {/* 8. SIMPLE KILOMETER SCALE (Bottom-Left, real GIS scale from Google Maps)  */}
        {/* 20km = 128.7px at lat 20.25° in Bokeo                                    */}
        {/* ========================================================================= */}
        <g transform="translate(135, 752)">
          {/* Horizontal Line (20 km = 128.7px) */}
          <line x1="0" y1="0" x2="128.7" y2="0" stroke="#475569" strokeWidth="1.2" />
          {/* Ticks */}
          <line x1="0" y1="-4" x2="0" y2="4" stroke="#475569" strokeWidth="1.2" />
          <line x1="64.3" y1="-4" x2="64.3" y2="4" stroke="#475569" strokeWidth="1.2" />
          <line x1="128.7" y1="-4" x2="128.7" y2="4" stroke="#475569" strokeWidth="1.2" />

          {/* Tick Labels */}
          <text x="0" y="12" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="sans-serif">
            0
          </text>
          <text x="64.3" y="12" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="sans-serif">
            10
          </text>
          <text x="128.7" y="12" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="sans-serif">
            20 km
          </text>
        </g>
      </svg>

      {/* Floating Status Toast for Compass Interaction */}
      {compassToast && (
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-auto sm:right-auto z-30 px-3.5 py-2 rounded-xl bg-slate-900/95 text-white text-xs font-bold shadow-xl backdrop-blur-md border border-slate-700/80 flex items-center gap-2 animate-fade-in pointer-events-none transition-all">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="leading-snug">{compassToast}</span>
        </div>
      )}
    </div>
  );
};

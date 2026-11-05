import React from 'react';
import { Village, Language } from '../types';

export interface LocationItem {
  id: string;
  name: string;
  nameLo: string;
  nameTh: string;
  desc: string;
  descLo: string;
  descTh: string;
  imageUrl: string;
  pinX: number; // Percentage 0 - 100
  pinY: number; // Percentage 0 - 100
  villageRef?: Village;
}

interface BokeoPastelGISMapProps {
  churchLocations: LocationItem[];
  activeLocationId: string;
  onSelectLocation: (id: string, villageRef?: Village) => void;
  language: Language;
}

/**
 * Pixel-Perfect Bokeo Province Map matching user reference screenshot:
 * - Organic pastel sage-green silhouette of Bokeo Province (ແຂວງບໍ່ແກ້ວ)
 * - Delicate light district boundary lines (ເສັ້ນສາຍແດນເມືອງນ້ອຍໆ)
 * - Distinctive red ring/pin markers (Huaysung, Mok Plai, Houayxai, Kankham, Monkeum)
 * - Bold navy/slate geographic labels
 * - Bottom-left vintage GIS compass rose & 0 10 20 30 km scale bar
 */
export const BokeoPastelGISMap: React.FC<BokeoPastelGISMapProps> = ({
  churchLocations,
  activeLocationId,
  onSelectLocation,
  language,
}) => {
  // Preset pins mapped directly to the reference screenshot's exact coordinates
  const presetPins = [
    {
      id: 'huaysung',
      nameEn: 'Huaysung',
      nameLo: 'ຫ້ວຍຊຸງ',
      x: 255,
      y: 165,
      labelX: 255,
      labelY: 195,
      labelAlign: 'middle' as const,
      subLabel: 'Huaysung / Meung',
    },
    {
      id: 'mokplai',
      nameEn: 'Mok Plai',
      nameLo: 'ມົກປາຍ',
      x: 395,
      y: 205,
      labelX: 420,
      labelY: 210,
      labelAlign: 'start' as const,
      subLabel: 'Mok Plai',
    },
    {
      id: 'moksouk', // Houayxai
      nameEn: 'Houayxai',
      nameLo: 'ຫ້ວຍຊາຍ',
      x: 180,
      y: 275,
      labelX: 205,
      labelY: 270,
      labelAlign: 'start' as const,
      subLabel: 'Houayxai Capital',
    },
    {
      id: 'kankham',
      nameEn: 'Kankham',
      nameLo: 'ແກ່ນຄຳ',
      x: 310,
      y: 380,
      labelX: 275,
      labelY: 405,
      labelAlign: 'middle' as const,
      subLabel: 'Kankham',
    },
    {
      id: 'monkeum',
      nameEn: 'Monkeum',
      nameLo: 'ມົນຄຳ',
      x: 410,
      y: 345,
      labelX: 410,
      labelY: 375,
      labelAlign: 'middle' as const,
      subLabel: 'Monkeum / Pha Oudom',
    },
  ];

  return (
    <div className="relative w-full aspect-square max-w-[400px] sm:max-w-[440px] mx-auto select-none flex items-center justify-center p-1 sm:p-2">
      {/* 1. EXACT SVG VECTOR MAP OF BOKEO PROVINCE */}
      <svg
        viewBox="0 0 540 520"
        className="w-full h-full drop-shadow-sm transition-all duration-300"
        style={{ filter: 'drop-shadow(0px 4px 10px rgba(25, 55, 30, 0.07))' }}
      >
        <defs>
          {/* Exact Soft Pastel Sage Green Gradient Fill */}
          <linearGradient id="bokeoMapFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#eaf4e8" />
            <stop offset="40%" stopColor="#deecdc" />
            <stop offset="100%" stopColor="#d3e7d0" />
          </linearGradient>

          {/* District Shading Fills matching screenshot */}
          <linearGradient id="distMeungFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#eef7ec" />
            <stop offset="100%" stopColor="#dfecde" />
          </linearGradient>
          <linearGradient id="distTonpheungFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e6f2e4" />
            <stop offset="100%" stopColor="#d7e9d4" />
          </linearGradient>
          <linearGradient id="distHuayxaiFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e7f3e5" />
            <stop offset="100%" stopColor="#daecda" />
          </linearGradient>
          <linearGradient id="distMokPlaiFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ecf5eb" />
            <stop offset="100%" stopColor="#ddecdc" />
          </linearGradient>
          <linearGradient id="distPhaOudomFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2efe0" />
            <stop offset="100%" stopColor="#d3e6d1" />
          </linearGradient>
          <linearGradient id="distPakthaFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e7f3e6" />
            <stop offset="100%" stopColor="#d8ead6" />
          </linearGradient>

          {/* Marker Filter Shadow */}
          <filter id="markerShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#881337" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* ========================================================================= */}
        {/* DISTRICT 1: Meung / Huaysung (North bulge)                               */}
        {/* ========================================================================= */}
        <path
          d="M 210,125 C 220,85 248,55 285,55 C 325,55 365,75 380,110 C 390,130 380,155 355,170 C 320,185 285,180 245,175 C 215,170 205,150 210,125 Z"
          fill="url(#distMeungFill)"
          stroke="#b4d4b1"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* ========================================================================= */}
        {/* DISTRICT 2: Tonpheung (Northwest Mekong Border)                           */}
        {/* ========================================================================= */}
        <path
          d="M 135,240 C 120,215 130,170 155,140 C 175,120 195,115 210,125 C 205,150 215,170 245,175 C 235,205 200,225 170,235 C 150,245 140,248 135,240 Z"
          fill="url(#distTonpheungFill)"
          stroke="#b4d4b1"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* ========================================================================= */}
        {/* DISTRICT 3: Huayxai (Capital & Central Mekong curve with river notch)     */}
        {/* ========================================================================= */}
        <path
          d="M 135,240 C 140,248 150,245 170,235 C 200,225 235,205 245,175 C 285,180 320,185 355,170 C 350,215 325,270 295,305 C 265,335 235,345 205,340 C 165,335 145,300 140,270 C 130,255 130,248 135,240 Z"
          fill="url(#distHuayxaiFill)"
          stroke="#b4d4b1"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* ========================================================================= */}
        {/* DISTRICT 4: Mok Plai (East bulge towards Luang Namtha / Oudomxay)         */}
        {/* ========================================================================= */}
        <path
          d="M 380,110 C 405,125 450,160 460,190 C 470,220 455,265 440,290 C 420,320 390,340 370,345 C 350,320 350,260 355,170 C 380,155 390,130 380,110 Z"
          fill="url(#distMokPlaiFill)"
          stroke="#b4d4b1"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* ========================================================================= */}
        {/* DISTRICT 5: Pha Oudom / Monkeum (Southeast extension)                     */}
        {/* ========================================================================= */}
        <path
          d="M 295,305 C 325,270 350,215 355,170 C 350,260 350,320 370,345 C 390,340 420,320 440,290 C 450,315 460,355 445,395 C 430,435 400,465 370,460 C 340,455 315,430 300,395 C 290,365 290,330 295,305 Z"
          fill="url(#distPhaOudomFill)"
          stroke="#b4d4b1"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* ========================================================================= */}
        {/* DISTRICT 6: Paktha (South / Mekong confluence)                            */}
        {/* ========================================================================= */}
        <path
          d="M 205,340 C 235,345 265,335 295,305 C 290,330 290,365 300,395 C 280,410 255,415 235,400 C 210,385 200,365 205,340 Z"
          fill="url(#distPakthaFill)"
          stroke="#b4d4b1"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* ========================================================================= */}
        {/* DELICATE DISTRICT BOUNDARY LINES (ເສັ້ນສາຍແດນເມືອງນ້ອຍໆ)                 */}
        {/* ========================================================================= */}
        <g stroke="#a6cca3" strokeWidth="1.1" strokeDasharray="3 2" fill="none">
          <path d="M 170,235 C 190,215 215,195 245,175" />
          <path d="M 245,175 C 275,180 315,180 355,170" />
          <path d="M 355,170 C 352,220 352,280 370,345" />
          <path d="M 295,305 C 320,285 345,230 355,170" />
          <path d="M 205,340 C 240,345 270,330 295,305" />
          <path d="M 295,305 C 290,340 292,375 300,395" />
        </g>

        {/* Mekong River curve indentation on the West border */}
        <path
          d="M 155,135 C 140,165 120,210 130,245 C 125,265 130,290 155,325 C 175,350 190,370 205,395"
          fill="none"
          stroke="#c0dff5"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeDasharray="4 2.5"
          opacity="0.85"
        />

        {/* ========================================================================= */}
        {/* EXACT PINS & BOLD NAVY LABELS FROM REFERENCE SCREENSHOT                   */}
        {/* ========================================================================= */}
        {presetPins.map((p) => {
          const isSelected = activeLocationId === p.id;
          const displayLabel = language === 'lo' ? p.nameLo : p.nameEn;

          return (
            <g
              key={p.id}
              onClick={() => {
                const matched = churchLocations.find((c) => c.id === p.id);
                onSelectLocation(p.id, matched?.villageRef);
              }}
              className="cursor-pointer group"
            >
              {/* Red Ring Marker matching screenshot (⭕ / 📍) */}
              <circle
                cx={p.x}
                cy={p.y}
                r="7"
                fill="#ffffff"
                stroke="#e11d48"
                strokeWidth="3.2"
                filter="url(#markerShadow)"
                className="transition-transform group-hover:scale-125"
              />
              {/* Inner Center Red Dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r="2.2"
                fill="#e11d48"
              />

              {/* Bold Dark Navy Name Label matching screenshot */}
              <text
                x={p.labelX}
                y={p.labelY}
                textAnchor={p.labelAlign}
                className="fill-[#102a43] dark:fill-slate-900 font-extrabold tracking-tight transition-all"
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textShadow: '0 1px 2px rgba(255, 255, 255, 0.95), 0 -1px 2px rgba(255, 255, 255, 0.95)',
                }}
              >
                {displayLabel}
              </text>
            </g>
          );
        })}

        {/* Secondary Minor Pin (Douxang / Tonpheung upper pin from screenshot) */}
        <g className="pointer-events-none">
          <circle cx="225" cy="120" r="4.5" fill="#ffffff" stroke="#e11d48" strokeWidth="2.2" />
          <circle cx="225" cy="120" r="1.4" fill="#e11d48" />
          <text
            x="225"
            y="136"
            textAnchor="middle"
            className="fill-[#1e3a5f]/80 font-bold"
            style={{ fontSize: '9px', textShadow: '0 1px 2px #fff' }}
          >
            {language === 'lo' ? 'ຕົ້ນເຜິ້ງ' : 'Tonpheung'}
          </text>
        </g>

        {/* Secondary Minor Pin (Near Houayxai border from screenshot) */}
        <g className="pointer-events-none">
          <circle cx="155" cy="240" r="4.5" fill="#ffffff" stroke="#e11d48" strokeWidth="2.2" />
          <circle cx="155" cy="240" r="1.4" fill="#e11d48" />
        </g>

        {/* ========================================================================= */}
        {/* VINTAGE GIS COMPASS ROSE (Bottom-Left) matching screenshot                */}
        {/* ========================================================================= */}
        <g transform="translate(85, 430)">
          <circle cx="0" cy="0" r="16" fill="none" stroke="#64748b" strokeWidth="0.9" strokeDasharray="1.5 1.5" />
          <circle cx="0" cy="0" r="11" fill="none" stroke="#64748b" strokeWidth="0.7" />

          {/* Crosshairs */}
          <line x1="0" y1="-21" x2="0" y2="21" stroke="#475569" strokeWidth="0.9" />
          <line x1="-21" y1="0" x2="21" y2="0" stroke="#475569" strokeWidth="0.9" />

          {/* 4 Pointer Star */}
          <polygon points="0,-18 3,-5 0,0 -3,-5" fill="#102a43" />
          <polygon points="0,18 3,5 0,0 -3,5" fill="#94a3b8" />
          <polygon points="18,0 5,3 0,0 5,-3" fill="#94a3b8" />
          <polygon points="-18,0 -5,3 0,0 -5,-3" fill="#94a3b8" />

          {/* North "N" Indicator */}
          <text
            x="0"
            y="-24"
            textAnchor="middle"
            fill="#102a43"
            fontSize="8.5"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            N
          </text>
        </g>

        {/* ========================================================================= */}
        {/* KILOMETER SCALE BAR (0 10 20 30 km) matching screenshot                   */}
        {/* ========================================================================= */}
        <g transform="translate(60, 475)">
          <line x1="0" y1="0" x2="72" y2="0" stroke="#475569" strokeWidth="1" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#475569" strokeWidth="1" />
          <line x1="24" y1="-3" x2="24" y2="3" stroke="#475569" strokeWidth="1" />
          <line x1="48" y1="-3" x2="48" y2="3" stroke="#475569" strokeWidth="1" />
          <line x1="72" y1="-3" x2="72" y2="3" stroke="#475569" strokeWidth="1" />

          <text x="0" y="9" textAnchor="middle" fill="#475569" fontSize="6.5" fontFamily="sans-serif">
            0
          </text>
          <text x="24" y="9" textAnchor="middle" fill="#475569" fontSize="6.5" fontFamily="sans-serif">
            10
          </text>
          <text x="48" y="9" textAnchor="middle" fill="#475569" fontSize="6.5" fontFamily="sans-serif">
            20
          </text>
          <text x="72" y="9" textAnchor="middle" fill="#475569" fontSize="6.5" fontFamily="sans-serif">
            30 km
          </text>
        </g>
      </svg>
    </div>
  );
};

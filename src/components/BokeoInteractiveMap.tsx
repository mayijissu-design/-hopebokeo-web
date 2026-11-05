import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Ruler, RotateCcw, Check, Layers } from 'lucide-react';
import { Village, Language } from '../types';
import { getVillageGPS } from './MapsTab';
import { getLocalizedDistrict, getLocalizedVillageName } from '../utils/localization';
import { formatNumber } from '../utils/numberFormat';
import { fetchRoadDrivingRoute, RouteResult } from '../utils/roadRouting';

// Google Maps styled layer thumbnail images (Matching Google Maps exact design)
const SATELLITE_THUMBNAIL = 'https://images.unsplash.com/photo-1548625361-188683526017?q=80&w=260&auto=format&fit=crop';
const ROADMAP_THUMBNAIL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23f4f1ea'/%3E%3Cpath d='M0 35 Q40 50 80 28 T120 40' fill='none' stroke='%23cbe6c4' stroke-width='32'/%3E%3Cpath d='M85 0 Q78 50 100 120' fill='none' stroke='%23bfe3f7' stroke-width='18'/%3E%3Cpath d='M0 65 L120 52' fill='none' stroke='%23ffffff' stroke-width='10'/%3E%3Cpath d='M0 65 L120 52' fill='none' stroke='%23fbbc04' stroke-width='6'/%3E%3Cpath d='M40 0 L52 120' fill='none' stroke='%23ffffff' stroke-width='12'/%3E%3Cpath d='M40 0 L52 120' fill='none' stroke='%23fbbc04' stroke-width='7'/%3E%3Cpath d='M15 120 Q55 75 35 0' fill='none' stroke='%23ffffff' stroke-width='5'/%3E%3Ccircle cx='58' cy='60' r='5' fill='%23ea4335'/%3E%3C/svg%3E";

interface BokeoInteractiveMapProps {
  villages: Village[];
  filteredVillages: Village[];
  selectedChurch: string;
  selectedDistrict: string;
  selectedProvince: string;
  mapType: 'satellite' | 'roadmap';
  onChangeMapType?: (type: 'satellite' | 'roadmap') => void;
  language: Language;
  isDistanceMode: boolean;
  onToggleDistanceMode?: () => void;
  originRowId: string;
  destRowId: string;
  roadRoute?: RouteResult | null;
  isLoadingRoute?: boolean;
  onSelectChurch?: (churchName: string) => void;
  onSetDistanceOrigin?: (rowId: string) => void;
  onSetDistanceDest?: (rowId: string) => void;
  onResetDistance?: () => void;
}

// Bokeo Province Geographic Boundaries (Laos)
const BOKEO_BOUNDS: L.LatLngBoundsExpression = [
  [19.72, 100.02], // South-West (Paktha / Mekong)
  [20.82, 101.05], // North-East (Meung / Luang Namtha border)
];

const BOKEO_CENTER: [number, number] = [20.2872662, 100.7097867];

export const BokeoInteractiveMap: React.FC<BokeoInteractiveMapProps> = ({
  villages,
  filteredVillages,
  selectedChurch,
  selectedDistrict,
  selectedProvince,
  mapType,
  onChangeMapType,
  language,
  isDistanceMode,
  onToggleDistanceMode,
  originRowId,
  destRowId,
  roadRoute,
  isLoadingRoute,
  onSelectChurch,
  onSetDistanceOrigin,
  onSetDistanceDest,
  onResetDistance,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const [isLayersOpen, setIsLayersOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<boolean>(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger guidance toast that automatically fades out after 4 seconds
  const triggerToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    setShowToast(true);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 4000); // 4 ວິນາທີ ຈາງຫາຍໄປ
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Watch distance measurement state changes and trigger bottom slide-in guidance
  useEffect(() => {
    if (!isDistanceMode) {
      setShowToast(false);
      return;
    }

    if (!originRowId) {
      const msg =
        language === 'lo'
          ? '👉 ກົດເລືອກຈຸດທີ 1 (ຕົ້ນທາງ) ເທິງແຜນທີ່'
          : language === 'th'
          ? '👉 คลิกเลือกจุดที่ 1 (ต้นทาง) บนแผนที่'
          : '👉 Click 1st location (Origin) on map';
      triggerToast(msg);
    } else if (!destRowId) {
      const msg =
        language === 'lo'
          ? '👉 ກົດເລືອກຈຸດທີ 2 (ປາຍທາງ) ເພື່ອວັດແທກໄລຍະທາງ'
          : language === 'th'
          ? '👉 คลิกเลือกจุดที่ 2 (ปลายทาง) เพื่อวัดระยะทาง'
          : '👉 Click 2nd location (Destination) on map';
      triggerToast(msg);
    } else if (isLoadingRoute) {
      const msg =
        language === 'lo'
          ? '⏳ ກຳລັງຄິດໄລ່ໄລຍະທາງຕາມຖະໜົນ...'
          : language === 'th'
          ? '⏳ กำลังคำนวณเส้นทางถนน...'
          : '⏳ Calculating road distance...';
      triggerToast(msg);
    } else if (roadRoute) {
      const msg =
        language === 'lo'
          ? `✅ ໄລຍະທາງ: ${roadRoute.distanceKm.toFixed(1)} km (~${Math.round(roadRoute.durationMinutes)} ນາທີ)`
          : language === 'th'
          ? `✅ ระยะทาง: ${roadRoute.distanceKm.toFixed(1)} กม. (~${Math.round(roadRoute.durationMinutes)} นาที)`
          : `✅ Distance: ${roadRoute.distanceKm.toFixed(1)} km (~${Math.round(roadRoute.durationMinutes)} mins)`;
      triggerToast(msg);
    }
  }, [isDistanceMode, originRowId, destRowId, isLoadingRoute, roadRoute, language, triggerToast]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: BOKEO_CENTER,
      zoom: 10,
      minZoom: 8,
      maxZoom: 19,
      maxBounds: [
        [19.4, 99.7],
        [21.2, 101.4],
      ],
      maxBoundsViscosity: 0.8,
      zoomControl: false,
      attributionControl: false,
    });

    // Attribution control bottom-right
    L.control
      .attribution({
        position: 'bottomright',
        prefix: '<span>Hope Bokeo GIS</span>',
      })
      .addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;
    routeLayerRef.current = routeLayer;

    // Trigger map size recalculation after render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    let resizeTimer: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
      resizeTimer = window.requestAnimationFrame(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when mapType changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = '';
    let maxZoom = 19;
    let subdomains: string[] | string = ['a', 'b', 'c'];

    if (mapType === 'satellite') {
      // Google Hybrid Satellite Tiles (Satellite Imagery + Clear Road & Place Labels)
      url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      maxZoom = 20;
    } else {
      // Google Roadmap Tiles (Crisp vector styled roads and terrain)
      url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      maxZoom = 20;
    }

    const tileLayer = L.tileLayer(url, {
      maxZoom,
      subdomains,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
  }, [mapType]);

  // Render Markers and Routes whenever data/filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !markersLayer || !routeLayer) return;

    markersLayer.clearLayers();
    routeLayer.clearLayers();

    // Always keep ALL candidate villages matching district & province visible on map
    // so clicking one does NOT hide all others!
    const candidateVillages = villages.filter((v) => {
      if (selectedProvince !== 'all' && v.province && !v.province.includes(selectedProvince)) {
        return false;
      }
      if (selectedDistrict !== 'all' && v.district && !v.district.includes(selectedDistrict)) {
        return false;
      }
      return true;
    });

    const displayVillages = candidateVillages.length > 0 ? candidateVillages : villages;
    const boundsPoints: [number, number][] = [];

    // Map through villages and create custom styled pins
    displayVillages.forEach((v) => {
      const gps = getVillageGPS(v);
      const isSelected = selectedChurch !== 'all' && v.name === selectedChurch;
      const vKey = v.rowId !== undefined && v.rowId !== null ? v.rowId.toString() : v.id;
      const isOrigin = isDistanceMode && originRowId && vKey === originRowId;
      const isDest = isDistanceMode && destRowId && vKey === destRowId;

      boundsPoints.push([gps.lat, gps.lng]);

      // Determine Pin Style (Needle Pin with Pointed Tail - ເຂັມໝຸດມີຫາງ)
      let pinColor = '#cc0000'; // Vibrant Red
      let pinPulse = '';

      if (isOrigin) {
        pinColor = '#0f9d58'; // Google Maps Green (Origin Point A)
        pinPulse = 'animate-bounce';
      } else if (isDest) {
        pinColor = '#cc0000'; // Google Maps Red (Destination Point B)
        pinPulse = 'animate-bounce';
      } else if (isSelected) {
        pinColor = '#f9ab00'; // Gold/Amber (Selected)
        pinPulse = 'animate-pulse';
      }

      const villageName = getLocalizedVillageName(v, language);

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex flex-col items-center group cursor-pointer -translate-x-1/2 -translate-y-full select-none ${pinPulse}">
            <!-- Pin Header Label Badge (Visible on hover or if selected/origin/dest) -->
            <div class="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md border border-white/80 whitespace-nowrap mb-0.5 transition-all pointer-events-none absolute bottom-full z-30 ${
              isSelected || isOrigin || isDest
                ? 'opacity-100 scale-100'
                : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
            } ${
              isSelected
                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                : isOrigin
                ? 'bg-emerald-600 text-white'
                : isDest
                ? 'bg-red-600 text-white'
                : 'bg-slate-900/90 text-white dark:bg-white dark:text-slate-900'
            }">
              ${isSelected ? '★ ' : ''}${isOrigin ? 'A: ' : ''}${isDest ? 'B: ' : ''}${villageName}
            </div>

            <!-- Needle Pin with Pointed Tail (ເຂັມໝຸດມີຫາງຂະໜາດກະທັດຮັດ) -->
            <div class="relative flex items-center justify-center transition-transform group-hover:scale-115 drop-shadow-md">
              <svg width="14" height="20" viewBox="0 0 14 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Pin Body with Sharp Pointed Tail -->
                <path d="M7 19.5C7 19.5 12.5 13 12.5 7.5C12.5 4.19 10.04 1.5 7 1.5C3.96 1.5 1.5 4.19 1.5 7.5C1.5 13 7 19.5 7 19.5Z" fill="${pinColor}" stroke="#ffffff" stroke-width="1.4"/>
                <!-- Center Core Dot / Needle Head -->
                <circle cx="7" cy="7.5" r="2.3" fill="#ffffff"/>
              </svg>
            </div>
            <!-- Ground Contact Drop Shadow -->
            <div class="w-2 h-0.5 bg-black/40 rounded-full blur-[0.5px] -mt-0.5"></div>
          </div>
        `,
        iconSize: [14, 20],
        iconAnchor: [7, 20],
      });

      const marker = L.marker([gps.lat, gps.lng], { icon: customIcon });

      marker.on('click', (e) => {
        if (isDistanceMode) {
          L.DomEvent.stopPropagation(e);
          // If neither is set, or both are already set (start new measurement pair)
          if (!originRowId || (originRowId && destRowId)) {
            if (onSetDistanceOrigin) onSetDistanceOrigin(vKey);
            if (onSetDistanceDest) onSetDistanceDest('');
          } else if (originRowId && !destRowId) {
            if (originRowId !== vKey) {
              if (onSetDistanceDest) onSetDistanceDest(vKey);
            }
          }
          return;
        }

        if (onSelectChurch) {
          onSelectChurch(isSelected ? 'all' : v.name);
        }
      });

      markersLayer.addLayer(marker);
    });

    // Handle Distance Measurement Route Line along Real Roads
    if (isDistanceMode && originRowId && destRowId && originRowId !== destRowId) {
      const vA = villages.find(
        (v) => (v.rowId !== undefined && v.rowId !== null ? v.rowId.toString() === originRowId : v.id === originRowId)
      );
      const vB = villages.find(
        (v) => (v.rowId !== undefined && v.rowId !== null ? v.rowId.toString() === destRowId : v.id === destRowId)
      );

      if (vA && vB) {
        const gpsA = getVillageGPS(vA);
        const gpsB = getVillageGPS(vB);

        const drawRoute = (coords: [number, number][], distKm: number, durationMin: number, isReal: boolean) => {
          routeLayer.clearLayers();

          // 1. Google Maps style route casing (outer dark border)
          const casingLine = L.polyline(coords, {
            color: '#1e3a8a',
            weight: 7,
            opacity: 0.75,
            lineCap: 'round',
            lineJoin: 'round',
          });
          routeLayer.addLayer(casingLine);

          // 2. Main vivid road line (Google Maps route blue)
          const roadLine = L.polyline(coords, {
            color: isReal ? '#2563eb' : '#f59e0b',
            weight: 4.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          });
          routeLayer.addLayer(roadLine);

          // 3. Point A Marker (Origin: Green with 'A')
          const markerAIcon = L.divIcon({
            className: 'custom-point-a',
            html: `
              <div class="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xl border-2 border-white ring-2 ring-emerald-400 select-none">
                A
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          routeLayer.addLayer(L.marker([gpsA.lat, gpsA.lng], { icon: markerAIcon, zIndexOffset: 1000 }));

          // 4. Point B Marker (Destination: Red with 'B')
          const markerBIcon = L.divIcon({
            className: 'custom-point-b',
            html: `
              <div class="flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white font-black text-xs shadow-xl border-2 border-white ring-2 ring-rose-400 select-none">
                B
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          routeLayer.addLayer(L.marker([gpsB.lat, gpsB.lng], { icon: markerBIcon, zIndexOffset: 1000 }));

          // 5. Distance Badge along the real road (midpoint)
          const midIndex = Math.floor(coords.length / 2);
          const midPoint = coords[midIndex] || [(gpsA.lat + gpsB.lat) / 2, (gpsA.lng + gpsB.lng) / 2];

          const distanceBadgeIcon = L.divIcon({
            className: 'custom-dist-badge',
            html: `
              <div class="px-2.5 py-1 bg-slate-900/95 text-white rounded-full font-black text-xs shadow-xl border border-blue-400/80 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 select-none whitespace-nowrap backdrop-blur-sm">
                <span>🚗</span>
                <span class="text-white font-bold">${formatNumber(distKm)} km</span>
                <span class="text-[10px] text-blue-300 font-semibold">(${durationMin} ${language === 'lo' ? 'ນາທີ' : 'min'})</span>
              </div>
            `,
            iconSize: [110, 26],
            iconAnchor: [55, 13],
          });
          routeLayer.addLayer(L.marker(midPoint, { icon: distanceBadgeIcon, zIndexOffset: 1500 }));

          map.fitBounds(L.latLngBounds(coords), { padding: [60, 60], maxZoom: 14 });
        };

        if (roadRoute && roadRoute.coordinates.length > 0) {
          drawRoute(roadRoute.coordinates, roadRoute.distanceKm, roadRoute.durationMinutes, roadRoute.isRealRoad);
        } else {
          fetchRoadDrivingRoute(gpsA.lat, gpsA.lng, gpsB.lat, gpsB.lng).then((res) => {
            if (!mapInstanceRef.current || !routeLayerRef.current) return;
            drawRoute(res.coordinates, res.distanceKm, res.durationMinutes, res.isRealRoad);
          });
        }
        return;
      }
    }

    // Viewport zoom behavior:
    if (selectedChurch !== 'all') {
      const target = displayVillages.find((v) => v.name === selectedChurch);
      if (target) {
        const gps = getVillageGPS(target);
        map.setView([gps.lat, gps.lng], 14, { animate: true });
      }
    } else if (boundsPoints.length > 0 && selectedDistrict !== 'all') {
      map.fitBounds(boundsPoints, { padding: [50, 50], maxZoom: 13 });
    } else if (boundsPoints.length > 0) {
      map.fitBounds(boundsPoints, { padding: [40, 40], maxZoom: 11 });
    } else {
      map.fitBounds(BOKEO_BOUNDS, { padding: [20, 20] });
    }
  }, [
    villages,
    filteredVillages,
    selectedChurch,
    selectedDistrict,
    selectedProvince,
    language,
    isDistanceMode,
    originRowId,
    destRowId,
    roadRoute,
    onSelectChurch,
  ]);

  return (
    <div className="w-full h-full min-h-[360px] relative overflow-hidden shadow-inner group">
      {/* Interactive Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Sliding Bottom Guidance Text (Slides up on click, automatically fades out after 4 seconds) */}
      <div
        className={`absolute bottom-16 sm:bottom-5 left-1/2 -translate-x-1/2 z-[1050] pointer-events-none transition-all duration-500 ease-out max-w-[92%] sm:max-w-max ${
          showToast && toastMessage
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-slate-950/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-full border border-amber-400/80 text-white shadow-2xl flex items-center gap-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap drop-shadow-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span>{toastMessage}</span>
        </div>
      </div>

      {/* Google Maps Layer Switcher & Floating Controls at Bottom-Left */}
      <div
        className="absolute bottom-5 left-4 z-[1000] flex items-center gap-2.5 select-none"
        onMouseLeave={() => setIsLayersOpen(false)}
      >
        {onChangeMapType && (
          <div className="relative">
            {/* Expanded Layer Selection Drawer */}
            {isLayersOpen && (
              <div className="absolute bottom-full left-0 mb-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-none shadow-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 animate-fade-in">
                {/* Satellite Option */}
                <button
                  type="button"
                  onClick={() => {
                    onChangeMapType('satellite');
                    setIsLayersOpen(false);
                  }}
                  className={`flex flex-col items-center gap-0.5 p-1 rounded-none transition-all cursor-pointer group/sat ${
                    mapType === 'satellite'
                      ? 'ring-2 ring-blue-500 bg-blue-50/70 dark:bg-blue-950/50'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 opacity-80 hover:opacity-100'
                  }`}
                  title={language === 'lo' ? 'ດາວທຽມ (Satellite)' : 'Satellite'}
                >
                  <div className="relative w-10 h-10 rounded-none overflow-hidden border border-slate-300 dark:border-slate-700 shadow-2xs">
                    <img
                      src={SATELLITE_THUMBNAIL}
                      alt="Satellite"
                      className="w-full h-full object-cover transition duration-300 group-hover/sat:scale-105"
                    />
                    {mapType === 'satellite' && (
                      <div className="absolute top-0.5 right-0.5 bg-blue-600 text-white rounded-full p-0.5 shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                    {language === 'lo' ? 'ດາວທຽມ' : 'Satellite'}
                  </span>
                </button>

                {/* Roadmap Option */}
                <button
                  type="button"
                  onClick={() => {
                    onChangeMapType('roadmap');
                    setIsLayersOpen(false);
                  }}
                  className={`flex flex-col items-center gap-0.5 p-1 rounded-none transition-all cursor-pointer group/road ${
                    mapType === 'roadmap'
                      ? 'ring-2 ring-blue-500 bg-blue-50/70 dark:bg-blue-950/50'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 opacity-80 hover:opacity-100'
                  }`}
                  title={language === 'lo' ? 'ຖະໜົນ (Roadmap)' : 'Roadmap'}
                >
                  <div className="relative w-10 h-10 rounded-none overflow-hidden border border-slate-300 dark:border-slate-700 shadow-2xs">
                    <img
                      src={ROADMAP_THUMBNAIL}
                      alt="Roadmap"
                      className="w-full h-full object-cover transition duration-300 group-hover/road:scale-105"
                    />
                    {mapType === 'roadmap' && (
                      <div className="absolute top-0.5 right-0.5 bg-blue-600 text-white rounded-full p-0.5 shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                    {language === 'lo' ? 'ຖະໜົນ' : 'Roadmap'}
                  </span>
                </button>
              </div>
            )}

            {/* Main Google Maps Square Thumbnail Button */}
            <div className="relative group/main">
              <button
                type="button"
                onClick={() => onChangeMapType(mapType === 'satellite' ? 'roadmap' : 'satellite')}
                onMouseEnter={() => setIsLayersOpen(true)}
                className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-lg shadow-black/30 cursor-pointer select-none transition-all duration-200 hover:scale-105 active:scale-95 block focus:outline-none focus:ring-2 focus:ring-blue-400"
                title={
                  mapType === 'satellite'
                    ? (language === 'lo' ? 'ປ່ຽນເປັນ ແຜນທີ່ຖະໜົນ (Roadmap)' : 'Switch to Roadmap')
                    : (language === 'lo' ? 'ປ່ຽນເປັນ ແຜນທີ່ດາວທຽມ (Satellite)' : 'Switch to Satellite')
                }
              >
                <img
                  src={mapType === 'satellite' ? ROADMAP_THUMBNAIL : SATELLITE_THUMBNAIL}
                  alt={mapType === 'satellite' ? 'Roadmap' : 'Satellite'}
                  className="w-full h-full object-cover select-none pointer-events-none transition duration-500 group-hover/main:scale-110"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-1.5 pb-0.5 px-0.5 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-[8px] sm:text-[9px] font-bold tracking-tight drop-shadow-xs select-none leading-none">
                    {mapType === 'satellite' ? 'Map' : 'Sat'}
                  </span>
                </div>
              </button>

              {/* Small Layers icon hint at top-right */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLayersOpen((prev) => !prev);
                }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center transition hover:scale-110 cursor-pointer z-10"
                title={language === 'lo' ? 'ເລືອກຊັ້ນແຜນທີ່' : 'Layers'}
              >
                <Layers className="w-2.5 h-2.5 text-slate-700 dark:text-slate-300" />
              </button>
            </div>
          </div>
        )}

        {/* Google Maps Styled Distance Measurement Tool */}
        {onToggleDistanceMode && (
          <button
            type="button"
            onClick={onToggleDistanceMode}
            className={`h-10 sm:h-11 px-3 sm:px-3.5 rounded-xl backdrop-blur-md shadow-lg border transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
              isDistanceMode
                ? 'bg-blue-600 dark:bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/40 shadow-blue-500/25'
                : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-white dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800'
            }`}
            title={
              isDistanceMode
                ? (language === 'lo' ? 'ປິດໂໝດວັດແທກໄລຍະທາງ' : 'Close Measure Mode')
                : (language === 'lo' ? 'ວັດແທກໄລຍະທາງຕາມເສັ້ນທາງຈິງ' : 'Measure Road Distance')
            }
          >
            <Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-xs sm:text-[13px] font-bold">
              {language === 'lo' ? 'ວັດແທກ' : 'Measure'}
            </span>
            {isDistanceMode && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>
        )}

        {/* Reset / New measurement button */}
        {isDistanceMode && (originRowId || destRowId) && onResetDistance && (
          <button
            type="button"
            onClick={onResetDistance}
            className="h-10 sm:h-11 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-[13px] shadow-lg transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title={language === 'lo' ? 'ເລີ່ມວັດແທກໃໝ່' : 'New Measurement'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'lo' ? 'ໃໝ່' : 'Reset'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

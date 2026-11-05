import React, { useState, useEffect, useMemo } from "react";
import { MapPin, ExternalLink, Globe } from "lucide-react";
import { Village, Language } from "../types";
import { BokeoInteractiveMap } from "./BokeoInteractiveMap";
import { parseCoordinatesFromUrl, normalizeCoordinates } from "../utils/mapUtils";
import { fetchRoadDrivingRoute, RouteResult } from "../utils/roadRouting";
import { getLocalizedDistrict, getLocalizedVillageName } from "../utils/localization";

const DISTRICT_CENTERS: Record<string, { lat: number; lng: number }> = {
  huayxai: { lat: 20.2764, lng: 100.413 },
  houayxay: { lat: 20.2764, lng: 100.413 },
  ຫ້ວຍຊາຍ: { lat: 20.2764, lng: 100.413 },
  tonpheung: { lat: 20.345, lng: 100.118 },
  ຕົ້ນເຜິ້ງ: { lat: 20.345, lng: 100.118 },
  meung: { lat: 20.675, lng: 100.525 },
  ເມິງ: { lat: 20.675, lng: 100.525 },
  phaoudom: { lat: 20.088, lng: 100.825 },
  "pha oudom": { lat: 20.088, lng: 100.825 },
  ຜາອຸດົມ: { lat: 20.088, lng: 100.825 },
  paktha: { lat: 19.915, lng: 100.595 },
  ປາກທາ: { lat: 19.915, lng: 100.595 },
};

export function getVillageGPS(v: Partial<Village>): { lat: number; lng: number } {
  const directLat = Number(v.lat ?? (v as any).latitude);
  const directLng = Number(v.lng ?? (v as any).longitude);

  if (!isNaN(directLat) && !isNaN(directLng) && directLat > 14 && directLat < 24 && directLng > 98 && directLng < 109) {
    return { lat: directLat, lng: directLng };
  }

  if (v.mapUrl) {
    const parsed = parseCoordinatesFromUrl(v.mapUrl);
    if (parsed) {
      return { lat: parsed.lat, lng: parsed.lng };
    }
  }

  const vGps = (v as any).gps;
  if (vGps && typeof vGps === "string") {
    const parsed = parseCoordinatesFromUrl(vGps);
    if (parsed) {
      return { lat: parsed.lat, lng: parsed.lng };
    }
    if (vGps.includes(",")) {
      const parts = vGps.split(",").map((p: string) => parseFloat(p.trim()));
      const norm = normalizeCoordinates(parts[0], parts[1]);
      if (norm) return norm;
    }
  }

  const dKey = (v.district || "").toLowerCase().replace(/\s+/g, "");
  const center =
    DISTRICT_CENTERS[dKey] ||
    DISTRICT_CENTERS[(v.district || "").trim()] ||
    { lat: 20.2764, lng: 100.413 };

  const seedStr = String(v.id || v.rowId || v.name || "1");
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((hash % 100) / 100) * 0.035;
  const offsetLng = (((hash >> 4) % 100) / 100) * 0.035;

  return {
    lat: Number((center.lat + offsetLat).toFixed(6)),
    lng: Number((center.lng + offsetLng).toFixed(6)),
  };
}

export interface MapsTabProps {
  villages: Village[];
  language: Language;
  selectedProvince?: string;
  selectedDistrict?: string;
  selectedChurch?: string;
}

export const MapsTab: React.FC<MapsTabProps> = ({
  villages,
  language,
  selectedProvince = "all",
  selectedDistrict = "all",
  selectedChurch: propSelectedChurch = "all",
}) => {
  const [mapType, setMapType] = useState<"satellite" | "roadmap">("satellite");
  const [activeChurch, setActiveChurch] = useState<string>(propSelectedChurch);
  const [isDistanceMode, setIsDistanceMode] = useState<boolean>(false);
  const [originRowId, setOriginRowId] = useState<string>("");
  const [destRowId, setDestRowId] = useState<string>("");
  const [roadRoute, setRoadRoute] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);

  useEffect(() => {
    setActiveChurch(propSelectedChurch);
  }, [propSelectedChurch]);

  const visibleVillages = useMemo(
    () => (villages || []).filter((v) => !v.hidden),
    [villages]
  );

  useEffect(() => {
    if (!isDistanceMode || !originRowId || !destRowId) {
      setRoadRoute(null);
      return;
    }

    const originV = visibleVillages.find((v) => String(v.rowId) === String(originRowId));
    const destV = visibleVillages.find((v) => String(v.rowId) === String(destRowId));
    if (!originV || !destV) {
      setRoadRoute(null);
      return;
    }

    const p1 = getVillageGPS(originV);
    const p2 = getVillageGPS(destV);

    let cancelled = false;
    setIsLoadingRoute(true);
    fetchRoadDrivingRoute(p1.lat, p1.lng, p2.lat, p2.lng)
      .then((res) => {
        if (!cancelled) {
          setRoadRoute(res);
          setIsLoadingRoute(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoadingRoute(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isDistanceMode, originRowId, destRowId, visibleVillages]);

  const selectedVillageObj = useMemo(() => {
    if (!activeChurch || activeChurch === "all") return null;
    return visibleVillages.find((v) => v.name === activeChurch) || null;
  }, [activeChurch, visibleVillages]);

  const fieldPhotoUrl = useMemo(() => {
    if (selectedVillageObj?.imageUrl) return selectedVillageObj.imageUrl;
    const withImg = visibleVillages.find((v) => v.imageUrl && v.imageUrl.trim() !== "");
    if (withImg?.imageUrl) return withImg.imageUrl;
    return "/uploads/c084c02a-adf5-4498-ace3-aac9a4626ad2_jpg_1788505827641_344.jpg";
  }, [selectedVillageObj, visibleVillages]);

  const locationTitle = useMemo(() => {
    if (selectedVillageObj) {
      return getLocalizedVillageName(selectedVillageObj, language);
    }
    if (selectedDistrict && selectedDistrict !== "all") {
      return getLocalizedDistrict(selectedDistrict, language);
    }
    return language === "lo" ? "ແຂວງບໍ່ແກ້ວ" : language === "th" ? "แขวงบ่อแก้ว" : "Bokeo Province";
  }, [selectedVillageObj, selectedDistrict, language]);

  const gpsDisplay = useMemo(() => {
    if (selectedVillageObj) {
      const gps = getVillageGPS(selectedVillageObj);
      return `${gps.lat.toFixed(4)}° N, ${gps.lng.toFixed(4)}° E`;
    }
    return "20.2873° N, 100.7098° E";
  }, [selectedVillageObj]);

  const googleMapsHref = useMemo(() => {
    if (selectedVillageObj) {
      if (selectedVillageObj.mapUrl && selectedVillageObj.mapUrl.startsWith("http")) {
        return selectedVillageObj.mapUrl;
      }
      const gps = getVillageGPS(selectedVillageObj);
      return `https://www.google.com/maps/search/?api=1&query=${gps.lat},${gps.lng}`;
    }
    return "https://www.google.com/maps/search/?api=1&query=20.2873,100.7098";
  }, [selectedVillageObj]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* Left Column: Interactive Satellite & Roadmap */}
      <div className="lg:col-span-8 w-full h-[400px] sm:h-[460px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs relative">
        <BokeoInteractiveMap
          villages={visibleVillages}
          filteredVillages={visibleVillages}
          selectedChurch={activeChurch}
          selectedDistrict={selectedDistrict}
          selectedProvince={selectedProvince}
          mapType={mapType}
          onChangeMapType={setMapType}
          language={language}
          isDistanceMode={isDistanceMode}
          onToggleDistanceMode={() => {
            setIsDistanceMode((prev) => {
              const next = !prev;
              if (!next) {
                setOriginRowId("");
                setDestRowId("");
                setRoadRoute(null);
              }
              return next;
            });
          }}
          originRowId={originRowId}
          destRowId={destRowId}
          roadRoute={roadRoute}
          isLoadingRoute={isLoadingRoute}
          onSelectChurch={(name) => setActiveChurch(name)}
          onSetDistanceOrigin={(rowId) => setOriginRowId(rowId)}
          onSetDistanceDest={(rowId) => setDestRowId(rowId)}
          onResetDistance={() => {
            setOriginRowId("");
            setDestRowId("");
            setRoadRoute(null);
          }}
        />
      </div>

      {/* Right Column: Area Field Photograph + GIS Satellite Geodata */}
      <div className="lg:col-span-4 flex flex-col gap-4 h-full">
        {/* Top Photo Card */}
        <div className="relative h-44 sm:h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs shrink-0 bg-slate-900">
          <img
            src={fieldPhotoUrl}
            alt={locationTitle}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "/uploads/c084c02a-adf5-4498-ace3-aac9a4626ad2_jpg_1788505827641_344.jpg";
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
          <div className="absolute bottom-3 left-3.5 right-3.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-0.5">
              {language === "lo" ? "ຮູບພາບພື້ນທີ່ພັນທະກິດ" : language === "th" ? "ภาพถ่ายพื้นที่พันธกิจ" : "AREA FIELD PHOTOGRAPH"}
            </div>
            <div className="flex items-center gap-1.5 text-white font-black text-sm sm:text-base">
              <MapPin className="w-4 h-4 text-red-500 shrink-0" />
              <span className="truncate">{locationTitle}</span>
            </div>
          </div>
        </div>

        {/* Bottom GIS Satellite Geodata Card */}
        <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-700/80">
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h4 className="font-black text-xs sm:text-[13px] text-slate-900 dark:text-white">
                {language === "lo"
                  ? "ຂໍ້ມູນພິກັດດາວທຽມ (GIS Satellite Geodata)"
                  : language === "th"
                  ? "ข้อมูลพิกัดดาวเทียม (GIS Satellite Geodata)"
                  : "GIS Satellite Geodata"}
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {language === "lo" ? "ພິກັດ GPS:" : language === "th" ? "พิกัด GPS:" : "GPS Coordinates:"}
                </span>
                <span className="font-black text-[#cc0000] dark:text-red-400 tabular-nums">
                  {gpsDisplay}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {language === "lo" ? "ແຂວງ / ປະເທດ:" : language === "th" ? "แขวง / ประเทศ:" : "Province / State:"}
                </span>
                <span className="font-black text-slate-800 dark:text-slate-200">
                  {selectedVillageObj
                    ? `${getLocalizedDistrict(selectedVillageObj.district, language)}, Bokeo`
                    : language === "lo"
                    ? "ແຂວງບໍ່ແກ້ວ, ສປປ ລາວ"
                    : language === "th"
                    ? "แขวงบ่อแก้ว, สปป.ลาว"
                    : "Bokeo Province, Lao PDR"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {language === "lo" ? "ລະດັບຄວາມສູງ:" : language === "th" ? "ระดับความสูง:" : "Elevation:"}
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  380m - 1,450m AMSL
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {language === "lo" ? "ຈຸດໝຸດພັນທະກິດ:" : language === "th" ? "จุดหมุดพันธกิจ:" : "Plotted Field Pins:"}
                </span>
                <span className="font-black text-blue-600 dark:text-blue-400 tabular-nums">
                  {visibleVillages.length} {language === "lo" ? "ສະຖານທີ່" : language === "th" ? "สถานที่" : "Locations"}
                </span>
              </div>
            </div>
          </div>

          <a
            href={googleMapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>
              {language === "lo"
                ? "ເປີດສະຖານທີ່ໃນ Google Maps"
                : language === "th"
                ? "เปิดสถานที่ใน Google Maps"
                : "Open Location in Google Maps"}
            </span>
          </a>
        </div>
      </div>
    </div>
  );
};

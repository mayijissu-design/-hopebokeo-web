import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Check,
  Compass,
  RotateCcw,
} from "lucide-react";
import { MinistryTimelineItem, Language } from "../types";
import { UnifiedMediaUploader } from "./UnifiedMediaUploader";
import { DEFAULT_BOKEO_TIMELINE } from "../data/timelineDefaults";

export interface MinistryTimelineManagerProps {
  timeline: MinistryTimelineItem[];
  onChangeTimeline: (timeline: MinistryTimelineItem[]) => void;
  language: Language;
  timelineTitle?: string;
  onChangeTimelineTitle?: (title: string) => void;
  timelineTitleEn?: string;
  onChangeTimelineTitleEn?: (title: string) => void;
  timelineTitleTh?: string;
  onChangeTimelineTitleTh?: (title: string) => void;
  hideTimeline?: boolean;
  onToggleHideTimeline?: (hide: boolean) => void;
}

export const MinistryTimelineManager: React.FC<MinistryTimelineManagerProps> = ({
  timeline,
  onChangeTimeline,
  language,
  timelineTitle = "",
  onChangeTimelineTitle,
  timelineTitleEn = "",
  onChangeTimelineTitleEn,
  timelineTitleTh = "",
  onChangeTimelineTitleTh,
  hideTimeline = false,
  onToggleHideTimeline,
}) => {
  const [titleLang, setTitleLang] = useState<"la" | "tha" | "en">("la");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editLang, setEditLang] = useState<"la" | "tha" | "en">("la");
  const [formData, setFormData] = useState<Partial<MinistryTimelineItem>>({});

  const handleLoadDefaults = () => {
    onChangeTimeline(DEFAULT_BOKEO_TIMELINE);
  };

  const handleAddNew = () => {
    const newItem: MinistryTimelineItem = {
      id: "timeline_" + Date.now(),
      year: new Date().getFullYear().toString(),
      title: language === "lo" ? "ເຫດການໃໝ່" : "New Milestone",
      titleEn: "New Milestone",
      titleTh: "เหตุการณ์ใหม่",
      description: "",
      descriptionEn: "",
      descriptionTh: "",
      imageUrls: [],
      order: timeline.length + 1,
    };
    onChangeTimeline([...timeline, newItem]);
    setEditingItemId(newItem.id);
    setFormData(newItem);
  };

  const handleSaveEdit = () => {
    if (!editingItemId) return;
    const updated = timeline.map((item) =>
      item.id === editingItemId ? ({ ...item, ...formData } as MinistryTimelineItem) : item
    );
    onChangeTimeline(updated);
    setEditingItemId(null);
    setFormData({});
  };

  const handleDelete = (id: string) => {
    onChangeTimeline(timeline.filter((item) => item.id !== id));
    if (editingItemId === id) {
      setEditingItemId(null);
      setFormData({});
    }
  };

  const handleToggleHide = (id: string) => {
    const updated = timeline.map((item) =>
      item.id === id ? { ...item, hidden: !item.hidden } : item
    );
    onChangeTimeline(updated);
    if (editingItemId === id) {
      setFormData((prev) => ({ ...prev, hidden: !prev.hidden }));
    }
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= timeline.length) return;
    const updated = [...timeline];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChangeTimeline(updated.map((it, idx) => ({ ...it, order: idx + 1 })));
  };

  const currentSectionTitle =
    titleLang === "en"
      ? timelineTitleEn
      : titleLang === "tha"
      ? timelineTitleTh
      : timelineTitle;

  const handleSectionTitleChange = (val: string) => {
    if (titleLang === "en") onChangeTimelineTitleEn?.(val);
    else if (titleLang === "tha") onChangeTimelineTitleTh?.(val);
    else onChangeTimelineTitle?.(val);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
      {/* Header matching image_41ef1b5e.png */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[#cc0000] font-black text-xs uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>TIMELINE & ORIGIN STORY MANAGER</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>⏳</span>
              <span>
                {language === "lo"
                  ? "ຈຸດເລີ່ມຕົ້ນ ແລະ ການເດີນທາງຂອງພັນທະກິດ"
                  : language === "th"
                  ? "จุดเริ่มต้นและการเดินทางของพันธกิจ"
                  : "Ministry Origin Story & Timeline"}
              </span>
            </h3>
            {onToggleHideTimeline && (
              <button
                type="button"
                onClick={() => onToggleHideTimeline(!hideTimeline)}
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition cursor-pointer ${
                  hideTimeline
                    ? "bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400"
                    : "bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400"
                }`}
                title={hideTimeline ? "Hidden (Click to show)" : "Visible (Click to hide)"}
              >
                {hideTimeline ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            {language === "lo"
              ? "ສະແດງເສັ້ນເວລາປະຫວັດຄວາມເປັນມາຂອງພັນທະກິດ ພ້ອມປີ, ຄຳອະທິບາຍ ແລະ ຮູບພາບປະກອບ"
              : "Displays a continuous vertical timeline running top-to-bottom on the far left with year, description, and images"}
          </p>
        </div>

        <div className="flex sm:flex-col items-stretch sm:items-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadDefaults}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === "lo" ? "ໂຫຼດຄ່າເລີ່ມຕົ້ນ" : "Load Defaults"}</span>
          </button>

          <button
            type="button"
            onClick={handleAddNew}
            className="px-4 py-2 bg-[#cc0000] hover:bg-red-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === "lo" ? "+ ເພີ່ມເຫດການ" : "+ Add Milestone"}</span>
          </button>
        </div>
      </div>

      {/* Timeline Section Title Box */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-black text-slate-800 dark:text-slate-200">
            {language === "lo" ? "ຫົວຂໍ້ພາກສ່ວນເສັ້ນເວລາ (Timeline Section Title)" : "Timeline Section Title"}
          </label>
          <div className="inline-flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
            {(
              [
                { id: "la", label: "La" },
                { id: "tha", label: "Tha" },
                { id: "en", label: "En" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTitleLang(tab.id)}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  titleLang === tab.id
                    ? "bg-[#cc0000] text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          value={currentSectionTitle}
          onChange={(e) => handleSectionTitleChange(e.target.value)}
          placeholder={
            titleLang === "en"
              ? "A Journey of Faith and Faithful Service"
              : titleLang === "tha"
              ? "จุดเริ่มต้นและการเดินทางของพันธกิจ"
              : "ຈຸດເລີ່ມຕົ້ນ ແລະ ການເດີນທາງຂອງພັນທະກິດ"
          }
          className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#cc0000]"
        />
      </div>

      {/* All Timeline Milestones Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
            {language === "lo"
              ? `ລາຍການເຫດການທັງໝົດ (${timeline.length})`
              : `All Timeline Milestones (${timeline.length})`}
          </h4>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {language === "lo" ? "ໃຊ້ປຸ່ມ ຂຶ້ນ/ລົງ ເພື່ອຈັດລຽງລຳດັບ" : "Use Up/Down to reorder milestones"}
          </span>
        </div>

        <div className="space-y-3">
          {timeline.map((item, idx) => {
            const isEditing = editingItemId === item.id;
            const isHidden = Boolean(item.hidden);
            const allImages = [
              ...(item.imageUrl ? [item.imageUrl] : []),
              ...(Array.isArray(item.imageUrls)
                ? item.imageUrls.filter((u) => u && u !== item.imageUrl)
                : []),
            ];
            const thumbUrl =
              allImages[0] ||
              (idx === 0
                ? "/uploads/timeline_0_0_1790760136842.jpg"
                : idx === 1
                ? "/uploads/timeline_1_0_1790760137428.jpg"
                : "/uploads/timeline_2_0_1790760138092.jpg");

            return (
              <div
                key={item.id || idx}
                className={`p-3.5 sm:p-4 rounded-2xl border transition ${
                  isHidden
                    ? "bg-slate-100/60 dark:bg-slate-900/40 border-amber-300/70 dark:border-amber-800/60"
                    : "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-700"
                }`}
              >
                {!isEditing ? (
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={`flex items-center gap-3 min-w-0 flex-1 transition ${
                        isHidden ? "opacity-55" : ""
                      }`}
                    >
                      {/* Red-bordered Year Box */}
                      <div className="w-[74px] py-1.5 px-2 rounded-xl border-2 border-[#cc0000] bg-white dark:bg-slate-800 text-center shrink-0">
                        <div className="text-[9px] font-black text-[#cc0000] uppercase leading-tight">
                          ປີ/YEAR
                        </div>
                        <div className="text-xs font-black text-slate-900 dark:text-white truncate mt-0.5">
                          {item.year}
                        </div>
                      </div>

                      {/* Thumbnail */}
                      <img
                        src={thumbUrl}
                        alt={item.title}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-200"
                      />

                      {/* Title, Badges & Description */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {item.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                            {item.year}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            🖼️ {allImages.length || 2} {language === "lo" ? "ຮູບພາບ" : "photos"}
                          </span>
                          {isHidden && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1">
                              <EyeOff className="w-3 h-3" />
                              <span>{language === "lo" ? "ເຊື່ອງຢູ່" : "Hidden"}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                          {item.description || item.descriptionEn}
                        </p>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, "down")}
                        disabled={idx === timeline.length - 1}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleHide(item.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                          isHidden
                            ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                            : "bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700"
                        }`}
                        title={
                          isHidden
                            ? language === "lo"
                              ? "ກົດເພື່ອສະແດງທາມລາຍນີ້"
                              : "Click to show this milestone"
                            : language === "lo"
                            ? "ກົດເພື່ອເຊື່ອງທາມລາຍນີ້"
                            : "Click to hide this milestone"
                        }
                      >
                        {isHidden ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>{language === "lo" ? "ສະແດງ" : "Show"}</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>{language === "lo" ? "ເຊື່ອງ" : "Hide"}</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemId(item.id);
                          setFormData(item);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5">
                      <span className="text-xs font-black text-[#cc0000] uppercase">
                        {language === "lo" ? "ແກ້ໄຂຂໍ້ມູນເຫດການ" : "Edit Milestone"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, hidden: !formData.hidden })}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition cursor-pointer ${
                            formData.hidden
                              ? "bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400"
                              : "bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400"
                          }`}
                        >
                          {formData.hidden ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>{language === "lo" ? "ເຊື່ອງຢູ່" : "Hidden"}</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>{language === "lo" ? "ສະແດງຢູ່" : "Visible"}</span>
                            </>
                          )}
                        </button>
                        <div className="inline-flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
                          {(
                            [
                              { id: "la", label: "La" },
                              { id: "tha", label: "Tha" },
                              { id: "en", label: "En" },
                            ] as const
                          ).map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setEditLang(tab.id)}
                              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                editLang === tab.id
                                  ? "bg-[#cc0000] text-white"
                                  : "text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          ປີ / Year
                        </label>
                        <input
                          type="text"
                          value={formData.year || ""}
                          onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          {editLang === "en"
                            ? "Title (English)"
                            : editLang === "tha"
                            ? "หัวข้อ (ภาษาไทย)"
                            : "ຫົວຂໍ້ (ພາສາລາວ)"}
                        </label>
                        <input
                          type="text"
                          value={
                            editLang === "en"
                              ? formData.titleEn ?? ""
                              : editLang === "tha"
                              ? formData.titleTh ?? ""
                              : formData.title ?? ""
                          }
                          onChange={(e) => {
                            if (editLang === "en")
                              setFormData({ ...formData, titleEn: e.target.value });
                            else if (editLang === "tha")
                              setFormData({ ...formData, titleTh: e.target.value });
                            else setFormData({ ...formData, title: e.target.value });
                          }}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        {editLang === "en"
                          ? "Description (English)"
                          : editLang === "tha"
                          ? "คำอธิบาย (ภาษาไทย)"
                          : "ຄຳອະທິບາຍ (ພາສາລາວ)"}
                      </label>
                      <textarea
                        rows={3}
                        value={
                          editLang === "en"
                            ? formData.descriptionEn ?? ""
                            : editLang === "tha"
                            ? formData.descriptionTh ?? ""
                            : formData.description ?? ""
                        }
                        onChange={(e) => {
                          if (editLang === "en")
                            setFormData({ ...formData, descriptionEn: e.target.value });
                          else if (editLang === "tha")
                            setFormData({ ...formData, descriptionTh: e.target.value });
                          else setFormData({ ...formData, description: e.target.value });
                        }}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-500">
                        {language === "lo" ? "ຮູບພາບປະກອບ:" : "Milestone Photos:"}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(formData.imageUrls || []).map((img, i) => (
                          <div
                            key={i}
                            className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group"
                          >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...(formData.imageUrls || [])];
                                next.splice(i, 1);
                                setFormData({ ...formData, imageUrls: next, imageUrl: next[0] || "" });
                              }}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <UnifiedMediaUploader
                        value=""
                        onChange={(url) => {
                          if (!url) return;
                          const next = [...(formData.imageUrls || []), url];
                          setFormData({ ...formData, imageUrls: next, imageUrl: next[0] || url });
                        }}
                        language={language}
                        acceptTypes="image/*"
                        label={language === "lo" ? "ເພີ່ມຮູບພາບໃໝ່:" : "Add Photo:"}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemId(null);
                          setFormData({});
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        {language === "lo" ? "ຍົກເລີກ" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{language === "lo" ? "ບັນທຶກ" : "Save"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

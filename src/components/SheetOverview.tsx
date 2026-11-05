import React from 'react';
import { Table, Layers, Hash, Calendar, FileSpreadsheet, Plus, Sparkles } from 'lucide-react';
import { Language, SheetMetadata } from '../types';

interface SheetOverviewProps {
  metadata: SheetMetadata | null;
  activeSheet: string;
  onSelectSheet: (sheetTitle: string) => void;
  totalRows: number;
  totalCols: number;
  lastUpdated: string;
  language: Language;
  onOpenAddModal: () => void;
}

export const SheetOverview: React.FC<SheetOverviewProps> = ({
  metadata,
  activeSheet,
  onSelectSheet,
  totalRows,
  totalCols,
  lastUpdated,
  language,
  onOpenAddModal,
}) => {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {language === 'la'
              ? 'ສະບາຍດີ, ຍິນດີຕ້ອນຮັບເຂົ້າສູ່ Hope Bokeo'
              : 'Welcome to Hope Bokeo Dashboard'}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
            {language === 'la'
              ? 'ພາບລວມຂອງໂຄງການ ແລະ ການຈັດການຂໍ້ມູນທັງໝົດໃນແຂວງບໍ່ແກ້ວ'
              : 'Overview and management of all community project data in Bokeo Province'}
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>
            {language === 'la' ? '+ ເພີ່ມຂໍ້ມູນໃໝ່' : '+ Add New Record'}
          </span>
        </button>
      </div>

      {/* Quick Stats Cards (4 Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Tab Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {language === 'la' ? 'ໜ້າຊີດປັດຈຸບັນ' : 'Active Tab'}
            </p>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-bold text-slate-900 truncate max-w-[150px]">
              {activeSheet || 'Sheet1'}
            </h3>
            <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded">
              Active
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full w-full rounded-full"></div>
          </div>
        </div>

        {/* Total Rows Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {language === 'la' ? 'ຈຳນວນແຖວທັງໝົດ' : 'Total Records'}
            </p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Table className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-slate-900">
              {totalRows.toLocaleString()}
            </h3>
            <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded">
              Synced
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-4/5 rounded-full"></div>
          </div>
        </div>

        {/* Total Columns Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {language === 'la' ? 'ຈຳນວນຄໍລຳ' : 'Total Columns'}
            </p>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Hash className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-slate-900">
              {totalCols}
            </h3>
            <span className="text-indigo-600 text-xs font-bold bg-indigo-50 px-2 py-0.5 rounded">
              Fields
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full w-3/5 rounded-full"></div>
          </div>
        </div>

        {/* Last Updated Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {language === 'la' ? 'ອັບເດດລ່າສຸດ' : 'Last Synced'}
            </p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              {lastUpdated || 'Just now'}
            </h3>
            <span className="text-emerald-600 text-xs font-bold">On Track</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-amber-400 h-full w-[90%] rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Sheet Tabs Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mr-2 shrink-0">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>{language === 'la' ? 'ໜ້າຊີດທັງໝົດ:' : 'Tabs:'}</span>
          </div>
          {metadata?.sheets && metadata.sheets.length > 0 ? (
            metadata.sheets.map((sheet) => {
              const isSelected = activeSheet === sheet.title;
              return (
                <button
                  key={sheet.title}
                  onClick={() => onSelectSheet(sheet.title)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {sheet.title}
                </button>
              );
            })
          ) : (
            <button
              onClick={() => onSelectSheet('Sheet1')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-md shadow-indigo-100"
            >
              Sheet1
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

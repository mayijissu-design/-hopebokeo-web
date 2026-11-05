import React from 'react';
import { FileSpreadsheet, ExternalLink, RefreshCw, Languages, CheckCircle2, AlertCircle } from 'lucide-react';
import { Language } from '../types';

interface NavbarProps {
  sheetTitle: string;
  spreadsheetId: string;
  isConnected: boolean;
  isSyncing: boolean;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  sheetTitle,
  spreadsheetId,
  isConnected,
  isSyncing,
  language,
  onLanguageChange,
  onRefresh,
}) => {
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
            H
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Hope Bokeo</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                {language === 'la' ? 'ໂຄງການ ໂຮບ ບໍ່ແກ້ວ' : 'Project System'}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-sm flex items-center gap-1.5 font-medium">
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">{sheetTitle || 'Google Sheets'}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Connection Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-slate-50 border-slate-200">
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-slate-700">
                  {language === 'la' ? 'ເຊື່ອມຕໍ່ກັບ Google Sheets ແລ້ວ' : 'Sheets Connected'}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-700">
                  {language === 'la' ? 'ກຳລັງໂຫຼດ...' : 'Connecting...'}
                </span>
              </>
            )}
          </div>

          {/* Sync / Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition border border-slate-200 flex items-center gap-1.5 text-xs font-semibold shadow-sm disabled:opacity-50"
            title={language === 'la' ? 'ອັບເດດຂໍ້ມູນ' : 'Refresh Data'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">
              {language === 'la' ? 'ອັບເດດ' : 'Sync'}
            </span>
          </button>

          {/* Open Original Google Sheet */}
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-100"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {language === 'la' ? 'ເບິ່ງໃນ Google Sheets' : 'Open Sheet'}
            </span>
          </a>

          {/* Language Toggle Button */}
          <button
            onClick={() => onLanguageChange(language === 'la' ? 'en' : 'la')}
            className="p-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
            title="Toggle Language"
          >
            <Languages className="w-4 h-4 text-indigo-600" />
            <span>{language === 'la' ? '🇱🇦 ລາວ' : '🇬🇧 EN'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Download, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { Language } from '../types';
import { formatNumber } from '../utils/numberFormat';

interface DataTableProps {
  headers: string[];
  rows: string[][];
  isLoading: boolean;
  language: Language;
}

export const DataTable: React.FC<DataTableProps> = ({
  headers,
  rows,
  isLoading,
  language,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  // Search filter
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((row) =>
      row.some((cell) => cell && cell.toString().toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

  // Sorting
  const sortedRows = useMemo(() => {
    if (sortColumnIndex === null) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const valA = (a[sortColumnIndex] || '').toString();
      const valB = (b[sortColumnIndex] || '').toString();

      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
      return sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }, [filteredRows, sortColumnIndex, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, currentPage, rowsPerPage]);

  const handleSort = (index: number) => {
    if (sortColumnIndex === index) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortColumnIndex(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumnIndex(index);
      setSortDirection('asc');
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (headers.length === 0 && rows.length === 0) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hope_bokeo_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Search & Export Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={
              language === 'la' ? 'ຄົ້ນຫາຂໍ້ມູນໃນຊີດ...' : 'Search spreadsheet rows...'
            }
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-500">
            {language === 'la'
              ? `ພົບ ${sortedRows.length} ລາຍການ`
              : `${sortedRows.length} items`}
          </span>
          <button
            onClick={exportCSV}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>{language === 'la' ? 'ດາວໂຫຼດ CSV' : 'Export Data'}</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white min-h-[320px]">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">
              {language === 'la' ? 'ກຳລັງໂຫຼດຂໍ້ມູນຈາກ Google Sheets...' : 'Loading Google Sheets data...'}
            </p>
          </div>
        ) : headers.length === 0 && rows.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              {language === 'la' ? 'ບໍ່ພົບຂໍ້ມູນໃນໜ້າຊີດນີ້' : 'No data found in this tab'}
            </p>
            <p className="text-xs text-slate-400">
              {language === 'la' ? 'ກະລຸນາກວດເບິ່ງຂໍ້ມູນໃນ Google Sheets ຂອງເຈົ້າ' : 'Please check your Google Sheet'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5 w-12 text-center text-slate-400">#</th>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    onClick={() => handleSort(idx)}
                    className="p-3.5 cursor-pointer hover:bg-slate-100 transition select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{header || `Column ${idx + 1}`}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length + 1} className="p-8 text-center text-slate-400">
                    {language === 'la' ? 'ບໍ່ພົບຂໍ້ມູນທີ່ກົງກັບຄຳຄົ້ນຫາ' : 'No matching rows found'}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, rIdx) => {
                  const absoluteIndex = (currentPage - 1) * rowsPerPage + rIdx + 1;
                  return (
                    <tr
                      key={rIdx}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="p-3.5 text-center text-slate-400 font-mono text-[11px] font-medium">
                        {absoluteIndex}
                      </td>
                      {headers.map((_, cIdx) => {
                        const val = row[cIdx] !== undefined && row[cIdx] !== null ? row[cIdx].toString() : '';
                        const isStatusCol = val.toUpperCase().includes('COMPLETED') || val.toUpperCase().includes('PROGRESS') || val.toUpperCase().includes('PLANNING') || val.includes('ສຳເລັດ') || val.includes('ກຳລັງດຳເນີນ');

                        return (
                          <td key={cIdx} className="p-3.5 whitespace-nowrap max-w-xs truncate font-medium text-slate-700">
                            {isStatusCol ? (
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  val.toUpperCase().includes('COMPLETED') || val.includes('ສຳເລັດ')
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : val.toUpperCase().includes('PROGRESS') || val.includes('ກຳລັງດຳເນີນ')
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-orange-100 text-orange-700'
                                }`}
                              >
                                {val}
                              </span>
                            ) : (
                              formatNumber(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-semibold text-slate-500">
            {language === 'la'
              ? `ໜ້າທີ ${currentPage} ຈາກ ${totalPages}`
              : `Page ${currentPage} of ${totalPages}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

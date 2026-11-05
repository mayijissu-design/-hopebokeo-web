import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { PieChart as PieIcon, BarChart3, TrendingUp } from 'lucide-react';
import { Language } from '../types';
import { formatNumber } from '../utils/numberFormat';

interface ChartsViewProps {
  headers: string[];
  rows: string[][];
  language: Language;
}

const COLORS = ['#4f46e5', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#3b82f6'];

export const ChartsView: React.FC<ChartsViewProps> = ({ headers, rows, language }) => {
  const chartData = useMemo(() => {
    if (!headers.length || !rows.length) return { barData: [], pieData: [] };

    let catColIdx = 0;
    let numColIdx = -1;

    for (let c = 0; c < headers.length; c++) {
      const isNumeric = rows.some((r) => r[c] && !isNaN(Number(r[c])));
      if (isNumeric && numColIdx === -1) {
        numColIdx = c;
      }
    }

    if (numColIdx === -1) {
      const counts: Record<string, number> = {};
      rows.forEach((r) => {
        const val = r[0] ? r[0].toString().trim() : 'Unknown';
        if (val) {
          counts[val] = (counts[val] || 0) + 1;
        }
      });

      const pieData = Object.entries(counts)
        .slice(0, 8)
        .map(([name, count]) => ({ name, value: count }));

      return {
        barData: pieData,
        pieData,
        catHeader: headers[0] || 'Category',
        numHeader: 'Count',
      };
    } else {
      const groupMap: Record<string, number> = {};
      rows.forEach((r) => {
        const cat = r[catColIdx] ? r[catColIdx].toString().trim() : 'Other';
        const val = Number(r[numColIdx]) || 0;
        if (cat) {
          groupMap[cat] = (groupMap[cat] || 0) + val;
        }
      });

      const data = Object.entries(groupMap)
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));

      return {
        barData: data,
        pieData: data,
        catHeader: headers[catColIdx] || 'Category',
        numHeader: headers[numColIdx] || 'Value',
      };
    }
  }, [headers, rows]);

  if (!rows.length) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-100 rounded-none p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-none">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {language === 'la' ? 'ການວິເຄາະ ແລະ ສະຖິຕິ visuals' : 'Data Analytics & Visuals'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {chartData.catHeader} vs {chartData.numHeader}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-slate-50/70 p-5 rounded-none border border-slate-100 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>{language === 'la' ? 'ກຣາຟເສົາ (Bar Chart)' : 'Bar Chart'}</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [typeof val === 'number' ? formatNumber(val) : val]}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#4f46e5" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-slate-50/70 p-5 rounded-none border border-slate-100 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <PieIcon className="w-4 h-4 text-indigo-600" />
            <span>{language === 'la' ? 'ກຣາຟວົງມົນ (Distribution)' : 'Data Distribution'}</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [typeof val === 'number' ? formatNumber(val) : val]}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

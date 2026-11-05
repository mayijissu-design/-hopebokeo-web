import React, { useState } from 'react';
import { X, PlusCircle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Language } from '../types';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  activeSheet: string;
  onRecordAdded: () => void;
  language: Language;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  onClose,
  headers,
  activeSheet,
  onRecordAdded,
  language,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleChange = (header: string, val: string) => {
    setFormData((prev) => ({ ...prev, [header]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const rowValues = headers.map((h) => formData[h] || '');

    try {
      const res = await fetch('/api/sheet-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          range: activeSheet || 'Sheet1',
          rowValues,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: language === 'la' ? 'ເພີ່ມຂໍ້ມູນສຳເລັດແລ້ວ!' : 'Successfully added row to Google Sheets!',
        });
        setFormData({});
        setTimeout(() => {
          onRecordAdded();
          onClose();
        }, 1200);
      } else {
        throw new Error(data.error || 'Failed to add row');
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error inserting record',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {language === 'la' ? 'ເພີ່ມຂໍ້ມູນໃໝ່' : 'Add New Record'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Dynamic Inputs Form */}
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {headers.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium">
              {language === 'la' ? 'ບໍ່ມີຄໍລຳໃນຊີດນີ້' : 'No column headers detected in this sheet.'}
            </p>
          ) : (
            headers.map((header, idx) => (
              <div key={idx} className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  {header || `Column ${idx + 1}`}
                </label>
                <input
                  type="text"
                  value={formData[header] || ''}
                  onChange={(e) => handleChange(header, e.target.value)}
                  placeholder={`Enter ${header}...`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            ))
          )}

          {/* Form Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              {language === 'la' ? 'ຍົກເລີກ' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || headers.length === 0}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-200 disabled:opacity-50 transition"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{language === 'la' ? 'ບັນທຶກ' : 'Save Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

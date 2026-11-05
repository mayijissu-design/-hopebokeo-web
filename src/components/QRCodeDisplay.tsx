import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, QrCode as QrIcon, RefreshCw, AlertCircle } from 'lucide-react';
import { generateQRCodeDataUrl, formatDonationPayload } from '../utils/qrCode';
import { Language } from '../types';

interface QRCodeDisplayProps {
  value?: string;
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  amount?: number | string;
  currency?: string;
  note?: string;
  donationLink?: string;
  qrPayload?: string;
  size?: number;
  title?: string;
  subtitle?: string;
  className?: string;
  showDownload?: boolean;
  showCopy?: boolean;
  language?: Language;
  darkColor?: string;
  lightColor?: string;
  onGenerated?: (dataUrl: string) => void;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  accountNumber,
  bankName,
  accountName,
  amount,
  currency,
  note,
  donationLink,
  qrPayload,
  size = 200,
  title,
  subtitle,
  className = '',
  showDownload = true,
  showCopy = true,
  language = 'lo',
  darkColor = '#000000',
  lightColor = '#ffffff',
  onGenerated,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedAcc, setCopiedAcc] = useState<boolean>(false);

  // Determine final payload text
  const payloadText = value || formatDonationPayload({
    accountNumber: accountNumber || '',
    bankName,
    accountName,
    amount,
    currency,
    note,
    donationLink,
    qrPayload,
  });

  useEffect(() => {
    let isMounted = true;
    if (!payloadText || payloadText.trim() === '') {
      setIsLoading(false);
      setQrDataUrl('');
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    generateQRCodeDataUrl(payloadText, {
      width: size * 2, // High DPI for crisp clarity
      color: { dark: darkColor, light: lightColor },
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsLoading(false);
          if (onGenerated) {
            onGenerated(url);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to generate QR Code:', err);
          setError(
            language === 'lo'
              ? 'ບໍ່ສາມາດສ້າງ QR Code ໄດ້'
              : 'Failed to generate QR Code'
          );
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [payloadText, size, darkColor, lightColor, language, onGenerated]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    const safeBankName = (bankName || 'donation').replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `QR_${safeBankName}_${Date.now()}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPayload = () => {
    if (!payloadText) return;
    navigator.clipboard.writeText(payloadText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center space-y-3 ${className}`}>
      {title && (
        <div className="flex items-center gap-1.5 text-xs font-black text-[#cc0000] dark:text-red-400 uppercase tracking-wider">
          <QrIcon className="w-4 h-4" />
          <span>{title}</span>
        </div>
      )}

      {/* QR Display Container */}
      <div className="relative p-3 bg-white border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex items-center justify-center overflow-hidden">
        {isLoading ? (
          <div
            style={{ width: size, height: size }}
            className="flex flex-col items-center justify-center gap-2 bg-slate-50 rounded-xl"
          >
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            <span className="text-[10px] text-slate-400 font-bold">
              {language === 'lo' ? 'ກຳລັງສ້າງ QR...' : 'Generating QR...'}
            </span>
          </div>
        ) : error ? (
          <div
            style={{ width: size, height: size }}
            className="flex flex-col items-center justify-center p-3 gap-1 bg-red-50 text-red-600 rounded-xl text-center"
          >
            <AlertCircle className="w-6 h-6" />
            <span className="text-[11px] font-bold">{error}</span>
          </div>
        ) : qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={title || 'Dynamic Donation QR Code'}
            style={{ width: size, height: size }}
            className="object-contain rounded-xl"
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="flex flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400 rounded-xl text-center p-2"
          >
            <QrIcon className="w-8 h-8 opacity-40" />
            <span className="text-[10px] font-medium">
              {language === 'lo' ? 'ກະລຸນາປ້ອນເລກບັນຊີ ຫຼື ລິ້ງ' : 'Enter account or link'}
            </span>
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
          {subtitle}
        </p>
      )}

      {/* Account Number & Bank display with 1-click copy */}
      {accountNumber && (
        <div className="w-full max-w-[260px] bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-left">
          <div className="min-w-0 flex-1">
            {bankName && (
              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block truncate">
                {bankName} {accountName ? `• ${accountName}` : ''}
              </span>
            )}
            <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100 select-all block truncate tracking-tight">
              {accountNumber}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(accountNumber);
              setCopiedAcc(true);
              setTimeout(() => setCopiedAcc(false), 2000);
            }}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer shrink-0"
            title={language === 'lo' ? 'ກັອບປີ້ເລກບັນຊີ' : 'Copy account number'}
          >
            {copiedAcc ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}

      {/* Action Buttons: Download & Copy Payload */}
      {(showDownload || showCopy) && payloadText && qrDataUrl && (
        <div className="flex items-center justify-center gap-2 pt-1">
          {showDownload && (
            <button
              type="button"
              onClick={handleDownload}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-xs"
              title={language === 'lo' ? 'ດາວໂຫຼດຮູບ QR PNG' : 'Download QR PNG'}
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'lo' ? 'ດາວໂຫຼດ QR' : 'Save QR'}</span>
            </button>
          )}

          {showCopy && (
            <button
              type="button"
              onClick={handleCopyPayload}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-xs"
              title={language === 'lo' ? 'ກັອບປີ້ລິ້ງ / Payload' : 'Copy link / payload'}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copied
                  ? language === 'lo'
                    ? 'ກັອບປີ້ແລ້ວ'
                    : 'Copied'
                  : language === 'lo'
                  ? 'ກັອບປີ້ Payload'
                  : 'Copy Link'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types';

interface PWAInstallButtonProps {
  language?: Language;
  variant?: 'header' | 'button' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  language = 'lo',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed standalone PWA, suppress the install UI
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If neither installable via Chromium prompt nor iOS, hide button to keep UI clean
  if (!isInstallable && !isIOS) {
    return null;
  }

  const buttonText =
    language === 'lo'
      ? 'ຕິດຕັ້ງແອັບ (ໃຊ້ງານອອບລາຍ)'
      : language === 'th'
      ? 'ติดตั้งแอป (ใช้งานออฟไลน์)'
      : 'Install App (Offline Ready)';

  const iosGuideTitle =
    language === 'lo'
      ? 'ວິທີຕິດຕັ້ງແອັບເທິງ iPhone / iPad'
      : language === 'th'
      ? 'วิธีติดตั้งแอปบน iPhone / iPad'
      : 'Install on iPhone / iPad';

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all duration-200 cursor-pointer hover:shadow"
          title={buttonText}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{buttonText}</span>
          <span className="sm:hidden">{language === 'lo' ? 'ຕິດຕັ້ງແອັບ' : 'Install'}</span>
        </button>
      )}

      {variant === 'button' && (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{buttonText}</span>
        </button>
      )}

      {/* iOS Safari Guided Install Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {iosGuideTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">HOPE BOKEO Web App</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              {language === 'lo'
                ? 'ເພື່ອໃຫ້ແອັບສາມາດເປີດໄດ້ຕະຫຼອດເວລາແມ່ນແຕ່ຕອນບໍ່ມີສັນຍານອິນເຕີເນັດ, ກະລຸນາຕິດຕັ້ງລົງໜ້າຈໍຫຼັກ:'
                : language === 'th'
                ? 'เพื่อให้แอปเปิดได้ตลอดเวลาแม้ไม่มีสัญญาณอินเทอร์เน็ต กรุณาติดตั้งลงหน้าจอหลัก:'
                : 'To open the app anytime even without internet connection, install to your Home Screen:'}
            </p>

            <ol className="space-y-3 text-xs text-slate-700 dark:text-slate-300 mb-6 list-decimal list-inside bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">1.</span>
                <span>
                  {language === 'lo' ? (
                    <>ກົດປຸ່ມ <b>ແບ່ງປັນ (Share)</b> <Share2 className="inline w-3.5 h-3.5 text-blue-500 mx-0.5" /> ຢູ່ແຖບລຸ່ມຂອງ Safari</>
                  ) : (
                    <>Tap the <b>Share</b> button <Share2 className="inline w-3.5 h-3.5 text-blue-500 mx-0.5" /> in Safari menu</>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">2.</span>
                <span>
                  {language === 'lo' ? (
                    <>ເລື່ອນລົງແລ້ວເລືອກ <b>"ເພີ່ມໃສ່ໜ້າຈໍຫຼັກ" (Add to Home Screen)</b> <PlusSquare className="inline w-3.5 h-3.5 text-slate-700 dark:text-slate-300 mx-0.5" /></>
                  ) : (
                    <>Scroll down and select <b>"Add to Home Screen"</b> <PlusSquare className="inline w-3.5 h-3.5 mx-0.5" /></>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">3.</span>
                <span>
                  {language === 'lo' ? (
                    <>ກົດປຸ່ມ <b>"ເພີ່ມ" (Add)</b> ຢູ່ມຸມຂວາເທິງ. ຫຼັງຈາກນັ້ນແອັບຈະເປີດໄດ້ໄວຕະຫຼອດເວລາ ເຖິງບໍ່ມີສັນຍານກໍຕາມ!</>
                  ) : (
                    <>Tap <b>"Add"</b> in the top right. The app is now ready to use anytime offline!</>
                  )}
                </span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-bold transition"
            >
              {language === 'lo' ? 'ເຂົ້າໃຈແລ້ວ' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

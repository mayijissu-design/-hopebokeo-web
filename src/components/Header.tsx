import React, { useState, useRef, useEffect } from 'react';
import { Home, PieChart as PieChartIcon, Users, Lock, Sun, Moon, Menu, X, RefreshCw, Globe, Check, ChevronDown } from 'lucide-react';
import { Language } from '../types';
import { HbLogo } from './HbLogo';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  autoThemeEnabled?: boolean;
  setAutoThemeEnabled?: (enabled: boolean) => void;
  autoThemeStart?: string;
  setAutoThemeStart?: (time: string) => void;
  autoThemeEnd?: string;
  setAutoThemeEnd?: (time: string) => void;
  isSyncing?: boolean;
  logoUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  darkMode,
  setDarkMode,
  isSyncing = false,
  logoUrl,
}) => {
  // Mobile right drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Floating Language Selector Menu State & Click-Outside Ref
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languagesList: { id: Language; label: string; flag: string; nativeName: string; code: string }[] = [
    { id: 'en', label: 'English', flag: '🇬🇧', nativeName: 'ENG', code: 'EN' },
    { id: 'lo', label: 'Lao', flag: '🇱🇦', nativeName: 'ລາວ', code: 'LAO' },
    { id: 'th', label: 'Thai', flag: '🇹🇭', nativeName: 'ไทย', code: 'TH' },
  ];

  const currentLangObj = languagesList.find((l) => l.id === language) || languagesList[0];

  const navItems = [
    {
      id: 'home',
      label: language === 'lo' ? 'ໜ້າຫຼັກ' : language === 'th' ? 'หน้าหลัก' : 'Home',
      icon: Home,
      action: () => {
        setActiveTab('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    {
      id: 'dashboard',
      label: language === 'lo' ? 'ຂໍ້ມູນເຊິງເລິກ' : language === 'th' ? 'แดชบอร์ดข้อมูล' : 'Insights',
      icon: PieChartIcon,
      action: () => setActiveTab('dashboard'),
    },
    {
      id: 'about',
      label: language === 'lo' ? 'ກ່ຽວກັບພວກເຮົາ' : language === 'th' ? 'เกี่ยวกับเรา' : 'About Us',
      icon: Users,
      action: () => setActiveTab('about'),
    },
    {
      id: 'admin',
      label: language === 'lo' ? 'ແອັດມິນ' : language === 'th' ? 'แอดมิน' : 'Admin',
      icon: Lock,
      iconColor: 'text-amber-500',
      action: () => setActiveTab('admin'),
    },
  ];

  return (
    <>
    <header className="bg-white/70 dark:bg-slate-900/75 backdrop-blur-md border-b border-white/30 dark:border-slate-800/60 sticky top-0 z-40 transition-colors w-full">
      <div className="w-full pl-3 sm:pl-6 lg:pl-8 pr-3 sm:pr-6 lg:pr-8 h-16 sm:h-18 flex items-center justify-between gap-3">
        {/* Logo & Title matching exact mockup design */}
        <div className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none group" onClick={() => setActiveTab('home')}>
          <HbLogo logoUrl={logoUrl} className="h-9 md:h-11 w-auto text-[#ee1c25] leading-none shrink-0" />
          <div className="flex flex-col justify-center select-none">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900 dark:text-white text-base md:text-xl leading-none tracking-tight uppercase">
                HOPE
              </span>
            </div>
            <span className="font-black text-[#cc0000] text-xs md:text-sm leading-tight tracking-wider uppercase">
              BOKEO
            </span>
          </div>
        </div>

        {/* Right-aligned Navigation Tabs + Controls */}
        <div className="flex items-center justify-end gap-2 sm:gap-4 lg:gap-6 ml-auto">
          {/* Navigation Tabs (Visible on tablet, desktop and preview pane) */}
          <nav className="hidden sm:flex items-center gap-1 md:gap-1.5 xl:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'home' && activeTab === 'home');
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer rounded-lg relative ${
                    isActive
                      ? 'text-[#cc0000] dark:text-red-400 font-extrabold'
                      : 'text-slate-800 dark:text-slate-100 hover:text-[#cc0000] dark:hover:text-red-400 font-semibold'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-[#cc0000] dark:text-red-400' : (item.iconColor || 'text-slate-600 dark:text-slate-300')}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#cc0000] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Language Dropdown, Dark Mode & Menu */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          {/* Language Selector: Globe Icon + Code (e.g., "EN ▾") */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="h-9 px-2.5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-xs text-slate-800 dark:text-slate-100 cursor-pointer font-bold text-xs"
              title="Change Language / ປ່ຽນພາສາ"
            >
              <Globe className="w-3.5 h-3.5 text-[#cc0000]" />
              <span className="text-[11px] font-bold">{currentLangObj.code}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-fade-in divide-y divide-slate-100 dark:divide-slate-800">
                <div className="px-3.5 py-1 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  {language === 'lo' ? 'ເລືອກພາສາ' : language === 'th' ? 'เลือกภาษา' : 'Select Language'}
                </div>
                <div className="py-1">
                  {languagesList.map((langItem) => {
                    const isSelected = language === langItem.id;
                    const langLabel = language === 'lo'
                      ? (langItem.id === 'lo' ? 'ພາສາລາວ' : langItem.id === 'th' ? 'ພາສາໄທ' : 'ພາສາອັງກິດ')
                      : language === 'th'
                      ? (langItem.id === 'lo' ? 'ภาษาลาว' : langItem.id === 'th' ? 'ภาษาไทย' : 'ภาษาอังกฤษ')
                      : (langItem.id === 'lo' ? 'Lao' : langItem.id === 'th' ? 'Thai' : 'English');

                    return (
                      <button
                        key={langItem.id}
                        onClick={() => {
                          setLanguage(langItem.id);
                          setIsLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold transition rounded-lg ${
                          isSelected
                            ? 'bg-red-50 dark:bg-red-950/40 text-[#cc0000] dark:text-red-400 font-black'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{langItem.flag}</span>
                          <span>{langLabel}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#cc0000] dark:text-red-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition hover:bg-slate-200 dark:hover:bg-slate-700 shadow-xs text-slate-800 dark:text-slate-100 cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            )}
          </button>

          {/* Mobile Menu Hamburger Button (3-lines) - only on small phones */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition hover:bg-slate-200 dark:hover:bg-slate-700 shadow-xs text-slate-800 dark:text-slate-100 cursor-pointer"
            title="Menu / ເມນູ"
          >
            <Menu className="w-5 h-5 text-slate-800 dark:text-slate-200" />
          </button>
          </div>
        </div>
      </div>
    </header>

    {/* Mobile Right Drawer Slide-over (placed outside <header> so backdrop-filter does not constrain fixed positioning) */}
    {isMobileMenuOpen && (
      <>
        {/* Full-screen Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[90] sm:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Right-aligned Vertical Navigation Drawer */}
        <div className="fixed top-0 right-0 bottom-0 h-[100dvh] w-72 max-w-[82vw] bg-white dark:bg-slate-900 shadow-2xl z-[100] p-5 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between sm:hidden animate-fade-in transition-all rounded-l-2xl overflow-y-auto">
          <div className="space-y-5">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <HbLogo logoUrl={logoUrl} className="h-8 w-auto text-[#ee1c25]" />
                <span className="font-extrabold text-slate-900 dark:text-white text-base">
                  {language === 'lo' ? 'ເມນູຫຼັກ' : language === 'th' ? 'เมนูหลัก' : 'Main Menu'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vertical Tab Items */}
            <div className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.action();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition text-left cursor-pointer ${
                      isActive
                        ? 'bg-red-50 dark:bg-red-950/40 text-[#cc0000] dark:text-red-400 font-black border-l-4 border-[#cc0000] shadow-xs'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#cc0000] dark:text-red-400' : (item.iconColor || 'text-slate-500 dark:text-slate-400')}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <p className="font-black text-slate-600 dark:text-slate-400 tracking-wider">HOPE BOKEO</p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setIsMobileMenuOpen(false);
              }}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-[11px] font-medium cursor-pointer"
              title="Admin Portal"
            >
              <Lock className="w-3 h-3 text-slate-400" />
              <span>{language === 'lo' ? 'ແອັດມິນ' : language === 'th' ? 'แอดมิน' : 'Admin'}</span>
            </button>
          </div>
        </div>
      </>
    )}
    </>
  );
};


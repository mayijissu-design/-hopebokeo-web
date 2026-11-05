import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, User, Loader2, Image as ImageIcon, Video as VideoIcon, Paperclip, X, Play, Maximize2, Minimize2, ChevronUp, ChevronDown, Trash2, Check, Globe, ExternalLink, Cpu } from 'lucide-react';
import Markdown from 'react-markdown';
import { ChatMessage, Language, ChatSource } from '../types';

interface AiAssistantProps {
  sheetTitle: string;
  headers: string[];
  rows: string[][];
  language: Language;
  whatsappNumber?: string;
  onClose?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

interface AttachedMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
}

const getDefaultGreeting = (isLaoLanguage: boolean): ChatMessage => ({
  id: '1',
  sender: 'ai',
  text: isLaoLanguage
    ? `ສະບາຍດີຈ້າ! ຂ້ອຍແມ່ນ **Hope Bokeo AI Assistant** (ລຸ້ນສະຫຼາດສູງສຸດ ພ້ອມລະບົບຄົ້ນຫາຂໍ້ມູນໃນອິນເຕີເນັດແບບ Real-time 🌐). ທ່ານມີຄຳຖາມກ່ຽວກັບຄຣິດຕະຈັກ, ຄະນະຜູ້ນຳ, ສະຖິຕິ, ພຣະຄຳພີ ຫຼື ຂໍ້ມູນທົ່ວໄປ ສາມາດພິມຖາມໄດ້ເລີຍເດີ!`
    : `Hello! I'm **Hope Bokeo's AI Assistant** (equipped with highest intelligence & live real-time Web Search 🌐). Ask me anything about our leadership team, churches, field statistics, scripture, or general inquiries!`,
  timestamp: new Date(),
});

export const AiAssistant: React.FC<AiAssistantProps> = ({
  sheetTitle,
  headers,
  rows,
  language,
  whatsappNumber = '8562076838584',
  onClose,
  isExpanded = false,
  onToggleExpand,
}) => {
  const isLao = language === 'lo' || language === 'la';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [chatHeight, setChatHeight] = useState<'normal' | 'tall' | 'full'>('normal');

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('hope_bokeo_ai_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load chat history from localStorage:', e);
    }
    return [getDefaultGreeting(isLao)];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia[]>([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [mediaUrlText, setMediaUrlText] = useState('');
  const [justCleared, setJustCleared] = useState(false);

  // Persist messages to localStorage whenever messages state changes
  useEffect(() => {
    try {
      const sanitized = messages.slice(-50).map((msg) => {
        if (msg.mediaUrls && msg.mediaUrls.some((u) => u.length > 100000)) {
          return {
            ...msg,
            mediaUrls: msg.mediaUrls.map((u) => (u.length > 100000 ? '[Media Attachment]' : u)),
          };
        }
        return msg;
      });
      localStorage.setItem('hope_bokeo_ai_chat_history', JSON.stringify(sanitized));
    } catch (e) {
      console.warn('Could not save chat history to localStorage:', e);
    }
  }, [messages]);

  // Clear Chat History (direct & guaranteed to execute without browser iframe window.confirm blocks)
  const handleClearHistory = () => {
    const defaultGreeting = getDefaultGreeting(isLao);
    setMessages([defaultGreeting]);
    setInputPrompt('');
    setAttachedMedia([]);
    try {
      localStorage.removeItem('hope_bokeo_ai_chat_history');
    } catch (e) {
      console.warn('Could not clear chat history from localStorage:', e);
    }
    setJustCleared(true);
    setTimeout(() => setJustCleared(false), 2200);
  };

  // Auto-scroll to bottom whenever messages update or loading state changes
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle clipboard paste (Ctrl+V) for images & videos
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          const isVid = file.type.startsWith('video');
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setAttachedMedia((prev) => [
                ...prev,
                {
                  id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
                  url: reader.result as string,
                  type: isVid ? 'video' : 'image',
                  name: file.name || (isVid ? 'Pasted Video' : 'Pasted Image'),
                },
              ]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Handle local image/video file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const isVid = file.type.startsWith('video');
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAttachedMedia((prev) => [
            ...prev,
            {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
              url: reader.result as string,
              type: isVid ? 'video' : 'image',
              name: file.name,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  // Handle adding media URL manually
  const handleAddMediaUrl = () => {
    if (!mediaUrlText.trim()) return;
    const url = mediaUrlText.trim();
    const isVid = url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('youtube.com') || url.includes('youtu.be');
    setAttachedMedia((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        url,
        type: isVid ? 'video' : 'image',
        name: isVid ? 'Video Link' : 'Image Link',
      },
    ]);
    setMediaUrlText('');
    setShowUrlInput(false);
  };

  const handleRemoveMedia = (id: string) => {
    setAttachedMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputPrompt.trim() && attachedMedia.length === 0) || isLoading) return;

    const userText = inputPrompt.trim();
    const mediaList = [...attachedMedia];

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText || (isLao ? '[ແນບໄຟລ໌ສື່]' : '[Attached Media]'),
      timestamp: new Date(),
      mediaUrls: mediaList.map((m) => m.url),
      mediaType: mediaList.some((m) => m.type === 'video')
        ? mediaList.some((m) => m.type === 'image')
          ? 'mixed'
          : 'video'
        : 'image',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setAttachedMedia([]);

    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText || 'Please analyze the attached image/video media along with ministry data and web info.',
          mediaUrls: mediaList.map((m) => m.url),
          history: messages.slice(-8).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            text: m.text,
          })),
          sheetContext: {
            title: sheetTitle,
            headers,
            sampleRows: rows.slice(0, 50),
            totalRowCount: rows.length,
          },
        }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (data.success && data.result) {
        const fullText: string = data.result;
        const aiMsgId = (Date.now() + 1).toString();
        const sources: ChatSource[] = data.sources || [];
        const webSearchUsed: boolean = !!data.webSearchUsed;
        const modelUsed: string = data.modelUsed || 'Gemini 3.7 Flash';

        const initialAiMsg: ChatMessage = {
          id: aiMsgId,
          sender: 'ai',
          text: '',
          timestamp: new Date(),
          sources,
          webSearchUsed,
          modelUsed,
        };

        setMessages((prev) => [...prev, initialAiMsg]);

        let currIndex = 0;
        const stepSize = 3; // smooth chunks
        const timer = setInterval(() => {
          currIndex += stepSize;
          const currentText = fullText.slice(0, currIndex);

          setMessages((prev) =>
            prev.map((msg) => (msg.id === aiMsgId ? { ...msg, text: currentText } : msg))
          );

          if (currIndex >= fullText.length) {
            clearInterval(timer);
          }
        }, 12);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (err: any) {
      setIsLoading(false);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: isLao
          ? `ຂໍອະໄພ, ເກີດຂໍ້ຜິດພາດ: ${err?.message || 'ບໍ່ສາມາດເຊື່ອມຕໍ່ກັບ AI ໄດ້'}`
          : `Sorry, an error occurred: ${err?.message || 'Unable to contact AI service'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const quickPrompts = isLao
    ? [
        'ໃຜເປັນຄະນະຜູ້ນຳ ແລະ ສິດຍາພິບານຂອງ Hope Bokeo?',
        'ສະຫຼຸບຈຳນວນຜູ້ເຊື່ອ ແລະ ຜູ້ຮັບບັບຕິສະມາທັງໝົດ',
        'ບ້ານໃດມີຄວາມຕ້ອງການເລັ່ງດ່ວນ ແລະ ຕ້ອງການຄຳອະທິຖານ?',
        'ຄົ້ນຫາຂໍ້ມູນ ແລະ ວິໄສທັດຂອງພັນທະກິດ',
      ]
    : [
        'Who are the leaders & pastors of Hope Bokeo?',
        'Summarize all believers and baptized statistics',
        'Which villages have urgent prayer requests & needs?',
        'Search ministry vision & giving accounts',
      ];

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-3.5 transition-colors">
      {/* Header with Title & Capabilities Pill */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-[#cc0000] dark:text-red-400 border border-red-100 dark:border-red-900/50 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                {isLao ? 'AI ຜູ້ຊ່ວຍ Hope Bokeo' : 'Hope Bokeo AI Assistant'}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Globe className="w-3 h-3 text-emerald-600 animate-pulse" />
                <span>{isLao ? 'ຄົ້ນຫາເວັບ Real-Time' : 'Live Web Grounding'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {isLao
                ? 'ສະຕິປັນຍາສູງສຸດ • ຕອບທຸກຄຳຖາມ • ວິເຄາະຮູບ, ວີດີໂອ & ຂໍ້ມູນເວັບ'
                : 'Highest Intelligence • Search, analyze text, media & web data'}
            </p>
          </div>
        </div>

        {/* Controls: Height, Maximize & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Height Adjuster Button */}
          <button
            type="button"
            onClick={() => {
              if (chatHeight === 'normal') setChatHeight('tall');
              else if (chatHeight === 'tall') setChatHeight('full');
              else setChatHeight('normal');
            }}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition flex items-center gap-1 text-[11px] font-semibold"
            title={isLao ? 'ປັບຂະໜາດຄວາມສູງຫ້ອງແຊັດ' : 'Adjust Chat Height'}
          >
            {chatHeight === 'normal' && <ChevronDown className="w-4 h-4" />}
            {chatHeight === 'tall' && <ChevronUp className="w-4 h-4 text-[#cc0000]" />}
            {chatHeight === 'full' && <ChevronUp className="w-4 h-4 text-emerald-600 font-bold" />}
            <span className="hidden sm:inline text-[10px]">
              {chatHeight === 'normal' ? (isLao ? 'ຂະໜາດປົກກະຕິ' : 'Normal') : chatHeight === 'tall' ? (isLao ? 'ຂະໜາດໃຫຍ່' : 'Tall') : (isLao ? 'ຂະໜາດເຕັມ' : 'Full')}
            </span>
          </button>

          {/* Clear Chat History Button */}
          <button
            type="button"
            onClick={handleClearHistory}
            className={`p-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer active:scale-95 ${
              justCleared
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-300 dark:border-emerald-800'
                : 'text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/50'
            }`}
            title={justCleared ? (isLao ? 'ລຶບປະວັດສຳເລັດແລ້ວ' : 'History cleared!') : (isLao ? 'ລຶບປະວັດການສົນທະນາ' : 'Clear Chat History')}
          >
            {justCleared ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 animate-scale-in" />
                <span className="text-[10px] font-bold text-emerald-600 hidden sm:inline">
                  {isLao ? 'ລຶບແລ້ວ' : 'Cleared'}
                </span>
              </>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>

          {/* Toggle Expand Window Size */}
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition"
              title={isExpanded ? (isLao ? 'ຍໍ້ຂະໜາດ' : 'Minimize') : (isLao ? 'ຂະຫຍາຍເຕັມໜ້າຈໍ' : 'Maximize')}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-700 rounded-xl transition"
              title="Close AI"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages List with CSS resize-y capability */}
      <div
        ref={messagesContainerRef}
        className={`space-y-3 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 resize-y ${
          chatHeight === 'full'
            ? 'h-[550px] sm:h-[620px]'
            : chatHeight === 'tall'
            ? 'h-[420px] sm:h-[480px]'
            : 'h-[280px] sm:h-[340px]'
        }`}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'ai' && (
              <div className="w-7 h-7 rounded-xl bg-[#cc0000] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`p-3.5 rounded-2xl text-xs max-w-[90%] sm:max-w-[82%] leading-relaxed space-y-2.5 ${
                msg.sender === 'user'
                  ? 'bg-[#cc0000] text-white rounded-tr-none shadow-sm font-semibold'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none shadow-sm font-medium'
              }`}
            >
              {/* Message Content Rendered as rich Markdown for AI or raw text for User */}
              {msg.sender === 'ai' ? (
                <div className="prose prose-xs dark:prose-invert max-w-none text-slate-800 dark:text-slate-100 leading-relaxed font-sans space-y-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline">
                  <Markdown>{msg.text}</Markdown>
                </div>
              ) : (
                <div className="whitespace-pre-line">{msg.text}</div>
              )}

              {/* Web Sources & Grounding Citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Globe className="w-3 h-3 text-blue-500" />
                    <span>{isLao ? 'ແຫຼ່ງຂໍ້ມູນໃນອິນເຕີເນັດ (Web Sources):' : 'Web Citations & Sources:'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src, sIdx) => (
                      <a
                        key={sIdx}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-medium border border-blue-200 dark:border-blue-800 transition max-w-[240px] truncate"
                        title={src.title || src.uri}
                      >
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{src.title || new URL(src.uri).hostname}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Attached Media Thumbnails inside chat bubble */}
              {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-white/20 dark:border-slate-700">
                  {msg.mediaUrls.map((url, idx) => {
                    const isVideo = url.startsWith('data:video') || url.match(/\.(mp4|webm|mov)$/i);
                    return isVideo ? (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 max-w-[200px]">
                        <video src={url} controls className="w-full h-24 object-cover" />
                      </div>
                    ) : (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
                        <img src={url} alt="Attached media" className="w-24 h-24 object-cover rounded-md" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#cc0000] dark:text-red-400 bg-white dark:bg-slate-800 p-2.5 rounded-2xl w-fit border border-red-100 dark:border-red-900/40 shadow-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{isLao ? 'AI ກຳລັງຄົ້ນຫາ ແລະ ວິເຄາະຂໍ້ມູນໃນອິນເຕີເນັດ & ຖານຂໍ້ມູນ...' : 'AI is searching live web and analyzing data...'}</span>
          </div>
        )}
      </div>

      {/* Quick Suggestions */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => setInputPrompt(prompt)}
            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-[10px] font-semibold whitespace-nowrap transition border border-slate-200 dark:border-slate-600"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Attached Media Previews Bar before sending */}
      {attachedMedia.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto p-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
            {isLao ? 'ສື່ທີ່ແນບ:' : 'Attached:'}
          </span>
          {attachedMedia.map((m) => (
            <div key={m.id} className="relative group shrink-0">
              {m.type === 'video' ? (
                <div className="w-14 h-14 bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center text-white relative overflow-hidden">
                  <Play className="w-5 h-5 text-amber-400" />
                  <span className="absolute bottom-0 inset-x-0 text-[8px] bg-black/70 text-center truncate px-0.5">
                    {m.name}
                  </span>
                </div>
              ) : (
                <img src={m.url} alt={m.name} className="w-14 h-14 object-cover rounded-lg border border-slate-300 dark:border-slate-600" />
              )}
              <button
                type="button"
                onClick={() => handleRemoveMedia(m.id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Manual URL Input Bar */}
      {showUrlInput && (
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
          <input
            type="text"
            value={mediaUrlText}
            onChange={(e) => setMediaUrlText(e.target.value)}
            placeholder={isLao ? 'ວາງລິ້ງຮູບ/ວີດີໂອ (URL)...' : 'Paste Image or Video URL...'}
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white outline-none"
          />
          <button
            type="button"
            onClick={handleAddMediaUrl}
            className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg shadow-xs"
          >
            {isLao ? 'ເພີ່ມ' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Form with Media Attachment Buttons */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-0.5">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*"
          multiple
          className="hidden"
        />

        {/* Media Buttons: Upload Image/Video */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition shadow-xs border border-slate-200 dark:border-slate-600"
            title={isLao ? 'ແນບຮູບ ຫຼື ວີດີໂອ' : 'Attach Image or Video'}
          >
            <Paperclip className="w-4 h-4 text-[#cc0000] dark:text-red-400" />
          </button>

          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition shadow-xs border border-slate-200 dark:border-slate-600 hidden sm:flex"
            title={isLao ? 'ວາງລິ້ງສື່' : 'Add Media Link'}
          >
            <ImageIcon className="w-4 h-4 text-blue-500" />
          </button>
        </div>

        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onPaste={handlePaste}
          placeholder={
            isLao
              ? 'ພິມຄຳຖາມ, ຄົ້ນຫາຂໍ້ມູນເວັບ ຫຼື ວາງຮູບ/ວີດີໂອ...'
              : 'Ask questions, search web or paste media...'
          }
          className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc0000] font-medium"
        />

        <button
          type="submit"
          disabled={(!inputPrompt.trim() && attachedMedia.length === 0) || isLoading}
          className="px-3.5 py-2.5 bg-[#cc0000] hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-40 transition shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};


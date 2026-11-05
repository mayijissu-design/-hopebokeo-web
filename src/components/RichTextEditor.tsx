import React, { useState, useRef, useEffect } from "react";
import DOMPurify from "dompurify";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Link,
  Image as ImageIcon,
  Code,
  Eye,
  Edit3,
} from "lucide-react";
import { Language } from "../types";

export function cleanRichHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "b", "i", "em", "strong", "a", "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "br", "span", "div", "img", "blockquote", "table",
      "thead", "tbody", "tr", "th", "td", "u", "s", "hr"
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "style", "target", "rel", "width", "height"],
  });
}

export interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  language?: Language;
  minHeight?: string;
  className?: string;
  onImageAttached?: (imgUrl: string) => void;
  onPdfAttached?: (pdfUrl: string, fileName?: string) => void;
  onFileImportedTitle?: (importedTitle: string) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  label,
  placeholder,
  language = "lo",
  minHeight = "240px",
  className = "",
  onImageAttached,
}) => {
  const [activeMode, setActiveMode] = useState<"visual" | "code" | "preview">("visual");
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== (value || "")) {
        editorRef.current.innerHTML = cleanRichHtml(value || "");
      }
    }
    isInternalChange.current = false;
  }, [value, activeMode]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const html = editorRef.current.innerHTML;
      onChange(cleanRichHtml(html));
    }
  };

  const execCmd = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const handleInsertImage = () => {
    const url = prompt(language === "lo" ? "ໃສ່ລິ້ງຮູບພາບ (Image URL):" : "Enter image URL:");
    if (url && url.trim()) {
      execCmd("insertImage", url.trim());
      if (onImageAttached) {
        onImageAttached(url.trim());
      }
    }
  };

  const handleInsertLink = () => {
    const url = prompt(language === "lo" ? "ໃສ່ລິ້ງເວັບໄຊ (Web Link):" : "Enter link URL:");
    if (url && url.trim()) {
      execCmd("createLink", url.trim());
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-red-500/30 focus-within:border-red-500 transition">
        <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 select-none">
          <div className="flex flex-wrap items-center gap-0.5">
            <button
              type="button"
              onClick={() => execCmd("bold")}
              title="Bold"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd("italic")}
              title="Italic"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd("underline")}
              title="Underline"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Underline className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />

            <button
              type="button"
              onClick={() => execCmd("formatBlock", "<h1>")}
              title="Heading 1"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd("formatBlock", "<h2>")}
              title="Heading 2"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Heading2 className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />

            <button
              type="button"
              onClick={() => execCmd("insertUnorderedList")}
              title="Bullet List"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd("insertOrderedList")}
              title="Numbered List"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />

            <button
              type="button"
              onClick={handleInsertLink}
              title="Insert Link"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Link className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleInsertImage}
              title="Insert Image"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveMode("visual")}
              className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                activeMode === "visual"
                  ? "bg-red-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 inline mr-1" />
              Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("code")}
              className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                activeMode === "code"
                  ? "bg-red-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Code className="w-3.5 h-3.5 inline mr-1" />
              HTML
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("preview")}
              className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                activeMode === "preview"
                  ? "bg-red-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Eye className="w-3.5 h-3.5 inline mr-1" />
              Preview
            </button>
          </div>
        </div>

        {activeMode === "visual" && (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            style={{ minHeight }}
            data-placeholder={placeholder || "Type here..."}
            className="p-4 outline-none text-sm text-slate-900 dark:text-slate-100 leading-relaxed overflow-y-auto prose dark:prose-invert max-w-none [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_img]:max-h-80 [&_img]:rounded-lg"
          />
        )}

        {activeMode === "code" && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ minHeight }}
            placeholder={placeholder}
            className="w-full p-4 font-mono text-xs bg-slate-900 text-slate-100 outline-none leading-relaxed resize-y"
          />
        )}

        {activeMode === "preview" && (
          <div
            style={{ minHeight }}
            className="p-4 text-sm text-slate-900 dark:text-slate-100 leading-relaxed overflow-y-auto prose dark:prose-invert max-w-none [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_img]:max-h-80 [&_img]:rounded-lg bg-slate-50/50 dark:bg-slate-900/50"
            dangerouslySetInnerHTML={{ __html: cleanRichHtml(value || '<p class="text-slate-400 italic">No content</p>') }}
          />
        )}
      </div>
    </div>
  );
};

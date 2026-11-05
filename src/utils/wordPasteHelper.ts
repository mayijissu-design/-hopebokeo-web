import DOMPurify from 'dompurify';

/**
 * Extracts and sanitizes rich HTML copied from Microsoft Word, Excel,
 * Google Docs, Apple Pages, or web pages, preserving all tables,
 * inline styles, colors, fonts, borders, alignments, and lists.
 */
export function sanitizeWordHtml(html: string): string {
  if (!html || !html.trim()) return '';

  let raw = html;

  // 1. If MS Word StartFragment/EndFragment markers exist, extract the actual content
  const startFragIdx = raw.indexOf('<!--StartFragment-->');
  const endFragIdx = raw.indexOf('<!--EndFragment-->');
  if (startFragIdx !== -1 && endFragIdx !== -1 && endFragIdx > startFragIdx) {
    raw = raw.substring(startFragIdx + '<!--StartFragment-->'.length, endFragIdx);
  }

  // 2. Clean up Office-specific non-standard tags while preserving content
  raw = raw
    .replace(/<o:p>\s*<\/o:p>/gi, '')
    .replace(/<o:p>([\s\S]*?)<\/o:p>/gi, '$1')
    .replace(/<xml[\s\S]*?<\/xml>/gi, '')
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, '');

  // 3. Sanitize safely using DOMPurify while strictly allowing formatting, styles, tables, and colors
  const sanitized = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'td',
      'th',
      'colgroup',
      'col',
      'caption',
      'p',
      'div',
      'span',
      'br',
      'hr',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'del',
      'sub',
      'sup',
      'mark',
      'font',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
      'pre',
      'code',
      'img',
    ],
    ALLOWED_ATTR: [
      'style',
      'class',
      'id',
      'align',
      'valign',
      'color',
      'face',
      'size',
      'bgcolor',
      'border',
      'cellpadding',
      'cellspacing',
      'colspan',
      'rowspan',
      'width',
      'height',
      'href',
      'target',
      'src',
      'alt',
      'title',
      'rel',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });

  return sanitized;
}

/**
 * Formats plain text into simple HTML paragraphs
 */
export function formatPlainTextToHtml(text: string): string {
  if (!text || !text.trim()) return '';
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => (line ? `<p>${line}</p>` : '<p><br></p>'))
    .join('');
}

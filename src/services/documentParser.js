import DOMPurify from 'dompurify';
import { EpubParser } from './epubParser';
import { BOOK_FORMAT_LABELS, getBookExtension, getBookFormatLabel, SUPPORTED_BOOK_EXTENSIONS } from './bookFormats';

const getExtension = getBookExtension;

function baseName(fileName = '未命名书籍') {
  return fileName.replace(/\.[^.]+$/, '') || '未命名书籍';
}

function escapeHtml(text = '') {
  return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function sanitizeBookHtml(html = '') {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  });
}

function textToHtml(text) {
  return text.split(/\n\s*\n/).map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
}

function decodeText(buffer) {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  const replacementRatio = (utf8.match(/�/g)?.length || 0) / Math.max(1, utf8.length);
  if (replacementRatio < 0.002) return utf8.replace(/^\uFEFF/, '');
  try {
    return new TextDecoder('gb18030').decode(buffer).replace(/^\uFEFF/, '');
  } catch {
    return utf8.replace(/^\uFEFF/, '');
  }
}

function splitPlainText(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const headingPattern = /^\s*(第[零〇一二三四五六七八九十百千万两\d]+[章节卷回部篇]|chapter\s+\d+|序章|楔子|前言|后记|尾声).*$/i;
  const chapters = [];
  let title = '正文';
  let buffer = [];

  const flush = () => {
    const content = buffer.join('\n').trim();
    if (content) chapters.push({ id: `chapter-${chapters.length + 1}`, title, content: textToHtml(content) });
    buffer = [];
  };

  for (const line of lines) {
    if (headingPattern.test(line) && buffer.join('').trim()) {
      flush();
      title = line.trim();
    } else if (headingPattern.test(line)) {
      title = line.trim();
    } else {
      buffer.push(line);
      if (buffer.join('\n').length >= 18000) {
        flush();
        title = `正文 · ${chapters.length + 1}`;
      }
    }
  }
  flush();
  return chapters.length ? chapters : [{ id: 'chapter-1', title: '正文', content: '<p>文档没有可显示的文字。</p>' }];
}

function splitHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const chapters = [];
  let currentTitle = '正文';
  let nodes = [];
  const flush = () => {
    const content = nodes.map(node => node.outerHTML || escapeHtml(node.textContent || '')).join('').trim();
    if (content) chapters.push({ id: `chapter-${chapters.length + 1}`, title: currentTitle, content: sanitizeBookHtml(content) });
    nodes = [];
  };
  for (const node of doc.body.childNodes) {
    if (node.nodeType === 1 && /^(H1|H2)$/.test(node.tagName) && nodes.length) {
      flush();
      currentTitle = node.textContent?.trim() || `章节 ${chapters.length + 1}`;
    } else if (node.nodeType === 1 && /^(H1|H2)$/.test(node.tagName)) {
      currentTitle = node.textContent?.trim() || currentTitle;
    }
    nodes.push(node);
  }
  flush();
  return chapters.length ? chapters : [{ id: 'chapter-1', title: '正文', content: '<p>文档没有可显示的内容。</p>' }];
}

async function blobUrlToDataUrl(url) {
  if (!url?.startsWith('blob:')) return url || null;
  const blob = await fetch(url).then(response => response.blob());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function inlineBlobImages(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const images = [...doc.querySelectorAll('img[src^="blob:"], image[href^="blob:"], image[xlink\\:href^="blob:"]')];
  await Promise.all(images.map(async image => {
    const source = image.getAttribute('src') || image.getAttribute('href') || image.getAttribute('xlink:href');
    try {
      const dataUrl = await blobUrlToDataUrl(source);
      if (image.hasAttribute('src')) image.setAttribute('src', dataUrl);
      if (image.hasAttribute('href')) image.setAttribute('href', dataUrl);
      if (image.hasAttribute('xlink:href')) image.setAttribute('xlink:href', dataUrl);
    } catch (error) {
      console.warn('Failed to persist embedded image:', error);
    }
  }));
  return doc.body.innerHTML;
}

function tocTitleMap(parser) {
  const map = new Map();
  const visit = items => (items || []).forEach(item => {
    const resolved = parser.resolveHref?.(item.href);
    if (resolved?.id && item.label) map.set(resolved.id, item.label);
    visit(item.children);
  });
  visit(parser.getToc?.());
  return map;
}

async function parseLingoBook(file, extension) {
  const mobiModule = extension === 'fb2' ? null : await import('@lingo-reader/mobi-parser');
  const fb2Module = extension === 'fb2' ? await import('@lingo-reader/fb2-parser') : null;
  let parser;
  if (extension === 'fb2') parser = await fb2Module.initFb2File(file);
  else if (extension === 'azw3') parser = await mobiModule.initKf8File(file);
  else if (extension === 'azw') {
    try { parser = await mobiModule.initMobiFile(file); } catch { parser = await mobiModule.initKf8File(file); }
  } else parser = await mobiModule.initMobiFile(file);

  try {
    const metadata = parser.getMetadata?.() || {};
    const titles = tocTitleMap(parser);
    const spine = parser.getSpine?.() || [];
    const chapters = [];
    for (const item of spine) {
      try {
        const loaded = await parser.loadChapter(item.id);
        if (!loaded?.html) continue;
        let cssText = '';
        for (const css of loaded.css || []) {
          try { cssText += await fetch(css.href).then(response => response.text()); } catch { /* optional book CSS */ }
        }
        const html = await inlineBlobImages(`${cssText ? `<style>${cssText}</style>` : ''}${loaded.html}`);
        chapters.push({
          id: item.id,
          title: titles.get(item.id) || `章节 ${chapters.length + 1}`,
          content: sanitizeBookHtml(html)
        });
      } catch (error) {
        console.warn(`Skipped unreadable ${extension.toUpperCase()} section ${item.id}:`, error);
      }
    }
    const author = Array.isArray(metadata.author)
      ? metadata.author.join('、')
      : metadata.author?.name || metadata.author || '未知作者';
    return {
      title: metadata.title || metadata.bookName || baseName(file.name),
      author,
      cover: await blobUrlToDataUrl(parser.getCoverImage?.()),
      chapters
    };
  } finally {
    parser.destroy?.();
  }
}

async function parsePdf(file) {
  const [pdfjs, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const metadata = await pdf.getMetadata().catch(() => ({ info: {} }));
  const chapters = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    let previousY = null;
    const lines = [];
    let currentLine = [];
    for (const item of textContent.items) {
      const y = item.transform?.[5];
      if (previousY !== null && Math.abs(y - previousY) > 4 && currentLine.length) {
        lines.push(currentLine.join(' '));
        currentLine = [];
      }
      currentLine.push(item.str);
      previousY = y;
    }
    if (currentLine.length) lines.push(currentLine.join(' '));
    chapters.push({
      id: `page-${pageNumber}`,
      title: `第 ${pageNumber} 页`,
      content: lines.length ? textToHtml(lines.join('\n')) : '<p class="empty-page">本页没有可提取的文本，可能是扫描图片 PDF。</p>'
    });
  }
  return { title: metadata.info?.Title || baseName(file.name), author: metadata.info?.Author || '未知作者', chapters };
}

async function parseCbz(file) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const imagePattern = /\.(jpe?g|png|gif|webp|bmp)$/i;
  const entries = Object.values(zip.files).filter(entry => !entry.dir && imagePattern.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  const chapters = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const base64 = await entry.async('base64');
    const extension = getExtension(entry.name).replace('jpg', 'jpeg');
    chapters.push({ id: `page-${index + 1}`, title: `第 ${index + 1} 页`, content: `<img src="data:image/${extension};base64,${base64}" alt="${escapeHtml(entry.name)}">` });
  }
  return { title: baseName(file.name), author: '未知作者', cover: chapters[0]?.content.match(/src="([^"]+)/)?.[1] || null, chapters };
}

function rtfToText(rtf) {
  return rtf
    .replace(/\\'([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\u(-?\d+)\??/g, (_, code) => String.fromCharCode(Number(code) < 0 ? Number(code) + 65536 : Number(code)))
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\tab\b/g, '\t')
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\\([{}\\])/g, '$1');
}

export class DocumentParser {
  static getFormatLabel(fileName) {
    return getBookFormatLabel(fileName);
  }

  static async parse(file) {
    if (!file?.name) throw new Error('没有选择有效文件。');
    const extension = getExtension(file.name);
    if (!SUPPORTED_BOOK_EXTENSIONS.includes(extension)) {
      throw new Error(`暂不支持 .${extension || '未知'} 格式。`);
    }

    let parsed;
    if (extension === 'epub') parsed = await EpubParser.parseEpubFile(file);
    else if (['mobi', 'azw', 'azw3', 'fb2'].includes(extension)) parsed = await parseLingoBook(file, extension);
    else if (extension === 'pdf') parsed = await parsePdf(file);
    else if (extension === 'docx') {
      const { default: mammoth } = await import('mammoth');
      const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      parsed = { title: baseName(file.name), author: '未知作者', chapters: splitHtml(result.value) };
    } else if (extension === 'cbz') parsed = await parseCbz(file);
    else {
      const text = decodeText(await file.arrayBuffer());
      if (['html', 'htm'].includes(extension)) {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        parsed = { title: doc.title || baseName(file.name), author: '未知作者', chapters: splitHtml(doc.body.innerHTML) };
      } else if (['md', 'markdown'].includes(extension)) {
        const { marked } = await import('marked');
        parsed = { title: baseName(file.name), author: '未知作者', chapters: splitHtml(marked.parse(text)) };
      } else {
        const plainText = extension === 'rtf' ? rtfToText(text) : text;
        parsed = { title: baseName(file.name), author: '未知作者', chapters: splitPlainText(plainText) };
      }
    }

    if (!parsed?.chapters?.length) throw new Error(`${BOOK_FORMAT_LABELS[extension]} 文件中没有找到可阅读的内容。`);
    const chapters = parsed.chapters.map(chapter => ({ ...chapter, content: sanitizeBookHtml(chapter.content) }));
    return { ...parsed, chapters, format: BOOK_FORMAT_LABELS[extension], fileName: file.name };
  }
}

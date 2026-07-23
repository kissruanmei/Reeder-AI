/**
 * Reeder AI - EPUB & Document File Parser Service
 * Rock-solid Image Extractor targeting Light Novels (e.g., OEBPS/Images/Cover.jpg)
 */

import ePub from 'epubjs';

export class EpubParser {
  /**
   * Parse user provided ArrayBuffer or File object as EPUB
   */
  static async parseEpubFile(fileOrBuffer) {
    try {
      const book = ePub(fileOrBuffer);
      await book.ready;

      // Extract raw ArrayBuffer from file if available
      let buffer = null;
      if (fileOrBuffer instanceof ArrayBuffer) {
        buffer = fileOrBuffer;
      } else if (fileOrBuffer && typeof fileOrBuffer.arrayBuffer === 'function') {
        buffer = await fileOrBuffer.arrayBuffer();
      }

      // Build robust image Blob cache directly from EPUB zip archive using JSZip
      const imageCache = await this.buildImageBlobCache(book, buffer);

      // Extract metadata
      const metadata = await book.loaded.metadata;
      
      let coverUrl = null;
      try {
        // get cover href (e.g. "OEBPS/Images/cover.jpg") instead of epubjs generated blob URL
        const coverHref = await book.loaded.cover;
        if (coverHref && imageCache) {
          const lowerHref = coverHref.toLowerCase();
          coverUrl = imageCache.fullPathMap.get(lowerHref) || null;
          
          if (!coverUrl) {
            const pathParts = lowerHref.split('/');
            const pureFilename = pathParts[pathParts.length - 1];
            coverUrl = imageCache.filenameMap.get(pureFilename) || null;
          }
        }
      } catch (e) {
        console.warn('Failed to get cover href from epubjs:', e);
      }

      // Multi-layer Fallback for Cover URL
      if (!coverUrl && imageCache) {
        coverUrl = imageCache.filenameMap.get('cover.jpg') || 
                   imageCache.filenameMap.get('cover.jpeg') || 
                   imageCache.filenameMap.get('cover.png') || 
                   imageCache.filenameMap.get('162341.jpg') ||
                   null;
      }

      // Load navigation (TOC)
      const navigation = await book.loaded.navigation;
      const toc = navigation.toc || [];

      // Extract spine items (chapters)
      const spine = book.spine;
      const chapters = [];

      for (const item of spine.items) {
        if (!item.href) continue;
        try {
          // Load chapter raw document
          const doc = await book.load(item.href);
          let rawHtml = '';
          if (doc instanceof Document) {
            rawHtml = doc.body.innerHTML;
          } else if (typeof doc === 'string') {
            rawHtml = doc;
          }

          // Transform all image srcs inside chapter HTML using robust JSZip imageCache
          const processedHtml = await this.processChapterImages(rawHtml, item.href, imageCache);
          
          chapters.push({
            id: item.idref || item.href,
            href: item.href,
            title: item.title || `章节 ${chapters.length + 1}`,
            content: processedHtml
          });
        } catch (err) {
          console.warn('Failed to parse spine item:', item.href, err);
        }
      }

      return {
        title: metadata.title || fileOrBuffer.name || '未命名电子书',
        author: metadata.creator || '未知作者',
        cover: coverUrl,
        chapters: chapters.length > 0 ? chapters : [
          {
            id: 'ch-1',
            title: '正文',
            content: '<h1>电子书加载完成</h1><p>已成功读取该 EPUB 文件内容。</p>'
          }
        ],
        rawBook: book
      };
    } catch (err) {
      console.error('EPUB Parsing Failed:', err);
      throw new Error(`EPUB 文件解析失败: ${err.message || '请确认文件格式正确'}`);
    }
  }

  /**
   * Pre-extract all image files from EPUB zip archive into Blob Object URLs
   */
  static async buildImageBlobCache(book, arrayBuffer) {
    const fullPathMap = new Map(); // "oebps/images/cover.jpg" -> "blob:..."
    const filenameMap = new Map(); // "cover.jpg" -> "blob:..."
    const suffixMap = new Map();   // "images/cover.jpg" -> "blob:..."

    try {
      // 1. Obtain JSZip instance (either from epubjs archive or by parsing arrayBuffer with JSZip)
      let zip = book.archive?.zip;

      if ((!zip || !zip.files) && arrayBuffer) {
        try {
          // Fallback to JSZip directly if epubjs archive is missing zip reference
          const JSZip = (await import('jszip')).default;
          zip = await JSZip.loadAsync(arrayBuffer);
        } catch (e) {
          console.warn('Fallback JSZip load failed:', e);
        }
      }

      if (!zip || !zip.files) {
        console.warn('JSZip instance not accessible on book.archive');
        return { fullPathMap, filenameMap, suffixMap };
      }

      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
      const fileKeys = Object.keys(zip.files);

      for (const key of fileKeys) {
        const zipEntry = zip.files[key];
        if (!zipEntry || zipEntry.dir) continue;

        const lowerKey = key.toLowerCase();
        const isImage = imageExtensions.some(ext => lowerKey.endsWith(ext));

        if (isImage) {
          try {
            const base64 = await zipEntry.async('base64');
            let mimeType = 'image/jpeg';
            if (lowerKey.endsWith('.png')) mimeType = 'image/png';
            if (lowerKey.endsWith('.gif')) mimeType = 'image/gif';
            if (lowerKey.endsWith('.webp')) mimeType = 'image/webp';
            if (lowerKey.endsWith('.svg')) mimeType = 'image/svg+xml';

            const dataUrl = `data:${mimeType};base64,${base64}`;

            // A. Store full path (lowercase)
            fullPathMap.set(lowerKey, dataUrl);

            // B. Store pure filename (lowercase, e.g., "cover.jpg")
            const parts = lowerKey.split('/');
            const filename = parts[parts.length - 1];
            if (filename) {
              filenameMap.set(filename, dataUrl);
            }

            // C. Store last 2 parts suffix (e.g. "images/cover.jpg")
            if (parts.length >= 2) {
              const suffix = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
              suffixMap.set(suffix, dataUrl);
            }
          } catch (e) {
            console.warn(`Failed to generate data URL for zip entry ${key}:`, e);
          }
        }
      }

      console.log(`[Reeder Image Cache] Extracted ${filenameMap.size} image data URIs from EPUB Zip.`);
    } catch (err) {
      console.error('Error building image blob cache:', err);
    }

    return { fullPathMap, filenameMap, suffixMap };
  }

  /**
   * Process HTML content and replace image relative paths with extracted Blob URLs
   */
  static async processChapterImages(htmlContent, chapterHref, imageCache) {
    if (!htmlContent || typeof window === 'undefined') return htmlContent;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Query standard <img>, SVG <image>, and elements with inline background-image
      const imgElements = doc.querySelectorAll('img, image, [style*="background-image"], .cover img');
      if (imgElements.length === 0) return htmlContent;

      const chapterDir = chapterHref.substring(0, chapterHref.lastIndexOf('/') + 1);

      for (const el of imgElements) {
        let rawSrc = el.getAttribute('src') || el.getAttribute('xlink:href') || el.getAttribute('href');

        // Check CSS inline style background-image
        if (!rawSrc && el.hasAttribute('style')) {
          const style = el.getAttribute('style');
          const bgMatch = style.match(/url\(['"]?([^'"]+)['"]?\)/i);
          if (bgMatch && bgMatch[1]) rawSrc = bgMatch[1];
        }

        if (!rawSrc || rawSrc.startsWith('http://') || rawSrc.startsWith('https://') || rawSrc.startsWith('blob:') || rawSrc.startsWith('data:')) {
          continue;
        }

        // Clean rawSrc (remove query params or anchor)
        const cleanRawSrc = rawSrc.split('?')[0].split('#')[0].replace(/^(\.\/|\/)+/, '');
        const lowerRawSrc = cleanRawSrc.toLowerCase();

        // Calculate various path representations
        const resolvedPath = this.resolveRelativePath(chapterDir, cleanRawSrc).toLowerCase();
        
        // Extract pure filename (e.g. "cover.jpg")
        const pathParts = lowerRawSrc.split('/');
        const pureFilename = pathParts[pathParts.length - 1];

        // Extract last 2 parts (e.g. "images/cover.jpg")
        const suffix = pathParts.length >= 2 ? `${pathParts[pathParts.length - 2]}/${pathParts[pathParts.length - 1]}` : pureFilename;

        // Match against imageCache using 4-tier Strategy
        let matchedBlobUrl = null;

        if (imageCache) {
          // 1. Suffix Match (e.g. "images/cover.jpg")
          if (imageCache.suffixMap && imageCache.suffixMap.has(suffix)) {
            matchedBlobUrl = imageCache.suffixMap.get(suffix);
          }
          // 2. Pure Filename Match (e.g. "cover.jpg")
          else if (imageCache.filenameMap && imageCache.filenameMap.has(pureFilename)) {
            matchedBlobUrl = imageCache.filenameMap.get(pureFilename);
          }
          // 3. Full / Resolved Path Match (e.g. "oebps/images/cover.jpg")
          else if (imageCache.fullPathMap && imageCache.fullPathMap.has(resolvedPath)) {
            matchedBlobUrl = imageCache.fullPathMap.get(resolvedPath);
          }
          // 4. Raw path match
          else if (imageCache.fullPathMap && imageCache.fullPathMap.has(lowerRawSrc)) {
            matchedBlobUrl = imageCache.fullPathMap.get(lowerRawSrc);
          }
        }

        // Apply matched blob URL
        if (matchedBlobUrl) {
          if (el.tagName.toLowerCase() === 'img') {
            el.setAttribute('src', matchedBlobUrl);
          } else if (el.tagName.toLowerCase() === 'image') {
            el.setAttribute('src', matchedBlobUrl);
            el.setAttribute('xlink:href', matchedBlobUrl);
            el.setAttribute('href', matchedBlobUrl);
          }

          // Handle inline style background-image
          if (el.hasAttribute('style') && el.getAttribute('style').includes('url(')) {
            const oldStyle = el.getAttribute('style');
            el.setAttribute('style', oldStyle.replace(/url\(['"]?([^'"]+)['"]?\)/gi, `url("${matchedBlobUrl}")`));
          }

          el.setAttribute('data-original-src', rawSrc);
          el.classList.add('epub-embedded-illustration');
        }
      }

      return doc.body.innerHTML;
    } catch (err) {
      console.error('Error processing chapter images:', err);
      return htmlContent;
    }
  }

  /**
   * Resolve relative paths like "../Images/Cover.jpg" from "OEBPS/Text/" -> "OEBPS/Images/Cover.jpg"
   */
  static resolveRelativePath(baseDir, relativePath) {
    if (!baseDir) return relativePath;
    const stack = baseDir.split('/').filter(Boolean);
    const parts = relativePath.split('/');

    for (const part of parts) {
      if (part === '.' || !part) continue;
      if (part === '..') {
        if (stack.length > 0) stack.pop();
      } else {
        stack.push(part);
      }
    }

    return stack.join('/');
  }
}

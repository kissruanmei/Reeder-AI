import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EpubParser } from './services/epubParser';
import { LibraryService } from './services/libraryService';
import { BookStorage } from './services/bookStorage';
import { Navbar } from './components/Navbar/Navbar';
import { Home } from './components/Home/Home';
import { GuideModal } from './components/Home/GuideModal';
import { EpubReader } from './components/Reader/EpubReader';
import { SelectionTooltip } from './components/Reader/SelectionTooltip';
import { TypographyControl } from './components/Reader/TypographyControl';
import { TocDrawer } from './components/Reader/TocDrawer';
import { AiSidebar } from './components/AI/AiSidebar';
import { ApiKeyModal } from './components/AI/ApiKeyModal';
import { ImageLightbox } from './components/Reader/ImageLightbox';
import { LibraryModal } from './components/Library/LibraryModal';
import { WallpaperBackdrop } from './components/Reader/WallpaperBackdrop';
import { WallpaperPopover } from './components/Reader/WallpaperPopover';
import { WallpaperStorage } from './services/wallpaperStorage';
import { MusicPlayer } from './components/Music/MusicPlayer';

function getSortedLibrary() {
  return LibraryService.getLibrary().sort((a, b) => (b.lastReadAt || b.addedAt || 0) - (a.lastReadAt || a.addedAt || 0));
}

function chapterForBook(bookId, chapterCount) {
  const progress = LibraryService.getProgress(bookId);
  const index = Number.isInteger(progress?.chapterIndex) ? progress.chapterIndex : 0;
  return Math.max(0, Math.min(chapterCount - 1, index));
}

function readWallpaperSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('reeder_wallpaper') || '{}');
    return {
      enabled: saved.enabled !== false,
      opacity: Number.isFinite(saved.opacity) ? Math.max(0, Math.min(100, saved.opacity)) : 25,
    };
  } catch {
    return { enabled: true, opacity: 25 };
  }
}

function readAiSidebarWidth() {
  const saved = Number(localStorage.getItem('reeder_ai_width'));
  return Number.isFinite(saved) && saved >= 300 && saved <= 720 ? saved : 380;
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('reeder_theme') || 'paper');
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('serif');
  const [lineHeight, setLineHeight] = useState(1.8);
  const [maxWidth, setMaxWidth] = useState(720);
  const [wallpaperSettings, setWallpaperSettings] = useState(readWallpaperSettings);
  const [wallpaperImage, setWallpaperImage] = useState({ url: '', name: '' });
  const [isWallpaperOpen, setIsWallpaperOpen] = useState(false);

  const [view, setView] = useState('home');
  // Identity, content and position must change together so an old chapter can
  // never be saved under a newly imported book's ID.
  const [reading, setReading] = useState(null);
  const [library, setLibrary] = useState(getSortedLibrary);
  const [stats, setStats] = useState(() => LibraryService.getStats());
  const fileInputRef = useRef(null);
  const openRequestRef = useRef(0);

  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState(null);
  const [promptAction, setPromptAction] = useState(null);
  const [pendingAnchor, setPendingAnchor] = useState('');
  const [activeImage, setActiveImage] = useState(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isTypographyOpen, setIsTypographyOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [aiSidebarWidth, setAiSidebarWidth] = useState(readAiSidebarWidth);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isMusicPickerOpen, setIsMusicPickerOpen] = useState(false);
  const closeMusicPicker = useCallback(() => setIsMusicPickerOpen(false), []);
  const wallpaperUrlRef = useRef('');

  const refreshHome = () => {
    setLibrary(getSortedLibrary());
    setStats(LibraryService.getStats());
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('reeder_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('reeder_wallpaper', JSON.stringify(wallpaperSettings));
  }, [wallpaperSettings]);

  useEffect(() => {
    localStorage.setItem('reeder_ai_width', String(aiSidebarWidth));
  }, [aiSidebarWidth]);

  useEffect(() => {
    let active = true;
    WallpaperStorage.load()
      .then((record) => {
        if (!active || !record?.blob) return;
        const url = URL.createObjectURL(record.blob);
        wallpaperUrlRef.current = url;
        setWallpaperImage({ url, name: record.name || '自定义背景' });
      })
      .catch((error) => {
        console.warn('Failed to load saved wallpaper:', error);
      });
    return () => {
      active = false;
      if (wallpaperUrlRef.current) {
        URL.revokeObjectURL(wallpaperUrlRef.current);
        wallpaperUrlRef.current = '';
      }
    };
  }, []);

  const handleImportWallpaper = async (file) => {
    try {
      const record = await WallpaperStorage.save(file);
      const nextUrl = URL.createObjectURL(record.blob);
      if (wallpaperUrlRef.current) URL.revokeObjectURL(wallpaperUrlRef.current);
      wallpaperUrlRef.current = nextUrl;
      setWallpaperImage({ url: nextUrl, name: record.name });
      setWallpaperSettings((current) => ({ ...current, enabled: true }));
    } catch (error) {
      alert(error.message || '导入背景图片失败，请重试。');
    }
  };

  const handleClearWallpaper = async () => {
    try {
      await WallpaperStorage.clear();
      if (wallpaperUrlRef.current) {
        URL.revokeObjectURL(wallpaperUrlRef.current);
        wallpaperUrlRef.current = '';
      }
      setWallpaperImage({ url: '', name: '' });
    } catch (error) {
      alert(error.message || '清除背景图片失败，请重试。');
    }
  };

  const closeWallpaperPopover = useCallback(() => setIsWallpaperOpen(false), []);

  useEffect(() => {
    if (view === 'home') refreshHome();
  }, [view]);

  useEffect(() => {
    if (view !== 'reader') return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') LibraryService.addReadingMinutes(1);
    }, 60000);
    return () => clearInterval(timer);
  }, [view]);

  useEffect(() => {
    if (reading?.id && reading.book?.chapters?.length) {
      LibraryService.saveProgress(reading.id, reading.chapterIndex, reading.book.chapters.length);
    }
  }, [reading]);

  const openReading = (id, book, chapterIndex) => {
    setReading({ id, book, chapterIndex });
    setSelectedText('');
    setSelectionPos(null);
    setPromptAction(null);
    setPendingAnchor('');
    setIsTocOpen(false);
    setIsTypographyOpen(false);
    setIsAiSidebarOpen(false);
    setIsLibraryOpen(false);
    setView('reader');
  };

  const handleLoadEpubFile = async (file) => {
    const requestId = ++openRequestRef.current;
    try {
      const parsedBook = await EpubParser.parseEpubFile(file);
      const bookId = LibraryService.generateBookId(parsedBook.title, parsedBook.author);
      const chapterIndex = chapterForBook(bookId, parsedBook.chapters.length);
      await BookStorage.saveBookContent(bookId, parsedBook, file);
      if (requestId !== openRequestRef.current) return;
      LibraryService.saveBook({ ...parsedBook, id: bookId });
      openReading(bookId, parsedBook, chapterIndex);
    } catch (error) {
      if (requestId === openRequestRef.current) alert(error.message || '解包 EPUB 电子书失败，请尝试其他文件。');
    }
  };

  const handleSelectBook = async (selectedBook) => {
    if (!selectedBook?.id) return;
    const requestId = ++openRequestRef.current;
    try {
      const storedBook = await BookStorage.getBookContent(selectedBook.id);
      if (!storedBook?.chapters?.length) throw new Error('无法找到这本书的内容，请重新导入 EPUB 文件。');

      // Reopen newly imported EPUBs from their original file so embedded image
      // URLs are recreated after the application has been restarted.
      let book = storedBook;
      if (storedBook.sourceFile) {
        try {
          book = await EpubParser.parseEpubFile(storedBook.sourceFile);
        } catch (error) {
          console.warn('Could not reopen the original EPUB:', error);
        }
      }
      if (requestId !== openRequestRef.current) return;
      openReading(selectedBook.id, book, chapterForBook(selectedBook.id, book.chapters.length));
    } catch (error) {
      if (requestId === openRequestRef.current) alert(error.message || '打开图书失败，请重新导入。');
    }
  };

  const goHome = () => {
    openRequestRef.current += 1;
    setView('home');
    setIsTocOpen(false);
    setIsTypographyOpen(false);
    setIsWallpaperOpen(false);
    closeMusicPicker();
    setIsLibraryOpen(false);
    setSelectedText('');
    setSelectionPos(null);
    setPromptAction(null);
    refreshHome();
  };

  const changeChapter = (nextIndex) => {
    setPendingAnchor('');
    setReading((current) => current ? {
      ...current,
      chapterIndex: Math.max(0, Math.min(current.book.chapters.length - 1, nextIndex))
    } : current);
  };

  const clearPendingAnchor = useCallback(() => setPendingAnchor(''), []);

  const handleNavigateHref = useCallback((rawHref) => {
    if (!reading?.book?.chapters?.length || !rawHref) return;
    const chapters = reading.book.chapters;
    const activeChapter = chapters[reading.chapterIndex] || chapters[0];
    try {
      const basePath = activeChapter?.href ? activeChapter.href.replace(/^\/+/, '') : '';
      const resolved = new URL(rawHref, `https://epub.local/${basePath}`);
      if (resolved.origin !== 'https://epub.local') return;

      const targetPath = decodeURIComponent(resolved.pathname.replace(/^\/+/, ''));
      const targetHash = resolved.hash || '';
      const targetFileName = targetPath.split('/').pop();

      let targetIndex = chapters.findIndex(
        (ch) => ch.href && decodeURIComponent(ch.href.replace(/^\/+/, '')) === targetPath
      );
      if (targetIndex === -1 && targetFileName) {
        targetIndex = chapters.findIndex(
          (ch) => ch.href && decodeURIComponent(ch.href.split('/').pop()) === targetFileName
        );
      }
      if (targetIndex === -1) return;

      setPendingAnchor(targetHash);
      setReading((current) => (current ? { ...current, chapterIndex: targetIndex } : current));
    } catch {
      // 忽略无法解析的内部链接，避免跳离阅读器
    }
  }, [reading]);

  const handleSelectionAction = (action, text) => {
    setSelectedText(text);
    setPromptAction(action);
    setIsAiSidebarOpen(true);
  };

  const book = reading?.book;
  const chapterIndex = reading?.chapterIndex ?? 0;
  const currentChapter = book?.chapters?.[chapterIndex] || book?.chapters?.[0];
  const progressPercent = book ? Math.min(100, Math.round(((chapterIndex + 1) / book.chapters.length) * 100)) : 0;
  const chooseFile = () => fileInputRef.current?.click();
  const hasWallpaper = Boolean(wallpaperSettings.enabled && wallpaperImage.url);

  return (
    <div
      className={hasWallpaper ? 'has-wallpaper' : undefined}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', '--ai-sidebar-width': `${aiSidebarWidth}px` }}
    >
      {hasWallpaper && (
        <WallpaperBackdrop imageUrl={wallpaperImage.url} opacity={wallpaperSettings.opacity} />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,application/epub+zip"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) handleLoadEpubFile(file);
        }}
      />
      <Navbar
        isHome={view === 'home'}
        bookTitle={book?.title}
        author={book?.author}
        progressPercent={progressPercent}
        onGoHome={goHome}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onImport={chooseFile}
        onOpenToc={() => setIsTocOpen(!isTocOpen)}
        onOpenTypography={() => setIsTypographyOpen(!isTypographyOpen)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onToggleMusicPicker={() => setIsMusicPickerOpen(open => !open)}
        onToggleWallpaper={() => setIsWallpaperOpen(open => !open)}
        isTypographyOpen={isTypographyOpen}
        isTocOpen={isTocOpen}
        isMusicPickerOpen={isMusicPickerOpen}
        isWallpaperOpen={isWallpaperOpen}
      />

      {view === 'home' ? (
        <Home library={library} stats={stats} onSelectBook={handleSelectBook} onOpenLibrary={() => setIsLibraryOpen(true)} onOpenGuide={() => setIsGuideOpen(true)} onImport={chooseFile} />
      ) : book && (
        <>
          <EpubReader
            chapter={currentChapter}
            isAiSidebarOpen={isAiSidebarOpen}
            currentChapterIndex={chapterIndex}
            totalChapters={book.chapters.length}
            fontSize={fontSize}
            fontFamily={fontFamily}
            lineHeight={lineHeight}
            maxWidth={maxWidth}
            targetAnchor={pendingAnchor}
            onClearAnchor={clearPendingAnchor}
            onNavigateHref={handleNavigateHref}
            onSelectionChange={(text, pos) => { setSelectedText(text || ''); setSelectionPos(pos); }}
            onImageClick={(src, alt) => setActiveImage({ src, alt })}
            onPrevChapter={() => changeChapter(chapterIndex - 1)}
            onNextChapter={() => changeChapter(chapterIndex + 1)}
            hasPrev={chapterIndex > 0}
            hasNext={chapterIndex < book.chapters.length - 1}
          />
          {selectedText && selectionPos && <SelectionTooltip position={selectionPos} selectedText={selectedText} onAction={handleSelectionAction} onClose={() => { setSelectedText(''); setSelectionPos(null); }} />}
          {isTypographyOpen && <TypographyControl
            theme={theme} setTheme={setTheme} fontSize={fontSize} setFontSize={setFontSize}
            fontFamily={fontFamily} setFontFamily={setFontFamily} lineHeight={lineHeight} setLineHeight={setLineHeight}
            maxWidth={maxWidth} setMaxWidth={setMaxWidth} onClose={() => setIsTypographyOpen(false)}
          />}
          <TocDrawer isOpen={isTocOpen} chapters={book.chapters} currentChapterId={currentChapter?.id} onSelectChapter={(chapter) => { const index = book.chapters.findIndex((item) => item.id === chapter.id); if (index !== -1) changeChapter(index); }} onClose={() => setIsTocOpen(false)} />
          <AiSidebar
            isOpen={isAiSidebarOpen}
            onOpen={() => setIsAiSidebarOpen(true)}
            onClose={() => setIsAiSidebarOpen(false)}
            width={aiSidebarWidth}
            onWidthChange={setAiSidebarWidth}
            selectedText={selectedText}
            promptAction={promptAction}
            onClearSelectedText={() => { setSelectedText(''); setPromptAction(null); }}
          />
        </>
      )}

      <WallpaperPopover
        isOpen={isWallpaperOpen}
        enabled={wallpaperSettings.enabled}
        opacity={wallpaperSettings.opacity}
        imageUrl={wallpaperImage.url}
        imageName={wallpaperImage.name}
        onEnabledChange={(enabled) => setWallpaperSettings(current => ({ ...current, enabled }))}
        onOpacityChange={(opacity) => setWallpaperSettings(current => ({ ...current, opacity }))}
        onImportImage={handleImportWallpaper}
        onClearImage={handleClearWallpaper}
        onClose={closeWallpaperPopover}
      />
      <MusicPlayer isHome={view === 'home'} pickerOpen={isMusicPickerOpen} onOpenPicker={() => setIsMusicPickerOpen(true)} onClosePicker={closeMusicPicker} />
      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} />
      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        currentBookId={reading?.id}
        onSelectBook={handleSelectBook}
        onDeleteBook={(deletedId) => {
          if (deletedId === reading?.id) setReading(null);
          refreshHome();
        }}
        onImportNewEpub={chooseFile}
      />
      {activeImage && <ImageLightbox src={activeImage.src} alt={activeImage.alt} onClose={() => setActiveImage(null)} />}
    </div>
  );
}

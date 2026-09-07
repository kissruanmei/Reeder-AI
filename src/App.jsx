import React, { useState, useEffect, useRef } from 'react';
import { DEMO_BOOK } from './assets/demoBook';
import { DocumentParser } from './services/documentParser';
import { LibraryService } from './services/libraryService';
import { BookStorage } from './services/bookStorage';
import { Navbar } from './components/Navbar/Navbar';
import { EpubReader } from './components/Reader/EpubReader';
import { SelectionTooltip } from './components/Reader/SelectionTooltip';
import { TypographyControl } from './components/Reader/TypographyControl';
import { TocDrawer } from './components/Reader/TocDrawer';
import { AiSidebar } from './components/AI/AiSidebar';
import { ApiKeyModal } from './components/AI/ApiKeyModal';
import { ImageLightbox } from './components/Reader/ImageLightbox';
import { LibraryModal } from './components/Library/LibraryModal';
import { LibraryHome } from './components/Library/LibraryHome';
import { calculateProgressPercent } from './services/progress';

export default function App() {
  const [currentView, setCurrentView] = useState('library');
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  // Theme & Appearance State
  const [theme, setTheme] = useState(() => localStorage.getItem('reeder_theme') || 'paper');
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('serif');
  const [lineHeight, setLineHeight] = useState(1.8);
  const [maxWidth, setMaxWidth] = useState(720);

  // Book & Reader State
  const [book, setBook] = useState(DEMO_BOOK);
  const [currentBookId, setCurrentBookId] = useState('');
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  // Text Selection & AI Interaction State
  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState(null);
  const [promptAction, setPromptAction] = useState(null);

  // Image Lightbox State
  const [activeImage, setActiveImage] = useState(null);

  // Modals & Drawers State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isTypographyOpen, setIsTypographyOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Sync theme to root DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('reeder_theme', theme);
  }, [theme]);

  // Background Reading Time Tracker (Adds 1 minute every 60 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        LibraryService.addReadingMinutes(1);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto load local light novel test EPUB or last saved book on init
  useEffect(() => {
    const initBook = async () => {
      try {
        const library = LibraryService.getLibrary();
        if (library.length > 0) {
          const lastBookMeta = library[0];
          const storedBook = await BookStorage.getBookContent(lastBookMeta.id);
          if (storedBook && storedBook.chapters?.length > 0) {
            setBook(storedBook);
            setCurrentBookId(storedBook.id);
            const savedProgress = LibraryService.getProgress(storedBook.id);
            if (savedProgress && typeof savedProgress.chapterIndex === 'number') {
              setCurrentChapterIndex(Math.min(storedBook.chapters.length - 1, savedProgress.chapterIndex));
            }
            return;
          }
        }

        const res = await fetch('./义妹生活-第一卷-迷糊轻小说 (三河ごーすと) (z-library.sk, 1lib.sk, z-lib.sk).epub');
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const parsed = await DocumentParser.parse(new File([buffer], '义妹生活-第一卷.epub', { type: 'application/epub+zip' }));
          if (parsed && parsed.chapters.length > 0) {
            const bookId = LibraryService.generateBookId(parsed.title, parsed.author);
            const parsedWithId = { ...parsed, id: bookId };
            setCurrentBookId(bookId);
            LibraryService.saveBook({ id: bookId, ...parsed });
            await BookStorage.saveBookContent(bookId, parsedWithId);

            // Restore saved progress
            const savedProgress = LibraryService.getProgress(bookId);
            if (savedProgress && typeof savedProgress.chapterIndex === 'number') {
              setCurrentChapterIndex(Math.min(parsed.chapters.length - 1, savedProgress.chapterIndex));
            }

            setBook(parsedWithId);
            setLibraryRefreshKey(key => key + 1);
            return;
          }
        }
      } catch (e) {
        console.warn('Local init failed:', e);
      }

      // Fallback silently to DEMO_BOOK
      const bookId = LibraryService.generateBookId(DEMO_BOOK.title, DEMO_BOOK.author);
      setCurrentBookId(bookId);
      LibraryService.saveBook({ id: bookId, ...DEMO_BOOK });
      await BookStorage.saveBookContent(bookId, DEMO_BOOK);
      setBook({ ...DEMO_BOOK, id: bookId });
      setLibraryRefreshKey(key => key + 1);
    };

    initBook();
  }, []);

  // Auto save progress on chapter change
  useEffect(() => {
    if (currentBookId && book?.id === currentBookId && book?.chapters?.length) {
      LibraryService.saveProgress(currentBookId, currentChapterIndex, book.chapters.length);
    }
  }, [currentBookId, currentChapterIndex, book]);

  // Load an external supported book/document file manually
  const handleLoadBookFile = async (file) => {
    try {
      const parsedBook = await DocumentParser.parse(file);
      const bookId = LibraryService.generateBookId(parsedBook.title, parsedBook.author);
      const importedBook = { ...parsedBook, id: bookId };

      LibraryService.saveBook(importedBook);
      // A newly imported copy always starts at the beginning. Persist this before
      // switching the active book so the previous book's index can never leak in.
      LibraryService.saveProgress(bookId, 0, importedBook.chapters.length);
      await BookStorage.saveBookContent(bookId, importedBook);

      setBook(importedBook);
      setCurrentBookId(bookId);
      setCurrentChapterIndex(0);
      setCurrentView('reader');
      setLibraryRefreshKey(key => key + 1);
      setIsTocOpen(false);
    } catch (err) {
      console.error('Book import failed:', err);
      const extension = file?.name?.split('.').pop()?.toLowerCase();
      const drmHint = ['mobi', 'azw', 'azw3'].includes(extension)
        ? ' 请确认这是无 DRM 的 Kindle 文件。'
        : extension === 'pdf' ? ' 请确认 PDF 未加密且文件完整。' : '';
      alert(`${err.message || '书籍解析失败。'}${drmHint}`);
    }
  };

  // Selection Action Handler
  const handleSelectionAction = (action, text) => {
    setSelectedText(text);
    setPromptAction(action);
    setIsAiSidebarOpen(true);
  };

  const currentChapter = book.chapters[currentChapterIndex] || book.chapters[0];
  const progressPercent = calculateProgressPercent(currentChapterIndex, book.chapters?.length || 1);

  const openBook = async (selectedBook) => {
    if (!selectedBook?.id) return;
    const storedBook = await BookStorage.getBookContent(selectedBook.id);
    if (!storedBook?.chapters?.length) return;

    const savedProgress = LibraryService.getProgress(selectedBook.id);
    const nextChapterIndex = savedProgress && typeof savedProgress.chapterIndex === 'number'
      ? Math.min(storedBook.chapters.length - 1, savedProgress.chapterIndex)
      : 0;

    setBook(storedBook);
    setCurrentBookId(selectedBook.id);
    setCurrentChapterIndex(nextChapterIndex);
    LibraryService.touchBook(selectedBook.id);
    setLibraryRefreshKey(key => key + 1);
    setCurrentView('reader');
  };

  const handleDeleteBook = async (deletedId, remainingLibrary) => {
    setLibraryRefreshKey(key => key + 1);
    if (deletedId !== currentBookId) return;

    if (remainingLibrary.length > 0) {
      const nextBookMeta = [...remainingLibrary].sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0))[0];
      const storedNext = await BookStorage.getBookContent(nextBookMeta.id);
      if (storedNext?.chapters?.length) {
        setBook(storedNext);
        setCurrentBookId(nextBookMeta.id);
        const progress = LibraryService.getProgress(nextBookMeta.id);
        setCurrentChapterIndex(Math.min(storedNext.chapters.length - 1, progress?.chapterIndex || 0));
        return;
      }
    }

    const demoId = LibraryService.generateBookId(DEMO_BOOK.title, DEMO_BOOK.author);
    setBook({ ...DEMO_BOOK, id: demoId });
    setCurrentBookId('');
    setCurrentChapterIndex(0);
    setCurrentView('library');
  };

  if (currentView === 'library') {
    return (
      <LibraryHome
        refreshKey={libraryRefreshKey}
        onOpenBook={openBook}
        onImportBook={handleLoadBookFile}
        onDeleteBook={handleDeleteBook}
      />
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top Navbar */}
      <Navbar
        bookTitle={book.title}
        author={book.author}
        progressPercent={progressPercent}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onGoHome={() => {
          setIsLibraryOpen(false);
          setCurrentView('library');
          setLibraryRefreshKey(key => key + 1);
        }}
        onOpenToc={() => setIsTocOpen(!isTocOpen)}
        onOpenTypography={() => setIsTypographyOpen(!isTypographyOpen)}
        onToggleAiSidebar={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onLoadEpubFile={handleLoadBookFile}
        isAiSidebarOpen={isAiSidebarOpen}
        isTypographyOpen={isTypographyOpen}
        isTocOpen={isTocOpen}
        isLibraryOpen={isLibraryOpen}
      />

      {/* Main Reading Canvas */}
      <EpubReader
        chapter={currentChapter}
        currentChapterIndex={currentChapterIndex}
        totalChapters={book.chapters?.length || 1}
        fontSize={fontSize}
        fontFamily={fontFamily}
        lineHeight={lineHeight}
        maxWidth={maxWidth}
        onSelectionChange={(text, pos) => {
          setSelectedText(text || '');
          setSelectionPos(pos);
        }}
        onImageClick={(src, alt) => setActiveImage({ src, alt })}
        onPrevChapter={() => setCurrentChapterIndex(Math.max(0, currentChapterIndex - 1))}
        onNextChapter={() => setCurrentChapterIndex(Math.min(book.chapters.length - 1, currentChapterIndex + 1))}
        hasPrev={currentChapterIndex > 0}
        hasNext={currentChapterIndex < book.chapters.length - 1}
      />

      {/* Floating Selection Tooltip */}
      {selectedText && selectionPos && (
        <SelectionTooltip
          position={selectionPos}
          selectedText={selectedText}
          onAction={handleSelectionAction}
          onClose={() => {
            setSelectedText('');
            setSelectionPos(null);
          }}
        />
      )}

      {/* Typography & Theme Control Panel (Aa) */}
      {isTypographyOpen && (
        <TypographyControl
          theme={theme}
          setTheme={setTheme}
          fontSize={fontSize}
          setFontSize={setFontSize}
          fontFamily={fontFamily}
          setFontFamily={setFontFamily}
          lineHeight={lineHeight}
          setLineHeight={setLineHeight}
          maxWidth={maxWidth}
          setMaxWidth={setMaxWidth}
          onClose={() => setIsTypographyOpen(false)}
        />
      )}

      {/* Table of Contents Drawer */}
      <TocDrawer
        isOpen={isTocOpen}
        chapters={book.chapters}
        currentChapterId={currentChapter?.id}
        onSelectChapter={(ch) => {
          const idx = book.chapters.findIndex(c => c.id === ch.id);
          if (idx !== -1) setCurrentChapterIndex(idx);
        }}
        onClose={() => setIsTocOpen(false)}
      />

      {/* AI Assistant Sidebar */}
      <AiSidebar
        isOpen={isAiSidebarOpen}
        onClose={() => setIsAiSidebarOpen(false)}
        selectedText={selectedText}
        promptAction={promptAction}
        onClearSelectedText={() => {
          setSelectedText('');
          setPromptAction(null);
        }}
      />

      {/* API Key Settings Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

      {/* My Bookshelf & Stats Modal */}
      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        currentBookId={currentBookId}
        onSelectBook={openBook}
        onDeleteBook={handleDeleteBook}
        onImportNewEpub={() => {
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) fileInput.click();
        }}
        onOpenFullLibrary={() => {
          setCurrentView('library');
          setLibraryRefreshKey(key => key + 1);
        }}
      />

      {/* Image Lightbox Zoom Modal */}
      {activeImage && (
        <ImageLightbox
          src={activeImage.src}
          alt={activeImage.alt}
          onClose={() => setActiveImage(null)}
        />
      )}
    </div>
  );
}

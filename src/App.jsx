import React, { useState, useEffect, useRef } from 'react';
import { DEMO_BOOK } from './assets/demoBook';
import { EpubParser } from './services/epubParser';
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

export default function App() {
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
          const parsed = await EpubParser.parseEpubFile(buffer);
          if (parsed && parsed.chapters.length > 0) {
            const bookId = LibraryService.generateBookId(parsed.title, parsed.author);
            setCurrentBookId(bookId);
            LibraryService.saveBook({ id: bookId, ...parsed });
            await BookStorage.saveBookContent(bookId, parsed);

            // Restore saved progress
            const savedProgress = LibraryService.getProgress(bookId);
            if (savedProgress && typeof savedProgress.chapterIndex === 'number') {
              setCurrentChapterIndex(Math.min(parsed.chapters.length - 1, savedProgress.chapterIndex));
            }

            setBook(parsed);
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
      setBook(DEMO_BOOK);
    };

    initBook();
  }, []);

  // Auto save progress on chapter change
  useEffect(() => {
    if (currentBookId && book?.chapters?.length) {
      LibraryService.saveProgress(currentBookId, currentChapterIndex, book.chapters.length);
    }
  }, [currentBookId, currentChapterIndex, book]);

  // Load external EPUB File manually
  const handleLoadEpubFile = async (file) => {
    try {
      const parsedBook = await EpubParser.parseEpubFile(file);
      const bookId = LibraryService.generateBookId(parsedBook.title, parsedBook.author);
      
      setCurrentBookId(bookId);
      LibraryService.saveBook({ id: bookId, ...parsedBook });
      await BookStorage.saveBookContent(bookId, parsedBook);

      // Restore saved progress if available
      const savedProgress = LibraryService.getProgress(bookId);
      if (savedProgress && typeof savedProgress.chapterIndex === 'number') {
        setCurrentChapterIndex(Math.min(parsedBook.chapters.length - 1, savedProgress.chapterIndex));
      } else {
        setCurrentChapterIndex(0);
      }

      setBook(parsedBook);
      setIsTocOpen(false);
    } catch (err) {
      alert(err.message || '解包 EPUB 电子书失败，请尝试其他文件。');
    }
  };

  // Selection Action Handler
  const handleSelectionAction = (action, text) => {
    setSelectedText(text);
    setPromptAction(action);
    setIsAiSidebarOpen(true);
  };

  const currentChapter = book.chapters[currentChapterIndex] || book.chapters[0];
  const progressPercent = Math.min(100, Math.round(((currentChapterIndex + 1) / (book.chapters?.length || 1)) * 100));

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top Navbar */}
      <Navbar
        bookTitle={book.title}
        author={book.author}
        progressPercent={progressPercent}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenToc={() => setIsTocOpen(!isTocOpen)}
        onOpenTypography={() => setIsTypographyOpen(!isTypographyOpen)}
        onToggleAiSidebar={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onLoadEpubFile={handleLoadEpubFile}
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
        onSelectBook={async (selectedBook) => {
          if (!selectedBook || !selectedBook.id) return;

          // Load full content from IndexedDB
          const storedBook = await BookStorage.getBookContent(selectedBook.id);
          if (storedBook && storedBook.chapters?.length > 0) {
            setBook(storedBook);
          }

          const savedProgress = LibraryService.getProgress(selectedBook.id);
          setCurrentBookId(selectedBook.id);
          if (savedProgress && typeof savedProgress.chapterIndex === 'number') {
            const total = storedBook?.chapters?.length || selectedBook.totalChapters || 1;
            setCurrentChapterIndex(Math.min(total - 1, savedProgress.chapterIndex));
          } else {
            setCurrentChapterIndex(0);
          }
        }}
        onDeleteBook={async (deletedId, remainingLibrary) => {
          if (deletedId === currentBookId) {
            if (remainingLibrary.length > 0) {
              const nextBookMeta = remainingLibrary[0];
              const storedNext = await BookStorage.getBookContent(nextBookMeta.id);
              if (storedNext && storedNext.chapters?.length > 0) {
                setBook(storedNext);
                setCurrentBookId(nextBookMeta.id);
                const progress = LibraryService.getProgress(nextBookMeta.id);
                setCurrentChapterIndex(progress?.chapterIndex || 0);
                return;
              }
            }
            // Fallback to DEMO_BOOK
            const demoId = LibraryService.generateBookId(DEMO_BOOK.title, DEMO_BOOK.author);
            setBook(DEMO_BOOK);
            setCurrentBookId(demoId);
            setCurrentChapterIndex(0);
          }
        }}
        onImportNewEpub={() => {
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) fileInput.click();
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

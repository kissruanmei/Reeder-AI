import React, { useEffect, useRef, useState } from 'react';
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

function getSortedLibrary() {
  return LibraryService.getLibrary().sort((a, b) => (b.lastReadAt || b.addedAt || 0) - (a.lastReadAt || a.addedAt || 0));
}

function chapterForBook(bookId, chapterCount) {
  const progress = LibraryService.getProgress(bookId);
  const index = Number.isInteger(progress?.chapterIndex) ? progress.chapterIndex : 0;
  return Math.max(0, Math.min(chapterCount - 1, index));
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('reeder_theme') || 'paper');
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('serif');
  const [lineHeight, setLineHeight] = useState(1.8);
  const [maxWidth, setMaxWidth] = useState(720);

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
  const [activeImage, setActiveImage] = useState(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isTypographyOpen, setIsTypographyOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const refreshHome = () => {
    setLibrary(getSortedLibrary());
    setStats(LibraryService.getStats());
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('reeder_theme', theme);
  }, [theme]);

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
    setIsTocOpen(false);
    setIsTypographyOpen(false);
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
    setIsLibraryOpen(false);
    setSelectedText('');
    setSelectionPos(null);
    setPromptAction(null);
    refreshHome();
  };

  const changeChapter = (nextIndex) => {
    setReading((current) => current ? {
      ...current,
      chapterIndex: Math.max(0, Math.min(current.book.chapters.length - 1, nextIndex))
    } : current);
  };

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

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
        onToggleAiSidebar={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        isAiSidebarOpen={isAiSidebarOpen}
        isTypographyOpen={isTypographyOpen}
        isTocOpen={isTocOpen}
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
            onSelectionChange={(text, pos) => { setSelectedText(text || ''); setSelectionPos(pos); }}
            onImageClick={(src, alt) => setActiveImage({ src, alt })}
            onPrevChapter={() => changeChapter(chapterIndex - 1)}
            onNextChapter={() => changeChapter(chapterIndex + 1)}
            hasPrev={chapterIndex > 0}
            hasNext={chapterIndex < book.chapters.length - 1}
          />
          {selectedText && selectionPos && <SelectionTooltip position={selectionPos} selectedText={selectedText} onAction={handleSelectionAction} onClose={() => { setSelectedText(''); setSelectionPos(null); }} />}
          {isTypographyOpen && <TypographyControl theme={theme} setTheme={setTheme} fontSize={fontSize} setFontSize={setFontSize} fontFamily={fontFamily} setFontFamily={setFontFamily} lineHeight={lineHeight} setLineHeight={setLineHeight} maxWidth={maxWidth} setMaxWidth={setMaxWidth} onClose={() => setIsTypographyOpen(false)} />}
          <TocDrawer isOpen={isTocOpen} chapters={book.chapters} currentChapterId={currentChapter?.id} onSelectChapter={(chapter) => { const index = book.chapters.findIndex((item) => item.id === chapter.id); if (index !== -1) changeChapter(index); }} onClose={() => setIsTocOpen(false)} />
          <AiSidebar isOpen={isAiSidebarOpen} onClose={() => setIsAiSidebarOpen(false)} selectedText={selectedText} promptAction={promptAction} onClearSelectedText={() => { setSelectedText(''); setPromptAction(null); }} />
        </>
      )}

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

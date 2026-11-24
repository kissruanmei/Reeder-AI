import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EpubParser } from './services/epubParser';
import { LibraryService } from './services/libraryService';
import { BookStorage } from './services/bookStorage';
import { DEFAULT_HIGHLIGHT_COLOR, NoteService } from './services/noteService';
import { Navbar } from './components/Navbar/Navbar';
import { Home } from './components/Home/Home';
import { GuideModal } from './components/Home/GuideModal';
import { EpubReader } from './components/Reader/EpubReader';
import { SelectionTooltip } from './components/Reader/SelectionTooltip';
import { NotePopover } from './components/Reader/NotePopover';
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
  const [selectionMeta, setSelectionMeta] = useState(null);
  const [promptAction, setPromptAction] = useState(null);
  const [promptNote, setPromptNote] = useState('');
  const [promptNonce, setPromptNonce] = useState(0);
  const [pendingAnchor, setPendingAnchor] = useState('');
  const [pendingNoteId, setPendingNoteId] = useState('');
  const [notes, setNotes] = useState([]);
  const [notePopover, setNotePopover] = useState(null);
  const [lastHighlightColor, setLastHighlightColor] = useState(() => localStorage.getItem('reeder_hl_color') || DEFAULT_HIGHLIGHT_COLOR);
  const [activeImage, setActiveImage] = useState(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('toc');
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

  useEffect(() => {
    if (reading?.id) {
      setNotes(NoteService.getNotes(reading.id));
    } else {
      setNotes([]);
    }
  }, [reading?.id]);

  const openReading = (id, book, chapterIndex) => {
    setReading({ id, book, chapterIndex });
    setSelectedText('');
    setSelectionPos(null);
    setSelectionMeta(null);
    setNotePopover(null);
    setPromptAction(null);
    setPromptNote('');
    setPendingAnchor('');
    setPendingNoteId('');
    setIsTocOpen(false);
    setDrawerTab('toc');
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
    setSelectionMeta(null);
    setNotePopover(null);
    setPromptAction(null);
    setPromptNote('');
    setPendingNoteId('');
    refreshHome();
  };

  const changeChapter = (nextIndex) => {
    setPendingAnchor('');
    setPendingNoteId('');
    setSelectedText('');
    setSelectionPos(null);
    setSelectionMeta(null);
    setNotePopover(null);
    setReading((current) => current ? {
      ...current,
      chapterIndex: Math.max(0, Math.min(current.book.chapters.length - 1, nextIndex))
    } : current);
  };

  const clearPendingAnchor = useCallback(() => setPendingAnchor(''), []);
  const clearPendingNote = useCallback(() => setPendingNoteId(''), []);

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
    setPromptNote('');
    setPromptNonce((n) => n + 1);
    setSelectionPos(null);
    setSelectionMeta(null);
    setIsAiSidebarOpen(true);
  };

  const rememberColor = (color) => {
    setLastHighlightColor(color);
    try {
      localStorage.setItem('reeder_hl_color', color);
    } catch {
      // ignore storage quota errors
    }
  };

  const clearBrowserSelection = () => {
    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      // ignore
    }
    setSelectedText('');
    setSelectionPos(null);
    setSelectionMeta(null);
  };

  const handleQuickHighlight = (color) => {
    if (!reading?.id || !selectionMeta) return;
    rememberColor(color);
    const activeChapter = reading.book?.chapters?.[reading.chapterIndex];
    const { notes: updatedNotes } = NoteService.addNote(
      reading.id,
      {
        chapterIndex: reading.chapterIndex,
        chapterId: activeChapter?.id || '',
        chapterTitle: activeChapter?.title || `第 ${reading.chapterIndex + 1} 章`,
        quote: selectionMeta.quote,
        note: '',
        color,
        startOffset: selectionMeta.startOffset,
        endOffset: selectionMeta.endOffset,
        prefix: selectionMeta.prefix,
        suffix: selectionMeta.suffix
      },
      selectionMeta.fullText
    );
    setNotes(updatedNotes);
    clearBrowserSelection();
  };

  const handleStartNote = () => {
    if (!selectionMeta || !selectionPos) return;
    setNotePopover({
      mode: 'create',
      position: selectionPos,
      quote: selectionMeta.quote,
      meta: selectionMeta,
      initialColor: lastHighlightColor
    });
    setSelectionPos(null);
  };

  const handleHighlightClick = useCallback((note, position) => {
    setSelectedText('');
    setSelectionPos(null);
    setSelectionMeta(null);
    setNotePopover({
      mode: 'edit',
      position,
      note
    });
  }, []);

  const handleSaveNotePopover = ({ color, note: commentText }) => {
    if (!reading?.id || !notePopover) return;
    rememberColor(color);

    if (notePopover.mode === 'create' && notePopover.meta) {
      const activeChapter = reading.book?.chapters?.[reading.chapterIndex];
      const { notes: updatedNotes } = NoteService.addNote(
        reading.id,
        {
          chapterIndex: reading.chapterIndex,
          chapterId: activeChapter?.id || '',
          chapterTitle: activeChapter?.title || `第 ${reading.chapterIndex + 1} 章`,
          quote: notePopover.meta.quote,
          note: commentText,
          color,
          startOffset: notePopover.meta.startOffset,
          endOffset: notePopover.meta.endOffset,
          prefix: notePopover.meta.prefix,
          suffix: notePopover.meta.suffix
        },
        notePopover.meta.fullText
      );
      setNotes(updatedNotes);
      clearBrowserSelection();
    } else if (notePopover.mode === 'edit' && notePopover.note) {
      const updatedNotes = NoteService.updateNote(reading.id, notePopover.note.id, {
        color,
        note: commentText
      });
      setNotes(updatedNotes);
    }

    setNotePopover(null);
  };

  const handlePopoverColorChange = (nextColor) => {
    if (!reading?.id || notePopover?.mode !== 'edit' || !notePopover.note) return;
    rememberColor(nextColor);
    const updatedNotes = NoteService.updateNote(reading.id, notePopover.note.id, { color: nextColor });
    setNotes(updatedNotes);
    setNotePopover((prev) => (prev?.note ? { ...prev, note: { ...prev.note, color: nextColor } } : prev));
  };

  const handleDeleteNote = (noteId) => {
    if (!reading?.id || !noteId) return;
    const updatedNotes = NoteService.deleteNote(reading.id, noteId);
    setNotes(updatedNotes);
    if (notePopover?.note?.id === noteId) {
      setNotePopover(null);
    }
  };

  const handleJumpToNote = (note) => {
    if (!reading?.book?.chapters?.length || !note) return;
    setNotePopover(null);
    setSelectedText('');
    setSelectionPos(null);
    setSelectionMeta(null);
    if (note.chapterIndex !== reading.chapterIndex) {
      setReading((current) => (current ? { ...current, chapterIndex: note.chapterIndex } : current));
    }
    setPendingNoteId(note.id);
  };

  const handleAskAiWithNote = ({ quote, note: commentText }) => {
    if (!quote) return;
    setSelectedText(quote);
    setPromptAction('discuss_note');
    setPromptNote(commentText || '');
    setPromptNonce((n) => n + 1);
    setNotePopover(null);
    setIsAiSidebarOpen(true);
  };

  const handleToggleToc = () => {
    if (isTocOpen && drawerTab === 'toc') {
      setIsTocOpen(false);
    } else {
      setDrawerTab('toc');
      setIsTocOpen(true);
    }
  };

  const handleToggleNotes = () => {
    if (isTocOpen && drawerTab === 'notes') {
      setIsTocOpen(false);
    } else {
      setDrawerTab('notes');
      setIsTocOpen(true);
    }
  };

  const book = reading?.book;
  const chapterIndex = reading?.chapterIndex ?? 0;
  const currentChapter = book?.chapters?.[chapterIndex] || book?.chapters?.[0];
  const currentChapterNotes = useMemo(
    () => notes.filter((item) => item.chapterIndex === chapterIndex),
    [notes, chapterIndex]
  );
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
        onOpenToc={handleToggleToc}
        onOpenNotes={handleToggleNotes}
        onOpenTypography={() => setIsTypographyOpen(!isTypographyOpen)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onToggleMusicPicker={() => setIsMusicPickerOpen(open => !open)}
        onToggleWallpaper={() => setIsWallpaperOpen(open => !open)}
        isTypographyOpen={isTypographyOpen}
        isTocOpen={isTocOpen && drawerTab === 'toc'}
        isNotesOpen={isTocOpen && drawerTab === 'notes'}
        notesCount={notes.length}
        isMusicPickerOpen={isMusicPickerOpen}
        isWallpaperOpen={isWallpaperOpen}
      />

      {view === 'home' ? (
        <Home library={library} stats={stats} onSelectBook={handleSelectBook} onOpenLibrary={() => setIsLibraryOpen(true)} onOpenGuide={() => setIsGuideOpen(true)} onImport={chooseFile} />
      ) : book && (
        <>
          <EpubReader
            chapter={currentChapter}
            chapterNotes={currentChapterNotes}
            isAiSidebarOpen={isAiSidebarOpen}
            currentChapterIndex={chapterIndex}
            totalChapters={book.chapters.length}
            fontSize={fontSize}
            fontFamily={fontFamily}
            lineHeight={lineHeight}
            maxWidth={maxWidth}
            targetAnchor={pendingAnchor}
            onClearAnchor={clearPendingAnchor}
            pendingNoteId={pendingNoteId}
            onClearPendingNote={clearPendingNote}
            onNavigateHref={handleNavigateHref}
            onSelectionChange={(text, pos, meta) => {
              setSelectedText(text || '');
              setSelectionPos(pos);
              setSelectionMeta(meta || null);
            }}
            onHighlightClick={handleHighlightClick}
            onImageClick={(src, alt) => setActiveImage({ src, alt })}
            onPrevChapter={() => changeChapter(chapterIndex - 1)}
            onNextChapter={() => changeChapter(chapterIndex + 1)}
            hasPrev={chapterIndex > 0}
            hasNext={chapterIndex < book.chapters.length - 1}
          />
          {selectedText && selectionPos && !notePopover && (
            <SelectionTooltip
              position={selectionPos}
              selectedText={selectedText}
              onAction={handleSelectionAction}
              onQuickHighlight={handleQuickHighlight}
              onStartNote={handleStartNote}
            />
          )}
          {notePopover && (
            <NotePopover
              mode={notePopover.mode}
              position={notePopover.position}
              quote={notePopover.mode === 'create' ? notePopover.quote : notePopover.note?.quote}
              initialColor={notePopover.mode === 'create' ? notePopover.initialColor : notePopover.note?.color}
              initialNote={notePopover.mode === 'create' ? '' : notePopover.note?.note}
              onSave={handleSaveNotePopover}
              onColorChange={handlePopoverColorChange}
              onDelete={() => handleDeleteNote(notePopover.note?.id)}
              onAskAi={handleAskAiWithNote}
              onClose={() => setNotePopover(null)}
            />
          )}
          {isTypographyOpen && <TypographyControl
            theme={theme} setTheme={setTheme} fontSize={fontSize} setFontSize={setFontSize}
            fontFamily={fontFamily} setFontFamily={setFontFamily} lineHeight={lineHeight} setLineHeight={setLineHeight}
            maxWidth={maxWidth} setMaxWidth={setMaxWidth} onClose={() => setIsTypographyOpen(false)}
          />}
          <TocDrawer
            isOpen={isTocOpen}
            activeTab={drawerTab}
            onTabChange={setDrawerTab}
            chapters={book.chapters}
            currentChapterId={currentChapter?.id}
            onSelectChapter={(chapter) => { const index = book.chapters.findIndex((item) => item.id === chapter.id); if (index !== -1) changeChapter(index); }}
            notes={notes}
            onJumpToNote={handleJumpToNote}
            onDeleteNote={handleDeleteNote}
            onAskAiNote={handleAskAiWithNote}
            onClose={() => setIsTocOpen(false)}
          />
          <AiSidebar
            isOpen={isAiSidebarOpen}
            onOpen={() => setIsAiSidebarOpen(true)}
            onClose={() => setIsAiSidebarOpen(false)}
            width={aiSidebarWidth}
            onWidthChange={setAiSidebarWidth}
            selectedText={selectedText}
            promptAction={promptAction}
            promptNote={promptNote}
            promptNonce={promptNonce}
            onClearSelectedText={() => { setSelectedText(''); setPromptAction(null); setPromptNote(''); }}
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

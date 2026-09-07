import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Clock, Plus, Sparkles, Trash2, Trophy, Zap } from 'lucide-react';
import { LibraryService } from '../../services/libraryService';
import { ReederLogo } from '../Logo/ReederLogo';
import { SUPPORTED_BOOK_ACCEPT } from '../../services/bookFormats';

export const LibraryHome = ({ onOpenBook, onImportBook, onDeleteBook, refreshKey = 0 }) => {
  const [library, setLibrary] = useState([]);
  const [stats, setStats] = useState(LibraryService.getStats());
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLibrary(
      LibraryService.getLibrary().sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0))
    );
    setStats(LibraryService.getStats());
  }, [refreshKey]);

  const removeBook = (event, bookId) => {
    event.stopPropagation();
    if (!confirm('确定从书架中移除本书及其阅读进度吗？')) return;
    LibraryService.removeBook(bookId);
    const remaining = LibraryService.getLibrary();
    setLibrary(remaining.sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0)));
    onDeleteBook?.(bookId, remaining);
  };

  const goalPercent = Math.min(100, Math.round((stats.todayMinutes / stats.dailyGoalMinutes) * 100));

  return (
    <main className="library-home">
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_BOOK_ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImportBook(file);
          event.target.value = '';
        }}
      />

      <header className="library-home-header">
        <ReederLogo size={32} showText />
        <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
          <Plus size={16} /> 导入书籍
        </button>
      </header>

      <section className="library-hero">
        <div>
          <div className="library-eyebrow"><Sparkles size={14} /> 你的私人阅读空间</div>
          <h1>今天想读哪一本？</h1>
          <p>从书架继续上次的旅程，或导入一本新的电子书开始阅读。</p>
        </div>
        <button className="btn-primary library-import-button" onClick={() => fileInputRef.current?.click()}>
          <Plus size={18} /> 添加一本书
        </button>
      </section>

      <section className="reading-overview" aria-label="阅读概览">
        <div className="reading-stat">
          <span className="stat-icon accent"><Clock size={19} /></span>
          <div><small>今日阅读</small><strong>{stats.todayMinutes} <em>/ {stats.dailyGoalMinutes} 分钟</em></strong><span>目标达成 {goalPercent}%</span></div>
        </div>
        <div className="reading-stat">
          <span className="stat-icon gold"><Zap size={19} /></span>
          <div><small>连续阅读</small><strong>{stats.streakDays} <em>天</em></strong><span>保持阅读节奏</span></div>
        </div>
        <div className="reading-stat">
          <span className="stat-icon green"><Trophy size={19} /></span>
          <div><small>累计阅读</small><strong>{Math.floor(stats.totalMinutes / 60)} <em>小时</em> {stats.totalMinutes % 60} <em>分</em></strong><span>每一页都有积累</span></div>
        </div>
      </section>

      <div className="format-strip" aria-label="支持的文件格式">
        <span>支持格式</span>
        {['EPUB', 'TXT', 'PDF', 'MOBI', 'AZW3', 'FB2', 'HTML', 'Markdown', 'DOCX', 'RTF', 'CBZ'].map(format => <i key={format}>{format}</i>)}
      </div>

      <section className="library-collection">
        <div className="collection-heading">
          <div><h2>我的书库</h2><p>{library.length} 本书 · 按最近阅读排序</p></div>
        </div>

        {library.length ? (
          <div className="book-grid">
            {library.map((book) => (
              <article className="book-card" key={book.id} onClick={() => onOpenBook(book)}>
                <div className="book-cover">
                  {book.cover ? <img src={book.cover} alt="" /> : <div className="book-cover-placeholder"><BookOpen size={34} /><span>{book.title}</span></div>}
                  <button className="book-delete" onClick={(event) => removeBook(event, book.id)} title="从书库移除"><Trash2 size={14} /></button>
                  <span className="book-format">{book.format || 'EPUB'}</span>
                  <div className="book-progress"><span style={{ width: `${book.progressPercent || 0}%` }} /></div>
                </div>
                <h3 title={book.title}>{book.title}</h3>
                <p>{book.author || '未知作者'}</p>
                <span className="book-progress-label">已读 {book.progressPercent || 0}%</span>
              </article>
            ))}
            <button className="add-book-card" onClick={() => fileInputRef.current?.click()}>
              <span><Plus size={22} /></span><strong>导入新书</strong><small>支持 11 类常见格式</small>
            </button>
          </div>
        ) : (
          <div className="empty-library">
            <span><BookOpen size={32} /></span>
            <h3>书架还是空的</h3>
            <p>导入第一本电子书，开始你的沉浸阅读。</p>
            <button className="btn-primary" onClick={() => fileInputRef.current?.click()}><Plus size={16} /> 导入电子书</button>
          </div>
        )}
      </section>
    </main>
  );
};

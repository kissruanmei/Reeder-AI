import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Library, Plus, Trash2, X } from 'lucide-react';
import { LibraryService } from '../../services/libraryService';

export const LibraryModal = ({ isOpen, onClose, onSelectBook, onDeleteBook, onImportNewEpub, onOpenFullLibrary, currentBookId }) => {
  const [recentBooks, setRecentBooks] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setRecentBooks(LibraryService.getLibrary().sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0)).slice(0, 3));
  }, [isOpen, currentBookId]);

  if (!isOpen) return null;

  const removeBook = (event, bookId) => {
    event.stopPropagation();
    if (!confirm('确定从书架中移除本书及其阅读进度吗？')) return;
    LibraryService.removeBook(bookId);
    const remaining = LibraryService.getLibrary();
    setRecentBooks(remaining.sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0)).slice(0, 3));
    onDeleteBook?.(bookId, remaining);
  };

  return (
    <div className="modal-backdrop quick-library-backdrop" onClick={onClose}>
      <div className="quick-library glass-panel" onClick={(event) => event.stopPropagation()}>
        <div className="quick-library-header">
          <div><Library size={18} /><div><h3>快速书架</h3><p>最近打开的三本书</p></div></div>
          <button className="btn-icon" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="quick-book-list">
          {recentBooks.length ? recentBooks.map((book) => (
            <button className={`quick-book ${book.id === currentBookId ? 'current' : ''}`} key={book.id} onClick={() => { onSelectBook(book); onClose(); }}>
              <span className="quick-book-cover">{book.cover ? <img src={book.cover} alt="" /> : <BookOpen size={20} />}</span>
              <span className="quick-book-meta"><strong>{book.title}</strong><small>{book.format || 'EPUB'} · {book.author || '未知作者'} · 已读 {book.progressPercent || 0}%</small></span>
              {book.id === currentBookId ? <em>正在阅读</em> : <ArrowRight size={15} />}
              <span className="quick-progress"><i style={{ width: `${book.progressPercent || 0}%` }} /></span>
              <span className="quick-delete" role="button" title="移除" onClick={(event) => removeBook(event, book.id)}><Trash2 size={13} /></span>
            </button>
          )) : <div className="quick-empty"><BookOpen size={24} /><span>还没有导入书籍</span></div>}
        </div>
        <div className="quick-library-actions">
          <button className="btn-secondary" onClick={() => { onImportNewEpub(); onClose(); }}><Plus size={15} /> 导入新书</button>
          <button className="btn-primary" onClick={() => { onOpenFullLibrary(); onClose(); }}>查看完整书库 <ArrowRight size={15} /></button>
        </div>
      </div>
    </div>
  );
};

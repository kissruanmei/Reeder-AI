import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { BookStorage } from '../../services/bookStorage';

// Blob URLs do not survive an app restart; rebuild them from the stored cover.
export const BookCover = ({ book, className = '', style, children }) => {
  const [src, setSrc] = useState(book.cover || null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    setSrc(book.cover || null);

    BookStorage.getBookContent(book.id).then((storedBook) => {
      if (!storedBook?.coverBlob) return;
      objectUrl = URL.createObjectURL(storedBook.coverBlob);
      if (cancelled) URL.revokeObjectURL(objectUrl);
      else setSrc(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [book.id, book.cover]);

  return (
    <div className={`book-cover ${className}`} style={style}>
      {src ? (
        <img src={src} alt={`${book.title}的封面`} onError={() => setSrc(null)} />
      ) : (
        <div className="book-cover-fallback">
          <BookOpen size={30} aria-hidden="true" />
          <span>{book.title}</span>
        </div>
      )}
      {children}
    </div>
  );
};

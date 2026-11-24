/**
 * Reeder AI - 阅读高亮与短评笔记持久化服务
 */

const STORAGE_NOTES_PREFIX = 'reeder_ai_notes_';

export const HIGHLIGHT_COLORS = [
  { id: 'amber', label: '琥珀黄', dot: '#eab308' },
  { id: 'green', label: '青瓷绿', dot: '#22c55e' },
  { id: 'blue', label: '晴空蓝', dot: '#3b82f6' },
  { id: 'rose', label: '珊瑚粉', dot: '#ec4899' }
];

export const DEFAULT_HIGHLIGHT_COLOR = 'amber';

function generateNoteId() {
  return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortNotes(notes) {
  return [...notes].sort((a, b) => {
    if (a.chapterIndex !== b.chapterIndex) return a.chapterIndex - b.chapterIndex;
    if (a.startOffset !== b.startOffset) return a.startOffset - b.startOffset;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function writeBookNotes(bookId, notes) {
  if (!bookId) return [];
  const sorted = sortNotes(notes);
  try {
    localStorage.setItem(STORAGE_NOTES_PREFIX + bookId, JSON.stringify(sorted));
  } catch (error) {
    console.error('Failed to save notes:', error);
  }
  return sorted;
}

export class NoteService {
  /**
   * 获取指定书籍的全部高亮与短评
   */
  static getNotes(bookId) {
    if (!bookId) return [];
    try {
      const raw = localStorage.getItem(STORAGE_NOTES_PREFIX + bookId);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? sortNotes(parsed) : [];
    } catch (error) {
      console.error('Failed to load notes:', error);
      return [];
    }
  }

  /**
   * 新增高亮/短评，并自动合并同章节内的重叠高亮，避免多层叠层变脏且保留已有短评
   */
  static addNote(bookId, payload, fullText = '') {
    if (!bookId || !payload) return { notes: [], activeNote: null, mergedCount: 0 };
    const notes = this.getNotes(bookId);
    const now = Date.now();

    const startOffset = Math.max(0, Number(payload.startOffset) || 0);
    const endOffset = Math.max(startOffset, Number(payload.endOffset) || 0);
    if (endOffset <= startOffset) {
      return { notes, activeNote: null, mergedCount: 0 };
    }

    const overlapping = notes.filter(
      (item) =>
        item.chapterIndex === payload.chapterIndex &&
        item.startOffset < endOffset &&
        startOffset < item.endOffset
    );

    const remaining = notes.filter((item) => !overlapping.includes(item));

    let mergedStart = startOffset;
    let mergedEnd = endOffset;
    const existingCommentParts = [];

    overlapping.forEach((item) => {
      mergedStart = Math.min(mergedStart, item.startOffset);
      mergedEnd = Math.max(mergedEnd, item.endOffset);
      const trimmed = (item.note || '').trim();
      if (trimmed) existingCommentParts.push(trimmed);
    });

    const incomingNote = (payload.note || '').trim();
    if (incomingNote && !existingCommentParts.includes(incomingNote)) {
      existingCommentParts.push(incomingNote);
    }

    const mergedQuote = fullText
      ? fullText.slice(mergedStart, mergedEnd)
      : (payload.quote || '').trim();
    const mergedPrefix = fullText
      ? fullText.slice(Math.max(0, mergedStart - 24), mergedStart)
      : (payload.prefix || '');
    const mergedSuffix = fullText
      ? fullText.slice(mergedEnd, mergedEnd + 24)
      : (payload.suffix || '');

    const nextNote = {
      id: overlapping.length === 1 ? overlapping[0].id : generateNoteId(),
      bookId,
      chapterIndex: payload.chapterIndex,
      chapterId: payload.chapterId || '',
      chapterTitle: payload.chapterTitle || `第 ${payload.chapterIndex + 1} 章`,
      quote: mergedQuote || (payload.quote || '').trim(),
      note: existingCommentParts.join('\n'),
      color: payload.color || DEFAULT_HIGHLIGHT_COLOR,
      startOffset: mergedStart,
      endOffset: mergedEnd,
      prefix: mergedPrefix,
      suffix: mergedSuffix,
      createdAt: overlapping.length > 0 ? Math.min(...overlapping.map((i) => i.createdAt || now)) : now,
      updatedAt: now
    };

    const nextNotes = writeBookNotes(bookId, [...remaining, nextNote]);
    return {
      notes: nextNotes,
      activeNote: nextNote,
      mergedCount: overlapping.length
    };
  }

  /**
   * 更新已有高亮的颜色或短评
   */
  static updateNote(bookId, noteId, patch) {
    if (!bookId || !noteId) return [];
    const notes = this.getNotes(bookId);
    const nextNotes = notes.map((item) => {
      if (item.id !== noteId) return item;
      return {
        ...item,
        ...(patch.color ? { color: patch.color } : {}),
        ...(typeof patch.note === 'string' ? { note: patch.note.trim() } : {}),
        updatedAt: Date.now()
      };
    });
    return writeBookNotes(bookId, nextNotes);
  }

  /**
   * 删除单条高亮与短评
   */
  static deleteNote(bookId, noteId) {
    if (!bookId || !noteId) return [];
    const notes = this.getNotes(bookId).filter((item) => item.id !== noteId);
    return writeBookNotes(bookId, notes);
  }

  /**
   * 删除整本书的全部笔记（随删书调用）
   */
  static clearBookNotes(bookId) {
    if (!bookId) return;
    try {
      localStorage.removeItem(STORAGE_NOTES_PREFIX + bookId);
    } catch (error) {
      console.error('Failed to clear book notes:', error);
    }
  }
}

/**
 * Reeder AI - Library, Reading Progress & Stats Management Service
 */

import { BookStorage } from './bookStorage';

const STORAGE_LIBRARY_KEY = 'reeder_ai_library';
const STORAGE_STATS_KEY = 'reeder_ai_stats';
const STORAGE_PROGRESS_PREFIX = 'reeder_ai_progress_';

export class LibraryService {
  /**
   * Get all books saved in bookshelf
   */
  static getLibrary() {
    try {
      const saved = localStorage.getItem(STORAGE_LIBRARY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load library:', e);
      return [];
    }
  }

  /**
   * Add or update a book in bookshelf
   */
  static saveBook(bookData) {
    if (!bookData || !bookData.title) return;
    try {
      const library = this.getLibrary();
      const bookId = bookData.id || this.generateBookId(bookData.title, bookData.author);
      
      const existingIdx = library.findIndex(b => b.id === bookId);
      const bookEntry = {
        id: bookId,
        title: bookData.title,
        author: bookData.author || '未知作者',
        cover: bookData.cover || null,
        totalChapters: bookData.chapters?.length || 1,
        addedAt: existingIdx !== -1 ? library[existingIdx].addedAt : Date.now(),
        lastReadAt: Date.now()
      };

      if (existingIdx !== -1) {
        library[existingIdx] = { ...library[existingIdx], ...bookEntry };
      } else {
        library.unshift(bookEntry);
      }

      localStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(library));
      return bookEntry;
    } catch (e) {
      console.error('Failed to save book to library:', e);
    }
  }

  /**
   * Remove a book from bookshelf
   */
  static removeBook(bookId) {
    try {
      const library = this.getLibrary().filter(b => b.id !== bookId);
      localStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(library));
      localStorage.removeItem(STORAGE_PROGRESS_PREFIX + bookId);
      BookStorage.deleteBookContent(bookId);
    } catch (e) {
      console.error('Failed to remove book:', e);
    }
  }

  /**
   * Save exact reading progress for a specific book
   */
  static saveProgress(bookId, chapterIndex, totalChapters, scrollRatio = 0) {
    if (!bookId) return;
    try {
      const progressPercent = Math.min(100, Math.round(((chapterIndex + 1) / totalChapters) * 100));
      const progressData = {
        bookId,
        chapterIndex,
        scrollRatio,
        progressPercent,
        updatedAt: Date.now()
      };

      localStorage.setItem(STORAGE_PROGRESS_PREFIX + bookId, JSON.stringify(progressData));

      // Also update lastReadAt and progressPercent in library list
      const library = this.getLibrary();
      const bookIdx = library.findIndex(b => b.id === bookId);
      if (bookIdx !== -1) {
        library[bookIdx].lastReadAt = Date.now();
        library[bookIdx].progressPercent = progressPercent;
        library[bookIdx].lastChapterIndex = chapterIndex;
        localStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(library));
      }
    } catch (e) {
      console.error('Failed to save reading progress:', e);
    }
  }

  /**
   * Get saved reading progress for a book
   */
  static getProgress(bookId) {
    if (!bookId) return null;
    try {
      const saved = localStorage.getItem(STORAGE_PROGRESS_PREFIX + bookId);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to load progress:', e);
      return null;
    }
  }

  /**
   * Get reading statistics & streak goals
   */
  static getStats() {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(STORAGE_STATS_KEY);
      const defaultStats = {
        lastReadDate: todayStr,
        todayMinutes: 0,
        totalMinutes: 0,
        streakDays: 1,
        dailyGoalMinutes: 30
      };

      if (!saved) return defaultStats;

      const stats = JSON.parse(saved);
      // Reset today's minutes if it's a new day
      if (stats.lastReadDate !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Maintain streak if yesterday was read
        stats.streakDays = stats.lastReadDate === yesterdayStr ? stats.streakDays + 1 : 1;
        stats.todayMinutes = 0;
        stats.lastReadDate = todayStr;
        localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(stats));
      }

      return stats;
    } catch (e) {
      return { todayMinutes: 0, totalMinutes: 0, streakDays: 1, dailyGoalMinutes: 30 };
    }
  }

  /**
   * Increment reading time stats (e.g. called every 60s during active reading)
   */
  static addReadingMinutes(minutes = 1) {
    try {
      const stats = this.getStats();
      stats.todayMinutes += minutes;
      stats.totalMinutes += minutes;
      localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(stats));
      return stats;
    } catch (e) {
      console.error('Failed to update stats:', e);
    }
  }

  /**
   * Helper: Generate unique book ID from title and author using cyrb53 string hash
   */
  static generateBookId(title = '', author = '') {
    const str = `${String(title).trim()}___${String(author).trim()}`;
    let h1 = 0xdeadbeef ^ 0, h2 = 0x41c6ce57 ^ 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hash = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
    return `book_${hash}_${Date.now()}`;
  }
}

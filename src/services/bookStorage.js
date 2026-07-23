/**
 * Reeder AI - IndexedDB Book Content Persistent Storage
 */

const DB_NAME = 'reeder_ai_db';
const DB_VERSION = 1;
const STORE_NAME = 'book_contents';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export class BookStorage {
  /**
   * Save parsed book full content (chapters, HTML) to IndexedDB
   */
  static async saveBookContent(bookId, bookData) {
    if (!bookId || !bookData) return;
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record = {
          id: bookId,
          title: bookData.title,
          author: bookData.author,
          cover: bookData.cover,
          chapters: bookData.chapters,
          updatedAt: Date.now()
        };
        const request = store.put(record);
        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (e) {
      console.error('Failed to save book content to IndexedDB:', e);
    }
  }

  /**
   * Get parsed book content from IndexedDB by bookId
   */
  static async getBookContent(bookId) {
    if (!bookId) return null;
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(bookId);
        request.onsuccess = (event) => resolve(event.target.result || null);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (e) {
      console.error('Failed to get book content from IndexedDB:', e);
      return null;
    }
  }

  /**
   * Remove book content from IndexedDB by bookId
   */
  static async deleteBookContent(bookId) {
    if (!bookId) return;
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(bookId);
        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (e) {
      console.error('Failed to delete book content from IndexedDB:', e);
    }
  }
}

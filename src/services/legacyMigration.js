const MIGRATION_MARKER = 'reeder_migration_localhost_done_v1';
const LIBRARY_KEY = 'reeder_ai_library';
const PROGRESS_PREFIX = 'reeder_ai_progress_';

function readLibrary(value) {
  if (!value) return [];
  const books = JSON.parse(value);
  if (!Array.isArray(books)) throw new Error('Invalid library data');
  return books.filter((book) => book && typeof book.id === 'string');
}

async function copyBookRecords(books, allowedIds) {
  if (!books.length) return;
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('reeder_ai_db', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('book_contents', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('book_contents', 'readwrite');
      const store = transaction.objectStore('book_contents');
      const keysRequest = store.getAllKeys();
      keysRequest.onsuccess = () => {
        const existing = new Set(keysRequest.result);
        for (const book of books) {
          if (book && allowedIds.has(book.id) && !existing.has(book.id)) {
            store.add(book);
            existing.add(book.id);
          }
        }
      };
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Book migration aborted'));
    });
  } finally {
    db.close();
  }
}

function receiveLegacyData(url, token) {
  return new Promise((resolve, reject) => {
    const popup = window.open(url, 'reeder-legacy-migration');
    if (!popup) return reject(new Error('Could not open migration helper'));
    const timeout = setTimeout(() => finish(new Error('Migration timed out')), 12000);

    function finish(error, data) {
      clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      popup.close();
      if (error) reject(error);
      else resolve(data);
    }

    function onMessage(event) {
      if (event.origin !== 'http://localhost:3000' || event.source !== popup || event.data?.token !== token) return;
      if (event.data.type === 'reeder-migration-ready') {
        popup.postMessage({ type: 'reeder-migration-request', token }, 'http://localhost:3000');
      } else if (event.data.type === 'reeder-migration-data') {
        finish(null, event.data);
      } else if (event.data.type === 'reeder-migration-error') {
        finish(new Error('Could not read the previous library'));
      }
    }

    window.addEventListener('message', onMessage);
  });
}

export async function migrateLegacyLibrary() {
  const helper = new URLSearchParams(window.location.search).get('legacyMigration');
  if (!helper) return;

  let url;
  try {
    url = new URL(helper);
    if (url.origin !== 'http://localhost:3000' || !/^\/[a-f0-9]{32}$/.test(url.pathname)) return;
    if (localStorage.getItem(MIGRATION_MARKER)) return;

    const oldData = await receiveLegacyData(url.href, url.pathname.slice(1));
    const currentLibrary = readLibrary(localStorage.getItem(LIBRARY_KEY));
    const oldLibrary = readLibrary(oldData.values?.[LIBRARY_KEY]);
    const existingIds = new Set(currentLibrary.map((book) => book.id));
    const newBooks = oldLibrary.filter((book) => !existingIds.has(book.id));
    const allIds = new Set([...currentLibrary, ...newBooks].map((book) => book.id));
    await copyBookRecords(Array.isArray(oldData.books) ? oldData.books : [], allIds);

    for (const book of newBooks) {
      const key = PROGRESS_PREFIX + book.id;
      if (localStorage.getItem(key) === null && oldData.values[key] != null) localStorage.setItem(key, oldData.values[key]);
    }
    for (const key of ['reeder_ai_stats', 'reeder_ai_llm_config', 'reeder_theme']) {
      if (localStorage.getItem(key) === null && oldData.values[key] != null) localStorage.setItem(key, oldData.values[key]);
    }
    if (newBooks.length) localStorage.setItem(LIBRARY_KEY, JSON.stringify([...currentLibrary, ...newBooks]));
    localStorage.setItem(MIGRATION_MARKER, '1');
  } catch (error) {
    console.warn('Could not migrate the previous library:', error);
  } finally {
    if (url) fetch(`${url.href}/close`, { mode: 'no-cors' }).catch(() => {});
  }
}

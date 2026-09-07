const DB_NAME = 'reeder_music_db';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

function openMusicDB() {
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

function runTransaction(mode, action) {
  return openMusicDB().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
    transaction.oncomplete = () => db.close();
  }));
}

export class MusicStorage {
  static async getTracks() {
    try {
      const tracks = await runTransaction('readonly', (store) => store.getAll());
      return [...tracks].sort((a, b) => a.addedAt - b.addedAt);
    } catch (error) {
      console.error('Failed to load music library:', error);
      return [];
    }
  }

  static async saveTrack(track) {
    await runTransaction('readwrite', (store) => store.put(track));
    return track;
  }

  static async removeTrack(trackId) {
    await runTransaction('readwrite', (store) => store.delete(trackId));
  }
}

const DB_NAME = 'reeder_wallpaper_db';
const DB_VERSION = 1;
const STORE_NAME = 'wallpapers';
const CURRENT_KEY = 'current_background';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(mode, task) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        let result;
        const request = task(store);
        if (request) {
          request.onsuccess = () => {
            result = request.result;
          };
        }
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

export const WallpaperStorage = {
  /** 保存用户导入的背景图片（Blob/File）与文件名 */
  async save(file) {
    const record = {
      blob: file,
      name: file.name || '自定义背景',
      updatedAt: Date.now(),
    };
    await runTransaction('readwrite', (store) => store.put(record, CURRENT_KEY));
    return record;
  },

  /** 读取已保存的背景图片记录 */
  async load() {
    return runTransaction('readonly', (store) => store.get(CURRENT_KEY));
  },

  /** 清除已保存的背景图片 */
  async clear() {
    return runTransaction('readwrite', (store) => store.delete(CURRENT_KEY));
  },
};

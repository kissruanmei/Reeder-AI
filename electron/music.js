import { app, ipcMain, safeStorage } from 'electron';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import qrcode from 'qrcode-generator';
import { createNeteaseClient, musicId, NeteaseError } from './netease.js';

export function setupMusic(getWindow, rendererUrl) {
  const api = createNeteaseClient();
  const sessionFile = path.join(app.getPath('userData'), 'netease-session.bin');
  let session = '';
  let profile = null;
  let qrAttempt = 0;
  let qrKey = '';

  if (safeStorage.isEncryptionAvailable()) {
    try {
      session = safeStorage.decryptString(readFileSync(sessionFile));
    } catch (error) {
      if (error.code !== 'ENOENT') console.warn('Could not restore the NetEase session.');
    }
  }

  function cancelQr() {
    qrAttempt++;
    qrKey = '';
  }

  function clearSession() {
    session = '';
    profile = null;
    rmSync(sessionFile, { force: true });
  }

  function saveSession(value) {
    let remembered = false;
    if (safeStorage.isEncryptionAvailable()) {
      const pendingFile = `${sessionFile}.tmp`;
      try {
        writeFileSync(pendingFile, safeStorage.encryptString(value), { mode: 0o600 });
        renameSync(pendingFile, sessionFile);
        remembered = true;
      } catch {
        console.warn('Could not save the NetEase session.');
      } finally {
        try { rmSync(pendingFile, { force: true }); } catch { /* next login can overwrite it */ }
      }
    }
    session = value;
    profile = null;
    return remembered;
  }

  async function signedIn(action) {
    const current = session;
    if (!current) throw new NeteaseError('请先扫码登录网易云音乐。', 'login');
    try {
      const result = await action(current);
      if (current !== session) throw new NeteaseError('网易云登录状态已变化，请重试。', 'login');
      return result;
    } catch (error) {
      if (error.code === 'login' && current === session) clearSession();
      throw error;
    }
  }

  async function getProfile() {
    if (profile) return profile;
    profile = await signedIn(current => api.account(current));
    return profile;
  }

  function handle(action, run) {
    ipcMain.handle(`music:${action}`, async (event, ...args) => {
      const window = getWindow();
      const frame = event.senderFrame;
      if (!window || window.isDestroyed() || event.sender !== window.webContents ||
          frame !== window.webContents.mainFrame || frame?.url.split(/[?#]/, 1)[0] !== rendererUrl) {
        return { ok: false, error: '当前页面无法使用音乐播放器。' };
      }
      try {
        return { ok: true, ...(await run(...args)) };
      } catch (error) {
        if (error instanceof NeteaseError) return { ok: false, error: error.message, code: error.code };
        console.warn(`NetEase music operation failed (${action}).`);
        return { ok: false, error: '网易云音乐操作失败，请重试。' };
      }
    });
  }

  handle('account', async () => {
    if (!session) return { profile: null };
    try {
      return { profile: await getProfile() };
    } catch (error) {
      if (error.code !== 'login') throw error;
      return { profile: null };
    }
  });

  handle('create-qr', async () => {
    cancelQr();
    const attempt = qrAttempt;
    const key = await api.createQr();
    if (attempt !== qrAttempt) return { status: 'canceled' };
    const url = new URL('https://music.163.com/login');
    url.searchParams.set('codekey', key);
    const qr = qrcode(0, 'M');
    qr.addData(url.href);
    qr.make();
    qrKey = key;
    return { attempt, image: qr.createDataURL(5, 20) };
  });

  handle('poll-qr', async attempt => {
    if (attempt !== qrAttempt || !qrKey) return { status: 'canceled' };
    const result = await api.pollQr(qrKey);
    if (attempt !== qrAttempt) return { status: 'canceled' };
    if (result.status === 'confirmed') {
      cancelQr();
      return { status: 'confirmed', remembered: saveSession(result.session) };
    }
    if (result.status === 'expired') cancelQr();
    return { status: result.status };
  });

  handle('cancel-qr', cancelQr);
  handle('logout', () => { cancelQr(); clearSession(); });
  handle('playlists', async () => {
    const { id } = await getProfile();
    return signedIn(async current => ({ playlists: await api.playlists(id, current) }));
  });
  handle('tracks', id => signedIn(async current => ({ tracks: await api.tracks(musicId(id), current) })));
  handle('stream', id => signedIn(current => api.stream(musicId(id), current)));
}

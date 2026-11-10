import { app, BrowserWindow } from 'electron';
import { randomBytes } from 'crypto';
import { readFile } from 'fs/promises';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// Development builds used localhost:3000 for storage. A short-lived, local
// helper lets the packaged app copy those records without changing the source.
async function createMigrationServer() {
  const token = randomBytes(16).toString('hex');
  const page = await readFile(path.join(__dirname, 'migration.html'));
  const server = http.createServer((request, response) => {
    if (request.method !== 'GET' || ![`/${token}`, `/${token}/close`].includes(request.url)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(request.url.endsWith('/close') ? '' : page, () => server.close());
  });
  const listening = await new Promise((resolve) => {
    server.once('error', () => resolve(false));
    server.listen(3000, 'localhost', () => resolve(true));
  });
  if (!listening) return null;
  server.unref();
  setTimeout(() => server.close(), 15000).unref();
  return `http://localhost:3000/${token}`;
}

async function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  let migrationUrl = null;
  if (!isDev) {
    try {
      migrationUrl = await createMigrationServer();
    } catch (error) {
      console.warn('Legacy library migration is unavailable:', error.message);
    }
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Reeder AI - 智能电子书阅读器',
    icon: path.join(__dirname, '../public/icon.png'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Allow loading local file blobs and CORS for user-configured custom AI endpoints
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (migrationUrl && url === migrationUrl) {
      return { action: 'allow', overrideBrowserWindowOptions: { show: false } };
    }
    return { action: 'allow' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // Load built index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath, migrationUrl ? { query: { legacyMigration: migrationUrl } } : undefined);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

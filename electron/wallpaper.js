import { app, desktopCapturer, dialog, ipcMain, protocol, screen } from 'electron';
import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scheme = 'reeder-wallpaper';

protocol.registerSchemesAsPrivileged([{
  scheme,
  privileges: { standard: true, secure: true, stream: true },
}]);

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function registryPath(key, value) {
  try {
    const registryKey = key
      .replace(/^HKCU\\/i, 'Registry::HKEY_CURRENT_USER\\')
      .replace(/^HKLM\\/i, 'Registry::HKEY_LOCAL_MACHINE\\');
    const escapedKey = registryKey.replace(/'/g, "''");
    const escapedValue = value.replace(/'/g, "''");
    const command = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Console]::Write((Get-ItemPropertyValue -LiteralPath '${escapedKey}' -Name '${escapedValue}' -ErrorAction Stop))`;
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true });
    return stdout.trim();
  } catch {
    return '';
  }
}

async function steamLibraries(steamDir) {
  const libraries = [steamDir];
  try {
    const folders = await readFile(path.join(steamDir, 'steamapps', 'libraryfolders.vdf'), 'utf8');
    const paths = folders.matchAll(/"(?:path|\d+)"\s+"([A-Za-z]:\\\\[^"\r\n]*)"/gi);
    for (const match of paths) libraries.push(match[1].replace(/\\\\/g, '\\'));
  } catch {
    // A Steam installation may have no additional libraries.
  }
  return libraries;
}

function insideProject(directory, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath) return '';
  const file = path.resolve(directory, relativePath);
  const relative = path.relative(directory, file);
  return relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative) ? file : '';
}

async function projectAt(directory) {
  const manifest = path.join(directory, 'project.json');
  try {
    const data = JSON.parse(await readFile(manifest, 'utf8'));
    const type = typeof data.type === 'string' ? data.type.toLowerCase() : '';
    if (type !== 'scene' && type !== 'video') return null;

    const media = insideProject(directory, data.file);
    if (type === 'video' && (!media || !(await exists(media)))) return null;
    if (type === 'scene' && !(await exists(path.join(directory, 'scene.pkg'))) && (!media || !(await exists(media)))) return null;

    const preview = insideProject(directory, data.preview);
    const id = createHash('sha256').update(manifest.toLowerCase()).digest('hex');
    return {
      id,
      title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : path.basename(directory),
      type,
      manifest,
      media: type === 'video' ? media : '',
      preview: preview && await exists(preview) ? preview : '',
    };
  } catch {
    return null;
  }
}

export function setupWallpaper(getWindow) {
  const settingsFile = path.join(app.getPath('userData'), 'wallpaper-settings.json');
  let projects = new Map();
  let executable = '';
  let activeScene = null;
  let operations = Promise.resolve();
  let scanVersion = 0;

  const enqueue = (task) => {
    const result = operations.then(task, task);
    operations = result.catch(() => {});
    return result;
  };

  async function scan() {
    const version = ++scanVersion;
    let manualInstall = '';
    try {
      const settings = JSON.parse(await readFile(settingsFile, 'utf8'));
      if (typeof settings.installDir === 'string') manualInstall = settings.installDir;
    } catch {
      // There is no manually selected installation yet.
    }

    const registeredSteam = await Promise.all([
      registryPath('HKCU\\Software\\Valve\\Steam', 'SteamPath'),
      registryPath('HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'),
    ]);
    const steamDirs = registeredSteam.filter(Boolean);
    if (manualInstall && path.basename(path.dirname(manualInstall)).toLowerCase() === 'common') {
      steamDirs.push(path.resolve(manualInstall, '../../..'));
    }
    const defaultSteam = process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Steam');
    if (defaultSteam) steamDirs.push(defaultSteam);

    const libraryGroups = await Promise.all(steamDirs.map(steamLibraries));
    const libraries = [...new Map(libraryGroups.flat().map(dir => [path.normalize(dir).toLowerCase(), path.normalize(dir)])).values()];
    const installPaths = [manualInstall, ...libraries.map(dir => path.join(dir, 'steamapps', 'common', 'wallpaper_engine'))].filter(Boolean);
    const installs = [...new Map(installPaths.map(dir => [path.normalize(dir).toLowerCase(), path.normalize(dir)])).values()];
    let nextExecutable = '';
    for (const directory of installs) {
      for (const name of ['wallpaper64.exe', 'wallpaper32.exe']) {
        const candidate = path.join(directory, name);
        if (await exists(candidate)) {
          nextExecutable = candidate;
          break;
        }
      }
      if (nextExecutable) break;
    }

    const roots = [
      ...libraries.map(dir => path.join(dir, 'steamapps', 'workshop', 'content', '431960')),
      ...installs.flatMap(dir => ['defaultprojects', 'myprojects'].map(name => path.join(dir, 'projects', name))),
    ];
    const directories = [];
    for (const root of new Set(roots)) {
      try {
        const entries = await readdir(root, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) directories.push(path.join(root, entry.name));
        }
      } catch {
        // Steam libraries do not necessarily contain Wallpaper Engine projects.
      }
    }
    const found = (await Promise.all(directories.map(projectAt))).filter(Boolean);
    const nextProjects = new Map(found.map(project => [project.id, project]));
    if (version === scanVersion) {
      projects = nextProjects;
      executable = nextExecutable;
    }
    return {
      installed: Boolean(nextExecutable),
      items: [...nextProjects.values()].map(({ id, title, type, preview }) => ({
        id,
        title,
        type,
        previewUrl: preview ? `${scheme}://asset/${id}/preview` : '',
        videoUrl: type === 'video' ? `${scheme}://asset/${id}/video` : '',
      })).sort((a, b) => a.title.localeCompare(b.title, 'zh-CN')),
    };
  }

  async function closeScene(id) {
    if (!activeScene || (id && id !== activeScene.id)) return true;
    const scene = activeScene;
    try {
      await execFileAsync(scene.executable, ['-control', 'closeWallpaper', '-location', scene.title], { windowsHide: true, timeout: 8000 });
      activeScene = null;
      return true;
    } catch (error) {
      console.warn('Could not close the Reeder wallpaper window:', error.message);
      return false;
    }
  }

  async function startScene(id) {
    if (!(await closeScene())) throw new Error('无法关闭上一张场景壁纸，请检查 Wallpaper Engine 后重试。');
    const project = projects.get(id);
    if (!project || project.type !== 'scene' || !(await exists(project.manifest))) throw new Error('壁纸已不可用，请刷新列表后重新选择。');
    if (!executable || !(await exists(executable))) throw new Error('未找到 Wallpaper Engine，请选择安装目录。');

    const { stdout } = await execFileAsync('tasklist.exe', ['/FI', 'IMAGENAME eq wallpaper64.exe', '/FO', 'CSV', '/NH'], { windowsHide: true });
    const { stdout: alternate } = await execFileAsync('tasklist.exe', ['/FI', 'IMAGENAME eq wallpaper32.exe', '/FO', 'CSV', '/NH'], { windowsHide: true });
    if (!/wallpaper(?:32|64)\.exe/i.test(stdout + alternate)) throw new Error('请先启动 Wallpaper Engine，再使用场景壁纸。');

    const scene = {
      id: randomBytes(12).toString('hex'),
      title: `Reeder Wallpaper ${randomBytes(8).toString('hex')}`,
      executable,
    };
    activeScene = scene;
    try {
      const displays = screen.getAllDisplays();
      const offscreenX = Math.min(-5000, ...displays.map(display => Math.floor(display.bounds.x * display.scaleFactor) - 2000));
      const offscreenY = Math.min(-5000, ...displays.map(display => Math.floor(display.bounds.y * display.scaleFactor) - 1200));
      await execFileAsync(executable, [
        '-control', 'openWallpaper', '-file', project.manifest,
        '-playInWindow', scene.title, '-width', '1280', '-height', '720',
        '-x', String(offscreenX), '-y', String(offscreenY), '-borderless',
      ], { windowsHide: true, timeout: 10000 });

      for (let attempt = 0; attempt < 24; attempt++) {
        const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 0, height: 0 } });
        const source = sources.find(item => item.name === scene.title);
        if (source) return { sessionId: scene.id, sourceId: source.id };
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      throw new Error('场景壁纸启动超时，请确认 Wallpaper Engine 正在运行。');
    } catch (error) {
      await closeScene(scene.id);
      throw error;
    }
  }

  function trusted(event) {
    const window = getWindow();
    return window && !window.isDestroyed() && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame;
  }

  function handle(channel, action) {
    ipcMain.handle(channel, async (event, ...args) => {
      if (!trusted(event)) return { ok: false, error: '当前页面无法使用壁纸功能。' };
      try {
        return { ok: true, ...(await action(...args)) };
      } catch (error) {
        console.warn('Wallpaper operation failed:', error);
        return { ok: false, error: error.message || '壁纸操作失败，请重试。' };
      }
    });
  }

  protocol.registerFileProtocol(scheme, (request, callback) => {
    try {
      const url = new URL(request.url);
      const [id, kind] = url.pathname.split('/').filter(Boolean);
      const project = url.hostname === 'asset' && projects.get(id);
      const file = kind === 'preview' ? project?.preview : kind === 'video' ? project?.media : '';
      callback(file || { error: -6 });
    } catch {
      callback({ error: -6 });
    }
  });

  handle('wallpaper:list', scan);
  handle('wallpaper:choose-install', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      title: '选择 Wallpaper Engine 安装目录',
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const installDir = result.filePaths[0];
    if (!(await exists(path.join(installDir, 'wallpaper64.exe'))) && !(await exists(path.join(installDir, 'wallpaper32.exe')))) {
      throw new Error('所选目录中没有找到 Wallpaper Engine 程序。');
    }
    await writeFile(settingsFile, JSON.stringify({ installDir }), 'utf8');
    return { canceled: false, ...(await scan()) };
  });
  handle('wallpaper:start-scene', id => enqueue(() => startScene(id)));
  handle('wallpaper:stop-scene', id => enqueue(async () => ({ closed: await closeScene(id) })));

  return { stop: () => enqueue(() => closeScene()) };
}

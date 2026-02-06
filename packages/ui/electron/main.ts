import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import { FnfPorter } from '@fnf-porter/core';

const porter = new FnfPorter();
let win: BrowserWindow | null = null;

const create = async () => {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  porter.onLog((event) => win?.webContents.send('porter:log', event));

  if (process.env.VITE_DEV_SERVER_URL) await win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else await win.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
};

ipcMain.handle('porter:pick', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] });
  return result.filePaths;
});
ipcMain.handle('porter:port', (_e, payload) => porter.port(payload));
ipcMain.handle('porter:list', () => porter.list());
ipcMain.handle('porter:toolchain', () => porter.toolchain());
ipcMain.handle('porter:settings:get', () => porter.getSettings());
ipcMain.handle('porter:settings:set', (_e, settings) => porter.setSettings(settings));
ipcMain.handle('porter:open-path', (_e, targetPath) => shell.openPath(targetPath));
ipcMain.handle('porter:delete', (_e, id) => porter.deleteBuild(id));
ipcMain.handle('porter:publish', (_e, payload) => porter.publishById(payload.id, payload.target, payload.options));

app.whenReady().then(create);

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('porter', {
  pickInputs: () => ipcRenderer.invoke('porter:pick'),
  port: (payload: any) => ipcRenderer.invoke('porter:port', payload),
  list: () => ipcRenderer.invoke('porter:list'),
  toolchain: () => ipcRenderer.invoke('porter:toolchain'),
  getSettings: () => ipcRenderer.invoke('porter:settings:get'),
  setSettings: (settings: any) => ipcRenderer.invoke('porter:settings:set', settings),
  openPath: (targetPath: string) => ipcRenderer.invoke('porter:open-path', targetPath),
  deleteBuild: (id: string) => ipcRenderer.invoke('porter:delete', id),
  publish: (payload: any) => ipcRenderer.invoke('porter:publish', payload),
  onLog: (cb: (event: any) => void) => ipcRenderer.on('porter:log', (_e, event) => cb(event))
});

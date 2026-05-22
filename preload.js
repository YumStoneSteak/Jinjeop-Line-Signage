const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  getDefaultConfig: () => ipcRenderer.invoke('config:getDefaults'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  updateDraft: (config) => ipcRenderer.invoke('config:updateDraft', config),
  setDirty: (isDirty) => ipcRenderer.invoke('config:setDirty', isDirty),
  getTimetableCache: () => ipcRenderer.invoke('timetable:getCache'),
  refreshTimetable: (station) => ipcRenderer.invoke('timetable:refresh', station),
  getSolarTermsYear: (year) => ipcRenderer.invoke('solarTerms:getYear', year),
  refreshSolarTermsYear: (year) => ipcRenderer.invoke('solarTerms:refreshYear', year),
  getDailyAdvice: (forceRefresh = false) => ipcRenderer.invoke('advice:getDaily', forceRefresh),

  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('window:setAlwaysOnTop', enabled),
  setPreventMinimize: (enabled) => ipcRenderer.invoke('window:setPreventMinimize', enabled),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
  setFullscreen: (enabled) => ipcRenderer.invoke('window:setFullscreen', enabled),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),

  requestQuit: () => ipcRenderer.invoke('app:requestQuit'),

  pickMediaFiles: () => ipcRenderer.invoke('dialog:pickMediaFiles'),
  pickImageFile: () => ipcRenderer.invoke('dialog:pickImageFile'),
  validateMediaPaths: (paths) => ipcRenderer.invoke('media:validatePaths', paths),

  openPopupWindow: (url) => ipcRenderer.invoke('browser:openPopup', url),

  onOpenSettings: (callback) => ipcRenderer.on('shortcut:openSettings', () => callback()),
  onTogglePause: (callback) => ipcRenderer.on('shortcut:togglePause', () => callback()),
  onOpenPopupInCurrent: (callback) => ipcRenderer.on('browser:openPopupInCurrent', (_, url) => callback(url)),
  onBrowserZoomChanged: (callback) => ipcRenderer.on('browser:zoomChanged', (_, zoomPercent) => callback(zoomPercent)),
  onFullscreenChanged: (callback) => ipcRenderer.on('window:fullscreenChanged', (_, isFullscreen) => callback(isFullscreen))
});

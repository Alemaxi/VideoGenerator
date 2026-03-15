const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

const isDev = process.env.NODE_ENV === 'development';
const backendPort = 5000;

function startBackend() {
  if (isDev) {
    // In dev, assume backend is started separately
    console.log('[Electron] Dev mode: backend expected on port', backendPort);
    return;
  }

  const backendPath = path.join(process.resourcesPath, 'backend', 'VideoGenerator.API.exe');
  backendProcess = spawn(backendPath, [], {
    detached: false,
    stdio: 'ignore'
  });

  backendProcess.on('error', (err) => {
    console.error('[Electron] Backend failed to start:', err);
  });

  console.log('[Electron] Backend started, PID:', backendProcess.pid);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../src/assets/icon.png')
  });

  const startUrl = isDev
    ? 'http://localhost:4200'
    : `file://${path.join(__dirname, '../dist/frontend/browser/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-backend-url', () => `http://localhost:${backendPort}`);

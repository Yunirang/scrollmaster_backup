const { app, BrowserWindow } = require('electron');
const path = require('path');

// Set NODE_ENV to 'production' by default
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const isMac = process.platform === "darwin";
const isDev = process.env.NODE_ENV === 'development'; // Check if NODE_ENV is 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 550,
    maximizable: false,
    resizable: isDev,
    webPreferences: {

      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('app/index.html');

  // Open DevTools if in development mode
  if (isDev) {
    win.webContents.openDevTools();
  }

  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      document.body.style.overflow = 'hidden';
    `);
  });
  
}



app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// App para Windows: abre o sistema publicado (sempre a versão mais nova).
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const SITE = 'https://silvaelielsilva227-droid.github.io/igreja-ad-oriximina/';

function criarJanela() {
  const win = new BrowserWindow({
    width: 1366, height: 860, minWidth: 380, minHeight: 600,
    backgroundColor: '#060914', autoHideMenuBar: true, show: false,
    title: 'AD Extensão de Oriximiná',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL(SITE);
  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && url.startsWith(SITE)) win.loadFile(path.join(__dirname, 'offline.html'));
  });
  // Links externos (WhatsApp, mapas, e-mail) abrem no navegador padrão
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(SITE)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(SITE) && !url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); }
  });
}

app.whenReady().then(criarJanela);
app.on('window-all-closed', () => app.quit());

// Modules to control application life and create native browser window
const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')

const exeName = path.basename(process.execPath)

app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath('exe'),
  args: [
    '--processStart', `"${exeName}"`,
    '--process-start-args', `"--hidden"`,
  ]
})

function createWindow(show=true) {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 920,
        height: 670,
        show,
        paintWhenInitiallyHidden: true, // sprawdz na false czy dziala
        autoHideMenuBar: true,
        title: 'Chrome Wallpapers',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, './public/index.html'))

    // Open the DevTools.
    mainWindow.webContents.openDevTools()

    mainWindow.on('close', (evt) => {
        if (!isAppQuitting) {
            evt.preventDefault();
            mainWindow.hide()
        }
    });
    
    return mainWindow
}

let myWindow = null
let isAppQuitting = false;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    const gotTheLock = app.requestSingleInstanceLock()

    if (!gotTheLock) {
        app.quit()
        return;
    } 

    myWindow = createWindow(process.argv.every(el=>!el.includes('--hidden')))

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('before-quit', (evt) => {
    isAppQuitting = true;
});

app.on('second-instance', (event, commandLine, workingDirectory) => {
// Someone tried to run a second instance, we should focus our window.
    if (myWindow) {
        if (myWindow.isMinimized()) {
            myWindow.restore()
        }
        myWindow.show()
        myWindow.focus()
    }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.handle('openExternalBrowser', (event, url) => {
    shell.openExternal(url)
})
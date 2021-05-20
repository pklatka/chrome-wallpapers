// Modules to control application life and create native browser window
const { app, BrowserWindow, shell, ipcMain,Tray,Menu } = require('electron')
const path = require('path')
const exeName = path.basename(process.execPath)

app.setAppUserModelId('Google Wallpapers')
app.setName('Google Wallpapers')

function createWindow(show=true) {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 920,
        height: 670,
        show: false,
        paintWhenInitiallyHidden: false, 
        autoHideMenuBar: true,
        icon: path.join(__dirname,'./public/img/icon.ico'),
        title: 'Chrome Wallpapers',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, './public/index.html'))

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    mainWindow.webContents.on('did-finish-load', () => {
        if(show) mainWindow.show();
    });    

    mainWindow.on('close', (evt) => {
        if (!isAppQuitting) {
            evt.preventDefault();
            mainWindow.hide()
        }
    });
 
    return mainWindow
}

let window = null
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

    window = createWindow(process.argv.every(el=>!el.includes('--hidden')))

    tray = new Tray(path.join(__dirname,'./public/img/icon.png'))
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Next wallpaper', type: 'normal',click: (menuItem, browserWindow, event) => {
        window.webContents.send('next-wallpaper')
      } },
      { label: 'Quit', type: 'normal', role:'quit' },
    ])
    tray.setToolTip('Chrome Wallpapers\nRight click for more')
    tray.setContextMenu(contextMenu)
    tray.on('double-click',e=>{
        window.show()
    })
  
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
    if (window) {
        if (window.isMinimized()) {
            window.restore()
        }
        window.show()
        window.focus()
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

ipcMain.handle('runOnLogin',(event,setToRunOnLogin)=>{
    if(setToRunOnLogin){
        app.setLoginItemSettings({
            openAtLogin: true,
            openAsHidden: true,
            path: app.getPath('exe'),
            args: [
            '--processStart', `"${exeName}"`,
            '--process-start-args', `"--hidden"`,
            ],
            enabled: true,
        }) 
    }else{
        app.setLoginItemSettings({
            openAtLogin: false,
            openAsHidden: true,
            path: app.getPath('exe'),
            args: [
            '--processStart', `"${exeName}"`,
            '--process-start-args', `"--hidden"`,
            ],
            enabled: false,
        }) 
    }
})
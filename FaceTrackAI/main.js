const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;
let pythonProcess;

// Create the data directory if it doesn't exist
const dataDir = path.join(app.getPath('userData'), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html of the app
  mainWindow.loadFile('index.html');

  // Open the DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}

// Start Python backend when app is ready
function startPythonBackend() {
  const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = path.join(__dirname, 'backend', 'app.py');
  
  console.log(`Starting Python backend: ${pythonExecutable} ${scriptPath}`);
  
  pythonProcess = spawn(pythonExecutable, [scriptPath]);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python stdout: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python stderr: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python backend process exited with code ${code}`);
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  startPythonBackend();
  createWindow();
  
  app.on('activate', function() {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (mainWindow === null) createWindow();
  });
});

// Quit when all windows are closed
app.on('window-all-closed', function() {
  // On macOS it's common for applications to stay open until explicitly quit
  if (process.platform !== 'darwin') app.quit();
});

// Kill Python process when app is quitting
app.on('will-quit', () => {
  if (pythonProcess) {
    console.log('Killing Python backend process');
    
    // Handle different platforms
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']);
    } else {
      pythonProcess.kill();
    }
  }
});

// IPC handlers for communication with renderer processes
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

// IPC handlers for Python backend communication
ipcMain.handle('register-student', async (event, studentData) => {
  // This will be handled by sending HTTP requests to the Python backend
  const response = await fetch('http://localhost:8000/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentData)
  });
  
  return await response.json();
});

ipcMain.handle('mark-attendance', async (event, sessionId) => {
  const response = await fetch(`http://localhost:8000/api/attendance/mark?session_id=${sessionId}`, {
    method: 'POST'
  });
  
  return await response.json();
});

ipcMain.handle('get-reports', async (event, filters) => {
  const queryParams = new URLSearchParams(filters).toString();
  const response = await fetch(`http://localhost:8000/api/reports?${queryParams}`);
  
  return await response.json();
});

ipcMain.handle('export-csv', async (event, filters) => {
  const queryParams = new URLSearchParams(filters).toString();
  const response = await fetch(`http://localhost:8000/api/reports/export?${queryParams}`);
  
  return await response.json();
});

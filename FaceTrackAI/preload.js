const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    
    // Student registration
    registerStudent: (studentData) => ipcRenderer.invoke('register-student', studentData),
    
    // Attendance marking
    markAttendance: (sessionId) => ipcRenderer.invoke('mark-attendance', sessionId),
    
    // Reporting
    getReports: (filters) => ipcRenderer.invoke('get-reports', filters),
    exportCsv: (filters) => ipcRenderer.invoke('export-csv', filters),
    
    // Utility functions
    getCurrentDate: () => {
      const now = new Date();
      return now.toISOString().split('T')[0];
    },
    
    formatTime: (date) => {
      const d = new Date(date);
      return d.toLocaleTimeString();
    },
    
    // HTTP fetch wrapper
    fetch: async (endpoint, options = {}) => {
      const baseUrl = 'http://localhost:8000';
      const response = await fetch(`${baseUrl}${endpoint}`, options);
      return await response.json();
    }
  }
);

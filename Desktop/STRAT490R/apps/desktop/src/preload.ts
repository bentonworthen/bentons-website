import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Recording controls
  getSources: () => ipcRenderer.invoke('get-sources'),
  startRecording: (options: any) => ipcRenderer.invoke('start-recording', options),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  getRecordingStatus: () => ipcRenderer.invoke('get-recording-status'),

  // Authentication
  login: (credentials: any) => ipcRenderer.invoke('login', credentials),

  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (config: any) => ipcRenderer.invoke('update-config', config),

  // Event listeners
  onRecordingStarted: (callback: () => void) => {
    ipcRenderer.on('recording-started', callback);
  },
  onRecordingStopped: (callback: () => void) => {
    ipcRenderer.on('recording-stopped', callback);
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getSources: () => Promise<Array<{
        id: string;
        name: string;
        thumbnail: string;
      }>>;
      startRecording: (options: any) => Promise<boolean>;
      stopRecording: () => Promise<boolean>;
      getRecordingStatus: () => Promise<{
        isRecording: boolean;
        isPaused: boolean;
        duration: number;
        sessionId: string | null;
      }>;
      login: (credentials: { email: string; password: string }) => Promise<any>;
      getConfig: () => Promise<any>;
      updateConfig: (config: any) => Promise<void>;
      onRecordingStarted: (callback: () => void) => void;
      onRecordingStopped: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
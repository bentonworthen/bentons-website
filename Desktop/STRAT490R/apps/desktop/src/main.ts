import { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut, screen, Menu, Tray, nativeImage } from 'electron';
import * as path from 'path';
import { RecordingSession } from './recording/RecordingSession';
import { APIClient } from './api/APIClient';
import Store from 'electron-store';

interface AppConfig {
  apiEndpoint: string;
  authToken?: string;
  hotkeys: {
    startStop: string;
    pause: string;
    markMilestone: string;
  };
  captureSettings: {
    includeAudio: boolean;
    includeSystemAudio: boolean;
    quality: 'low' | 'medium' | 'high';
    frameRate: number;
  };
}

class ReportifyApp {
  private mainWindow: BrowserWindow | null = null;
  private recordingSession: RecordingSession | null = null;
  private apiClient: APIClient;
  private store: Store<AppConfig>;
  private tray: Tray | null = null;

  constructor() {
    this.store = new Store<AppConfig>({
      defaults: {
        apiEndpoint: 'http://localhost:3001',
        hotkeys: {
          startStop: 'CommandOrControl+Shift+R',
          pause: 'CommandOrControl+Shift+P',
          markMilestone: 'CommandOrControl+Shift+M',
        },
        captureSettings: {
          includeAudio: true,
          includeSystemAudio: false,
          quality: 'medium',
          frameRate: 30,
        },
      },
    });

    this.apiClient = new APIClient(this.store.get('apiEndpoint'), this.store.get('authToken'));
    this.setupApp();
  }

  private setupApp() {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupTray();
      this.registerGlobalShortcuts();
      this.setupIPC();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('will-quit', () => {
      globalShortcut.unregisterAll();
    });
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      show: false,
    });

    // In production, load from built files
    if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray-icon.png'));
    this.tray = new Tray(icon.resize({ width: 16, height: 16 }));

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Start Recording',
        click: () => this.startRecording(),
        enabled: !this.recordingSession?.isRecording(),
      },
      {
        label: 'Stop Recording',
        click: () => this.stopRecording(),
        enabled: this.recordingSession?.isRecording() || false,
      },
      { type: 'separator' },
      {
        label: 'Show Reportify',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          } else {
            this.createWindow();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('Reportify Desktop Recorder');
  }

  private registerGlobalShortcuts() {
    const hotkeys = this.store.get('hotkeys');

    globalShortcut.register(hotkeys.startStop, () => {
      if (this.recordingSession?.isRecording()) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    });

    globalShortcut.register(hotkeys.pause, () => {
      if (this.recordingSession?.isRecording()) {
        this.recordingSession.togglePause();
      }
    });

    globalShortcut.register(hotkeys.markMilestone, () => {
      if (this.recordingSession?.isRecording()) {
        this.recordingSession.markMilestone('User marked milestone');
      }
    });
  }

  private setupIPC() {
    // Get available sources for screen capture
    ipcMain.handle('get-sources', async () => {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 150, height: 150 },
      });

      return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
      }));
    });

    // Start recording
    ipcMain.handle('start-recording', async (event, options) => {
      return this.startRecording(options);
    });

    // Stop recording
    ipcMain.handle('stop-recording', async () => {
      return this.stopRecording();
    });

    // Get recording status
    ipcMain.handle('get-recording-status', () => {
      return {
        isRecording: this.recordingSession?.isRecording() || false,
        isPaused: this.recordingSession?.isPaused() || false,
        duration: this.recordingSession?.getDuration() || 0,
        sessionId: this.recordingSession?.getSessionId() || null,
      };
    });

    // Authentication
    ipcMain.handle('login', async (event, credentials) => {
      try {
        const result = await this.apiClient.login(credentials);
        this.store.set('authToken', result.token);
        return result;
      } catch (error) {
        throw error;
      }
    });

    // Get app config
    ipcMain.handle('get-config', () => {
      return this.store.store;
    });

    // Update config
    ipcMain.handle('update-config', (event, config) => {
      this.store.set(config);
      this.apiClient.setAuthToken(this.store.get('authToken'));
    });
  }

  private async startRecording(options?: any): Promise<boolean> {
    try {
      if (this.recordingSession?.isRecording()) {
        return false;
      }

      // Get screen sources if not provided
      if (!options?.sourceId) {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 1, height: 1 },
        });

        if (sources.length === 0) {
          throw new Error('No screen sources available');
        }

        options = { sourceId: sources[0].id };
      }

      this.recordingSession = new RecordingSession(this.apiClient, this.store.get('captureSettings'));
      await this.recordingSession.start(options);

      // Update tray menu
      this.updateTrayMenu();

      // Notify renderer
      this.mainWindow?.webContents.send('recording-started');

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  private async stopRecording(): Promise<boolean> {
    try {
      if (!this.recordingSession?.isRecording()) {
        return false;
      }

      await this.recordingSession.stop();
      this.recordingSession = null;

      // Update tray menu
      this.updateTrayMenu();

      // Notify renderer
      this.mainWindow?.webContents.send('recording-stopped');

      return true;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return false;
    }
  }

  private updateTrayMenu() {
    if (!this.tray) return;

    const isRecording = this.recordingSession?.isRecording() || false;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Start Recording',
        click: () => this.startRecording(),
        enabled: !isRecording,
      },
      {
        label: 'Stop Recording',
        click: () => this.stopRecording(),
        enabled: isRecording,
      },
      { type: 'separator' },
      {
        label: 'Show Reportify',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          } else {
            this.createWindow();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }
}

// Create and start the app
new ReportifyApp();
import fetch from 'node-fetch';
import WebSocket from 'ws';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

export interface CreateSessionRequest {
  customerId?: string;
  customerName?: string;
  sources: {
    screen: boolean;
    audio: boolean;
    windows: string[];
  };
  consentFlags: {
    screenRecording: boolean;
    audioRecording: boolean;
    keystrokeCapture: boolean;
  };
}

export interface SessionResponse {
  id: string;
  status: string;
  createdAt: string;
}

export interface AddEventRequest {
  timestamp: string;
  type: 'asr_transcript' | 'asr_word' | 'ui_click' | 'ui_input_meta' | 'window_focus' | 'app_launch' | 'net_change' | 'ocr_text' | 'user_note' | 'privacy_pause' | 'privacy_resume';
  payload: any;
  speakerTag?: string;
  confidence?: number;
}

export interface EndSessionRequest {
  duration: number;
  mediaUris?: string[];
}

export class APIClient {
  private authToken: string | null = null;
  private wsConnection: WebSocket | null = null;

  constructor(
    private baseURL: string,
    authToken?: string
  ) {
    this.authToken = authToken || null;
  }

  setAuthToken(token?: string): void {
    this.authToken = token || null;
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.post('/api/auth/login', credentials);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const result = await response.json();
    this.authToken = result.token;

    return result;
  }

  async createSession(data: CreateSessionRequest): Promise<SessionResponse> {
    const response = await this.post('/api/sessions', data);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create session');
    }

    return await response.json();
  }

  async addEvent(sessionId: string, event: AddEventRequest): Promise<void> {
    const response = await this.post(`/api/sessions/${sessionId}/events`, event);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add event');
    }
  }

  async endSession(sessionId: string, data: EndSessionRequest): Promise<SessionResponse> {
    const response = await this.patch(`/api/sessions/${sessionId}/end`, data);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to end session');
    }

    return await response.json();
  }

  async getSessions(): Promise<SessionResponse[]> {
    const response = await this.get('/api/sessions');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get sessions');
    }

    return await response.json();
  }

  async getReports(): Promise<any[]> {
    const response = await this.get('/api/reports');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get reports');
    }

    return await response.json();
  }

  async generateReport(sessionId: string): Promise<any> {
    const response = await this.post(`/api/reports/${sessionId}/generate`, {});

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate report');
    }

    return await response.json();
  }

  connectWebSocket(sessionId: string): WebSocket {
    if (this.wsConnection) {
      this.wsConnection.close();
    }

    const wsURL = this.baseURL.replace(/^http/, 'ws') + `/api/sessions/${sessionId}/stream`;
    this.wsConnection = new WebSocket(wsURL, {
      headers: this.authToken ? {
        Authorization: `Bearer ${this.authToken}`,
      } : {},
    });

    this.wsConnection.on('open', () => {
      console.log('WebSocket connected');
    });

    this.wsConnection.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.wsConnection.on('close', () => {
      console.log('WebSocket disconnected');
      this.wsConnection = null;
    });

    return this.wsConnection;
  }

  private async get(endpoint: string): Promise<Response> {
    return await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  private async post(endpoint: string, data: any): Promise<Response> {
    return await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
  }

  private async patch(endpoint: string, data: any): Promise<Response> {
    return await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    return headers;
  }
}
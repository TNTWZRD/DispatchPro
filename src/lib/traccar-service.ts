// src/lib/traccar-service.ts

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  disabled: boolean;
  lastUpdate: string;
  positionId: number;
  groupId?: number;
  phone?: string;
  model?: string;
  contact?: string;
  category?: string;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  protocol: string;
  deviceTime: string;
  fixTime: string;
  serverTime: string;
  outdated: boolean;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  address?: string;
  accuracy?: number;
  attributes: Record<string, any>;
}

export interface TraccarSession {
  id: number;
  name: string;
  email: string;
  phone?: string;
  readonly: boolean;
  administrator: boolean;
  map?: string;
  distanceUnit?: string;
  speedUnit?: string;
  latitude: number;
  longitude: number;
  zoom: number;
}

class TraccarService {
  private baseURL: string;
  private session: TraccarSession | null = null;

  constructor(serverURL?: string) {
    this.baseURL = serverURL || process.env.NEXT_PUBLIC_TRACCAR_SERVER_URL || 'https://tc.dispatchpro.jajliardo.com';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}/api${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session management
    });

    if (!response.ok) {
      throw new Error(`Traccar API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async login(email: string, password: string): Promise<TraccarSession> {
    try {
      // Traccar expects form data, not JSON for login
      const formData = new URLSearchParams();
      formData.append('email', email);
      formData.append('password', password);

      const url = `${this.baseURL}/api/session`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Traccar API error: ${response.status} ${response.statusText}`);
      }

      const session = await response.json();
      this.session = session;
      return session;
    } catch (error) {
      console.error('Traccar login failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request('/session', { method: 'DELETE' });
      this.session = null;
    } catch (error) {
      console.error('Traccar logout failed:', error);
    }
  }

  async getDevices(): Promise<TraccarDevice[]> {
    return this.request<TraccarDevice[]>('/devices');
  }

  async getDevice(deviceId: number): Promise<TraccarDevice> {
    return this.request<TraccarDevice>(`/devices/${deviceId}`);
  }

  async getPositions(deviceId?: number, from?: Date, to?: Date): Promise<TraccarPosition[]> {
    const params = new URLSearchParams();
    
    if (deviceId) {
      params.append('deviceId', deviceId.toString());
    }
    
    if (from) {
      params.append('from', from.toISOString());
    }
    
    if (to) {
      params.append('to', to.toISOString());
    }

    return this.request<TraccarPosition[]>(`/positions?${params.toString()}`);
  }

  async getLatestPositions(): Promise<TraccarPosition[]> {
    // Get positions from the last hour
    const to = new Date();
    const from = new Date(to.getTime() - 60 * 60 * 1000);
    
    return this.getPositions(undefined, from, to);
  }

  async getDevicePositions(deviceIds: number[]): Promise<TraccarPosition[]> {
    const promises = deviceIds.map(id => this.getPositions(id));
    const results = await Promise.all(promises);
    return results.flat();
  }

  getSession(): TraccarSession | null {
    return this.session;
  }

  isAuthenticated(): boolean {
    return this.session !== null;
  }

  // Get the Traccar web interface URL for embedding
  getWebInterfaceUrl(): string {
    return this.baseURL;
  }

  // Get a direct map URL (if Traccar supports it)
  getMapUrl(deviceId?: number): string {
    let url = `${this.baseURL}/`;
    if (deviceId) {
      url += `?deviceId=${deviceId}`;
    }
    return url;
  }
}

// Create a singleton instance
const traccarService = new TraccarService(
  process.env.NEXT_PUBLIC_TRACCAR_SERVER_URL || 'https://tc.dispatchpro.jajliardo.com'
);

export default traccarService;
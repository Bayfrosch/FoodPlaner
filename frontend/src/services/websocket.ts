// WebSocket Service für Live-Updates
class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor() {
    this.url = `ws://${window.location.hostname}:3001`;
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.url}?token=${token}`);

        this.ws.onopen = () => {
          console.log('WebSocket verbunden');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          console.log('WebSocket Nachricht:', message);
          
          // Rufe alle Listener für diesen Event-Typ auf
          const listeners = this.listeners.get(message.type);
          if (listeners) {
            listeners.forEach(callback => callback(message.data));
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket Fehler:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket getrennt');
          this.attemptReconnect(token);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnection-Versuch ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      setTimeout(() => {
        this.connect(token).catch(err => {
          console.error('Reconnection fehlgeschlagen:', err);
        });
      }, this.reconnectDelay);
    }
  }

  subscribe(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Unsubscribe-Funktion zurückgeben
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();

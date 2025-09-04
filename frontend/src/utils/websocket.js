export const getWebSocketUrl = () => {
  const host = window.location.host;
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  
  return `${protocol}://${host}/ws`;
};

export class WebSocketClient {
  constructor(options = {}) {
    this.options = options;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.ws = null;
    this.url = getWebSocketUrl();
    
    console.log('WebSocket URL:', this.url);
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log('Connecting to WebSocket:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          resolve(this.ws);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => this.reconnect(), this.reconnectInterval);
          } else {
            reject(new Error('WebSocket connection failed after multiple attempts'));
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket connection closed');
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => this.reconnect(), this.reconnectInterval);
          }
        };

      } catch (error) {
        console.error('WebSocket connection error:', error);
        reject(error);
      }
    });
  }

  reconnect() {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    return this.connect();
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
} 
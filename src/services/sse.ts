interface SSEMessage {
  type: string;
  [key: string]: any;
}

type SSECallback = (message: SSEMessage) => void;

class SSEService {
  private abortController: AbortController | null = null;
  private listId: number | null = null;
  private callbacks: Set<SSECallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isAborting = false;

  public subscribe(listId: number, callback: SSECallback): () => void {
    this.callbacks.add(callback);

    // If not already connected to this list, connect now
    if (this.listId !== listId || !this.abortController) {
      this.connect(listId);
    }

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
      // Close connection if no more subscribers
      if (this.callbacks.size === 0) {
        this.disconnect();
      }
    };
  }

  private async connect(listId: number): Promise<void> {
    this.listId = listId;

    // Close existing connection safely
    if (this.abortController && !this.isAborting) {
      this.isAborting = true;
      try {
        // Check if the controller is already aborted before aborting
        if (this.abortController.signal.aborted === false) {
          this.abortController.abort();
        }
      } catch (error) {
        // Ignore abort errors - controller might already be aborted
        console.debug('[SSE Client] Abort error (expected):', error instanceof Error ? error.message : String(error));
      }
      this.isAborting = false;
    }

    this.abortController = new AbortController();

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    const url = `${baseUrl}/api/lists/${listId}/updates`;
    
    console.log('[SSE Client] Attempting to connect to', url);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: this.abortController.signal,
      });

      console.log('[SSE Client] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SSE Client] HTTP error:', response.status, errorText);
        this.handleConnectionError();
        return;
      }

      if (!response.body) {
        console.error('[SSE Client] No response body');
        this.handleConnectionError();
        return;
      }

      console.log('[SSE Client] Connected to list', listId);
      await this.readStream(response.body);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[SSE Client] Connection aborted');
      } else if (error instanceof TypeError && error.message.includes('BodyStreamBuffer')) {
        // Expected error when stream is aborted while being read
        console.log('[SSE Client] Stream was aborted during read');
      } else {
        console.error('[SSE Client] Connection error:', error);
        this.handleConnectionError();
      }
    }
  }

  private async readStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        // Check if we're being aborted
        if (this.abortController?.signal.aborted) {
          console.log('[SSE Client] Stream aborted, stopping read');
          break;
        }

        const { done, value } = await reader.read();
        if (done) {
          console.log('[SSE Client] Stream ended');
          this.handleConnectionError();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const message: SSEMessage = JSON.parse(data);
              this.broadcastToCallbacks(message);
              
              // Reset reconnect attempts on successful message
              this.reconnectAttempts = 0;
            } catch (error) {
              console.error('[SSE Client] Failed to parse message:', error, 'raw:', data);
            }
          }
        }
      }
    } catch (error) {
      // Check if this is an expected abort error
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          console.log('[SSE Client] Stream read aborted');
          return;
        } else if (error.message.includes('BodyStreamBuffer')) {
          console.log('[SSE Client] Stream buffer was aborted (expected)');
          return;
        }
      }
      console.error('[SSE Client] Stream read error:', error);
      this.handleConnectionError();
    } finally {
      try {
        reader.releaseLock();
      } catch (error) {
        // Ignore errors when releasing reader lock
        console.debug('[SSE Client] Reader lock release error (expected):', error instanceof Error ? error.message : String(error));
      }
    }
  }

  private handleConnectionError(): void {
    // Attempt to reconnect with exponential backoff
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.listId) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      console.log('[SSE Client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})');
      
      setTimeout(() => {
        this.reconnectAttempts++;
        if (this.listId) {
          this.connect(this.listId);
        }
      }, delay);
    } else {
      console.error('[SSE Client] Connection failed after maximum reconnection attempts');
    }
  }

  private broadcastToCallbacks(message: SSEMessage): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        console.error('[SSE Client] Error in callback:', error);
      }
    });
  }

  public disconnect(): void {
    if (this.abortController && !this.isAborting) {
      this.isAborting = true;
      try {
        if (this.abortController.signal.aborted === false) {
          this.abortController.abort();
        }
      } catch (error) {
        // Ignore errors when aborting - controller might already be aborted
        console.debug('[SSE Client] Disconnect abort error (expected):', error instanceof Error ? error.message : String(error));
      }
      this.isAborting = false;
      this.abortController = null;
    }
    this.listId = null;
    this.callbacks.clear();
    this.reconnectAttempts = 0;
    console.log('[SSE Client] Disconnected');
  }

  public isConnected(): boolean {
    return this.abortController !== null;
  }
}

// Export singleton instance
export const sseService = new SSEService();

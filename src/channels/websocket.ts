import WebSocket from 'ws';
import { BaseChannel } from './base';
import { ChannelConfig, ChannelResponse, HealthCheckResult } from '../types/types';

export interface WebSocketChannelConfig extends ChannelConfig {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
}

export class WebSocketChannel extends BaseChannel {
  private ws: WebSocket | null = null;
  private wsConfig: WebSocketChannelConfig;
  private reconnectTimer?: NodeJS.Timeout;
  private isIntentionalClose: boolean = false;

  constructor(config: WebSocketChannelConfig) {
    super(config);
    this.wsConfig = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsConfig.url, this.wsConfig.protocols);

        this.ws.on('open', () => {
          this.logger.info('WebSocket connected', { channelId: this.id });
          resolve();
        });

        this.ws.on('error', (error) => {
          this.logger.error('WebSocket connection error', error, { channelId: this.id });
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          this.logger.warn('WebSocket closed', {
            channelId: this.id,
            code,
            reason: reason.toString(),
          });

          if (!this.isIntentionalClose) {
            this.scheduleReconnect();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.isIntentionalClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect');
      this.ws = null;
    }
  }

  async send<T>(data: any): Promise<ChannelResponse<T>> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    return new Promise((resolve, reject) => {
      try {
        const message = JSON.stringify(data);
        this.ws!.send(message, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              data: { success: true } as T,
              status: 200,
              timestamp: Date.now(),
              channelId: this.id,
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    if (!this.ws) {
      return {
        isHealthy: false,
        latency: Date.now() - startTime,
        error: new Error('WebSocket not initialized'),
      };
    }

    const isHealthy = this.ws.readyState === WebSocket.OPEN;

    return {
      isHealthy,
      latency: Date.now() - startTime,
      error: isHealthy ? undefined : new Error(`WebSocket state: ${this.ws.readyState}`),
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.logger.info('Attempting WebSocket reconnection', { channelId: this.id });
      this.connect().catch((error) => {
        this.logger.error('WebSocket reconnection failed', error, { channelId: this.id });
        this.scheduleReconnect();
      });
    }, this.wsConfig.reconnectInterval || 5000);
  }

  public onMessage(callback: (data: any) => void): void {
    if (this.ws) {
      this.ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          callback(parsed);
        } catch (error) {
          this.logger.error('Failed to parse WebSocket message', error as Error, { channelId: this.id });
        }
      });
    }
  }
}

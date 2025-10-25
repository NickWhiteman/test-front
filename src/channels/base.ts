import { ChannelConfig, ChannelStatus, HealthCheckResult, ChannelResponse } from '../types/types';
import { TypedEventEmitter } from '../utils/eventEmitter';
import { Logger } from '../utils/logger';

export abstract class BaseChannel extends TypedEventEmitter {
  public readonly id: string;
  public status: ChannelStatus = 'idle';
  public priority: number;
  protected config: ChannelConfig;
  protected logger: Logger;
  private healthCheckTimer?: NodeJS.Timeout;
  private consecutiveFailures: number = 0;

  constructor(config: ChannelConfig) {
    super();
    this.id = config.id;
    this.priority = config.priority;
    this.config = config;
    this.logger = Logger.getInstance();
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send<T>(data: any): Promise<ChannelResponse<T>>;
  abstract healthCheck(): Promise<HealthCheckResult>;

  public async initialize(): Promise<void> {
    try {
      await this.connect();
      this.setStatus('connected');
      this.startHealthChecks();
    } catch (error) {
      this.setStatus('unavailable');
      this.emit('channel.unavailable', {
        channelId: this.id,
        error: error as Error,
      });
    }
  }

  protected setStatus(status: ChannelStatus): void {
    const previousStatus = this.status;
    this.status = status;

    this.logger.debug(`Channel status changed`, {
      channelId: this.id,
      from: previousStatus,
      to: status,
    });

    if (status === 'connected' && previousStatus !== 'connected') {
      this.consecutiveFailures = 0;
    }
  }

  private startHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        const result = await this.healthCheck();

        this.emit('health.check', {
          channelId: this.id,
          status: result.isHealthy ? 'connected' : 'unavailable',
        });

        if (result.isHealthy) {
          if (this.status === 'unavailable') {
            this.setStatus('idle');
            this.emit('channel.recovered', { channelId: this.id });
          }
          this.consecutiveFailures = 0;
        } else {
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= this.config.retryAttempts) {
            this.setStatus('unavailable');
          }
        }
      } catch (error) {
        this.logger.error('Health check failed', error as Error, { channelId: this.id });
        this.consecutiveFailures++;
      }
    }, this.config.healthCheckInterval);
  }

  public async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    try {
      await this.disconnect();
    } catch (error) {
      this.logger.error('Error during channel shutdown', error as Error, { channelId: this.id });
    }

    this.setStatus('unavailable');
  }

  public isAvailable(): boolean {
    return this.status !== 'unavailable';
  }

  public canUse(): boolean {
    return this.status === 'idle' || this.status === 'connected';
  }
}

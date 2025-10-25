import { BaseChannel } from '../channels/base';
import { HealthCheckResult } from '../types/types';
import { Logger } from '../utils/logger';

export class HealthManager {
  private channels: Map<string, BaseChannel> = new Map();
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();
  private logger = Logger.getInstance();

  constructor(private checkInterval: number = 30000) {}

  registerChannel(channel: BaseChannel): void {
    this.channels.set(channel.id, channel);
    this.startHealthChecks(channel);
  }

  unregisterChannel(channelId: string): void {
    this.stopHealthChecks(channelId);
    this.channels.delete(channelId);
  }

  private startHealthChecks(channel: BaseChannel): void {
    this.stopHealthChecks(channel.id);

    const interval = setInterval(async () => {
      try {
        const result = await channel.healthCheck();

        this.logger.debug('Health check completed', {
          channelId: channel.id,
          healthy: result.isHealthy,
          latency: result.latency,
        });

        if (!result.isHealthy && channel.isAvailable()) {
          this.logger.warn('Channel became unhealthy', {
            channelId: channel.id,
            error: result.error?.message,
          });
        }
      } catch (error) {
        this.logger.error('Health check error', error as Error, { channelId: channel.id });
      }
    }, this.checkInterval);

    this.checkIntervals.set(channel.id, interval);
  }

  private stopHealthChecks(channelId: string): void {
    const interval = this.checkIntervals.get(channelId);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(channelId);
    }
  }

  async forceHealthCheck(channelId: string): Promise<HealthCheckResult> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    return await channel.healthCheck();
  }

  getChannelHealth(channelId: string): { status: string; lastCheck?: number } {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    return {
      status: channel.status,
    };
  }

  shutdown(): void {
    for (const [channelId] of this.checkIntervals) {
      this.stopHealthChecks(channelId);
    }
    this.channels.clear();
  }
}

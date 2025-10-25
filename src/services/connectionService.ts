import { BaseChannel } from '../channels/base';
import { ChannelManager } from '../managers/channelManager';
import { HealthManager } from '../managers/healthManager';
import { ConnectionEventMap } from '../types/types';
import { TypedEventEmitter } from '../utils/eventEmitter';
import { Logger } from '../utils/logger';

export class ConnectionService extends TypedEventEmitter {
  private channelManager: ChannelManager;
  private healthManager: HealthManager;
  private logger: Logger;
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.channelManager = new ChannelManager();
    this.healthManager = new HealthManager();
    this.logger = Logger.getInstance();

    this.setupEventForwarding();
  }

  async initialize(channels: BaseChannel[]): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('ConnectionService already initialized');
      return;
    }

    try {
      for (const channel of channels) {
        this.channelManager.registerChannel(channel);
        this.healthManager.registerChannel(channel);

        await channel.initialize();
      }

      // Устанавливаем канал с наивысшим приоритетом как текущий
      const availableChannels = this.channelManager.getAvailableChannels();
      if (availableChannels.length > 0) {
        await this.channelManager.setCurrentChannel(availableChannels[0].id);
      } else {
        throw new Error('No available channels after initialization');
      }

      this.isInitialized = true;
      this.logger.info('ConnectionService initialized successfully', {
        channelCount: channels.length,
        currentChannel: availableChannels[0].id,
      });
    } catch (error) {
      this.logger.error('ConnectionService initialization failed', error as Error);
      throw error;
    }
  }

  async send<T>(data: any, critical: boolean = false): Promise<T> {
    if (!this.isInitialized) {
      throw new Error('ConnectionService not initialized');
    }

    return await this.channelManager.send<T>(data, critical);
  }

  async switchChannel(reason?: string): Promise<void> {
    return await this.channelManager.switchChannel(reason);
  }

  getCurrentChannelId(): string | null {
    const channel = this.channelManager.getCurrentChannel();
    return channel?.id || null;
  }

  getChannelStatus(channelId: string): string | null {
    return this.channelManager.getChannelStatus(channelId);
  }

  getAvailableChannels(): { id: string; priority: number; status: string }[] {
    return this.channelManager.getAvailableChannels().map((channel) => ({
      id: channel.id,
      priority: channel.priority,
      status: channel.status,
    }));
  }

  async forceHealthCheck(channelId: string): Promise<any> {
    return await this.healthManager.forceHealthCheck(channelId);
  }

  private setupEventForwarding(): void {
    // Пробрасываем события от менеджеров
    const events: (keyof ConnectionEventMap)[] = [
      'channel.connected',
      'channel.disconnected',
      'channel.unavailable',
      'channel.recovered',
      'switch.started',
      'switch.completed',
      'switch.failed',
      'no.available.channels',
      'health.check',
      'error',
    ];

    events.forEach((event) => {
      this.channelManager.on(event as any, (data: any) => {
        this.emit(event as any, data);
      });
    });
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down ConnectionService');

    await this.channelManager.shutdown();
    this.healthManager.shutdown();

    this.isInitialized = false;
    this.logger.info('ConnectionService shutdown complete');
  }
}

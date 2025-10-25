import { BaseChannel } from '../channels/base';
import { ChannelStatus } from '../types/types';
import { RequestBuffer } from '../utils/buffer';
import { TypedEventEmitter } from '../utils/eventEmitter';
import { Logger } from '../utils/logger';

interface ChannelManagerEvents {
  'switch.initiated': { from: string; to: string; reason: string };
  'switch.completed': { from: string; to: string };
  'switch.failed': { from: string; to: string; error: Error };
  'no.available.channels': { currentChannel: string };
}

export class ChannelManager extends TypedEventEmitter {
  private channels: Map<string, BaseChannel> = new Map();
  private currentChannel: BaseChannel | null = null;
  private isSwitching: boolean = false;
  private buffer: RequestBuffer;
  private logger = Logger.getInstance();

  constructor(bufferSize: number = 100) {
    super();
    this.buffer = new RequestBuffer(bufferSize);
  }

  registerChannel(channel: BaseChannel): void {
    this.channels.set(channel.id, channel);

    channel.on('channel.unavailable', ({ channelId, error }) => {
      this.logger.warn('Channel became unavailable', { channelId, error: error.message });

      if (this.currentChannel?.id === channelId) {
        this.switchChannel().catch((error) => {
          this.logger.error('Failed to switch channel after failure', error, { channelId });
        });
      }
    });

    channel.on('channel.recovered', ({ channelId }) => {
      this.logger.info('Channel recovered', { channelId });
    });

    this.logger.info('Channel registered', { channelId: channel.id });
  }

  async setCurrentChannel(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (!channel.canUse()) {
      throw new Error(`Channel ${channelId} is not available`);
    }

    const previousChannel = this.currentChannel;
    this.currentChannel = channel;

    this.logger.info('Current channel changed', {
      from: previousChannel?.id,
      to: channelId,
    });
  }

  async switchChannel(reason: string = 'auto-switch'): Promise<void> {
    if (this.isSwitching) {
      this.logger.debug('Channel switch already in progress');
      return;
    }

    this.isSwitching = true;
    const fromChannel = this.currentChannel?.id;

    try {
      const availableChannels = this.getAvailableChannels()
        .filter((channel) => channel.id !== fromChannel)
        .sort((a, b) => b.priority - a.priority);

      if (availableChannels.length === 0) {
        this.emit('no.available.channels', { currentChannel: fromChannel || 'none' });
        this.logger.error('No available channels for switching');
        throw new Error('No available channels');
      }

      const targetChannel = availableChannels[0];

      this.emit('switch.initiated', {
        from: fromChannel || 'none',
        to: targetChannel.id,
        reason,
      });

      this.logger.info('Initiating channel switch', {
        from: fromChannel,
        to: targetChannel.id,
        reason,
      });

      await this.setCurrentChannel(targetChannel.id);

      this.emit('switch.completed', {
        from: fromChannel || 'none',
        to: targetChannel.id,
      });

      this.logger.info('Channel switch completed', {
        from: fromChannel,
        to: targetChannel.id,
      });

      // Обрабатываем буферизованные запросы
      this.buffer.processAll();
    } catch (error) {
      this.emit('switch.failed', {
        from: fromChannel || 'none',
        to: 'unknown',
        error: error as Error,
      });

      this.logger.error('Channel switch failed', error as Error, { reason });
      throw error;
    } finally {
      this.isSwitching = false;
    }
  }

  getAvailableChannels(): BaseChannel[] {
    return Array.from(this.channels.values())
      .filter((channel) => channel.canUse())
      .sort((a, b) => b.priority - a.priority);
  }

  getCurrentChannel(): BaseChannel | null {
    return this.currentChannel;
  }

  getChannelStatus(channelId: string): ChannelStatus | null {
    const channel = this.channels.get(channelId);
    return channel?.status || null;
  }

  async send<T>(data: any, critical: boolean = false): Promise<T> {
    if (!this.currentChannel) {
      throw new Error('No current channel selected');
    }

    if (this.isSwitching && !critical) {
      return this.bufferRequest<T>(data);
    }

    try {
      const response = await this.currentChannel.send<T>(data);
      return response.data;
    } catch (error) {
      this.logger.error('Send failed, attempting channel switch', error as Error, {
        channelId: this.currentChannel.id,
      });

      if (!this.isSwitching) {
        await this.switchChannel('send failure');

        // Повторяем запрос после переключения
        const newChannel = this.currentChannel;
        if (newChannel) {
          const response = await newChannel.send<T>(data);
          return response.data;
        }
      }

      throw error;
    }
  }

  private bufferRequest<T>(data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const bufferedRequest = {
        id: requestId,
        request: () => this.send<T>(data, true),
        resolve,
        reject,
        timestamp: Date.now(),
        critical: false,
      };

      this.buffer.add(bufferedRequest);
      this.logger.debug('Request buffered during switch', { requestId });
    });
  }

  async shutdown(): Promise<void> {
    this.buffer.clear();

    for (const channel of this.channels.values()) {
      await channel.shutdown();
    }

    this.channels.clear();
    this.currentChannel = null;
  }
}

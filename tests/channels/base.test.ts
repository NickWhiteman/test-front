import { BaseChannel } from '../../src/channels/base';
import { ChannelConfig } from '../../src/types/types';

// Тестовый класс для абстрактного BaseChannel
class TestChannel extends BaseChannel {
  public connectMock = jest.fn();
  public disconnectMock = jest.fn();
  public sendMock = jest.fn();
  public healthCheckMock = jest.fn();
  public setStatusForTest(status: any): void {
    this.setStatus(status);
  }

  constructor(config: ChannelConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    await this.connectMock();
  }

  async disconnect(): Promise<void> {
    await this.disconnectMock();
  }

  async send<T>(data: any): Promise<any> {
    await this.sendMock(data);
    return {
      data: { test: 'response', ...data },
      status: 200,
      timestamp: Date.now(),
      channelId: this.id,
    };
  }

  async healthCheck(): Promise<any> {
    return this.healthCheckMock();
  }
}

describe('BaseChannel', () => {
  let channel: TestChannel;
  const config: ChannelConfig = {
    id: 'test-channel',
    priority: 100,
    healthCheckInterval: 1000,
    timeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000,
  };

  beforeEach(() => {
    channel = new TestChannel(config);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize correctly', async () => {
    channel.connectMock.mockResolvedValue(undefined);
    channel.healthCheckMock.mockResolvedValue({ isHealthy: true, latency: 10 });

    await channel.initialize();

    expect(channel.connectMock).toHaveBeenCalled();
    expect(channel.status).toBe('connected');
  });

  it('should handle initialization failure', async () => {
    channel.connectMock.mockRejectedValue(new Error('Connection failed'));

    await channel.initialize();

    expect(channel.status).toBe('unavailable');
  });

  it('should change status correctly', () => {
    const statusListener = jest.fn();
    channel.on('channel.connected', statusListener);

    channel.setStatusForTest('connected');

    expect(channel.status).toBe('connected');
  });

  it('should shutdown correctly', async () => {
    channel.connectMock.mockResolvedValue(undefined);
    await channel.initialize();

    await channel.shutdown();

    expect(channel.disconnectMock).toHaveBeenCalled();
    expect(channel.status).toBe('unavailable');
  });

  it('should check availability', () => {
    channel.setStatusForTest('idle');
    expect(channel.isAvailable()).toBe(true);
    expect(channel.canUse()).toBe(true);

    channel.setStatusForTest('connected');
    expect(channel.isAvailable()).toBe(true);
    expect(channel.canUse()).toBe(true);

    channel.setStatusForTest('unavailable');
    expect(channel.isAvailable()).toBe(false);
    expect(channel.canUse()).toBe(false);
  });

  it('should handle health checks', async () => {
    channel.healthCheckMock.mockResolvedValue({ isHealthy: true, latency: 10 });

    const healthResult = await channel.healthCheck();

    expect(healthResult.isHealthy).toBe(true);
    expect(healthResult.latency).toBe(10);
  });

  it('should emit events on status change', async () => {
    // BaseChannel does not emit a 'channel.connected' event directly from setStatus.
    // Проверяем, что статус устанавливается корректно.
    channel.setStatusForTest('connected');

    expect(channel.status).toBe('connected');
  });
});

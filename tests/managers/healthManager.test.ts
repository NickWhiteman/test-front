import { HealthManager } from '../../src/managers/healthManager';
import { BaseChannel } from '../../src/channels/base';
import { ChannelConfig } from '../../src/types/types';

class TestChannel extends BaseChannel {
  public healthCheckMock = jest.fn();

  constructor(config: ChannelConfig) {
    super(config);
  }

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async send<T>(data: any): Promise<any> {
    return { data, status: 200, timestamp: Date.now(), channelId: this.id };
  }
  async healthCheck(): Promise<any> {
    return this.healthCheckMock();
  }

  public setStatusForTest(status: any): void {
    this.setStatus(status);
  }
}

describe('HealthManager', () => {
  let manager: HealthManager;

  beforeEach(() => {
    manager = new HealthManager(10); // small interval for tests
  });

  it('should force health check and return result', async () => {
    const ch = new TestChannel({
      id: 'hc',
      priority: 1,
      healthCheckInterval: 1000,
      timeout: 1000,
      retryAttempts: 1,
      retryDelay: 100,
    } as any);
    ch.healthCheckMock.mockResolvedValue({ isHealthy: true, latency: 5 });

    manager.registerChannel(ch);

    const res = await manager.forceHealthCheck('hc');
    expect(res.isHealthy).toBe(true);

    const status = manager.getChannelHealth('hc');
    expect(status.status).toBe(ch.status);

    manager.shutdown();
  });

  it('should throw if channel not found', async () => {
    await expect(manager.forceHealthCheck('nope')).rejects.toThrow('Channel nope not found');
  });
});

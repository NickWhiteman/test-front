import { ConnectionService } from '../../src/services/connectionService';
import { BaseChannel } from '../../src/channels/base';
import { ChannelConfig } from '../../src/types/types';

class TestChannel extends BaseChannel {
  public initializeMock = jest.fn();
  public sendMock = jest.fn();
  public healthCheckMock = jest.fn();

  constructor(config: ChannelConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    this.initializeMock();
  }
  async disconnect(): Promise<void> {}
  async send<T>(data: any): Promise<any> {
    this.sendMock(data);
    return { data, status: 200, timestamp: Date.now(), channelId: this.id };
  }
  async healthCheck(): Promise<any> {
    return this.healthCheckMock();
  }

  public setStatusForTest(status: any): void {
    this.setStatus(status);
  }
}

describe('ConnectionService', () => {
  it('should throw when sending before initialize', async () => {
    const svc = new ConnectionService();
    await expect(svc.send({})).rejects.toThrow('ConnectionService not initialized');
  });

  it('should initialize and send via current channel', async () => {
    const ch = new TestChannel({
      id: 'svc-ch',
      priority: 2,
      healthCheckInterval: 1000,
      timeout: 1000,
      retryAttempts: 1,
      retryDelay: 100,
    } as any);

    // mock initialize to set status
    ch.initialize = jest.fn().mockImplementation(async () => {
      ch.setStatusForTest('connected');
    });

    ch.healthCheckMock.mockResolvedValue({ isHealthy: true, latency: 1 });

    const svc = new ConnectionService();

    await svc.initialize([ch]);

    expect(svc.getCurrentChannelId()).toBe('svc-ch');

    const res = await svc.send({ msg: 'hello' });
    expect(res).toEqual({ msg: 'hello' });

    await svc.shutdown();
  });
});

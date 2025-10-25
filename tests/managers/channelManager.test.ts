import { ChannelManager } from '../../src/managers/channelManager';
import { BaseChannel } from '../../src/channels/base';
import { ChannelConfig } from '../../src/types/types';

class TestChannel extends BaseChannel {
  public connectMock = jest.fn();
  public disconnectMock = jest.fn();
  public sendMock = jest.fn();
  public healthCheckMock = jest.fn();
  // публичный тестовый метод-обёртка для установки статуса
  public setStatusForTest(status: any): void {
    // protected setStatus доступен внутри подкласса
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
      data: { echo: data },
      status: 200,
      timestamp: Date.now(),
      channelId: this.id,
    };
  }

  async healthCheck(): Promise<any> {
    return this.healthCheckMock();
  }
}

describe('ChannelManager', () => {
  let manager: ChannelManager;

  beforeEach(() => {
    manager = new ChannelManager();
  });

  it('should register channels and pick highest priority on switch', async () => {
    const a = new TestChannel({
      id: 'a',
      priority: 1,
      healthCheckInterval: 1000,
      timeout: 1000,
      retryAttempts: 1,
      retryDelay: 100,
    } as any);
    const b = new TestChannel({
      id: 'b',
      priority: 5,
      healthCheckInterval: 1000,
      timeout: 1000,
      retryAttempts: 1,
      retryDelay: 100,
    } as any);

    a.setStatusForTest('connected');
    b.setStatusForTest('idle');

    manager.registerChannel(a);
    manager.registerChannel(b);

    await manager.setCurrentChannel('a');
    expect(manager.getCurrentChannel()?.id).toBe('a');

    await manager.switchChannel('test-switch');

    // b has higher priority and should be selected
    expect(manager.getCurrentChannel()?.id).toBe('b');
  });

  it('should attempt to switch on send failure and return data from new channel', async () => {
    const a = new TestChannel({
      id: 'a',
      priority: 1,
      healthCheckInterval: 1000,
      timeout: 1000,
      retryAttempts: 1,
      retryDelay: 100,
    } as any);
    const b = new TestChannel({
      id: 'b',
      priority: 5,
      healthCheckInterval: 1000,
      timeout: 1000,
      retryAttempts: 1,
      retryDelay: 100,
    } as any);

    // a will reject send, b will succeed
    // make a.sendMock throw synchronously to avoid unhandled promise rejections
    a.sendMock = jest.fn().mockImplementation(() => {
      throw new Error('send fail');
    });
    b.sendMock = jest
      .fn()
      .mockImplementation((d) => Promise.resolve({ data: d, status: 200, timestamp: Date.now(), channelId: 'b' }));

    // force statuses
    a.setStatusForTest('connected');
    b.setStatusForTest('idle');

    manager.registerChannel(a);
    manager.registerChannel(b);

    await manager.setCurrentChannel('a');

    const result = await manager.send({ hello: 'world' } as any);

    expect(result).toEqual({ echo: { hello: 'world' } });
    expect(manager.getCurrentChannel()?.id).toBe('b');
  });
});

import { WebSocketChannel } from '../../src/channels/websocket';
import { ChannelConfig } from '../../src/types/types';

describe('WebSocketChannel', () => {
  let channel: WebSocketChannel;
  const config: ChannelConfig = {
    id: 'ws-test',
    priority: 10,
    healthCheckInterval: 1000,
    timeout: 2000,
    retryAttempts: 1,
    retryDelay: 100,
    // @ts-ignore - WebSocketChannel expects additional props
    url: 'ws://localhost',
  } as any;

  beforeEach(() => {
    channel = new WebSocketChannel(config as any);
  });

  it('should report unhealthy when ws is not initialized', async () => {
    const result = await channel.healthCheck();

    expect(result.isHealthy).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('onMessage should not throw when no socket', () => {
    expect(() => channel.onMessage(() => {})).not.toThrow();
  });
});

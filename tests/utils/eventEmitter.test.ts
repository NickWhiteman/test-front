import { TypedEventEmitter } from '../../src/utils/eventEmitter';

describe('TypedEventEmitter', () => {
  let emitter: TypedEventEmitter;

  beforeEach(() => {
    emitter = new TypedEventEmitter();
  });

  afterEach(() => {
    emitter.removeAllListeners();
  });

  it('should emit and receive events', () => {
    const mockCallback = jest.fn();

    emitter.on('channel.connected', mockCallback);
    emitter.emit('channel.connected', { channelId: 'test', previousChannelId: 'prev' });

    expect(mockCallback).toHaveBeenCalledWith({
      channelId: 'test',
      previousChannelId: 'prev',
    });
  });

  it('should handle multiple events', () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();

    emitter.on('channel.connected', mockCallback1);
    emitter.on('channel.disconnected', mockCallback2);

    emitter.emit('channel.connected', { channelId: 'test1', previousChannelId: 'prev1' });
    emitter.emit('channel.disconnected', { channelId: 'test2', reason: 'test' });

    expect(mockCallback1).toHaveBeenCalledWith({
      channelId: 'test1',
      previousChannelId: 'prev1',
    });
    expect(mockCallback2).toHaveBeenCalledWith({
      channelId: 'test2',
      reason: 'test',
    });
  });

  it('should remove specific listeners', () => {
    const mockCallback = jest.fn();

    emitter.on('channel.connected', mockCallback);
    emitter.off('channel.connected', mockCallback);
    emitter.emit('channel.connected', { channelId: 'test', previousChannelId: 'prev' });

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should handle once listeners', () => {
    const mockCallback = jest.fn();

    emitter.once('channel.connected', mockCallback);
    emitter.emit('channel.connected', { channelId: 'test1', previousChannelId: 'prev1' });
    emitter.emit('channel.connected', { channelId: 'test2', previousChannelId: 'prev2' });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({
      channelId: 'test1',
      previousChannelId: 'prev1',
    });
  });

  it('should remove all listeners', () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();

    emitter.on('channel.connected', mockCallback1);
    emitter.on('channel.disconnected', mockCallback2);

    emitter.removeAllListeners('channel.connected');
    emitter.emit('channel.connected', { channelId: 'test', previousChannelId: 'prev' });
    emitter.emit('channel.disconnected', { channelId: 'test', reason: 'test' });

    expect(mockCallback1).not.toHaveBeenCalled();
    expect(mockCallback2).toHaveBeenCalled();
  });
});

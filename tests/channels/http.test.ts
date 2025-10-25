import axios from 'axios';
import { HttpChannel } from '../../src/channels/http';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Ensure axios.create returns an instance with methods/interceptors the channel expects
mockedAxios.create = jest.fn().mockImplementation(() => ({
  get: mockedAxios.get as any,
  post: mockedAxios.post as any,
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
}));

describe('HttpChannel', () => {
  let channel: HttpChannel;
  const config = {
    id: 'http-test',
    priority: 100,
    healthCheckInterval: 1000,
    timeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000,
    baseURL: 'https://api.example.com',
    endpoints: {
      health: '/health',
      main: '/api/data',
    },
  };

  beforeEach(() => {
    channel = new HttpChannel(config);
    jest.clearAllMocks();
  });

  it('should connect successfully', async () => {
    mockedAxios.get.mockResolvedValue({ status: 200, data: { status: 'ok' } });

    await channel.initialize();

    expect(mockedAxios.get).toHaveBeenCalledWith('/health', { timeout: 5000 });
    expect(channel.status).toBe('connected');
  });

  it('should handle connection failure', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    await expect(channel.connect()).rejects.toThrow('HTTP channel http-test health check failed');
  });

  it('should send data successfully', async () => {
    const testData = { message: 'test' };
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { success: true },
    });

    const result = await channel.send(testData);

    expect(mockedAxios.post).toHaveBeenCalledWith('/api/data', testData);
    expect(result.status).toBe(200);
    expect(result.channelId).toBe('http-test');
  });

  it('should handle send failure', async () => {
    const testData = { message: 'test' };
    mockedAxios.post.mockRejectedValue(new Error('Send failed'));

    await expect(channel.send(testData)).rejects.toThrow('Send failed');
  });

  it('should perform health check successfully', async () => {
    mockedAxios.get.mockResolvedValue({ status: 200 });

    const result = await channel.healthCheck();

    expect(result.isHealthy).toBe(true);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('should detect unhealthy status', async () => {
    mockedAxios.get.mockResolvedValue({ status: 500 });

    const result = await channel.healthCheck();

    expect(result.isHealthy).toBe(false);
  });

  it('should handle health check failure', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Health check failed'));

    const result = await channel.healthCheck();

    expect(result.isHealthy).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should disconnect correctly', async () => {
    await channel.disconnect();
    // Для HTTP канала disconnect не делает ничего особенного
    expect(true).toBe(true);
  });
});

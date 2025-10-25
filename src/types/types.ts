export interface ChannelResponse<T = any> {
  data: T;
  status: number;
  timestamp: number;
  channelId: string;
}

export type ChannelStatus = 'idle' | 'connected' | 'unavailable';

export interface ChannelConfig {
  id: string;
  priority: number;
  healthCheckInterval: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface ConnectionEventMap {
  'channel.connected': { channelId: string; previousChannelId?: string };
  'channel.disconnected': { channelId: string; reason: string };
  'channel.unavailable': { channelId: string; error: Error };
  'channel.recovered': { channelId: string };
  'switch.started': { from: string; to: string };
  'switch.completed': { from: string; to: string };
  'switch.failed': { from: string; to: string; error: Error };
  'switch.initiated': { from: string; to: string; reason: string };
  'health.check': { channelId: string; status: ChannelStatus };
  'no.available.channels': { currentChannel: string };
  error: { error: Error; context: string };
}

export type ConnectionEvent = keyof ConnectionEventMap;

export interface HealthCheckResult {
  isHealthy: boolean;
  latency: number;
  error?: Error;
}

export interface BufferedRequest<T = any> {
  id: string;
  request: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  timestamp: number;
  critical: boolean;
}

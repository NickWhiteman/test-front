import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { BaseChannel } from './base';
import { ChannelConfig, ChannelResponse, HealthCheckResult } from '../types/types';

export interface HttpChannelConfig extends ChannelConfig {
  baseURL: string;
  endpoints: {
    health: string;
    main: string;
  };
  axiosConfig?: AxiosRequestConfig;
}

export class HttpChannel extends BaseChannel {
  private client: AxiosInstance;
  private httpConfig: HttpChannelConfig;

  constructor(config: HttpChannelConfig) {
    super(config);
    this.httpConfig = config;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      ...config.axiosConfig,
    });

    // Добавляем интерсепторы для логирования
    this.client.interceptors.request.use(
      (request) => {
        this.logger.debug('HTTP request', {
          channelId: this.id,
          url: request.url,
          method: request.method,
        });
        return request;
      },
      (error) => {
        this.logger.error('HTTP request failed', error, { channelId: this.id });
        return Promise.reject(error);
      },
    );

    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug('HTTP response', {
          channelId: this.id,
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        this.logger.error('HTTP response error', error, { channelId: this.id });
        return Promise.reject(error);
      },
    );
  }

  async connect(): Promise<void> {
    // Для HTTP канала подключение - это успешный health check
    const health = await this.healthCheck();
    if (!health.isHealthy) {
      throw new Error(`HTTP channel ${this.id} health check failed`);
    }
  }

  async disconnect(): Promise<void> {
    // Для HTTP канала отключение не требует специальных действий
    this.client = axios.create(); // Создаем новый инстанс
  }

  async send<T>(data: any): Promise<ChannelResponse<T>> {
    try {
      const response = await this.client.post(this.httpConfig.endpoints.main, data);

      return {
        data: response.data,
        status: response.status,
        timestamp: Date.now(),
        channelId: this.id,
      };
    } catch (error) {
      this.logger.error('Send failed', error as Error, { channelId: this.id });
      throw error;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.get(this.httpConfig.endpoints.health, {
        timeout: this.config.timeout,
      });

      return {
        isHealthy: response.status >= 200 && response.status < 300,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        isHealthy: false,
        latency: Date.now() - startTime,
        error: error as Error,
      };
    }
  }
}

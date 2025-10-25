import { BufferedRequest } from '../types/types';
import { Logger } from './logger';

export class RequestBuffer {
  private buffer: Map<string, BufferedRequest> = new Map();
  private maxSize: number;
  private maxAge: number;
  private logger = Logger.getInstance();

  constructor(maxSize: number = 100, maxAge: number = 30000) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  add<T>(request: BufferedRequest<T>): void {
    // Очистка старых запросов
    this.cleanup();

    if (this.buffer.size >= this.maxSize) {
      this.logger.warn('Request buffer is full, removing oldest request');
      const oldest = Array.from(this.buffer.entries()).sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      if (oldest) {
        this.buffer.delete(oldest[0]);
      }
    }

    this.buffer.set(request.id, request);
    this.logger.debug(`Request buffered`, { id: request.id, bufferSize: this.buffer.size });
  }

  get<T>(id: string): BufferedRequest<T> | undefined {
    return this.buffer.get(id) as BufferedRequest<T> | undefined;
  }

  remove(id: string): boolean {
    return this.buffer.delete(id);
  }

  processAll(): void {
    this.logger.debug('Processing all buffered requests', { count: this.buffer.size });

    for (const [id, request] of this.buffer.entries()) {
      try {
        request
          .request()
          .then((result) => request.resolve(result))
          .catch((error) => request.reject(error))
          .finally(() => this.buffer.delete(id));
      } catch (error) {
        request.reject(error);
        this.buffer.delete(id);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, request] of this.buffer.entries()) {
      if (now - request.timestamp > this.maxAge) {
        this.buffer.delete(id);
        request.reject(new Error('Request buffer timeout'));
        this.logger.debug('Removed expired buffered request', { id });
      }
    }
  }

  get size(): number {
    return this.buffer.size;
  }

  clear(): void {
    for (const [id, request] of this.buffer.entries()) {
      request.reject(new Error('Buffer cleared'));
    }
    this.buffer.clear();
  }
}

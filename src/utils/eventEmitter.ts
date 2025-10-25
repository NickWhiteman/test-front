import { EventEmitter } from 'eventemitter3';
import { ConnectionEvent, ConnectionEventMap } from '../types/types';

export class TypedEventEmitter {
  private emitter = new EventEmitter();

  emit<T extends ConnectionEvent>(event: T, data: ConnectionEventMap[T]): boolean {
    return this.emitter.emit(event, data);
  }

  on<T extends ConnectionEvent>(event: T, listener: (data: ConnectionEventMap[T]) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  once<T extends ConnectionEvent>(event: T, listener: (data: ConnectionEventMap[T]) => void): this {
    this.emitter.once(event, listener);
    return this;
  }

  off<T extends ConnectionEvent>(event: T, listener: (data: ConnectionEventMap[T]) => void): this {
    this.emitter.off(event, listener);
    return this;
  }

  removeAllListeners(event?: ConnectionEvent): this {
    this.emitter.removeAllListeners(event);
    return this;
  }
}

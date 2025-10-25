import { Logger } from '../src/utils/logger';

// Отключаем логи во время тестов
Logger.getInstance().disable();

// Увеличиваем таймауты для асинхронных тестов
jest.setTimeout(10000);

// Мок для setTimeout и setInterval
global.setTimeout = jest.fn((cb: any) => {
  return {
    ref: () => {},
    unref: () => {},
  } as any;
}) as any;

global.setInterval = jest.fn((cb: any) => {
  return {
    ref: () => {},
    unref: () => {},
  } as any;
}) as any;

global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

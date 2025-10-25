import { RequestBuffer } from '../../src/utils/buffer';

describe('RequestBuffer', () => {
  let buffer: RequestBuffer;

  beforeEach(() => {
    buffer = new RequestBuffer(3, 1000); // малый размер и время для тестов
    jest.useFakeTimers();
  });

  afterEach(() => {
    buffer.clear();
    jest.useRealTimers();
  });

  it('should add requests to buffer', () => {
    const mockRequest = jest.fn().mockResolvedValue('result');
    const bufferedRequest = {
      id: 'test-1',
      request: mockRequest,
      resolve: jest.fn(),
      reject: jest.fn(),
      timestamp: Date.now(),
      critical: false,
    };

    buffer.add(bufferedRequest);

    expect(buffer.size).toBe(1);
  });

  it('should remove oldest request when buffer is full', () => {
    const mockResolve = jest.fn();
    const mockReject = jest.fn();

    // Заполняем буфер
    for (let i = 0; i < 4; i++) {
      buffer.add({
        id: `test-${i}`,
        request: jest.fn().mockResolvedValue(`result-${i}`),
        resolve: mockResolve,
        reject: mockReject,
        timestamp: Date.now() + i, // Разное время для определения порядка
        critical: false,
      });
    }

    // Должен остаться только 3 последних запроса
    expect(buffer.size).toBe(3);
  });

  it('should process all buffered requests', async () => {
    const mockRequest = jest.fn().mockResolvedValue('result');
    const mockResolve = jest.fn();
    const mockReject = jest.fn();

    buffer.add({
      id: 'test-1',
      request: mockRequest,
      resolve: mockResolve,
      reject: mockReject,
      timestamp: Date.now(),
      critical: false,
    });

    // processAll uses real microtasks; switch to real timers for this section
    jest.useRealTimers();

    buffer.processAll();

    // Даем очередь задач завершиться
    await new Promise((r) => setImmediate(r));

    expect(mockRequest).toHaveBeenCalled();
    expect(mockResolve).toHaveBeenCalledWith('result');
    expect(buffer.size).toBe(0);
    jest.useFakeTimers();
  });

  it('should cleanup expired requests', () => {
    const mockReject = jest.fn();

    buffer.add({
      id: 'expired',
      request: jest.fn(),
      resolve: jest.fn(),
      reject: mockReject,
      timestamp: Date.now() - 2000, // Протухший запрос
      critical: false,
    });

    // Триггерим очистку добавлением нового запроса
    buffer.add({
      id: 'fresh',
      request: jest.fn(),
      resolve: jest.fn(),
      reject: jest.fn(),
      timestamp: Date.now(),
      critical: false,
    });

    expect(mockReject).toHaveBeenCalledWith(new Error('Request buffer timeout'));
    expect(buffer.size).toBe(1);
  });

  it('should clear all requests', () => {
    const mockReject = jest.fn();

    buffer.add({
      id: 'test-1',
      request: jest.fn(),
      resolve: jest.fn(),
      reject: mockReject,
      timestamp: Date.now(),
      critical: false,
    });

    buffer.clear();

    expect(mockReject).toHaveBeenCalledWith(new Error('Buffer cleared'));
    expect(buffer.size).toBe(0);
  });
});

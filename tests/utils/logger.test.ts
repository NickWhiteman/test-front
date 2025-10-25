import { Logger } from '../../src/utils/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = Logger.getInstance();
    logger.enable();
  });

  it('should log info when enabled', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('test info', { a: 1 });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log warn and error when enabled', () => {
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    logger.warn('warn', { b: 2 });
    logger.error('err', new Error('boom'), { c: 3 });

    expect(spyWarn).toHaveBeenCalled();
    expect(spyError).toHaveBeenCalled();

    spyWarn.mockRestore();
    spyError.mockRestore();
  });

  it('should not log when disabled', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logger.disable();
    logger.info("won't print");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

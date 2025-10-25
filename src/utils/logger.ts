export class Logger {
  private static instance: Logger;
  private enabled: boolean = true;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  info(message: string, context?: any): void {
    if (this.enabled) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, context || '');
    }
  }

  warn(message: string, context?: any): void {
    if (this.enabled) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, context || '');
    }
  }

  error(message: string, error?: Error, context?: any): void {
    if (this.enabled) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, {
        error,
        context,
      });
    }
  }

  debug(message: string, context?: any): void {
    if (this.enabled && process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, context || '');
    }
  }
}

/**
 * Logging utility with different log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private prefix: string;
  private isDev: boolean;

  constructor(prefix: string = '[ExcalidrawSync]') {
    this.prefix = prefix;
    this.isDev = import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.DEV;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `${this.prefix} [${level.toUpperCase()}] ${timestamp} - ${message}`;

    switch (level) {
      case 'debug':
        if (this.isDev) {
          console.debug(formattedMessage, ...args);
        }
        break;
      case 'info':
        console.info(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      case 'error':
        console.error(formattedMessage, ...args);
        break;
    }
  }

  debug(message: string, ...args: any[]): void {
    this.formatMessage('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.formatMessage('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.formatMessage('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.formatMessage('error', message, ...args);
  }
}

// Create singleton instances for different parts of the extension
export const logger = new Logger('[ExcalidrawSync]');
export const contentLogger = new Logger('[Content]');
export const backgroundLogger = new Logger('[Background]');
export const syncLogger = new Logger('[Sync]');

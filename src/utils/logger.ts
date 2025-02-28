import { config } from '../config.js';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

const currentLevel = config.isDev ? LogLevel.DEBUG : LogLevel.INFO;

export class Logger {
  private name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  info(message: string, ...args: any[]): void {
    if (currentLevel >= LogLevel.INFO) {
      console.log(`[${this.name}] ${message}`, ...args);
    }
  }
  
  debug(message: string, ...args: any[]): void {
    if (currentLevel >= LogLevel.DEBUG) {
      console.log(`[DEBUG:${this.name}] ${message}`, ...args);
    }
  }
  
  warn(message: string, ...args: any[]): void {
    if (currentLevel >= LogLevel.WARN) {
      console.warn(`[WARN:${this.name}] ${message}`, ...args);
    }
  }
  
  error(message: string, ...args: any[]): void {
    if (currentLevel >= LogLevel.ERROR) {
      console.error(`[ERROR:${this.name}] ${message}`, ...args);
    }
  }
}

// Create a global logger
export const logger = new Logger('APP'); 
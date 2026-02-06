import fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { LogEvent } from '../types/index.js';

export class BuildLogger extends EventEmitter {
  private streams = new Map<string, fs.WriteStream>();

  attach(modId: string, logPath: string): void {
    this.streams.set(modId, fs.createWriteStream(logPath, { flags: 'a' }));
  }

  log(modId: string, level: LogEvent['level'], message: string): void {
    const event: LogEvent = { modId, level, message, timestamp: new Date().toISOString() };
    const line = `[${event.timestamp}] [${level.toUpperCase()}] ${message}\n`;
    this.streams.get(modId)?.write(line);
    this.emit('log', event);
  }

  close(modId: string): void {
    this.streams.get(modId)?.end();
    this.streams.delete(modId);
  }
}

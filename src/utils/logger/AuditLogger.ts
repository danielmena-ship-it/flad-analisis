type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  action: string;
  details?: any;
  user?: string;
}

class AuditLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  log(level: LogLevel, action: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      action,
      details,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console[level](`[AUDIT] ${action}`, details);
  }

  info(action: string, details?: any) {
    this.log('info', action, details);
  }

  warn(action: string, details?: any) {
    this.log('warn', action, details);
  }

  error(action: string, details?: any) {
    this.log('error', action, details);
  }

  debug(action: string, details?: any) {
    this.log('debug', action, details);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}

export const auditLogger = new AuditLogger();
export type { LogEntry, LogLevel };

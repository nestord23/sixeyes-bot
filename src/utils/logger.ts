const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

type Level = keyof typeof levels;

const colorMap: Record<Level, string> = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[90m',
};

const reset = '\x1b[0m';

function timestamp(): string {
  return new Date().toISOString();
}

function log(level: Level, message: string, ...args: unknown[]): void {
  const color = colorMap[level];
  const prefix = `${color}[${level.toUpperCase()}]${reset}`;
  const formatted = `[${timestamp()}] ${prefix} ${message}`;

  if (args.length > 0) {
    if (level === 'error') {
      console.error(formatted, ...args);
    } else {
      console.log(formatted, ...args);
    }
  } else {
    if (level === 'error') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }
}

export const logger = {
  error: (message: string, ...args: unknown[]) => log('error', message, ...args),
  warn: (message: string, ...args: unknown[]) => log('warn', message, ...args),
  info: (message: string, ...args: unknown[]) => log('info', message, ...args),
  debug: (message: string, ...args: unknown[]) => log('debug', message, ...args),
};

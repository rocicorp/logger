/**
 * A logger interface exposing optional [[error]], [[info]] and [[debug]]
 * methods. The idea is that these gets filled in based on the [[LogLevel]]. If
 * [[LogLevel]] is 'debug' then all three should be present, if it is 'info',
 * then [[error]] and [[info]] should be present and if [[LogLevel]] is 'error'
 * only [[error]] will be present.
 */
export interface OptionalLogger {
  error?(...args: unknown[]): void;
  info?(...args: unknown[]): void;
  debug?(...args: unknown[]): void;
}

/**
 * The different log levels. This is used to determine how much logging to do.
 * `'error'` > `'info'` > `'debug'`... meaning `'error'` has highest priority
 * and `'debug'` lowest.
 */
export type LogLevel = 'error' | 'info' | 'debug';

export interface LogSink {
  log(level: LogLevel, ...args: unknown[]): void;
  flush?(): Promise<void>;
}

/**
 * A [[LogSink]] implementation that logs to multiple sinks.
 */
export class TeeLogSink implements LogSink {
  private readonly _sinks: readonly LogSink[];

  constructor(sinks: readonly LogSink[]) {
    this._sinks = sinks;
  }

  log(level: LogLevel, ...args: unknown[]): void {
    for (const logger of this._sinks) {
      logger.log(level, ...args);
    }
  }

  async flush(): Promise<void> {
    await Promise.all(this._sinks.map(logger => logger.flush?.()));
  }
}

export class OptionalLoggerImpl implements OptionalLogger {
  readonly debug?: (...args: unknown[]) => void = undefined;
  readonly info?: (...args: unknown[]) => void = undefined;
  readonly error?: (...args: unknown[]) => void = undefined;

  constructor(logSink: LogSink, level: LogLevel = 'info') {
    const impl =
      (level: LogLevel) =>
      (...args: unknown[]) =>
        logSink.log(level, ...args);

    /* eslint-disable no-fallthrough , @typescript-eslint/ban-ts-comment */
    switch (level) {
      // @ts-ignore
      case 'debug':
        this.debug = impl('debug');
      // @ts-ignore
      case 'info':
        this.info = impl('info');
      case 'error':
        this.error = impl('error');
    }
    /* eslint-enable @typescript-eslint/ban-ts-comment, no-fallthrough */
  }
}

/**
 * Create a logger that will log to the console.
 */
export class ConsoleLogger extends OptionalLoggerImpl {
  constructor(level: LogLevel) {
    super(consoleLogSink, level);
  }
}

/**
 * An implementation of [[LogSink]] that logs using `console.log` etc
 */
export const consoleLogSink: LogSink = {
  log(level: LogLevel, ...args: unknown[]): void {
    console[level](...args);
  },
};

/**
 * A console logger that enables the caller to format log lines.
 */
export class FormatLogger implements LogSink {
  private _format: (level: LogLevel, ...args: unknown[]) => unknown[];

  constructor(format: (level: LogLevel, ...args: unknown[]) => unknown[]) {
    this._format = format;
  }

  log(level: LogLevel, ...args: unknown[]): void {
    console[level](...this._format(level, ...args));
  }
}

/**
 * A console logger that prefixes log lines with a log level.
 */
export const nodeConsoleLogSink: LogSink = {
  log(level: LogLevel, ...args: unknown[]): void {
    console[level](logLevelPrefix[level], ...args);
  },
};

/**
 * Log line level prefixes, used by the node logger. They are uniform length
 * to make visual parsing of a log file easier.
 */
export const logLevelPrefix = {
  error: 'ERR',
  info: 'INF',
  debug: 'DBG',
};

/**
 * A logger that logs nothing.
 */
export class SilentLogger implements OptionalLogger {}

/**
 * The LogContext carries a contextual tag around and it prefixes the log
 * messages with a tag.
 *
 * Typical usage is something like:
 *
 *   const lc = new LogContext('debug');
 *   lc.debug?.('hello');
 *   const lc2 = lc.addContext('foo');
 *   f(lc2);  // logging inside f will be prefixed with 'foo'
 */
export class LogContext extends OptionalLoggerImpl {
  private readonly _logSink: LogSink;
  private readonly _level: LogLevel;

  constructor(level: LogLevel = 'info', logSink: LogSink = consoleLogSink) {
    super(logSink, level);
    this._level = level;
    this._logSink = logSink;
  }

  /**
   * Creates a new Logger that will prefix all log messages with the given key
   * and value.
   */
  addContext(key: string, value?: unknown): LogContext {
    const ctx = value === undefined ? key : `${key}=${value}`;
    const logSink: LogSink = {
      log: (level, ...args) => {
        this._logSink.log(level, ctx, ...args);
      },
    };
    return new LogContext(this._level, logSink);
  }
}

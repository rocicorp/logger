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
 * An implementation of [[Logger]] that logs using `console.log` etc
 */
export const consoleLogSink: LogSink = {
  log(level: LogLevel, ...args: unknown[]): void {
    console[level](...args);
  },
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
  private readonly _tag: string;
  private readonly _logSink: LogSink;
  private readonly _level: LogLevel;

  constructor();
  constructor(level: LogLevel, tag?: string);
  constructor(logSink: LogSink, level?: LogLevel, tag?: string);
  constructor(
    levelOrLogSink?: LogLevel | LogSink,
    levelOrTag?: LogLevel | string,
    tag?: string,
  ) {
    let logSink: LogSink;
    let level: LogLevel;

    if (!levelOrLogSink) {
      // No args: constructor();
      logSink = consoleLogSink;
      level = 'info';
    } else if (isLogLevel(levelOrLogSink)) {
      // No sink: constructor(level: LogLevel, tag?: string);
      logSink = consoleLogSink;
      level = levelOrLogSink;
      tag = levelOrTag;
    } else {
      // constructor(logSink: LogSink, level?: LogLevel, tag?: string);
      logSink = levelOrLogSink;
      if (levelOrTag) {
        level = levelOrTag as LogLevel;
      } else {
        level = 'info';
      }
      tag ??= '';
    }

    super(prependTag(logSink, tag), level);
    this._logSink = logSink;
    this._level = level ?? 'info';
    this._tag = tag ?? '';
  }

  /**
   * Creates a new Logger that will prefix all log messages with the given key
   * and value.
   */
  addContext(key: string, value?: unknown): LogContext {
    const space = this._tag ? ' ' : '';
    const ctx = value === undefined ? key : `${key}=${value}`;
    const tag = `${this._tag}${space}${ctx}`;
    return new LogContext(this._logSink, this._level, tag);
  }
}

function isLogLevel(v: unknown): v is LogLevel {
  switch (v) {
    case 'error':
    case 'info':
    case 'debug':
      return true;
  }
  return false;
}

function prependTag(logSink: LogSink, tag: string | undefined): LogSink {
  if (!tag) {
    return logSink;
  }

  return {
    log(level, ...args) {
      logSink.log(level, tag, ...args);
    },
  };
}

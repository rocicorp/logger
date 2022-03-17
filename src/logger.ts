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

export interface Logger {
  log(level: LogLevel, ...args: unknown[]): void;
  flush?(): Promise<void>;
}

export class OptionalLoggerImpl implements OptionalLogger {
  readonly debug?: (...args: unknown[]) => void = undefined;
  readonly info?: (...args: unknown[]) => void = undefined;
  readonly error?: (...args: unknown[]) => void = undefined;

  constructor(logger: Logger, level: LogLevel = 'info') {
    const impl =
      (level: LogLevel) =>
      (...args: unknown[]) =>
        logger.log(level, ...args);

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
    /* eslint-ensable @typescript-eslint/ban-ts-comment, no-fallthrough */
  }
}

/**
 * Create a logger that will log to the console.
 */
export class ConsoleLogger extends OptionalLoggerImpl {
  constructor(level: LogLevel) {
    super(consoleLogger, level);
  }
}

/**
 * An implementation of [[Logger]] that logs using `console.log` etc
 */
export const consoleLogger: Logger = {
  log(level: LogLevel, ...args: unknown[]): void {
    console[level](...args);
  },
};

/**
 * A logger that logs nothing.
 */
export class SilentLogger implements OptionalLogger {
  error() {
    // We want at least error to be defined but it can be a noop. This is
    // because when composing loggers getLogLevel will return error for silent
    // logger.
  }
}

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
  private readonly _s: string;
  private readonly _logger: OptionalLogger;

  /**
   * @param loggerOrLevel If passed a LogLevel a ConsoleLogget is used
   */
  constructor(loggerOrLevel: OptionalLogger | LogLevel = 'info', tag = '') {
    const actualLogger: OptionalLogger = isLogLevel(loggerOrLevel)
      ? new OptionalLoggerImpl(consoleLogger, loggerOrLevel)
      : loggerOrLevel;

    super(
      {
        log: tag
          ? (name, ...args) =>
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              actualLogger[name]!(tag, ...args)
          : (name, ...args) =>
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              actualLogger[name]!(...args),
      },
      getLogLevel(actualLogger),
    );
    this._s = tag;
    this._logger = actualLogger;
  }

  /**
   * Creates a new Logger that will prefix all log messages with the given key
   * and value.
   */
  addContext(key: string, value?: unknown): LogContext {
    const space = this._s ? ' ' : '';
    const tag = value === undefined ? key : `${key}=${value}`;
    return new LogContext(this._logger, `${this._s}${space}${tag}`);
  }
}

function getLogLevel(logger: OptionalLogger): LogLevel {
  return logger.debug ? 'debug' : logger.info ? 'info' : 'error';
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

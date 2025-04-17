/**
 * A logger interface exposing optional [[error]], [[info]] and [[debug]]
 * methods. The idea is that these gets filled in based on the [[LogLevel]]. If
 * [[LogLevel]] is 'debug' then all three should be present, if it is 'info',
 * then [[error]] and [[info]] should be present and if [[LogLevel]] is 'error'
 * only [[error]] will be present.
 */
export interface OptionalLogger {
  error?: ((...args: unknown[]) => void) | undefined;
  info?: ((...args: unknown[]) => void) | undefined;
  warn?: ((...args: unknown[]) => void) | undefined;
  debug?: ((...args: unknown[]) => void) | undefined;
  flush?: (() => Promise<void>) | undefined;
}

/**
 * The different log levels. This is used to determine how much logging to do.
 * `'error'` > `'info'` > `'debug'`... meaning `'error'` has highest priority
 * and `'debug'` lowest.
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * A Context ferries additional information that can be associated with
 * each logged message. The handling of the information in the Context is
 * specific to the LogSink; text-only implementations generally prepend
 * stringified representations of the Context's properties to the logged
 * message.
 */
export type Context = {
  [key: string]: unknown | undefined;
};

export interface LogSink {
  log(level: LogLevel, context: Context | undefined, ...args: unknown[]): void;
  flush?(): Promise<void>;
}

/**
 * A [[LogSink]] implementation that logs to multiple sinks.
 */
export class TeeLogSink implements LogSink {
  readonly #sinks: readonly LogSink[];

  constructor(sinks: readonly LogSink[]) {
    this.#sinks = sinks;
  }

  log(level: LogLevel, context: Context | undefined, ...args: unknown[]): void {
    for (const logger of this.#sinks) {
      logger.log(level, context, ...args);
    }
  }

  async flush(): Promise<void> {
    await Promise.all(this.#sinks.map(logger => logger.flush?.()));
  }
}

export class OptionalLoggerImpl implements OptionalLogger {
  readonly debug?: ((...args: unknown[]) => void) | undefined = undefined;
  readonly info?: ((...args: unknown[]) => void) | undefined = undefined;
  readonly warn?: ((...args: unknown[]) => void) | undefined = undefined;
  readonly error?: ((...args: unknown[]) => void) | undefined = undefined;
  readonly flush: () => Promise<void>;

  constructor(logSink: LogSink, level: LogLevel = 'info', context?: Context) {
    const impl =
      (level: LogLevel) =>
      (...args: unknown[]) =>
        logSink.log(level, context, ...args);

    /* eslint-disable no-fallthrough , @typescript-eslint/ban-ts-comment */
    switch (level) {
      // @ts-ignore
      case 'debug':
        this.debug = impl('debug');
      // @ts-ignore
      case 'info':
        this.info = impl('info');
      // @ts-ignore
      case 'warn':
        this.warn = impl('warn');
      // @ts-ignore
      case 'error':
        this.error = impl('error');
    }
    /* eslint-enable @typescript-eslint/ban-ts-comment, no-fallthrough */

    this.flush = () => logSink.flush?.() ?? Promise.resolve();
  }
}

/**
 * Create a logger that will log to the console.
 */
export class ConsoleLogger extends OptionalLoggerImpl {
  constructor(level: LogLevel, context?: Context) {
    super(consoleLogSink, level, context);
  }
}

/**
 * An implementation of [[LogSink]] that logs using `console.log` etc
 */
export const consoleLogSink: LogSink = {
  log(level: LogLevel, context: Context | undefined, ...args: unknown[]): void {
    console[level](...stringified(context), ...args.map(normalizeArgument));
  },
};

/**
 * A console logger that enables the caller to format log lines.
 */
export class FormatLogger implements LogSink {
  #format: (level: LogLevel, ...args: unknown[]) => unknown[];

  constructor(format: (level: LogLevel, ...args: unknown[]) => unknown[]) {
    this.#format = format;
  }

  log(level: LogLevel, context: Context | undefined, ...args: unknown[]): void {
    console[level](...this.#format(level, ...stringified(context), ...args));
  }
}

/**
 * A console logger that prefixes log lines with a log level.
 */
export const nodeConsoleLogSink: LogSink = {
  log(level: LogLevel, context: Context | undefined, ...args: unknown[]): void {
    console[level](
      logLevelPrefix[level],
      ...stringified(context),
      ...args.map(normalizeArgument),
    );
  },
};

/**
 * Log line level prefixes, used by the node logger. They are uniform length
 * to make visual parsing of a log file easier.
 */
export const logLevelPrefix = {
  error: 'ERR',
  warn: 'WRN',
  info: 'INF',
  debug: 'DBG',
};

/**
 * A logger that logs nothing.
 */
export class SilentLogger implements OptionalLogger {}

/**
 * The LogContext facilitates constructing and adding to the
 * Context passed to the LogSink.
 *
 * Typical usage is something like:
 *
 *   const lc = new LogContext('debug');
 *   lc.debug?.('hello');
 *   const lc2 = lc.withContext('foo');
 *   f(lc2);  // logging inside f will contain 'foo' in the Context.
 */
export class LogContext extends OptionalLoggerImpl {
  readonly #logSink: LogSink;
  readonly #level: LogLevel;
  readonly #context: Context | undefined;

  constructor(
    level: LogLevel = 'info',
    context?: Context,
    logSink: LogSink = consoleLogSink,
  ) {
    super(logSink, level, context);
    this.#level = level;
    this.#logSink = logSink;
    this.#context = context;
  }

  /**
   * Creates a new Logger that with the given key and value
   * added to the logged Context.
   */
  withContext(key: string, value?: unknown): LogContext {
    const ctx = {...this.#context, [key]: value};
    return new LogContext(this.#level, ctx, this.#logSink);
  }
}

function stringified(context: Context | undefined): unknown[] {
  const args = [];
  for (const [k, v] of Object.entries(context ?? {})) {
    const arg = v === undefined ? k : `${k}=${v}`;
    args.push(arg);
  }
  return args;
}

function normalizeArgument(
  v: unknown,
): string | number | boolean | null | undefined | symbol | bigint {
  switch (typeof v) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'undefined':
    case 'symbol':
    case 'bigint':
      return v;
    case 'object':
      if (v === null) {
        return null;
      }
      break;
  }
  return JSON.stringify(v, errorReplacer);
}

function errorReplacer(_key: string | symbol, v: unknown) {
  if (v instanceof Error) {
    return {
      name: v.name,
      message: v.message,
      stack: v.stack,
      ...('cause' in v ? {cause: v.cause} : null),
    };
  }
  return v;
}

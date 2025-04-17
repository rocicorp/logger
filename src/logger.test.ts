import {afterEach, expect, test, vi} from 'vitest';
import {
  ConsoleLogger,
  consoleLogSink,
  Context,
  FormatLogger,
  LogContext,
  LogSink,
  nodeConsoleLogSink,
  OptionalLoggerImpl,
  TeeLogSink,
  type LogLevel,
} from './logger.js';

const mockConsoleMethod = (level: LogLevel) => {
  const fake = vi.fn();
  vi.spyOn(console, level).mockImplementation(fake);
  return fake;
};

afterEach(() => {
  vi.restoreAllMocks();
});

test('level to method', () => {
  const mockDebug = mockConsoleMethod('debug');
  const mockInfo = mockConsoleMethod('info');
  const mockWarn = mockConsoleMethod('warn');
  const mockError = mockConsoleMethod('error');

  {
    const l = new ConsoleLogger('error');
    expect(l.debug).toBe(undefined);
    expect(l.info).toBe(undefined);
    expect(l.warn).toBe(undefined);
    expect(l.error).toBeInstanceOf(Function);

    l.debug?.('aaa');
    l.info?.('bbb');
    l.warn?.('ccc');
    l.error?.('ddd');
    expect(mockDebug).not.toBeCalled();
    expect(mockInfo).not.toBeCalled();
    expect(mockWarn).not.toBeCalled();
    expect(mockError).toHaveBeenCalledWith('ddd');
  }

  {
    vi.clearAllMocks();
    const l = new ConsoleLogger('info');
    expect(l.debug).toBe(undefined);
    expect(l.info).toBeInstanceOf(Function);
    expect(l.warn).toBeInstanceOf(Function);
    expect(l.error).toBeInstanceOf(Function);

    l.debug?.('ddd');
    l.info?.('eee');
    l.warn?.('fff');
    l.error?.('ggg');
    expect(mockDebug).not.toBeCalled();
    expect(mockInfo.mock.lastCall).toEqual(['eee']);
    expect(mockWarn.mock.lastCall).toEqual(['fff']);
    expect(mockError.mock.lastCall).toEqual(['ggg']);
  }

  {
    vi.clearAllMocks();
    const l = new ConsoleLogger('debug');
    expect(l.debug).toBeInstanceOf(Function);
    expect(l.info).toBeInstanceOf(Function);
    expect(l.warn).toBeInstanceOf(Function);
    expect(l.error).toBeInstanceOf(Function);

    l.debug?.('ggg');
    l.info?.('hhh');
    l.warn?.('iii');
    l.error?.('jjj');
    expect(mockDebug.mock.lastCall).toEqual(['ggg']);
    expect(mockInfo.mock.lastCall).toEqual(['hhh']);
    expect(mockWarn.mock.lastCall).toEqual(['iii']);
    expect(mockError.mock.lastCall).toEqual(['jjj']);
  }
});

test('FormatLogger', () => {
  const mockDebug = mockConsoleMethod('debug');
  const mockInfo = mockConsoleMethod('info');
  const mockWarn = mockConsoleMethod('warn');
  const mockError = mockConsoleMethod('error');

  {
    // nop formatter
    const l = new FormatLogger((_, ...args) => args);
    l.log('debug', undefined, 'aaa');
    l.log('info', {boo: undefined}, 'bbb');
    l.log('warn', {foo: 'bar'}, 'ccc');
    l.log('error', {foo: 'bar'}, 'ddd');

    expect(mockDebug.mock.lastCall).toEqual(['aaa']);
    expect(mockInfo.mock.lastCall).toEqual(['boo', 'bbb']);
    expect(mockWarn.mock.lastCall).toEqual(['foo=bar', 'ccc']);
    expect(mockError.mock.lastCall).toEqual(['foo=bar', 'ddd']);
  }
  {
    // prefix with 'foo'
    const l = new FormatLogger((_, ...args) => ['foo' as unknown].concat(args));
    l.log('debug', undefined, 'aaa');
    l.log('info', {boo: undefined}, 'bbb');
    l.log('warn', {food: 'bard'}, 'ccc');
    l.log('error', {food: 'bard'}, 'ddd');

    expect(mockDebug.mock.lastCall).toEqual(['foo', 'aaa']);
    expect(mockInfo.mock.lastCall).toEqual(['foo', 'boo', 'bbb']);
    expect(mockWarn.mock.lastCall).toEqual(['foo', 'food=bard', 'ccc']);
    expect(mockError.mock.lastCall).toEqual(['foo', 'food=bard', 'ddd']);
  }
});

test('nodeConsoleLogSink', () => {
  const mockDebug = mockConsoleMethod('debug');
  const mockInfo = mockConsoleMethod('info');
  const mockWarn = mockConsoleMethod('warn');
  const mockError = mockConsoleMethod('error');

  {
    vi.clearAllMocks();
    const l = new OptionalLoggerImpl(nodeConsoleLogSink, 'debug', {foo: 'bar'});
    expect(l.debug).toBeInstanceOf(Function);
    expect(l.info).toBeInstanceOf(Function);
    expect(l.warn).toBeInstanceOf(Function);
    expect(l.error).toBeInstanceOf(Function);

    l.debug?.('ggg');
    l.info?.('hhh');
    l.warn?.('iii');
    l.error?.('jjj');
    expect(mockDebug.mock.lastCall).toEqual(['DBG', 'foo=bar', 'ggg']);
    expect(mockInfo.mock.lastCall).toEqual(['INF', 'foo=bar', 'hhh']);
    expect(mockWarn.mock.lastCall).toEqual(['WRN', 'foo=bar', 'iii']);
    expect(mockError.mock.lastCall).toEqual(['ERR', 'foo=bar', 'jjj']);
  }
});

test('LogContext formatting', () => {
  const mockDebug = mockConsoleMethod('debug');

  const lc = new LogContext('debug');
  lc.debug?.('aaa');
  expect(mockDebug.mock.lastCall).toEqual(['aaa']);

  const lc2 = new LogContext('debug').withContext('bbb');
  lc2.debug?.('ccc');
  expect(mockDebug.mock.lastCall).toEqual(['bbb', 'ccc']);

  const lc3 = lc2.withContext('ddd');
  lc3.debug?.('eee');
  expect(mockDebug.mock.lastCall).toEqual(['bbb', 'ddd', 'eee']);

  const lc4 = lc2.withContext('fff', 'ggg');
  lc4.debug?.('hhh');
  expect(mockDebug.mock.lastCall).toEqual(['bbb', 'fff=ggg', 'hhh']);
});

test('LogContext default level', () => {
  const mockDebug = mockConsoleMethod('debug');
  const mockInfo = mockConsoleMethod('info');
  const mockWarn = mockConsoleMethod('warn');
  const mockError = mockConsoleMethod('error');

  const lc = new LogContext();
  lc.debug?.('aaa');
  lc.info?.('bbb');
  lc.warn?.('ccc');
  lc.error?.('ddd');

  expect(mockDebug).not.toBeCalled();
  expect(mockInfo.mock.lastCall).toEqual(['bbb']);
  expect(mockWarn.mock.lastCall).toEqual(['ccc']);
  expect(mockError.mock.lastCall).toEqual(['ddd']);
});

test('Optional tag', () => {
  const mockDebug = mockConsoleMethod('debug');
  const mockWarn = mockConsoleMethod('warn');
  const lc = new LogContext('debug');
  lc.debug?.('a');
  expect(mockDebug.mock.lastCall).toEqual(['a']);

  const lc2 = lc.withContext('b');
  lc2.debug?.('c');
  lc2.warn?.('d');
  expect(mockDebug.mock.lastCall).toEqual(['b', 'c']);
  expect(mockWarn.mock.lastCall).toEqual(['b', 'd']);

  const lc3 = lc.withContext('d', 'e');
  lc3.debug?.('f');
  lc3.warn?.('g');
  expect(mockDebug.mock.lastCall).toEqual(['d=e', 'f']);
  expect(mockWarn.mock.lastCall).toEqual(['d=e', 'g']);
});

class TestLogSink implements LogSink {
  messages: [LogLevel, Context | undefined, unknown[]][] = [];

  log(level: LogLevel, context: Context | undefined, ...args: unknown[]): void {
    this.messages.push([level, context, args]);
  }
}

class TestLogSinkWithFlush extends TestLogSink {
  flushCount = 0;

  flush(): Promise<void> {
    this.flushCount++;
    return Promise.resolve();
  }
}

test('TeeLogSink', () => {
  const l1 = new TestLogSink();
  const l2 = new TestLogSink();
  const tl = new TeeLogSink([l1, l2]);
  const ctx = {foo: 'bar'};

  expect(l1.messages).toEqual([]);
  expect(l2.messages).toEqual([]);

  tl.log('info', ctx, 1, 2);
  expect(l1.messages).toEqual([['info', ctx, [1, 2]]]);
  expect(l2.messages).toEqual([['info', ctx, [1, 2]]]);

  tl.log('debug', ctx, 3);
  expect(l1.messages).toEqual([
    ['info', ctx, [1, 2]],
    ['debug', ctx, [3]],
  ]);
  expect(l2.messages).toEqual([
    ['info', ctx, [1, 2]],
    ['debug', ctx, [3]],
  ]);

  tl.log('warn', ctx, 4, 5);
  expect(l1.messages).toEqual([
    ['info', ctx, [1, 2]],
    ['debug', ctx, [3]],
    ['warn', ctx, [4, 5]],
  ]);
  expect(l2.messages).toEqual([
    ['info', ctx, [1, 2]],
    ['debug', ctx, [3]],
    ['warn', ctx, [4, 5]],
  ]);

  tl.log('error', ctx, 6, 7, 8);
  expect(l1.messages).toEqual([
    ['info', ctx, [1, 2]],
    ['debug', ctx, [3]],
    ['warn', ctx, [4, 5]],
    ['error', ctx, [6, 7, 8]],
  ]);
  expect(l2.messages).toEqual([
    ['info', ctx, [1, 2]],
    ['debug', ctx, [3]],
    ['warn', ctx, [4, 5]],
    ['error', ctx, [6, 7, 8]],
  ]);
});

test('Context-aware LogSink', () => {
  const sink = new TestLogSink();

  expect(sink.messages).toEqual([]);

  const lc = new LogContext('debug', undefined, sink);

  lc.info?.(1, 2);
  lc.withContext('foo', {bar: 'baz'}).debug?.(3, 4);
  lc.withContext('boo', 'oof').info?.(5, 6);
  lc.withContext('abc', 'is').withContext('easy', 'as').info?.(1, 2, 3);
  lc.debug?.(7, 8);

  expect(sink.messages).toEqual([
    ['info', undefined, [1, 2]],
    ['debug', {foo: {bar: 'baz'}}, [3, 4]],
    ['info', {boo: 'oof'}, [5, 6]],
    ['info', {abc: 'is', easy: 'as'}, [1, 2, 3]],
    ['debug', undefined, [7, 8]],
  ]);
});

test('tee logger flush', async () => {
  const l1 = new TestLogSinkWithFlush();
  const l2 = new TestLogSink();
  const l3 = new TestLogSinkWithFlush();
  const tl = new TeeLogSink([l1, l2, l3]);

  expect(l1.flushCount).toBe(0);
  expect(l3.flushCount).toBe(0);
  await tl.flush();
  expect(l1.flushCount).toBe(1);
  expect(l3.flushCount).toBe(1);
});

test('optional logger flush', async () => {
  const l1 = new TestLogSinkWithFlush();
  const logger = new OptionalLoggerImpl(l1);

  expect(l1.flushCount).toBe(0);
  await logger.flush();
  expect(l1.flushCount).toBe(1);
});

test('Console logger calls JSON stringify on complex arguments', () => {
  const jsonStringifySpy = vi.spyOn(JSON, 'stringify');
  const mockDebug = mockConsoleMethod('debug');
  consoleLogSink.log('debug', undefined, 'a', false, 123, {b: 1}, [2, 3]);
  expect(mockDebug).toHaveBeenCalledOnce();
  expect(mockDebug.mock.calls[0]).toEqual([
    'a',
    false,
    123,
    '{"b":1}',
    '[2,3]',
  ]);
  expect(jsonStringifySpy).toHaveBeenCalledTimes(2);
  expect(jsonStringifySpy.mock.calls[0][0]).toEqual({b: 1});
  expect(jsonStringifySpy.mock.calls[1][0]).toEqual([2, 3]);

  mockDebug.mockClear();

  consoleLogSink.log(
    'debug',
    undefined,
    new Error('a', {cause: new TypeError('b')}),
  );
  expect(mockDebug).toHaveBeenCalledOnce();

  testNormalizeError(mockDebug.mock.calls[0][0]);
});

test('nodeConsoleSink calls JSON stringify on complex arguments', () => {
  const jsonStringifySpy = vi.spyOn(JSON, 'stringify');
  const mockDebug = mockConsoleMethod('debug');
  nodeConsoleLogSink.log('debug', undefined, 'a', false, 123, {b: 1}, [2, 3]);
  expect(mockDebug).toHaveBeenCalledOnce();
  expect(mockDebug.mock.calls[0]).toEqual([
    'DBG',
    'a',
    false,
    123,
    '{"b":1}',
    '[2,3]',
  ]);
  expect(jsonStringifySpy).toHaveBeenCalledTimes(2);
  expect(jsonStringifySpy.mock.calls[0][0]).toEqual({b: 1});
  expect(jsonStringifySpy.mock.calls[1][0]).toEqual([2, 3]);

  mockDebug.mockClear();

  nodeConsoleLogSink.log(
    'debug',
    undefined,
    new Error('a', {cause: new TypeError('b')}),
  );
  expect(mockDebug).toHaveBeenCalledOnce();

  testNormalizeError(mockDebug.mock.calls[0][1]);
});

function testNormalizeError(stringifiedError: string) {
  const obj = JSON.parse(stringifiedError);
  expect(typeof obj.stack).toBe('string');
  const {cause} = obj;
  delete obj.stack;
  delete obj.cause;
  expect(obj).toEqual({
    message: 'a',
    name: 'Error',
  });
  expect(typeof cause.stack).toBe('string');
  delete cause.stack;
  expect(cause).toEqual({
    message: 'b',
    name: 'TypeError',
  });
}

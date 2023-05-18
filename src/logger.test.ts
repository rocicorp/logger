import {expect, assert} from 'chai';
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
import * as sinon from 'sinon';
import {test, setup} from 'mocha';

const mockConsoleMethod = (level: LogLevel) => {
  const fake = sinon.fake();
  sinon.replace(console, level, fake);
  return fake;
};

setup(() => {
  sinon.restore();
});

test('level to method', () => {
  const mockDebug = mockConsoleMethod('debug');
  const mockInfo = mockConsoleMethod('info');
  const mockError = mockConsoleMethod('error');

  {
    const l = new ConsoleLogger('error');
    expect(l.debug).to.be.undefined;
    expect(l.info).to.be.undefined;
    expect(l.error).to.be.instanceOf(Function);

    l.debug?.('aaa');
    l.info?.('bbb');
    l.error?.('ccc');
    expect(mockDebug.callCount).to.equal(0);
    expect(mockInfo.callCount).to.equal(0);
    expect(mockError.calledWith('ccc')).to.be.true;
  }

  {
    sinon.reset();
    const l = new ConsoleLogger('info');
    expect(l.debug).to.be.undefined;
    expect(l.info).to.be.instanceOf(Function);
    expect(l.error).to.be.instanceOf(Function);

    l.debug?.('ddd');
    l.info?.('eee');
    l.error?.('fff');
    expect(mockDebug.callCount).to.equal(0);
    expect(mockInfo.lastCall.args).to.deep.equal(['eee']);
    expect(mockError.lastCall.args).to.deep.equal(['fff']);
  }

  {
    sinon.reset();
    const l = new ConsoleLogger('debug');
    expect(l.debug).to.be.instanceOf(Function);
    expect(l.info).to.be.instanceOf(Function);
    expect(l.error).to.be.instanceOf(Function);

    l.debug?.('ggg');
    l.info?.('hhh');
    l.error?.('iii');
    expect(mockDebug.lastCall.args).to.deep.equal(['ggg']);
    expect(mockInfo.lastCall.args).to.deep.equal(['hhh']);
    expect(mockError.lastCall.args).to.deep.equal(['iii']);
  }
});

test('FormatLogger', () => {
  const mockDebug = mockConsoleMethod('debug');
  const mockInfo = mockConsoleMethod('info');
  const mockError = mockConsoleMethod('error');

  {
    // nop formatter
    const l = new FormatLogger((_, ...args) => args);
    l.log('debug', undefined, 'aaa');
    l.log('info', {boo: undefined}, 'bbb');
    l.log('error', {foo: 'bar'}, 'ccc');

    expect(mockDebug.lastCall.args).to.deep.equal(['aaa']);
    expect(mockInfo.lastCall.args).to.deep.equal(['boo', 'bbb']);
    expect(mockError.lastCall.args).to.deep.equal(['foo=bar', 'ccc']);
  }
  {
    // prefix with 'foo'
    const l = new FormatLogger((_, ...args) => ['foo' as unknown].concat(args));
    l.log('debug', undefined, 'aaa');
    l.log('info', {boo: undefined}, 'bbb');
    l.log('error', {food: 'bard'}, 'ccc');

    expect(mockDebug.lastCall.args).to.deep.equal(['foo', 'aaa']);
    expect(mockInfo.lastCall.args).to.deep.equal(['foo', 'boo', 'bbb']);
    expect(mockError.lastCall.args).to.deep.equal(['foo', 'food=bard', 'ccc']);
  }
});

test('nodeConsoleLogSink', () => {
  const mockDebug = mockConsoleMethod('debug');
  const mockInfo = mockConsoleMethod('info');
  const mockError = mockConsoleMethod('error');

  {
    sinon.reset();
    const l = new OptionalLoggerImpl(nodeConsoleLogSink, 'debug', {foo: 'bar'});
    expect(l.debug).to.be.instanceOf(Function);
    expect(l.info).to.be.instanceOf(Function);
    expect(l.error).to.be.instanceOf(Function);

    l.debug?.('ggg');
    l.info?.('hhh');
    l.error?.('iii');
    expect(mockDebug.lastCall.args).to.deep.equal(['DBG', 'foo=bar', 'ggg']);
    expect(mockInfo.lastCall.args).to.deep.equal(['INF', 'foo=bar', 'hhh']);
    expect(mockError.lastCall.args).to.deep.equal(['ERR', 'foo=bar', 'iii']);
  }
});

test('LogContext formatting', () => {
  const mockDebug = mockConsoleMethod('debug');

  const lc = new LogContext('debug');
  lc.debug?.('aaa');
  expect(mockDebug.lastCall.args).to.deep.equal(['aaa']);

  const lc2 = new LogContext('debug').withContext('bbb');
  lc2.debug?.('ccc');
  expect(mockDebug.lastCall.args).to.deep.equal(['bbb', 'ccc']);

  const lc3 = lc2.withContext('ddd');
  lc3.debug?.('eee');
  expect(mockDebug.lastCall.args).to.deep.equal(['bbb', 'ddd', 'eee']);

  const lc4 = lc2.withContext('fff', 'ggg');
  lc4.debug?.('hhh');
  expect(mockDebug.lastCall.args).to.deep.equal(['bbb', 'fff=ggg', 'hhh']);
});

test('LogContext default level', () => {
  const mockDebug = mockConsoleMethod('debug');
  const mockInfo = mockConsoleMethod('info');
  const mockError = mockConsoleMethod('error');

  const lc = new LogContext();
  lc.debug?.('aaa');
  lc.info?.('bbb');
  lc.error?.('ccc');

  expect(mockDebug.callCount).to.equal(0);
  expect(mockInfo.lastCall.args).to.deep.equal(['bbb']);
  expect(mockError.lastCall.args).to.deep.equal(['ccc']);
});

test('Optional tag', () => {
  const mockDebug = mockConsoleMethod('debug');
  const lc = new LogContext('debug');
  lc.debug?.('a');
  expect(mockDebug.lastCall.args).to.deep.equal(['a']);

  const lc2 = lc.withContext('b');
  lc2.debug?.('c');
  expect(mockDebug.lastCall.args).to.deep.equal(['b', 'c']);

  const lc3 = lc.withContext('d', 'e');
  lc3.debug?.('f');
  expect(mockDebug.lastCall.args).to.deep.equal(['d=e', 'f']);
});

class TestLogSink implements LogSink {
  // Note: Order in messages is different from log args order to verify
  // that Context isn't just one of the args.
  messages: [Context | undefined, LogLevel, ...unknown[]][] = [];

  log(level: LogLevel, context: Context | undefined, ...args: unknown[]): void {
    this.messages.push([context, level, ...args]);
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

  expect(l1.messages).to.deep.equal([]);
  expect(l2.messages).to.deep.equal([]);

  tl.log('info', ctx, 1, 2);
  expect(l1.messages).to.deep.equal([[ctx, 'info', 1, 2]]);
  expect(l2.messages).to.deep.equal([[ctx, 'info', 1, 2]]);

  tl.log('debug', ctx, 3);
  expect(l1.messages).to.deep.equal([
    [ctx, 'info', 1, 2],
    [ctx, 'debug', 3],
  ]);
  expect(l2.messages).to.deep.equal([
    [ctx, 'info', 1, 2],
    [ctx, 'debug', 3],
  ]);

  tl.log('error', ctx, 4, 5, 6);
  expect(l1.messages).to.deep.equal([
    [ctx, 'info', 1, 2],
    [ctx, 'debug', 3],
    [ctx, 'error', 4, 5, 6],
  ]);
  expect(l2.messages).to.deep.equal([
    [ctx, 'info', 1, 2],
    [ctx, 'debug', 3],
    [ctx, 'error', 4, 5, 6],
  ]);
});

test('Context-aware LogSink', () => {
  const sink = new TestLogSink();

  expect(sink.messages).to.deep.equal([]);

  const lc = new LogContext('debug', sink);

  lc.info?.(1, 2);
  lc.withContext('foo', {bar: 'baz'}).debug?.(3, 4);
  lc.withContext('boo', 'oof').info?.(5, 6);
  lc.withContext('abc', 'is').withContext('easy', 'as').info?.(1, 2, 3);
  lc.debug?.(7, 8);

  expect(sink.messages).to.deep.equal([
    [undefined, 'info', 1, 2],
    [{foo: {bar: 'baz'}}, 'debug', 3, 4],
    [{boo: 'oof'}, 'info', 5, 6],
    [{abc: 'is', easy: 'as'}, 'info', 1, 2, 3],
    [undefined, 'debug', 7, 8],
  ]);
});

test('tee logger flush', async () => {
  const l1 = new TestLogSinkWithFlush();
  const l2 = new TestLogSink();
  const l3 = new TestLogSinkWithFlush();
  const tl = new TeeLogSink([l1, l2, l3]);

  expect(l1.flushCount).to.equal(0);
  expect(l3.flushCount).to.equal(0);
  await tl.flush();
  expect(l1.flushCount).to.equal(1);
  expect(l3.flushCount).to.equal(1);
});

test('Console logger calls JSON stringify on complex arguments', () => {
  const jsonStringifySpy = sinon.spy(JSON, 'stringify');
  const mockDebug = mockConsoleMethod('debug');
  consoleLogSink.log('debug', undefined, 'a', false, 123, {b: 1}, [2, 3]);
  assert(mockDebug.calledOnce);
  assert.deepEqual(mockDebug.firstCall.args, [
    'a',
    false,
    123,
    '{"b":1}',
    '[2,3]',
  ]);
  assert.equal(jsonStringifySpy.callCount, 2);
  assert.deepEqual(jsonStringifySpy.getCall(0).firstArg, {b: 1});
  assert.deepEqual(jsonStringifySpy.getCall(1).firstArg, [2, 3]);

  mockDebug.resetHistory();

  consoleLogSink.log(
    'debug',
    undefined,
    new Error('a', {cause: new TypeError('b')}),
  );
  assert(mockDebug.calledOnce);

  testNormalizeError(mockDebug.firstCall.firstArg);
});

test('nodeConsoleSink calls JSON stringify on complex arguments', () => {
  const jsonStringifySpy = sinon.spy(JSON, 'stringify');
  const mockDebug = mockConsoleMethod('debug');
  nodeConsoleLogSink.log('debug', undefined, 'a', false, 123, {b: 1}, [2, 3]);
  assert(mockDebug.calledOnce);
  assert.deepEqual(mockDebug.firstCall.args, [
    'DBG',
    'a',
    false,
    123,
    '{"b":1}',
    '[2,3]',
  ]);
  assert.equal(jsonStringifySpy.callCount, 2);
  assert.deepEqual(jsonStringifySpy.getCall(0).firstArg, {b: 1});
  assert.deepEqual(jsonStringifySpy.getCall(1).firstArg, [2, 3]);

  mockDebug.resetHistory();

  nodeConsoleLogSink.log(
    'debug',
    undefined,
    new Error('a', {cause: new TypeError('b')}),
  );
  assert(mockDebug.calledOnce);

  testNormalizeError(mockDebug.firstCall.args[1]);
});

function testNormalizeError(stringifiedError: string) {
  const obj = JSON.parse(stringifiedError);
  assert(typeof obj.stack === 'string');
  const {cause} = obj;
  delete obj.stack;
  delete obj.cause;
  assert.deepEqual(obj, {
    message: 'a',
    name: 'Error',
  });
  assert(typeof cause.stack === 'string');
  delete cause.stack;
  assert.deepEqual(cause, {
    message: 'b',
    name: 'TypeError',
  });
}

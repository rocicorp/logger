import {expect} from 'chai';
import {
  ConsoleLogger,
  FormatLogger,
  LogContext,
  LogSink,
  newNodeLogContext,
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
    l.log('debug', 'aaa');
    l.log('info', 'bbb');
    l.log('error', 'ccc');

    expect(mockDebug.lastCall.args).to.deep.equal(['aaa']);
    expect(mockInfo.lastCall.args).to.deep.equal(['bbb']);
    expect(mockError.lastCall.args).to.deep.equal(['ccc']);
  }
  {
    // prefix with 'foo'
    const l = new FormatLogger((_, ...args) => ['foo' as unknown].concat(args));
    l.log('debug', 'aaa');
    l.log('info', 'bbb');
    l.log('error', 'ccc');

    expect(mockDebug.lastCall.args).to.deep.equal(['foo', 'aaa']);
    expect(mockInfo.lastCall.args).to.deep.equal(['foo', 'bbb']);
    expect(mockError.lastCall.args).to.deep.equal(['foo', 'ccc']);
  }
});

test('nodeLogContext', () => {
  const mockDebug = mockConsoleMethod('debug');
  const mockInfo = mockConsoleMethod('info');
  const mockError = mockConsoleMethod('error');

  {
    sinon.reset();
    const l = newNodeLogContext('debug');
    expect(l.debug).to.be.instanceOf(Function);
    expect(l.info).to.be.instanceOf(Function);
    expect(l.error).to.be.instanceOf(Function);

    l.debug?.('ggg');
    l.info?.('hhh');
    l.error?.('iii');
    expect(mockDebug.lastCall.args).to.deep.equal(['DBG', 'ggg']);
    expect(mockInfo.lastCall.args).to.deep.equal(['INF', 'hhh']);
    expect(mockError.lastCall.args).to.deep.equal(['ERR', 'iii']);
  }
});

test('LogContext formatting', () => {
  const mockDebug = mockConsoleMethod('debug');

  const lc = new LogContext('debug');
  lc.debug?.('aaa');
  expect(mockDebug.lastCall.args).to.deep.equal(['aaa']);

  const lc2 = new LogContext('debug').addContext('bbb');
  lc2.debug?.('ccc');
  expect(mockDebug.lastCall.args).to.deep.equal(['bbb', 'ccc']);

  const lc3 = lc2.addContext('ddd');
  lc3.debug?.('eee');
  expect(mockDebug.lastCall.args).to.deep.equal(['bbb', 'ddd', 'eee']);

  const lc4 = lc2.addContext('fff', 'ggg');
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

  const lc2 = lc.addContext('b');
  lc2.debug?.('c');
  expect(mockDebug.lastCall.args).to.deep.equal(['b', 'c']);

  const lc3 = lc.addContext('d', 'e');
  lc3.debug?.('f');
  expect(mockDebug.lastCall.args).to.deep.equal(['d=e', 'f']);
});

class TestLogSink implements LogSink {
  messages: [LogLevel, ...unknown[]][] = [];

  log(level: LogLevel, ...args: unknown[]): void {
    this.messages.push([level, ...args]);
  }
}

class TestLogSinkWithFlush extends TestLogSink {
  flushCount = 0;

  flush(): Promise<void> {
    this.flushCount++;
    return Promise.resolve();
  }
}

test("TeeLogSink", () => {
  const l1 = new TestLogSink();
  const l2 = new TestLogSink();
  const tl = new TeeLogSink([l1, l2]);

  expect(l1.messages).toEqual([]);
  expect(l2.messages).toEqual([]);

  tl.log("info", 1, 2);
  expect(l1.messages).toEqual([["info", 1, 2]]);
  expect(l2.messages).toEqual([["info", 1, 2]]);

  tl.log("debug", 3);
  expect(l1.messages).toEqual([
    ["info", 1, 2],
    ["debug", 3],
  ]);
  expect(l2.messages).toEqual([
    ["info", 1, 2],
    ["debug", 3],
  ]);

  tl.log("error", 4, 5, 6);
  expect(l1.messages).toEqual([
    ["info", 1, 2],
    ["debug", 3],
    ["error", 4, 5, 6],
  ]);
  expect(l2.messages).toEqual([
    ["info", 1, 2],
    ["debug", 3],
    ["error", 4, 5, 6],
  ]);
});

test("tee logger flush", async () => {
  const l1 = new TestLogSinkWithFlush();
  const l2 = new TestLogSink();
  const l3 = new TestLogSinkWithFlush();
  const tl = new TeeLogSink([l1, l2, l3]);

  expect(l1.flushCount).toEqual(0);
  expect(l3.flushCount).toEqual(0);
  await tl.flush();
  expect(l1.flushCount).toEqual(1);
  expect(l3.flushCount).toEqual(1);
});

import {expect} from 'chai';
import {ConsoleLogger, LogContext, type LogLevel} from './logger.js';
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

test('LogContext formatting', () => {
  const mockDebug = mockConsoleMethod('debug');

  const lc = new LogContext('debug');
  lc.debug?.('aaa');
  expect(mockDebug.lastCall.args).to.deep.equal(['aaa']);

  const lc2 = new LogContext('debug', 'bbb');
  lc2.debug?.('ccc');
  expect(mockDebug.lastCall.args).to.deep.equal(['bbb', 'ccc']);

  const lc3 = lc2.addContext('ddd');
  lc3.debug?.('eee');
  expect(mockDebug.lastCall.args).to.deep.equal(['bbb ddd', 'eee']);

  const lc4 = lc2.addContext('fff', 'ggg');
  lc4.debug?.('hhh');
  expect(mockDebug.lastCall.args).to.deep.equal(['bbb fff=ggg', 'hhh']);
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

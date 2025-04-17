import {expectTypeOf, test} from 'vitest';
import {LogContext} from './logger.js';

test('typed LogContext', () => {
  type E = ['x', ...number[]];
  const tlc = new LogContext<E>('debug', {foo: 'bar'});

  expectTypeOf(tlc.error).toEqualTypeOf<
    ((e: 'x', ...args: number[]) => void) | undefined
  >();

  tlc.error?.('x');
  tlc.error?.('x', 1, 2, 3);

  // @ts-expect-error not 'x'
  tlc.error?.('y');
  // @ts-expect-error not numbers
  tlc.error?.('x', 'y');
});

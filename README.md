# logger

Provides a simple logging interface as well as a `LogContext` class which
carries a context around.

# Installation

```
npm install @rocicorp/logger
```

# Usage

## LogContext

`LogContext` includes a context that gets included in the log message.

```js
import {LogContext} from '@rocicorp/logger';

const lc = new LogContext('info');
lc.info('hello'); // prints "hello"

const lc2 = new LogContext('info', {name: 'alice'});
lc.info('hello'); // prints "name=alice hello"

const lc3 = lc2.withContext('bbb');
lc3.info('hello'); // prints "name=alice bbb hello"

const lc4 = lc3.withContext('ccc');
lc4.info('hello'); // prints "name=alice bbb ccc hello"

const lc5 = lc4.withContext('ddd', 'eee');
lc5.info('hello'); // prints "name=alice bbb ccc ddd=eee hello"

// Or get a context logger appropriate for the Node environment.
const nlc = newNodeLogContext('debug');
nlc.info('fff'); // prints "INF fff"
```

## OptionalLogger

```ts
interface OptionalLogger { ... }
```

This interface is used to provide conditional logging. It is intended to be used
with conditional method calling `?.()`.

```ts
import {ConsoleLogger, type OptionalLogger} from '@rocicorp/logger';

const l: OptionalLogger = new ConsoleLogger('info');
l.info?.('hello'); // prints "hello"
l.debug?.('hello'); // does not print anything
```

But more importantly it does not evaluate the arguments.

```ts
import {ConsoleLogger, type OptionalLogger} from '@rocicorp/logger';
const alwaysThrows = () => {
  throw new Error();
};
const l: OptionalLogger = new ConsoleLogger('info');
l.debug?.(alwaysThrows()); // does not print anything, but does not throw
```

# Implementing Your Own `LogSink`

There is also the `LogSink` interface which is very minimal. Its intended use is
for custom log implementations.

```ts
class ExampleLogSink implements LogSink {
  log(level: LogLevel, ...args: unknown[]): void {
    //...
  }
}
```

You can get an `OptionalLogger` from a `LogSink` using `OptionalLoggerImpl`.

```ts
import {
  OptionalLoggerImpl,
  type LogSink,
  type OptionalLogger,
} from '@rocicorp/logger';

const logSink: LogSink = new ExampleLogSink();
const l: OptionalLogger = new OptionalLoggerImpl(logSink);
```

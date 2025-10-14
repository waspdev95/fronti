/**
 * Console Interceptor - Captures console outputs and errors
 */

// Store original console methods
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  trace: console.trace.bind(console),
  dir: console.dir.bind(console),
  table: console.table.bind(console),
  group: console.group.bind(console),
  groupCollapsed: console.groupCollapsed.bind(console),
  groupEnd: console.groupEnd.bind(console),
  assert: console.assert.bind(console),
  count: console.count.bind(console),
  countReset: console.countReset.bind(console),
  time: console.time.bind(console),
  timeEnd: console.timeEnd.bind(console),
  timeLog: console.timeLog.bind(console),
};

// Helper to serialize values safely
const serializeValue = (value: any): any => {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  // Handle Error objects
  if (value instanceof Error) {
    return {
      __type: 'Error',
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  // Handle objects and arrays
  if (typeof value === 'object') {
    try {
      // Check for circular references by using JSON.stringify
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      // Circular reference or other error
      return String(value);
    }
  }

  return String(value);
};

const interceptConsole = (level: 'log' | 'error' | 'warn' | 'info') => {
  (console as any)[level] = (...args: any[]) => {
    // Call original console method with proper context
    (originalConsole[level] as any)(...args);

    // Send to parent with serialized args
    try {
      const serializedArgs = args.map(serializeValue);

      window.parent.postMessage({
        type: 'AVE_CONSOLE',
        level,
        args: serializedArgs
      }, '*');
    } catch (e) {
      // Ignore serialization errors silently
    }
  };
};

export const setupConsoleInterception = () => {
  // Intercept main console methods
  interceptConsole('log');
  interceptConsole('error');
  interceptConsole('warn');
  interceptConsole('info');

  // Intercept other console methods (map to log)
  ['debug', 'trace', 'dir', 'table'].forEach((method) => {
    (console as any)[method] = (...args: any[]) => {
      (originalConsole[method as keyof typeof originalConsole] as any)(...args);
      try {
        const serializedArgs = args.map(serializeValue);
        window.parent.postMessage({
          type: 'AVE_CONSOLE',
          level: method === 'debug' || method === 'trace' ? 'log' : 'info',
          args: serializedArgs
        }, '*');
      } catch (e) {
        // Ignore
      }
    };
  });

  // Catch uncaught errors
  window.addEventListener('error', (event) => {
    window.parent.postMessage({
      type: 'AVE_CONSOLE',
      level: 'error',
      args: [serializeValue(event.error || event.message)]
    }, '*');
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    window.parent.postMessage({
      type: 'AVE_CONSOLE',
      level: 'error',
      args: [serializeValue(event.reason)]
    }, '*');
  });
};

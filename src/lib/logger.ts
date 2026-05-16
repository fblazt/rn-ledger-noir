type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createLogger(scope: string) {
  return {
    debug: (...values: unknown[]) => log('debug', scope, values),
    info: (...values: unknown[]) => log('info', scope, values),
    warn: (...values: unknown[]) => log('warn', scope, values),
    error: (...values: unknown[]) => log('error', scope, values),
  };
}

function log(level: LogLevel, scope: string, values: unknown[]) {
  if (!__DEV__ && level === 'debug') {
    return;
  }

  console[level](`[${scope}]`, ...values);
}

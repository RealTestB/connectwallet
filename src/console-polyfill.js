// Ensure console methods are available and safe to use
if (typeof global.console === 'undefined') {
  global.console = {};
}

const methods = ['log', 'info', 'warn', 'error', 'debug', 'trace'];

methods.forEach(method => {
  if (typeof global.console[method] === 'undefined') {
    global.console[method] = function (...args) {
      try {
        // Safe fallback to log if method doesn't exist
        if (global.console.log) {
          global.console.log(`[${method.toUpperCase()}]`, ...args);
        }
      } catch (e) {
        // Silently fail if console is completely unavailable
      }
    };
  }
}); 
/**
 * Network Interceptor - Captures fetch and XHR requests
 */

// Track requests
const requestsMap = new Map<string, { url: string; method: string; startTime: number }>();

export const setupNetworkInterception = () => {
  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args: [RequestInfo | URL, RequestInit?]) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof URL ? args[0].toString() : (args[0] as Request).url || 'unknown');
    const method = args[1]?.method || 'GET';
    const requestId = `fetch-${Date.now()}-${Math.random()}`;
    const startTime = performance.now();

    requestsMap.set(requestId, { url, method, startTime });

    return originalFetch.apply(this, args)
      .then(response => {
        const duration = Math.round(performance.now() - startTime);

        window.parent.postMessage({
          type: 'AVE_NETWORK',
          data: {
            id: requestId,
            url,
            method,
            type: 'fetch',
            status: response.status,
            statusText: response.statusText,
            duration,
            timestamp: Date.now()
          }
        }, '*');

        requestsMap.delete(requestId);
        return response;
      })
      .catch(error => {
        const duration = Math.round(performance.now() - startTime);

        window.parent.postMessage({
          type: 'AVE_NETWORK',
          data: {
            id: requestId,
            url,
            method,
            type: 'fetch',
            status: 0,
            statusText: error.message || 'Failed',
            duration,
            timestamp: Date.now(),
            error: true
          }
        }, '*');

        requestsMap.delete(requestId);
        throw error;
      });
  };

  // Intercept XMLHttpRequest
  const OriginalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new OriginalXHR();
    const requestId = `xhr-${Date.now()}-${Math.random()}`;
    let url = '';
    let method = 'GET';
    let startTime = 0;

    // Intercept open
    const originalOpen = xhr.open;
    xhr.open = function(m: string, u: string | URL, ...rest: any[]) {
      method = m;
      url = typeof u === 'string' ? u : u.toString();
      return originalOpen.call(this, m, u, ...rest);
    };

    // Intercept send
    const originalSend = xhr.send;
    xhr.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      startTime = performance.now();
      requestsMap.set(requestId, { url, method, startTime });

      // Listen for completion
      xhr.addEventListener('loadend', () => {
        const duration = Math.round(performance.now() - startTime);

        window.parent.postMessage({
          type: 'AVE_NETWORK',
          data: {
            id: requestId,
            url,
            method,
            type: 'xhr',
            status: xhr.status,
            statusText: xhr.statusText || (xhr.status === 0 ? 'Failed' : 'OK'),
            duration,
            timestamp: Date.now(),
            error: xhr.status === 0 || xhr.status >= 400
          }
        }, '*');

        requestsMap.delete(requestId);
      });

      return originalSend.call(this, body);
    };

    return xhr;
  } as any;
};

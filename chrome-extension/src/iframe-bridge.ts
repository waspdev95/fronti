/**
 * iframe Bridge - Minimal content script
 * Runs inside iframe, captures events and sends to parent extension page
 */

// Only run if we're in an iframe
if (window.self !== window.top) {
  let isActive = false;
  let trackedElement: HTMLElement | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let rafId: number | null = null;

  // Helper: Get element info
  function getElementInfo(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const path = getElementPath(element);

    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || '',
      classes: Array.from(element.classList).join('.'),
      path,
      text: element.innerText?.substring(0, 50) || '',
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      },
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
  }

  // Helper: Get CSS selector path
  function getElementPath(element: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      } else {
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children);
          const index = siblings.indexOf(current);
          if (siblings.filter(s => s.tagName === current.tagName).length > 1) {
            selector += `:nth-child(${index + 1})`;
          }
        }
        path.unshift(selector);
      }

      current = current.parentElement;
    }

    return path.join(' > ');
  }

  // Schedule update using requestAnimationFrame
  const scheduleUpdate = () => {
    if (rafId || !trackedElement) return;
    rafId = requestAnimationFrame(() => {
      if (trackedElement) {
        window.parent.postMessage({
          type: 'AVE_POSITION_UPDATE',
          element: getElementInfo(trackedElement)
        }, '*');
      }
      rafId = null;
    });
  };

  // Start tracking an element
  const startTracking = (element: HTMLElement) => {
    // Stop tracking previous element
    if (trackedElement && resizeObserver) {
      resizeObserver.unobserve(trackedElement);
    }

    trackedElement = element;

    // Create ResizeObserver if not exists
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        scheduleUpdate();
      });
    }

    // Observe element for resize
    resizeObserver.observe(element);

    // Send initial position
    window.parent.postMessage({
      type: 'AVE_POSITION_UPDATE',
      element: getElementInfo(element)
    }, '*');
  };

  // Listen for messages from parent
  window.addEventListener('message', (event) => {
    // Security: only accept messages from chrome-extension://
    if (!event.origin.startsWith('chrome-extension://')) return;

    if (event.data.type === 'AVE_ACTIVATE') {
      isActive = true;
    } else if (event.data.type === 'AVE_DEACTIVATE') {
      isActive = false;
      document.body.style.cursor = '';
      // Stop tracking
      if (trackedElement && resizeObserver) {
        resizeObserver.unobserve(trackedElement);
        trackedElement = null;
      }
    } else if (event.data.type === 'AVE_TRACK_ELEMENT') {
      // Start tracking element by path
      const element = document.querySelector(event.data.path) as HTMLElement;
      if (element) {
        startTracking(element);
      }
    } else if (event.data.type === 'AVE_REQUEST_POSITION') {
      // Send position for specific element
      const element = document.querySelector(event.data.path) as HTMLElement;
      if (element) {
        window.parent.postMessage({
          type: 'AVE_POSITION_UPDATE',
          element: getElementInfo(element)
        }, '*');
      }
    } else if (event.data.type === 'AVE_REQUEST_PARENT_POSITION') {
      // Send position for parent preview
      const element = document.querySelector(event.data.path) as HTMLElement;
      if (element) {
        window.parent.postMessage({
          type: 'AVE_POSITION_UPDATE',
          element: getElementInfo(element)
        }, '*');
      }
    } else if (event.data.type === 'AVE_SELECT_PARENT') {
      // Select parent element
      const element = document.querySelector(event.data.path) as HTMLElement;
      if (element) {
        const parent = element.parentElement;
        if (parent && parent !== document.body) {
          window.parent.postMessage({
            type: 'AVE_PARENT_SELECTED',
            element: getElementInfo(parent)
          }, '*');
          // Start tracking the parent
          startTracking(parent);
        }
      }
    } else if (event.data.type === 'AVE_PREVIEW_PARENT') {
      // Show parent preview
      const element = document.querySelector(event.data.path) as HTMLElement;
      if (element) {
        const parent = element.parentElement;
        if (parent && parent !== document.body) {
          window.parent.postMessage({
            type: 'AVE_PARENT_PREVIEW',
            element: getElementInfo(parent)
          }, '*');
        } else {
          // No parent available
          window.parent.postMessage({
            type: 'AVE_PARENT_PREVIEW',
            element: null
          }, '*');
        }
      }
    } else if (event.data.type === 'AVE_CLEAR_PARENT_PREVIEW') {
      // Clear parent preview
      window.parent.postMessage({
        type: 'AVE_PARENT_PREVIEW',
        element: null
      }, '*');
    } else if (event.data.type === 'AVE_HIGHLIGHT_ELEMENT') {
      // Highlight element (for message hover)
      const element = document.querySelector(event.data.path) as HTMLElement;
      if (element) {
        window.parent.postMessage({
          type: 'AVE_PARENT_PREVIEW',
          element: getElementInfo(element)
        }, '*');
      }
    } else if (event.data.type === 'AVE_CLEAR_HIGHLIGHT') {
      // Clear highlight
      window.parent.postMessage({
        type: 'AVE_PARENT_PREVIEW',
        element: null
      }, '*');
    } else if (event.data.type === 'AVE_GET_URL') {
      // Send current URL to parent
      window.parent.postMessage({
        type: 'AVE_CURRENT_URL',
        url: window.location.href
      }, '*');
    }
  });

  // Scroll handler - update tracked element position
  window.addEventListener('scroll', () => {
    if (!isActive || !trackedElement) return;
    scheduleUpdate();
  }, { passive: true });

  // Resize handler - update tracked element position
  window.addEventListener('resize', () => {
    if (!isActive || !trackedElement) return;
    scheduleUpdate();
  }, { passive: true });

  // Mouse over handler
  document.addEventListener('mouseover', (e: MouseEvent) => {
    if (!isActive) return;

    const target = e.target as HTMLElement;
    if (!target || target === document.body) return;

    // Send hover event to parent
    window.parent.postMessage({
      type: 'AVE_HOVER',
      element: getElementInfo(target)
    }, '*');
  });

  // Click handler
  document.addEventListener('click', (e: MouseEvent) => {
    if (!isActive) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    if (!target || target === document.body) return;

    // Send click event to parent (parent will send back AVE_TRACK_ELEMENT)
    window.parent.postMessage({
      type: 'AVE_CLICK',
      element: getElementInfo(target),
      shiftKey: e.shiftKey
    }, '*');
  }, true);

  // Keydown handler (ESC to clear)
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!isActive) return;

    if (e.key === 'Escape') {
      // Stop tracking
      if (trackedElement && resizeObserver) {
        resizeObserver.unobserve(trackedElement);
        trackedElement = null;
      }

      window.parent.postMessage({
        type: 'AVE_ESCAPE'
      }, '*');
    }
  });

  // Intercept console methods
  const originalConsole = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console)
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
      originalConsole[level](...args);

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

  interceptConsole('log');
  interceptConsole('error');
  interceptConsole('warn');
  interceptConsole('info');

  // Intercept network requests using Performance API (captures ALL requests: CSS, JS, images, fetch, XHR, etc.)
  const captureNetworkRequest = (entry: PerformanceResourceTiming) => {
    // Determine HTTP method (Performance API doesn't provide this directly, so we infer)
    // For fetch/XHR we'll use interceptors below, for resources assume GET
    let method = 'GET';
    let type = entry.initiatorType || 'other';

    // Map initiator types to readable names
    const typeMap: Record<string, string> = {
      'script': 'script',
      'link': 'stylesheet',
      'css': 'stylesheet',
      'img': 'image',
      'fetch': 'fetch',
      'xmlhttprequest': 'xhr',
      'navigation': 'document',
      'other': 'other'
    };

    const mappedType = typeMap[type] || type;

    // Calculate status from transferSize (0 = failed/cached)
    const status = entry.transferSize === 0 && entry.decodedBodySize > 0 ? 304 :
                   entry.transferSize === 0 ? 0 : 200;

    window.parent.postMessage({
      type: 'AVE_NETWORK',
      request: {
        url: entry.name,
        method,
        type: mappedType,
        status,
        statusText: status === 304 ? 'Not Modified' : status === 0 ? 'Unknown' : 'OK',
        duration: Math.round(entry.duration),
        timestamp: Date.now(),
        error: status === 0 && entry.transferSize === 0 && entry.decodedBodySize === 0
      }
    }, '*');
  };

  // Performance Observer for new requests
  const perfObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'resource') {
        captureNetworkRequest(entry as PerformanceResourceTiming);
      }
    });
  });

  perfObserver.observe({ entryTypes: ['resource'] });

  // Capture existing resources on page load
  performance.getEntriesByType('resource').forEach((entry) => {
    captureNetworkRequest(entry as PerformanceResourceTiming);
  });

  // Enhanced fetch interceptor (for accurate method and status)
  const originalFetch = window.fetch;
  window.fetch = async (...args: any[]) => {
    const startTime = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
    const method = args[1]?.method || 'GET';

    try {
      const response = await originalFetch(...args);
      const duration = Math.round(performance.now() - startTime);

      window.parent.postMessage({
        type: 'AVE_NETWORK',
        request: {
          url,
          method,
          type: 'fetch',
          status: response.status,
          statusText: response.statusText,
          duration,
          timestamp: Date.now()
        }
      }, '*');

      return response;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);

      window.parent.postMessage({
        type: 'AVE_NETWORK',
        request: {
          url,
          method,
          type: 'fetch',
          status: 0,
          statusText: 'Failed',
          duration,
          timestamp: Date.now(),
          error: true
        }
      }, '*');

      throw error;
    }
  };

  // Enhanced XHR interceptor (for accurate method and status)
  const OriginalXHR = window.XMLHttpRequest;
  (window as any).XMLHttpRequest = function() {
    const xhr = new OriginalXHR();
    let url = '';
    let method = 'GET';
    let startTime = 0;

    const originalOpen = xhr.open;
    xhr.open = function(m: string, u: string, ...rest: any[]) {
      method = m;
      url = u;
      return originalOpen.call(this, m, u, ...rest);
    };

    const originalSend = xhr.send;
    xhr.send = function(...args: any[]) {
      startTime = performance.now();

      xhr.addEventListener('load', function() {
        const duration = Math.round(performance.now() - startTime);
        window.parent.postMessage({
          type: 'AVE_NETWORK',
          request: {
            url,
            method,
            type: 'xhr',
            status: xhr.status,
            statusText: xhr.statusText,
            duration,
            timestamp: Date.now()
          }
        }, '*');
      });

      xhr.addEventListener('error', function() {
        const duration = Math.round(performance.now() - startTime);
        window.parent.postMessage({
          type: 'AVE_NETWORK',
          request: {
            url,
            method,
            type: 'xhr',
            status: 0,
            statusText: 'Failed',
            duration,
            timestamp: Date.now(),
            error: true
          }
        }, '*');
      });

      return originalSend.call(this, ...args);
    };

    return xhr;
  };

  // Notify parent that bridge is ready
  window.parent.postMessage({
    type: 'AVE_BRIDGE_READY'
  }, '*');
}

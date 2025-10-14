/**
 * DOM Handlers - Element tracking and event handling
 */

export interface ElementInfo {
  tag: string;
  id: string;
  classes: string;
  path: string;
  text: string;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  scrollX: number;
  scrollY: number;
}

// Get element info
export function getElementInfo(element: HTMLElement): ElementInfo {
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

// Get CSS selector path
export function getElementPath(element: HTMLElement): string {
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

export class DOMEventManager {
  private isActive = false;
  private trackedElement: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private rafId: number | null = null;

  constructor() {
    this.setupMessageListeners();
    this.setupEventListeners();
  }

  private scheduleUpdate = () => {
    if (this.rafId !== null || !this.trackedElement) return;
    this.rafId = requestAnimationFrame(() => {
      if (this.trackedElement) {
        window.parent.postMessage({
          type: 'AVE_POSITION_UPDATE',
          element: getElementInfo(this.trackedElement)
        }, '*');
      }
      this.rafId = null;
    });
  };

  private startTracking = (element: HTMLElement) => {
    // Stop tracking previous element
    if (this.trackedElement && this.resizeObserver) {
      this.resizeObserver.unobserve(this.trackedElement);
    }

    this.trackedElement = element;

    // Create ResizeObserver if not exists
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleUpdate();
      });
    }

    // Observe element for resize
    this.resizeObserver.observe(element);

    // Send initial position
    window.parent.postMessage({
      type: 'AVE_POSITION_UPDATE',
      element: getElementInfo(element)
    }, '*');
  };

  private setupMessageListeners() {
    window.addEventListener('message', (event) => {
      // Security: only accept messages from chrome-extension://
      if (!event.origin.startsWith('chrome-extension://')) return;

      const { type, path } = event.data;

      if (type === 'AVE_ACTIVATE') {
        this.isActive = true;
      } else if (type === 'AVE_DEACTIVATE') {
        this.isActive = false;
        document.body.style.cursor = '';
        // Stop tracking
        if (this.trackedElement && this.resizeObserver) {
          this.resizeObserver.unobserve(this.trackedElement);
          this.trackedElement = null;
        }
      } else if (type === 'AVE_TRACK_ELEMENT') {
        const element = document.querySelector(path) as HTMLElement;
        if (element) {
          this.startTracking(element);
        }
      } else if (type === 'AVE_REQUEST_POSITION') {
        const element = document.querySelector(path) as HTMLElement;
        if (element) {
          window.parent.postMessage({
            type: 'AVE_POSITION_UPDATE',
            element: getElementInfo(element)
          }, '*');
        }
      } else if (type === 'AVE_REQUEST_PARENT_POSITION') {
        const element = document.querySelector(path) as HTMLElement;
        if (element) {
          window.parent.postMessage({
            type: 'AVE_POSITION_UPDATE',
            element: getElementInfo(element)
          }, '*');
        }
      } else if (type === 'AVE_SELECT_PARENT') {
        const element = document.querySelector(path) as HTMLElement;
        if (element) {
          const parent = element.parentElement;
          if (parent && parent !== document.body) {
            window.parent.postMessage({
              type: 'AVE_PARENT_SELECTED',
              element: getElementInfo(parent)
            }, '*');
            this.startTracking(parent);
          }
        }
      } else if (type === 'AVE_PREVIEW_PARENT') {
        const element = document.querySelector(path) as HTMLElement;
        if (element) {
          const parent = element.parentElement;
          if (parent && parent !== document.body) {
            window.parent.postMessage({
              type: 'AVE_PARENT_PREVIEW',
              element: getElementInfo(parent)
            }, '*');
          } else {
            window.parent.postMessage({
              type: 'AVE_PARENT_PREVIEW',
              element: null
            }, '*');
          }
        }
      } else if (type === 'AVE_CLEAR_PARENT_PREVIEW') {
        window.parent.postMessage({
          type: 'AVE_PARENT_PREVIEW',
          element: null
        }, '*');
      } else if (type === 'AVE_HIGHLIGHT_ELEMENT') {
        const element = document.querySelector(path) as HTMLElement;
        if (element) {
          window.parent.postMessage({
            type: 'AVE_PARENT_PREVIEW',
            element: getElementInfo(element)
          }, '*');
        }
      } else if (type === 'AVE_CLEAR_HIGHLIGHT') {
        window.parent.postMessage({
          type: 'AVE_PARENT_PREVIEW',
          element: null
        }, '*');
      } else if (type === 'AVE_GET_URL') {
        window.parent.postMessage({
          type: 'AVE_CURRENT_URL',
          url: window.location.href
        }, '*');
      }
    });
  }

  private setupEventListeners() {
    // Scroll handler
    window.addEventListener('scroll', () => {
      if (!this.isActive || !this.trackedElement) return;
      this.scheduleUpdate();
    }, { passive: true });

    // Resize handler
    window.addEventListener('resize', () => {
      if (!this.isActive || !this.trackedElement) return;
      this.scheduleUpdate();
    }, { passive: true });

    // Mouse over handler
    document.addEventListener('mouseover', (e: MouseEvent) => {
      if (!this.isActive) return;

      const target = e.target as HTMLElement;
      if (!target || target === document.body) return;

      window.parent.postMessage({
        type: 'AVE_HOVER',
        element: getElementInfo(target)
      }, '*');
    });

    // Click handler
    document.addEventListener('click', (e: MouseEvent) => {
      if (!this.isActive) return;

      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      if (!target || target === document.body) return;

      window.parent.postMessage({
        type: 'AVE_CLICK',
        element: getElementInfo(target),
        shiftKey: e.shiftKey
      }, '*');
    }, true);

    // Keydown handler
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      // Forward keyboard event to parent
      window.parent.postMessage({
        type: 'AVE_KEYDOWN',
        keyEvent: {
          key: e.key,
          code: e.code,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
        },
        isInInput
      }, '*');

      // Handle Escape key
      if (!this.isActive) return;

      if (e.key === 'Escape') {
        if (this.trackedElement && this.resizeObserver) {
          this.resizeObserver.unobserve(this.trackedElement);
          this.trackedElement = null;
        }

        window.parent.postMessage({
          type: 'AVE_ESCAPE'
        }, '*');
      }
    });
  }
}

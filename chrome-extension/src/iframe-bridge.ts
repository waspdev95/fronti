/**
 * iframe Bridge - Minimal content script
 * Runs inside iframe, captures events and sends to parent extension page
 */

import { setupConsoleInterception } from './iframe-bridge/console-interceptor';
import { setupNetworkInterception } from './iframe-bridge/network-interceptor';
import { DOMEventManager } from './iframe-bridge/dom-handlers';

// Only run if we're in an iframe
if (window.self !== window.top) {
  // ===================================================================
  // IMMEDIATE EXECUTION - Console & Network Interception
  // Must run ASAP to catch everything from the start
  // ===================================================================

  // Inject SVG pointer-events none style (wait for head to exist)
  const injectStyle = () => {
    const style = document.createElement('style');
    style.textContent = 'svg * { pointer-events: none !important; }';
    if (document.head) {
      document.head.appendChild(style);
    } else {
      // Wait for head to be available
      const observer = new MutationObserver(() => {
        if (document.head) {
          document.head.appendChild(style);
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }
  };
  injectStyle();

  // Setup console and network interception immediately
  setupConsoleInterception();
  setupNetworkInterception();

  // Track URL changes using Navigation API (Chrome 102+)
  // "currententrychange" fires AFTER navigation completes
  if ('navigation' in window) {
    (window as any).navigation.addEventListener('currententrychange', (event: any) => {
      // Get navigation type to distinguish user navigation from programmatic
      const navigationType = event.navigationType; // 'push', 'replace', 'reload', 'traverse'

      window.parent.postMessage({
        type: 'AVE_URL_CHANGED',
        url: window.location.href,
        navigationType: navigationType
      }, '*');
    });
  }

  // Notify parent that bridge is ready (send immediately)
  window.parent.postMessage({
    type: 'AVE_BRIDGE_READY'
  }, '*');

  // Send initial URL
  window.parent.postMessage({
    type: 'AVE_URL_CHANGED',
    url: window.location.href
  }, '*');

  // ===================================================================
  // DOM-DEPENDENT CODE - Wait for DOM to be ready
  // ===================================================================

  const setupDOMListeners = () => {
    new DOMEventManager();
  };

  // Run setup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDOMListeners);
  } else {
    setupDOMListeners();
  }
}

import ReactDOM from 'react-dom/client';
import { Panel } from '../components/Panel';
import { useAppStore } from '../store';

interface ElementInfo {
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

/**
 * Manages extension lifecycle (message-based mode for iframe)
 */
export class ExtensionManager {
  private root: ReactDOM.Root;
  private enabled: boolean = false;
  private iframe: HTMLIFrameElement;
  private hoverOverlay: HTMLDivElement;
  private hoverLabel: HTMLDivElement;
  private selectedOverlay: HTMLDivElement;
  private selectedLabel: HTMLDivElement;
  private parentPreviewOverlay: HTMLDivElement;
  private currentHoverPath: string | null = null;
  private currentSelectedPath: string | null = null;
  private currentParentPreviewPath: string | null = null;
  private rafId: number | null = null;

  constructor(panelRoot: HTMLElement, iframe: HTMLIFrameElement, autoEnable: boolean = false) {
    this.root = ReactDOM.createRoot(panelRoot);
    this.iframe = iframe;

    // Create hover overlay
    this.hoverOverlay = document.createElement('div');
    this.hoverOverlay.className = 'ave-element-overlay ave-hover-overlay';
    this.hoverOverlay.style.display = 'none';
    document.body.appendChild(this.hoverOverlay);

    this.hoverLabel = document.createElement('div');
    this.hoverLabel.className = 'ave-overlay-label';
    this.hoverOverlay.appendChild(this.hoverLabel);

    // Create selected overlay with parent button
    this.selectedOverlay = document.createElement('div');
    this.selectedOverlay.className = 'ave-element-overlay ave-selected-overlay';
    this.selectedOverlay.style.display = 'none';
    document.body.appendChild(this.selectedOverlay);

    this.selectedLabel = document.createElement('div');
    this.selectedLabel.className = 'ave-overlay-label';
    this.selectedLabel.innerHTML = `
      <span class="ave-label-text"></span>
      <button class="ave-label-parent-btn" title="Select parent element">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    `;
    this.selectedOverlay.appendChild(this.selectedLabel);

    // Create parent preview overlay
    this.parentPreviewOverlay = document.createElement('div');
    this.parentPreviewOverlay.className = 'ave-element-overlay ave-parent-preview-overlay';
    this.parentPreviewOverlay.style.display = 'none';
    document.body.appendChild(this.parentPreviewOverlay);

    // Setup parent button handlers
    const parentBtn = this.selectedLabel.querySelector('.ave-label-parent-btn') as HTMLButtonElement;
    if (parentBtn) {
      parentBtn.addEventListener('click', this.handleParentButtonClick);
      parentBtn.addEventListener('mouseenter', this.handleParentButtonHover);
      parentBtn.addEventListener('mouseleave', this.handleParentButtonLeave);
    }

    this.setupListeners();

    // Auto-enable if in extension page mode
    if (autoEnable) {
      this.enable();
    }
  }

  /**
   * Setup all event listeners
   */
  private setupListeners() {
    // Listen to parent window resize
    window.addEventListener('resize', this.scheduleUpdate, { passive: true });

    // Subscribe to store changes
    this.subscribeToStore();
  }

  /**
   * Subscribe to store changes
   */
  private subscribeToStore() {
    let previousSelectedElements: any[] = [];
    let previousSelectorMode = false;

    useAppStore.subscribe((state) => {
      // Update selected overlay when selection changes
      if (state.selectedElements !== previousSelectedElements) {
        this.updateSelectedOverlay(state.selectedElements);
        previousSelectedElements = state.selectedElements;
      }

      // Handle selector mode changes
      if (state.selectorMode !== previousSelectorMode) {
        if (!state.selectorMode) {
          // Hide all overlays when selector mode is off
          this.hoverOverlay.style.display = 'none';
          this.selectedOverlay.style.display = 'none';
          this.parentPreviewOverlay.style.display = 'none';
        }
        previousSelectorMode = state.selectorMode;
      }
    });
  }

  /**
   * Schedule update using requestAnimationFrame
   */
  private scheduleUpdate = () => {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      // Request position update from iframe for selected element
      if (this.currentSelectedPath) {
        this.iframe.contentWindow?.postMessage({
          type: 'AVE_REQUEST_POSITION',
          path: this.currentSelectedPath
        }, '*');
      }
      // Also update parent preview if visible
      if (this.currentParentPreviewPath) {
        this.iframe.contentWindow?.postMessage({
          type: 'AVE_REQUEST_PARENT_POSITION',
          path: this.currentParentPreviewPath
        }, '*');
      }
      this.rafId = null;
    });
  };

  /**
   * Enable the extension
   */
  private enable() {
    this.enabled = true;

    // Show panel
    this.root.render(<Panel />);

    // Reset store state
    const store = useAppStore.getState();
    store.clearSelectedElements();
  }

  /**
   * Update selected overlay when store changes
   */
  private updateSelectedOverlay(selectedElements: any[]) {
    if (selectedElements.length === 0) {
      this.selectedOverlay.style.display = 'none';
      this.currentSelectedPath = null;
      return;
    }

    const lastSelected = selectedElements[selectedElements.length - 1];
    this.currentSelectedPath = lastSelected.path;

    // Update label text
    const labelText = this.selectedLabel.querySelector('.ave-label-text');
    if (labelText) {
      labelText.textContent = this.getDisplayText(lastSelected);
    }

    // Request initial position from iframe
    this.iframe.contentWindow?.postMessage({
      type: 'AVE_REQUEST_POSITION',
      path: lastSelected.path
    }, '*');
  }

  /**
   * Get display text for element
   */
  private getDisplayText(element: { tag: string; id: string; classes: string }): string {
    const tag = element.tag;
    const id = element.id ? `#${element.id}` : '';
    const classes = element.classes ? `.${element.classes.split('.').filter(c => c && !c.startsWith('ave-')).slice(0, 2).join('.')}` : '';
    return `${tag}${id}${classes}`;
  }

  /**
   * Handle hover event from iframe-bridge
   */
  public handleHover(element: ElementInfo) {
    const store = useAppStore.getState();

    // Don't show hover if selector mode is off
    if (!store.selectorMode) {
      this.hoverOverlay.style.display = 'none';
      return;
    }

    // Don't show hover if there are selected elements
    if (store.selectedElements.length > 0) {
      this.hoverOverlay.style.display = 'none';
      return;
    }

    this.currentHoverPath = element.path;

    // Update label
    this.hoverLabel.textContent = this.getDisplayText(element);

    // Position overlay
    this.positionOverlay(this.hoverOverlay, element);
    this.hoverOverlay.style.display = 'block';
  }

  /**
   * Handle click event from iframe-bridge
   */
  public handleClick(element: ElementInfo, shiftKey: boolean) {
    const store = useAppStore.getState();

    // Don't handle clicks if selector mode is off
    if (!store.selectorMode) return;

    // If there are already selected elements and not shift-clicking, clear selection and show hover
    if (store.selectedElements.length > 0 && !shiftKey) {
      store.clearSelectedElements();
      this.selectedOverlay.style.display = 'none';
      this.parentPreviewOverlay.style.display = 'none';

      // Show hover overlay on clicked element immediately
      this.currentHoverPath = element.path;
      this.hoverLabel.textContent = this.getDisplayText(element);
      this.positionOverlay(this.hoverOverlay, element);
      this.hoverOverlay.style.display = 'block';

      return;
    }

    // Create element info for store
    const elementInfo = {
      tag: element.tag,
      id: element.id,
      classes: element.classes,
      path: element.path,
      text: element.text,
      url: this.iframe.src,
      element: null as any,
      css: ''
    };

    // Add element
    store.addSelectedElement(elementInfo);

    // Disable selector mode after selection
    store.selectorMode = false;

    // Hide hover overlay
    this.hoverOverlay.style.display = 'none';

    // Request iframe to start tracking this element
    this.iframe.contentWindow?.postMessage({
      type: 'AVE_TRACK_ELEMENT',
      path: element.path
    }, '*');
  }

  /**
   * Handle escape key from iframe-bridge
   */
  public handleEscape() {
    const store = useAppStore.getState();
    store.clearSelectedElements();
    this.selectedOverlay.style.display = 'none';
    this.parentPreviewOverlay.style.display = 'none';
  }

  /**
   * Handle parent selection from iframe-bridge
   */
  public handleParentSelect(element: ElementInfo) {
    const store = useAppStore.getState();

    // Create element info for store
    const elementInfo = {
      tag: element.tag,
      id: element.id,
      classes: element.classes,
      path: element.path,
      text: element.text,
      url: this.iframe.src,
      element: null as any,
      css: ''
    };

    // Clear current selection and select parent
    store.clearSelectedElements();
    store.addSelectedElement(elementInfo);

    // Hide parent preview
    this.parentPreviewOverlay.style.display = 'none';
    this.currentParentPreviewPath = null;
  }

  /**
   * Handle parent preview from iframe-bridge
   */
  public handleParentPreview(element: ElementInfo | null) {
    if (!element) {
      this.parentPreviewOverlay.style.display = 'none';
      this.currentParentPreviewPath = null;
      return;
    }

    this.currentParentPreviewPath = element.path;
    this.positionOverlay(this.parentPreviewOverlay, element);
    this.parentPreviewOverlay.style.display = 'block';
  }

  /**
   * Handle position update from iframe-bridge
   */
  public handlePositionUpdate(element: ElementInfo) {
    // Update selected overlay if this is the tracked element
    if (element.path === this.currentSelectedPath) {
      this.positionOverlay(this.selectedOverlay, element);
      this.selectedOverlay.style.display = 'block';
    }

    // Update parent preview if this is the parent element
    if (element.path === this.currentParentPreviewPath) {
      this.positionOverlay(this.parentPreviewOverlay, element);
      this.parentPreviewOverlay.style.display = 'block';
    }
  }

  /**
   * Handle parent button click
   */
  private handleParentButtonClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    // Request parent selection from iframe
    if (this.currentSelectedPath) {
      this.iframe.contentWindow?.postMessage({
        type: 'AVE_SELECT_PARENT',
        path: this.currentSelectedPath
      }, '*');
    }
  };

  /**
   * Handle parent button hover - show parent preview
   */
  private handleParentButtonHover = () => {
    if (this.currentSelectedPath) {
      this.iframe.contentWindow?.postMessage({
        type: 'AVE_PREVIEW_PARENT',
        path: this.currentSelectedPath
      }, '*');
    }
  };

  /**
   * Handle parent button leave - hide parent preview
   */
  private handleParentButtonLeave = () => {
    this.parentPreviewOverlay.style.display = 'none';
    this.currentParentPreviewPath = null;
  };

  /**
   * Position overlay based on element info and iframe offset
   */
  private positionOverlay(overlay: HTMLDivElement, element: ElementInfo) {
    const iframeRect = this.iframe.getBoundingClientRect();

    overlay.style.position = 'absolute';
    overlay.style.top = `${iframeRect.top + element.rect.top}px`;
    overlay.style.left = `${iframeRect.left + element.rect.left}px`;
    overlay.style.width = `${element.rect.width}px`;
    overlay.style.height = `${element.rect.height}px`;

    // Position label at bottom if not enough space at top
    const label = overlay.querySelector('.ave-overlay-label') as HTMLElement;
    if (label) {
      const LABEL_HEIGHT = 30;
      const hasSpaceAtTop = element.rect.top >= LABEL_HEIGHT;

      if (hasSpaceAtTop) {
        label.classList.remove('ave-label-bottom');
      } else {
        label.classList.add('ave-label-bottom');
      }
    }
  }

}

import ReactDOM from 'react-dom/client';
import { Panel } from '../components/Panel';
import { useAppStore } from '../store';
import { getElementDisplayText } from '../utils/element-display';

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
  private static rootInstance: ReactDOM.Root | null = null;
  private root: ReactDOM.Root;
  private enabled: boolean = false;
  private iframe: HTMLIFrameElement;
  private hoverOverlay: HTMLDivElement;
  private hoverLabel: HTMLDivElement;
  private selectedOverlay: HTMLDivElement;
  private selectedLabel: HTMLDivElement;
  private parentPreviewOverlay: HTMLDivElement;
  private addButtons: Map<string, HTMLButtonElement>;
  private currentHoverPath: string | null = null;
  private currentSelectedPath: string | null = null;
  private currentParentPreviewPath: string | null = null;
  private rafId: number | null = null;

  constructor(panelRoot: HTMLElement, iframe: HTMLIFrameElement, autoEnable: boolean = false) {
    // Reuse existing root to prevent chat panel re-mounting on iframe reload
    if (!ExtensionManager.rootInstance) {
      ExtensionManager.rootInstance = ReactDOM.createRoot(panelRoot);
    }
    this.root = ExtensionManager.rootInstance;
    this.iframe = iframe;
    this.addButtons = new Map();

    // Create hover overlay (no parent button, simpler)
    this.hoverOverlay = document.createElement('div');
    this.hoverOverlay.className = 'ave-element-overlay ave-hover-overlay';
    this.hoverOverlay.style.display = 'none';
    document.body.appendChild(this.hoverOverlay);

    this.hoverLabel = document.createElement('div');
    this.hoverLabel.className = 'ave-overlay-label ave-hover-label';
    this.hoverLabel.innerHTML = `
      <span class="ave-label-text-hover"></span>
    `;
    this.hoverOverlay.appendChild(this.hoverLabel);

    // Create selected overlay with parent button
    this.selectedOverlay = document.createElement('div');
    this.selectedOverlay.className = 'ave-element-overlay ave-selected-overlay';
    this.selectedOverlay.style.display = 'none';
    document.body.appendChild(this.selectedOverlay);

    // Create label wrapper to hold both label and parent button
    const labelWrapper = document.createElement('div');
    labelWrapper.className = 'ave-label-wrapper';
    this.selectedOverlay.appendChild(labelWrapper);

    this.selectedLabel = document.createElement('div');
    this.selectedLabel.className = 'ave-overlay-label';
    this.selectedLabel.innerHTML = `
      <span class="ave-label-text"></span>
    `;
    labelWrapper.appendChild(this.selectedLabel);

    // Create parent button as separate element
    const parentBtn = document.createElement('button');
    parentBtn.className = 'ave-label-parent-btn';
    parentBtn.title = 'Select parent element';
    parentBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    `;
    labelWrapper.appendChild(parentBtn);

    // Create add element buttons
    const addBtnTop = document.createElement('button');
    addBtnTop.className = 'ave-add-btn ave-add-btn-top';
    addBtnTop.title = 'Add an element above';
    addBtnTop.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;
    addBtnTop.addEventListener('click', () => this.handleAddButtonClick('top'));
    this.selectedOverlay.appendChild(addBtnTop);
    this.addButtons.set('top', addBtnTop);

    const addBtnRight = document.createElement('button');
    addBtnRight.className = 'ave-add-btn ave-add-btn-right';
    addBtnRight.title = 'Add an element to the right';
    addBtnRight.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;
    addBtnRight.addEventListener('click', () => this.handleAddButtonClick('right'));
    this.selectedOverlay.appendChild(addBtnRight);
    this.addButtons.set('right', addBtnRight);

    const addBtnBottom = document.createElement('button');
    addBtnBottom.className = 'ave-add-btn ave-add-btn-bottom';
    addBtnBottom.title = 'Add an element below';
    addBtnBottom.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;
    addBtnBottom.addEventListener('click', () => this.handleAddButtonClick('bottom'));
    this.selectedOverlay.appendChild(addBtnBottom);
    this.addButtons.set('bottom', addBtnBottom);

    const addBtnLeft = document.createElement('button');
    addBtnLeft.className = 'ave-add-btn ave-add-btn-left';
    addBtnLeft.title = 'Add an element to the left';
    addBtnLeft.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;
    addBtnLeft.addEventListener('click', () => this.handleAddButtonClick('left'));
    this.selectedOverlay.appendChild(addBtnLeft);
    this.addButtons.set('left', addBtnLeft);

    // Create parent preview overlay
    this.parentPreviewOverlay = document.createElement('div');
    this.parentPreviewOverlay.className = 'ave-element-overlay ave-parent-preview-overlay';
    this.parentPreviewOverlay.style.display = 'none';
    document.body.appendChild(this.parentPreviewOverlay);

    // Setup parent button handlers
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
    let previousPlaceholder: any = null;

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

      // Handle placeholder changes - update button active state
      if (state.placeholder !== previousPlaceholder) {
        // Remove active class from all buttons
        this.addButtons.forEach(btn => btn.classList.remove('active'));

        // Add active class to selected button
        if (state.placeholder) {
          const activeBtn = this.addButtons.get(state.placeholder.position);
          if (activeBtn) {
            activeBtn.classList.add('active');
          }
        }
        previousPlaceholder = state.placeholder;
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
      labelText.textContent = getElementDisplayText(lastSelected);
    }

    // Request initial position from iframe
    this.iframe.contentWindow?.postMessage({
      type: 'AVE_REQUEST_POSITION',
      path: lastSelected.path
    }, '*');
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

    // Update label text (use the span)
    const labelTextSpan = this.hoverLabel.querySelector('.ave-label-text-hover');
    if (labelTextSpan) {
      labelTextSpan.textContent = getElementDisplayText(element);
    }

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
      store.clearPlaceholder();
      this.selectedOverlay.style.display = 'none';
      this.parentPreviewOverlay.style.display = 'none';

      // Show hover overlay on clicked element immediately
      this.currentHoverPath = element.path;
      const labelTextSpan = this.hoverLabel.querySelector('.ave-label-text-hover');
      if (labelTextSpan) {
        labelTextSpan.textContent = getElementDisplayText(element);
      }
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

    // Don't disable selector mode - keep it active for better workflow
    // User can now immediately select another element or submit the command

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
    store.clearPlaceholder();
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

    const LABEL_HEIGHT = 30;
    const hasSpaceAtTop = element.rect.top >= LABEL_HEIGHT;

    // Position label wrapper at bottom if not enough space at top (for selected overlay)
    const labelWrapper = overlay.querySelector('.ave-label-wrapper') as HTMLElement;
    if (labelWrapper) {
      if (hasSpaceAtTop) {
        labelWrapper.classList.remove('ave-label-bottom');
      } else {
        labelWrapper.classList.add('ave-label-bottom');
      }
    }

    // Position hover label at bottom if not enough space at top (for hover overlay)
    const hoverLabel = overlay.querySelector('.ave-hover-label') as HTMLElement;
    if (hoverLabel) {
      if (hasSpaceAtTop) {
        hoverLabel.classList.remove('ave-label-bottom');
      } else {
        hoverLabel.classList.add('ave-label-bottom');
      }
    }
  }

  /**
   * Handle add button click - toggle placeholder position
   */
  private handleAddButtonClick = (position: 'top' | 'right' | 'bottom' | 'left') => {
    const store = useAppStore.getState();

    if (!this.currentSelectedPath || store.selectedElements.length === 0) return;

    // If clicking the same button that's already active, deactivate it
    if (store.placeholder && store.placeholder.position === position) {
      store.clearPlaceholder();
      return;
    }

    const selectedElement = store.selectedElements[store.selectedElements.length - 1];

    // Set placeholder in store (button will get active class via subscribeToStore)
    store.setPlaceholder({
      position,
      relativeToElement: {
        tag: selectedElement.tag,
        id: selectedElement.id,
        classes: selectedElement.classes,
        path: selectedElement.path
      },
      placeholderId: `ave-placeholder-${Date.now()}`
    });
  };

}

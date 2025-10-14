/**
 * Centralized Keyboard Shortcuts Manager
 * Handles keyboard shortcuts from both main window and iframe
 */

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  allowInInput?: boolean; // Allow execution when focus is in input/textarea/contentEditable
}

interface KeyEventData {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled = true;

  /**
   * Register a keyboard shortcut
   */
  register(id: string, shortcut: KeyboardShortcut) {
    this.shortcuts.set(id, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(id: string) {
    this.shortcuts.delete(id);
  }

  /**
   * Enable/disable all shortcuts
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Handle keyboard event from either window or iframe
   */
  handleKeyEvent(event: KeyboardEvent | KeyEventData, isInInput = false): boolean {
    if (!this.enabled) return false;

    // Auto-detect if this is a real KeyboardEvent
    if (event instanceof KeyboardEvent) {
      const target = event.target as HTMLElement;
      isInInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
    }

    // Find matching shortcut
    for (const [id, shortcut] of this.shortcuts) {
      if (this.matchesShortcut(event, shortcut)) {
        // Skip if in input and not allowed
        if (isInInput && !shortcut.allowInInput) {
          continue;
        }

        // Prevent default only if this is a real event
        if (event instanceof KeyboardEvent) {
          event.preventDefault();
          event.stopPropagation();
        }

        shortcut.action();
        return true;
      }
    }

    return false;
  }

  /**
   * Check if event matches a shortcut
   * Note: ctrl on shortcut matches both Ctrl (Windows/Linux) and Cmd (Mac)
   */
  private matchesShortcut(event: KeyboardEvent | KeyEventData, shortcut: KeyboardShortcut): boolean {
    // Key must match
    if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) return false;

    // For ctrl shortcuts, accept either Ctrl or Cmd (Mac)
    if (shortcut.ctrl) {
      if (!event.ctrlKey && !event.metaKey) return false;
    } else {
      // If ctrl is not required, neither should be pressed
      if (event.ctrlKey || event.metaKey) return false;
    }

    // For meta shortcuts (explicit Cmd), check metaKey only
    if (shortcut.meta !== undefined) {
      if (!!event.metaKey !== !!shortcut.meta) return false;
    }

    // Check shift and alt
    if (!!event.shiftKey !== !!shortcut.shift) return false;
    if (!!event.altKey !== !!shortcut.alt) return false;

    return true;
  }

  /**
   * Get all registered shortcuts
   */
  getAllShortcuts(): Array<[string, KeyboardShortcut]> {
    return Array.from(this.shortcuts.entries());
  }

  /**
   * Clear all shortcuts
   */
  clear() {
    this.shortcuts.clear();
  }
}

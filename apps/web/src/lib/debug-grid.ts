/**
 * Debug Grid Utility — toggle alignment grid, component outlines, and spacing labels.
 *
 * Usage:
 *   import { enableDebugGrid } from '@/lib/debug-grid';
 *   enableDebugGrid();        // activate on <body>
 *   enableDebugGrid(false);    // deactivate
 *
 * Via console (devtools):
 *   window.__enableDebugGrid(true)
 *   window.__toggleDebugGrid()
 *
 * Via keyboard: Ctrl+Shift+G
 */

declare global {
  interface Window {
    __enableDebugGrid: (on: boolean) => void;
    __toggleDebugGrid: () => boolean;
  }
}

let _active = false;

export function isDebugGridActive(): boolean {
  return _active;
}

export function enableDebugGrid(on = true): void {
  _active = on;
  if (on) {
    document.documentElement.setAttribute('data-debug-grid', 'true');
    document.body.classList.add('debug-grid-baseline');
  } else {
    document.documentElement.removeAttribute('data-debug-grid');
    document.body.classList.remove('debug-grid-baseline');
  }
  // Per-component debug labels: toggle on root container
  const components = document.querySelectorAll('[data-debug-component-root]');
  components.forEach((el) => {
    if (on) {
      el.setAttribute('data-debug-component', el.getAttribute('data-debug-component-root') || '');
    } else {
      el.removeAttribute('data-debug-component');
    }
  });
}

export function toggleDebugGrid(): boolean {
  enableDebugGrid(!_active);
  return _active;
}

export function labelContainer(el: HTMLElement, label: string): void {
  el.setAttribute('data-debug-component-root', label);
}

// ─── Keyboard shortcut ───
if (typeof window !== 'undefined') {
  window.__enableDebugGrid = enableDebugGrid;
  window.__toggleDebugGrid = toggleDebugGrid;
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'G') {
      e.preventDefault();
      toggleDebugGrid();
    }
  });
}

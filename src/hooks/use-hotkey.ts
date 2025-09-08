
import { useEffect } from 'react';

type HotkeyOptions = {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
};

export function useHotkey(
  key: string,
  callback: () => void,
  options: HotkeyOptions = {}
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Prevent firing when typing in inputs
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      
      const { ctrl = false, alt = false, shift = false } = options;
      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === ctrl &&
        event.altKey === alt &&
        event.shiftKey === shift
      ) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [key, callback, options]);
}

    
export function createInputController() {
  let disposed = false;

  return {
    handleKey(eventLike = {}) {
      if (disposed || eventLike.isComposing) return [];
      const key = String(eventLike.key || '');
      const text = typeof eventLike.text === 'string' ? eventLike.text : '';
      const ctrl = Boolean(eventLike.ctrlKey || eventLike.metaKey);
      if (ctrl && key.toLowerCase() === 'c') return [{ type: 'interrupt' }];
      if (ctrl && key.toLowerCase() === 'l') return [{ type: 'screen.clear' }];
      if (key === 'Enter') return [{ type: 'input.submit' }];
      if (key === 'Backspace') return [{ type: 'input.deleteBackward' }];
      if (key === 'ArrowUp') return [{ type: 'history.prev' }];
      if (key === 'ArrowDown') return [{ type: 'history.next' }];
      if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Tab') {
        return [{ type: 'input.raw', key, text: '' }];
      }
      if (text) return [{ type: 'input.insert', text }];
      if (key.length === 1 && !ctrl && !eventLike.altKey) return [{ type: 'input.insert', text: key }];
      return [];
    },
    insertText(text) {
      if (disposed || !text) return [];
      return [{ type: 'input.insert', text: String(text) }];
    },
    dispose() {
      disposed = true;
    },
  };
}

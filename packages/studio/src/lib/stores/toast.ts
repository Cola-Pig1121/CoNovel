import { writable } from 'svelte/store';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);
  let nextId = 0;

  return {
    subscribe,
    add(message: string, type: Toast['type'] = 'info') {
      const id = ++nextId;
      update(t => [...t, { id, message, type }]);
      setTimeout(() => {
        update(t => t.filter(toast => toast.id !== id));
      }, 3000);
    }
  };
}

export const toasts = createToastStore();

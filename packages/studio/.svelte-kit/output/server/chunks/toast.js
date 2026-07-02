import { w as writable } from "./index2.js";
function createToastStore() {
  const { subscribe, update } = writable([]);
  let nextId = 0;
  return {
    subscribe,
    add(message, type = "info") {
      const id = ++nextId;
      update((t) => [...t, { id, message, type }]);
      setTimeout(() => {
        update((t) => t.filter((toast) => toast.id !== id));
      }, 3e3);
    }
  };
}
const toasts = createToastStore();
export {
  toasts as t
};

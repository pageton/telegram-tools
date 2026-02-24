export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export const toastState = $state<{ toasts: Toast[] }>({ toasts: [] });
let nextId = 0;

export function addToast(message: string, type: ToastType = 'info', duration = 3000) {
  const id = ++nextId;
  toastState.toasts.push({ id, message, type });
  setTimeout(() => {
    removeToast(id);
  }, duration);
}

export function removeToast(id: number) {
  const index = toastState.toasts.findIndex((t) => t.id === id);
  if (index !== -1) {
    toastState.toasts.splice(index, 1);
  }
}

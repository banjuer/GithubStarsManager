import { create } from 'zustand';
import { Toast, ToastType } from '../components/Toast';

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  success: (title, message) => {
    get().addToast({ type: 'success', title, message });
  },

  error: (title, message) => {
    get().addToast({ type: 'error', title, message, duration: 6000 });
  },

  warning: (title, message) => {
    get().addToast({ type: 'warning', title, message });
  },

  info: (title, message) => {
    get().addToast({ type: 'info', title, message });
  },
}));

export const toast = {
  success: (title: string, message?: string) => useToast.getState().success(title, message),
  error: (title: string, message?: string) => useToast.getState().error(title, message),
  warning: (title: string, message?: string) => useToast.getState().warning(title, message),
  info: (title: string, message?: string) => useToast.getState().info(title, message),
};

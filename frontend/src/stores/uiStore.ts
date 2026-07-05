import { create } from 'zustand'
import type { ToastMessage, ToastType } from '@/lib/types'

interface UIStore {
  // Theme
  theme: 'light' | 'dark'
  toggleTheme: () => void

  // Toast
  toasts: ToastMessage[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void

  // Sidebar
  sidebarExpanded: boolean
  toggleSidebar: () => void

  // Modal
  activeModal: string | null
  openModal: (name: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  theme: (localStorage.getItem('conovel-theme') as 'light' | 'dark') ?? 'light',
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('conovel-theme', next)
      document.documentElement.setAttribute('data-theme', next)
      return { theme: next }
    }),

  toasts: [],
  addToast: (type, message, duration = 3000) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  sidebarExpanded: true,
  toggleSidebar: () =>
    set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),

  activeModal: null,
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}))

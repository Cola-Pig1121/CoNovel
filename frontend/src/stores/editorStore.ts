import { create } from 'zustand'

interface EditorStore {
  // Current editing state
  bookId: string | null
  chapterNumber: number | null
  content: string
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: string | null

  // Editor mode
  mode: 'solo' | 'co-write'
  showLeftPanel: boolean
  showRightPanel: boolean
  rightPanelTab: 'outline' | 'characters' | 'ai' | 'settings'

  // Editor display settings (persisted to localStorage)
  fontSize: string
  lineHeight: string

  // Actions
  setBookContext: (bookId: string, chapterNumber: number) => void
  setContent: (content: string) => void
  setDirty: (dirty: boolean) => void
  setSaving: (saving: boolean) => void
  setLastSaved: (time: string) => void
  setFontSize: (size: string) => void
  setLineHeight: (height: string) => void
  toggleMode: () => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setRightPanelTab: (tab: EditorStore['rightPanelTab']) => void
  reset: () => void
}

// Load persisted editor settings from localStorage
function loadPersistedSettings() {
  return {
    fontSize: localStorage.getItem('conovel-font-size') || '16',
    lineHeight: localStorage.getItem('conovel-line-height') || '1.8',
  }
}

const persisted = loadPersistedSettings()

const initialState = {
  bookId: null as string | null,
  chapterNumber: null as number | null,
  content: '',
  isDirty: false,
  isSaving: false,
  lastSavedAt: null as string | null,
  mode: 'solo' as const,
  showLeftPanel: true,
  showRightPanel: true,
  rightPanelTab: 'outline' as const,
  fontSize: persisted.fontSize,
  lineHeight: persisted.lineHeight,
}

export const useEditorStore = create<EditorStore>((set) => ({
  ...initialState,

  setBookContext: (bookId, chapterNumber) =>
    set({ bookId, chapterNumber }),

  setContent: (content) =>
    set({ content, isDirty: true }),

  setDirty: (dirty) =>
    set({ isDirty: dirty }),

  setSaving: (saving) =>
    set({ isSaving: saving }),

  setLastSaved: (time) =>
    set({ lastSavedAt: time, isDirty: false }),

  setFontSize: (size) => {
    localStorage.setItem('conovel-font-size', size)
    set({ fontSize: size })
  },

  setLineHeight: (height) => {
    localStorage.setItem('conovel-line-height', height)
    set({ lineHeight: height })
  },

  toggleMode: () =>
    set((s) => ({
      mode: s.mode === 'solo' ? 'co-write' : 'solo',
    })),

  toggleLeftPanel: () =>
    set((s) => ({ showLeftPanel: !s.showLeftPanel })),

  toggleRightPanel: () =>
    set((s) => ({ showRightPanel: !s.showRightPanel })),

  setRightPanelTab: (tab) =>
    set({ rightPanelTab: tab }),

  reset: () =>
    set(initialState),
}))

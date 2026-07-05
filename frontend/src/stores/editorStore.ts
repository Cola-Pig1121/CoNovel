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

  // Actions
  setBookContext: (bookId: string, chapterNumber: number) => void
  setContent: (content: string) => void
  setDirty: (dirty: boolean) => void
  setSaving: (saving: boolean) => void
  setLastSaved: (time: string) => void
  toggleMode: () => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setRightPanelTab: (tab: EditorStore['rightPanelTab']) => void
  reset: () => void
}

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

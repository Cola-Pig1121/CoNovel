import { create } from 'zustand'
import type { BookMeta, BookState, ChapterMeta, CharacterProfile } from '@/lib/types'
import { booksApi, chaptersApi, charactersApi } from '@/lib/api'

interface BookStore {
  // State
  books: BookMeta[]
  currentBook: BookState | null
  chapters: ChapterMeta[]
  characters: CharacterProfile[]
  loading: boolean
  error: string | null

  // Actions
  fetchBooks: () => Promise<void>
  fetchBook: (id: string) => Promise<void>
  createBook: (data: { title: string; genre: string; premise: string }) => Promise<BookMeta>
  updateBook: (id: string, data: Partial<BookMeta>) => Promise<void>
  deleteBook: (id: string) => Promise<void>
  fetchChapters: (bookId: string) => Promise<void>
  fetchCharacters: (bookId: string) => Promise<void>
  clearCurrentBook: () => void
}

export const useBookStore = create<BookStore>((set) => ({
  books: [],
  currentBook: null,
  chapters: [],
  characters: [],
  loading: false,
  error: null,

  fetchBooks: async () => {
    set({ loading: true, error: null })
    try {
      const books = await booksApi.list()
      set({ books, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  fetchBook: async (id) => {
    set({ loading: true, error: null })
    try {
      const book = await booksApi.get(id)
      set({ currentBook: book, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  createBook: async (data) => {
    const meta = await booksApi.create(data)
    set((s) => ({ books: [...s.books, meta] }))
    return meta
  },

  updateBook: async (id, data) => {
    const updated = await booksApi.update(id, data)
    set((s) => ({
      books: s.books.map((b) => (b.id === id ? updated : b)),
      currentBook: s.currentBook?.id === id
        ? { ...s.currentBook, ...updated }
        : s.currentBook,
    }))
  },

  deleteBook: async (id) => {
    await booksApi.delete(id)
    set((s) => ({
      books: s.books.filter((b) => b.id !== id),
      currentBook: s.currentBook?.id === id ? null : s.currentBook,
    }))
  },

  fetchChapters: async (bookId) => {
    try {
      const chapters = await chaptersApi.list(bookId)
      set({ chapters })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  fetchCharacters: async (bookId) => {
    try {
      const characters = await charactersApi.list(bookId)
      set({ characters })
    } catch (e) {
      set({ error: String(e) })
    }
  },

  clearCurrentBook: () => {
    set({ currentBook: null, chapters: [], characters: [] })
  },
}))

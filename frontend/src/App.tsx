import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import BookDetail from './pages/BookDetail'
import Agents from './pages/Agents'
import Pipeline from './pages/Pipeline'
import Store from './pages/Store'
import Settings from './pages/Settings'
import Evolution from './pages/Evolution'
import Workflow from './pages/Workflow'
import Setup from './pages/Setup'
import ImportPage from './pages/ImportPage'

// ---------------------------------------------------------------------------
// Loading screen — shown while checking model status
// ---------------------------------------------------------------------------

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground">
      <h1 className="font-serif text-4xl tracking-tight mb-3">CoNovel</h1>
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted">
        Loading...
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App layout — Sidebar + main content area
// ---------------------------------------------------------------------------

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App — top-level router with model-ready gate
// ---------------------------------------------------------------------------

export default function App() {
  const [modelReady, setModelReady] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => {
      fetch('/api/model/status')
        .then((r) => r.json())
        .then((d) => setModelReady(d.modelReady))
        .catch(() => setModelReady(true))
    }
    check()
    // Poll every 3 seconds until model is ready
    const interval = setInterval(() => {
      setModelReady((prev) => {
        if (prev === true) return prev // Already ready, stop polling
        check()
        return prev
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Still checking
  if (modelReady === null) return <LoadingScreen />

  // Model not ready — show setup page
  if (!modelReady) return <Setup />

  // Everything ready — normal routing
  return (
    <Routes>
      <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
      <Route path="/editor/:bookId" element={<Editor />} />
      <Route path="/book" element={<AppLayout><BookDetail /></AppLayout>} />
      <Route path="/agents" element={<AppLayout><Agents /></AppLayout>} />
      <Route path="/pipeline" element={<AppLayout><Pipeline /></AppLayout>} />
      <Route path="/workflow" element={<AppLayout><Workflow /></AppLayout>} />
      <Route path="/store" element={<AppLayout><Store /></AppLayout>} />
      <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
      <Route path="/import" element={<AppLayout><ImportPage /></AppLayout>} />
      <Route path="/evolution" element={<AppLayout><Evolution /></AppLayout>} />
    </Routes>
  )
}

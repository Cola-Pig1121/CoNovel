import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
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
// App — top-level router with model-ready gate
// ---------------------------------------------------------------------------

export default function App() {
  const [modelReady, setModelReady] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/model/status')
      .then((r) => r.json())
      .then((d) => setModelReady(d.modelReady))
      .catch(() => setModelReady(true)) // If backend not running, assume ready
  }, [])

  // Still checking
  if (modelReady === null) return <LoadingScreen />

  // Model not ready — show setup page
  if (!modelReady) return <Setup />

  // Everything ready — normal routing
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/editor/:bookId" element={<Editor />} />
      <Route path="/book" element={<BookDetail />} />
      <Route path="/agents" element={<Agents />} />
      <Route path="/pipeline" element={<Pipeline />} />
      <Route path="/workflow" element={<Workflow />} />
      <Route path="/store" element={<Store />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/import" element={<ImportPage />} />
      <Route path="/evolution" element={<Evolution />} />
    </Routes>
  )
}

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

export default function App() {
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
      <Route path="/evolution" element={<Evolution />} />
    </Routes>
  )
}

import { Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import History from './pages/History.jsx'
import Keys from './pages/Keys.jsx'
import Sign from './pages/Sign.jsx'
import Verify from './pages/Verify.jsx'
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sign" element={<Sign />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/keys" element={<Keys />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </div>
  )
}

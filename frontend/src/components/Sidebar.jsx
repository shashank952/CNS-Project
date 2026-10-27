import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/sign', label: 'Generate Signature' },
  { to: '/verify', label: 'Verify Signature' },
  { to: '/keys', label: 'Key Management' },
  { to: '/history', label: 'Activity History' },
]

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <p className={styles.brand}>
        Digital Signature System
        <span>Sign, verify, inspect</span>
      </p>
      <nav className={styles.nav} aria-label="Primary">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ''}`.trim()
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

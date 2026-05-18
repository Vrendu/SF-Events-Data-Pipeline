import { Menu } from 'lucide-react'
import type { User } from '../types/user'
import { UserMenu } from './UserMenu'

interface HeaderProps {
  menuOpen: boolean
  user: User | null
  onToggleMenu: () => void
  onCloseMenu: () => void
  onLogin: () => void
  onSignup: () => void
  onDashboard: () => void
  onLogout: () => void
}

export function Header({
  menuOpen,
  user,
  onToggleMenu,
  onCloseMenu,
  onLogin,
  onSignup,
  onDashboard,
  onLogout,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-map-bg" aria-hidden />
      <div className="header-row">
        <span className="logo-badge">Plotted</span>
        <div className="header-menu-anchor">
          <button
            type="button"
            className={`menu-btn ${menuOpen ? 'menu-btn--open' : ''}`}
            aria-label="Account menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={onToggleMenu}
          >
            <Menu size={22} strokeWidth={2.5} />
          </button>
          <UserMenu
            open={menuOpen}
            user={user}
            onClose={onCloseMenu}
            onLogin={() => {
              onCloseMenu()
              onLogin()
            }}
            onSignup={() => {
              onCloseMenu()
              onSignup()
            }}
            onDashboard={() => {
              onCloseMenu()
              onDashboard()
            }}
            onLogout={() => {
              onCloseMenu()
              onLogout()
            }}
          />
        </div>
      </div>
    </header>
  )
}

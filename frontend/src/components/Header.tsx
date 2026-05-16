import { Menu } from 'lucide-react'

export function Header() {
  return (
    <header className="header">
      <div className="header-map-bg" aria-hidden />
      <div className="header-row">
        <span className="logo-badge">Plotted</span>
        <button
          type="button"
          className="menu-btn"
          aria-label="Menu"
          aria-disabled="true"
          title="Coming soon"
        >
          <Menu size={22} strokeWidth={2.5} />
        </button>
      </div>
    </header>
  )
}

import { useEffect, useRef } from 'react'
import type { User } from '../types/user'

interface UserMenuProps {
  open: boolean
  user: User | null
  onClose: () => void
  onLogin: () => void
  onSignup: () => void
  onDashboard: () => void
  onLogout: () => void
}

export function UserMenu({
  open,
  user,
  onClose,
  onLogin,
  onSignup,
  onDashboard,
  onLogout,
}: UserMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if ((target as Element).closest?.('.menu-btn')) return
      onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div ref={panelRef} className="user-menu" role="menu" aria-label="Account menu">
      {user ? (
        <>
          <p className="user-menu__greeting">Hi, {user.displayName}</p>
          <button type="button" className="user-menu__item" role="menuitem" onClick={onDashboard}>
            Dashboard
          </button>
          <button type="button" className="user-menu__item user-menu__item--muted" role="menuitem" onClick={onLogout}>
            Log out
          </button>
        </>
      ) : (
        <>
          <button type="button" className="user-menu__item" role="menuitem" onClick={onLogin}>
            Log in
          </button>
          <button type="button" className="user-menu__item" role="menuitem" onClick={onSignup}>
            Create account
          </button>
        </>
      )}
    </div>
  )
}

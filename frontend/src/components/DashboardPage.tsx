import type { User } from '../types/user'

interface DashboardPageProps {
  user: User
  onBack: () => void
  onLogout: () => void
}

export function DashboardPage({ user, onBack, onLogout }: DashboardPageProps) {
  return (
    <div className="auth-page dashboard-page">
      <header className="auth-page__head">
        <button type="button" className="auth-page__back" onClick={onBack}>
          ← Back to map
        </button>
      </header>
      <div className="auth-page__body">
        <h1 className="auth-page__title">Dashboard</h1>
        <p className="auth-page__subtitle">
          Signed in as <strong>{user.email}</strong>
        </p>
        <div className="dashboard-card">
          <h2 className="dashboard-card__title">Your Plotted account</h2>
          <p className="dashboard-card__text">
            Favorites and saved filters will appear here as account features roll out.
          </p>
        </div>
        <button type="button" className="auth-form__submit auth-form__submit--secondary" onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>
  )
}

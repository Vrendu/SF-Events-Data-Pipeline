import { useState, type FormEvent } from 'react'

interface LoginPageProps {
  onBack: () => void
  onLogin: (email: string, password: string) => Promise<void>
  onGoSignup: () => void
}

export function LoginPage({ onBack, onLogin, onGoSignup }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onLogin(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Log in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-page__head">
        <button type="button" className="auth-page__back" onClick={onBack} disabled={submitting}>
          ← Back to map
        </button>
      </header>
      <div className="auth-page__body">
        <h1 className="auth-page__title">Log in</h1>
        <p className="auth-page__subtitle">Save favorites and manage your plotted events.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={submitting}
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting}
            />
          </label>
          {error && (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="auth-form__submit" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="auth-page__switch">
          New here?{' '}
          <button type="button" className="auth-page__link" onClick={onGoSignup} disabled={submitting}>
            Create an account
          </button>
        </p>
      </div>
    </div>
  )
}

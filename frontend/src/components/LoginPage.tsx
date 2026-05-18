import { useState, type FormEvent } from 'react'

interface LoginPageProps {
  onBack: () => void
  onLogin: (email: string, password: string) => void
  onGoSignup: () => void
}

export function LoginPage({ onBack, onLogin, onGoSignup }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setError(null)
    onLogin(email, password)
  }

  return (
    <div className="auth-page">
      <header className="auth-page__head">
        <button type="button" className="auth-page__back" onClick={onBack}>
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
            />
          </label>
          {error && (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="auth-form__submit">
            Log in
          </button>
        </form>
        <p className="auth-page__switch">
          New here?{' '}
          <button type="button" className="auth-page__link" onClick={onGoSignup}>
            Create an account
          </button>
        </p>
      </div>
    </div>
  )
}

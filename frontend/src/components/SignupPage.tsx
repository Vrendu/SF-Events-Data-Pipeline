import { useState, type FormEvent } from 'react'

interface SignupPageProps {
  onBack: () => void
  onSignup: (email: string, password: string, displayName?: string) => void
  onGoLogin: () => void
}

export function SignupPage({ onBack, onSignup, onGoLogin }: SignupPageProps) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError(null)
    onSignup(email, password, displayName || undefined)
  }

  return (
    <div className="auth-page">
      <header className="auth-page__head">
        <button type="button" className="auth-page__back" onClick={onBack}>
          ← Back to map
        </button>
      </header>
      <div className="auth-page__body">
        <h1 className="auth-page__title">Create account</h1>
        <p className="auth-page__subtitle">Join Plotted to track events across San Francisco.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Name (optional)</span>
            <input
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </label>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </label>
          <label className="auth-field">
            <span>Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          {error && (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="auth-form__submit">
            Create account
          </button>
        </form>
        <p className="auth-page__switch">
          Already have an account?{' '}
          <button type="button" className="auth-page__link" onClick={onGoLogin}>
            Log in
          </button>
        </p>
      </div>
    </div>
  )
}

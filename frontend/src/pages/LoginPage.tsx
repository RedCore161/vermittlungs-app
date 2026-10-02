import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FormField } from '../components/FormField';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Anmeldung fehlgeschlagen. Bitte später erneut versuchen.');
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Anmelden</h1>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <FormField
          label="E-Mail-Adresse"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label="Passwort"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="button" disabled={submitting}>
          Anmelden
        </button>
      </form>
      <p className="auth-switch">
        Noch kein Konto? <Link to="/registrieren">Jetzt registrieren</Link>
      </p>
    </div>
  );
}

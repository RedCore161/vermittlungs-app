import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, type FieldErrors } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FormField } from '../components/FormField';

const EMPTY_FORM = { first_name: '', last_name: '', username: '', email: '', password: '', password_confirm: '' };

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof EMPTY_FORM) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: e.target.value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (form.password !== form.password_confirm) {
      setFieldErrors({ password_confirm: ['Die Passwörter stimmen nicht überein.'] });
      return;
    }

    setSubmitting(true);
    try {
      await register({
        username: form.username.trim(),
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
      });
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        if (Object.keys(err.fieldErrors).length === 0) setError(err.message);
      } else {
        setError('Registrierung fehlgeschlagen. Bitte später erneut versuchen.');
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Registrieren</h1>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <FormField
            label="Vorname"
            autoComplete="given-name"
            value={form.first_name}
            onChange={update('first_name')}
            errors={fieldErrors.first_name}
          />
          <FormField
            label="Nachname"
            autoComplete="family-name"
            value={form.last_name}
            onChange={update('last_name')}
            errors={fieldErrors.last_name}
          />
        </div>
        <FormField
          label="Benutzername"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={150}
          value={form.username}
          onChange={update('username')}
          errors={fieldErrors.username}
        />
        <FormField
          label="E-Mail-Adresse"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={update('email')}
          errors={fieldErrors.email}
        />
        <FormField
          label="Passwort"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={update('password')}
          errors={fieldErrors.password}
        />
        <FormField
          label="Passwort wiederholen"
          type="password"
          autoComplete="new-password"
          required
          value={form.password_confirm}
          onChange={update('password_confirm')}
          errors={fieldErrors.password_confirm}
        />
        <button type="submit" className="button" disabled={submitting}>
          Konto erstellen
        </button>
      </form>
      <p className="auth-switch">
        Bereits registriert? <Link to="/login">Anmelden</Link>
      </p>
    </div>
  );
}

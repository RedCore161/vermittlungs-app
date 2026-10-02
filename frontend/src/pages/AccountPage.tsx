import { useAuth } from '../auth/AuthContext';

export function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  return (
    <div className="auth-card">
      <h1>Mein Konto</h1>
      <dl className="account-details">
        <dt>Name</dt>
        <dd>{fullName || '–'}</dd>
        <dt>E-Mail-Adresse</dt>
        <dd>{user.email}</dd>
      </dl>
    </div>
  );
}

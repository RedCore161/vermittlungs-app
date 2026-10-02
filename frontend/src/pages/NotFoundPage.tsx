import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="auth-card">
      <h1>Seite nicht gefunden</h1>
      <p>
        Die angeforderte Seite existiert nicht. <Link to="/">Zur Startseite</Link>
      </p>
    </div>
  );
}

import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          Vermittlungs-App
        </Link>
        <nav aria-label="Hauptnavigation">
          {loading ? null : user ? (
            <>
              <NavLink to="/konto" className="user-email">
                {user.email}
              </NavLink>
              <button type="button" className="button button-secondary" onClick={handleLogout}>
                Abmelden
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Anmelden</NavLink>
              <NavLink to="/registrieren" className="button">
                Registrieren
              </NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

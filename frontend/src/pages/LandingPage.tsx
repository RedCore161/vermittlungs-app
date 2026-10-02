import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { GermanyMap } from '../components/GermanyMap';

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <section className="hero">
        <h1>Vermittlung in ganz Deutschland</h1>
        {user ? (
          <p>Willkommen zurück{user.first_name ? `, ${user.first_name}` : ''}!</p>
        ) : (
          <p>
            <Link to="/registrieren">Jetzt registrieren</Link> oder <Link to="/login">anmelden</Link>, um loszulegen.
          </p>
        )}
      </section>
      <GermanyMap />
    </div>
  );
}

import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockApi, renderApp, testUser } from './test/utils';

vi.mock('./components/GermanyMap', () => ({
  GermanyMap: () => <div role="region" aria-label="Karte von Deutschland" />,
}));

describe('App', () => {
  it('shows the map of Germany on the landing page', async () => {
    mockApi(null);
    renderApp('/');

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /karte von deutschland/i })).toBeInTheDocument();
  });

  it('offers login and registration when logged out', async () => {
    mockApi(null);
    renderApp('/');

    const nav = await screen.findByRole('navigation');
    expect(await within(nav).findByRole('link', { name: 'Anmelden' })).toHaveAttribute('href', '/login');
    expect(within(nav).getByRole('link', { name: 'Registrieren' })).toHaveAttribute('href', '/registrieren');
  });

  it('shows the logged in user and allows logging out', async () => {
    const calls = mockApi(testUser);
    const { user } = renderApp('/');

    const nav = await screen.findByRole('navigation');
    expect(await within(nav).findByText(testUser.username)).toBeInTheDocument();

    await user.click(within(nav).getByRole('button', { name: 'Abmelden' }));

    expect(calls.logout).toHaveBeenCalledOnce();
    expect(await within(nav).findByRole('link', { name: 'Anmelden' })).toBeInTheDocument();
  });

  it('redirects anonymous users from the account page to the login page', async () => {
    mockApi(null);
    renderApp('/konto');

    expect(await screen.findByRole('heading', { name: 'Anmelden' })).toBeInTheDocument();
  });

  it('shows account details to logged in users', async () => {
    mockApi(testUser);
    renderApp('/konto');

    expect(await screen.findByRole('heading', { name: 'Mein Konto' })).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).getByText('Anna Schmidt')).toBeInTheDocument();
    expect(within(main).getByText('anna')).toBeInTheDocument();
    expect(within(main).getByText('anna@example.com')).toBeInTheDocument();
  });

  it('shows a not found page for unknown routes', async () => {
    mockApi(null);
    renderApp('/gibt-es-nicht');

    expect(await screen.findByRole('heading', { name: /seite nicht gefunden/i })).toBeInTheDocument();
  });
});

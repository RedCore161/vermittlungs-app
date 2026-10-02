import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { mockApi, renderApp, testUser } from '../test/utils';

vi.mock('../components/GermanyMap', () => ({
  GermanyMap: () => <div role="region" aria-label="Karte von Deutschland" />,
}));

describe('LoginPage', () => {
  it('logs the user in and returns to the landing page', async () => {
    const calls = mockApi(null);
    const { user } = renderApp('/login');

    await user.type(await screen.findByLabelText('E-Mail-Adresse'), 'anna@example.com');
    await user.type(screen.getByLabelText('Passwort'), 'S3cure-pass!');
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(calls.login).toHaveBeenCalledWith('anna@example.com', 'S3cure-pass!');
    expect(await screen.findByRole('region', { name: /karte von deutschland/i })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation')).getByText(testUser.email)).toBeInTheDocument();
  });

  it('shows the error message for invalid credentials', async () => {
    const calls = mockApi(null);
    calls.login.mockRejectedValueOnce(new ApiError(400, { non_field_errors: ['E-Mail-Adresse oder Passwort ist falsch.'] }));
    const { user } = renderApp('/login');

    await user.type(await screen.findByLabelText('E-Mail-Adresse'), 'anna@example.com');
    await user.type(screen.getByLabelText('Passwort'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-Mail-Adresse oder Passwort ist falsch.');
    expect(screen.getByRole('heading', { name: 'Anmelden' })).toBeInTheDocument();
  });

  it('returns to the originally requested page after login', async () => {
    mockApi(null);
    const { user } = renderApp('/konto');

    await user.type(await screen.findByLabelText('E-Mail-Adresse'), 'anna@example.com');
    await user.type(screen.getByLabelText('Passwort'), 'S3cure-pass!');
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(await screen.findByRole('heading', { name: 'Mein Konto' })).toBeInTheDocument();
  });

  it('links to the registration page', async () => {
    mockApi(null);
    renderApp('/login');

    const main = await screen.findByRole('main');
    expect(within(main).getByRole('link', { name: /registrieren/i })).toHaveAttribute('href', '/registrieren');
  });
});

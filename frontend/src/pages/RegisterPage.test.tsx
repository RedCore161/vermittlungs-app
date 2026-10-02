import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { mockApi, renderApp, testUser } from '../test/utils';

vi.mock('../components/GermanyMap', () => ({
  GermanyMap: () => <div role="region" aria-label="Karte von Deutschland" />,
}));

async function fillForm(user: ReturnType<typeof renderApp>['user'], password = 'S3cure-pass!', confirm = password) {
  await user.type(await screen.findByLabelText('Vorname'), 'Anna');
  await user.type(screen.getByLabelText('Nachname'), 'Schmidt');
  await user.type(screen.getByLabelText('E-Mail-Adresse'), 'anna@example.com');
  await user.type(screen.getByLabelText('Passwort'), password);
  await user.type(screen.getByLabelText('Passwort wiederholen'), confirm);
}

describe('RegisterPage', () => {
  it('registers a new account and logs the user in', async () => {
    const calls = mockApi(null);
    const { user } = renderApp('/registrieren');

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Konto erstellen' }));

    expect(calls.register).toHaveBeenCalledWith({
      email: 'anna@example.com',
      password: 'S3cure-pass!',
      first_name: 'Anna',
      last_name: 'Schmidt',
    });
    expect(await screen.findByRole('region', { name: /karte von deutschland/i })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation')).getByText(testUser.email)).toBeInTheDocument();
  });

  it('rejects mismatching passwords without calling the API', async () => {
    const calls = mockApi(null);
    const { user } = renderApp('/registrieren');

    await fillForm(user, 'S3cure-pass!', 'other-pass!');
    await user.click(screen.getByRole('button', { name: 'Konto erstellen' }));

    expect(await screen.findByText('Die Passwörter stimmen nicht überein.')).toBeInTheDocument();
    expect(calls.register).not.toHaveBeenCalled();
  });

  it('shows field errors returned by the server', async () => {
    const calls = mockApi(null);
    calls.register.mockRejectedValueOnce(
      new ApiError(400, {
        email: ['Ein Konto mit dieser E-Mail-Adresse existiert bereits.'],
        password: ['Dieses Passwort ist zu kurz.'],
      }),
    );
    const { user } = renderApp('/registrieren');

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Konto erstellen' }));

    expect(await screen.findByText('Ein Konto mit dieser E-Mail-Adresse existiert bereits.')).toBeInTheDocument();
    expect(screen.getByText('Dieses Passwort ist zu kurz.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-Mail-Adresse')).toHaveAttribute('aria-invalid', 'true');
  });
});

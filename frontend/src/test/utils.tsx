import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AppRoutes } from '../App';
import { api, type User } from '../api/client';
import { AuthProvider } from '../auth/AuthContext';

export const testUser: User = { id: 1, email: 'anna@example.com', first_name: 'Anna', last_name: 'Schmidt' };

/** Stubs every API call; `currentUser` controls the initial login state. */
export function mockApi(currentUser: User | null = null) {
  return {
    getCurrentUser: vi.spyOn(api, 'getCurrentUser').mockResolvedValue(currentUser),
    login: vi.spyOn(api, 'login').mockResolvedValue(testUser),
    register: vi.spyOn(api, 'register').mockResolvedValue(testUser),
    logout: vi.spyOn(api, 'logout').mockResolvedValue(undefined),
  };
}

export function renderApp(route = '/') {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    ),
  };
}

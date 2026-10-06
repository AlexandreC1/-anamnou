import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';
import { SecuritySettings } from './SecuritySettings';

it('revokes another session and signs out everywhere through the API', async () => {
  const sessions = [
    {
      id: 'current',
      current: true,
      createdAt: '2026-10-06T10:00:00Z',
      lastSeenAt: '2026-10-06T10:01:00Z',
    },
    {
      id: 'other',
      current: false,
      createdAt: '2026-10-05T10:00:00Z',
      lastSeenAt: '2026-10-06T09:00:00Z',
    },
  ];
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response(JSON.stringify(sessions)))
    .mockResolvedValueOnce(new Response('{"status":"ok"}'))
    .mockResolvedValueOnce(new Response('{"status":"ok"}'));
  render(
    <MemoryRouter initialEntries={['/settings/security']}>
      <Routes>
        <Route
          path="/settings/security"
          element={<SecuritySettings locale="en" />}
        />
        <Route path="/login" element={<h1>Sign in again</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText('Another session');
  await userEvent.click(
    screen.getAllByRole('button', { name: /^Sign out$/ })[1]!,
  );
  await waitFor(() =>
    expect(screen.queryByText('Another session')).not.toBeInTheDocument(),
  );
  expect(request.mock.calls[1]?.[1]?.body).toBe(
    JSON.stringify({ id: 'other' }),
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Sign out everywhere' }),
  );
  await screen.findByRole('heading', { name: 'Sign in again' });
  expect(request.mock.calls[2]?.[1]?.body).toBe('{}');
});

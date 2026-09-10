import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { IdentityForm } from './Identity';

it('registration preserves input after a network failure and recovers on retry', async () => {
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(new Response('{"status":"accepted"}'));
  render(
    <MemoryRouter>
      <IdentityForm mode="register" locale="en" />
    </MemoryRouter>,
  );
  await userEvent.type(screen.getByLabelText('Display name'), 'Test Reader');
  await userEvent.type(
    screen.getByLabelText('Email address'),
    'reader@example.test',
  );
  await userEvent.type(
    screen.getByLabelText('Password'),
    'a long test passphrase',
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Create your account' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('try again');
  expect(screen.getByLabelText('Email address')).toHaveValue(
    'reader@example.test',
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Create your account' }),
  );
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Check your inbox',
  );
  expect(request).toHaveBeenCalledTimes(2);
});

it('an absent recovery token offers a fresh link rather than an unusable form', () => {
  render(
    <MemoryRouter>
      <IdentityForm mode="reset-password" locale="fr" />
    </MemoryRouter>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Ouvrez le lien');
  expect(
    screen.getByRole('link', { name: 'Récupérez votre compte' }),
  ).toHaveAttribute('href', '/forgot-password');
  expect(screen.queryByLabelText('Mot de passe')).not.toBeInTheDocument();
});

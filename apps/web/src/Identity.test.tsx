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
    'Request received.',
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

it('French local verification gives a concrete inbox action and lets the reader correct their email', async () => {
  vi.stubEnv('LOCAL_MAIL_INBOX', 'true');
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('{"status":"accepted"}'),
  );
  try {
    render(
      <MemoryRouter>
        <IdentityForm mode="resend-verification" locale="fr" />
      </MemoryRouter>,
    );
    await userEvent.type(
      screen.getByLabelText('Adresse e-mail'),
      'reader@example.test',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Envoyer un lien de vérification' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Consultez votre e-mail' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Ouvrir la boîte de test' }),
    ).toHaveAttribute('href', 'http://localhost:8025');
    expect(screen.queryByText(/éligible/)).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Utiliser une autre adresse e-mail' }),
    );
    expect(screen.getByLabelText('Adresse e-mail')).toHaveValue(
      'reader@example.test',
    );
  } finally {
    vi.unstubAllEnvs();
  }
});

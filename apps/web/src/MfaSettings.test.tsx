import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';
import { IdentityForm } from './Identity';
import { MfaSettings } from './MfaSettings';

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });

it('enrolls an authenticator, then shows recovery codes once', async () => {
  const codes = Array.from(
    { length: 10 },
    (_, index) =>
      `ABCD-EFGH-IJKL-MN${String.fromCharCode(65 + index)}${String.fromCharCode(65 + index)}`,
  );
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(json({ enabled: false, recoveryCodesRemaining: 0 }))
    .mockResolvedValueOnce(json({}, 401))
    .mockResolvedValueOnce(
      json({
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/Anamnou:reader?secret=JBSWY3DPEHPK3PXP&issuer=Anamnou',
      }),
    )
    .mockResolvedValueOnce(json({ recoveryCodes: codes }));
  render(<MfaSettings locale="en" />);
  await screen.findByText('Two-step verification is off.');
  await userEvent.type(screen.getByLabelText('Current password'), 'wrong');
  await userEvent.click(
    screen.getByRole('button', { name: 'Set up two-step verification' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'The password is incorrect.',
  );
  await userEvent.type(screen.getByLabelText('Current password'), 'correct');
  await userEvent.click(
    screen.getByRole('button', { name: 'Set up two-step verification' }),
  );
  expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
  await userEvent.type(
    screen.getByLabelText('Authenticator or recovery code'),
    '123456',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Turn on' }));
  const list = await screen.findByRole('list');
  expect(within(list).getAllByRole('listitem')).toHaveLength(10);
  expect(request.mock.calls[3]?.[1]?.body).toBe(
    JSON.stringify({ code: '123456' }),
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'I saved these codes' }),
  );
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  expect(
    screen.getByText(/Two-step verification is on\. Unused recovery codes: 10/),
  ).toBeInTheDocument();
});

it('sign-in asks for a verification code when the account requires it', async () => {
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(json({ mfaRequired: true }))
    .mockResolvedValueOnce(json({}, 401))
    .mockResolvedValueOnce(
      json({
        id: 'user',
        email: 'reader@example.test',
        displayName: 'Reader',
        locale: 'ht',
        emailVerified: true,
        mfaEnabled: true,
      }),
    );
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route
          path="/login"
          element={<IdentityForm mode="login" locale="ht" />}
        />
        <Route path="/profile" element={<h1>Profile</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  await userEvent.type(
    screen.getByLabelText('Adrès imèl'),
    'reader@example.test',
  );
  await userEvent.type(screen.getByLabelText('Modpas'), 'a long passphrase');
  await userEvent.click(screen.getByRole('button', { name: 'Konekte' }));
  await screen.findByRole('heading', { name: 'Antre kòd verifikasyon ou' });
  expect(screen.queryByLabelText('Modpas')).not.toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Kòd verifikasyon'), '000000');
  await userEvent.click(
    screen.getByRole('button', { name: 'Verifye epi konekte' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Kòd sa a pa mache',
  );
  await userEvent.clear(screen.getByLabelText('Kòd verifikasyon'));
  await userEvent.type(screen.getByLabelText('Kòd verifikasyon'), '123456');
  await userEvent.click(
    screen.getByRole('button', { name: 'Verifye epi konekte' }),
  );
  await screen.findByRole('heading', { name: 'Profile' });
  expect(request.mock.calls[2]?.[0]).toBe('/api/auth/mfa');
});

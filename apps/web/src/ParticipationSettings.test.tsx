import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { ParticipationSettings } from './ParticipationSettings';

const member = {
  id: '10000000-0000-4000-8000-000000000001',
  class: {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Fictional Class',
    schoolId: '10000000-0000-4000-8000-000000000003',
  },
};
const policy = {
  id: '10000000-0000-4000-8000-000000000004',
  version: 1,
  notice: 'Fictional reviewed participation notice.',
  jurisdiction: 'Test jurisdiction',
  expiresAt: '2099-01-01T00:00:00Z',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
it('requires a reviewed policy choice and sends the displayed version for a participation request', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url, options) => {
      const path = new URL(String(url), 'http://localhost').pathname;
      if (path.endsWith('/request')) {
        expect(JSON.parse(String(options?.body))).toEqual({
          version: 0,
          policyId: policy.id,
        });
        return json({ status: 'PENDING' });
      }
      if (path.endsWith('/policies')) return json([policy]);
      return json([{ ...member, participation: null }]);
    });
  render(
    <MemoryRouter>
      <ParticipationSettings locale="en" />
    </MemoryRouter>,
  );
  const submit = await screen.findByRole('button', {
    name: 'Request participation review',
  });
  expect(submit).toBeDisabled();
  await userEvent.selectOptions(screen.getByRole('combobox'), policy.id);
  expect(screen.getByText(policy.notice)).toBeVisible();
  await userEvent.click(submit);
  expect(
    fetcher.mock.calls.some(([url]) => String(url).endsWith('/request')),
  ).toBe(true);
});
it('withdrawal requires acknowledgement, survives failure and never reports unconfirmed success', async () => {
  let attempted = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    const path = new URL(String(url), 'http://localhost').pathname;
    if (path.endsWith('/withdraw')) {
      attempted++;
      expect(JSON.parse(String(options?.body))).toEqual({ version: 2 });
      return json({}, 409);
    }
    if (path.endsWith('/policies')) return json([policy]);
    return json([
      {
        ...member,
        participation: {
          id: 'auth',
          policyId: policy.id,
          status: 'APPROVED',
          version: 2,
          expiresAt: '2099-01-01T00:00:00Z',
        },
      },
    ]);
  });
  render(
    <MemoryRouter>
      <ParticipationSettings locale="en" />
    </MemoryRouter>,
  );
  const withdraw = await screen.findByRole('button', {
    name: 'Withdraw participation',
  });
  await userEvent.click(withdraw);
  expect(attempted).toBe(0);
  await userEvent.click(
    screen.getByRole('checkbox', {
      name: 'I understand what withdrawal changes.',
    }),
  );
  await userEvent.click(withdraw);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'could not be saved',
  );
  expect(screen.getByRole('status')).toHaveTextContent('Approved');
  expect(withdraw).not.toBeDisabled();
});
it('does not offer enrollment when no approved policy exists', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    String(url).endsWith('/policies')
      ? json([])
      : json([{ ...member, participation: null }]),
  );
  render(
    <MemoryRouter>
      <ParticipationSettings locale="fr" />
    </MemoryRouter>,
  );
  expect(
    await screen.findByText(/aucune politique de participation approuvée/),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Demander un examen' }),
  ).not.toBeInTheDocument();
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import {
  GovernanceAction,
  GovernanceSettings,
  type Grant,
} from './GovernanceSettings';

const school = '10000000-0000-4000-8000-000000000001';
const actor = '10000000-0000-4000-8000-000000000002';
const reviewer = '10000000-0000-4000-8000-000000000003';
const grantId = '10000000-0000-4000-8000-000000000004';
const queueId = '10000000-0000-4000-8000-000000000005';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const makeGrant = (overrides: Partial<Grant> = {}): Grant => ({
  id: grantId,
  schoolId: school,
  userId: reviewer,
  role: 'CONSENT_REVIEWER',
  status: 'REQUESTED',
  expiresAt: '2099-01-01T00:00:00Z',
  requestedById: reviewer,
  ...overrides,
});

function mount({
  role = 'USER',
  own = [] as Grant[],
  grants = [] as Grant[],
  queues = [] as unknown[],
  manageQueues = false,
} = {}) {
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url) => {
      const path = new URL(String(url), 'http://localhost').pathname;
      if (path === '/api/me') return json({ id: actor, role });
      if (path === '/api/me/governance/grants') return json(own);
      if (path === '/api/governance/grants')
        return json({ items: grants, nextCursor: null });
      if (path === '/api/governance/queues')
        return json({
          items: queues,
          nextCursor: null,
          permissions: { manageQueues },
        });
      throw new Error('Unexpected path ' + path);
    });
  render(
    <MemoryRouter>
      <GovernanceSettings locale="en" />
    </MemoryRouter>,
  );
  return request;
}
async function openSchool() {
  await screen.findByRole('heading', { name: 'Your role grants' });
  await userEvent.type(screen.getByLabelText('School ID'), school);
  await userEvent.click(
    screen.getAllByRole('button', { name: 'Open school reviews' })[0]!,
  );
  await screen.findByRole('heading', { name: 'School role grants' });
}

it('shows personal history and reports expired roles without operator mutation controls', async () => {
  mount({
    own: [makeGrant({ status: 'ACTIVE', expiresAt: '2020-01-01T00:00:00Z' })],
  });
  expect(await screen.findByText(/Expired/)).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'Propose a role grant' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Create queue' }),
  ).not.toBeInTheDocument();
});

it('hides self-approval and recipient approval, while platform status alone does not manage queues', async () => {
  mount({
    role: 'PLATFORM_ADMIN',
    grants: [
      makeGrant({ requestedById: actor }),
      makeGrant({ id: queueId, userId: actor }),
    ],
  });
  await openSchool();
  expect(
    screen.getByRole('heading', { name: 'Propose a role grant' }),
  ).toBeVisible();
  expect(screen.queryByText('Approve independently')).not.toBeInTheDocument();
  expect(
    screen.getAllByText('Revoke grant', { selector: 'summary' }),
  ).toHaveLength(2);
  expect(
    screen.queryByRole('button', { name: 'Create queue' }),
  ).not.toBeInTheDocument();
});

it('shows independent approval to a different administrator', async () => {
  mount({ role: 'PLATFORM_ADMIN', grants: [makeGrant()] });
  await openSchool();
  expect(
    screen.getByText('Approve independently', { selector: 'summary' }),
  ).toBeVisible();
});

it('clears proof after a denied mutation, preserves the non-secret draft, and permits retry', async () => {
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(json({}, 403))
    .mockResolvedValueOnce(json({}));
  const done = vi.fn();
  render(
    <GovernanceAction
      locale="en"
      path="/governance/grants/test/revoke"
      label="Revoke"
      done={done}
      body={(data) => ({ reason: data.get('reason') })}
    >
      <label>
        Reason
        <textarea name="reason" />
      </label>
    </GovernanceAction>,
  );
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText('Reason'),
    'A documented change in reviewer duties',
  );
  await user.type(
    screen.getByLabelText('Confirm your password'),
    'test-passphrase',
  );
  await user.type(
    screen.getByLabelText('Authenticator or recovery code'),
    '123456',
  );
  await user.click(screen.getByRole('button', { name: 'Revoke' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Sign in with MFA',
  );
  expect(screen.getByLabelText('Confirm your password')).toHaveValue('');
  expect(screen.getByLabelText('Authenticator or recovery code')).toHaveValue(
    '',
  );
  expect(screen.getByLabelText('Reason')).toHaveValue(
    'A documented change in reviewer duties',
  );
  expect(done).not.toHaveBeenCalled();
  await user.type(
    screen.getByLabelText('Confirm your password'),
    'test-passphrase',
  );
  await user.type(
    screen.getByLabelText('Authenticator or recovery code'),
    '654321',
  );
  await user.click(screen.getByRole('button', { name: 'Revoke' }));
  expect(done).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('status')).toHaveTextContent('saved');
});

it('submits the displayed queue version and retains the draft on conflict', async () => {
  const queue = {
    id: queueId,
    schoolId: school,
    name: 'Privacy team',
    role: 'PRIVACY_REVIEWER',
    primaryGrantId: grantId,
    backupGrantId: reviewer,
    version: 7,
    primaryAvailable: true,
    backupAvailable: false,
    covered: false,
  };
  const request = mount({
    manageQueues: true,
    queues: [queue],
  });
  // Live scope permissions work even when an older grant is absent from history.
  await openSchool();
  await screen.findByText('Backup reviewer authorization unavailable');
  const form = screen
    .getByRole('button', { name: 'Save assignment' })
    .closest('form')!;
  const fields = within(form);
  await userEvent.type(fields.getByLabelText('Queue name'), ' updated');
  await userEvent.type(
    fields.getByLabelText('Confirm your password'),
    'test-passphrase',
  );
  await userEvent.type(
    fields.getByLabelText('Authenticator or recovery code'),
    '123456',
  );
  request.mockResolvedValueOnce(json({}, 409));
  await userEvent.click(
    fields.getByRole('button', { name: 'Save assignment' }),
  );
  expect(await fields.findByRole('alert')).toHaveTextContent('record changed');
  expect(fields.getByLabelText('Queue name')).toHaveValue(
    'Privacy team updated',
  );
  const submitted = JSON.parse(String(request.mock.calls.at(-1)?.[1]?.body));
  expect(submitted).toMatchObject({
    version: 7,
    name: 'Privacy team updated',
    primaryGrantId: grantId,
    backupGrantId: reviewer,
  });
  expect(submitted).not.toHaveProperty('schoolId');
  expect(fields.getByLabelText('Confirm your password')).toHaveValue('');
});

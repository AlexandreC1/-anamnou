import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { expect, it, vi } from 'vitest';
import { MemberProfile } from './MemberProfile';
import { YearbookReader } from './YearbookReader';
import { YearbookEditor } from './YearbookEditor';
import { yearbookCopy } from './yearbook-copy';

function pendingResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

const profile = {
  version: 1,
  membershipId: 'test',
  displayName: 'Test Reader',
  visibility: 'PRIVATE',
  contactVisibility: 'PRIVATE',
  photoAssetId: null,
  nickname: null,
  bio: null,
  quote: null,
  activities: null,
  aspiration: null,
  contact: null,
};

it.each([
  ['profile', 200],
  ['profile', 409],
  ['profile', 500],
  ['yearbook', 200],
  ['yearbook', 409],
  ['yearbook', 500],
] as const)(
  '%s save and preview waits for successful persistence (HTTP %s)',
  async (editor, status) => {
    const pending = pendingResponse();
    const isProfile = editor === 'profile';
    const initial = isProfile
      ? profile
      : {
          version: 1,
          title: 'Our story',
          theme: 'PAPER',
          editable: true,
          sections: [
            { id: 'cover', type: 'COVER', title: 'Cover', body: '', media: [] },
          ],
        };
    const success = { ...initial, version: 2, sectionIds: ['cover'] };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(initial)))
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(new Response(JSON.stringify(success)));
    const path = isProfile
      ? '/classes/class/members/me/profile'
      : '/classes/class/yearbook/edit';
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/classes/:id/members/:memberId/profile"
            element={<MemberProfile locale="en" />}
          />
          <Route
            path="/classes/:id/yearbook/edit"
            element={<YearbookEditor locale="en" />}
          />
          <Route
            path="/classes/:id/yearbook"
            element={<h1>Saved preview</h1>}
          />
        </Routes>
      </MemoryRouter>,
    );
    const field = await screen.findByLabelText(
      isProfile ? /Short biography/ : 'Edition title',
    );
    await userEvent.clear(field);
    await userEvent.type(field, 'Words to preserve');
    await userEvent.click(
      screen.getByRole('button', { name: yearbookCopy.en.savePreview }),
    );
    expect(
      screen.queryByRole('heading', { name: 'Saved preview' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: yearbookCopy.en.savePreview }),
    ).toBeDisabled();
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)),
    ).toMatchObject({
      [isProfile ? 'bio' : 'title']: 'Words to preserve',
      version: 1,
    });
    await act(async () =>
      pending.resolve(new Response(JSON.stringify(success), { status })),
    );
    if (status !== 200) {
      expect(await screen.findByRole('alert')).toBeVisible();
      expect(field).toHaveValue('Words to preserve');
      expect(
        screen.queryByRole('heading', { name: 'Saved preview' }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        screen.getByRole('button', { name: yearbookCopy.en.savePreview }),
      );
    }
    expect(
      await screen.findByRole('heading', { name: 'Saved preview' }),
    ).toBeVisible();
  },
);
it('profile conflicts preserve edits and offer an explicit reload', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response(JSON.stringify(profile)))
    .mockResolvedValueOnce(new Response('{}', { status: 409 }));
  render(
    <MemoryRouter initialEntries={['/classes/class/members/me/profile']}>
      <Routes>
        <Route
          path="/classes/:id/members/:memberId/profile"
          element={<MemberProfile locale="en" />}
        />
      </Routes>
    </MemoryRouter>,
  );
  await userEvent.type(
    await screen.findByLabelText(/Short biography/),
    'Keep these words',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Your edits are still here',
  );
  expect(screen.getByLabelText(/Short biography/)).toHaveValue(
    'Keep these words',
  );
  expect(
    screen.getByRole('button', { name: 'Reload latest version' }),
  ).toBeVisible();
});
it('reader renders section text as text, labels the draft, and hides editing for members', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        version: 1,
        title: 'Our story',
        theme: 'PAPER',
        editable: false,
        class: {
          name: 'Class',
          graduationYear: 2026,
          school: { name: 'School' },
        },
        sections: [
          {
            id: 'section',
            type: 'MESSAGE',
            title: 'Message',
            body: '<script>bad()</script>',
            media: [],
          },
        ],
      }),
    ),
  );
  const { container } = render(
    <MemoryRouter initialEntries={['/classes/class/yearbook']}>
      <Routes>
        <Route
          path="/classes/:id/yearbook"
          element={<YearbookReader locale="en" />}
        />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText('<script>bad()</script>')).toBeVisible();
  expect(container.querySelector('script')).toBeNull();
  expect(screen.getByText('Draft edition')).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'Edit the yearbook' }),
  ).not.toBeInTheDocument();
});

it.each([200, 500])(
  'profile save locks edits and uploads until HTTP %s settles',
  async (status) => {
    const pending = pendingResponse();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(profile)))
      .mockReturnValueOnce(pending.promise);
    render(
      <MemoryRouter initialEntries={['/classes/class/members/me/profile']}>
        <Routes>
          <Route
            path="/classes/:id/members/:memberId/profile"
            element={<MemberProfile locale="en" />}
          />
        </Routes>
      </MemoryRouter>,
    );
    const bio = await screen.findByLabelText(/Short biography/);
    await userEvent.type(bio, 'My submitted story');
    await userEvent.type(
      screen.getByLabelText('Describe this photo'),
      'Graduation portrait',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    for (const control of [
      ...screen.getAllByRole('textbox'),
      ...screen.getAllByRole('combobox'),
      screen.getByLabelText('Choose a photo'),
    ]) {
      expect(control).toBeDisabled();
    }
    await userEvent.type(bio, 'Unsent words');
    expect(bio).toHaveValue('My submitted story');
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)),
    ).toMatchObject({ bio: 'My submitted story', version: 1 });
    await act(async () =>
      pending.resolve(
        new Response(JSON.stringify({ ...profile, version: 2 }), { status }),
      ),
    );
    expect(bio).toBeEnabled();
    expect(screen.getByLabelText('Choose a photo')).toBeEnabled();
    expect(bio).toHaveValue('My submitted story');
    if (status === 200) {
      expect(screen.getByText('Changes saved.')).toBeVisible();
    } else {
      expect(screen.getByRole('alert')).toBeVisible();
      expect(screen.queryByText('Changes saved.')).not.toBeInTheDocument();
    }
    await userEvent.type(bio, ' More words');
    expect(screen.queryByText('Changes saved.')).not.toBeInTheDocument();
  },
);

it('yearbook save locks settings and sections, then keeps returned IDs for the next save', async () => {
  const pending = pendingResponse();
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          version: 0,
          title: 'Our story',
          theme: 'PAPER',
          editable: true,
          sections: [],
        }),
      ),
    )
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          version: 2,
          sectionIds: [
            'cover',
            'message',
            'photo',
            'members',
            'staff',
            'quotes',
          ],
        }),
      ),
    );
  render(
    <MemoryRouter initialEntries={['/classes/class/yearbook/edit']}>
      <Routes>
        <Route
          path="/classes/:id/yearbook/edit"
          element={<YearbookEditor locale="en" />}
        />
      </Routes>
    </MemoryRouter>,
  );
  const title = await screen.findByLabelText('Edition title');
  await userEvent.click(screen.getByText(/^Cover$/, { selector: 'summary' }));
  await userEvent.type(
    screen.getAllByLabelText('Describe this photo')[0]!,
    'Class portrait',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(title).toBeDisabled();
  expect(screen.getByLabelText('Paper & color')).toBeDisabled();
  expect(screen.getByLabelText('Section type')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Add a section' })).toBeDisabled();
  for (const control of [
    ...screen.getAllByLabelText('Section title'),
    ...screen.getAllByLabelText('Choose a photo'),
  ]) {
    expect(control).toBeDisabled();
  }
  await userEvent.type(title, 'Unsent title');
  expect(title).toHaveValue('Our story');
  await act(async () =>
    pending.resolve(
      new Response(
        JSON.stringify({
          version: 1,
          sectionIds: [
            'cover',
            'message',
            'photo',
            'members',
            'staff',
            'quotes',
          ],
        }),
      ),
    ),
  );
  expect(screen.getByText('Changes saved.')).toBeVisible();
  expect(title).toBeEnabled();
  await userEvent.type(title, ' together');
  expect(screen.queryByText('Changes saved.')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByText('Changes saved.')).toBeVisible();
  const saved = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body));
  expect(saved.title).toBe('Our story together');
  expect(saved.version).toBe(1);
  expect(saved.sections.map((section: { id: string }) => section.id)).toEqual([
    'cover',
    'message',
    'photo',
    'members',
    'staff',
    'quotes',
  ]);
});

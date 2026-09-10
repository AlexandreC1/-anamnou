import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from './App';

describe('foundation shell', () => {
  beforeEach(() => window.localStorage.clear());
  it('offers working navigation without pretending class features exist', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Some chapters',
    );
    await userEvent.click(
      screen.getByRole('link', { name: /Discover the idea/ }),
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'A yearbook worth',
    );
    expect(screen.getByText(/Accounts, class invitations/)).toBeVisible();
  });
  it('recovers from a missing route', () => {
    render(
      <MemoryRouter initialEntries={['/does-not-exist']}>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: 'A missing page.' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute(
      'href',
      '/',
    );
  });
  it('shows loading, failure, retry and a verified response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockRejectedValueOnce(new Error('network unavailable'));
    render(
      <MemoryRouter initialEntries={['/connection']}>
        <App />
      </MemoryRouter>,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Check connection' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeVisible();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Connection available.')).toBeVisible();
  });
  it('does not accept an invalid successful API body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
    render(
      <MemoryRouter initialEntries={['/connection']}>
        <App />
      </MemoryRouter>,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Check connection' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeVisible();
  });
  it('switches between Haitian Creole, French, English and Spanish', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    const language = screen.getByRole('combobox', {
      name: 'Language / Lang / Langue / Idioma',
    });
    for (const [option, heading] of [
      ['ht', 'Gen chapit'],
      ['fr', 'Certains chapitres'],
      ['en', 'Some chapters'],
      ['es', 'Algunos capítulos'],
    ] as const) {
      await user.selectOptions(language, option);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        heading,
      );
    }
    await user.selectOptions(language, 'ht');
    expect(window.localStorage.getItem('anamnou-locale')).toBe('ht');
  });
});

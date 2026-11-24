import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from './App';

describe('foundation shell', () => {
  beforeEach(() => window.localStorage.clear());
  it('opens public visitors to the Creole sample without account forms', async () => {
    vi.stubEnv('VITE_PUBLIC_PREVIEW', 'true');
    try {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>,
      );
      expect(
        await screen.findByRole('heading', { name: 'Yon liv pou klas ou.' }),
      ).toBeVisible();
      expect(screen.getByRole('combobox')).toHaveValue('ht');
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /Kreye/ }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        screen.getByRole('button', { name: 'Gade egzanp liv la' }),
      );
      expect(
        screen.getByRole('button', { name: 'Fèmen egzanp lan' }),
      ).toHaveAttribute('aria-expanded', 'true');
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('lets visitors preview the book and discover appearance settings', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole('button', { name: 'Coral' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Customize your theme' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    await user.click(await screen.findByRole('link', { name: 'Appearance' }));
    expect(
      screen.getByRole('heading', { name: 'Your appearance' }),
    ).toBeVisible();
    const lilac = screen.getByRole('button', { name: /Lilac/ });
    await user.click(lilac);
    expect(lilac).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('anamnou-theme')).toBe('lilac');
    expect(document.documentElement.dataset.anamnouTheme).toBe('lilac');
    await user.click(
      screen.getAllByRole('link').find((link) => link.textContent === 'Home')!,
    );
    expect(document.querySelector('.memory-stage')).toHaveAttribute(
      'data-theme',
      'lilac',
    );
    await user.click(
      screen.getByRole('button', { name: 'Preview the yearbook' }),
    );
    const close = screen.getByRole('button', { name: 'Close preview' });
    expect(close).toHaveAttribute('aria-expanded', 'true');
    await user.click(close);
    expect(
      screen.getByRole('button', { name: 'Preview the yearbook' }),
    ).toHaveAttribute('aria-expanded', 'false');
    for (const link of screen.getAllByRole('link', {
      name: 'Create a class',
    })) {
      expect(link).toHaveAttribute('href', '/classes/new');
    }
    expect(screen.getByRole('link', { name: 'Join a class' })).toHaveAttribute(
      'href',
      '/join',
    );
  });
  it('restores the selected appearance from device settings', () => {
    window.localStorage.setItem('anamnou-theme', 'sage');
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(document.documentElement.dataset.anamnouTheme).toBe('sage');
    expect(document.querySelector('.memory-stage')).toHaveAttribute(
      'data-theme',
      'sage',
    );
  });
  it('takes readers from the homepage to Settings', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'A yearbook for your class.',
    );
    await userEvent.click(screen.getByRole('link', { name: 'Settings' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeVisible();
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
      ['ht', 'Yon liv pou klas ou.'],
      ['fr', 'Un album pour votre classe.'],
      ['en', 'A yearbook for your class.'],
      ['es', 'Un anuario para tu clase.'],
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

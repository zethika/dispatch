import { render, screen } from '@testing-library/react';
import { HeroUIProvider } from '@heroui/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue('pong'),
}));

import App from './App';

function renderApp() {
  return render(
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  );
}

describe('App Shell Layout (APP-02)', () => {
  it('renders the top bar', () => {
    renderApp();
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });

  it('renders the sidebar', () => {
    renderApp();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders the request editor', () => {
    renderApp();
    expect(screen.getByTestId('request-editor')).toBeInTheDocument();
  });

  it('renders the response viewer', () => {
    renderApp();
    expect(screen.getByTestId('response-viewer')).toBeInTheDocument();
  });
});

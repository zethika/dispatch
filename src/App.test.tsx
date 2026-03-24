import { render, screen } from '@testing-library/react';
import { HeroUIProvider } from '@heroui/react';
import { describe, it, expect, vi } from 'vitest';

// Mock Tauri invoke since vitest runs outside Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue('pong'),
}));

// Import App after mocking
import App from './App';

describe('App', () => {
  it('renders the Dispatch heading', async () => {
    render(
      <HeroUIProvider>
        <App />
      </HeroUIProvider>
    );
    expect(screen.getByText('Dispatch')).toBeInTheDocument();
  });

  it('renders HeroUI Button component', async () => {
    render(
      <HeroUIProvider>
        <App />
      </HeroUIProvider>
    );
    expect(screen.getByRole('button', { name: /heroui works/i })).toBeInTheDocument();
  });
});

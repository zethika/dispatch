import { render, screen } from '@testing-library/react';
import { HeroUIProvider } from '@heroui/react';
import { describe, it, expect } from 'vitest';
import TopBar from './TopBar';

function renderTopBar() {
  return render(
    <HeroUIProvider>
      <TopBar />
    </HeroUIProvider>
  );
}

describe('TopBar (APP-03)', () => {
  it('shows Connect GitHub button (D-08)', () => {
    renderTopBar();
    expect(screen.getByText('Connect GitHub')).toBeInTheDocument();
  });

  it('shows No Environment placeholder (D-09)', () => {
    renderTopBar();
    expect(screen.getByText('No Environment')).toBeInTheDocument();
  });

  it('shows Local only sync badge (D-10)', () => {
    renderTopBar();
    expect(screen.getByText('Local only')).toBeInTheDocument();
  });
});

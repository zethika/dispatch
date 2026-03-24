import { render, screen } from '@testing-library/react';
import { HeroUIProvider } from '@heroui/react';
import { describe, it, expect } from 'vitest';
import RequestEditor from './RequestEditor';

function renderEditor() {
  return render(
    <HeroUIProvider>
      <RequestEditor />
    </HeroUIProvider>
  );
}

describe('RequestEditor (APP-01)', () => {
  it('shows GET method selector (D-04)', () => {
    renderEditor();
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('shows URL input placeholder', () => {
    renderEditor();
    expect(screen.getByPlaceholderText(/enter request url/i)).toBeInTheDocument();
  });
});

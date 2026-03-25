import { render, screen, fireEvent } from '@testing-library/react';
import { HeroUIProvider } from '@heroui/react';
import { describe, it, expect, vi } from 'vitest';
import VariableEditor from './VariableEditor';
import type { EnvironmentVariable } from '../../types/environments';

function renderEditor(
  variables: EnvironmentVariable[],
  secretValues: Record<string, string> = {},
  onSave = vi.fn(),
) {
  return render(
    <HeroUIProvider>
      <VariableEditor variables={variables} secretValues={secretValues} onSave={onSave} />
    </HeroUIProvider>,
  );
}

describe('VariableEditor (ENV-03)', () => {
  it('renders three columns (key, value, secret toggle) for a non-secret variable', () => {
    renderEditor([{ key: 'API_URL', value: 'https://example.com', secret: false }]);

    // Key input
    expect(screen.getByDisplayValue('API_URL')).toBeInTheDocument();
    // Value input
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
    // Secret toggle button (lock icon)
    expect(screen.getByTestId('secret-toggle-0')).toBeInTheDocument();
  });

  it('shows masked input (type=password) for a secret variable', () => {
    renderEditor(
      [{ key: 'API_KEY', value: '', secret: true }],
      { API_KEY: 'supersecret' },
    );

    const secretInput = screen.getByDisplayValue('supersecret');
    expect(secretInput).toHaveAttribute('type', 'password');
  });

  it('eye icon toggle changes secret input visibility from password to text', () => {
    renderEditor(
      [{ key: 'TOKEN', value: '', secret: true }],
      { TOKEN: 'my-token' },
    );

    const secretInput = screen.getByDisplayValue('my-token');
    expect(secretInput).toHaveAttribute('type', 'password');

    // Click the eye toggle
    const eyeBtn = screen.getByTestId('eye-toggle-0');
    fireEvent.click(eyeBtn);

    expect(secretInput).toHaveAttribute('type', 'text');
  });

  it('secret toggle moves value from public to secrets map on save', () => {
    const onSave = vi.fn();
    renderEditor([{ key: 'MY_VAR', value: 'foo', secret: false }], {}, onSave);

    // Click the secret toggle to make it secret
    const secretToggle = screen.getByTestId('secret-toggle-0');
    fireEvent.click(secretToggle);

    // Click Save
    const saveBtn = screen.getByTestId('save-btn');
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledOnce();
    const [updatedVars, updatedSecrets] = onSave.mock.calls[0] as [
      EnvironmentVariable[],
      Record<string, string>,
    ];
    // Variable value should be cleared (secret)
    expect(updatedVars[0].secret).toBe(true);
    expect(updatedVars[0].value).toBe('');
    // Value moved to secrets map
    expect(updatedSecrets['MY_VAR']).toBe('foo');
  });

  it('secret toggle moves value from secrets map back to public value on save', () => {
    const onSave = vi.fn();
    renderEditor(
      [{ key: 'SECRET_VAR', value: '', secret: true }],
      { SECRET_VAR: 'hiddenvalue' },
      onSave,
    );

    // Click the secret toggle to make it non-secret
    const secretToggle = screen.getByTestId('secret-toggle-0');
    fireEvent.click(secretToggle);

    // Click Save
    const saveBtn = screen.getByTestId('save-btn');
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledOnce();
    const [updatedVars, updatedSecrets] = onSave.mock.calls[0] as [
      EnvironmentVariable[],
      Record<string, string>,
    ];
    // Variable should now be non-secret with the value restored
    expect(updatedVars[0].secret).toBe(false);
    expect(updatedVars[0].value).toBe('hiddenvalue');
    // Should NOT be in secrets map
    expect(updatedSecrets['SECRET_VAR']).toBeUndefined();
  });

  it('Add Variable button adds a new empty row', () => {
    renderEditor([{ key: 'EXISTING', value: 'value', secret: false }]);

    const addBtn = screen.getByTestId('add-variable-btn');
    fireEvent.click(addBtn);

    // Should now have 2 key inputs
    const keyInputs = screen.getAllByRole('textbox', { name: /variable key/i });
    expect(keyInputs).toHaveLength(2);
  });

  it('Delete button removes the row', () => {
    renderEditor([
      { key: 'VAR_ONE', value: 'one', secret: false },
      { key: 'VAR_TWO', value: 'two', secret: false },
    ]);

    // Initially 2 key inputs
    expect(screen.getAllByDisplayValue(/VAR_/)).toHaveLength(2);

    // Delete first row
    const deleteBtn = screen.getByTestId('delete-row-0');
    fireEvent.click(deleteBtn);

    // Should now have only 1
    expect(screen.queryByDisplayValue('VAR_ONE')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('VAR_TWO')).toBeInTheDocument();
  });
});

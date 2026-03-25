import { useState, useEffect } from 'react';
import { Button, Input } from '@heroui/react';
import type { EnvironmentVariable } from '../../types/environments';

interface VariableEditorProps {
  variables: EnvironmentVariable[];
  secretValues: Record<string, string>;
  onSave: (variables: EnvironmentVariable[], secrets: Record<string, string>) => void;
}

interface VariableRow {
  key: string;
  value: string; // public value (empty string if secret)
  secret: boolean;
  secretValue: string; // only used if secret === true
  visibleSecret: boolean; // whether to show secret in plain text
}

function rowsFromProps(
  variables: EnvironmentVariable[],
  secretValues: Record<string, string>,
): VariableRow[] {
  return variables.map((v) => ({
    key: v.key,
    value: v.secret ? '' : v.value,
    secret: v.secret,
    secretValue: v.secret ? (secretValues[v.key] ?? '') : '',
    visibleSecret: false,
  }));
}

export default function VariableEditor({ variables, secretValues, onSave }: VariableEditorProps) {
  const [rows, setRows] = useState<VariableRow[]>(() =>
    rowsFromProps(variables, secretValues),
  );

  // Re-initialize rows when variables or secretValues change (new env selected)
  useEffect(() => {
    setRows(rowsFromProps(variables, secretValues));
  }, [variables, secretValues]);

  const updateRow = (index: number, patch: Partial<VariableRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const toggleSecret = (index: number) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        if (r.secret) {
          // Moving from secret to non-secret: move secretValue back to value
          return { ...r, secret: false, value: r.secretValue, secretValue: '', visibleSecret: false };
        } else {
          // Moving from non-secret to secret: move value to secretValue
          return { ...r, secret: true, secretValue: r.value, value: '', visibleSecret: false };
        }
      }),
    );
  };

  const toggleVisibility = (index: number) => {
    updateRow(index, { visibleSecret: !rows[index].visibleSecret });
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { key: '', value: '', secret: false, secretValue: '', visibleSecret: false },
    ]);
  };

  const handleSave = () => {
    const updatedVariables: EnvironmentVariable[] = rows.map((r) => ({
      key: r.key,
      value: r.secret ? '' : r.value,
      secret: r.secret,
    }));
    const updatedSecrets: Record<string, string> = {};
    for (const r of rows) {
      if (r.secret && r.key) {
        updatedSecrets[r.key] = r.secretValue;
      }
    }
    onSave(updatedVariables, updatedSecrets);
  };

  return (
    <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
      {/* Column headers */}
      <div className="flex gap-2 items-center text-xs text-default-500 px-1">
        <div className="w-8" /> {/* secret toggle column */}
        <div className="flex-1">Key</div>
        <div className="flex-1">Value</div>
        <div className="w-8" /> {/* eye icon column */}
        <div className="w-8" /> {/* delete column */}
      </div>

      {rows.map((row, index) => (
        <div key={index} className="flex gap-2 items-center">
          {/* Secret toggle (lock icon) */}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            aria-label={row.secret ? 'Make non-secret' : 'Make secret'}
            data-testid={`secret-toggle-${index}`}
            onPress={() => toggleSecret(index)}
            className={row.secret ? 'text-warning' : 'text-default-400'}
          >
            {row.secret ? (
              // Lock closed icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              // Lock open icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M18 1.5c2.9 0 5.25 2.35 5.25 5.25v3.75a.75.75 0 01-1.5 0V6.75a3.75 3.75 0 10-7.5 0v3h4.5a3 3 0 013 3v6.75a3 3 0 01-3 3H3.75a3 3 0 01-3-3V12.75a3 3 0 013-3h9v-3c0-2.9 2.35-5.25 5.25-5.25z" />
              </svg>
            )}
          </Button>

          {/* Key input */}
          <Input
            size="sm"
            variant="bordered"
            placeholder="Variable name"
            value={row.key}
            onChange={(e) => updateRow(index, { key: e.target.value })}
            className="flex-1"
            aria-label="Variable key"
          />

          {/* Value input */}
          {row.secret ? (
            <Input
              size="sm"
              variant="bordered"
              placeholder="Secret value"
              type={row.visibleSecret ? 'text' : 'password'}
              value={row.secretValue}
              onChange={(e) => updateRow(index, { secretValue: e.target.value })}
              className="flex-1"
              aria-label="Secret value"
              endContent={
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  aria-label={row.visibleSecret ? 'Hide secret' : 'Show secret'}
                  data-testid={`eye-toggle-${index}`}
                  onPress={() => toggleVisibility(index)}
                  className="text-default-400 -mr-2"
                >
                  {row.visibleSecret ? (
                    // Eye slash icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577A11.217 11.217 0 0112 4.5c5.421 0 9.861 3.667 11.168 8.53zM11.26 7.938a5.25 5.25 0 015.802 5.802l-5.802-5.802z" />
                      <path d="M15.245 17.317l-1.18-1.18a4.83 4.83 0 01-.315.052 5.25 5.25 0 01-5.802-5.802 4.83 4.83 0 01.052-.315l-2.31-2.31C4.53 9.038 3.194 10.564 2.324 12.553c1.307 4.863 5.747 8.53 11.168 8.53.86 0 1.7-.096 2.51-.276l-.757-.49z" />
                    </svg>
                  ) : (
                    // Eye icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                      <path
                        fillRule="evenodd"
                        d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </Button>
              }
            />
          ) : (
            <Input
              size="sm"
              variant="bordered"
              placeholder="Value"
              value={row.value}
              onChange={(e) => updateRow(index, { value: e.target.value })}
              className="flex-1"
              aria-label="Variable value"
            />
          )}

          {/* Spacer for eye icon column when not secret */}
          {!row.secret && <div className="w-8" />}

          {/* Delete button */}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            aria-label="Delete variable"
            data-testid={`delete-row-${index}`}
            onPress={() => removeRow(index)}
            className="text-default-400"
          >
            ✕
          </Button>
        </div>
      ))}

      <div className="flex gap-2 mt-2">
        <Button variant="light" size="sm" onPress={addRow} data-testid="add-variable-btn">
          + Add Variable
        </Button>
        <div className="flex-1" />
        <Button size="sm" color="primary" onPress={handleSave} data-testid="save-btn">
          Save
        </Button>
      </div>
    </div>
  );
}

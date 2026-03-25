import { Button, Checkbox, Input } from '@heroui/react';
import type { KeyValueEntry } from '../../types/collections';

interface KeyValueEditorProps {
  entries: KeyValueEntry[];
  onChange: (entries: KeyValueEntry[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KeyValueEditor({
  entries,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueEditorProps) {
  const updateEntry = (index: number, patch: Partial<KeyValueEntry>) => {
    const updated = entries.map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry,
    );
    onChange(updated);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const addEntry = () => {
    onChange([...entries, { key: '', value: '', enabled: true }]);
  };

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, index) => (
        <div
          key={index}
          className={`flex gap-2 items-center ${!entry.enabled ? 'opacity-50' : ''}`}
        >
          <Checkbox
            isSelected={entry.enabled}
            onValueChange={(checked) => updateEntry(index, { enabled: checked })}
            size="sm"
            aria-label="Enable entry"
          />
          <Input
            size="sm"
            variant="bordered"
            placeholder={keyPlaceholder}
            value={entry.key}
            onChange={(e) => updateEntry(index, { key: e.target.value })}
            className="flex-1"
          />
          <Input
            size="sm"
            variant="bordered"
            placeholder={valuePlaceholder}
            value={entry.value}
            onChange={(e) => updateEntry(index, { value: e.target.value })}
            className="flex-1"
          />
          <Button
            isIconOnly
            size="sm"
            variant="light"
            aria-label="Remove entry"
            onPress={() => removeEntry(index)}
          >
            ✕
          </Button>
        </div>
      ))}

      <Button variant="light" size="sm" className="self-start" onPress={addEntry}>
        + Add
      </Button>
    </div>
  );
}

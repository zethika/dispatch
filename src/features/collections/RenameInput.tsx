import { useEffect, useRef, useState } from 'react';
import { Input } from '@heroui/react';

interface RenameInputProps {
  currentName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export function RenameInput({ currentName, onConfirm, onCancel }: RenameInputProps) {
  const [value, setValue] = useState(currentName);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = value.trim();
      if (trimmed) {
        onConfirm(trimmed);
      } else {
        onCancel();
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onConfirm(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <Input
      ref={ref}
      size="sm"
      value={value}
      onValueChange={setValue}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      classNames={{ input: 'text-sm', inputWrapper: 'h-6 min-h-unit-6' }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

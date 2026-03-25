import { Input } from '@heroui/react';
import type { RequestAuth } from '../../types/collections';

interface AuthEditorProps {
  auth: RequestAuth | null;
  onChange: (auth: RequestAuth | null) => void;
}

export default function AuthEditor({ auth, onChange }: AuthEditorProps) {
  const handleChange = (value: string) => {
    if (value !== '') {
      onChange({ type: 'bearer', token: value });
    } else {
      onChange(null);
    }
  };

  return (
    <div>
      <p className="text-sm text-default-500 mb-1">Token</p>
      <Input
        size="sm"
        variant="bordered"
        placeholder="Enter bearer token..."
        type="password"
        value={auth?.token ?? ''}
        onValueChange={handleChange}
      />
    </div>
  );
}

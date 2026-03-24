import { useState } from 'react';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input } from '@heroui/react';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

export default function RequestEditor() {
  const [method, setMethod] = useState('GET');

  return (
    <div data-testid="request-editor" className="flex flex-col p-4 overflow-y-auto">
      <div className="flex gap-2 items-center">
        <Dropdown>
          <DropdownTrigger>
            <Button size="sm" variant="flat" className="min-w-[80px]">
              {method}
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="HTTP Method"
            selectedKeys={new Set([method])}
            selectionMode="single"
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              if (selected) setMethod(selected);
            }}
          >
            {HTTP_METHODS.map((m) => (
              <DropdownItem key={m}>{m}</DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>

        <Input
          size="sm"
          placeholder="Enter request URL..."
          className="flex-1"
          autoFocus
        />
      </div>

      <p className="mt-4 text-sm text-default-400 text-center">
        Send a request to get started
      </p>
    </div>
  );
}

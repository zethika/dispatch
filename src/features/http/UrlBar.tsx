import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
} from '@heroui/react';
import { useRequestStore } from '../../stores/requestStore';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-success',
  POST: 'text-blue-500',
  PUT: 'text-warning',
  DELETE: 'text-danger',
};

// TODO Phase 4: add {{var}} visual highlighting overlay
export default function UrlBar() {
  const method = useRequestStore((s) => s.method);
  const url = useRequestStore((s) => s.url);
  const isLoading = useRequestStore((s) => s.response.status === 'loading');
  const setMethod = useRequestStore((s) => s.setMethod);
  const setUrl = useRequestStore((s) => s.setUrl);

  const handleSend = () => {
    useRequestStore.getState().sendRequest();
  };

  return (
    <div className="flex gap-2 items-center">
      <Dropdown>
        <DropdownTrigger>
          <Button
            size="sm"
            variant="flat"
            className={`min-w-[80px] font-semibold ${METHOD_COLORS[method] ?? ''}`}
          >
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
            <DropdownItem key={m} className={METHOD_COLORS[m]}>
              {m}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>

      <Input
        size="sm"
        className="flex-1"
        placeholder="Enter request URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <Button
        color="primary"
        size="sm"
        isLoading={isLoading}
        isDisabled={!url.trim() || isLoading}
        onPress={handleSend}
      >
        Send
      </Button>
    </div>
  );
}

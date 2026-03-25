import {
  Button,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
} from '@heroui/react';
import { tokenize, countUnresolved } from '../../utils/variables';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useRequestStore } from '../../stores/requestStore';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-success',
  POST: 'text-blue-500',
  PUT: 'text-warning',
  DELETE: 'text-danger',
};

export default function UrlBar() {
  const method = useRequestStore((s) => s.method);
  const url = useRequestStore((s) => s.url);
  const headers = useRequestStore((s) => s.headers);
  const queryParams = useRequestStore((s) => s.queryParams);
  const body = useRequestStore((s) => s.body);
  const auth = useRequestStore((s) => s.auth);
  const isLoading = useRequestStore((s) => s.response.status === 'loading');
  const setMethod = useRequestStore((s) => s.setMethod);
  const setUrl = useRequestStore((s) => s.setUrl);

  const activeEnvVariables = useEnvironmentStore((s) => s.activeEnvVariables);

  const handleSend = () => {
    useRequestStore.getState().sendRequest();
  };

  // Compute unresolved variable count across all request fields (D-13, ENV-06)
  const allFields = [
    url,
    ...headers.filter((h) => h.enabled).flatMap((h) => [h.key, h.value]),
    ...queryParams.filter((p) => p.enabled).flatMap((p) => [p.key, p.value]),
    body?.content ?? '',
    auth?.token ?? '',
  ];
  const unresolvedCount = countUnresolved(allFields, activeEnvVariables);

  // Tokenize the URL for the highlight overlay
  const urlTokens = tokenize(url, activeEnvVariables);

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

      {/* URL input with variable highlight overlay */}
      <div className="relative flex-1">
        {/* Highlight overlay — positioned over the input, pointer-events: none */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center pointer-events-none overflow-hidden z-10 px-3"
          style={{ fontFamily: 'inherit', fontSize: '0.875rem' }}
        >
          <span className="whitespace-pre overflow-hidden">
            {urlTokens.map((token, i) =>
              token.type === 'variable' ? (
                <span
                  key={i}
                  className={
                    token.resolved
                      ? 'text-warning' // orange/amber for resolved (D-11)
                      : 'text-danger underline decoration-dotted' // red + dotted underline for unresolved (D-12)
                  }
                >
                  {token.text}
                </span>
              ) : (
                <span key={i} className="text-transparent">
                  {token.text}
                </span>
              )
            )}
          </span>
        </div>
        {/* Actual Input with transparent text — caret remains visible */}
        <Input
          size="sm"
          placeholder="Enter request URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          classNames={{
            input: 'text-transparent caret-foreground',
          }}
        />
      </div>

      {/* Unresolved variable badge near Send button (D-13, ENV-06) */}
      {unresolvedCount > 0 && (
        <Chip size="sm" color="warning" variant="flat" className="text-xs">
          {unresolvedCount} unresolved
        </Chip>
      )}

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

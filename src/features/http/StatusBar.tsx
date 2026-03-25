interface StatusBarProps {
  status: number;
  durationMs: number;
  bodySize: number;
}

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

function getStatusColorClass(status: number): string {
  if (status >= 200 && status < 300) {
    return 'text-success bg-success/10';
  }
  if (status >= 400 && status < 500) {
    return 'text-warning bg-warning/10';
  }
  if (status >= 500) {
    return 'text-danger bg-danger/10';
  }
  return 'text-default-500 bg-default/10';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1048576) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function StatusBar({ status, durationMs, bodySize }: StatusBarProps) {
  const colorClass = getStatusColorClass(status);
  const statusText = STATUS_TEXT[status] ?? '';
  const label = statusText ? `${status} ${statusText}` : String(status);

  return (
    <div className="flex gap-3 items-center px-3 py-2 bg-content2 rounded-lg mb-2">
      <span className={`${colorClass} font-semibold px-2 py-0.5 rounded text-sm`}>{label}</span>
      <span className="text-default-500 text-sm">{durationMs} ms</span>
      <span className="text-default-500 text-sm">{formatSize(bodySize)}</span>
    </div>
  );
}

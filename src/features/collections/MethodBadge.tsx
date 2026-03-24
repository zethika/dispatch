const METHOD_COLORS: Record<string, string> = {
  GET: 'text-success',
  POST: 'text-blue-500',
  PUT: 'text-warning',
  DELETE: 'text-danger',
  PATCH: 'text-secondary',
};

interface MethodBadgeProps {
  method: string;
}

export function MethodBadge({ method }: MethodBadgeProps) {
  const upper = method.toUpperCase();
  const colorClass = METHOD_COLORS[upper] ?? 'text-default-500';
  return (
    <span className={`text-[10px] font-bold font-mono w-10 shrink-0 ${colorClass}`}>
      {upper}
    </span>
  );
}

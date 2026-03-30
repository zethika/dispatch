import { MethodBadge } from './MethodBadge';

interface DragOverlayItemProps {
  name: string;
  type: 'request' | 'folder' | 'collection';
  method?: string;
}

export default function DragOverlayItem({ name, type, method }: DragOverlayItemProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-content2 border border-primary rounded-sm shadow-lg opacity-90 text-sm">
      {type === 'request' && method && <MethodBadge method={method} />}
      {type === 'folder' && <span className="text-default-500">...</span>}
      <span className="truncate max-w-[160px]">{name}</span>
    </div>
  );
}

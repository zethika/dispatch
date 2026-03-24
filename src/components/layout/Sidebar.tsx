import { CollectionTree } from '../../features/collections/CollectionTree';

export default function Sidebar() {
  return (
    <div
      data-testid="sidebar"
      className="w-[260px] min-w-[260px] flex flex-col border-r border-divider bg-content1 overflow-y-auto"
    >
      <CollectionTree />
    </div>
  );
}

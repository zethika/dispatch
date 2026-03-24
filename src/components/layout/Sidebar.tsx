export default function Sidebar() {
  return (
    <div
      data-testid="sidebar"
      className="w-[260px] min-w-[260px] flex flex-col border-r border-divider bg-content1 overflow-y-auto"
    >
      <div className="flex flex-col items-center justify-center flex-1 gap-2 p-6 text-center">
        <p className="text-sm font-medium text-default-500">No collections yet</p>
        <p className="text-xs text-default-400">
          Create a collection or connect a GitHub repo to get started
        </p>
      </div>
    </div>
  );
}

import { Button, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';

export default function TopBar() {
  return (
    <div
      data-testid="topbar"
      data-tauri-drag-region
      className="flex items-center px-4 gap-3 h-12 border-b border-divider bg-content1"
    >
      <span className="ml-20 font-semibold text-sm select-none" data-tauri-drag-region>
        Dispatch
      </span>

      <Button size="sm" variant="flat" className="ml-2">
        Connect GitHub
      </Button>

      <Dropdown>
        <DropdownTrigger>
          <Button size="sm" variant="flat">
            No Environment
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label="Environment selector">
          <DropdownItem key="none">No environments configured</DropdownItem>
        </DropdownMenu>
      </Dropdown>

      <div className="flex-1" />

      <Chip variant="flat" color="default" size="sm">
        Local only
      </Chip>
    </div>
  );
}

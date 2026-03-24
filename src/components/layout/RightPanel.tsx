import { useRef, useCallback } from 'react';
import { useUiStore } from '../../stores/uiStore';
import RequestEditor from './RequestEditor';
import ResponseViewer from './ResponseViewer';

export default function RightPanel() {
  const splitRatio = useUiStore((s) => s.splitRatio);
  const setSplitRatio = useUiStore((s) => s.setSplitRatio);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        const newRatio = (moveEvent.clientY - rect.top) / rect.height;
        setSplitRatio(newRatio);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [setSplitRatio]
  );

  return (
    <div
      data-testid="right-panel"
      ref={containerRef}
      className="flex-1 overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateRows: `${splitRatio * 100}% 4px 1fr`,
      }}
    >
      <div className="overflow-hidden">
        <RequestEditor />
      </div>

      <div
        className="cursor-row-resize bg-divider hover:bg-primary transition-colors"
        onMouseDown={onMouseDown}
      />

      <div className="overflow-hidden">
        <ResponseViewer />
      </div>
    </div>
  );
}

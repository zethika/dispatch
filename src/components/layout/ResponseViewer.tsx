import { Spinner, Tabs, Tab } from '@heroui/react';
import { useRequestStore } from '../../stores/requestStore';
import StatusBar from '../../features/http/StatusBar';
import JsonViewer from '../../features/http/JsonViewer';

function getErrorType(message: string): string | null {
  const lower = message.toLowerCase();
  if (lower.includes('dns error') || lower.includes('failed to lookup')) {
    return 'DNS resolution failed';
  }
  if (lower.includes('connection refused')) {
    return 'Connection refused';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Request timed out';
  }
  if (lower.includes('certificate') || lower.includes('ssl') || lower.includes('tls')) {
    return 'TLS/SSL error';
  }
  return null;
}

export default function ResponseViewer() {
  const response = useRequestStore((s) => s.response);

  const renderContent = () => {
    if (response.status === 'idle') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-default-400">
          <p className="text-sm">Send a request to see the response</p>
        </div>
      );
    }

    if (response.status === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <Spinner size="lg" color="primary" />
          <p className="text-default-400 text-sm">Sending request...</p>
        </div>
      );
    }

    if (response.status === 'success') {
      return (
        <>
          <StatusBar
            status={response.data.status}
            durationMs={response.data.duration_ms}
            bodySize={response.data.body.length}
          />
          <Tabs variant="underlined" className="mt-1">
            <Tab key="body" title="Body">
              <JsonViewer body={response.data.body} />
            </Tab>
            <Tab key="headers" title="Headers">
              <div className="space-y-1 font-mono text-sm">
                {response.data.headers.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-blue-400 font-semibold">{h.key}:</span>
                    <span className="text-foreground break-all">{h.value}</span>
                  </div>
                ))}
              </div>
            </Tab>
          </Tabs>
        </>
      );
    }

    if (response.status === 'error') {
      const errorType = getErrorType(response.message);
      return (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 m-2">
          <p className="text-danger font-semibold text-sm mb-2">Request Failed</p>
          {errorType && (
            <p className="text-danger/80 text-sm mb-2">{errorType}</p>
          )}
          <pre className="text-default-500 text-xs font-mono whitespace-pre-wrap">
            {response.message}
          </pre>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      data-testid="response-viewer"
      className="flex flex-col p-3 overflow-y-auto h-full"
    >
      {renderContent()}
    </div>
  );
}

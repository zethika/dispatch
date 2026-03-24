import { useEffect } from 'react';
import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import RightPanel from './components/layout/RightPanel';
import { ping } from './api/system';

export default function App() {
  useEffect(() => {
    ping().then((result) => console.log('IPC ping result:', result)).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <RightPanel />
      </div>
    </div>
  );
}

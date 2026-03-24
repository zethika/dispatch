import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import RightPanel from './components/layout/RightPanel';

export default function App() {
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

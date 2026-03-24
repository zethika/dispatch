import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { ping } from './api/system';

export default function App() {
  const [pong, setPong] = useState<string | null>(null);

  useEffect(() => {
    ping().then(setPong).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <h1 className="text-2xl font-bold">Dispatch</h1>
      <p>IPC ping result: {pong ?? 'loading...'}</p>
      <Button color="primary">HeroUI Works</Button>
    </div>
  );
}

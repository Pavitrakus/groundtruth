import { useEffect, useState } from 'react';
import { ReactorProvider } from '@reactor-team/js-sdk';
import { Activity, AlertTriangle } from 'lucide-react';
import { ControlPanel } from './components/ControlPanel';
import { DataOverlay } from './components/DataOverlay';
import { WorldLog } from './components/WorldLog';
import { WorldCommandBar } from './components/WorldCommandBar';
import { WorldOrchestrator } from './components/WorldOrchestrator';
import { PilotOverlay } from './components/PilotOverlay';
import { ShowcaseDirector } from './components/ShowcaseDirector';
import { ShowcaseOverlay } from './components/ShowcaseOverlay';
import { WorldView } from './components/WorldView';
import { useWorldStore } from './store/worldStore';

type TokenState =
  | { status: 'loading'; token: null; error: null }
  | { status: 'ready'; token: string; error: null }
  | { status: 'error'; token: null; error: string };

export default function App() {
  const reactorModel = useWorldStore((state) => state.reactorModel);
  const [tokenState, setTokenState] = useState<TokenState>({
    status: 'loading',
    token: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function mintToken() {
      try {
        const response = await fetch('/api/token', { method: 'POST' });

        if (!response.ok) {
          const details = await response.text();
          throw new Error(details || `Token request failed: ${response.status}`);
        }

        const data = (await response.json()) as { jwt?: string; token?: string };
        const token = data.jwt ?? data.token;

        if (!token) {
          throw new Error('Token server did not return a jwt.');
        }

        if (isMounted) {
          setTokenState({ status: 'ready', token, error: null });
        }
      } catch (error) {
        if (isMounted) {
          setTokenState({
            status: 'error',
            token: null,
            error: error instanceof Error ? error.message : 'Unknown token error',
          });
        }
      }
    }

    void mintToken();

    return () => {
      isMounted = false;
    };
  }, []);

  if (tokenState.status === 'loading') {
    return (
      <main className="boot-screen">
        <div className="boot-screen__mark">
          <Activity size={18} />
        </div>
        <p className="boot-screen__label">GROUNDTRUTH</p>
        <p className="boot-screen__copy">Minting a live Reactor session</p>
      </main>
    );
  }

  if (tokenState.status === 'error') {
    return (
      <main className="boot-screen boot-screen--error">
        <div className="boot-screen__mark">
          <AlertTriangle size={18} />
        </div>
        <p className="boot-screen__label">TOKEN SERVER OFFLINE</p>
        <p className="boot-screen__copy">{tokenState.error}</p>
      </main>
    );
  }

  return (
    <ReactorProvider
      key={reactorModel}
      modelName={reactorModel}
      jwtToken={tokenState.token}
      connectOptions={{ autoConnect: true, maxAttempts: 12 }}
    >
      <main className="app-shell">
        <WorldView />
        <WorldOrchestrator />
        <ShowcaseDirector />
        <PilotOverlay />
        <ShowcaseOverlay />
        <WorldCommandBar />

        <section className="overlay overlay--top-left" aria-label="Live data">
          <DataOverlay />
        </section>

        <section className="overlay overlay--right-log" aria-label="World event log">
          <WorldLog />
        </section>

        <section className="overlay overlay--bottom-right" aria-label="Demo controls">
          <ControlPanel />
        </section>
      </main>
    </ReactorProvider>
  );
}

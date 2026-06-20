import { useEffect, useState } from 'react';
import { ReactorProvider } from '@reactor-team/js-sdk';
import { AlertTriangle } from 'lucide-react';
import { AudioDirector } from './components/AudioDirector';
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

const MIN_BOOT_MS = 3000;

export default function App() {
  const reactorModel = useWorldStore((state) => state.reactorModel);
  const sceneRevision = useWorldStore((state) => state.sceneRevision);
  const sessionSeed = useWorldStore((state) => state.sessionSeed);
  const [bootComplete, setBootComplete] = useState(false);
  const [tokenState, setTokenState] = useState<TokenState>({
    status: 'loading',
    token: null,
    error: null,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setBootComplete(true), MIN_BOOT_MS);
    return () => window.clearTimeout(timer);
  }, []);

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

  if (tokenState.status === 'loading' || (tokenState.status === 'ready' && !bootComplete)) {
    return (
      <main className="boot-screen">
        <section className="boot-card boot-card--minimal" aria-label="Terra is loading">
          <p className="boot-screen__label">TERRA</p>
          <div className="terra-loader" aria-hidden="true">
            <span />
          </div>
          <p className="boot-screen__copy">Preparing live world</p>
        </section>
      </main>
    );
  }

  if (tokenState.status === 'error') {
    return (
      <main className="boot-screen boot-screen--error">
        <div className="boot-screen__mesh" aria-hidden="true" />
        <section className="boot-card boot-card--error" aria-label="Terra token error">
          <div className="boot-screen__mark">
            <AlertTriangle size={18} />
          </div>
          <p className="boot-screen__eyebrow">SESSION HANDSHAKE FAILED</p>
          <p className="boot-screen__label">TERRA TOKEN LINK OFFLINE</p>
          <p className="boot-screen__copy">{tokenState.error}</p>
        </section>
      </main>
    );
  }

  return (
    <ReactorProvider
      key={`${reactorModel}-${sessionSeed}-${sceneRevision}`}
      modelName={reactorModel}
      jwtToken={tokenState.token}
      connectOptions={{ autoConnect: true, maxAttempts: 12 }}
    >
      <main className="app-shell">
        <WorldView />
        <AudioDirector />
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

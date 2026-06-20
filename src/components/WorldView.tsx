import { useEffect, useState } from 'react';
import { ReactorView } from '@reactor-team/js-sdk';
import { useWorldStore } from '../store/worldStore';

export function WorldView() {
  const frameMode = useWorldStore((state) => state.frameMode);
  const worldMood = useWorldStore((state) => state.worldMood);
  const isConnected = useWorldStore((state) => state.isConnected);
  const reactorModel = useWorldStore((state) => state.reactorModel);
  const selectedLocationId = useWorldStore((state) => state.selectedLocationId);
  const modelLabel = reactorModel === 'lingbot' ? 'LingBot' : 'Helios';
  const fitVideoToPhone = usePhoneVideoFit();

  return (
    <div
      className={`world-stage world-stage--${worldMood} world-stage--frame-${frameMode} world-stage--loc-${selectedLocationId}`}
    >
      <div className="synthetic-world" aria-hidden="true">
        <div className="synthetic-world__sky" />
        <div className="synthetic-world__horizon" />
        <div className="synthetic-world__terrain" />
        <div className="synthetic-world__signal synthetic-world__signal--a" />
        <div className="synthetic-world__signal synthetic-world__signal--b" />
        <div className="synthetic-world__dream synthetic-world__dream--a" />
        <div className="synthetic-world__dream synthetic-world__dream--b" />
      </div>

      <ReactorView
        className="world-video"
        videoObjectFit={fitVideoToPhone ? 'contain' : 'cover'}
        muted
        track="main_video"
      />

      <div className="world-grade" aria-hidden="true" />
      <div className="world-scan" aria-hidden="true" />

      {!isConnected ? (
        <div className="world-standby" aria-live="polite">
          <span className="world-standby__dot" />
          Waiting for {modelLabel}
        </div>
      ) : null}
    </div>
  );
}

function usePhoneVideoFit() {
  const [shouldFitVideo, setShouldFitVideo] = useState(() => window.matchMedia('(max-width: 920px)').matches);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 920px)');
    const sync = () => setShouldFitVideo(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return shouldFitVideo;
}

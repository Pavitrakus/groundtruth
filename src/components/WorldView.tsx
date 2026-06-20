import { ReactorView } from '@reactor-team/js-sdk';
import { useWorldStore } from '../store/worldStore';

export function WorldView() {
  const frameMode = useWorldStore((state) => state.frameMode);
  const worldMood = useWorldStore((state) => state.worldMood);
  const isConnected = useWorldStore((state) => state.isConnected);
  const reactorModel = useWorldStore((state) => state.reactorModel);
  const modelLabel = reactorModel === 'lingbot' ? 'LingBot' : 'Helios';

  return (
    <div className={`world-stage world-stage--${worldMood} world-stage--frame-${frameMode}`}>
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
        videoObjectFit="cover"
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

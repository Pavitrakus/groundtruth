import {
  Activity,
  Bot,
  CloudSun,
  Cpu,
  MapPin,
  RadioTower,
  Signal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { getLocationPreset } from '../engine/worldOptions';
import { useWorldStore } from '../store/worldStore';

export function DataOverlay() {
  const {
    connectionStatus,
    currentChunk,
    currentFrame,
    dataSnapshot,
    isGenerating,
    lastReason,
    pilotLookHorizontal,
    pilotLookVertical,
    pilotMovement,
    reactorModel,
    reactorError,
    selectedLocationId,
    viewMode,
    worldMood,
  } = useWorldStore();
  const location = getLocationPreset(selectedLocationId);

  if (!dataSnapshot) {
    return (
      <aside className="hud hud--loading">
        <div className="hud__status">
          <span className="hud__dot" />
          {connectionStatus.toUpperCase()}
        </div>
        <p className="hud__empty">Waiting for first market, weather, news, and system pulse.</p>
      </aside>
    );
  }

  const marketUp = dataSnapshot.btcChange24h >= 0;
  const TrendIcon = marketUp ? TrendingUp : TrendingDown;

  return (
    <aside className="hud">
      <div className="hud__status">
        <span className={`hud__dot ${connectionStatus === 'ready' ? 'hud__dot--live' : ''}`} />
        {connectionStatus.toUpperCase()}
        <span className="hud__status-pill">{isGenerating ? 'STREAMING' : 'IDLE'}</span>
      </div>

      <div className="hud__hero-row">
        <div>
          <p className="hud__label">World mood</p>
          <strong className="hud__mood">{worldMood}</strong>
        </div>
        <div className="hud__runtime">
          <span>C{currentChunk}</span>
          <span>F{currentFrame}</span>
        </div>
      </div>

      <DataRow
        icon={<Bot size={15} />}
        label="Reactor model"
        value={reactorModel === 'lingbot' ? 'LingBot' : 'Helios'}
        meta={viewMode === 'drone' ? 'DRONE' : viewMode.toUpperCase()}
      />
      {reactorModel === 'lingbot' ? (
        <DataRow
          icon={<NavigationIcon />}
          label="Pilot vector"
          value={labelPilot(pilotMovement)}
          meta={labelLook(pilotLookHorizontal, pilotLookVertical)}
        />
      ) : null}
      <DataRow
        icon={<TrendIcon size={15} />}
        label="Bitcoin"
        value={`$${Math.round(dataSnapshot.btcPrice).toLocaleString()}`}
        meta={`${marketUp ? '+' : ''}${dataSnapshot.btcChange24h.toFixed(2)}%`}
        tone={marketUp ? 'up' : 'down'}
      />
      <DataRow
        icon={<Activity size={15} />}
        label="Fear / greed"
        value={`${dataSnapshot.fearGreedScore.toFixed(0)} / 100`}
        meter={dataSnapshot.fearGreedScore}
      />
      <DataRow
        icon={<Signal size={15} />}
        label="Volatility"
        value={`${dataSnapshot.volatilityIndex.toFixed(0)} / 100`}
        meter={dataSnapshot.volatilityIndex}
        tone="warn"
      />
      <DataRow
        icon={<MapPin size={15} />}
        label="Active location"
        value={location.label}
        meta={location.shortLabel}
      />
      <DataRow
        icon={<CloudSun size={15} />}
        label="Local weather"
        value={`${dataSnapshot.weatherTemp.toFixed(1)} C`}
        meta={`${dataSnapshot.windSpeed.toFixed(0)} km/h`}
      />
      <DataRow
        icon={<RadioTower size={15} />}
        label="News pulse"
        value={dataSnapshot.newsSentiment}
        meta={dataSnapshot.dataSource.toUpperCase()}
        meter={dataSnapshot.newsPulse}
      />
      <DataRow
        icon={<Cpu size={15} />}
        label="System pressure"
        value={`${dataSnapshot.systemPressure.toFixed(0)} / 100`}
        meter={dataSnapshot.systemPressure}
        tone="warn"
      />

      <div className="hud__headline">
        <p className="hud__label">Headline signal</p>
        <p>{dataSnapshot.newsHeadline}</p>
      </div>

      <div className="hud__reason">
        <p className="hud__label">Current transform</p>
        <p>{lastReason}</p>
      </div>

      {reactorError ? <p className="hud__error">{reactorError}</p> : null}

      <footer className="hud__footer">
        Updated {new Date(dataSnapshot.lastUpdated).toLocaleTimeString()}
      </footer>
    </aside>
  );
}

function NavigationIcon() {
  return <Signal size={15} />;
}

function labelPilot(movement: string) {
  if (movement === 'strafe_left') return 'Strafe left';
  if (movement === 'strafe_right') return 'Strafe right';
  return movement.charAt(0).toUpperCase() + movement.slice(1);
}

function labelLook(horizontal: string, vertical: string) {
  if (horizontal !== 'idle' && vertical !== 'idle') {
    return `${horizontal} + ${vertical}`.toUpperCase();
  }

  if (horizontal !== 'idle') return `LOOK ${horizontal.toUpperCase()}`;
  if (vertical !== 'idle') return `LOOK ${vertical.toUpperCase()}`;
  return 'LOOK IDLE';
}

interface DataRowProps {
  icon: React.ReactNode;
  label: string;
  meta?: string;
  meter?: number;
  tone?: 'up' | 'down' | 'warn';
  value: string;
}

function DataRow({ icon, label, meta, meter, tone, value }: DataRowProps) {
  return (
    <div className="data-row">
      <span className={`data-row__icon ${tone ? `data-row__icon--${tone}` : ''}`}>{icon}</span>
      <div className="data-row__body">
        <div className="data-row__top">
          <span className="hud__label">{label}</span>
          {meta ? <span className={`data-row__meta ${tone ? `data-row__meta--${tone}` : ''}`}>{meta}</span> : null}
        </div>
        <strong className="data-row__value">{value}</strong>
        {typeof meter === 'number' ? (
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${Math.max(0, Math.min(100, meter))}%` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useReactor } from '@reactor-team/js-sdk';
import {
  CloudLightning,
  Flame,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Rocket,
  Sparkles,
  Sunrise,
} from 'lucide-react';
import { buildDemoSnapshot, type DemoDataMode } from '../engine/dataFetcher';
import { dataToWorldPrompt } from '../engine/promptEngine';
import { getFrameMode, getLocationPreset, getViewMode, type LocationPreset } from '../engine/worldOptions';
import type { DataMode, DataSnapshot, NewsSentiment } from '../store/worldStore';
import { useWorldStore } from '../store/worldStore';

const SCENARIOS: Array<{
  icon: React.ComponentType<{ size?: number }>;
  id: DemoDataMode;
  label: string;
}> = [
  { icon: Flame, id: 'crash', label: 'Market crash' },
  { icon: Rocket, id: 'bull', label: 'Bull run' },
  { icon: CloudLightning, id: 'storm', label: 'Storm alert' },
  { icon: Sunrise, id: 'open', label: 'Market open' },
  { icon: Pause, id: 'circuit', label: 'Circuit breaker' },
];

const WEATHER_OPTIONS = [
  { code: 0, id: 'clear', label: 'Clear', temp: 25, wind: 8 },
  { code: 61, id: 'rain', label: 'Rain', temp: 19, wind: 24 },
  { code: 95, id: 'storm', label: 'Storm', temp: 27, wind: 58 },
  { code: 45, id: 'fog', label: 'Fog', temp: 14, wind: 5 },
  { code: 71, id: 'snow', label: 'Snow', temp: -2, wind: 18 },
] as const;

const BEHAVIOR_OPTIONS = [
  {
    id: 'neon',
    label: 'Neon surge',
    cue: 'neon towers bloom upward, liquid light highways accelerate, optimistic high-energy motion',
  },
  {
    id: 'collapse',
    label: 'Collapse',
    cue: 'fractured roads, falling monoliths, warning flares, unstable gravity and dark pressure',
  },
  {
    id: 'fortress',
    label: 'Fortress',
    cue: 'defensive architecture rises, shield-like glass walls, controlled institutional strength',
  },
  {
    id: 'bloom',
    label: 'Green bloom',
    cue: 'organic vines, bioluminescent forests, regenerative growth, calm resilient expansion',
  },
  {
    id: 'dream',
    label: 'Dream state',
    cue: 'surreal floating geometry, iridescent weather, soft impossible scale, lucid dream physics',
  },
] as const;

export function ControlPanel() {
  const { sendCommand, status } = useReactor((state) => ({
    sendCommand: state.sendCommand,
    status: state.status,
  }));
  const dataMode = useWorldStore((state) => state.dataMode);
  const [busyId, setBusyId] = useState<DataMode | null>(null);
  const [customBehavior, setCustomBehavior] = useState<(typeof BEHAVIOR_OPTIONS)[number]['id']>('neon');
  const [customEvent, setCustomEvent] = useState('AI demand shock rewires market expectations');
  const [customFear, setCustomFear] = useState(72);
  const [customMove, setCustomMove] = useState(6.8);
  const [customOpen, setCustomOpen] = useState(false);
  const [customSymbol, setCustomSymbol] = useState('NVDA');
  const [customWeather, setCustomWeather] = useState<(typeof WEATHER_OPTIONS)[number]['id']>('clear');

  async function activateScenario(id: DemoDataMode) {
    if (status !== 'ready') return;

    setBusyId(id);
    try {
      const store = useWorldStore.getState();
      const controls = {
        frame: getFrameMode(store.frameMode),
        location: getLocationPreset(store.selectedLocationId),
        view: getViewMode(store.viewMode),
      };
      const scenarioData = buildDemoSnapshot(id, controls.location);
      const { mood, prompt, reason } = dataToWorldPrompt(scenarioData, controls);

      store.setDataMode(id);
      store.setData(scenarioData);
      store.setWorldMood(mood);
      store.setPrompt(prompt);
      store.setReason(reason);
      await sendCommand('set_prompt', {
        prompt: store.reactorModel === 'lingbot' ? prompt.slice(0, 980) : prompt,
      });
      store.addLog(`Manual override: ${labelFor(id)}`, prompt, 'manual');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Manual override failed';
      useWorldStore.getState().setReactorError(message);
      useWorldStore.getState().addLog('Manual override failed', message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function resumeLive() {
    setBusyId('live');
    try {
      useWorldStore.getState().setDataMode('live');
      useWorldStore.getState().addLog('Live feeds resumed', 'Returning prompt authority to live data.', 'system');
    } finally {
      setBusyId(null);
    }
  }

  async function activateCustomSignal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusyId('custom');
    try {
      const store = useWorldStore.getState();
      const controls = {
        frame: getFrameMode(store.frameMode),
        location: getLocationPreset(store.selectedLocationId),
        view: getViewMode(store.viewMode),
      };
      const customData = buildCustomSnapshot({
        behaviorId: customBehavior,
        event: customEvent,
        fear: customFear,
        location: controls.location,
        move: customMove,
        symbol: customSymbol,
        weatherId: customWeather,
      });
      const { mood, prompt, reason } = dataToWorldPrompt(customData, controls);

      store.setDataMode('custom');
      store.setData(customData);
      store.setWorldMood(mood);
      store.setPrompt(prompt);
      store.setReason(reason);

      if (status === 'ready') {
        await sendCommand('set_prompt', {
          prompt: store.reactorModel === 'lingbot' ? prompt.slice(0, 980) : prompt,
        });
      }

      store.addLog(`Custom signal: ${customData.assetSymbol}`, prompt, 'manual');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Custom signal failed';
      useWorldStore.getState().setReactorError(message);
      useWorldStore.getState().addLog('Custom signal failed', message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function resetWorld() {
    if (status !== 'ready') return;

    setBusyId('live');
    try {
      await sendCommand('reset', {});
      const opening =
        'A world rebooting from live reality, clean horizon, signal lights reappearing across water and glass, cinematic photorealistic video, smooth continuous motion, no text';
      await sendCommand('schedule_prompt', { prompt: opening, chunk: 0 });
      await sendCommand('start', {});
      useWorldStore.getState().setPrompt(opening);
      useWorldStore.getState().addLog('World reset', opening, 'system');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reset failed';
      useWorldStore.getState().setReactorError(message);
      useWorldStore.getState().addLog('Reset failed', message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <aside className="control-panel">
      <div className="panel-title">
        <Radio size={14} />
        OVERRIDES
      </div>

      <div className="control-panel__grid">
        <button
          className={`control-button ${dataMode === 'live' ? 'control-button--active' : ''}`}
          disabled={busyId !== null}
          onClick={resumeLive}
          type="button"
        >
          <Play size={15} />
          Live feed
        </button>

        <button
          className="control-button"
          disabled={busyId !== null || status !== 'ready'}
          onClick={resetWorld}
          type="button"
        >
          <RotateCcw size={15} />
          Reset
        </button>

        {SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <button
              className={`control-button ${dataMode === scenario.id ? 'control-button--active' : ''}`}
              disabled={busyId !== null || status !== 'ready'}
              key={scenario.id}
              onClick={() => void activateScenario(scenario.id)}
              type="button"
            >
              <Icon size={15} />
              {busyId === scenario.id ? 'Sending' : scenario.label}
            </button>
          );
        })}

        <button
          className={`control-button control-button--wide ${dataMode === 'custom' ? 'control-button--active' : ''}`}
          disabled={busyId !== null}
          onClick={() => setCustomOpen((open) => !open)}
          type="button"
        >
          <Sparkles size={15} />
          Custom signal
        </button>
      </div>

      {customOpen ? (
        <form className="custom-signal" onSubmit={(event) => void activateCustomSignal(event)}>
          <label className="custom-field">
            <span>Ticker</span>
            <input
              maxLength={8}
              onChange={(event) => setCustomSymbol(event.target.value.toUpperCase())}
              placeholder="NVDA"
              value={customSymbol}
            />
          </label>

          <label className="custom-field custom-field--wide">
            <span>Event</span>
            <textarea
              maxLength={130}
              onChange={(event) => setCustomEvent(event.target.value)}
              placeholder="What happened?"
              value={customEvent}
            />
          </label>

          <label className="custom-field">
            <span>Move {customMove.toFixed(1)}%</span>
            <input
              max={25}
              min={-25}
              onChange={(event) => setCustomMove(Number(event.target.value))}
              step={0.1}
              type="range"
              value={customMove}
            />
          </label>

          <label className="custom-field">
            <span>Fear {customFear}</span>
            <input
              max={100}
              min={0}
              onChange={(event) => setCustomFear(Number(event.target.value))}
              type="range"
              value={customFear}
            />
          </label>

          <label className="custom-field">
            <span>Weather</span>
            <select
              onChange={(event) =>
                setCustomWeather(event.target.value as (typeof WEATHER_OPTIONS)[number]['id'])
              }
              value={customWeather}
            >
              {WEATHER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="custom-field">
            <span>Behavior</span>
            <select
              onChange={(event) =>
                setCustomBehavior(event.target.value as (typeof BEHAVIOR_OPTIONS)[number]['id'])
              }
              value={customBehavior}
            >
              {BEHAVIOR_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button className="control-button control-button--wide" disabled={busyId !== null} type="submit">
            <Sparkles size={15} />
            {busyId === 'custom' ? 'Sending' : 'Push custom world'}
          </button>
        </form>
      ) : null}
    </aside>
  );
}

function buildCustomSnapshot({
  behaviorId,
  event,
  fear,
  location,
  move,
  symbol,
  weatherId,
}: {
  behaviorId: (typeof BEHAVIOR_OPTIONS)[number]['id'];
  event: string;
  fear: number;
  location: LocationPreset;
  move: number;
  symbol: string;
  weatherId: (typeof WEATHER_OPTIONS)[number]['id'];
}): DataSnapshot {
  const cleanSymbol = symbol.trim().replace(/[^A-Z0-9.-]/g, '').slice(0, 8) || 'CUSTOM';
  const weather = WEATHER_OPTIONS.find((option) => option.id === weatherId) ?? WEATHER_OPTIONS[0];
  const behavior = BEHAVIOR_OPTIONS.find((option) => option.id === behaviorId) ?? BEHAVIOR_OPTIONS[0];
  const priceBase = 80 + (hashSymbol(cleanSymbol) % 920);
  const newsSentiment = sentimentFromCustom(fear, move);
  const volatilityIndex = clamp(Math.abs(move) * 4 + Math.abs(fear - 50) * 0.72, 0, 100);
  const latitudeHeat = Math.max(-8, Math.min(8, (18 - Math.abs(location.latitude)) * 0.22));

  return {
    assetName: cleanSymbol,
    assetSymbol: cleanSymbol,
    btcChange24h: move,
    btcPrice: priceBase,
    customNarrative: event.trim() || `${cleanSymbol} custom market shock`,
    dataSource: 'custom',
    ethChange24h: move * 0.58,
    ethPrice: priceBase * 0.44,
    fearGreedScore: fear,
    lastUpdated: Date.now(),
    newsHeadline: event.trim() || `${cleanSymbol} custom market shock`,
    newsPulse: clamp(fear + move * 1.7, 0, 100),
    newsSentiment,
    systemPressure: clamp(volatilityIndex * 0.62 + weather.wind * 0.55, 0, 100),
    volatilityIndex,
    weatherCode: weather.code,
    weatherTemp: weather.temp + latitudeHeat,
    windSpeed: weather.wind,
    worldBehavior: behavior.cue,
  };
}

function sentimentFromCustom(fear: number, move: number): NewsSentiment {
  if (fear < 18 || move < -12) return 'crisis';
  if (fear < 42 || move < -3) return 'negative';
  if (fear > 68 || move > 4) return 'positive';
  return 'neutral';
}

function hashSymbol(symbol: string) {
  return symbol.split('').reduce((hash, char) => hash + char.charCodeAt(0) * 17, 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function labelFor(id: DemoDataMode): string {
  return SCENARIOS.find((scenario) => scenario.id === id)?.label ?? id;
}

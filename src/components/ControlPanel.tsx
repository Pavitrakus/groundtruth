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
  Sunrise,
} from 'lucide-react';
import { buildDemoSnapshot } from '../engine/dataFetcher';
import { dataToWorldPrompt } from '../engine/promptEngine';
import { getFrameMode, getLocationPreset, getViewMode } from '../engine/worldOptions';
import type { DataMode } from '../store/worldStore';
import { useWorldStore } from '../store/worldStore';

const SCENARIOS: Array<{
  icon: React.ComponentType<{ size?: number }>;
  id: Exclude<DataMode, 'live'>;
  label: string;
}> = [
  { icon: Flame, id: 'crash', label: 'Market crash' },
  { icon: Rocket, id: 'bull', label: 'Bull run' },
  { icon: CloudLightning, id: 'storm', label: 'Storm alert' },
  { icon: Sunrise, id: 'open', label: 'Market open' },
  { icon: Pause, id: 'circuit', label: 'Circuit breaker' },
];

export function ControlPanel() {
  const { sendCommand, status } = useReactor((state) => ({
    sendCommand: state.sendCommand,
    status: state.status,
  }));
  const dataMode = useWorldStore((state) => state.dataMode);
  const [busyId, setBusyId] = useState<DataMode | null>(null);

  async function activateScenario(id: Exclude<DataMode, 'live'>) {
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
      </div>
    </aside>
  );
}

function labelFor(id: Exclude<DataMode, 'live'>): string {
  return SCENARIOS.find((scenario) => scenario.id === id)?.label ?? id;
}

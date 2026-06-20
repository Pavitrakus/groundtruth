import { useEffect } from 'react';
import { useReactor } from '@reactor-team/js-sdk';
import { buildDemoSnapshot } from '../engine/dataFetcher';
import { dataToWorldPrompt } from '../engine/promptEngine';
import {
  getFrameMode,
  getLocationPreset,
  getViewMode,
  type FrameModeId,
  type LocationId,
  type ViewModeId,
} from '../engine/worldOptions';
import type { DataMode } from '../store/worldStore';
import { useWorldStore } from '../store/worldStore';

interface ShowcaseStep {
  dataMode: Exclude<DataMode, 'live'>;
  durationMs: number;
  frameMode: FrameModeId;
  line: string;
  locationId: LocationId;
  title: string;
  viewMode: ViewModeId;
}

const SHOWCASE_STEPS: ShowcaseStep[] = [
  {
    dataMode: 'open',
    durationMs: 4400,
    frameMode: 'world',
    line: 'The first screen is not a dashboard. It is live reality becoming a world.',
    locationId: 'bangalore',
    title: 'Live World Model',
    viewMode: 'cinematic',
  },
  {
    dataMode: 'crash',
    durationMs: 5200,
    frameMode: 'signal',
    line: 'A crash is no longer a red candle. It is pressure, weather, speed, and fear you can feel.',
    locationId: 'new-york',
    title: 'Panic Becomes Terrain',
    viewMode: 'cinematic',
  },
  {
    dataMode: 'storm',
    durationMs: 5200,
    frameMode: 'map',
    line: 'Same engine, new place: market stress and climate signal remap the planet in seconds.',
    locationId: 'tokyo',
    title: 'Planet Scale Context',
    viewMode: 'orbit',
  },
  {
    dataMode: 'bull',
    durationMs: 5200,
    frameMode: 'dream',
    line: 'Dream mode turns invisible optimism and volatility into an explorable cinematic state.',
    locationId: 'iceland',
    title: 'Emotional Analytics',
    viewMode: 'human',
  },
  {
    dataMode: 'circuit',
    durationMs: 5600,
    frameMode: 'dream',
    line: 'The finale: systemic risk as a living world. Then hit Drone for manual LingBot takeover.',
    locationId: 'dubai',
    title: 'Judge Takeaway',
    viewMode: 'drone',
  },
];

export function ShowcaseDirector() {
  const { sendCommand, status } = useReactor((state) => ({
    sendCommand: state.sendCommand,
    status: state.status,
  }));
  const showcaseActive = useWorldStore((state) => state.showcaseActive);
  const showcaseStep = useWorldStore((state) => state.showcaseStep);

  useEffect(() => {
    if (!showcaseActive) return;

    let cancelled = false;
    let timer: ReturnType<typeof window.setTimeout> | undefined;
    const store = useWorldStore.getState();

    if (store.reactorModel !== 'helios') {
      store.setShowcaseCue({
        line: 'Rebooting the cinematic renderer before the judge run.',
        step: 0,
        title: 'Arming Showcase',
        total: SHOWCASE_STEPS.length,
      });
      store.setReactorModel('helios');
      return;
    }

    if (status !== 'ready') {
      store.setShowcaseCue({
        line: 'Waiting for Reactor to lock the stream.',
        step: 0,
        title: 'Arming Showcase',
        total: SHOWCASE_STEPS.length,
      });
      return;
    }

    async function runStep() {
      const step = SHOWCASE_STEPS[showcaseStep];
      const liveStore = useWorldStore.getState();

      if (!step) {
        liveStore.setShowcaseCue({
          line: 'The pitch is loaded. Take over manually or launch Drone for LingBot flight.',
          step: SHOWCASE_STEPS.length,
          title: 'GroundTruth Is Ready',
          total: SHOWCASE_STEPS.length,
        });
        liveStore.setShowcaseActive(false);
        timer = window.setTimeout(() => {
          useWorldStore.getState().setShowcaseCue(null);
        }, 7000);
        return;
      }

      liveStore.setShowcaseCue({
        line: step.line,
        step: showcaseStep + 1,
        title: step.title,
        total: SHOWCASE_STEPS.length,
      });
      liveStore.setLocation(step.locationId);
      liveStore.setViewMode(step.viewMode);
      liveStore.setFrameMode(step.frameMode);
      liveStore.setDataMode(step.dataMode);

      const controls = {
        frame: getFrameMode(step.frameMode),
        location: getLocationPreset(step.locationId),
        view: getViewMode(step.viewMode),
      };
      const data = buildDemoSnapshot(step.dataMode, controls.location);
      const { mood, prompt, reason } = dataToWorldPrompt(data, controls);

      liveStore.setData(data);
      liveStore.setWorldMood(mood);
      liveStore.setPrompt(prompt);
      liveStore.setReason(reason);

      try {
        await sendCommand('set_prompt', { prompt });
        liveStore.addLog(`Judge run: ${step.title}`, prompt, 'manual');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Judge run command failed';
        liveStore.setReactorError(message);
        liveStore.addLog('Judge run command failed', message, 'error');
      }

      if (cancelled) return;

      timer = window.setTimeout(() => {
        useWorldStore.getState().setShowcaseStep(showcaseStep + 1);
      }, step.durationMs);
    }

    void runStep();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [sendCommand, showcaseActive, showcaseStep, status]);

  return null;
}

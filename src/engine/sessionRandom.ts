import { buildDemoSnapshot, type DemoDataMode } from './dataFetcher';
import { dataToWorldPrompt } from './promptEngine';
import {
  FRAME_MODES,
  getFrameMode,
  getLocationPreset,
  getViewMode,
  VIEW_MODES,
  WORLD_LOCATIONS,
  type FrameModeId,
  type LocationId,
  type ViewModeId,
} from './worldOptions';
import type { DataSnapshot, WorldLogEntry, WorldMood } from '../store/worldStore';

const OPENING_MODES: DemoDataMode[] = ['open', 'bull', 'storm', 'crash', 'circuit'];
const OPENING_VIEWS = VIEW_MODES.filter((mode) => mode.id !== 'drone');

export interface RandomSession {
  currentPrompt: string;
  dataMode: DemoDataMode;
  dataSnapshot: DataSnapshot;
  frameMode: FrameModeId;
  lastReason: string;
  selectedLocationId: LocationId;
  sessionSeed: number;
  viewMode: ViewModeId;
  worldLog: WorldLogEntry[];
  worldMood: WorldMood;
}

export function createRandomSession(): RandomSession {
  const location = pick(WORLD_LOCATIONS);
  const frame = pick(FRAME_MODES);
  const view = pick(OPENING_VIEWS);
  const dataMode = pick(OPENING_MODES);
  const dataSnapshot = buildDemoSnapshot(dataMode, location);
  const controls = {
    frame: getFrameMode(frame.id),
    location: getLocationPreset(location.id),
    view: getViewMode(view.id),
  };
  const { mood, prompt, reason } = dataToWorldPrompt(dataSnapshot, controls);

  return {
    currentPrompt: prompt,
    dataMode,
    dataSnapshot,
    frameMode: frame.id,
    lastReason: reason,
    selectedLocationId: location.id,
    sessionSeed: randomSeed(),
    viewMode: view.id,
    worldLog: [
      {
        event: `Session seed: ${location.shortLabel} ${view.label}/${frame.label}`,
        prompt,
        source: 'system',
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      },
    ],
    worldMood: mood,
  };
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomSeed() {
  return Math.floor(1000 + Math.random() * 900000);
}

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
const SESSION_MEMORY_KEY = 'terra:last-opening-signature';

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
  const previous = readPreviousSignature();
  const location = pickDifferent(WORLD_LOCATIONS, previous?.locationId, (item) => item.id);
  const frame = pickDifferent(FRAME_MODES, previous?.frameMode, (item) => item.id);
  const view = pickDifferent(OPENING_VIEWS, previous?.viewMode, (item) => item.id);
  const dataMode = pickDifferent(OPENING_MODES, previous?.dataMode, (item) => item);
  const dataSnapshot = buildDemoSnapshot(dataMode, location);
  const controls = {
    frame: getFrameMode(frame.id),
    location: getLocationPreset(location.id),
    view: getViewMode(view.id),
  };
  const { mood, prompt, reason } = dataToWorldPrompt(dataSnapshot, controls);
  writePreviousSignature({
    dataMode,
    frameMode: frame.id,
    locationId: location.id,
    viewMode: view.id,
  });

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

function pickDifferent<T>(items: readonly T[], previous: string | undefined, getKey: (item: T) => string): T {
  const choices = previous ? items.filter((item) => getKey(item) !== previous) : items;
  return pick(choices.length > 0 ? choices : items);
}

function randomSeed() {
  return Math.floor(1000 + Math.random() * 900000);
}

function readPreviousSignature() {
  try {
    const raw = window.localStorage.getItem(SESSION_MEMORY_KEY);
    return raw
      ? (JSON.parse(raw) as {
          dataMode?: DemoDataMode;
          frameMode?: FrameModeId;
          locationId?: LocationId;
          viewMode?: ViewModeId;
        })
      : null;
  } catch {
    return null;
  }
}

function writePreviousSignature(signature: {
  dataMode: DemoDataMode;
  frameMode: FrameModeId;
  locationId: LocationId;
  viewMode: ViewModeId;
}) {
  try {
    window.localStorage.setItem(SESSION_MEMORY_KEY, JSON.stringify(signature));
  } catch {
    // Non-persistent browsers still get normal randomization.
  }
}

import { create } from 'zustand';
import { createRandomSession } from '../engine/sessionRandom';
import type { FrameModeId, LocationId, ViewModeId } from '../engine/worldOptions';

export type NewsSentiment = 'positive' | 'neutral' | 'negative' | 'crisis';
export type WorldMood = 'dawn' | 'golden' | 'storm' | 'fire' | 'void' | 'aurora';
export type DataMode = 'live' | 'crash' | 'bull' | 'storm' | 'open' | 'circuit' | 'custom';
export type ReactorModel = 'helios' | 'lingbot';
export type PilotMovement = 'idle' | 'forward' | 'back' | 'strafe_left' | 'strafe_right';
export type PilotLookHorizontal = 'idle' | 'left' | 'right';
export type PilotLookVertical = 'idle' | 'up' | 'down';

export interface DataSnapshot {
  btcPrice: number;
  btcChange24h: number;
  ethPrice: number;
  ethChange24h: number;
  assetName?: string;
  assetSymbol?: string;
  customNarrative?: string;
  fearGreedScore: number;
  weatherCode: number;
  weatherTemp: number;
  windSpeed: number;
  newsSentiment: NewsSentiment;
  newsHeadline: string;
  newsPulse: number;
  volatilityIndex: number;
  systemPressure: number;
  worldBehavior?: string;
  dataSource: 'live' | 'fallback' | 'demo' | 'custom';
  lastUpdated: number;
}

export interface WorldLogEntry {
  time: string;
  event: string;
  prompt: string;
  source: 'system' | 'data' | 'manual' | 'error';
}

export interface ShowcaseCue {
  line: string;
  step: number;
  title: string;
  total: number;
}

export interface WorldState {
  connectionStatus: string;
  currentPrompt: string;
  currentChunk: number;
  currentFrame: number;
  audioEnabled: boolean;
  audioVolume: number;
  dataMode: DataMode;
  dataSnapshot: DataSnapshot | null;
  frameMode: FrameModeId;
  isConnected: boolean;
  isGenerating: boolean;
  lastReason: string;
  pilotBoost: boolean;
  pilotLookHorizontal: PilotLookHorizontal;
  pilotLookVertical: PilotLookVertical;
  pilotMovement: PilotMovement;
  pilotSpeed: number;
  reactorModel: ReactorModel;
  reactorError: string | null;
  sceneRevision: number;
  selectedLocationId: LocationId;
  sessionSeed: number;
  showcaseActive: boolean;
  showcaseCue: ShowcaseCue | null;
  showcaseStep: number;
  viewMode: ViewModeId;
  worldLog: WorldLogEntry[];
  worldMood: WorldMood;
  addLog: (event: string, prompt: string, source?: WorldLogEntry['source']) => void;
  bumpSceneRevision: () => void;
  setAudioEnabled: (enabled: boolean) => void;
  setAudioVolume: (volume: number) => void;
  setConnectionStatus: (status: string) => void;
  setData: (data: DataSnapshot) => void;
  setDataMode: (mode: DataMode) => void;
  setFrameMode: (mode: FrameModeId) => void;
  setGenerating: (value: boolean) => void;
  setLocation: (locationId: LocationId) => void;
  setPilot: (
    movement: PilotMovement,
    lookHorizontal: PilotLookHorizontal,
    lookVertical: PilotLookVertical,
    boost?: boolean,
    speed?: number,
  ) => void;
  setPrompt: (prompt: string) => void;
  setReactorModel: (model: ReactorModel) => void;
  setReactorError: (error: string | null) => void;
  setReason: (reason: string) => void;
  setShowcaseActive: (active: boolean) => void;
  setShowcaseCue: (cue: ShowcaseCue | null) => void;
  setShowcaseStep: (step: number) => void;
  setViewMode: (mode: ViewModeId) => void;
  setWorldMood: (mood: WorldMood) => void;
  updateRuntime: (chunk: number, frame: number, prompt?: string | null) => void;
}

export type WorldStateSnapshot = WorldState;

const initialSession = createRandomSession();

export const useWorldStore = create<WorldState>((set) => ({
  connectionStatus: 'disconnected',
  currentPrompt: initialSession.currentPrompt,
  currentChunk: 0,
  currentFrame: 0,
  audioEnabled: true,
  audioVolume: 0.72,
  dataMode: initialSession.dataMode,
  dataSnapshot: initialSession.dataSnapshot,
  frameMode: initialSession.frameMode,
  isConnected: false,
  isGenerating: false,
  lastReason: initialSession.lastReason,
  pilotBoost: false,
  pilotLookHorizontal: 'idle',
  pilotLookVertical: 'idle',
  pilotMovement: 'idle',
  pilotSpeed: 10,
  reactorModel: 'helios',
  reactorError: null,
  sceneRevision: 0,
  selectedLocationId: initialSession.selectedLocationId,
  sessionSeed: initialSession.sessionSeed,
  showcaseActive: false,
  showcaseCue: null,
  showcaseStep: 0,
  viewMode: initialSession.viewMode,
  worldLog: initialSession.worldLog,
  worldMood: initialSession.worldMood,
  addLog: (event, prompt, source = 'data') =>
    set((state) => ({
      worldLog: [
        {
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          event,
          prompt,
          source,
        },
        ...state.worldLog.slice(0, 17),
      ],
    })),
  bumpSceneRevision: () =>
    set((state) => ({
      sceneRevision: state.sceneRevision + 1,
    })),
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  setAudioVolume: (audioVolume) => set({ audioVolume }),
  setConnectionStatus: (connectionStatus) =>
    set({
      connectionStatus,
      isConnected: connectionStatus === 'ready',
    }),
  setData: (dataSnapshot) => set({ dataSnapshot }),
  setDataMode: (dataMode) => set({ dataMode }),
  setFrameMode: (frameMode) => set({ frameMode }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setLocation: (selectedLocationId) => set({ selectedLocationId }),
  setPilot: (pilotMovement, pilotLookHorizontal, pilotLookVertical, pilotBoost = false, pilotSpeed = 10) =>
    set({ pilotBoost, pilotLookHorizontal, pilotLookVertical, pilotMovement, pilotSpeed }),
  setPrompt: (currentPrompt) => set({ currentPrompt }),
  setReactorModel: (reactorModel) =>
    set({
      connectionStatus: 'disconnected',
      currentChunk: 0,
      currentFrame: 0,
      isConnected: false,
      isGenerating: false,
      pilotBoost: false,
      pilotLookHorizontal: 'idle',
      pilotLookVertical: 'idle',
      pilotMovement: 'idle',
      pilotSpeed: 10,
      reactorError: null,
      reactorModel,
    }),
  setReactorError: (reactorError) => set({ reactorError }),
  setReason: (lastReason) => set({ lastReason }),
  setShowcaseActive: (showcaseActive) => set({ showcaseActive }),
  setShowcaseCue: (showcaseCue) => set({ showcaseCue }),
  setShowcaseStep: (showcaseStep) => set({ showcaseStep }),
  setViewMode: (viewMode) => set({ viewMode }),
  setWorldMood: (worldMood) => set({ worldMood }),
  updateRuntime: (currentChunk, currentFrame, prompt) =>
    set((state) => ({
      currentChunk,
      currentFrame,
      currentPrompt: prompt ?? state.currentPrompt,
    })),
}));

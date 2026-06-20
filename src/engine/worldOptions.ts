export type LocationId =
  | 'bangalore'
  | 'new-york'
  | 'tokyo'
  | 'dubai'
  | 'london'
  | 'iceland'
  | 'amazon'
  | 'sahara'
  | 'singapore'
  | 'alps';

export type ViewModeId = 'cinematic' | 'drone' | 'human' | 'orbit';
export type FrameModeId = 'world' | 'card' | 'map' | 'signal' | 'dream';

export interface LocationPreset {
  id: LocationId;
  label: string;
  shortLabel: string;
  latitude: number;
  longitude: number;
  pin: { x: number; y: number };
  worldCue: string;
}

export interface ViewModePreset {
  id: ViewModeId;
  label: string;
  promptCue: string;
}

export interface FrameModePreset {
  id: FrameModeId;
  label: string;
  promptCue: string;
}

export const WORLD_LOCATIONS: LocationPreset[] = [
  {
    id: 'bangalore',
    label: 'Bangalore',
    shortLabel: 'BLR',
    latitude: 12.97,
    longitude: 77.59,
    pin: { x: 67, y: 55 },
    worldCue: 'Bangalore tech district at the edge of monsoon air, glass towers and wet streets',
  },
  {
    id: 'new-york',
    label: 'New York',
    shortLabel: 'NYC',
    latitude: 40.71,
    longitude: -74.01,
    pin: { x: 28, y: 38 },
    worldCue: 'New York financial canyons, neon, steam, skyscraper silhouettes, Hudson light',
  },
  {
    id: 'tokyo',
    label: 'Tokyo',
    shortLabel: 'TYO',
    latitude: 35.68,
    longitude: 139.69,
    pin: { x: 78, y: 42 },
    worldCue: 'Tokyo at night, layered crossings, towers, rain gloss, electric signage without readable text',
  },
  {
    id: 'dubai',
    label: 'Dubai',
    shortLabel: 'DXB',
    latitude: 25.2,
    longitude: 55.27,
    pin: { x: 58, y: 47 },
    worldCue: 'Dubai desert skyline, mirrored towers, heat shimmer, impossible engineered islands',
  },
  {
    id: 'london',
    label: 'London',
    shortLabel: 'LDN',
    latitude: 51.51,
    longitude: -0.13,
    pin: { x: 46, y: 33 },
    worldCue: 'London over the Thames, old stone, modern finance towers, fog and river reflections',
  },
  {
    id: 'iceland',
    label: 'Iceland',
    shortLabel: 'ICE',
    latitude: 64.96,
    longitude: -19.02,
    pin: { x: 41, y: 25 },
    worldCue: 'Iceland volcanic coast, black sand, glaciers, aurora and geothermal mist',
  },
  {
    id: 'amazon',
    label: 'Amazon',
    shortLabel: 'AMZ',
    latitude: -3.47,
    longitude: -62.22,
    pin: { x: 34, y: 62 },
    worldCue: 'Amazon rainforest canopy, rivers like bronze mirrors, humid green atmosphere',
  },
  {
    id: 'sahara',
    label: 'Sahara',
    shortLabel: 'SAH',
    latitude: 23.42,
    longitude: 25.66,
    pin: { x: 51, y: 49 },
    worldCue: 'Sahara dunes, vast sand seas, distant caravan shadows, sun-scorched horizon',
  },
  {
    id: 'singapore',
    label: 'Singapore',
    shortLabel: 'SIN',
    latitude: 1.35,
    longitude: 103.82,
    pin: { x: 72, y: 61 },
    worldCue: 'Singapore garden city, tropical towers, water, elevated greenery, humid night glow',
  },
  {
    id: 'alps',
    label: 'Swiss Alps',
    shortLabel: 'ALP',
    latitude: 46.82,
    longitude: 8.23,
    pin: { x: 49, y: 37 },
    worldCue: 'Swiss Alps, snow ridges, glassy lakes, clean air, sharp mountain light',
  },
];

export const VIEW_MODES: ViewModePreset[] = [
  {
    id: 'cinematic',
    label: 'Cine',
    promptCue: 'cinematic camera language, graceful forward movement, composed wide frames',
  },
  {
    id: 'drone',
    label: 'Drone',
    promptCue: 'drone camera, aerial glide, banking turns, high-speed movement over terrain',
  },
  {
    id: 'human',
    label: 'Human',
    promptCue: 'first-person human eye level, walking pace, natural head motion, immersive point of view',
  },
  {
    id: 'orbit',
    label: 'Orbit',
    promptCue: 'satellite orbital perspective, planet-scale curvature, sweeping global motion',
  },
];

export const FRAME_MODES: FrameModePreset[] = [
  {
    id: 'world',
    label: 'World',
    promptCue: 'data is fully embodied as landscape, weather, light, motion, and architecture',
  },
  {
    id: 'card',
    label: 'Card',
    promptCue:
      'floating glass data cards and translucent panels exist physically inside the world, no readable text',
  },
  {
    id: 'map',
    label: 'Map',
    promptCue: 'cartographic terrain, glowing routes, contour lines, city grids, and latitude arcs',
  },
  {
    id: 'signal',
    label: 'Signal',
    promptCue: 'radio towers, pulses, aurora bands, waveforms, and luminous signal architecture',
  },
  {
    id: 'dream',
    label: 'Dream',
    promptCue:
      'lucid dream rendering, impossible scale, volumetric god rays, iridescent surfaces, surreal but physically coherent world geometry',
  },
];

export function getLocationPreset(id: LocationId): LocationPreset {
  return WORLD_LOCATIONS.find((location) => location.id === id) ?? WORLD_LOCATIONS[0];
}

export function getViewMode(id: ViewModeId): ViewModePreset {
  return VIEW_MODES.find((mode) => mode.id === id) ?? VIEW_MODES[0];
}

export function getFrameMode(id: FrameModeId): FrameModePreset {
  return FRAME_MODES.find((mode) => mode.id === id) ?? FRAME_MODES[0];
}

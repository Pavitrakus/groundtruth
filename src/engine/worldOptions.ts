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
    pin: { x: 64, y: 53 },
    worldCue:
      'Bangalore after monsoon rain, rain-tree canopy, metro viaduct, wet asphalt, low-rise tech parks, scooter and red bus silhouettes, no desert, no Gulf skyline, no Burj-like tower',
  },
  {
    id: 'new-york',
    label: 'New York',
    shortLabel: 'NYC',
    latitude: 40.71,
    longitude: -74.01,
    pin: { x: 26, y: 40 },
    worldCue:
      'New York financial district canyon streets, dense Manhattan skyscraper grid, steam vents, Hudson river light, yellow taxi silhouettes, no desert skyline',
  },
  {
    id: 'tokyo',
    label: 'Tokyo',
    shortLabel: 'TYO',
    latitude: 35.68,
    longitude: 139.69,
    pin: { x: 82, y: 38 },
    worldCue:
      'Tokyo night crossing, layered elevated rail, lantern-like abstract signs with no readable text, rain gloss, compact vertical streets, no desert skyline',
  },
  {
    id: 'dubai',
    label: 'Dubai',
    shortLabel: 'DXB',
    latitude: 25.2,
    longitude: 55.27,
    pin: { x: 56, y: 43 },
    worldCue:
      'Dubai desert-meets-sea skyline, mirrored supertall towers, palm-shaped islands, sand haze, heat shimmer, engineered luxury waterfront',
  },
  {
    id: 'london',
    label: 'London',
    shortLabel: 'LDN',
    latitude: 51.51,
    longitude: -0.13,
    pin: { x: 43, y: 34 },
    worldCue:
      'London over the Thames, old stone bridges, fog, river reflections, finance towers behind historic silhouettes, cool drizzle',
  },
  {
    id: 'iceland',
    label: 'Iceland',
    shortLabel: 'ICE',
    latitude: 64.96,
    longitude: -19.02,
    pin: { x: 36, y: 20 },
    worldCue:
      'Iceland volcanic coast, black sand beach, basalt cliffs, glaciers, geothermal mist, aurora over empty northern terrain',
  },
  {
    id: 'amazon',
    label: 'Amazon',
    shortLabel: 'AMZ',
    latitude: -3.47,
    longitude: -62.22,
    pin: { x: 32, y: 66 },
    worldCue:
      'Amazon rainforest canopy, braided brown rivers, mist rising through dense jungle, humid green atmosphere, no city skyline',
  },
  {
    id: 'sahara',
    label: 'Sahara',
    shortLabel: 'SAH',
    latitude: 23.42,
    longitude: 25.66,
    pin: { x: 47, y: 57 },
    worldCue:
      'Sahara vast sand sea, dune ridges, caravan shadows, sun-scorched horizon, no skyscrapers, no wet streets',
  },
  {
    id: 'singapore',
    label: 'Singapore',
    shortLabel: 'SIN',
    latitude: 1.35,
    longitude: 103.82,
    pin: { x: 76, y: 66 },
    worldCue:
      'Singapore garden city, tropical high-rises, bay water, elevated greenery, sky gardens, humid night glow, clean waterfront',
  },
  {
    id: 'alps',
    label: 'Swiss Alps',
    shortLabel: 'ALP',
    latitude: 46.82,
    longitude: 8.23,
    pin: { x: 52, y: 25 },
    worldCue:
      'Swiss Alps, snow ridges, alpine villages, glassy lakes, pine slopes, clean air, sharp mountain light, no city skyline',
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

import type { DataSnapshot, WorldMood } from '../store/worldStore';
import {
  getFrameMode,
  getLocationPreset,
  getViewMode,
  type FrameModePreset,
  type LocationPreset,
  type ViewModePreset,
} from './worldOptions';

const CLEAR = [0, 1];
const CLOUDY = [2, 3];
const DRIZZLE = [51, 53, 55, 56, 57];
const RAIN = [61, 63, 65, 80, 81, 82];
const STORM = [95, 96, 99];
const SNOW = [71, 73, 75, 77, 85, 86];
const FOG = [45, 48];

interface MarketMood {
  atmosphere: string;
  camera: string;
  landscape: string;
  light: string;
  mood: WorldMood;
}

export interface PromptResult {
  mood: WorldMood;
  prompt: string;
  reason: string;
}

export interface WorldPromptControls {
  frame: FrameModePreset;
  location: LocationPreset;
  view: ViewModePreset;
}

export function getDefaultPromptControls(): WorldPromptControls {
  return {
    frame: getFrameMode('world'),
    location: getLocationPreset('bangalore'),
    view: getViewMode('cinematic'),
  };
}

export function dataToWorldPrompt(
  data: DataSnapshot,
  controls: WorldPromptControls = getDefaultPromptControls(),
): PromptResult {
  const weather = getWeatherMood(data.weatherCode);
  const market = getMarketMood(data.fearGreedScore);
  const volatility = getVolatilityModifier(data.volatilityIndex);
  const news = getNewsModifier(data.newsSentiment, data.newsHeadline);
  const system = getSystemModifier(data.systemPressure);
  const location = controls.location.worldCue;
  const camera = `${controls.view.promptCue}, ${market.camera}`;
  const frame = controls.frame.promptCue;

  if (data.fearGreedScore < 12 && STORM.includes(data.weatherCode)) {
    return {
      mood: 'void',
      prompt: [
        controls.location.worldCue,
        'apocalyptic void over an infinite black ocean',
        'market ruins half-submerged under violent lightning',
        'collapsing constellations above',
        frame,
        'extreme wind, reality tearing into dark glass fragments',
        camera,
        'photorealistic cinematic video, smooth continuous motion, no text, no UI',
      ].join(', '),
      reason: `CRISIS FUSION: ${controls.location.shortLabel}, ${controls.view.label}, fear ${data.fearGreedScore.toFixed(0)} + storm + vol ${data.volatilityIndex.toFixed(0)}`,
    };
  }

  return {
    mood: market.mood,
    prompt: [
      location,
      market.landscape,
      market.light,
      weather,
      market.atmosphere,
      volatility,
      news,
      system,
      frame,
      camera,
      'photorealistic cinematic video, atmospheric depth, smooth temporal continuity, no text, no charts, no UI',
    ].join(', '),
    reason: `${controls.location.shortLabel} ${controls.view.label}/${controls.frame.label}: BTC ${signed(data.btcChange24h)}%, fear ${data.fearGreedScore.toFixed(0)}, vol ${data.volatilityIndex.toFixed(0)}, weather ${data.weatherCode}, news ${data.newsSentiment}`,
  };
}

export function getOpeningPrompt(
  controls: WorldPromptControls = getDefaultPromptControls(),
): string {
  return [
    controls.location.worldCue,
    'a world waking up from live data',
    'first light moving across a vast landscape of glass, grass, water, and distant city silhouettes',
    controls.frame.promptCue,
    controls.view.promptCue,
    'subtle particles rising like signal noise',
    'warm dawn on the horizon',
    'cinematic photorealistic video, smooth continuous motion, no text',
  ].join(', ');
}

function getWeatherMood(code: number): string {
  if (STORM.includes(code)) return 'violent thunderstorm, branching lightning, dark clouds folding into each other';
  if (RAIN.includes(code)) return 'heavy rain in silver sheets, reflective surfaces, grey sky in motion';
  if (DRIZZLE.includes(code)) return 'soft mist and drizzle, wet stone, diffused light';
  if (FOG.includes(code)) return 'dense fog, ghostly silhouettes, low visibility';
  if (SNOW.includes(code)) return 'snowfall, frost, white silence, slow drifting flakes';
  if (CLOUDY.includes(code)) return 'overcast sky, layered clouds moving slowly';
  if (CLEAR.includes(code)) return 'clear air, crisp horizon, high visibility';
  return 'unstable weather front, shifting pressure, changing sky';
}

function getMarketMood(fearGreed: number): MarketMood {
  if (fearGreed < 20) {
    return {
      atmosphere: 'ash in the air, smoke columns, torn banners, dread and urgency',
      camera: 'low tracking shot through wreckage, slow forward push',
      landscape: 'shattered financial wasteland, broken black monoliths, cracked earth, dead trees',
      light: 'blood-red twilight with hard shadows',
      mood: 'fire',
    };
  }

  if (fearGreed < 40) {
    return {
      atmosphere: 'cold spray, restless wind, turbulent pressure, uneasy silence',
      camera: 'wide coastal crane shot with waves surging toward camera',
      landscape: 'storm cliffs over a dark ocean, bare rock, distant warning lights',
      light: 'blue-grey overcast light with brief white flashes',
      mood: 'storm',
    };
  }

  if (fearGreed < 60) {
    return {
      atmosphere: 'held breath, soft wind, signals waiting below the surface',
      camera: 'slow aerial glide over open terrain',
      landscape: 'vast open plains with glass data pylons embedded in tall grass',
      light: 'balanced dawn light, calm but alert',
      mood: 'dawn',
    };
  }

  if (fearGreed < 80) {
    return {
      atmosphere: 'abundance, warmth, fast-moving highlights, controlled optimism',
      camera: 'smooth forward flight over a river into a luminous valley',
      landscape: 'green-gold valley, river catching sunlight, ancient trees and bright market towers',
      light: 'rich golden afternoon light',
      mood: 'golden',
    };
  }

  return {
    atmosphere: 'euphoria, electric optimism, beauty with a dangerous edge',
    camera: 'floating orbital shot through impossible architecture',
    landscape: 'floating islands of gold, crystal, water, and luminous clouds above a bright city',
    light: 'aurora radiance, cyan and gold refractions, impossible colors',
    mood: 'aurora',
  };
}

function getVolatilityModifier(volatility: number): string {
  if (volatility > 82) return 'violent motion in every element, fractured horizon, unstable physics';
  if (volatility > 58) return 'rapid cloud movement, gusts, shaking particles, restless energy';
  if (volatility > 28) return 'visible movement in sky and terrain, light shifting every few seconds';
  return 'settled stillness, slow wind, stable frame, calm continuity';
}

function getNewsModifier(sentiment: DataSnapshot['newsSentiment'], headline: string): string {
  if (sentiment === 'crisis') return `the news pulse manifests as emergency-red signal flares: ${headline}`;
  if (sentiment === 'negative') return `the news pulse manifests as dim warning beacons: ${headline}`;
  if (sentiment === 'positive') return `the news pulse manifests as bright signal ribbons crossing the sky: ${headline}`;
  return `the news pulse manifests as quiet distant radio lights: ${headline}`;
}

function getSystemModifier(systemPressure: number): string {
  if (systemPressure > 75) return 'local system pressure appears as jittering geometry and heat shimmer';
  if (systemPressure > 45) return 'local system pressure appears as subtle scanline shimmer in the air';
  return 'local system pressure is low, image remains clean and steady';
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

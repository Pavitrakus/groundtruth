import axios from 'axios';
import type { DataMode, DataSnapshot, NewsSentiment } from '../store/worldStore';
import { getLocationPreset, type LocationId, type LocationPreset } from './worldOptions';

export type DemoDataMode = Exclude<DataMode, 'live' | 'custom'>;

const COINGECKO = 'https://api.coingecko.com/api/v3';
const WEATHER = 'https://api.open-meteo.com/v1/forecast';
const GDELT = 'https://api.gdeltproject.org/api/v2/doc/doc';

interface CryptoTick {
  btcPrice: number;
  btcChange24h: number;
  ethPrice: number;
  ethChange24h: number;
}

interface WeatherTick {
  weatherCode: number;
  weatherTemp: number;
  windSpeed: number;
}

interface NewsTick {
  newsSentiment: NewsSentiment;
  newsHeadline: string;
  newsPulse: number;
}

const POSITIVE_TERMS = [
  'rally',
  'surge',
  'gain',
  'record',
  'growth',
  'optimism',
  'breakthrough',
  'approval',
  'rebound',
];

const NEGATIVE_TERMS = [
  'crash',
  'panic',
  'war',
  'attack',
  'fraud',
  'loss',
  'collapse',
  'recession',
  'crisis',
  'selloff',
];

const DEMO_ASSETS = [
  { name: 'Bitcoin', price: 71000, symbol: 'BTC' },
  { name: 'Ethereum', price: 3600, symbol: 'ETH' },
  { name: 'Solana', price: 182, symbol: 'SOL' },
  { name: 'Nvidia', price: 128, symbol: 'NVDA' },
  { name: 'S&P 500', price: 6100, symbol: 'SPY' },
] as const;

const HEADLINE_VARIANTS: Record<DemoDataMode, string[]> = {
  bull: [
    'Risk appetite returns as digital assets push toward new highs',
    'Momentum buyers lift the tape as liquidity turns electric',
    'Optimism ripples through cross-asset flows after a clean breakout',
  ],
  circuit: [
    'Liquidity vanishes as panic overwhelms the tape',
    'Trading desks brace as volatility trips emergency thresholds',
    'System pressure spikes as risk models move into lockdown',
  ],
  crash: [
    'Circuit breakers flash as global risk assets enter freefall',
    'A risk-off wave hits portfolios before the opening bell',
    'Forced selling turns market stress into a global pressure front',
  ],
  open: [
    'Markets open steady as traders wait for the next signal',
    'The opening bell lands quietly while hidden volatility builds',
    'Fresh liquidity enters the session with a cautious pulse',
  ],
  storm: [
    'Severe weather and nervous markets collide across live feeds',
    'Macro pressure and storm systems converge into one signal',
    'Climate alerts and market stress redraw the risk map',
  ],
};

const WORLD_BEHAVIOR_VARIANTS = [
  'tall monoliths unfold from the ground like live order books becoming architecture',
  'rivers of luminous particles trace capital flows through the terrain',
  'glass weather fronts bend around the city as if volatility has mass',
  'floating data islands drift at different depths with soft cinematic parallax',
  'signal towers pulse across the horizon while the ground slowly reconfigures',
  'mirror lakes reflect aurora bands that respond to fear and greed',
  'impossible bridges assemble and dissolve as market pressure changes',
] as const;

export async function fetchCrypto(): Promise<CryptoTick> {
  const response = await axios.get(`${COINGECKO}/simple/price`, {
    timeout: 8000,
    params: {
      ids: 'bitcoin,ethereum',
      vs_currencies: 'usd',
      include_24hr_change: 'true',
    },
  });

  return {
    btcPrice: response.data.bitcoin.usd,
    btcChange24h: response.data.bitcoin.usd_24h_change,
    ethPrice: response.data.ethereum.usd,
    ethChange24h: response.data.ethereum.usd_24h_change,
  };
}

export async function fetchWeather(location = getLocationPreset('bangalore')): Promise<WeatherTick> {
  const response = await axios.get(WEATHER, {
    timeout: 8000,
    params: {
      latitude: location.latitude,
      longitude: location.longitude,
      current: 'weather_code,temperature_2m,wind_speed_10m',
    },
  });

  return {
    weatherCode: response.data.current.weather_code,
    weatherTemp: response.data.current.temperature_2m,
    windSpeed: response.data.current.wind_speed_10m,
  };
}

export async function fetchNewsPulse(): Promise<NewsTick> {
  try {
    const response = await axios.get(GDELT, {
      timeout: 7000,
      params: {
        query: '(bitcoin OR markets OR economy OR climate OR election)',
        mode: 'artlist',
        format: 'json',
        maxrecords: 6,
        sort: 'hybridrel',
      },
    });

    const articles = (response.data.articles ?? []) as Array<{ title?: string }>;
    const headlines = articles.map((article) => article.title ?? '').filter(Boolean);
    const joined = headlines.join(' ').toLowerCase();
    const positive = POSITIVE_TERMS.reduce(
      (score, term) => score + Number(joined.includes(term)),
      0,
    );
    const negative = NEGATIVE_TERMS.reduce(
      (score, term) => score + Number(joined.includes(term)),
      0,
    );
    const pulse = Math.max(0, Math.min(100, 50 + positive * 10 - negative * 14));

    return {
      newsHeadline: headlines[0] ?? 'Global signal quiet; market narrative remains open',
      newsPulse: pulse,
      newsSentiment: sentimentFromScore(pulse),
    };
  } catch {
    return {
      newsHeadline: 'News pulse degraded; market-derived sentiment is driving the world',
      newsPulse: 50,
      newsSentiment: 'neutral',
    };
  }
}

export function deriveVolatility(btcChange: number, ethChange: number): number {
  const averageMove = (Math.abs(btcChange) + Math.abs(ethChange)) / 2;
  return clamp(averageMove * 9.5, 0, 100);
}

export function deriveFearGreed(btcChange: number, ethChange: number, newsPulse: number): number {
  const marketScore = clamp(50 + (btcChange * 4.5 + ethChange * 2.5), 0, 100);
  return clamp(marketScore * 0.72 + newsPulse * 0.28, 0, 100);
}

export async function pollAllData(
  mode: DataMode = 'live',
  location: LocationPreset = getLocationPreset('bangalore'),
): Promise<DataSnapshot> {
  if (mode === 'custom') {
    return buildDemoSnapshot('open', location);
  }

  if (mode !== 'live') {
    return buildDemoSnapshot(mode, location);
  }

  try {
    const [crypto, weather, news] = await Promise.all([
      fetchCrypto(),
      fetchWeather(location),
      fetchNewsPulse(),
    ]);
    const volatilityIndex = deriveVolatility(crypto.btcChange24h, crypto.ethChange24h);
    const fearGreedScore = deriveFearGreed(
      crypto.btcChange24h,
      crypto.ethChange24h,
      news.newsPulse,
    );

    return {
      ...crypto,
      ...weather,
      ...news,
      assetName: 'Bitcoin',
      assetSymbol: 'BTC',
      fearGreedScore,
      volatilityIndex,
      systemPressure: measureSystemPressure(volatilityIndex),
      dataSource: 'live',
      lastUpdated: Date.now(),
    };
  } catch {
    return buildFallbackSnapshot(location);
  }
}

export function buildDemoSnapshot(
  mode: DemoDataMode,
  location: LocationPreset = getLocationPreset('bangalore'),
): DataSnapshot {
  const now = Date.now();
  const latitudeHeat = Math.max(-8, Math.min(8, (18 - Math.abs(location.latitude)) * 0.22));
  const scenarios: Record<DemoDataMode, DataSnapshot> = {
    crash: {
      assetName: 'Bitcoin',
      assetSymbol: 'BTC',
      btcPrice: 42000,
      btcChange24h: -14.7,
      ethPrice: 2100,
      ethChange24h: -18.2,
      fearGreedScore: 8,
      volatilityIndex: 95,
      weatherCode: 95,
      weatherTemp: 28 + latitudeHeat,
      windSpeed: 45,
      newsSentiment: 'crisis',
      newsHeadline: 'Circuit breakers flash as global risk assets enter freefall',
      newsPulse: 6,
      systemPressure: 92,
      dataSource: 'demo',
      lastUpdated: now,
    },
    bull: {
      assetName: 'Bitcoin',
      assetSymbol: 'BTC',
      btcPrice: 98000,
      btcChange24h: 11.4,
      ethPrice: 5200,
      ethChange24h: 9.8,
      fearGreedScore: 92,
      volatilityIndex: 35,
      weatherCode: 0,
      weatherTemp: 22 + latitudeHeat,
      windSpeed: 8,
      newsSentiment: 'positive',
      newsHeadline: 'Risk appetite returns as digital assets push toward new highs',
      newsPulse: 88,
      systemPressure: 28,
      dataSource: 'demo',
      lastUpdated: now,
    },
    storm: {
      assetName: 'Bitcoin',
      assetSymbol: 'BTC',
      btcPrice: 67500,
      btcChange24h: -4.8,
      ethPrice: 3300,
      ethChange24h: -5.6,
      fearGreedScore: 31,
      volatilityIndex: 70,
      weatherCode: 95,
      weatherTemp: 24 + latitudeHeat,
      windSpeed: 58,
      newsSentiment: 'negative',
      newsHeadline: 'Severe weather and nervous markets collide across live feeds',
      newsPulse: 32,
      systemPressure: 74,
      dataSource: 'demo',
      lastUpdated: now,
    },
    open: {
      assetName: 'Bitcoin',
      assetSymbol: 'BTC',
      btcPrice: 71000,
      btcChange24h: 1.2,
      ethPrice: 3600,
      ethChange24h: 0.8,
      fearGreedScore: 57,
      volatilityIndex: 18,
      weatherCode: 1,
      weatherTemp: 26 + latitudeHeat,
      windSpeed: 11,
      newsSentiment: 'neutral',
      newsHeadline: 'Markets open steady as traders wait for the next signal',
      newsPulse: 54,
      systemPressure: 22,
      dataSource: 'demo',
      lastUpdated: now,
    },
    circuit: {
      assetName: 'Bitcoin',
      assetSymbol: 'BTC',
      btcPrice: 39000,
      btcChange24h: -21.3,
      ethPrice: 1800,
      ethChange24h: -24.5,
      fearGreedScore: 3,
      volatilityIndex: 100,
      weatherCode: 99,
      weatherTemp: 29 + latitudeHeat,
      windSpeed: 72,
      newsSentiment: 'crisis',
      newsHeadline: 'Liquidity vanishes as panic overwhelms the tape',
      newsPulse: 2,
      systemPressure: 100,
      dataSource: 'demo',
      lastUpdated: now,
    },
  };

  return randomizeDemoSnapshot(scenarios[mode], mode, location);
}

export function retargetSnapshotToLocation(
  snapshot: DataSnapshot,
  mode: DataMode,
  location: LocationPreset,
): DataSnapshot {
  if (mode !== 'live' && mode !== 'custom') {
    return buildDemoSnapshot(mode, location);
  }

  const weather = buildLocationWeather(location);
  const volatilityIndex = clamp(
    snapshot.volatilityIndex + randomBetween(-6, 8) + Math.abs(weather.windSpeed - snapshot.windSpeed) * 0.16,
    0,
    100,
  );
  const systemPressure = clamp(volatilityIndex * 0.5 + weather.windSpeed * 0.45, 0, 100);

  return {
    ...snapshot,
    ...weather,
    lastUpdated: Date.now(),
    newsHeadline:
      snapshot.dataSource === 'custom'
        ? snapshot.newsHeadline
        : `${location.label} signal: ${snapshot.newsHeadline}`,
    systemPressure,
    volatilityIndex,
  };
}

function buildFallbackSnapshot(location: LocationPreset): DataSnapshot {
  const hourWave = Math.sin(Date.now() / 1000 / 60);
  const weather = buildLocationWeather(location);
  const btcChange = hourWave * 3.2 + randomBetween(-1.4, 1.4);
  const ethChange = Math.cos(Date.now() / 1000 / 52) * 4.1 + randomBetween(-1.2, 1.2);
  const newsPulse = clamp(52 + hourWave * 25 + randomBetween(-8, 8), 0, 100);
  const volatilityIndex = deriveVolatility(btcChange, ethChange);

  return {
    assetName: 'Bitcoin',
    assetSymbol: 'BTC',
    btcPrice: 69000 + hourWave * 1200 + randomBetween(-900, 900),
    btcChange24h: btcChange,
    ethPrice: 3400 + Math.cos(Date.now() / 1000 / 40) * 160 + randomBetween(-80, 80),
    ethChange24h: ethChange,
    fearGreedScore: deriveFearGreed(btcChange, ethChange, newsPulse),
    ...weather,
    newsSentiment: sentimentFromScore(newsPulse),
    newsHeadline: `${location.label} fallback pulse active; synthetic signal preserving the demo loop`,
    newsPulse,
    volatilityIndex,
    worldBehavior: pick(WORLD_BEHAVIOR_VARIANTS),
    systemPressure: measureSystemPressure(volatilityIndex),
    dataSource: 'fallback',
    lastUpdated: Date.now(),
  };
}

function randomizeDemoSnapshot(
  snapshot: DataSnapshot,
  mode: DemoDataMode,
  location: LocationPreset,
): DataSnapshot {
  const asset = pick(DEMO_ASSETS);
  const weather = buildLocationWeather(location, snapshot.weatherCode);
  const btcChange24h = jitterSigned(snapshot.btcChange24h, mode === 'open' ? 1.8 : 2.6);
  const ethChange24h = jitterSigned(snapshot.ethChange24h, mode === 'open' ? 1.5 : 2.8);
  const volatilityIndex = clamp(jitter(snapshot.volatilityIndex, mode === 'circuit' ? 4 : 10), 0, 100);
  const newsPulse = clamp(jitter(snapshot.newsPulse, mode === 'circuit' ? 4 : 11), 0, 100);
  const fearGreedScore = clamp(jitter(snapshot.fearGreedScore, mode === 'circuit' ? 3 : 8), 0, 100);
  const priceMultiplier = randomBetween(0.94, 1.08);
  const locationPulse = location.shortLabel.charCodeAt(0) + location.shortLabel.charCodeAt(location.shortLabel.length - 1);

  return {
    ...snapshot,
    ...weather,
    assetName: asset.name,
    assetSymbol: asset.symbol,
    btcChange24h,
    btcPrice: Math.max(1, asset.price * priceMultiplier + locationPulse),
    ethChange24h,
    ethPrice: Math.max(1, snapshot.ethPrice * randomBetween(0.92, 1.11)),
    fearGreedScore,
    lastUpdated: Date.now(),
    newsHeadline: pick(HEADLINE_VARIANTS[mode]),
    newsPulse,
    systemPressure: clamp(volatilityIndex * 0.58 + weather.windSpeed * 0.46, 0, 100),
    volatilityIndex,
    worldBehavior: pick(WORLD_BEHAVIOR_VARIANTS),
  };
}

function buildLocationWeather(
  location: LocationPreset,
  preferredCode?: number,
): Pick<DataSnapshot, 'weatherCode' | 'weatherTemp' | 'windSpeed'> {
  const weatherCodes: Record<LocationId, number[]> = {
    alps: [71, 73, 85, 2],
    amazon: [61, 80, 95, 51],
    bangalore: [61, 51, 2, 95],
    dubai: [0, 1, 2, 45],
    iceland: [71, 45, 61, 2],
    london: [45, 51, 61, 2],
    'new-york': [0, 2, 61, 95],
    sahara: [0, 1, 45, 2],
    singapore: [61, 80, 95, 2],
    tokyo: [1, 2, 61, 51],
  };
  const code = Math.random() > 0.28 && preferredCode !== undefined ? preferredCode : pick(weatherCodes[location.id]);
  const latitudeHeat = Math.max(-10, Math.min(10, (18 - Math.abs(location.latitude)) * 0.24));
  const locationBase: Record<LocationId, number> = {
    alps: -1,
    amazon: 28,
    bangalore: 25,
    dubai: 34,
    iceland: 4,
    london: 12,
    'new-york': 17,
    sahara: 36,
    singapore: 29,
    tokyo: 20,
  };

  return {
    weatherCode: code,
    weatherTemp: locationBase[location.id] + latitudeHeat + randomBetween(-3.2, 3.2),
    windSpeed: Math.max(2, randomBetween(6, 30) + (code >= 95 ? 34 : 0) + (code === 45 ? -3 : 0)),
  };
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function jitter(value: number, amount: number): number {
  return value + randomBetween(-amount, amount);
}

function jitterSigned(value: number, amount: number): number {
  const next = jitter(value, amount);
  if (Math.abs(value) < 2.2) return next;
  return Math.sign(value) * Math.max(Math.abs(next), Math.min(Math.abs(value) * 0.55, 2.4));
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function sentimentFromScore(score: number): NewsSentiment {
  if (score < 18) return 'crisis';
  if (score < 43) return 'negative';
  if (score > 68) return 'positive';
  return 'neutral';
}

function measureSystemPressure(volatility: number): number {
  const memory = 'deviceMemory' in navigator ? Number(navigator.deviceMemory) : 4;
  const memoryPressure = clamp((8 - memory) * 7, 0, 35);
  const connection =
    'connection' in navigator
      ? (navigator.connection as { downlink?: number }).downlink ?? 10
      : 10;
  const networkPressure = clamp((10 - connection) * 3, 0, 30);
  return clamp(volatility * 0.45 + memoryPressure + networkPressure, 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

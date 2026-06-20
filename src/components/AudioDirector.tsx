import { useCallback, useEffect, useRef } from 'react';
import type { WorldLogEntry, WorldMood } from '../store/worldStore';
import { useWorldStore } from '../store/worldStore';

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

interface AudioRig {
  context: AudioContext;
  engineGain: GainNode;
  engineOsc: OscillatorNode;
  enginePan: StereoPannerNode | null;
  master: GainNode;
  noiseFilter: BiquadFilterNode;
  noiseGain: GainNode;
  padA: OscillatorNode;
  padAGain: GainNode;
  padB: OscillatorNode;
  padBGain: GainNode;
  sub: OscillatorNode;
  subGain: GainNode;
}

const MOOD_FREQUENCIES: Record<WorldMood, number> = {
  aurora: 146.83,
  dawn: 98,
  fire: 73.42,
  golden: 123.47,
  storm: 55,
  void: 41.2,
};

export function AudioDirector() {
  const audioEnabled = useWorldStore((state) => state.audioEnabled);
  const audioVolume = useWorldStore((state) => state.audioVolume);
  const dataSnapshot = useWorldStore((state) => state.dataSnapshot);
  const isGenerating = useWorldStore((state) => state.isGenerating);
  const latestLog = useWorldStore((state) => state.worldLog[0]);
  const pilotBoost = useWorldStore((state) => state.pilotBoost);
  const pilotLookHorizontal = useWorldStore((state) => state.pilotLookHorizontal);
  const pilotMovement = useWorldStore((state) => state.pilotMovement);
  const reactorModel = useWorldStore((state) => state.reactorModel);
  const viewMode = useWorldStore((state) => state.viewMode);
  const worldMood = useWorldStore((state) => state.worldMood);
  const rig = useRef<AudioRig | null>(null);
  const lastLogKey = useRef('');

  const ensureRig = useCallback(async () => {
    if (rig.current) {
      await rig.current.context.resume();
      return rig.current;
    }

    const AudioConstructor =
      window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;

    if (!AudioConstructor) {
      useWorldStore
        .getState()
        .addLog('Audio unavailable', 'This browser does not expose Web Audio.', 'error');
      return null;
    }

    const context = new AudioConstructor();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    const padA = context.createOscillator();
    const padAGain = context.createGain();
    padA.type = 'sine';
    padAGain.gain.value = 0;
    padA.connect(padAGain).connect(master);
    padA.start();

    const padB = context.createOscillator();
    const padBGain = context.createGain();
    padB.type = 'triangle';
    padBGain.gain.value = 0;
    padB.connect(padBGain).connect(master);
    padB.start();

    const sub = context.createOscillator();
    const subGain = context.createGain();
    sub.type = 'sine';
    subGain.gain.value = 0;
    sub.connect(subGain).connect(master);
    sub.start();

    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 520;
    noiseFilter.Q.value = 0.8;

    const noiseGain = context.createGain();
    noiseGain.gain.value = 0;
    const noise = context.createBufferSource();
    noise.buffer = makeNoiseBuffer(context);
    noise.loop = true;
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start();

    const engineOsc = context.createOscillator();
    const engineGain = context.createGain();
    const enginePan = 'createStereoPanner' in context ? context.createStereoPanner() : null;
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 48;
    engineGain.gain.value = 0;
    if (enginePan) {
      engineOsc.connect(engineGain).connect(enginePan).connect(master);
    } else {
      engineOsc.connect(engineGain).connect(master);
    }
    engineOsc.start();

    rig.current = {
      context,
      engineGain,
      engineOsc,
      enginePan,
      master,
      noiseFilter,
      noiseGain,
      padA,
      padAGain,
      padB,
      padBGain,
      sub,
      subGain,
    };

    await context.resume();
    return rig.current;
  }, []);

  useEffect(() => {
    function armAudio() {
      void ensureRig();
    }

    window.addEventListener('groundtruth:audio-arm', armAudio);
    return () => {
      window.removeEventListener('groundtruth:audio-arm', armAudio);
    };
  }, [ensureRig]);

  useEffect(() => {
    if (!audioEnabled) return;
    void ensureRig();
  }, [audioEnabled, ensureRig]);

  useEffect(() => {
    const audio = rig.current;
    if (!audio) return;

    const now = audio.context.currentTime;
    const volatility = dataSnapshot?.volatilityIndex ?? 12;
    const fear = dataSnapshot?.fearGreedScore ?? 50;
    const wind = dataSnapshot?.windSpeed ?? 8;
    const base = MOOD_FREQUENCIES[worldMood];
    const movementActive = pilotMovement !== 'idle';
    const lookActive = pilotLookHorizontal !== 'idle';
    const droneActive = reactorModel === 'lingbot' && viewMode === 'drone';
    const boost = pilotBoost ? 1.38 : 1;
    const volume = audioEnabled ? clamp(audioVolume, 0, 1) : 0;

    audio.master.gain.setTargetAtTime(volume * 0.78, now, 0.08);
    audio.padA.frequency.setTargetAtTime(base, now, 0.18);
    audio.padB.frequency.setTargetAtTime(base * (fear > 70 ? 1.5 : 1.333), now, 0.18);
    audio.sub.frequency.setTargetAtTime(base * 0.5, now, 0.2);
    audio.padAGain.gain.setTargetAtTime(isGenerating ? 0.07 : 0.035, now, 0.2);
    audio.padBGain.gain.setTargetAtTime(0.024 + volatility / 2800, now, 0.24);
    audio.subGain.gain.setTargetAtTime(worldMood === 'void' || worldMood === 'fire' ? 0.06 : 0.026, now, 0.24);
    audio.noiseFilter.frequency.setTargetAtTime(280 + fear * 8 + volatility * 14 + wind * 4, now, 0.18);
    audio.noiseFilter.Q.setTargetAtTime(worldMood === 'storm' || worldMood === 'void' ? 2.4 : 0.85, now, 0.2);
    audio.noiseGain.gain.setTargetAtTime(
      (worldMood === 'storm' || worldMood === 'void' ? 0.08 : 0.025) + volatility / 2400,
      now,
      0.22,
    );
    audio.engineOsc.frequency.setTargetAtTime(
      droneActive ? (movementActive ? 94 : 58) * boost + (lookActive ? 8 : 0) : 42,
      now,
      0.06,
    );
    audio.engineGain.gain.setTargetAtTime(droneActive ? (movementActive || lookActive ? 0.085 : 0.032) : 0, now, 0.05);
    audio.enginePan?.pan.setTargetAtTime(
      pilotLookHorizontal === 'left' ? -0.45 : pilotLookHorizontal === 'right' ? 0.45 : 0,
      now,
      0.07,
    );
  }, [
    audioEnabled,
    audioVolume,
    dataSnapshot,
    isGenerating,
    pilotBoost,
    pilotLookHorizontal,
    pilotMovement,
    reactorModel,
    viewMode,
    worldMood,
  ]);

  useEffect(() => {
    if (!audioEnabled || !latestLog) return;

    const key = `${latestLog.time}-${latestLog.event}`;
    if (key === lastLogKey.current) return;

    lastLogKey.current = key;
    const audio = rig.current;
    if (!audio) return;

    playStinger(audio, latestLog, worldMood);
  }, [audioEnabled, latestLog, worldMood]);

  useEffect(() => {
    return () => {
      const audio = rig.current;
      rig.current = null;
      void audio?.context.close();
    };
  }, []);

  return null;
}

function makeNoiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * 0.52;
  }

  return buffer;
}

function playStinger(audio: AudioRig, entry: WorldLogEntry, mood: WorldMood) {
  const now = audio.context.currentTime;
  const gain = audio.context.createGain();
  const osc = audio.context.createOscillator();
  const base = entry.source === 'error' ? 84 : MOOD_FREQUENCIES[mood] * 2;

  osc.type = entry.source === 'error' ? 'sawtooth' : entry.source === 'manual' ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.exponentialRampToValueAtTime(base * (entry.source === 'error' ? 0.5 : 1.75), now + 0.42);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(entry.source === 'error' ? 0.14 : 0.1, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);
  osc.connect(gain).connect(audio.master);
  osc.start(now);
  osc.stop(now + 0.75);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

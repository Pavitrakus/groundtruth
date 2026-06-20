import { useCallback, useEffect, useRef } from 'react';
import { useReactor, useReactorMessage } from '@reactor-team/js-sdk';
import { pollAllData } from '../engine/dataFetcher';
import { dataToWorldPrompt, getOpeningPrompt } from '../engine/promptEngine';
import { getFrameMode, getLocationPreset, getViewMode, type LocationId } from '../engine/worldOptions';
import type { WorldStateSnapshot } from '../store/worldStore';
import { useWorldStore } from '../store/worldStore';

type ReactorMessage = {
  type?: string;
  data?: Record<string, unknown>;
};

function controlsFromState(state: WorldStateSnapshot) {
  return {
    frame: getFrameMode(state.frameMode),
    location: getLocationPreset(state.selectedLocationId),
    view: getViewMode(state.viewMode),
  };
}

export function WorldOrchestrator() {
  const { lastError, sendCommand, status, uploadFile } = useReactor((state) => ({
    lastError: state.lastError,
    sendCommand: state.sendCommand,
    status: state.status,
    uploadFile: state.uploadFile,
  }));
  const hasStarted = useRef(false);
  const imageAcceptedResolve = useRef<(() => void) | null>(null);
  const isTicking = useRef(false);
  const lastPrompt = useRef('');

  useEffect(() => {
    useWorldStore.getState().setConnectionStatus(status);
  }, [status]);

  useEffect(() => {
    useWorldStore
      .getState()
      .setReactorError(lastError ? `${lastError.code}: ${lastError.message}` : null);
  }, [lastError]);

  useReactorMessage((message: ReactorMessage) => {
    const store = useWorldStore.getState();
    const data = message.data ?? {};

    if (message.type === 'state') {
      store.updateRuntime(
        Number(data.current_chunk ?? store.currentChunk),
        Number(data.current_frame ?? store.currentFrame),
        typeof data.current_prompt === 'string' ? data.current_prompt : null,
      );
      store.setGenerating(Boolean(data.running));
    }

    if (message.type === 'chunk_complete') {
      store.updateRuntime(
        Number(data.chunk_index ?? store.currentChunk),
        store.currentFrame,
        typeof data.active_prompt === 'string' ? data.active_prompt : null,
      );
    }

    if (message.type === 'command_error') {
      const command = typeof data.command === 'string' ? data.command : 'unknown';
      const reason = typeof data.reason === 'string' ? data.reason : 'No reason provided';
      store.setReactorError(`${command}: ${reason}`);
      store.addLog(`Command rejected: ${command}`, reason, 'error');
    }

    if (message.type === 'image_accepted') {
      imageAcceptedResolve.current?.();
      imageAcceptedResolve.current = null;
    }
  });

  const pushDataPrompt = useCallback(async () => {
    if (status !== 'ready' || isTicking.current) return;

    isTicking.current = true;

    try {
      const stateBeforeFetch = useWorldStore.getState();
      const mode = stateBeforeFetch.dataMode;
      const locationId = stateBeforeFetch.selectedLocationId;
      const viewMode = stateBeforeFetch.viewMode;
      const frameMode = stateBeforeFetch.frameMode;
      const controls = controlsFromState(stateBeforeFetch);
      const reactorModel = stateBeforeFetch.reactorModel;
      const data =
        mode === 'custom' && stateBeforeFetch.dataSnapshot
          ? { ...stateBeforeFetch.dataSnapshot, lastUpdated: Date.now() }
          : await pollAllData(mode, controls.location);
      const { mood, prompt, reason } = dataToWorldPrompt(data, controls);
      const stateAfterFetch = useWorldStore.getState();

      if (
        stateAfterFetch.dataMode !== mode ||
        stateAfterFetch.selectedLocationId !== locationId ||
        stateAfterFetch.viewMode !== viewMode ||
        stateAfterFetch.frameMode !== frameMode ||
        stateAfterFetch.reactorModel !== reactorModel
      ) {
        return;
      }

      const shouldSend = prompt !== stateAfterFetch.currentPrompt && prompt !== lastPrompt.current;

      stateAfterFetch.setData(data);
      stateAfterFetch.setWorldMood(mood);
      stateAfterFetch.setReason(reason);

      if (shouldSend) {
        await sendCommand('set_prompt', { prompt: promptForModel(prompt, reactorModel) });
        lastPrompt.current = prompt;
        stateAfterFetch.setPrompt(prompt);
        stateAfterFetch.addLog(reason, prompt, mode === 'live' ? 'data' : 'manual');
      } else {
        lastPrompt.current = prompt;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Data pulse failed';
      useWorldStore.getState().setReactorError(message);
      useWorldStore.getState().addLog('Data pulse failed', message, 'error');
    } finally {
      isTicking.current = false;
    }
  }, [sendCommand, status]);

  useEffect(() => {
    if (status !== 'ready' || hasStarted.current) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    async function startWorld() {
      const state = useWorldStore.getState();
      const controls = controlsFromState(state);
      const opening = state.currentPrompt || getOpeningPrompt(controls);

      try {
        await sendCommand('set_seed', { seed: state.sessionSeed + state.sceneRevision * 7919 });

        if (state.reactorModel === 'lingbot') {
          const seedImage = await createLingBotSeedImage(controls, state.worldMood);
          const accepted = new Promise<void>((resolve) => {
            imageAcceptedResolve.current = resolve;
          });
          const image = await uploadFile(seedImage, { name: 'terra-lingbot-seed.png' });

          await sendCommand('set_image', { image });
          await Promise.race([accepted, sleep(4500)]);
          await sendCommand('set_prompt', { prompt: promptForModel(opening, state.reactorModel) });
          await sendCommand('set_rotation_speed_deg', { rotation_speed_deg: 10 });
          await sendCommand('set_movement', { movement: 'idle' });
          await sendCommand('set_look_horizontal', { look_horizontal: 'idle' });
          await sendCommand('set_look_vertical', { look_vertical: 'idle' });
        } else {
          await sendCommand('schedule_prompt', { prompt: opening, chunk: 0 });
        }

        await sendCommand('start', {});

        if (cancelled) return;

        hasStarted.current = true;
        lastPrompt.current = opening;
        useWorldStore.getState().setPrompt(opening);
        useWorldStore.getState().setGenerating(true);
        useWorldStore
          .getState()
          .addLog(
            state.reactorModel === 'lingbot' ? 'LingBot cockpit online' : 'World online',
            opening,
            'system',
          );

        window.setTimeout(() => {
          void pushDataPrompt();
        }, 3500);
        interval = window.setInterval(() => {
          void pushDataPrompt();
        }, 12000);
      } catch (error) {
        const state = useWorldStore.getState();
        const modelLabel = state.reactorModel === 'lingbot' ? 'LingBot' : 'Helios';
        const message = error instanceof Error ? error.message : `Unable to start ${modelLabel}`;
        useWorldStore.getState().setReactorError(message);
        useWorldStore.getState().addLog(`${modelLabel} start failed`, message, 'error');
      }
    }

    void startWorld();

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
    };
  }, [pushDataPrompt, sendCommand, status, uploadFile]);

  return null;
}

function promptForModel(prompt: string, model: WorldStateSnapshot['reactorModel']) {
  return model === 'lingbot' ? prompt.slice(0, 980) : prompt;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createLingBotSeedImage(
  controls: ReturnType<typeof controlsFromState>,
  mood: WorldStateSnapshot['worldMood'],
) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext('2d');

  if (!context) {
    return Promise.reject(new Error('Unable to create LingBot seed image'));
  }

  const palette = getMoodPalette(mood);
  const sky = context.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(0.52, palette.skyMid);
  sky.addColorStop(1, palette.ground);
  context.fillStyle = sky;
  context.fillRect(0, 0, 1280, 720);

  const sun = context.createRadialGradient(900, 150, 0, 900, 150, 260);
  sun.addColorStop(0, palette.accentStrong);
  sun.addColorStop(0.28, palette.accentSoft);
  sun.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = sun;
  context.fillRect(0, 0, 1280, 520);

  context.globalAlpha = 0.82;
  context.fillStyle = palette.horizon;
  context.beginPath();
  context.moveTo(0, 420);
  context.bezierCurveTo(210, 350, 390, 465, 580, 380);
  context.bezierCurveTo(760, 300, 940, 455, 1280, 340);
  context.lineTo(1280, 720);
  context.lineTo(0, 720);
  context.closePath();
  context.fill();

  drawLocationSignature(context, controls.location.id, palette);
  drawPilotRunway(context, palette);

  context.globalCompositeOperation = 'screen';
  context.strokeStyle = palette.line;
  context.lineWidth = 2;
  for (let y = 450; y < 720; y += 38) {
    context.globalAlpha = Math.max(0.1, 0.48 - (y - 450) / 520);
    context.beginPath();
    context.moveTo(110, y);
    context.lineTo(1170, y + Math.sin(y * 0.02) * 10);
    context.stroke();
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to encode LingBot seed image'));
    }, 'image/png');
  });
}

function drawLocationSignature(
  context: CanvasRenderingContext2D,
  locationId: LocationId,
  palette: ReturnType<typeof getMoodPalette>,
) {
  context.save();
  const base = 422;

  context.globalAlpha = 0.66;
  context.fillStyle = palette.structure;
  context.strokeStyle = palette.line;
  context.lineWidth = 3;

  if (locationId === 'bangalore') {
    context.globalAlpha = 0.5;
    for (let index = 0; index < 11; index += 1) {
      const x = 118 + index * 92;
      context.fillRect(x, base - 70 - (index % 3) * 14, 52, 70 + (index % 3) * 14);
    }
    context.globalAlpha = 0.42;
    context.beginPath();
    context.moveTo(90, base - 86);
    context.quadraticCurveTo(520, base - 126, 1190, base - 82);
    context.stroke();
    context.globalAlpha = 0.45;
    for (let index = 0; index < 9; index += 1) {
      const x = 150 + index * 118;
      context.beginPath();
      context.arc(x, base - 38, 30 + (index % 2) * 10, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 0.24;
    for (let index = 0; index < 28; index += 1) {
      const x = 80 + index * 44;
      context.beginPath();
      context.moveTo(x, 110);
      context.lineTo(x - 16, 360);
      context.stroke();
    }
    context.restore();
    return;
  }

  if (locationId === 'dubai') {
    context.globalAlpha = 0.68;
    for (let index = 0; index < 12; index += 1) {
      const width = 22 + (index % 4) * 11;
      const height = 96 + (index % 5) * 42;
      const x = 150 + index * 76;
      context.fillRect(x, base - height, width, height);
    }
    context.beginPath();
    context.moveTo(620, base - 272);
    context.lineTo(642, base - 42);
    context.lineTo(598, base - 42);
    context.closePath();
    context.fill();
    context.globalAlpha = 0.32;
    context.beginPath();
    context.moveTo(0, base + 20);
    context.quadraticCurveTo(320, base - 45, 640, base + 20);
    context.quadraticCurveTo(960, base + 76, 1280, base + 22);
    context.lineTo(1280, 720);
    context.lineTo(0, 720);
    context.fill();
    context.restore();
    return;
  }

  if (locationId === 'alps') {
    context.globalAlpha = 0.72;
    for (let index = 0; index < 6; index += 1) {
      const x = 80 + index * 210;
      const height = 190 + (index % 3) * 48;
      context.beginPath();
      context.moveTo(x, base);
      context.lineTo(x + 120, base - height);
      context.lineTo(x + 260, base);
      context.closePath();
      context.fill();
    }
    context.restore();
    return;
  }

  if (locationId === 'amazon') {
    context.globalAlpha = 0.58;
    for (let index = 0; index < 18; index += 1) {
      const x = 50 + index * 70;
      context.beginPath();
      context.arc(x, base - 36 - (index % 4) * 18, 42 + (index % 3) * 10, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 0.32;
    context.beginPath();
    context.moveTo(0, base + 44);
    context.bezierCurveTo(260, base - 35, 430, base + 110, 710, base + 30);
    context.bezierCurveTo(920, base - 28, 1040, base + 78, 1280, base + 20);
    context.stroke();
    context.restore();
    return;
  }

  if (locationId === 'sahara') {
    context.globalAlpha = 0.48;
    for (let index = 0; index < 4; index += 1) {
      context.beginPath();
      context.moveTo(-80, base + index * 42);
      context.quadraticCurveTo(260 + index * 120, base - 90 + index * 22, 700, base + index * 32);
      context.quadraticCurveTo(980, base + 96, 1380, base + index * 18);
      context.lineTo(1380, 720);
      context.lineTo(-80, 720);
      context.fill();
    }
    context.restore();
    return;
  }

  if (locationId === 'iceland') {
    context.globalAlpha = 0.62;
    context.beginPath();
    context.moveTo(0, base);
    context.lineTo(220, base - 92);
    context.lineTo(440, base - 36);
    context.lineTo(650, base - 132);
    context.lineTo(880, base - 54);
    context.lineTo(1280, base - 110);
    context.lineTo(1280, 720);
    context.lineTo(0, 720);
    context.closePath();
    context.fill();
    context.restore();
    return;
  }

  const skylineDensity = locationId === 'new-york' ? 18 : locationId === 'tokyo' ? 16 : 12;
  for (let index = 0; index < skylineDensity; index += 1) {
    const width = locationId === 'london' ? 34 : 22 + (index % 4) * 10;
    const height = 62 + ((index * 31 + skylineDensity) % (locationId === 'new-york' ? 190 : 128));
    const x = 120 + index * (locationId === 'new-york' ? 58 : 72);
    context.fillRect(x, base - height, width, height);

    context.globalAlpha = 0.22;
    context.fillStyle = palette.line;
    context.fillRect(x + width + 8, base - height * 0.72, 2, height * 0.66);
    context.globalAlpha = 0.64;
    context.fillStyle = palette.structure;
  }

  if (locationId === 'tokyo' || locationId === 'singapore') {
    context.globalAlpha = 0.36;
    context.beginPath();
    context.moveTo(80, base - 62);
    context.quadraticCurveTo(560, base - 112, 1200, base - 70);
    context.stroke();
  }

  if (locationId === 'london') {
    context.globalAlpha = 0.36;
    context.beginPath();
    context.moveTo(40, base + 22);
    context.bezierCurveTo(300, base - 24, 520, base + 84, 820, base + 18);
    context.bezierCurveTo(1000, base - 22, 1120, base + 36, 1240, base + 8);
    context.stroke();
  }

  context.restore();
}

function drawPilotRunway(
  context: CanvasRenderingContext2D,
  palette: ReturnType<typeof getMoodPalette>,
) {
  context.save();
  context.globalAlpha = 0.7;
  const runway = context.createLinearGradient(640, 410, 640, 720);
  runway.addColorStop(0, 'rgba(255,255,255,0.06)');
  runway.addColorStop(1, 'rgba(0,0,0,0.5)');
  context.fillStyle = runway;
  context.beginPath();
  context.moveTo(520, 430);
  context.lineTo(760, 430);
  context.lineTo(1080, 720);
  context.lineTo(200, 720);
  context.closePath();
  context.fill();

  context.strokeStyle = palette.line;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(640, 438);
  context.lineTo(640, 720);
  context.stroke();
  context.restore();
}

function getMoodPalette(mood: WorldStateSnapshot['worldMood']) {
  const palettes = {
    aurora: {
      accentSoft: 'rgba(98,216,255,0.24)',
      accentStrong: 'rgba(56,232,139,0.42)',
      ground: '#050712',
      horizon: '#102a2d',
      line: 'rgba(130,255,221,0.62)',
      skyMid: '#173842',
      skyTop: '#09101b',
      structure: '#0b1821',
    },
    dawn: {
      accentSoft: 'rgba(242,203,92,0.24)',
      accentStrong: 'rgba(255,223,122,0.44)',
      ground: '#091016',
      horizon: '#22313a',
      line: 'rgba(98,216,255,0.54)',
      skyMid: '#53666f',
      skyTop: '#17202a',
      structure: '#111a21',
    },
    fire: {
      accentSoft: 'rgba(255,91,95,0.25)',
      accentStrong: 'rgba(255,179,77,0.48)',
      ground: '#090305',
      horizon: '#3a1211',
      line: 'rgba(255,179,77,0.58)',
      skyMid: '#4a1718',
      skyTop: '#17060a',
      structure: '#18080a',
    },
    golden: {
      accentSoft: 'rgba(242,203,92,0.28)',
      accentStrong: 'rgba(255,239,168,0.46)',
      ground: '#0b0d08',
      horizon: '#343019',
      line: 'rgba(242,203,92,0.6)',
      skyMid: '#59674e',
      skyTop: '#1c2724',
      structure: '#17190f',
    },
    storm: {
      accentSoft: 'rgba(98,216,255,0.18)',
      accentStrong: 'rgba(170,214,255,0.34)',
      ground: '#040508',
      horizon: '#161d28',
      line: 'rgba(98,216,255,0.5)',
      skyMid: '#253242',
      skyTop: '#0d121b',
      structure: '#090d13',
    },
    void: {
      accentSoft: 'rgba(130,120,255,0.18)',
      accentStrong: 'rgba(98,216,255,0.26)',
      ground: '#020204',
      horizon: '#090912',
      line: 'rgba(172,166,255,0.48)',
      skyMid: '#080a12',
      skyTop: '#020205',
      structure: '#040409',
    },
  } satisfies Record<WorldStateSnapshot['worldMood'], Record<string, string>>;

  return palettes[mood];
}

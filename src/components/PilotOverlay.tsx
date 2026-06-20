import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { useReactor } from '@reactor-team/js-sdk';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Gauge, Keyboard, Move3D, Square } from 'lucide-react';
import type {
  PilotLookHorizontal,
  PilotLookVertical,
  PilotMovement,
} from '../store/worldStore';
import { useWorldStore } from '../store/worldStore';

const MOVEMENT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown']);
const LOOK_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE', 'KeyR', 'KeyF']);
const JOYSTICK_DEAD_ZONE = 0.28;
const JOYSTICK_BOOST_ZONE = 0.78;

type JoystickKind = 'look' | 'move';

interface JoystickVisualState {
  active: boolean;
  boost: boolean;
  x: number;
  y: number;
}

const idleJoystick: JoystickVisualState = {
  active: false,
  boost: false,
  x: 0,
  y: 0,
};

export function PilotOverlay() {
  const { sendCommand, status } = useReactor((state) => ({
    sendCommand: state.sendCommand,
    status: state.status,
  }));
  const {
    pilotBoost,
    pilotLookHorizontal,
    pilotLookVertical,
    pilotMovement,
    pilotSpeed,
    reactorModel,
    viewMode,
  } = useWorldStore();
  const pressed = useRef<Set<string>>(new Set());
  const joystickCodes = useRef<Record<JoystickKind, string[]>>({
    look: [],
    move: [],
  });
  const lastSent = useRef({
    lookHorizontal: 'idle' as PilotLookHorizontal,
    lookVertical: 'idle' as PilotLookVertical,
    movement: 'idle' as PilotMovement,
    speed: 10,
  });
  const [lookJoystick, setLookJoystick] = useState<JoystickVisualState>(idleJoystick);
  const [moveJoystick, setMoveJoystick] = useState<JoystickVisualState>(idleJoystick);
  const isPilotMode = reactorModel === 'lingbot' && viewMode === 'drone';

  const syncPilot = useCallback(async () => {
    if (useWorldStore.getState().reactorModel !== 'lingbot') return;

    const next = resolvePilotState(pressed.current);
    const store = useWorldStore.getState();
    store.setPilot(next.movement, next.lookHorizontal, next.lookVertical, next.boost, next.speed);

    if (status !== 'ready') return;

    const commands: Array<Promise<void>> = [];

    if (next.movement !== lastSent.current.movement) {
      commands.push(sendCommand('set_movement', { movement: next.movement }));
      lastSent.current.movement = next.movement;
    }

    if (next.lookHorizontal !== lastSent.current.lookHorizontal) {
      commands.push(
        sendCommand('set_look_horizontal', { look_horizontal: next.lookHorizontal }),
      );
      lastSent.current.lookHorizontal = next.lookHorizontal;
    }

    if (next.lookVertical !== lastSent.current.lookVertical) {
      commands.push(sendCommand('set_look_vertical', { look_vertical: next.lookVertical }));
      lastSent.current.lookVertical = next.lookVertical;
    }

    if (next.speed !== lastSent.current.speed) {
      commands.push(sendCommand('set_rotation_speed_deg', { rotation_speed_deg: next.speed }));
      lastSent.current.speed = next.speed;
    }

    try {
      await Promise.all(commands);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pilot command failed';
      store.setReactorError(message);
      store.addLog('Pilot command failed', message, 'error');
    }
  }, [sendCommand, status]);

  const pressCodes = useCallback(
    (codes: string[]) => {
      const activeKeys = pressed.current;
      codes.forEach((code) => activeKeys.add(code));
      void syncPilot();
    },
    [syncPilot],
  );

  const releaseCodes = useCallback(
    (codes: string[]) => {
      const activeKeys = pressed.current;
      codes.forEach((code) => activeKeys.delete(code));
      void syncPilot();
    },
    [syncPilot],
  );

  const setJoystickCodes = useCallback(
    (kind: JoystickKind, codes: string[]) => {
      const activeKeys = pressed.current;
      joystickCodes.current[kind].forEach((code) => activeKeys.delete(code));
      codes.forEach((code) => activeKeys.add(code));
      joystickCodes.current[kind] = codes;
      void syncPilot();
    },
    [syncPilot],
  );

  const releaseJoystick = useCallback(
    (kind: JoystickKind) => {
      setJoystickCodes(kind, []);

      if (kind === 'move') {
        setMoveJoystick(idleJoystick);
      } else {
        setLookJoystick(idleJoystick);
      }
    },
    [setJoystickCodes],
  );

  const updateJoystick = useCallback(
    (kind: JoystickKind, event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
      const rawX = (event.clientX - centerX) / radius;
      const rawY = (event.clientY - centerY) / radius;
      const rawMagnitude = Math.hypot(rawX, rawY);
      const magnitude = Math.min(1, rawMagnitude);
      const scale = rawMagnitude > 1 ? 1 / rawMagnitude : 1;
      const x = Math.max(-1, Math.min(1, rawX * scale));
      const y = Math.max(-1, Math.min(1, rawY * scale));
      const codes = joystickCodesFromVector(kind, x, y, magnitude);
      const visual = {
        active: codes.length > 0,
        boost: codes.includes('ShiftLeft'),
        x,
        y,
      };

      if (kind === 'move') {
        setMoveJoystick(visual);
      } else {
        setLookJoystick(visual);
      }

      setJoystickCodes(kind, codes);
    },
    [setJoystickCodes],
  );

  const stopPilot = useCallback(() => {
    pressed.current.clear();
    joystickCodes.current = {
      look: [],
      move: [],
    };
    setLookJoystick(idleJoystick);
    setMoveJoystick(idleJoystick);
    void syncPilot();
  }, [syncPilot]);

  useEffect(() => {
    if (!isPilotMode) return;

    const activeKeys = pressed.current;

    function shouldIgnoreKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      return Boolean(
        target?.closest('input, textarea, select, button') ||
          event.metaKey ||
          event.ctrlKey ||
          event.altKey,
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreKeyboard(event)) return;

      if (event.code === 'Space') {
        event.preventDefault();
        activeKeys.clear();
        void syncPilot();
        return;
      }

      if (!MOVEMENT_KEYS.has(event.code) && !LOOK_KEYS.has(event.code) && event.code !== 'ShiftLeft') {
        return;
      }

      event.preventDefault();

      if (!activeKeys.has(event.code)) {
        activeKeys.add(event.code);
        void syncPilot();
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (!activeKeys.has(event.code)) return;

      event.preventDefault();
      activeKeys.delete(event.code);
      void syncPilot();
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', stopPilot);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', stopPilot);
      activeKeys.clear();
      void syncPilot();
    };
  }, [isPilotMode, stopPilot, syncPilot]);

  if (reactorModel !== 'lingbot') {
    return null;
  }

  return (
    <aside className={`pilot-overlay ${isPilotMode ? 'pilot-overlay--live' : ''}`}>
      <div className="pilot-overlay__status">
        <Move3D size={14} />
        LINGBOT PILOT
        <span>{status.toUpperCase()}</span>
      </div>
      <div className="pilot-overlay__state">
        <span>{labelMovement(pilotMovement)}</span>
        <span>{labelLook(pilotLookHorizontal, pilotLookVertical)}</span>
      </div>
      <div className="pilot-overlay__meters" aria-label="Pilot speed">
        <span style={{ width: `${pilotBoost ? 100 : 62}%` }} />
      </div>
      <div className="pilot-joysticks" aria-label="Drone joystick controls">
        <TouchJoystick
          label="Move"
          onMove={(event) => updateJoystick('move', event)}
          onRelease={(event) => {
            releasePointer(event);
            releaseJoystick('move');
          }}
          state={moveJoystick}
        />
        <TouchJoystick
          label="Look"
          onMove={(event) => updateJoystick('look', event)}
          onRelease={(event) => {
            releasePointer(event);
            releaseJoystick('look');
          }}
          state={lookJoystick}
        />
      </div>
      <div className="pilot-pad" aria-label="Drone touch controls">
        <PilotPadButton
          active={pilotLookHorizontal === 'left'}
          codes={['KeyQ']}
          label="Yaw left"
          onPress={pressCodes}
          onRelease={releaseCodes}
        >
          <ArrowLeft size={14} />
        </PilotPadButton>
        <PilotPadButton
          active={pilotMovement === 'forward'}
          codes={['KeyW']}
          label="Forward"
          onPress={pressCodes}
          onRelease={releaseCodes}
        >
          <ArrowUp size={14} />
        </PilotPadButton>
        <PilotPadButton
          active={pilotLookHorizontal === 'right'}
          codes={['KeyE']}
          label="Yaw right"
          onPress={pressCodes}
          onRelease={releaseCodes}
        >
          <ArrowRight size={14} />
        </PilotPadButton>
        <PilotPadButton
          active={pilotMovement === 'strafe_left'}
          codes={['KeyA']}
          label="Strafe left"
          onPress={pressCodes}
          onRelease={releaseCodes}
        >
          A
        </PilotPadButton>
        <button className="pilot-pad__button pilot-pad__button--stop" onPointerDown={stopPilot} title="Stop" type="button">
          <Square size={12} />
        </button>
        <PilotPadButton
          active={pilotMovement === 'strafe_right'}
          codes={['KeyD']}
          label="Strafe right"
          onPress={pressCodes}
          onRelease={releaseCodes}
        >
          D
        </PilotPadButton>
        <PilotPadButton
          active={pilotLookVertical === 'up'}
          codes={['KeyR']}
          label="Look up"
          onPress={pressCodes}
          onRelease={releaseCodes}
        >
          R
        </PilotPadButton>
        <PilotPadButton
          active={pilotMovement === 'back'}
          codes={['KeyS']}
          label="Back"
          onPress={pressCodes}
          onRelease={releaseCodes}
        >
          <ArrowDown size={14} />
        </PilotPadButton>
        <PilotPadButton
          active={pilotLookVertical === 'down'}
          codes={['KeyF']}
          label="Look down"
          onPress={pressCodes}
          onRelease={releaseCodes}
        >
          F
        </PilotPadButton>
      </div>
      <div className="pilot-overlay__keys">
        <Keyboard size={13} />
        <span>Arrows: fly/yaw</span>
        <span>WASD: move</span>
        <span>Space: stop</span>
        <span>
          <Gauge size={12} /> {pilotBoost ? `Boost ${pilotSpeed}` : `Speed ${pilotSpeed}`}
        </span>
      </div>
    </aside>
  );
}

interface TouchJoystickProps {
  label: string;
  onMove: (event: PointerEvent<HTMLDivElement>) => void;
  onRelease: (event: PointerEvent<HTMLDivElement>) => void;
  state: JoystickVisualState;
}

function TouchJoystick({ label, onMove, onRelease, state }: TouchJoystickProps) {
  const thumbStyle = {
    '--joystick-x': state.x.toFixed(3),
    '--joystick-y': state.y.toFixed(3),
  } as CSSProperties;

  return (
    <div
      aria-label={`${label} joystick`}
      className={`pilot-joystick ${state.active ? 'pilot-joystick--active' : ''} ${
        state.boost ? 'pilot-joystick--boost' : ''
      }`}
      onPointerCancel={onRelease}
      onPointerDown={onMove}
      onPointerLeave={onRelease}
      onPointerMove={onMove}
      onPointerUp={onRelease}
      role="application"
    >
      <span className="pilot-joystick__label">{label}</span>
      <span className="pilot-joystick__base">
        <span className="pilot-joystick__axis pilot-joystick__axis--x" />
        <span className="pilot-joystick__axis pilot-joystick__axis--y" />
        <span className="pilot-joystick__thumb" style={thumbStyle} />
      </span>
    </div>
  );
}

interface PilotPadButtonProps {
  active: boolean;
  children: ReactNode;
  codes: string[];
  label: string;
  onPress: (codes: string[]) => void;
  onRelease: (codes: string[]) => void;
}

function PilotPadButton({ active, children, codes, label, onPress, onRelease }: PilotPadButtonProps) {
  function press(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onPress(codes);
  }

  function release(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onRelease(codes);
  }

  return (
    <button
      className={`pilot-pad__button ${active ? 'pilot-pad__button--active' : ''}`}
      onPointerCancel={release}
      onPointerDown={press}
      onPointerLeave={release}
      onPointerUp={release}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function resolvePilotState(keys: Set<string>) {
  let movement: PilotMovement = 'idle';
  let lookHorizontal: PilotLookHorizontal = 'idle';
  let lookVertical: PilotLookVertical = 'idle';

  if (keys.has('KeyW') || keys.has('ArrowUp')) movement = 'forward';
  else if (keys.has('KeyS') || keys.has('ArrowDown')) movement = 'back';
  else if (keys.has('KeyA')) movement = 'strafe_left';
  else if (keys.has('KeyD')) movement = 'strafe_right';

  if (keys.has('ArrowLeft') || keys.has('KeyQ')) lookHorizontal = 'left';
  else if (keys.has('ArrowRight') || keys.has('KeyE')) lookHorizontal = 'right';

  if (keys.has('KeyR')) lookVertical = 'up';
  else if (keys.has('KeyF')) lookVertical = 'down';

  return {
    boost: keys.has('ShiftLeft'),
    lookHorizontal,
    lookVertical,
    movement,
    speed: keys.has('ShiftLeft') ? 16 : 10,
  };
}

function joystickCodesFromVector(kind: JoystickKind, x: number, y: number, magnitude: number) {
  if (magnitude < JOYSTICK_DEAD_ZONE) return [];

  if (kind === 'move') {
    const codes: string[] = [];

    if (Math.abs(y) >= Math.abs(x)) {
      codes.push(y < 0 ? 'KeyW' : 'KeyS');
    } else {
      codes.push(x < 0 ? 'KeyA' : 'KeyD');
    }

    if (magnitude > JOYSTICK_BOOST_ZONE) {
      codes.push('ShiftLeft');
    }

    return codes;
  }

  if (Math.abs(x) >= Math.abs(y)) {
    return [x < 0 ? 'KeyQ' : 'KeyE'];
  }

  return [y < 0 ? 'KeyR' : 'KeyF'];
}

function releasePointer(event: PointerEvent<HTMLDivElement>) {
  event.preventDefault();

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}

function labelMovement(movement: PilotMovement) {
  if (movement === 'strafe_left') return 'STRAFE LEFT';
  if (movement === 'strafe_right') return 'STRAFE RIGHT';
  return movement.toUpperCase();
}

function labelLook(horizontal: PilotLookHorizontal, vertical: PilotLookVertical) {
  if (horizontal !== 'idle' && vertical !== 'idle') return `${horizontal} + ${vertical}`.toUpperCase();
  if (horizontal !== 'idle') return `LOOK ${horizontal.toUpperCase()}`;
  if (vertical !== 'idle') return `LOOK ${vertical.toUpperCase()}`;
  return 'LOOK IDLE';
}

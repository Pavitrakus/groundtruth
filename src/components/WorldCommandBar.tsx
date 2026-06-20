import { useState, type ComponentType } from 'react';
import { useReactor } from '@reactor-team/js-sdk';
import {
  Badge,
  Bot,
  Clapperboard,
  Film,
  Globe2,
  Map,
  Navigation,
  Orbit,
  PanelTop,
  PersonStanding,
  Plane,
  RadioTower,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { dataToWorldPrompt, getOpeningPrompt } from '../engine/promptEngine';
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
} from '../engine/worldOptions';
import { useWorldStore, type ReactorModel } from '../store/worldStore';

const VIEW_ICONS: Record<ViewModeId, ComponentType<{ size?: number }>> = {
  cinematic: Film,
  drone: Plane,
  human: PersonStanding,
  orbit: Orbit,
};

const FRAME_ICONS: Record<FrameModeId, ComponentType<{ size?: number }>> = {
  card: PanelTop,
  dream: Sparkles,
  map: Map,
  signal: RadioTower,
  world: Globe2,
};

const MODEL_LABELS: Record<ReactorModel, string> = {
  helios: 'Helios',
  lingbot: 'LingBot',
};

export function WorldCommandBar() {
  const { sendCommand, status } = useReactor((state) => ({
    sendCommand: state.sendCommand,
    status: state.status,
  }));
  const {
    frameMode,
    audioEnabled,
    reactorModel,
    selectedLocationId,
    setAudioEnabled,
    setFrameMode,
    setLocation,
    setReactorModel,
    setReactorError,
    setShowcaseActive,
    setShowcaseCue,
    setShowcaseStep,
    setViewMode,
    showcaseActive,
    viewMode,
  } = useWorldStore();
  const [locationOpen, setLocationOpen] = useState(false);
  const activeLocation = getLocationPreset(selectedLocationId);

  async function pushDirectorPrompt(event: string) {
    const store = useWorldStore.getState();
    const controls = {
      frame: getFrameMode(store.frameMode),
      location: getLocationPreset(store.selectedLocationId),
      view: getViewMode(store.viewMode),
    };
    const result = store.dataSnapshot
      ? dataToWorldPrompt(store.dataSnapshot, controls)
      : {
          mood: store.worldMood,
          prompt: getOpeningPrompt(controls),
          reason: `${controls.location.shortLabel} ${controls.view.label}/${controls.frame.label}: director pulse`,
        };

    try {
      store.setPrompt(result.prompt);
      store.setWorldMood(result.mood);
      store.setReason(result.reason);

      if (status === 'ready') {
        const prompt = store.reactorModel === 'lingbot' ? result.prompt.slice(0, 980) : result.prompt;
        await sendCommand('set_prompt', { prompt });
      }

      store.addLog(event, result.prompt, 'manual');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Director command failed';
      setReactorError(message);
      store.addLog('Director command failed', message, 'error');
    }
  }

  async function chooseLocation(locationId: typeof selectedLocationId) {
    const location = getLocationPreset(locationId);
    setLocation(locationId);
    setLocationOpen(false);
    await pushDirectorPrompt(`Location set: ${location.label}`);
  }

  async function chooseView(mode: ViewModeId) {
    const store = useWorldStore.getState();
    const nextModel: ReactorModel =
      mode === 'drone' ? 'lingbot' : store.reactorModel === 'lingbot' ? 'helios' : store.reactorModel;

    setViewMode(mode);

    if (nextModel !== store.reactorModel) {
      setReactorModel(nextModel);
      useWorldStore
        .getState()
        .addLog(
          `${MODEL_LABELS[nextModel]} requested`,
          mode === 'drone'
            ? 'Drone mode switched to LingBot for keyboard navigation.'
            : 'Returned to Helios for cinematic world rendering.',
          'system',
        );
      return;
    }

    await pushDirectorPrompt(`View mode: ${getViewMode(mode).label}`);
  }

  async function chooseFrame(mode: FrameModeId) {
    setFrameMode(mode);
    await pushDirectorPrompt(`Frame mode: ${getFrameMode(mode).label}`);
  }

  function chooseModel(model: ReactorModel) {
    if (model === reactorModel) return;

    if (model === 'lingbot') {
      setViewMode('drone');
    } else if (viewMode === 'drone') {
      setViewMode('cinematic');
    }

    setReactorModel(model);
    useWorldStore
      .getState()
      .addLog(
        `${MODEL_LABELS[model]} requested`,
        model === 'lingbot'
          ? 'LingBot cockpit will reboot with arrow-key pilot controls.'
          : 'Helios stream will reboot with director prompt scheduling.',
        'system',
      );
  }

  function toggleShowcase() {
    if (showcaseActive) {
      setShowcaseActive(false);
      setShowcaseCue(null);
      useWorldStore
        .getState()
        .addLog('Judge run stopped', 'Manual control returned to the operator.', 'system');
      return;
    }

    setShowcaseStep(0);
    setShowcaseCue({
      line: 'Locking the stream and preparing the stage sequence.',
      step: 0,
      title: 'Arming Showcase',
      total: 5,
    });
    setShowcaseActive(true);
    useWorldStore
      .getState()
      .addLog('Judge run armed', 'A five-beat GroundTruth pitch sequence is starting.', 'system');
  }

  function toggleAudio() {
    const nextEnabled = !audioEnabled;
    window.dispatchEvent(new CustomEvent('groundtruth:audio-arm'));
    setAudioEnabled(nextEnabled);
    useWorldStore
      .getState()
      .addLog(
        nextEnabled ? 'Soundscape online' : 'Soundscape muted',
        nextEnabled
          ? 'Adaptive ambience, data stingers, and drone engine audio are active.'
          : 'Audio director is muted.',
        'system',
      );
  }

  return (
    <>
      <header className="command-bar" aria-label="World controls">
        <div className="command-bar__brand">
          <span>GROUNDTRUTH</span>
          <small>{activeLocation.shortLabel}</small>
        </div>

        <div className="command-bar__slot command-bar__slot--location">
          <button
            aria-expanded={locationOpen}
            className="tool-button tool-button--wide"
            onClick={() => setLocationOpen((open) => !open)}
            title="Choose world location"
            type="button"
          >
            <Globe2 size={15} />
            {activeLocation.label}
          </button>
        </div>

        <div className="command-bar__group" aria-label="Camera mode">
          {VIEW_MODES.map((mode) => {
            const Icon = VIEW_ICONS[mode.id];
            return (
              <button
                className={`tool-button ${viewMode === mode.id ? 'tool-button--active' : ''}`}
                key={mode.id}
                onClick={() => void chooseView(mode.id)}
                title={`${mode.label} camera`}
                type="button"
              >
                <Icon size={15} />
                {mode.label}
              </button>
            );
          })}
        </div>

        <div className="command-bar__group" aria-label="Reactor model">
          <button
            className={`tool-button tool-button--model ${reactorModel === 'helios' ? 'tool-button--active' : ''}`}
            onClick={() => chooseModel('helios')}
            title="Use Helios world renderer"
            type="button"
          >
            <Sparkles size={15} />
            Helios
          </button>
          <button
            className={`tool-button tool-button--model ${reactorModel === 'lingbot' ? 'tool-button--active' : ''}`}
            onClick={() => chooseModel('lingbot')}
            title="Use LingBot pilot mode"
            type="button"
          >
            <Bot size={15} />
            LingBot
          </button>
        </div>

        <div className="command-bar__group" aria-label="World frame mode">
          {FRAME_MODES.map((mode) => {
            const Icon = FRAME_ICONS[mode.id];
            return (
              <button
                className={`tool-button ${frameMode === mode.id ? 'tool-button--active' : ''}`}
                key={mode.id}
                onClick={() => void chooseFrame(mode.id)}
                title={`${mode.label} frame`}
                type="button"
              >
                <Icon size={15} />
                {mode.label}
              </button>
            );
          })}
        </div>

        <button
          className="tool-button tool-button--pulse"
          onClick={() => void pushDirectorPrompt('Director pulse')}
          title="Push the current controls to Reactor"
          type="button"
        >
          {status === 'ready' ? <Sparkles size={15} /> : <Navigation size={15} />}
          Pulse
        </button>

        <button
          className={`tool-button tool-button--sound ${audioEnabled ? 'tool-button--active' : ''}`}
          onClick={toggleAudio}
          title={audioEnabled ? 'Mute soundscape' : 'Start soundscape'}
          type="button"
        >
          {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          Sound
        </button>

        <button
          className={`tool-button tool-button--showcase ${showcaseActive ? 'tool-button--active' : ''}`}
          onClick={toggleShowcase}
          title={showcaseActive ? 'Stop judge run' : 'Launch judge run'}
          type="button"
        >
          {showcaseActive ? <Square size={14} /> : <Clapperboard size={15} />}
          {showcaseActive ? 'Stop' : 'Run'}
        </button>
      </header>

      {locationOpen ? (
        <LocationPopover
          selectedLocationId={selectedLocationId}
          onChoose={(locationId) => void chooseLocation(locationId)}
        />
      ) : null}
    </>
  );
}

interface LocationPopoverProps {
  onChoose: (locationId: LocationId) => void;
  selectedLocationId: LocationId;
}

function LocationPopover({ onChoose, selectedLocationId }: LocationPopoverProps) {
  return (
    <div className="location-popover">
      <div className="location-popover__head">
        <Badge size={14} />
        <span>PLACE LAYER</span>
      </div>

      <div className="mini-globe" aria-label="Interactive location globe">
        <div className="mini-globe__grid" />
        {WORLD_LOCATIONS.map((location) => (
          <button
            aria-label={`Select ${location.label}`}
            className={`mini-globe__pin ${location.id === selectedLocationId ? 'mini-globe__pin--active' : ''}`}
            key={location.id}
            onClick={() => onChoose(location.id)}
            style={{ left: `${location.pin.x}%`, top: `${location.pin.y}%` }}
            title={location.label}
            type="button"
          >
            <span />
          </button>
        ))}
      </div>

      <div className="location-grid">
        {WORLD_LOCATIONS.map((location) => (
          <button
            className={`location-chip ${location.id === selectedLocationId ? 'location-chip--active' : ''}`}
            key={location.id}
            onClick={() => onChoose(location.id)}
            type="button"
          >
            <span>{location.shortLabel}</span>
            {location.label}
          </button>
        ))}
      </div>
    </div>
  );
}

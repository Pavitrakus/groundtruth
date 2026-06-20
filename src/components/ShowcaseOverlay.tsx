import { Square } from 'lucide-react';
import { useWorldStore } from '../store/worldStore';

export function ShowcaseOverlay() {
  const { showcaseActive, showcaseCue, setShowcaseActive, setShowcaseCue } = useWorldStore();

  if (!showcaseCue) return null;

  const progress = Math.round((showcaseCue.step / showcaseCue.total) * 100);

  function stopShowcase() {
    setShowcaseActive(false);
    setShowcaseCue(null);
    useWorldStore
      .getState()
      .addLog('Judge run stopped', 'Manual control returned to the operator.', 'system');
  }

  return (
    <aside className="showcase-overlay" aria-live="polite">
      <div className="showcase-overlay__head">
        <span>{showcaseCue.step.toString().padStart(2, '0')}</span>
        <strong>{showcaseCue.title}</strong>
        {showcaseActive ? (
          <button
            aria-label="Stop judge run"
            className="showcase-overlay__stop"
            onClick={stopShowcase}
            title="Stop judge run"
            type="button"
          >
            <Square size={11} />
          </button>
        ) : null}
      </div>
      <p>{showcaseCue.line}</p>
      <div className="showcase-overlay__meter" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
    </aside>
  );
}

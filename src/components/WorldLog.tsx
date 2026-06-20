import { TerminalSquare } from 'lucide-react';
import { useWorldStore } from '../store/worldStore';

export function WorldLog() {
  const worldLog = useWorldStore((state) => state.worldLog);

  return (
    <aside className="world-log">
      <div className="panel-title">
        <TerminalSquare size={14} />
        WORLD EVENTS
      </div>

      {worldLog.length === 0 ? (
        <p className="world-log__empty">No transforms yet.</p>
      ) : (
        <div className="world-log__list">
          {worldLog.map((entry, index) => (
            <article className={`world-log__entry world-log__entry--${entry.source}`} key={`${entry.time}-${index}`}>
              <time>{entry.time}</time>
              <p>{entry.event}</p>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}

import { useState } from 'react';
import { bandOf, fmt } from '../matcher.js';

const C = 2 * Math.PI * 54;

export default function Stage({ upView, people, primary, phase, progress, heat, heatUrl, setHeat, openFolder, pickFile, dropFile }) {
  const [drag, setDrag] = useState(false);
  const done = phase === 'done' && primary;
  const shown = done ? primary.person : people.length === 1 ? people[0] : null;
  const band = done ? bandOf(primary.score) : null;
  const pct = done ? primary.score : phase === 'scanning' ? progress : 0;
  return (
    <section className="stage">
      <div className={'slot' + (drag ? ' drag' : '') + (phase === 'scanning' ? ' scanning' : '')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); dropFile(e.dataTransfer.files[0]); }}>
        <h2>Upload latest image</h2>
        <button className="frame" onClick={pickFile}>
          {upView ? <img src={upView} alt="Uploaded" /> : <span>Click, drop or paste (Ctrl+V) an image</span>}
          {phase === 'scanning' && <i className="scan" />}
        </button>
      </div>

      <div className="vs" aria-live="polite">
        <svg viewBox="0 0 128 128" width="150" height="150" role="img" aria-label={done ? `Match ${fmt(primary.score)} percent` : 'Match score'}>
          <circle cx="64" cy="64" r="54" fill="var(--panel)" stroke="var(--track)" strokeWidth="12" />
          <circle cx="64" cy="64" r="54" fill="none" stroke={band ? band.color : 'var(--accent)'} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform="rotate(-90 64 64)" style={{ transition: 'stroke-dashoffset .6s' }} />
          <text x="64" y="74" textAnchor="middle" fontSize={done || phase === 'scanning' ? 28 : 34} fontWeight="800" fontFamily="Unbounded, sans-serif" fill="var(--ink)">
            {done ? `${fmt(primary.score)}%` : phase === 'scanning' ? `${Math.round(progress)}%` : 'VS'}
          </text>
        </svg>
        {band && <span className="badge" style={{ background: band.color }}>{band.name}</span>}
      </div>

      <div className="slot">
        <h2>Database image</h2>
        {shown ? (
          <div className="frame static">
            <img src={shown.url} alt={shown.name} />
            {heat && heatUrl && <img className="heat" src={heatUrl} alt="Difference heatmap" />}
            <span className="cap">{shown.name}</span>
          </div>
        ) : people.length > 1 ? (
          <div className="frame static mosaic">{people.map((p) => <img key={p.name} src={p.url} alt={p.name} title={p.name} />)}</div>
        ) : (
          <button className="frame open" onClick={openFolder}>
            <svg viewBox="0 0 64 52" width="84" height="68" aria-hidden="true"><path d="M4 8h20l6 7h30v31a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="var(--hi)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" /></svg>
            <strong>Open database folder</strong>
          </button>
        )}
        <div className="slotbar">
          {people.length > 0 && <button className="ghost" onClick={openFolder}>Open database folder ({people.length} loaded)</button>}
          {done && <button className={'ghost' + (heat ? ' on' : '')} onClick={() => setHeat(!heat)} aria-pressed={heat}>Difference heatmap</button>}
        </div>
      </div>
    </section>
  );
}

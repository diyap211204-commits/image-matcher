import { ALGO, BANDS, DEFAULT_WEIGHTS, bandOf, fmt } from '../matcher.js';

const TABS = [['analysis', 'Analysis'], ['edit', 'Edit lab'], ['algo', 'Algo'], ['history', 'History']];

export default function Inspector(p) {
  const { tab, setTab, results, primary, phase, edit, setEdit, weights, setWeights, history } = p;
  const done = phase === 'done' && primary;
  const counts = Object.fromEntries(BANDS.map((b) => [b.id, results.filter((r) => bandOf(r.score).id === b.id).length]));
  const wsum = ALGO.reduce((s, m) => s + weights[m.key], 0) || 1;
  const set = (k, v) => setEdit({ ...edit, [k]: v });
  let insight = '';
  if (done) {
    const sorted = [...ALGO].sort((a, b) => primary.parts[b.key] - primary.parts[a.key]);
    const note = {
      exact: 'Almost identical to the database image.',
      high: 'Probably the same picture after editing or resizing.',
      low: 'Visual similarity is limited, but this is the closest selected cricketer.',
      none: 'Weak visual similarity; showing the closest selected cricketer as a possible match.',
    }[bandOf(primary.score).id];
    insight = `${note} Strongest signal: ${sorted[0].label} (${primary.parts[sorted[0].key].toFixed(0)}%). Weakest: ${sorted[3].label} (${primary.parts[sorted[3].key].toFixed(0)}%).`;
  }

  return (
    <aside className="inspector">
      <div className="tabs" role="tablist">
        {TABS.map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>)}
      </div>

      {tab === 'analysis' && (
        <div className="pane">
          <h2>Image matching analysis</h2>
          <ul className="bands">
            {BANDS.map((b) => (
              <li key={b.id}>
                <button className={(done && bandOf(primary.score).id === b.id ? 'cur ' : '') + (p.bandFilter === b.id ? 'flt' : '')} style={{ '--c': b.color }}
                  onClick={() => p.setBandFilter(p.bandFilter === b.id ? null : b.id)} title="Click to filter the candidates">
                  <strong>{b.label}</strong><span>{b.name}</span><b>{results.length ? counts[b.id] : '-'}</b>
                </button>
              </li>
            ))}
          </ul>
          {done ? (
            <>
              <h3>Possible match: {primary.person.name} <small>{primary.person.team}</small></h3>
              <p className="sub">Closest selected player by image similarity. Different photos of the same player can score low; this does not verify identity.</p>
              {ALGO.map((m) => (
                <div key={m.key} className="metric" title={m.hint}>
                  <span>{m.label}</span><div className="track"><i style={{ width: `${primary.parts[m.key]}%` }} /></div><b>{primary.parts[m.key].toFixed(0)}%</b>
                </div>
              ))}
              <p className="insight">{insight}</p>
              <div className="acts">
                <button onClick={p.downloadCard}>Download match card (PNG)</button>
                <button className="ghost" onClick={p.downloadJson}>Report (JSON)</button>
              </div>
            </>
          ) : <p className="sub">{p.upload ? (p.chosenCount ? 'Matching...' : 'Open the database folder to start matching.') : 'Open the database folder, then upload the latest image to see the report.'}</p>}
        </div>
      )}

      {tab === 'edit' && (
        <div className="pane">
          <h2>Edit lab</h2>
          <p className="sub">Change the uploaded image and watch the score move. It shows how robust the match is.</p>
          {!p.upload ? <p className="sub">Upload an image first.</p> : (
            <>
              {[['bright', 'Brightness', 40, 180], ['contrast', 'Contrast', 40, 180]].map(([k, l, a, b]) => (
                <label key={k} className="wrow"><span>{l}</span><input type="range" min={a} max={b} value={edit[k]} onChange={(e) => set(k, +e.target.value)} /><b>{edit[k]}%</b></label>
              ))}
              <div className="acts">
                <button className={'ghost' + (edit.gray ? ' on' : '')} onClick={() => set('gray', !edit.gray)} aria-pressed={edit.gray}>Grayscale</button>
                <button className={'ghost' + (edit.flip ? ' on' : '')} onClick={() => set('flip', !edit.flip)} aria-pressed={edit.flip}>Mirror</button>
                <button className="ghost" onClick={() => set('rot', (edit.rot + 270) % 360)}>Rotate left</button>
                <button className="ghost" onClick={() => set('rot', (edit.rot + 90) % 360)}>Rotate right</button>
                <button className="link" onClick={p.resetEdit}>Reset edits</button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'algo' && (
        <div className="pane">
          <h2>Matching algo</h2>
          <p className="sub">Both images are centre-cropped to a square and compared on four fingerprints. Change how much each one counts. The ranking updates live.</p>
          {ALGO.map((m) => (
            <label key={m.key} className="wrow" title={m.hint}>
              <span>{m.label}</span>
              <input type="range" min="0" max="100" value={weights[m.key]} onChange={(e) => setWeights({ ...weights, [m.key]: +e.target.value })} />
              <b>{Math.round((weights[m.key] / wsum) * 100)}%</b>
            </label>
          ))}
          <button className="link" onClick={() => setWeights(DEFAULT_WEIGHTS)}>Reset weights</button>
        </div>
      )}

      {tab === 'history' && (
        <div className="pane">
          <h2>History</h2>
          {history.length === 0 ? <p className="sub">No searches yet.</p> : (
            <ul className="hist">
              {history.map((h) => (
                <li key={h.id}>
                  <button onClick={() => p.openHistory(h)}>
                    <img src={h.url} alt="" width="44" height="44" />
                    <span className="nm">{h.name}<small>{h.best.name} · {h.at}</small></span>
                    <b style={{ color: bandOf(h.best.score).color }}>{fmt(h.best.score)}%</b>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}

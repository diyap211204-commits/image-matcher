import { bandOf, fmt } from '../matcher.js';

// Horizontal film strip of all compared database images, best match first
export default function Strip({ results, primary, setFocus, minPct, setMinPct, bandFilter }) {
  const list = results.filter((r) => r.score >= minPct && (!bandFilter || bandOf(r.score).id === bandFilter));
  return (
    <section className="strip">
      <div className="sh">
        <h2>Candidates <small>{list.length} of {results.length}</small></h2>
        <label className="slide">Minimum score <b>{minPct}%</b><input type="range" min="0" max="100" value={minPct} onChange={(e) => setMinPct(+e.target.value)} /></label>
      </div>
      <ol>
        {list.length === 0 && <li className="none">No candidate in this range.</li>}
        {list.map((r) => {
          const b = bandOf(r.score);
          return (
            <li key={r.person.name}>
              <button className={primary && r.person.name === primary.person.name ? 'sel' : ''} onClick={() => setFocus(r.person.name)} style={{ '--c': b.color }}>
                <img src={r.person.url} alt="" />
                <b>{fmt(r.score)}%</b>
                <span>{r.person.name}</span>
                <i style={{ width: `${r.score}%` }} />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

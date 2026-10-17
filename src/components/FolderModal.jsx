import { useEffect, useRef, useState } from 'react';

// File-explorer style window listing everything in public/database
export default function FolderModal({ db, chosen, onApply, onClose }) {
  const [draft, setDraft] = useState(new Set(chosen));
  const [q, setQ] = useState('');
  const [role, setRole] = useState('All');
  const [sort, setSort] = useState('name');
  const [view, setView] = useState('grid');
  const search = useRef(null);

  useEffect(() => {
    search.current?.focus();
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const roles = ['All', ...new Set(db.map((p) => p.role))];
  const shown = db
    .filter((p) => (role === 'All' || p.role === role) && `${p.name} ${p.team} ${p.file}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (sort === 'team' ? a.team.localeCompare(b.team) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)));
  const toggle = (n) => setDraft((d) => { const x = new Set(d); x.has(n) ? x.delete(n) : x.add(n); return x; });

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="win" role="dialog" aria-modal="true" aria-label="Database folder">
        <div className="titlebar">
          <span className="lights"><i /><i /><i /></span>
          <span className="path">database / cricketers <small>{db.length} items</small></span>
          <button className="icon" onClick={onClose} aria-label="Close">Close</button>
        </div>
        <div className="toolbar">
          <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search person, team or file name" aria-label="Search database" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="name">Sort: name</option><option value="team">Sort: team</option>
          </select>
          <div className="seg2">
            <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}>Grid</button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
          </div>
        </div>
        <div className="chips">
          {roles.map((r) => <button key={r} className={'chipb' + (role === r ? ' on' : '')} onClick={() => setRole(r)}>{r}</button>)}
          <span className="sp" />
          <button className="link" onClick={() => setDraft((d) => new Set([...d, ...shown.map((p) => p.name)]))}>Select shown</button>
          <button className="link" onClick={() => setDraft(new Set())}>Clear</button>
        </div>
        <div className={'files ' + view}>
          {shown.length === 0 && <p className="empty">No file matches your search.</p>}
          {shown.map((p) => (
            <button key={p.name} className={'tile' + (draft.has(p.name) ? ' on' : '')} onClick={() => toggle(p.name)} onDoubleClick={() => onApply([p.name])} title="Click to select, double-click to use only this image">
              <img src={p.url} alt={p.name} loading="lazy" />
              <span className="tick" aria-hidden="true">{draft.has(p.name) ? '✓' : ''}</span>
              <span className="meta"><b>{p.name}</b><small>{p.team} · {p.role}</small><small className="fn">{p.file}</small></span>
            </button>
          ))}
        </div>
        <div className="foot">
          <span>{draft.size} of {db.length} selected</span>
          <span className="sp" />
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button disabled={!draft.size} onClick={() => onApply([...draft])}>Load {draft.size || ''} image{draft.size === 1 ? '' : 's'}</button>
        </div>
      </div>
    </div>
  );
}

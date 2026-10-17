import { useEffect, useMemo, useRef, useState } from 'react';
import FolderModal from './components/FolderModal.jsx';
import Stage from './components/Stage.jsx';
import Strip from './components/Strip.jsx';
import Inspector from './components/Inspector.jsx';
import { DEFAULT_WEIGHTS, applyEdit, bandOf, compareParts, diffMap, features, loadImage, scoreFrom } from './matcher.js';
import { downloadCard } from './reportCard.js';

const BASE = import.meta.env.BASE_URL;
const NO_EDIT = { bright: 100, contrast: 100, gray: false, rot: 0, flip: false };
const SCAN_MS = 1400;
const RAIL = [
  ['folder', 'Folder', 'Open database folder (O)', 'M3 6h6l2 2h10v11H3z'],
  ['upload', 'Upload', 'Upload latest image (U)', 'M12 16V5m0 0-4 4m4-4 4 4M4 19h16'],
  ['analysis', 'Report', 'Analysis', 'M5 19V9m7 10V5m7 14v-7'],
  ['edit', 'Edit', 'Edit lab', 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3'],
  ['algo', 'Algo', 'Matching algo', 'M4 7h10m4 0h2M4 17h2m4 0h10M14 4v6M6 14v6'],
  ['history', 'History', 'History', 'M12 7v5l3 2M4 12a8 8 0 1 0 3-6.2M4 4v4h4'],
];

export default function App() {
  const [db, setDb] = useState([]);
  const [chosen, setChosen] = useState([]);
  const [folderOpen, setFolderOpen] = useState(false);
  const [upload, setUpload] = useState(null);
  const [edit, setEdit] = useState(NO_EDIT);
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [tab, setTab] = useState('analysis');
  const [focus, setFocus] = useState(null);
  const [minPct, setMinPct] = useState(0);
  const [bandFilter, setBandFilter] = useState(null);
  const [heat, setHeat] = useState(false);
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState('');
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('im-theme') || 'light'; } catch { return 'light'; } });
  const fileRef = useRef(null), logged = useRef(null);

  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('im-theme', theme); } catch { /* ignore */ } }, [theme]);

  useEffect(() => {
    (async () => {
      try {
        const list = await (await fetch(`${BASE}database/manifest.json`)).json();
        setDb(await Promise.all(list.map(async (p) => {
          const url = `${BASE}database/${p.file}`, img = await loadImage(url);
          return { ...p, url, img, feat: features(img) };
        })));
      } catch { setMsg('Could not read the database folder (public/database).'); }
    })();
  }, []);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) { setMsg('Please choose an image file.'); return; }
    try {
      const url = URL.createObjectURL(file), img = await loadImage(url);
      setUpload({ id: Date.now(), name: file.name, url, img, w: img.naturalWidth, h: img.naturalHeight, at: new Date().toLocaleTimeString() });
      setEdit(NO_EDIT); setFocus(null); setHeat(false); setMsg('');
    } catch { setMsg('That image could not be read.'); }
  };

  // Edit lab output: edited canvas, its preview and its fingerprints
  const edited = useMemo(() => (upload ? applyEdit(upload.img, edit) : null), [upload, edit]);
  const upView = useMemo(() => (edited ? edited.toDataURL('image/jpeg', 0.92) : null), [edited]);
  const upFeat = useMemo(() => (edited ? features(edited) : null), [edited]);

  const people = useMemo(() => db.filter((p) => chosen.includes(p.name)), [db, chosen]);
  const partsList = useMemo(() => (upFeat ? people.map((person) => ({ person, parts: compareParts(upFeat, person.feat) })) : []), [upFeat, people]);
  const results = useMemo(() => partsList.map((x) => ({ ...x, score: scoreFrom(x.parts, weights) })).sort((a, b) => b.score - a.score), [partsList, weights]);
  const primary = results.find((r) => r.person.name === focus) || results[0];
  const heatUrl = useMemo(() => (heat && edited && primary ? diffMap(edited, primary.person.img) : null), [heat, edited, primary]);

  useEffect(() => {
    if (!upload || !people.length) { setPhase('idle'); return; }
    setPhase('scanning'); setProgress(0);
    const t0 = performance.now();
    const id = setInterval(() => {
      const pr = Math.min(100, ((performance.now() - t0) / SCAN_MS) * 100);
      setProgress(pr);
      if (pr >= 100) { clearInterval(id); setPhase('done'); }
    }, 40);
    return () => clearInterval(id);
  }, [upload && upload.id, people]);

  useEffect(() => {
    if (phase !== 'done' || !results.length || !upload) return;
    const key = upload.id + ':' + people.length;
    if (logged.current === key) return;
    logged.current = key;
    const e = { id: upload.id, name: upload.name, url: upload.url, at: upload.at, upload, best: { name: results[0].person.name, score: results[0].score } };
    setHistory((h) => [e, ...h.filter((x) => x.id !== e.id)].slice(0, 8));
  }, [phase]);

  const loadSample = async (file, label) => {
    try {
      const blob = await (await fetch(`${BASE}samples/${file}`)).blob();
      await handleFile(new File([blob], label, { type: blob.type || 'image/png' }));
    } catch { setMsg('Could not load the sample image.'); }
  };
  const openFolder = () => setFolderOpen(true);
  const pickFile = () => fileRef.current.click();
  const apply = (names) => { setChosen(names); setFolderOpen(false); setFocus(null); setBandFilter(null); setTab('analysis'); };
  const cycle = (d) => { if (!results.length) return; const i = Math.max(0, results.indexOf(primary)); setFocus(results[(i + d + results.length) % results.length].person.name); };

  useEffect(() => {
    const onPaste = (e) => { const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/')); if (f) handleFile(f); };
    const onKey = (e) => {
      if (folderOpen || /input|select|textarea/i.test(e.target.tagName) || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (k === 'o') openFolder(); else if (k === 'u') pickFile(); else if (k === 'h') setHeat((v) => !v);
      else if (k === 'arrowright') cycle(1); else if (k === 'arrowleft') cycle(-1);
    };
    window.addEventListener('paste', onPaste); window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('paste', onPaste); window.removeEventListener('keydown', onKey); };
  });

  const downloadJson = () => {
    const data = { generatedAt: upload.at, uploaded: { name: upload.name, width: upload.w, height: upload.h }, edit, weights, compared: results.length,
      result: { person: primary.person.name, score: +primary.score.toFixed(1), band: bandOf(primary.score).name, parts: primary.parts },
      ranking: results.map((r) => ({ person: r.person.name, team: r.person.team, score: +r.score.toFixed(1), band: bandOf(r.score).name })) };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'matching-report.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  const card = () => downloadCard({ edited, person: primary.person, score: primary.score, band: bandOf(primary.score), parts: primary.parts, name: upload.name });
  const act = (id) => { if (id === 'folder') openFolder(); else if (id === 'upload') pickFile(); else setTab(id); };

  return (
    <div className="shell">
      <nav className="rail" aria-label="Tools">
        <div className="logo" aria-hidden="true"><i /><i /></div>
        {RAIL.map(([id, label, tip, d]) => (
          <button key={id} title={tip} onClick={() => act(id)} className={tab === id ? 'on' : ''}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
            <span>{label}</span>
          </button>
        ))}
        <button className="theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Switch theme"><span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button>
      </nav>

      <main>
        <header>
          <h1>Image Matching Software</h1>
          <div className="samples">
            <small>Try a sample:</small>
            <button className="ghost sm" onClick={() => loadSample('sample-edited-kohli.jpg', 'sample-edited-kohli.jpg')}>Edited Kohli</button>
            <button className="ghost sm" onClick={() => loadSample('sample-exact-dhoni.png', 'sample-exact-dhoni.png')}>Exact Dhoni</button>
            <button className="ghost sm" onClick={() => loadSample('sample-unrelated.png', 'sample-unrelated.png')}>Unrelated</button>
          </div>
        </header>
        {msg && <div className="msg" role="status">{msg}</div>}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />
        <Stage upView={upView} people={people} primary={primary} phase={phase} progress={progress} heat={heat} heatUrl={heatUrl} setHeat={setHeat}
          openFolder={openFolder} pickFile={pickFile} dropFile={handleFile} />
        {results.length > 0 && phase === 'done'
          ? <Strip results={results} primary={primary} setFocus={setFocus} minPct={minPct} setMinPct={setMinPct} bandFilter={bandFilter} />
          : <section className="strip hint"><h2>Candidates</h2><p>{!people.length ? 'Step 1: open the database folder and load images.' : !upload ? 'Step 2: upload the latest image.' : 'Matching...'}</p></section>}
      </main>

      <Inspector tab={tab} setTab={setTab} results={results} primary={primary} phase={phase} upload={upload} chosenCount={people.length}
        edit={edit} setEdit={setEdit} resetEdit={() => setEdit(NO_EDIT)} weights={weights} setWeights={setWeights} history={history}
        bandFilter={bandFilter} setBandFilter={setBandFilter} downloadCard={card} downloadJson={downloadJson}
        openHistory={(h) => { setUpload(h.upload); setEdit(NO_EDIT); setFocus(null); setHeat(false); setTab('analysis'); }} />

      {folderOpen && <FolderModal db={db} chosen={chosen} onApply={apply} onClose={() => setFolderOpen(false)} />}
    </div>
  );
}

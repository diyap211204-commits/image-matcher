// Downloads a lead photo for each person in public/database/manifest.json from Wikipedia / Wikimedia Commons
// and updates the manifest. Run on your own computer (needs internet and Node 18+):  npm run photos
import { readFile, writeFile, unlink } from 'node:fs/promises';

const DIR = 'public/database';
const TITLES = {
  'Virat Kohli': 'Virat_Kohli', 'MS Dhoni': 'MS_Dhoni', 'Rohit Sharma': 'Rohit_Sharma', 'Sachin Tendulkar': 'Sachin_Tendulkar',
  'Jasprit Bumrah': 'Jasprit_Bumrah', 'Steve Smith': 'Steve_Smith_(cricketer)', 'Joe Root': 'Joe_Root', 'Kane Williamson': 'Kane_Williamson',
  'Babar Azam': 'Babar_Azam', 'AB de Villiers': 'AB_de_Villiers', 'Hardik Pandya': 'Hardik_Pandya', 'KL Rahul': 'KL_Rahul',
  'Ravindra Jadeja': 'Ravindra_Jadeja', 'Ben Stokes': 'Ben_Stokes', 'Rashid Khan': 'Rashid_Khan_(cricketer)',
};
const headers = { 'User-Agent': 'image-matcher-demo/1.0 (local learning project)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const manifest = JSON.parse(await readFile(`${DIR}/manifest.json`, 'utf8'));
const credits = [
  '# Photo credits',
  '',
  'Photos come from Wikipedia / Wikimedia Commons. Licences differ per photo: open each page, click the photo and check the licence and attribution before sharing or publishing.',
  '',
  ...manifest.map((p) => `- ${p.name}: https://en.wikipedia.org/wiki/${TITLES[p.name]}`),
];
let ok = 0;

for (const p of manifest) {
  try {
    const title = TITLES[p.name];
    const api = `https://en.wikipedia.org/w/api.php?action=query&redirects=1&format=json&titles=${title}&prop=pageimages|info&piprop=thumbnail&pithumbsize=800&inprop=url`;
    const q = await (await fetch(api, { headers })).json();
    const page = Object.values(q.query.pages)[0];
    const src = page.thumbnail?.source;
    if (!src) throw new Error('no lead photo on the page');
    const res = await fetch(src, { headers });
    if (!res.ok) throw new Error(`download failed (${res.status})`);
    const type = res.headers.get('content-type') || '';
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const file = `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${ext}`;
    await writeFile(`${DIR}/${file}`, Buffer.from(await res.arrayBuffer()));
    if (p.file && p.file !== file) await unlink(`${DIR}/${p.file}`).catch(() => {}); // remove the old placeholder
    p.file = file; ok++;
    console.log('saved', file);
  } catch (e) { console.log('skipped', p.name, '-', e.message); }
  await sleep(400);
}
await writeFile(`${DIR}/manifest.json`, JSON.stringify(manifest, null, 2));
await writeFile(`${DIR}/CREDITS.md`, credits.join('\n') + '\n');
console.log(`Done: ${ok} of ${manifest.length} photos downloaded.`);

# Image Matching Software (React + Vite)

```
npm install
npm run dev
npm run photos   # optional: download real photos for the 15 people (needs internet, Node 18+)
```

## Flow
1. **Open database folder** (15 cricketer images): pick all or some, like a file explorer.
2. **Upload latest image** (click, drag and drop, or Ctrl+V).
3. Read the result on the match stage, in the candidates strip and in the right-hand inspector.

## Features
- Head-to-head stage with a live score ring and matching animation
- Difference heatmap: shows where the uploaded image differs from the database image
- Edit lab: brightness, contrast, grayscale, mirror, rotate. The score updates live, so you can test how robust a match is
- Match card: download a shareable PNG. Also JSON report
- Analysis panel with similarity score bands and the closest selected cricketer shown as a possible match (click a band to filter), plus an auto-written insight
- Candidates film strip with minimum-score slider, matching algo weight sliders, session history, light and dark theme
- Keyboard: O open folder, U upload, H heatmap, left/right arrows cycle candidates

## Database folder
`public/database/` holds real cricketer photos and `manifest.json` (`name`, `team`, `role`, `file`). Open the database folder in the app to browse and select them. The photos come from Wikipedia / Wikimedia; check each licence in `CREDITS.md` before sharing or publishing.

## Matching (src/matcher.js)
Centre-cropped square, then dHash, aHash, colour histogram and pixel structure (default weights 30/10/35/25).
Bands: 97+ = 100%, 85+ = 80%, 60+ = 20%, below 60 = possible match with weak visual similarity. The app ranks image appearance; it does not verify a player's identity, so a different photo of the same cricketer can score low. The Edit lab uses canvas filters, which Safari may ignore.

## Troubleshooting
- **Blank white page**: open the browser Console (F12). The app now also shows the error on screen.
- **Page has no styling**: `src/main.jsx` must contain `import './styles.css';`. Keep the folder layout exactly as in this zip (`main.jsx`, `App.jsx`, `matcher.js`, `reportCard.js`, `styles.css` in `src/`; the four components in `src/components/`).
- **Always run from the project folder**: `cd image-matcher`, then `npm install` and `npm run dev`. After replacing files, stop the server (Ctrl+C), run `npm run dev` again and hard refresh (Ctrl+Shift+R).
- **"Face AI: loading model..."**: that text is not part of this version. If you still see it, the browser is showing an older copy of the project. Use the files from this zip only.
- **Samples**: the "Try a sample" buttons in the header load the files in `public/samples/`. Open the database folder first, then pick a sample.

## Real photos of all 15 cricketers
Run this once on your own computer (needs internet, Node 18+):
```
npm run photos
```
It downloads the current main photo of each player from their Wikipedia page (800px wide), replaces the placeholders and updates `manifest.json`. Run it again any time to refresh. Then restart `npm run dev`.
To use your own photo for someone, put the file in `public/database/` and set its name in the `file` field of `manifest.json`.

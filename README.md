# GearCalc — Gear & RPM

Speed in every gear at any RPM, RPM at any speed, top speed at redline, the RPM drop on each shift, and a sawtooth chart. The page is static and opens straight from `index.html`, including file:// with a double-click. It uses no modules, no network requests, no CDN and no tracking.

## Files
- `index.html`: the page
- `css/app.css`: Obsidian theme, same look as Unit Converter
- `js/presets.js`: published gear-ratio sets, each with a cited source, plus the list of sets left out and why
- `js/gear.js`: the math and the tire-size parser (`GearLib`)
- `js/app.js`: the UI and the SVG chart (no libraries)
- `tests/gearcalc-test.js`: run with `node tests/gearcalc-test.js`

## Math
- mph = RPM × D × π ÷ (gear × FD × 1056) × (1 − slip). The 1056 is 63 360 in/mi ÷ 60 min/h, both exact.
- RPM at speed = mph × gear × FD × 1056 ÷ (π × D) ÷ (1 − slip).
- Landing RPM = redline × next ÷ current.
- Metric tire diameter: D = rim + 2 × section × aspect ÷ 100 ÷ 25.4.
- Flotation tire diameter: D = the first number.
- Revs per mile = 63 360 ÷ (π × D).
- D defaults to the **unloaded** diameter. You can enter a rolling factor (0.80–1.05) or a loaded radius instead. No default factor is assumed.

Created by Jorge Guerra

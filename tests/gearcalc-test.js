/* GearCalc tests — run: node tests/gearcalc-test.js  (Created by Jorge Guerra) */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var root = path.join(__dirname, '..');
// Load the shipped browser files exactly as the page does (plain scripts, window global).
var ctx = { window: {} }; ctx.window.window = ctx.window; vm.createContext(ctx);
['js/presets.js', 'js/gear.js'].forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); });
var G = ctx.window.GearLib, PD = ctx.window.GEAR_PRESETS;

var pass = 0, fail = 0, groups = {};
function ok(group, cond, msg) { groups[group] = groups[group] || [0, 0]; if (cond) { pass++; groups[group][0]++; } else { fail++; groups[group][1]++; console.log('FAIL [' + group + '] ' + msg); } }
function near(group, a, b, tol, msg) { ok(group, Math.abs(a - b) <= tol, msg + ' — got ' + a + ', want ' + b + ' ±' + tol); }
function rel(group, a, b, r, msg) { ok(group, Math.abs(a - b) <= Math.abs(b) * r, msg + ' — got ' + a + ', want ' + b + ' (rel ' + r + ')'); }
function throws(group, fn, msg) { var t = false; try { fn(); } catch (e) { t = true; } ok(group, t, msg + ' — expected throw'); }

// ---------------------------------------------------------------- constants
ok('constants', G.K === 1056, 'K = 63360/60 = 1056');
ok('constants', G.IN_PER_MILE === 63360, '63360 in/mi');
ok('constants', G.MM_PER_IN === 25.4 && G.KM_PER_MI === 1.609344, 'exact inch and mile');

// ---------------------------------------------------------------- tire parser: required values
var t = G.parseTire('315/35R17');
ok('tire', t.ok && t.kind === 'metric', '315/35R17 parses as metric');
near('tire', t.diameter, 25.68, 0.005, '315/35R17 diameter = 25.68 in');
near('tire', t.diameter, 17 + 2 * 315 * 0.35 / 25.4, 1e-12, '315/35R17 = rim + 2·sec·asp/25.4');
t = G.parseTire('28x10.5R15');
ok('tire', t.ok && t.kind === 'flotation' && t.diameter === 28 && t.widthIn === 10.5 && t.rim === 15, '28x10.5R15 = 28 in');
t = G.parseTire('28x10.50R15LT'); ok('tire', t.ok && t.diameter === 28 && t.label === '28x10.50R15', '28x10.50R15LT = 28 in, label keeps 10.50');
t = G.parseTire('33x12.50R20LT'); ok('tire', t.ok && t.diameter === 33, '33x12.50R20LT');
t = G.parseTire('35x12.50-15'); ok('tire', t.ok && t.diameter === 35, '35x12.50-15 (bias style)');

// metric edge cases (independent recompute)
var metricCases = [
  ['P245/45R18', 245, 45, 18, 'P'], ['p245/45zr18', 245, 45, 18, 'P'], ['P245/45ZR18 96Y', 245, 45, 18, 'P'],
  ['LT285/70R17', 285, 70, 17, 'LT'], ['LT285/70R17 121/118S', 285, 70, 17, 'LT'], ['275/40ZR18 XL', 275, 40, 18, ''],
  ['255 / 40 R 19', 255, 40, 19, ''], ['205/55-16', 205, 55, 16, ''], ['195/65R15 91H', 195, 65, 15, ''],
  ['335/30ZR20', 335, 30, 20, ''], ['ST225/75R15', 225, 75, 15, 'ST'], ['T155/70R17', 155, 70, 17, 'T'], ['305/45R22LT', 305, 45, 22, '']
];
metricCases.forEach(function (c) {
  var r = G.parseTire(c[0]);
  ok('tire', r.ok && r.kind === 'metric', c[0] + ' parses');
  if (r.ok) { near('tire', r.diameter, c[3] + 2 * c[1] * c[2] / 100 / 25.4, 1e-9, c[0] + ' diameter'); ok('tire', r.prefix === c[4], c[0] + ' prefix ' + c[4]); }
});
near('tire', G.parseTire('LT285/70R17').diameter, 32.7087, 0.0001, 'LT285/70R17 = 32.709 in');
// direct diameters
[['26', 26], ['26.0 in', 26], ['26"', 26], ['26.5in', 26.5], ['26 inches', 26], ['660 mm', 660 / 25.4], ['660mm', 660 / 25.4], ['  27.3  ', 27.3]].forEach(function (c) {
  var r = G.parseTire(c[0]); ok('tire', r.ok && r.kind === 'diameter', JSON.stringify(c[0]) + ' parses as diameter'); if (r.ok) near('tire', r.diameter, c[1], 1e-12, c[0] + ' value');
});
// rejects
['', '   ', 'abc', '315/35', '315/35R', 'R17', '315/15R17', '315/99R17', '090/35R17', '500/35R17', '315/35R8', '315/35R34',
 '28x10.5R30', '16x10.5R15', '70x10.5R15', '28x3R15', '28x30R15', '5', '9.9 in', '61 in', '200 mm', '2000 mm', '-26', '26 ft', '315/35R17/18', null, undefined
].forEach(function (s) { var r = G.parseTire(s); ok('reject', r.ok === false && typeof r.error === 'string' && r.error.length > 0, 'rejects ' + JSON.stringify(s)); });

// ---------------------------------------------------------------- revs per mile
[20, 24, 25.68, 26, 28, 31.5, 35, 40].forEach(function (d) {
  var indep = 5280 * 12 / (d * 3.141592653589793);
  near('revs', G.revsPerMile(d), indep, 1e-9, 'revs/mile at ' + d + ' in');
});
near('revs', G.revsPerMile(26), 775.697, 0.001, 'revs/mile(26) = 775.697');
// revs/mile ties to mph: 1 mile / (revs/mile) per wheel rev
near('revs', G.mph(G.revsPerMile(26) * 3.42 * 0.62 / 60, 26, 0.62, 3.42, 0), 1, 1e-12, 'revs/mile × overall ÷ 60 rpm = 1 mph');

// ---------------------------------------------------------------- worked example
var ex = G.mph(3500, 26, 0.62, 3.42, 0);
near('example', ex, 3500 * 26 * Math.PI / (0.62 * 3.42 * 1056), 1e-12, '3500 rpm, 0.62, 3.42, 26 in formula');
near('example', ex, 127.676, 0.001, 'worked example = 127.676 mph');
near('example', ex, 3500 * 26 / (0.62 * 3.42 * (1056 / Math.PI)), 1e-9, '1056/π = 336.135 form');
near('example', 1056 / Math.PI, 336.135, 0.0005, '1056/π ≈ 336.135');
rel('example', ex, 3500 * 26 / (0.62 * 3.42 * 336), 0.0005, 'classic 336 constant within 0.05%');
// independent unit chain: wheel rpm → in/min → mi/h
var wheelRpm = 3500 / (0.62 * 3.42), inPerMin = wheelRpm * Math.PI * 26, mphChain = inPerMin * 60 / 63360;
near('example', ex, mphChain, 1e-9, 'unit chain matches');
near('example', G.toKmh(ex), ex * 1.609344, 1e-12, 'km/h exact factor');

// ---------------------------------------------------------------- round trips
var grid = [[1000, 24, 2.66, 3.73], [3000, 25.68, 1.00, 3.42], [6500, 28, 0.63, 4.10], [8000, 31.5, 4.696, 3.15], [5200, 35, 0.5, 2.73]];
grid.forEach(function (g) {
  [0, 2.5, 7, 15].forEach(function (s) {
    var v = G.mph(g[0], g[1], g[2], g[3], s);
    near('roundtrip', G.rpmAt(v, g[1], g[2], g[3], s), g[0], 1e-8, 'rpm→mph→rpm ' + g.join(',') + ' slip ' + s);
    near('roundtrip', G.mph(G.rpmAt(60, g[1], g[2], g[3], s), g[1], g[2], g[3], s), 60, 1e-10, 'mph→rpm→mph ' + g.join(',') + ' slip ' + s);
  });
});
[0, 1, 60, 100, 200.5].forEach(function (m) { near('roundtrip', G.toMph(G.toKmh(m)), m, 1e-12, 'mph↔km/h ' + m); });
near('roundtrip', G.toKmh(100), 160.9344, 1e-12, '100 mph = 160.9344 km/h');

// ---------------------------------------------------------------- slip
near('slip', G.mph(3500, 26, 0.62, 3.42, 10), ex * 0.9, 1e-10, '10% slip → 90% speed');
near('slip', G.rpmAt(60, 26, 1, 3.42, 10), G.rpmAt(60, 26, 1, 3.42, 0) / 0.9, 1e-9, '10% slip → RPM ÷ 0.9');
ok('slip', G.mph(3500, 26, 1, 3.42, 0) === G.mph(3500, 26, 1, 3.42), 'missing slip = 0');
ok('slip', G.mph(3500, 26, 1, 3.42, 5) < G.mph(3500, 26, 1, 3.42, 0), 'slip reduces speed');
ok('slip', G.rpmAt(60, 26, 1, 3.42, 5) > G.rpmAt(60, 26, 1, 3.42, 0), 'slip raises RPM at speed');
throws('slip', function () { G.mph(3000, 26, 1, 3.42, -1); }, 'negative slip');
throws('slip', function () { G.mph(3000, 26, 1, 3.42, 100); }, '100% slip');
throws('slip', function () { G.rpmAt(60, 26, 1, 3.42, 150); }, '150% slip');

// ---------------------------------------------------------------- shift drop
near('drop', G.dropRpm(6500, 2.66, 1.78), 6500 * 1.78 / 2.66, 1e-12, 'landing = redline × next/current');
near('drop', G.dropRpm(6000, 2.0, 1.0), 3000, 1e-12, '2:1 step lands at half redline');
var tb = G.table({ ratios: [2.66, 1.78, 1.30, 1.00, 0.80, 0.63], dia: 25.68, fd: 3.42, slip: 0, redline: 6500, rpm: 3000, speed: 60 });
ok('drop', tb.length === 6 && tb[5].landRpm === null && tb[5].drop === null, 'last gear has no shift');
tb.slice(0, 5).forEach(function (r, i) {
  var nx = tb[i + 1];
  near('drop', r.landRpm + r.drop, 6500, 1e-9, 'landing + drop = redline, gear ' + r.gear);
  // continuity: speed at redline in gear i equals speed at landing rpm in gear i+1
  near('drop', G.mph(r.landRpm, 25.68, nx.ratio, 3.42, 0), r.topMph, 1e-9, 'speed continuous across shift ' + r.gear + '→' + nx.gear);
  near('drop', r.step, r.ratio / nx.ratio, 1e-12, 'step ratio ' + r.gear);
});
tb.forEach(function (r) {
  near('table', r.overall, r.ratio * 3.42, 1e-12, 'overall ' + r.gear);
  near('table', r.topMph, G.mph(6500, 25.68, r.ratio, 3.42, 0), 1e-12, 'top ' + r.gear);
  near('table', r.mphAtRpm, G.mph(3000, 25.68, r.ratio, 3.42, 0), 1e-12, 'mph@rpm ' + r.gear);
  near('table', r.rpmAtSpeed, G.rpmAt(60, 25.68, r.ratio, 3.42, 0), 1e-9, 'rpm@speed ' + r.gear);
});

// ---------------------------------------------------------------- effective diameter
ok('rolling', G.effectiveDiameter(26, 'unloaded') === 26, 'unloaded passes through');
near('rolling', G.effectiveDiameter(26, 'factor', 0.97), 25.22, 1e-12, 'factor 0.97');
ok('rolling', G.effectiveDiameter(26, 'loaded', 12.4) === 24.8, 'loaded = 2 × radius');
throws('rolling', function () { G.effectiveDiameter(26, 'factor', 0.5); }, 'factor 0.5');
throws('rolling', function () { G.effectiveDiameter(26, 'factor', 1.2); }, 'factor 1.2');
throws('rolling', function () { G.effectiveDiameter(26, 'factor', NaN); }, 'factor NaN');
throws('rolling', function () { G.effectiveDiameter(26, 'loaded', 3); }, 'loaded radius 3');
throws('rolling', function () { G.effectiveDiameter(26, 'loaded', 14); }, 'loaded radius above half diameter');

// ---------------------------------------------------------------- ratio validation
ok('ratios', G.validateRatios([3, 2, 1]) === null, '3 gears OK');
ok('ratios', G.validateRatios([1.76, 1]) === null, '2 gears OK (Powerglide 1.76/1.00)');
ok('ratios', G.validateRatios([2, 1]) === null, '2 gears OK (2/1)');
ok('ratios', /2 to 10/.test(G.validateRatios([1])), 'one gear rejected with "2 to 10" message');
ok('ratios', G.validateRatios([5, 4, 3, 2, 1.5, 1.2, 1, 0.8, 0.6, 0.5]) === null, '10 gears OK');
[[1], [1.5], [], [1, 1], [1, 2], [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.8, 0.6], [3, 3, 1], [3, 1, 2], [9, 2, 1], [3, 2, 0.2], [3, NaN, 1], 'abc', null].forEach(function (r) {
  ok('ratios', typeof G.validateRatios(r) === 'string', 'rejects ' + JSON.stringify(r));
});

// ---------------------------------------------------------------- presets vs data file
// Snapshot of every published ratio set exactly as transcribed from its cited source.
var SNAP = {
  't56m-266': [2.66, 1.78, 1.30, 1.00, 0.80, 0.63], 't56m-297-80': [2.97, 2.10, 1.46, 1.00, 0.80, 0.63], 't56m-297-74': [2.97, 2.10, 1.46, 1.00, 0.74, 0.50],
  'tkx-287-81': [2.87, 1.89, 1.28, 1.00, 0.81], 'tkx-287-68': [2.87, 1.89, 1.28, 1.00, 0.68], 'tkx-327': [3.27, 1.98, 1.34, 1.00, 0.72], 't5': [2.95, 1.94, 1.34, 1.00, 0.63],
  'tr6060-ss': [2.66, 1.78, 1.30, 1.00, 0.74, 0.50], 'tr6060-cts': [2.66, 1.78, 1.30, 1.00, 0.80, 0.63], 'tr6060-zl1': [2.29, 1.63, 1.21, 1.00, 0.82, 0.54],
  'tr6060-1le': [2.29, 1.63, 1.21, 1.00, 0.82, 0.68], 'tr6060-hellcat': [2.26, 1.58, 1.19, 1.00, 0.77, 0.63], 'mt82-11': [3.66, 2.43, 1.69, 1.32, 1.00, 0.65],
  'th350': [2.52, 1.52, 1.00], 'th400': [2.48, 1.48, 1.00], '200-4r': [2.78, 1.57, 1.00, 0.67], '4l60e': [3.059, 1.625, 1.000, 0.696], '4l80e': [2.482, 1.482, 1.000, 0.750],
  '6l80': [4.027, 2.364, 1.532, 1.152, 0.852, 0.667], '8l90': [4.56, 2.97, 2.08, 1.69, 1.27, 1.00, 0.85, 0.65],
  '10l80': [4.696, 2.985, 2.156, 1.779, 1.526, 1.278, 1.000, 0.854, 0.689, 0.636],
  'c4c6': [2.46, 1.46, 1.00], 'aod': [2.40, 1.47, 1.00, 0.67], '4r70w': [2.84, 1.55, 1.00, 0.70], '6r80': [4.17, 2.34, 1.52, 1.14, 0.87, 0.69],
  '10r80': [4.696, 2.985, 2.146, 1.769, 1.520, 1.275, 1.000, 0.854, 0.689, 0.636],
  'tf727': [2.45, 1.45, 1.00], 'a500': [2.74, 1.54, 1.00, 0.69], 'a518': [2.45, 1.45, 1.00, 0.69], '8hp70': [4.71, 3.14, 2.10, 1.67, 1.29, 1.00, 0.84, 0.67],
  // r2 additions
  'tko500': [3.27, 1.98, 1.34, 1.00, 0.68], 'tko600-82': [2.87, 1.89, 1.28, 1.00, 0.82], 'tko600-64': [2.87, 1.89, 1.28, 1.00, 0.64],
  't56-ls1': [2.66, 1.78, 1.30, 1.00, 0.74, 0.50],
  's2000-ap1': [3.133, 2.045, 1.481, 1.161, 0.970, 0.810], 's2000-04': [3.133, 2.045, 1.481, 1.161, 0.943, 0.763],
  'pg-176': [1.76, 1.00], 'pg-182': [1.82, 1.00]
};
// in-box reductions transcribed from Honda (every other preset has none)
var RED = { 's2000-ap1': 1.160, 's2000-04': 1.208 };
ok('presets', PD.presets.length === Object.keys(SNAP).length, 'preset count = snapshot count (' + PD.presets.length + ')');
var ids = {};
PD.presets.forEach(function (p) {
  ok('presets', !ids[p.id], 'unique id ' + p.id); ids[p.id] = 1;
  ok('presets', !!SNAP[p.id], p.id + ' is in the snapshot');
  ok('presets', SNAP[p.id] && JSON.stringify(SNAP[p.id]) === JSON.stringify(p.ratios), p.id + ' ratios match the snapshot exactly');
  ok('presets', G.validateRatios(p.ratios) === null, p.id + ' 2–10 gears, 0.30–8.00, strictly descending');
  // 2-speed Powerglide first gear is 1.76/1.82 per TCI, so 2-speeds get a 1.5 floor; everything else keeps 2.0
  var fmin = p.ratios.length === 2 ? 1.5 : 2.0;
  ok('presets', p.ratios[0] >= fmin && p.ratios[0] <= 5.0, p.id + ' first gear plausible (' + fmin + '–5.0)');
  ok('presets', (p.reduction || null) === (RED[p.id] || null), p.id + ' reduction = ' + (RED[p.id] || 'none'));
  ok('presets', p.ratios[p.ratios.length - 1] >= 0.45 && p.ratios[p.ratios.length - 1] <= 1.0, p.id + ' top gear plausible (0.45–1.00)');
  ok('presets', p.ratios.some(function (r) { return r <= 1.0; }), p.id + ' reaches a direct (1.00) or overdrive gear');  // 6L80 / 6R80 have no 1:1 gear
  for (var i = 1; i < p.ratios.length; i++) ok('presets', p.ratios[i - 1] / p.ratios[i] < 2.0, p.id + ' step ' + i + ' < 2.0');
  ok('presets', (p.type === 'manual' || p.type === 'auto') && typeof p.name === 'string' && p.name && typeof p.group === 'string' && p.group, p.id + ' has name/group/type');
  ok('presets', Array.isArray(p.src) && p.src.length > 0, p.id + ' cites at least one source');
  p.src.forEach(function (k) { var s = PD.sources[k]; ok('presets', s && /^https:\/\//.test(s.url) && s.title.length > 10, p.id + ' source ' + k + ' exists with https URL'); });
});
Object.keys(PD.sources).forEach(function (k) { ok('presets', PD.presets.some(function (p) { return p.src.indexOf(k) >= 0; }), 'source ' + k + ' is used'); });
ok('presets', Array.isArray(PD.excluded) && PD.excluded.length > 0 && PD.excluded.every(function (x) { return x.name && x.why; }), 'excluded list documented');
ok('presets', PD.excluded.every(function (x) { return !PD.presets.some(function (p) { return p.name === x.name; }); }), 'no excluded item shipped as preset');

// ---------------------------------------------------------------- r2: in-box reduction (S2000) maths
function pre(id) { return PD.presets.filter(function (p) { return p.id === id; })[0]; }
var s1 = pre('s2000-ap1'), s4 = pre('s2000-04');
var tr1 = G.table({ ratios: s1.ratios, red: s1.reduction, dia: 25.68, fd: 4.1, slip: 0, redline: 9000, rpm: 3000, speed: 60 });
tr1.forEach(function (r, i) {
  near('reduction', r.overall, s1.ratios[i] * 1.160 * 4.1, 1e-12, 'S2000 overall = gear × 1.160 × 4.100, gear ' + r.gear);
  near('reduction', r.effective, s1.ratios[i] * 1.160, 1e-12, 'effective ratio gear ' + r.gear);
  ok('reduction', r.ratio === s1.ratios[i], 'row keeps raw ratio ' + r.gear);
  near('reduction', r.topMph, G.mph(9000, 25.68, s1.ratios[i] * 1.160, 4.1, 0), 1e-12, 'top speed uses effective ratio ' + r.gear);
});
near('reduction', tr1[0].overall, 14.9005, 0.0001, 'S2000 1st overall ≈ 14.9005 (3.133 × 1.160 × 4.100)');
var plain = G.table({ ratios: s1.ratios, dia: 25.68, fd: 4.1 * 1.160, slip: 0, redline: 9000, rpm: 3000, speed: 60 });
tr1.forEach(function (r, i) { near('reduction', r.topMph, plain[i].topMph, 1e-9, 'reduction ≡ folding it into FD, gear ' + r.gear); });
tr1.forEach(function (r, i) { if (r.landRpm) near('reduction', r.landRpm, G.dropRpm(9000, s1.ratios[i], s1.ratios[i + 1]), 1e-9, 'shift landing unaffected by reduction ' + r.gear); });
near('reduction', s4.reduction / s1.reduction - 1, 0.0414, 0.0001, '2004 reduction 1.208 vs 1.160 = +4.14% (Honda: about 4% lower)');
var tr4 = G.table({ ratios: s4.ratios, red: s4.reduction, dia: 25.68, fd: 4.1, slip: 0, redline: 8000, rpm: 3000, speed: 60 });
near('reduction', tr4[0].overall / tr1[0].overall - 1, 0.0414, 0.0001, '2004 1st overall 4.14% lower-geared than 2000–03');
var t1 = G.table({ ratios: [3, 2, 1], dia: 26, fd: 3.42, slip: 0, redline: 6000, rpm: 3000, speed: 60 });
var t1b = G.table({ ratios: [3, 2, 1], red: 1, dia: 26, fd: 3.42, slip: 0, redline: 6000, rpm: 3000, speed: 60 });
ok('reduction', JSON.stringify(t1) === JSON.stringify(t1b), 'red omitted ≡ red 1');
[0, 0.4, 3.5, NaN, -1].forEach(function (bad) {
  var threw = false; try { G.table({ ratios: [3, 2, 1], red: bad, dia: 26, fd: 3.42, slip: 0, redline: 6000, rpm: 3000, speed: 60 }); } catch (e) { threw = true; }
  ok('reduction', threw, 'reduction ' + bad + ' throws');
});
// r2: 2-speed table
var pg = G.table({ ratios: pre('pg-176').ratios, dia: 28, fd: 4.56, slip: 0, redline: 7000, rpm: 3000, speed: 60 });
ok('twospeed', pg.length === 2 && pg[1].landRpm === null, 'Powerglide table has 2 rows');
near('twospeed', pg[0].landRpm, 7000 / 1.76, 1e-9, 'PG 1.76 shift lands at 7000/1.76');
near('twospeed', pre('pg-182').ratios[0] / pre('pg-176').ratios[0] - 1, 0.0341, 0.0001, '1.82 vs 1.76 first gear = +3.41%');
// r2: OEM T56 LS1 (Jorge's 2001 Z28) and TKO
ok('t56', JSON.stringify(pre('t56-ls1').ratios) === '[2.66,1.78,1.3,1,0.74,0.5]', 'T56 LS1 = 2.66/1.78/1.30/1.00/0.74/0.50');
ok('t56', /F-body/.test(pre('t56-ls1').name) && /C5/.test(pre('t56-ls1').name), 'T56 LS1 name covers F-body and C5');
ok('t56', pre('t56-ls1').src.indexOf('GM_C5_2001') >= 0, 'T56 LS1 cites the GM sourcebook');
var z = G.table({ ratios: pre('t56-ls1').ratios, dia: G.parseTire('275/40R17').diameter, fd: 3.42, slip: 0, redline: 6000, rpm: 3000, speed: 60 });
near('t56', z[5].rpmAtSpeed, G.rpmAt(60, G.parseTire('275/40R17').diameter, 0.5, 3.42, 0), 1e-9, 'Z28 6th @60 consistent');
ok('t56', z[5].rpmAtSpeed > 1000 && z[5].rpmAtSpeed < 1400, '2001 Z28 (275/40R17, 3.42) 6th @ 60 mph ≈ ' + Math.round(z[5].rpmAtSpeed) + ' rpm');
ok('t56', pre('tko500').ratios[1] === 1.98 && /1\.97/.test(pre('tko500').note), 'TKO500 2nd = 1.98 with the 1.97 conflict noted');
ok('t56', /0\.971/.test(s1.note), 'S2000 note records 0.971/0.811 printing');
// r2: excluded list keeps the unsourced T56 variants out
['M12', '1994', 'Powerglide aftermarket'].forEach(function (k) { ok('t56', PD.excluded.some(function (x) { return x.name.indexOf(k) >= 0; }), 'excluded mentions ' + k); });

// ---------------------------------------------------------------- page files are file:// safe
var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
var allJs = ['js/presets.js', 'js/gear.js', 'js/app.js'].map(function (f) { return fs.readFileSync(path.join(root, f), 'utf8'); }).join('\n');
var css = fs.readFileSync(path.join(root, 'css/app.css'), 'utf8');
ok('files', !/type=["']module["']/.test(html), 'no ES modules');
ok('files', (html.match(/<script src="js\/[a-z]+\.js"><\/script>/g) || []).length === 3, 'three plain local scripts');
ok('files', !/\bfetch\s*\(|XMLHttpRequest|import\s*\(|\bimport\s+[\w{*]/.test(allJs), 'no fetch / XHR / import');
ok('files', !/<link[^>]+href="https?:/.test(html) && !/<script[^>]+src="https?:/.test(html), 'no CDN');
ok('files', !/@import|url\(\s*['"]?https?:/.test(css), 'no external CSS/fonts');
ok('files', /Created by Jorge Guerra/.test(html), 'credit present');
// r2 page pieces
var FDQ = ['2.73', '3.08', '3.23', '3.42', '3.55', '3.73', '3.90', '4.10', '4.11', '4.30', '4.56', '4.88', '5.13'];
['fdq', 'fdqB'].forEach(function (id) {
  var m = html.match(new RegExp('id="' + id + '"[^>]*>([\\s\\S]*?)</div>'));
  var vals = m ? (m[1].match(/data-v="([0-9.]+)"/g) || []).map(function (s) { return s.slice(8, -1); }) : [];
  ok('files', JSON.stringify(vals) === JSON.stringify(FDQ), id + ' has the 13 final-drive chips in order');
});
['cmp-on', 'cmp-body', 'presetsB', 'gcountB', 'ratiosB', 'fdB', 'tireB', 'cmp-tbl', 'cmp-table-card', 'chart-legend'].forEach(function (id) { ok('files', html.indexOf('id="' + id + '"') >= 0, 'page has #' + id); });
ok('files', /for \(var n = 2; n <= 10; n\+\+\)/.test(allJs), 'gear-count buttons 2–10');
ok('files', /\.seg-count button \{[^}]*min-height: 4[4-9]px/.test(css), 'gear-count buttons min-height ≥ 44px');
ok('files', !/<select/.test(html), 'no dropdowns');
ok('files', !/gtag|analytics|googletagmanager|sentry|mixpanel/i.test(html + allJs), 'no analytics');

console.log('\nGroups:'); Object.keys(groups).forEach(function (g) { console.log('  ' + g + ': ' + groups[g][0] + ' pass, ' + groups[g][1] + ' fail'); });
console.log('\nPASS ' + pass + ' / FAIL ' + fail);
process.exit(fail ? 1 : 0);

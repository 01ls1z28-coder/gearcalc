/* GearCalc — page logic. Created by Jorge Guerra. Plain script; needs js/presets.js and js/gear.js. */
(function () {
  'use strict';
  var G = window.GearLib, PD = window.GEAR_PRESETS;
  var $ = function (id) { return document.getElementById(id); };
  var ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
  var STEP = { fd: 0.01, redline: 100, slip: 0.5, rpm: 100, speed: 5, 'roll-val': 0.005 };
  var DEF = { tire: '315/35R17', roll: 'unloaded', rollFactor: '', rollRadius: '', preset: 't56m-266', ratios: null, fd: '3.42', redline: '6500', slip: '0', rpm: '3000', speed: '60', sunit: 'mph' };
  var st = {}; for (var k in DEF) st[k] = DEF[k];
  var customBase = null; // preset name the custom set started from

  function presetById(id) { for (var i = 0; i < PD.presets.length; i++) if (PD.presets[i].id === id) return PD.presets[i]; return null; }
  function load() {
    try { var s = JSON.parse(localStorage.getItem('gearcalc-state') || 'null'); if (s) for (var k in DEF) if (s[k] !== undefined) st[k] = s[k]; } catch (e) {}
    if (st.preset !== 'custom' && !presetById(st.preset)) st.preset = DEF.preset;
    if (!Array.isArray(st.ratios) || st.ratios.length < 3) st.ratios = (presetById(st.preset) || presetById(DEF.preset)).ratios.map(String);
    if (st.preset !== 'custom') st.ratios = fmtSet(presetById(st.preset).ratios);
  }
  function save() { try { localStorage.setItem('gearcalc-state', JSON.stringify(st)); } catch (e) {} }
  function dpOf(arr) { return Math.max(2, Math.max.apply(null, arr.map(function (r) { var t = String(r).split('.')[1]; return t ? t.length : 0; }))); }
  function fmtSet(arr) { var d = dpOf(arr); return arr.map(function (r) { return r.toFixed(d); }); }
  function fmtRatio(r) { var s = String(r); return s.indexOf('.') < 0 ? s + '.00' : (s.split('.')[1].length < 2 ? s + '0' : s); }
  function f(x, d) { return x == null || !isFinite(x) ? '—' : x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function numIn(v) { var s = String(v).trim().replace(',', '.'); if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN; return parseFloat(s); }

  // ---------------------------------------------------------------- radio helper
  function radio(group, current, onPick) {
    Array.prototype.forEach.call(group.querySelectorAll('[role="radio"]'), function (b) {
      var on = b.dataset.id === current; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      if (!b._wired) { b._wired = 1; b.addEventListener('click', function () { onPick(b.dataset.id); }); }
    });
    if (!group._keys) {
      group._keys = 1;
      group.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
        var items = Array.prototype.slice.call(group.querySelectorAll('[role="radio"]')), i = items.indexOf(document.activeElement); if (i < 0) return;
        e.preventDefault(); var n = items[(i + d + items.length) % items.length]; n.click(); var again = group.querySelector('[data-id="' + n.dataset.id + '"]'); if (again) again.focus();
      });
    }
  }

  // ---------------------------------------------------------------- presets
  function buildPresets() {
    var box = $('presets'); box.innerHTML = '';
    var groups = [];
    PD.presets.forEach(function (p) { if (groups.indexOf(p.group) < 0) groups.push(p.group); });
    groups.forEach(function (g) {
      var h = document.createElement('p'); h.className = 'pick-sec'; h.textContent = g; box.appendChild(h);
      PD.presets.filter(function (p) { return p.group === g; }).forEach(function (p) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'p-chip'; b.setAttribute('role', 'radio'); b.dataset.id = p.id;
        b.innerHTML = '<span class="p-name"></span><span class="p-meta"></span>';
        b.firstChild.textContent = p.name; var fs = fmtSet(p.ratios); b.lastChild.textContent = p.ratios.length + '-spd · ' + fs[0] + ' → ' + fs[fs.length - 1];
        box.appendChild(b);
      });
    });
    var h2 = document.createElement('p'); h2.className = 'pick-sec'; h2.textContent = 'Your own'; box.appendChild(h2);
    var c = document.createElement('button'); c.type = 'button'; c.className = 'p-chip p-custom'; c.setAttribute('role', 'radio'); c.dataset.id = 'custom';
    c.innerHTML = '<span class="p-name">Custom</span><span class="p-meta">3–10 gears, any ratios</span>'; box.appendChild(c);
  }
  function pickPreset(id) {
    if (id === 'custom') { if (st.preset !== 'custom') customBase = st.preset !== 'custom' ? (presetById(st.preset) || {}).name : customBase; st.preset = 'custom'; }
    else { st.preset = id; st.ratios = fmtSet(presetById(id).ratios); customBase = null; }
    buildRatios(); render();
  }
  function paintPresetSrc() {
    var box = $('preset-src'); box.innerHTML = '';
    if (st.preset === 'custom') {
      box.innerHTML = '<p class="src-t"><b>Custom ratios</b></p><p class="src-n"></p>';
      box.querySelector('.src-n').textContent = customBase ? 'Started from ' + customBase + ' and edited by you. These are your numbers, not a published set.' : 'Your own ratios. These are your numbers, not a published set.';
      return;
    }
    var p = presetById(st.preset);
    var t = document.createElement('p'); t.className = 'src-t'; t.innerHTML = '<b></b> <span class="mono"></span>';
    t.firstChild.textContent = p.name; t.lastChild.textContent = fmtSet(p.ratios).join(' · ');
    box.appendChild(t);
    var n = document.createElement('p'); n.className = 'src-n'; n.textContent = p.note; box.appendChild(n);
    p.src.forEach(function (k) {
      var s = PD.sources[k], q = document.createElement('p'); q.className = 'src-c';
      q.appendChild(document.createTextNode('Source: ' + s.title + ' '));
      var a = document.createElement('a'); a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'link'; q.appendChild(a);
      box.appendChild(q);
    });
  }

  // ---------------------------------------------------------------- ratios editor
  function buildGearCount() {
    var g = $('gcount'); g.innerHTML = '';
    for (var n = 3; n <= 10; n++) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.id = String(n); b.textContent = n; b.setAttribute('aria-label', n + ' gears'); g.appendChild(b); }
  }
  function setCount(n) {
    n = +n; if (n === st.ratios.length) return;
    if (st.preset !== 'custom') { customBase = presetById(st.preset).name; st.preset = 'custom'; }
    var r = st.ratios.slice(0, n);
    while (r.length < n) { var last = numIn(r[r.length - 1]); r.push(isFinite(last) ? fmtRatio(Math.max(0.3, Math.round(last * 0.8 * 100) / 100)) : ''); }
    st.ratios = r; buildRatios(); render();
  }
  function buildRatios() {
    var box = $('ratios'); box.innerHTML = '';
    st.ratios.forEach(function (v, i) {
      var c = document.createElement('label'); c.className = 'ratio-cell';
      c.innerHTML = '<span class="ratio-g"></span><input type="text" inputmode="decimal" autocomplete="off">';
      c.firstChild.textContent = ORD[i];
      var inp = c.lastChild; inp.value = v; inp.setAttribute('aria-label', ORD[i] + ' gear ratio'); inp.dataset.i = i;
      inp.addEventListener('input', function () {
        if (st.preset !== 'custom') { customBase = presetById(st.preset).name; st.preset = 'custom'; }
        st.ratios[i] = inp.value; render();
      });
      box.appendChild(c);
    });
  }

  // ---------------------------------------------------------------- render
  function readAll() {
    var out = { errs: [] };
    var t = G.parseTire(st.tire); out.tire = t;
    if (t.ok) {
      try {
        var rv = st.roll === 'factor' ? numIn(st.rollFactor) : st.roll === 'loaded' ? numIn(st.rollRadius) : null;
        out.dia = G.effectiveDiameter(t.diameter, st.roll, rv);
      } catch (e) { out.rollErr = e.message; out.dia = null; }
    }
    out.ratios = st.ratios.map(numIn);
    out.ratioErr = G.validateRatios(out.ratios);
    out.fd = numIn(st.fd); if (!(out.fd >= 1 && out.fd <= 8)) out.errs.push('Final drive must be 1.00–8.00');
    out.redline = numIn(st.redline); if (!(out.redline >= 1000 && out.redline <= 20000)) out.errs.push('Redline must be 1000–20000 rpm');
    out.slip = numIn(st.slip); if (!(out.slip >= 0 && out.slip <= 30)) out.errs.push('Slip must be 0–30 %');
    out.rpm = numIn(st.rpm); if (!(out.rpm >= 0 && out.rpm <= 20000)) out.errs.push('Query RPM must be 0–20000');
    var sp = numIn(st.speed); out.speedMph = st.sunit === 'kmh' ? G.toMph(sp) : sp; if (!(sp >= 0 && sp <= 600)) out.errs.push('Query speed must be 0–600');
    out.ok = t.ok && out.dia && !out.ratioErr && !out.errs.length;
    return out;
  }

  function render() {
    save();
    radio($('presets'), st.preset, pickPreset);
    radio($('gcount'), String(st.ratios.length), setCount);
    radio($('roll-mode'), st.roll, function (id) { st.roll = id; render(); });
    radio($('sunit'), st.sunit, function (id) {
      var v = numIn(st.speed);
      if (isFinite(v)) { v = id === 'kmh' && st.sunit === 'mph' ? G.toKmh(v) : id === 'mph' && st.sunit === 'kmh' ? G.toMph(v) : v; st.speed = String(Math.round(v * 10) / 10); $('speed').value = st.speed; }
      st.sunit = id; render();
    });
    paintPresetSrc();
    var o = readAll();
    // tire readout
    var tf = $('tire-field'), tm = $('tire-msg'), tr = $('tire-read');
    tf.classList.toggle('bad', !o.tire.ok); tm.className = 'in-msg' + (o.tire.ok ? '' : ' err');
    tm.textContent = o.tire.ok ? '' : o.tire.error;
    $('tire-kind').textContent = o.tire.ok ? ({ metric: 'metric', flotation: 'flotation', diameter: 'diameter' })[o.tire.kind] : '';
    tr.innerHTML = '';
    if (o.tire.ok) {
      var items = [['Diameter', f(o.tire.diameter, 3) + ' in', f(o.tire.diameter * 25.4, 1) + ' mm']];
      if (o.tire.kind === 'metric') items.push(['Sidewall', f(o.tire.sidewall, 3) + ' in', o.tire.section + ' × ' + o.tire.aspect + '%'], ['Width', f(o.tire.widthIn, 2) + ' in', o.tire.section + ' mm']);
      if (o.tire.kind === 'flotation') items.push(['Width', f(o.tire.widthIn, 2) + ' in', 'rim ' + o.tire.rim + ' in']);
      if (o.dia) items.push(['Revs / mile', f(G.revsPerMile(o.dia), 1), st.roll === 'unloaded' ? 'unloaded D' : 'effective D ' + f(o.dia, 3) + ' in']);
      items.forEach(function (it) {
        var d = document.createElement('div'); d.className = 'ro';
        d.innerHTML = '<span class="ro-k"></span><span class="ro-v mono"></span><span class="ro-s"></span>';
        d.children[0].textContent = it[0]; d.children[1].textContent = it[1]; d.children[2].textContent = it[2]; tr.appendChild(d);
      });
    }
    // rolling extra
    var ex = $('roll-extra'); ex.hidden = st.roll === 'unloaded';
    if (st.roll === 'factor') { $('roll-val-lbl').textContent = 'Rolling factor (effective ÷ unloaded diameter)'; $('roll-val').value = st.rollFactor; $('roll-hint').textContent = o.rollErr || 'Enter your own measured or published factor, between 0.80 and 1.05. GearCalc has no built-in default.'; }
    if (st.roll === 'loaded') { $('roll-val-lbl').textContent = 'Loaded radius (inches, axle centre to ground)'; $('roll-val').value = st.rollRadius; $('roll-hint').textContent = o.rollErr || 'The effective diameter is 2 × the loaded radius.'; }
    $('roll-hint').classList.toggle('err', !!o.rollErr);
    // ratios
    Array.prototype.forEach.call($('ratios').querySelectorAll('input'), function (inp, i) {
      var v = o.ratios[i], bad = !isFinite(v) || v < 0.3 || v > 8 || (i && !(v < o.ratios[i - 1]));
      inp.parentNode.classList.toggle('bad', bad);
    });
    $('ratio-msg').textContent = o.ratioErr || ''; $('ratio-msg').className = 'in-msg' + (o.ratioErr ? ' err' : '');
    $('dt-msg').textContent = o.errs.join(' · ');
    var auto = st.preset !== 'custom' && presetById(st.preset).type === 'auto';
    $('slip-hint').classList.toggle('hl', auto && !(o.slip > 0));
    renderResults(o);
    renderChart(o);
  }

  function renderResults(o) {
    var box = $('gear-cards'); box.innerHTML = '';
    var u = st.sunit === 'kmh' ? 'km/h' : 'mph';
    if (!o.ok) { $('res-sub').textContent = 'Fix the inputs above to see results'; return; }
    var rows = G.table({ ratios: o.ratios, dia: o.dia, fd: o.fd, slip: o.slip, redline: o.redline, rpm: o.rpm, speed: o.speedMph });
    o.rows = rows;
    $('res-sub').textContent = 'D ' + f(o.dia, 3) + ' in · FD ' + o.fd + ' · slip ' + o.slip + '% · redline ' + f(o.redline, 0);
    rows.forEach(function (r) {
      var c = document.createElement('article'); c.className = 'g-card';
      var over = r.rpmAtSpeed > o.redline;
      var spd = function (m) { return st.sunit === 'kmh' ? f(G.toKmh(m), 1) + ' km/h' : f(m, 1) + ' mph'; };
      var alt = function (m) { return st.sunit === 'kmh' ? f(m, 1) + ' mph' : f(G.toKmh(m), 1) + ' km/h'; };
      c.innerHTML =
        '<header class="g-h"><span class="g-n">' + ORD[r.gear - 1] + '</span><span class="g-r mono">' + fmtRatio(r.ratio) + '</span><span class="g-o mono">× FD = ' + f(r.overall, 3) + '</span></header>' +
        '<dl class="g-dl">' +
        '<div><dt>@ ' + f(o.rpm, 0) + ' rpm</dt><dd class="mono">' + spd(r.mphAtRpm) + '<small>' + alt(r.mphAtRpm) + '</small></dd></div>' +
        '<div><dt>@ ' + (st.sunit === 'kmh' ? f(G.toKmh(o.speedMph), 0) : f(o.speedMph, 0)) + ' ' + u + '</dt><dd class="mono' + (over ? ' over' : '') + '">' + f(r.rpmAtSpeed, 0) + ' rpm<small>' + (over ? 'above redline' : 'engine speed') + '</small></dd></div>' +
        '<div><dt>Top @ redline</dt><dd class="mono top">' + spd(r.topMph) + '<small>' + alt(r.topMph) + '</small></dd></div>' +
        '<div><dt>' + (r.landRpm ? 'Shift → ' + ORD[r.gear] : 'Last gear') + '</dt><dd class="mono">' + (r.landRpm ? 'lands ' + f(r.landRpm, 0) + '<small>drop ' + f(r.drop, 0) + ' rpm · step ' + f(r.step, 3) + '</small>' : '—<small>no further shift</small>') + '</dd></div>' +
        '</dl>';
      box.appendChild(c);
    });
  }

  // ---------------------------------------------------------------- chart (SVG, no libraries)
  function niceStep(max, target) { var raw = max / target, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; }
  function renderChart(o) {
    var svg = $('chart'), wrap = $('chart-wrap');
    var W = Math.max(300, Math.round(wrap.clientWidth || 700)), H = W < 560 ? Math.round(W * 0.86) : Math.round(Math.min(460, W * 0.48));
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    var desc = svg.querySelector('desc'); svg.innerHTML = ''; svg.appendChild(desc);
    var NS = 'http://www.w3.org/2000/svg';
    function el(tag, a, txt) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; }
    if (!o.ok || !o.rows) { el('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'c-empty' }, 'Fix the inputs to draw the chart'); return; }
    var kmh = st.sunit === 'kmh', cv = function (m) { return kmh ? G.toKmh(m) : m; };
    var rows = o.rows, vmax = cv(rows[rows.length - 1].topMph);
    var xs = niceStep(vmax, W < 560 ? 5 : 8), xMax = Math.ceil(vmax / xs) * xs;
    var ys = niceStep(o.redline, 6), yMax = Math.ceil(o.redline * 1.12 / ys) * ys;
    var L = W < 560 ? 44 : 56, R = 14, T = 16, B = 40, pw = W - L - R, ph = H - T - B;
    var X = function (v) { return L + v / xMax * pw; }, Y = function (r) { return T + ph - r / yMax * ph; };
    var defs = el('defs', {});
    defs.innerHTML = '<linearGradient id="saw" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#9bdfba"/><stop offset=".5" stop-color="#38e0ff"/><stop offset="1" stop-color="#8f9cff"/></linearGradient>' +
      '<filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    for (var v = 0; v <= xMax + 1e-9; v += xs) { el('line', { x1: X(v), x2: X(v), y1: T, y2: T + ph, class: 'c-grid' }); el('text', { x: X(v), y: T + ph + 16, 'text-anchor': 'middle', class: 'c-tick' }, Math.round(v)); }
    for (var r = 0; r <= yMax + 1e-9; r += ys) { el('line', { x1: L, x2: L + pw, y1: Y(r), y2: Y(r), class: 'c-grid' }); el('text', { x: L - 6, y: Y(r) + 4, 'text-anchor': 'end', class: 'c-tick' }, r >= 1000 ? (r / 1000) + 'k' : r); }
    el('text', { x: L + pw / 2, y: H - 6, 'text-anchor': 'middle', class: 'c-ax' }, 'Road speed (' + (kmh ? 'km/h' : 'mph') + ')');
    el('text', { x: 12, y: T + ph / 2, 'text-anchor': 'middle', class: 'c-ax', transform: 'rotate(-90 12 ' + (T + ph / 2) + ')' }, 'Engine RPM');
    // redline
    el('line', { x1: L, x2: L + pw, y1: Y(o.redline), y2: Y(o.redline), class: 'c-red' });
    el('text', { x: L + pw - 4, y: T + 12, 'text-anchor': 'end', class: 'c-red-t' }, 'Redline ' + Math.round(o.redline) + ' rpm');
    // faint full gear lines
    rows.forEach(function (g) { el('line', { x1: X(0), y1: Y(0), x2: X(cv(g.topMph)), y2: Y(o.redline), class: 'c-gear' }); });
    // sawtooth + drops
    var d = 'M' + X(0) + ' ' + Y(0), prevLand = 0, prevV = 0;
    rows.forEach(function (g, i) {
      var vTop = cv(g.topMph);
      d += ' L' + X(vTop) + ' ' + Y(o.redline);
      var vStart = i ? prevV : 0, mx = i ? (vStart + vTop) / 2 : vTop * 0.82;
      el('text', { x: X(mx), y: Y(o.redline) - 9, 'text-anchor': 'middle', class: 'c-gl' }, W < 560 ? String(i + 1) : ORD[i]);
      if (g.landRpm) {
        d += ' L' + X(vTop) + ' ' + Y(g.landRpm);
        el('line', { x1: X(vTop), x2: X(vTop), y1: Y(o.redline), y2: Y(g.landRpm), class: 'c-drop' });
        el('text', { x: X(vTop) + 4, y: Y(g.landRpm) + 14, class: 'c-drop-t' }, '−' + Math.round(g.drop));
        prevLand = g.landRpm; prevV = vTop;
      }
    });
    el('path', { d: d, class: 'c-saw', filter: 'url(#glow)' });
    rows.forEach(function (g) { el('circle', { cx: X(cv(g.topMph)), cy: Y(o.redline), r: 3.5, class: 'c-dot' }); });
    // query speed marker
    var q = cv(o.speedMph);
    if (q > 0 && q <= xMax) {
      el('line', { x1: X(q), x2: X(q), y1: T, y2: T + ph, class: 'c-q' });
      el('text', { x: X(q) + 4, y: T + ph - 6, class: 'c-q-t' }, Math.round(q) + ' ' + (kmh ? 'km/h' : 'mph'));
      rows.forEach(function (g) { if (g.rpmAtSpeed <= yMax) el('circle', { cx: X(q), cy: Y(g.rpmAtSpeed), r: 3, class: 'c-qdot' }); });
    }
  }

  // ---------------------------------------------------------------- wiring
  function buildSources() {
    var ul = $('src-list');
    Object.keys(PD.sources).forEach(function (k) {
      var s = PD.sources[k], li = document.createElement('li');
      var used = PD.presets.filter(function (p) { return p.src.indexOf(k) >= 0; }).map(function (p) { return p.name; });
      li.appendChild(document.createTextNode(s.title + ' — used for: ' + used.join(', ') + '. '));
      var a = document.createElement('a'); a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = s.url.replace(/^https?:\/\//, '').slice(0, 64) + (s.url.length > 72 ? '…' : ''); li.appendChild(a);
      ul.appendChild(li);
    });
    var ex = $('excl-list');
    PD.excluded.forEach(function (x) { var li = document.createElement('li'); var b = document.createElement('b'); b.textContent = x.name + ': '; li.appendChild(b); li.appendChild(document.createTextNode(x.why)); ex.appendChild(li); });
  }
  function stepField(id, dir) {
    var inp = $(id), v = numIn(inp.value), s = id === 'roll-val' && st.roll === 'loaded' ? 0.05 : STEP[id];
    var dec = { fd: 2, 'roll-val': 3, slip: 1, speed: 0, rpm: 0, redline: 0 }[id];
    if (!isFinite(v)) v = id === 'roll-val' ? (st.roll === 'factor' ? 1 : 12) : 0;
    v = Math.max(0, Math.round((v + dir * s) / s) * s);
    inp.value = v.toFixed(dec);
    inp.dispatchEvent(new Event('input'));
  }
  function init() {
    load();
    buildPresets(); buildGearCount(); buildRatios(); buildSources();
    $('tire').value = st.tire;
    ['fd', 'redline', 'slip', 'rpm', 'speed'].forEach(function (id) { $(id).value = st[id]; $(id).addEventListener('input', function () { st[id] = this.value; render(); }); });
    $('tire').addEventListener('input', function () { st.tire = this.value; render(); });
    $('roll-val').addEventListener('input', function () { if (st.roll === 'factor') st.rollFactor = this.value; else st.rollRadius = this.value; render(); });
    Array.prototype.forEach.call(document.querySelectorAll('#tire-ex .chip-btn'), function (b) {
      b.addEventListener('click', function () { st.tire = b.dataset.v; $('tire').value = st.tire; render(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.step'), function (b) { b.addEventListener('click', function () { stepField(b.dataset.for, +b.dataset.step); }); });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { renderChart(readAllWithRows()); }, 80); });
    render();
  }
  function readAllWithRows() { var o = readAll(); if (o.ok) o.rows = G.table({ ratios: o.ratios, dia: o.dia, fd: o.fd, slip: o.slip, redline: o.redline, rpm: o.rpm, speed: o.speedMph }); return o; }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

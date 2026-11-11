/* GearCalc — page logic. Created by Jorge Guerra. Plain script; needs js/presets.js and js/gear.js. */
(function () {
  'use strict';
  var G = window.GearLib, PD = window.GEAR_PRESETS;
  var $ = function (id) { return document.getElementById(id); };
  var ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
  var STEP = { fd: 0.01, fdB: 0.01, redline: 100, slip: 0.5, rpm: 100, speed: 5, 'roll-val': 0.005 };
  var DEF = { tire: '315/35R17', roll: 'unloaded', rollFactor: '', rollRadius: '', preset: 't56m-266', ratios: null, red: 1, fd: '3.42', redline: '6500', slip: '0', rpm: '3000', speed: '60', sunit: 'mph',
    cmp: 'off', presetB: 't56-ls1', ratiosB: null, redB: 1, fdB: '4.10', tireB: '' };
  var st = {}; for (var k in DEF) st[k] = DEF[k];
  var base = { A: null, B: null }; // preset name a custom set started from
  // side accessors: A uses preset/ratios/red/fd, B uses presetB/ratiosB/redB/fdB
  var KEY = { A: { preset: 'preset', ratios: 'ratios', red: 'red', fd: 'fd', presets: 'presets', gcount: 'gcount', ratiosBox: 'ratios', src: 'preset-src', msg: 'ratio-msg' },
              B: { preset: 'presetB', ratios: 'ratiosB', red: 'redB', fd: 'fdB', presets: 'presetsB', gcount: 'gcountB', ratiosBox: 'ratiosB', src: 'preset-srcB', msg: 'ratio-msgB' } };

  function presetById(id) { for (var i = 0; i < PD.presets.length; i++) if (PD.presets[i].id === id) return PD.presets[i]; return null; }
  function redOf(p) { return p && p.reduction ? p.reduction : 1; }
  function load() {
    try { var s = JSON.parse(localStorage.getItem('gearcalc-state') || 'null'); if (s) for (var k in DEF) if (s[k] !== undefined) st[k] = s[k]; } catch (e) {}
    ['A', 'B'].forEach(function (sd) {
      var K = KEY[sd];
      if (st[K.preset] !== 'custom' && !presetById(st[K.preset])) st[K.preset] = DEF[K.preset];
      if (!Array.isArray(st[K.ratios]) || st[K.ratios].length < 2) st[K.ratios] = fmtSet((presetById(st[K.preset]) || presetById(DEF[K.preset])).ratios);
      if (st[K.preset] !== 'custom') { st[K.ratios] = fmtSet(presetById(st[K.preset]).ratios); st[K.red] = redOf(presetById(st[K.preset])); }
      if (!(st[K.red] >= 0.5 && st[K.red] <= 3)) st[K.red] = 1;
    });
    if (st.cmp !== 'on') st.cmp = 'off';
  }
  function save() { try { localStorage.setItem('gearcalc-state', JSON.stringify(st)); } catch (e) {} }
  function dpOf(arr) { return Math.max(2, Math.max.apply(null, arr.map(function (r) { var t = String(r).split('.')[1]; return t ? t.length : 0; }))); }
  function fmtSet(arr) { var d = dpOf(arr); return arr.map(function (r) { return r.toFixed(d); }); }
  function fmtRatio(r) { var s = String(r); return s.indexOf('.') < 0 ? s + '.00' : (s.split('.')[1].length < 2 ? s + '0' : s); }
  function f(x, d) { return x == null || !isFinite(x) ? '—' : x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function sg(x, d) { return x == null || !isFinite(x) ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '±') + f(Math.abs(x), d); }
  function numIn(v) { var s = String(v).trim().replace(',', '.'); if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN; return parseFloat(s); }

  // ---------------------------------------------------------------- radio helper
  function radio(group, current, onPick) {
    Array.prototype.forEach.call(group.querySelectorAll('[role="radio"]'), function (b) {
      var on = b.dataset.id === current; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      if (!b._wired) { b._wired = 1; b.addEventListener('click', function () { group._pick(b.dataset.id); }); }
    });
    group._pick = onPick;
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
  function buildPresets(sd) {
    var box = $(KEY[sd].presets); box.innerHTML = '';
    var groups = [];
    PD.presets.forEach(function (p) { if (groups.indexOf(p.group) < 0) groups.push(p.group); });
    groups.forEach(function (g) {
      var h = document.createElement('p'); h.className = 'pick-sec'; h.textContent = g; box.appendChild(h);
      PD.presets.filter(function (p) { return p.group === g; }).forEach(function (p) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'p-chip'; b.setAttribute('role', 'radio'); b.dataset.id = p.id;
        b.innerHTML = '<span class="p-name"></span><span class="p-meta"></span>';
        b.firstChild.textContent = p.name; var fs = fmtSet(p.ratios);
        b.lastChild.textContent = p.ratios.length + '-spd · ' + fs[0] + ' → ' + fs[fs.length - 1] + (p.reduction ? ' · ×' + p.reduction.toFixed(3) : '');
        box.appendChild(b);
      });
    });
    var h2 = document.createElement('p'); h2.className = 'pick-sec'; h2.textContent = 'Your own'; box.appendChild(h2);
    var c = document.createElement('button'); c.type = 'button'; c.className = 'p-chip p-custom'; c.setAttribute('role', 'radio'); c.dataset.id = 'custom';
    c.innerHTML = '<span class="p-name">Custom</span><span class="p-meta">2–10 gears, any ratios</span>'; box.appendChild(c);
  }
  function toCustom(sd) { var K = KEY[sd]; if (st[K.preset] !== 'custom') { base[sd] = presetById(st[K.preset]).name; st[K.preset] = 'custom'; } }
  function pickPreset(sd, id) {
    var K = KEY[sd];
    if (id === 'custom') toCustom(sd);
    else { st[K.preset] = id; st[K.ratios] = fmtSet(presetById(id).ratios); st[K.red] = redOf(presetById(id)); base[sd] = null; }
    buildRatios(sd); render();
  }
  function paintPresetSrc(sd) {
    var K = KEY[sd], box = $(K.src); box.innerHTML = '';
    var red = st[K.red], redLine = red !== 1 ? 'In-box reduction ×' + red.toFixed(3) + ' is applied to every gear (overall = gear × ' + red.toFixed(3) + ' × final drive).' : '';
    if (st[K.preset] === 'custom') {
      box.innerHTML = '<p class="src-t"><b>Custom ratios</b></p><p class="src-n"></p>';
      box.querySelector('.src-n').textContent = (base[sd] ? 'Started from ' + base[sd] + ' and edited by you. ' : 'Your own ratios. ') + 'These are your numbers, not a published set.' + (redLine ? ' ' + redLine : '');
      return;
    }
    var p = presetById(st[K.preset]);
    var t = document.createElement('p'); t.className = 'src-t'; t.innerHTML = '<b></b> <span class="mono"></span>';
    t.firstChild.textContent = p.name; t.lastChild.textContent = fmtSet(p.ratios).join(' · ');
    box.appendChild(t);
    var n = document.createElement('p'); n.className = 'src-n'; n.textContent = p.note + (redLine ? ' ' + redLine : ''); box.appendChild(n);
    p.src.forEach(function (k) {
      var s = PD.sources[k], q = document.createElement('p'); q.className = 'src-c';
      q.appendChild(document.createTextNode('Source: ' + s.title + ' '));
      var a = document.createElement('a'); a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'link'; q.appendChild(a);
      box.appendChild(q);
    });
  }

  // ---------------------------------------------------------------- ratios editor
  function buildGearCount(sd) {
    var g = $(KEY[sd].gcount); g.innerHTML = '';
    for (var n = 2; n <= 10; n++) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.id = String(n); b.textContent = n; b.setAttribute('aria-label', n + ' gears'); g.appendChild(b); }
  }
  function setCount(sd, n) {
    var K = KEY[sd]; n = +n; if (n === st[K.ratios].length) return;
    toCustom(sd);
    var r = st[K.ratios].slice(0, n);
    while (r.length < n) { var last = numIn(r[r.length - 1]); r.push(isFinite(last) ? fmtRatio(Math.max(0.3, Math.round(last * 0.8 * 100) / 100)) : ''); }
    st[K.ratios] = r; buildRatios(sd); render();
  }
  function buildRatios(sd) {
    var K = KEY[sd], box = $(K.ratiosBox); box.innerHTML = '';
    st[K.ratios].forEach(function (v, i) {
      var c = document.createElement('label'); c.className = 'ratio-cell';
      c.innerHTML = '<span class="ratio-g"></span><input type="text" inputmode="decimal" autocomplete="off">';
      c.firstChild.textContent = (sd === 'B' ? 'B ' : '') + ORD[i];
      var inp = c.lastChild; inp.value = v; inp.setAttribute('aria-label', (sd === 'B' ? 'Setup B ' : '') + ORD[i] + ' gear ratio');
      inp.addEventListener('input', function () { toCustom(sd); st[K.ratios][i] = inp.value; render(); });
      box.appendChild(c);
    });
  }

  // ---------------------------------------------------------------- read inputs
  function tireDia(str) {
    var t = G.parseTire(str), o = { tire: t };
    if (t.ok) {
      try { var rv = st.roll === 'factor' ? numIn(st.rollFactor) : st.roll === 'loaded' ? numIn(st.rollRadius) : null; o.dia = G.effectiveDiameter(t.diameter, st.roll, rv); }
      catch (e) { o.rollErr = e.message; o.dia = null; }
    }
    return o;
  }
  function readAll() {
    var out = { errs: [] }, td = tireDia(st.tire);
    out.tire = td.tire; out.dia = td.dia; out.rollErr = td.rollErr;
    out.ratios = st.ratios.map(numIn); out.red = st.red;
    out.ratioErr = G.validateRatios(out.ratios);
    out.fd = numIn(st.fd); if (!(out.fd >= 1 && out.fd <= 8)) out.errs.push('Final drive must be 1.00–8.00');
    out.redline = numIn(st.redline); if (!(out.redline >= 1000 && out.redline <= 20000)) out.errs.push('Redline must be 1000–20000 rpm');
    out.slip = numIn(st.slip); if (!(out.slip >= 0 && out.slip <= 30)) out.errs.push('Slip must be 0–30 %');
    out.rpm = numIn(st.rpm); if (!(out.rpm >= 0 && out.rpm <= 20000)) out.errs.push('Query RPM must be 0–20000');
    var sp = numIn(st.speed); out.speedMph = st.sunit === 'kmh' ? G.toMph(sp) : sp; if (!(sp >= 0 && sp <= 600)) out.errs.push('Query speed must be 0–600');
    out.ok = out.tire.ok && out.dia && !out.ratioErr && !out.errs.length;
    if (out.ok) out.rows = G.table({ ratios: out.ratios, red: out.red, dia: out.dia, fd: out.fd, slip: out.slip, redline: out.redline, rpm: out.rpm, speed: out.speedMph });
    // compare setup
    if (st.cmp === 'on') {
      var b = { errs: [] };
      if (String(st.tireB).trim()) { var tb = tireDia(st.tireB); b.tire = tb.tire; b.dia = tb.dia; if (!tb.tire.ok) b.errs.push('B tire: ' + tb.tire.error); else if (!tb.dia) b.errs.push('B tire: ' + tb.rollErr); b.ownTire = true; }
      else { b.tire = out.tire; b.dia = out.dia; b.ownTire = false; }
      b.ratios = st.ratiosB.map(numIn); b.red = st.redB; b.ratioErr = G.validateRatios(b.ratios);
      b.fd = numIn(st.fdB); if (!(b.fd >= 1 && b.fd <= 8)) b.errs.push('B final drive must be 1.00–8.00');
      b.ok = out.ok && b.dia && !b.ratioErr && !b.errs.length;
      if (b.ok) b.rows = G.table({ ratios: b.ratios, red: b.red, dia: b.dia, fd: b.fd, slip: out.slip, redline: out.redline, rpm: out.rpm, speed: out.speedMph });
      out.B = b;
    }
    return out;
  }

  // ---------------------------------------------------------------- render
  function paintRatioState(sd, ratios, err) {
    var K = KEY[sd];
    Array.prototype.forEach.call($(K.ratiosBox).querySelectorAll('input'), function (inp, i) {
      var v = ratios[i], bad = !isFinite(v) || v < 0.3 || v > 8 || (i && !(v < ratios[i - 1]));
      inp.parentNode.classList.toggle('bad', bad);
    });
    $(K.msg).textContent = err || ''; $(K.msg).className = 'in-msg' + (err ? ' err' : '');
  }
  function paintFdChips(id, val) {
    Array.prototype.forEach.call(document.querySelectorAll('#' + id + ' .fd-chip'), function (b) { var on = numIn(val) === numIn(b.dataset.v); b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }
  function render() {
    save();
    ['A', 'B'].forEach(function (sd) {
      var K = KEY[sd];
      radio($(K.presets), st[K.preset], function (id) { pickPreset(sd, id); });
      radio($(K.gcount), String(st[K.ratios].length), function (n) { setCount(sd, n); });
      paintPresetSrc(sd);
    });
    radio($('roll-mode'), st.roll, function (id) { st.roll = id; render(); });
    radio($('cmp-on'), st.cmp, function (id) { st.cmp = id; render(); });
    radio($('sunit'), st.sunit, function (id) {
      var v = numIn(st.speed);
      if (isFinite(v)) { v = id === 'kmh' && st.sunit === 'mph' ? G.toKmh(v) : id === 'mph' && st.sunit === 'kmh' ? G.toMph(v) : v; st.speed = String(Math.round(v * 10) / 10); $('speed').value = st.speed; }
      st.sunit = id; render();
    });
    paintFdChips('fdq', st.fd); paintFdChips('fdqB', st.fdB);
    $('cmp-body').hidden = st.cmp !== 'on';
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
    var ex = $('roll-extra'); ex.hidden = st.roll === 'unloaded';
    if (st.roll === 'factor') { $('roll-val-lbl').textContent = 'Rolling factor (effective ÷ unloaded diameter)'; $('roll-val').value = st.rollFactor; $('roll-hint').textContent = o.rollErr || 'Enter your own measured or published factor, between 0.80 and 1.05. GearCalc has no built-in default.'; }
    if (st.roll === 'loaded') { $('roll-val-lbl').textContent = 'Loaded radius (inches, axle centre to ground)'; $('roll-val').value = st.rollRadius; $('roll-hint').textContent = o.rollErr || 'The effective diameter is 2 × the loaded radius.'; }
    $('roll-hint').classList.toggle('err', !!o.rollErr);
    paintRatioState('A', o.ratios, o.ratioErr);
    $('dt-msg').textContent = o.errs.join(' · ');
    var auto = st.preset !== 'custom' && presetById(st.preset).type === 'auto';
    $('slip-hint').classList.toggle('hl', auto && !(o.slip > 0));
    // B
    if (o.B) {
      var bt = o.B.tire, own = o.B.ownTire;
      $('tireB-field').classList.toggle('bad', own && !bt.ok);
      $('tireB-kind').textContent = own && bt.ok ? f(bt.diameter, 3) + ' in' : (own ? '' : 'same');
      $('tireB-msg').textContent = own && !bt.ok ? bt.error : ''; $('tireB-msg').className = 'in-msg' + (own && !bt.ok ? ' err' : '');
      paintRatioState('B', o.B.ratios, o.B.ratioErr);
      $('cmp-msg').textContent = o.B.errs.filter(function (e) { return e.indexOf('B tire') !== 0; }).join(' · ');
    }
    renderResults(o);
    renderCompareTable(o);
    renderChart(o);
  }

  function spd(m) { return st.sunit === 'kmh' ? f(G.toKmh(m), 1) + ' km/h' : f(m, 1) + ' mph'; }
  function alt(m) { return st.sunit === 'kmh' ? f(m, 1) + ' mph' : f(G.toKmh(m), 1) + ' km/h'; }
  function renderResults(o) {
    var box = $('gear-cards'); box.innerHTML = '';
    var u = st.sunit === 'kmh' ? 'km/h' : 'mph';
    if (!o.ok) { $('res-sub').textContent = 'Fix the inputs above to see results'; return; }
    $('res-sub').textContent = 'D ' + f(o.dia, 3) + ' in · FD ' + o.fd.toFixed(2) + (o.red !== 1 ? ' · reduction ×' + o.red.toFixed(3) : '') + ' · slip ' + o.slip + '% · redline ' + f(o.redline, 0);
    o.rows.forEach(function (r) {
      var c = document.createElement('article'); c.className = 'g-card';
      var over = r.rpmAtSpeed > o.redline;
      c.innerHTML =
        '<header class="g-h"><span class="g-n">' + ORD[r.gear - 1] + '</span><span class="g-r mono">' + fmtRatio(r.ratio) + '</span><span class="g-o mono">' + (o.red !== 1 ? '× ' + o.red.toFixed(3) + ' ' : '') + '× FD = ' + f(r.overall, 3) + '</span></header>' +
        '<dl class="g-dl">' +
        '<div><dt>@ ' + f(o.rpm, 0) + ' rpm</dt><dd class="mono">' + spd(r.mphAtRpm) + '<small>' + alt(r.mphAtRpm) + '</small></dd></div>' +
        '<div><dt>@ ' + (st.sunit === 'kmh' ? f(G.toKmh(o.speedMph), 0) : f(o.speedMph, 0)) + ' ' + u + '</dt><dd class="mono' + (over ? ' over' : '') + '">' + f(r.rpmAtSpeed, 0) + ' rpm<small>' + (over ? 'above redline' : 'engine speed') + '</small></dd></div>' +
        '<div><dt>Top @ redline</dt><dd class="mono top">' + spd(r.topMph) + '<small>' + alt(r.topMph) + '</small></dd></div>' +
        '<div><dt>' + (r.landRpm ? 'Shift → ' + ORD[r.gear] : 'Last gear') + '</dt><dd class="mono">' + (r.landRpm ? 'lands ' + f(r.landRpm, 0) + '<small>drop ' + f(r.drop, 0) + ' rpm · step ' + f(r.step, 3) + '</small>' : '—<small>no further shift</small>') + '</dd></div>' +
        '</dl>';
      box.appendChild(c);
    });
  }

  function renderCompareTable(o) {
    var card = $('cmp-table-card'), tbl = $('cmp-tbl');
    card.hidden = !(st.cmp === 'on');
    if (card.hidden) return;
    if (!o.ok || !o.B || !o.B.ok) { tbl.innerHTML = ''; $('cmpt-sub').textContent = 'Fix setup A and B inputs to compare'; return; }
    var A = o.rows, B = o.B.rows, n = Math.max(A.length, B.length), u = st.sunit === 'kmh' ? 'km/h' : 'mph';
    var sv = function (m) { return st.sunit === 'kmh' ? G.toKmh(m) : m; };
    $('cmpt-sub').textContent = 'A: FD ' + o.fd.toFixed(2) + ' · B: FD ' + o.B.fd.toFixed(2) + (o.B.ownTire ? ' · B tire ' + f(o.B.dia, 2) + ' in' : '');
    var qs = st.sunit === 'kmh' ? f(G.toKmh(o.speedMph), 0) : f(o.speedMph, 0);
    var two = function (x, y, d) { return '<td><span class="cA">' + x + '</span><span class="cB">' + y + '</span>' + (d != null ? '<span class="cD">' + d + '</span>' : '') + '</td>'; };
    var h = '<thead><tr><th>Gear</th><th>Overall</th><th>Top ' + u + '</th><th>RPM @ ' + qs + '</th><th>Shift drop</th></tr></thead><tbody>';
    for (var i = 0; i < n; i++) {
      var a = A[i], b = B[i];
      h += '<tr><th>' + ORD[i] + '</th>' +
        two(a ? f(a.overall, 2) : '—', b ? f(b.overall, 2) : '—') +
        two(a ? f(sv(a.topMph), 1) : '—', b ? f(sv(b.topMph), 1) : '—', a && b ? 'Δ ' + sg(sv(b.topMph) - sv(a.topMph), 1) : null) +
        two(a ? f(a.rpmAtSpeed, 0) : '—', b ? f(b.rpmAtSpeed, 0) : '—', a && b ? 'Δ ' + sg(b.rpmAtSpeed - a.rpmAtSpeed, 0) : null) +
        two(a && a.drop != null ? f(a.drop, 0) : '—', b && b.drop != null ? f(b.drop, 0) : '—') + '</tr>';
    }
    tbl.innerHTML = '<caption>Each cell: <b class="cA">A</b> on top, <b class="cB">B</b> below, Δ = B − A. Top speed at redline ' + f(o.redline, 0) + ' rpm; RPM at ' + qs + ' ' + u + '; RPM drop on the upshift out of that gear.</caption>' + h + '</tbody>';
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
    var showB = st.cmp === 'on' && o.B && o.B.ok;
    $('chart-legend').hidden = !showB;
    if (!o.ok || !o.rows) { el('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'c-empty' }, 'Fix the inputs to draw the chart'); return; }
    var kmh = st.sunit === 'kmh', cv = function (m) { return kmh ? G.toKmh(m) : m; };
    var rows = o.rows, vmax = cv(rows[rows.length - 1].topMph);
    if (showB) vmax = Math.max(vmax, cv(o.B.rows[o.B.rows.length - 1].topMph));
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
    el('line', { x1: L, x2: L + pw, y1: Y(o.redline), y2: Y(o.redline), class: 'c-red' });
    el('text', { x: L + pw - 4, y: T + 12, 'text-anchor': 'end', class: 'c-red-t' }, 'Redline ' + Math.round(o.redline) + ' rpm');
    function saw(rs, cls, labels) {
      rs.forEach(function (g) { el('line', { x1: X(0), y1: Y(0), x2: X(cv(g.topMph)), y2: Y(o.redline), class: cls === 'A' ? 'c-gear' : 'c-gear-b' }); });
      var d = 'M' + X(0) + ' ' + Y(0), prevV = 0;
      rs.forEach(function (g, i) {
        var vTop = cv(g.topMph);
        d += ' L' + X(vTop) + ' ' + Y(o.redline);
        if (labels) { var mx = i ? (prevV + vTop) / 2 : vTop * 0.82; el('text', { x: X(mx), y: Y(o.redline) - 9, 'text-anchor': 'middle', class: 'c-gl' }, W < 560 ? String(i + 1) : ORD[i]); }
        if (g.landRpm) {
          d += ' L' + X(vTop) + ' ' + Y(g.landRpm);
          el('line', { x1: X(vTop), x2: X(vTop), y1: Y(o.redline), y2: Y(g.landRpm), class: cls === 'A' ? 'c-drop' : 'c-drop-b' });
          if (cls === 'A') el('text', { x: X(vTop) + 4, y: Y(g.landRpm) + 14, class: 'c-drop-t' }, '−' + Math.round(g.drop));
          prevV = vTop;
        }
      });
      el('path', cls === 'A' ? { d: d, class: 'c-saw', filter: 'url(#glow)' } : { d: d, class: 'c-saw-b' });
      rs.forEach(function (g) { el('circle', { cx: X(cv(g.topMph)), cy: Y(o.redline), r: cls === 'A' ? 3.5 : 3, class: cls === 'A' ? 'c-dot' : 'c-dot-b' }); });
    }
    if (showB) saw(o.B.rows, 'B', false);
    saw(rows, 'A', true);
    var q = cv(o.speedMph);
    if (q > 0 && q <= xMax) {
      el('line', { x1: X(q), x2: X(q), y1: T, y2: T + ph, class: 'c-q' });
      el('text', { x: X(q) + 4, y: T + ph - 6, class: 'c-q-t' }, Math.round(q) + ' ' + (kmh ? 'km/h' : 'mph'));
      rows.forEach(function (g) { if (g.rpmAtSpeed <= yMax) el('circle', { cx: X(q), cy: Y(g.rpmAtSpeed), r: 3, class: 'c-qdot' }); });
      if (showB) o.B.rows.forEach(function (g) { if (g.rpmAtSpeed <= yMax) el('circle', { cx: X(q), cy: Y(g.rpmAtSpeed), r: 2.6, class: 'c-qdot-b' }); });
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
    var dec = { fd: 2, fdB: 2, 'roll-val': 3, slip: 1, speed: 0, rpm: 0, redline: 0 }[id];
    if (!isFinite(v)) v = id === 'roll-val' ? (st.roll === 'factor' ? 1 : 12) : 0;
    v = Math.max(0, Math.round((v + dir * s) / s) * s);
    inp.value = v.toFixed(dec);
    inp.dispatchEvent(new Event('input'));
  }
  function init() {
    load();
    ['A', 'B'].forEach(function (sd) { buildPresets(sd); buildGearCount(sd); buildRatios(sd); });
    buildSources();
    $('tire').value = st.tire; $('tireB').value = st.tireB;
    ['fd', 'fdB', 'redline', 'slip', 'rpm', 'speed'].forEach(function (id) { $(id).value = st[id]; $(id).addEventListener('input', function () { st[id] = this.value; render(); }); });
    $('tire').addEventListener('input', function () { st.tire = this.value; render(); });
    $('tireB').addEventListener('input', function () { st.tireB = this.value; render(); });
    $('roll-val').addEventListener('input', function () { if (st.roll === 'factor') st.rollFactor = this.value; else st.rollRadius = this.value; render(); });
    Array.prototype.forEach.call(document.querySelectorAll('#tire-ex .chip-btn'), function (b) {
      b.addEventListener('click', function () { st.tire = b.dataset.v; $('tire').value = st.tire; render(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.fdq'), function (row) {
      Array.prototype.forEach.call(row.querySelectorAll('.fd-chip'), function (b) {
        b.addEventListener('click', function () { var id = row.dataset.for; $(id).value = b.dataset.v; st[id] = b.dataset.v; render(); });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.step'), function (b) { b.addEventListener('click', function () { stepField(b.dataset.for, +b.dataset.step); }); });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { renderChart(readAll()); }, 80); });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

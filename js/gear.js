/*
 * GearCalc — gearing math and tire-size parser. Created by Jorge Guerra.
 * Plain script: defines global GearLib (+ CommonJS guard for node tests).
 *
 * Exact constants:
 *   1 mile = 5280 ft × 12 in = 63 360 in (exact, international mile)
 *   1 hour = 60 min (exact)
 *   1 inch = 25.4 mm (exact, international inch)
 *   1 mile = 1.609344 km (exact)
 *
 * Speed from engine RPM:
 *   wheel rev/min   = RPM / (gear × FD)
 *   inches/min      = wheel rev/min × π × D
 *   mph             = inches/min × 60 / 63360
 *                   = RPM × D × π / (gear × FD × 1056)      (63360 / 60 = 1056 exactly)
 * Converter slip s (fraction): vehicle speed = no-slip speed × (1 − s);
 *   equivalently engine RPM at a given speed = no-slip RPM / (1 − s).
 * D is the UNLOADED (nominal) tire diameter unless the user applies a rolling-radius
 * factor or enters a loaded radius; under load the effective rolling diameter is smaller.
 */
(function (root) {
  'use strict';
  var IN_PER_MILE = 63360;      // exact
  var MIN_PER_HOUR = 60;        // exact
  var K = IN_PER_MILE / MIN_PER_HOUR; // 1056 exactly
  var MM_PER_IN = 25.4;         // exact
  var KM_PER_MI = 1.609344;     // exact

  function num(x) { return typeof x === 'number' && isFinite(x); }
  function slipFactor(slipPct) { var s = (slipPct || 0) / 100; if (!(s >= 0 && s < 1)) throw new Error('Slip must be 0–99.9 %'); return 1 - s; }

  function mph(rpm, dia, gear, fd, slipPct) {
    return rpm * dia * Math.PI / (gear * fd * K) * slipFactor(slipPct);
  }
  function rpmAt(speedMph, dia, gear, fd, slipPct) {
    return speedMph * gear * fd * K / (dia * Math.PI) / slipFactor(slipPct);
  }
  function revsPerMile(dia) { return IN_PER_MILE / (Math.PI * dia); }
  function dropRpm(redline, current, next) { return redline * next / current; }
  function toKmh(m) { return m * KM_PER_MI; }
  function toMph(k) { return k / KM_PER_MI; }

  // ---------------------------------------------------------------- tire parser
  // Returns { ok:true, kind, diameter, ... } or { ok:false, error }.
  function parseTire(raw) {
    var s = String(raw == null ? '' : raw).trim().toUpperCase().replace(/\s+/g, ' ').replace(/[×*]/g, 'X').replace(/″|”|''/g, '"');
    if (!s) return { ok: false, error: 'Enter a tire size' };
    var m;
    // Metric (ISO / P-metric / LT-metric): [P|LT|ST|T] 315/35 [Z]R 17 [load/speed] [LT|XL]
    m = /^(P|LT|ST|T)?\s?(\d{3})\s?\/\s?(\d{2}(?:\.\d)?)\s?(ZR|R|RF|D|B|-)?\s?(\d{2}(?:\.\d)?)(?:\s?(?:\d{2,3}(?:\/\d{2,3})?\s?[A-Z]{1,2}|XL|LT|C|RF|RFT|SL))*$/.exec(s);
    if (m) {
      var sec = +m[2], asp = +m[3], rim = +m[5];
      if (sec < 105 || sec > 455) return { ok: false, error: 'Section width ' + sec + ' mm is outside 105–455 mm' };
      if (asp < 20 || asp > 95) return { ok: false, error: 'Aspect ratio ' + asp + ' is outside 20–95' };
      if (rim < 10 || rim > 30) return { ok: false, error: 'Rim ' + rim + ' in is outside 10–30 in' };
      var sidewall = sec * asp / 100 / MM_PER_IN;
      return { ok: true, kind: 'metric', prefix: m[1] || '', section: sec, aspect: asp, rim: rim, sidewall: sidewall,
               diameter: rim + 2 * sidewall, widthIn: sec / MM_PER_IN, label: (m[1] || '') + sec + '/' + asp + 'R' + rim };
    }
    // Flotation: 28x10.5R15, 28x10.50R15LT, 33X12.50R20LT, 35x12.50-15
    m = /^(\d{2}(?:\.\d{1,2})?)\s?X\s?(\d{1,2}(?:\.\d{1,2})?)\s?(R|-|D|B)?\s?(\d{2}(?:\.\d)?)(?:\s?(?:LT|C|\d{2,3}[A-Z]{1,2}))*$/.exec(s);
    if (m) {
      var d = +m[1], w = +m[2], r = +m[4];
      if (r < 10 || r > 30) return { ok: false, error: 'Rim ' + r + ' in is outside 10–30 in' };
      if (d <= r + 2) return { ok: false, error: 'Diameter ' + d + ' in is not larger than the ' + r + ' in rim' };
      if (d > 60) return { ok: false, error: 'Diameter ' + d + ' in is over 60 in' };
      if (w < 5 || w > 25) return { ok: false, error: 'Width ' + w + ' in is outside 5–25 in' };
      return { ok: true, kind: 'flotation', diameter: d, widthIn: w, rim: r, label: m[1] + 'x' + m[2] + (m[3] === '-' ? '-' : 'R') + m[4] };
    }
    // Direct diameter: 26, 26.0 in, 26", 660 mm
    m = /^(\d{1,3}(?:\.\d+)?)\s?(IN|INCH|INCHES|"|MM)?$/.exec(s);
    if (m) {
      var v = +m[1], unit = m[2] === 'MM' ? 'mm' : 'in';
      var dIn = unit === 'mm' ? v / MM_PER_IN : v;
      if (!(dIn >= 10 && dIn <= 60)) return { ok: false, error: 'Diameter must be 10–60 in (254–1524 mm)' };
      return { ok: true, kind: 'diameter', diameter: dIn, entered: v, unit: unit, label: unit === 'mm' ? v + ' mm' : v + ' in' };
    }
    return { ok: false, error: 'Unrecognized size — try 315/35R17, LT285/70R17, 28x10.5R15 or 26.0 in' };
  }

  // Effective diameter after the optional rolling correction.
  // mode: 'unloaded' | 'factor' (D × f) | 'loaded' (2 × loaded radius in inches)
  function effectiveDiameter(unloaded, mode, value) {
    if (mode === 'factor') { if (!(value >= 0.8 && value <= 1.05)) throw new Error('Rolling factor must be 0.80–1.05'); return unloaded * value; }
    if (mode === 'loaded') { if (!(value > 4 && value * 2 <= unloaded * 1.05)) throw new Error('Loaded radius must be > 4 in and ≤ about half the diameter'); return 2 * value; }
    return unloaded;
  }

  function validateRatios(r) {
    if (!Array.isArray(r) || r.length < 3 || r.length > 10) return 'Use 3 to 10 forward gears';
    for (var i = 0; i < r.length; i++) {
      if (!num(r[i]) || r[i] < 0.3 || r[i] > 8) return 'Gear ' + (i + 1) + ' must be 0.30–8.00';
      if (i && !(r[i] < r[i - 1])) return 'Gear ' + (i + 1) + ' must be numerically lower than gear ' + i;
    }
    return null;
  }

  // Full per-gear table.
  function table(o) {
    var rows = [];
    for (var i = 0; i < o.ratios.length; i++) {
      var g = o.ratios[i], next = o.ratios[i + 1];
      var top = mph(o.redline, o.dia, g, o.fd, o.slip);
      rows.push({
        gear: i + 1, ratio: g, overall: g * o.fd,
        mphAtRpm: mph(o.rpm, o.dia, g, o.fd, o.slip),
        rpmAtSpeed: rpmAt(o.speed, o.dia, g, o.fd, o.slip),
        topMph: top,
        landRpm: next ? dropRpm(o.redline, g, next) : null,
        drop: next ? o.redline - dropRpm(o.redline, g, next) : null,
        step: next ? g / next : null
      });
    }
    return rows;
  }

  var lib = { K: K, IN_PER_MILE: IN_PER_MILE, MM_PER_IN: MM_PER_IN, KM_PER_MI: KM_PER_MI,
    mph: mph, rpmAt: rpmAt, revsPerMile: revsPerMile, dropRpm: dropRpm, toKmh: toKmh, toMph: toMph,
    parseTire: parseTire, effectiveDiameter: effectiveDiameter, validateRatios: validateRatios, table: table, slipFactor: slipFactor };
  root.GearLib = lib;
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
})(typeof window !== 'undefined' ? window : this);

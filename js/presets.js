/*
 * GearCalc — transmission preset data. Created by Jorge Guerra.
 * RULE: no invented data. Every ratio set below was read from the cited
 * publication (retrieved Nov 10, 2026). Ratios are copied exactly as published
 * (3 decimals where the source gives 3, 2 where it gives 2). Anything that could
 * not be verified is left out (see GEAR_PRESETS_EXCLUDED).
 * Plain script: defines global GEAR_PRESETS (+ CommonJS guard for node tests).
 */
(function (root) {
  'use strict';
  var SRC = {
    TREMEC_BLOG: { title: 'TREMEC — "TREMEC Aftermarket Manual Transmission Gear Ratios" (TREMEC Blog, P. Hill, Mar 11 2025)', url: 'https://tremec-blog.com/tremec-aftermarket-manual-transmission-gear-ratios/' },
    TREMEC_TKX: { title: 'TREMEC — TKX 5-Speed Service Manual (04.05.2021), model / gear-ratio table', url: 'https://tremec.com/wp-content/uploads/2023/05/TKX-Service-Manual-1.pdf' },
    TREMEC_TR6060: { title: 'TREMEC — TR-6060 6-Speed RWD Manual Transmission product sheet (F-TR6060-0519), "Available Gear Ratios"', url: 'https://tremec.com/wp-content/uploads/2023/05/Product.Sheet_TR-6060.pdf' },
    FORD_MUSTANG11: { title: 'Ford Motor Co. — 2011 Ford Mustang GT 5.0L Technical Specifications (Ford media document; copy hosted by StangNet)', url: 'https://stangnet.com/wp-content/uploads/2009/12/09_2011_Mustang_GT_Tech_Specs_EMB-1.pdf' },
    FORD_10R80: { title: 'Ford Component Sales — 10R80 10-Speed Automatic Transmission spec sheet (fcs-10r80-10-speed-autotrans-web-r3)', url: 'https://www.fordcomponentsalesllc.com/wp-content/uploads/2021/09/fcs-10r80-10-speed-autotrans-web-r3.pdf' },
    GM_6L80: { title: 'GM Service Bulletin #05-07-30-023 "New Product Announcement — Hydra-Matic 6L80" (Sep 2 2005), Transmission General Specifications (copy hosted by cadillacvnet.com)', url: 'https://www.cadillacvnet.com/tech-center/sts-v/2006/product_announcement_hydra_matic_6l80.pdf' },
    GM_8L90: { title: 'GM Powered Solutions — 8L90 8-Speed Automatic Transmission, Features & Specifications', url: 'https://poweredsolutions.gm.com/products/transmissions/8l90-8-speed-transmission' },
    GM_10L80: { title: 'GM Service Information — 10L80 (MHS/MQC) Transmission General Specifications, 2022 Cadillac Escalade (copy hosted by lemon-manuals.la)', url: 'https://lemon-manuals.la/Cadillac/2022/Escalade%20Premium%20Luxury%2C%206.2L%20Eng%20VIN%20L%2C%204WD/Repair%20and%20Diagnosis/Transmission/Automatic%20Trans/Automatic%20Transmission%20-%2010L80%20%28MHS%20MQC%29%20-%20Specifications/Specifications/Transmission%20General%20Specifications/' },
    GM_4L60E: { title: 'GM Service Information — Transmission General Specifications (Hydra-Matic 4L60-E), 2004 GMC Sierra Denali (copy hosted by gm.saturn.team)', url: 'https://gm.saturn.team/GMC_Truck/GMC_Sierra_Denali/2004/30/5/2820/6905' },
    GM_4L80E: { title: 'GM Service Information — Transmission General Specifications (Hydra-Matic 4L80-E), 2002 Unit Repair (copy hosted by gm.saturn.team)', url: 'https://gm.saturn.team/Generic/Unit_Repair/2002/15/5/1992/7234' },
    TCI: { title: 'TCI Automotive — "TCI Transmission Gearing Ratios" chart (OEM rows)', url: 'https://www.tciauto.com/gear-ratios' },
    TCI_PG: { title: 'TCI Automotive — "TCI Transmission Gearing Ratios" chart, Powerglide (OEM) rows, plus the "Powerglide Planetary Low Gear Ratios" tooth-count table', url: 'https://www.tciauto.com/gear-ratios' },
    GM_C5_2001: { title: 'GM — The 2001 Corvette Sourcebook (press kit), "Manual Transmission Upgrades", Gear Ratio Comparison, LS1 & MM6 column (copy hosted by indovina.us)', url: 'https://indovina.us/~mai/corvette/z06_pow_trans.htm' },
    HOTROD_98: { title: 'HOT ROD magazine, "Rapid Transit Authorities" (Sep 1998), technical specifications, \'98 Camaro Z28: "Stock Borg-Warner T-56 six-speed manual"', url: 'https://www.hotrod.com/features/rapid-transit-authorities-982-1655-74-1' },
    TD_T56_04: { title: 'Transmission Digest, M. Weinberg, "Six-Speed Solutions" (May 2004), "LS1 (MM6) ratios"', url: 'https://www.transmissiondigest.com/six-speed-solutions/' },
    TREMEC_CAT20: { title: 'TREMEC — Performance Product Catalog F_TRMC_0220_V1, TKO 5-speed "Available Models" table', url: 'https://tremec.com/wp-content/uploads/2023/05/Performance-Product-Catalog-F_TRMC_0220_V1.pdf' },
    TREMEC_TKO11: { title: 'TREMEC — TKO product sheet TRPM-TKO-0711, gear-ratio table', url: 'https://tremec.com/wp-content/uploads/2023/05/TRPM-TKO-0711_145.pdf' },
    HONDA_S2K04: { title: 'Honda (hondanews.com) — "2004 Honda S2000 – Powertrain" (Oct 1 2003), Transmission Gear Ratios table with 2004 and 2003 columns and the note "Net gear ratio change occurs through modification of the secondary gear reduction ratio inside the transmission"', url: 'https://hondanews.com/en-US/releases/release-4f6f0a361216ba882f335c004c34c4b2-2004-honda-s2000-powertrain' },
    HONDA_JP01: { title: 'Honda Japan — S2000 (model ended Aug 2001) 主要諸元: 変速比 and 減速比（1次/2次）1.160/4.100', url: 'https://www.honda.co.jp/auto-archive/s2000/2001/shogen.html' },
    FCA_RAM17: { title: 'FCA Canada — 2017 Ram 1500 Canadian Specifications, "Transmission: TorqueFlite 8HP70 Eight-Speed Automatic"', url: 'https://www.fcapresskit.ca/2017/Contents/Text/PDFs/Ram/1500/CN_2017_RAM_1500_SP.pdf' }
  };

  // group: display group; type: 'manual' | 'auto' (auto enables the converter-slip hint)
  var P = [
    // ---- TREMEC aftermarket manuals
    { id: 't56m-266', name: 'T56 Magnum 2.66', group: 'TREMEC manual', type: 'manual', ratios: [2.66, 1.78, 1.30, 1.00, 0.80, 0.63], note: 'TUET11009 (GM) / TUET11010 (Ford)', src: ['TREMEC_BLOG'] },
    { id: 't56m-297-80', name: 'T56 Magnum 2.97 / 0.80', group: 'TREMEC manual', type: 'manual', ratios: [2.97, 2.10, 1.46, 1.00, 0.80, 0.63], note: 'TUET16885 (GM) / TUET16884 (Ford)', src: ['TREMEC_BLOG'] },
    { id: 't56m-297-74', name: 'T56 Magnum 2.97 / 0.74', group: 'TREMEC manual', type: 'manual', ratios: [2.97, 2.10, 1.46, 1.00, 0.74, 0.50], note: 'TUET11012 (GM) / TUET11011 (Ford)', src: ['TREMEC_BLOG'] },
    { id: 'tkx-287-81', name: 'TKX 2.87 / 0.81', group: 'TREMEC manual', type: 'manual', ratios: [2.87, 1.89, 1.28, 1.00, 0.81], note: 'TCET17722 (GM) / TCET18084 (Ford)', src: ['TREMEC_TKX', 'TREMEC_BLOG'] },
    { id: 'tkx-287-68', name: 'TKX 2.87 / 0.68', group: 'TREMEC manual', type: 'manual', ratios: [2.87, 1.89, 1.28, 1.00, 0.68], note: 'TCET17805 (GM) / TCET17765 (Ford)', src: ['TREMEC_TKX', 'TREMEC_BLOG'] },
    { id: 'tkx-327', name: 'TKX 3.27', group: 'TREMEC manual', type: 'manual', ratios: [3.27, 1.98, 1.34, 1.00, 0.72], note: 'TCET18083 (GM) / TCET18085, TCET18086 (Ford)', src: ['TREMEC_TKX', 'TREMEC_BLOG'] },
    { id: 'tko500', name: 'TKO 500', group: 'TREMEC manual', type: 'manual', ratios: [3.27, 1.98, 1.34, 1.00, 0.68], note: 'TCET4615 / TCET4616 / TCET5201. TREMEC’s 2020 catalog lists 2nd as 1.98; the older 2011 TKO sheet lists 1.97. The newer catalog value is used.', src: ['TREMEC_CAT20', 'TREMEC_TKO11'] },
    { id: 'tko600-82', name: 'TKO 600 / 0.82', group: 'TREMEC manual', type: 'manual', ratios: [2.87, 1.89, 1.28, 1.00, 0.82], note: 'TCET4617 (Ford) / TCET4618 (GM)', src: ['TREMEC_CAT20', 'TREMEC_TKO11'] },
    { id: 'tko600-64', name: 'TKO 600 / 0.64', group: 'TREMEC manual', type: 'manual', ratios: [2.87, 1.89, 1.28, 1.00, 0.64], note: 'TCET5008 (Ford) / TCET5009 (GM)', src: ['TREMEC_CAT20', 'TREMEC_TKO11'] },
    { id: 't5', name: 'T-5 (Ford)', group: 'TREMEC manual', type: 'manual', ratios: [2.95, 1.94, 1.34, 1.00, 0.63], note: 'TREMEC aftermarket T-5, Ford 10-spline', src: ['TREMEC_BLOG'] },
    // ---- TR-6060 OEM applications (TREMEC product sheet)
    { id: 'tr6060-ss', name: 'TR-6060 Camaro SS', group: 'TR-6060 (OEM)', type: 'manual', ratios: [2.66, 1.78, 1.30, 1.00, 0.74, 0.50], note: 'Camaro SS column', src: ['TREMEC_TR6060'] },
    { id: 'tr6060-cts', name: 'TR-6060 CTS-V / ATS-V', group: 'TR-6060 (OEM)', type: 'manual', ratios: [2.66, 1.78, 1.30, 1.00, 0.80, 0.63], note: 'Cadillac CTS-V and ATS-V columns (identical)', src: ['TREMEC_TR6060'] },
    { id: 'tr6060-zl1', name: 'TR-6060 Camaro ZL1', group: 'TR-6060 (OEM)', type: 'manual', ratios: [2.29, 1.63, 1.21, 1.00, 0.82, 0.54], note: 'Camaro ZL1 column', src: ['TREMEC_TR6060'] },
    { id: 'tr6060-1le', name: 'TR-6060 ZL1 1LE', group: 'TR-6060 (OEM)', type: 'manual', ratios: [2.29, 1.63, 1.21, 1.00, 0.82, 0.68], note: 'Camaro ZL1 / 1LE column', src: ['TREMEC_TR6060'] },
    { id: 'tr6060-hellcat', name: 'TR-6060 Challenger Hellcat', group: 'TR-6060 (OEM)', type: 'manual', ratios: [2.26, 1.58, 1.19, 1.00, 0.77, 0.63], note: 'Challenger Hellcat column', src: ['TREMEC_TR6060'] },
    // ---- other OEM manual
    { id: 't56-ls1', name: 'T56 LS1 (’98–02 F-body, C5)', group: 'OEM manual', type: 'manual', ratios: [2.66, 1.78, 1.30, 1.00, 0.74, 0.50], note: 'Factory MM6/MN6 T56 behind the LS1: 1998–2002 Camaro Z28/SS and Firebird Formula/Trans Am, and the C5 Corvette (not the Z06 M12). The GM 2001 Corvette Sourcebook gives the C5 set. HOT ROD (stock ’98 Z28) and Transmission Digest ("LS1 (MM6)") give the same numbers.', src: ['GM_C5_2001', 'HOTROD_98', 'TD_T56_04'] },
    { id: 's2000-ap1', name: 'Honda S2000 2.0 L (2000–03)', group: 'OEM manual', type: 'manual', ratios: [3.133, 2.045, 1.481, 1.161, 0.970, 0.810], reduction: 1.160, note: 'Honda lists the gearbox ratios plus an in-box reduction of 1.160 that multiplies every gear (factory final drive 4.100). Honda’s 2003 column and the Honda Japan 2001 sheet give 5th/6th as 0.970/0.810; Honda’s US 2001/2003 spec sheets print 0.971/0.811.', src: ['HONDA_S2K04', 'HONDA_JP01'] },
    { id: 's2000-04', name: 'Honda S2000 2.2 L (2004)', group: 'OEM manual', type: 'manual', ratios: [3.133, 2.045, 1.481, 1.161, 0.943, 0.763], reduction: 1.208, note: 'Same gearbox ratios for 1st–4th, with the in-box (secondary) reduction raised to 1.208 (factory final drive 4.100). Honda notes the net change comes from that reduction.', src: ['HONDA_S2K04'] },
    { id: 'mt82-11', name: 'Ford MT82 (2011 Mustang GT)', group: 'OEM manual', type: 'manual', ratios: [3.66, 2.43, 1.69, 1.32, 1.00, 0.65], note: '2011 Mustang GT 6-speed manual', src: ['FORD_MUSTANG11'] },
    // ---- GM automatics
    { id: 'pg-176', name: 'Powerglide 1.76', group: 'GM automatic', type: 'auto', ratios: [1.76, 1.00], note: 'TCI chart, Powerglide (OEM) 1.76 row', src: ['TCI_PG'] },
    { id: 'pg-182', name: 'Powerglide 1.82', group: 'GM automatic', type: 'auto', ratios: [1.82, 1.00], note: 'TCI chart, Powerglide (OEM) 1.82 row', src: ['TCI_PG'] },
    { id: 'th350', name: 'TH350', group: 'GM automatic', type: 'auto', ratios: [2.52, 1.52, 1.00], note: 'TCI chart, TH350 (OEM) row', src: ['TCI'] },
    { id: 'th400', name: 'TH400', group: 'GM automatic', type: 'auto', ratios: [2.48, 1.48, 1.00], note: 'TCI chart, TH400 (OEM) row', src: ['TCI'] },
    { id: '200-4r', name: '200-4R', group: 'GM automatic', type: 'auto', ratios: [2.78, 1.57, 1.00, 0.67], note: 'TCI chart, 200-4R (OEM) row', src: ['TCI'] },
    { id: '4l60e', name: '700R4 / 4L60E', group: 'GM automatic', type: 'auto', ratios: [3.059, 1.625, 1.000, 0.696], note: 'GM 3-decimal values; TCI lists 3.06 / 1.63 / 1.00 / 0.70 for TH700R4/4L60E/4L65E', src: ['GM_4L60E', 'TCI'] },
    { id: '4l80e', name: '4L80E', group: 'GM automatic', type: 'auto', ratios: [2.482, 1.482, 1.000, 0.750], note: 'GM 3-decimal values; TCI lists 2.48 / 1.48 / 1.00 / 0.75', src: ['GM_4L80E', 'TCI'] },
    { id: '6l80', name: '6L80', group: 'GM automatic', type: 'auto', ratios: [4.027, 2.364, 1.532, 1.152, 0.852, 0.667], note: 'RPO MYC', src: ['GM_6L80'] },
    { id: '8l90', name: '8L90', group: 'GM automatic', type: 'auto', ratios: [4.56, 2.97, 2.08, 1.69, 1.27, 1.00, 0.85, 0.65], note: 'N8X ratios', src: ['GM_8L90'] },
    { id: '10l80', name: '10L80 (GM)', group: 'GM automatic', type: 'auto', ratios: [4.696, 2.985, 2.156, 1.779, 1.526, 1.278, 1.000, 0.854, 0.689, 0.636], note: 'GM service values (differ slightly from Ford 10R80 in 3rd–6th)', src: ['GM_10L80'] },
    // ---- Ford automatics
    { id: 'c4c6', name: 'C4 / C6', group: 'Ford automatic', type: 'auto', ratios: [2.46, 1.46, 1.00], note: 'TCI chart, C4 (OEM) and C6 (OEM) rows (identical)', src: ['TCI'] },
    { id: 'aod', name: 'AOD', group: 'Ford automatic', type: 'auto', ratios: [2.40, 1.47, 1.00, 0.67], note: 'TCI chart, AOD (OEM) row', src: ['TCI'] },
    { id: '4r70w', name: 'AODE / 4R70W', group: 'Ford automatic', type: 'auto', ratios: [2.84, 1.55, 1.00, 0.70], note: 'TCI chart, AODE-W/4R70W (OEM) row', src: ['TCI'] },
    { id: '6r80', name: '6R80', group: 'Ford automatic', type: 'auto', ratios: [4.17, 2.34, 1.52, 1.14, 0.87, 0.69], note: '2011 Mustang GT 6-speed automatic', src: ['FORD_MUSTANG11'] },
    { id: '10r80', name: '10R80 (Ford)', group: 'Ford automatic', type: 'auto', ratios: [4.696, 2.985, 2.146, 1.769, 1.520, 1.275, 1.000, 0.854, 0.689, 0.636], note: 'Ford Component Sales values', src: ['FORD_10R80'] },
    // ---- Chrysler / ZF automatics
    { id: 'tf727', name: 'TF-727 / TF-904', group: 'Chrysler & ZF automatic', type: 'auto', ratios: [2.45, 1.45, 1.00], note: 'TCI chart, TF-904 (OEM) and TF-727 (OEM) rows (identical)', src: ['TCI'] },
    { id: 'a500', name: 'A-500 / 42RH', group: 'Chrysler & ZF automatic', type: 'auto', ratios: [2.74, 1.54, 1.00, 0.69], note: 'TCI chart, A-500/42RH (OEM) row', src: ['TCI'] },
    { id: 'a518', name: 'A-518 / 47RH', group: 'Chrysler & ZF automatic', type: 'auto', ratios: [2.45, 1.45, 1.00, 0.69], note: 'TCI chart, A-518/618/47RH (OEM) row', src: ['TCI'] },
    { id: '8hp70', name: 'ZF 8HP70 (TorqueFlite)', group: 'Chrysler & ZF automatic', type: 'auto', ratios: [4.71, 3.14, 2.10, 1.67, 1.29, 1.00, 0.84, 0.67], note: '2017 Ram 1500 TorqueFlite 8HP70', src: ['FCA_RAM17'] }
  ];

  var EXCLUDED = [
    { name: 'OEM T56, 1993 F-body (M28 / M29) and 1994–97 LT1', why: 'Only forum posts were found for these sets. No GM, TREMEC or magazine source was confirmed.' },
    { name: 'T56 M12 (C5 Z06)', why: 'Sources disagree on 5th/6th. GM’s 2001 Sourcebook gives 0.84 / 0.57, Transmission Digest gives 0.80 / 0.62, and other pages give 0.56.' },
    { name: 'TR-6060 2010–2011 Camaro SS', why: 'Published reports disagree (some list 2.66 first, some 3.01); the TREMEC sheet lists only the current Camaro SS set, which is included.' },
    { name: 'ZF 8HP45 / 8HP90 and other 8HP variants', why: 'Only the 8HP70 (TorqueFlite) set was confirmed from an OEM spec sheet.' },
    { name: 'Powerglide aftermarket ratios (1.58 / 1.65 / 1.80 / 1.92 / 1.98)', why: 'These are TCI’s own aftermarket gearsets, not factory ratios. Enter one as Custom if you run it.' },
    { name: 'Toyota manuals', why: 'No well-sourced OEM ratio table was confirmed this round.' }
  ];


  var lib = { presets: P, sources: SRC, excluded: EXCLUDED };
  root.GEAR_PRESETS = lib;
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
})(typeof window !== 'undefined' ? window : this);

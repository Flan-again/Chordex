const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const STRING_NAMES = ['6 (Low E)', '5 (A)', '4 (D)', '3 (G)', '2 (B)', '1 (High E)'];
const STANDARD_TUNING = [4, 9, 2, 7, 11, 4];
const MAX_FRET = 15;
const MAX_TUNING_OFFSET = 8;
const SAVED_TUNINGS_COOKIE = 'chordex_saved_tunings';

const SCALE_LIBRARY = {
  major: { label: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11], degrees: [0, 2, 4, 5, 7, 9, 11], degreeMap: [0, 2, 4, 5, 7, 9, 11], third: 4 },
  minor: { label: 'Minor', intervals: [0, 2, 3, 5, 7, 8, 10], degrees: [0, 2, 3, 5, 7, 8, 10], degreeMap: [0, 2, 3, 5, 7, 8, 10], third: 3 },
  harmonicMinor: { label: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11], degrees: [0, 2, 3, 5, 7, 8, 11], degreeMap: [0, 2, 3, 5, 7, 8, 11], third: 3 },
  melodicMinor: { label: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11], degrees: [0, 2, 3, 5, 7, 9, 11], degreeMap: [0, 2, 3, 5, 7, 9, 11], third: 3 },
  majorPentatonic: { label: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9], degrees: [0, 2, 4, 7, 9], degreeMap: [0, 2, 4, null, 7, 9, null], third: 4 },
  minorPentatonic: { label: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10], degrees: [0, 3, 5, 7, 10], degreeMap: [0, null, 3, 5, 7, null, 10], third: 3 },
  neutralPentatonic: { label: 'Neutral Pentatonic', intervals: [0, 2, 5, 7, 10], degrees: [0, 2, 5, 7, 10], degreeMap: [0, 2, null, 5, 7, null, 10], third: 4 },
  majorBlues: { label: 'Major Blues', intervals: [0, 2, 3, 4, 7, 9], degrees: [0, 2, 3, 4, 7, 9], third: 4 },
  minorBlues: { label: 'Minor Blues', intervals: [0, 3, 5, 6, 7, 10], degrees: [0, 3, 5, 6, 7, 10], third: 3 },
  mixolydian: { label: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], degrees: [0, 2, 4, 5, 7, 9, 10], third: 4 },
};

const DEGREE_LABELS = ['Root', '2nd', '3rd', '4th', '5th', '6th', '7th'];
const DEGREE_COLORS = ['#ff9f67', '#7ee081', '#72d5ff', '#d9b3ff', '#ffd66d', '#ff8ab4', '#8fa8ff'];
const REFERENCE_DEGREE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

const PRESETS = { 'E Standard': [0, 0, 0, 0, 0, 0], 'Drop D': [-2, 0, 0, 0, 0, 0], 'D Standard': [-2, -2, -2, -2, -2, -2], Custom: null };

const CHORD_FAMILY_OPTIONS = [
  { label: 'sus2', intervals: [0, 2, 7], suffix: 'sus2' },
  { label: 'minor', intervals: [0, 3, 7], suffix: 'm' },
  { label: 'major', intervals: [0, 4, 7], suffix: '' },
  { label: 'sus4', intervals: [0, 5, 7], suffix: 'sus4' },
  { label: 'fifth', intervals: [0, 7], suffix: '5' },
  { label: 'sixth', intervals: [0, 4, 7, 9], suffix: '6' },
  { label: 'min7', intervals: [0, 3, 7, 10], suffix: 'm7' },
  { label: '7', intervals: [0, 4, 7, 10], suffix: '7' },
  { label: 'maj7', intervals: [0, 4, 7, 11], suffix: 'maj7' },
];
const ADD_OPTIONS = [{ label: 'none', add: null }, { label: 'add9', add: 14 }, { label: 'add11', add: 17 }, { label: 'add13', add: 21 }];

const savedTunings = {};
const state = {
  offsets: [0, 0, 0, 0, 0, 0],
  activeStrings: [true, true, true, true, true, true],
  root: 0,
  scaleType: 'major',
  useFourNoteChords: false,
  chordMode: 'all',
  selectedSpecificRoot: 0,
  selectedSpecificQuality: 'major',
  selectedAdd: 'none',
  selectedLegend: new Set(),
  selectedScaleChord: null,
  inversionFilters: {},
  paging: {},
};

const els = {
  tuningControls: document.getElementById('tuningControls'), rootSelect: document.getElementById('rootSelect'), scaleSelect: document.getElementById('scaleSelect'),
  diagramGrid: document.getElementById('diagramGrid'), presetSelect: document.getElementById('presetSelect'),
  fretboardWrap: document.getElementById('fretboardWrap'), fretboardLegend: document.getElementById('fretboardLegend'), tuningNameInput: document.getElementById('tuningNameInput'),
  saveTuningBtn: document.getElementById('saveTuningBtn'), chordSizeSwitch: document.getElementById('chordSizeSwitch'), scaleChordButtons: document.getElementById('scaleChordButtons'),
  chordModeButtons: document.getElementById('chordModeButtons'), specificChordControls: document.getElementById('specificChordControls'),
};

const noteName = (pc) => NOTE_NAMES[(pc + 120) % 12];
const getTuningPitches = () => STANDARD_TUNING.map((pc, i) => (pc + state.offsets[i] + 120) % 12);

function setupSelects() {
  NOTE_NAMES.forEach((note, i) => {
    const o = document.createElement('option'); o.value = String(i); o.textContent = note; els.rootSelect.append(o);
  });
  Object.entries(SCALE_LIBRARY).forEach(([key, value]) => {
    const o = document.createElement('option'); o.value = key; o.textContent = value.label; els.scaleSelect.append(o);
  });
  els.rootSelect.value = String(state.root);
  els.scaleSelect.value = state.scaleType;
  els.rootSelect.addEventListener('change', () => { state.root = Number(els.rootSelect.value); state.selectedLegend = new Set(); state.selectedScaleChord = null; render(); });
  els.scaleSelect.addEventListener('change', () => { state.scaleType = els.scaleSelect.value; state.selectedLegend = new Set(); state.selectedScaleChord = null; render(); });
  els.chordSizeSwitch.addEventListener('change', () => { state.useFourNoteChords = els.chordSizeSwitch.checked; render(); });
}

function loadSavedTuningsFromCookie() { const entry = document.cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${SAVED_TUNINGS_COOKIE}=`)); if (!entry) return; try { Object.assign(savedTunings, JSON.parse(decodeURIComponent(entry.split('=')[1]))); } catch (_e) {} }
function writeSavedTuningsCookie() { document.cookie = `${SAVED_TUNINGS_COOKIE}=${encodeURIComponent(JSON.stringify(savedTunings))}; max-age=${60 * 60 * 24 * 365}; path=/; samesite=lax`; }
function syncPresetOptions() { const prev = els.presetSelect.value; els.presetSelect.innerHTML = ''; Object.keys(PRESETS).forEach((name) => { const o = document.createElement('option'); o.value = name; o.textContent = name; els.presetSelect.append(o); }); Object.keys(savedTunings).forEach((name) => { const o = document.createElement('option'); o.value = name; o.textContent = name; els.presetSelect.append(o); }); els.presetSelect.value = prev || 'E Standard'; }

function setupTuning() {
  syncPresetOptions();
  els.presetSelect.addEventListener('change', () => { const preset = PRESETS[els.presetSelect.value] || savedTunings[els.presetSelect.value]; if (!preset) return; state.offsets = [...preset]; render(); });
  els.saveTuningBtn.addEventListener('click', () => { const name = els.tuningNameInput.value.trim(); if (!name) return; savedTunings[name] = [...state.offsets]; writeSavedTuningsCookie(); syncPresetOptions(); els.presetSelect.value = name; els.tuningNameInput.value = ''; });
}

function formatOffset(offset) { if (offset === 0) return '±0 tones'; const sign = offset > 0 ? '+' : '-'; return `${sign}${(Math.abs(offset) / 2).toFixed((Math.abs(offset) % 2 === 0) ? 0 : 1)} tones`; }

function renderTuningControls() {
  const tuning = getTuningPitches(); els.tuningControls.innerHTML = '';
  STRING_NAMES.forEach((name, i) => {
    const row = document.createElement('div'); row.className = `string-row ${state.activeStrings[i] ? '' : 'inactive'}`;
    row.innerHTML = `<div class="string-label">${name}</div><div class="tuning-note">${noteName(tuning[i])}</div>`;
    const arrows = document.createElement('div'); arrows.className = 'tuning-arrows';
    [-1, 1].forEach((d) => { const b = document.createElement('button'); b.className = 'arrow-btn'; b.textContent = d < 0 ? '↓' : '↑'; b.disabled = state.offsets[i] <= -MAX_TUNING_OFFSET && d < 0 || state.offsets[i] >= MAX_TUNING_OFFSET && d > 0; b.onclick = () => { state.offsets[i] = Math.max(-MAX_TUNING_OFFSET, Math.min(MAX_TUNING_OFFSET, state.offsets[i] + d)); els.presetSelect.value = 'Custom'; render(); }; arrows.append(b); });
    const toggle = document.createElement('button'); toggle.className = `toggle-btn ${state.activeStrings[i] ? 'active' : ''}`; toggle.innerHTML = `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/>${state.activeStrings[i] ? '<path d="M6 10l3 3 5-6" fill="none" stroke="currentColor" stroke-width="2"/>' : ''}</svg>`;
    toggle.onclick = () => { state.activeStrings[i] = !state.activeStrings[i]; render(); };
    const value = document.createElement('div'); value.className = 'offset-value'; value.textContent = formatOffset(state.offsets[i]);
    row.append(arrows, toggle, value); els.tuningControls.append(row);
  });
}

function degreeLabelFromIndex(index) { return DEGREE_LABELS[index] || `${index + 1}th`; }

function getScalePcData() {
  const scale = SCALE_LIBRARY[state.scaleType];
  if (scale.degreeMap) {
    return REFERENCE_DEGREE_INTERVALS.map((_referenceInterval, degree) => {
      const interval = scale.degreeMap[degree];
      return {
        degree,
        interval,
        pc: interval == null ? null : (state.root + interval + 120) % 12,
        label: degreeLabelFromIndex(degree),
        color: DEGREE_COLORS[degree % DEGREE_COLORS.length],
        active: interval != null,
      };
    });
  }
  return scale.intervals.map((interval, i) => ({
    degree: i,
    interval,
    pc: (state.root + interval + 120) % 12,
    label: degreeLabelFromIndex(i),
    color: DEGREE_COLORS[i % DEGREE_COLORS.length],
    active: true,
  }));
}

function getScaleColorByPc() {
  return new Map(getScalePcData().filter((item) => item.active).map((item) => [item.pc, item.color]));
}

function renderLegend() {
  const pcs = getScalePcData();
  if (!state.selectedLegend.size) pcs.filter((item) => item.active).forEach((item) => state.selectedLegend.add(item.pc));
  els.fretboardLegend.innerHTML = '';
  pcs.forEach((item) => {
    const chip = document.createElement('button'); chip.className = `legend-item ${item.active && state.selectedLegend.has(item.pc) ? '' : 'off'} ${item.active ? '' : 'missing-degree'}`.trim();
    chip.disabled = !item.active;
    chip.innerHTML = `<span>${item.label}</span><span class="legend-dot" style="background:${item.active ? item.color : '#394269'};border:2px solid ${item.active ? item.color : '#57608f'};color:${item.active ? '#1a2140' : '#d4daf8'}">${item.active ? noteName(item.pc) : '—'}</span>`;
    chip.onclick = () => { if (state.selectedLegend.has(item.pc)) state.selectedLegend.delete(item.pc); else state.selectedLegend.add(item.pc); state.selectedScaleChord = null; renderFretboard(); renderLegend(); };
    els.fretboardLegend.append(chip);
  });
}

function scaleChords() {
  const scale = SCALE_LIBRARY[state.scaleType];
  return scale.degrees.map((iv, idx) => {
    const rootPc = (state.root + iv) % 12;
    const triad = [0, 2, 4, 6].slice(0, state.useFourNoteChords ? 4 : 3).map((jump) => scale.intervals[(idx + jump) % scale.intervals.length]);
    const rel = triad.map((v) => (v - iv + 12) % 12).sort((a, b) => a - b);
    const name = `${noteName(rootPc)}${rel.includes(3) ? 'm' : ''}${state.useFourNoteChords ? '7' : ''}`;
    const chordNotes = rel.map((interval) => noteName((rootPc + interval) % 12));
    return { roman: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][idx] || `${idx + 1}`, name, rootPc, intervals: rel, chordNotes };
  });
}

function renderScaleChordButtons() {
  els.scaleChordButtons.innerHTML = '';
  scaleChords().forEach((chord, idx) => {
    const b = document.createElement('button');
    b.textContent = `${chord.roman} ${chord.name}`;
    const isActive = state.selectedScaleChord === idx;
    b.className = `${isActive ? 'active' : ''} ${state.selectedScaleChord != null && !isActive ? 'dimmed' : ''}`.trim();
    b.onclick = () => {
      if (state.selectedScaleChord === idx) { state.selectedScaleChord = null; state.selectedLegend = new Set(getScalePcData().filter((i) => i.active).map((i) => i.pc)); }
      else { state.selectedScaleChord = idx; state.selectedLegend = new Set(chord.intervals.map((i) => (chord.rootPc + i) % 12)); }
      renderScaleChordButtons(); renderLegend(); renderFretboard();
    };
    els.scaleChordButtons.append(b);
  });
}

function renderFretboard() {
  const tuning = [...getTuningPitches()].reverse();
  const active = [...state.activeStrings].reverse();
  const colorByPc = getScaleColorByPc();
  const width = 1160; const height = 280; const left = 44; const top = 34; const fretSpacing = 68; const stringSpacing = 38;
  let svg = `<svg viewBox="0 0 ${width} ${height}">`;
  for (let s = 0; s < 6; s++) { const y = top + s * stringSpacing; svg += `<line x1="${left}" y1="${y}" x2="${left + fretSpacing * MAX_FRET}" y2="${y}" stroke="#9aa7e7" stroke-width="${(1 + s * .4).toFixed(2)}" opacity="${active[s] ? 1 : .28}"/>`; }
  for (let f = 0; f <= MAX_FRET; f++) { const x = left + f * fretSpacing; svg += `<line x1="${x}" y1="${top - 16}" x2="${x}" y2="${top + stringSpacing * 5 + 16}" stroke="#8392d9" stroke-width="${f === 0 ? 5 : 2}"/><text x="${x + 2}" y="18" fill="#c5ccf2" font-size="11">${f}</text>`; }
  const selectedScaleChordData = state.selectedScaleChord == null ? null : scaleChords()[state.selectedScaleChord];
  const selectedChordRootPc = selectedScaleChordData ? selectedScaleChordData.rootPc : null;
  tuning.forEach((openPc, s) => {
    const y = top + s * stringSpacing;
    for (let f = 0; f <= MAX_FRET; f++) {
      if (!active[s]) continue;
      const pc = (openPc + f) % 12;
      if (!state.selectedLegend.has(pc)) continue;
      const x = f === 0 ? left : left + (f - 0.5) * fretSpacing;
      const isOpenString = f === 0;
      const color = colorByPc.get(pc) || '#98bcff';
      const isSelectedChordRoot = selectedChordRootPc != null && pc === selectedChordRootPc;
      if (isSelectedChordRoot) {
        svg += `<circle cx="${x}" cy="${y}" r="${isOpenString ? 18 : 14}" fill="#ffffff" opacity="0.28"/>`;
      }
      if (isOpenString) {
        svg += `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="${color}" stroke-width="3"/>`;
      } else {
        svg += `<circle cx="${x}" cy="${y}" r="10" fill="${color}"/>`;
      }
    }
    svg += `<text x="16" y="${y + 4}" fill="#d2d9ff" opacity="${active[s] ? 1 : .38}" font-size="12">${noteName(openPc)}</text>`;
  });
  els.fretboardWrap.innerHTML = `${svg}</svg>`;
}

function inversionName(order) { return order === 0 ? 'Natural' : order === 1 ? 'First Inversion' : 'Second Inversion'; }
function inversionMatches(notes, rootPc, intervals, inversion) {
  const tones = intervals.slice(0, 3).map((i) => (rootPc + i) % 12);
  const low = notes[0];
  if (inversion === 0) return low === tones[0];
  if (inversion === 1) return low === tones[1];
  return low === tones[2];
}

function findVoicings(rootPc, intervals) {
  const tuning = getTuningPitches(); const chordSet = new Set(intervals.map((i) => (rootPc + i) % 12)); const results = [];
  const shape = new Array(6).fill(-1);
  const options = tuning.map((open, i) => {
    if (!state.activeStrings[i]) return [-1];
    const arr = [-1];
    for (let f = 0; f <= MAX_FRET; f++) if (chordSet.has((open + f) % 12)) arr.push(f);
    return arr;
  });
  const hasNoteInRange = (stringIndex, minFret, maxFret) => {
    for (let fret = minFret; fret <= maxFret; fret++) {
      if (chordSet.has((tuning[stringIndex] + fret) % 12)) return true;
    }
    return false;
  };
  function dfs(i) {
    if (i === 6) {
      const sounding = shape.map((f, s) => ({ f, s })).filter((x) => x.f >= 0);
      if (sounding.length < 3) return;
      const pcs = sounding.map(({ f, s }) => (tuning[s] + f) % 12);
      const uniq = new Set(pcs);
      if (![...uniq].every((pc) => chordSet.has(pc))) return;
      if (intervals.length >= 3 && uniq.size < 3) return;
      const fretted = sounding.map((x) => x.f).filter((f) => f > 0);
      if (fretted.length > 4) return;
      if (fretted.length && Math.max(...fretted) - Math.min(...fretted) + 1 > 4) return;
      const soundingStrings = sounding.map((x) => x.s);
      const lowestString = Math.min(...soundingStrings);
      const highestString = Math.max(...soundingStrings);
      const minWindowFret = fretted.length ? Math.max(0, Math.min(...fretted) - 1) : 0;
      const maxWindowFret = fretted.length ? Math.min(MAX_FRET, Math.max(...fretted) + 1) : 4;
      let innerMutedStrings = 0;
      for (let s = lowestString; s <= highestString; s++) {
        if (shape[s] === -1) {
          if (hasNoteInRange(s, minWindowFret, maxWindowFret)) return;
          innerMutedStrings += 1;
        }
      }
      for (let s = highestString + 1; s < 6; s++) {
        if (shape[s] !== -1 || !state.activeStrings[s]) break;
        if (chordSet.has(tuning[s])) return;
      }
      const lowest = pcs[0];
      const maxFret = fretted.length ? Math.max(...fretted) : 0;
      const minFret = fretted.length ? Math.min(...fretted) : 0;
      const openStrings = sounding.filter((x) => x.f === 0).length;
      const span = fretted.length ? maxFret - minFret + 1 : 0;
      const pcsKey = [...uniq].sort((a, b) => a - b).join('-');
      const fretSum = fretted.reduce((sum, fret) => sum + fret, 0);
      results.push({ frets: [...shape], lowest, minFret, maxFret, span, soundingCount: sounding.length, openStrings, innerMutedStrings, pcsKey, fretSum });
      return;
    }
    for (const f of options[i]) { shape[i] = f; dfs(i + 1); }
  }
  dfs(0);
  const seen = new Set();
  const byPcAndBass = new Map();
  results.forEach((v) => {
    const groupKey = `${v.lowest}|${v.pcsKey}`;
    const current = byPcAndBass.get(groupKey);
    if (!current
      || v.soundingCount > current.soundingCount
      || (v.soundingCount === current.soundingCount && v.fretSum < current.fretSum)
      || (v.soundingCount === current.soundingCount && v.fretSum === current.fretSum && v.maxFret < current.maxFret)) {
      byPcAndBass.set(groupKey, v);
    }
  });
  return [...byPcAndBass.values()]
    .sort((a, b) => a.minFret - b.minFret || a.maxFret - b.maxFret || a.span - b.span || b.soundingCount - a.soundingCount || a.innerMutedStrings - b.innerMutedStrings || a.lowest - b.lowest || b.openStrings - a.openStrings)
    .filter((v) => { const key = v.frets.join(','); if (seen.has(key)) return false; seen.add(key); return true; })
    .slice(0, 240);
}

function buildDiagramSvg(shape, rootPc, intervals) {
  const tuning = getTuningPitches(); const width = 220; const height = 250; const px = 26; const top = 54; const ss = 33; const fs = 30;
  const fretted = shape.filter((f) => f > 0);
  const highestFret = fretted.length ? Math.max(...fretted) : 0;
  const start = highestFret > 5 ? Math.max(1, Math.min(...fretted)) : 1;
  let svg = `<svg viewBox="0 0 ${width} ${height}">`;
  for (let s = 0; s < 6; s++) { const x = px + s * ss; svg += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + fs * 5}" stroke="#8392d9" stroke-width="2" opacity="${state.activeStrings[s] ? 1 : .28}"/>`; }
  for (let f = 0; f <= 5; f++) { const y = top + f * fs; svg += `<line x1="${px}" y1="${y}" x2="${px + ss * 5}" y2="${y}" stroke="#9ba8eb" stroke-width="${start === 1 && f===0?6:2}"/>`; }
  if (start > 1) svg += `<text x="8" y="${top + fs + 4}" fill="#c5ccf2" font-size="14" font-weight="700">${start}</text>`;
  shape.forEach((fret, s) => {
    const x = px + s * ss; if (fret === -1) { svg += `<text x="${x}" y="30" text-anchor="middle" fill="#ff9eaa" opacity="${state.activeStrings[s]?1:.28}" font-size="16" font-weight="700">X</text>`; return; }
    if (fret === 0) {
      svg += `<circle cx="${x}" cy="30" r="9" fill="none" stroke="#8de8cd" stroke-width="2.5" opacity="${state.activeStrings[s] ? 1 : .28}"/>`;
      return;
    }
    const fd = fret - start + 1; if (fd < 1 || fd > 5) return; const y = top + (fd - .5) * fs; const pc = (tuning[s] + fret) % 12; const rel = (pc - rootPc + 12) % 12;
    const label = rel === 0 ? 'R' : rel === intervals[1] ? '3' : rel === 7 ? '5' : '';
    svg += `<circle cx="${x}" cy="${y}" r="10" fill="#70b7ff" opacity="${state.activeStrings[s]?1:.35}"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="#1a2140" opacity=".5" font-size="10">${label}</text>`;
  });
  for (let s = 0; s < 6; s++) { const x = px + s * ss; svg += `<text x="${x}" y="240" text-anchor="middle" fill="#c5ccf2" opacity="${state.activeStrings[s] ? 1 : .35}" font-size="12">${noteName(tuning[s])}</text>`; }
  return `${svg}</svg>`;
}

function buildChordList() {
  if (state.chordMode === 'specific') {
    const base = CHORD_FAMILY_OPTIONS.find((o) => o.label === state.selectedSpecificQuality) || CHORD_FAMILY_OPTIONS[2];
    const add = ADD_OPTIONS.find((a) => a.label === state.selectedAdd);
    const intervals = [...base.intervals];
    if (add && add.add != null) intervals.push(add.add % 12);
    return [{ id: 'specific', title: `${noteName(state.selectedSpecificRoot)}${base.suffix}${add && add.add ? `(${add.label})` : ''}`, rootPc: state.selectedSpecificRoot, intervals }];
  }
  const chords = scaleChords();
  if (state.chordMode === 'families') {
    return CHORD_FAMILY_OPTIONS.map((f) => ({ id: f.label, title: `${noteName(state.root)}${f.suffix || ''} (${f.label})`, rootPc: state.root, intervals: f.intervals }));
  }
  return chords.map((c, i) => ({ id: `scale-${i}`, title: `${c.roman} · ${c.name} (${c.chordNotes.join(', ')})`, rootPc: c.rootPc, intervals: c.intervals }));
}

function renderSpecificControls() {
  els.specificChordControls.innerHTML = '';
  if (state.chordMode !== 'specific') { els.specificChordControls.classList.add('hidden'); return; }
  els.specificChordControls.classList.remove('hidden');
  const rootSelect = document.createElement('select');
  NOTE_NAMES.forEach((n, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = n; rootSelect.append(o); });
  rootSelect.value = String(state.selectedSpecificRoot); rootSelect.onchange = () => { state.selectedSpecificRoot = Number(rootSelect.value); renderDiagrams(); };
  const row1 = document.createElement('div'); row1.className = 'chip-row'; row1.append(rootSelect);
  const qualityRow = document.createElement('div'); qualityRow.className = 'chip-row';
  CHORD_FAMILY_OPTIONS.forEach((o) => { const b = document.createElement('button'); b.className = `chip ${state.selectedSpecificQuality === o.label ? 'active' : ''}`; b.textContent = o.label; b.onclick = () => { state.selectedSpecificQuality = o.label; render(); }; qualityRow.append(b); });
  const addRow = document.createElement('div'); addRow.className = 'chip-row';
  ADD_OPTIONS.forEach((o) => { const b = document.createElement('button'); b.className = `chip ${state.selectedAdd === o.label ? 'active' : ''}`; b.textContent = o.label; b.onclick = () => { state.selectedAdd = o.label; render(); }; addRow.append(b); });
  els.specificChordControls.append(row1, qualityRow, addRow);
}

function renderDiagrams() {
  const chords = buildChordList();
  els.diagramGrid.innerHTML = '';
  chords.forEach((chord) => {
    const card = document.createElement('article'); card.className = 'diagram-card';
    if (!state.inversionFilters[chord.id]) state.inversionFilters[chord.id] = new Set([0]);
    if (state.paging[chord.id] == null) state.paging[chord.id] = 0;
    const head = document.createElement('div'); head.className = 'chord-head';
    const h = document.createElement('h3'); h.textContent = chord.title; h.style.margin = '0';
    const inv = document.createElement('div'); inv.className = 'inversion-toggles';
    [0, 1, 2].forEach((i) => { const b = document.createElement('button'); b.className = `chip ${state.inversionFilters[chord.id].has(i) ? 'active' : ''}`; b.textContent = inversionName(i); b.onclick = () => { const set = state.inversionFilters[chord.id]; if (set.has(i)) set.delete(i); else set.add(i); if (!set.size) set.add(0); state.paging[chord.id] = 0; renderDiagrams(); }; inv.append(b); });
    head.append(h, inv); card.append(head);

    let voicings = findVoicings(chord.rootPc, chord.intervals);
    voicings = voicings.filter((v) => state.inversionFilters[chord.id].has(0) || state.inversionFilters[chord.id].has(1) || state.inversionFilters[chord.id].has(2)).filter((v) => {
      const notes = v.frets.map((f, s) => (f >= 0 ? (getTuningPitches()[s] + f) % 12 : null)).filter((x) => x != null);
      return [...state.inversionFilters[chord.id]].some((i) => inversionMatches(notes, chord.rootPc, chord.intervals, i));
    });

    if (!voicings.length) { const p = document.createElement('p'); p.textContent = 'No playable voicing found up to fret 15.'; card.append(p); }
    else {
      const perPage = window.innerWidth <= 900 ? 3 : 5; const page = Math.min(state.paging[chord.id], Math.max(0, Math.ceil(voicings.length / perPage) - 1)); state.paging[chord.id] = page;
      const headRow = document.createElement('div'); headRow.className = 'voicing-row-head'; headRow.innerHTML = `<small>${voicings.length} voicings</small>`;
      const nav = document.createElement('div'); nav.className = 'voicing-nav'; const prev = document.createElement('button'); prev.textContent = '←'; prev.disabled = page === 0; prev.onclick = () => { state.paging[chord.id] = Math.max(0, page - 1); renderDiagrams(); }; const next = document.createElement('button'); next.textContent = '→'; next.disabled = (page + 1) * perPage >= voicings.length; next.onclick = () => { state.paging[chord.id] = page + 1; renderDiagrams(); }; nav.append(prev, next); headRow.append(nav); card.append(headRow);
      const grid = document.createElement('div'); grid.className = 'voicing-grid';
      voicings.slice(page * perPage, page * perPage + perPage).forEach((v) => { const item = document.createElement('div'); item.className = 'voicing-item'; const sw = document.createElement('div'); sw.innerHTML = buildDiagramSvg(v.frets, chord.rootPc, chord.intervals); const sh = document.createElement('p'); sh.className = 'shape-line'; sh.textContent = `${v.frets.map((f) => (f < 0 ? 'x' : f)).join(' - ')}`; item.append(sw, sh); grid.append(item); });
      card.append(grid);
    }
    els.diagramGrid.append(card);
  });
}

function setupChordModeButtons() {
  ['all', 'families', 'specific'].forEach((mode) => {
    const b = document.createElement('button'); b.textContent = mode === 'all' ? 'All Chords in Key' : mode === 'families' ? 'Chord Families' : 'Specific Chord';
    b.onclick = () => { state.chordMode = mode; render(); };
    els.chordModeButtons.append(b);
  });
}

function renderModeButtons() {
  [...els.chordModeButtons.children].forEach((b, i) => b.classList.toggle('active', ['all', 'families', 'specific'][i] === state.chordMode));
}

function render() {
  renderTuningControls();
  renderModeButtons();
  renderSpecificControls();
  renderLegend();
  renderScaleChordButtons();
  renderFretboard();
  renderDiagrams();
}

setupChordModeButtons();
loadSavedTuningsFromCookie();
setupTuning();
setupSelects();
render();

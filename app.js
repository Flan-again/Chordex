const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STRING_NAMES = ['6 (Low E)', '5 (A)', '4 (D)', '3 (G)', '2 (B)', '1 (High E)'];
const STANDARD_TUNING = [4, 9, 2, 7, 11, 4];
const MAX_FRET = 15;
const VOICINGS_PER_CHORD = 4;
const MAX_TUNING_OFFSET = 8;
const SAVED_TUNINGS_COOKIE = 'chordex_saved_tunings';

const PRESETS = {
  'E Standard': [0, 0, 0, 0, 0, 0],
  'Drop D': [-2, 0, 0, 0, 0, 0],
  'D Standard': [-2, -2, -2, -2, -2, -2],
  'Open G': [-2, -2, 0, 0, 0, -2],
  'Half Step Down': [-1, -1, -1, -1, -1, -1],
  Custom: null,
};

const savedTunings = {};

const CHORD_TYPES = [
  { name: 'Major', suffix: '', intervals: [0, 4, 7] },
  { name: 'Minor', suffix: 'm', intervals: [0, 3, 7] },
  { name: 'Seventh', suffix: '7', intervals: [0, 4, 7, 10] },
  { name: 'Minor Seventh', suffix: 'm7', intervals: [0, 3, 7, 10] },
  { name: 'Major Seventh', suffix: 'maj7', intervals: [0, 4, 7, 11] },
  { name: 'Diminished', suffix: 'dim', intervals: [0, 3, 6] },
];

const SCALE_CHORDS = {
  major: {
    label: 'Major',
    degreeRoots: [0, 2, 4, 5, 7, 9, 11],
    qualities: ['Major', 'Minor', 'Minor', 'Major', 'Major', 'Minor', 'Diminished'],
    roman: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  },
  minor: {
    label: 'Minor',
    degreeRoots: [0, 2, 3, 5, 7, 8, 10],
    qualities: ['Minor', 'Diminished', 'Major', 'Minor', 'Minor', 'Major', 'Major'],
    roman: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
  },
};

const SCALE_LIBRARY = {
  major: { label: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11], third: 4 },
  minor: { label: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10], third: 3 },
  majorPentatonic: { label: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9], third: 4 },
  minorPentatonic: { label: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10], third: 3 },
  blues: { label: 'Blues', intervals: [0, 3, 5, 6, 7, 10], third: 3 },
  dorian: { label: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], third: 3 },
};

const state = {
  offsets: [0, 0, 0, 0, 0, 0],
  root: 0,
  chordMode: 'types',
  keyMode: 'major',
  scaleType: 'major',
};

const els = {
  tuningControls: document.getElementById('tuningControls'),
  rootSelect: document.getElementById('rootSelect'),
  chordModeSelect: document.getElementById('chordModeSelect'),
  harmonyScaleSelect: document.getElementById('harmonyScaleSelect'),
  diagramGrid: document.getElementById('diagramGrid'),
  tuningSummary: document.getElementById('tuningSummary'),
  presetSelect: document.getElementById('presetSelect'),
  fretboardWrap: document.getElementById('fretboardWrap'),
  fretboardLegend: document.getElementById('fretboardLegend'),
  tuningNameInput: document.getElementById('tuningNameInput'),
  saveTuningBtn: document.getElementById('saveTuningBtn'),
};

function noteName(pc) {
  return NOTE_NAMES[((pc % 12) + 12) % 12];
}

function setupRootOptions() {
  NOTE_NAMES.forEach((note, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = note;
    els.rootSelect.append(option);
  });

  els.rootSelect.value = String(state.root);
  els.rootSelect.addEventListener('change', () => {
    state.root = Number(els.rootSelect.value);
    render();
  });
}

function setupMusicSelectors() {
  els.chordModeSelect.value = state.chordMode;
  els.harmonyScaleSelect.innerHTML = '';

  const harmonyGroup = document.createElement('optgroup');
  harmonyGroup.label = 'Key harmony (for key chords)';
  Object.entries(SCALE_CHORDS).forEach(([key, value]) => {
    const option = document.createElement('option');
    option.value = `harmony:${key}`;
    option.textContent = `${value.label} harmony`;
    harmonyGroup.append(option);
  });

  const scaleGroup = document.createElement('optgroup');
  scaleGroup.label = 'Fretboard scale';
  Object.entries(SCALE_LIBRARY).forEach(([key, value]) => {
    const option = document.createElement('option');
    option.value = `scale:${key}`;
    option.textContent = value.label;
    scaleGroup.append(option);
  });

  els.harmonyScaleSelect.append(harmonyGroup, scaleGroup);
  els.harmonyScaleSelect.value = `harmony:${state.keyMode}`;

  els.chordModeSelect.addEventListener('change', () => {
    state.chordMode = els.chordModeSelect.value;
    render();
  });

  els.harmonyScaleSelect.addEventListener('change', () => {
    const [type, value] = els.harmonyScaleSelect.value.split(':');
    if (type === 'harmony' && SCALE_CHORDS[value]) {
      state.keyMode = value;
    }
    if (type === 'scale' && SCALE_LIBRARY[value]) {
      state.scaleType = value;
    }
    render();
  });
}

function getSavedTuningOptions() {
  return Object.entries(savedTunings).sort(([a], [b]) => a.localeCompare(b));
}

function syncPresetOptions() {
  const previousValue = els.presetSelect.value;
  els.presetSelect.innerHTML = '';

  Object.keys(PRESETS).forEach((presetName) => {
    const option = document.createElement('option');
    option.value = presetName;
    option.textContent = presetName;
    els.presetSelect.append(option);
  });

  const savedOptions = getSavedTuningOptions();
  if (savedOptions.length) {
    const group = document.createElement('optgroup');
    group.label = 'Saved tunings';
    savedOptions.forEach(([presetName]) => {
      const option = document.createElement('option');
      option.value = presetName;
      option.textContent = presetName;
      group.append(option);
    });
    els.presetSelect.append(group);
  }

  const values = Array.from(els.presetSelect.options).map((option) => option.value);
  els.presetSelect.value = previousValue && values.includes(previousValue) ? previousValue : 'E Standard';
}

function setupPresetSelect() {
  syncPresetOptions();
  els.presetSelect.addEventListener('change', () => {
    const preset = PRESETS[els.presetSelect.value] || savedTunings[els.presetSelect.value];
    if (!preset) {
      return;
    }
    state.offsets = [...preset];
    syncTuningControls();
    render();
  });
}

function writeSavedTuningsCookie() {
  const value = encodeURIComponent(JSON.stringify(savedTunings));
  document.cookie = `${SAVED_TUNINGS_COOKIE}=${value}; max-age=${60 * 60 * 24 * 365}; path=/; samesite=lax`;
}

function loadSavedTuningsFromCookie() {
  const entry = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SAVED_TUNINGS_COOKIE}=`));

  if (!entry) return;

  try {
    const raw = entry.slice(SAVED_TUNINGS_COOKIE.length + 1);
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== 'object') return;

    Object.entries(parsed).forEach(([name, offsets]) => {
      if (!Array.isArray(offsets) || offsets.length !== 6) return;
      if (offsets.some((value) => typeof value !== 'number' || Number.isNaN(value))) return;
      if (PRESETS[name]) return;
      savedTunings[name] = offsets.map((value) => Math.max(-MAX_TUNING_OFFSET, Math.min(MAX_TUNING_OFFSET, Math.round(value))));
    });
  } catch (_error) {
    // Ignore malformed cookie content.
  }
}

function setupSaveTuning() {
  els.saveTuningBtn.addEventListener('click', () => {
    const name = els.tuningNameInput.value.trim();
    if (!name) return;

    savedTunings[name] = [...state.offsets];
    writeSavedTuningsCookie();
    syncPresetOptions();
    els.presetSelect.value = name;
    els.tuningNameInput.value = '';
  });
}

function getTuningPitches() {
  return STANDARD_TUNING.map((pc, i) => (pc + state.offsets[i] + 120) % 12);
}

function getTuningDescription() {
  return getTuningPitches().map((pc) => noteName(pc)).join(' - ');
}

function updateOffset(index, delta) {
  const next = Math.max(-MAX_TUNING_OFFSET, Math.min(MAX_TUNING_OFFSET, state.offsets[index] + delta));
  if (next === state.offsets[index]) return;
  state.offsets[index] = next;
  els.presetSelect.value = 'Custom';
  syncTuningControls();
  render();
}

function setupTuningControls() {
  els.tuningControls.innerHTML = '';

  STRING_NAMES.forEach((name, index) => {
    const row = document.createElement('div');
    row.className = 'string-row';

    const label = document.createElement('div');
    label.className = 'string-label';
    label.textContent = name;

    const note = document.createElement('div');
    note.className = 'tuning-note';

    const arrows = document.createElement('div');
    arrows.className = 'tuning-arrows';

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'arrow-btn';
    downBtn.textContent = '↓';
    downBtn.dataset.index = String(index);
    downBtn.dataset.delta = '-1';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'arrow-btn';
    upBtn.textContent = '↑';
    upBtn.dataset.index = String(index);
    upBtn.dataset.delta = '1';

    const value = document.createElement('div');
    value.className = 'offset-value';

    [downBtn, upBtn].forEach((button) => {
      button.addEventListener('click', () => {
        updateOffset(Number(button.dataset.index), Number(button.dataset.delta));
      });
    });

    arrows.append(downBtn, upBtn);
    row.append(label, note, arrows, value);
    els.tuningControls.append(row);
  });

  syncTuningControls();
}

function syncTuningControls() {
  const tuning = getTuningPitches();
  const rows = Array.from(els.tuningControls.children);

  rows.forEach((row, i) => {
    const note = row.querySelector('.tuning-note');
    const value = row.querySelector('.offset-value');
    const downBtn = row.querySelector('[data-delta="-1"]');
    const upBtn = row.querySelector('[data-delta="1"]');

    note.textContent = noteName(tuning[i]);
    value.textContent = formatOffset(state.offsets[i]);
    downBtn.disabled = state.offsets[i] <= -MAX_TUNING_OFFSET;
    upBtn.disabled = state.offsets[i] >= MAX_TUNING_OFFSET;
  });
}

function formatOffset(offset) {
  if (offset === 0) return '±0 tones';
  const sign = offset > 0 ? '+' : '-';
  const tones = Math.abs(offset) / 2;
  return `${sign}${tones % 1 === 0 ? tones.toFixed(0) : tones.toFixed(1)} tones`;
}

function chordPitchClasses(rootPc, intervals) {
  return intervals.map((interval) => (rootPc + interval) % 12);
}

function findChordVoicings(rootPc, intervals, tuningPitches, maxFret = MAX_FRET, maxResults = VOICINGS_PER_CHORD) {
  const chordNotes = chordPitchClasses(rootPc, intervals);
  const chordSet = new Set(chordNotes);
  const bestByPosition = [];

  for (let baseFret = 0; baseFret <= maxFret; baseFret += 1) {
    const optionsPerString = tuningPitches.map((openPc) => {
      const options = [-1];
      if (chordSet.has(openPc)) options.push(0);

      const start = Math.max(1, baseFret);
      const end = Math.min(baseFret + 4, maxFret);
      for (let fret = start; fret <= end; fret += 1) {
        if (chordSet.has((openPc + fret) % 12)) options.push(fret);
      }

      return [...new Set(options)];
    });

    const shape = new Array(6).fill(-1);
    let bestShape = null;

    function evaluateShape(candidate) {
      const sounding = [];
      const soundedPitchClasses = [];

      candidate.forEach((fret, stringIndex) => {
        if (fret < 0) return;
        sounding.push({ stringIndex, fret });
        soundedPitchClasses.push((tuningPitches[stringIndex] + fret) % 12);
      });

      if (sounding.length < 3 || !soundedPitchClasses.includes(rootPc)) return;
      if (!soundedPitchClasses.every((pc) => chordSet.has(pc))) return;

      const fretted = sounding.map((n) => n.fret).filter((f) => f > 0);
      if (baseFret > 0 && fretted.length === 0) return;

      const minFret = fretted.length ? Math.min(...fretted) : 0;
      const maxUsedFret = fretted.length ? Math.max(...fretted) : 0;
      const span = maxUsedFret - minFret;
      if (span > 4) return;

      const uniqueNotes = new Set(soundedPitchClasses);
      if (uniqueNotes.size < Math.min(3, intervals.length)) return;

      const muteCount = candidate.filter((f) => f < 0).length;
      if (muteCount > 3) return;

      const frettedCount = fretted.length;
      if (frettedCount > 4) return;
      const soundingCount = sounding.length;
      const openCount = candidate.filter((f) => f === 0).length;
      const avgFret = frettedCount ? fretted.reduce((sum, fret) => sum + fret, 0) / frettedCount : 0;
      const missingChordTones = Math.max(0, chordSet.size - uniqueNotes.size);

      const score =
        muteCount * 5 +
        missingChordTones * 9 +
        (6 - soundingCount) * 4 +
        Math.max(0, frettedCount - 3) * 2 +
        span * 1.1 +
        Math.abs(avgFret - Math.max(2, baseFret)) * 0.2 -
        openCount * 0.8;

      if (!bestShape || score < bestShape.score) {
        bestShape = { frets: [...candidate], score, minFret, maxUsedFret, baseFret };
      }
    }

    function dfs(stringIndex) {
      if (stringIndex === 6) {
        evaluateShape(shape);
        return;
      }

      for (const fret of optionsPerString[stringIndex]) {
        shape[stringIndex] = fret;
        dfs(stringIndex + 1);
      }
    }

    dfs(0);
    if (bestShape) {
      bestByPosition.push(bestShape);
    }
  }

  const deduped = [];
  const seen = new Set();

  bestByPosition
    .sort((a, b) => a.minFret - b.minFret || a.baseFret - b.baseFret || a.score - b.score)
    .forEach((candidate) => {
      const key = candidate.frets.join(',');
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(candidate);
    });

  return deduped.slice(0, maxResults);
}

function buildDiagramSvg(shape, rootPc, tuningPitches) {
  const width = 220;
  const height = 250;
  const paddingX = 26;
  const topY = 54;
  const stringSpacing = 33;
  const fretSpacing = 30;

  const fretted = shape.filter((f) => f > 0);
  const minFretted = fretted.length ? Math.min(...fretted) : 1;
  const startFret = minFretted > 5 ? minFretted : 1;

  let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Chord diagram">`;

  for (let s = 0; s < 6; s += 1) {
    const x = paddingX + s * stringSpacing;
    svg += `<line x1="${x}" y1="${topY}" x2="${x}" y2="${topY + fretSpacing * 5}" stroke="#8392d9" stroke-width="2" />`;
  }

  for (let f = 0; f <= 5; f += 1) {
    const y = topY + f * fretSpacing;
    const thickness = startFret === 1 && f === 0 ? 6 : 2;
    svg += `<line x1="${paddingX}" y1="${y}" x2="${paddingX + stringSpacing * 5}" y2="${y}" stroke="#9ba8eb" stroke-width="${thickness}" stroke-linecap="round" />`;
  }

  if (startFret > 1) {
    svg += `<text x="6" y="${topY + fretSpacing + 4}" fill="#c5ccf2" font-size="14" font-weight="700">${startFret}fr</text>`;
  }

  shape.forEach((fret, stringIndex) => {
    const x = paddingX + stringIndex * stringSpacing;

    if (fret === -1) {
      svg += `<text x="${x}" y="30" text-anchor="middle" fill="#ff9eaa" font-size="16" font-weight="700">X</text>`;
      return;
    }

    if (fret === 0) {
      svg += `<text x="${x}" y="30" text-anchor="middle" fill="#8de8cd" font-size="16" font-weight="700">O</text>`;
    }

    const fretOnDiagram = fret - startFret + 1;
    if (fretOnDiagram < 1 || fretOnDiagram > 5) return;

    const y = topY + (fretOnDiagram - 0.5) * fretSpacing;
    const pitchClass = (tuningPitches[stringIndex] + fret) % 12;
    const isRoot = pitchClass === rootPc;
    const fill = isRoot ? '#70b7ff' : '#67f0c7';

    svg += `<circle cx="${x}" cy="${y}" r="10" fill="${fill}" />`;
  });

  for (let s = 0; s < 6; s += 1) {
    const x = paddingX + s * stringSpacing;
    svg += `<text x="${x}" y="240" text-anchor="middle" fill="#c5ccf2" font-size="12">${noteName(tuningPitches[s])}</text>`;
  }

  svg += '</svg>';
  return svg;
}

function getChordsToRender() {
  if (state.chordMode === 'types') {
    return CHORD_TYPES.map((type) => ({
      title: `${noteName(state.root)}${type.suffix} (${type.name})`,
      rootPc: state.root,
      intervals: type.intervals,
    }));
  }

  const keyData = SCALE_CHORDS[state.keyMode];
  return keyData.degreeRoots.map((interval, index) => {
    const qualityName = keyData.qualities[index];
    const quality = CHORD_TYPES.find((type) => type.name === qualityName);
    const chordRoot = (state.root + interval) % 12;
    return {
      title: `${keyData.roman[index]} · ${noteName(chordRoot)}${quality.suffix} (${quality.name})`,
      rootPc: chordRoot,
      intervals: quality.intervals,
    };
  });
}

function renderDiagrams() {
  const tuning = getTuningPitches();
  const chordsToRender = getChordsToRender();

  els.diagramGrid.innerHTML = '';

  chordsToRender.forEach((chord) => {
    const card = document.createElement('article');
    card.className = 'diagram-card';

    const title = document.createElement('h3');
    title.textContent = chord.title;
    card.append(title);

    const voicings = findChordVoicings(chord.rootPc, chord.intervals, tuning);

    if (!voicings.length) {
      const warning = document.createElement('p');
      warning.className = 'no-shape';
      warning.textContent = 'No playable voicing found up to fret 15.';
      card.append(warning);
    } else {
      const voicingGrid = document.createElement('div');
      voicingGrid.className = 'voicing-grid';

      voicings.forEach((voicing, voicingIndex) => {
        const item = document.createElement('div');
        item.className = 'voicing-item';

        const label = document.createElement('p');
        label.className = 'voicing-label';
        label.textContent = `Voicing ${voicingIndex + 1} · Position ${voicing.minFret || 0}`;

        const svgWrap = document.createElement('div');
        svgWrap.innerHTML = buildDiagramSvg(voicing.frets, chord.rootPc, tuning);

        const shape = voicing.frets.map((f) => (f < 0 ? 'x' : f)).join(' - ');
        const detail = document.createElement('p');
        detail.textContent = `Shape: ${shape}`;

        item.append(label, svgWrap, detail);
        voicingGrid.append(item);
      });

      card.append(voicingGrid);
    }

    const notes = chordPitchClasses(chord.rootPc, chord.intervals).map((pc) => noteName(pc)).join(', ');
    const foot = document.createElement('p');
    foot.textContent = `Chord tones: ${notes}`;
    card.append(foot);

    els.diagramGrid.append(card);
  });
}

function buildScaleFretboardSvg(rootPc, tuningPitches, scale) {
  const frets = MAX_FRET;
  const width = 1100;
  const height = 280;
  const leftPad = 50;
  const topPad = 34;
  const fretSpacing = 64;
  const stringSpacing = 38;

  const highToLow = [...tuningPitches].reverse();

  const scaleSet = new Set(scale.intervals.map((i) => (rootPc + i) % 12));
  const rootTone = rootPc;
  const thirdTone = (rootPc + scale.third) % 12;
  const fourthTone = (rootPc + 5) % 12;
  const fifthTone = (rootPc + 7) % 12;

  let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Scale fretboard">`;

  for (let s = 0; s < 6; s += 1) {
    const y = topPad + s * stringSpacing;
    const gauge = 1 + s * 0.45;
    svg += `<line x1="${leftPad}" y1="${y}" x2="${leftPad + fretSpacing * frets}" y2="${y}" stroke="#9aa7e7" stroke-width="${gauge.toFixed(2)}" />`;
  }

  for (let f = 0; f <= frets; f += 1) {
    const x = leftPad + f * fretSpacing;
    const thickness = f === 0 ? 5 : 2;
    svg += `<line x1="${x}" y1="${topPad - 16}" x2="${x}" y2="${topPad + stringSpacing * 5 + 16}" stroke="#8392d9" stroke-width="${thickness}" />`;
    if (f % 3 === 0 || f === 1 || f === 5 || f === 7 || f === 9 || f === 12 || f === 15) {
      svg += `<text x="${x + (f === frets ? -10 : 6)}" y="18" fill="#c5ccf2" font-size="11">${f}</text>`;
    }
  }

  highToLow.forEach((openPc, stringIndex) => {
    const y = topPad + stringIndex * stringSpacing;

    for (let fret = 0; fret <= frets; fret += 1) {
      const pitch = (openPc + fret) % 12;
      if (!scaleSet.has(pitch)) continue;

      const x = leftPad + fret * fretSpacing;
      let fill = '#7da8d8';

      if (pitch === rootTone) {
        fill = '#ff9f67';
      } else if (pitch === thirdTone) {
        fill = '#a6e56a';
      } else if (pitch === fourthTone) {
        fill = '#76e0e0';
      } else if (pitch === fifthTone) {
        fill = '#dca7ff';
      }

      svg += `<circle cx="${x}" cy="${y}" r="10.5" fill="${fill}" stroke="#0e1230" stroke-width="1.2" />`;
    }

    svg += `<text x="20" y="${y + 4}" fill="#d2d9ff" font-size="12">${noteName(openPc)}</text>`;
  });

  svg += '</svg>';
  return svg;
}

function renderFretboardLegend() {
  const legendItems = [
    { label: 'Root', color: '#ff9f67' },
    { label: '3rd', color: '#a6e56a' },
    { label: '4th', color: '#76e0e0' },
    { label: '5th', color: '#dca7ff' },
    { label: 'Other scale tones', color: '#7da8d8' },
  ];

  els.fretboardLegend.innerHTML = '';
  legendItems.forEach((item) => {
    const chip = document.createElement('span');
    chip.className = 'legend-item';

    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = item.color;

    const label = document.createElement('span');
    label.textContent = item.label;

    chip.append(swatch, label);
    els.fretboardLegend.append(chip);
  });
}

function renderFretboard() {
  const tuning = getTuningPitches();
  const scale = SCALE_LIBRARY[state.scaleType];
  els.fretboardWrap.innerHTML = buildScaleFretboardSvg(state.root, tuning, scale);
}

function render() {
  const modeLabel = state.chordMode === 'types' ? 'Chord families' : `${SCALE_CHORDS[state.keyMode].label} key chords`;
  els.tuningSummary.textContent = `Current tuning (6→1): ${getTuningDescription()} · ${noteName(state.root)} · ${modeLabel}`;
  renderDiagrams();
  renderFretboard();
  renderFretboardLegend();
}

setupRootOptions();
setupMusicSelectors();
loadSavedTuningsFromCookie();
setupPresetSelect();
setupTuningControls();
setupSaveTuning();
render();

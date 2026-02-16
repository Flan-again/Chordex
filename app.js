const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STRING_NAMES = ['6 (Low E)', '5 (A)', '4 (D)', '3 (G)', '2 (B)', '1 (High E)'];
const STANDARD_TUNING = [4, 9, 2, 7, 11, 4];

const PRESETS = {
  'E Standard': [0, 0, 0, 0, 0, 0],
  'Drop D': [-2, 0, 0, 0, 0, 0],
  'D Standard': [-2, -2, -2, -2, -2, -2],
  'Open G': [-2, -2, 0, 0, 0, -2],
  'Half Step Down': [-1, -1, -1, -1, -1, -1],
  'Custom': null,
};

const CHORD_TYPES = [
  { name: 'Major', suffix: '', intervals: [0, 4, 7] },
  { name: 'Minor', suffix: 'm', intervals: [0, 3, 7] },
  { name: 'Seventh', suffix: '7', intervals: [0, 4, 7, 10] },
  { name: 'Minor Seventh', suffix: 'm7', intervals: [0, 3, 7, 10] },
  { name: 'Major Seventh', suffix: 'maj7', intervals: [0, 4, 7, 11] },
];

const state = {
  offsets: [0, 0, 0, 0, 0, 0],
  root: 0,
  maxFret: 9,
};

const els = {
  tuningControls: document.getElementById('tuningControls'),
  rootSelect: document.getElementById('rootSelect'),
  rangeSelect: document.getElementById('rangeSelect'),
  diagramGrid: document.getElementById('diagramGrid'),
  tuningSummary: document.getElementById('tuningSummary'),
  presetSelect: document.getElementById('presetSelect'),
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

function setupRangeSelect() {
  els.rangeSelect.addEventListener('change', () => {
    state.maxFret = Number(els.rangeSelect.value);
    render();
  });
}

function setupPresetSelect() {
  Object.keys(PRESETS).forEach((presetName) => {
    const option = document.createElement('option');
    option.value = presetName;
    option.textContent = presetName;
    els.presetSelect.append(option);
  });

  els.presetSelect.value = 'E Standard';

  els.presetSelect.addEventListener('change', () => {
    const preset = PRESETS[els.presetSelect.value];
    if (!preset) {
      return;
    }
    state.offsets = [...preset];
    syncTuningControls();
    render();
  });
}

function getTuningPitches() {
  return STANDARD_TUNING.map((pc, i) => (pc + state.offsets[i] + 120) % 12);
}

function getTuningDescription() {
  return getTuningPitches().map((pc) => noteName(pc)).join(' - ');
}

function setupTuningControls() {
  els.tuningControls.innerHTML = '';
  STRING_NAMES.forEach((name, index) => {
    const row = document.createElement('div');
    row.className = 'string-row';

    const label = document.createElement('div');
    label.className = 'string-label';
    label.textContent = name;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '-6';
    slider.max = '6';
    slider.step = '1';
    slider.value = String(state.offsets[index]);
    slider.dataset.index = String(index);

    const value = document.createElement('div');
    value.className = 'offset-value';

    slider.addEventListener('input', () => {
      const i = Number(slider.dataset.index);
      state.offsets[i] = Number(slider.value);
      value.textContent = `${formatOffset(state.offsets[i])} → ${noteName(getTuningPitches()[i])}`;
      els.presetSelect.value = 'Custom';
      render();
    });

    row.append(label, slider, value);
    els.tuningControls.append(row);
  });

  syncTuningControls();
}

function syncTuningControls() {
  const tuning = getTuningPitches();
  const rows = Array.from(els.tuningControls.children);
  rows.forEach((row, i) => {
    const slider = row.querySelector('input[type="range"]');
    const value = row.querySelector('.offset-value');
    slider.value = String(state.offsets[i]);
    value.textContent = `${formatOffset(state.offsets[i])} → ${noteName(tuning[i])}`;
  });
}

function formatOffset(offset) {
  if (offset === 0) {
    return '0 st';
  }
  const sign = offset > 0 ? '+' : '';
  return `${sign}${offset} st`;
}

function chordPitchClasses(rootPc, intervals) {
  return intervals.map((interval) => (rootPc + interval) % 12);
}

function findChordShape(rootPc, intervals, tuningPitches, maxFret) {
  const chordNotes = chordPitchClasses(rootPc, intervals);
  const chordSet = new Set(chordNotes);

  let best = null;

  for (let baseFret = 0; baseFret <= maxFret; baseFret += 1) {
    const optionsPerString = tuningPitches.map((openPc) => {
      const options = [-1];
      if (baseFret === 0 && chordSet.has(openPc)) {
        options.push(0);
      }

      const start = Math.max(1, baseFret);
      const end = Math.min(baseFret + 4, maxFret);
      for (let fret = start; fret <= end; fret += 1) {
        const pitch = (openPc + fret) % 12;
        if (chordSet.has(pitch)) {
          options.push(fret);
        }
      }
      return [...new Set(options)];
    });

    const shape = new Array(6).fill(-1);

    function dfs(stringIndex) {
      if (stringIndex === 6) {
        evaluateShape(shape, chordSet, rootPc, baseFret, intervals.length);
        return;
      }

      for (const fret of optionsPerString[stringIndex]) {
        shape[stringIndex] = fret;
        dfs(stringIndex + 1);
      }
    }

    function evaluateShape(candidate, allowedSet, root, candidateBaseFret, targetChordSize) {
      const sounding = [];
      const soundedPitchClasses = [];

      candidate.forEach((fret, stringIndex) => {
        if (fret < 0) {
          return;
        }
        sounding.push({ stringIndex, fret });
        soundedPitchClasses.push((tuningPitches[stringIndex] + fret) % 12);
      });

      if (sounding.length < 3) {
        return;
      }

      if (!soundedPitchClasses.includes(root)) {
        return;
      }

      const fretted = sounding.map((n) => n.fret).filter((f) => f > 0);
      if (candidateBaseFret > 0 && fretted.length === 0) {
        return;
      }

      const minFret = fretted.length ? Math.min(...fretted) : 0;
      const maxUsedFret = fretted.length ? Math.max(...fretted) : 0;
      const span = maxUsedFret - minFret;
      if (span > 4) {
        return;
      }

      const uniqueNotes = new Set(soundedPitchClasses);
      if (uniqueNotes.size < Math.min(3, targetChordSize)) {
        return;
      }

      if (!soundedPitchClasses.every((pc) => allowedSet.has(pc))) {
        return;
      }

      const muteCount = candidate.filter((f) => f < 0).length;
      if (muteCount > 3) {
        return;
      }

      const missingChordTones = Math.max(0, targetChordSize - uniqueNotes.size);
      const avgFret =
        fretted.length > 0 ? fretted.reduce((sum, fret) => sum + fret, 0) / fretted.length : 0;

      const score =
        muteCount * 2 +
        missingChordTones * 3 +
        span * 1.2 +
        Math.abs(avgFret - 2.5) * 0.2 +
        candidateBaseFret * 0.1;

      if (!best || score < best.score) {
        best = { frets: [...candidate], score };
      }
    }

    dfs(0);
  }

  return best ? best.frets : null;
}

function buildDiagramSvg(shape, rootPc, tuningPitches) {
  const width = 220;
  const height = 250;
  const paddingX = 26;
  const topY = 54;
  const stringSpacing = 33;
  const fretSpacing = 30;

  const fretted = shape.filter((f) => f > 0);
  const startFret = fretted.length ? Math.max(1, Math.min(...fretted)) : 1;

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
      return;
    }

    const fretOnDiagram = fret - startFret + 1;
    if (fretOnDiagram < 1 || fretOnDiagram > 5) {
      return;
    }

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

  svg += `</svg>`;
  return svg;
}

function renderDiagrams() {
  const tuning = getTuningPitches();
  els.diagramGrid.innerHTML = '';

  CHORD_TYPES.forEach((type) => {
    const card = document.createElement('article');
    card.className = 'diagram-card';

    const title = document.createElement('h3');
    title.textContent = `${noteName(state.root)}${type.suffix} (${type.name})`;
    card.append(title);

    const shape = findChordShape(state.root, type.intervals, tuning, state.maxFret);

    if (!shape) {
      const warning = document.createElement('p');
      warning.className = 'no-shape';
      warning.textContent = 'No playable shape found in the selected fret range.';
      card.append(warning);
    } else {
      const svgWrap = document.createElement('div');
      svgWrap.innerHTML = buildDiagramSvg(shape, state.root, tuning);
      card.append(svgWrap);

      const notes = chordPitchClasses(state.root, type.intervals).map((pc) => noteName(pc)).join(', ');
      const shapeText = shape.map((f) => (f === -1 ? 'x' : f)).join(' - ');

      const detail = document.createElement('p');
      detail.textContent = `Shape: ${shapeText} · Notes: ${notes}`;
      card.append(detail);
    }

    els.diagramGrid.append(card);
  });
}

function render() {
  els.tuningSummary.textContent = `Current tuning (6→1): ${getTuningDescription()}`;
  renderDiagrams();
}

setupRootOptions();
setupRangeSelect();
setupPresetSelect();
setupTuningControls();
render();

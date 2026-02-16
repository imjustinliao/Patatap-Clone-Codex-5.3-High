const GRID_COLUMNS = 6;
const GRID_ROWS = 5;
const PAD_COUNT = GRID_COLUMNS * GRID_ROWS;
const MODE_SWITCH_INDEX = PAD_COUNT - 1;
const KEY_ORDER = "1234567890qwertyuiopasdfghjklzxcvbnm";
const VISUAL_TYPES = ["ring", "polygon", "rays", "squares", "spiral", "orbit", "burst", "arcs"];

const THEMES = [
  {
    name: "Nocturne Glass",
    background: ["#1b2e6c", "#05060f"],
    gridLine: "rgba(164, 197, 255, 0.2)",
    accent: "#8ff4ff",
    palette: ["#8ff4ff", "#78b7ff", "#9d98ff", "#8effd6", "#f9ff8f", "#ffb8f7", "#9fdcff", "#ffcf99"],
    audio: {
      root: 46,
      scale: [0, 3, 5, 7, 10],
      waveforms: ["triangle", "sine", "sawtooth"],
      filter: "bandpass",
      filterBase: 620,
      q: 5.8,
      release: 0.23,
      lfoRate: 4.2,
      vibrato: 5,
      noise: 0.028,
      harmonic: [1, 1.25, 1.5, 2, 0.75]
    }
  },
  {
    name: "Solar Bloom",
    background: ["#7f230d", "#160904"],
    gridLine: "rgba(255, 203, 143, 0.2)",
    accent: "#ffe06f",
    palette: ["#ffe06f", "#ff9e57", "#ff6d6d", "#ffaf90", "#f7f6d0", "#ffb38f", "#ffd784", "#f8966e"],
    audio: {
      root: 50,
      scale: [0, 2, 4, 7, 9],
      waveforms: ["sawtooth", "triangle", "square"],
      filter: "lowpass",
      filterBase: 940,
      q: 3.8,
      release: 0.18,
      lfoRate: 6.8,
      vibrato: 3.8,
      noise: 0.034,
      harmonic: [1, 1.33, 1.5, 2, 2.5]
    }
  },
  {
    name: "Aqua Drift",
    background: ["#0f4d63", "#031117"],
    gridLine: "rgba(142, 245, 255, 0.18)",
    accent: "#8fffe6",
    palette: ["#8fffe6", "#6de9ff", "#4ec5ff", "#8ecbff", "#b0f7ff", "#6dd7c6", "#9be8ff", "#76b7ff"],
    audio: {
      root: 43,
      scale: [0, 2, 5, 7, 10],
      waveforms: ["sine", "triangle", "sine"],
      filter: "highpass",
      filterBase: 260,
      q: 2.4,
      release: 0.27,
      lfoRate: 2.7,
      vibrato: 7.2,
      noise: 0.02,
      harmonic: [1, 1.125, 1.5, 1.875, 2]
    }
  },
  {
    name: "Cyber Mint",
    background: ["#235d2f", "#060b08"],
    gridLine: "rgba(165, 255, 188, 0.2)",
    accent: "#b6ffa9",
    palette: ["#b6ffa9", "#6fffcb", "#8debc4", "#d3ff94", "#9cffb2", "#6fd2a6", "#e2ffb8", "#8ffff0"],
    audio: {
      root: 52,
      scale: [0, 3, 5, 8, 10],
      waveforms: ["square", "triangle", "sawtooth"],
      filter: "notch",
      filterBase: 740,
      q: 9,
      release: 0.2,
      lfoRate: 5.2,
      vibrato: 4.6,
      noise: 0.03,
      harmonic: [1, 1.5, 2, 2.25, 0.5]
    }
  },
  {
    name: "Velvet Pulse",
    background: ["#4d1743", "#09040d"],
    gridLine: "rgba(255, 163, 240, 0.2)",
    accent: "#ff9af4",
    palette: ["#ff9af4", "#ffc4f6", "#f2a0ff", "#ff87bc", "#ffb2de", "#ffd5fb", "#ffa6d8", "#d8a8ff"],
    audio: {
      root: 47,
      scale: [0, 1, 5, 7, 8],
      waveforms: ["triangle", "square", "sine"],
      filter: "peaking",
      filterBase: 680,
      q: 6.2,
      release: 0.25,
      lfoRate: 3.6,
      vibrato: 6,
      noise: 0.025,
      harmonic: [1, 1.2, 1.6, 2.4, 0.8]
    }
  }
];

const appEl = document.getElementById("app");
const gridEl = document.getElementById("grid");
const canvasEl = document.getElementById("fx-canvas");
const modeNameEl = document.getElementById("mode-name");
const modeToastEl = document.getElementById("mode-toast");
const fxCtx = canvasEl.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let pads = [];
let effects = [];
let currentTheme = 0;
let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;
let audioContext = null;
let masterGainNode = null;
let compressorNode = null;
let noiseBuffer = null;
const colorCache = new Map();
const pointerStates = new Map();

init();

function init() {
  buildGrid();
  bindEvents();
  resizeCanvas();
  applyTheme(false);
  requestAnimationFrame(renderFrame);
}

function buildGrid() {
  for (let index = 0; index < PAD_COUNT; index += 1) {
    const pad = document.createElement("button");
    const label = index === MODE_SWITCH_INDEX ? "MODE" : buildPadCode(index);
    pad.type = "button";
    pad.className = "pad";
    if (index === MODE_SWITCH_INDEX) {
      pad.classList.add("mode-pad");
    }
    pad.dataset.index = String(index);
    pad.dataset.code = label;
    pad.innerHTML = `<span class="pad-code">${label}</span>`;
    gridEl.appendChild(pad);
    pads.push(pad);
  }
}

function bindEvents() {
  gridEl.addEventListener("pointerdown", onPadPointerDown);
  gridEl.addEventListener("pointermove", onPadPointerMove);
  gridEl.addEventListener("pointerup", onPadPointerUpOrCancel);
  gridEl.addEventListener("pointercancel", onPadPointerUpOrCancel);
  gridEl.addEventListener("pointerleave", onPadPointerLeave);
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", onKeyDown);
}

function onPadPointerDown(event) {
  const pad = event.target.closest(".pad");
  if (!pad) {
    return;
  }
  event.preventDefault();

  if (event.pointerType === "touch") {
    for (const state of pointerStates.values()) {
      if (state.down && state.pointerType === "touch") {
        return;
      }
    }
  }

  gridEl.setPointerCapture?.(event.pointerId);
  pointerStates.set(event.pointerId, { down: true, lastIndex: null, pointerType: event.pointerType });
  const index = Number(pad.dataset.index);
  triggerPad(index, pad, { x: event.clientX, y: event.clientY });
  const state = pointerStates.get(event.pointerId);
  if (state) {
    state.lastIndex = index;
  }
}

function onPadPointerMove(event) {
  const state = pointerStates.get(event.pointerId);
  if (!state || !state.down) {
    return;
  }

  if (state.pointerType === "touch") {
    return;
  }

  // "Hold and sweep" across pads: hit-test the element under the pointer.
  const el = document.elementFromPoint(event.clientX, event.clientY);
  const pad = el?.closest?.(".pad");
  if (!pad) {
    return;
  }

  const index = Number(pad.dataset.index);
  if (state.lastIndex === index) {
    return;
  }

  event.preventDefault();
  triggerPad(index, pad, { x: event.clientX, y: event.clientY });
  state.lastIndex = index;
}

function onPadPointerUpOrCancel(event) {
  const state = pointerStates.get(event.pointerId);
  if (state) {
    state.down = false;
  }
  pointerStates.delete(event.pointerId);
}

function onPadPointerLeave(event) {
  // If the pointer leaves the grid while pressed, keep state; we still handle moves
  // via pointer capture when available. If capture isn't supported, drop state.
  if (!gridEl.hasPointerCapture?.(event.pointerId)) {
    pointerStates.delete(event.pointerId);
  }
}

function onKeyDown(event) {
  const target = event.target;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
    return;
  }
  if (event.repeat) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "m") {
    const modePad = pads[MODE_SWITCH_INDEX];
    triggerPad(MODE_SWITCH_INDEX, modePad, padCenter(modePad));
    return;
  }

  const mappedIndex = KEY_ORDER.indexOf(key);
  if (mappedIndex < 0 || mappedIndex >= MODE_SWITCH_INDEX) {
    return;
  }

  const mappedPad = pads[mappedIndex];
  triggerPad(mappedIndex, mappedPad, padCenter(mappedPad));
}

function triggerPad(index, pad, point) {
  activatePad(pad);
  ensureAudio();

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  if (index === MODE_SWITCH_INDEX) {
    playModeSwitchSound();
    spawnModeSwitchEffects(point.x, point.y);
    makeClickEcho(point.x, point.y, THEMES[currentTheme].accent);
    currentTheme = (currentTheme + 1) % THEMES.length;
    applyTheme(true);
    return;
  }

  playPadSound(index);
  spawnVisual(index, point.x, point.y);
  makeClickEcho(point.x, point.y, THEMES[currentTheme].palette[index % THEMES[currentTheme].palette.length]);
}

function activatePad(pad) {
  pad.classList.add("is-active");
  if (pad._activeTimeout) {
    clearTimeout(pad._activeTimeout);
  }
  pad._activeTimeout = setTimeout(() => {
    pad.classList.remove("is-active");
  }, 140);
}

function applyTheme(announce) {
  const theme = THEMES[currentTheme];
  const root = document.documentElement;
  root.style.setProperty("--bg-start", theme.background[0]);
  root.style.setProperty("--bg-end", theme.background[1]);
  root.style.setProperty("--grid-line", theme.gridLine);
  root.style.setProperty("--accent", theme.accent);
  modeNameEl.textContent = `${theme.name} ${currentTheme + 1}/5`;
  paintPadTints();
  if (announce) {
    showModeToast(theme.name);
  }
}

function paintPadTints() {
  const theme = THEMES[currentTheme];
  for (let index = 0; index < pads.length; index += 1) {
    const pad = pads[index];
    const tint = index === MODE_SWITCH_INDEX ? theme.accent : theme.palette[index % theme.palette.length];
    pad.style.setProperty("--pad-tint", tint);
    if (index === MODE_SWITCH_INDEX) {
      const labelEl = pad.querySelector(".pad-code");
      labelEl.textContent = `MODE ${currentTheme + 1}`;
    }
  }
}

function showModeToast(name) {
  modeToastEl.textContent = name;
  modeToastEl.classList.remove("show");
  void modeToastEl.offsetWidth;
  modeToastEl.classList.add("show");
}

function buildPadCode(index) {
  const letters = ["A", "B", "C", "D", "E"];
  const row = Math.floor(index / GRID_COLUMNS);
  const col = (index % GRID_COLUMNS) + 1;
  return `${letters[row]}${col}`;
}

function padCenter(pad) {
  const rect = pad.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function ensureAudio() {
  if (audioContext) {
    return;
  }

  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) {
    return;
  }

  audioContext = new Ctor();

  compressorNode = audioContext.createDynamicsCompressor();
  compressorNode.threshold.value = -24;
  compressorNode.knee.value = 24;
  compressorNode.ratio.value = 12;
  compressorNode.attack.value = 0.003;
  compressorNode.release.value = 0.25;

  masterGainNode = audioContext.createGain();
  masterGainNode.gain.value = 0.72;

  masterGainNode.connect(compressorNode);
  compressorNode.connect(audioContext.destination);

  noiseBuffer = buildNoiseBuffer(audioContext, 0.45);
}

function playPadSound(index) {
  if (!audioContext || !masterGainNode) {
    return;
  }

  const ctx = audioContext;
  const now = ctx.currentTime;
  const theme = THEMES[currentTheme];
  const settings = theme.audio;
  const frequency = padFrequency(settings, index);
  const attack = 0.003 + (index % 4) * 0.0025;
  const release = settings.release + (index % 6) * 0.027;
  const peak = 0.09 + (index % 5) * 0.02;
  const harmonic = settings.harmonic[index % settings.harmonic.length];

  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  oscA.type = settings.waveforms[index % settings.waveforms.length];
  oscB.type = settings.waveforms[(index + 1) % settings.waveforms.length];
  oscA.frequency.setValueAtTime(frequency, now);
  oscB.frequency.setValueAtTime(frequency * harmonic, now);

  lfo.type = "sine";
  lfo.frequency.setValueAtTime(settings.lfoRate + (index % 7) * 0.41, now);
  lfoGain.gain.setValueAtTime(settings.vibrato + (index % 3) * 0.8, now);
  lfo.connect(lfoGain);
  lfoGain.connect(oscA.frequency);

  filter.type = settings.filter;
  filter.frequency.setValueAtTime(settings.filterBase + index * 95, now);
  filter.Q.setValueAtTime(settings.q + (index % 5) * 0.7, now);

  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(peak, now + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + release);

  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(amp);
  amp.connect(masterGainNode);

  oscA.start(now);
  oscB.start(now);
  lfo.start(now);

  const stopAt = now + release + 0.05;
  oscA.stop(stopAt);
  oscB.stop(stopAt);
  lfo.stop(stopAt);

  if (index % 3 === 0 && noiseBuffer) {
    const noiseSource = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();

    noiseSource.buffer = noiseBuffer;
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(780 + index * 85, now);
    noiseFilter.Q.setValueAtTime(4.2 + (index % 4), now);

    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(settings.noise, now + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGainNode);
    noiseSource.start(now);
    noiseSource.stop(now + 0.14);
  }
}

function playModeSwitchSound() {
  if (!audioContext || !masterGainNode) {
    return;
  }

  const ctx = audioContext;
  const now = ctx.currentTime;
  const multiplier = 1 + currentTheme * 0.04;
  const notes = [392, 493.88, 587.33, 783.99];

  for (let i = 0; i < notes.length; i += 1) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startAt = now + i * 0.045;
    const stopAt = startAt + 0.23;

    osc.type = i % 2 === 0 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(notes[i] * multiplier, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.11, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    osc.connect(gain);
    gain.connect(masterGainNode);
    osc.start(startAt);
    osc.stop(stopAt);
  }
}

function padFrequency(settings, index) {
  const degree = settings.scale[index % settings.scale.length];
  const octave = Math.floor(index / settings.scale.length);
  const midi = settings.root + degree + octave * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function buildNoiseBuffer(ctx, seconds) {
  const sampleRate = ctx.sampleRate;
  const frameCount = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i += 1) {
    const decay = 1 - i / frameCount;
    channel[i] = (Math.random() * 2 - 1) * decay;
  }
  return buffer;
}

function spawnVisual(index, x, y) {
  const theme = THEMES[currentTheme];
  effects.push({
    kind: VISUAL_TYPES[(index + currentTheme * 2) % VISUAL_TYPES.length],
    x,
    y,
    index,
    start: performance.now(),
    duration: reduceMotion ? 260 : 500 + ((index * 31) % 360),
    size: 34 + (index % 8) * 10,
    rotation: Math.random() * Math.PI * 2,
    driftX: (Math.random() - 0.5) * (40 + (index % 4) * 16),
    driftY: (Math.random() - 0.5) * (40 + (index % 3) * 18),
    colorA: theme.palette[index % theme.palette.length],
    colorB: theme.palette[(index + 3) % theme.palette.length]
  });

  if (effects.length > 220) {
    effects.shift();
  }
}

function spawnModeSwitchEffects(x, y) {
  const palette = THEMES[currentTheme].palette;
  const now = performance.now();
  for (let i = 0; i < 12; i += 1) {
    effects.push({
      kind: i % 2 === 0 ? "ring" : "rays",
      x,
      y,
      index: 28 - (i % 6),
      start: now + i * 10,
      duration: reduceMotion ? 260 : 420 + i * 18,
      size: 30 + i * 8,
      rotation: (Math.PI / 6) * i,
      driftX: 0,
      driftY: 0,
      colorA: palette[i % palette.length],
      colorB: palette[(i + 2) % palette.length]
    });
  }
}

function renderFrame(timestamp) {
  fxCtx.clearRect(0, 0, viewportWidth, viewportHeight);

  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    const elapsed = timestamp - effect.start;
    if (elapsed < 0) {
      continue;
    }
    const progress = elapsed / effect.duration;
    if (progress >= 1) {
      effects.splice(i, 1);
      continue;
    }
    drawEffect(effect, progress);
  }

  requestAnimationFrame(renderFrame);
}

function drawEffect(effect, progress) {
  switch (effect.kind) {
    case "ring":
      drawRing(effect, progress);
      break;
    case "polygon":
      drawPolygon(effect, progress);
      break;
    case "rays":
      drawRays(effect, progress);
      break;
    case "squares":
      drawSquares(effect, progress);
      break;
    case "spiral":
      drawSpiral(effect, progress);
      break;
    case "orbit":
      drawOrbit(effect, progress);
      break;
    case "burst":
      drawBurst(effect, progress);
      break;
    case "arcs":
      drawArcs(effect, progress);
      break;
    default:
      drawRing(effect, progress);
      break;
  }
}

function drawRing(effect, progress) {
  const ease = easeOutCubic(progress);
  const fade = 1 - progress;
  const radius = effect.size + ease * 180;
  const inner = effect.size * 0.6 + ease * 110;

  fxCtx.lineWidth = 2 + fade * 5;
  fxCtx.strokeStyle = colorWithAlpha(effect.colorA, fade * 0.95);
  fxCtx.beginPath();
  fxCtx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
  fxCtx.stroke();

  fxCtx.lineWidth = 1 + fade * 3;
  fxCtx.strokeStyle = colorWithAlpha(effect.colorB, fade * 0.8);
  fxCtx.beginPath();
  fxCtx.arc(effect.x, effect.y, inner, 0, Math.PI * 2);
  fxCtx.stroke();
}

function drawPolygon(effect, progress) {
  const ease = easeOutBack(progress);
  const fade = 1 - progress;
  const sides = 3 + (effect.index % 5);
  const radius = effect.size * (0.55 + ease * 1.25);
  const x = effect.x + effect.driftX * progress * 0.2;
  const y = effect.y + effect.driftY * progress * 0.2;

  fxCtx.save();
  fxCtx.translate(x, y);
  fxCtx.rotate(effect.rotation + progress * 4.5);
  fxCtx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const angle = (Math.PI * 2 * i) / sides;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) {
      fxCtx.moveTo(px, py);
    } else {
      fxCtx.lineTo(px, py);
    }
  }
  fxCtx.closePath();
  fxCtx.fillStyle = colorWithAlpha(effect.colorA, 0.18 * fade);
  fxCtx.strokeStyle = colorWithAlpha(effect.colorB, 0.9 * fade);
  fxCtx.lineWidth = 1.5 + fade * 2;
  fxCtx.fill();
  fxCtx.stroke();
  fxCtx.restore();
}

function drawRays(effect, progress) {
  const ease = easeOutCubic(progress);
  const fade = 1 - progress;
  const count = 7 + (effect.index % 8);
  const startRadius = effect.size * 0.25;
  const endRadius = effect.size + ease * 160;

  fxCtx.save();
  fxCtx.translate(effect.x, effect.y);
  fxCtx.rotate(effect.rotation + progress * 1.5);
  fxCtx.lineWidth = 1 + fade * 2.8;

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    fxCtx.strokeStyle = colorWithAlpha(i % 2 === 0 ? effect.colorA : effect.colorB, fade * 0.9);
    fxCtx.beginPath();
    fxCtx.moveTo(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius);
    fxCtx.lineTo(Math.cos(angle) * endRadius, Math.sin(angle) * endRadius);
    fxCtx.stroke();
  }

  fxCtx.restore();
}

function drawSquares(effect, progress) {
  const ease = easeOutCubic(progress);
  const fade = 1 - progress;
  const x = effect.x + effect.driftX * progress * 0.25;
  const y = effect.y + effect.driftY * progress * 0.25;
  const base = effect.size * (0.5 + ease * 1.6);

  fxCtx.save();
  fxCtx.translate(x, y);
  for (let i = 0; i < 3; i += 1) {
    const size = base + i * 24;
    fxCtx.save();
    fxCtx.rotate(effect.rotation + progress * (2.8 + i));
    fxCtx.strokeStyle = colorWithAlpha(i % 2 === 0 ? effect.colorA : effect.colorB, fade * (0.9 - i * 0.2));
    fxCtx.lineWidth = 1.2 + fade * 1.8;
    fxCtx.strokeRect(-size / 2, -size / 2, size, size);
    fxCtx.restore();
  }
  fxCtx.restore();
}

function drawSpiral(effect, progress) {
  const ease = easeOutCubic(progress);
  const fade = 1 - progress;
  const maxAngle = Math.PI * (5 + ease * 8);
  const maxRadius = effect.size + ease * 170;

  fxCtx.save();
  fxCtx.translate(effect.x, effect.y);
  fxCtx.rotate(effect.rotation + progress * 1.1);
  fxCtx.beginPath();
  for (let angle = 0; angle <= maxAngle; angle += 0.2) {
    const ratio = angle / maxAngle;
    const radius = ratio * maxRadius;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (angle === 0) {
      fxCtx.moveTo(px, py);
    } else {
      fxCtx.lineTo(px, py);
    }
  }
  fxCtx.strokeStyle = colorWithAlpha(effect.colorA, fade * 0.95);
  fxCtx.lineWidth = 1 + fade * 2.6;
  fxCtx.stroke();
  fxCtx.restore();
}

function drawOrbit(effect, progress) {
  const ease = easeOutCubic(progress);
  const fade = 1 - progress;
  const count = 6 + (effect.index % 7);
  const orbitRadius = effect.size * 0.4 + ease * 118;
  const dotSize = Math.max(1.8, 6 * fade);

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + effect.rotation + progress * 4;
    const px = effect.x + Math.cos(angle) * orbitRadius;
    const py = effect.y + Math.sin(angle) * orbitRadius;
    fxCtx.fillStyle = colorWithAlpha(i % 2 === 0 ? effect.colorA : effect.colorB, fade * 0.9);
    fxCtx.beginPath();
    fxCtx.arc(px, py, dotSize, 0, Math.PI * 2);
    fxCtx.fill();
  }
}

function drawBurst(effect, progress) {
  const ease = easeOutCubic(progress);
  const fade = 1 - progress;
  const count = 10 + (effect.index % 6);
  const spread = effect.size + ease * 140;

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + effect.rotation;
    const px = effect.x + Math.cos(angle) * spread;
    const py = effect.y + Math.sin(angle) * spread;
    const radius = Math.max(1.5, 5 * fade);
    fxCtx.fillStyle = colorWithAlpha(i % 2 === 0 ? effect.colorA : effect.colorB, fade * 0.92);
    fxCtx.beginPath();
    fxCtx.arc(px, py, radius, 0, Math.PI * 2);
    fxCtx.fill();
  }
}

function drawArcs(effect, progress) {
  const ease = easeOutCubic(progress);
  const fade = 1 - progress;
  const radius = effect.size + ease * 150;

  fxCtx.save();
  fxCtx.translate(effect.x, effect.y);
  fxCtx.rotate(effect.rotation + progress * 2.1);
  fxCtx.lineWidth = 1.2 + fade * 2.2;

  for (let i = 0; i < 4; i += 1) {
    const start = (Math.PI / 2) * i + progress * 2.4;
    const end = start + Math.PI / 3;
    fxCtx.strokeStyle = colorWithAlpha(i % 2 === 0 ? effect.colorA : effect.colorB, fade * 0.95);
    fxCtx.beginPath();
    fxCtx.arc(0, 0, radius - i * 16, start, end);
    fxCtx.stroke();
  }

  fxCtx.restore();
}

function makeClickEcho(x, y, color) {
  const echo = document.createElement("span");
  echo.className = "click-echo";
  echo.style.left = `${x}px`;
  echo.style.top = `${y}px`;
  echo.style.color = color;
  appEl.appendChild(echo);
  echo.addEventListener(
    "animationend",
    () => {
      echo.remove();
    },
    { once: true }
  );
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;
  canvasEl.width = Math.floor(viewportWidth * ratio);
  canvasEl.height = Math.floor(viewportHeight * ratio);
  fxCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function colorWithAlpha(hex, alpha) {
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  let rgb = colorCache.get(hex);
  if (!rgb) {
    rgb = hexToRgb(hex);
    colorCache.set(hex, rgb);
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
}

function hexToRgb(hex) {
  const stripped = hex.replace("#", "");
  const normalized =
    stripped.length === 3
      ? `${stripped[0]}${stripped[0]}${stripped[1]}${stripped[1]}${stripped[2]}${stripped[2]}`
      : stripped;
  const intValue = Number.parseInt(normalized, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255
  };
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function easeOutBack(value) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}

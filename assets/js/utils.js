// Localization & Loader Utilities

const params = new URLSearchParams(location.search);
export const LANG = (params.get("lang") || "km").toLowerCase() === "en" ? "en" : "km";

export function t(obj) {
  return (obj && (obj[LANG] || obj.en || obj.km)) || "";
}

export function translateGenre(genre) {
  if (!genre) return "";
  const key = genre.toUpperCase();
  const genreMap = {
    "ACTION": LANG === "km" ? "វាយប្រហារ" : "Action",
    "COMEDY": LANG === "km" ? "កំប្លែង" : "Comedy",
    "DRAMA": LANG === "km" ? "មនោសញ្ចេតនា" : "Drama",
    "HORROR": LANG === "km" ? "ភ័យរន្ធត់" : "Horror",
    "ROMANCE": LANG === "km" ? "ស្នេហា" : "Romance",
    "THRILLER": LANG === "km" ? "រន្ធត់" : "Thriller",
    "FANTASY": LANG === "km" ? "មហិទ្ធិរិទ្ធ" : "Fantasy",
    "DOCUMENTARY": LANG === "km" ? "ឯកសារ" : "Documentary",
    "SCI_FI": LANG === "km" ? "វិទ្យាសាស្ត្រ" : "Sci-Fi",
    "ANIMATION": LANG === "km" ? "គំនូរជីវចល" : "Animation",
    "SHORTFILM": LANG === "km" ? "រឿងភាគខ្លី" : "Short Film"
  };
  return genreMap[key] || genre;
}

const loader = document.getElementById("loader");
const statusEl = document.getElementById("status");

// Perceived Performance Loading Steps
const STEPS_KM = [
  "កំពុងភ្ជាប់ទៅកាន់ម៉ាស៊ីនមេ...",
  "កំពុងផ្ទៀងផ្ទាត់ពិធីការស្ទ្រីម...",
  "កំពុងទាញយកលិបិក្រមមេឌា...",
  "កំពុងផ្ទុកកញ្ចប់ទិន្នន័យវីដេអូ...",
  "កំពុងចាប់ផ្តើមចាក់..."
];

const STEPS_EN = [
  "Connecting to server...",
  "Verifying stream protocol...",
  "Fetching media index...",
  "Buffering video segments...",
  "Starting playback..."
];

let loadingStepsInterval = null;
let currentStepIndex = 0;

// Low-level: Create a DOM element for a single step
function createStepElement(text, idx) {
  const stepEl = document.createElement("div");
  stepEl.className = "loading-step";
  stepEl.id = `loadingStep_${idx}`;

  const statusEl = document.createElement("span");
  statusEl.className = "loading-step-status";
  const dot = document.createElement("span");
  dot.className = "dot";
  statusEl.appendChild(dot);

  const textEl = document.createElement("span");
  textEl.className = "loading-step-text";
  textEl.textContent = text;

  stepEl.appendChild(statusEl);
  stepEl.appendChild(textEl);
  return stepEl;
}

// Low-level: Populate the steps container with a list of steps
function renderStepsList(stepsContainer, steps) {
  stepsContainer.innerHTML = "";
  steps.forEach((text, idx) => {
    const el = createStepElement(text, idx);
    stepsContainer.appendChild(el);
  });
}

// Low-level: Update DOM classes and icons for steps
function updateStepDOMState(idx, state) {
  const el = document.getElementById(`loadingStep_${idx}`);
  if (!el) return;

  if (state === "active") {
    el.classList.add("active");
  } else if (state === "completed") {
    el.classList.remove("active");
    el.classList.add("completed");
    const status = el.querySelector(".loading-step-status");
    if (status) status.textContent = "✔";
  }
}

// Mid-level: Start the timer loop to progress through the loading steps
function scheduleNextStep(timings, stepsCount) {
  if (currentStepIndex >= stepsCount - 1) return;

  updateStepDOMState(currentStepIndex, "completed");
  currentStepIndex++;
  updateStepDOMState(currentStepIndex, "active");

  const delay = timings[currentStepIndex - 1] || 600;
  loadingStepsInterval = setTimeout(() => {
    scheduleNextStep(timings, stepsCount);
  }, delay);
}

// High-level orchestration: Initialize the progressive loading steps UI
function startLoadingSteps() {
  const stepsContainer = document.getElementById("loadingStepsContainer");
  if (!stepsContainer) return;

  if (loadingStepsInterval) clearTimeout(loadingStepsInterval);
  
  const steps = LANG === "km" ? STEPS_KM : STEPS_EN;
  renderStepsList(stepsContainer, steps);
  stepsContainer.style.display = "flex";

  currentStepIndex = 0;
  updateStepDOMState(0, "active");

  const timings = [400, 500, 600, 800]; // Duration of step 0, 1, 2, 3
  const firstDelay = timings[0];
  loadingStepsInterval = setTimeout(() => {
    scheduleNextStep(timings, steps.length);
  }, firstDelay);
}

// High-level orchestration: Cleanup and hide the loading steps UI
function stopLoadingSteps() {
  if (loadingStepsInterval) {
    clearTimeout(loadingStepsInterval);
    loadingStepsInterval = null;
  }
  const stepsContainer = document.getElementById("loadingStepsContainer");
  if (stepsContainer) {
    stepsContainer.style.display = "none";
    stepsContainer.innerHTML = "";
  }
}

export function hideLoader() {
  if (loader) loader.classList.add("hide");
  stopLoadingSteps();
}

export function showLoader(label) {
  if (!loader) return;
  loader.classList.remove("hide");
  const l = loader.querySelector(".label");
  if (l && label) l.textContent = label;

  const isInitialLoad = label && (label === "Loading…" || label === "កំពុងផ្ទុក...");
  if (isInitialLoad) {
    startLoadingSteps();
  }
}

export function showStatus(html, isErr) {
  hideLoader();
  if (!statusEl) return;
  statusEl.style.display = "block";
  statusEl.className = "msg" + (isErr ? " err" : "");
  statusEl.innerHTML = html; // static trusted strings only
}

export function showStatusText(prefix, codeText, suffix, isErr) {
  hideLoader();
  if (!statusEl) return;
  statusEl.style.display = "block";
  statusEl.className = "msg" + (isErr ? " err" : "");
  statusEl.textContent = prefix;
  if (codeText != null) {
    const c = document.createElement("code");
    c.textContent = codeText; // safe textContent
    statusEl.appendChild(c);
    if (suffix) statusEl.appendChild(document.createTextNode(suffix));
  }
}

export function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast-notification";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");
  
  if (toast.timeoutId) clearTimeout(toast.timeoutId);
  toast.timeoutId = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

export function formatPlaybackTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = Math.floor(totalSeconds % 60);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}

export function toKhmerNumerals(num) {
  if (num == null) return "";
  const khmerDigits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  return String(num).replace(/[0-9]/g, (w) => khmerDigits[+w]);
}

let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

export function playPopSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn("Web Audio Pop failed:", e);
  }
}

export function playSparkleSound() {
  try {
    const ctx = getAudioContext();
    
    const playNote = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = ctx.currentTime;
    playNote(523.25, now, 0.12); // C5
    playNote(659.25, now + 0.08, 0.2); // E5
    playNote(783.99, now + 0.16, 0.25); // G5
  } catch (e) {
    console.warn("Web Audio Sparkle failed:", e);
  }
}

export function playRetroClickSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {
    console.warn("Web Audio Retro Click failed:", e);
  }
}

export function triggerOsd(text) {
  const osd = document.getElementById("crtOsd");
  if (!osd) return;
  osd.textContent = text;
  osd.classList.add("show");
  
  if (osd.timeoutId) clearTimeout(osd.timeoutId);
  osd.timeoutId = setTimeout(() => {
    osd.classList.remove("show");
  }, 1500);
}

export function triggerCrtStatic() {
  const staticEl = document.getElementById("crtStatic");
  if (!staticEl) return;
  staticEl.classList.add("active");
  setTimeout(() => {
    staticEl.classList.remove("active");
  }, 400);
}

export function triggerDialRipple(dial) {
  if (!dial) return;
  dial.classList.remove("ripple-effect");
  void dial.offsetWidth;
  dial.classList.add("ripple-effect");
  if (dial._rippleTimeout) clearTimeout(dial._rippleTimeout);
  dial._rippleTimeout = setTimeout(() => {
    dial.classList.remove("ripple-effect");
  }, 400);
}




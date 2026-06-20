import { playSparkleSound, playPopSound, LANG, toKhmerNumerals } from './utils.js';

let scrollListener = null;
let activePage = null;
let isCompleted = false;

const QUEST_CONFIGS = {
  legal: {
    titleEn: "QUEST: Decipher the Digital Covenant (Privacy & DMCA)",
    titleKm: "ដំណើរស្វែងរក៖ ស្វែងយល់ពីកិច្ចព្រមព្រៀងឌីជីថល (Privacy & DMCA)",
    level: "LVL 12",
    completedMsgEn: "Covenant Deciphered! 🛡️ DMCA Shield Active.",
    completedMsgKm: "បេសកកម្មជោគជ័យ! 🛡️ ទទួលបានខែលការពារ DMCA ។"
  },
  about: {
    titleEn: "QUEST: Meet the Creators (About Us)",
    titleKm: "ដំណើរស្វែងរក៖ ជួបជាមួយអ្នកបង្កើត (About Us)",
    level: "LVL 1",
    completedMsgEn: "Creators Discovered! 🤝 Community Connected.",
    completedMsgKm: "បេសកកម្មជោគជ័យ! 🤝 ជួបជាមួយអ្នកបង្កើតដោយជោគជ័យ។"
  },
  contact: {
    titleEn: "QUEST: Open the Communications Portal (Contact Us)",
    titleKm: "ដំណើរស្វែងរក៖ បើកច្រកទំនាក់ទំនង (Contact Us)",
    level: "LVL 5",
    completedMsgEn: "Signal Sent! 📡 Comm Link Opened.",
    completedMsgKm: "បេសកកម្មជោគជ័យ! 📡 បើកប្រព័ន្ធបញ្ជូនសញ្ញាជោគជ័យ។"
  },
  terms: {
    titleEn: "QUEST: Read the Rules of Play (Terms of Service)",
    titleKm: "ដំណើរស្វែងរក៖ អានច្បាប់នៃការលេង (Terms of Service)",
    level: "LVL 8",
    completedMsgEn: "Rules Accepted! 📜 Legally Bound.",
    completedMsgKm: "បេសកកម្មជោគជ័យ! 📜 យល់ព្រមតាមច្បាប់នៃការលេង។"
  }
};

export function initQuest(pageParam) {
  teardownQuest();
  
  const config = QUEST_CONFIGS[pageParam];
  if (!config) return;
  
  activePage = pageParam;
  isCompleted = localStorage.getItem(`quest_completed_${pageParam}`) === 'true';
  
  const viewEl = document.getElementById(`${pageParam}View`);
  if (!viewEl) return;
  
  const metaContainer = viewEl.querySelector('.meta');
  if (!metaContainer) return;
  
  // Create Quest HUD
  let hud = metaContainer.querySelector('.quest-status-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.className = 'quest-status-hud';
    metaContainer.insertBefore(hud, metaContainer.firstChild);
  }
  
  const titleText = LANG === 'km' ? config.titleKm : config.titleEn;
  hud.innerHTML = `
    <div class="quest-title-container">
      <span class="quest-level-badge">${config.level}</span>
      <span class="quest-title-text">${titleText}</span>
      <span class="quest-status-badge ${isCompleted ? 'completed' : ''}">
        ${isCompleted ? (LANG === 'km' ? 'សម្រេចបាន' : 'COMPLETED') : (LANG === 'km' ? 'សកម្ម' : 'ACTIVE')}
      </span>
    </div>
    <div class="quest-progress-bar-wrapper">
      <div class="quest-progress-bar-filled" style="width: ${isCompleted ? '100%' : '0%'};"></div>
      <span class="quest-progress-percentage">${isCompleted ? '100%' : '0%'}</span>
    </div>
  `;
  
  // Inject Choice Options styled back button
  const originalBack = metaContainer.querySelector('.clear-chip');
  if (originalBack && !originalBack.parentNode.classList.contains('quest-choice-box')) {
    const parent = originalBack.parentNode;
    const choiceBox = document.createElement('div');
    choiceBox.className = 'quest-choice-box';
    
    const choiceOption = document.createElement('a');
    choiceOption.className = 'quest-choice-option';
    choiceOption.href = './';
    choiceOption.innerHTML = `
      <span class="quest-choice-cursor">▶</span>
      <span>${originalBack.textContent}</span>
    `;
    
    // Bind hover sound effect
    choiceOption.addEventListener('mouseenter', () => playPopSound());
    
    choiceBox.appendChild(choiceOption);
    parent.replaceChild(choiceBox, originalBack);
  }

  // Hook Scroll Listener
  if (!isCompleted) {
    scrollListener = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      
      const scrollPercent = Math.min(100, Math.round((window.scrollY / docHeight) * 100));
      
      const filled = hud.querySelector('.quest-progress-bar-filled');
      const text = hud.querySelector('.quest-progress-percentage');
      if (filled) filled.style.width = `${scrollPercent}%`;
      if (text) text.textContent = `${scrollPercent}%`;
      
      if (scrollPercent >= 99 && !isCompleted) {
        completeQuest(pageParam, config, hud);
      }
    };
    
    window.addEventListener('scroll', scrollListener);
  }
  
  if (pageParam === 'about') {
    initAboutUsInteractivePage(viewEl);
  }
}

function completeQuest(pageParam, config, hud) {
  isCompleted = true;
  localStorage.setItem(`quest_completed_${pageParam}`, 'true');
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener);
    scrollListener = null;
  }
  
  // Update HUD status
  const badge = hud.querySelector('.quest-status-badge');
  if (badge) {
    badge.textContent = LANG === 'km' ? 'សម្រេចបាន' : 'COMPLETED';
    badge.classList.add('completed');
  }
  const filled = hud.querySelector('.quest-progress-bar-filled');
  const text = hud.querySelector('.quest-progress-percentage');
  if (filled) filled.style.width = '100%';
  if (text) text.textContent = '100%';

  // Play sparkle sound
  playSparkleSound();

  // Spawn full-screen confetti Lottie overlay
  const confetti = document.createElement('dotlottie-player');
  confetti.setAttribute('src', 'https://lottie.host/e285a86a-733d-4c3c-83c7-9be7f61be6b5/O65Y9xKuxR.lottie');
  confetti.setAttribute('background', 'transparent');
  confetti.setAttribute('speed', '1');
  confetti.style.position = 'fixed';
  confetti.style.inset = '0';
  confetti.style.zIndex = '9999';
  confetti.style.pointerEvents = 'none';
  confetti.setAttribute('autoplay', '');
  document.body.appendChild(confetti);

  setTimeout(() => {
    confetti.remove();
  }, 4000);
  
  // Spawn notification overlay
  let notif = document.createElement('div');
  notif.className = 'quest-complete-notification';
  
  const bannerText = LANG === 'km' ? "🏆 ដំណើរស្វែងរកត្រូវបានសម្រេច!" : "🏆 QUEST COMPLETE!";
  const subText = LANG === 'km' ? config.completedMsgKm : config.completedMsgEn;
  
  notif.innerHTML = `
    <div class="quest-complete-banner">${bannerText}</div>
    <div class="quest-complete-rewards">${subText}</div>
  `;
  document.body.appendChild(notif);
  
  setTimeout(() => {
    notif.classList.add('fade-out');
    setTimeout(() => notif.remove(), 500);
  }, 3500);
}

export function teardownQuest() {
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener);
    scrollListener = null;
  }
  cleanupAboutTimers();
  activePage = null;
  isCompleted = false;
}

/* ── About Us Interactive Psychology & Philosophy UX Logic ── */

let breathingTimeoutId = null;
let currentBreathingState = 'idle';
let currentBreathCount = 0;

const SUBJECTS = [
  { en: "I", km: "ខ្ញុំ" },
  { en: "We", km: "ពួកយើង" },
  { en: "A free agent", km: "សភាវៈសេរី" }
];
const ACTIONS = [
  { en: "choose to build", km: "ជ្រើសរើសបង្កើត" },
  { en: "actively shape", km: "កំណត់រូបរាង" },
  { en: "freely construct", km: "ស្ថាបនាដោយសេរី" }
];
const OBJECTS = [
  { en: "my own path", km: "ផ្លូវផ្ទាល់ខ្លួន" },
  { en: "meaning in chaos", km: "ន័យក្នុងភាពវឹកវរ" },
  { en: "a clean reality", km: "តថភាពដ៏ស្អាតស្អំ" }
];

let slotIndices = { subject: 0, action: 0, object: 0 };

function initAboutUsInteractivePage(viewEl) {
  if (viewEl.dataset.initialized === 'true') {
    setPath('all', viewEl);
    return;
  }
  setupPathSelector(viewEl);
  setupExpandableCards(viewEl);
  viewEl.dataset.initialized = 'true';
  setPath('all', viewEl);
}

function setupPathSelector(viewEl) {
  const container = viewEl.querySelector('.philosophical-path-container');
  if (!container) return;
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.path-btn');
    if (btn) setPath(btn.dataset.path, viewEl);
  });
}

function setupExpandableCards(viewEl) {
  const cards = viewEl.querySelectorAll('.expandable-card');
  cards.forEach(card => {
    const toggle = () => {
      playPopSound();
      card.classList.toggle('is-expanded');
    };
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.card-details')) toggle();
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

function setPath(path, viewEl) {
  const buttons = viewEl.querySelectorAll('.path-btn');
  buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.path === path));
  viewEl.classList.remove('path-stoic', 'path-existential');
  if (path !== 'all') viewEl.classList.add(`path-${path}`);
  const activityCard = viewEl.querySelector('#philosophicalActivityCard');
  if (activityCard) {
    cleanupAboutTimers();
    if (path === 'all') {
      activityCard.style.display = 'none';
      activityCard.innerHTML = '';
    } else {
      activityCard.style.display = 'block';
      renderActivityWidget(path, activityCard);
    }
  }
  playPopSound();
}

function renderActivityWidget(path, container) {
  if (path === 'stoic') {
    container.innerHTML = `
      <h3>
        <span class="lang-en-block">Stoic Mindfulness Exercise</span>
        <span class="lang-km-block">លំហាត់ធ្វើចិត្តឱ្យស្ងប់បែបស្តូក</span>
      </h3>
      <p class="activity-desc">
        <span class="lang-en-block">Marcus Aurelius teaches us to seek tranquility within. Sync your breath with the circle below.</span>
        <span class="lang-km-block">ម៉ាកុស អូរេលីយូស បង្រៀនឱ្យស្វែងរកភាពស្ងប់ស្ងាត់ក្នុងចិត្ត។ សម្រួលដង្ហើមតាមរង្វង់ខាងក្រោម។</span>
      </p>
      <div class="breathing-circle-wrapper">
        <div class="breathing-circle" id="breathingCircle">
          <span class="lang-en-block">Start</span>
          <span class="lang-km-block">ចាប់ផ្តើម</span>
        </div>
      </div>
      <div class="breathing-stats">
        <span class="lang-en-block">Breaths: <span id="breathCount">0</span>/3</span>
        <span class="lang-km-block">ដង្ហើម៖ <span id="breathCountKm">០</span>/៣</span>
      </div>
    `;
    initStoicWidget(container);
  } else {
    container.innerHTML = `
      <h3>
        <span class="lang-en-block">Existential Meaning Builder</span>
        <span class="lang-km-block">ប្រព័ន្ធបង្កើតអត្ថន័យអត្ថិភាពនិយម</span>
      </h3>
      <p class="activity-desc">
        <span class="lang-en-block">Jean-Paul Sartre wrote that you are defined by your choices. Construct your life's code:</span>
        <span class="lang-km-block">ហ្សង់ ប៉ូល សារត្រ (Sartre) សរសេរថា អ្នកត្រូវបានកំណត់ដោយជម្រើសរបស់អ្នក។ ចូរបង្កើតកូដជីវិតរបស់អ្នក៖</span>
      </p>
      <div class="builder-slots">
        <div class="builder-column">
          <span class="column-label lang-en-block">Subject</span>
          <span class="column-label lang-km-block">ប្រធាន</span>
          <button class="word-chip" id="slotSubject">I</button>
        </div>
        <div class="builder-column">
          <span class="column-label lang-en-block">Action</span>
          <span class="column-label lang-km-block">សកម្មភាព</span>
          <button class="word-chip" id="slotAction">choose to build</button>
        </div>
        <div class="builder-column">
          <span class="column-label lang-en-block">Object</span>
          <span class="column-label lang-km-block">កម្មបទ</span>
          <button class="word-chip" id="slotObject">my own path</button>
        </div>
      </div>
      <div style="margin-top:20px; text-align:center;">
        <button class="affirm-btn" id="affirmBtn">
          <span class="lang-en-block">Affirm My Choice</span>
          <span class="lang-km-block">បញ្ជាក់ជម្រើសរបស់ខ្ញុំ</span>
        </button>
      </div>
      <div id="mantraOutput" class="mantra-output" style="display:none;"></div>
    `;
    initExistentialWidget(container);
  }
}

function initStoicWidget(container) {
  const circle = container.querySelector('#breathingCircle');
  if (!circle) return;
  currentBreathingState = 'idle';
  currentBreathCount = 0;
  circle.addEventListener('click', () => {
    if (currentBreathingState === 'idle') {
      playPopSound();
      startBreathingCycle(circle, container);
    }
  });
}

function updateBreathingText(circle, enText, kmText) {
  const enSpan = circle.querySelector('.lang-en-block');
  const kmSpan = circle.querySelector('.lang-km-block');
  if (enSpan) enSpan.textContent = enText;
  if (kmSpan) kmSpan.textContent = kmText;
}

function startBreathingCycle(circle, container) {
  const countEn = container.querySelector('#breathCount');
  const countKm = container.querySelector('#breathCountKm');
  const stepInhale = () => {
    currentBreathingState = 'inhaling';
    circle.className = 'breathing-circle inhaling';
    updateBreathingText(circle, 'Inhale...', 'ដកដង្ហើមចូល...');
    breathingTimeoutId = setTimeout(stepHold, 4000);
  };
  const stepHold = () => {
    currentBreathingState = 'holding';
    circle.className = 'breathing-circle holding';
    updateBreathingText(circle, 'Hold...', 'ទប់ដង្ហើម...');
    breathingTimeoutId = setTimeout(stepExhale, 2000);
  };
  const stepExhale = () => {
    currentBreathingState = 'exhaling';
    circle.className = 'breathing-circle exhaling';
    updateBreathingText(circle, 'Exhale...', 'ដកដង្ហើមចេញ...');
    breathingTimeoutId = setTimeout(stepRest, 4000);
  };
  const stepRest = () => {
    currentBreathingState = 'resting';
    circle.className = 'breathing-circle';
    updateBreathingText(circle, 'Rest...', 'សម្រាក...');
    currentBreathCount++;
    if (countEn) countEn.textContent = currentBreathCount;
    if (countKm) countKm.textContent = toKhmerNumerals(currentBreathCount);
    if (currentBreathCount >= 3) {
      completeBreathing(circle, container);
    } else {
      breathingTimeoutId = setTimeout(stepInhale, 1000);
    }
  };
  stepInhale();
}

function completeBreathing(circle, container) {
  currentBreathingState = 'completed';
  cleanupAboutTimers();
  playSparkleSound();
  circle.className = 'breathing-circle';
  updateBreathingText(circle, 'Centered', 'ស្ងប់ចិត្ត');
  const desc = container.querySelector('.activity-desc');
  if (desc) {
    desc.innerHTML = `
      <span class="lang-en-block" style="color: #34c759; font-weight: 600;">Tranquility Achieved! Your mind is focused. +10 XP Stoic Alignment 🧘</span>
      <span class="lang-km-block" style="color: #34c759; font-weight: 600;">ទទួលបានភាពស្ងប់ស្ងាត់! ផ្លូវចិត្តរបស់អ្នកមានការផ្តោតអារម្មណ៍។ ទទួលបាន +10 XP ស្តូកនិយម 🧘</span>
    `;
  }
}

function initExistentialWidget(container) {
  slotIndices = { subject: 0, action: 0, object: 0 };
  const updateChipTexts = () => {
    const sub = container.querySelector('#slotSubject');
    const act = container.querySelector('#slotAction');
    const obj = container.querySelector('#slotObject');
    if (sub) sub.textContent = LANG === 'km' ? SUBJECTS[slotIndices.subject].km : SUBJECTS[slotIndices.subject].en;
    if (act) act.textContent = LANG === 'km' ? ACTIONS[slotIndices.action].km : ACTIONS[slotIndices.action].en;
    if (obj) obj.textContent = LANG === 'km' ? OBJECTS[slotIndices.object].km : OBJECTS[slotIndices.object].en;
  };
  updateChipTexts();
  ['Subject', 'Action', 'Object'].forEach(slot => {
    const btn = container.querySelector(`#slot${slot}`);
    if (btn) btn.addEventListener('click', (e) => {
      const key = slot.toLowerCase();
      const list = key === 'subject' ? SUBJECTS : (key === 'action' ? ACTIONS : OBJECTS);
      slotIndices[key] = (slotIndices[key] + 1) % list.length;
      updateChipTexts();
      playPopSound();
      spawnSparkles(e.currentTarget);
    });
  });
  setupAffirmButton(container);
}

function setupAffirmButton(container) {
  const btn = container.querySelector('#affirmBtn');
  const output = container.querySelector('#mantraOutput');
  if (!btn || !output) return;
  btn.addEventListener('click', () => {
    playSparkleSound();
    spawnSparkles(btn);
    const s = SUBJECTS[slotIndices.subject];
    const a = ACTIONS[slotIndices.action];
    const o = OBJECTS[slotIndices.object];
    output.style.display = 'block';
    output.innerHTML = `
      <span class="lang-en-block">"${s.en} ${a.en} ${o.en}."<br><small style="color:var(--fg-3)">— A reality chosen by you. +10 XP Existential Alignment ✨</small></span>
      <span class="lang-km-block">«${s.km} ${a.km} ${o.km}»<br><small style="color:var(--fg-3)">— ជាការពិតដែលអ្នកបានជ្រើសរើស។ ទទួលបាន +10 XP អត្ថិភាពនិយម ✨</small></span>
    `;
  });
}

function spawnSparkles(el) {
  const rect = el.getBoundingClientRect();
  const container = document.body;
  for (let i = 0; i < 6; i++) {
    const p = document.createElement('span');
    p.className = 'existential-sparkle';
    const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width;
    const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * rect.height;
    p.style.left = `${x + window.scrollX}px`;
    p.style.top = `${y + window.scrollY}px`;
    const size = Math.random() * 6 + 4;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    const colors = ['#ff007f', '#7b2cbf', '#00f2fe', '#ffd60a'];
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 40 + 20;
    p.style.setProperty('--vx', `${Math.cos(angle) * speed}px`);
    p.style.setProperty('--vy', `${Math.sin(angle) * speed}px`);
    container.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function cleanupAboutTimers() {
  if (breathingTimeoutId) {
    clearTimeout(breathingTimeoutId);
    breathingTimeoutId = null;
  }
  currentBreathingState = 'idle';
}

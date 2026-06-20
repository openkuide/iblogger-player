// Ads rotation and sliders logic

export function initAdBanner() {
  const ad = document.getElementById("ad");
  const adText = document.getElementById("adText");
  const adClose = document.getElementById("adClose");
  if (!ad || !adText || !adClose) return;

  const ADS = [
    "📢 សណ្ដែកដីលីងក្ដៅៗ ស្រួយខ្ញោក ញ៉ាំជជែកគ្នាកប់ស៊េរីម៉ង់ហ្វេន! 🥜✨",
    "🍲 បបរក្ដៅៗ ឆ្ងាញ់អេមសន្លប់ មកញ៉ាំឱ្យលឿនមុនអស់ម៉ូយៗ! 😋🔥",
  ];
  let i = 0;
  adText.textContent = ADS[0];
  const timer = setInterval(() => {
    i = (i + 1) % ADS.length;
    adText.style.animation = "none";
    adText.offsetHeight; // force reflow
    adText.style.animation = "";
    adText.textContent = ADS[i];
  }, 12000);

  adClose.addEventListener("click", () => {
    clearInterval(timer);
    ad.style.display = "none";
  });
}

function createSlideElement(slide, index) {
  const container = document.createElement("div");
  container.className = "slide c" + (index % 4);

  const bigText = document.createElement("div");
  bigText.className = "big";
  bigText.textContent = slide.big;

  const smallText = document.createElement("div");
  smallText.className = "small";
  smallText.textContent = slide.small;

  container.appendChild(bigText);
  container.appendChild(smallText);
  return container;
}

function createDotElement(index, onClick) {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.setAttribute("aria-label", "Slide " + (index + 1));
  dot.addEventListener("click", onClick);
  return dot;
}

export function initAdSlider() {
  const box = document.getElementById("adSlide");
  const track = document.getElementById("asTrack");
  const dots = document.getElementById("asDots");
  const close = document.getElementById("asClose");
  if (!box || !track || !dots || !close) return;

  const SLIDES = [
    { big: "សណ្ដែកដីលីង ស្រួយខ្ញោក! 🥜", small: "ញ៉ាំជជែកគ្នាដឹងតែ អេមសន្លប់ ហ្មងម៉ូយៗ! ✨" },
    { big: "បបរក្ដៅៗ ឆ្ងាញ់កប់ស៊េរី! 🍲", small: "រសជាតិលំដាប់ផ្កាយ៥ ញ៉ាំហើយចង់ញ៉ាំទៀត! 😋" },
    { big: "ទឹកក្រូចស្រស់ធម្មជាតិ ១០០%! 🍊", small: "ផឹកមួយក្អឿក ស្រស់ស្រាយចែស ជំនួយសម្រស់ឱ្យកាន់តែស្លេយ! ⚡💅" },
    { big: "នំបុ័ងស្រួយស្រឹប ក្ដៅៗហុយៗ! 🥖", small: "ទើបដុតចេញពីឡ ឈ្ងុយសន្លប់ កុំឱ្យកន្លងហួស! 🔥" },
  ];

  let activeIndex = 0;
  const dotEls = [];

  SLIDES.forEach((slide, idx) => {
    const slideEl = createSlideElement(slide, idx);
    track.appendChild(slideEl);

    const dotEl = createDotElement(idx, () => navigateTo(idx, true));
    dots.appendChild(dotEl);
    dotEls.push(dotEl);
  });

  function updateDisplay() {
    track.style.transform = "translateX(-" + (activeIndex * 100) + "%)";
    dotEls.forEach((d, idx) => {
      d.classList.toggle("on", idx === activeIndex);
    });
  }

  let timer = setInterval(() => navigateTo(activeIndex + 1, false), 4000);

  function navigateTo(n, manual) {
    activeIndex = (n + SLIDES.length) % SLIDES.length;
    updateDisplay();
    if (manual) {
      clearInterval(timer);
      timer = setInterval(() => navigateTo(activeIndex + 1, false), 4000);
    }
  }

  box.hidden = false;
  updateDisplay();

  close.addEventListener("click", () => {
    clearInterval(timer);
    box.remove();
  });
}

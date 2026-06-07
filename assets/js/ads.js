// Ads rotation and sliders logic

export function initAdBanner() {
  const ad = document.getElementById("ad");
  const adText = document.getElementById("adText");
  const adClose = document.getElementById("adClose");
  if (!ad || !adText || !adClose) return;

  const ADS = [
    "📢 មានលក់សណ្ដែកីថ្មីៗ ឆ្ងាញ់ៗ ហ៊ាន! 🥜",
    "🍵 មានលក់បបរ ក្ដៅៗ ហិហិ មកញ៉ាំបាន! 😋",
  ];
  let i = 0;
  adText.textContent = ADS[0];
  const timer = setInterval(() => {
    i = (i + 1) % ADS.length;
    adText.style.animation = "none";
    adText.offsetHeight; // force reflow
    adText.style.animation = "";
    adText.textContent = ADS[i];
  }, 4000);

  adClose.addEventListener("click", () => {
    clearInterval(timer);
    ad.style.display = "none";
  });
}

export function initAdSlider() {
  const box = document.getElementById("adSlide");
  const track = document.getElementById("asTrack");
  const dots = document.getElementById("asDots");
  const close = document.getElementById("asClose");
  if (!box || !track || !dots || !close) return;

  const SLIDES = [
    { big: "សណ្ដែកីថ្មីៗ ឆ្ងាញ់ៗ! 🥜", small: "ហ៊ាន! មកញ៉ាំបាន ហិហិ" },
    { big: "បបរក្ដៅៗ ឆ្ងាញ់ណាស់! 🍲", small: "ឆាបៗ មុនអស់ 😋" },
    { big: "ទឹកក្រូចស្រស់ៗ 🍊", small: "ត្រជាក់ ផឹកហើយស្រស់ស្រាយ" },
    { big: "នំបុ័ងក្ដៅ ៗ 🥖", small: "ទើបនឹងដុតចេញ ផ្ដៅ!" },
  ];

  let i = 0;
  SLIDES.forEach((s, idx) => {
    const slide = document.createElement("div");
    slide.className = "slide c" + (idx % 4);
    const big = document.createElement("div");
    big.className = "big";
    big.textContent = s.big;
    const small = document.createElement("div");
    small.className = "small";
    small.textContent = s.small;
    slide.appendChild(big);
    slide.appendChild(small);
    track.appendChild(slide);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", "Slide " + (idx + 1));
    dot.addEventListener("click", () => go(idx, true));
    dots.appendChild(dot);
  });

  const dotEls = Array.from(dots.children);
  function render() {
    track.style.transform = "translateX(-" + (i * 100) + "%)";
    dotEls.forEach((d, idx) => {
      d.classList.toggle("on", idx === i);
    });
  }

  let timer = setInterval(() => go(i + 1, false), 4000);
  function go(n, manual) {
    i = (n + SLIDES.length) % SLIDES.length;
    render();
    if (manual) {
      clearInterval(timer);
      timer = setInterval(() => go(i + 1, false), 4000);
    }
  }

  box.hidden = false;
  render();
  close.addEventListener("click", () => {
    clearInterval(timer);
    box.remove();
  });
}

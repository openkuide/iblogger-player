// Localization & Loader Utilities

const params = new URLSearchParams(location.search);
export const LANG = (params.get("lang") || "km").toLowerCase() === "en" ? "en" : "km";

export function t(obj) {
  return (obj && (obj[LANG] || obj.en || obj.km)) || "";
}

const loader = document.getElementById("loader");
const statusEl = document.getElementById("status");

export function hideLoader() {
  if (loader) loader.classList.add("hide");
}

export function showLoader(label) {
  if (!loader) return;
  loader.classList.remove("hide");
  const l = loader.querySelector(".label");
  if (l && label) l.textContent = label;
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

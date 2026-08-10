/* =============================================================================
   ui-common.js — bits both tools share: resolving colors through the browser,
   clipboard + toast, and the theme toggle.
   Depends on color-engine.js. Loaded as a classic script.
   ============================================================================= */
"use strict";

const $ = id => document.getElementById(id);
const escapeHtml = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

/* Interpolation spaces that carry a hue angle, so `<method> hue` applies. */
const POLAR_SPACES = new Set(["hsl", "hwb", "lch", "oklch"]);

/* =========================================================================
   BROWSER PROBE — the browser is the source of truth for color-mix().
   ========================================================================= */

const probe = document.createElement("span");
probe.setAttribute("aria-hidden", "true");
probe.style.cssText = "position:fixed;left:-9999px;top:0;width:0;height:0;pointer-events:none";
document.body.appendChild(probe);

const resolveCache = new Map();
function resolveColor(expr) {
  if (resolveCache.has(expr)) return resolveCache.get(expr);
  let out = null;
  probe.style.color = "";
  probe.style.color = expr;
  if (probe.style.color) out = getComputedStyle(probe).color || null;
  resolveCache.set(expr, out);
  return out;
}
const isValidColor = v => { probe.style.color = ""; probe.style.color = v; return !!probe.style.color; };


/* =============================================================================
   CLIPBOARD + TOAST
   ============================================================================= */

let toastTimer;
function toast(msg) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1400);
}

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast((label ? label + "  " : "") + "copied");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
    toast("copied");
  }
}

/* Swaps a copy button's icon to a checkmark for a beat. */
function flashCopied(btn) {
  btn.classList.add("copied");
  clearTimeout(btn._flash);
  btn._flash = setTimeout(() => btn.classList.remove("copied"), 1300);
}

/* =============================================================================
   THEME — shared across both pages via one localStorage key.
   ============================================================================= */

const THEME_KEY = "color-tools:theme";
let themePref = null;               // null = follow the system
let onThemeChange = null;

function applyTheme() {
  const dark = themePref ? themePref === "dark"
    : !window.matchMedia("(prefers-color-scheme: light)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const c1 = dark ? "#20232c" : "#e2e5ea", c2 = dark ? "#171920" : "#f7f8fa";
  document.documentElement.style.setProperty("--checker",
    `linear-gradient(45deg,${c1} 25%,transparent 25%,transparent 75%,${c1} 75%),` +
    `linear-gradient(45deg,${c1} 25%,${c2} 25%,${c2} 75%,${c1} 75%)`);
  const btn = $("themeBtn");
  if (btn) {
    const label = `Switch to ${dark ? "light" : "dark"} theme`;
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
  }
}

function initTheme(onChange) {
  onThemeChange = onChange;
  try { themePref = localStorage.getItem(THEME_KEY) || null; } catch {}
  applyTheme();
  const btn = $("themeBtn");
  if (btn) btn.addEventListener("click", () => {
    themePref = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem(THEME_KEY, themePref); } catch {}
    applyTheme();
    if (onThemeChange) onThemeChange();
  });
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (!themePref) { applyTheme(); if (onThemeChange) onThemeChange(); }
  });
}

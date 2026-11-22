// Génère l'icône, l'écran de lancement et le favicon à partir du logo (olive + feuille dorée).
// Usage (outil de développement, hors app): node scripts/make-assets.cjs   — nécessite Playwright + Chromium sur votre machine.
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');

const OLIVE = '#4A6A1C', GOLD = '#E0B13A', CREAM = '#F4F1E2';

// Même dessin que le composant Logo (src/components/Icons.tsx).
const mark = (size, { mono = false } = {}) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="16" cy="20" rx="8" ry="9" fill="${mono ? '#fff' : OLIVE}"/>
  <path d="M16 11 C16 5 20 2 27 2 C27 8 23 11 16 11 Z" fill="${mono ? '#fff' : GOLD}"/>
  ${mono ? '' : '<ellipse cx="13" cy="17" rx="2" ry="3" fill="#fff" opacity="0.22"/>'}
</svg>`;
const centered = (w, h, inner) => `<div style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center">${inner}</div>`;

const jobs = [
  { out: 'assets/icon.png', w: 1024, h: 1024, bg: CREAM, html: centered(1024, 1024, mark(680)) },
  // Android adaptatif: le logo reste dans la zone sûre (≈ 66 % du centre).
  { out: 'assets/android-icon-foreground.png', w: 512, h: 512, bg: null, html: centered(512, 512, mark(300)) },
  { out: 'assets/android-icon-background.png', w: 512, h: 512, bg: CREAM, html: '<div style="width:512px;height:512px"></div>' },
  { out: 'assets/android-icon-monochrome.png', w: 432, h: 432, bg: null, html: centered(432, 432, mark(250, { mono: true })) },
  { out: 'assets/splash-icon.png', w: 1024, h: 1024, bg: null, html: centered(1024, 1024, mark(560)) },
  { out: 'assets/favicon.png', w: 48, h: 48, bg: CREAM, html: centered(48, 48, mark(36)) },
];

(async () => {
  mkdirSync('assets', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h } });
    await page.setContent(`<html><body style="margin:0;background:${j.bg ?? 'transparent'}">${j.html}</body></html>`);
    await page.screenshot({ path: j.out, omitBackground: j.bg === null });
    await page.close();
    console.log('ok', j.out);
  }
  await browser.close();
})();

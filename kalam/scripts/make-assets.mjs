// Génère l'icône, l'écran de lancement et le visuel Play Store à partir du dessin de Kal.
// Usage (outil de développement, hors app): node scripts/make-assets.mjs
// Nécessite Playwright + Chromium installés sur votre machine.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const BODY = '#6C5CE7', BELLY = '#F4EFFF', ACCENT = '#FDCB6E', INK = '#1B1A2E', WING = '#5A4BD1';

// Même dessin que src/components/Mascot.tsx (humeur « happy »).
const kal = ({ mono = false } = {}) => {
  const c = (v) => (mono ? '#FFFFFF' : v);
  return `
  <path d="M24 40 L18 8 L48 28 Z" fill="${c(BODY)}"/><path d="M96 40 L102 8 L72 28 Z" fill="${c(BODY)}"/>
  <ellipse cx="60" cy="68" rx="44" ry="46" fill="${c(BODY)}"/>
  ${mono ? '' : `<ellipse cx="60" cy="82" rx="28" ry="26" fill="${BELLY}"/>
  <circle cx="43" cy="56" r="14" fill="#fff"/><circle cx="77" cy="56" r="14" fill="#fff"/>
  <circle cx="44" cy="57" r="6" fill="${INK}"/><circle cx="78" cy="57" r="6" fill="${INK}"/>
  <circle cx="46" cy="55" r="2" fill="#fff"/><circle cx="80" cy="55" r="2" fill="#fff"/>
  <path d="M54 68 L66 68 L60 78 Z" fill="${ACCENT}"/>
  <path d="M50 86 Q60 93 70 86" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>
  <ellipse cx="18" cy="82" rx="9" ry="18" fill="${WING}" transform="rotate(-10 18 82)"/>
  <ellipse cx="102" cy="82" rx="9" ry="18" fill="${WING}" transform="rotate(10 102 82)"/>
  <ellipse cx="48" cy="114" rx="10" ry="5" fill="${ACCENT}"/><ellipse cx="72" cy="114" rx="10" ry="5" fill="${ACCENT}"/>`}`;
};

const svg = (inner, size, bg) => `<html><body style="margin:0;background:${bg ?? 'transparent'}">${inner}</body></html>`;
const kalSvg = (size, opts) => `<svg width="${size}" height="${size}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${kal(opts)}</svg>`;

const jobs = [
  // iOS exige une icône sans transparence.
  { out: 'assets/icon.png', w: 1024, h: 1024, bg: '#EDE9FF', html: `<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center">${kalSvg(800)}</div>` },
  // Android adaptatif: Kal reste dans la zone sûre (≈ 66 % du centre).
  { out: 'assets/android-icon-foreground.png', w: 512, h: 512, bg: null, html: `<div style="width:512px;height:512px;display:flex;align-items:center;justify-content:center">${kalSvg(340)}</div>` },
  { out: 'assets/android-icon-background.png', w: 512, h: 512, bg: '#EDE9FF', html: '<div style="width:512px;height:512px"></div>' },
  { out: 'assets/android-icon-monochrome.png', w: 432, h: 432, bg: null, html: `<div style="width:432px;height:432px;display:flex;align-items:center;justify-content:center">${kalSvg(290, { mono: true })}</div>` },
  { out: 'assets/splash-icon.png', w: 1024, h: 1024, bg: null, html: `<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center">${kalSvg(620)}</div>` },
  { out: 'assets/favicon.png', w: 48, h: 48, bg: '#EDE9FF', html: `<div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center">${kalSvg(40)}</div>` },
  // Visuel de présentation Play Store (1024 x 500).
  { out: 'store/feature-graphic.png', w: 1024, h: 500, bg: '#3B2FA3',
    html: `<div style="width:1024px;height:500px;display:flex;align-items:center;justify-content:center;gap:48px;font-family:system-ui,sans-serif;background:linear-gradient(135deg,#3B2FA3,#6C5CE7);color:#fff">
      ${kalSvg(300)}<div><div style="font-size:120px;font-weight:800;letter-spacing:-2px">Kalam</div>
      <div style="font-size:40px;opacity:.95">Apprends en parlant.</div><div style="font-size:26px;opacity:.8;margin-top:8px">Learn by speaking · تعلّم بالكلام</div></div></div>` },
];

mkdirSync('assets', { recursive: true }); mkdirSync('store', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h } });
  await page.setContent(svg(j.html, j.w, j.bg));
  await page.screenshot({ path: j.out, omitBackground: j.bg === null });
  await page.close();
  console.log('ok', j.out);
}
await browser.close();

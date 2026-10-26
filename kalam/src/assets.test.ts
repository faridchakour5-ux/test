import * as fs from 'fs';
import * as path from 'path';
import appJson from '../app.json';

const dir = path.join(__dirname, '..');
const size = (rel: string) => {
  const b = fs.readFileSync(path.join(dir, rel));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: b[25] === 6 }; // en-tête PNG: largeur, hauteur, type de couleur (6 = avec transparence)
};

describe('images de l\'application', () => {
  it('toutes les images citées dans app.json existent', () => {
    const a = appJson.expo;
    const splash = (a.plugins as unknown[]).find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen') as [string, { image: string }];
    const files = [a.icon, a.android.adaptiveIcon.foregroundImage, a.android.adaptiveIcon.backgroundImage, a.android.adaptiveIcon.monochromeImage, a.web.favicon, splash[1].image];
    for (const f of files) expect([f, fs.existsSync(path.join(dir, f))]).toEqual([f, true]);
  });
  it('icône principale: 1024×1024 carrée (exigée par les stores)', () => {
    expect(size('assets/icon.png')).toMatchObject({ w: 1024, h: 1024 });
  });
  it('icône adaptative Android: calques carrés d\'au moins 432 px (xxxhdpi), premier plan et monochrome transparents', () => {
    for (const f of ['android-icon-foreground', 'android-icon-background', 'android-icon-monochrome']) {
      const s = size(`assets/${f}.png`);
      expect([f, s.w === s.h && s.w >= 432]).toEqual([f, true]);
    }
    expect(size('assets/android-icon-foreground.png').alpha).toBe(true);
    expect(size('assets/android-icon-monochrome.png').alpha).toBe(true);
  });
});

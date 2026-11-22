import { ar } from './locales/ar';
import { fr } from './locales/fr';
import { deviceLang, isRtl, langFromLocale, pick, t, tf } from './strings';

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('textes', () => {
  it('l\'arabe a exactement les mêmes clés que le français, sans texte vide', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(fr).sort());
    for (const [k, v] of Object.entries(ar)) expect(`${k}:${v.trim().length > 0}`).toBe(`${k}:true`);
  });
  it('chaque texte garde les mêmes variables {x} dans les deux langues', () => {
    for (const k of Object.keys(fr) as (keyof typeof fr)[]) expect(`${k}:${vars(ar[k])}`).toBe(`${k}:${vars(fr[k])}`);
  });
  it('t: repli sur le français, tf remplace les variables', () => {
    expect(t('fr', 'order')).toBe('Commander');
    expect(t('ar', 'order')).toBe(ar.order);
    expect(t('xx' as never, 'order')).toBe('Commander');
    expect(tf('fr', 'freeFrom', { amount: '600 DH' })).toBe('Livraison offerte dès 600 DH');
    expect(tf('fr', 'freeFrom', {})).toBe('Livraison offerte dès ');
  });
  it('pick: texte vide = absent; repli fr puis ar', () => {
    expect(pick({ fr: 'A', ar: 'B' }, 'ar')).toBe('B');
    expect(pick({ fr: 'A', ar: '' }, 'ar')).toBe('A');
    expect(pick({ ar: 'B' }, 'fr')).toBe('B');
    expect(pick({}, 'fr')).toBe('');
  });
  it('sens de lecture: seul l\'arabe est de droite à gauche', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('fr')).toBe(false);
  });
  it('langue du téléphone: arabe si arabe (ar, ar-MA, ar_MA), sinon français', () => {
    for (const l of ['ar', 'ar-MA', 'ar_MA', 'AR-ma', ' ar ']) expect(langFromLocale(l)).toBe('ar');
    for (const l of ['fr-FR', 'en-US', 'zh', '', undefined, null]) expect(langFromLocale(l)).toBe('fr');
    expect(['fr', 'ar']).toContain(deviceLang());
  });
});

// Le vrai module (jest.setup.js simule deviceUiLang pour les autres tests).
const { deviceUiLang, uiLangFromLocale } = jest.requireActual('./deviceLanguage') as typeof import('./deviceLanguage');

describe('langue de l\'interface selon le téléphone', () => {
  it('langues proposées: reconnues avec ou sans région, tiret ou souligné, majuscules ou non', () => {
    expect(uiLangFromLocale('fr')).toBe('fr');
    expect(uiLangFromLocale('fr-CA')).toBe('fr');
    expect(uiLangFromLocale('en_GB')).toBe('en');
    expect(uiLangFromLocale('AR-EG')).toBe('ar');
    expect(uiLangFromLocale('es-419')).toBe('es');
    expect(uiLangFromLocale('zh-Hans-CN')).toBe('zh');
    expect(uiLangFromLocale('zh_TW')).toBe('zh');
    expect(uiLangFromLocale('  es  ')).toBe('es');
  });
  it('langue non proposée ou valeur absente/illisible: anglais', () => {
    for (const v of ['de-DE', 'ja', 'pt-BR', 'tr', '', '   ', undefined, null, '-', '??']) expect(uiLangFromLocale(v as never)).toBe('en');
  });
  it('deviceUiLang lit la langue du moteur; une panne vaut « anglais »', () => {
    const spy = jest.spyOn(Intl, 'DateTimeFormat');
    spy.mockReturnValue({ resolvedOptions: () => ({ locale: 'ar-SA' }) } as never);
    expect(deviceUiLang()).toBe('ar');
    spy.mockReturnValue({ resolvedOptions: () => ({ locale: 'es-ES' }) } as never);
    expect(deviceUiLang()).toBe('es');
    spy.mockImplementation(() => { throw new Error('no intl'); });
    expect(deviceUiLang()).toBe('en');
    spy.mockRestore();
  });
});

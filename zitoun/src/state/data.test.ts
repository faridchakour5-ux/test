import { MAX_ORDERS_KEPT, defaultData, normalizeData, normalizeLines } from './data';

describe('relecture de la sauvegarde', () => {
  const base = defaultData();
  it('donnée absente ou de mauvais type: valeurs par défaut, sans planter', () => {
    for (const raw of [null, undefined, 5, 'x', [], true]) expect(normalizeData(raw, base)).toEqual(base);
  });
  it('champs invalides ignorés un par un (langue, palette, taille inconnues)', () => {
    const d = normalizeData({ lang: 'xx', palette: 'rouge-vif', textSize: 'gigantesque', cart: 'non', orders: 12, customer: 'non' }, base);
    expect(d).toEqual(base);
  });
  it('champs valides conservés', () => {
    const d = normalizeData({ lang: 'ar', palette: 'terre', textSize: 'large' }, base);
    expect(d).toMatchObject({ lang: 'ar', palette: 'terre', textSize: 'large' });
  });
  it('lignes du panier: huile ou conditionnement disparus du catalogue, nombres absurdes ou lignes mal formées écartés; doublons fusionnés; plafonnées', () => {
    const lines = normalizeLines([
      { oilId: 'saiss-doux', packagingId: 'can5', count: 2 }, { oilId: 'saiss-doux', packagingId: 'can5', count: 3 },
      { oilId: 'disparue', packagingId: 'can5', count: 1 }, { oilId: 'saiss-doux', packagingId: 'inconnu', count: 1 },
      { oilId: 'saiss-doux', packagingId: 'can2', count: 0 }, { oilId: 'saiss-doux', packagingId: 'can2', count: -4 }, { oilId: 'saiss-doux', packagingId: 'can2', count: 'beaucoup' },
      null, 'x', 7, { oilId: 'rif-intense', packagingId: 'can20', count: 9999 },
    ]);
    expect(lines).toEqual([{ oilId: 'saiss-doux', packagingId: 'can5', count: 5 }, { oilId: 'rif-intense', packagingId: 'can20', count: 50 }]);
    expect(normalizeLines('pas une liste')).toEqual([]);
  });
  it('client: textes tronqués aux longueurs permises; la date et la remarque ne sont JAMAIS gardées (elles seraient périmées)', () => {
    const d = normalizeData({ customer: { name: 'x'.repeat(500), phone: '0612345678', cityId: 'rabat', address: 'y'.repeat(900), day: '2026-11-25', slot: 'morning', note: 'sonner' } }, base);
    expect(d.customer.name).toHaveLength(60);
    expect(d.customer.address).toHaveLength(200);
    expect(d.customer.day).toBe('');
    expect(d.customer.note).toBe('');
    expect(d.customer.slot).toBe('morning');
    expect(normalizeData({ customer: { slot: 'minuit' } }, base).customer.slot).toBe('');
  });
  it('commandes: celles sans identifiant, sans ligne valide ou à date illisible sont écartées; au plus MAX_ORDERS_KEPT', () => {
    const good = (i: number) => ({ id: `ZT-${i}`, createdAt: '2026-11-01T10:00:00.000Z', lines: [{ oilId: 'saiss-doux', packagingId: 'can5', count: 1 }], liters: 5, total: 490, cityId: 'rabat', day: '2026-11-04' });
    const d = normalizeData({ orders: [good(1), { ...good(2), id: '' }, { ...good(3), lines: [] }, { ...good(4), createdAt: 'hier' }, { ...good(5), day: '2026-02-31', total: -3 }, null, ...Array.from({ length: 60 }, (_, i) => good(100 + i))] }, base);
    expect(d.orders[0].id).toBe('ZT-1');
    expect(d.orders.find((o) => o.id === 'ZT-2' || o.id === 'ZT-3' || o.id === 'ZT-4')).toBeUndefined();
    const five = d.orders.find((o) => o.id === 'ZT-5')!;
    expect(five).toMatchObject({ day: '', total: 0 }); // date impossible vidée, montant négatif ramené à 0
    expect(d.orders.length).toBeLessThanOrEqual(MAX_ORDERS_KEPT);
  });
});

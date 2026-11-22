import { INTENSITIES, OILS, PACKAGINGS, getOil, oilsByIntensity, INTENSITY_LABEL, INTENSITY_DESC, USE_LABEL } from './catalog';
import { CITIES, addDays, availableDays, earliestDay, formatDay, isDeliverable, latestDay, parseDay, toDay, MAX_DAYS_AHEAD } from './delivery';
import { formatMoney } from './money';
import { formatLocalPhone, normalizeMoroccanPhone } from './phone';
import { FREE_DELIVERY_FROM, MAX_ORDER_LITERS, VOLUME_TIERS, discountPct, nextTier, quote } from './pricing';
import { CartLine, Customer, EMPTY_CUSTOMER, MAX_COUNT_PER_LINE, addLine, buildOrderMessage, cartLiters, newOrderId, removeLine, setLineCount, validateOrder, whatsappUrl } from './order';
import { fr } from '../i18n/locales/fr';
import { ar } from '../i18n/locales/ar';
import { sellerWhatsapp } from '../config/shop';

describe('catalogue', () => {
  it('chaque huile est cohérente: identifiant unique, prix entier positif, acidité d\'une huile vierge extra (≤ 0,8 %), textes dans les 2 langues', () => {
    expect(new Set(OILS.map((o) => o.id)).size).toBe(OILS.length);
    for (const o of OILS) {
      expect(Number.isInteger(o.pricePerLiter) && o.pricePerLiter > 0).toBe(true);
      expect(o.acidity).toBeGreaterThan(0);
      expect(o.acidity).toBeLessThanOrEqual(0.8);
      expect(o.harvest).toBeGreaterThan(2000);
      expect(o.uses.length).toBeGreaterThan(0);
      for (const lang of ['fr', 'ar'] as const) for (const f of [o.name, o.region, o.variety]) expect(f[lang].trim().length).toBeGreaterThan(1);
      for (const u of o.uses) expect(fr[USE_LABEL[u]]).toBeTruthy();
    }
  });
  it('toutes les intensités (1 à 5) ont un nom, une description et au moins une huile; tri du plus doux au plus intense', () => {
    for (const i of INTENSITIES) {
      expect(fr[INTENSITY_LABEL[i]]).toBeTruthy();
      expect(ar[INTENSITY_DESC[i]]).toBeTruthy();
      expect(OILS.some((o) => o.intensity === i)).toBe(true);
    }
    const sorted = oilsByIntensity().map((o) => o.intensity);
    expect(sorted).toEqual([...sorted].sort((a, b) => a - b));
  });
  it('conditionnements: litres entiers positifs, supplément ≥ 0, identifiants uniques, libellé existant', () => {
    expect(new Set(PACKAGINGS.map((p) => p.id)).size).toBe(PACKAGINGS.length);
    for (const p of PACKAGINGS) {
      expect(Number.isInteger(p.liters) && p.liters > 0).toBe(true);
      expect(p.extraPerLiter).toBeGreaterThanOrEqual(0);
      expect(fr[p.label]).toBeTruthy();
    }
  });
});

describe('prix', () => {
  const oil = OILS[0];
  const line = (count: number, packagingId = 'can5'): CartLine => ({ oilId: oil.id, packagingId, count });

  it('une ligne: (prix du litre + supplément du conditionnement) × litres', () => {
    const q = quote([line(2, 'bottle1')]);
    const extra = PACKAGINGS.find((p) => p.id === 'bottle1')!.extraPerLiter;
    expect(q.liters).toBe(2);
    expect(q.subtotal).toBe((oil.pricePerLiter + extra) * 2);
  });
  it('remise de volume selon le TOTAL de litres de la commande, aux bornes exactes des paliers', () => {
    expect(discountPct(0)).toBe(0);
    for (const t of VOLUME_TIERS) {
      expect(discountPct(t.liters - 1)).toBeLessThan(t.pct);
      expect(discountPct(t.liters)).toBe(t.pct);
    }
    const q = quote([line(2)]); // 10 L
    expect(q.pct).toBe(VOLUME_TIERS[0].pct);
    expect(q.discount).toBe(Math.round((q.subtotal * q.pct) / 100));
    expect(q.afterDiscount).toBe(q.subtotal - q.discount);
  });
  it('la remise ne dépend pas de la façon de composer les litres (2 lignes de 5 L = 1 ligne de 10 L)', () => {
    const a = quote([{ oilId: OILS[0].id, packagingId: 'can5', count: 1 }, { oilId: OILS[1].id, packagingId: 'can5', count: 1 }]);
    expect(a.pct).toBe(VOLUME_TIERS[0].pct);
  });
  it('prochain palier: indiqué en dessous, absent au-delà du dernier', () => {
    expect(nextTier(0)?.liters).toBe(VOLUME_TIERS[0].liters);
    expect(nextTier(VOLUME_TIERS[VOLUME_TIERS.length - 1].liters)).toBeNull();
  });
  it('livraison: inconnue sans ville, offerte au-delà du seuil, sinon le tarif de la ville; le total l\'inclut', () => {
    const small = quote([line(1)], 'casablanca');
    expect(small.deliveryFee).toBe(CITIES.find((c) => c.id === 'casablanca')!.fee);
    expect(small.freeDelivery).toBe(false);
    expect(small.total).toBe(small.afterDiscount + small.deliveryFee!);
    expect(small.remainingForFree).toBe(FREE_DELIVERY_FROM - small.afterDiscount);
    expect(quote([line(1)]).deliveryFee).toBeNull();
    const big = quote([line(4)], 'oujda');
    expect(big.afterDiscount).toBeGreaterThanOrEqual(FREE_DELIVERY_FROM);
    expect(big.freeDelivery).toBe(true);
    expect(big.deliveryFee).toBe(0);
    expect(big.remainingForFree).toBe(0);
  });
  it('panier vide ou lignes périmées (huile/conditionnement retirés du catalogue, nombre absurde): ignorées, jamais de NaN', () => {
    expect(quote([]).total).toBe(0);
    const q = quote([{ oilId: 'disparue', packagingId: 'can5', count: 2 }, { oilId: oil.id, packagingId: 'inconnu', count: 1 }, { oilId: oil.id, packagingId: 'can5', count: NaN }, { oilId: oil.id, packagingId: 'can5', count: -3 }, line(1)], 'rabat');
    expect(q.lines).toHaveLength(1);
    expect(Number.isFinite(q.total)).toBe(true);
    expect(quote([], 'rabat').freeDelivery).toBe(false);
  });
  it('tous les montants sont des dirhams entiers', () => {
    for (const o of OILS) for (const p of PACKAGINGS) for (const n of [1, 3, 7]) {
      const q = quote([{ oilId: o.id, packagingId: p.id, count: n }], 'tanger');
      for (const v of [q.subtotal, q.discount, q.afterDiscount, q.total]) expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe('dates de livraison', () => {
  it('parseDay/toDay: aller-retour; refuse les dates impossibles ou mal écrites', () => {
    expect(toDay(parseDay('2026-11-23')!)).toBe('2026-11-23');
    for (const bad of ['2026-02-31', '2026-13-01', '2026-1-1', 'demain', '', '2026-11-23T10:00']) expect(parseDay(bad)).toBeNull();
    expect(parseDay('2028-02-29')).not.toBeNull(); // année bissextile
    expect(parseDay('2027-02-29')).toBeNull();
  });
  it('addDays: passe les fins de mois et d\'année, y compris le changement d\'heure', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-28', 3)).toBe('2026-03-31');
    expect(addDays('2026-11-23', 0)).toBe('2026-11-23');
    expect(addDays('n\'importe quoi', 3)).toBe('n\'importe quoi');
  });
  it('délai minimal selon la ville; ville inconnue = délai le plus long (prudence)', () => {
    const today = '2026-11-23';
    const lead = (id: string) => CITIES.find((c) => c.id === id)!.leadDays;
    expect(earliestDay(today, 'casablanca')).toBe(addDays(today, lead('casablanca')));
    expect(earliestDay(today, 'oujda')).toBe(addDays(today, lead('oujda')));
    expect(earliestDay(today, 'nulle-part')).toBe(addDays(today, Math.max(...CITIES.map((c) => c.leadDays))));
    expect(earliestDay(today, null)).toBe(earliestDay(today, ''));
  });
  it('jours proposés: commencent au premier jour possible, sont consécutifs et ne dépassent jamais l\'horizon', () => {
    const today = '2026-11-23';
    const days = availableDays(today, 'rabat');
    expect(days[0]).toBe(earliestDay(today, 'rabat'));
    days.forEach((d, i) => i > 0 && expect(d).toBe(addDays(days[i - 1], 1)));
    expect(days.every((d) => d <= latestDay(today))).toBe(true);
    expect(availableDays(today, 'rabat', 500).length).toBeLessThanOrEqual(MAX_DAYS_AHEAD + 1);
  });
  it('isDeliverable: refuse le passé, trop tôt, trop loin et les dates invalides', () => {
    const today = '2026-11-23';
    expect(isDeliverable(today, today, 'casablanca')).toBe(false);
    expect(isDeliverable('2026-11-01', today, 'casablanca')).toBe(false);
    expect(isDeliverable(earliestDay(today, 'casablanca'), today, 'casablanca')).toBe(true);
    expect(isDeliverable(latestDay(today), today, 'casablanca')).toBe(true);
    expect(isDeliverable(addDays(latestDay(today), 1), today, 'casablanca')).toBe(false);
    expect(isDeliverable('2026-02-31', today, 'casablanca')).toBe(false);
  });
  it('formatDay: jour de la semaine et mois en français et en arabe (mois usuels du Maroc)', () => {
    expect(formatDay('2026-11-24', 'fr').full).toBe('mar. 24 nov.');
    expect(formatDay('2026-11-24', 'ar').full).toBe('الثلاثاء 24 نونبر');
    expect(formatDay('2026-07-05', 'ar').month).toBe('يوليوز');
    expect(formatDay('xx', 'fr').full).toBe('xx');
  });
  it('villes: identifiants uniques, frais entiers ≥ 0, délais ≥ 1, noms dans les 2 langues', () => {
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length);
    for (const c of CITIES) {
      expect(Number.isInteger(c.fee) && c.fee >= 0).toBe(true);
      expect(c.leadDays).toBeGreaterThanOrEqual(1);
      expect(c.name.fr && c.name.ar).toBeTruthy();
    }
  });
});

describe('téléphone marocain', () => {
  it('accepte les écritures usuelles et renvoie +212…', () => {
    for (const ok of ['06 12 34 56 78', '0612345678', '06.12.34.56.78', '06-12-34-56-78', '+212612345678', '+212 6 12 34 56 78', '00212612345678', '212612345678', '(06) 12 34 56 78', ' 0712345678 ']) {
      expect(normalizeMoroccanPhone(ok)).toBe(`+212${ok.includes('07') ? '712345678' : '612345678'}`);
    }
  });
  it('accepte les chiffres arabes', () => {
    expect(normalizeMoroccanPhone('٠٦١٢٣٤٥٦٧٨')).toBe('+212612345678');
    expect(normalizeMoroccanPhone('۰۶۱۲۳۴۵۶۷۸')).toBe('+212612345678');
  });
  it('refuse le reste: trop court/long, fixe 05, mauvais préfixe, lettres, vide, sans 0 ni indicatif', () => {
    for (const bad of ['', '   ', '0612345', '061234567890', '0512345678', '0812345678', '612345678', '+33612345678', '06 12 34 56 7a', 'abc', '0612345678; rm', '+2126123456789']) expect(normalizeMoroccanPhone(bad)).toBeNull();
    expect(normalizeMoroccanPhone(undefined as never)).toBeNull();
  });
  it('affichage lisible', () => {
    expect(formatLocalPhone('+212612345678')).toBe('06 12 34 56 78');
    expect(formatLocalPhone('autre')).toBe('autre');
  });
});

describe('montants', () => {
  it('format: espace fine pour les milliers, DH en français, د.م. en arabe, chiffres occidentaux', () => {
    expect(formatMoney(1250, 'fr')).toBe('1 250 DH');
    expect(formatMoney(980, 'fr')).toBe('980 DH');
    expect(formatMoney(1234567, 'fr')).toBe('1 234 567 DH');
    expect(formatMoney(0, 'ar')).toBe('0 د.م.');
    expect(formatMoney(-49, 'fr')).toBe('−49 DH');
    expect(formatMoney(NaN, 'fr')).toBe('0 DH');
  });
});

describe('panier', () => {
  const a: CartLine = { oilId: OILS[0].id, packagingId: 'can5', count: 1 };
  it('ajouter fusionne la même huile et le même conditionnement; un autre conditionnement fait une nouvelle ligne', () => {
    let cart = addLine([], a);
    cart = addLine(cart, { ...a, count: 2 });
    expect(cart).toEqual([{ ...a, count: 3 }]);
    cart = addLine(cart, { ...a, packagingId: 'can2' });
    expect(cart).toHaveLength(2);
  });
  it('ajouter ignore les lignes absurdes (huile ou conditionnement inconnus, nombre invalide)', () => {
    for (const bad of [{ ...a, oilId: 'x' }, { ...a, packagingId: 'x' }, { ...a, count: 0 }, { ...a, count: -2 }, { ...a, count: NaN }]) expect(addLine([], bad)).toEqual([]);
  });
  it('jamais plus de MAX_ORDER_LITERS litres ni de MAX_COUNT_PER_LINE par ligne', () => {
    let cart: CartLine[] = [];
    for (let i = 0; i < 100; i++) cart = addLine(cart, { oilId: OILS[0].id, packagingId: 'can20', count: 3 });
    expect(cartLiters(cart)).toBeLessThanOrEqual(MAX_ORDER_LITERS);
    expect(cart.every((l) => l.count <= MAX_COUNT_PER_LINE)).toBe(true);
    const full = addLine([], { oilId: OILS[0].id, packagingId: 'bottle1', count: 9999 });
    expect(full[0].count).toBeLessThanOrEqual(MAX_COUNT_PER_LINE);
    expect(addLine(addLine([], { oilId: OILS[0].id, packagingId: 'can20', count: 10 }), { oilId: OILS[1].id, packagingId: 'can5', count: 1 })).toHaveLength(1); // 200 L déjà atteints
  });
  it('changer le nombre: borné; 0 ou moins retire la ligne; index inconnu: rien', () => {
    const cart = [a, { ...a, packagingId: 'can2' }];
    expect(setLineCount(cart, 0, 4)[0].count).toBe(4);
    expect(setLineCount(cart, 0, 0)).toHaveLength(1);
    expect(setLineCount(cart, 0, -5)).toHaveLength(1);
    expect(setLineCount(cart, 7, 3)).toBe(cart);
    expect(cartLiters(setLineCount(cart, 0, 9999))).toBeLessThanOrEqual(MAX_ORDER_LITERS);
    expect(setLineCount(cart, 0, NaN)).toHaveLength(1);
  });
  it('retirer une ligne', () => {
    expect(removeLine([a, { ...a, packagingId: 'can2' }], 0)).toEqual([{ ...a, packagingId: 'can2' }]);
    expect(removeLine([a], 3)).toEqual([a]);
  });
});

describe('validation de la commande', () => {
  const today = '2026-11-23';
  const cart: CartLine[] = [{ oilId: OILS[0].id, packagingId: 'can5', count: 1 }];
  const ok: Customer = { name: 'Amina B.', phone: '06 12 34 56 78', cityId: 'casablanca', address: '12 rue des Orangers, Maârif', day: earliestDay(today, 'casablanca'), slot: 'morning', note: '' };

  it('commande complète: aucune erreur', () => expect(validateOrder(cart, ok, today)).toEqual([]));
  it('commande vide: eEmpty en premier', () => expect(validateOrder([], ok, today)).toEqual(['eEmpty']));
  it('formulaire vide: toutes les erreurs, dans l\'ordre d\'affichage', () => {
    expect(validateOrder(cart, EMPTY_CUSTOMER, today)).toEqual(['eName', 'ePhone', 'eCity', 'eAddress', 'eDate']);
  });
  it('chaque champ est vérifié séparément', () => {
    expect(validateOrder(cart, { ...ok, name: 'A' }, today)).toEqual(['eName']);
    expect(validateOrder(cart, { ...ok, name: ' '.repeat(5) }, today)).toEqual(['eName']);
    expect(validateOrder(cart, { ...ok, name: 'x'.repeat(61) }, today)).toEqual(['eName']);
    expect(validateOrder(cart, { ...ok, phone: '0512345678' }, today)).toEqual(['ePhone']);
    expect(validateOrder(cart, { ...ok, cityId: 'atlantide' }, today)).toEqual(['eCity', 'eDate']); // ville inconnue: délai le plus long, donc la date trop proche est refusée aussi
    expect(validateOrder(cart, { ...ok, address: 'rue' }, today)).toEqual(['eAddress']);
    expect(validateOrder(cart, { ...ok, address: 'a'.repeat(201) }, today)).toEqual(['eAddress']);
    expect(validateOrder(cart, { ...ok, slot: '' }, today)).toEqual(['eDate']);
  });
  it('date: trop tôt pour la ville, passée, invalide ou trop lointaine = eDate', () => {
    for (const day of [today, addDays(today, -3), '2026-02-31', '', addDays(today, MAX_DAYS_AHEAD + 1)]) expect(validateOrder(cart, { ...ok, day }, today)).toEqual(['eDate']);
    expect(validateOrder(cart, { ...ok, cityId: 'oujda', day: earliestDay(today, 'casablanca') }, today)).toEqual(['eDate']); // Oujda demande plus de délai
  });
});

describe('numéro de commande et message', () => {
  it('format ZT-AAMMJJ-XXXX, sans caractères ambigus, et change selon le tirage', () => {
    const id = newOrderId(new Date(2026, 10, 23, 12), () => 0);
    expect(id).toMatch(/^ZT-261123-[A-Z2-9]{4}$/);
    expect(newOrderId(new Date(2026, 10, 23), () => 0.5)).not.toBe(id);
    for (let i = 0; i < 200; i++) expect(newOrderId(new Date(2026, 0, 5), Math.random)).toMatch(/^ZT-260105-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{4}$/);
    expect(newOrderId(new Date(2026, 0, 5), () => 1)).toMatch(/^ZT-260105-[A-Z2-9]{4}$/); // même un tirage limite reste valide
  });

  const today = '2026-11-23';
  const customer: Customer = { name: 'Amina B.', phone: '0612345678', cityId: 'casablanca', address: '12 rue des Orangers, Maârif', day: '2026-11-25', slot: 'afternoon', note: 'Sonner deux fois' };
  const cart: CartLine[] = [{ oilId: 'saiss-doux', packagingId: 'can5', count: 2 }, { oilId: 'rif-intense', packagingId: 'bottle1', count: 3 }];

  it('le message contient tout ce dont le vendeur a besoin (client, livraison, lignes, remise, total, remarque)', () => {
    const q = quote(cart, customer.cityId);
    const msg = buildOrderMessage(q, customer, 'ZT-261123-ABCD', 'fr');
    for (const part of ['ZT-261123-ABCD', 'Amina B.', '06 12 34 56 78', 'Casablanca', '12 rue des Orangers, Maârif', 'mer. 25 nov.', 'Après-midi', 'Doux du Saïss', 'Intense du Rif', '2 × Bidon 5 L', '3 × Bouteille en verre 1 L', formatMoney(q.total, 'fr'), 'Sonner deux fois']) expect(msg).toContain(part);
    expect(msg).toContain('Remise volume (5 %)'); // 13 L ≥ 10 L
    expect(msg).toContain(`Livraison : ${q.freeDelivery ? 'Offerte' : formatMoney(q.deliveryFee!, 'fr')}`);
  });
  it('sans remise ni remarque: ces lignes n\'apparaissent pas; sans ville: livraison « — »', () => {
    const q = quote([{ oilId: 'saiss-doux', packagingId: 'can2', count: 1 }], 'casablanca');
    const msg = buildOrderMessage(q, { ...customer, note: '' }, 'ZT-1', 'fr');
    expect(msg).not.toContain('Remise');
    expect(msg).not.toContain('Précisions');
    expect(buildOrderMessage(quote(cart), { ...customer, cityId: '' }, 'ZT-1', 'fr')).toContain('Livraison : —');
  });
  it('le message existe aussi en arabe', () => {
    const msg = buildOrderMessage(quote(cart, customer.cityId), customer, 'ZT-1', 'ar');
    expect(msg).toContain('الدار البيضاء');
    expect(msg).toContain('حلو سايس');
    expect(msg).toContain('د.م.');
  });
  it('une remarque trop longue est coupée à 300 caractères', () => {
    const msg = buildOrderMessage(quote(cart, 'casablanca'), { ...customer, note: 'x'.repeat(1000) }, 'ZT-1', 'fr');
    expect(msg.split('\n').pop()!.replace(/^[^:]*: /, '').length).toBe(300);
  });
  it('lien WhatsApp: numéro + message encodé (retours à la ligne, accents, &, #, ?)', () => {
    const url = whatsappUrl('212612345678', 'Salam\nPrix: 100 DH & 5 %\n#1 ? é');
    expect(url.startsWith('https://wa.me/212612345678?text=')).toBe(true);
    expect(decodeURIComponent(url.split('?text=')[1])).toBe('Salam\nPrix: 100 DH & 5 %\n#1 ? é');
    expect(url).not.toMatch(/[\s&#](?!.*text=)/);
  });
  it('un jour d\'aujourd\'hui valide pour les tests ci-dessus', () => expect(isDeliverable(customer.day, today, customer.cityId)).toBe(true));
});

describe('numéro WhatsApp du vendeur', () => {
  it('chiffres seulement avec indicatif; espaces, + et tirets tolérés; sinon null', () => {
    expect(sellerWhatsapp('212612345678')).toBe('212612345678');
    expect(sellerWhatsapp('+212 6 12-34-56-78')).toBe('212612345678');
    for (const bad of [undefined, '', '0612345678', 'abc', '12345', '212612345678901234']) expect(sellerWhatsapp(bad)).toBeNull();
  });
  it('getOil: huile inconnue = undefined', () => { expect(getOil('?')).toBeUndefined(); expect(getOil('saiss-doux')?.intensity).toBe(1); });
});

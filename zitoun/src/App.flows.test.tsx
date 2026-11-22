import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { BackHandler, Linking, Share } from 'react-native';
import App from '../App';
import { STORAGE_KEY } from './state/data';
import { t } from './i18n/strings';

jest.mock('./config/shop', () => ({ ...jest.requireActual('./config/shop'), sellerWhatsapp: () => process.env.TEST_SELLER ?? null }));

const NOW = new Date(2026, 10, 23, 10, 0); // lundi 23 novembre 2026
const clock = () => NOW;
const boot = async () => { await render(<App clock={clock} />); await act(async () => {}); };
const press = async (id: string) => { await fireEvent.press(await screen.findByTestId(id)); };
const type = async (id: string, text: string) => { await fireEvent.changeText(await screen.findByTestId(id), text); };
let openURL: jest.SpyInstance;

beforeEach(async () => {
  process.env.TEST_SELLER = '212612345678';
  await AsyncStorage.clear();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  openURL.mockClear(); // l'original est déjà un faux appel partagé: on ne compte que ce test
});
afterEach(async () => { cleanup(); jest.restoreAllMocks(); delete process.env.TEST_SELLER; });

async function orderOneOil() {
  await press('start-order');
  await press('oil-saiss-doux');
  await press('pack-can5');
  await press('plus'); // 2 × 5 L = 10 L
  await press('add-to-order');
  await press('cart-next');
}
async function fillDelivery(over: Partial<Record<'name' | 'phone' | 'address', string>> = {}) {
  await type('field-name', over.name ?? 'Amina B.');
  await type('field-phone', over.phone ?? '06 12 34 56 78');
  await press('city-casablanca');
  await type('field-address', over.address ?? '12 rue des Orangers, Maârif');
  await press('day-2026-11-25');
  await press('slot-morning');
}

describe('parcours de commande', () => {
  it('accueil: une marque, une phrase, une seule action principale', async () => {
    await boot();
    expect(await screen.findByText(t('fr', 'homeSub'))).toBeTruthy();
    expect(screen.getByTestId('start-order')).toBeTruthy();
    expect(screen.queryByTestId('resume-order')).toBeNull(); // pas de commande en cours
  });

  it('commande complète: huile → litres → livraison → WhatsApp → confirmation, sauvegardée', async () => {
    await boot();
    await orderOneOil();
    expect(await screen.findByTestId('delivery')).toBeTruthy();
    await fillDelivery();
    await press('delivery-next');
    expect(await screen.findByTestId('review')).toBeTruthy();
    await press('send-whatsapp');
    await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
    const url = openURL.mock.calls[0][0] as string;
    expect(url.startsWith('https://wa.me/212612345678?text=')).toBe(true);
    const message = decodeURIComponent(url.split('?text=')[1]);
    for (const part of ['Amina B.', '06 12 34 56 78', 'Casablanca', 'Doux du Saïss', '2 × Bidon 5 L', 'mer. 25 nov.', 'Matin', 'Remise volume (5 %)']) expect(message).toContain(part);
    expect(await screen.findByTestId('done')).toBeTruthy();
    expect(screen.getByText(t('fr', 'doneBody'))).toBeTruthy();
    // La commande est gardée, le panier est vidé, la date n'est pas conservée.
    await act(async () => { await new Promise((r) => setTimeout(r, 450)); });
    const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) as string);
    expect(saved.orders).toHaveLength(1);
    expect(saved.orders[0].lines).toEqual([{ oilId: 'saiss-doux', packagingId: 'can5', count: 2 }]);
    expect(saved.cart).toEqual([]);
    expect(saved.customer).toMatchObject({ name: 'Amina B.', day: '' });
  });

  it('le message n\'est pas lié à la langue de l\'écran: le vendeur le reçoit en français', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ lang: 'ar' }));
    await boot();
    expect(await screen.findByText(t('ar', 'homeSub'))).toBeTruthy();
    await orderOneOil();
    await fillDelivery();
    await press('delivery-next');
    await press('send-whatsapp');
    await waitFor(() => expect(openURL).toHaveBeenCalled());
    expect(decodeURIComponent((openURL.mock.calls[0][0] as string).split('?text=')[1])).toContain('Commande ZT-'); // « Commande » = français, pas « الطلب »
  });

  it('formulaire incomplet: erreurs en toutes lettres seulement après une tentative, et on ne passe pas', async () => {
    await boot();
    await orderOneOil();
    expect(screen.queryByText(t('fr', 'eName'))).toBeNull();
    await press('delivery-next');
    expect(await screen.findByText(t('fr', 'eName'))).toBeTruthy();
    expect(screen.getByText(t('fr', 'ePhone'))).toBeTruthy();
    expect(screen.getByText(t('fr', 'eCity'))).toBeTruthy();
    expect(screen.getByText(t('fr', 'eAddress'))).toBeTruthy();
    expect(screen.getByText(t('fr', 'eDate'))).toBeTruthy();
    expect(screen.queryByTestId('review')).toBeNull();
    await fillDelivery({ phone: '0512345678' });
    await press('delivery-next');
    expect(await screen.findByText(t('fr', 'ePhone'))).toBeTruthy();
  });

  it('changer de ville efface une date devenue trop proche', async () => {
    await boot();
    await orderOneOil();
    await press('city-casablanca');
    await press('day-2026-11-24'); // Casablanca: dès demain
    await press('city-oujda'); // Oujda: 3 jours de délai
    expect(screen.queryByTestId('day-2026-11-24')).toBeNull();
    await press('delivery-next');
    expect(await screen.findByText(t('fr', 'eDate'))).toBeTruthy();
  });

  it('dates: 9 jours proposés, « Voir plus de dates » en montre davantage', async () => {
    await boot();
    await orderOneOil();
    await press('city-casablanca');
    expect(screen.getByTestId('day-2026-11-24')).toBeTruthy();
    expect(screen.queryByTestId('day-2026-12-10')).toBeNull();
    await press('more-dates');
    expect(await screen.findByTestId('day-2026-12-10')).toBeTruthy();
    expect(screen.queryByTestId('more-dates')).toBeNull();
  });

  it('fiche huile: acidité, récolte, variété et prix au litre du conditionnement choisi', async () => {
    await boot();
    await press('start-order');
    await press('oil-rif-intense');
    expect(await screen.findByText(/0,5 %/)).toBeTruthy();
    expect(screen.getByText(t('fr', 'acidityLabel'))).toBeTruthy();
    await press('pack-bottle1'); // la bouteille en verre coûte 8 DH de plus par litre
    expect(await screen.findByText('113\u00A0DH / L')).toBeTruthy();
  });

  it('sans numéro WhatsApp du vendeur: message clair, rien n\'est ouvert ni enregistré', async () => {
    delete process.env.TEST_SELLER;
    await boot();
    await orderOneOil();
    await fillDelivery();
    await press('delivery-next');
    await press('send-whatsapp');
    expect(await screen.findByText(t('fr', 'eSeller'))).toBeTruthy();
    expect(openURL).not.toHaveBeenCalled();
    expect(screen.queryByTestId('done')).toBeNull();
  });

  it('WhatsApp impossible à ouvrir: on propose de partager le message', async () => {
    openURL.mockRejectedValue(new Error('no handler'));
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    await boot();
    await orderOneOil();
    await fillDelivery();
    await press('delivery-next');
    await press('send-whatsapp');
    expect(await screen.findByText(t('fr', 'doneNoWhatsapp'))).toBeTruthy();
    await press('share-message');
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('Amina B.') });
  });

  it('double appui sur « Envoyer »: une seule ouverture, une seule commande', async () => {
    let release!: () => void;
    openURL.mockImplementation(() => new Promise<boolean>((r) => { release = () => r(true); }));
    await boot();
    await orderOneOil();
    await fillDelivery();
    await press('delivery-next');
    const send = await screen.findByTestId('send-whatsapp');
    await fireEvent.press(send);
    await fireEvent.press(send);
    await act(async () => { release(); });
    expect(openURL).toHaveBeenCalledTimes(1);
    await screen.findByTestId('done');
    await act(async () => { await new Promise((r) => setTimeout(r, 450)); });
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) as string).orders).toHaveLength(1);
  });
});

describe('panier et navigation', () => {
  it('ajouter une autre huile fusionne le total de litres (la remise suit le TOTAL)', async () => {
    await boot();
    await press('start-order');
    await press('oil-saiss-doux');
    await press('pack-can5');
    await press('add-to-order'); // 5 L
    await press('add-another');
    await press('oil-rif-intense');
    await press('pack-can5');
    await press('add-to-order'); // 5 L de plus = 10 L: -5 %
    expect(await screen.findByText(/Remise volume \(5 %\)/)).toBeTruthy();
  });

  it('retirer la dernière ligne: commande vide, on peut en recommencer une', async () => {
    await boot();
    await press('start-order');
    await press('oil-saiss-doux');
    await press('add-to-order');
    await fireEvent.press(await screen.findByLabelText(t('fr', 'remove')));
    expect(await screen.findByText(t('fr', 'emptyOrder'))).toBeTruthy();
    expect(screen.getByTestId('add-another')).toBeTruthy();
  });

  it('une commande en cours est proposée sur l\'accueil (reprendre)', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ cart: [{ oilId: 'saiss-doux', packagingId: 'can5', count: 1 }] }));
    await boot();
    await press('resume-order');
    expect(await screen.findByTestId('cart')).toBeTruthy();
  });

  it('retour d\'Android: remonte d\'un écran, sur l\'accueil laisse le système fermer l\'application', async () => {
    const handlers: (() => boolean | null | undefined)[] = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_e: string, h: () => boolean) => { handlers.push(h); return { remove: () => { const i = handlers.indexOf(h); if (i >= 0) handlers.splice(i, 1); } }; }) as never);
    await boot();
    const back = () => handlers[handlers.length - 1]?.();
    expect(back()).toBe(false); // accueil
    await press('start-order');
    await act(async () => { expect(back()).toBe(true); });
    expect(await screen.findByTestId('home')).toBeTruthy();
  });

  it('historique: « Commander à nouveau » remet les lignes au panier', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ orders: [{ id: 'ZT-261101-ABCD', createdAt: '2026-11-01T10:00:00.000Z', lines: [{ oilId: 'rif-intense', packagingId: 'can2', count: 3 }], liters: 6, total: 700, cityId: 'rabat', day: '2026-11-04' }] }));
    await boot();
    await press('open-orders');
    expect(await screen.findByText('Intense du Rif')).toBeTruthy();
    await press('reorder-ZT-261101-ABCD');
    expect(await screen.findByTestId('cart')).toBeTruthy();
    expect(screen.getByText(/3 × Bidon 2 L/)).toBeTruthy();
  });

  it('réglages: la langue et la palette changent l\'écran et sont sauvegardées', async () => {
    await boot();
    await press('open-settings');
    await press('palette-majorelle');
    await press('size-large');
    await press('lang-ar');
    expect(await screen.findByText(t('ar', 'settings'))).toBeTruthy();
    await act(async () => { await new Promise((r) => setTimeout(r, 450)); });
    const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) as string);
    expect(saved).toMatchObject({ lang: 'ar', palette: 'majorelle', textSize: 'large' });
  });

  it('sauvegarde abîmée: l\'application démarre quand même avec les valeurs par défaut', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{pas du json');
    await boot();
    expect(await screen.findByTestId('start-order')).toBeTruthy();
  });
});

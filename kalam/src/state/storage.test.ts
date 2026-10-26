import AsyncStorage from '@react-native-async-storage/async-storage';
import { load, save } from './storage';

beforeEach(async () => { await AsyncStorage.clear(); });

describe('lecture et écriture du stockage local', () => {
  it('valeur absente: la valeur de secours', async () => {
    expect(await load('absente', { a: 1 })).toEqual({ a: 1 });
  });
  it('écrit puis relit', async () => {
    await save('k', { x: [1, 2] });
    expect(await load('k', null)).toEqual({ x: [1, 2] });
  });
  it('« null » enregistré, texte abîmé ou chaîne vide: la valeur de secours, jamais un plantage', async () => {
    await AsyncStorage.setItem('n', 'null');
    expect(await load('n', { ok: true })).toEqual({ ok: true });
    await AsyncStorage.setItem('c', '{pas du json');
    expect(await load('c', 'secours')).toBe('secours');
    await AsyncStorage.setItem('v', '');
    expect(await load('v', 7)).toBe(7);
  });
  it('les valeurs « fausses » valides sont gardées (0, false, chaîne non vide)', async () => {
    await save('zero', 0);
    expect(await load('zero', 9)).toBe(0); // 0 est une vraie valeur: elle n'est pas remplacée par la valeur de secours
    await save('f', false);
    expect(await load<boolean | null>('f', null)).toBe(false);
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, render } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { AppStateProvider, useApp } from './AppState';

type Api = ReturnType<typeof useApp>;
const holder: { api: Api | null } = { api: null };
function Grab({ onApi }: { onApi: (a: Api) => void }) { const a = useApp(); useEffect(() => { onApi(a); }); return null; }
const grab = (a: Api) => { holder.api = a; };
const api = new Proxy({} as Api, { get: (_t, k) => (holder.api as unknown as Record<string, unknown>)[k as string] }); // toujours la dernière valeur du contexte

const settle = async () => { for (let i = 0; i < 12; i++) await act(async () => { await Promise.resolve(); }); };
const keys = async () => (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('kalam'));

beforeEach(async () => { await AsyncStorage.clear(); });
afterEach(async () => { await cleanup(); });

describe('effacement de toutes les données (droit RGPD)', () => {
  it('tout est effacé du téléphone et l\'état revient à zéro', async () => {
    await render(<AppStateProvider><Grab onApi={grab} /></AppStateProvider>);
    await settle();
    await act(async () => { api.setProfile('adult'); });
    await settle();
    expect((await keys()).length).toBeGreaterThan(0);
    await act(async () => { api.eraseAll(); });
    await settle();
    expect(await keys()).toEqual([]);
    expect(api.profile).toBeNull();
  });
  it('une action lancée PENDANT l\'effacement ne ressuscite pas de données sur le téléphone', async () => {
    await render(<AppStateProvider><Grab onApi={grab} /></AppStateProvider>);
    await settle();
    await act(async () => { api.setProfile('adult'); });
    await settle();
    await act(async () => { api.eraseAll(); api.setUiLang('en'); }); // écriture « en vol » au moment de l'effacement
    await settle();
    expect(await keys()).toEqual([]);
  });
  it('après l\'effacement, l\'application sauvegarde de nouveau normalement', async () => {
    await render(<AppStateProvider><Grab onApi={grab} /></AppStateProvider>);
    await settle();
    await act(async () => { api.eraseAll(); });
    await settle();
    await act(async () => { api.setProfile('senior'); });
    await settle();
    expect((await keys()).length).toBeGreaterThan(0);
  });
});

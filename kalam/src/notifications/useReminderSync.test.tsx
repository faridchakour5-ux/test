import React from 'react';
import { render, cleanup } from '@testing-library/react-native';
import { remindersAllowedFor, reminderTexts, useReminderSync } from './useReminderSync';
import { syncReminder } from './reminders';
import { t } from '../i18n/strings';

jest.mock('./reminders', () => ({ ...jest.requireActual('./reminders'), syncReminder: jest.fn(async () => undefined) }));
const sync = syncReminder as jest.Mock;

type Args = Parameters<typeof useReminderSync>;
function Probe({ a }: { a: Args }) {
  useReminderSync(...a);
  return null;
}
const on = { enabled: true, hour: 19, minute: 30 };

afterEach(async () => { await cleanup(); sync.mockClear(); });

describe('remindersAllowedFor', () => {
  it('jamais pour un enfant ni sans profil; permis pour adulte, ado, senior', () => {
    expect(remindersAllowedFor(null)).toBe(false);
    expect(remindersAllowedFor('kids')).toBe(false);
    expect(remindersAllowedFor('adult')).toBe(true);
    expect(remindersAllowedFor('senior')).toBe(true);
  });
});

describe('reminderTexts', () => {
  it('titre Kalam et corps traduit dans la langue choisie', () => {
    expect(reminderTexts('fr')).toEqual({ title: 'Kalam', body: t('fr', 'reminderNotifBody') });
    expect(reminderTexts('ar').body).toBe(t('ar', 'reminderNotifBody'));
  });
});

describe('useReminderSync', () => {
  it('ne touche à rien tant que la sauvegarde n\'est pas lue', async () => {
    await render(<Probe a={[false, on, 'fr', 'senior'] as Args} />);
    expect(sync).not.toHaveBeenCalled();
  });
  it('synchronise au lancement avec réglage, textes et autorisation de profil', async () => {
    await render(<Probe a={[true, on, 'fr', 'senior'] as Args} />);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledWith(on, reminderTexts('fr'), true);
  });
  it('profil enfant: autorisation refusée transmise', async () => {
    await render(<Probe a={[true, on, 'fr', 'kids'] as Args} />);
    expect(sync).toHaveBeenCalledWith(on, reminderTexts('fr'), false);
  });
  it('se relance à chaque changement d\'heure, de langue ou de profil, mais pas à un rendu identique', async () => {
    const view = await render(<Probe a={[true, on, 'fr', 'senior'] as Args} />);
    await view.rerender(<Probe a={[true, { ...on }, 'fr', 'senior'] as Args} />);
    expect(sync).toHaveBeenCalledTimes(1);
    await view.rerender(<Probe a={[true, { ...on, hour: 8 }, 'fr', 'senior'] as Args} />);
    await view.rerender(<Probe a={[true, { ...on, hour: 8 }, 'en', 'senior'] as Args} />);
    await view.rerender(<Probe a={[true, { ...on, hour: 8 }, 'en', 'kids'] as Args} />);
    expect(sync).toHaveBeenCalledTimes(4);
  });
});

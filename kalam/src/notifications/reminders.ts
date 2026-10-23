// Rappel quotidien LOCAL (programmé sur le téléphone): aucun serveur, aucun jeton, aucune donnée envoyée.
// Doux et facultatif: désactivé par défaut, jamais pour les enfants, un seul rappel par jour, sans culpabilisation.

export interface ReminderSetting { enabled: boolean; hour: number; minute: number }

export const defaultReminder = (): ReminderSetting => ({ enabled: false, hour: 19, minute: 0 });

// Heures proposées (gros boutons, pas de sélecteur d'heure à manier).
export const REMINDER_TIMES: { hour: number; minute: number }[] = [
  { hour: 8, minute: 0 },
  { hour: 12, minute: 30 },
  { hour: 19, minute: 0 },
  { hour: 20, minute: 30 },
];

export const timeLabel = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

const isInt = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

// Relecture d'une sauvegarde: tout ce qui est abîmé redevient « désactivé, 19:00 ».
export function normalizeReminder(v: unknown): ReminderSetting {
  const base = defaultReminder();
  if (!v || typeof v !== 'object' || Array.isArray(v)) return base;
  const r = v as Record<string, unknown>;
  const valid = isInt(r.hour, 0, 23) && isInt(r.minute, 0, 59);
  return { enabled: r.enabled === true && valid, hour: valid ? (r.hour as number) : base.hour, minute: valid ? (r.minute as number) : base.minute };
}

export const REMINDER_ID = 'kalam-daily-reminder';
export const CHANNEL_ID = 'daily-reminder';

export type ReminderFailure = 'unavailable' | 'permission' | 'permission-blocked' | 'error';
export type ReminderResult = { ok: true } | { ok: false; reason: ReminderFailure };

export interface ReminderTexts { title: string; body: string }

type Perm = { granted: boolean; canAskAgain?: boolean };

// Sous-ensemble du module natif utilisé ici (injectable pour les tests).
export interface NotifModule {
  getPermissionsAsync(): Promise<Perm>;
  requestPermissionsAsync(): Promise<Perm>;
  setNotificationChannelAsync(id: string, channel: { name: string; importance: number }): Promise<unknown>;
  scheduleNotificationAsync(req: {
    identifier?: string;
    content: { title: string; body: string };
    trigger: { type: string; hour: number; minute: number; channelId?: string };
  }): Promise<string>;
  cancelScheduledNotificationAsync(id: string): Promise<void>;
  // Constantes du module natif (leurs valeurs numériques ne sont pas à deviner: on les lit).
  AndroidImportance?: { DEFAULT: number };
  SchedulableTriggerInputTypes?: { DAILY: string };
}

// Valeurs de repli si le module ne les expose pas (importance « normale » = 5, déclencheur quotidien = 'daily').
const FALLBACK_TRIGGER_DAILY = 'daily';
const FALLBACK_IMPORTANCE_DEFAULT = 5;

export function createReminders(mod: NotifModule | null, platform: string = 'android') {
  const isAvailable = () => !!mod;

  async function ensurePermission(ask: boolean): Promise<ReminderResult> {
    if (!mod) return { ok: false, reason: 'unavailable' };
    try {
      let perm = await mod.getPermissionsAsync();
      if (!perm.granted) {
        if (!ask) return { ok: false, reason: 'permission' };
        if (perm.canAskAgain === false) return { ok: false, reason: 'permission-blocked' };
        perm = await mod.requestPermissionsAsync();
      }
      if (!perm.granted) return { ok: false, reason: perm.canAskAgain === false ? 'permission-blocked' : 'permission' };
      return { ok: true };
    } catch {
      return { ok: false, reason: 'error' };
    }
  }

  async function schedule(s: ReminderSetting, texts: ReminderTexts): Promise<ReminderResult> {
    if (!mod) return { ok: false, reason: 'unavailable' };
    try {
      // Android 8+: un canal est obligatoire avant toute notification.
      if (platform === 'android') await mod.setNotificationChannelAsync(CHANNEL_ID, { name: 'Daily reminder', importance: mod.AndroidImportance?.DEFAULT ?? FALLBACK_IMPORTANCE_DEFAULT });
      // Un seul rappel: on remplace toujours l'ancien (même identifiant), jamais de doublon.
      await mod.cancelScheduledNotificationAsync(REMINDER_ID);
      await mod.scheduleNotificationAsync({
        identifier: REMINDER_ID,
        content: { title: texts.title, body: texts.body },
        trigger: { type: mod.SchedulableTriggerInputTypes?.DAILY ?? FALLBACK_TRIGGER_DAILY, hour: s.hour, minute: s.minute, ...(platform === 'android' ? { channelId: CHANNEL_ID } : {}) },
      });
      return { ok: true };
    } catch {
      return { ok: false, reason: 'error' };
    }
  }

  // Action de l'utilisateur (il active le rappel ou change l'heure): demande l'autorisation si besoin.
  async function enable(s: ReminderSetting, texts: ReminderTexts): Promise<ReminderResult> {
    const perm = await ensurePermission(true);
    if (!perm.ok) return perm;
    return schedule({ ...s, enabled: true }, texts);
  }

  async function disable(): Promise<ReminderResult> {
    if (!mod) return { ok: true }; // rien n'a pu être programmé
    try {
      await mod.cancelScheduledNotificationAsync(REMINDER_ID);
      return { ok: true };
    } catch {
      return { ok: false, reason: 'error' };
    }
  }

  // À chaque lancement: remet le rappel d'aplomb (changement de fuseau, de langue, mise à jour du téléphone...).
  // Ne demande JAMAIS l'autorisation tout seul: si elle a été retirée, le rappel est simplement annulé.
  async function sync(s: ReminderSetting, texts: ReminderTexts, allowed: boolean): Promise<ReminderResult> {
    if (!s.enabled || !allowed) return disable();
    const perm = await ensurePermission(false);
    if (!perm.ok) { await disable(); return perm; }
    return schedule(s, texts);
  }

  return { isAvailable, enable, disable, sync };
}

// ---------- Instance réelle (chargée à la demande: le module natif n'existe pas partout) ----------
let real: ReturnType<typeof createReminders> | undefined;

function getReal() {
  if (real) return real;
  let mod: NotifModule | null = null;
  let platform = 'android';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('expo-notifications') as NotifModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    platform = (require('react-native') as { Platform: { OS: string } }).Platform.OS;
  } catch {
    mod = null;
  }
  real = createReminders(mod, platform);
  return real;
}

export const remindersAvailable = () => getReal().isAvailable();
export const enableReminder = (s: ReminderSetting, texts: ReminderTexts) => getReal().enable(s, texts);
export const disableReminder = () => getReal().disable();
export const syncReminder = (s: ReminderSetting, texts: ReminderTexts, allowed: boolean) => getReal().sync(s, texts, allowed);

// Vérifications rapides de l'appareil, pour savoir en un geste ce qui marche (serveur, voix, micro, rappels).
// Tout est injecté: la logique se teste sans téléphone, et l'écran n'a qu'à afficher le résultat.
export type CheckId = 'server' | 'voice' | 'mic' | 'notifications';
export type CheckStatus = 'ok' | 'warn' | 'fail';
export type CheckDetail = 'noKey' | 'config' | 'down' | 'partial' | 'none';

export interface CheckResult {
  id: CheckId;
  status: CheckStatus;
  detail?: CheckDetail;
  missing?: string[]; // langues sans voix (check « voice »)
}

export interface DiagnosticDeps {
  serverUrl: () => string; // peut lever une erreur si l'adresse est absente ou n'est pas en https
  fetchImpl: typeof fetch;
  timeoutMs?: number;
  voiceLocales: string[]; // ex. ['en-US', 'fr-FR']
  hasVoice: (locale: string) => Promise<boolean>;
  micAvailable: () => boolean;
  notificationsAvailable: () => boolean;
}

async function checkServer(d: DiagnosticDeps): Promise<CheckResult> {
  let base: string;
  try { base = d.serverUrl(); } catch { return { id: 'server', status: 'fail', detail: 'config' }; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), d.timeoutMs ?? 8000);
  try {
    const res = await d.fetchImpl(`${base}/health`, { method: 'GET', signal: controller.signal });
    if (!res.ok) return { id: 'server', status: 'fail', detail: 'down' };
    const body = (await res.json()) as { ok?: boolean; configured?: boolean };
    if (body?.ok !== true) return { id: 'server', status: 'fail', detail: 'down' };
    return body.configured === true ? { id: 'server', status: 'ok' } : { id: 'server', status: 'warn', detail: 'noKey' };
  } catch {
    return { id: 'server', status: 'fail', detail: 'down' };
  } finally {
    clearTimeout(timer);
  }
}

async function checkVoice(d: DiagnosticDeps): Promise<CheckResult> {
  const missing: string[] = [];
  for (const locale of d.voiceLocales) {
    let ok = false;
    try { ok = await d.hasVoice(locale); } catch { ok = false; }
    if (!ok) missing.push(locale);
  }
  if (missing.length === 0) return { id: 'voice', status: 'ok' };
  if (missing.length === d.voiceLocales.length) return { id: 'voice', status: 'fail', detail: 'none', missing };
  return { id: 'voice', status: 'warn', detail: 'partial', missing };
}

export async function runDiagnostics(d: DiagnosticDeps): Promise<CheckResult[]> {
  const [server, voice] = await Promise.all([checkServer(d), checkVoice(d)]);
  let mic = false;
  try { mic = d.micAvailable(); } catch { mic = false; }
  let notifications = false;
  try { notifications = d.notificationsAvailable(); } catch { notifications = false; }
  return [
    server,
    voice,
    { id: 'mic', status: mic ? 'ok' : 'fail' },
    { id: 'notifications', status: notifications ? 'ok' : 'warn' }, // les rappels sont facultatifs: jamais bloquant
  ];
}

// Résumé en un mot: « fail » si un point essentiel (hors rappels) est en échec, « warn » s'il y a une réserve.
export function overallStatus(results: CheckResult[]): CheckStatus {
  if (results.some((r) => r.status === 'fail')) return 'fail';
  if (results.some((r) => r.status === 'warn')) return 'warn';
  return 'ok';
}

// Message à afficher pour un résultat (clé de traduction + variables), pour que l'écran n'ait aucune logique.
const LOCALE_NAMES: Record<string, string> = { 'en-US': 'English', 'fr-FR': 'Français' };
export function messageFor(r: CheckResult): { key: string; vars?: Record<string, string> } {
  switch (r.id) {
    case 'server':
      if (r.status === 'ok') return { key: 'diagServerOk' };
      if (r.detail === 'noKey') return { key: 'diagServerNoKey' };
      return { key: r.detail === 'config' ? 'diagServerConfig' : 'diagServerDown' };
    case 'voice': {
      if (r.status === 'ok') return { key: 'diagVoiceOk' };
      const langs = (r.missing ?? []).map((l) => LOCALE_NAMES[l] ?? l).join(', ');
      return { key: r.detail === 'none' ? 'diagVoiceNone' : 'diagVoicePart', vars: { langs } };
    }
    case 'mic':
      return { key: r.status === 'ok' ? 'diagMicOk' : 'diagMicNo' };
    case 'notifications':
      return { key: r.status === 'ok' ? 'diagNotifOk' : 'diagNotifNo' };
  }
}

export const CHECK_LABEL: Record<CheckId, string> = { server: 'diagServer', voice: 'diagVoice', mic: 'diagMic', notifications: 'diagNotif' };

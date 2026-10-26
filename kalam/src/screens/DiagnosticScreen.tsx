import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import appJson from '../../app.json';
import { resolveApiUrl } from '../api/teacher';
import { BackButton } from '../components/BackButton';
import { Card } from '../components/Card';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { versionLine } from '../diagnostics/versionInfo';
import { CHECK_LABEL, CheckResult, CheckStatus, DiagnosticDeps, messageFor, overallStatus, runDiagnostics } from '../diagnostics/diagnostics';
import { StringKey, UiLang, t, tf } from '../i18n/strings';
import { remindersAvailable } from '../notifications/reminders';
import { PROBLEM_TEXT, problemFromListen } from '../speech/problems';
import { isSpeechInputAvailable, listenOnce } from '../speech/recognizer';
import { tts } from '../speech/tts';
import { useTheme } from '../theme/ThemeProvider';
import { useHardwareBack } from '../navigation/useHardwareBack';

// Couleur ET symbole: le résultat ne repose jamais sur la couleur seule.
const MARK: Record<CheckStatus, string> = { ok: '✓', warn: '⚠', fail: '✗' };
const SAMPLE = 'Hello! Welcome to Kalam.';

const realDeps = (): DiagnosticDeps => ({
  serverUrl: () => resolveApiUrl(),
  fetchImpl: fetch,
  voiceLocales: ['en-US', 'fr-FR'],
  hasVoice: (l) => tts.hasVoice(l),
  micAvailable: isSpeechInputAvailable,
  notificationsAvailable: remindersAvailable,
});

interface Props { lang: UiLang; onBack: () => void; deps?: Partial<DiagnosticDeps> }

export function DiagnosticScreen({ lang, onBack, deps }: Props) {
  const { colors } = useTheme();
  useHardwareBack(onBack);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [heard, setHeard] = useState<{ text?: string; problem?: StringKey } | null>(null);
  const [testing, setTesting] = useState(false);
  const mounted = useRef(true);
  const depsRef = useRef(deps);

  const run = useCallback(async () => {
    setResults(null);
    const r = await runDiagnostics({ ...realDeps(), ...depsRef.current });
    if (mounted.current) setResults(r);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(run);
    return () => { mounted.current = false; };
  }, [run]);

  const testVoice = () => { void tts.speak(SAMPLE, { lang: 'en-US', rate: 1 }); };
  const testMic = async () => {
    setTesting(true); setHeard(null);
    await tts.stop();
    const r = await listenOnce({ lang: 'en-US', maxMs: 8000 });
    if (!mounted.current) return;
    setTesting(false);
    if (r.ok) setHeard({ text: r.transcript });
    else if (r.reason !== 'cancelled') setHeard({ problem: PROBLEM_TEXT[problemFromListen(r.reason)] });
  };

  const overall = results ? overallStatus(results) : null;
  const COLOR: Record<CheckStatus, string> = { ok: colors.success, warn: colors.warning, fail: colors.danger };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 56, gap: 16 }}>
      <BackButton lang={lang} onPress={onBack} />
      <KText size={26} weight="800" accessibilityRole="header">🩺 {t(lang, 'diagnostic')}</KText>
      <KText muted>{t(lang, 'diagIntro')}</KText>

      {!results && <KText accessibilityLiveRegion="polite">{t(lang, 'diagChecking')}</KText>}

      {results && overall && (
        <KText size={20} weight="800" accessibilityLiveRegion="polite" style={{ color: COLOR[overall] }}>
          {MARK[overall]} {t(lang, overall === 'ok' ? 'diagAllOk' : overall === 'warn' ? 'diagSomeWarn' : 'diagSomeFail')}
        </KText>
      )}

      {results?.map((r) => {
        const m = messageFor(r);
        return (
          <Card key={r.id} style={{ gap: 4, borderColor: COLOR[r.status], borderWidth: 2 }}>
            <KText weight="800">{MARK[r.status]} {t(lang, CHECK_LABEL[r.id] as StringKey)}</KText>
            <KText muted>{m.vars ? tf(lang, m.key as StringKey, m.vars) : t(lang, m.key as StringKey)}</KText>
          </Card>
        );
      })}

      <KButton label={t(lang, 'diagRun')} onPress={() => { void run(); }} />

      <Card style={{ gap: 10 }}>
        <KButton variant="secondary" label={`🔊 ${t(lang, 'diagTestVoice')}`} onPress={testVoice} />
        <KButton variant="secondary" label={`🎤 ${t(lang, 'diagTestMic')}`} onPress={() => { void testMic(); }} />
        {testing && <KText accessibilityLiveRegion="polite">{t(lang, 'listening')}</KText>}
        {heard?.text && <KText accessibilityLiveRegion="polite">{tf(lang, 'diagHeard', { text: heard.text })}</KText>}
        {heard?.problem && <KText accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{t(lang, heard.problem)}</KText>}
      </Card>

      <KText muted size={14} selectable>{versionLine(appJson.expo.version, Platform.OS, Platform.Version)}</KText>
    </ScrollView>
  );
}

import React, { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { PronunciationResult, WordStatus, evaluatePronunciation } from '../domain/pronunciation';
import { UiLang, StringKey, t } from '../i18n/strings';
import { PROBLEM_TEXT, problemFromListen } from '../speech/problems';
import { cancelListening, isSpeechInputAvailable, listenOnce } from '../speech/recognizer';
import { tts } from '../speech/tts';
import { useTheme } from '../theme/ThemeProvider';
import { KText } from './KText';
import { Mascot } from './Mascot';

interface Props {
  lang: UiLang;
  expected: string; // la phrase ou le mot à prononcer (en anglais)
  onResult?: (r: PronunciationResult) => void;
}

// Couleur ET symbole: le sens ne repose jamais sur la couleur seule (daltonisme).
const MARK: Record<WordStatus, string> = { correct: '✓', close: '~', wrong: '✗', missing: '…' };

export function PronunciationPractice({ lang, expected, onResult }: Props) {
  const { colors, profile } = useTheme();
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [message, setMessage] = useState<StringKey | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [heardLive, setHeardLive] = useState('');
  const available = isSpeechInputAvailable();
  const COLOR: Record<WordStatus, string> = { correct: colors.success, close: colors.warning, wrong: colors.danger, missing: colors.textMuted };

  useEffect(() => { setResult(null); setMessage(null); }, [expected]);
  useEffect(() => () => cancelListening(), []);

  if (!available) {
    return <KText muted accessibilityLiveRegion="polite">{t(lang, 'micUnavailable')}</KText>;
  }

  const start = async () => {
    setListening(true); setResult(null); setMessage(null); setBlocked(false); setHeardLive('');
    await tts.stop(); // le micro ne doit pas capter la voix de l'application
    const r = await listenOnce({ lang: 'en-US', patienceMs: profile.speechPatienceMs, maxMs: 10_000, onPartial: setHeardLive });
    setListening(false);
    setHeardLive('');
    if (!r.ok) {
      if (r.reason === 'cancelled') return;
      const problem = problemFromListen(r.reason);
      setBlocked(problem === 'permission-blocked');
      setMessage(PROBLEM_TEXT[problem]);
      return;
    }
    const evaluated = evaluatePronunciation(expected, r.transcript);
    setResult(evaluated);
    onResult?.(evaluated);
  };

  const mood = !result ? (listening ? 'thinking' : 'happy') : result.score >= 80 ? 'cheer' : 'happy';

  return (
    <View style={{ gap: 12, alignItems: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? t(lang, 'listening') : t(lang, 'sayIt')}
        accessibilityState={{ busy: listening }}
        disabled={listening}
        onPress={start}
        style={{ minHeight: Math.max(profile.minTouchSize, 56), minWidth: 200, borderRadius: profile.radius, alignItems: 'center', justifyContent: 'center',
          backgroundColor: listening ? colors.border : colors.primary, paddingHorizontal: 24 }}
      >
        <KText weight="600" size={17} style={{ color: listening ? colors.text : colors.onPrimary }}>
          🎤 {listening ? t(lang, 'listening') : t(lang, 'sayIt')}
        </KText>
      </Pressable>

      {listening && !!heardLive && <KText muted accessibilityLiveRegion="polite">“{heardLive}”</KText>}
      {message && <KText accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{t(lang, message)}</KText>}
      {blocked && (
        <Pressable accessibilityRole="button" onPress={() => { void Linking.openSettings(); }} style={{ minHeight: 48, justifyContent: 'center' }}>
          <KText weight="600" style={{ color: colors.primary }}>{t(lang, 'openSettings')}</KText>
        </Pressable>
      )}

      {result && (
        <View accessibilityLiveRegion="polite" style={{ gap: 8, alignItems: 'center' }}>
          <Mascot mood={mood} size={profile.id === 'kids' ? 110 : 70} />
          <KText size={22} weight="800">{result.score}%</KText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {result.words.map((w, i) => (
              <View key={i} accessible accessibilityLabel={`${w.word}: ${t(lang, w.status)}`}
                style={{ borderWidth: 2, borderColor: COLOR[w.status], borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                <KText weight="600" style={{ color: COLOR[w.status] }}>{MARK[w.status]} {w.word}</KText>
                {w.status === 'wrong' || w.status === 'close' ? <KText size={12} muted>{t(lang, 'heardAs')} “{w.heard}”</KText> : null}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

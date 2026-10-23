import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { ChatMessage, TeacherError, askTeacher } from '../api/teacher';
import { BackButton } from '../components/BackButton';
import { Card } from '../components/Card';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { Mascot } from '../components/Mascot';
import { Lesson, Level } from '../domain/lessons';
import { RETRYABLE_SEND } from '../speech/problems';
import { PROBLEM_TEXT, problemFromListen, problemFromTeacher } from '../speech/problems';
import { initialTurn, turnReducer } from '../domain/voiceTurn';
import { UiLang, t } from '../i18n/strings';
import { cancelListening, isSpeechInputAvailable, listenOnce } from '../speech/recognizer';
import { tts } from '../speech/tts';
import { clearConversation, loadConversation, saveConversation } from '../state/conversations';
import { AgeProfileId } from '../theme/profiles';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  lang: UiLang;
  lesson: Lesson;
  level: Level;
  ageProfile: AgeProfileId;
  onFinish: (minutes: number) => void;
  onBack: () => void;
}

export function ChatScreen({ lang, lesson, level, ageProfile, onFinish, onBack }: Props) {
  const { colors, profile } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [partial, setPartial] = useState('');
  const [noVoice, setNoVoice] = useState(false);
  const [turn, dispatch] = useReducer(turnReducer, undefined, initialTurn);
  const micOk = isSpeechInputAvailable();

  const started = useRef(Date.now());
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const token = useRef(0); // invalide les opérations en vol quand on interrompt ou qu'on quitte
  const listening = useRef(false);
  const mounted = useRef(true);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  // Chargement de la conversation précédente + vérification de la voix anglaise.
  useEffect(() => {
    mounted.current = true;
    loadConversation(lesson.id).then((m) => { if (mounted.current) { setMessages(m); setLoaded(true); } });
    tts.hasVoice('en-US').then((ok) => { if (mounted.current) setNoVoice(!ok); });
    return () => { mounted.current = false; token.current++; void tts.stop(); cancelListening(); };
  }, [lesson.id]);

  // Sauvegarde locale à chaque changement: rien n'est perdu si l'app est fermée.
  useEffect(() => { if (loaded) void saveConversation(lesson.id, messages); }, [messages, loaded, lesson.id]);

  const scrollEnd = () => setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);

  const speak = useCallback(async (text: string, myToken: number) => {
    const outcome = await tts.speak(text, { lang: 'en-US', rate: profile.speechRate });
    if (!mounted.current || myToken !== token.current) return;
    if (outcome !== 'stopped') dispatch({ type: 'SPOKEN' });
  }, [profile.speechRate]);

  // Demande la réponse du professeur pour la conversation donnée.
  const requestReply = useCallback(async (history: ChatMessage[]) => {
    const myToken = ++token.current;
    try {
      const reply = await askTeacher({ ageProfile, level, scenario: lesson.scenario, uiLang: lang, messages: history.slice(-20) });
      if (!mounted.current || myToken !== token.current) return;
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      dispatch({ type: 'REPLY' });
      scrollEnd();
      await speak(reply, myToken);
    } catch (e) {
      if (!mounted.current || myToken !== token.current) return;
      dispatch({ type: 'SEND_FAIL', problem: problemFromTeacher(e instanceof TeacherError ? e.kind : 'server') });
    }
  }, [ageProfile, level, lesson.scenario, lang, speak]);

  const submit = useCallback((text: string, fromVoice: boolean) => {
    const clean = text.trim().slice(0, 500);
    if (!clean) return;
    const next: ChatMessage[] = [...messagesRef.current, { role: 'user', content: clean }];
    setMessages(next);
    dispatch(fromVoice ? { type: 'HEARD' } : { type: 'SEND' });
    scrollEnd();
    void requestReply(next);
  }, [requestReply]);

  // Phase d'écoute: démarrée à chaque nouvelle prise de parole (bouton micro ou mains libres).
  // On suit `listenId` et pas seulement la phase: React peut regrouper plusieurs étapes rapides.
  useEffect(() => {
    if (turn.listenId === 0 || turn.phase !== 'listening' || listening.current) return;
    listening.current = true;
    const myToken = ++token.current;
    setPartial('');
    (async () => {
      await tts.stop(); // le micro ne doit jamais capter la voix du professeur
      const r = await listenOnce({ lang: 'en-US', patienceMs: profile.speechPatienceMs, onPartial: (p) => { if (mounted.current && myToken === token.current) setPartial(p); } });
      listening.current = false;
      if (!mounted.current || myToken !== token.current) return;
      setPartial('');
      if (r.ok) submit(r.transcript, true);
      else if (r.reason !== 'cancelled') dispatch({ type: 'HEARD_FAIL', problem: problemFromListen(r.reason) });
    })();
  }, [turn.listenId, turn.phase, profile.speechPatienceMs, submit]);

  const stopAll = () => {
    token.current++;
    listening.current = false;
    cancelListening();
    void tts.stop();
    setPartial('');
    dispatch({ type: 'STOP' });
  };

  const retrySend = () => {
    const last = messagesRef.current;
    if (!last.length || last[last.length - 1].role !== 'user') return;
    dispatch({ type: 'SEND' });
    void requestReply(last);
  };

  const newConversation = async () => {
    stopAll();
    setMessages([]);
    await clearConversation(lesson.id);
  };

  const sendTyped = () => { if (!input.trim() || turn.phase === 'sending') return; const text = input; setInput(''); submit(text, false); };
  const finish = () => { stopAll(); onFinish(Math.max(1, Math.round((Date.now() - started.current) / 60_000))); };
  const back = () => { stopAll(); onBack(); };

  const phase = turn.phase;
  const busy = phase === 'sending';
  const mood = phase === 'listening' ? 'thinking' : phase === 'speaking' ? 'cheer' : 'happy';
  const status = phase === 'listening' ? t(lang, 'listening') : phase === 'sending' ? t(lang, 'thinking') : phase === 'speaking' ? t(lang, 'speaking') : '';
  const lastIsUser = messages.length > 0 && messages[messages.length - 1].role === 'user';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingHorizontal: 24, paddingTop: 56, gap: 6 }}>
        <BackButton lang={lang} onPress={back} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Mascot mood={mood} size={profile.id === 'kids' ? 90 : 56} />
          <View style={{ flex: 1 }}>
            <KText size={22} weight="800" accessibilityRole="header">{lesson.title[lang] ?? lesson.title.en}</KText>
            <KText size={13} muted accessibilityLiveRegion="polite">{status || lesson.vocab.map((v) => v.en).join(' · ')}</KText>
          </View>
        </View>
      </View>

      <ScrollView ref={scroller} contentContainerStyle={{ padding: 24, gap: 12 }} onContentSizeChange={scrollEnd}>
        {noVoice && <KText size={14} style={{ color: colors.warning }}>⚠ {t(lang, 'noVoice')}</KText>}
        {messages.map((m, i) => (
          <Card key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: m.role === 'user' ? colors.primary : colors.surface }}>
            <KText style={{ color: m.role === 'user' ? colors.onPrimary : colors.text }}>{m.content}</KText>
            {m.role === 'assistant' && (
              <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'listen')} onPress={() => { stopAll(); void tts.speak(m.content, { lang: 'en-US', rate: profile.speechRate }); }} style={{ minHeight: 44, justifyContent: 'center' }}>
                <KText weight="600" style={{ color: colors.primary }}>🔊 {t(lang, 'listen')}</KText>
              </Pressable>
            )}
          </Card>
        ))}
        {phase === 'listening' && (
          <Card style={{ alignSelf: 'flex-end', maxWidth: '88%', borderStyle: 'dashed' }}>
            <KText muted accessibilityLiveRegion="polite">{partial || '…'}</KText>
          </Card>
        )}
        {busy && <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /><KText muted>{t(lang, 'thinking')}</KText></View>}
      </ScrollView>

      {turn.problem && (
        <View accessibilityLiveRegion="assertive" style={{ paddingHorizontal: 24, paddingBottom: 8, gap: 8 }}>
          <KText size={14} style={{ color: colors.danger }}>{t(lang, PROBLEM_TEXT[turn.problem])}</KText>
          {turn.problem === 'permission-blocked' && <KButton label={t(lang, 'openSettings')} onPress={() => { void Linking.openSettings(); }} />}
          {RETRYABLE_SEND.includes(turn.problem) && lastIsUser && <KButton label={t(lang, 'retry')} onPress={retrySend} />}
        </View>
      )}

      <View style={{ padding: 16, gap: 8 }}>
        {micOk && (
          <>
            <KButton
              label={phase === 'listening' ? `⏹ ${t(lang, 'stopBtn')}` : phase === 'speaking' ? `⏹ ${t(lang, 'stopVoice')}` : `🎤 ${t(lang, 'speak')}`}
              onPress={phase === 'listening' || phase === 'speaking' ? stopAll : () => dispatch({ type: 'LISTEN' })}
              hint={t(lang, 'handsFree')}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <KText size={14} muted style={{ flex: 1 }}>{t(lang, 'handsFree')}</KText>
              <Switch value={turn.handsFree} onValueChange={(on) => dispatch({ type: 'SET_HANDS_FREE', on })} accessibilityLabel={t(lang, 'handsFree')} />
            </View>
          </>
        )}
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t(lang, 'typeHere')}
          placeholderTextColor={colors.textMuted}
          maxLength={500}
          accessibilityLabel={t(lang, 'typeHere')}
          onSubmitEditing={sendTyped}
          editable={!busy}
          style={{ minHeight: profile.minTouchSize, borderRadius: profile.radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, color: colors.text, backgroundColor: colors.surface, fontSize: profile.fontScale * 16 }}
        />
        <KButton label={t(lang, 'send')} onPress={sendTyped} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><KButton label={t(lang, 'finish')} onPress={finish} /></View>
          {messages.length > 0 && <View style={{ flex: 1 }}><KButton label={t(lang, 'newChat')} onPress={() => { void newConversation(); }} /></View>}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

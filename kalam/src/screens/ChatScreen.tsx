import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { ChatMessage, TeacherError, askTeacher, askTeacherStream, streamingEnabled } from '../api/teacher';
import { BackButton } from '../components/BackButton';
import { Card } from '../components/Card';
import { KButton } from '../components/KButton';
import { KText } from '../components/KText';
import { Mascot } from '../components/Mascot';
import { PronunciationPractice } from '../components/PronunciationPractice';
import { Lesson, Level, VocabItem, meaning } from '../domain/lessons';
import { PROBLEM_TEXT, RETRYABLE_SEND, problemFromListen, problemFromTeacher } from '../speech/problems';
import { initialTurn, turnReducer } from '../domain/voiceTurn';
import { UiLang, t, tf } from '../i18n/strings';
import { cancelListening, isSpeechInputAvailable, listenOnce } from '../speech/recognizer';
import { openAppSettings } from '../speech/openSettings';
import { createSentenceSplitter } from '../speech/sentences';
import { tts } from '../speech/tts';
import { useStopInBackground } from '../speech/useStopInBackground';
import { parseTagged, tagMessage } from '../domain/duo';
import { DEFAULT_TARGET, TARGET_LOCALE, TARGET_NAMES, TargetLang, targetText } from '../domain/targets';
import { FREE_LESSON_ID, FREE_TOPICS, FreeTopic, getFreeTopic } from '../domain/freeTopics';
import { clearConversation, loadConversation, loadTopicId, saveConversation, saveTopicId } from '../state/conversations';
import { AgeProfileId } from '../theme/profiles';
import { useTheme } from '../theme/ThemeProvider';
import { useHardwareBack } from '../navigation/useHardwareBack';
import { useKeepAwakeWhile } from '../navigation/useKeepAwakeWhile';

const SAVE_DELAY_MS = 500;

interface Props {
  target?: TargetLang; // langue apprise
  duo?: { names: [string, string] }; // mode « conversation à deux »
  lang: UiLang;
  lesson: Lesson;
  level: Level;
  ageProfile: AgeProfileId;
  onFinish: (minutes: number) => void;
  onBack: () => void;
}

export function ChatScreen({ duo, target = DEFAULT_TARGET, lang, lesson, level, ageProfile, onFinish, onBack }: Props) {
  const locale = TARGET_LOCALE[target]; // voix et micro dans la langue apprise
  const { colors, profile } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [partial, setPartial] = useState('');
  const [noVoice, setNoVoice] = useState(false);
  const [topic, setTopic] = useState<FreeTopic | null>(null); // sujet choisi (mode « Parle librement »)
  const isFree = lesson.id === FREE_LESSON_ID;
  const scenario = isFree && topic ? topic.scenario : lesson.scenario;
  const [speaker, setSpeaker] = useState<0 | 1>(0); // qui parle (mode à deux)
  const [showPractice, setShowPractice] = useState(false);
  const [practiceItem, setPracticeItem] = useState<VocabItem | null>(null);
  const [turn, dispatch] = useReducer(turnReducer, undefined, initialTurn);
  const micOk = isSpeechInputAvailable();

  const [startedAt] = useState(() => Date.now());
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const token = useRef(0); // invalide les opérations en vol quand on interrompt ou qu'on quitte
  const listening = useRef(false);
  const listenSeq = useRef(0); // identifie l'écoute en cours: une écoute annulée ne doit pas libérer la suivante
  const streamAbort = useRef<AbortController | null>(null); // annule la requête réseau en cours
  const mounted = useRef(true);
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Chargement de la conversation précédente + vérification de la voix anglaise.
  useEffect(() => {
    mounted.current = true;
    Promise.all([loadConversation(lesson.id), isFree ? loadTopicId(lesson.id) : Promise.resolve(null)]).then(([m, topicId]) => {
      if (!mounted.current) return;
      setMessages(m);
      setTopic(getFreeTopic(topicId) ?? null);
      setLoaded(true);
    });
    tts.hasVoice(locale).then((ok) => { if (mounted.current) setNoVoice(!ok); });
    // `token` est un compteur volontairement lu à la fermeture: il sert à invalider les opérations en vol.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { mounted.current = false; token.current++; streamAbort.current?.abort(); void tts.stop(); cancelListening(); };
  }, [lesson.id, isFree, locale]);

  // Sauvegarde locale à chaque changement: rien n'est perdu si l'app est fermée.
  // Les sauvegardes sont regroupées: en mode flux le texte change plusieurs fois par seconde, inutile (et coûteux
  // en batterie) de réécrire tout l'historique à chaque morceau. À la fermeture de l'écran, on sauvegarde tout de suite.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => { void saveConversation(lesson.id, messages); }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [messages, loaded, lesson.id]);
  const latest = useRef({ messages, loaded });
  useEffect(() => { latest.current = { messages, loaded }; }, [messages, loaded]);
  useEffect(() => () => {
    const { messages: last, loaded: ready } = latest.current;
    if (ready) void saveConversation(lesson.id, last);
  }, [lesson.id]);

  const scrollEnd = () => setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);

  const speak = useCallback(async (text: string, myToken: number) => {
    const outcome = await tts.speak(text, { lang: locale, rate: profile.speechRate });
    if (!mounted.current || myToken !== token.current) return;
    if (outcome !== 'stopped') dispatch({ type: 'SPOKEN' });
  }, [profile.speechRate, locale]);

  // Demande la réponse du professeur pour la conversation donnée.
  const requestReply = useCallback(async (history: ChatMessage[]) => {
    const myToken = ++token.current;
    const opening = history.length === 0; // aucun message: le professeur ouvre la scène
    const request = { ageProfile, level, scenario, uiLang: lang, targetLang: target, messages: history.slice(-20), ...(opening ? { start: true } : {}) };
    const live = () => mounted.current && myToken === token.current;
    streamAbort.current?.abort(); // une seule réponse en cours à la fois
    const abort = new AbortController();
    streamAbort.current = abort;

    // Réponse en flux: le texte s'affiche et la voix démarre dès la première phrase complète.
    if (streamingEnabled()) {
      const splitter = createSentenceSplitter();
      const voice = tts.speakStream({ lang: locale, rate: profile.speechRate });
      let started = false;
      try {
        await askTeacherStream(request, {
          signal: abort.signal,
          onDelta: (d) => {
            if (!live()) return;
            if (!started) {
              started = true;
              setMessages((m) => [...m, { role: 'assistant', content: d }]);
              dispatch({ type: 'REPLY' });
            } else {
              setMessages((m) => {
                const last = m[m.length - 1];
                return last?.role === 'assistant' ? [...m.slice(0, -1), { ...last, content: last.content + d }] : m;
              });
            }
            splitter.push(d).forEach((sentence) => voice.push(sentence));
          },
        });
        if (!live()) return;
        splitter.flush().forEach((sentence) => voice.push(sentence));
        const outcome = await voice.end();
        if (live() && outcome !== 'stopped') dispatch({ type: 'SPOKEN' });
      } catch (e) {
        void voice.end();
        if (!live()) return;
        dispatch({ type: 'SEND_FAIL', problem: problemFromTeacher(e instanceof TeacherError ? e.kind : 'server') });
      }
      return;
    }

    try {
      const reply = await askTeacher(request);
      if (!mounted.current || myToken !== token.current) return;
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      dispatch({ type: 'REPLY' });
      scrollEnd();
      await speak(reply, myToken);
    } catch (e) {
      if (!mounted.current || myToken !== token.current) return;
      dispatch({ type: 'SEND_FAIL', problem: problemFromTeacher(e instanceof TeacherError ? e.kind : 'server') });
    }
  }, [ageProfile, level, scenario, lang, speak, profile.speechRate, locale, target]);

  // Conversation vide: c'est le professeur qui prend la parole en premier, comme dans un vrai jeu de rôle.
  const opened = useRef(false);
  useEffect(() => {
    if (!loaded || opened.current || messagesRef.current.length > 0) return;
    if (isFree && !topic) return; // en mode libre, l'apprenant choisit d'abord le sujet
    opened.current = true;
    // Déclenché juste après le rendu (et non dans le corps de l'effet): pas de rendu en cascade.
    void Promise.resolve().then(() => {
      if (!mounted.current) return;
      dispatch({ type: 'SEND' });
      void requestReply([]);
    });
  }, [loaded, requestReply, isFree, topic]);

  const submit = useCallback((text: string, fromVoice: boolean) => {
    const trimmed = text.trim().slice(0, duo ? 470 : 500); // la marge laisse la place de l'étiquette [Prénom]
    if (!trimmed) return;
    const clean = duo ? tagMessage(duo.names[speaker], trimmed) : trimmed;
    const next: ChatMessage[] = [...messagesRef.current, { role: 'user', content: clean }];
    setMessages(next);
    if (duo) setSpeaker((s) => (s === 0 ? 1 : 0)); // le tour passe à l'autre personne
    dispatch(fromVoice ? { type: 'HEARD' } : { type: 'SEND' });
    scrollEnd();
    void requestReply(next);
  }, [requestReply, duo, speaker]);

  // L'écoute en cours doit appeler la DERNIÈRE version de « submit » (le joueur actif en mode à deux peut changer pendant l'écoute).
  const submitRef = useRef(submit);
  useEffect(() => { submitRef.current = submit; });

  // Phase d'écoute: démarrée à chaque nouvelle prise de parole (bouton micro ou mains libres).
  // On suit `listenId` et pas seulement la phase: React peut regrouper plusieurs étapes rapides.
  useEffect(() => {
    if (turn.listenId === 0 || turn.phase !== 'listening' || listening.current) return;
    listening.current = true;
    const myListen = ++listenSeq.current;
    const myToken = ++token.current;
    setPartial('');
    (async () => {
      await tts.stop(); // le micro ne doit jamais capter la voix du professeur
      const r = await listenOnce({ lang: locale, patienceMs: profile.speechPatienceMs, onPartial: (p) => { if (mounted.current && myToken === token.current) setPartial(p); } });
      if (listenSeq.current === myListen) listening.current = false;
      if (!mounted.current || myToken !== token.current) return;
      setPartial('');
      if (r.ok) submitRef.current(r.transcript, true);
      else if (r.reason !== 'cancelled') dispatch({ type: 'HEARD_FAIL', problem: problemFromListen(r.reason) });
    })();
  }, [turn.listenId, turn.phase, profile.speechPatienceMs, locale]);

  const turnRef = useRef(turn);
  useEffect(() => { turnRef.current = turn; });

  // Coupe le micro et la voix SEULEMENT (une réponse en route continue: ouvrir l'exercice ou réécouter une phrase ne doit pas l'annuler).
  const stopSpeechAndMic = () => {
    token.current++;
    listening.current = false;
    listenSeq.current++;
    cancelListening();
    void tts.stop();
    setPartial('');
    if (turnRef.current.phase === 'listening' || turnRef.current.phase === 'speaking') dispatch({ type: 'STOP' });
  };

  const stopAll = () => {
    token.current++;
    listening.current = false;
    listenSeq.current++;
    streamAbort.current?.abort(); // coupe aussi la requête: plus de jetons ni de batterie gaspillés
    cancelListening();
    void tts.stop();
    setPartial('');
    dispatch({ type: 'STOP' });
  };

  // Micro, voix et requête coupés dès que l'app passe en arrière-plan. Si on attendait la réponse du professeur, le message de
  // l'apprenant resterait sans réponse: on propose alors « Réessayer » à son retour (sinon deux messages de suite partiraient).
  useStopInBackground(() => {
    const waiting = turnRef.current.phase === 'sending' && messagesRef.current.at(-1)?.role === 'user';
    stopAll();
    if (waiting) dispatch({ type: 'SEND_FAIL', problem: 'offline' });
  });

  const retrySend = () => {
    const last = messagesRef.current;
    if (last.length && last[last.length - 1].role !== 'user') return;
    dispatch({ type: 'SEND' });
    void requestReply(last); // liste vide = nouvelle tentative d'ouverture par le professeur
  };

  const newConversation = async () => {
    stopAll();
    setSpeaker(0); // mode à deux: la nouvelle conversation recommence avec la première personne
    setMessages([]);
    messagesRef.current = [];
    await clearConversation(lesson.id);
    if (isFree) { setTopic(null); opened.current = false; return; } // on repropose le choix du sujet
    dispatch({ type: 'SEND' });
    void requestReply([]);
  };

  const chooseTopic = (t: FreeTopic) => { setTopic(t); void saveTopicId(lesson.id, t.id); };

  const sendTyped = () => { if (!input.trim() || turn.phase === 'sending') return; stopSpeechAndMic(); const text = input; setInput(''); submit(text, false); };
  // Terminer sans avoir rien dit ne compte pas comme une séance (0 minute: ni leçon réussie, ni série, ni points).
  const finish = () => { stopAll(); const spoke = messagesRef.current.some((m) => m.role === 'user'); onFinish(spoke ? Math.max(1, Math.round((Date.now() - startedAt) / 60_000)) : 0); };
  const back = () => { stopAll(); onBack(); };
  useHardwareBack(back); // bouton retour d'Android = bouton « Retour » de l'écran
  useKeepAwakeWhile(turn.handsFree); // mains libres: l'écran ne s'éteint pas (il couperait l'écoute)

  const phase = turn.phase;
  const busy = phase === 'sending';
  const mood = phase === 'listening' ? 'thinking' : phase === 'speaking' ? 'cheer' : 'happy';
  const status = phase === 'listening' ? t(lang, 'listening') : phase === 'sending' ? t(lang, 'thinking') : phase === 'speaking' ? t(lang, 'speaking') : '';
  const lastIsUser = messages.length > 0 && messages[messages.length - 1].role === 'user';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior="padding">
      <View style={{ paddingHorizontal: 24, paddingTop: 56, gap: 6 }}>
        <BackButton lang={lang} onPress={back} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Mascot mood={mood} size={profile.id === 'kids' ? 90 : 56} />
          <View style={{ flex: 1 }}>
            <KText size={22} weight="800" accessibilityRole="header">{lesson.title[lang] ?? lesson.title.en}</KText>
            <KText size={13} muted accessibilityLiveRegion="polite">{status || lesson.vocab.map((v) => targetText(v, target)).join(' · ')}</KText>
          </View>
        </View>
      </View>

      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 12 }} onContentSizeChange={scrollEnd}>
        {lesson.vocab.length > 0 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: showPractice }} onPress={() => { stopSpeechAndMic(); setShowPractice((v) => !v); }} style={{ minHeight: profile.minTouchSize, justifyContent: 'center' }}>
          <KText weight="600" style={{ color: colors.primary }}>🎯 {t(lang, 'practice')} {showPractice ? '▲' : '▼'}</KText>
        </Pressable>}
        {showPractice && lesson.vocab.length > 0 && (
          <Card style={{ gap: 10 }}>
            <KText size={13} muted>{t(lang, 'practiceHint')}</KText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {lesson.vocab.map((v) => (
                <Pressable key={v.en} accessibilityRole="button" accessibilityLabel={`${targetText(v, target)}, ${meaning(v, lang, target)}`} accessibilityState={{ selected: practiceItem?.en === v.en }}
                  onPress={() => { stopSpeechAndMic(); setPracticeItem(v); void tts.speak(targetText(v, target), { lang: locale, rate: profile.speechRate }); }}
                  style={{ minHeight: 48, paddingHorizontal: 12, borderRadius: profile.radius, justifyContent: 'center', borderWidth: practiceItem?.en === v.en ? 3 : 1, borderColor: practiceItem?.en === v.en ? colors.primary : colors.border }}>
                  <KText weight="600">{targetText(v, target)}</KText>
                  <KText size={12} muted>{meaning(v, lang, target)}</KText>
                </Pressable>
              ))}
            </View>
            {practiceItem && <PronunciationPractice lang={lang} target={target} expected={targetText(practiceItem, target)} />}
          </Card>
        )}
        {isFree && loaded && !topic && messages.length === 0 && (
          <Card style={{ gap: 12 }}>
            <KText size={20} weight="800" accessibilityRole="header">{t(lang, 'chooseFreeTopic')}</KText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {FREE_TOPICS.map((tp) => (
                <Pressable key={tp.id} accessibilityRole="button" accessibilityLabel={tp.title[lang]} onPress={() => chooseTopic(tp)}
                  style={{ minHeight: Math.max(profile.minTouchSize, 56), paddingHorizontal: 14, borderRadius: profile.radius, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <KText size={22}>{tp.emoji}</KText>
                  <KText weight="600">{tp.title[lang]}</KText>
                </Pressable>
              ))}
            </View>
          </Card>
        )}
        {isFree && topic && <KText size={13} muted>{topic.emoji} {topic.title[lang]}</KText>}
        {noVoice && <KText size={14} style={{ color: colors.warning }}>⚠ {tf(lang, 'noVoice', { target: TARGET_NAMES[lang][target] })}</KText>}
        {messages.map((m, i) => (
          <Card key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: m.role === 'user' ? colors.primary : colors.surface }}>
            {duo && m.role === 'user' ? (
              <>
                {parseTagged(m.content).speaker && <KText size={12} weight="800" style={{ color: colors.onPrimary }}>{parseTagged(m.content).speaker}</KText>}
                <KText style={{ color: colors.onPrimary }}>{parseTagged(m.content).text}</KText>
              </>
            ) : (
              <KText style={{ color: m.role === 'user' ? colors.onPrimary : colors.text }}>{m.content}</KText>
            )}
            {m.role === 'assistant' && (
              <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'listen')} onPress={() => { stopSpeechAndMic(); void tts.speak(m.content, { lang: locale, rate: profile.speechRate }); }} style={{ minHeight: 44, justifyContent: 'center' }}>
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
          {turn.problem === 'permission-blocked' && <KButton label={t(lang, 'openSettings')} onPress={() => { void openAppSettings(); }} />}
          {RETRYABLE_SEND.includes(turn.problem) && (lastIsUser || messages.length === 0) && <KButton label={t(lang, 'retry')} onPress={retrySend} />}
        </View>
      )}

      <View style={{ padding: 16, gap: 8 }}>
        {duo && (
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <KText size={13} muted>{t(lang, 'duoTurn')}</KText>
            {duo.names.map((n, i) => (
              <Pressable key={i} accessibilityRole="radio" accessibilityState={{ checked: speaker === i }} accessibilityLabel={`${t(lang, 'duoTurn')} ${n}`} onPress={() => setSpeaker(i as 0 | 1)}
                style={{ flex: 1, minWidth: 0, minHeight: profile.minTouchSize, borderRadius: profile.radius, alignItems: 'center', justifyContent: 'center', borderWidth: speaker === i ? 3 : 1, borderColor: speaker === i ? colors.primary : colors.border, backgroundColor: colors.surface }}>
                <KText weight="800">{speaker === i ? '▶ ' : ''}{n}</KText>
              </Pressable>
            ))}
          </View>
        )}
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
        {/* Champ et « Envoyer » sur une même ligne: sur un petit téléphone avec de gros caractères, la zone des messages garde de la place */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
          <TextInput
            maxFontSizeMultiplier={profile.maxSystemFontScale}
            value={input}
            onChangeText={setInput}
            placeholder={t(lang, 'typeHere')}
            placeholderTextColor={colors.textMuted}
            maxLength={500}
            accessibilityLabel={t(lang, 'typeHere')}
            onSubmitEditing={sendTyped}
            editable={!busy}
            style={{ flex: 1, minWidth: 0, minHeight: profile.minTouchSize, borderRadius: profile.radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, color: colors.text, backgroundColor: colors.surface, fontSize: profile.fontScale * 16 }}
          />
          <View style={{ justifyContent: 'center' }}><KButton label={t(lang, 'send')} onPress={sendTyped} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><KButton variant="secondary" label={t(lang, 'finish')} onPress={finish} /></View>
          {messages.length > 0 && <View style={{ flex: 1 }}><KButton variant="secondary" label={t(lang, 'newChat')} onPress={() => { void newConversation(); }} /></View>}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

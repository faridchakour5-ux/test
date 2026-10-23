import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { cancelListening } from './recognizer';
import { tts } from './tts';

// Quand l'app quitte le premier plan (appel entrant, autre application, écran verrouillé), on coupe tout de suite
// le micro et la voix: un micro ne doit jamais rester ouvert en arrière-plan. `extra` remet l'écran en ordre.
export function useStopInBackground(extra?: () => void): void {
  const latest = useRef(extra);
  useEffect(() => { latest.current = extra; });
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      void tts.stop();
      cancelListening();
      latest.current?.();
    });
    return () => sub.remove();
  }, []);
}

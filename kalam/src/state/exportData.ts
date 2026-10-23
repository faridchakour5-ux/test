import { ChatMessage } from '../api/teacher';
import { Card } from '../domain/srs';
import { Progress } from '../domain/progress';
import { UiLang } from '../i18n/strings';
import { PaletteId } from '../theme/palettes';
import { AgeProfileId } from '../theme/profiles';
import { Level } from '../domain/lessons';
import { KidsState } from './AppState';

export interface ExportableState {
  profile: AgeProfileId | null;
  level: Level | null;
  uiLang: UiLang;
  palette: PaletteId;
  progress: Progress;
  cards: Card[];
  kids: KidsState;
}

export const EXPORT_FORMAT_VERSION = 1;

// Droit à la portabilité (RGPD): toutes les données personnelles stockées par Kalam sur l'appareil,
// dans un format lisible (JSON). Aucune clé, aucun identifiant technique n'y figure.
export function buildExport(state: ExportableState, conversations: Record<string, ChatMessage[]>, now: Date = new Date()): string {
  return JSON.stringify(
    {
      app: 'kalam',
      formatVersion: EXPORT_FORMAT_VERSION,
      exportedAt: now.toISOString(),
      settings: { profile: state.profile, level: state.level, interfaceLanguage: state.uiLang, palette: state.palette },
      progress: state.progress,
      vocabularyCards: state.cards,
      kidsMode: {
        stars: state.kids.stars,
        storiesRead: state.kids.storiesRead,
        dailyLimitMinutes: state.kids.dailyLimit,
        microphoneConsent: state.kids.consent,
      },
      conversations,
    },
    null,
    2,
  );
}

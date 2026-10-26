import React from 'react';
import { View } from 'react-native';
import { DayBar, totalMinutes } from '../domain/progress';
import { UiLang, t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';
import { KText } from './KText';

interface Props {
  lang: UiLang;
  bars: DayBar[];
  goal: number; // objectif quotidien: sert de repère de hauteur
  lessonsDone: number;
}

// Initiale du jour de la semaine dans la langue de l'interface (repli: numéro du jour).
export function weekdayInitial(day: string, lang: UiLang): string {
  const date = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return day.slice(8); // date illisible: « Invalid Date » ne doit jamais s'afficher
  try {
    return date.toLocaleDateString(lang, { weekday: 'narrow', timeZone: 'UTC' });
  } catch {
    return day.slice(8);
  }
}

const BAR_MAX_HEIGHT = 72;

export function WeekChart({ lang, bars, goal, lessonsDone }: Props) {
  const { colors } = useTheme();
  const total = totalMinutes(bars);
  const scale = Math.max(goal, ...bars.map((b) => b.minutes), 1);
  return (
    <View
      accessible
      accessibilityLabel={`${t(lang, 'weekChartLabel')}: ${total} ${t(lang, 'totalMinutes')}, ${lessonsDone} ${t(lang, 'lessonsDone')}`}
      style={{ gap: 8 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: BAR_MAX_HEIGHT + 4 }}>
        {bars.map((b) => {
          const reached = b.minutes >= goal;
          return (
            <View key={b.day} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <View
                testID={`bar-${b.day}`}
                style={{
                  width: 18,
                  height: b.minutes > 0 ? Math.max(6, Math.round((b.minutes / scale) * BAR_MAX_HEIGHT)) : 3,
                  borderRadius: 6,
                  // La couleur n'est jamais seule: l'objectif atteint s'ajoute à un trait plein (daltonisme)
                  backgroundColor: b.minutes > 0 ? colors.primary : colors.border,
                  opacity: b.minutes > 0 && !reached ? 0.55 : 1,
                  borderWidth: reached && b.minutes > 0 ? 2 : 0,
                  borderColor: colors.text,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {bars.map((b) => (
          <View key={b.day} style={{ flex: 1, alignItems: 'center' }}>
            <KText size={12} weight={b.isToday ? '800' : '400'} muted={!b.isToday}>{weekdayInitial(b.day, lang)}</KText>
          </View>
        ))}
      </View>
      <KText size={13} muted>{total} {t(lang, 'totalMinutes')} · {lessonsDone} {t(lang, 'lessonsDone')}</KText>
    </View>
  );
}

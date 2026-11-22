import React from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../i18n/LangContext';
import { rowDirection } from '../i18n/layout';
import { isRtl } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';
import { ChevronIcon } from './Icons';
import { ZText } from './ZText';

interface Props { children: React.ReactNode; onBack?: () => void; right?: React.ReactNode; footer?: React.ReactNode; keyboard?: boolean; testID?: string }

// Page type: marges généreuses, zones sûres (plein écran d'Android récent), retour discret, pied de page fixe pour l'action principale.
export function Screen({ children, onBack, right, footer, keyboard, testID }: Props) {
  const { colors } = useTheme();
  const { lang, t } = useLang();
  const insets = useSafeAreaInsets();
  const body = (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID={testID}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 24, gap: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {onBack || right ? (
          <View style={{ flexDirection: rowDirection(lang), alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
            {onBack ? (
              <Pressable accessibilityRole="button" accessibilityLabel={t('back')} onPress={onBack} hitSlop={12} style={{ flexDirection: rowDirection(lang), alignItems: 'center', gap: 4, minHeight: 44 }}>
                <ChevronIcon flip={isRtl(lang)} />
                <ZText>{t('back')}</ZText>
              </Pressable>
            ) : <View />}
            {right}
          </View>
        ) : null}
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: insets.bottom + 16, gap: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }}>{footer}</View> : null}
    </View>
  );
  // Plein écran d'Android récent: le clavier ne redimensionne plus la fenêtre, on réserve donc sa place.
  return keyboard ? <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">{body}</KeyboardAvoidingView> : body;
}

// Fine ligne de séparation.
export const Divider = () => {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
};

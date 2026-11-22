import React from 'react';
import { Share, View } from 'react-native';
import { Button } from '../components/Button';
import { CheckCircle } from '../components/Icons';
import { Screen } from '../components/Screen';
import { ZText } from '../components/ZText';
import { useLang } from '../i18n/LangContext';
import { useTheme } from '../theme/ThemeProvider';

interface Props { id: string; message: string; opened: boolean; onDone: () => void }

export function DoneScreen({ id, message, opened, onDone }: Props) {
  const { colors, radius } = useTheme();
  const { t, tf } = useLang();
  return (
    <Screen testID="done" footer={<Button testID="done-button" label={t('done')} onPress={onDone} />}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 20, alignItems: 'center', paddingTop: 40 }}>
        <CheckCircle />
        <ZText variant="title" center>{t('doneTitle')}</ZText>
        <ZText center muted>{opened ? t('doneBody') : t('doneNoWhatsapp')}</ZText>
        <ZText variant="label" center>{tf('orderNumber', { id })}</ZText>
        {!opened ? (
          <View style={{ gap: 12, alignSelf: 'stretch' }}>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius, backgroundColor: colors.surface, padding: 16 }}>
              <ZText variant="small" color={colors.text} selectable>{message}</ZText>
            </View>
            <Button testID="share-message" variant="secondary" label={t('share')} onPress={() => { void Share.share({ message }).catch(() => {}); }} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

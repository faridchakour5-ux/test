import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface State { failed: boolean }

// Dernier filet de sécurité: un plantage d'écran n'éteint pas l'app, il propose de recommencer.
// Les textes sont en dur et aucune bibliothèque graphique n'est utilisée (le plantage peut venir d'elle ou du contexte de langue).
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; onError?: (e: unknown) => void }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State { return { failed: true }; }

  componentDidCatch(error: unknown) { this.props.onError?.(error); }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#FBF8F3' }} accessibilityRole="alert">
        <Text style={{ fontSize: 72 }} accessibilityElementsHidden importantForAccessibility="no">🦉</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#1B1A2E', textAlign: 'center' }}>Oups / Oops / عذرًا</Text>
        <Text style={{ fontSize: 16, color: '#5B5A70', textAlign: 'center' }}>Une erreur est survenue. Vos données sont conservées.{'\n'}Something went wrong. Your data is safe.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Réessayer" onPress={() => this.setState({ failed: false })}
          style={{ minHeight: 56, minWidth: 200, borderRadius: 16, backgroundColor: '#3B2FA3', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>Réessayer / Retry</Text>
        </Pressable>
      </View>
    );
  }
}

import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

// Trait fin et arrondi, sans remplissage: style sobre. La couleur vient du thème (jamais codée en dur).
interface IconProps { size?: number; color?: string }

export function Logo({ size = 36 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Ellipse cx="16" cy="20" rx="8" ry="9" fill={colors.primary} />
      <Path d="M16 11 C16 5 20 2 27 2 C27 8 23 11 16 11 Z" fill={colors.accent} />
      <Ellipse cx="13" cy="17" rx="2" ry="3" fill={colors.onPrimary} opacity={0.22} />
    </Svg>
  );
}

const LEAF = 'M0 0 C7 -11 24 -11 34 0 C24 11 7 11 0 0 Z';
// Rameau d'olivier au trait: décor de l'accueil. Positions fixes (pas de hasard: rendu identique à chaque ouverture).
const LEAVES = [
  { x: 30, y: 112, a: -40, s: 0.9 }, { x: 52, y: 100, a: 25, s: 0.9 }, { x: 76, y: 86, a: -45, s: 1 }, { x: 100, y: 72, a: 20, s: 1 },
  { x: 124, y: 58, a: -50, s: 1 }, { x: 148, y: 44, a: 15, s: 0.95 }, { x: 170, y: 32, a: -35, s: 0.85 },
];
const OLIVES = [{ x: 64, y: 112, r: 7 }, { x: 112, y: 86, r: 7.5 }, { x: 158, y: 56, r: 6.5 }];

export function OliveBranch({ width = 240 }: { width?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={width} height={(width * 140) / 200} viewBox="0 0 200 140" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M8 126 C58 108 112 78 192 26" stroke={colors.primary} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {LEAVES.map((l, i) => (
        <G key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.a}) scale(${l.s})`}>
          <Path d={LEAF} stroke={colors.primary} strokeWidth={1.4} fill={colors.primary} fillOpacity={0.1} strokeLinejoin="round" />
        </G>
      ))}
      {OLIVES.map((o, i) => (
        <G key={i}>
          <Path d={`M${o.x} ${o.y - 14} L${o.x} ${o.y - o.r}`} stroke={colors.primary} strokeWidth={1.2} />
          <Ellipse cx={o.x} cy={o.y} rx={o.r * 0.8} ry={o.r} fill={colors.accent} />
        </G>
      ))}
    </Svg>
  );
}

export function ChevronIcon({ size = 22, color, flip }: IconProps & { flip?: boolean }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? colors.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Path d="M15 5 L8 12 L15 19" />
    </Svg>
  );
}

export function ReceiptIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const c = color ?? colors.text;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 3 H18 V21 L15 19 L12 21 L9 19 L6 21 Z" />
      <Path d="M9 8 H15 M9 12 H15 M9 16 H12" />
    </Svg>
  );
}

export function SlidersIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const c = color ?? colors.text;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round">
      <Path d="M4 8 H20 M4 16 H20" />
      <Circle cx="9" cy="8" r="2.6" fill={colors.background} />
      <Circle cx="15" cy="16" r="2.6" fill={colors.background} />
    </Svg>
  );
}

export function CheckCircle({ size = 64 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx="32" cy="32" r="29" stroke={colors.primary} strokeWidth={2} />
      <Path d="M20 33 L29 42 L45 24" stroke={colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

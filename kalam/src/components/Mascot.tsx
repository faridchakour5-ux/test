import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

// Kal, la mascotte de Kalam: un petit hibou-fennec rond, chaleureux, qui réagit à l'apprentissage.
export type MascotMood = 'happy' | 'thinking' | 'cheer' | 'sleepy';

interface Props {
  mood?: MascotMood;
  size?: number;
  animated?: boolean;
}

const BODY = '#6C5CE7';
const BELLY = '#F4EFFF';
const ACCENT = '#FDCB6E';
const INK = '#1B1A2E';

export function Mascot({ mood = 'happy', size = 120, animated = true }: Props) {
  const [bob] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!animated) return;
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    // On respecte le réglage « réduire les animations » du téléphone.
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      const amplitude = mood === 'cheer' ? -10 : -5;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: amplitude, duration: mood === 'cheer' ? 350 : 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: mood === 'cheer' ? 350 : 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
      loop.start();
    }).catch(() => { /* réglage illisible: pas d'animation, c'est le choix le plus sûr */ });
    return () => { cancelled = true; loop?.stop(); };
  }, [animated, mood, bob]);

  const eyesClosed = mood === 'sleepy';
  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Kal"
      style={{ width: size, height: size, transform: [{ translateY: bob }] }}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {/* oreilles */}
        <Path d="M24 40 L18 8 L48 28 Z" fill={BODY} />
        <Path d="M96 40 L102 8 L72 28 Z" fill={BODY} />
        {/* corps */}
        <Ellipse cx="60" cy="68" rx="44" ry="46" fill={BODY} />
        <Ellipse cx="60" cy="82" rx="28" ry="26" fill={BELLY} />
        {/* yeux */}
        <Circle cx="43" cy="56" r="14" fill="#FFFFFF" />
        <Circle cx="77" cy="56" r="14" fill="#FFFFFF" />
        {eyesClosed ? (
          <G stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
            <Path d="M35 58 Q43 64 51 58" />
            <Path d="M69 58 Q77 64 85 58" />
          </G>
        ) : (
          <G>
            <Circle cx={mood === 'thinking' ? 47 : 44} cy={mood === 'thinking' ? 52 : 57} r="6" fill={INK} />
            <Circle cx={mood === 'thinking' ? 81 : 78} cy={mood === 'thinking' ? 52 : 57} r="6" fill={INK} />
            <Circle cx={mood === 'thinking' ? 49 : 46} cy={mood === 'thinking' ? 50 : 55} r="2" fill="#FFFFFF" />
            <Circle cx={mood === 'thinking' ? 83 : 80} cy={mood === 'thinking' ? 50 : 55} r="2" fill="#FFFFFF" />
          </G>
        )}
        {/* bec */}
        <Path d="M54 68 L66 68 L60 78 Z" fill={ACCENT} />
        {/* bouche selon l'humeur */}
        {mood === 'cheer' && <Path d="M48 86 Q60 100 72 86 Z" fill={INK} />}
        {mood === 'happy' && <Path d="M50 86 Q60 93 70 86" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />}
        {/* ailes */}
        <Ellipse cx={mood === 'cheer' ? 14 : 18} cy={mood === 'cheer' ? 60 : 82} rx="9" ry="18" fill="#5A4BD1" rotation={mood === 'cheer' ? 25 : -10} origin={mood === 'cheer' ? '14, 60' : '18, 82'} />
        <Ellipse cx={mood === 'cheer' ? 106 : 102} cy={mood === 'cheer' ? 60 : 82} rx="9" ry="18" fill="#5A4BD1" rotation={mood === 'cheer' ? -25 : 10} origin={mood === 'cheer' ? '106, 60' : '102, 82'} />
        {/* pieds */}
        <Ellipse cx="48" cy="114" rx="10" ry="5" fill={ACCENT} />
        <Ellipse cx="72" cy="114" rx="10" ry="5" fill={ACCENT} />
        {/* point d'interrogation pensif */}
        {mood === 'thinking' && <Path d="M96 18 Q96 10 104 10 Q112 10 112 18 Q112 24 104 27 L104 32" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" fill="none" />}
      </Svg>
    </Animated.View>
  );
}

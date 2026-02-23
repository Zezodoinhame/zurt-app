import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Ellipse, Rect, G } from 'react-native-svg';

interface AvatarProps {
  size?: number;
  selected?: boolean;
}

const wrap = (size: number, selected: boolean, children: React.ReactNode) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
      },
      selected && { borderWidth: 3, borderColor: '#00D4AA' },
    ]}
  >
    {children}
  </View>
);

// 1. Touro — bull market
export function BullAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#00D4AA" />
      {/* Horns */}
      <Path d="M14 20 Q8 6 16 12" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M46 20 Q52 6 44 12" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Ears */}
      <Ellipse cx="13" cy="22" rx="4" ry="3" fill="#00B894" />
      <Ellipse cx="47" cy="22" rx="4" ry="3" fill="#00B894" />
      {/* Face */}
      <Circle cx="30" cy="30" r="16" fill="#E8F8F5" />
      {/* Eyes */}
      <Circle cx="23" cy="27" r="3" fill="#065F46" />
      <Circle cx="37" cy="27" r="3" fill="#065F46" />
      <Circle cx="24" cy="26" r="1" fill="#fff" />
      <Circle cx="38" cy="26" r="1" fill="#fff" />
      {/* Snout */}
      <Ellipse cx="30" cy="37" rx="9" ry="6" fill="#D1FAE5" />
      {/* Nostrils */}
      <Circle cx="26" cy="37" r="1.8" fill="#065F46" />
      <Circle cx="34" cy="37" r="1.8" fill="#065F46" />
      {/* Smile */}
      <Path d="M25 42 Q30 46 35 42" stroke="#065F46" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Svg>,
  );
}

// 2. Urso — bear market
export function BearAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#45B7D1" />
      {/* Ears */}
      <Circle cx="15" cy="14" r="7" fill="#3498DB" />
      <Circle cx="45" cy="14" r="7" fill="#3498DB" />
      <Circle cx="15" cy="14" r="4" fill="#D6EAF8" />
      <Circle cx="45" cy="14" r="4" fill="#D6EAF8" />
      {/* Face */}
      <Circle cx="30" cy="32" r="17" fill="#D6EAF8" />
      {/* Eyes — sleepy */}
      <Path d="M20 28 Q23 25 26 28" stroke="#1B4F72" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M34 28 Q37 25 40 28" stroke="#1B4F72" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Snout */}
      <Ellipse cx="30" cy="37" rx="7" ry="5" fill="#AED6F1" />
      {/* Nose */}
      <Ellipse cx="30" cy="35" rx="3" ry="2" fill="#1B4F72" />
      {/* Mouth */}
      <Path d="M27 40 Q30 43 33 40" stroke="#1B4F72" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </Svg>,
  );
}

// 3. Águia — eagle, strategic vision
export function EagleAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#FFD93D" />
      {/* Head feathers */}
      <Path d="M22 12 L30 8 L38 12" stroke="#B8860B" strokeWidth="2" fill="#F4D03F" strokeLinecap="round" />
      {/* Face */}
      <Circle cx="30" cy="30" r="16" fill="#FEF9E7" />
      {/* Fierce eyes */}
      <Path d="M18 24 L24 22 L26 26" fill="#B8860B" />
      <Path d="M42 24 L36 22 L34 26" fill="#B8860B" />
      <Circle cx="24" cy="25" r="2.5" fill="#7D6608" />
      <Circle cx="36" cy="25" r="2.5" fill="#7D6608" />
      <Circle cx="24.5" cy="24.5" r="0.8" fill="#fff" />
      <Circle cx="36.5" cy="24.5" r="0.8" fill="#fff" />
      {/* Beak */}
      <Path d="M26 32 L30 42 L34 32 Z" fill="#E67E22" />
      <Path d="M26 32 L34 32" stroke="#D35400" strokeWidth="0.8" />
    </Svg>,
  );
}

// 4. Raposa — fox, intelligence
export function FoxAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#F97316" />
      {/* Ears */}
      <Path d="M12 24 L18 6 L24 22 Z" fill="#EA580C" />
      <Path d="M36 22 L42 6 L48 24 Z" fill="#EA580C" />
      <Path d="M15 22 L18 10 L21 21 Z" fill="#FED7AA" />
      <Path d="M39 21 L42 10 L45 22 Z" fill="#FED7AA" />
      {/* Face */}
      <Circle cx="30" cy="32" r="16" fill="#FEF3C7" />
      {/* Eyes — sly */}
      <Ellipse cx="23" cy="28" rx="3" ry="2.5" fill="#9A3412" />
      <Ellipse cx="37" cy="28" rx="3" ry="2.5" fill="#9A3412" />
      <Circle cx="24" cy="27.5" r="1" fill="#fff" />
      <Circle cx="38" cy="27.5" r="1" fill="#fff" />
      {/* Nose */}
      <Ellipse cx="30" cy="35" rx="2.5" ry="2" fill="#1C1917" />
      {/* Mouth */}
      <Path d="M30 37 L26 40" stroke="#9A3412" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M30 37 L34 40" stroke="#9A3412" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <Circle cx="18" cy="36" r="3" fill="#FDBA74" opacity={0.6} />
      <Circle cx="42" cy="36" r="3" fill="#FDBA74" opacity={0.6} />
    </Svg>,
  );
}

// 5. Leão — lion, leadership
export function LionAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#EAB308" />
      {/* Mane */}
      <Circle cx="30" cy="30" r="26" fill="#CA8A04" />
      <Circle cx="30" cy="30" r="22" fill="#F59E0B" />
      {/* Mane tufts */}
      <Circle cx="10" cy="24" r="5" fill="#CA8A04" />
      <Circle cx="50" cy="24" r="5" fill="#CA8A04" />
      <Circle cx="12" cy="36" r="5" fill="#CA8A04" />
      <Circle cx="48" cy="36" r="5" fill="#CA8A04" />
      <Circle cx="20" cy="12" r="5" fill="#CA8A04" />
      <Circle cx="40" cy="12" r="5" fill="#CA8A04" />
      {/* Face */}
      <Circle cx="30" cy="32" r="15" fill="#FEF3C7" />
      {/* Eyes — confident */}
      <Circle cx="24" cy="28" r="3" fill="#78350F" />
      <Circle cx="36" cy="28" r="3" fill="#78350F" />
      <Circle cx="24.8" cy="27" r="1.2" fill="#fff" />
      <Circle cx="36.8" cy="27" r="1.2" fill="#fff" />
      {/* Nose */}
      <Path d="M27 34 L30 37 L33 34 Z" fill="#92400E" />
      {/* Mouth */}
      <Path d="M30 37 L27 40" stroke="#92400E" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M30 37 L33 40" stroke="#92400E" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </Svg>,
  );
}

// 6. Coruja — owl, wisdom
export function OwlAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#A855F7" />
      {/* Ear tufts */}
      <Path d="M16 18 L20 6 L24 16" fill="#7C3AED" />
      <Path d="M36 16 L40 6 L44 18" fill="#7C3AED" />
      {/* Body */}
      <Ellipse cx="30" cy="34" rx="17" ry="18" fill="#EDE9FE" />
      {/* Big eyes */}
      <Circle cx="22" cy="28" r="8" fill="#fff" />
      <Circle cx="38" cy="28" r="8" fill="#fff" />
      <Circle cx="22" cy="28" r="5" fill="#581C87" />
      <Circle cx="38" cy="28" r="5" fill="#581C87" />
      <Circle cx="23.5" cy="26.5" r="2" fill="#fff" />
      <Circle cx="39.5" cy="26.5" r="2" fill="#fff" />
      {/* Beak */}
      <Path d="M28 34 L30 38 L32 34 Z" fill="#F97316" />
      {/* Belly pattern */}
      <Path d="M24 42 Q30 48 36 42" stroke="#C4B5FD" strokeWidth="1.5" fill="none" />
      <Path d="M26 46 Q30 50 34 46" stroke="#C4B5FD" strokeWidth="1.2" fill="none" />
    </Svg>,
  );
}

// 7. Golfinho — dolphin, agility
export function DolphinAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#06B6D4" />
      {/* Body curve */}
      <Path d="M14 38 Q16 18 30 20 Q44 22 46 38" fill="#CFFAFE" />
      {/* Dorsal fin */}
      <Path d="M28 18 Q32 8 34 18" fill="#0891B2" />
      {/* Head */}
      <Circle cx="30" cy="30" r="14" fill="#CFFAFE" />
      {/* Snout */}
      <Ellipse cx="30" cy="38" rx="8" ry="5" fill="#E0F2FE" />
      {/* Eyes — happy */}
      <Circle cx="24" cy="27" r="3" fill="#164E63" />
      <Circle cx="36" cy="27" r="3" fill="#164E63" />
      <Circle cx="24.8" cy="26" r="1.2" fill="#fff" />
      <Circle cx="36.8" cy="26" r="1.2" fill="#fff" />
      {/* Smile — big */}
      <Path d="M22 36 Q30 44 38 36" stroke="#164E63" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Nose */}
      <Ellipse cx="30" cy="33" rx="2" ry="1.5" fill="#0891B2" />
    </Svg>,
  );
}

// 8. Lobo — wolf, pack strategy
export function WolfAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#6B7280" />
      {/* Ears */}
      <Path d="M12 24 L16 4 L24 20 Z" fill="#4B5563" />
      <Path d="M36 20 L44 4 L48 24 Z" fill="#4B5563" />
      <Path d="M15 22 L16 8 L21 19 Z" fill="#9CA3AF" />
      <Path d="M39 19 L44 8 L45 22 Z" fill="#9CA3AF" />
      {/* Face */}
      <Circle cx="30" cy="32" r="16" fill="#E5E7EB" />
      {/* Eyes — intense */}
      <Ellipse cx="23" cy="27" rx="3.5" ry="2.5" fill="#F59E0B" />
      <Ellipse cx="37" cy="27" rx="3.5" ry="2.5" fill="#F59E0B" />
      <Ellipse cx="23" cy="27" rx="1.5" ry="2.5" fill="#1F2937" />
      <Ellipse cx="37" cy="27" rx="1.5" ry="2.5" fill="#1F2937" />
      {/* Nose */}
      <Ellipse cx="30" cy="34" rx="3" ry="2" fill="#1F2937" />
      {/* Muzzle */}
      <Path d="M30 36 L26 40" stroke="#4B5563" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M30 36 L34 40" stroke="#4B5563" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Face marking */}
      <Path d="M30 18 L30 34" stroke="#D1D5DB" strokeWidth="3" strokeLinecap="round" opacity={0.5} />
    </Svg>,
  );
}

// 9. Fênix — phoenix, resilience
export function PhoenixAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#EF4444" />
      {/* Flame crest */}
      <Path d="M22 16 Q26 4 30 12 Q34 4 38 16" fill="#F97316" />
      <Path d="M25 14 Q28 6 30 12 Q32 6 35 14" fill="#FBBF24" />
      {/* Body */}
      <Circle cx="30" cy="32" r="16" fill="#FEF2F2" />
      {/* Eyes — determined */}
      <Circle cx="23" cy="28" r="3" fill="#991B1B" />
      <Circle cx="37" cy="28" r="3" fill="#991B1B" />
      <Circle cx="24" cy="27" r="1" fill="#fff" />
      <Circle cx="38" cy="27" r="1" fill="#fff" />
      {/* Beak */}
      <Path d="M27 34 L30 39 L33 34 Z" fill="#F97316" />
      {/* Wings hint */}
      <Path d="M10 36 Q14 30 18 34" stroke="#FCA5A5" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M50 36 Q46 30 42 34" stroke="#FCA5A5" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Flame tail feathers */}
      <Path d="M24 48 Q30 56 36 48" stroke="#F97316" strokeWidth="2" fill="none" strokeLinecap="round" />
    </Svg>,
  );
}

// 10. Panda — balance
export function PandaAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#1F2937" />
      {/* Ears */}
      <Circle cx="14" cy="14" r="7" fill="#111827" />
      <Circle cx="46" cy="14" r="7" fill="#111827" />
      {/* Face */}
      <Circle cx="30" cy="32" r="18" fill="#F9FAFB" />
      {/* Eye patches */}
      <Ellipse cx="22" cy="27" rx="6" ry="5" fill="#1F2937" transform="rotate(-10 22 27)" />
      <Ellipse cx="38" cy="27" rx="6" ry="5" fill="#1F2937" transform="rotate(10 38 27)" />
      {/* Eyes */}
      <Circle cx="22" cy="27" r="3" fill="#fff" />
      <Circle cx="38" cy="27" r="3" fill="#fff" />
      <Circle cx="22.5" cy="26.5" r="1.5" fill="#111827" />
      <Circle cx="38.5" cy="26.5" r="1.5" fill="#111827" />
      {/* Nose */}
      <Ellipse cx="30" cy="35" rx="3" ry="2" fill="#111827" />
      {/* Mouth */}
      <Path d="M30 37 L27 40" stroke="#4B5563" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M30 37 L33 40" stroke="#4B5563" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <Circle cx="18" cy="36" r="3" fill="#FECACA" opacity={0.4} />
      <Circle cx="42" cy="36" r="3" fill="#FECACA" opacity={0.4} />
    </Svg>,
  );
}

// 11. Falcão — hawk, precision
export function HawkAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#1E40AF" />
      {/* Head feathers crest */}
      <Path d="M26 14 L30 6 L34 14" fill="#1E3A8A" />
      <Path d="M22 16 L26 10 L30 16" fill="#1E3A8A" />
      <Path d="M30 16 L34 10 L38 16" fill="#1E3A8A" />
      {/* Face */}
      <Circle cx="30" cy="32" r="16" fill="#DBEAFE" />
      {/* Sharp eyes */}
      <Path d="M18 26 L24 24 L26 28" fill="#1E3A8A" opacity={0.3} />
      <Path d="M42 26 L36 24 L34 28" fill="#1E3A8A" opacity={0.3} />
      <Circle cx="24" cy="27" r="2.5" fill="#1E3A8A" />
      <Circle cx="36" cy="27" r="2.5" fill="#1E3A8A" />
      <Circle cx="24.5" cy="26.5" r="0.8" fill="#fff" />
      <Circle cx="36.5" cy="26.5" r="0.8" fill="#fff" />
      {/* Beak — sharp */}
      <Path d="M27 33 L30 40 L33 33 Z" fill="#F59E0B" />
      <Path d="M28 34 L30 37 L32 34" stroke="#D97706" strokeWidth="0.6" fill="none" />
      {/* Markings */}
      <Path d="M24 42 L30 46 L36 42" stroke="#93C5FD" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Svg>,
  );
}

// 12. Dragão — dragon, power
export function DragonAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#059669" />
      {/* Horns */}
      <Path d="M16 20 Q12 6 18 14" stroke="#047857" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M44 20 Q48 6 42 14" stroke="#047857" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Spikes */}
      <Path d="M26 12 L28 6 L30 12 L32 6 L34 12" fill="#047857" />
      {/* Face */}
      <Circle cx="30" cy="32" r="16" fill="#D1FAE5" />
      {/* Eyes — fierce with slits */}
      <Ellipse cx="22" cy="27" rx="4" ry="3" fill="#FBBF24" />
      <Ellipse cx="38" cy="27" rx="4" ry="3" fill="#FBBF24" />
      <Ellipse cx="22" cy="27" rx="1" ry="3" fill="#064E3B" />
      <Ellipse cx="38" cy="27" rx="1" ry="3" fill="#064E3B" />
      {/* Nostrils with smoke */}
      <Circle cx="26" cy="36" r="1.5" fill="#065F46" />
      <Circle cx="34" cy="36" r="1.5" fill="#065F46" />
      {/* Smoke puffs */}
      <Circle cx="24" cy="33" r="1.5" fill="#A7F3D0" opacity={0.5} />
      <Circle cx="36" cy="33" r="1.5" fill="#A7F3D0" opacity={0.5} />
      {/* Mouth — slight grin */}
      <Path d="M23 41 Q30 46 37 41" stroke="#065F46" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Scales */}
      <Circle cx="30" cy="44" r="2" fill="#A7F3D0" opacity={0.4} />
    </Svg>,
  );
}

// 13. Robô ZURT — robot, technology
export function RobotAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#00D4AA" />
      {/* Antenna */}
      <Path d="M30 8 L30 16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <Circle cx="30" cy="7" r="3" fill="#34D399" />
      <Circle cx="30" cy="7" r="1.5" fill="#fff" />
      {/* Head */}
      <Rect x="14" y="16" width="32" height="28" rx="8" fill="#E0FFF6" />
      {/* Eyes — LED style */}
      <Rect x="19" y="24" width="8" height="6" rx="2" fill="#00D4AA" />
      <Rect x="33" y="24" width="8" height="6" rx="2" fill="#00D4AA" />
      <Circle cx="23" cy="27" r="1.5" fill="#fff" />
      <Circle cx="37" cy="27" r="1.5" fill="#fff" />
      {/* Mouth — digital */}
      <Rect x="22" y="36" width="16" height="3" rx="1.5" fill="#00D4AA" />
      <Rect x="24" y="36.5" width="2" height="2" rx="0.5" fill="#fff" />
      <Rect x="28" y="36.5" width="2" height="2" rx="0.5" fill="#fff" />
      <Rect x="32" y="36.5" width="2" height="2" rx="0.5" fill="#fff" />
      <Rect x="36" y="36.5" width="2" height="2" rx="0.5" fill="#fff" />
      {/* Ear bolts */}
      <Circle cx="12" cy="30" r="3" fill="#34D399" />
      <Circle cx="48" cy="30" r="3" fill="#34D399" />
    </Svg>,
  );
}

// 14. Astronauta — astronaut, explorer
export function AstronautAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#3B82F6" />
      {/* Helmet */}
      <Circle cx="30" cy="28" r="20" fill="#E5E7EB" />
      <Circle cx="30" cy="28" r="17" fill="#1E3A5F" />
      {/* Visor */}
      <Circle cx="30" cy="28" r="14" fill="#60A5FA" opacity={0.5} />
      {/* Face behind visor */}
      <Circle cx="30" cy="30" r="11" fill="#FDE68A" />
      {/* Eyes */}
      <Circle cx="25" cy="28" r="2.5" fill="#1F2937" />
      <Circle cx="35" cy="28" r="2.5" fill="#1F2937" />
      <Circle cx="25.8" cy="27" r="1" fill="#fff" />
      <Circle cx="35.8" cy="27" r="1" fill="#fff" />
      {/* Smile */}
      <Path d="M25 34 Q30 38 35 34" stroke="#92400E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Helmet details */}
      <Path d="M10 28 L14 28" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
      <Path d="M46 28 L50 28" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
      {/* Antenna */}
      <Circle cx="30" cy="9" r="2" fill="#EF4444" />
    </Svg>,
  );
}

// 15. Ninja — stealth
export function NinjaAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#374151" />
      {/* Hood */}
      <Circle cx="30" cy="28" r="20" fill="#1F2937" />
      {/* Mask opening — eye slit */}
      <Rect x="12" y="23" width="36" height="10" rx="5" fill="#4B5563" />
      {/* Eyes — focused */}
      <Ellipse cx="22" cy="28" rx="4" ry="2.5" fill="#fff" />
      <Ellipse cx="38" cy="28" rx="4" ry="2.5" fill="#fff" />
      <Circle cx="22" cy="28" r="2" fill="#111827" />
      <Circle cx="38" cy="28" r="2" fill="#111827" />
      <Circle cx="22.5" cy="27.5" r="0.7" fill="#fff" />
      <Circle cx="38.5" cy="27.5" r="0.7" fill="#fff" />
      {/* Headband */}
      <Rect x="10" y="18" width="40" height="4" rx="2" fill="#EF4444" />
      {/* Headband tail */}
      <Path d="M48 20 Q54 18 52 24" stroke="#EF4444" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M48 20 Q56 22 54 28" stroke="#DC2626" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Lower mask */}
      <Path d="M18 34 Q30 42 42 34" fill="#1F2937" />
    </Svg>,
  );
}

// 16. Diamante — diamond, value
export function DiamondAvatar({ size = 60, selected = false }: AvatarProps) {
  return wrap(
    size,
    selected,
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="30" fill="#67E8F9" />
      {/* Diamond body */}
      <Path d="M18 24 L30 10 L42 24 L30 50 Z" fill="#A5F3FC" />
      <Path d="M18 24 L30 24 L30 50 Z" fill="#67E8F9" />
      <Path d="M30 24 L42 24 L30 50 Z" fill="#22D3EE" />
      <Path d="M18 24 L30 10 L30 24 Z" fill="#CFFAFE" />
      <Path d="M30 10 L42 24 L30 24 Z" fill="#A5F3FC" />
      {/* Face on diamond */}
      {/* Eyes — sparkly */}
      <Circle cx="24" cy="28" r="2.5" fill="#0E7490" />
      <Circle cx="36" cy="28" r="2.5" fill="#0E7490" />
      <Path d="M23 27 L25 27" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
      <Path d="M35 27 L37 27" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
      <Path d="M24 27 L24 29" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
      <Path d="M36 27 L36 29" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
      {/* Smile */}
      <Path d="M26 34 Q30 38 34 34" stroke="#0E7490" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Sparkles */}
      <Path d="M10 14 L12 12 L14 14 L12 16 Z" fill="#fff" opacity={0.8} />
      <Path d="M46 18 L48 16 L50 18 L48 20 Z" fill="#fff" opacity={0.8} />
      <Path d="M8 36 L10 34 L12 36 L10 38 Z" fill="#fff" opacity={0.6} />
    </Svg>,
  );
}

// Registry map for lookup by id
export const AVATAR_ICON_MAP: Record<string, React.FC<AvatarProps>> = {
  bull: BullAvatar,
  bear: BearAvatar,
  eagle: EagleAvatar,
  fox: FoxAvatar,
  lion: LionAvatar,
  owl: OwlAvatar,
  dolphin: DolphinAvatar,
  wolf: WolfAvatar,
  phoenix: PhoenixAvatar,
  panda: PandaAvatar,
  hawk: HawkAvatar,
  dragon: DragonAvatar,
  robot: RobotAvatar,
  astronaut: AstronautAvatar,
  ninja: NinjaAvatar,
  diamond: DiamondAvatar,
};

export type AvatarIconId = keyof typeof AVATAR_ICON_MAP;

export const AVATAR_CHARACTER_LIST = [
  { id: 'bull' as const, labelKey: 'avatar.bull', color: '#00D4AA' },
  { id: 'bear' as const, labelKey: 'avatar.bear', color: '#45B7D1' },
  { id: 'eagle' as const, labelKey: 'avatar.eagle', color: '#FFD93D' },
  { id: 'fox' as const, labelKey: 'avatar.fox', color: '#F97316' },
  { id: 'lion' as const, labelKey: 'avatar.lion', color: '#EAB308' },
  { id: 'owl' as const, labelKey: 'avatar.owl', color: '#A855F7' },
  { id: 'dolphin' as const, labelKey: 'avatar.dolphin', color: '#06B6D4' },
  { id: 'wolf' as const, labelKey: 'avatar.wolf', color: '#6B7280' },
  { id: 'phoenix' as const, labelKey: 'avatar.phoenix', color: '#EF4444' },
  { id: 'panda' as const, labelKey: 'avatar.panda', color: '#1F2937' },
  { id: 'hawk' as const, labelKey: 'avatar.hawk', color: '#1E40AF' },
  { id: 'dragon' as const, labelKey: 'avatar.dragon', color: '#059669' },
  { id: 'robot' as const, labelKey: 'avatar.robot', color: '#00D4AA' },
  { id: 'astronaut' as const, labelKey: 'avatar.astronaut', color: '#3B82F6' },
  { id: 'ninja' as const, labelKey: 'avatar.ninja', color: '#374151' },
  { id: 'diamond' as const, labelKey: 'avatar.diamond', color: '#67E8F9' },
] as const;

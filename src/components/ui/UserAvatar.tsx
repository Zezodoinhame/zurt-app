import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AVATAR_ICON_MAP, AVATAR_CHARACTER_LIST } from './AvatarIcons';

const AVATAR_CUSTOM_KEY = 'zurt:avatar:custom';
const AVATAR_PRESET_KEY = 'zurt:avatar';

// Re-export for convenience
export { AVATAR_CHARACTER_LIST } from './AvatarIcons';
export type { AvatarIconId } from './AvatarIcons';

export type AvatarPresetId = (typeof AVATAR_CHARACTER_LIST)[number]['id'];

interface UserAvatarProps {
  size?: number;
  initials: string;
  customUri?: string | null;
  presetId?: AvatarPresetId | null;
  accentColor?: string;
}

export function UserAvatar({
  size = 56,
  initials,
  customUri,
  presetId,
  accentColor = '#1A73E8',
}: UserAvatarProps) {
  // Custom photo takes priority
  if (customUri) {
    return (
      <Image
        source={{ uri: customUri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    );
  }

  // SVG avatar preset
  if (presetId && AVATAR_ICON_MAP[presetId]) {
    const AvatarComponent = AVATAR_ICON_MAP[presetId];
    return <AvatarComponent size={size} />;
  }

  // Fallback: initials with accent color
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: accentColor,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>
        {initials}
      </Text>
    </View>
  );
}

// Hook to load saved avatar state
export function useAvatarState() {
  const [customUri, setCustomUri] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<AvatarPresetId | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [custom, preset] = await Promise.all([
          AsyncStorage.getItem(AVATAR_CUSTOM_KEY),
          AsyncStorage.getItem(AVATAR_PRESET_KEY),
        ]);
        if (custom) setCustomUri(custom);
        if (preset) setPresetId(preset as AvatarPresetId);
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const saveCustomUri = async (uri: string | null) => {
    setCustomUri(uri);
    if (uri) {
      await AsyncStorage.setItem(AVATAR_CUSTOM_KEY, uri).catch(() => {});
    } else {
      await AsyncStorage.removeItem(AVATAR_CUSTOM_KEY).catch(() => {});
    }
  };

  const savePresetId = async (id: AvatarPresetId | null) => {
    setPresetId(id);
    if (id) {
      await AsyncStorage.setItem(AVATAR_PRESET_KEY, id).catch(() => {});
    } else {
      await AsyncStorage.removeItem(AVATAR_PRESET_KEY).catch(() => {});
    }
  };

  return { customUri, presetId, loaded, saveCustomUri, savePresetId };
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  image: {
    resizeMode: 'cover',
  },
});

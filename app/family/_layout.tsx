import { Stack } from 'expo-router';
import { useSettingsStore } from '../../src/stores/settingsStore';

export default function FamilyLayout() {
  const colors = useSettingsStore((s) => s.colors);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}

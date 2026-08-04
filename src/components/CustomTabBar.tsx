import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeColors } from '../contexts/ThemeContext';

// Reconstructed from decompiled Hermes bytecode (module #527 in the original bundle).
const TAB_CONFIG: Record<string, { iconActive: string; iconInactive: string; label: string }> = {
  Status: { iconActive: 'chatbubble-ellipses', iconInactive: 'chatbubble-ellipses-outline', label: 'Status' },
  BStatus: { iconActive: 'business', iconInactive: 'business-outline', label: 'B Status' },
  Saved: { iconActive: 'cloud-download', iconInactive: 'cloud-download-outline', label: 'Saved' },
  Settings: { iconActive: 'settings', iconInactive: 'settings-outline', label: 'Settings' },
};

type TabRoute = { key: string; name: string };

type CustomTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  descriptors?: unknown;
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  insetBottom?: number;
};

export default function CustomTabBar({ state, descriptors, navigation, insetBottom = 0 }: CustomTabBarProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingBottom: 8 + insetBottom }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const config = TAB_CONFIG[route.name] ?? TAB_CONFIG.Status;
        const iconName = isFocused ? config.iconActive : config.iconInactive;
        const color = isFocused ? colors.tabActive : colors.tabInactive;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity key={route.key} style={styles.tab} onPress={onPress} activeOpacity={0.7}>
            <Ionicons name={iconName} size={22} color={color} />
            <Text style={[styles.label, { color }, isFocused && styles.labelActive]}>{config.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingTop: 8,
      backgroundColor: colors.tabBg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      elevation: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    label: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    labelActive: {
      fontWeight: '800',
    },
  });

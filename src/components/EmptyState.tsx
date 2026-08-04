import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

// Reconstructed from decompiled Hermes bytecode (used inside module #450, HomeScreen).
// Shared empty/error state used for "no statuses found" and "couldn't load" cases.
export default function EmptyState({ icon, title, message, onRetry, actionLabel, actionIcon }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={colors.textSecondary} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <TouchableOpacity style={styles.actionBtn} onPress={onRetry} activeOpacity={0.7}>
          <Ionicons name={actionIcon} size={16} color={colors.white} />
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginTop: 8,
      textAlign: 'center',
    },
    message: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
    },
    actionText: {
      color: colors.white,
      fontWeight: '600',
      fontSize: 13,
    },
  });

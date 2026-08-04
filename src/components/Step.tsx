import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

// Reconstructed from decompiled Hermes bytecode (module #525, Step component).
// A numbered step in a vertical "how to use" stepper: badge with number + connecting
// line on the left, icon + title + description on the right.
export default function Step({ icon, title, text, num, isLast }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.badge}>
          <Text style={styles.badgeNum}>{num}</Text>
        </View>
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Ionicons name={icon} size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    row: { flexDirection: 'row' },
    left: { alignItems: 'center', width: 28 },
    badge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeNum: { color: colors.white, fontSize: 11, fontWeight: '700' },
    line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4 },
    body: { flex: 1, paddingBottom: 16, paddingLeft: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    title: { fontSize: 13, fontWeight: '700', color: colors.text },
    text: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  });

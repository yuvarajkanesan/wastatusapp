import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { elevation } from '../constants/theme';

const TIPS = [
  {
    icon: 'eye-outline',
    title: 'View it in WA first',
    text: "WA only keeps a status after you've opened and viewed it at least once — do that first, then come back here to see it.",
  },
  {
    icon: 'download-outline',
    title: 'Save or share instantly',
    text: 'Tap the download icon to save a status to your gallery, or the share icon to send it straight back to WA or any app.',
  },
  {
    icon: 'lock-closed-outline',
    title: '100% private',
    text: "Everything stays on your device. No internet permission, no uploads, no account — nothing ever leaves your phone.",
  },
];

// Shown once, on first launch after install, to explain what the app does before the
// user has to figure it out on their own. Gated by AsyncStorage key 'has_seen_welcome_tips'
// in App.tsx — this component itself has no opinion on when it should appear.
export default function WelcomeTips({ visible, onDismiss }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.heading}>Welcome to WaStatus Saver</Text>
          <Text style={styles.subheading}>Here's how it works:</Text>

          {TIPS.map((tip, i) => (
            <View key={tip.title} style={[styles.tipRow, i === TIPS.length - 1 && styles.tipRowLast]}>
              <View style={styles.iconWrap}>
                <Ionicons name={tip.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.tipBody}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.gotItBtn} onPress={onDismiss}>
            <Text style={styles.gotItText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingTop: 22,
      paddingHorizontal: 20,
      paddingBottom: 18,
      ...elevation(colors.shadow, 'lg'),
    },
    heading: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
    subheading: {
      fontSize: 12.5,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 18,
    },
    tipRow: { flexDirection: 'row', marginBottom: 16 },
    tipRowLast: { marginBottom: 20 },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    tipBody: { flex: 1 },
    tipTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text, marginBottom: 2 },
    tipText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
    gotItBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gotItText: { fontSize: 14, fontWeight: '700', color: colors.white },
  });

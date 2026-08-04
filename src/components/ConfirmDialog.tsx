import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { elevation } from '../constants/theme';

export default function ConfirmDialog({
  visible,
  icon = 'trash-outline',
  title,
  message,
  cancelLabel = 'Cancel',
  confirmLabel = 'Delete',
  destructive = true,
  onCancel,
  onConfirm,
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.iconWrap, destructive && styles.iconWrapDestructive]}>
            <Ionicons name={icon} size={22} color={destructive ? '#EF5350' : colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.confirmBtnDestructive]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    card: {
      width: '100%',
      maxWidth: 280,
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingTop: 18,
      paddingHorizontal: 18,
      paddingBottom: 14,
      alignItems: 'center',
      ...elevation(colors.shadow, 'lg'),
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    iconWrapDestructive: { backgroundColor: 'rgba(239,83,80,0.12)' },
    title: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'center' },
    message: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      lineHeight: 17,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
      width: '100%',
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelText: { fontSize: 12.5, fontWeight: '600', color: colors.text },
    confirmBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    confirmBtnDestructive: { backgroundColor: '#EF5350' },
    confirmText: { fontSize: 12.5, fontWeight: '700', color: colors.white },
  });

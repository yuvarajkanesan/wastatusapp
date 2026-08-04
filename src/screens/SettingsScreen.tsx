import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemeMode } from '../contexts/ThemeContext';
import { elevation } from '../constants/theme';
import Step from '../components/Step';
import LegalModal from '../components/LegalModal';
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '../constants/legal';

// Rebuilt to match the real installed app (verified against screenshots of the
// production build): section order (Appearance → How to Use → About → Support →
// Legal), theme cards, info/warning banners, the full 7-step guide, and the
// copyright footer all corrected against the real app's UI. Step copy/order and
// app metadata came from the decompiled bytecode (module #525).

const PACKAGE_NAME = 'com.wastatusapp';
const SUPPORT_EMAIL = 'yuvaraj8747@gmail.com';

function getSteps(isBusiness) {
  const app = isBusiness ? 'WhatsApp Business' : 'WhatsApp';
  const pkg = isBusiness ? 'com.whatsapp.w4b' : 'com.whatsapp';
  const folder = isBusiness ? 'WhatsApp Business' : 'WhatsApp';
  const tab = isBusiness ? 'B Status' : 'Status';
  return [
    {
      icon: isBusiness ? 'business-outline' : 'chatbubble-ellipses-outline',
      title: isBusiness ? 'View WhatsApp Business Statuses' : 'View WhatsApp Statuses',
      text: `Open ${app} and view any statuses. They must be viewed at least once before this app can show them.`,
    },
    {
      icon: 'apps-outline',
      title: isBusiness ? 'Open B Status Tab' : 'Open Status Tab',
      text: `Open WaStatus Saver and tap the "${tab}" tab at the bottom.`,
    },
    {
      icon: 'folder-outline',
      title: 'Select the Statuses Folder',
      text: `A folder picker will appear. Navigate to:\n\nInternal Storage → Android → media → ${pkg} → ${folder} → Media → .Statuses`,
    },
    {
      icon: 'checkmark-circle-outline',
      title: 'Grant Permission',
      text: 'Tap "Use this folder" at the bottom, then tap "Allow" in the confirmation dialog.',
    },
    {
      icon: 'download',
      title: 'Save a Status',
      text: 'Tap the ↓ button on any status to save it. Long-press any item to enter multi-select mode for bulk saving.',
    },
    {
      icon: 'cloud-download-outline',
      title: 'Find Saved Files',
      text: 'Saved statuses appear in the "Saved" tab and your phone\'s gallery under the "Status Saver" album.',
    },
    {
      icon: 'share-social-outline',
      title: 'Share Statuses',
      text: `Tap the share icon to share to any app, or tap the WhatsApp icon to send directly back to ${app}.`,
    },
  ];
}

const THEME_OPTIONS: { key: ThemeMode; icon: string }[] = [
  { key: 'System', icon: 'contrast-outline' },
  { key: 'Light', icon: 'sunny-outline' },
  { key: 'Dark', icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const [howToUseTab, setHowToUseTab] = useState('whatsapp');
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | null

  const openPlayStore = useCallback(() => {
    Linking.openURL(`https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`);
  }, []);

  const emailSupport = useCallback(() => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  }, []);

  const version = '1.0.5';
  const steps = getSteps(howToUseTab === 'business');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={colors.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: 20 + insets.top }]}
      >
        <Text style={styles.headerTitle}>Settings</Text>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>Theme</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.themeBtn, themeMode === option.key && styles.themeBtnActive]}
                onPress={() => setThemeMode(option.key)}
              >
                <Ionicons name={option.icon} size={20} color={themeMode === option.key ? colors.white : colors.text} />
                <Text style={[styles.themeBtnText, themeMode === option.key && styles.themeBtnTextActive]}>
                  {option.key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>HOW TO USE</Text>
        <View style={styles.card}>
          <View style={styles.helpToggleRow}>
            <TouchableOpacity
              style={[styles.helpToggleBtn, howToUseTab === 'whatsapp' && styles.helpToggleBtnActive]}
              onPress={() => setHowToUseTab('whatsapp')}
            >
              <Ionicons name="logo-whatsapp" size={14} color={howToUseTab === 'whatsapp' ? colors.white : colors.primary} />
              <Text style={[styles.helpToggleText, howToUseTab === 'whatsapp' && styles.helpToggleTextActive]}>
                {' '}WhatsApp
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.helpToggleBtn, howToUseTab === 'business' && styles.helpToggleBtnActive]}
              onPress={() => setHowToUseTab('business')}
            >
              <Ionicons name="business-outline" size={14} color={howToUseTab === 'business' ? colors.white : colors.primary} />
              <Text style={[styles.helpToggleText, howToUseTab === 'business' && styles.helpToggleTextActive]}>
                {' '}WhatsApp Business
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBanner}>
            <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
            <Text style={styles.infoBannerText}>One-time folder selection required on first use</Text>
          </View>

          {steps.map((step, i) => (
            <Step key={step.title} num={i + 1} icon={step.icon} title={step.title} text={step.text} isLast={i === steps.length - 1} />
          ))}

          <View style={styles.warningBanner}>
            <Text style={styles.warningBannerIcon}>💡</Text>
            <Text style={styles.warningBannerText}>
              You need to open WhatsApp or WhatsApp Business and{' '}
              <Text style={styles.warningBannerBold}>view the statuses at least once</Text> before they appear here.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.rowLabel}>App Name</Text>
            <Text style={styles.rowValue}>WaStatus Saver</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>{version}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.rowLabel}>Developer</Text>
            <Text style={styles.rowValue}>Lavati Softwares</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.linkRow} onPress={emailSupport}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text style={styles.linkTextEmail}>{SUPPORT_EMAIL}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>LEGAL</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.linkRow} onPress={() => setLegalModal('terms')}>
            <Ionicons name="document-text-outline" size={18} color={colors.text} />
            <Text style={styles.linkText}>Terms and Conditions</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.linkRow} onPress={() => setLegalModal('privacy')}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.text} />
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.linkRow} onPress={openPlayStore}>
            <Ionicons name="star-outline" size={18} color={colors.text} />
            <Text style={styles.linkText}>Rate on Google Play</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© 2026 Lavati Softwares. All rights reserved.</Text>
      </View>

      <LegalModal
        visible={legalModal === 'terms'}
        title="Terms and Conditions"
        content={TERMS_AND_CONDITIONS}
        onClose={() => setLegalModal(null)}
      />
      <LegalModal
        visible={legalModal === 'privacy'}
        title="Privacy Policy"
        content={PRIVACY_POLICY}
        onClose={() => setLegalModal(null)}
      />
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, ...elevation(colors.shadow, 'md') },
  headerTitle: { fontSize: 23, fontWeight: '800', letterSpacing: 0.2, color: colors.white },
  body: { padding: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.gold,
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, ...elevation(colors.shadow, 'sm') },
  rowLabel: { fontSize: 13, color: colors.text, fontWeight: '600' },
  rowValue: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  divider: { height: 1, backgroundColor: colors.border },
  themeRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  themeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    gap: 6,
  },
  themeBtnActive: { backgroundColor: colors.primary, ...elevation(colors.shadow, 'sm') },
  themeBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },
  themeBtnTextActive: { color: colors.white },
  helpToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  helpToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    padding: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpToggleBtnActive: { backgroundColor: colors.primary, ...elevation(colors.shadow, 'sm') },
  helpToggleText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  helpToggleTextActive: { color: colors.white },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardAlt,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  infoBannerText: { color: colors.primary, fontSize: 12, fontWeight: '600', flex: 1 },
  warningBanner: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,152,0,0.14)',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  warningBannerIcon: { fontSize: 15 },
  warningBannerText: { flex: 1, color: '#FF9800', fontSize: 12, lineHeight: 18 },
  warningBannerBold: { fontWeight: '700' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  linkText: { fontSize: 13, color: colors.text, fontWeight: '600', flex: 1 },
  linkTextEmail: { fontSize: 13, color: colors.primary, fontWeight: '600', flex: 1 },
  footer: { textAlign: 'center', color: colors.textSecondary, fontSize: 11, marginTop: 28 },
});

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StatusBar, Alert, BackHandler, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import CustomTabBar from './src/components/CustomTabBar';
import StatusScreen from './src/screens/StatusScreen';
import BStatusScreen from './src/screens/BStatusScreen';
import SavedScreen from './src/screens/SavedScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { isWhatsAppInstalled, isWhatsAppBusinessInstalled } from './src/native/statusFolder';
import { isDeviceRooted, checkIntegrity, authenticateBiometric } from './src/native/security';

// Reconstructed from decompiled Hermes bytecode (module #439 in the original bundle,
// the true root component — module #528 was just app.json's {name, displayName}
// re-exported for AppRegistry.registerComponent). Functional rebuild — see HomeScreen.js
// for the fidelity note.
//
// Notable recovered detail: this app does NOT use @react-navigation's tab navigator at
// runtime. It hand-rolls its own { index, routes } state and a minimal { emit, navigate }
// object, passed into CustomTabBar so that component's props stay shape-compatible with
// react-navigation's tabBar render prop. "Status" and "BStatus" are each dynamic — a tab
// only appears if that app (WhatsApp / WhatsApp Business) is actually installed on the
// device. Saved and Settings always appear since they don't depend on either app.

function AppContent() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('Status');
  const [hasWA, setHasWA] = useState(false);
  const [hasWAB, setHasWAB] = useState(false);
  const [ready, setReady] = useState(false);
  const [savedFocusedAt, setSavedFocusedAt] = useState(0);

  const routes = useMemo(() => {
    const list = [];
    if (hasWA) list.push({ key: 'Status', name: 'Status' });
    if (hasWAB) list.push({ key: 'BStatus', name: 'BStatus' });
    list.push({ key: 'Saved', name: 'Saved' }, { key: 'Settings', name: 'Settings' });
    return list;
  }, [hasWA, hasWAB]);

  const tabState = useMemo(
    () => ({ index: routes.findIndex((r) => r.key === activeTab), routes }),
    [routes, activeTab]
  );

  const navigate = useCallback(
    (key) => {
      setActiveTab(key);
      if (key === 'Saved') setSavedFocusedAt(Date.now());
    },
    []
  );

  const navigation = useMemo(() => ({ emit: () => ({ defaultPrevented: false }), navigate }), [navigate]);

  const runBiometricGate = useCallback(async () => {
    const unlocked = await authenticateBiometric();
    if (unlocked) return true;
    return new Promise((resolve) => {
      Alert.alert(
        '🔒 Locked',
        'Verify it\'s you to open WaStatus Saver.',
        [
          { text: 'Exit', style: 'cancel', onPress: () => BackHandler.exitApp() },
          { text: 'Try Again', onPress: () => resolve(runBiometricGate()) },
        ],
        { cancelable: false }
      );
    });
  }, []);

  useEffect(() => {
    (async () => {
      const [rooted, integrityOk] = await Promise.all([isDeviceRooted(), checkIntegrity()]);

      if (rooted) {
        Alert.alert(
          '⚠️ Security Warning',
          'This app cannot run on rooted devices.',
          [{ text: 'Exit', onPress: () => BackHandler.exitApp() }],
          { cancelable: false }
        );
        return;
      }

      if (!integrityOk) {
        Alert.alert(
          '⚠️ Security Error',
          'App integrity check failed. This may be a modified version.',
          [{ text: 'Exit', onPress: () => BackHandler.exitApp() }],
          { cancelable: false }
        );
        return;
      }

      await runBiometricGate();

      const [wa, wab] = await Promise.all([isWhatsAppInstalled(), isWhatsAppBusinessInstalled()]);
      setHasWA(wa);
      setHasWAB(wab);
      if (wa) {
        setActiveTab('Status');
      } else if (wab) {
        setActiveTab('BStatus');
      } else {
        setActiveTab('Saved');
        Alert.alert(
          'WhatsApp Not Found',
          "WaStatus Saver couldn't find WhatsApp or WhatsApp Business installed on this device. Install one of them to view and save statuses — media you've already saved is still available in the Saved tab."
        );
      }
      setReady(true);
    })();
  }, [runBiometricGate]);

  if (!ready) return null;

  return (
    <>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.screen}>
          {activeTab === 'Status' ? <StatusScreen hasWA={hasWA} hasWAB={hasWAB} /> : null}
          {activeTab === 'BStatus' ? <BStatusScreen hasWA={hasWA} hasWAB={hasWAB} /> : null}
          {activeTab === 'Saved' ? <SavedScreen key={savedFocusedAt} /> : null}
          {activeTab === 'Settings' ? <SettingsScreen hasWA={hasWA} hasWAB={hasWAB} /> : null}
        </View>
        <CustomTabBar state={tabState} navigation={navigation} insetBottom={insets.bottom} />
      </View>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1 },
});

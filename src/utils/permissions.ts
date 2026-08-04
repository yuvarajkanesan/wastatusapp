import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

// Reconstructed from decompiled Hermes bytecode (module #495 in the original bundle).
// Handles the Android storage-permission matrix: SDK 34+/33/30-32/23-29 all request
// different permission sets (scoped storage + READ_MEDIA_IMAGES/VIDEO on newer SDKs).
export async function requestStoragePermission() {
  try {
    if (Platform.OS !== 'android') {
      return true;
    }

    const sdkVersion = Platform.Version;

    if (sdkVersion >= 34) {
      return true;
    }

    if (sdkVersion >= 33) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      ]);
      const granted =
        results['android.permission.READ_MEDIA_IMAGES'] === PermissionsAndroid.RESULTS.GRANTED &&
        results['android.permission.READ_MEDIA_VIDEO'] === PermissionsAndroid.RESULTS.GRANTED;
      console.log('Android 13 permissions:', granted);
      return granted;
    }

    if (sdkVersion >= 30) {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, {
        title: 'Storage Permission Required',
        message: 'Status Saver needs storage access to read WhatsApp statuses.',
        buttonNeutral: 'Ask Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      });
      console.log('Android 11-12 read permission:', result);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    if (sdkVersion >= 23) {
      const readResult = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, {
        title: 'Storage Permission Required',
        message: 'Status Saver needs storage access to read WhatsApp statuses.',
        buttonNeutral: 'Ask Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      });
      if (readResult !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }

      const writeResult = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
        title: 'Storage Permission Required',
        message: 'Status Saver needs storage access to save statuses.',
        buttonNeutral: 'Ask Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      });
      console.log('Android 6-10 permissions - read:', readResult, 'write:', writeResult);
      return readResult === PermissionsAndroid.RESULTS.GRANTED && writeResult === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  } catch (error) {
    console.warn('Permission error:', error.message);
    return false;
  }
}

export function showPermissionAlert() {
  Alert.alert(
    'Permission Required',
    'Status Saver needs storage permission to work.\n\nPlease go to Settings → Apps → Status Saver → Permissions → Allow Storage.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
}

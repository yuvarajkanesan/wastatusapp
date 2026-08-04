import { NativeModules } from 'react-native';

const { AppCheck } = NativeModules;

// Root detection is a real native check (su binaries, known root-manager packages,
// test-keys build tag — see AppCheckModule.kt). It's a deterrent/warning, not a hard
// security boundary; nothing client-side truly can be against a rooted device.
//
// checkIntegrity is intentionally left as a pass-through: the original app's version
// (tied to the Pairip SDK) verified the running APK's signature against an expected
// fingerprint, which requires knowing that fingerprint — something only the original
// signing keystore can produce, and that was lost. Implementing a fake/wrong check here
// would risk false-positives locking you out of your own legitimately-signed builds.
export async function isDeviceRooted() {
  try {
    return await AppCheck.isDeviceRooted();
  } catch {
    return false;
  }
}

export async function checkIntegrity() {
  return true;
}

// App-lock: shows the phone's own fingerprint/face/PIN prompt via AndroidX BiometricPrompt
// (see AppCheckModule.kt). If the native call itself fails to even show a prompt (e.g. no
// FragmentActivity available), fail closed — treat it as "not authenticated" rather than
// silently letting the app through, since the whole point is gating access.
export async function authenticateBiometric() {
  try {
    return await AppCheck.authenticateBiometric();
  } catch {
    return false;
  }
}

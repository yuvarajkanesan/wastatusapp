package com.wastatusapp

import android.os.Build
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

// Small custom native module: checks whether a specific package is installed, and
// launches it directly. Written directly instead of relying on a library, since
// react-native-device-info dropped isAppInstalled() in recent versions (Play Store
// package-visibility policy), and Linking.openURL('whatsapp://') isn't a real deep
// link WhatsApp resolves — launching by package name via PackageManager is the
// reliable way to "open WhatsApp" without a specific chat/message target.
class AppCheckModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "AppCheck"

  @ReactMethod
  fun isPackageInstalled(packageName: String, promise: Promise) {
    try {
      reactApplicationContext.packageManager.getPackageInfo(packageName, 0)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun openApp(packageName: String, promise: Promise) {
    try {
      val intent = reactApplicationContext.packageManager.getLaunchIntentForPackage(packageName)
      if (intent == null) {
        promise.resolve(false)
        return
      }
      intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  // Standard open-source-style root heuristics (no paid SDK): known su binary paths,
  // known root-manager packages, and the "test-keys" build tag that signed/official
  // OTA builds never carry. Any single positive hit is treated as "likely rooted" —
  // this is a deterrent/warning, not a hard security boundary (nothing client-side can
  // be, against a sufficiently determined rooted device).
  @ReactMethod
  fun isDeviceRooted(promise: Promise) {
    promise.resolve(hasRootBinary() || hasRootPackage() || hasTestKeysBuildTag())
  }

  private fun hasRootBinary(): Boolean {
    val paths = arrayOf(
      "/system/bin/su", "/system/xbin/su", "/sbin/su",
      "/system/su", "/su/bin/su", "/system/bin/.ext/.su",
      "/system/usr/we-need-root/su-backup", "/data/local/xbin/su",
      "/data/local/bin/su", "/data/local/su"
    )
    return paths.any { File(it).exists() }
  }

  private fun hasRootPackage(): Boolean {
    val packages = arrayOf(
      "com.topjohnwu.magisk", "eu.chainfire.supersu", "com.noshufou.android.su",
      "com.noshufou.android.su.elite", "com.koushikdutta.superuser",
      "com.thirdparty.superuser", "com.yellowes.su", "com.kingroot.kingmaster",
      "com.kingo.root", "com.smedialink.oneclickroot"
    )
    return packages.any { isPackageInstalledSync(it) }
  }

  private fun isPackageInstalledSync(packageName: String): Boolean {
    return try {
      reactApplicationContext.packageManager.getPackageInfo(packageName, 0)
      true
    } catch (e: Exception) {
      false
    }
  }

  private fun hasTestKeysBuildTag(): Boolean {
    val tags = Build.TAGS
    return tags != null && tags.contains("test-keys")
  }

  // App-lock: prompts the phone's own fingerprint/face/PIN unlock (whatever the user has
  // already enrolled) before letting the app proceed. If the device has nothing enrolled at
  // all, there's nothing to lock behind — resolve success rather than lock the user out of
  // an app they can never satisfy the check for.
  @ReactMethod
  fun authenticateBiometric(promise: Promise) {
    val activity = currentActivity
    if (activity !is FragmentActivity) {
      promise.resolve(false)
      return
    }

    val biometricManager = BiometricManager.from(reactApplicationContext)
    val allowedAuthenticators =
      BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
    if (biometricManager.canAuthenticate(allowedAuthenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
      promise.resolve(true)
      return
    }

    val promptInfo = BiometricPrompt.PromptInfo.Builder()
      .setTitle("Unlock WaStatus Saver")
      .setSubtitle("Verify it's you to continue")
      .setAllowedAuthenticators(allowedAuthenticators)
      .build()

    activity.runOnUiThread {
      val executor = ContextCompat.getMainExecutor(reactApplicationContext)
      val prompt = BiometricPrompt(
        activity,
        executor,
        object : BiometricPrompt.AuthenticationCallback() {
          override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            promise.resolve(true)
          }

          override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
            // Covers both explicit user cancellation and lockout after too many failed
            // attempts — either way, access isn't granted.
            promise.resolve(false)
          }

          override fun onAuthenticationFailed() {
            // One failed attempt (e.g. wrong finger) — the system prompt stays open and
            // lets the user retry on its own; only resolve on a terminal success/error.
          }
        }
      )
      prompt.authenticate(promptInfo)
    }
  }
}

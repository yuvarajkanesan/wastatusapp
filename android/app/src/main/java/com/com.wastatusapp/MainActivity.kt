package com.wastatusapp

import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  // Blocks screenshots/screen recording and blanks the recent-apps task-switcher
  // thumbnail. Without this, cached status previews would be visible there even
  // though the app sits behind a biometric lock. Skipped only when the build was
  // explicitly made with -PallowScreenshots (a one-off QA install) — never for a
  // build headed to Play Console.
  override fun onCreate(savedInstanceState: Bundle?) {
    if (!BuildConfig.ALLOW_SCREENSHOTS) {
      window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
    }
    super.onCreate(savedInstanceState)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "WaStatusApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}

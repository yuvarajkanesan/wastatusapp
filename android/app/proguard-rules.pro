# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Our own native module (invoked by name from JS via NativeModules.AppCheck)
-keep class com.wastatusapp.AppCheckModule { *; }
-keep class com.wastatusapp.AppCheckPackage { *; }

# React Native / Hermes / Fabric ship their own consumer-proguard-rules.pro inside their
# AARs, which Gradle merges automatically — no manual keep rules needed for them.

# RN 0.80's InspectorFlags static initializer references CxxInspectorPackagerConnection
# (a debug-only inspector/packager class) unconditionally, even in release builds where
# nothing else uses it — R8 strips it as unreachable, and the app then crash-loops on
# launch with ClassNotFoundException the first time InspectorFlags is touched. Keeping the
# devsupport package intact avoids the strip; it's dead code at runtime in release either way.
-keep class com.facebook.react.devsupport.** { *; }
-dontwarn com.facebook.react.devsupport.**

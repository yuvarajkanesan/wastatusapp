# WaStatus Saver — Recovery Notes

Recovered on 2026-07-23 from the app installed on your Samsung Galaxy S928B
(package `com.wastatusapp`, versionCode 10, versionName 1.0.5), after source
loss from a laptop failure. Source: `adb`-pulled APK splits, decompiled via
the Hermes bytecode inside `assets/index.android.bundle` (5,772 functions).

## What's 100% recovered (not reconstructed — copied as-is)

- `assets/fonts/` — all 18 icon fonts
- `assets/icons/` — launcher icons
- `manifest_resources/AndroidManifest.xml` — full manifest
- `manifest_resources/reference_base.apk` — the original base APK, kept for reference
- `src/constants/legal.js` — your **exact, complete** Terms and Conditions and
  Privacy Policy text (dated June 27, 2025), including your contact email
- `src/constants/theme.js` — exact brand colors (light + dark palettes)
- `src/components/CustomTabBar.js` — exact tab config and behavior
- `src/utils/permissions.js` — exact Android storage-permission logic
- `App.js` security-check text and root/tamper-detection flow (see Security note below)

Everything else is a **functional rebuild**: real feature set, real function
names, real UI copy (all pulled from preserved strings/identifiers in the
bytecode), but reasonable rather than pixel-exact styling, since the
decompiler doesn't reconstruct original formatting.

## App structure

- **4 tabs** (bottom, custom-drawn, not react-navigation's tab navigator):
  Status, B Status (only shown if WhatsApp Business is installed), Saved, Settings
- **HomeScreen** (`src/screens/HomeScreen.js`) — shared by Status/BStatus tabs.
  Folder picker via Storage Access Framework, grid of status thumbnails with
  expiry countdown badges, tap to preview, long-press for multi-select,
  bulk save/share, pull to refresh, help modal with folder-picking steps.
- **SavedScreen** — grid of previously-saved files, delete with confirm,
  bulk delete/share.
- **SettingsScreen** — theme (System/Light/Dark), "How to Use" steps for both
  WhatsApp and Business, About (app name/version/developer), Rate on Google
  Play, Terms/Privacy legal modals.

## Gaps — needs your attention before this runs

1. **`src/native/statusFolder.js`** — several functions are stubs
   (`fetchStatuses`, `saveStatus`, `isAlreadySaved`, `fetchSavedStatuses`,
   `shareFile`, `bulkShareFiles`, `deleteSavedFile`). The SAF folder-picking
   and install-detection logic *was* traced and is real; the file-listing/
   save/share/delete operations were only inferred from call signatures —
   implement them against `react-native-saf-x`'s real API and test.

2. **`src/native/security.js`** — `isDeviceRooted()` / `checkIntegrity()` are
   stubs. The manifest references the **Pairip** app-protection SDK
   (`com.pairip.application.Application`, `com.pairip.licensecheck.LicenseActivity`),
   which is native/protected code that can't be decompiled from the JS
   bundle. `App.js` **hard-blocks the app** (Alert + force-exit) if either
   check fails — decide whether to re-integrate Pairip (or swap in Play
   Integrity API), or remove the gate, before shipping a rebuild.

3. **Styling** — colors, text, and layout logic are accurate; exact spacing/
   sizing values were not transcribed pixel-by-pixel (by your choice, to
   move faster). Expect to eyeball and adjust visual details against your
   memory of the app or the reference APK.

4. **`reference_base.apk`** is kept in `manifest_resources/` — useful to
   re-open with a decompiler if you want to trace more of `statusFolder.js`
   yourself later (the untraced functions are all in module #496 of
   `decompiled/index.decompiled.js`, roughly lines 199,203–199,795).

## Publishing to Google Play

Your original `10.aab` (versionCode 10) is already signed and complete —
you don't need any of this recovery work just to get it live on Play
Console Closed Testing. This recovery effort is only needed to get back
**editable source** so you can keep developing the app. When you do publish
a new build from this recovered source, bump `versionCode` past 10 in
`app.json`.

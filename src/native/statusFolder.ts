import SafX from 'react-native-saf-x';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { createThumbnail } from 'react-native-create-thumbnail';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { NativeModules } from 'react-native';

const { AppCheck } = NativeModules;
const CACHE_DIR = `${RNFS.CachesDirectoryPath}/wa_statuses`;
const THUMB_CACHE_DIR = `${RNFS.CachesDirectoryPath}/wa_thumbs`;
const SAVE_ALBUM = 'Status Saver';

// Reconstructed from decompiled Hermes bytecode (module #496 in the original bundle),
// completed against react-native-saf-x's real API (openDocumentTree only takes
// `persist`; uris behave like paths once you have a tree uri — see its README).
// "Save" and the Saved tab go through the real phone gallery (CameraRoll/MediaStore,
// album "Status Saver") rather than a separate app-picked SAF folder, so the Saved tab
// reflects what's actually in the user's gallery.

const STORAGE_KEY_WHATSAPP = 'saf_uri_whatsapp';
const STORAGE_KEY_BUSINESS = 'saf_uri_business';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const VIDEO_EXTS = ['mp4', '3gp', 'mkv', 'webm', 'mov'];

// Real check via PackageManager (through react-native-device-info), not a file-existence
// guess — a plain filesystem/SAF check can't tell you whether an app is installed.
export async function isWhatsAppInstalled() {
  try {
    return await AppCheck.isPackageInstalled('com.whatsapp');
  } catch {
    return false;
  }
}

export async function isWhatsAppBusinessInstalled() {
  try {
    return await AppCheck.isPackageInstalled('com.whatsapp.w4b');
  } catch {
    return false;
  }
}

// getLaunchIntentForPackage (AppCheck.openApp) only opens WhatsApp's own home screen with
// nothing attached — it can't carry the previewed image/video along. Sharing directly to
// WhatsApp needs react-native-share's shareSingle, which targets the app the same way the
// system share sheet's "WhatsApp" entry does, with the file attached.
export async function shareToWhatsApp(path, isBusiness, mimeType) {
  try {
    await Share.shareSingle({
      url: path,
      type: mimeType,
      social: (isBusiness ? Share.Social.WHATSAPPBUSINESS : Share.Social.WHATSAPP) as any,
    });
    return true;
  } catch (e) {
    console.log('shareToWhatsApp failed:', e.message);
    return false;
  }
}

// SAF tree URIs encode the source path, e.g.
// content://.../tree/primary%3AAndroid%2Fmedia%2Fcom.whatsapp.w4b%2F... — so which app's
// folder was actually picked can be read back out of the uri itself. Returns null when the
// uri doesn't look like either app's media folder (e.g. a manually organized custom folder),
// in which case callers should let it through rather than block a legitimate choice.
export function detectFolderOwner(uri) {
  if (!uri) return null;
  let decoded = uri;
  try {
    decoded = decodeURIComponent(uri);
  } catch {
    // already decoded, or malformed — fall back to matching the raw string
  }
  if (decoded.includes('com.whatsapp.w4b')) return 'business';
  if (decoded.includes('com.whatsapp')) return 'whatsapp';
  return null;
}

// tries the exact .Statuses folder first (pre-navigated via a content:// URI hack so
// Android's system picker opens directly there), falls back to the parent Media folder,
// then falls back to a plain folder picker with no starting location. Note: the
// installed react-native-saf-x version's openDocumentTree only accepts `persist` — any
// initial-location hint is ignored, so in practice this always opens the plain picker.
//
// Android's system picker also reopens at whatever folder you last browsed to, globally —
// not scoped per app/tab. So right after picking WhatsApp's .Statuses folder, opening the
// picker again for WhatsApp Business lands back in that same folder, and it's easy to tap
// "Use this folder" on it again by mistake. Rather than silently caching a folder that
// belongs to the other app under this tab's key, this checks the picked uri against what
// was requested and reports a mismatch instead of caching it.
export async function pickStatusFolderSAF(isBusiness) {
  let result = null;
  try {
    result = await SafX.openDocumentTree(true);
  } catch (e) {
    console.log('pickStatusFolderSAF error:', e.message);
    return { uri: null, mismatchedApp: null };
  }

  if (!result) {
    console.log('User cancelled');
    return { uri: null, mismatchedApp: null };
  }

  const uri = result.uri;
  const detected = detectFolderOwner(uri);
  const expected = isBusiness ? 'business' : 'whatsapp';
  if (detected && detected !== expected) {
    console.log('pickStatusFolderSAF mismatch: expected', expected, 'got', detected);
    return { uri, mismatchedApp: detected };
  }

  await setCachedSAFUri(uri, isBusiness);
  return { uri, mismatchedApp: null };
}

export async function setCachedSAFUri(uri, isBusiness) {
  const key = isBusiness ? STORAGE_KEY_BUSINESS : STORAGE_KEY_WHATSAPP;
  await AsyncStorage.setItem(key, uri);
}

export async function getCachedSAFUri(isBusiness) {
  const key = isBusiness ? STORAGE_KEY_BUSINESS : STORAGE_KEY_WHATSAPP;
  return AsyncStorage.getItem(key);
}

function filterMedia(files, mediaType) {
  const exts = mediaType === 'video' ? VIDEO_EXTS : IMAGE_EXTS;
  return files
    .filter((f) => f.type === 'file' && exts.some((ext) => f.name.toLowerCase().endsWith(`.${ext}`)))
    .map((f) => ({ name: f.name, path: f.uri, mtime: f.lastModified, size: f.size }))
    .sort((a, b) => b.mtime - a.mtime);
}

// RN's <Image> can't render react-native-saf-x's uris directly, and RNFS.copyFile can't
// either — SafX returns its own pseudo-path uris that only SafX's own native code knows
// how to resolve; handing them to a different library throws a SecurityException. So the
// bytes have to come out through SafX itself. The real app's own logs show it does the
// same local-caching trick, just via its own (untraceable) native implementation.
//
// Two ways to get the bytes out:
//   1. SafX.copyFile(uri, 'file://...') — a native-side stream copy, never touching the
//      JS bridge. Preferred: reliable for large files.
//   2. SafX.readFile(uri, base64) + RNFS.writeFile — round-trips the whole file through a
//      base64 JS string. Works for small files, but was observed corrupting large (5-8MB)
//      videos silently (valid-looking MP4 container, undecodable video stream — no thrown
//      error at any step). Kept only as a fallback if copyFile is unavailable.
// SAF's own directory listing reports each file's real size (`f.size` in filterMedia) —
// used here as ground truth. Observed on-device: SafX.copyFile can resolve successfully
// while having silently truncated a large video mid-stream (no thrown error at any step,
// valid MP4 ftyp header, but no moov atom at the tail — undecodable). Comparing against
// the expected size catches this; a bare retry has been enough to get a clean copy.
async function copyOnce(uri, destPath, name) {
  try {
    await SafX.copyFile(uri, `file://${destPath}`, { replaceIfDestinationExists: true });
  } catch (e) {
    console.log('SafX.copyFile failed, falling back to base64 read:', name, e.message);
    const base64Data = await SafX.readFile(uri, { encoding: 'base64' });
    await RNFS.writeFile(destPath, base64Data, 'base64');
  }
}

async function cacheToLocal(uri, name, expectedSize = undefined) {
  const destPath = `${CACHE_DIR}/${name}`;
  const alreadyCached = await RNFS.exists(destPath);
  if (alreadyCached) {
    if (!expectedSize) return `file://${destPath}`;
    const stat = await RNFS.stat(destPath).catch(() => null);
    if (stat && Number(stat.size) === expectedSize) return `file://${destPath}`;
    // Cached copy is stale/truncated from a previous run — fall through and redo it.
  } else {
    await RNFS.mkdir(CACHE_DIR);
  }

  await copyOnce(uri, destPath, name);
  if (expectedSize) {
    let stat = await RNFS.stat(destPath).catch(() => null);
    if (!stat || Number(stat.size) !== expectedSize) {
      console.log('cacheToLocal size mismatch, retrying:', name, stat && stat.size, 'expected', expectedSize);
      await copyOnce(uri, destPath, name);
      stat = await RNFS.stat(destPath).catch(() => null);
      if (!stat || Number(stat.size) !== expectedSize) {
        console.log('cacheToLocal still mismatched after retry:', name, stat && stat.size, 'expected', expectedSize);
      }
    }
  }
  return `file://${destPath}`;
}

// Generates a static JPEG frame from a (local) video file and caches it, so grid cells
// can show a real preview via a plain <Image> instead of paying for a live <Video>
// player per cell (which is what made the grid slow when we tried that).
async function getVideoThumbnail(localVideoPath, name) {
  const destPath = `${THUMB_CACHE_DIR}/${name}.jpg`;
  const alreadyCached = await RNFS.exists(destPath);
  if (alreadyCached) return `file://${destPath}`;
  await RNFS.mkdir(THUMB_CACHE_DIR);

  // No explicit timeStamp first — the library's own default seeks to the nearest
  // keyframe, which is more robust than forcing an exact millisecond that might land
  // between keyframes and decode to a near-black frame. Further timestamps spread deeper
  // into the clip: longer videos are more likely to have a multi-second black/logo intro,
  // and (unlike a short clip) the earlier attempts are also more likely to outright throw
  // rather than just return a too-small frame — each attempt is tried independently so one
  // throwing doesn't skip the rest.
  const attempts = [undefined, 1000, 3000, 6000, 10000];
  let result = null;
  for (const timeStamp of attempts) {
    try {
      const config: any = {
        url: localVideoPath,
        format: 'jpeg',
        maxWidth: 480,
        maxHeight: 480,
        // Distinct per attempt — otherwise the library's own internal disk cache is keyed
        // off the source url alone, so a retry at a different timeStamp can silently hand
        // back the first (degenerate) attempt's cached file instead of re-extracting.
        cacheName: `${name}_${timeStamp ?? 'default'}`,
      };
      if (timeStamp !== undefined) config.timeStamp = timeStamp;
      const candidate = await createThumbnail(config);
      const candidatePath = candidate.path.startsWith('file://') ? candidate.path.slice(7) : candidate.path;
      // Trust the actual bytes on disk over the library's self-reported `size` field —
      // observed cases where a degenerate (near-solid-color) frame was still reported as
      // large enough, only for the moved file to end up a few hundred bytes.
      const stat = await RNFS.stat(candidatePath);
      if (Number(stat.size) >= 3000) {
        result = candidatePath;
        break;
      }
    } catch (e) {
      console.log('Thumbnail attempt failed:', name, timeStamp, e.message);
    }
  }

  if (!result) {
    // Every attempt came back degenerate or threw — a real extraction failure for this
    // clip. Don't cache/return a known-bad thumbnail; let the caller fall back to a live
    // paused <Video> frame for this one instead.
    return null;
  }
  await RNFS.moveFile(result, destPath);
  return `file://${destPath}`;
}

async function withDisplayPaths(items, mediaType) {
  return Promise.all(
    items.map(async (item) => {
      const displayPath = await cacheToLocal(item.path, item.name, item.size).catch(() => item.path);
      let thumbnailPath;
      if (mediaType === 'video') {
        thumbnailPath = await getVideoThumbnail(displayPath, item.name).catch(() => null);
      }
      return { ...item, displayPath, thumbnailPath };
    })
  );
}

export async function fetchStatuses(folderUri, mediaType) {
  const files = await SafX.listFiles(folderUri);
  const items = filterMedia(files, mediaType);
  return withDisplayPaths(items, mediaType);
}

// Back-compat alias used by HomeScreen.js
export const listStatuses = fetchStatuses;

function isVideoName(name) {
  return VIDEO_EXTS.some((ext) => name.toLowerCase().endsWith(`.${ext}`));
}

export async function saveStatus(path, name, size = undefined) {
  try {
    const localPath = await cacheToLocal(path, name, size);
    await CameraRoll.saveAsset(localPath, {
      type: isVideoName(name) ? 'video' : 'photo',
      album: SAVE_ALBUM,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function isAlreadySaved(name) {
  try {
    const page = await CameraRoll.getPhotos({
      first: 1000,
      groupTypes: 'Album',
      groupName: SAVE_ALBUM,
      assetType: isVideoName(name) ? 'Videos' : 'Photos',
    });
    return page.edges.some((edge) => edge.node.image.filename === name);
  } catch {
    return false;
  }
}

export async function fetchSavedStatuses(mediaType) {
  try {
    const page = await CameraRoll.getPhotos({
      first: 1000,
      groupTypes: 'Album',
      groupName: SAVE_ALBUM,
      assetType: mediaType === 'video' ? 'Videos' : 'Photos',
    });
    const items = page.edges
      .map((edge) => {
        // On this device CameraRoll's `filename` came back null for saved-album assets,
        // leaving a bare numeric `id` (e.g. "1000349152") as the name with no extension.
        // react-native-share's own type detection is keyed off the file *extension*
        // (MimeTypeMap.getFileExtensionFromUrl) — it silently downgrades to a generic
        // */* even when we pass an explicit `type`, if the filename it ends up copying
        // to has no matching extension. WhatsApp then has nothing to identify the
        // attachment as an image/video and shows it as a plain "BIN" file. Guaranteeing
        // a real extension here (from CameraRoll's own `extension`/`type` fields,
        // falling back to a mediaType-based default) is what actually fixes it.
        const rawName = edge.node.image.filename || edge.node.id;
        const ext =
          edge.node.image.extension ||
          (edge.node.type && edge.node.type.includes('/') ? edge.node.type.split('/')[1] : null) ||
          (mediaType === 'video' ? 'mp4' : 'jpg');
        const name = /\.[a-z0-9]{2,4}$/i.test(rawName) ? rawName : `${rawName}.${ext}`;
        return {
          name,
          path: edge.node.image.uri,
          displayPath: edge.node.image.uri,
          mtime: edge.node.timestamp * 1000,
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (mediaType !== 'video') return items;

    return Promise.all(
      items.map(async (item) => ({
        ...item,
        thumbnailPath: await getVideoThumbnail(item.displayPath, item.name).catch(() => null),
      }))
    );
  } catch {
    return [];
  }
}

const SHARE_CACHE_DIR = `${RNFS.CachesDirectoryPath}/wa_share`;

// react-native-share's Android multi-file path (ShareFiles.java) mishandles content://
// sources: for anything not scheme file://, it still calls `new File(uri.getPath())`,
// which for a content:// uri is just the URI's path *component* (e.g.
// "/external/images/media/12345"), not a real filesystem path — so it wraps a
// nonexistent file. The share sheet still opens and shows a correct-looking preview
// (that's the OS's own thumbnail resolution, unrelated to what actually gets attached),
// but the receiving app gets an unreadable/missing file. Saved-tab items are always
// content:// (CameraRoll/MediaStore); live-status items are already real local file://
// copies (cacheToLocal) and pass through unchanged.
async function ensureShareableLocalPath(uri, name) {
  if (!uri || !uri.startsWith('content://')) return uri;
  const destPath = `${SHARE_CACHE_DIR}/${name}`;
  const alreadyCached = await RNFS.exists(destPath);
  if (!alreadyCached) {
    await RNFS.mkdir(SHARE_CACHE_DIR);
    await RNFS.copyFile(uri, destPath);
  }
  return `file://${destPath}`;
}

// mimeType is optional so live-status callers can keep relying on filename-extension
// auto-detection; Saved-tab callers should always pass 'image/*' or 'video/*' since the
// content:// uri itself carries no extension for the library to detect from.
export async function shareFile(path, mimeType = undefined, name = undefined) {
  const localPath = await ensureShareableLocalPath(path, name || path.split('/').pop());
  await Share.open({ url: localPath, type: mimeType, failOnCancel: false });
}

export async function bulkShareFiles(items, mimeType = undefined) {
  const localPaths = await Promise.all(
    items.map((i) => ensureShareableLocalPath(i.displayPath || i.path, i.name))
  );
  await Share.open({ urls: localPaths, type: mimeType, failOnCancel: false });
}

export async function deleteSavedFile(uri) {
  try {
    await CameraRoll.deletePhotos([uri]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Android 11+ deletion of MediaStore items the app doesn't own requires the user to
// confirm via a native system dialog (MediaStore.createDeleteRequest). Passing every uri
// in one deletePhotos() call shows that confirmation ONCE for the whole batch — calling
// deleteSavedFile in a loop instead triggers a separate system dialog per file, which
// looks like bulk delete "doing nothing" while it's actually stuck behind N unconfirmed
// dialogs.
export async function bulkDeleteSavedFiles(uris) {
  try {
    await CameraRoll.deletePhotos(uris);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  Alert,
  ToastAndroid,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { elevation } from '../constants/theme';
import EmptyState from '../components/EmptyState';
import Step from '../components/Step';
import { getGridColumns } from '../utils/layout';
import {
  pickStatusFolderSAF,
  saveStatus,
  shareFile,
  bulkShareFiles,
  listStatuses,
  getCachedSAFUri,
  shareToWhatsApp,
} from '../native/statusFolder';

// Rebuilt to match the real installed app (verified against screenshots of the
// production build) rather than only the decompiled bytecode. Function names
// (formatTime, formatExpiry, switchTab, handlePickFolder, bulkSave, bulkShare,
// closePreview, keyExtractor, renderItem, onRetry) came from the bytecode; the
// IMAGES/VIDEOS toggle, header layout, and step-list help modal were corrected
// against the real app's UI.

function formatExpiry(timestamp) {
  if (!timestamp) return null;
  const msLeft = 86400000 - (Date.now() - new Date(timestamp).getTime());
  if (msLeft <= 0) {
    return { label: 'Expired', color: '#EF5350' };
  }
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minutesLeft = Math.floor((msLeft % 3600000) / 60000);
  const color = hoursLeft < 4 ? '#FF9800' : '#4CAF50';
  const label = hoursLeft > 0 ? `${hoursLeft}h left` : `${minutesLeft}m left`;
  return { label, color };
}

function getHelpSteps(isBusiness) {
  const app = isBusiness ? 'WA Business' : 'WA';
  const pkg = isBusiness ? 'com.whatsapp.w4b' : 'com.whatsapp';
  const folder = isBusiness ? 'WhatsApp Business' : 'WhatsApp';
  return [
    { icon: 'chatbubble-ellipses-outline', title: '', text: `Open ${app} and view any statuses first.` },
    {
      icon: 'folder-outline',
      title: '',
      text: `Tap "Select Folder" and navigate to:\n\nAndroid → media → ${pkg} → ${folder} → Media → .Statuses\n\n💡 Tap ⋮ → Show hidden files if .Statuses is not visible.`,
    },
    { icon: 'checkmark-circle-outline', title: '', text: 'Tap "Use this folder" then "Allow".' },
    { icon: 'arrow-down-circle-outline', title: '', text: 'Tap ↓ to save. Long-press to select multiple items.' },
    { icon: 'share-social-outline', title: '', text: 'Tap the share or WA icon to forward to anyone.' },
    { icon: 'cloud-download-outline', title: '', text: 'Find all saved files in the "Saved" tab.' },
  ];
}

export default function HomeScreen({ variant = 'whatsapp', hasWA = true, hasWAB = true }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = getGridColumns(width);
  const styles = makeStyles(colors, numColumns);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(variant);
  const [mediaFilter, setMediaFilter] = useState('image');
  const [folderUri, setFolderUri] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [previewIndex, setPreviewIndex] = useState(-1);
  const [helpVisible, setHelpVisible] = useState(false);
  const [helpTab, setHelpTab] = useState(variant);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    if (!folderUri) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listStatuses(folderUri, mediaFilter);
      setStatuses(items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [folderUri, mediaFilter]);

  useEffect(() => {
    getCachedSAFUri(tab === 'business').then(setFolderUri);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  // `selected` holds item names from whichever tab was active when they were picked —
  // switching IMAGES/VIDEOS while a selection is active left stale names that don't match
  // any item in the newly-active list, so bulk save/share would silently filter down to
  // nothing and look broken.
  useEffect(() => {
    setSelectionMode(false);
    setSelected(new Set());
  }, [mediaFilter]);

  const handlePickFolder = useCallback(async () => {
    const { uri, mismatchedApp } = await pickStatusFolderSAF(tab === 'business');
    if (mismatchedApp) {
      const expectedLabel = tab === 'business' ? 'WhatsApp Business' : 'WhatsApp';
      const detectedLabel = mismatchedApp === 'business' ? 'WhatsApp Business' : 'WhatsApp';
      Alert.alert(
        'Wrong folder selected',
        `That folder belongs to ${detectedLabel}, but this tab needs the ${expectedLabel} statuses folder.\n\nTap "Select Folder" again and navigate to the ${expectedLabel} folder this time — the picker reopens where you last left it, so it's easy to land back on the same one.`
      );
      return;
    }
    if (uri) {
      setFolderUri(uri);
    }
  }, [tab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const saveItem = useCallback(async (item) => {
    setSaving((s) => ({ ...s, [item.name]: true }));
    const result = await saveStatus(item.path, item.name, item.size);
    setSaving((s) => ({ ...s, [item.name]: false }));
    if (result.success) {
      setSaved((s) => ({ ...s, [item.name]: true }));
      ToastAndroid.show('Saved to gallery! ✓', ToastAndroid.SHORT);
    } else {
      ToastAndroid.show(`Save failed: ${result.error}`, ToastAndroid.SHORT);
    }
  }, []);

  const enterSelection = useCallback((item) => {
    setSelectionMode(true);
    setSelected(new Set([item.name]));
  }, []);

  const toggleSelect = useCallback((item) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.name)) next.delete(item.name);
      else next.add(item.name);
      return next;
    });
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelected(new Set());
  }, []);

  const bulkSave = useCallback(async () => {
    const items = statuses.filter((s) => selected.has(s.name));
    for (const item of items) {
      await saveItem(item);
    }
    exitSelection();
  }, [statuses, selected, saveItem, exitSelection]);

  const bulkShare = useCallback(async () => {
    const items = statuses.filter((s) => selected.has(s.name));
    if (!items.length) return;
    try {
      await bulkShareFiles(items);
    } catch (e) {
      if (!e.message?.includes('cancel')) {
        ToastAndroid.show('Share failed', ToastAndroid.SHORT);
      }
    }
    exitSelection();
  }, [statuses, selected, exitSelection]);

  const openPreview = useCallback((index) => setPreviewIndex(index), []);
  const closePreview = useCallback(() => setPreviewIndex(-1), []);

  // scrollToIndex on a numColumns grid without getItemLayout can throw/fail once the
  // target row hasn't been measured yet (jumping several rows at once, near the end of a
  // long list, etc). Keeping the grid in sync with the preview is a nice-to-have, not
  // required for the preview itself, so failures here are safe to swallow —
  // onScrollToIndexFailed below covers the async case scrollToIndex itself can't throw for.
  const goPrevPreview = useCallback(() => {
    if (previewIndex <= 0) return;
    const next = previewIndex - 1;
    try {
      listRef.current?.scrollToIndex({ index: next, animated: true });
    } catch {}
    setPreviewIndex(next);
  }, [previewIndex]);

  const goNextPreview = useCallback(() => {
    if (previewIndex >= statuses.length - 1) return;
    const next = previewIndex + 1;
    try {
      listRef.current?.scrollToIndex({ index: next, animated: true });
    } catch {}
    setPreviewIndex(next);
  }, [previewIndex, statuses.length]);

  const handleScrollToIndexFailed = useCallback((info) => {
    listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
  }, []);

  // Plain touch-start/end tracking instead of PanResponder — more predictable inside a
  // Modal, and doesn't depend on winning responder negotiation against nested
  // TouchableOpacity/Video children.
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const onPreviewTouchStart = useCallback((e) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
  }, []);
  const onPreviewTouchEnd = useCallback(
    (e) => {
      if (touchStartX.current == null) return;
      const dx = e.nativeEvent.pageX - touchStartX.current;
      const dy = e.nativeEvent.pageY - touchStartY.current;
      touchStartX.current = null;
      if (Math.abs(dx) > 25 && Math.abs(dx) > Math.abs(dy) * 0.5) {
        // dx > 0 -> previous, dx < 0 -> next. (Confirmed against real on-device swipe
        // behavior, not just coordinate math — don't "simplify" this without retesting.)
        if (dx > 0) goPrevPreview();
        else goNextPreview();
      }
    },
    [goPrevPreview, goNextPreview]
  );

  const shareToWA = useCallback(async () => {
    if (previewIndex < 0 || !statuses[previewIndex]) return;
    const item = statuses[previewIndex];
    const path = item.displayPath || item.path;
    const mimeType = mediaFilter === 'video' ? 'video/*' : 'image/*';
    const opened = await shareToWhatsApp(path, tab === 'business', mimeType);
    if (!opened) {
      ToastAndroid.show(
        `Couldn't share to ${tab === 'business' ? 'WA Business' : 'WA'}`,
        ToastAndroid.SHORT
      );
    }
  }, [previewIndex, statuses, mediaFilter, tab]);

  const keyExtractor = (item) => item.name;

  const renderItem = ({ item, index }) => {
    const isSaving = saving[item.name];
    const isSaved = saved[item.name];
    const isSelected = selected.has(item.name);
    const expiry = formatExpiry(item.mtime);

    return (
      <TouchableOpacity
        style={[styles.cell, isSelected && styles.cellSelected]}
        activeOpacity={0.8}
        delayLongPress={250}
        onPress={() => (selectionMode ? toggleSelect(item) : openPreview(index))}
        onLongPress={() => (selectionMode ? toggleSelect(item) : enterSelection(item))}
      >
      {/* Rounded-corner clipping lives on this inner wrapper, not the TouchableOpacity
          itself — overflow:hidden on the same view as the elevation shadow above would
          clip the shadow away on Android. */}
      <View style={styles.cellClip}>
        {mediaFilter === 'video' ? (
          <View style={styles.videoThumbPlaceholder}>
            {item.thumbnailPath ? (
              <Image source={{ uri: item.thumbnailPath }} style={styles.thumb} />
            ) : (
              // Static extraction failed for this one (rare — a codec/encoding quirk in
              // the specific clip). Fall back to a live frame instead of a blank tile.
              // Note: `paused` alone won't render a frame here — ExoPlayer doesn't
              // decode/display anything on a paused player until playback has actually
              // started at least once, so this has to autoplay (muted, no controls) to
              // show anything at all. Only used for the few cells that need it, so it
              // doesn't reintroduce the performance cost of live players everywhere.
              <Video
                source={{ uri: item.displayPath || item.path }}
                style={styles.thumb}
                resizeMode="cover"
                muted
                repeat
                controls={false}
              />
            )}
            <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.85)" style={styles.playOverlay} />
          </View>
        ) : (
          <Image source={{ uri: item.displayPath || item.path }} style={styles.thumb} />
        )}
        {expiry ? (
          <View style={[styles.expiryBadge, { backgroundColor: expiry.color }]}>
            <Text style={styles.expiryText}>{expiry.label}</Text>
          </View>
        ) : null}
        <Text style={styles.timeText}>{formatTimeLabel(item.mtime)}</Text>
        {selectionMode ? (
          <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
            {isSelected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
          </View>
        ) : (
          <TouchableOpacity style={styles.dlBtn} onPress={() => saveItem(item)} disabled={isSaving || isSaved}>
            <Ionicons
              name={
                isSaved
                  ? 'checkmark-circle-outline'
                  : isSaving
                  ? 'ellipsis-horizontal-circle-outline'
                  : 'arrow-down-circle-outline'
              }
              size={30}
              color={isSaved ? colors.accent : colors.white}
              style={styles.dlBtnIcon}
            />
          </TouchableOpacity>
        )}
      </View>
      </TouchableOpacity>
    );
  };

  const isBusiness = tab === 'business';
  const label = isBusiness ? 'WhatsApp Business' : 'WhatsApp';
  const headerTitle = isBusiness ? 'WA Business Status' : 'WA Status';
  const helpSteps = getHelpSteps(helpTab === 'business');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={[styles.header, { paddingTop: 20 + insets.top }]}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.folderBtn} onPress={handlePickFolder}>
              <Ionicons name="folder-outline" size={15} color={colors.white} />
              <Text style={styles.folderBtnText}>Select Folder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpBtn} onPress={() => setHelpVisible(true)}>
              <Ionicons name="help-circle-outline" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterTab} onPress={() => setMediaFilter('image')}>
            <Text style={[styles.filterTabText, mediaFilter === 'image' && styles.filterTabTextActive]}>IMAGES</Text>
            {mediaFilter === 'image' ? <View style={styles.filterUnderline} /> : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterTab} onPress={() => setMediaFilter('video')}>
            <Text style={[styles.filterTabText, mediaFilter === 'video' && styles.filterTabTextActive]}>VIDEOS</Text>
            {mediaFilter === 'video' ? <View style={styles.filterUnderline} /> : null}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.contentArea}>
        {!folderUri ? (
          <EmptyState
            icon="folder-open-outline"
            title={`Select the ${label} folder`}
            message={`Open ${label}, view some statuses, then come back here.`}
            onRetry={handlePickFolder}
            actionLabel="Select Folder"
            actionIcon="folder-outline"
          />
        ) : loading ? (
          <Text style={styles.loadingText}>Loading statuses...</Text>
        ) : error ? (
          <EmptyState
            icon="folder-open-outline"
            title="Couldn't Load Statuses"
            message={error}
            onRetry={load}
            actionLabel="Try Again"
            actionIcon="refresh-outline"
          />
        ) : statuses.length === 0 ? (
          <EmptyState
            icon={mediaFilter === 'video' ? 'videocam-outline' : 'image-outline'}
            title={mediaFilter === 'video' ? 'No Video Statuses' : 'No Photo Statuses'}
            message={`Open ${label}, view some statuses, then come back here.`}
            onRetry={load}
            actionLabel="Refresh"
            actionIcon="refresh-outline"
          />
        ) : (
          <FlatList
            key={numColumns}
            ref={listRef}
            data={statuses}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            style={{ flex: 1 }}
            numColumns={numColumns}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            removeClippedSubviews
            maxToRenderPerBatch={8}
            windowSize={11}
            initialNumToRender={6}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
          />
        )}
      </View>

      {selectionMode ? (
        <LinearGradient
          colors={colors.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bulkBar}
        >
          <TouchableOpacity style={styles.bulkCancel} onPress={exitSelection}>
            <Ionicons name="close" size={16} color={colors.white} />
            <Text style={styles.bulkCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.bulkCount}>{selected.size} selected</Text>
          <TouchableOpacity
            style={[styles.bulkBtn, selected.size === 0 && styles.bulkBtnDisabled]}
            onPress={bulkSave}
            disabled={selected.size === 0}
          >
            <Ionicons name="arrow-down-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.bulkBtnText}>Save All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkBtn, selected.size === 0 && styles.bulkBtnDisabled]}
            onPress={bulkShare}
            disabled={selected.size === 0}
          >
            <Ionicons name="share-social-outline" size={14} color={colors.primary} />
            <Text style={styles.bulkBtnText}>Share</Text>
          </TouchableOpacity>
        </LinearGradient>
      ) : null}

      <Modal visible={previewIndex >= 0} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.modalBg}>
          {/* Swipe tracking lives on this inner wrapper only — not the buttons/actions
              below, which sit as siblings so their own touch handling is never raced
              against the parent's raw onTouchStart/onTouchEnd. */}
          <View style={styles.modalMedia} onTouchStart={onPreviewTouchStart} onTouchEnd={onPreviewTouchEnd}>
            {previewIndex >= 0 && statuses[previewIndex] && mediaFilter === 'video' ? (
              <Video
                source={{ uri: statuses[previewIndex].displayPath || statuses[previewIndex].path }}
                style={styles.modalImage}
                resizeMode="contain"
                controls
                controlsStyles={{ hideNext: true, hidePrevious: true, hideSettingButton: true }}
                paused={false}
                onError={(e) => console.log('Video playback error:', JSON.stringify(e))}
              />
            ) : previewIndex >= 0 && statuses[previewIndex] ? (
              <Image
                source={{ uri: statuses[previewIndex].displayPath || statuses[previewIndex].path }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            ) : null}
            {/* The native video player (controls=true) owns touch inside its own view and
                never lets onTouchStart/onTouchEnd above see it, so swipe-to-navigate silently
                stopped working for videos. These two edge strips sit on top of the player
                (later in the tree = higher z-order) and carry their own copy of the same
                swipe handlers, giving a reliable swipe zone that doesn't depend on the video
                view forwarding touches. Bottom is left uncovered so the native scrubber/
                play-pause bar stays fully tappable. */}
            {mediaFilter === 'video' ? (
              <>
                <View
                  style={styles.modalSwipeEdgeLeft}
                  onTouchStart={onPreviewTouchStart}
                  onTouchEnd={onPreviewTouchEnd}
                />
                <View
                  style={styles.modalSwipeEdgeRight}
                  onTouchStart={onPreviewTouchStart}
                  onTouchEnd={onPreviewTouchEnd}
                />
              </>
            ) : null}
          </View>
          <TouchableOpacity style={styles.modalClose} onPress={closePreview} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalPrev, previewIndex <= 0 && styles.modalNavDisabled]}
            onPress={goPrevPreview}
            disabled={previewIndex <= 0}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={28} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalNext, previewIndex >= statuses.length - 1 && styles.modalNavDisabled]}
            onPress={goNextPreview}
            disabled={previewIndex >= statuses.length - 1}
            hitSlop={12}
          >
            <Ionicons name="chevron-forward" size={28} color={colors.white} />
          </TouchableOpacity>
          <LinearGradient
            colors={colors.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalActions}
          >
            <TouchableOpacity
              style={styles.actBtn}
              onPress={() => previewIndex >= 0 && saveItem(statuses[previewIndex])}
            >
              <Ionicons name="arrow-down-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.actBtnText, styles.actBtnTextDark]}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actBtn}
              onPress={() =>
                previewIndex >= 0 &&
                shareFile(statuses[previewIndex].displayPath || statuses[previewIndex].path)
              }
            >
              <Ionicons name="share-social-outline" size={14} color={colors.primary} />
              <Text style={[styles.actBtnText, styles.actBtnTextDark]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actBtn, styles.actBtnWA]} onPress={shareToWA}>
              <Ionicons name="logo-whatsapp" size={14} color={colors.white} />
              <Text style={styles.actBtnText}>WA</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      <Modal visible={helpVisible} transparent animationType="fade" onRequestClose={() => setHelpVisible(false)}>
        <View style={styles.helpOverlay}>
          <View style={styles.helpModal}>
            <Text style={styles.helpTitle}>How to Use</Text>
            {hasWA && hasWAB ? (
              <View style={styles.helpToggleRow}>
                <TouchableOpacity
                  style={[styles.helpToggleBtn, helpTab === 'whatsapp' && styles.helpToggleBtnActive]}
                  onPress={() => setHelpTab('whatsapp')}
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={14}
                    color={helpTab === 'whatsapp' ? colors.white : colors.primary}
                  />
                  <Text style={[styles.helpToggleText, helpTab === 'whatsapp' && styles.helpToggleTextActive]}>
                    {' '}WA
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.helpToggleBtn, helpTab === 'business' && styles.helpToggleBtnActive]}
                  onPress={() => setHelpTab('business')}
                >
                  <Ionicons
                    name="business-outline"
                    size={14}
                    color={helpTab === 'business' ? colors.white : colors.primary}
                  />
                  <Text style={[styles.helpToggleText, helpTab === 'business' && styles.helpToggleTextActive]}>
                    {' '}Business
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {helpSteps.map((step, i) => (
              <View key={i} style={styles.helpStepRow}>
                <View style={styles.helpStepIcon}>
                  <Ionicons name={step.icon} size={15} color={colors.white} />
                </View>
                <Text style={styles.helpStepText}>{step.text}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.helpClose} onPress={() => setHelpVisible(false)}>
              <Text style={styles.helpCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatTimeLabel(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
}

const makeStyles = (colors, numColumns) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerGradient: {
    ...elevation(colors.shadow, 'md'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 19, fontWeight: '800', letterSpacing: 0.2, color: colors.white, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  folderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
  },
  folderBtnText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  helpBtn: { padding: 2 },
  filterRow: { flexDirection: 'row', paddingTop: 6 },
  filterTab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  filterTabText: { color: 'rgba(255,255,255,0.62)', fontWeight: '700', fontSize: 13, letterSpacing: 0.8 },
  filterTabTextActive: { color: colors.white },
  filterUnderline: { marginTop: 8, height: 3, width: '60%', backgroundColor: colors.gold, borderRadius: 2 },
  contentArea: { flex: 1 },
  loadingText: { textAlign: 'center', marginTop: 32, color: colors.textSecondary },
  row: { justifyContent: 'flex-start', gap: 8 },
  grid: { padding: 8 },
  cell: {
    flex: 1 / numColumns,
    aspectRatio: 0.72,
    borderRadius: 14,
    backgroundColor: colors.card,
    ...elevation(colors.shadow, 'sm'),
  },
  cellClip: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  cellSelected: { borderWidth: 3, borderColor: colors.primary },
  thumb: { width: '100%', height: '100%' },
  videoThumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
  },
  expiryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  expiryText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  timeText: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dlBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Outline ring + arrow icon, no background fill — the shadow is what keeps it
  // legible over light/busy thumbnails instead of a solid backing circle.
  dlBtnIcon: {
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    ...elevation(colors.shadow, 'md'),
  },
  bulkCancel: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  bulkCancelText: { color: colors.white, fontWeight: '600' },
  bulkCount: { color: colors.white, fontWeight: '600' },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    ...elevation('#000', 'sm'),
  },
  bulkBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  bulkBtnText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  modalMedia: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalImage: { width: '100%', height: '75%' },
  // Wide enough to also sit over where the native player's prev/next-track buttons
  // render, so swiping there navigates between statuses instead of hitting them —
  // narrower center strip is left clear for rewind/play-pause/forward taps.
  modalSwipeEdgeLeft: { position: 'absolute', left: 0, top: 0, bottom: 64, width: '26%' },
  modalSwipeEdgeRight: { position: 'absolute', right: 0, top: 0, bottom: 64, width: '26%' },
  modalClose: { position: 'absolute', top: 40, right: 20, padding: 6 },
  modalPrev: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -22,
    padding: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalNext: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -22,
    padding: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalNavDisabled: { opacity: 0.25 },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    borderRadius: 24,
  },
  actBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    ...elevation('#000', 'sm'),
  },
  actBtnWA: { backgroundColor: colors.accent },
  actBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  actBtnTextDark: { color: colors.primary },
  helpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  helpModal: { backgroundColor: colors.card, borderRadius: 20, padding: 20, width: '88%', maxWidth: 480, maxHeight: '82%', ...elevation(colors.shadow, 'lg') },
  helpTitle: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 14, textAlign: 'center' },
  helpToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
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
  helpToggleBtnActive: { backgroundColor: colors.primary },
  helpToggleText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  helpToggleTextActive: { color: colors.white },
  helpStepRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  helpStepIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpStepText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19, paddingTop: 3 },
  helpClose: { backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  helpCloseText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
